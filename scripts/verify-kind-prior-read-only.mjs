import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
import {parseKindListing} from '../src/v2/kind_rights.js';
import path from 'node:path';import {fileURLToPath} from 'node:url';
if(path.resolve(process.cwd())!==path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'))throw new Error('PROJECT_PATH_REQUIRED');
if(process.argv[2]!=='--read-only'||process.argv.length!==3)throw new Error('READ_ONLY_REQUIRED');
const scope={fromDate:'2026-06-30',toDate:'2026-08-25'},first=await readFile('/tmp/kstock-kind-prior.html','utf8');
const initial=parseKindListing(first,scope);
if(initial.pages!==9||initial.total!==844||initial.page!==1)throw new Error('PRIOR_SCOPE_CHANGED_REVIEW_REQUIRED');
const items=[...initial.items],pages=[{page:1,count:initial.items.length,digest:createHash('sha256').update(first).digest('hex'),reused:true}],calls=[];
for(let page=2;page<=9;page++){
 const params=new URLSearchParams({method:'searchDetailsSub',forward:'details_sub',fromDate:scope.fromDate,toDate:scope.toDate,repIsuSrtCd:'A005930',searchCodeType:'number',searchCorpName:'삼성전자',currentPageSize:'100',pageIndex:String(page)});
 calls.push({source:'KRX KIND public detail search',page,collectedAt:new Date().toISOString()});
 const response=await fetch('https://kind.krx.co.kr/disclosure/details.do',{method:'POST',body:params,redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error(`KIND_HTTP_${response.status}`);
 const html=await response.text(),result=parseKindListing(html,scope);
 if(result.page!==page||result.total!==initial.total||result.pages!==initial.pages)throw new Error('PAGINATION_CHANGED');
 items.push(...result.items);pages.push({page,count:result.items.length,digest:createHash('sha256').update(html).digest('hex')});
}
const unique=new Set(items.map(x=>x.documentId));
const result={collectedAt:new Date().toISOString(),scope,items,pages,calls,listingComplete:items.length===844&&unique.size===844,economicCoverageVerified:false};
await writeFile(`data/v2/verification/kind-prior-${Date.now()}.json`,JSON.stringify(result),{mode:0o600,flag:'wx'});
console.log(JSON.stringify({calls:calls.length,documents:items.length,listingComplete:result.listingComplete,actionCandidates:items.filter(x=>/배당|권리|증자|분할|병합|자기주식|소각|변경상장|신주/.test(x.title))}));
