import { PEER_MINIMUM } from './peer_expansion.js';
import { calculateTtm, deriveQuarterTtm } from './accounting_periods.js';
const metrics = ['PER','PBR','PSR','EV_EBITDA'];
const day = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
const positive = value => Number.isFinite(value) && value > 0;
const source = value => { try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password; } catch { return false; } };
const available = (value, date) => Number.isFinite(Date.parse(value)) && Date.parse(value) <= Date.parse(date);
const unique = values => [...new Set(values)];
const businessHosts = new Set(['www.samsung.com','www.skhynix.com','www.micron.com','www.tsmc.com','www.umc.com','news.skhynix.com','www.dbhitek.com','kind.krx.co.kr']);
const officialBusiness = value => { try { return source(value) && businessHosts.has(new URL(value).hostname); } catch { return false; } };
const policy = 'CURRENT_VALUATION_SEPARATE_FROM_HISTORICAL_RETURN_NO_FX_NO_SEGMENT_ESTIMATE';

// Reference diagnostics only. Existing annualMultiples, recommendation gates and
// historical return coverage requirements are intentionally left untouched.
export function diagnoseCurrentMetrics(company, analysisDate) {
 const selected=company?.krSnapshot?.metricFinancials;
 if(selected){
  const copy={...company,krSnapshot:{...company.krSnapshot}};delete copy.krSnapshot.metricFinancials;
  const result=diagnoseCurrentMetrics(copy,analysisDate);
  for(const metric of metrics)if(selected[metric])result.metrics[metric]=diagnoseCurrentMetrics({...copy,krSnapshot:{...copy.krSnapshot,financial:selected[metric]}},analysisDate).metrics[metric];
  result.commonIssues=unique(Object.values(result.metrics).flatMap(m=>m.exclusionReasons));
  return result;
 }
 const s=company?.krSnapshot, p=s?.price, f=s?.financial, capital=s?.currentCapitalVerification;
 const issues=[];
 if (!Number.isFinite(Date.parse(analysisDate))) throw new Error('PEER_DIAGNOSIS_DATE_INVALID');
 if (!p || !positive(p.marketCap)) issues.push('MISSING_MARKET_CAP');
 if (!p || !positive(p.price)) issues.push('MISSING_PRICE');
 if (!day(p?.asOfDate) || !available(`${p?.asOfDate}T23:59:59+09:00`,analysisDate)) issues.push('PRICE_DATE_UNVERIFIED');
 if (day(p?.asOfDate) && Date.parse(analysisDate)-Date.parse(p.asOfDate)>7*86400000) issues.push('STALE_DATA');
 if (!f) issues.push('MISSING_FINANCIAL_DATA');
 if (p?.currency !== 'KRW' || f?.currency !== p?.currency) issues.push('CURRENCY_MISMATCH');
 if (f?.unit !== 'KRW') issues.push('AMOUNT_UNIT_MISMATCH');
 if (!['CFS','OFS'].includes(f?.fiscalPeriod?.basis)) issues.push('FINANCIAL_PERIOD_MISMATCH');
 if (!source(f?.sourceUrl) || !available(f?.publishedAt,`${p?.asOfDate}T23:59:59+09:00`)) issues.push('FINANCIAL_PUBLICATION_UNVERIFIED');
 if (f?.missing?.includes('amendmentReview') || f?.correctionStatus === 'UNRESOLVED') issues.push('CORRECTION_REVIEW_REQUIRED');
 if (capital?.sharesVerified !== true || !positive(capital?.issuedShares) || !Number.isSafeInteger(capital?.issuedShares) || !Number.isSafeInteger(capital?.treasuryShares)
   || capital.treasuryShares < 0 || capital.treasuryShares > capital.issuedShares) issues.push(s?.shareCount?.records?.some(r=>positive(r.issued)) ? 'SHARE_COUNT_DATE_OR_PUBLICATION_UNVERIFIED' : 'MISSING_SHARE_COUNT');
 if (capital?.status !== 'VERIFIED' || capital?.marketCapVerified !== true || capital?.shareClass !== 'ALL_EQUITY'
   || p?.marketCapBasis !== 'ALL_EQUITY' || f?.earningsBasis !== 'ALL_EQUITY' || capital?.asOfDate !== p?.asOfDate
   || capital?.shareDate !== p?.asOfDate || !source(capital?.sourceUrl) || !available(capital?.availableAt,`${p?.asOfDate}T23:59:59+09:00`)) issues.push('CURRENT_CAPITAL_SOURCE_UNVERIFIED');
 if (capital?.corporateActionImpactVerified !== true) issues.push('CORPORATE_ACTION_UNVERIFIED');
 const ttm = Array.isArray(s?.accountingFrames) ? calculateTtm(s.accountingFrames, analysisDate) : null;
 const quarters = Array.isArray(s?.accountingFrames) ? deriveQuarterTtm(s.accountingFrames, analysisDate) : null;
 const useTtm=ttm?.status==='READY' && quarters?.status==='READY' && ttm.period?.basis===f?.fiscalPeriod?.basis && ttm.currency===f?.currency && ttm.unit===f?.unit && available(ttm.availableAt,`${p?.asOfDate}T23:59:59+09:00`);
 const flowPeriod=useTtm?ttm.period:f?.fiscalPeriod;
 const duration=(Date.parse(flowPeriod?.end)-Date.parse(flowPeriod?.start))/86400000;
 const flowValid=day(flowPeriod?.start)&&day(flowPeriod?.end)&&duration>=300&&duration<=400&&flowPeriod.end<=p?.asOfDate
   && (useTtm || f?.qualityStatus==='READY' && f?.amountKind!=='CUMULATIVE_YTD');
 const result={};
 for(const metric of metrics){
  const reasons=[...issues];
  const balance=metric==='PBR', period=balance?f?.fiscalPeriod:flowPeriod;
  if(balance ? !day(period?.end)||period.end>p?.asOfDate||!(f?.periodVerification?.status==='VERIFIED'||f?.qualityStatus==='READY') : !flowValid) reasons.push('FINANCIAL_PERIOD_MISMATCH');
  if(day(period?.end)&&Date.parse(p?.asOfDate)-Date.parse(period.end)>550*86400000) reasons.push('STALE_DATA');
  const key={PER:'netIncome',PBR:'equity',PSR:'revenue',EV_EBITDA:'ebitda'}[metric];
  const denominator=balance?f?.raw?.[key]:(useTtm?ttm.raw?.[key]:f?.raw?.[key]);
  if(!Number.isFinite(denominator)) reasons.push('MISSING_FINANCIAL_DATA');
  else if(denominator<=0) reasons.push('INVALID_VALUATION_DENOMINATOR');
  let numerator=p?.marketCap;
  if(metric==='EV_EBITDA'){
   const ev=s?.enterpriseValueVerification;
   if(ev?.status!=='VERIFIED'||ev?.asOfDate!==p?.asOfDate||ev?.currency!=='KRW'||ev?.unit!=='KRW'
    || !source(ev?.sourceUrl)||!available(ev?.availableAt,`${p?.asOfDate}T23:59:59+09:00`)||!positive(ev?.value)
    || ev?.definition!=='ALL_EQUITY_PLUS_DEBT_PLUS_NONCONTROLLING_MINUS_CASH') reasons.push('VERIFIED_EV_INPUTS_REQUIRED');
   numerator=ev?.value;
   if(f?.ebitdaVerification?.status!=='VERIFIED'||f.ebitdaVerification.period?.start!==period?.start
    ||f.ebitdaVerification.period?.end!==period?.end||f.ebitdaVerification.period?.basis!==period?.basis
    ||f.ebitdaVerification.currency!=='KRW'||f.ebitdaVerification.unit!=='KRW'||!available(f.ebitdaVerification.availableAt,`${p?.asOfDate}T23:59:59+09:00`)||!source(f.ebitdaVerification.sourceUrl)) reasons.push('VERIFIED_EBITDA_INPUTS_REQUIRED');
  }
  let value=reasons.length?null:numerator/denominator;
  if(value!==null && (!positive(value)||value>({PER:500,PBR:100,PSR:100,EV_EBITDA:100}[metric]))) {reasons.push('EXTREME_MULTIPLE_REVIEW');value=null;}
  result[metric]={metric,value,fiscalPeriod:period||null,asOfDate:p?.asOfDate||null,currency:f?.currency||null,unit:f?.unit||null,
   source:{price:p?.source||null,financial:f?.sourceUrl||null,capital:capital?.sourceUrl||null},
   verificationStatus:reasons.length?'INSUFFICIENT_DATA':'VERIFIED',exclusionReasons:unique(reasons),denominatorDefinition:key,
   periodKind:balance?'POINT_IN_TIME':useTtm?'TTM':'ANNUAL'};
 }
 return {ticker:company?.ticker,companyName:company?.companyName,industryCode:company?.industryCode||null,observedShareCounts:s?.shareCount?.records||[],commonIssues:unique(issues),metrics:result,
  price:p?.price??null,priceDate:p?.asOfDate||null,priceSource:p?.sourceUrl||p?.source||null,marketCap:p?.marketCap??null,issuedShares:capital?.issuedShares??null,treasuryShares:capital?.treasuryShares??null,
  ttmStatus:ttm?.status||'INSUFFICIENT_DATA',rankingEligible:false,policy};
}

