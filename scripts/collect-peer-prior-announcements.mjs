import 'dotenv/config';
import {writeFile} from 'node:fs/promises';
import {COLLECTION_COMPANIES,createConfiguredCollectionGate,runDataCollectionWorker} from '../src/v2/data_collection_worker.js';
if(process.cwd()!=='/Users/ari/ARI/projects/k-stock-ai'||process.argv[2]!=='--read-only')throw Error('READ_ONLY_SCOPE_REQUIRED');
let calls=0;const base=createConfiguredCollectionGate({fetchImpl:async(url,options)=>{const u=new URL(url);if(++calls>3||u.hostname!=='opendart.fss.or.kr'||u.pathname!=='/api/list.json')throw Error('READ_ONLY_SCOPE_EXCEEDED');return fetch(u,options);}});
const gate={get actualRequests(){return base.actualRequests;},async collect(...args){await new Promise(r=>setTimeout(r,1150));return base.collect(...args);}};
const result=await runDataCollectionWorker({approved:true,manualOnly:true,gate,companies:COLLECTION_COMPANIES,valuationDate:'2026-10-08',disclosureFrom:'2026-04-02',disclosureCheckDate:'2026-06-30',disclosureRevision:'share-bridge-prior-apr02-jun30',authBlockedSources:['KRX']});
const file=`data/v2/verification/peer-share-bridge-collection-${Date.now()}.json`;await writeFile(file,JSON.stringify({checkedAt:new Date().toISOString(),fromDate:'2026-04-02',toDate:'2026-06-30',externalRequests:result.externalRequests,gateAttempts:result.gateAttempts,automaticCollectionEnabled:false,jobs:result.state.jobs},null,2),{mode:0o600,flag:'wx'});console.log(JSON.stringify({file,externalRequests:result.externalRequests,gateAttempts:result.gateAttempts}));
