import{readFile,readdir,writeFile}from'node:fs/promises';import{createHash}from'node:crypto';
import path from 'node:path';import {fileURLToPath} from 'node:url';
if(path.resolve(process.cwd())!==path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'))throw new Error('PROJECT_PATH_REQUIRED');
if(process.argv[2]!=='--read-only'||process.argv.length!==3)throw new Error('READ_ONLY_REQUIRED');
const dir='data/v2/verification';const names=(await readdir(dir)).filter(x=>/^kind-actions-\d+$/.test(x)).sort();
const folder=`${dir}/${names.at(-1)}`,manifest=JSON.parse(await readFile(`${folder}/manifest.json`));const calls=[],documents=[];
for(const doc of manifest.documents){
 const root=await readFile(`${folder}/${doc.acceptanceId}.html`,'utf8');
 const targets=[...new Set([...root.matchAll(/href="([a-z0-9_]+\.htm)(?:#[^"]*)?" target="body"/gi)].map(x=>x[1]))];
 if(targets.length>1)throw new Error('MULTIPLE_BODY_PARTS_REVIEW_REQUIRED');
 if(!targets.length){documents.push({...doc,bodySourceUrl:doc.sourceUrl,bodyOriginalStatus:'ORIGINAL_RETRIEVED',bodyFile:`${folder}/${doc.acceptanceId}.html`});continue;}
 if(calls.length>=5)throw new Error('BODY_BUDGET');
 const url=new URL(targets[0],doc.sourceUrl);calls.push({url:String(url),at:new Date().toISOString()});
 const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error(`HTTP_${response.status}`);
 const html=await response.text(),file=`${folder}/${doc.acceptanceId}-body.html`;await writeFile(file,html,{mode:0o600,flag:'wx'});
 documents.push({...doc,bodySourceUrl:String(url),bodyOriginalStatus:'ORIGINAL_RETRIEVED',bodyFile:file,bodyDigest:createHash('sha256').update(html).digest('hex')});
}
await writeFile(`${folder}/body-manifest.json`,JSON.stringify({documents,calls,collectedAt:new Date().toISOString()}),{mode:0o600,flag:'wx'});
console.log(JSON.stringify({calls:calls.length,bodies:documents.length}));
