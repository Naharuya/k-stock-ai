import assert from 'node:assert/strict';
import test from 'node:test';
import { createCandidateService, registerCandidateRoutes, validateCandidateInput } from '../src/v2/candidate_service.js';

function fixture() {
  return {
    analysisDate: '2026-09-29T00:00:00Z',
    companies: [{ ticker: 'ABC', market: 'KR', companyName: 'Fixture',
      actorProfile: { timeHorizon: 'long', style: 'value' },
      actorSignals: [{ ticker: 'ABC', actorType: 'institution', score: 100 }],
      fundamentals: { revenueGrowth: 100, cashFlow: 100, roe: 100, balanceSheet: 100, moat: 100 },
      valuationScore: 100,
    }],
    evidence: [{ id: 'e1', sourceType: 'filing', sourceUrl: 'https://example.test/filing',
      observedAt: '2026-09-27T10:00:00Z', actorId: 'a1', companyId: 'c1',
      ticker: 'ABC', market: 'KR', signalType: 'capital_action', actionType: 'increase', confidence: 1 }],
  };
}
const safeEnv = { KSTOCK_LIVE_TRADING_ENABLED: 'false', KSTOCK_BROKER_ENABLED: 'false' };
const serviceFor = input => createCandidateService({ inputPath: '/unused', env: safeEnv, read: async () => JSON.stringify(input) });

function routes(service) {
  const handlers = new Map();
  registerCandidateRoutes({ get: (path, handler) => handlers.set(path, handler) }, service);
  return async (path, req = { params: {}, query: {} }) => {
    const res = { code: 200, headers: {}, set(key, value) { this.headers[key] = value; },
      status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await handlers.get(path)(req, res);
    return res;
  };
}

test('candidate list and detail expose ranked results, sources and risk without a network listener', async () => {
  const call = routes(serviceFor(fixture()));
  const list = await call('/api/v2/candidates');
  assert.equal(list.code, 200);
  assert.equal(list.body.KR.length, 1);
  assert.equal(list.body.evaluatedCount, 1);
  assert.equal(list.body.candidates, undefined);
  assert.equal(list.headers['Cache-Control'], 'no-store');
  const detail = await call('/api/v2/candidates/:ticker', { params: { ticker: 'ABC' }, query: { market: 'KR' } });
  assert.equal(detail.body.candidate.evidence[0].sourceUrl, 'https://example.test/filing');
  assert.ok(detail.body.candidate.agents.risk);
  assert.ok(detail.body.candidate.agents.bear);
  assert.equal(detail.body.warning, 'RESEARCH_ONLY');
});

test('same ticker in another market cannot inherit evidence or become ranked', async () => {
  const input = fixture();
  input.companies.push({ ...input.companies[0], market: 'GLOBAL' });
  const report = await serviceFor(input).load();
  assert.equal(report.KR.length, 1);
  assert.equal(report.GLOBAL.length, 0);
  assert.deepEqual(report.candidates[1].evidence, []);
  const call = routes(serviceFor(input));
  assert.equal((await call('/api/v2/candidates/:ticker', { params: { ticker: 'ABC' }, query: {} })).body.error, 'MARKET_REQUIRED');
});

test('missing local data returns NO_DATA and missing candidate returns 404', async () => {
  const service = createCandidateService({ read: async () => { throw Object.assign(new Error('missing'), { code: 'ENOENT' }); } });
  const call = routes(service);
  assert.equal((await call('/api/v2/candidates')).body.status, 'NO_DATA');
  assert.equal((await call('/api/v2/candidates/:ticker', { params: { ticker: 'ABC' }, query: {} })).code, 404);
});

test('malformed data and unsafe environment fail closed without exposing file contents', async () => {
  const bad = createCandidateService({ read: async () => 'private-invalid-content' });
  const result = await routes(bad)('/api/v2/candidates');
  assert.equal(result.code, 503);
  assert.deepEqual(result.body, { success: false, error: 'CANDIDATES_UNAVAILABLE' });
  const unsafe = createCandidateService({ env: { KSTOCK_LIVE_TRADING_ENABLED: 'true' }, read: async () => JSON.stringify(fixture()) });
  await assert.rejects(unsafe.load(), /live trading/);
  assert.throws(() => validateCandidateInput({ ...fixture(), analysisDate: 'bad' }));
  const duplicate = fixture();
  duplicate.companies.push(duplicate.companies[0]);
  assert.throws(() => validateCandidateInput(duplicate), /Duplicate/);
});

test('D-2 ineligible evidence is excluded from detail and ranking', async () => {
  const input = fixture();
  input.evidence[0].observedAt = '2026-09-28T10:00:00Z';
  const result = await serviceFor(input).load();
  assert.equal(result.KR.length, 0);
  assert.deepEqual(result.candidates[0].evidence, []);
  assert.equal(result.evidence.rejected[0].reason, 'NOT_D2_ELIGIBLE');
});

test('review-required company stays excluded even when other strong evidence passes', async () => {
  const input = fixture();
  input.reviewRequired = [{ ticker: 'ABC', market: 'KR', reason: 'SEC_FORM4_AMENDMENT', accessionNumber: 'fixture' }];
  const report = await serviceFor(input).load();
  assert.equal(report.status, 'REVIEW_REQUIRED');
  assert.equal(report.KR.length, 0);
  assert.equal(report.candidates[0].approved, false);
  assert.equal(report.candidates[0].reviewRequired.length, 1);
  const list = await routes(serviceFor(input))('/api/v2/candidates');
  assert.equal(list.body.reviewCandidates.length, 1);
});
