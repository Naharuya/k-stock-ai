import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createAlphaVantageClient } from '../src/v2/alpha_vantage_client.js';
const validate = x => { if (x?.symbol !== 'AAPL') throw new Error('INVALID_FIXTURE'); };
const response = { ok: true, json: async () => ({ symbol: 'AAPL', data: [] }) };
async function fixture(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'kstock-api-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return path.join(dir, 'state.json');
}
test('API cache survives client restarts, expires after six hours and never stores the key', async t => {
  const statePath = await fixture(t);
  let calls = 0, time = Date.UTC(2026, 9, 12);
  const options = { statePath, apiKey: 'secret-fixture-value', now: () => time, fetchImpl: async () => { calls++; return response; } };
  await createAlphaVantageClient(options)('SPLITS', 'AAPL', validate);
  await createAlphaVantageClient(options)('SPLITS', 'AAPL', validate);
  assert.equal(calls, 1);
  const stored = await readFile(statePath, 'utf8');
  assert.equal(stored.includes(options.apiKey), false);
  assert.equal((await stat(statePath)).mode & 0o777, 0o600);
  time += 6 * 3600000;
  await createAlphaVantageClient(options)('SPLITS', 'AAPL', validate);
  assert.equal(calls, 2);
});
test('provider rejection persists cooldown without retaining its private message', async t => {
  const statePath = await fixture(t);
  let calls = 0;
  const options = { statePath, apiKey: 'fixture', now: () => 100000000,
    fetchImpl: async () => { calls++; return { ok: true, json: async () => ({ Information: 'private-message' }) }; } };
  await assert.rejects(createAlphaVantageClient(options)('SPLITS', 'AAPL', validate), /SPLITS_PROVIDER_UNAVAILABLE/);
  await assert.rejects(createAlphaVantageClient(options)('SPLITS', 'AAPL', validate), /SPLITS_PROVIDER_COOLDOWN/);
  assert.equal(calls, 1);
  assert.equal((await readFile(statePath, 'utf8')).includes('private-message'), false);
});
test('rolling request limit survives restart and failed network requests consume allowance', async t => {
  const statePath = await fixture(t);
  let time = 100000000, calls = 0;
  const options = { statePath, apiKey: 'fixture', now: () => time, fetchImpl: async () => { calls++; throw new Error('private'); } };
  for (let i = 0; i < 20; i++) await assert.rejects(createAlphaVantageClient(options)('SPLITS', 'AAPL', validate), /NETWORK_UNAVAILABLE/);
  await assert.rejects(createAlphaVantageClient(options)('SPLITS', 'AAPL', validate), /LOCAL_REQUEST_LIMIT/);
  assert.equal(calls, 20);
  time += 86400000;
  await assert.rejects(createAlphaVantageClient(options)('SPLITS', 'AAPL', validate), /NETWORK_UNAVAILABLE/);
  assert.equal(calls, 21);
});
test('cross-client overlap fails closed and leaves state usable after lock release', async t => {
  const statePath = await fixture(t);
  let release, entered;
  const ready = new Promise(r => { entered = r; });
  const waiting = new Promise(r => { release = r; });
  const options = { statePath, apiKey: 'fixture', fetchImpl: async () => { entered(); await waiting; return response; } };
  const first = createAlphaVantageClient(options)('SPLITS', 'AAPL', validate);
  await ready;
  await assert.rejects(createAlphaVantageClient(options)('SPLITS', 'AAPL', validate), /COLLECTION_BUSY/);
  release(); await first;
  await createAlphaVantageClient({ ...options, fetchImpl: async () => { throw new Error('should be cached'); } })('SPLITS', 'AAPL', validate);
});
test('corrupt state and invalid successful responses cannot become cached data', async t => {
  const statePath = await fixture(t);
  await writeFile(statePath, '{broken');
  let calls = 0;
  const options = { statePath, apiKey: 'fixture', fetchImpl: async () => { calls++; return response; } };
  await assert.rejects(createAlphaVantageClient(options)('SPLITS', 'AAPL', validate), /STATE_INVALID/);
  assert.equal(calls, 0);
  await rm(statePath);
  await assert.rejects(createAlphaVantageClient(options)('SPLITS', 'AAPL', () => { throw new Error('invalid data'); }), /invalid data/);
  assert.deepEqual(JSON.parse(await readFile(statePath, 'utf8')).entries, {});
});
