import { isD2Eligible } from './scoring.js';
const dayMs = 86400000;
const date = x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x)
  && Number.isFinite(Date.parse(x)) && new Date(x).toISOString().slice(0, 10) === x;
const positive = x => typeof x === 'number' && Number.isFinite(x) && x > 0;
function source(value) {
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && !u.search && !u.hash; }
  catch { return false; }
}
export const median = rows => {
  const values = rows.map(x => x.pe).sort((a, b) => a - b), mid = Math.floor(values.length / 2);
  return values.length % 2 ? values[mid] : values[mid - 1] / 2 + values[mid] / 2;
};
export function buildValuationComparison(company, analysisDate) {
  const input = company.valuationComparables || {};
  const rejected = [], history = [], peers = [], seen = new Set();
  const targetPe = company.valuationSnapshot?.annualPe;
  const currentReady = company.financialSnapshot?.status === 'READY' && company.priceSnapshot?.status === 'READY'
    && company.corporateActionSnapshot?.status === 'READY' && positive(targetPe);
  for (const kind of ['history', 'peers']) {
    const rows = input[kind] || [];
    if (!Array.isArray(rows) || rows.length > 100) throw new Error('Invalid valuation comparison input');
    for (const [index, row] of rows.entries()) {
      let reason;
      const closeAt = `${row?.priceDate}T23:59:59-05:00`;
      if (!row || row.market !== company.market || row.currency !== 'USD' || row.basis !== 'ANNUAL_DILUTED_EPS'
        || row.splitReviewed !== true || !positive(row.close) || !positive(row.dilutedEps)
        || !date(row.priceDate) || !date(row.financialPeriodEnd) || !source(row.priceSourceUrl) || !source(row.financialSourceUrl)
        || typeof row.publishedAt !== 'string' || !Number.isFinite(Date.parse(row.publishedAt))) reason = 'INVALID_OR_INCOMPARABLE_ROW';
      else if (!isD2Eligible(closeAt, analysisDate) || !isD2Eligible(row.publishedAt, analysisDate)
        || Date.parse(row.publishedAt) > Date.parse(closeAt) || row.financialPeriodEnd > row.priceDate
        || Date.parse(row.publishedAt) < Date.parse(row.financialPeriodEnd)) reason = 'POINT_IN_TIME_MISMATCH';
      else if ((Date.parse(row.priceDate) - Date.parse(row.financialPeriodEnd)) / dayMs > 550) reason = 'STALE_FINANCIAL_PERIOD';
      else if (kind === 'history' && (row.ticker !== company.ticker || row.priceDate >= company.priceSnapshot?.sessionDate
        || Date.parse(analysisDate) - Date.parse(closeAt) > 6 * 365 * dayMs)) reason = 'INVALID_HISTORY_SCOPE';
      else if (kind === 'peers' && (typeof row.ticker !== 'string' || !/^[A-Z][A-Z0-9.-]{0,14}$/.test(row.ticker)
        || row.ticker === company.ticker || !company.sector || row.sector !== company.sector
        || row.priceDate !== company.priceSnapshot?.sessionDate)) reason = 'PEER_SCOPE_MISMATCH';
      const key = kind === 'history' ? `history:${row?.priceDate?.slice(0, 4)}` : `peer:${row?.ticker}`;
      if (!reason && seen.has(key)) reason = 'DUPLICATE_COMPARISON';
      const pe = row?.close / row?.dilutedEps;
      if (!reason && !positive(pe)) reason = 'INVALID_RATIO';
      if (reason) { rejected.push({ kind, index, reason }); continue; }
      seen.add(key);
      (kind === 'history' ? history : peers).push({ ticker: row.ticker, market: row.market, currency: row.currency,
        basis: row.basis, priceDate: row.priceDate, financialPeriodEnd: row.financialPeriodEnd, publishedAt: row.publishedAt,
        close: row.close, dilutedEps: row.dilutedEps, priceSourceUrl: row.priceSourceUrl, financialSourceUrl: row.financialSourceUrl, pe });
    }
  }
  const missing = [];
  if (!currentReady) missing.push('currentAnnualPe');
  const span = history.length ? Math.max(...history.map(x => Date.parse(x.priceDate))) - Math.min(...history.map(x => Date.parse(x.priceDate))) : 0;
  if (history.length < 3 || span < 700 * dayMs) missing.push('historicalAnnualPeSamples');
  if (peers.length < 3) missing.push('sameSectorAnnualPePeers');
  const summarize = rows => ({ count: rows.length, medianPe: rows.length ? median(rows) : null,
    premiumToMedianPct: currentReady && rows.length ? (targetPe / median(rows) - 1) * 100 : null, observations: rows });
  return { status: missing.length ? 'INCOMPLETE' : 'REFERENCE_READY', basis: 'ANNUAL_DILUTED_EPS',
    history: summarize(history), peers: summarize(peers), missing, rejected,
    warning: 'LOCAL_INPUT_PROVENANCE_NOT_INDEPENDENTLY_VERIFIED', rankingEligible: false };
}
