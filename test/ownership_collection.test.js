import assert from 'node:assert/strict';
import test from 'node:test';
import { createOwnershipCollector, normalizeOwnership } from '../src/v2/opendart_ownership.js';
import { createOwnershipRefresh } from '../src/v2/ownership_refresh.js';
import { createCandidateService } from '../src/v2/candidate_service.js';
import { createOpenDartRequest } from '../src/services/opendart_request.js';
import { isD2Eligible } from '../src/v2/scoring.js';
const env = { KSTOCK_DART_ENABLED: 'true', KSTOCK_V2_OWNERSHIP_ENABLED: 'true' };
const company = { ticker: '005930', corpCode: '00126380', market: 'KR', companyName: 'Fixture' };
const row = { rcept_no: '20260927000001', rcept_dt: '20260927', corp_code: company.corpCode, repror: 'Fixture actor', stkqy: '1,000', stkqy_irds: '-100' };
const input = { analysisDate: '2026-09-29T00:00:00+09:00', companies: [company], evidence: [] };

test('official ownership HTTP operations use corp code and sanitize network failures', async () => {
  const request = createOpenDartRequest({ apiKey: 'fixture-key', fetchImpl: async url => {
    assert.equal(url.pathname, '/api/majorstock.json');
    assert.equal(url.searchParams.get('corp_code'), company.corpCode);
    assert.equal(url.searchParams.has('page_no'), false);
    return { ok: true, json: async () => ({ status: '013' }) };
  } });
  await request({ service: 'opendart', operation: 'majorstock', params: { corpCode: company.corpCode } });
  const fail = createOpenDartRequest({ apiKey: 'fixture-key', fetchImpl: async () => { throw new Error('private-key-in-url'); } });
  await assert.rejects(fail({ service: 'opendart', operation: 'elestock', params: { corpCode: company.corpCode } }), error => error.message === 'OpenDART request failed');
});

test('ownership normalizes signed changes, both date formats, and never invents trade dates', () => {
  const context = { ticker: company.ticker, corpCode: company.corpCode, operation: 'majorstock' };
  const item = normalizeOwnership(row, context);
  assert.equal(item.actionType, 'reduce');
  assert.equal(item.shareChange, -100);
  assert.equal(item.transactionAt, null);
  assert.equal(item.observedAt, '2026-09-27T23:59:59+09:00');
  assert.equal(JSON.stringify(item).includes(row.repror), false);
  const insider = normalizeOwnership({ ...row, rcept_dt: '2026-09-27', sp_stock_lmp_cnt: '200', sp_stock_lmp_irds_cnt: '20' }, { ...context, operation: 'elestock' });
  assert.equal(insider.actionType, 'increase');
  assert.throws(() => normalizeOwnership({ ...row, rcept_dt: '20260230' }, context), /date/);
  assert.throws(() => normalizeOwnership({ ...row, stkqy_irds: '-' }, context), /number/);
});

test('collector gates requests, deduplicates reports and rejects provider errors', async () => {
  let calls = 0;
  const request = async () => { calls++; return { status: '013' }; };
  await assert.rejects(createOwnershipCollector({ env: {}, request }).collect(company), /disabled/);
  assert.equal(calls, 0);
  const collector = createOwnershipCollector({ env, request: async ({ operation }) => operation === 'majorstock' ? { status: '000', list: [row, row] } : { status: '013' } });
  assert.equal((await collector.collect(company)).length, 1);
  await assert.rejects(createOwnershipCollector({ env, request: async () => ({ status: '020' }) }).collect(company), /unavailable/);
  await assert.rejects(createOwnershipCollector({ env: { ...env, KSTOCK_LIVE_TRADING_ENABLED: 'true' }, request }).collect(company), /live trading/);
});

test('refresh shares concurrent requests, expires cache and replaces manual KR evidence', async () => {
  let calls = 0, time = 0;
  const refresh = createOwnershipRefresh({ env, now: () => time, ttlMs: 100,
    collector: { collect: async () => { calls++; return [normalizeOwnership(row, { ticker: company.ticker, corpCode: company.corpCode, operation: 'majorstock' })]; } } });
  const [a, b] = await Promise.all([refresh(input), refresh(input)]);
  assert.equal(calls, 1);
  assert.deepEqual(a.evidence, b.evidence);
  await refresh(input);
  assert.equal(calls, 1);
  time = 101;
  const service = createCandidateService({ env, refresh, read: async () => JSON.stringify(input) });
  const report = await service.load();
  assert.equal(calls, 2);
  assert.equal(report.dataMode, 'OPENDART_OWNERSHIP');
  assert.equal(report.candidates[0].evidence.length, 1);
});

test('disabled refresh makes no calls; oversized watchlist fails before collection', async () => {
  let calls = 0;
  const collector = { collect: async () => { calls++; return []; } };
  assert.equal(await createOwnershipRefresh({ env: {}, collector })(input), input);
  await assert.rejects(createOwnershipRefresh({ env, collector })({ ...input, companies: Array(11).fill(company) }), /10 KR/);
  assert.equal(calls, 0);
});

test('D-2 cutoff follows Korean midnight even when analysis timestamp uses UTC', () => {
  assert.equal(isD2Eligible('2026-09-27T14:59:59.999Z', '2026-09-28T15:00:00Z'), true);
  assert.equal(isD2Eligible('2026-09-27T15:00:00Z', '2026-09-28T15:00:00Z'), false);
});
