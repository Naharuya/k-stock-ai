import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createKisTokenManager } from '../src/services/kis_token_manager.js';
import { createSafeRetry, isRetryableOpenDartError } from '../src/services/safe_retry.js';

process.env.KSTOCK_LIVE_TRADING_ENABLED = 'false';

function forbidExternalFetch() {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error('External request forbidden during token/retry validation');
  };
  return () => { globalThis.fetch = originalFetch; };
}

test('KIS token is cached until refresh window then renewed using only injected stub', async () => {
  const restore = forbidExternalFetch();
  let currentTime = 1_000_000;
  let calls = 0;
  const manager = createKisTokenManager({
    now: () => currentTime,
    refreshSkewMs: 60_000,
    requestToken: async () => {
      calls += 1;
      return { access_token: `token-${calls}`, expires_in: 3600 };
    },
  });

  try {
    assert.equal(await manager.getToken(), 'token-1');
    assert.equal(await manager.getToken(), 'token-1');
    assert.equal(calls, 1);

    currentTime += (3600 * 1000) - 59_000;
    assert.equal(await manager.getToken(), 'token-2');
    assert.equal(calls, 2);
  } finally {
    restore();
  }
});

test('KIS token failures and malformed payloads fail closed without exposing a token', async () => {
  const denied = createKisTokenManager({
    requestToken: async () => ({ rt_cd: '1', msg_cd: 'AUTH_FAIL' }),
  });
  await assert.rejects(denied.getToken(), /KIS token error: AUTH_FAIL/);
  assert.equal(denied.inspect().hasToken, false);

  const malformed = createKisTokenManager({
    requestToken: async () => ({ access_token: 'secret-but-no-expiry' }),
  });
  await assert.rejects(malformed.getToken(), /Invalid KIS token payload/);
  assert.equal(malformed.inspect().hasToken, false);
});

test('KIS token clear forces the next call to request a fresh token', async () => {
  let calls = 0;
  const manager = createKisTokenManager({
    requestToken: async () => ({ access_token: `token-${++calls}`, expires_in: 3600 }),
  });
  assert.equal(await manager.getToken(), 'token-1');
  manager.clear();
  assert.equal(await manager.getToken(), 'token-2');
  assert.equal(calls, 2);
});

test('OpenDART retry policy retries bounded rate-limit errors without real waiting', async () => {
  const sleepCalls = [];
  let calls = 0;
  const retry = createSafeRetry({
    maxAttempts: 3,
    baseDelayMs: 100,
    sleep: async (ms) => { sleepCalls.push(ms); },
  });

  const result = await retry.run(async () => {
    calls += 1;
    if (calls < 3) {
      const error = new Error('OpenDART rate limited');
      error.code = 'RATE_LIMIT';
      throw error;
    }
    return { status: '000' };
  }, { shouldRetry: isRetryableOpenDartError });

  assert.deepEqual(result, { status: '000' });
  assert.equal(calls, 3);
  assert.deepEqual(sleepCalls, [100, 200]);
});

test('OpenDART timeout retries are bounded and eventually fail closed', async () => {
  let calls = 0;
  const retry = createSafeRetry({ maxAttempts: 2, sleep: async () => {} });

  await assert.rejects(
    retry.run(async () => {
      calls += 1;
      const error = new Error('timeout');
      error.code = 'TIMEOUT';
      throw error;
    }, { shouldRetry: isRetryableOpenDartError }),
    /timeout/,
  );
  assert.equal(calls, 2);
});

test('OpenDART non-retryable errors are not retried', async () => {
  let calls = 0;
  const retry = createSafeRetry({ maxAttempts: 3, sleep: async () => {} });

  await assert.rejects(
    retry.run(async () => {
      calls += 1;
      const error = new Error('invalid request');
      error.code = 'BAD_REQUEST';
      throw error;
    }, { shouldRetry: isRetryableOpenDartError }),
    /invalid request/,
  );
  assert.equal(calls, 1);
});

test('OpenDART status 020 is treated as retryable but never exceeds maxAttempts', async () => {
  let calls = 0;
  const retry = createSafeRetry({ maxAttempts: 3, sleep: async () => {} });

  await assert.rejects(
    retry.run(async () => {
      calls += 1;
      const error = new Error('OpenDART 020');
      error.status = '020';
      throw error;
    }, { shouldRetry: isRetryableOpenDartError }),
    /OpenDART 020/,
  );
  assert.equal(calls, 3);
  assert.equal(process.env.KSTOCK_LIVE_TRADING_ENABLED, 'false');
});
