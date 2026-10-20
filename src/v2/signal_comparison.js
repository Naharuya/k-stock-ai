/** Pure descriptive research. Percentage returns never mix with decimal returns. */
const GROUPS={STATEMENT_ONLY:['STATEMENT_ONLY'],CAPITAL_ONLY:['CAPITAL_ONLY'],COMBINED:['STATEMENT_CAPITAL_ALIGNED','STATEMENT_CAPITAL_DIVERGENT']};
const MODES=['EXACT_PUBLIC_TIME','CONSERVATIVE_START'];
const time=x=>typeof x==='string'?Date.parse(x):NaN;
const official=x=>{try{const u=new URL(x);return u.protocol==='https:'&&!u.username&&!u.password&&['www.sec.gov','sec.gov','www.federalreserve.gov','www.berkshirehathaway.com'].includes(u.hostname);}catch{return false;}};
const civil=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x;
const LIMITATIONS=['SMALL_UNCONTROLLED_SAMPLE','MARKET_AND_INDUSTRY_BIAS_NOT_CONTROLLED','DISCLOSURE_DELAY','TRANSACTION_COSTS_EXCLUDED','SELECTION_BIAS_NOT_ASSESSED','NO_TRAIN_TEST_SPLIT','CORRELATION_NOT_CAUSATION'];
export function summarizeVerifiedSignalComparison({signals=[],capitalEvents=[],exactEvents=[],conservativeEvents=[],verifiedCorrelations=[],researchScopes=[],asOf}={}) {
 const cutoff=time(asOf),accepted=[],excluded=[];
 const appleScope={securityId:'AAPL:COMMON',companyId:'AAPL',benchmarkId:'SP500:PRICE_INDEX',currency:'USD'};
 const scopes=[appleScope,...researchScopes.filter(x=>x.securityId!=='AAPL:COMMON'&&typeof x.securityId==='string'&&typeof x.companyId==='string'&&typeof x.benchmarkId==='string'&&typeof x.currency==='string'&&x.verificationStatus==='VERIFIED'&&official(x.sourceUrl)&&/^[a-f0-9]{64}$/i.test(x.sourceHash||'')&&Number.isFinite(time(x.availableAt))&&time(x.availableAt)<=cutoff&&['priceVerified','corporateActionsVerified','calendarVerified','benchmarkVerified'].every(k=>x[k]===true))];
 const scopeKey=x=>JSON.stringify([x.securityId,x.benchmarkId]);

 const eventSignals=new Map();
 for(const capital of capitalEvents){
  if(capital.verificationStatus!=='VERIFIED'||capital.sourceIntegrity!==true||!official(capital.sourceUrl)||!/^([a-f0-9]{64})$/i.test(capital.sourceHash||'')||!capital.documentId||!Number.isFinite(time(capital.publicAvailableAt))||time(capital.publicAvailableAt)>cutoff)continue;
  const matching=signals.filter(s=>s.signalType==='CAPITAL_ONLY'&&s.verificationStatus==='VERIFIED'&&s.evidenceIds?.includes(capital.eventId));
  if(matching.length===1)eventSignals.set(capital.documentId,{signal:matching[0],capital});
 }
 for(const row of [...exactEvents,...conservativeEvents]){
  const conservative=row.analysisMode==='CONSERVATIVE_START';
  const association=conservative?eventSignals.get(row.accessionNumber):null;
  const signal=conservative?association?.signal:signals.find(s=>s.signalId===row.signalId);
  const securityId=row.securityId==='AAPL'?'AAPL:COMMON':row.securityId||'AAPL:COMMON';
  const benchmarkId=row.benchmarkId||'SP500:PRICE_INDEX';
  const matchedScopes=scopes.filter(x=>x.securityId===securityId&&x.benchmarkId===benchmarkId);
  const scope=matchedScopes.length===1?matchedScopes[0]:null;
  const group=Object.entries(GROUPS).find(([,types])=>types.includes(signal?.signalType))?.[0];
  const reasons=[];
  if(!Number.isFinite(cutoff))reasons.push('INVALID_CUTOFF');
  if(!signal||signal.verificationStatus!=='VERIFIED'||!group)reasons.push('SIGNAL_NOT_VERIFIED');
  if(!scope)reasons.push('RESEARCH_SCOPE_UNVERIFIED');
  if(scope&&scope.securityId!=='AAPL:COMMON'&&time(scope.availableAt)>time(row.tradeableFrom))reasons.push('SCOPE_NOT_AVAILABLE_AT_BASELINE');
  if(scope&&scope.securityId!=='AAPL:COMMON'&&(!row.securityId||!row.benchmarkId||row.currency!==scope.currency||!signal?.relatedCompanies?.includes(scope.companyId)||(conservative&&association?.capital.securityId!==scope.securityId)))reasons.push('SECURITY_COMPANY_OR_CURRENCY_SCOPE_MISMATCH');
  if(!Number.isFinite(time(signal?.publicAvailableAt))||time(signal.publicAvailableAt)>cutoff||time(row.tradeableFrom)<time(signal.publicAvailableAt))reasons.push('SIGNAL_NOT_AVAILABLE_AT_BASELINE');
  if(row.sampleSize!==1||(row.observationsRequired!=null&&row.observationsRequired!==row.horizon+1)||(row.observationsAvailable!=null&&row.observationsAvailable<row.horizon+1))reasons.push('OBSERVATION_COUNT_INVALID');
  if(!MODES.includes(row.analysisMode)||row.verificationStatus!==(conservative?'VERIFIED_CONSERVATIVE':'VERIFIED'))reasons.push('PUBLICATION_MODE_NOT_VERIFIED');
  if(row.returnUnit!=='PERCENT')reasons.push('RETURN_UNIT_NOT_PERCENT');
  if(![1,5,20].includes(row.horizon)||![row.securityReturn,row.benchmarkReturn,row.excessReturn].every(Number.isFinite)||Math.abs(row.securityReturn-row.benchmarkReturn-row.excessReturn)>1e-8)reasons.push('RETURN_CALCULATION_INVALID');
  if(row.returnType!=='PRICE_RETURN'||row.priceType!=='RAW_CLOSE'||row.dividendsIncluded!==false)reasons.push('PRICE_BASIS_INCOMPATIBLE');
  const available=conservative?row.conservativeAvailableBy:row.publicAvailableAt;
  if(!Number.isFinite(time(available))||!Number.isFinite(time(row.tradeableFrom))||time(row.tradeableFrom)<time(available)||time(available)>cutoff||time(row.tradeableFrom)>cutoff||!civil(row.startDate)||!civil(row.endDate)||row.startDate>=row.endDate||row.endDate>String(asOf).slice(0,10)||row.startDate<available?.slice(0,10))reasons.push('TEMPORAL_VALIDATION_FAILED');
  if(!official(row.sourceUrl)||row.correctionStatus==='CONFLICT'||row.correctionRelationVerified===false)reasons.push('SOURCE_OR_CORRECTION_UNVERIFIED');
  if(group==='COMBINED'){
   const proof=verifiedCorrelations.find(x=>x.signalId===signal.signalId);
   if(signal.directionVerification!=='VERIFIED'||!signal.temporalRelation||signal.evidenceIds?.length<2||!proof||!['actorRelationshipVerified','statementContentVerified','companyScopeVerified','capitalActionVerified','publicationVerified','temporalOrderVerified','directionVerified','sourceVerified','counterEvidenceReviewed'].every(key=>proof[key]===true))reasons.push('COMBINED_CORRELATION_UNVERIFIED');
  }
  if(reasons.length){excluded.push({eventId:row.accessionNumber||row.signalId||null,horizon:row.horizon,analysisMode:row.analysisMode,reasons});continue;}
  accepted.push({...row,securityId:scope.securityId,benchmarkId:scope.benchmarkId,currency:scope.currency,signalId:signal.signalId,group,eventId:row.accessionNumber||signal.signalId});
 }
 // Conflicting duplicate observations invalidate the event/horizon rather than cherry-picking.
 const buckets=new Map();for(const row of accepted){const key=[scopeKey(row),row.group,row.analysisMode,row.horizon,row.eventId].join('|');const bucket=buckets.get(key)||[];bucket.push(row);buckets.set(key,bucket);}
 const unique=[];for(const bucket of buckets.values()){
  const first=bucket[0],signature=r=>JSON.stringify([r.startDate,r.endDate,r.securityReturn,r.benchmarkReturn,r.excessReturn]);
  if(bucket.some(r=>signature(r)!==signature(first)))excluded.push({eventId:first.eventId,horizon:first.horizon,analysisMode:first.analysisMode,reasons:['CONFLICTING_DUPLICATE_OBSERVATION']});else unique.push(first);
 }
 const scopeGroups=[];for(const scope of scopes.filter((x,i,a)=>a.findIndex(y=>scopeKey(y)===scopeKey(x))===i))for(const group of Object.keys(GROUPS))for(const analysisMode of MODES)for(const horizon of [1,5,20]){
  const rows=unique.filter(r=>scopeKey(r)===scopeKey(scope)&&r.group===group&&r.analysisMode===analysisMode&&r.horizon===horizon),sorted=rows.map(r=>r.excessReturn).sort((a,b)=>a-b),n=rows.length;
  scopeGroups.push({securityId:scope.securityId,companyId:scope.companyId,benchmarkId:scope.benchmarkId,currency:scope.currency,group,analysisMode,horizon,sampleSize:n,independentEventCount:new Set(rows.map(r=>r.eventId)).size,returnUnit:'PERCENT',ratioUnit:'DECIMAL',meanExcessReturn:n?sorted.reduce((a,b)=>a+b,0)/n:null,medianExcessReturn:n?(n%2?sorted[(n-1)/2]:(sorted[n/2-1]+sorted[n/2])/2):null,positiveExcessRatio:n?rows.filter(r=>r.excessReturn>0).length/n:null,lossCases:rows.filter(r=>r.securityReturn<0).map(r=>({eventId:r.eventId,signalId:r.signalId,securityReturn:r.securityReturn,excessReturn:r.excessReturn})),negativeExcessCases:rows.filter(r=>r.excessReturn<0).map(r=>r.eventId),verificationStatus:n?'DESCRIPTIVE_ONLY':'INSUFFICIENT_DATA',limitations:[...LIMITATIONS,...(analysisMode==='CONSERVATIVE_START'?['NOT_FIRST_PUBLIC_TIME','CLOSE_TO_CLOSE_RESEARCH_NOT_EXECUTION']:[])]});
 }
 const groups=scopeGroups.filter(x=>scopeKey(x)===scopeKey(appleScope));
 return {groups,scopeGroups,scopeCount:new Set(unique.map(scopeKey)).size,observationCount:unique.length,independentEventCount:new Set(unique.map(r=>r.eventId)).size,exactPublicTimeEventCount:new Set(unique.filter(r=>r.analysisMode==='EXACT_PUBLIC_TIME').map(r=>r.eventId)).size,conservativeEventCount:new Set(unique.filter(r=>r.analysisMode==='CONSERVATIVE_START').map(r=>r.eventId)).size,excluded,policy:{policyId:'signal-comparison-v2',horizons:[1,5,20],baselinePolicy:'FIRST_OBSERVED_CLOSE_AFTER_VERIFIED_AVAILABILITY_BOUND',returnType:'PRICE_RETURN',returnUnit:'PERCENT',benchmark:'SP500:PRICE_INDEX',securityScope:'AAPL:COMMON',otherSecurities:'VERIFIED_SEPARATE_SCOPE_ONLY',crossSecurityPooling:false,aggregation:'UNWEIGHTED_BY_INDEPENDENT_EVENT_WITHIN_GROUP_MODE_HORIZON',selection:'ALL_VALID_INPUT_EVENTS_INCLUDING_LOSSES',holdout:'NOT_ESTABLISHED',preregistered:false},statisticalSuperiority:false,predictiveValidity:'NOT_ESTABLISHED',recommendationStatus:'HOLD',limitations:LIMITATIONS};
}

