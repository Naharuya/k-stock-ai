import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSecEvidence, createSec13fRefresh } from '../src/v2/sec_13f_refresh.js';
import { createCandidateService } from '../src/v2/candidate_service.js';
const env = { KSTOCK_V2_SEC_ENABLED: 'true', KSTOCK_SEC_USER_AGENT: 'K-Stock AI research contact@example.test' };
const company = { market: 'GLOBAL', ticker: 'EXM', companyName: 'Fixture', cusip: '123456789', securityClass: 'COM', cusipSource: 'https://example.test/ir' };
const filing = { form: '13F-HR', accessionNumber: '0001193125-26-352200', reportDate: '2026-06-30', filingDate: '2026-08-14', url: 'https://www.sec.gov/Archives/example.xml' };
const portfolio = { form: '13F-HR', quarterEnd: '2026-06-30', holdings: [
  { cusip: company.cusip, securityClass: 'COM', shares: 100, shareType: 'SH', putCall: '' },
  { cusip: company.cusip, securityClass: 'COM', shares: 20, shareType: 'SH', putCall: '' },
  { cusip: company.cusip, securityClass: 'COM', shares: 500, shareType: 'SH', putCall: 'CALL' },
  { cusip: '987654321', securityClass: 'COM', shares: 50, shareType: 'SH', putCall: '' },
] };
const input = { analysisDate: '2026-09-29T00:00:00+09:00', companies: [company], evidence: [] };
function provider(filings = [filing]) {
  let calls = 0;
  return { get calls() { return calls; }, async getBerkshireFilings() { calls++; return { filings }; },
    async getBerkshirePortfolio({ filing: selected }) { assert.equal(selected.accessionNumber, filing.accessionNumber); return portfolio; } };
}

test('SEC holdings map only explicit CUSIP and share class; exclude options and unknown securities', () => {
  const result = buildSecEvidence(portfolio, [company], filing);
  assert.equal(result.evidence.length, 1);
  assert.equal(result.evidence[0].shares, 120);
  assert.equal(result.evidence[0].actionType, 'hold');
  assert.equal(result.evidence[0].transactionAt, null);
  assert.equal(result.evidence[0].periodEnd, '2026-06-30');
  assert.equal(result.unmappedCount, 1);
  assert.throws(() => buildSecEvidence(portfolio, [{ ...company, cusipSource: '' }], filing), /mappings/);
  assert.throws(() => buildSecEvidence(portfolio, [company, company], filing), /Ambiguous/);
});

test('SEC refresh connects real-source evidence to candidate detail and caches concurrent collection', async () => {
  const service = provider();
  const refresh = createSec13fRefresh({ env, service });
  await Promise.all([refresh(input), refresh(input)]);
  assert.equal(service.calls, 1);
  const candidates = createCandidateService({ env, refresh, read: async () => JSON.stringify(input) });
  const result = await candidates.load();
  assert.equal(result.dataMode, 'SEC_13F');
  assert.equal(result.candidates[0].evidence[0].mappingSource, company.cusipSource);
  assert.equal(result.secCollection.unmappedCount, 1);
});

test('disabled or unidentified SEC client makes no provider requests', async () => {
  const service = provider();
  assert.equal(await createSec13fRefresh({ env: {}, service })(input), input);
  await assert.rejects(createSec13fRefresh({ env: { KSTOCK_V2_SEC_ENABLED: 'true' }, service })(input), /User-Agent/);
  await assert.rejects(createSec13fRefresh({ env: { ...env, KSTOCK_BROKER_ENABLED: 'true' }, service })(input), /broker/);
  assert.equal(service.calls, 0);
});

test('D-2 rejects a newer filing; amendments fail closed instead of guessing', async () => {
  const tooNew = { ...filing, filingDate: '2026-09-28' };
  const refresh = createSec13fRefresh({ env, service: provider([tooNew, filing]) });
  assert.equal((await refresh(input)).secCollection.accessionNumber, filing.accessionNumber);
  await assert.rejects(createSec13fRefresh({ env, service: provider([tooNew]) })(input), /No D-2/);
  const amendment = { ...filing, form: '13F-HR/A', filingDate: '2026-08-15' };
  const reviewed = await createSec13fRefresh({ env, service: provider([amendment, filing]) })(input);
  assert.equal(reviewed.reviewRequired[0].reason, 'SEC_13F_AMENDMENT');
  assert.equal(reviewed.evidence.length, 0);
});

test('SEC collection failure does not replace previous evidence with a successful result', async () => {
  const refresh = createSec13fRefresh({ env, service: { getBerkshireFilings: async () => { throw new Error('unavailable'); } } });
  await assert.rejects(refresh(input), /unavailable/);
  assert.deepEqual(input.evidence, []);
});
