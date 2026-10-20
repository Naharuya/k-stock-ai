import {validDay} from './accounting_periods.js';
const clean=x=>x.replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
const integer=x=>/^\d[\d,]*$/.test(x)&&Number.isSafeInteger(Number(x.replaceAll(',','')))?Number(x.replaceAll(',','')):null;
export function parseTreasuryExecutions(html,{fromDate,toDate,identity,plan,collectedAt,sourceDigest}={}){
 const issues=[],events=[];
 if(!validDay(fromDate)||!validDay(toDate)||fromDate>toDate||identity?.isurcd!=='00593'||identity?.repisusrtcd2!=='005930'||identity?.repisucd!=='KR7005930003'||identity?.fssunqno!=='00126380'||plan?.shareClass!=='COMMON'||plan?.sourceVerified!==true||!validDay(plan?.plannedFromDate)||!validDay(plan?.plannedToDate)||!/^\d{14}$/.test(plan?.sourceDocumentId||'')||!Number.isFinite(Date.parse(collectedAt))||!/^[a-f0-9]{64}$/.test(sourceDigest||''))issues.push('SOURCE_IDENTITY_UNVERIFIED');
 if(!clean(html).includes('당일체결수량'))issues.push('EXECUTION_CONTRACT_MISSING');
 for(const row of String(html).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
  const cells=[...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)];if(cells.length!==6)continue;
  const c=cells.map(x=>clean(x[1])),date=c[0],name=cells[1][0].match(/title=['"]([^'"]+)['"]/i)?.[1];
  if(!validDay(date)||date<fromDate||date>toDate||date<plan?.plannedFromDate||date>plan?.plannedToDate||name!=='삼성전자'||!row[1].includes("companysummary_open('00593')")||c[2]!=='직접 / 취득')issues.push('EXECUTION_SCOPE_MISMATCH');
  const requestedQuantity=integer(c[3]),quantity=integer(c[4]);
  if(requestedQuantity===null||quantity===null||quantity>requestedQuantity||quantity<=0)issues.push('EXECUTION_QUANTITY_INVALID');
  events.push({stockCode:'005930',shareClass:'COMMON',eventType:'TREASURY_ACQUIRE',transactionKind:'ACTUAL_ACQUISITION',executionStatus:'EXECUTED',announcementDate:null,recordDate:null,exDate:null,effectiveDate:date,quantity,requestedQuantity,source:'KRX KIND 자기주식 체결내역',sourceUrl:'https://kind.krx.co.kr/corpgeneral/treasurystk.do?method=loadInitPage',sourceDocumentId:plan?.sourceDocumentId,executionId:`${plan?.sourceDocumentId}:${date}`,sourceDigest,collectedAt,availableAt:collectedAt,publicationTimeVerified:false,sourceVerified:true});
 }
 const footer=clean(html).match(/전체\s*([\d,]+)\s*건\s*:\s*(\d+)\s*\/\s*(\d+)/);
 const complete=!!footer&&footer[2]==='1'&&footer[3]==='1'&&integer(footer[1])===events.length;
 if(!complete)issues.push('EXECUTION_LIST_INCOMPLETE');
 if(new Set(events.map(x=>x.executionId)).size!==events.length)issues.push('DUPLICATE_EXECUTION');
 events.sort((a,b)=>a.effectiveDate.localeCompare(b.effectiveDate));
 const status=issues.length?'PENDING_VERIFICATION':'VERIFIED';
 return {status,fromDate,toDate,listingComplete:complete,issues:[...new Set(issues)],events:events.map(e=>({...e,verificationStatus:status,shareImpact:status==='VERIFIED'?{issued:0,treasury:e.quantity,outstanding:-e.quantity}:null})),actualQuantity:status==='VERIFIED'?events.reduce((n,x)=>n+x.quantity,0):null,economicCoverageVerified:false,warning:'CURRENT_RETRIEVAL_DOES_NOT_PROVE_HISTORICAL_PUBLICATION_TIME'};
}
export function reconcileTreasuryLedger(base,events,{asOfDate,coverage,analysisDate}={}){
 const fail=reason=>({status:'PENDING_VERIFICATION',reason,issued:null,treasury:null,outstanding:null,asOfDate});
 if(base?.verificationStatus!=='VERIFIED'||!validDay(base.asOfDate)||!validDay(asOfDate)||base.asOfDate>asOfDate||!['COMMON','PREFERRED'].includes(base.shareClass)||![base.issued,base.treasury,base.outstanding].every(Number.isSafeInteger)||base.issued-base.treasury!==base.outstanding||base.treasury<0||base.outstanding<=0)return fail('BASE_SHARE_COUNT_INVALID');
 if(coverage?.verified!==true||!['SPLIT','REVERSE_SPLIT','BONUS_ISSUE','RIGHTS_ISSUE','SHARE_COUNT_CHANGE','TREASURY_CHANGE','TREASURY_CANCEL'].every(t=>coverage.types?.includes(t))||!validDay(coverage.fromDate)||!validDay(coverage.toDate)||coverage.fromDate>base.asOfDate||coverage.toDate<asOfDate||!/^https:\/\//.test(coverage.sourceUrl||''))return fail('FULL_SHARE_CHANGE_COVERAGE_REQUIRED');
 if(!Number.isFinite(Date.parse(analysisDate))||base.publicationVerified!==true||Date.parse(base.availableAt)>Date.parse(analysisDate)||!Number.isFinite(Date.parse(base.availableAt)))return fail('PUBLICATION_UNAVAILABLE');
 let issued=base.issued,treasury=base.treasury;const seen=new Set();
 for(const e of events){
  if(e.verificationStatus!=='VERIFIED'||e.executionStatus==='PLANNED'||e.shareClass!==base.shareClass||e.stockCode!==base.stockCode||!validDay(e.effectiveDate)||e.effectiveDate<=base.asOfDate||e.effectiveDate>asOfDate||!Number.isFinite(Date.parse(e.availableAt))||Date.parse(e.availableAt)>Date.parse(analysisDate)||!e.sourceVerified||!e.sourceDocumentId||!/^https:\/\//.test(e.sourceUrl||'')||!Number.isSafeInteger(e.quantity)||e.quantity<=0)return fail('EVENT_SOURCE_OR_DATE_UNVERIFIED');
  const key=`${e.eventType}:${e.effectiveDate}:${e.quantity}`;if(seen.has(key))return fail('DUPLICATE_EXECUTION');seen.add(key);
  if(e.eventType==='TREASURY_ACQUIRE')treasury+=e.quantity;
  else if(e.eventType==='TREASURY_DISPOSE')treasury-=e.quantity;
  else if(e.eventType==='TREASURY_CANCEL'&&e.issuedDeltaVerified===true&&e.issuedDelta===-e.quantity){issued-=e.quantity;treasury-=e.quantity;}
  else return fail('SHARE_CHANGE_EFFECT_UNVERIFIED');
  if(!Number.isSafeInteger(issued)||!Number.isSafeInteger(treasury)||treasury<0||issued<=treasury)return fail('SHARE_COUNT_RANGE');
 }
 return {status:'VERIFIED',issued,treasury,outstanding:issued-treasury,asOfDate,sourceAsOfDate:base.asOfDate,shareClass:base.shareClass,stockCode:base.stockCode};
}

export function reconcileTreasuryBalance(opening,events,closing,{analysisDate,coverageVerified=false}={}){
 const fail=reason=>({status:'PENDING_VERIFICATION',reason,calculatedBalance:null,closingBalance:null,difference:null});
 const point=p=>p?.sourceVerified===true&&['COMMON','PREFERRED'].includes(p.shareClass)&&/^\d{6}$/.test(p.stockCode||'')&&validDay(p.asOfDate)&&p.asOfDate<=analysisDate.slice(0,10)&&Number.isSafeInteger(p.quantity)&&p.quantity>=0&&p.sourceDocumentId&&/^https:\/\//.test(p.sourceUrl||'')&&Number.isFinite(Date.parse(p.availableAt))&&Date.parse(p.availableAt)<=Date.parse(analysisDate);
 if(!Number.isFinite(Date.parse(analysisDate))||!point(opening))return fail('OPENING_BALANCE_UNVERIFIED');
 if(!point(closing))return fail('CLOSING_BALANCE_UNVERIFIED');
 if(opening.stockCode!==closing.stockCode||opening.shareClass!==closing.shareClass||opening.asOfDate>closing.asOfDate)return fail('BALANCE_SCOPE_MISMATCH');
 let balance=opening.quantity;const totals={acquisition:0,disposal:0,cancellation:0,other:0},seen=new Set();
 for(const e of [...events].sort((a,b)=>(a.effectiveDate||'').localeCompare(b.effectiveDate||''))){
  if(e.executionStatus==='PLANNED')continue;
  if(e.verificationStatus!=='VERIFIED'||!e.sourceVerified||!e.sourceDocumentId||!/^https:\/\//.test(e.sourceUrl||'')||e.stockCode!==opening.stockCode||e.shareClass!==opening.shareClass||!validDay(e.effectiveDate)||e.effectiveDate<=opening.asOfDate||e.effectiveDate>closing.asOfDate||!Number.isFinite(Date.parse(e.availableAt))||Date.parse(e.availableAt)>Date.parse(analysisDate)||e.correctionStatus==='UNRESOLVED')return fail('EVENT_SOURCE_OR_DATE_UNVERIFIED');
  const key=`${e.eventType}:${e.effectiveDate}:${e.quantity}:${e.delta}`;
  if(seen.has(key))return fail('DUPLICATE_EXECUTION');seen.add(key);
  if(e.eventType==='TREASURY_OTHER'&&e.adjustmentVerified===true&&Number.isSafeInteger(e.delta)){balance+=e.delta;totals.other+=e.delta;}
  else if(Number.isSafeInteger(e.quantity)&&e.quantity>0){
   if(e.eventType==='TREASURY_ACQUIRE'){balance+=e.quantity;totals.acquisition+=e.quantity;}
   else if(e.eventType==='TREASURY_DISPOSE'){balance-=e.quantity;totals.disposal+=e.quantity;}
   else if(e.eventType==='TREASURY_CANCEL'){balance-=e.quantity;totals.cancellation+=e.quantity;}
   else return fail('TREASURY_EFFECT_UNVERIFIED');
  }else return fail('TREASURY_EFFECT_UNVERIFIED');
  if(!Number.isSafeInteger(balance)||balance<0)return fail('BALANCE_RANGE');
 }
 const difference=balance-closing.quantity;
 return {status:difference!==0?'RECONCILIATION_MISMATCH':coverageVerified?'VERIFIED':'PENDING_VERIFICATION',reason:difference!==0?'RECONCILIATION_MISMATCH':coverageVerified?null:'FULL_COVERAGE_REQUIRED',equationStatus:difference===0?'MATCH':'MISMATCH',openingBalance:opening.quantity,calculatedBalance:balance,closingBalance:closing.quantity,difference,totals,fromDate:opening.asOfDate,toDate:closing.asOfDate,shareClass:opening.shareClass,coverageVerified};
}

// A publication on the target date is not a balance measured on that date.
export function reconcileDatedTreasuryBalance(opening,events,closing,{asOfDate,analysisDate,coverageVerified=false}={}){
 const pending=reason=>({status:'PENDING_VERIFICATION',reconciliationStatus:'INSUFFICIENT_DATA',reason,asOfDate,calculatedBalance:null,closingBalance:null,difference:null});
 if(!validDay(asOfDate))return pending('BALANCE_REFERENCE_DATE_REQUIRED');
 if([opening,closing,...events].some(x=>x?.correctionStatus==='UNRESOLVED'))return {...pending('FINAL_CORRECTION_REQUIRED'),reconciliationStatus:'PENDING_CORRECTION'};
 if(!closing||closing.asOfDate!==asOfDate)return pending('TARGET_DATE_BALANCE_UNVERIFIED');
 const r=reconcileTreasuryBalance(opening,events,closing,{analysisDate,coverageVerified});
 return {...r,asOfDate,reconciliationStatus:r.status==='VERIFIED'?'RECONCILED':r.status==='RECONCILIATION_MISMATCH'?'MISMATCH':'INSUFFICIENT_DATA'};
}
