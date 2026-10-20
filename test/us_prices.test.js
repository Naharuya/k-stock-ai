import assert from 'node:assert/strict';
import test from 'node:test';
import { selectDailyClose, createUsPriceRefresh, reviewSplits } from '../src/v2/us_prices.js';
const company = { ticker: 'AAPL', market: 'GLOBAL', financialSnapshot: { status: 'READY', raw: { dilutedEps: 10 }, periodEnd: '2025-09-27' } };
const analysisDate = '2026-10-12T00:00:00+09:00';
const data = { 'Meta Data': { '2. Symbol': 'AAPL' }, 'Time Series (Daily)': { '2026-10-09': { '4. close': '250.00' }, '2026-10-11': { '4. close': '999.00' } } };
test('daily close uses newest D-2 eligible session without substituting current price', () => {
  const price = selectDailyClose(data, company, analysisDate);
  assert.equal(price.close, 250);
  assert.equal(price.sessionDate, '2026-10-09');
  assert.equal(price.adjusted, false);
});
test('price adapter sanitizes failures and requires a key before requests', async () => {
  let calls = 0;
  const input = { companies: [company], analysisDate };
  const env = { KSTOCK_V2_US_PRICE_ENABLED: 'true' };
  await assert.rejects(createUsPriceRefresh({ statePath: null, env, fetchImpl: async () => { calls++; } })(input), /KEY_REQUIRED/);
  assert.equal(calls, 0);
  await assert.rejects(createUsPriceRefresh({ statePath: null, env: { ...env, ALPHAVANTAGE_API_KEY: 'fixture' }, fetchImpl: async () => { throw new Error('private url key'); } })(input), error => error.message === 'PRICE_NETWORK_UNAVAILABLE');
});
test('price refresh shares requests and computes only indicative annual PE without assigning valuation score', async () => {
  let calls = 0;
  const refresh = createUsPriceRefresh({ statePath: null, env: { KSTOCK_V2_US_PRICE_ENABLED: 'true', ALPHAVANTAGE_API_KEY: 'fixture' }, fetchImpl: async url => {
    calls++;
    return { ok: true, json: async () => url.searchParams.get('function') === 'SPLITS' ? { symbol: 'AAPL', data: [] } : data };
  } });
  const input = { analysisDate, companies: [company] };
  const [a] = await Promise.all([refresh(input), refresh(input)]);
  assert.equal(calls, 2);
  assert.equal(a.companies[0].valuationSnapshot.annualPe, 25);
  assert.equal(a.companies[0].valuationSnapshot.annualEarningsYieldPct, 4);
  assert.deepEqual(a.companies[0].valuation, {});
});
test('stale, wrong-symbol and invalid prices cannot look like current valid data', () => {
  assert.equal(selectDailyClose(data, company, '2026-11-01T00:00:00Z').status, 'STALE');
  assert.throws(() => selectDailyClose(data, { ticker: 'OTHER' }, analysisDate), /response/);
  const invalid = { ...data, 'Time Series (Daily)': { '2026-10-09': { '4. close': '0' } } };
  assert.throws(() => selectDailyClose(invalid, company, analysisDate), /price/);
});

test('split review blocks mismatched EPS, rejects malformed data, and excludes future events', () => {
  const price = selectDailyClose(data, company, analysisDate);
  const payload = { symbol: 'AAPL', data: [{ effective_date: '2026-01-01', split_factor: '4' }] };
  assert.equal(reviewSplits(payload, company, price).status, 'REVIEW_REQUIRED');
  assert.equal(reviewSplits({ symbol: 'AAPL', data: [{ effective_date: '2026-12-01', split_factor: '4' }] }, company, price).status, 'READY');
  assert.equal(reviewSplits(payload, { ...company, financialSnapshot: {} }, price).status, 'INCOMPLETE');
  assert.throws(() => reviewSplits({ ...payload, symbol: 'OTHER' }, company, price));
  assert.throws(() => reviewSplits({ symbol: 'AAPL', data: [{ effective_date: '2026-01-01', split_factor: '0' }] }, company, price));
});

test('split provider errors do not expose provider payload or key', async () => {
  await assert.rejects(createUsPriceRefresh({ statePath: null, env: { KSTOCK_V2_US_PRICE_ENABLED: 'true', ALPHAVANTAGE_API_KEY: 'fixture' },
    fetchImpl: async url => ({ ok: true, json: async () => url.searchParams.get('function') === 'SPLITS'
      ? { Information: 'private provider payload fixture' } : data }) })({ analysisDate, companies: [company] }),
    error => error.message === 'SPLITS_PROVIDER_UNAVAILABLE');
});

test('cached provider data is reevaluated for changed financial periods and invalid EPS', async () => {
  let calls = 0;
  const refresh = createUsPriceRefresh({ statePath: null,
    env: { KSTOCK_V2_US_PRICE_ENABLED: 'true', ALPHAVANTAGE_API_KEY: 'fixture' },
    fetchImpl: async url => { calls++; return { ok: true, json: async () => url.searchParams.get('function') === 'SPLITS'
      ? { symbol: 'AAPL', data: [{ effective_date: '2026-01-01', split_factor: '4' }] } : data }; } });
  const initial = await refresh({ analysisDate, companies: [company] });
  assert.equal(initial.companies[0].valuationSnapshot.annualPe, null);
  const changed = { ...company, financialSnapshot: { ...company.financialSnapshot, periodEnd: '2026-09-27' } };
  const revised = await refresh({ analysisDate, companies: [changed] });
  assert.equal(revised.companies[0].valuationSnapshot.annualPe, 25);
  const missing = await refresh({ analysisDate, companies: [{ ...changed, financialSnapshot: { ...changed.financialSnapshot, status: 'INCOMPLETE' } }] });
  assert.equal(missing.companies[0].valuationSnapshot.annualEarningsYieldPct, null);
  assert.ok(missing.companies[0].valuationSnapshot.missing.includes('annualEps'));
  assert.equal(calls, 2);
});
test('explicit partial collection preserves observed price while split failure blocks valuation', async () => {
 const result=await createUsPriceRefresh({statePath:null,
 env:{KSTOCK_V2_US_PRICE_ENABLED:'true',KSTOCK_V2_PARTIAL_PRICE_ENABLED:'true',ALPHAVANTAGE_API_KEY:'fixture'},fetchImpl:async url=>({ok:true,json:async()=>url.searchParams.get('function')==='SPLITS'?{Information:'private fixture'}:data})})({analysisDate,companies:[company]});
 const item=result.companies[0];assert.equal(item.priceSnapshot.close,250);assert.equal(item.corporateActionSnapshot.status,'INCOMPLETE');
 assert.equal(item.valuationSnapshot.annualPe,null);assert.ok(item.valuationSnapshot.missing.includes('corporateActionReview'));
 assert.equal(JSON.stringify(result).includes('private fixture'),false);
});
