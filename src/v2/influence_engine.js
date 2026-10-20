/** Pure research validation. No external calls, execution or inferred transaction dates. */
const official = ['sec.gov','dart.fss.or.kr','opendart.fss.or.kr','kind.krx.co.kr','krx.co.kr','federalreserve.gov','whitehouse.gov'];
const instant = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value)) ? Date.parse(value) : NaN;
const day = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) === value;
function evidence(item, hosts=[]) {
  const source=item.source && typeof item.source==='object' ? item.source : item;
  let url;try{url=new URL(item.sourceUrl || source.url || source.sourceUrl);}catch{return false;}
  return url.protocol==='https:' && !url.username && !url.password && [...official,...hosts].some(host=>url.hostname===host || url.hostname.endsWith(`.${host}`)) && source.officialSource===true && source.sourceIntegrity===true && /^[a-f\d]{64}$/i.test(source.sourceHash || source.sha256 || '') && Boolean(source.documentId || item.documentId);
}
const result=(item,reasons,extra={})=>({...item,...extra,verificationStatus:reasons.length?'INSUFFICIENT_DATA':'VERIFIED',reasons:[...new Set(reasons)],researchOnly:true,recommendationStatus:'HOLD'});
function published(value,asOf,reasons){if(!Number.isFinite(instant(value)))reasons.push('PUBLICATION_TIME_UNVERIFIED');else if(!Number.isFinite(instant(asOf)) || instant(value)>instant(asOf))reasons.push('NOT_AVAILABLE_AT_CUTOFF');}
export function validateInfluencePerson(person,{asOf,availableAsOf=asOf,officialHosts=[]}={}) {
  const reasons=[];if(!person?.personId || !person.name)reasons.push('PERSON_IDENTITY_MISSING');
  const date=typeof asOf==='string'?asOf.slice(0,10):null;
  const roles=(person.roles || []).filter(r=>day(r.validFrom) && (!r.validTo || day(r.validTo)) && r.validFrom<=date && (!r.validTo || date<=r.validTo));
  if(roles.length!==1)reasons.push('ROLE_AS_OF_UNVERIFIED');
  else if(!roles[0].role || !roles[0].organization || !evidence(roles[0],officialHosts))reasons.push('ROLE_SOURCE_UNVERIFIED');
  if(roles.length===1)published(roles[0].publicAvailableAt,availableAsOf,reasons);
  return result(person,reasons,{roleAsOf:roles.length===1?roles[0]:null});
}
export function validatePublicStatement(statement,{person,asOf,officialHosts=[]}={}) {
  const reasons=[];published(statement.publishedAt,asOf,reasons);
  if(!evidence(statement,officialHosts) || !statement.originalTextReference)reasons.push('OFFICIAL_ORIGINAL_UNVERIFIED');
  if(!statement.statementId || !person || statement.personId!==person.personId)reasons.push('PERSON_IDENTITY_MISMATCH');
  const spoken=instant(statement.spokenAt);
  const dateOnly=statement.spokenAt==null && statement.spokenTimePrecision==='DAY' && day(statement.spokenDate) && statement.spokenDate<=statement.publishedAt?.slice(0,10);
  const written=statement.spokenAt==null && statement.sourceType==='SHAREHOLDER_LETTER' && day(statement.statementDate || statement.publishedAt?.slice(0,10));
  if(!dateOnly && !written && (!Number.isFinite(spoken) || spoken>instant(statement.publishedAt)))reasons.push('STATEMENT_TIME_UNVERIFIED');
  if(statement.publicationTimePrecision==='DAY' && statement.publicationAssumption!=='CONSERVATIVE_END_OF_DAY')reasons.push('PUBLICATION_PRECISION_UNVERIFIED');
  const roleTime=dateOnly?`${statement.spokenDate}T23:59:59Z`:written?`${statement.statementDate || statement.publishedAt.slice(0,10)}T23:59:59Z`:statement.spokenAt;
  const role=validateInfluencePerson(person || {},{asOf:roleTime,availableAsOf:asOf,officialHosts});
  if(role.verificationStatus!=='VERIFIED')reasons.push('ROLE_AT_STATEMENT_UNVERIFIED');
  const analysis=statement.analysis;
  if(analysis && (analysis.kind!=='AI_INFERENCE' || !analysis.modelVersion || !Number.isFinite(instant(analysis.generatedAt)) || instant(analysis.generatedAt)<instant(statement.publishedAt) || instant(analysis.generatedAt)>instant(asOf) || !Array.isArray(analysis.evidenceIds) || !analysis.evidenceIds.includes(statement.statementId)))reasons.push('AI_ANALYSIS_PROVENANCE_UNVERIFIED');
  return result(statement,reasons,{roleAtStatement:role.roleAsOf,publicAvailableAt:statement.publishedAt,contentKind:'PUBLIC_STATEMENT'});
}
export function validateCapitalEvent(event,{asOf,officialHosts=[]}={}) {
  const reasons=[];published(event.publicAvailableAt,asOf,reasons);
  if(!evidence(event,officialHosts))reasons.push('OFFICIAL_DOCUMENT_UNVERIFIED');
  if(!event.eventId || !event.actorId || !event.companyId || !event.securityId)reasons.push('EVENT_IDENTITY_MISSING');
  if(!day(event.filingDate) || event.filingDate>event.publicAvailableAt?.slice(0,10))reasons.push('FILING_DATE_UNVERIFIED');
  const holding=event.formType==='13F' || event.formType==='13F-HR' || event.eventType==='REPORTED_HOLDING_CHANGE';
  let transactionDate=event.transactionDate ?? null;
  if(holding){
    if(transactionDate!==null || event.eventType!=='REPORTED_HOLDING_CHANGE')reasons.push('HOLDING_IS_NOT_TRANSACTION');
    transactionDate=null;
    if(!day(event.reportingPeriod) || event.reportingPeriod>event.filingDate)reasons.push('HOLDING_PERIOD_UNVERIFIED');
    if(!Number.isFinite(event.quantity) || event.quantity<0)reasons.push('HOLDING_QUANTITY_UNVERIFIED');
    if((event.formType==='13F' || event.formType==='13F-HR') && (event.actorType!=='INSTITUTION' || (event.institutionId!=null && event.institutionId!==event.actorId)))reasons.push('INSTITUTION_IDENTITY_UNVERIFIED');
  }
  else if(event.eventType==='CONFIRMED_TRANSACTION'){
    if(!day(transactionDate) || transactionDate>event.filingDate || event.transactionEvidenceVerified!==true)reasons.push('TRANSACTION_DATE_UNVERIFIED');
    if(!Number.isFinite(event.quantity) || event.quantity<=0)reasons.push('TRANSACTION_QUANTITY_UNVERIFIED');
  }else if(event.eventType==='REPORTED_EXECUTION_AGGREGATE'){
    if(transactionDate!==null || event.actorType!=='COMPANY' || event.quantity!=null)reasons.push('AGGREGATE_IS_NOT_DATED_PERSONAL_TRANSACTION');
    transactionDate=null;
    if(!day(event.aggregatePeriodStart)||!day(event.aggregatePeriodEnd)||event.aggregatePeriodStart>event.aggregatePeriodEnd||event.aggregatePeriodEnd>event.filingDate||event.aggregateExecutionEvidenceVerified!==true)reasons.push('AGGREGATE_EXECUTION_PERIOD_UNVERIFIED');
    if(!Number.isFinite(event.amount)||event.amount<=0||!event.currency||event.amountUnit!=='CURRENCY_UNITS')reasons.push('AGGREGATE_EXECUTION_AMOUNT_UNVERIFIED');
  }else if(event.eventType==='ANNOUNCED_INTENTION'){if(transactionDate!==null)reasons.push('INTENTION_IS_NOT_TRANSACTION');transactionDate=null;}
  else reasons.push('EVENT_TYPE_UNSUPPORTED');
  if(event.price!=null && (!Number.isFinite(event.price) || event.price<0 || !event.currency))reasons.push('PRICE_UNIT_UNVERIFIED');
  return result(event,reasons,{transactionDate,organizationId:event.organizationId??event.institutionId??(event.actorType==='COMPANY'?event.actorId:null),reportingPeriodEnd:event.reportingPeriodEnd??(typeof event.reportingPeriod==='string'?event.reportingPeriod:event.aggregatePeriodEnd??null),acceptedAt:event.acceptedAt??null,contentKind:event.eventType});
}
/** Official role association does not transfer institutional holdings to a person. */
export function validateActorRelationship(relation,{asOf,officialHosts=[]}={}) {
  const reasons=[];published(relation?.publicAvailableAt,asOf,reasons);
  if(!relation?.relationshipId || !relation.personId || !relation.institutionId || relation.personId===relation.institutionId || !relation.role)reasons.push('ACTOR_RELATIONSHIP_IDENTITY_UNVERIFIED');
  if(!day(relation?.validFrom) || (relation.validTo && (!day(relation.validTo) || relation.validTo<relation.validFrom)))reasons.push('ACTOR_RELATIONSHIP_PERIOD_UNVERIFIED');
  if(!evidence(relation || {},officialHosts))reasons.push('ACTOR_RELATIONSHIP_SOURCE_UNVERIFIED');
  return result(relation,reasons,{associationKind:'OFFICIAL_INSTITUTION_ROLE',personalTransaction:false});
}
/** Two comparable official holdings prove direction only, never a trade date or purchase. */
export function verifyHoldingComparison(event,{asOf,officialHosts=[]}={}) {
  const comparison=event?.holdingComparison,prior=comparison?.prior,current=comparison?.current;
  const fail=reason=>({verificationStatus:'INSUFFICIENT_DATA',direction:null,delta:null,reasons:[reason],transactionDate:null});
  if(event?.eventType!=='REPORTED_HOLDING_CHANGE' || event.actorType!=='INSTITUTION' || !prior || !current || comparison.verificationStatus!=='VERIFIED')return fail('HOLDING_COMPARISON_UNVERIFIED');
  for(const x of [prior,current])if(!evidence(x,officialHosts) || !Number.isFinite(x.quantity) || x.quantity<0 || !day(x.reportingPeriod) || !Number.isFinite(instant(x.publicAvailableAt)) || instant(x.publicAvailableAt)>instant(asOf))return fail('HOLDING_SNAPSHOT_UNVERIFIED');
  if(prior.actorId!==event.actorId || current.actorId!==event.actorId || prior.securityId!==event.securityId || current.securityId!==event.securityId || !prior.shareClass || prior.shareClass!==current.shareClass || (event.shareClass && event.shareClass!==current.shareClass) || prior.reportingPeriod>=current.reportingPeriod || current.reportingPeriod!==event.reportingPeriod || current.quantity!==event.quantity || comparison.delta!==current.quantity-prior.quantity)return fail('HOLDING_COMPARISON_SCOPE_OR_DELTA_MISMATCH');
  if([prior,current].some(x=>instant(x.publicAvailableAt)>instant(event.publicAvailableAt)))return fail('HOLDING_COMPARISON_AVAILABLE_LATER');
  const delta=current.quantity-prior.quantity;
  return {verificationStatus:'VERIFIED',direction:delta>0?'POSITIVE':delta<0?'NEGATIVE':'NEUTRAL',delta,transactionDate:null,personalTransaction:false,reasons:[]};
}
export function buildInfluenceSignals({statements=[],capitalEvents=[],actorRelationships=[],asOf,officialHosts=[]}={}) {
  const usable=x=>x.verificationStatus==='VERIFIED' && evidence(x,officialHosts) && Number.isFinite(instant(x.publicAvailableAt)) && instant(x.publicAvailableAt)<=instant(asOf);
  const s=statements.filter(usable),c=capitalEvents.filter(usable),signals=[];
  const base=(signalId,signalType,actorId,companies,time,ids,legacy)=>({signalId,signalType,legacySignalType:legacy,actorId,relatedCompanies:companies,publicAvailableAt:time,evidenceIds:ids});
  for(const x of s)signals.push(base(`statement:${x.statementId}`,'STATEMENT_ONLY',x.personId,x.relatedCompanies || [],x.publicAvailableAt,[x.statementId],'STATEMENT_SIGNAL'));
  for(const x of c)signals.push(base(`capital:${x.eventId}`,'CAPITAL_ONLY',x.actorId,[x.companyId],x.publicAvailableAt,[x.eventId],'CAPITAL_SIGNAL'));
  for(const a of s)for(const b of c) {
    const personal=!['INSTITUTION','CORPORATION','COMPANY'].includes(b.actorType) && !['13F','13F-HR'].includes(b.formType) && a.personId===b.actorId;
    const relationship=actorRelationships.find(r=>r.personId===a.personId && r.institutionId===b.actorId && b.actorType==='INSTITUTION' && validateActorRelationship(r,{asOf,officialHosts}).verificationStatus==='VERIFIED' && [a.spokenDate || a.statementDate || a.spokenAt?.slice(0,10) || a.publicAvailableAt.slice(0,10),b.reportingPeriod || b.transactionDate || b.publicAvailableAt.slice(0,10)].every(date=>date>=r.validFrom && (!r.validTo || date<=r.validTo)));
    if((!personal && !relationship) || !(a.relatedCompanies || []).includes(b.companyId))continue;
    const direction=a.directionEvidence,capital=b.directionEvidence;
    const holding=relationship?verifyHoldingComparison(b,{asOf,officialHosts}):null;
    const validDirection=(d,id)=>d && d.verificationStatus==='VERIFIED' && d.evidenceId===id && ['POSITIVE','NEGATIVE'].includes(d.direction);
    const confirmedDirection=validDirection(capital,b.eventId) && b.eventType==='CONFIRMED_TRANSACTION' && ['BUY','SELL'].includes(b.transactionSide) && capital.direction===(b.transactionSide==='BUY'?'POSITIVE':'NEGATIVE');
    const observedDirection=holding?.verificationStatus==='VERIFIED'?holding.direction:confirmedDirection?capital.direction:null;
    const sufficient=validDirection(direction,a.statementId) && ['POSITIVE','NEGATIVE'].includes(observedDirection);
    const type=sufficient?(direction.direction===observedDirection?'STATEMENT_CAPITAL_ALIGNED':'STATEMENT_CAPITAL_DIVERGENT'):'INSUFFICIENT_EVIDENCE';
    signals.push({...base(`combined:${a.statementId}:${b.eventId}`,type,a.personId,[b.companyId],instant(a.publicAvailableAt)>=instant(b.publicAvailableAt)?a.publicAvailableAt:b.publicAvailableAt,[a.statementId,b.eventId],'COMBINED_SIGNAL'),relationKind:relationship?'OFFICIAL_INSTITUTION_ASSOCIATION':'OBSERVED_ASSOCIATION',capitalActorId:b.actorId,capitalEventType:b.eventType,personalTransaction:personal && b.eventType==='CONFIRMED_TRANSACTION',relationshipId:relationship?.relationshipId || null,causalClaim:false,directionVerification:sufficient?'VERIFIED':'INSUFFICIENT_DATA',publicAvailableAt:[a.publicAvailableAt,b.publicAvailableAt,relationship?.publicAvailableAt].filter(Boolean).sort((x,y)=>instant(y)-instant(x))[0],temporalRelation:instant(a.publicAvailableAt)<instant(b.publicAvailableAt)?'STATEMENT_PUBLISHED_FIRST':'CAPITAL_PUBLISHED_FIRST',limitations:sufficient?[]:['DIRECTION_OR_ACTUAL_TRANSACTION_UNVERIFIED']});
  }
  return signals.map(x=>({...x,researchOnly:true,recommendationStatus:'HOLD',verificationStatus:x.signalType==='INSUFFICIENT_EVIDENCE'?'INSUFFICIENT_DATA':'VERIFIED',marketReactionStatus:'PENDING',riskFactors:['CORRELATION_NOT_CAUSATION','SELECTION_BIAS_NOT_ASSESSED','SURVIVORSHIP_BIAS_NOT_ASSESSED']}));
}
export function buildSignalResearchResults({signals=[],marketReactions={},relatedSecurities={},benchmarks={}}={}) {
  return signals.flatMap(signal=>[1,5,20].map(horizon=>{
    const reaction=marketReactions[signal.signalId],period=reaction?.periods?.find(p=>p.tradingDays===horizon);
    const valid=Number.isFinite(instant(reaction?.tradeableFrom)) && instant(reaction.tradeableFrom)>=instant(signal.publicAvailableAt) && Number.isFinite(instant(reaction?.baselineCloseAt)) && instant(reaction.tradeableFrom)<=instant(reaction.baselineCloseAt) && reaction.correctionStatus!=='CONFLICT' && reaction.correctionRelationVerified!==false && signal.verificationStatus==='VERIFIED' && reaction?.publicAvailableAt===signal.publicAvailableAt && instant(period?.startDate?`${period.startDate}T23:59:59Z`:null)>=instant(signal.publicAvailableAt) && period?.status==='VERIFIED' && [period.stockReturn,period.benchmarkReturn,period.excessReturn].every(Number.isFinite) && typeof relatedSecurities[signal.signalId]==='string' && typeof benchmarks[signal.signalId]==='string' && benchmarks[signal.signalId].length>0;
    return {signalId:signal.signalId,signalType:signal.signalType,publicAvailableAt:signal.publicAvailableAt,tradeableFrom:valid?(reaction.tradeableFrom || null):null,securityId:relatedSecurities[signal.signalId] || null,benchmarkId:benchmarks[signal.signalId] || null,securityReturn:valid?period.stockReturn:null,dataQuality:valid?'VERIFIED':'INSUFFICIENT_DATA',relatedSecurity:relatedSecurities[signal.signalId] || null,benchmark:benchmarks[signal.signalId] || null,horizon,observedReturn:valid?period.stockReturn:null,benchmarkReturn:valid?period.benchmarkReturn:null,excessReturn:valid?period.excessReturn:null,sampleSize:valid?1:0,verificationStatus:valid?'VERIFIED':'INSUFFICIENT_DATA',limitations:['SINGLE_EVENT_NOT_PREDICTIVE_VALIDATION','SELECTION_BIAS_NOT_ASSESSED','SURVIVORSHIP_BIAS_NOT_ASSESSED','DISCLOSURE_DELAY',...(!valid?['MARKET_REACTION_OR_SIGNAL_UNVERIFIED']:[])],statisticalSignificance:'NOT_ESTABLISHED',causalClaim:false,recommendationStatus:'HOLD'};
  }));
}
export function measureMarketReaction({publicAvailableAt,asOf,sessions=[],stockPrices=[],benchmarkPrices=[],corporateActionsVerified=false,publicationTimePrecision='EXACT',executionObservation=null,horizons=[1,5,20]}={}) {
  const conditions={returnType:'PRICE_RETURN',dividendsIncluded:false,transactionCostsIncluded:false,annualized:false,causalClaim:false};
  const held=(reasons)=>({verificationStatus:'INSUFFICIENT_DATA',publicAvailableAt,reasons,periods:horizons.map(tradingDays=>({tradingDays,status:'HOLD',stockReturn:null,benchmarkReturn:null,excessReturn:null})),...conditions,recommendationStatus:'HOLD'});
  const publication=instant(publicAvailableAt),cutoff=instant(asOf);
  if(!Number.isFinite(publication) || !Number.isFinite(cutoff) || publication>cutoff)return held(['NOT_AVAILABLE_AT_CUTOFF']);
  if(publicationTimePrecision!=='EXACT')return held(['PUBLICATION_TIME_PRECISION_INSUFFICIENT']);
  if(!corporateActionsVerified)return held(['CORPORATE_ACTIONS_UNVERIFIED']);
  if(sessions.some((s,i)=>!day(s.date) || !Number.isFinite(instant(s.openAt)) || !Number.isFinite(instant(s.closeAt)) || instant(s.openAt)>=instant(s.closeAt) || (i>0 && (sessions[i-1].date>=s.date || instant(sessions[i-1].closeAt)>=instant(s.openAt)))))return held(['TRADING_CALENDAR_UNVERIFIED']);
  // First close on/after publication is an observable baseline; after-close events start next session.
  const start=sessions.findIndex(s=>instant(s.closeAt)>=publication);
  if(start<0 || instant(sessions[start].closeAt)>cutoff)return held(['BASELINE_NOT_OBSERVED']);
  const intraday=publication>instant(sessions[start].openAt) && publication<instant(sessions[start].closeAt);
  if(intraday && !(executionObservation?.verificationStatus==='VERIFIED' && evidence(executionObservation,['koreainvestment.com','nasdaq.com']) && Number.isFinite(instant(executionObservation.at)) && instant(executionObservation.at)>=publication && instant(executionObservation.at)<=instant(sessions[start].closeAt) && Number.isFinite(executionObservation.price) && executionObservation.price>0))return held(['TRADEABLE_FROM_UNVERIFIED']);
  const mapPrices=rows=>new Map(rows.map(x=>[x.date,x.close]));
  if(stockPrices.some(x=>!day(x.date)) || benchmarkPrices.some(x=>!day(x.date)) || new Set(stockPrices.map(x=>x.date)).size!==stockPrices.length || new Set(benchmarkPrices.map(x=>x.date)).size!==benchmarkPrices.length)return held(['PRICE_DATES_DUPLICATED_OR_INVALID']);
  const stock=mapPrices(stockPrices),benchmark=mapPrices(benchmarkPrices),startDate=sessions[start].date;
  const periods=horizons.map(tradingDays=>{
    const out={tradingDays,startDate,status:'PENDING',endDate:null,stockReturn:null,benchmarkReturn:null,excessReturn:null};
    if(![1,5,20].includes(tradingDays))return {...out,status:'HOLD',reason:'UNSUPPORTED_HORIZON'};
    const end=sessions[start+tradingDays];if(!end || instant(end.closeAt)>cutoff)return out;
    const dates=sessions.slice(start,start+tradingDays+1).map(s=>s.date);
    if(dates.some(d=>!Number.isFinite(stock.get(d)) || stock.get(d)<=0 || !Number.isFinite(benchmark.get(d)) || benchmark.get(d)<=0))return {...out,status:'HOLD',reason:'COMMON_OBSERVATIONS_MISSING'};
    const a=stock.get(end.date)/stock.get(startDate)-1,b=benchmark.get(end.date)/benchmark.get(startDate)-1;
    return {...out,status:'VERIFIED',endDate:end.date,stockReturn:a,benchmarkReturn:b,excessReturn:a-b};
  });
  return {publicAvailableAt,baselineCloseAt:sessions[start].closeAt,baselinePolicy:'FIRST_OBSERVED_CLOSE',tradeableFrom:intraday?executionObservation.at:publication<=instant(sessions[start].openAt)?sessions[start].openAt:publicAvailableAt,verificationStatus:periods.every(p=>p.status==='VERIFIED')?'VERIFIED':'PARTIAL',periods,baselineDate:startDate,eventTiming:start>0 && publication>instant(sessions[start-1].closeAt)?'AFTER_CLOSE':publication<instant(sessions[start].openAt)?'BEFORE_OPEN':publication===instant(sessions[start].closeAt)?'AT_CLOSE':'INTRADAY',...conditions,recommendationStatus:'HOLD',biasChecks:{selectionBias:'NOT_ASSESSED',survivorshipBias:'NOT_ASSESSED'}};
}

