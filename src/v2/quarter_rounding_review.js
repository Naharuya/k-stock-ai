export function reviewQuarterRounding(audit,reviews,asOf){
 const metrics={};
 for(const [key,metric]of Object.entries(audit?.metrics||{})){
  metrics[key]=(metric.conflicts||[]).map(pair=>{
   const inputs=[...pair.before.inputs,...pair.after.inputs];let allowance=0,verified=true;
   for(const input of inputs){const doc=reviews.find(r=>r.companyId===audit.companyId&&r.documentId===input.documentId&&r.status==='VERIFIED'&&r.statementScope?.status==='VERIFIED'&&Date.parse(r.scopeCheckedAt||r.checkedAt)<=Date.parse(asOf));const match=doc?.matches.find(m=>m.status==='VERIFIED'&&m.tag===input.tag&&m.start===input.start&&m.end===input.end&&m.value===input.value);const decimals=match?.decimals;if(!decimals||decimals.length!==1||!/^[-]?\d+$/.test(decimals[0])||Math.abs(Number(decimals[0]))>12){verified=false;break;}allowance+=0.5*10**(-Number(decimals[0]));}
   return {start:pair.start,end:pair.end,difference:pair.difference,disclosedPrecisionAllowance:verified?allowance:null,status:verified&&Math.abs(pair.difference)<=allowance?'ROUNDING_COMPATIBLE_REQUIRES_POLICY_REVIEW':'UNRESOLVED',correctedValue:null};
  });
 }
 return {companyId:audit?.companyId,checkedAt:asOf,metrics,ttmUnblocked:false,recommendationStatus:'HOLD'};
}
