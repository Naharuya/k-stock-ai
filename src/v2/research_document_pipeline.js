/** Evidence evaluation states, never a prediction approval. */
export function buildDocumentResearchProgress(data){
 return (data.statements||[]).map(s=>{
 const official=s.verificationStatus==='VERIFIED';
 const related=Array.isArray(s.relatedCompanies)&&s.relatedCompanies.length>0;
 const publicChecked=official&&Number.isFinite(Date.parse(s.publicAvailableAt))&&Date.parse(s.publicAvailableAt)<=Date.parse(data.asOf);
 const markets=(data.signalResearch?.newIndexObservations||[]).filter(r=>r.statementId===s.statementId||r.eventId===s.statementId);
 const observed=markets.some(r=>r.verificationStatus==='VERIFIED'&&Array.isArray(r.periods)&&r.periods.length>0);
 const stages=[
 {name:'NEW_SOURCE',status:'RECORDED'},
 {name:'SOURCE_VERIFIED',status:official?'VERIFIED':'BLOCKED',reason:official?'OFFICIAL_IDENTITY_AND_ROLE_CHECKED':'OFFICIAL_EVIDENCE_REQUIRED'},
 {name:'AI_ANALYZED',status:s.analysisStatus==='GENERATED'?'ANALYZED':'PENDING',reason:'AI_INTERPRETATION_IS_NOT_VERIFIED_FACT'},
 {name:'ENTITY_LINKED',status:official&&s.personId?'VERIFIED':'BLOCKED',reason:related?'ACTOR_AND_COMPANY_REFERENCES_RECORDED':'ACTOR_ONLY_NO_VERIFIED_COMPANY_LINK'},
 {name:'PUBLIC_TIME_CHECKED',status:publicChecked?'PARTIAL':'BLOCKED',reason:publicChecked?'CONSERVATIVE_DATE_BOUNDARY_NOT_EXACT_PUBLIC_TIME':'PUBLIC_AVAILABILITY_UNVERIFIED'},
 {name:'SIGNAL_EVALUATED',status:'PARTIAL',reason:'OFFICIAL_CAPITAL_RELATION_AND_DIRECTION_REQUIRED'},
 {name:'MARKET_REACTION_CHECKED',status:observed?'PARTIAL':'BLOCKED',reason:observed?'DESCRIPTIVE_INDEX_OBSERVATION_ONLY':'VALIDATED_COMMON_PRICE_COVERAGE_REQUIRED'},
 {name:'QA_RECORDED',status:'RECORDED',reason:'EVIDENCE_EVALUATION_NOT_REGRESSION_TEST_EXECUTION'}];
 return {documentId:s.statementId,sourceHash:s.sourceHash||null,checkedAt:data.asOf,stages,predictiveSignalVerified:false,recommendationStatus:'HOLD'};
 });
}
