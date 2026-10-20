import assert from 'node:assert/strict';
import test from 'node:test';
import { buildFinancialSnapshot, createFinancialRefresh } from '../src/v2/sec_financials.js';
import { runKStockV2Pipeline } from '../src/v2/orchestrator.js';
const company = { ticker: 'ABC', cik: '0000000123', market: 'GLOBAL', companyName: 'Fixture' };
const anchor = { start: '2025-01-01', end: '2025-12-31', filed: '2026-02-01', form: '10-K', accn: '0000000123-26-000001' };
const prior = { ...anchor, start: '2024-01-01', end: '2024-12-31' };
const analysisDate = '2026-10-12T00:00:00+09:00';
function data() {
  const units = rows => ({ units: { USD: rows } });
  const instant = { ...anchor }; delete instant.start;
  const oldInstant = { ...instant, end: prior.end };
  return { cik: 123, facts: { 'us-gaap': {
    RevenueFromContractWithCustomerExcludingAssessedTax: units([{ ...anchor, val: 120 }, { ...prior, val: 100 }]),
    NetIncomeLoss: units([{ ...anchor, val: 20 }]),
    NetCashProvidedByUsedInOperatingActivities: units([{ ...anchor, val: 30 }]),
    PaymentsToAcquirePropertyPlantAndEquipment: units([{ ...anchor, val: 5 }]),
    Assets: units([{ ...instant, val: 200 }]), Liabilities: units([{ ...instant, val: 100 }]),
    StockholdersEquity: units([{ ...instant, val: 100 }, { ...oldInstant, val: 80 }]),
  } } };
}
test('annual financial snapshot matches periods and derives growth, FCF and average-equity ROE', () => {
  const result = buildFinancialSnapshot(data(), company, analysisDate);
  assert.equal(result.status, 'READY');
  assert.equal(result.raw.freeCashFlow, 25);
  assert.ok(Math.abs(result.ratios.revenueGrowthPct - 20) < 0.00001);
  assert.ok(Math.abs(result.ratios.roePct - 20 / 90 * 100) < 0.00001);
  assert.equal(result.warning, 'ANNUAL_DATA_NOT_TTM');
});
test('facts published after D-2, quarterly periods and wrong units cannot replace annual values', () => {
  const facts = data();
  facts.facts['us-gaap'].RevenueFromContractWithCustomerExcludingAssessedTax.units.USD.push(
    { ...anchor, filed: '2026-10-11', val: 999 }, { ...anchor, start: '2025-10-01', val: 999 });
  assert.equal(buildFinancialSnapshot(facts, company, analysisDate).raw.revenue, 120);
  facts.facts['us-gaap'].NetIncomeLoss.units = { EUR: [{ ...anchor, val: 20 }] };
  assert.equal(buildFinancialSnapshot(facts, company, analysisDate).status, 'INCOMPLETE');
});
test('missing valuation and incomplete financial inputs block candidate approval', () => {
  const out = runKStockV2Pipeline({ analysisDate, evidence: [], companies: [{ ...company, financialSnapshot: { status: 'INCOMPLETE' } }] }, {});
  assert.equal(out.GLOBAL.length, 0);
  assert.deepEqual(out.candidates[0].dataBlockers, ['FINANCIAL_DATA_INCOMPLETE', 'VALUATION_DATA_MISSING']);
});
test('conflicting facts reject snapshot and disabled refresh performs no request', async () => {
  const facts = data();
  facts.facts['us-gaap'].Assets.units.USD.push({ ...facts.facts['us-gaap'].Assets.units.USD[0], val: 300 });
  assert.throws(() => buildFinancialSnapshot(facts, company, analysisDate), /Conflicting/);
  const input = { analysisDate, companies: [company], evidence: [] };
  assert.equal(await createFinancialRefresh({ env: {}, request: () => { throw new Error('network forbidden'); } })(input), input);
});
test('revenue tag changes across years select the newest eligible period rather than the first populated alias',()=>{
 const x=data(),facts=x.facts['us-gaap'];facts.Revenues={units:{USD:facts.RevenueFromContractWithCustomerExcludingAssessedTax.units.USD}};
 facts.RevenueFromContractWithCustomerExcludingAssessedTax={units:{USD:[{...anchor,start:'2021-01-01',end:'2021-12-31',filed:'2022-02-01',accn:'0000000123-22-000001',val:20}]}};
 const r=buildFinancialSnapshot(x,company,analysisDate);assert.equal(r.periodEnd,'2025-12-31');assert.equal(r.raw.revenue,120);assert.equal(r.tags.revenue,'Revenues');
});
