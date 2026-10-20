import { verifyDartPeriod } from './accounting_periods.js';
import { isD2Eligible } from './scoring.js';
import { median } from './valuation_comparison.js';
const numeric = value => {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value).replaceAll(',', '').trim();
  return /^-?\d+(\.\d+)?$/.test(text) && Number.isFinite(Number(text)) ? Number(text) : null;
};
const validDay = x => /^\d{4}-\d{2}-\d{2}$/.test(x || '') && Number.isFinite(Date.parse(x)) && new Date(x).toISOString().slice(0, 10) === x;
export function normalizeKisQuote(response, company, collectedAt) {
  if (response?.rt_cd !== '0' || !response.output) throw new Error('KR_KIS_RESPONSE_INVALID');
  const row = response.output;
  return { ticker: company.ticker, companyName: company.companyName, source: 'KIS', collectedAt,
    asOfDate: null, currency: 'KRW', fiscalPeriod: null, industryCode: company.industryCode || null, industryName: row.bstp_kor_isnm || null,
    price: numeric(row.stck_prpr), marketCap: numeric(row.hts_avls) === null ? null : numeric(row.hts_avls) * 100000000,
    shares: numeric(row.lstn_stcn), providerPer: numeric(row.per), providerPbr: numeric(row.pbr), volume: numeric(row.acml_vol),
    qualityStatus: 'UNDER_REVIEW', warning: 'QUOTE_DATE_AND_MULTIPLE_BASIS_UNVERIFIED' };
}
const tags = { revenue: ['ifrs-full_Revenue'], operatingIncome: ['dart_OperatingIncomeLoss'],
  netIncome: ['ifrs-full_ProfitLoss'], assets: ['ifrs-full_Assets'], liabilities: ['ifrs-full_Liabilities'], equity: ['ifrs-full_Equity'] };
