import { validDay, parseDartPeriod } from './accounting_periods.js';
import { normalizeShareCount } from './share_count.js';
import { normalizeActionEvidence } from './kr_actions.js';

const numeric = value => typeof value === 'string' && /^-?\d+(?:\.\d+)?$/.test(value.replaceAll(',', '').trim()) && Number.isFinite(Number(value.replaceAll(',', '').trim())) ? Number(value.replaceAll(',', '').trim()) : null;
const boundary = {11013:'03-31',11012:'06-30',11014:'09-30',11011:'12-31'};
const receiptDay = receipt => /^\d{14}$/.test(receipt || '') ? `${receipt.slice(0,4)}-${receipt.slice(4,6)}-${receipt.slice(6,8)}` : null;
function publication(scope, receipt, valuationDate) {
  // A receipt number provides a publication day, never an intraday availability claim.
  const day = receiptDay(receipt);
  return validDay(day) && validDay(scope?.availableAt) && day <= scope.availableAt && scope.availableAt <= valuationDate && scope.receipt === receipt && scope.publicationVerified === true;
}
export function normalizeCollectedFinancials(body, company, scope, {valuationDate, collectedAt} = {}) {
  const records = [], issues = [];
  if (body?.status !== '000' || !Array.isArray(body.list)) return {status:'INSUFFICIENT_DATA',records,issues:['SOURCE_UNAVAILABLE'],valuationInputEligible:false};
  const seen = new Set();
  for (const row of body.list) {
    const reasons = [];
    const period = row.sj_div === 'BS' ? (() => { const dates = [...String(row.thstrm_dt || '').matchAll(/(\d{4})[.\-/](\d{2})[.\-/](\d{2})/g)]; return dates.length === 1 ? {start:null,end:dates[0].slice(1).join('-')} : null; })() : parseDartPeriod(row.thstrm_dt);
    const value = numeric(row.thstrm_amount), cumulative = numeric(row.thstrm_add_amount);
    if (row.corp_code !== company.corpCode || row.bsns_year !== String(scope?.year) || row.reprt_code !== scope?.reportCode) reasons.push('IDENTITY_OR_FISCAL_SCOPE_MISMATCH');
    if (!['CFS','OFS'].includes(row.fs_div)) reasons.push('CONSOLIDATION_UNVERIFIED');
    else if (row.fs_div !== scope?.fsDiv) reasons.push('CONSOLIDATION_MISMATCH');
    if (row.currency !== 'KRW') reasons.push('CURRENCY_UNVERIFIED');
    if (scope?.unit !== 'KRW' || scope?.unitVerified !== true) reasons.push('UNIT_UNVERIFIED');
    if (!publication(scope,row.rcept_no,valuationDate)) reasons.push('PUBLICATION_OR_CORRECTION_UNVERIFIED');
    if (!['ORIGINAL','VERIFIED_CORRECTION'].includes(scope?.correctionStatus)) reasons.push('CORRECTION_STATUS_UNVERIFIED');
    if (scope?.correctionStatus === 'VERIFIED_CORRECTION' && !/^\d{14}$/.test(scope.supersedesReceipt || '')) reasons.push('CORRECTION_LINEAGE_MISSING');
    if (!validDay(period?.end) || period.end !== `${scope?.year}-${boundary[scope?.reportCode]}` || row.sj_div !== 'BS' && period?.start !== `${scope?.year}-01-01`) reasons.push('PERIOD_UNVERIFIED');
    if (value === null || row.sj_div !== 'BS' && scope?.reportCode !== '11011' && cumulative === null) reasons.push('AMOUNT_MISSING');
    if (!row.account_id || !['BS','IS','CIS','CF','SCE'].includes(row.sj_div)) reasons.push('ACCOUNT_DEFINITION_UNVERIFIED');
    const key = JSON.stringify([row.rcept_no,row.fs_div,row.sj_div,row.account_id,row.account_nm,row.account_detail,period]);
    if (seen.has(key)) reasons.push('DUPLICATE_ACCOUNT_PERIOD'); seen.add(key);
    records.push({companyCode:company.corpCode,stockCode:company.ticker,fiscalYear:String(scope?.year),fiscalQuarter:({'11013':1,'11012':2,'11014':3,'11011':4})[scope?.reportCode] ?? null,periodType:row.sj_div === 'BS' ? 'INSTANT' : scope?.reportCode === '11011' ? 'ANNUAL' : 'CUMULATIVE_YTD',consolidationType:row.fs_div,currency:row.currency,unit:scope?.unit ?? null,reportedAt:receiptDay(row.rcept_no),availableAt:publication(scope,row.rcept_no,valuationDate) ? scope.availableAt : null,source:'OpenDART',sourceDocumentId:row.rcept_no,sourceUrl:`https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${row.rcept_no}`,correctionStatus:scope?.correctionStatus ?? 'UNVERIFIED',supersedesReceipt:scope?.supersedesReceipt ?? null,accountId:row.account_id,accountName:row.account_nm,accountDetail:row.account_detail ?? null,statement:row.sj_div,period,value:row.sj_div === 'BS' || scope?.reportCode === '11011' ? value : cumulative,singlePeriodValue:row.sj_div === 'BS' ? null : value,collectedAt,verificationStatus:reasons.length ? 'PENDING_VERIFICATION' : 'VERIFIED',issues:reasons});
    issues.push(...reasons);
  }
  // A normalized account is not a validated PBR denominator or a complete TTM frame.
  return {status:records.length && !issues.length ? 'NORMALIZED' : 'PENDING_VERIFICATION',records,issues:[...new Set(issues)],valuationInputEligible:false};
}
export function normalizeCollectedShares(body, company, scope, {valuationDate,collectedAt} = {}) {
  const accountingFrames = (Array.isArray(body?.list) ? body.list : []).filter(row => publication(scope,row.rcept_no,valuationDate)).map(row => ({receipt:row.rcept_no,qualityStatus:'READY',publishedAt:`${scope.availableAt}T23:59:59+09:00`}));
  const normalized = normalizeShareCount(body,{...company,krSnapshot:{accountingFrames}},{collectedAt,analysisDate:`${valuationDate}T23:59:59+09:00`});
  const records = normalized.records.map(row => {
    const issues = [...row.issues,...(!row.publicationVerified ? ['PUBLICATION_UNVERIFIED'] : []),...(!['ORIGINAL','VERIFIED_CORRECTION'].includes(scope?.correctionStatus) || scope?.correctionStatus === 'VERIFIED_CORRECTION' && !/^\d{14}$/.test(scope.supersedesReceipt || '') ? ['CORRECTION_LINEAGE_UNVERIFIED'] : [])];
    return {...row,issuedShares:row.issued,treasuryShares:row.treasury,outstandingShares:row.outstanding,verificationStatus:issues.length ? 'PENDING_VERIFICATION' : row.verificationStatus,issues};
  });
  return {...normalized,status:normalized.status === 'VERIFIED' && records.every(row => row.verificationStatus === 'VERIFIED') ? 'NORMALIZED' : 'PENDING_VERIFICATION',records,issues:[...new Set([...normalized.issues,...records.flatMap(row => row.issues)])],valuationInputEligible:false};
}
export function normalizeCollectedActions(body, operation, company, scope, {valuationDate,collectedAt} = {}) {
  const events = normalizeActionEvidence(body,operation,company,collectedAt).map(event => ({...event,announcementDate:publication(scope,event.sourceDocumentId,valuationDate) ? receiptDay(event.sourceDocumentId) : null,availableAt:publication(scope,event.sourceDocumentId,valuationDate) ? scope.availableAt : null,exDate:null,effectiveDate:null,quantity:null,reportedQuantity:event.value,documentId:event.sourceDocumentId,correctionStatus:scope?.correctionStatus ?? 'UNVERIFIED',verificationStatus:'PENDING_VERIFICATION',issues:['OFFICIAL_EFFECTIVE_DATE_AND_EVENT_DEFINITION_REQUIRED',...(!publication(scope,event.sourceDocumentId,valuationDate) ? ['PUBLICATION_UNVERIFIED'] : [])]}));
  return {status:'PENDING_VERIFICATION',events,coverage:{verified:false},valuationInputEligible:false,reason:'REPORT_SUMMARIES_NEVER_ESTABLISH_CANCELLATION_EFFECT_OR_DAILY_COVERAGE'};
}
export function normalizeCollectedEvidence(body,task,company,scope,context) {
  if(task.source==='SEC'){const cik={MU:'0000723125',TSM:'0001046179',UMC:'0001033767'}[company.ticker];if(!cik||String(body?.cik).padStart(10,'0')!==cik)return {status:'INSUFFICIENT_DATA',valuationInputEligible:false,issues:['SEC_IDENTITY_MISMATCH']};const records=[];for(const [taxonomy,concept]of [['dei','EntityCommonStockSharesOutstanding'],['us-gaap','StockholdersEquity'],['us-gaap','StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest'],['ifrs-full','EquityAttributableToOwnersOfParent'],['ifrs-full','Equity']])for(const [unit,rows]of Object.entries(body.facts?.[taxonomy]?.[concept]?.units||{})){const available=rows.filter(r=>validDay(r.end)&&validDay(r.filed)&&r.end<=context.valuationDate&&Date.parse(r.filed+'T23:59:59Z')<=Date.parse(context.valuationDate+'T23:59:59+09:00')&&Number.isFinite(r.val)).sort((a,b)=>b.end.localeCompare(a.end)||b.filed.localeCompare(a.filed));if(available.length){const r=available[0];records.push({companyCode:cik,stockCode:company.ticker,accountId:taxonomy+':'+concept,value:r.val,unit,asOfDate:r.end,disclosureDate:r.filed,availableAt:r.filed+'T23:59:59Z',sourceDocumentId:r.accn,sourceUrl:task.query.url,verificationStatus:'SOURCE_ACCOUNT_IDENTIFIED'});}}return {status:'OBSERVED_OFFICIAL_FACTS',records,valuationInputEligible:false,issues:['SHARE_CLASS_ADR_CURRENCY_PERIOD_AND_ACTION_REVIEW_REQUIRED']};}
  if (task.source !== 'OpenDART') return {status:'SOURCE_ARCHIVED_PENDING_NORMALIZATION',valuationInputEligible:false};
  if (task.kind === 'FINANCIAL') return normalizeCollectedFinancials(body,company,scope,context);
  if (task.kind === 'SHARES') return normalizeCollectedShares(body,company,scope,context);
  if (task.kind === 'CORPORATE_ACTION') return normalizeCollectedActions(body,task.query.operation,company,scope,context);
  return {status:'SOURCE_ARCHIVED_PENDING_NORMALIZATION',valuationInputEligible:false};
}
