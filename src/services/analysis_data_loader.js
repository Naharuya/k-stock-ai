import { detectCriticalDartDisclosures } from '../utils/risk_hard_stop.js';

const CORE_ACCOUNT_PATTERNS = [
  /매출액|영업수익|수익\(매출액\)/,
  /영업이익|영업손실/,
  /당기순이익|분기순이익|반기순이익|순이익\(손실\)/,
  /법인세비용차감전순이익/,
  /자산총계|총자산/,
  /부채총계|총부채/,
  /자본총계|총자본/,
  /영업활동.*현금흐름/,
  /투자활동.*현금흐름/,
  /재무활동.*현금흐름/,
  /현금및현금성자산/,
  /차입금|이자비용/,
];

const MODEL_FINANCIAL_FIELDS = [
  'account_nm',
  'sj_nm',
  'sj_div',
  'fs_div',
  'thstrm_nm',
  'thstrm_amount',
  'frmtrm_nm',
  'frmtrm_amount',
  'bfefrmtrm_nm',
  'bfefrmtrm_amount',
  'currency',
  'bsns_year',
  'rcept_dt',
];

export function summarizeFinancials(financials, maxFallbackItems = 24) {
  const sourceItems = Array.isArray(financials?.items) ? financials.items : [];
  const coreItems = sourceItems.filter((item) =>
    CORE_ACCOUNT_PATTERNS.some((pattern) => pattern.test(item.account_nm ?? item.accountName ?? '')),
  );
  const selectedItems = coreItems.length > 0 ? coreItems : sourceItems.slice(0, maxFallbackItems);

  return {
    status: financials?.status,
    sourceItemCount: sourceItems.length,
    selectedItemCount: selectedItems.length,
    selectionMode: coreItems.length > 0 ? 'core_accounts' : 'fallback',
    items: selectedItems.map((item) => Object.fromEntries(
      MODEL_FINANCIAL_FIELDS
        .filter((field) => item[field] !== undefined)
        .map((field) => [field, item[field]]),
    )),
  };
}

const MODEL_DISCLOSURE_FIELDS = ['rcept_no', 'report_nm', 'rcept_dt', 'flr_nm', 'rm'];

export function summarizeDisclosures(disclosures, maxItems = 50) {
  const sourceItems = Array.isArray(disclosures?.items) ? disclosures.items : [];
  const selectedItems = [...sourceItems]
    .sort((left, right) => {
      const dateOrder = String(right.rcept_dt ?? '').localeCompare(String(left.rcept_dt ?? ''));
      return dateOrder || String(right.rcept_no ?? '').localeCompare(String(left.rcept_no ?? ''));
    })
    .slice(0, maxItems);

  return {
    status: disclosures?.status,
    sourceItemCount: sourceItems.length,
    selectedItemCount: selectedItems.length,
    retrievedPages: disclosures?.retrievedPages ?? 0,
    totalPages: disclosures?.totalPages ?? 0,
    truncated: disclosures?.truncated === true || sourceItems.length > selectedItems.length,
    items: selectedItems.map((item) => Object.fromEntries(
      MODEL_DISCLOSURE_FIELDS
        .filter((field) => item[field] !== undefined)
        .map((field) => [field, item[field]]),
    )),
  };
}

export function createAnalysisDataLoader({
  pipeline,
  kisEnabled = process.env.KSTOCK_KIS_ENABLED === 'true',
  dartEnabled = process.env.KSTOCK_DART_ENABLED === 'true',
} = {}) {
  if (typeof pipeline?.loadSnapshot !== 'function') {
    throw new TypeError('safe data pipeline is required');
  }

  async function load(stockData) {
    if (!kisEnabled && !dartEnabled) return { stockData, snapshot: null };
    if (!kisEnabled || !dartEnabled) {
      throw new Error('KIS and OpenDART must both be enabled for live analysis');
    }
    if (!stockData?.symbol || !stockData?.name) {
      throw new Error('symbol and name are required.');
    }

    const year = stockData.year ?? String(new Date().getFullYear() - 1);
    const snapshot = await pipeline.loadSnapshot({
      symbol: stockData.symbol,
      corpCode: stockData.corpCode,
      year,
      disclosureBeginDate: stockData.disclosureBeginDate,
      disclosureEndDate: stockData.disclosureEndDate,
    });
    const { financials: _callerDartFinancials, ...callerDart } = stockData.dart ?? {};

    return {
      stockData: {
        ...stockData,
        market: {
          ...(stockData.market ?? {}),
          quote: snapshot.quote,
          freshness: snapshot.freshness,
        },
        company: {
          ...(stockData.company ?? {}),
          financials: summarizeFinancials(snapshot.financials),
        },
        dart: {
          ...callerDart,
          corpCode: snapshot.corpCode,
          disclosures: summarizeDisclosures(snapshot.disclosures),
          riskSignals: detectCriticalDartDisclosures(snapshot.disclosures.items),
        },
      },
      snapshot,
    };
  }

  return { load };
}