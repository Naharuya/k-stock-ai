import { createSecRequest } from '../services/leader_disclosures.js';
import { assertSafeKStockV2Environment, isD2Eligible } from './scoring.js';
const tags = {
  revenue: ['RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenues', 'SalesRevenueNet'],
  netIncome: ['NetIncomeLoss'], operatingCashFlow: ['NetCashProvidedByUsedInOperatingActivities'],
  capex: ['PaymentsToAcquirePropertyPlantAndEquipment'], assets: ['Assets'], liabilities: ['Liabilities'],
  equity: ['StockholdersEquity'],
};
function eligible(rows, analysisDate) {
  return (rows || []).filter(x => x.form === '10-K' && Number.isFinite(x.val)
    && /^\d{10}-\d{2}-\d{6}$/.test(x.accn || '') && /^\d{4}-\d{2}-\d{2}$/.test(x.end || '')
    && /^\d{4}-\d{2}-\d{2}$/.test(x.filed || '') && x.end <= x.filed
    && isD2Eligible(`${x.filed}T23:59:59-05:00`, analysisDate));
}
const annual = x => x.start && (Date.parse(x.end) - Date.parse(x.start)) / 86400000 >= 300 && (Date.parse(x.end) - Date.parse(x.start)) / 86400000 <= 400;
function unique(rows) {
  if (!rows.length) return null;
  if (new Set(rows.map(x => x.val)).size > 1) throw new Error('Conflicting SEC financial facts');
  return rows[0];
}
export function buildFinancialSnapshot(data, company, analysisDate) {
  if (String(data?.cik).padStart(10, '0') !== company.cik.padStart(10, '0')) throw new Error('SEC financial issuer mismatch');
  const facts = data?.facts?.['us-gaap'];
  if (!facts || typeof facts !== 'object') throw new Error('SEC financial facts missing');
  // Tags can change across fiscal years. Select by period before alias preference.
  const revenueRows=tags.revenue.flatMap(tag=>eligible(facts[tag]?.units?.USD,analysisDate).filter(annual).map(row=>({...row,selectedRevenueTag:tag})));
  if (!revenueRows.length) return { status: 'MISSING', missing: ['annualRevenue'], metrics: {}, raw: {} };
  revenueRows.sort((a, b) => b.end.localeCompare(a.end) || b.filed.localeCompare(a.filed));
  const first = revenueRows[0];
  const anchor = unique(revenueRows.filter(x => x.end === first.end && x.filed === first.filed && x.accn === first.accn));
  const priorRows = revenueRows.filter(x => x.end < anchor.end && (Date.parse(anchor.end) - Date.parse(x.end)) / 86400000 >= 300 && (Date.parse(anchor.end) - Date.parse(x.end)) / 86400000 <= 400)
    .sort((a, b) => b.end.localeCompare(a.end) || b.filed.localeCompare(a.filed));
  const previous = priorRows.length ? unique(priorRows.filter(x => x.end === priorRows[0].end && x.filed === priorRows[0].filed)) : null;
  const raw = { revenue: anchor.val, priorRevenue: previous?.val ?? null };
  const selectedTags = { revenue: anchor.selectedRevenueTag };
  for (const [key, aliases] of Object.entries(tags)) {
    if (key === 'revenue') continue;
    raw[key] = null;
    for (const tag of aliases) {
      const rows = eligible(facts[tag]?.units?.USD, analysisDate).filter(x => x.accn === anchor.accn && x.end === anchor.end
        && (['netIncome', 'operatingCashFlow', 'capex'].includes(key) ? x.start === anchor.start && annual(x) : !x.start));
      const match = unique(rows);
      if (match) { raw[key] = match.val; selectedTags[key] = tag; break; }
    }
  }
  raw.freeCashFlow = raw.operatingCashFlow !== null && raw.capex !== null ? raw.operatingCashFlow - raw.capex : null;
  const eps = unique(eligible(facts.EarningsPerShareDiluted?.units?.['USD/shares'], analysisDate).filter(x => x.accn === anchor.accn && x.start === anchor.start && x.end === anchor.end));
  raw.dilutedEps = eps?.val ?? null;
  const previousEquity = previous ? unique(eligible(facts.StockholdersEquity?.units?.USD, analysisDate).filter(x => !x.start && x.end === previous.end && x.accn === anchor.accn)) : null;
  const meanEquity = previousEquity && raw.equity !== null ? (previousEquity.val + raw.equity) / 2 : null;
  const ratios = {
    revenueGrowthPct: raw.priorRevenue > 0 ? (raw.revenue / raw.priorRevenue - 1) * 100 : null,
    freeCashFlowMarginPct: raw.freeCashFlow !== null && raw.revenue > 0 ? raw.freeCashFlow / raw.revenue * 100 : null,
    roePct: raw.netIncome !== null && meanEquity > 0 ? raw.netIncome / meanEquity * 100 : null,
    equityToAssetsPct: raw.assets > 0 && raw.liabilities !== null ? (raw.assets - raw.liabilities) / raw.assets * 100 : null,
  };
  const missing = Object.entries(ratios).filter(([, v]) => !Number.isFinite(v)).map(([key]) => key);
  const clamp = x => Math.max(0, Math.min(100, x));
  const metrics = { source: 'SEC_ANNUAL',
    revenueGrowth: ratios.revenueGrowthPct === null ? null : clamp((ratios.revenueGrowthPct + 10) * 2.5),
    cashFlow: ratios.freeCashFlowMarginPct === null ? null : clamp(ratios.freeCashFlowMarginPct / 30 * 100),
    roe: ratios.roePct === null ? null : clamp(ratios.roePct / 30 * 100),
    balanceSheet: ratios.equityToAssetsPct === null ? null : clamp(ratios.equityToAssetsPct),
  };
  const ageDays = (Date.parse(analysisDate) - Date.parse(anchor.end)) / 86400000;
  if (ageDays > 550) missing.push('annualStatementStale');
  return { status: missing.length ? 'INCOMPLETE' : 'READY', missing, raw, ratios, metrics, tags: selectedTags,
    periodStart: anchor.start, periodEnd: anchor.end, filed: anchor.filed, accessionNumber: anchor.accn,
    sourceUrl: `https://www.sec.gov/Archives/edgar/data/${Number(company.cik)}/${anchor.accn.replaceAll('-', '')}/${anchor.accn}-index.html`,
    warning: 'ANNUAL_DATA_NOT_TTM', ageDays: Math.round(ageDays) };
}
export function createFinancialRefresh({ env = process.env, request, now = () => Date.now() } = {}) {
  const sec = request || createSecRequest({ userAgent: env.KSTOCK_SEC_USER_AGENT });
  let cache, pending;
  return async input => {
    assertSafeKStockV2Environment(env);
    if (env.KSTOCK_V2_FINANCIALS_ENABLED !== 'true') return input;
    if (!/^.{3,}\s+[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.KSTOCK_SEC_USER_AGENT || '')) throw new Error('SEC User-Agent required');
    const companies = input.companies.filter(x => x.market === 'GLOBAL');
    if (companies.length > 5 || companies.some(x => !/^\d{1,10}$/.test(x.cik || ''))) throw new Error('Invalid SEC financial scope');
    const key = JSON.stringify([input.analysisDate, companies.map(x => [x.ticker, x.cik])]);
    while (pending) await pending;
    if (cache?.key !== key || cache.expiresAt <= now()) {
      pending = (async () => {
        const snapshots = new Map();
        for (const company of companies) {
          const data = await (await sec(`https://data.sec.gov/api/xbrl/companyfacts/CIK${company.cik.padStart(10, '0')}.json`, 'application/json')).json();
          snapshots.set(company.ticker, buildFinancialSnapshot(data, company, input.analysisDate));
        }
        cache = { key, snapshots, expiresAt: now() + 600000 };
      })();
      try { await pending; } finally { pending = undefined; }
    }
    return { ...input, companies: input.companies.map(company => {
      const snapshot = company.market === 'GLOBAL' ? cache.snapshots.get(company.ticker) : null;
      return snapshot ? { ...company, financialSnapshot: snapshot, fundamentals: snapshot.metrics, valuation: {}, valuationScore: undefined } : company;
    }) };
  };
}
