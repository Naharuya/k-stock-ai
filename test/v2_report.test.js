import assert from 'node:assert/strict';
import test from 'node:test';
import { createCandidateReportService } from '../src/v2/candidate_report.js';
const timestamp = '2026-10-12T00:00:00Z';
function report() { return { schemaVersion: 1, success: true, analysisDate: timestamp, generatedAt: timestamp,
  candidates: [{ ticker: 'ABC', market: 'GLOBAL', companyName: 'Fixture', score: 60, approved: true,
    reviewRequired: [], committee: { approved: true }, compliance: { passed: true },
    evidence: [{ id: 'e1', sourceType: 'filing', observedAt: '2026-10-09T00:00:00Z', actorId: 'fixture', companyId: 'fixture',
      ticker: 'ABC', market: 'GLOBAL', signalType: 'capital_action', sourceUrl: 'https://example.test/filing', confidence: 1 }],
  }], KR: [{ ticker: 'incorrect' }], GLOBAL: [] }; }
const reader = (data, age = 0) => createCandidateReportService({ read: async () => JSON.stringify(data), now: () => Date.parse(timestamp) + age });
test('batch reader rebuilds ranking from validated candidates without provider requests', async () => {
  const result = await reader(report()).load();
  assert.equal(result.deliveryMode, 'BATCH_REPORT');
  assert.equal(result.GLOBAL[0].ticker, 'ABC');
  assert.equal(result.KR.length, 0);
});
test('stale batch reports retain history but cannot approve or rank candidates', async () => {
  const result = await reader(report(), 37 * 3600000).load();
  assert.equal(result.status, 'STALE');
  assert.equal(result.GLOBAL.length, 0);
  assert.equal(result.candidates[0].approved, false);
});
test('invalid approval, future dates and cross-market evidence fail closed', async () => {
  const reviewed = report(); reviewed.candidates[0].reviewRequired = [{ reason: 'amended' }];
  await assert.rejects(reader(reviewed).load(), /approval/);
  const future = report(); future.generatedAt = '2099-01-01';
  await assert.rejects(reader(future).load(), /report/);
  const wrong = report(); wrong.candidates[0].evidence[0].market = 'KR';
  await assert.rejects(reader(wrong).load(), /evidence/);
});
test('missing reports are empty; enabled trading blocks reads', async () => {
  const absent = createCandidateReportService({ read: async () => { throw Object.assign(new Error(), { code: 'ENOENT' }); } });
  assert.equal((await absent.load()).status, 'NO_DATA');
  await assert.rejects(createCandidateReportService({ env: { KSTOCK_BROKER_ENABLED: 'true' } }).load(), /broker/);
});
