import {validDay} from './accounting_periods.js';
const positiveSafe=value=>Number.isSafeInteger(value)&&value>0;
const official=url=>{try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password&&['data.krx.co.kr','openapi.krx.co.kr','kind.krx.co.kr','dart.fss.or.kr'].includes(u.hostname);}catch{return false;}};
// Listed class capitalization is not proof of treasury holdings or all equity.
export function verifyDatedCapitalObservation(observation,price,date){
 const reasons=[];
 if(!validDay(date)||observation?.asOfDate!==date||observation?.responseDate!==date)reasons.push('CAPITAL_RESPONSE_DATE_UNVERIFIED');
 if(observation?.ticker!==price?.ticker||!/^\d{6}$/.test(observation?.ticker||''))reasons.push('CAPITAL_IDENTITY_MISMATCH');
 if(!['COMMON','PREFERRED'].includes(observation?.shareClass)||observation?.shareClass!==price?.shareClass)reasons.push('CAPITAL_SHARE_CLASS_MISMATCH');
 if(observation?.currency!=='KRW'||observation?.unit!=='KRW'||observation?.shareDefinition!=='LISTED_ISSUED')reasons.push('CAPITAL_DEFINITION_UNVERIFIED');
 if(!positiveSafe(observation?.listedShares)||!positiveSafe(observation?.marketCap))reasons.push('CAPITAL_VALUES_UNVERIFIED');
 if(!official(observation?.sourceUrl)||observation?.sourceVerified!==true)reasons.push('CAPITAL_SOURCE_UNVERIFIED');
 if(price?.asOfDate!==date||price?.status!=='VERIFIED_DATE_CLOSE'||price?.basis!=='RAW'||price?.currency!=='KRW'||!positiveSafe(price?.close))reasons.push('CAPITAL_PRICE_ALIGNMENT_UNVERIFIED');
 let calculated=null;
 if(positiveSafe(observation?.listedShares)&&positiveSafe(price?.close)){
  const value=BigInt(observation.listedShares)*BigInt(price.close);
  if(value>BigInt(Number.MAX_SAFE_INTEGER))reasons.push('CAPITAL_NUMERIC_RANGE');
  else {calculated=Number(value);if(calculated!==observation?.marketCap)reasons.push('CAPITAL_PRICE_TIMES_SHARES_MISMATCH');}
 }
 return {status:reasons.length?'PENDING_VERIFICATION':'VERIFIED_CLASS_OBSERVATION',asOfDate:date,shareClass:observation?.shareClass||null,
  marketCap:reasons.length?null:observation.marketCap,listedShares:reasons.length?null:observation.listedShares,calculatedObserved:calculated,
  reasons:[...new Set(reasons)],scope:'LISTED_CLASS_ONLY',treasuryStatus:'NOT_VERIFIED',allEquityStatus:'NOT_VERIFIED',recommendationEligible:false};
}
