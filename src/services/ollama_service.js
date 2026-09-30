import { parseAgentJson } from '../utils/json.js';

export function createOllamaClient({
  fetchImpl = globalThis.fetch,
  baseUrl = process.env.KSTOCK_LOCAL_BASE_URL || 'http://127.0.0.1:11434',
  model = process.env.KSTOCK_LOCAL_MODEL || 'qwen3:8b',
  timeoutMs = Number(process.env.KSTOCK_LOCAL_TIMEOUT_MS || 120_000),
  longTimeoutMs = Number(process.env.KSTOCK_LOCAL_LONG_TIMEOUT_MS || 300_000),
  maxOutputTokens = Number(process.env.KSTOCK_LOCAL_MAX_OUTPUT_TOKENS || 512),
  longOutputTokens = Number(process.env.KSTOCK_LOCAL_LONG_OUTPUT_TOKENS || 2048),
  createTimeoutSignal = (durationMs) => AbortSignal.timeout(durationMs),
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetch implementation is required');
  if (typeof createTimeoutSignal !== 'function') throw new TypeError('createTimeoutSignal must be a function');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
    throw new TypeError('timeoutMs must be a positive integer');
  }
  if (!Number.isInteger(longTimeoutMs) || longTimeoutMs < timeoutMs) {
    throw new TypeError('longTimeoutMs must be an integer no smaller than timeoutMs');
  }
  if (!Number.isInteger(maxOutputTokens) || maxOutputTokens < 1) {
    throw new TypeError('maxOutputTokens must be a positive integer');
  }
  if (!Number.isInteger(longOutputTokens) || longOutputTokens < maxOutputTokens) {
    throw new TypeError('longOutputTokens must be an integer no smaller than maxOutputTokens');
  }
  const endpoint = new URL('/api/chat', baseUrl);
  if (!['http:', 'https:'].includes(endpoint.protocol)) {
    throw new TypeError('local model URL must use HTTP or HTTPS');
  }

  let queue = Promise.resolve();

  async function execute({ agentName = 'agent', systemPrompt, userPrompt, responseSchema }) {
    let response;
    try {
      response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: createTimeoutSignal(['risk', 'committee'].includes(agentName) ? longTimeoutMs : timeoutMs),
        body: JSON.stringify({
          model,
          stream: false,
          think: false,
          format: responseSchema ?? 'json',
          keep_alive: '5m',
          options: {
            temperature: 0.1,
            num_ctx: 8192,
            num_predict: ['risk', 'committee'].includes(agentName) ? longOutputTokens : maxOutputTokens,
          },
          messages: [
            {
              role: 'system',
              content: `${systemPrompt}\n\nLOCAL OUTPUT LIMITS: Return only the requested keys and types. Keep each list to at most 3 concise items. Keep summaries to at most 2 short sentences. Do not repeat source data or add keys.`,
            },
            { role: 'user', content: userPrompt },
          ],
        }),
      });
    } catch (error) {
      if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
        throw new Error(`Local model agent ${agentName} request timed out`);
      }
      throw new Error(`Local model agent ${agentName} request failed`);
    }

    if (!response.ok) throw new Error(`Local model HTTP error: ${response.status}`);

    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error('Invalid local model response');
    }

    const result = parseAgentJson(payload?.message?.content);
    if (!result || typeof result !== 'object' || Array.isArray(result) || result.parseError) {
      const outputLength = typeof payload?.message?.content === 'string'
        ? payload.message.content.length
        : 0;
      throw new Error(`Local model agent ${agentName} did not return a valid JSON object (reason: ${payload?.done_reason ?? 'unknown'}, output chars: ${outputLength})`);
    }
    return result;
  }

  function run(input) {
    const task = queue.then(() => execute(input), () => execute(input));
    queue = task.then(() => undefined, () => undefined);
    return task;
  }

  return { run };
}

let localClient;

export function runLocalAgent(input) {
  if (!localClient) localClient = createOllamaClient();
  return localClient.run(input);
}