import 'dotenv/config';
import {writeFile} from 'node:fs/promises';
import {COLLECTION_COMPANIES,createConfiguredCollectionGate,runDataCollectionWorker} from '../src/v2/data_collection_worker.js';
if(process.cwd()!=='/Users/ari/ARI/projects/k-stock-ai'||process.argv[2]!=='--read-only')throw Error('READ_ONLY_SCOPE_REQUIRED');
let calls=0;
const base=createConfiguredCollectionGate({fetchImpl:async(url,options)=>{
 const u=new URL(url);
 if(++calls>15)throw Error('READ_ONLY_CALL_BUDGET_EXCEEDED');
 if(u.hostname==='data.sec.gov'&&/^\/api\/xbrl\/companyfacts\/CIK(?:0000723125|0001046179|0001033767)\.json$/.test(u.pathname))return fetch(u,options);
 if(u.hostname!=='opendart.fss.or.kr'||!['/api/list.json','/api/stockTotqySttus.json','/api/irdsSttus.json','/api/tesstkAcqsDspsSttus.json'].includes(u.pathname))throw Error('READ_ONLY_CALL_BUDGET_EXCEEDED');
 return fetch(u,options);
}});
const gate={get actualRequests(){return base.actualRequests;},async collect(...args){await new Promise(r=>setTimeout(r,1150));return base.collect(...args);}};
const receipts={'000660':'20260814003509','000990':'20260814003091','042700':'20260814003665'};
const financialScopes=Object.fromEntries(Object.entries(receipts).map(([ticker,receipt])=>[ticker,{year:'2026',reportCode:'11012',fsDiv:'CFS',availableAt:'2026-08-14',receipt,publicationVerified:true,correctionStatus:'UNVERIFIED',operations:['share-count','capital','treasury']}]));
const result=await runDataCollectionWorker({approved:true,manualOnly:true,gate,valuationDate:'2026-10-08',disclosureCheckDate:'2026-10-08',disclosureFrom:'2026-08-14',disclosureRevision:'official-inputs-20261008-v2',financialScopes,officialTasks:Object.fromEntries([['MU','0000723125'],['TSM','0001046179'],['UMC','0001033767']].map(([ticker,cik])=>[ticker,[{source:'SEC',kind:'SEC_FACTS',key:'pbr-facts-20261008',availableAt:'2026-10-08',query:{url:`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`}}]])),authBlockedSources:['KRX'],companies:COLLECTION_COMPANIES});
const review={checkedAt:new Date().toISOString(),valuationDate:'2026-10-08',externalRequests:result.externalRequests,gateAttempts:result.gateAttempts,mode:result.state.mode,automaticCollectionEnabled:false,counts:result.state.counts,peers:result.state.jobs.map(j=>({ticker:j.ticker,state:j.state,observations:(j.results||[]).filter(r=>r.source==='OpenDART').map(r=>({kind:r.kind,sha256:r.sha256,collectedAt:r.collectedAt,observed:r.observed})),missing:j.missing})),sources:result.state.sources};
const file=`data/v2/verification/official-peer-inputs-${Date.now()}.json`;await writeFile(file,JSON.stringify(review,null,2),{mode:0o600,flag:'wx'});
console.log(JSON.stringify({file,externalRequests:result.externalRequests,gateAttempts:result.gateAttempts,counts:result.state.counts,mode:result.state.mode,sources:result.state.sources.map(s=>({name:s.name,status:s.status,reason:s.reason}))}));
