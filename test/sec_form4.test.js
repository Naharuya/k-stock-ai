import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeForm4, createForm4Refresh } from '../src/v2/sec_form4_refresh.js';
const company = { ticker: 'EXM', cik: '123', market: 'GLOBAL', companyName: 'Fixture', form4SecurityTitle: 'Common Stock' };
const filing = { accessionNumber: '0000000123-26-000001', filingDate: '2026-09-24', url: 'https://www.sec.gov/example.xml' };
const env = { KSTOCK_V2_FORM4_ENABLED: 'true', KSTOCK_SEC_USER_AGENT: 'K-Stock contact@example.test' };
const input = { analysisDate: '2026-09-29T00:00:00+09:00', companies: [company], evidence: [] };
function xml(code = 'P', direction = 'A') {
  return `<ownershipDocument><documentType>4</documentType><aff10b5One>1</aff10b5One><issuer><issuerCik>123</issuerCik><issuerTradingSymbol>EXM</issuerTradingSymbol></issuer><reportingOwner><reportingOwnerId><rptOwnerCik>456</rptOwnerCik><rptOwnerName>Private fixture name</rptOwnerName></reportingOwnerId></reportingOwner><nonDerivativeTable><nonDerivativeTransaction><securityTitle><value>Common Stock</value></securityTitle><transactionDate><value>2026-09-22</value></transactionDate><transactionCoding><transactionCode>${code}</transactionCode></transactionCoding><transactionAmounts><transactionShares><value>100</value></transactionShares><transactionAcquiredDisposedCode><value>${direction}</value></transactionAcquiredDisposedCode></transactionAmounts></nonDerivativeTransaction></nonDerivativeTable></ownershipDocument>`;
}
test('Form 4 preserves dates and planned trade marker without retaining names', () => {
  const item = normalizeForm4(xml(), company, filing).evidence[0];
  assert.equal(item.actionType, 'increase');
  assert.equal(item.transactionAt, '2026-09-22');
  assert.equal(item.publishedAt, '2026-09-24T23:59:59-05:00');
  assert.equal(item.planned10b51, true);
  assert.equal(JSON.stringify(item).includes('Private fixture name'), false);
  assert.equal(normalizeForm4(xml('S', 'D'), company, filing).evidence[0].actionType, 'reduce');
});
test('awards and gifts are excluded; mismatched issuer or trade direction fails closed', () => {
  assert.equal(normalizeForm4(xml('A'), company, filing).evidence.length, 0);
  assert.equal(normalizeForm4(xml('G'), company, filing).excludedCount, 1);
  assert.throws(() => normalizeForm4(xml(), { ...company, cik: '999' }, filing), /mismatch/);
  assert.throws(() => normalizeForm4(xml('P', 'D'), company, filing), /direction/);
});
test('Form 4 refresh selects raw XML, retains 13F evidence, and shares collection cache', async () => {
  let calls = 0;
  const request = async url => {
    calls++;
    if (url.includes('submissions')) return { json: async () => ({ filings: { recent: {
      form: ['4'], filingDate: [filing.filingDate], accessionNumber: [filing.accessionNumber], primaryDocument: ['xslF345X05/form4.xml'],
    } } }) };
    assert.ok(url.endsWith('/form4.xml'));
    assert.equal(url.includes('xslF345X05'), false);
    return { text: async () => xml() };
  };
  const refresh = createForm4Refresh({ env, request });
  const seed = { ...input, evidence: [{ id: 'sec:13f:keep' }] };
  const [a, b] = await Promise.all([refresh(seed), refresh(seed)]);
  assert.equal(calls, 2);
  assert.equal(a.evidence.length, 2);
  assert.deepEqual(a.evidence, b.evidence);
  assert.equal(a.form4Collection.coverage, 'SUBMISSION_DATE_WINDOW');
});
test('disabled collection makes no calls and eligible amendments block ranking', async () => {
  let calls = 0;
  const request = async () => { calls++; return { json: async () => ({ filings: { recent: {
    form: ['4/A'], filingDate: [filing.filingDate], accessionNumber: [filing.accessionNumber], primaryDocument: ['form4.xml'],
  } } }) }; };
  assert.equal(await createForm4Refresh({ env: {}, request })(input), input);
  assert.equal(calls, 0);
  const reviewed = await createForm4Refresh({ env, request })(input);
  assert.equal(reviewed.reviewRequired[0].reason, 'SEC_FORM4_AMENDMENT');
  assert.equal(reviewed.evidence.length, 0);
});

test('amendment found only in a historical submission file blocks candidate refresh', async () => {
  const request = async url => ({ json: async () => url.endsWith('CIK0000000123.json') ? {
    filings: { recent: { form: [], filingDate: [], accessionNumber: [], primaryDocument: [] },
      files: [{ name: 'CIK0000000123-submissions-001.json', filingFrom: '2026-09-01', filingTo: '2026-09-25' }] },
  } : { form: ['4/A'], filingDate: [filing.filingDate], accessionNumber: [filing.accessionNumber], primaryDocument: ['form4.xml'] } });
  const reviewed = await createForm4Refresh({ env, request })(input);
  assert.equal(reviewed.reviewRequired[0].reason, 'SEC_FORM4_AMENDMENT');
  assert.equal(reviewed.evidence.length, 0);
});

test('Form 4 configurable limit rejects unbounded collection before requests', async () => {
  let calls = 0;
  await assert.rejects(createForm4Refresh({ env: { ...env, KSTOCK_V2_FORM4_MAX_FILINGS: '21' }, request: async () => { calls++; } })(input), /limit/);
  assert.equal(calls, 0);
});
