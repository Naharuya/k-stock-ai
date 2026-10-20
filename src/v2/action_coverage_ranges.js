import {validDay} from './accounting_periods.js';
import {measureActionAwareReturns} from './corporate_actions.js';

export const REQUIRED_ACTION_COVERAGE_TYPES=Object.freeze(['CASH_DIVIDEND','STOCK_DIVIDEND','SPLIT','REVERSE_SPLIT','RIGHTS_ISSUE','BONUS_ISSUE','EX_RIGHTS','PAR_VALUE_CHANGE','TREASURY_ACQUIRE','TREASURY_DISPOSE','TREASURY_CANCEL','SHARE_COUNT_CHANGE']);
const proof=(x,analysisDate)=>x?.sourceVerified===true&&typeof x.sourceDocumentId==='string'&&x.sourceDocumentId.length>0&&/^https:\/\//.test(x.sourceUrl||'')&&typeof x.availableAt==='string'&&Number.isFinite(Date.parse(x.availableAt))&&Date.parse(x.availableAt)<=Date.parse(analysisDate)&&x.correctionStatus==='FINAL_VALID';

// A complete query or a single verified event is never a certificate of absence.
// Windows remain independent: neighbouring source windows are not silently merged.
export function buildActionCoverageRanges({stockCode,shareClass='COMMON',history,coverageWindows=[],events=[],analysisDate}={}){
  const sessions=history?.sessions;
  const pricesValid=Array.isArray(sessions)&&sessions.length>=2&&sessions.length<=1000&&sessions.every((x,i)=>validDay(x.date)&&Number.isFinite(x.close)&&x.close>0&&(!i||sessions[i-1].date<x.date));
  const rawVerified=history?.basis==='RAW'&&history.priceContract?.verified===true&&history.priceContract?.basis==='RAW'&&history.priceContract?.adjustmentParameter==='0'&&/^https:\/\//.test(history.priceContract?.sourceUrl||'');
  const result={status:'PERFORMANCE_BLOCKED',fromDate:pricesValid?sessions[0].date:null,toDate:pricesValid?sessions.at(-1).date:null,priceBasis:history?.basis??null,priceContractVerified:rawVerified,requiredTypes:[...REQUIRED_ACTION_COVERAGE_TYPES],windows:[],performanceCandidates:[],fullCumulativePerformanceStatus:'PERFORMANCE_BLOCKED',recommendationEligible:false,absenceInferredFromDisclosureCount:false};
  if(!/^\d{6}$/.test(stockCode||'')||!['COMMON','PREFERRED'].includes(shareClass)||!Number.isFinite(Date.parse(analysisDate))||!pricesValid||!Array.isArray(coverageWindows)||coverageWindows.length>100||!Array.isArray(events)||events.length>500){return {...result,reason:'INVALID_SCOPE_OR_OBSERVATIONS'};}
  if(sessions.at(-1).date>analysisDate.slice(0,10))return {...result,reason:'FUTURE_OBSERVATIONS'};
  for(const window of coverageWindows){
    const reasons=[];
    if(!validDay(window?.fromDate)||!validDay(window?.toDate)||window.fromDate>=window.toDate){result.windows.push({status:'PENDING_VERIFICATION',reason:'INVALID_COVERAGE_RANGE'});continue;}
    const fromDate=[window.fromDate,result.fromDate].sort().at(-1),toDate=[window.toDate,result.toDate].sort()[0];
    if(fromDate>=toDate)continue;
    if(window.stockCode!==stockCode||window.shareClass!==shareClass)reasons.push('COVERAGE_SCOPE_MISMATCH');
    if(window.verified!==true||window.completenessVerified!==true||!proof(window,analysisDate))reasons.push('COMPLETE_SOURCE_COVERAGE_REQUIRED');
    const missingTypes=REQUIRED_ACTION_COVERAGE_TYPES.filter(x=>!window.types?.includes(x));
    if(missingTypes.length)reasons.push('ACTION_TYPES_MISSING');
    if(!rawVerified)reasons.push('RAW_PRICE_CONTRACT_REQUIRED');
    if(events.some(e=>e.stockCode===stockCode&&!['COMMON','PREFERRED'].includes(e.shareClass)))reasons.push('EVENT_SHARE_CLASS_UNVERIFIED');
    const observations=sessions.filter(x=>x.date>=fromDate&&x.date<=toDate);
    if(observations[0]?.date!==fromDate||observations.at(-1)?.date!==toDate)reasons.push('EXACT_OBSERVATIONS_REQUIRED');
    const actual=events.filter(e=>e.stockCode===stockCode&&e.shareClass===shareClass&&e.actual!==false&&(!validDay(e.effectiveDate)||(e.effectiveDate>=fromDate&&e.effectiveDate<=toDate)));
    const normalized=[],seen=new Set();
    for(const event of actual){
      if(!validDay(event.effectiveDate)||!proof(event,analysisDate)||event.verified!==true){reasons.push('EVENT_SOURCE_OR_EFFECTIVE_DATE_UNVERIFIED');continue;}
      const key=JSON.stringify([event.type,event.effectiveDate,event.ratio??null,event.cashPerShare??null]);
      if(seen.has(key))reasons.push('DUPLICATE_ECONOMIC_EVENT');seen.add(key);
      // Unsupported capital effects require a separately reviewed calculation.
      if(!['CASH_DIVIDEND','SPLIT','REVERSE_SPLIT','BONUS_ISSUE'].includes(event.type))reasons.push('CAPITAL_EVENT_REVIEW_REQUIRED');
      normalized.push({...event,id:event.sourceDocumentId,date:event.effectiveDate});
    }
    let review={status:'VERIFIED',fromDate,toDate,priceBasis:'RAW',events:normalized};
    if(!reasons.length){
      const calculation=measureActionAwareReturns(observations,review);
      if(calculation.status!=='READY')reasons.push(calculation.reason);
    }
    const unique=[...new Set(reasons)],entry={fromDate,toDate,stockCode,shareClass,status:unique.length?'PENDING_VERIFICATION':'VERIFIED',reasons:unique,missingTypes,sourceDocumentId:window.sourceDocumentId??null,sourceUrl:window.sourceUrl??null,observationCount:observations.length};
    result.windows.push(entry);
    if(!unique.length){
      const total=measureActionAwareReturns(observations,review,{includeDividends:true});
      result.performanceCandidates.push({...entry,priceReturnEligible:true,totalReturnEligible:total.status==='READY',totalReturnBlockReason:total.status==='READY'?null:total.reason,review,recommendationEligible:false});
    }
  }
  result.status=result.performanceCandidates.length?'VERIFIED_PARTIAL_CANDIDATES':'PERFORMANCE_BLOCKED';
  result.reason=result.performanceCandidates.length?'FULL_CUMULATIVE_RETURN_REMAINS_HELD':'NO_COMPLETE_VERIFIED_ACTION_WINDOW';
  return result;
}
