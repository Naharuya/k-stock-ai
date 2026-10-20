import 'dotenv/config';
import{readFile,writeFile}from'node:fs/promises';
import{createHash}from'node:crypto';
import{createConfiguredCollectionGate}from'../src/v2/data_collection_worker.js';
if(process.cwd()!=='/Users/ari/ARI/projects/k-stock-ai'||process.argv[2]!=='--read-only')throw Error('READ_ONLY_SCOPE_REQUIRED');
const state=JSON.parse(await readFile('data/v2/data-collection/state.json','utf8'));
let calls=0;const gate=createConfiguredCollectionGate({fetchImpl:async(u,o)=>{const url=new URL(u);if(++calls>3||url.hostname!=='opendart.fss.or.kr'||url.pathname!=='/api/list.json')throw Error('REQUEST_BUDGET_EXCEEDED');return fetch(u,o);}}),pages=[];
for(const job of state.jobs.slice(0,3))for(const result of job.results||[]){
 const range=result.key.match(/share-bridge-prior-expanded:(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})/);if(!range)continue;
 const raw=await readFile(`data/v2/data-collection/sources/${result.sha256}.json`);if(createHash('sha256').update(raw).digest('hex')!==result.sha256)throw Error('SOURCE_HASH_MISMATCH');const first=JSON.parse(raw);
 if(first.status!=='000'||first.total_page<=1)continue;if(first.total_page>3)throw Error('PAGINATION_BUDGET_REVIEW_REQUIRED');
 for(let page=2;page<=first.total_page;page++){
  await new Promise(r=>setTimeout(r,1150));const response=await gate.collect('OpenDART',{operation:'disclosures',params:{corpCode:job.corpCode||({'000660':'00164779','000990':'00160843','042700':'00161383'})[job.ticker],beginDate:range[1].replaceAll('-',''),endDate:range[2].replaceAll('-',''),pageNo:page,pageCount:100}},{approved:true});
  if(response.httpStatus!==200||response.body?.status!=='000'||response.body.total_count!==first.total_count||response.body.total_page!==first.total_page||response.body.page_no!==page)throw Error('PAGE_SCOPE_OR_TOTAL_CHANGED');
  const body=JSON.stringify(response.body),sha256=createHash('sha256').update(body).digest('hex'),file=`data/v2/data-collection/sources/${sha256}.json`;await writeFile(file,body,{mode:0o600});pages.push({ticker:job.ticker,fromDate:range[1],toDate:range[2],page,sha256,file,collectedAt:new Date().toISOString()});
 }
}
const file=`data/v2/verification/peer-prior-pages-${Date.now()}.json`;await writeFile(file,JSON.stringify({checkedAt:new Date().toISOString(),requests:calls,pages},null,2),{mode:0o600,flag:'wx'});console.log(JSON.stringify({file,requests:calls,pages:pages.length}));
