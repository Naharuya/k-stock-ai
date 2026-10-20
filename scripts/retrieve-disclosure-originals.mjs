import 'dotenv/config';
import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
if(path.resolve(process.cwd())!==path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'))throw new Error('PROJECT_PATH_REQUIRED');
if(process.argv[2]!=='--read-only'||process.argv.length!==3)throw new Error('READ_ONLY_REQUIRED');
if(!process.env.OPENDART_API_KEY)throw new Error('OPENDART_API_KEY_REQUIRED');
const dir='data/v2/verification';
const files=(await readdir(dir)).filter(x=>/^disclosure-audit-\d+\.json$/.test(x)).sort();
const audit=JSON.parse(await readFile(`${dir}/${files.at(-1)}`));
if(audit.ticker!=='005930'||audit.items.length!==21||audit.truncated)throw new Error('SCOPE_MISMATCH');
const folder=`${dir}/originals-${Date.now()}`;await mkdir(folder,{mode:0o700});
const results=[];
for(const item of audit.items){
 if(!/^\d{14}$/.test(item.receipt))throw new Error('INVALID_RECEIPT');
 const url=new URL('https://opendart.fss.or.kr/api/document.xml');
 url.searchParams.set('crtfc_key',process.env.OPENDART_API_KEY||'');url.searchParams.set('rcept_no',item.receipt);
 const result={...item,retrievedAt:new Date().toISOString(),originalStatus:'SOURCE_UNAVAILABLE',requestSource:'OpenDART document.xml'};
 try{
  const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(15000)});
  const bytes=Buffer.from(await response.arrayBuffer());
  if(response.ok&&bytes.length<=20_000_000&&bytes.subarray(0,2).toString()==='PK'){
   const file=`${folder}/${item.receipt}.zip`;await writeFile(file,bytes,{mode:0o600,flag:'wx'});
   Object.assign(result,{originalStatus:'ARCHIVE_RETRIEVED',file,sha256:createHash('sha256').update(bytes).digest('hex')});
  }else result.errorCode=bytes.toString('utf8').match(/<status>(\d+)<\/status>/)?.[1]||`HTTP_${response.status}`;
 }catch{result.errorCode='SOURCE_REQUEST_FAILED';}
 results.push(result);
}
await writeFile(`${folder}/manifest.json`,JSON.stringify({collectedAt:new Date().toISOString(),requests:21,corporateActionCoverageVerified:false,results}),{mode:0o600,flag:'wx'});
console.log(JSON.stringify({folder,requests:21,retrieved:results.filter(x=>x.originalStatus==='ARCHIVE_RETRIEVED').length,unavailable:results.filter(x=>x.originalStatus==='SOURCE_UNAVAILABLE').map(x=>({receipt:x.receipt,error:x.errorCode}))}));
