// Explicit local analysis only; never called by an API handler or scheduler.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createOllamaClient} from '../src/services/ollama_service.js';
import {createInfluenceResearchService} from '../src/v2/influence_service.js';
import {createStatementAnalysis} from '../src/v2/influence_engine.js';
const root=new URL('../',import.meta.url);
const sourceFile=new URL('data/v2/influence/sources.json',root);
const input=JSON.parse(await readFile(sourceFile,'utf8'));
const model='qwen3:8b',promptVersion='influence-analysis-v3-ko';
const tags=await (await fetch('http://127.0.0.1:11434/api/tags',{signal:AbortSignal.timeout(5000)})).json();
const installed=tags.models?.find(x=>x.name===model);
if(!installed?.digest)throw Error('LOCAL_MODEL_NOT_INSTALLED');
const modelVersion=`${model}@${installed.digest}`;
const client=createOllamaClient({baseUrl:'http://127.0.0.1:11434',model,timeoutMs:180000,longTimeoutMs:180000,maxOutputTokens:1800});
const snapshot=await createInfluenceResearchService({sourcesPath:sourceFile.pathname,env:{KSTOCK_BROKER_ENABLED:'false',KSTOCK_LIVE_TRADING_ENABLED:'false'}}).load();
let previous;try{previous=JSON.parse(await readFile(new URL('data/v2/influence/analyses.json',root),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
const results=[];let officialRequests=0,localModelRequests=0;
for(const source of input.sources){
 const cached=previous?.results?.find(x=>x.statementId===source.documentId&&x.sourceHash===source.sourceHash&&x.modelVersion===modelVersion&&x.promptVersion===promptVersion&&x.analysisStatus==='GENERATED');
 if(cached){results.push(cached);continue;}
 if(!['https://www.federalreserve.gov/newsevents/speech/powell20250822a.htm','https://www.berkshirehathaway.com/letters/2024ltr.pdf'].includes(source.sourceUrl))throw Error('SOURCE_NOT_ALLOWLISTED');
 officialRequests++;
 const response=await fetch(source.sourceUrl,{redirect:'error',signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('OFFICIAL_SOURCE_UNAVAILABLE');
 const bytes=Buffer.from(await response.arrayBuffer());
 if(bytes.length>2000000)throw Error('OFFICIAL_SOURCE_TOO_LARGE');
 const hash=createHash('sha256').update(bytes).digest('hex');
 if(hash!==source.sourceHash){
  if(source.sourceType!=='OFFICIAL_SPEECH'||!['August 22, 2025','Chair Jerome H. Powell','Monetary Policy'].every(x=>bytes.toString().includes(x)))throw Error('SOURCE_HASH_CHANGED_REVIEW_REQUIRED');
  source.previousSourceHash=source.sourceHash;source.sourceHash=hash;source.checkedAt=new Date().toISOString();source.reviewMethod='OFFICIAL_HTML_IDENTITY_RECHECK_BEFORE_LOCAL_AI';
  await writeFile(sourceFile,JSON.stringify(input,null,2),{mode:0o600});
  const current=snapshot.statements.find(x=>x.statementId===source.documentId);current.sourceHash=hash;
 }
 let text;
 if(source.sourceType==='SHAREHOLDER_LETTER'){
  const extraction=spawnSync('/usr/bin/swift',[new URL('scripts/extract-official-pdf.swift',root).pathname],{input:bytes,maxBuffer:2000000,timeout:60000});
  if(extraction.status!==0)throw Error('OFFICIAL_PDF_EXTRACTION_FAILED');
  text=extraction.stdout.toString();
 }else text=bytes.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
 if(text.length<1000)throw Error('OFFICIAL_TEXT_INSUFFICIENT');
 // Full document is transient model input only; copyright text is not stored/served.
 const context=text.slice(0,30000);
 const analyze=createStatementAnalysis({modelVersion,promptVersion,now:()=>startedAt,generate:async supplied=>{
  localModelRequests++;
  return client.run({agentName:'influence',responseSchema:{type:'object',additionalProperties:false,required:['sentiment','relatedIndustries','relatedCompanies','policyImpact','investmentRelevance','uncertainties','counterEvidence','summary','evidenceIds','hiddenIntent'],properties:{sentiment:{type:'string',enum:['POSITIVE','NEGATIVE','NEUTRAL','MIXED']},relatedIndustries:{type:'array',items:{type:'string'}},relatedCompanies:{type:'array',items:source.relatedCompanies.length?{type:'string',enum:source.relatedCompanies}:{type:'string'},maxItems:source.relatedCompanies.length},policyImpact:{type:'string'},investmentRelevance:{type:'string'},uncertainties:{type:'array',minItems:1,items:{type:'string'}},counterEvidence:{type:'array',items:{type:'string'}},summary:{type:'string'},evidenceIds:{type:'array',minItems:1,maxItems:1,items:{type:'string',enum:[source.documentId]}},hiddenIntent:{type:'string',enum:['NOT_ASSERTED']}}},systemPrompt:'Analyze this official historical document. OUTPUT LANGUAGE: Korean is mandatory for summary, policyImpact, investmentRelevance, uncertainties, counterEvidence and relatedIndustries. Keep identifiers, company tickers, sentiment enum and hiddenIntent enum unchanged. Return JSON only. This is retrospective research, not investment advice. No hidden intent, causality or direct recommendations. No verbatim quotations. Summary maximum 70 Korean words. Only explicitly mentioned company tickers from supplied relatedCompanies may be returned. Sentiment concerns document, not predicted stock returns.',userPrompt:JSON.stringify({...supplied,requiredOutput:{sentiment:'POSITIVE|NEGATIVE|NEUTRAL|MIXED',relatedIndustries:['industry'],relatedCompanies:source.relatedCompanies,policyImpact:'interpretation',investmentRelevance:'research relevance',uncertainties:['at least one'],counterEvidence:['opposing evidence'],summary:'short paraphrase',evidenceIds:[source.documentId],hiddenIntent:'NOT_ASSERTED'}})});
 }});
 const startedAt=new Date().toISOString();
 const statement=snapshot.statements.find(x=>x.statementId===source.documentId);
 const result=await analyze(statement,{asOf:startedAt,officialHosts:['berkshirehathaway.com'],sourceContext:{text:context,sourceHash:source.sourceHash,documentId:source.documentId,sourceIntegrity:true}});
 results.push({statementId:source.documentId,sourceHash:source.sourceHash,sourceUrl:source.sourceUrl,promptVersion,modelVersion,completedAt:new Date().toISOString(),sourceContextHash:createHash('sha256').update(context).digest('hex'),sourceContextCharacters:context.length,sourceContextTruncated:text.length>context.length,...result});
 console.log(JSON.stringify({statementId:source.documentId,status:result.analysisStatus,reasons:result.reasons}));
}
await writeFile(new URL('data/v2/influence/analyses.json',root),JSON.stringify({schemaVersion:1,checkedAt:new Date().toISOString(),executionMode:'LOCAL_OLLAMA_MANUAL',modelVersion,promptVersion,officialRequests,localModelRequests,history:[...(previous?.history||[]),...(previous?.results||[]).filter(x=>!results.includes(x))],results},null,2),{mode:0o600});
console.log(JSON.stringify({officialRequests,localModelRequests,generated:results.filter(x=>x.analysisStatus==='GENERATED').length,fullOriginalsStored:false}));
