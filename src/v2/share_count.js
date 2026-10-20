import {validDay} from './accounting_periods.js';
const count=x=>typeof x==='string'&&/^\d[\d,]*$/.test(x)&&Number.isSafeInteger(Number(x.replaceAll(',','')))?Number(x.replaceAll(',','')):null;
export function normalizeShareCount(response,company,{collectedAt,analysisDate}={}) {
  const records=[],issues=[];
  if(response?.status!=='000'||!Array.isArray(response.list))return {status:'INSUFFICIENT_DATA',records,issues:['SOURCE_UNAVAILABLE']};
  const seen=new Set();
  for(const r of response.list){
    const shareClass=({보통주:'COMMON',보통주식:'COMMON',우선주:'PREFERRED',우선주식:'PREFERRED',합계:'TOTAL'})[r.se];
    if(!shareClass)continue;
    const issued=count(r.istc_totqy),treasury=count(r.tesstk_co),outstanding=count(r.distb_stock_co);
    const reasons=[];
    if(r.corp_code!==company.corpCode||!/^\d{14}$/.test(r.rcept_no||''))reasons.push('IDENTITY');
    if(!validDay(analysisDate?.slice(0,10))||!validDay(r.stlm_dt)||r.stlm_dt>analysisDate?.slice(0,10))reasons.push('AS_OF_DATE');
    if(issued===null||treasury===null||outstanding===null||issued<=0||issued-treasury!==outstanding)reasons.push('COUNT_DEFINITION');
    if(seen.has(shareClass))reasons.push('DUPLICATE_CLASS');seen.add(shareClass);
    const filing=company.krSnapshot?.accountingFrames?.find(f=>f.receipt===r.rcept_no&&f.qualityStatus==='READY'&&Number.isFinite(Date.parse(f.publishedAt))&&Date.parse(f.publishedAt)<=Date.parse(analysisDate));
    records.push({availableAt:filing?.publishedAt||null,publicationVerified:Boolean(filing),stockCode:company.ticker,shareClass,issued,treasury,outstanding,asOfDate:validDay(r.stlm_dt)?r.stlm_dt:null,source:'OpenDART stockTotqySttus',sourceDocumentId:r.rcept_no,sourceUrl:/^\d{14}$/.test(r.rcept_no||'')?`https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${r.rcept_no}`:null,collectedAt,verificationStatus:reasons.length?'PENDING_VERIFICATION':'VERIFIED',issues:reasons});issues.push(...reasons);
  }
  const common=records.find(x=>x.shareClass==='COMMON');
  const total=records.find(x=>x.shareClass==='TOTAL'),classes=records.filter(x=>x.shareClass!=='TOTAL');
  if(total&&['issued','treasury','outstanding'].some(k=>classes.some(x=>x[k]===null)||classes.reduce((n,x)=>n+x[k],0)!==total[k]))issues.push('TOTAL_CLASS_MISMATCH');
  return {status:common&&issues.length===0?'VERIFIED':'PENDING_VERIFICATION',records,issues:[...new Set(issues)],warning:'REPORT_DATE_COUNTS_ARE_NOT_CURRENT_PRICE_DATE_COUNTS'};
}
export function alignShareCount(record,price,{coverage,events=[]}={}) {
  const blocked=reason=>({status:'BLOCKED',reason,marketCap:null});
  if(record?.verificationStatus!=='VERIFIED'||!validDay(record.asOfDate)||!validDay(price?.asOfDate)||record.asOfDate>price.asOfDate||record.shareClass!==price.shareClass||!['ISSUED','OUTSTANDING'].includes(price.shareDefinition)||price.basis!=='RAW'||price.currency!=='KRW'||!Number.isFinite(price.close)||!(price.close>0))return blocked('PRICE_SHARE_BASIS_UNVERIFIED');
  if(record.publicationVerified!==true||!Number.isFinite(Date.parse(record.availableAt))||Date.parse(record.availableAt)>Date.parse(`${price.asOfDate}T23:59:59+09:00`))return blocked('SHARE_PUBLICATION_UNVERIFIED_OR_FUTURE');
  let shares=price.shareDefinition==='ISSUED'?record.issued:record.outstanding;
  if(record.asOfDate!==price.asOfDate){
    if(coverage?.verified!==true||!coverage.sourceUrl?.startsWith('https://')||!validDay(coverage.fromDate)||!validDay(coverage.toDate)||coverage.fromDate>record.asOfDate||coverage.toDate<price.asOfDate||!['SPLIT','REVERSE_SPLIT','BONUS_ISSUE','RIGHTS_ISSUE','SHARE_COUNT_CHANGE','TREASURY_CHANGE'].every(t=>coverage.types?.includes(t)))return blocked('INTERVAL_ACTION_COVERAGE_REQUIRED');
    const seen=new Set();
    for(const e of [...events].sort((a,b)=>(a.effectiveDate||'').localeCompare(b.effectiveDate||''))){
      if(!validDay(e.effectiveDate)||e.effectiveDate<=record.asOfDate||e.effectiveDate>price.asOfDate||e.verificationStatus!=='VERIFIED'||e.shareClass!==record.shareClass||!e.sourceDocumentId)return blocked('EVENT_ALIGNMENT_UNVERIFIED');
      const key=JSON.stringify([e.eventType,e.effectiveDate,e.shareClass,e.ratio,e.delta]);if(seen.has(key))return blocked('DUPLICATE_ACTION');seen.add(key);
      if(['SPLIT','REVERSE_SPLIT','BONUS_ISSUE'].includes(e.eventType)&&Number.isFinite(e.ratio)&&e.ratio>0)shares*=e.ratio;
      else if(['RIGHTS_ISSUE','SHARE_COUNT_CHANGE'].includes(e.eventType)&&Number.isSafeInteger(e.delta))shares+=e.delta;
      else if(e.eventType==='TREASURY_CHANGE'&&Number.isSafeInteger(e.delta)){if(price.shareDefinition==='OUTSTANDING')shares-=e.delta;}
      else return blocked('EVENT_APPLICATION_UNVERIFIED');
    }
  }else if(events.length)return blocked('UNEXPECTED_ALIGNMENT_EVENTS');
  if(!Number.isSafeInteger(shares)||shares<=0||!Number.isFinite(shares*price.close))return blocked('NUMERIC_RANGE');
  return {status:'VERIFIED',shares,marketCap:shares*price.close,shareClass:record.shareClass,shareDefinition:price.shareDefinition,asOfDate:price.asOfDate,sourceAsOfDate:record.asOfDate};
}
