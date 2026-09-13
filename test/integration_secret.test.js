import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSafeDataPipeline } from '../src/services/safe_data_pipeline.js';
import { redactSecrets, safeErrorMessage } from '../src/services/secret_redactor.js';

process.env.KSTOCK_LIVE_TRADING_ENABLED = 'false';
process.env.KSTOCK_AI_MODE = 'mock';

function forbidExternalFetch() {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error('External request forbidden during integration validation');
  };
  return () => { globalThis.fetch = originalFetch; };
}

test('safe pipeline combines KIS quote and OpenDART financials using stubs only', async () => {
  const restore = forbidExternalFetch();
  const calls = [];
  const pipeline = createSafeDataPipeline({
    kisRequest: async (input) => {
      calls.push(input);
      return { rt_cd: '0', output: { stck_prpr: '70100' } };
    },
    dartRequest: async (input) => {
      calls.push(input);
      return { status: '000', list: [{ account_nm: '매출액', thstrm_amount: '1000' }] };
    },
    sleep: async () => { throw new Error('sleep should not be used on success'); },
    liveTradingEnabled: false,
  });

  try {
    const snapshot = await pipeline.loadSnapshot({ symbol: '005930', corpCode: '00126380', year: '2025' });
    assert.equal(snapshot.quote.price, 70100);
    assert.equal(snapshot.financials.items.length, 1);
    assert.equal(snapshot.liveTradingEnabled, false);
    assert.deepEqual(calls.map((x) => x.service).sort(), ['kis', 'opendart']);
  } finally {
    restore();
  }
});

test('safe pipeline retries only OpenDART transient failures and remains bounded', async () => {
  let dartCalls = 0;
  const sleepCalls = [];
  const pipeline = createSafeDataPipeline({
    kisRequest: async () => ({ rt_cd: '0', output: { stck_prpr: '70000' } }),
    dartRequest: async () => {
      dartCalls += 1;
      if (dartCalls < 3) {
        const error = new Error('temporary timeout');
        error.code = 'TIMEOUT';
        throw error;
      }
      return { status: '000', list: [] };
    },
    sleep: async (ms) => { sleepCalls.push(ms); },
  });

  const snapshot = await pipeline.loadSnapshot({ symbol: '005930', corpCode: '00126380', year: '2025' });
  assert.equal(snapshot.financials.status, '000');
  assert.equal(dartCalls, 3);
  assert.deepEqual(sleepCalls, [100, 200]);
});

test('safe pipeline refuses live trading activation', () => {
  assert.throws(
    () => createSafeDataPipeline({
      kisRequest: async () => ({}),
      dartRequest: async () => ({}),
      liveTradingEnabled: true,
    }),
    /Live trading must remain disabled/,
  );
});

test('secret redactor removes nested credentials without mutating structure', () => {
  const input = {
    appkey: 'KIS-KEY-123',
    nested: {
      access_token: 'token-abc',
      normal: 'keep-me',
      headers: { Authorization: 'Bearer super-secret' },
    },
  };
  const redacted = redactSecrets(input);
  assert.equal(redacted.appkey, '[REDACTED]');
  assert.equal(redacted.nested.access_token, '[REDACTED]');
  assert.equal(redacted.nested.headers.Authorization, '[REDACTED]');
  assert.equal(redacted.nested.normal, 'keep-me');
  assert.equal(input.appkey, 'KIS-KEY-123');
});

test('safe error messages redact bearer tokens and credential assignments', () => {
  const message = safeErrorMessage(new Error('Authorization: Bearer abc.def.ghi app_secret=SECRET123 api_key=KEY456'));
  assert.doesNotMatch(message, /abc\.def\.ghi|SECRET123|KEY456/);
  assert.match(message, /Bearer \[REDACTED\]/);
  assert.match(message, /app_secret=\[REDACTED\]/i);
  assert.match(message, /api_key=\[REDACTED\]/i);
  assert.equal(process.env.KSTOCK_LIVE_TRADING_ENABLED, 'false');
});
