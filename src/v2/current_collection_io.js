import {mkdir,open,readFile,writeFile,rename,unlink} from 'node:fs/promises';
import path from 'node:path';
export async function readCurrent(file){try{return JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw Error('CURRENT_RECORD_UNAVAILABLE');}}
export async function saveCurrent(file,data){const body=JSON.stringify(data,null,2);if(Buffer.byteLength(body)>3000000)throw Error('CURRENT_RECORD_SIZE_LIMIT');await mkdir(path.dirname(file),{recursive:true});const temp=file+'.'+process.pid+'.tmp';await writeFile(temp,body,{mode:0o600});await rename(temp,file);}
export async function lockedCurrent(file,run){
 await mkdir(path.dirname(file),{recursive:true});const lock=file+'.lock';let handle;
 for(let attempt=0;attempt<2;attempt++){
  try{handle=await open(lock,'wx',0o600);await handle.writeFile(String(process.pid));break;}
  catch(e){if(e.code!=='EEXIST')throw e;const pid=Number(await readFile(lock,'utf8'));if(!Number.isInteger(pid)||pid<=0)return {status:'SKIPPED',reason:'CURRENT_COLLECTION_LOCKED',externalRequests:0};let alive=true;try{process.kill(pid,0);}catch(e){alive=e.code!=='ESRCH';}if(alive||attempt)return {status:'SKIPPED',reason:'CURRENT_COLLECTION_LOCKED',externalRequests:0};await unlink(lock);}
 }
 try{return await run();}finally{await handle.close();await unlink(lock);}
}
