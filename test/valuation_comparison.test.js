import test from 'node:test';
import assert from 'node:assert/strict';
import { buildValuationComparison } from '../src/v2/valuation_comparison.js';
const analysisDate = '2026-10-12T00:00:00+09:00';
const company = { ticker: 'AAPL', market: 'GLOBAL', sector: 'fixture-sector', financialSnapshot: { status: 'READY' },
  priceSnapshot: { status: 'READY', sessionDate: '2026-10-09' }, corporateActionSnapshot: { status: 'READY' }, valuationSnapshot: { annualPe: 30 } };
const row = (ticker, priceDate, periodEnd, publishedAt) => ({ ticker, priceDate, financialPeriodEnd: periodEnd, publishedAt,
  market: 'GLOBAL', currency: 'USD', basis: 'ANNUAL_DILUTED_EPS', splitReviewed: true, close: 200, dilutedEps: 10,
  sector: 'fixture-sector', priceSourceUrl: 'https://example.test/prices', financialSourceUrl: 'https://example.test/filing' });
function fixture() {
  return { ...structuredClone(company), valuationComparables: {
    history: ['2023', '2024', '2025'].map(year => row('AAPL', `${year}-10-09`, `${year}-09-01`, `${year}-09-20T00:00:00Z`)),
    peers: ['MSFT', 'ABC', 'DEF'].map(ticker => row(ticker, '2026-10-09', '2025-12-31', '2026-02-01T00:00:00Z')) } };
}
test('comparison computes medians and relative premium without permitting ranking', () => {
  const result = buildValuationComparison(fixture(), analysisDate);
  assert.equal(result.status, 'REFERENCE_READY');
  assert.equal(result.history.medianPe, 20);
  assert.equal(result.peers.premiumToMedianPct, 50);
  assert.equal(result.rankingEligible, false);
  assert.equal(result.score, undefined);
});
test('lookahead, duplicate years and same-company peer do not count toward coverage', () => {
  const input = fixture();
  input.valuationComparables.history[0].publishedAt = '2026-10-11T00:00:00Z';
  input.valuationComparables.history.push(input.valuationComparables.history[1]);
  input.valuationComparables.peers[0].ticker = 'AAPL';
  const result = buildValuationComparison(input, analysisDate);
  assert.equal(result.status, 'INCOMPLETE');
  assert.deepEqual(result.rejected.map(x => x.reason), ['POINT_IN_TIME_MISMATCH', 'DUPLICATE_COMPARISON', 'PEER_SCOPE_MISMATCH']);
});
test('incomparable currency, TTM, sector and dates are excluded', () => {
  for (const change of [{ currency: 'KRW' }, { basis: 'TTM' }, { sector: 'other' }, { priceDate: '2026-10-08' },
    { splitReviewed: false }, { dilutedEps: 0 }, { dilutedEps: '10' }, { priceSourceUrl: 'https://example.test/?apikey=private' }]) {
    const input = fixture(); Object.assign(input.valuationComparables.peers[0], change);
    const result = buildValuationComparison(input, analysisDate);
    assert.equal(result.peers.count, 2);
    assert.equal(result.rejected.length, 1);
  }
});
test('missing current data cannot produce relative valuation and input size is bounded', () => {
  const input = fixture(); input.corporateActionSnapshot.status = 'REVIEW_REQUIRED';
  const result = buildValuationComparison(input, analysisDate);
  assert.equal(result.history.premiumToMedianPct, null);
  assert.ok(result.missing.includes('currentAnnualPe'));
  assert.throws(() => buildValuationComparison({ ...company, valuationComparables: { history: Array(101).fill({}) } }, analysisDate));
});
test('empty inputs expose specific data requirements rather than a score', () => {
  const result = buildValuationComparison(company, analysisDate);
  assert.deepEqual(result.missing, ['historicalAnnualPeSamples', 'sameSectorAnnualPePeers']);
  assert.equal(result.history.medianPe, null);
});