/** Provider is injected by an authorized caller; construction and default execution make no requests. */
export function createStatementAnalysis({generate,modelVersion,promptVersion='influence-analysis-v1',now=()=>new Date().toISOString()}={}) {
  return async function analyzeStatement(statement,{asOf,officialHosts=[],sourceContext}={}) {
    const empty=(analysisStatus,reasons)=>({analysis:null,analysisStatus,reasons,researchOnly:true,recommendationStatus:'HOLD'});
    if(typeof generate!=='function')return empty('NOT_RUN',['MODEL_PROVIDER_NOT_CONFIGURED']);
    const generatedAt=now(),cutoff=instant(asOf),generated=instant(generatedAt),available=instant(statement?.publicAvailableAt || statement?.publishedAt);
    if(statement?.verificationStatus!=='VERIFIED' || !evidence(statement || {},officialHosts) || !statement?.statementId || !statement.originalTextReference)return empty('NOT_VERIFIED',['STATEMENT_SOURCE_UNVERIFIED']);
    if(!Number.isFinite(cutoff) || !Number.isFinite(generated) || !Number.isFinite(available) || available>generated || generated>cutoff)return empty('NOT_VERIFIED',['ANALYSIS_NOT_AVAILABLE_AT_CUTOFF']);
    if(typeof modelVersion!=='string' || !modelVersion.trim())return empty('NOT_VERIFIED',['MODEL_VERSION_MISSING']);
    if(typeof promptVersion!=='string' || !promptVersion.trim())return empty('NOT_VERIFIED',['PROMPT_VERSION_MISSING']);
    const source=statement.source && typeof statement.source==='object'?statement.source:statement;
    if(!sourceContext || sourceContext.sourceIntegrity!==true || sourceContext.sourceHash!==(source.sourceHash || source.sha256) || sourceContext.documentId!==(source.documentId || statement.documentId) || typeof sourceContext.text!=='string' || !sourceContext.text.trim() || sourceContext.text.length>100000)return empty('NOT_VERIFIED',['SOURCE_CONTEXT_UNVERIFIED']);
    let output;
    try {
      output=await generate({promptVersion,sourceContext:sourceContext.text,statementId:statement.statementId,originalTextReference:statement.originalTextReference,sourceUrl:statement.sourceUrl,sourceHash:statement.sourceHash,relatedCompanies:statement.relatedCompanies || [],relatedIndustries:statement.relatedIndustries || [],publicAvailableAt:statement.publicAvailableAt || statement.publishedAt,instructions:'Return structured AI interpretation grounded in the supplied official reference. Separate uncertainty and counter evidence. Do not assert hidden intent, causality or investment advice.'});
    }catch{return empty('NOT_VERIFIED',['MODEL_GENERATION_FAILED']);}
    const strings=x=>Array.isArray(x) && x.length<=100 && x.every(v=>typeof v==='string' && v.trim().length>0 && v.length<=2000);
    const text=x=>typeof x==='string' && x.trim().length>0 && x.length<=4000;
    if(!output || typeof output!=='object' || !['POSITIVE','NEGATIVE','NEUTRAL','MIXED'].includes(output.sentiment) || !strings(output.relatedIndustries) || !strings(output.relatedCompanies) || !text(output.policyImpact) || !text(output.investmentRelevance) || !strings(output.uncertainties) || output.uncertainties.length===0 || !strings(output.counterEvidence) || !text(output.summary) || !strings(output.evidenceIds) || output.evidenceIds.length!==1 || output.evidenceIds[0]!==statement.statementId || (output.hiddenIntent!=null && output.hiddenIntent!=='NOT_ASSERTED'))return empty('NOT_VERIFIED',['MODEL_OUTPUT_SCHEMA_OR_GROUNDING_INVALID']);
    return {analysisStatus:'GENERATED',analysis:{kind:'AI_INFERENCE',modelVersion,promptVersion,sourceReferences:[{documentId:sourceContext.documentId,sourceHash:sourceContext.sourceHash,sourceUrl:statement.sourceUrl}],generatedAt,evidenceIds:[statement.statementId],sentiment:output.sentiment,relatedIndustries:[...output.relatedIndustries],relatedCompanies:[...output.relatedCompanies],policyImpact:output.policyImpact,investmentRelevance:output.investmentRelevance,uncertainties:[...output.uncertainties],counterEvidence:[...output.counterEvidence],summary:output.summary,hiddenIntent:'NOT_ASSERTED',causalClaim:false,verificationStatus:'UNVERIFIED_INTERPRETATION'},reasons:[],researchOnly:true,recommendationStatus:'HOLD'};
  };
}

