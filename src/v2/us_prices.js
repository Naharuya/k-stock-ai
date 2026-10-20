import { fileURLToPath } from 'node:url';
import { createAlphaVantageClient } from './alpha_vantage_client.js';
import { assertSafeKStockV2Environment, isD2Eligible } from './scoring.js';
function validDate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date || '') && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
}
export function selectDailyClose(data, company, analysisDate) {
  if (data?.['Meta Data']?.['2. Symbol'] !== company.ticker || !data['Time Series (Daily)']) throw new Error('Invalid price response');
  const rows = Object.entries(data['Time Series (Daily)']).filter(([day]) => validDate(day)
    && isD2Eligible(`${day}T23:59:59-05:00`, analysisDate)).sort(([a], [b]) => b.localeCompare(a));
  if (!rows.length) throw new Error('No D-2 eligible price');
  const [day, values] = rows[0];
  const text = values['4. close'];
  if (typeof text !== 'string' || !/^\d+(\.\d+)?$/.test(text) || !Number.isFinite(Number(text)) || Number(text) <= 0) throw new Error('Invalid closing price');
  const ageDays = (Date.parse(analysisDate) - Date.parse(`${day}T23:59:59-05:00`)) / 86400000;
  return { status: ageDays > 7 ? 'STALE' : 'READY', ticker: company.ticker, close: Number(text), currency: 'USD',
    sessionDate: day, observedAt: `${day}T23:59:59-05:00`, adjusted: false, source: 'Alpha Vantage TIME_SERIES_DAILY',
    sourceUrl: 'https://www.alphavantage.co/documentation/#daily', ageDays: Math.round(ageDays * 10) / 10,
    warning: 'RAW_CLOSE_SPLIT_REVIEW_REQUIRED' };
}
export function reviewSplits(data, company, price) {
  if (data?.symbol !== company.ticker || !Array.isArray(data.data)) throw new Error('SPLITS_RESPONSE_INVALID');
  const events = data.data.map(row => {
    if (!validDate(row?.effective_date) || typeof row.split_factor !== 'string'
      || !/^\d+(\.\d+)?$/.test(row.split_factor) || !Number.isFinite(Number(row.split_factor))
      || Number(row.split_factor) <= 0) throw new Error('SPLITS_RESPONSE_INVALID');
    return { effectiveDate: row.effective_date, factor: Number(row.split_factor) };
  });
  const periodEnd = company.financialSnapshot?.periodEnd;
  const relevant = events.filter(x => x.effectiveDate > periodEnd && x.effectiveDate <= price.sessionDate);
  return { status: !validDate(periodEnd) || periodEnd > price.sessionDate ? 'INCOMPLETE'
    : relevant.length ? 'REVIEW_REQUIRED' : 'READY', events: relevant,
    fromDate: periodEnd || null, throughDate: price.sessionDate,
    source: 'Alpha Vantage SPLITS', sourceUrl: 'https://www.alphavantage.co/documentation/#splits' };
}
export function createUsPriceRefresh({ env = process.env, fetchImpl = globalThis.fetch, tolerateSplitUnavailable = env.KSTOCK_V2_PARTIAL_PRICE_ENABLED === 'true', now = () => Date.now(), statePath = fileURLToPath(new URL('../../data/v2/alpha-vantage-state.json', import.meta.url)) } = {}) {
  const request = createAlphaVantageClient({ apiKey: env.ALPHAVANTAGE_API_KEY, fetchImpl, now, statePath });
  let cache, pending;
  return async input => {
    assertSafeKStockV2Environment(env);
    if (env.KSTOCK_V2_US_PRICE_ENABLED !== 'true') return input;
    if (!env.ALPHAVANTAGE_API_KEY) throw new Error('PRICE_API_KEY_REQUIRED');
    const companies = input.companies.filter(x => x.market === 'GLOBAL');
    if (companies.length > 5 || companies.some(x => !/^[A-Z][A-Z0-9.-]{0,14}$/.test(x.ticker))) throw new Error('Invalid price scope');
    const key = JSON.stringify([input.analysisDate, companies.map(x => x.ticker)]);
    while (pending) await pending;
    if (cache?.key !== key || cache.expiresAt <= now()) {
      pending = (async () => {
        const prices = new Map();
        const splits = new Map();
        for (const company of companies) {
          const data = await request('TIME_SERIES_DAILY', company.ticker,
            value => selectDailyClose(value, company, input.analysisDate));
          const price = selectDailyClose(data, company, input.analysisDate);
          prices.set(company.ticker, price);
          try {
            const events = await request('SPLITS', company.ticker, value => reviewSplits(value, company, price));
            splits.set(company.ticker, { data:events });
          } catch (error) {
            if (!tolerateSplitUnavailable || !/^SPLITS_(PROVIDER_UNAVAILABLE|PROVIDER_COOLDOWN|NETWORK_UNAVAILABLE|HTTP_UNAVAILABLE)$/.test(error.message)) throw error;
            splits.set(company.ticker, { unavailable:error.message });
          }
        }
        cache = { key, prices, splits, expiresAt: now() + 6 * 3600000 };
      })();
      try { await pending; } finally { pending = undefined; }
    }
    return { ...input, companies: input.companies.map(company => {
      if (company.market !== 'GLOBAL') return company;
      const price = cache.prices.get(company.ticker);
      const split = cache.splits.get(company.ticker);
      const corporateActions = split.unavailable ? { status:'INCOMPLETE', reason:split.unavailable,
        source:'Alpha Vantage SPLITS', sourceUrl:'https://www.alphavantage.co/documentation/#splits' }
        : reviewSplits(split.data, company, price);
      const eps = company.financialSnapshot?.raw?.dilutedEps;
      const usableEps = company.financialSnapshot?.status === 'READY' && price.status === 'READY'
        && corporateActions.status === 'READY' && Number.isFinite(eps) && eps > 0;
      return { ...company, priceSnapshot: price, corporateActionSnapshot: corporateActions, valuation: {}, valuationScore: undefined,
        valuationSnapshot: { status: 'INCOMPLETE', annualPe: usableEps ? price.close / eps : null,
          annualEarningsYieldPct: usableEps ? eps / price.close * 100 : null,
          priceDate: price.sessionDate, financialPeriodEnd: company.financialSnapshot?.periodEnd || null,
          missing: [...(price.status === 'READY' ? [] : ['currentPrice']),
            ...(Number.isFinite(eps) && eps > 0 && company.financialSnapshot?.status === 'READY' ? [] : ['annualEps']),
            ...(corporateActions.status === 'READY' ? [] : ['corporateActionReview']), 'valuationComparison'],
          warning: corporateActions.status === 'READY' ? 'ANNUAL_EPS_NOT_TTM' : 'ANNUAL_EPS_NOT_TTM_SPLIT_REVIEW_REQUIRED' } };
    }) };
  };
}