export function normalizeDartFinancials(items, company, { year, reportCode = '11011', periodItems = [], disclosures = [], collectedAt, analysisDate }) {
  const raw = {}, missing = [], receipts = new Set();
  for (const [key, ids] of Object.entries(tags)) {
    const rows = items.filter(x => x.corp_code === company.corpCode && x.bsns_year === String(year) && x.reprt_code === reportCode
      && ids.includes(x.account_id) && x.currency === 'KRW' && (['assets','liabilities','equity'].includes(key) ? x.sj_div === 'BS' : ['IS','CIS'].includes(x.sj_div)));
    const values = new Set(rows.map(x => numeric(reportCode === '11011' || ['assets','liabilities','equity'].includes(key) ? x.thstrm_amount : x.thstrm_add_amount)));
    raw[key] = rows.length && values.size === 1 && !values.has(null) ? [...values][0] : null;
    if (raw[key] === null) missing.push(key);
    rows.forEach(x => receipts.add(x.rcept_no));
  }
  const receipt = receipts.size === 1 ? [...receipts][0] : null;
  const filing = disclosures.find(x => x.rcept_no === receipt && x.corp_code === company.corpCode);
  const publishedAt = filing && /^\d{8}$/.test(filing.rcept_dt || '')
    ? `${filing.rcept_dt.slice(0,4)}-${filing.rcept_dt.slice(4,6)}-${filing.rcept_dt.slice(6,8)}T23:59:59+09:00` : null;
  if (!publishedAt || !isD2Eligible(publishedAt, analysisDate)) missing.push('publicationDate');
  if (!/^\d{14}$/.test(receipt || '')) missing.push('filingIdentity');
  const verified=verifyDartPeriod(periodItems,{corpCode:company.corpCode,year,reportCode,basis:'CFS',receipt,raw});
  if(verified.status!=='VERIFIED')missing.push('fiscalPeriodDates');
  const amendments=disclosures.filter(x=>x.corp_code===company.corpCode && x.report_nm?.includes('정정') && x.report_nm?.includes(String(year)) && x.rcept_no!==receipt);
  if(amendments.length)missing.push('amendmentReview');
  return { source: reportCode==='11011'?'OpenDART CFS annual':'OpenDART CFS interim', asOfDate: publishedAt?.slice(0,10) || null, collectedAt, currency: 'KRW',
    fiscalPeriod: { year:String(year), reportCode, start:verified.start, end:verified.end, basis:'CFS' },
    periodVerification:verified, receipt, unit:'KRW', amountKind:reportCode==='11011'?'ANNUAL':'CUMULATIVE_YTD',
    industryCode: company.industryCode || null, publishedAt, raw, missing,
    sourceUrl: receipt ? `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${receipt}` : null, qualityStatus: missing.length ? 'INCOMPLETE' : 'READY' };
}
export function annualMultiples(snapshot, analysisDate) {
  const issues = [];
  const p = snapshot?.price, f = snapshot?.financial;
  if (!p || !f || p.currency !== 'KRW' || f.currency !== p.currency || p.qualityStatus !== 'READY' || f.qualityStatus !== 'READY') issues.push('QUALITY_OR_CURRENCY');
  if (!validDay(p?.asOfDate) || !validDay(f?.fiscalPeriod?.start) || !validDay(f?.fiscalPeriod?.end)
    || !isD2Eligible(`${p?.asOfDate}T23:59:59+09:00`, analysisDate) || !isD2Eligible(f?.publishedAt, analysisDate)
    || Date.parse(f?.publishedAt) > Date.parse(`${p?.asOfDate}T23:59:59+09:00`)) issues.push('POINT_IN_TIME');
  if(f?.unit!==undefined&&f.unit!=='KRW')issues.push('AMOUNT_UNIT_MISMATCH');
  if(f?.fiscalPeriod?.basis && !['CFS','OFS'].includes(f.fiscalPeriod.basis))issues.push('STATEMENT_BASIS_INVALID');
  const duration = (Date.parse(f?.fiscalPeriod?.end) - Date.parse(f?.fiscalPeriod?.start)) / 86400000;
  if (!(duration >= 300 && duration <= 400) || f?.fiscalPeriod?.end > p?.asOfDate
    || Date.parse(p?.asOfDate) - Date.parse(f?.fiscalPeriod?.end) > 550 * 86400000) issues.push('FISCAL_PERIOD');
  if (p?.corporateActionsReviewed !== true) issues.push('CORPORATE_ACTION_REVIEW');
  if(p?.source==='KIS' && (p.shareDate!==p.asOfDate || p.marketCapBasis!=='ALL_EQUITY' || f?.earningsBasis!=='ALL_EQUITY'))issues.push('SHARE_DATE_OR_EARNINGS_DEFINITION');
  if(snapshot?.shareCount && snapshot.shareAlignment?.status!=='VERIFIED')issues.push('SHARE_ALIGNMENT_BLOCKED');
  const cap = p?.marketCap;
  if (!(Number.isFinite(cap) && cap > 0)) issues.push('MARKET_CAP');
  const metrics = {};
  for (const [metric, key] of [['PER', 'netIncome'], ['PBR', 'equity'], ['PSR', 'revenue']]) {
    const denominator = f?.raw?.[key];
    metrics[metric] = !issues.length && Number.isFinite(denominator) && denominator > 0 && Number.isFinite(cap / denominator) ? cap / denominator : null;
  }
  metrics.EV_EBITDA = null;
  return { metrics, issues, metricIssues:{EV_EBITDA:['VERIFIED_EV_AND_EBITDA_INPUTS_REQUIRED']}, missing: Object.keys(metrics).filter(key => metrics[key] === null) };
}
export function analyzeKrValuation(company, universe = [], history = [], analysisDate) {
  const current = annualMultiples(company.krSnapshot, analysisDate), peers = [], excluded = [];
  const seen = new Set([company.ticker]);
  for (const candidate of universe) {
    let reason;
    if (seen.has(candidate.ticker)) reason = 'DUPLICATE_OR_SELF';
    seen.add(candidate.ticker);
    if (!reason && (candidate.market !== 'KR' || !company.industryCode || candidate.industryCode !== company.industryCode)) reason = 'INDUSTRY_MISMATCH';
    if (!reason && (company.businessProfile?.required===true && (!company.businessProfile.verified || !candidate.businessProfile?.verified || candidate.businessProfile.key!==company.businessProfile.key))) reason = 'BUSINESS_PROFILE_UNVERIFIED_OR_MISMATCH';
    if (!reason && (candidate.krSnapshot?.financial?.fiscalPeriod?.end !== company.krSnapshot?.financial?.fiscalPeriod?.end
      || candidate.krSnapshot?.financial?.fiscalPeriod?.start !== company.krSnapshot?.financial?.fiscalPeriod?.start
      || candidate.krSnapshot?.financial?.fiscalPeriod?.basis !== company.krSnapshot?.financial?.fiscalPeriod?.basis
      || candidate.krSnapshot?.price?.asOfDate !== company.krSnapshot?.price?.asOfDate)) reason = 'PERIOD_OR_PRICE_DATE_MISMATCH';
    const result = annualMultiples(candidate.krSnapshot, analysisDate);
    if (!reason && result.issues.length) reason = 'DATA_QUALITY';
    if (reason) excluded.push({ status:reason==='DATA_QUALITY'?'PENDING_VERIFICATION':'EXCLUDED', ticker: candidate.ticker, companyName:candidate.companyName, reason, industryCode:candidate.industryCode || null, fiscalPeriod:candidate.krSnapshot?.financial?.fiscalPeriod || null, publishedAt:candidate.krSnapshot?.financial?.publishedAt || null, asOfDate:candidate.krSnapshot?.price?.asOfDate || null, sourceUrl:candidate.krSnapshot?.financial?.sourceUrl || null }); else peers.push({ status:'ELIGIBLE',ticker:candidate.ticker,asOfDate:candidate.krSnapshot.price.asOfDate,currency:candidate.krSnapshot.price.currency,fiscalPeriod:candidate.krSnapshot.financial.fiscalPeriod,...result.metrics });
  }
  const historical = [], years = new Set();
  for (const item of history) {
    const result = annualMultiples(item.krSnapshot, analysisDate);
    const year = item.krSnapshot?.price?.asOfDate?.slice(0,4);
    if (item.krSnapshot?.financial?.fiscalPeriod?.basis !== company.krSnapshot?.financial?.fiscalPeriod?.basis
      || Date.parse(company.krSnapshot?.price?.asOfDate) - Date.parse(item.krSnapshot?.price?.asOfDate) > 6*365*86400000
      || item.ticker !== company.ticker || item.krSnapshot?.price?.asOfDate >= company.krSnapshot?.price?.asOfDate || years.has(year) || result.issues.length)
      excluded.push({ ticker: item.ticker, reason: 'INVALID_HISTORY' });
    else { years.add(year); historical.push({ asOfDate: item.krSnapshot.price.asOfDate, ...result.metrics }); }
  }
  const comparisons = {}, missing = [...current.issues];
  const span = historical.length ? Math.max(...historical.map(x => Date.parse(x.asOfDate))) - Math.min(...historical.map(x => Date.parse(x.asOfDate))) : 0;
  if (span < 700 * 86400000) missing.push('HISTORY_COVERAGE');
  for (const metric of ['PER','PBR','PSR']) {
    const summarize = rows => {
      const ceiling = metric === 'PER' ? 500 : 100;
      const accepted = rows.filter(x => Number.isFinite(x[metric]) && x[metric] > 0 && x[metric] <= ceiling);
      for (const row of rows.filter(x => !Number.isFinite(x[metric]) || x[metric]<=0))excluded.push({ticker:row.ticker || company.ticker,metric,reason:'NON_POSITIVE_OR_MISSING_DENOMINATOR'});
      for (const row of rows.filter(x => x[metric] > ceiling)) excluded.push({ ticker: row.ticker || company.ticker, metric, reason: 'EXTREME_MULTIPLE_REVIEW' });
      const value = accepted.length >= 3 ? median(accepted.map(x => ({ pe: x[metric] }))) : null;
      return { count: accepted.length, median: value, differencePct: value !== null && current.metrics[metric] !== null ? (current.metrics[metric] / value - 1) * 100 : null };
    };
    comparisons[metric] = { current: current.metrics[metric], history: summarize(historical), peers: summarize(peers) };
    if (comparisons[metric].current === null || comparisons[metric].history.median === null || comparisons[metric].peers.median === null) missing.push(metric);
  }
  const financial = company.krSnapshot?.financial?.raw;
  const previous = company.krSnapshot?.priorFinancial;
  const growthPct = previous?.qualityStatus === 'READY' && previous?.raw?.revenue > 0
    && previous.currency === company.krSnapshot?.financial?.currency && previous.fiscalPeriod?.end < company.krSnapshot?.financial?.fiscalPeriod?.start
    && isD2Eligible(previous.publishedAt, analysisDate) ? (financial.revenue / previous.raw.revenue - 1)*100 : null;
  const risks = [];
  if (typeof financial?.netIncome === 'number' && financial.netIncome <= 0) risks.push('LOSS_OR_ZERO_PROFIT');
  if (typeof financial?.equity === 'number' && financial.equity <= 0) risks.push('NON_POSITIVE_EQUITY');
  if (financial?.assets > 0 && financial?.liabilities / financial.assets > 0.8) risks.push('HIGH_LIABILITIES');
  if (company.risk?.blocked || company.risk?.tradingHalt) risks.push('EXISTING_RISK_BLOCK');
  const differences = Object.values(comparisons).flatMap(x => [x.history.differencePct,x.peers.differencePct]);
  const status = missing.length ? 'INSUFFICIENT_DATA' : risks.length ? 'UNDER_REVIEW'
    : differences.every(x => x <= -20) ? 'RELATIVELY_LOW' : differences.every(x => x >= 20) ? 'RELATIVELY_HIGH' : 'NEUTRAL';
  return { status, comparisons, peers, historical, excluded, missing, risks, asOfDate: company.krSnapshot?.price?.asOfDate || null,
    growthPct, liabilitiesToAssetsPct: financial?.assets > 0 ? financial.liabilities / financial.assets * 100 : null,
    dataQuality: missing.length ? 'INCOMPLETE' : 'INPUT_VALIDATED', evidence: company.krSnapshot || null,
    warning: 'ANALYSIS_ONLY_NOT_A_BUY_RECOMMENDATION', scoreImpact: 0,
    conflict: company.valuationScore !== undefined ? 'LEGACY_SCORE_NOT_RECALIBRATED' : null };
}

