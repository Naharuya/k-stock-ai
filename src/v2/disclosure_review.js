// A title/keyword match is a review candidate, never an economic event.
export function reviewDisclosure(document,decision={}) {
 const available=document.originalStatus==='ORIGINAL_RETRIEVED'&&/^[a-f0-9]{64}$/.test(document.sha256||'');
 const status=!available?'SOURCE_UNAVAILABLE':
  ['NOT_RELEVANT','RELEVANT'].includes(decision.classification)&&decision.reason?decision.classification:'PENDING_VERIFICATION';
 return {receipt:document.receipt,title:document.title,date:document.date,
  sourceUrl:available?document.sourceUrl:null,originalStatus:available?'ORIGINAL_RETRIEVED':'SOURCE_UNAVAILABLE',
  sourceDigest:available?document.sha256:null,classification:status,reason:decision.reason||'원문 검토 필요',
  correction:/정정/.test(document.title||''),supersedesReceipt:decision.supersedesReceipt||null,
  calculationEligible:false};
}
export function reconcileEventSources(event,sources){
 const fields=['recordDate','exDate','effectiveDate','paymentDate'];
 const conflicts=fields.flatMap(field=>{
  const values=[...new Set(sources.filter(s=>s.sourceVerified===true).map(s=>s[field]).filter(Boolean))];
  return values.length>1?[{field,values,documents:sources.map(s=>s.sourceDocumentId)}]:[];
 });
 return {...event,verificationStatus:conflicts.length?'CONFLICT':event.verificationStatus,
  conflicts,calculationEligible:conflicts.length?false:event.calculationEligible};
}
export function selectCurrentDisclosure(reviews,receipt){
 const corrections=reviews.filter(x=>x.supersedesReceipt===receipt);
 if(corrections.length!==1)return {status:corrections.length?'CONFLICT':'UNCHANGED',receipt};
 const next=corrections[0];
 return {status:next.originalStatus==='ORIGINAL_RETRIEVED'?'CORRECTION_AVAILABLE':'SOURCE_UNAVAILABLE',receipt:next.receipt,calculationEligible:false};
}
