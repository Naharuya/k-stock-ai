import {validDay} from './accounting_periods.js';
const official=u=>{try{const x=new URL(u);return x.protocol==='https:'&&['dart.fss.or.kr','opendart.fss.or.kr','kind.krx.co.kr'].includes(x.hostname);}catch{return false;}};
const publicAt=(x,day)=>Number.isFinite(Date.parse(x))&&Date.parse(x)<=Date.parse(day+'T23:59:59+09:00');
export const SHARE_BRIDGE_TYPES=['RIGHTS_ISSUE','BONUS_ISSUE','SPLIT','REVERSE_SPLIT','STOCK_DIVIDEND','CANCELLATION','CONVERSION','WARRANT_EXERCISE','OTHER_ISSUANCE','TREASURY_CHANGE'];
export function reconcilePeerShares({baseline,valuationDate,coverage,events=[],checkpoints=[]}){
 const reasons=[],movements=[];const fail=r=>reasons.push(r);
 if(baseline?.verificationStatus!=='VERIFIED'||!validDay(baseline.asOfDate)||!validDay(valuationDate)||baseline.asOfDate>valuationDate||!official(baseline.sourceUrl)||!publicAt(baseline.availableAt,valuationDate)||!Number.isSafeInteger(baseline.issuedShares)||baseline.issuedShares<=0||!Number.isSafeInteger(baseline.treasuryShares)||baseline.treasuryShares<0||baseline.treasuryShares>baseline.issuedShares||!['COMMON','PREFERRED'].includes(baseline.shareClass))fail('BASELINE_SHARE_COUNT_UNVERIFIED');
 if(coverage?.verified!==true||!validDay(coverage.fromDate)||!validDay(coverage.toDate)||coverage.fromDate>baseline?.asOfDate||coverage.toDate<valuationDate||!official(coverage.sourceUrl)||!SHARE_BRIDGE_TYPES.every(t=>coverage.types?.includes(t)))fail('FULL_ACTION_COVERAGE_UNVERIFIED');
 let issued=baseline?.issuedShares,treasury=baseline?.treasuryShares;const seen=new Set();
 for(const event of [...events].sort((a,b)=>String(a.effectiveDate).localeCompare(String(b.effectiveDate)))){
  const included=event.baselineInclusion;
  if(event.type==='CANCELLATION'&&event.verificationStatus==='VERIFIED'&&included?.verificationStatus==='VERIFIED'&&included.includedInBaseline===true&&included.baselineDate===baseline?.asOfDate&&included.baselineIssuedShares===baseline?.issuedShares&&included.sourceDocumentId===baseline?.sourceDocumentId&&included.shareClass===baseline?.shareClass&&event.shareClass===baseline?.shareClass&&included.cancellationDate===event.effectiveDate&&validDay(event.effectiveDate)&&event.effectiveDate<=baseline.asOfDate&&Number.isSafeInteger(included.quantity)&&included.quantity>0&&event.delta===-included.quantity&&official(included.sourceUrl)&&publicAt(included.availableAt,valuationDate)&&official(event.sourceUrl)&&publicAt(event.availableAt,valuationDate)){movements.push({...event,applied:false,reason:'ALREADY_INCLUDED_IN_BASELINE'});continue;}
  if(event.status==='DECISION_ONLY'){movements.push({...event,applied:false});fail('DECISION_EFFECT_UNVERIFIED');continue;}
  if(event.shareClass!==baseline?.shareClass||event.verificationStatus!=='VERIFIED'||!validDay(event.effectiveDate)||event.effectiveDate<=baseline?.asOfDate||event.effectiveDate>valuationDate||!publicAt(event.availableAt,valuationDate)||!official(event.sourceUrl)||!event.sourceDocumentId){fail('EVENT_DATE_CLASS_OR_PUBLICATION_UNVERIFIED');continue;}
  const key=event.eventId||`${event.type}:${event.effectiveDate}:${event.shareClass}:${event.delta}:${event.ratio}`;if(seen.has(key)){fail('DUPLICATE_OR_CORRECTED_EVENT_UNRESOLVED');continue;}seen.add(key);
  if(event.type==='TREASURY_CHANGE'&&Number.isSafeInteger(event.delta))treasury+=event.delta;
  else if(event.type==='CANCELLATION'&&Number.isSafeInteger(event.delta)&&event.delta<0){issued+=event.delta;treasury+=event.delta;}
  else if(['SPLIT','REVERSE_SPLIT'].includes(event.type)&&event.ratio>0&&Number.isFinite(event.ratio)){issued*=event.ratio;treasury*=event.ratio;}
  else if(SHARE_BRIDGE_TYPES.includes(event.type)&&!['SPLIT','REVERSE_SPLIT','CANCELLATION','TREASURY_CHANGE'].includes(event.type)&&Number.isSafeInteger(event.delta)&&event.delta>0)issued+=event.delta;
  else{fail('EVENT_APPLICATION_UNVERIFIED');continue;}
  movements.push({...event,applied:true,issuedSharesAfter:issued,treasurySharesAfter:treasury});
 }
 if(!Number.isSafeInteger(issued)||issued<=0||!Number.isSafeInteger(treasury)||treasury<0||treasury>issued)fail('SHARE_RECONCILIATION_RANGE');
 const checkpointReviews=[];
 for(const point of checkpoints){
  const checkpointVerified=point.verificationStatus==='VERIFIED';
  if(!checkpointVerified&&!(point.status==='OFFICIAL_DOCUMENT_OBSERVED'&&point.sourceIntegrityVerified===true)||!validDay(point.asOfDate)||point.asOfDate<baseline?.asOfDate||point.asOfDate>valuationDate||!publicAt(point.availableAt,valuationDate)||!official(point.sourceUrl)||point.shareClass&&point.shareClass!==baseline?.shareClass)continue;
  const prior=movements.filter(m=>m.applied&&m.effectiveDate<=point.asOfDate).at(-1);
  const expectedIssued=prior?.issuedSharesAfter??baseline?.issuedShares,expectedTreasury=prior?.treasurySharesAfter??baseline?.treasuryShares;
  const issuedDifference=Number.isSafeInteger(point.issuedShares)?expectedIssued-point.issuedShares:null;
  const treasuryDifference=Number.isSafeInteger(point.treasuryShares)?expectedTreasury-point.treasuryShares:null;
  if(issuedDifference===null&&treasuryDifference===null)continue;
  const conflict=issuedDifference!==null&&issuedDifference!==0||treasuryDifference!==null&&treasuryDifference!==0;
  checkpointReviews.push({asOfDate:point.asOfDate,sourceUrl:point.sourceUrl,issuedDifference,treasuryDifference,status:!checkpointVerified?'PARTIAL_INPUT_OBSERVATION':conflict?'SOURCE_CONFLICT':'MATCHED_OBSERVED_FIELDS'});
  if(conflict&&checkpointVerified)fail('OFFICIAL_CHECKPOINT_CONFLICT');
 }

 const verified=reasons.length===0;return {verificationStatus:verified?'VERIFIED':'SHARE_COUNT_UNVERIFIED',reconciliationStatus:verified?'RECONCILED':reasons.includes('OFFICIAL_CHECKPOINT_CONFLICT')?'SOURCE_CONFLICT':movements.some(x=>x.applied)?'PARTIAL':'INSUFFICIENT_DATA',valuationDate,baseline,coverage,movements,checkpoints,checkpointReviews,issuedShares:verified?issued:null,treasuryShares:verified?treasury:null,outstandingShares:verified?issued-treasury:null,difference:verified?issued-baseline.issuedShares:null,reasons:[...new Set(reasons)],marketCapStatus:verified?'PRICE_AND_CLASS_VALIDATION_REQUIRED':'MARKET_CAP_UNVERIFIED'};
}
