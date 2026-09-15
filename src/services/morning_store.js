import {dataPath,profileId} from './profile_service.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {assertDate} from './trading_day_service.js';
import {sanitizeDaily} from './daily_candidate_store.js';

const queues=new Map();
export async function serialized(key,task) {
  const pending=(queues.get(key)||Promise.resolve()).catch(()=>{}).then(task);
  queues.set(key,pending);
  try{return await pending;}finally{if(queues.get(key)===pending)queues.delete(key);}
}
async function readJson(file) {
  try{return JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw new Error('MORNING_STORE_READ_FAILED');}
}
async function atomic(file,value) {
  await fs.mkdir(path.dirname(file),{recursive:true});
  const tmp=file+'.'+randomUUID()+'.tmp';
  try {
    const handle=await fs.open(tmp,'wx',0o600);
    try{await handle.writeFile(JSON.stringify(sanitizeDaily(value),null,2));await handle.sync();}finally{await handle.close();}
    for(let i=0;;i++) {
      try{await fs.rename(tmp,file);break;}catch(e){if(!['EPERM','EACCES','EBUSY'].includes(e.code)||i===5)throw e;await new Promise(r=>setTimeout(r,25*(i+1)));}
    }
  }finally{await fs.unlink(tmp).catch(e=>{if(e.code!=='ENOENT')throw e;});}
}
export class MorningStore {
  constructor(root=dataPath('daily')){this.root=path.resolve(root);}
  file(date,name='daily-report'){assertDate(date);if(!/^[a-z-]+$/.test(name))throw new Error('INVALID_RECORD');return path.join(this.root,date,name+'.json');}
  async read(date){const r=await readJson(this.file(date));if(r && (r.date!==date||!Array.isArray(r.topCandidates)||!r.agentStatus))throw new Error('MORNING_STORE_READ_FAILED');return sanitizeDaily(r);}
  async latest(){
    let names;try{names=await fs.readdir(this.root);}catch(e){if(e.code==='ENOENT')return null;throw e;}
    for(const date of names.filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)).sort().reverse()){const r=await this.read(date);if(r)return r;}
    return null;
  }
  async save(report,artifacts={}) {
    // The report is the commit record; readers never consume unfinished artifact sets.
    for(const [name,data] of Object.entries(artifacts))await atomic(this.file(report.date,name),data);
    await atomic(this.file(report.date,'run-'+(report.scope||'all')),report);
    await atomic(this.file(report.date),report);
    return sanitizeDaily(report);
  }
  async withLock(task,name='run'){
    if(!['run','scheduler'].includes(name))throw new Error('INVALID_LOCK_NAME');
    await fs.mkdir(this.root,{recursive:true});const file=path.join(this.root,'.'+name+'.lock');
    let handle;
    for(let i=0;i<2;i++)try{handle=await fs.open(file,'wx');await handle.writeFile(JSON.stringify({pid:process.pid,at:new Date().toISOString()}));break;}catch(e){
      if(e.code!=='EEXIST')throw e;
      const lock=await readJson(file);let alive=true;try{process.kill(lock.pid,0);}catch(err){if(err.code==='ESRCH')alive=false;}
      if(alive)throw new Error('MORNING_BUSY');await fs.unlink(file);
    }
    if(!handle)throw new Error('MORNING_BUSY');
    try{return await task();}finally{await handle.close();await fs.unlink(file);}
  }
  async readScope(date,scope='all'){return readJson(this.file(date,'run-'+scope));}
  async writeState(date,name,value){await atomic(this.file(date,name),value);}
  async readState(date,name){return readJson(this.file(date,name));}
  async progress(date,value){await atomic(this.file(date,'agents-status'),value);}
  async readProgress(date){return readJson(this.file(date,'agents-status'));}
}
export function validateEntry(entry) {
  if(!entry||!/^\d{6}$/.test(entry.stockCode)||entry.version!=='ENTRY_SNAPSHOT_V1'||
    !Number.isFinite(entry.buyPrice)||entry.buyPrice<=0||!Number.isSafeInteger(entry.quantity)||entry.quantity<=0||
    !Number.isFinite(entry.stopLossPct)||entry.stopLossPct>=0||entry.stopLossPct<=-100||
    !Number.isFinite(entry.takeProfitPct)||entry.takeProfitPct<=0||!entry.thesis||
    !Number.isFinite(Date.parse(entry.registeredAt)))throw new Error('INVALID_ENTRY');
  if(JSON.stringify(entry).length>30000)throw new Error('INVALID_ENTRY');
  return sanitizeDaily(entry);
}
export class MorningPortfolioStore {
  constructor(file=dataPath('portfolio','positions.json')){this.file=path.resolve(file);}
  async read(){const r=await readJson(this.file);if(r!==null&&!Array.isArray(r))throw new Error('PORTFOLIO_READ_FAILED');return r||[];}
  async upsert(entry,{onlyIfMissing=false,expectedEntry=undefined}={}) {
    entry=validateEntry(entry);
    return serialized(this.file,async()=>{
      const rows=await this.read(),index=rows.findIndex(x=>x.entry.stockCode===entry.stockCode);
      if(index>=0&&onlyIfMissing)return rows[index];
      if(expectedEntry!==undefined&&JSON.stringify(index>=0?rows[index].entry:null)!==JSON.stringify(expectedEntry))throw new Error('PORTFOLIO_CONFLICT');
      const row={entry,updatedAt:new Date().toISOString()};
      if(index>=0)rows[index]=row;else rows.push(row);
      await atomic(this.file,rows);return row;
    });
  }
  async saveEvaluation(entry,evaluation){
    validateEntry(entry);
    if(!evaluation||evaluation.stockCode!==entry.stockCode||!Number.isFinite(Date.parse(evaluation.evaluatedAt))||Date.parse(evaluation.evaluatedAt)>Date.now()+60000||JSON.stringify(evaluation).length>60000)throw new Error('INVALID_ENTRY');
    return serialized(this.file,async()=>{
      const rows=await this.read(),row=rows.find(x=>x.entry.stockCode===entry.stockCode);
      if(!row||JSON.stringify(row.entry)!==JSON.stringify(entry))throw new Error('PORTFOLIO_CONFLICT');
      if(!row.lastEvaluation||Date.parse(evaluation.evaluatedAt)>Date.parse(row.lastEvaluation.evaluatedAt)){
        row.lastEvaluation=sanitizeDaily(evaluation);row.updatedAt=new Date().toISOString();await atomic(this.file,rows);
      }
      return row;
    });
  }
  async remove(code,{entry=null}={}){if(!/^\d{6}$/.test(code))throw new Error('INVALID_ENTRY');return serialized(this.file,async()=>{const current=await this.read();if(entry&&JSON.stringify(current.find(x=>x.entry.stockCode===code)?.entry)!==JSON.stringify(entry))throw new Error('PORTFOLIO_CONFLICT');const rows=current.filter(x=>x.entry.stockCode!==code);await atomic(this.file,rows);return rows;});}
}

export {atomic as writeAtomicJson};
