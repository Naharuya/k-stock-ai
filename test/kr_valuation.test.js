import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeKisQuote, normalizeDartFinancials, annualMultiples, analyzeKrValuation } from '../src/v2/kr_valuation.js';
import { collectKrData } from '../src/v2/kr_collect.js';
const analysisDate = '2026-10-12T00:00:00+09:00';
function company(ticker = '005930', date = '2026-10-09', year = '2025') {
  return { ticker, market: 'KR', companyName: 'Fixture', corpCode: '00126380', industryCode: 'TEST', krSnapshot: {
    price: { source: 'fixture', asOfDate: date, collectedAt: analysisDate, currency: 'KRW', marketCap: 1000, qualityStatus: 'READY', corporateActionsReviewed: true },
    financial: { source: 'fixture', publishedAt: `${Number(year)+1}-03-01T00:00:00+09:00`, currency: 'KRW', qualityStatus: 'READY',
      fiscalPeriod: { start: `${year}-01-01`, end: `${year}-12-31`, basis: 'CFS' }, raw: { revenue: 100, netIncome: 50, equity: 200, assets: 400, liabilities: 200 } } } };
}
const universe = () => ['000001','000002','000003'].map(x => company(x));
const history = () => ['2023','2024','2025'].map(x => company('005930', `${x}-10-09`, String(Number(x)-1)));
test('KIS market cap uses 100 million KRW and quote time is not a session date', () => {
  const result = normalizeKisQuote({ rt_cd: '0', output: { stck_prpr: '50,000', hts_avls: '10', lstn_stcn: '1000' } }, company(), analysisDate);
  assert.equal(result.marketCap, 1000000000); assert.equal(result.price, 50000);
  assert.equal(result.asOfDate, null); assert.equal(result.qualityStatus, 'UNDER_REVIEW');
  assert.throws(() => normalizeKisQuote({ rt_cd: '1' }, company(), analysisDate));
});
test('DART missing fields and unknown fiscal dates stay incomplete', () => {
  const result = normalizeDartFinancials([], company(), { year: 2025, collectedAt: analysisDate, analysisDate });
  assert.equal(result.qualityStatus, 'INCOMPLETE'); assert.equal(result.raw.revenue, null);
  assert.ok(result.missing.includes('publicationDate'));
});
test('annual multiples exclude losses, currency mismatch and unpublished information', () => {
  const c = company(); assert.equal(annualMultiples(c.krSnapshot, analysisDate).metrics.PER, 20);
  c.krSnapshot.financial.raw.netIncome = -1; assert.equal(annualMultiples(c.krSnapshot, analysisDate).metrics.PER, null);
  c.krSnapshot.financial.publishedAt = '2026-10-11T00:00:00Z'; assert.ok(annualMultiples(c.krSnapshot, analysisDate).issues.includes('POINT_IN_TIME'));
  c.krSnapshot.financial.currency = 'USD'; assert.ok(annualMultiples(c.krSnapshot, analysisDate).issues.includes('QUALITY_OR_CURRENCY'));
});
test('peer selection deduplicates and rejects different periods, industries and outliers', () => {
  const c = company(), peers = universe(); peers.push(peers[0]); peers[1].industryCode = 'OTHER'; peers[2].krSnapshot.price.marketCap = 1000000;
  const result = analyzeKrValuation(c, peers, history(), analysisDate);
  assert.equal(result.status, 'INSUFFICIENT_DATA');
  assert.ok(result.excluded.some(x => x.reason === 'INDUSTRY_MISMATCH'));
  assert.ok(result.excluded.some(x => x.reason === 'DUPLICATE_OR_SELF'));
  assert.ok(result.excluded.some(x => x.reason === 'EXTREME_MULTIPLE_REVIEW'));
});
test('valuation states are independent of legacy scores and risk takes precedence', () => {
  const c = company(); c.valuationScore = 99;
  let result = analyzeKrValuation(c, universe(), history(), analysisDate);
  assert.equal(result.status, 'NEUTRAL'); assert.equal(result.scoreImpact, 0); assert.equal(result.conflict, 'LEGACY_SCORE_NOT_RECALIBRATED');
  c.krSnapshot.price.marketCap = 500; result = analyzeKrValuation(c, universe(), history(), analysisDate); assert.equal(result.status, 'RELATIVELY_LOW');
  c.risk = { tradingHalt: true }; assert.equal(analyzeKrValuation(c, universe(), history(), analysisDate).status, 'UNDER_REVIEW');
});
test('collector blocks missing credentials without requests and enforces bounded scope', async () => {
  const result = await collectKrData({ companies: [company()], analysisDate }, { env: {} }); assert.equal(result.status, 'BLOCKED');
  await assert.rejects(collectKrData({ companies: Array(4).fill(company()), analysisDate }, { env: {} }), /SCOPE/);
});
test('collector reuses KIS and DART clients with safe injectable fixtures', async () => {
  const result = await collectKrData({ companies: [company()], analysisDate }, { env: {},
    kisRequest: async request => { assert.ok(['quote','daily-prices'].includes(request.operation)); return { rt_cd: '0', output: {} }; },
    dartClient: { getFinancials: async () => ({ items: [] }), getDisclosures: async () => ({ items: [] }) } });
  assert.equal(result.status, 'UNDER_REVIEW'); assert.equal(result.companies[0].krSnapshot.financial.qualityStatus, 'INCOMPLETE');
});
test('DART standard account IDs preserve annual source and filing availability', () => {
  const ids = ['ifrs-full_Revenue','dart_OperatingIncomeLoss','ifrs-full_ProfitLoss','ifrs-full_Assets','ifrs-full_Liabilities','ifrs-full_Equity'];
  const rows = ids.map(account_id => ({ corp_code: '00126380', bsns_year: '2025', reprt_code: '11011', account_id, sj_div: ['ifrs-full_Assets','ifrs-full_Liabilities','ifrs-full_Equity'].includes(account_id) ? 'BS' : 'IS', currency: 'KRW', thstrm_amount: '1,000', rcept_no: '20260301000001' }));
  const result = normalizeDartFinancials(rows, company(), { year: 2025, analysisDate, collectedAt: analysisDate,
    disclosures: [{ corp_code: '00126380', rcept_no: '20260301000001', rcept_dt: '20260301' }] });
  assert.equal(result.raw.revenue, 1000); assert.equal(result.publishedAt, '2026-03-01T23:59:59+09:00');
  assert.deepEqual(result.missing, ['fiscalPeriodDates']);
});
test('KR incomplete valuation blocks approval even when legacy score is high', async () => {
  const { runKStockV2Pipeline } = await import('../src/v2/orchestrator.js');
  const c = company(); c.valuationScore = 100; c.krSnapshot.price.qualityStatus = 'UNDER_REVIEW';
  const result = runKStockV2Pipeline({ analysisDate, companies: [c], evidence: [] }, {});
  assert.equal(result.candidates[0].approved, false);
  assert.ok(result.candidates[0].dataBlockers.includes('KR_VALUATION_REVIEW_REQUIRED'));
});

test('historical prices preserve dates and reject future, duplicate and invalid sessions', async () => {
  const { normalizeKisDaily } = await import('../src/v2/kr_valuation.js');
  const row = { stck_bsop_date: '20261009', stck_clpr: '50000', acml_vol: '100' };
  const result = normalizeKisDaily([row, row, { ...row, stck_bsop_date: '20261011' }, { ...row, stck_clpr: '-1' }], analysisDate, analysisDate);
  assert.equal(result.sessions.length, 1); assert.equal(result.rejected.length, 3);
  assert.equal(result.qualityStatus, 'UNDER_REVIEW');
});

test('Apple ranking hold remains active independently of valuation inputs', async () => {
  const { runKStockV2Pipeline } = await import('../src/v2/orchestrator.js');
  const c = { ticker: 'AAPL', market: 'GLOBAL', companyName: 'Apple', valuationScore: 100 };
  const result = runKStockV2Pipeline({ analysisDate, companies: [c], evidence: [] }, {});
  assert.ok(result.candidates[0].dataBlockers.includes('APPLE_RANKING_HOLD'));
  assert.equal(result.candidates[0].approved, false);
});