/** Descriptive grouped observations; never statistical superiority or predictive validation. */
export function summarizeSignalResearch(rows=[]) {
  const kinds={STATEMENT_ONLY:['STATEMENT_ONLY'],CAPITAL_ONLY:['CAPITAL_ONLY'],COMBINED:['STATEMENT_CAPITAL_ALIGNED','STATEMENT_CAPITAL_DIVERGENT']};
  const groups=[];
  for(const [group,types] of Object.entries(kinds))for(const horizon of [1,5,20]) {
    const seen=new Set(),samples=rows.filter(row=>{
      if(!types.includes(row.signalType) || row.horizon!==horizon || row.verificationStatus!=='VERIFIED' || row.dataQuality!=='VERIFIED' || row.correctionStatus==='CONFLICT' || row.correctionRelationVerified===false || ![row.excessReturn,row.securityReturn ?? row.observedReturn].every(Number.isFinite) || seen.has(row.signalId))return false;
      seen.add(row.signalId);return true;
    });
    const excess=samples.map(r=>r.excessReturn).sort((a,b)=>a-b),n=excess.length;
    const median=n?(n%2?excess[(n-1)/2]:(excess[n/2-1]+excess[n/2])/2):null;
    groups.push({group,signalType:group,horizon,sampleSize:n,meanExcessReturn:n?excess.reduce((a,b)=>a+b,0)/n:null,medianExcessReturn:median,positiveExcessRatio:n?excess.filter(x=>x>0).length/n:null,lossCases:n?samples.filter(r=>(r.securityReturn ?? r.observedReturn)<0).map(r=>r.signalId):null,negativeExcessCases:n?samples.filter(r=>r.excessReturn<0).map(r=>r.signalId):null,verificationStatus:n?'DESCRIPTIVE_ONLY':'INSUFFICIENT_DATA',statisticalSuperiority:false,limitations:['SMALL_UNCONTROLLED_SAMPLE','MARKET_AND_INDUSTRY_BIAS_NOT_CONTROLLED','DISCLOSURE_DELAY','TRANSACTION_COSTS_EXCLUDED','SELECTION_BIAS_NOT_ASSESSED','NO_TRAIN_TEST_SPLIT']});
  }
  return {groups,statisticalSuperiority:false,recommendationStatus:'HOLD'};
}
