import {validDay} from './accounting_periods.js';
import {alignShareCount} from './share_count.js';
const https=x=>{try{const u=new URL(x);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}};
const known=(stamp,date)=>Number.isFinite(Date.parse(stamp))&&Date.parse(stamp)<=Date.parse(`${date}T23:59:59+09:00`);
// A dated close is not evidence of dated market capitalization. Preserve both.
export function verifyDatedPrice(price,date){
 const reasons=[];
 if(!validDay(date)||price?.asOfDate!==date)reasons.push('PRICE_DATE_MISMATCH');
 if(!Number.isFinite(price?.close)||price.close<=0)reasons.push('INVALID_CLOSE');
 if(price?.basis!=='RAW'||price?.currency!=='KRW'||!['COMMON','PREFERRED'].includes(price?.shareClass))reasons.push('PRICE_BASIS_UNVERIFIED');
 if(!https(price?.sourceUrl)||!known(price?.availableAt,date)||price?.verificationStatus!=='VERIFIED')reasons.push('PRICE_SOURCE_UNVERIFIED');
 return {status:reasons.length?'PENDING_VERIFICATION':'VERIFIED',date,price:price||null,reasons};
}
export function verifyValuationCapital({date,classes=[],shareRecords=[],coverage,events=[],classScope,officialMarketCap}={}){
 const reasons=[],aligned=[];
 if(!validDay(date)||!['COMMON_ONLY','COMMON_AND_PREFERRED'].includes(classScope))reasons.push('EQUITY_CLASS_SCOPE_UNVERIFIED');
 const required=classScope==='COMMON_ONLY'?['COMMON']:['COMMON','PREFERRED'];
 for(const cls of required){
  const prices=classes.filter(p=>p.shareClass===cls),records=shareRecords.filter(r=>r.shareClass===cls);
  if(prices.length!==1||records.length!==1){reasons.push('MISSING_OR_DUPLICATE_CLASS');continue;}
  const price=prices[0],record=records[0],proof=verifyDatedPrice(price,date);
  reasons.push(...proof.reasons);
  if(!https(record.sourceUrl))reasons.push('SHARE_SOURCE_UNVERIFIED');
  if(!Number.isSafeInteger(record.issued)||record.issued<=0||!Number.isSafeInteger(record.outstanding)||record.issued-record.treasury!==record.outstanding)reasons.push('SHARE_COUNT_DEFINITION_UNVERIFIED');
  if(record.asOfDate!==date&&(!https(coverage?.sourceUrl)||!known(coverage?.availableAt,date)))reasons.push('COVERAGE_PUBLICATION_UNVERIFIED');
  if(events.some(e=>e.shareClass===cls&&(!https(e.sourceUrl)||!known(e.availableAt,date))))reasons.push('EVENT_PUBLICATION_UNVERIFIED');
  const bridge=alignShareCount(record,{...price,shareDefinition:'ISSUED'},{coverage,events:events.filter(e=>e.shareClass===cls)});
  if(bridge.status!=='VERIFIED')reasons.push(bridge.reason);
  // Issued shares suffice for issued market capitalization, but treasury evidence
  // remains necessary to explain outstanding equity. Never fill missing with zero.
  if(!Number.isSafeInteger(record.treasury)||record.treasury<0||record.treasury>record.issued)reasons.push('TREASURY_COUNT_UNVERIFIED');
  aligned.push({shareClass:cls,sourceAsOfDate:record.asOfDate,...bridge});
 }
 if(classes.some(p=>!required.includes(p.shareClass))||shareRecords.some(r=>!['TOTAL',...required].includes(r.shareClass)))reasons.push('UNEXPECTED_SHARE_CLASS');
 const valid=aligned.length===required.length&&aligned.every(x=>x.status==='VERIFIED');
 const calculated=valid?aligned.reduce((n,x)=>n+x.marketCap,0):null;
 let official=null;
 if(officialMarketCap){
  if(officialMarketCap.asOfDate!==date||officialMarketCap.basis!=='ALL_EQUITY_ISSUED'||officialMarketCap.currency!=='KRW'||!Number.isFinite(officialMarketCap.value)||officialMarketCap.value<=0||!https(officialMarketCap.sourceUrl)||!known(officialMarketCap.availableAt,date))reasons.push('OFFICIAL_CAP_DATE_OR_DEFINITION_UNVERIFIED');
  else {official=officialMarketCap.value;if(calculated!==null&&Math.abs(calculated-official)>Math.max(1,officialMarketCap.roundingUnit||0))reasons.push('MARKET_CAP_RECONCILIATION_REQUIRED');}
 }
 return {status:reasons.length?'PENDING_VERIFICATION':'VERIFIED',asOfDate:date,marketCap:reasons.length?null:calculated,calculatedObserved:calculated,officialObserved:official,definition:'ALL_EQUITY_ISSUED',aligned,reasons:[...new Set(reasons)]};
}
