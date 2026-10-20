import { mkdir, open, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
const DAY = 86400000;
const TTL = 6 * 3600000;
const empty = () => ({ version: 1, requests: [], blockedUntil: 0, entries: {} });
export function createAlphaVantageClient({ apiKey, fetchImpl = globalThis.fetch, now = () => Date.now(), statePath = null } = {}) {
  let memory = empty();
  let pending = Promise.resolve();
  return (functionName, symbol, validate) => {
    const run = async () => {
      if (!apiKey) throw new Error('PRICE_API_KEY_REQUIRED');
      if (!['TIME_SERIES_DAILY', 'SPLITS'].includes(functionName) || !/^[A-Z][A-Z0-9.-]{0,14}$/.test(symbol)) throw new Error('PRICE_RESPONSE_INVALID');
      const prefix = functionName === 'SPLITS' ? 'SPLITS' : 'PRICE';
      let lock;
      if (statePath) {
        await mkdir(path.dirname(statePath), { recursive: true, mode: 0o700 });
        try { lock = await open(`${statePath}.lock`, 'wx', 0o600); }
        catch { throw new Error('PRICE_COLLECTION_BUSY'); }
      }
      try {
        let state = memory;
        if (statePath) {
          try { state = JSON.parse(await readFile(statePath, 'utf8')); }
          catch (error) { if (error.code !== 'ENOENT') throw new Error('PRICE_STATE_INVALID'); else state = empty(); }
        }
        if (state?.version !== 1 || !Array.isArray(state.requests) || state.requests.some(x => !Number.isFinite(x))
          || !Number.isFinite(state.blockedUntil) || !state.entries || typeof state.entries !== 'object' || Array.isArray(state.entries)) throw new Error('PRICE_STATE_INVALID');
        const time = now();
        state.requests = state.requests.filter(x => x > time - DAY);
        for (const [key, entry] of Object.entries(state.entries)) {
          if (!Number.isFinite(entry?.storedAt) || entry.storedAt > time || time - entry.storedAt >= TTL) delete state.entries[key];
        }
        const save = async () => {
          memory = state;
          if (!statePath) return;
          const temporary = `${statePath}.${randomUUID()}.tmp`;
          try { await writeFile(temporary, JSON.stringify(state), { mode: 0o600, flag: 'wx' }); await rename(temporary, statePath); }
          finally { await unlink(temporary).catch(() => {}); }
        };
        const key = `${functionName}:${symbol}`;
        if (state.entries[key]) { validate(state.entries[key].data); await save(); return state.entries[key].data; }
        if (state.blockedUntil > time) throw new Error(`${prefix}_PROVIDER_COOLDOWN`);
        // Reserve before network I/O; even failed requests may consume the provider allowance.
        if (state.requests.length >= 20) throw new Error('PRICE_LOCAL_REQUEST_LIMIT');
        state.requests.push(time);
        await save();
        const url = new URL('https://www.alphavantage.co/query');
        url.searchParams.set('function', functionName);
        url.searchParams.set('symbol', symbol);
        if (functionName === 'TIME_SERIES_DAILY') url.searchParams.set('outputsize', 'compact');
        url.searchParams.set('apikey', apiKey);
        let response;
        try { response = await fetchImpl(url, { signal: AbortSignal.timeout(10000), redirect: 'error' }); }
        catch { throw new Error(`${prefix}_NETWORK_UNAVAILABLE`); }
        if (response?.status === 429) { state.blockedUntil = time + TTL; await save(); throw new Error(`${prefix}_PROVIDER_UNAVAILABLE`); }
        if (!response?.ok) throw new Error(`${prefix}_HTTP_UNAVAILABLE`);
        let data;
        try { data = await response.json(); } catch { throw new Error(`${prefix}_RESPONSE_INVALID`); }
        if (data?.Note || data?.Information || data?.['Error Message']) {
          state.blockedUntil = time + TTL;
          await save();
          throw new Error(`${prefix}_PROVIDER_UNAVAILABLE`);
        }
        validate(data);
        state.entries[key] = { storedAt: time, data };
        await save();
        return data;
      } finally {
        if (lock) { await lock.close(); await unlink(`${statePath}.lock`); }
      }
    };
    const result = pending.then(run);
    pending = result.catch(() => {});
    return result;
  };
}