export function normalizeKisDaily(items, collectedAt, analysisDate, priceContract = null) {
  if (!Array.isArray(items)) throw new Error('KR_DAILY_RESPONSE_INVALID');
  const seen = new Set(), sessions = [], rejected = [];
  for (const row of items) {
    const text = row.stck_bsop_date;
    const day = typeof text === 'string' && /^\d{8}$/.test(text) ? `${text.slice(0,4)}-${text.slice(4,6)}-${text.slice(6,8)}` : null;
    const close = numeric(row.stck_clpr), volume = numeric(row.acml_vol);
    if (!validDay(day) || !isD2Eligible(`${day}T23:59:59+09:00`, analysisDate) || !(close > 0) || !(volume >= 0) || seen.has(day)) {
      rejected.push({ reason: 'INVALID_DUPLICATE_OR_FUTURE_SESSION' }); continue;
    }
    seen.add(day); sessions.push({ date: day, close, volume });
  }
  sessions.sort((a,b) => a.date.localeCompare(b.date));
  return { source: 'KIS daily prices', collectedAt, asOfDate: sessions.at(-1)?.date || null, currency: 'KRW',
    fiscalPeriod: null, industryCode: null, qualityStatus: sessions.length ? 'UNDER_REVIEW' : 'INCOMPLETE',
    displayStatus: sessions.length >= 2 ? 'OBSERVED_PRICE_SERIES' : 'UNAVAILABLE',
    sessions, rejected, priceType:priceContract?.verified===true && priceContract.operation==='daily-prices' && priceContract.adjustmentParameter==='0'?'RAW_PRICE':'UNKNOWN',adjustmentMethod:priceContract?.verified===true && priceContract.operation==='daily-prices' && priceContract.adjustmentParameter==='0'?'NONE':'UNKNOWN', basis: priceContract?.verified===true && priceContract.operation==='daily-prices' && priceContract.adjustmentParameter==='0' ? 'RAW' : 'UNKNOWN', priceContract, warning: 'HISTORICAL_MARKET_CAP_AND_CORPORATE_ACTIONS_REQUIRED' };
}
