import fs from 'node:fs';
import path from 'node:path';
import {dataPath} from './profile_service.js';
import {sanitizeDaily} from './daily_candidate_store.js';
export function createLogger({root=dataPath('logs','server'),sink=process.stdout,errorSink=process.stderr,now=()=>new Date()}={}){
  let warned=false;
  const fields=new Set(['code','status','method','route','port','pid','attempt','delayMs','healthy','managedPid','consecutiveFailures','provider','urlHost','errorType','fallbackUsed','lastSuccessfulSyncAt','calendarStatus','stage']);
  function write(level,event,details={}){
    const record=sanitizeDaily({at:now().toISOString(),level,event:/^[A-Z][A-Z0-9_]{0,63}$/.test(event)?event:'RUNTIME_EVENT',
      ...Object.fromEntries(Object.entries(details).filter(([key,value])=>fields.has(key)&&(value===null||['string','number','boolean'].includes(typeof value))))});
    const line=JSON.stringify(record)+'\n';
    try{(level==='ERROR'?errorSink:sink).write(line);}catch{}
    try{fs.mkdirSync(root,{recursive:true});fs.appendFileSync(path.join(root,record.at.slice(0,10)+'.jsonl'),line,{mode:0o600});}
    catch{if(!warned){warned=true;try{errorSink.write('{"level":"ERROR","event":"LOG_WRITE_FAILED"}\n');}catch{}}}
    return record;
  }
  return {info:(event,data)=>write('INFO',event,data),warn:(event,data)=>write('WARN',event,data),error:(event,data)=>write('ERROR',event,data)};
}
export function errorCode(error){return /^[A-Z][A-Z0-9_]{0,63}$/.test(error?.code||'')?error.code:'INTERNAL_ERROR';}
