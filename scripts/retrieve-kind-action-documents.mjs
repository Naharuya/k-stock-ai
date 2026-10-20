import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';import{createHash}from'node:crypto';
import path from 'node:path';import {fileURLToPath} from 'node:url';
if(path.resolve(process.cwd())!==path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'))throw new Error('PROJECT_PATH_REQUIRED');
if(process.argv[2]!=='--read-only'||process.argv.length!==3)throw new Error('READ_ONLY_REQUIRED');
const dir='data/v2/verification';const names=(await readdir(dir)).filter(x=>/^kind-prior-\d+\.json$/.test(x)).sort();
const prior=JSON.parse(await readFile(`${dir}/${names.at(-1)}`));
const items=prior.items.filter(x=>/배당|권리|증자|분할|병합|자기주식|소각|변경상장|신주/.test(x.title));
if(items.length!==6)throw new Error('REVIEW_SCOPE_CHANGED');
const folder=`${dir}/kind-actions-${Date.now()}`;await mkdir(folder,{mode:0o700});const calls=[],documents=[];
async function read(url){
 const u=new URL(url);if(u.origin!=='https://kind.krx.co.kr'||calls.length>=18)throw new Error('SOURCE_OR_BUDGET');
 calls.push({path:u.pathname,collectedAt:new Date().toISOString()});const response=await fetch(u,{redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error(`HTTP_${response.status}`);return response.text();
}
for(const item of items){
 const viewer=await read(item.sourceUrl);
 const documentId=viewer.match(/<option value=['"]([0-9]{14})\|Y['"][^>]*selected/i)?.[1];
 if(!documentId)throw new Error('DOCUMENT_ID_UNAVAILABLE');
 const contentPath=await read(`https://kind.krx.co.kr/common/disclsviewer.do?method=searchContents&docNo=${documentId}`);
 const url=contentPath.match(/https:\/\/kind\.krx\.co\.kr\/external\/[^'"\s]+\.htm/)?.[0];
 if(!url)throw new Error('CONTENT_PATH_UNAVAILABLE');
 const html=await read(url);await writeFile(`${folder}/${item.documentId}.html`,html,{flag:'wx',mode:0o600});
 documents.push({...item,acceptanceId:item.documentId,documentId,sourceUrl:url,sha256:createHash('sha256').update(html).digest('hex'),originalStatus:'ORIGINAL_RETRIEVED'});
}
await writeFile(`${folder}/manifest.json`,JSON.stringify({documents,calls,collectedAt:new Date().toISOString()}),{flag:'wx',mode:0o600});
console.log(JSON.stringify({folder,calls:calls.length,documents:documents.length}));
