import { validDay } from './accounting_periods.js';
const types=['SPLIT','REVERSE_SPLIT','BONUS_ISSUE','RIGHTS_ISSUE','CASH_DIVIDEND','PAR_VALUE_CHANGE','SHARE_COUNT_CHANGE'];
export function validateCorporateActions({fromDate,toDate,priceBasis,shareDate,priceDate,shares,events=[],coverage}={}) {
  const issues=[];
  if(!validDay(fromDate)||!validDay(toDate)||fromDate>toDate||priceDate!==shareDate||priceDate!==toDate||!(Number.isFinite(shares)&&shares>0))issues.push('PRICE_SHARE_DATE_MISMATCH');
  if(!['RAW','ADJUSTED_PRICE','TOTAL_RETURN'].includes(priceBasis))issues.push('UNKNOWN_PRICE_BASIS');
  if(!coverage?.verified||!validDay(coverage.fromDate)||!validDay(coverage.toDate)||!coverage.sourceUrl?.startsWith('https://')||coverage.fromDate>fromDate||coverage.toDate<toDate||!types.every(x=>coverage.types?.includes(x)))issues.push('ACTION_COVERAGE_MISSING');
  if(!Array.isArray(events)||events.length>500)return {status:'UNDER_REVIEW',issues:['INVALID_EVENTS']};
  const seen=new Set(),economicEvents=new Set();
  for(const e of events){
    if(!types.includes(e.type)||!validDay(e.date)||e.date<fromDate||e.date>toDate||e.verified!==true||typeof e.id!=='string'||!e.id||seen.has(e.id))issues.push('UNVERIFIED_OR_DUPLICATE_EVENT');
    const economicKey=JSON.stringify([e.type,e.date,e.ratio??null,e.cashPerShare??null,e.currency??null]);
    if(economicEvents.has(economicKey))issues.push('DUPLICATE_ECONOMIC_EVENT');economicEvents.add(economicKey);
    seen.add(e.id);
    if(['SPLIT','REVERSE_SPLIT','BONUS_ISSUE'].includes(e.type)&&!(Number.isFinite(e.ratio)&&e.ratio>0))issues.push('SPLIT_RATIO_MISSING');
    if(e.type==='CASH_DIVIDEND'&&(!(Number.isFinite(e.cashPerShare)&&e.cashPerShare>=0)||e.currency!=='KRW'))issues.push('DIVIDEND_DETAILS_MISSING');
    if(['RIGHTS_ISSUE','SHARE_COUNT_CHANGE','PAR_VALUE_CHANGE'].includes(e.type))issues.push('CAPITAL_EVENT_REVIEW_REQUIRED');
  }
  return {status:issues.length?'UNDER_REVIEW':'VERIFIED',issues:[...new Set(issues)],fromDate,toDate,priceBasis,events};
}
export function measureActionAwareReturns(sessions, review, {includeDividends=false}={}) {
  if(review?.status!=='VERIFIED'||review.priceBasis!=='RAW'||!Array.isArray(review.events)||!Array.isArray(sessions)||sessions.length<2||sessions.some((x,i)=>!validDay(x.date)||!(Number.isFinite(x.close)&&x.close>0)||i>0&&sessions[i-1].date>=x.date)||sessions[0].date!==review.fromDate||sessions.at(-1).date!==review.toDate)return {status:'PENDING',reason:'ACTION_OR_PRICE_BASIS_UNVERIFIED'};
  if(review.events.some(e=>!types.includes(e.type)||['RIGHTS_ISSUE','SHARE_COUNT_CHANGE','PAR_VALUE_CHANGE'].includes(e.type)))return {status:'PENDING',reason:'CAPITAL_EVENT_REVIEW_REQUIRED'};
  const eventKeys=new Set();
  for(const e of review.events){
    const key=JSON.stringify([e.type,e.date,e.ratio??null,e.cashPerShare??null,e.currency??null]);
    if(!validDay(e.date)||e.date<review.fromDate||e.date>review.toDate||eventKeys.has(key))return {status:'PENDING',reason:'UNVERIFIED_OR_DUPLICATE_EVENT'};eventKeys.add(key);
    if(['SPLIT','REVERSE_SPLIT','BONUS_ISSUE'].includes(e.type)&&!(Number.isFinite(e.ratio)&&e.ratio>0))return {status:'PENDING',reason:'SPLIT_RATIO_MISSING'};
    if(e.type==='CASH_DIVIDEND'&&(!(Number.isFinite(e.cashPerShare)&&e.cashPerShare>=0)||e.currency!=='KRW'))return {status:'PENDING',reason:'DIVIDEND_DETAILS_MISSING'};
  }
  if(review.events.some(e=>e.date>sessions[0].date&&!sessions.some(x=>x.date===e.date)))return {status:'PENDING',reason:'ACTION_SESSION_MISSING'};
  let wealth=1,peak=1,mdd=0;const points=[{date:sessions[0].date,dailyReturnPct:0,cumulativeReturnPct:0}];
  for(let i=1;i<sessions.length;i++){
    const events=review.events.filter(x=>x.date===sessions[i].date), ratio=events.filter(x=>['SPLIT','REVERSE_SPLIT','BONUS_ISSUE'].includes(x.type)).reduce((a,x)=>a*x.ratio,1);
    const cash=includeDividends?events.filter(x=>x.type==='CASH_DIVIDEND').reduce((a,x)=>a+x.cashPerShare,0):0;
    if(ratio!==1 && events.some(x=>x.type==='CASH_DIVIDEND' && x.cashShareBasis!=='POST_EVENT'))return {status:'PENDING',reason:'DIVIDEND_SHARE_BASIS_UNVERIFIED'};
    const factor=(sessions[i].close+cash)*ratio/sessions[i-1].close;wealth*=factor;
    if(!Number.isFinite(wealth)||!(wealth>0)||!(factor>0))return {status:'PENDING',reason:'NUMERIC_RANGE'};
    peak=Math.max(peak,wealth);mdd=Math.min(mdd,wealth/peak-1);points.push({date:sessions[i].date,dailyReturnPct:(factor-1)*100,cumulativeReturnPct:(wealth-1)*100});
  }
  return {status:'READY',basis:includeDividends?'TOTAL_RETURN':'PRICE_RETURN',points,mddPct:mdd*100,feesIncluded:false,taxesIncluded:false,dividendsIncluded:includeDividends};
}
