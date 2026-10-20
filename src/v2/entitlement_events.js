import {validDay} from './accounting_periods.js';
export function verifyEntitlementEvent(e,analysisDate){
 const issues=[],needs=[];
 const requireField=(key,check)=>{if(!check(e?.[key]))needs.push(key);};
 if(!e||!/^\d{6}$/.test(e.stockCode||'')||!['COMMON','PREFERRED'].includes(e.shareClass)||e.sourceVerified!==true||!e.sourceDocumentId||!/^https:\/\//.test(e.sourceUrl||''))issues.push('SOURCE_OR_IDENTITY_UNVERIFIED');
 if(!Number.isFinite(Date.parse(analysisDate))||!validDay(e?.announcementDate)||Date.parse(`${e.announcementDate}T23:59:59+09:00`)>Date.parse(analysisDate))issues.push('PUBLICATION_UNAVAILABLE');
 if(e?.availableAt!==undefined&&(!Number.isFinite(Date.parse(e.availableAt))||Date.parse(e.availableAt)>Date.parse(analysisDate)))issues.push('PUBLICATION_UNAVAILABLE');
 if(e?.executionStatus==='PLANNED')issues.push('EXECUTION_NOT_CONFIRMED');
 if(e?.eventType==='CASH_DIVIDEND'){
  for(const key of ['recordDate','exDate','paymentDate'])requireField(key,validDay);
  requireField('cashPerShare',x=>Number.isFinite(x)&&x>=0);requireField('currency',x=>x==='KRW');requireField('confirmed',x=>x===true);
  if(validDay(e.exDate)&&validDay(e.recordDate)&&e.exDate>e.recordDate)issues.push('DIVIDEND_DATE_ORDER');
  if(validDay(e.paymentDate)&&validDay(e.recordDate)&&e.paymentDate<e.recordDate)issues.push('DIVIDEND_DATE_ORDER');
 }else if(['SPLIT','REVERSE_SPLIT','BONUS_ISSUE'].includes(e?.eventType)){
  requireField('effectiveDate',validDay);requireField('listingDate',validDay);requireField('ratio',x=>Number.isFinite(x)&&x>0);
  if(e.eventType==='BONUS_ISSUE')requireField('recordDate',validDay);
  if(e.eventType==='SPLIT'&&e.ratio<=1||e.eventType==='REVERSE_SPLIT'&&e.ratio>=1)issues.push('RATIO_DIRECTION');
 }else if(e?.eventType==='RIGHTS_ISSUE'){
  for(const key of ['exDate','recordDate','listingDate'])requireField(key,validDay);
  requireField('newSharesPerOldShare',x=>Number.isFinite(x)&&x>0);requireField('subscriptionPrice',x=>Number.isFinite(x)&&x>0);requireField('currency',x=>x==='KRW');
  // Required values alone do not establish a verified rights valuation or participation convention.
  issues.push('RIGHTS_VALUATION_POLICY_UNVERIFIED');
 }else if(['TREASURY_ACQUIRE','TREASURY_DISPOSE','TREASURY_CANCEL'].includes(e?.eventType)){
  requireField('effectiveDate',validDay);requireField('quantity',x=>Number.isSafeInteger(x)&&x>0);
  if(e.eventType==='TREASURY_CANCEL'){requireField('issuedDeltaVerified',x=>x===true);requireField('issuedDelta',x=>Number.isSafeInteger(x)&&x===-e.quantity);}
 }else issues.push('UNSUPPORTED_EVENT');
 const effectiveDate=e?.eventType==='CASH_DIVIDEND'?e.exDate:e?.effectiveDate;
 if(validDay(e?.effectiveDate)&&e.eventType==='CASH_DIVIDEND'&&e.effectiveDate!==e.exDate)issues.push('EFFECTIVE_DATE_MISMATCH');
 const status=issues.length||needs.length?'PENDING_VERIFICATION':'VERIFIED';
 let shareImpact=null;
 if(status==='VERIFIED'&&e.eventType.startsWith('TREASURY_')){
  const q=e.quantity;shareImpact=e.eventType==='TREASURY_ACQUIRE'?{issued:0,treasury:q,outstanding:-q}:e.eventType==='TREASURY_DISPOSE'?{issued:0,treasury:-q,outstanding:q}:{issued:-q,treasury:-q,outstanding:0};
 }
 return {...e,effectiveDate:validDay(effectiveDate)?effectiveDate:null,verificationStatus:status,missingFields:needs,issues,shareImpact,calculationEligible:status==='VERIFIED'&&!e.eventType.startsWith('TREASURY_')};
}
