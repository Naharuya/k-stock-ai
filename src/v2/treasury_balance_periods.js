import{validDay}from'./accounting_periods.js';
import{reconcileDatedTreasuryBalance}from'./treasury_ledger.js';

// Select observations, never manufacture an observation at the price cutoff.
export function buildOfficialBalancePeriods(points,events,{stockCode,shareClass,analysisDate,requestedDate,coverage=[]}={}){
 const eligible=p=>p?.stockCode===stockCode&&p.shareClass===shareClass&&p.sourceVerified===true&&validDay(p.asOfDate)&&Number.isSafeInteger(p.quantity)&&p.quantity>=0&&p.sourceDocumentId&&/^https:\/\//.test(p.sourceUrl||'')&&Number.isFinite(Date.parse(p.availableAt))&&Number.isFinite(Date.parse(analysisDate))&&Date.parse(p.availableAt)<=Date.parse(analysisDate)&&p.asOfDate<=analysisDate.slice(0,10);
 const observations=points.filter(eligible).map(p=>({...p,balanceAsOfDate:p.asOfDate,disclosureDate:p.disclosureDate||null,transactionDate:null})).sort((a,b)=>a.asOfDate.localeCompare(b.asOfDate));
 const intervals=[];
 for(let i=1;i<observations.length;i++){
  const opening=observations[i-1],closing=observations[i];
  const conflicts=observations.filter(p=>p.asOfDate===opening.asOfDate||p.asOfDate===closing.asOfDate).some(p=>observations.some(q=>q.asOfDate===p.asOfDate&&q.quantity!==p.quantity));
  const unresolved=observations.some(p=>(p.asOfDate===opening.asOfDate||p.asOfDate===closing.asOfDate)&&p.correctionStatus==='UNRESOLVED');
  if(opening.asOfDate===closing.asOfDate)continue;
  const selected=events.filter(e=>e.stockCode===stockCode&&e.shareClass===shareClass&&validDay(e.effectiveDate)&&e.effectiveDate>opening.asOfDate&&e.effectiveDate<=closing.asOfDate);
  const invalidDates=events.some(e=>e.stockCode===stockCode&&e.shareClass===shareClass&&e.executionStatus!=='PLANNED'&&!validDay(e.effectiveDate));
  const proof=coverage.find(c=>c.fromDate===opening.asOfDate&&c.toDate===closing.asOfDate&&c.stockCode===stockCode&&c.shareClass===shareClass&&c.verified===true&&/^https:\/\//.test(c.sourceUrl||'')&&c.sourceDocumentId&&Number.isFinite(Date.parse(c.availableAt))&&Date.parse(c.availableAt)<=Date.parse(analysisDate));
  const result=reconcileDatedTreasuryBalance(opening,selected,closing,{asOfDate:closing.asOfDate,analysisDate,coverageVerified:!!proof});
  intervals.push({opening,closing,eventCount:selected.length,result:conflicts||unresolved?{status:'PENDING_VERIFICATION',reconciliationStatus:'PENDING_CORRECTION',reason:'BALANCE_CORRECTION_RELATION_REQUIRED',calculatedBalance:null,difference:null}:invalidDates?{status:'PENDING_VERIFICATION',reconciliationStatus:'INSUFFICIENT_DATA',reason:'TRANSACTION_DATE_REQUIRED',calculatedBalance:null,difference:null}:result});
 }
 const last=observations.at(-1)||null;
 const latest=last&&last.correctionStatus!=='UNRESOLVED'&&!observations.some(p=>p.asOfDate===last.asOfDate&&(p.quantity!==last.quantity||p.correctionStatus==='UNRESOLVED'))?last:null;
 const requested=validDay(requestedDate)?observations.filter(p=>p.asOfDate===requestedDate):[];
 const requestedConfirmed=requested.length>0&&requested.every(p=>p.correctionStatus!=='UNRESOLVED'&&p.quantity===requested[0].quantity);
 return {stockCode,shareClass,latestOfficial:latest,observations,intervals,requestedSource:{requestedDate,status:requestedConfirmed?'SOURCE_CONFIRMED':'SOURCE_NOT_CONFIRMED',existence:requested.length?'CONFIRMED':'UNKNOWN'},nextOfficialRequired:true};
}
