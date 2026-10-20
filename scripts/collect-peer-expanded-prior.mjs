import 'dotenv/config';
import {writeFile} from 'node:fs/promises';
import {COLLECTION_COMPANIES,createConfiguredCollectionGate,runDataCollectionWorker} from '../src/v2/data_collection_worker.js';
if(process.cwd()!=='/Users/ari/ARI/projects/k-stock-ai'||process.argv[2]!=='--read-only')throw Error('READ_ONLY_SCOPE_REQUIRED');
let calls=0;
const base=createConfiguredCollectionGate({fetchImpl:async(url,options)=>{const u=new URL(url);if(++calls>18||u.hostname!=='opendart.fss.or.kr'||u.pathname!=='/api/list.json')throw Error('READ_ONLY_SCOPE_EXCEEDED');return fetch(u,options);}});
const gate={get actualRequests(){return base.actualRequests;},async collect(...args){await new Promise(r=>setTimeout(r,1150));return base.collect(...args);}};
const windows=[];let start=process.argv[3]==='--gap'?'2026-04-01':'2025-01-01';const endLimit=process.argv[3]==='--gap'?'2026-04-01':'2026-03-31';
while(start<=endLimit){
 const end=new Date(Math.min(Date.parse(start)+89*86400000,Date.parse(endLimit))).toISOString().slice(0,10);
 const r=await runDataCollectionWorker({approved:true,manualOnly:true,gate,companies:COLLECTION_COMPANIES,valuationDate:'2026-10-08',disclosureFrom:start,disclosureCheckDate:end,disclosureRevision:`share-bridge-prior-expanded:${start}:${end}`,authBlockedSources:['KRX']});
 windows.push({fromDate:start,toDate:end,externalRequests:r.externalRequests,gateAttempts:r.gateAttempts});
 start=new Date(Date.parse(end)+86400000).toISOString().slice(0,10);
}
const file=`data/v2/verification/peer-expanded-prior-${Date.now()}.json`;
await writeFile(file,JSON.stringify({checkedAt:new Date().toISOString(),automaticCollectionEnabled:false,windows,attemptedRequests:calls},null,2),{mode:0o600,flag:'wx'});
console.log(JSON.stringify({file,windows,attemptedRequests:calls}));
