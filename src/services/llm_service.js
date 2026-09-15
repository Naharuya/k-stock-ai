import { parseAgentJson } from "../utils/json.js";

// Serialize inference so the Mac mini does not load all analysis agents at once.
let inferenceQueue = Promise.resolve();

function localSettings() {
  let base;
  try { base = new URL(process.env.KSTOCK_OLLAMA_BASE_URL); }
  catch { throw new Error('OLLAMA_BASE_URL_REQUIRED'); }
  if (!['http:', 'https:'].includes(base.protocol) ||
      !['localhost', '127.0.0.1', '[::1]'].includes(base.hostname) ||
      base.username || base.password || base.search || base.hash || base.pathname !== '/') {
    throw new Error('OLLAMA_LOOPBACK_URL_REQUIRED');
  }
  const model = process.env.KSTOCK_DEFAULT_MODEL?.trim();
  if (!model) throw new Error('OLLAMA_MODEL_REQUIRED');
  const configured = Number(process.env.KSTOCK_AI_TIMEOUT_MS || 120000);
  const timeout = Number.isFinite(configured) ? Math.max(1000, Math.min(configured, 300000)) : 120000;
  return { url: new URL('/api/chat', base), model, timeout };
}

export async function runAgent({ systemPrompt, userPrompt, mockResult, signal }) {
  const mode = process.env.KSTOCK_AI_MODE || 'mock';
  if (mode === 'mock') return mockResult;
  // Never silently send a local-model request to a paid cloud provider.
  if (mode !== 'ollama') throw new Error('AI_MODE_MUST_BE_MOCK_OR_OLLAMA');
  const settings = localSettings();
  const requestSignal = AbortSignal.any([AbortSignal.timeout(settings.timeout), signal].filter(Boolean));
  const task = async () => {
    let response;
    let data;
    try {
      requestSignal.throwIfAborted();
      response = await fetch(settings.url, {
        method: 'POST', redirect: 'error', signal: requestSignal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: settings.model, stream: false, think: false, format: 'json',
          options: { temperature: 0, num_predict: 2048 },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ]
        })
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error(`OLLAMA_HTTP_${response.status}`);
      }
      data = await response.json();
    } catch (error) {
      if (requestSignal.aborted) throw new Error('OLLAMA_REQUEST_ABORTED');
      if (/^OLLAMA_HTTP_\d{3}$/.test(error.message)) throw error;
      throw new Error('OLLAMA_REQUEST_FAILED');
    }
    if (data?.done !== true || data.done_reason === 'length' || typeof data.message?.content !== 'string') {
      throw new Error('OLLAMA_RESPONSE_INCOMPLETE');
    }
    const result = parseAgentJson(data.message.content);
    if (!result || typeof result !== 'object' || Array.isArray(result) || result.parseError) {
      throw new Error('OLLAMA_INVALID_JSON');
    }
    for (const [key, value] of Object.entries(mockResult || {})) {
      const actual = result[key];
      if (actual === undefined || (Array.isArray(value) ? !Array.isArray(actual) :
        typeof actual !== typeof value) || (typeof actual === 'number' && !Number.isFinite(actual))) {
        throw new Error('OLLAMA_INVALID_AGENT_RESULT');
      }
    }
    return result;
  };
  const result = inferenceQueue.then(task, task);
  inferenceQueue = result.catch(() => undefined);
  return result;
}