/** Explicit research adapter: historical day bounds never rewrite factual source availability. */
export function compareConservativeNonAppleResearch({capitalEvent,publication,rows=[],researchScope,asOf}={}) {
 const cutoff=time(asOf),reasons=[];
 const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/i.test(x);
 const original=capitalEvent;
 const filing=publication?.filing;
 let ir=false;try{const u=new URL(original?.sourceUrl);ir=u.protocol==='https:'&&u.hostname==='www.microsoft.com'&&!u.username&&!u.password;}catch{}
 if(!original||original.eventId!=='microsoft-fy25-q4-capital-return-aggregate'||original.companyId!=='MSFT'||original.securityId!=='MSFT:COMMON'||original.actorType!=='COMPANY'||original.eventType!=='REPORTED_EXECUTION_AGGREGATE'||original.aggregateExecutionEvidenceVerified!==true||original.sourceIntegrity!==true||!sha(original.sourceHash)||!ir||!Number.isFinite(time(original.publicAvailableAt))||time(original.publicAvailableAt)>cutoff)reasons.push('ORIGINAL_AGGREGATE_SOURCE_UNVERIFIED');
 if(publication?.schemaVersion!==1||publication?.eventId!==original?.eventId||publication?.policy!=='OFFICIAL_DATED_RELEASE_WITH_SEC_8K_ISSUANCE_CONFIRMATION'||publication?.conservativeStartStatus!=='VERIFIED_CONSERVATIVE_DAY_BOUND'||publication?.releaseDateConfirmed!==true||publication?.publicationTimePrecision!=='DAY'||publication?.publicationAssumption!=='CONSERVATIVE_END_OF_DAY'||!Number.isFinite(time(publication?.checkedAt))||time(publication.checkedAt)>cutoff||publication?.publicAvailableAt!==null||publication?.exactPublicAvailableAt!==null||publication?.firstPublicAvailabilityVerified!==false)reasons.push('CONSERVATIVE_PUBLICATION_REVIEW_UNVERIFIED');
 if(filing?.form!=='8-K'||filing?.filingDate!=='2025-07-30'||!/^\d{10}-\d{2}-\d{6}$/.test(filing?.accession||'')||!official(filing?.sourceUrl)||!sha(filing?.sourceHash)||!civil(filing?.filingDate)||filing?.filingDate!==publication?.publicReleaseDate||filing?.filingDate!==original?.releaseDate||publication?.conservativeStart!==`${filing?.filingDate}T23:59:59-04:00`)reasons.push('DATED_SEC_8K_PROOF_UNVERIFIED');
 if(!researchScope||researchScope.securityId!=='MSFT:COMMON'||researchScope.companyId!=='MSFT'||researchScope.benchmarkId!=='SP500:PRICE_INDEX'||researchScope.currency!=='USD')reasons.push('NONAPPLE_SCOPE_UNVERIFIED');
 const relevant=rows.filter(r=>r.eventId===original?.eventId);
 if(!relevant.length||relevant.some(r=>r.analysisMode!=='CONSERVATIVE_START'||r.verificationStatus!=='VERIFIED_CONSERVATIVE'||r.publicAvailableAt!==null||r.accessionNumber!==filing?.accession||r.sourceUrl!==filing?.sourceUrl||r.sourceHashes?.publication!==filing?.sourceHash||time(r.conservativeAvailableBy)!==time(publication?.conservativeStart)))reasons.push('REACTION_ROWS_NOT_VERIFIED_AGAINST_PUBLICATION');
 const blocked=()=>({status:'BLOCKED',reasons,comparison:null,researchOnly:true,actualPublicAvailableAt:null,originalPublicAvailableAt:original?.publicAvailableAt||null,exactPublicTimeEventCount:0,recommendationStatus:'HOLD'});
 if(reasons.length)return blocked();
 const annotation={researchOnly:true,actualPublicAvailableAt:null,originalPublicAvailableAt:original.publicAvailableAt,publicationMode:'CONSERVATIVE_START',availabilityInterpretation:'OFFICIAL_DATED_RELEASE_CONSERVATIVE_DAY_BOUND_NOT_FIRST_PUBLIC_TIME'};
 const capital={...original,...annotation,documentId:filing.accession,sourceUrl:filing.sourceUrl,sourceHash:filing.sourceHash,originalSourceUrl:original.sourceUrl,originalSourceHash:original.sourceHash,publicAvailableAt:publication.conservativeStart,verificationStatus:'VERIFIED'};
 const signal={...annotation,signalId:`research-conservative:${original.eventId}`,signalType:'CAPITAL_ONLY',verificationStatus:'VERIFIED',evidenceIds:[original.eventId],relatedCompanies:['MSFT'],publicAvailableAt:publication.conservativeStart};
 const comparison=summarizeVerifiedSignalComparison({signals:[signal],capitalEvents:[capital],conservativeEvents:relevant,researchScopes:[researchScope],asOf});
 return {status:comparison.observationCount?'DESCRIPTIVE_CONSERVATIVE_ONLY':'BLOCKED',reasons:comparison.observationCount?[]:['COMPARISON_GUARDS_NOT_SATISFIED'],comparison,...annotation,exactPublicTimeEventCount:0,recommendationStatus:'HOLD'};
}
