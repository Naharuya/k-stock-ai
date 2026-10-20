import 'dotenv/config';
import path from 'node:path';import {fileURLToPath} from 'node:url';
if(path.resolve(process.cwd())!==path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'))throw new Error('PROJECT_PATH_REQUIRED');
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createOpenDartRequest} from '../src/services/opendart_request.js';
import {collectKrActionEvidence} from '../src/v2/kr_actions.js';
import {alignShareCount} from '../src/v2/share_count.js';
import {runCandidateJob} from '../src/v2/run_candidates.js';
if(process.argv.length!==3||process.argv[2]!=='--read-only')throw new Error('READ_ONLY_REQUIRED');
const input=JSON.parse(await readFile('data/v2-input.json'));
const saved=JSON.parse(await readFile('data/v2/latest.json'));
const peerCollection=JSON.parse(await readFile('data/v2/verification/peer-collection.json'));
input.krPeers=peerCollection.peers;
for(const company of input.companies){
 const prior=saved.candidates.find(x=>x.ticker===company.ticker);
 if(company.market==='KR'){
  company.krSnapshot=structuredClone(prior.krValuationAnalysis.evidence);
  company.industryCode=peerCollection.targetProfile.industryCode;
  company.companyProfile=peerCollection.targetProfile;
  company.businessProfile={required:true,verified:false,key:null};
 }else for(const k of ['financialSnapshot','priceSnapshot','corporateActionSnapshot','valuationSnapshot','valuationComparisonSnapshot'])if(prior[k]!==undefined)company[k]=prior[k];
}
const now=new Date().toISOString(),calls=[];
if(new Date(now).getUTCFullYear()!==2026)throw new Error('2026_H1_SCOPE_ONLY');
const request=createOpenDartRequest({fetchImpl:async(url,options)=>{
 if(calls.length>=16)throw new Error('READ_BUDGET_EXCEEDED');
 calls.push({provider:'OpenDART',operation:new URL(url).pathname,at:new Date().toISOString()});return fetch(url,{...options,redirect:'error'});
}});
const companies=[...input.companies.filter(x=>x.market==='KR'),...(input.krPeers||[])];
const result=await collectKrActionEvidence(companies,{request,year:'2026',reportCode:'11012',analysisDate:now});
const next=structuredClone(input);next.analysisDate=now;
for(const company of [...next.companies,...next.krPeers]){
 const evidence=result.companies.find(x=>x.stockCode===company.ticker);if(!evidence)continue;
 company.krSnapshot.actionEvidence=evidence;
 company.krSnapshot.shareCount=evidence.shareCount;
 const common=evidence.shareCount.records.find(x=>x.shareClass==='COMMON');
 const last=company.krSnapshot.priceHistory?.sessions.at(-1);
 company.krSnapshot.shareAlignment=alignShareCount(common,{asOfDate:last?.date??company.krSnapshot.price.asOfDate,close:last?.close??company.krSnapshot.price.price,shareClass:'COMMON',shareDefinition:'OUTSTANDING',basis:'RAW',currency:'KRW'},{coverage:evidence.coverage});
}
await mkdir('data/v2/verification',{recursive:true,mode:0o700});
const stamp=now.replaceAll(':','-');
await writeFile(`data/v2/verification/action-evidence-${stamp}.json`,JSON.stringify({...result,calls}),{mode:0o600,flag:'wx'});
const inputFile=`data/v2/verification/action-input-${stamp}.json`;
await writeFile(inputFile,JSON.stringify(next),{mode:0o600,flag:'wx'});
await runCandidateJob({inputPath:inputFile,outputPath:'data/v2/latest.json'});
console.log(JSON.stringify({collectedAt:result.collectedAt,calls:calls.length,companies:result.companies.map(x=>({ticker:x.stockCode,statuses:x.sourceStatuses,shares:x.shareCount.records,events:x.events.length,alignment:next.companies.find(c=>c.ticker===x.stockCode)?.krSnapshot.shareAlignment??next.krPeers.find(c=>c.ticker===x.stockCode)?.krSnapshot.shareAlignment}))}));