export function buildPeerMetricDiagnosis(target,candidates,analysisDate){
 if(!Array.isArray(candidates)||candidates.length>30) throw new Error('PEER_DIAGNOSIS_SCOPE_INVALID');
 const seen=new Set([target?.ticker]);
 const targetDiagnosis=diagnoseCurrentMetrics(target,analysisDate);
 const rows=candidates.map(candidate=>{
  const row=diagnoseCurrentMetrics(candidate,analysisDate), reasons=[];
  if(!candidate?.ticker||seen.has(candidate.ticker)) reasons.push('DUPLICATE_OR_SELF');
  seen.add(candidate?.ticker);
  if(candidate?.market!==target?.market) reasons.push('CURRENCY_MISMATCH');
  if(candidate?.businessEvidence?.verified!==true||!officialBusiness(candidate.businessEvidence.sourceUrl)
   ||!available(candidate.businessEvidence.reviewedAt,analysisDate)) reasons.push('BUSINESS_SOURCE_UNVERIFIED');
  if(candidate?.businessComparability?.verified!==true||candidate.businessComparability.targetTicker!==target?.ticker
   ||candidate.businessComparability.scope!=='CONSOLIDATED_COMPANY') reasons.push('BUSINESS_COMPARABILITY_UNVERIFIED');
  if(candidate?.industryCode!==target?.industryCode) reasons.push('BUSINESS_MODEL_MISMATCH');
  for(const metric of metrics){
   const m=row.metrics[metric], t=targetDiagnosis.metrics[metric];
   const mismatch=!m.fiscalPeriod||!t.fiscalPeriod||(metric!=='PBR' && m.fiscalPeriod.start!==t.fiscalPeriod.start)||m.fiscalPeriod.end!==t.fiscalPeriod.end
    ||m.fiscalPeriod.basis!==t.fiscalPeriod.basis||m.asOfDate!==t.asOfDate||m.periodKind!==t.periodKind;
   m.comparisonExclusionReasons=unique([...m.exclusionReasons,...reasons,...(mismatch?['FINANCIAL_PERIOD_MISMATCH']:[])]);
   m.comparisonStatus=m.comparisonExclusionReasons.length?'EXCLUDED':'ELIGIBLE';
  }
  row.commonIssues=unique([...row.commonIssues,...reasons]);
  row.exclusionReasons=unique(Object.values(row.metrics).flatMap(m=>m.comparisonExclusionReasons));
  row.missingData=row.exclusionReasons.filter(x=>['MISSING_MARKET_CAP','MISSING_PRICE','MISSING_SHARE_COUNT','MISSING_FINANCIAL_DATA','CURRENT_CAPITAL_SOURCE_UNVERIFIED','SHARE_COUNT_DATE_OR_PUBLICATION_UNVERIFIED','VERIFIED_EV_INPUTS_REQUIRED','VERIFIED_EBITDA_INPUTS_REQUIRED','PRICE_DATE_UNVERIFIED','FINANCIAL_PUBLICATION_UNVERIFIED','CORRECTION_REVIEW_REQUIRED','SOURCE_CONFLICT'].includes(x));
  row.improvementGroups=unique([...(row.missingData.length?['OFFICIAL_SOURCE_REQUIRED']:[]),...(row.exclusionReasons.includes('FINANCIAL_PERIOD_MISMATCH')?['PERIOD_NORMALIZATION_REQUIRED']:[]),
   ...(reasons.some(x=>x.startsWith('BUSINESS_'))?['BUSINESS_SCOPE_EXCLUSION_MAINTAINED']:[]),...(reasons.includes('CURRENCY_MISMATCH')?['FX_SCOPE_EXCLUSION_MAINTAINED']:[]),'METRIC_SPECIFIC_VALIDATION']);
  return row;
 });
 const metricCounts=Object.fromEntries(metrics.map(metric=>[metric,rows.filter(row=>row.metrics[metric].comparisonStatus==='ELIGIBLE').length]));
 const metricComparisons=Object.fromEntries(metrics.map(metric=>{
  const values=rows.filter(row=>row.metrics[metric].comparisonStatus==='ELIGIBLE').map(row=>row.metrics[metric].value).sort((a,b)=>a-b);
  const n=values.length, median=n>=PEER_MINIMUM?(n%2?values[(n-1)/2]:(values[n/2-1]+values[n/2])/2):null;
  const current=targetDiagnosis.metrics[metric].value;
  return [metric,{count:n,minimum:PEER_MINIMUM,median,current,differencePct:median!==null&&current!==null?(current/median-1)*100:null,status:median===null?'INSUFFICIENT_DATA':'REFERENCE_ONLY'}];
 }));
 return {target:targetDiagnosis,candidates:rows,candidateCount:rows.length,metricCounts,metricComparisons,minimum:PEER_MINIMUM,
  rankingEligible:false,targetMetricStatus:Object.fromEntries(metrics.map(metric=>[metric,targetDiagnosis.metrics[metric].verificationStatus])),policy,reviewedAt:analysisDate,status:'REFERENCE_DIAGNOSIS_ONLY'};
}
