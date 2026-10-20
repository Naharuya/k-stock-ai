import {validDay} from './accounting_periods.js';
const official=url=>{try{const u=new URL(url);return u.protocol==='https:'&&u.hostname==='dart.fss.or.kr';}catch{return false;}};
// A decision's scheduled date is never evidence of actual cancellation.
export function verifyCancellationEvidence({stockCode,valuationDate,quantity,beforeShares,afterShares,documents=[]}){
 const reasons=[];const required=['DECISION','ANNUAL','CORRECTION'];
 if(!/^\d{6}$/.test(stockCode||'')||!validDay(valuationDate)||!Number.isSafeInteger(quantity)||quantity<=0||!Number.isSafeInteger(beforeShares)||!Number.isSafeInteger(afterShares)||beforeShares-quantity!==afterShares)reasons.push('QUANTITY_RECONCILIATION_UNVERIFIED');
 const selected=required.map(role=>documents.find(d=>d.role===role));
 if(selected.some(d=>!d))reasons.push('SOURCE_CHAIN_INCOMPLETE');
 for(const d of selected.filter(Boolean))if(d.stockCode!==stockCode||d.sourceIntegrityVerified!==true||!/^\d{14}$/.test(d.documentId||'')||! /^[a-f0-9]{64}$/.test(d.sha256||'')||!official(d.sourceUrl)||!validDay(d.disclosureDate)||d.disclosureDate>valuationDate)reasons.push('SOURCE_OR_PUBLICATION_UNVERIFIED');
 const decision=selected[0],annual=selected[1],correction=selected[2];
 if(annual?.disclosureDate&&correction?.disclosureDate<annual.disclosureDate)reasons.push('CORRECTION_CHRONOLOGY_UNVERIFIED');
 if(correction?.relatedDocumentId!==annual?.documentId||correction?.correctionRelationVerified!==true)reasons.push('CORRECTION_RELATION_UNVERIFIED');
 const dates=[];
 for(const d of [annual,correction].filter(Boolean)){
  const text=String(d.actualStatement||'');
  const explicit=text.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일에\s*보통주\s*([\d,]+)주를\s*이익소각하였습니다/);
  const completed=text.match(/\((\d{4})\.(\d{2})\.(\d{2}),\s*([\d,]+)주\s*이익소각\)/);
  const m=explicit||completed;
  const day=m?`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`:null;
  if(!m||/예정|계획/.test(text)||decision?.disclosureDate>day||!validDay(day)||Number(m[4].replaceAll(',',''))!==quantity||d.shareClass!=='COMMON'||d.issuedSharesAfter!==afterShares||day>d.disclosureDate)reasons.push('ACTUAL_DATE_CLASS_OR_COUNT_UNVERIFIED');else dates.push(day);
 }
 if(dates.length!==2||dates[0]!==dates[1])reasons.push('ACTUAL_DATE_CONFLICT');
 if(decision?.reportedQuantity!==quantity||decision?.shareClass!=='COMMON')reasons.push('DECISION_QUANTITY_OR_CLASS_UNVERIFIED');
 const verified=reasons.length===0;
 return {stockCode,quantity,shareClass:'COMMON',verificationStatus:verified?'VERIFIED':'PARTIAL',effectiveDate:verified?dates[0]:null,registrationDate:null,registrationStatus:'NOT_VERIFIED',availableAt:verified?selected.map(d=>d.disclosureDate).sort().at(-1)+'T23:59:59+09:00':null,beforeShares,afterShares,documents:documents.map(({actualStatement,...d})=>d),reasons:[...new Set(reasons)]};
}

// Inclusion in a historical baseline does not certify a later valuation share count.
export function verifyCancellationBaseline({cancellation,baseline,valuationDate}){
 const reasons=[];
 if(cancellation?.verificationStatus!=='VERIFIED'||!validDay(cancellation.effectiveDate)||!validDay(baseline?.asOfDate)||cancellation.effectiveDate>baseline?.asOfDate)reasons.push('PRE_BASELINE_EFFECT_UNVERIFIED');
 if(!validDay(valuationDate)||baseline?.asOfDate>valuationDate||baseline?.sourceIntegrityVerified!==true||!official(baseline?.sourceUrl)||! /^[a-f0-9]{64}$/.test(baseline?.sha256||'')||!Number.isFinite(Date.parse(baseline?.availableAt))||Date.parse(baseline.availableAt)>Date.parse(valuationDate+'T23:59:59+09:00')||!Number.isFinite(Date.parse(cancellation?.availableAt))||Date.parse(cancellation.availableAt)>Date.parse(valuationDate+'T23:59:59+09:00'))reasons.push('BASELINE_SOURCE_OR_PUBLICATION_UNVERIFIED');
 if(baseline?.stockCode!==cancellation?.stockCode||baseline?.shareClass!==cancellation?.shareClass||baseline?.reportedCancellationDate!==cancellation?.effectiveDate||baseline?.reportedCancellationQuantity!==cancellation?.quantity||baseline?.issuedShares!==cancellation?.afterShares)reasons.push('BASELINE_CANCELLATION_QUANTITY_OR_CLASS_CONFLICT');
 const fields=['statutoryTreasuryShares','physicalTreasuryShares','unexercisedExchangeShares'];
 if(!fields.every(k=>Number.isSafeInteger(baseline?.[k])&&baseline[k]>=0)||baseline.physicalTreasuryShares-baseline.unexercisedExchangeShares!==baseline.statutoryTreasuryShares)reasons.push('TREASURY_SCOPE_UNVERIFIED');
 const verified=reasons.length===0;
 return {stockCode:baseline?.stockCode||null,shareClass:baseline?.shareClass||null,baselineIssuedShares:baseline?.issuedShares??null,availableAt:baseline?.availableAt||null,verificationStatus:verified?'VERIFIED':'PENDING_VERIFICATION',includedInBaseline:verified?true:null,baselineDate:baseline?.asOfDate||null,cancellationDate:cancellation?.effectiveDate||null,quantity:cancellation?.quantity||null,appliedAfterBaseline:false,valuationShareCountEligible:false,treasuryScope:verified?{statutoryTreasuryShares:baseline.statutoryTreasuryShares,physicalTreasuryShares:baseline.physicalTreasuryShares,unexercisedExchangeShares:baseline.unexercisedExchangeShares}:null,sourceUrl:baseline?.sourceUrl||null,sourceDocumentId:baseline?.sourceDocumentId||null,sourceHash:baseline?.sha256||null,reasons};
}
