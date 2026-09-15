import {dataPath,profileId} from './profile_service.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { assertDate } from './trading_day_service.js';

const pendingWrites = new Map();
const phases = new Set(['after-market','pre-market','failures']);
const secretKey = /secret|password|token|authorization|api.?key|app.?key|crtfc|credential/i;
export function sanitizeDaily(value) {
  const secrets = Object.entries(process.env).filter(([k,v])=>secretKey.test(k)&&v&&v.length>=4).map(([,v])=>v);
  function clean(x) {
    if (Array.isArray(x)) return x.map(clean);
    if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).filter(([k])=>!secretKey.test(k)).map(([k,v])=>[k,clean(v)]));
    if (typeof x === 'string') {
      let text=x;
      for (const secret of secrets) { text=text.split(secret).join('[REDACTED]'); text=text.split(encodeURIComponent(secret)).join('[REDACTED]'); }
      return text.replace(/((?:api[_-]?key|app[_-]?secret|crtfc_key|access_token|password)=)[^&\s]+/gi,'$1[REDACTED]');
    }
    return x;
  }
  return clean(value);
}
export class DailyCandidateStore {
  constructor(root=dataPath('daily')) { this.root=path.resolve(root); }
  file(phase,date) {
    if(!phases.has(phase)) throw new Error('INVALID_DAILY_PHASE');
    return path.join(this.root,phase,assertDate(date)+'.json');
  }
  async write(phase,date,result) {
    const file=this.file(phase,date);
    const previous=pendingWrites.get(file)||Promise.resolve();
    const pending=previous.catch(()=>{}).then(()=>this.writeAtomic(phase,date,result));
    pendingWrites.set(file,pending);
    try {return await pending;}
    finally {if(pendingWrites.get(file)===pending)pendingWrites.delete(file);}
  }
  async writeAtomic(phase,date,result) {
    const file=this.file(phase,date);
    for(const key of ['engineVersion','generatedAt','sourceTradingDate','targetTradingDate','candidates','diagnostics','errors']) {
      if(result[key]===undefined) throw new Error('INVALID_DAILY_RECORD');
    }
    assertDate(result.sourceTradingDate); assertDate(result.targetTradingDate);
    const safe=sanitizeDaily(result);
    await fs.mkdir(path.dirname(file),{recursive:true});
    const temporary=file+'.'+randomUUID()+'.tmp';
    try {
      const handle=await fs.open(temporary,'wx',0o600);
      try { await handle.writeFile(JSON.stringify(safe,null,2),'utf8'); await handle.sync(); }
      finally { await handle.close(); }
      for(let attempt=0;;attempt++) {
        try {await fs.rename(temporary,file);break;}
        catch(error) {
          if(!['EPERM','EACCES','EBUSY'].includes(error.code)||attempt>=5)throw error;
          await new Promise(resolve=>setTimeout(resolve,25*(attempt+1)));
        }
      }
    } finally { await fs.unlink(temporary).catch(error=>{if(error.code!=='ENOENT')throw error;}); }
    return safe;
  }
  async read(phase,date) {
    const file=this.file(phase,date);
    try {
      const record=JSON.parse(await fs.readFile(file,'utf8'));
      if(!Array.isArray(record.candidates)||!record.engineVersion||!record.generatedAt) throw new Error('DAILY_STORE_CORRUPT');
      assertDate(record.sourceTradingDate); assertDate(record.targetTradingDate);
      return sanitizeDaily(record);
    } catch(error) {
      if(error.code==='ENOENT')return null;
      throw new Error('DAILY_STORE_READ_FAILED');
    }
  }
  async latest(phase) {
    this.file(phase,'2000-01-01');
    let files;
    try { files=await fs.readdir(path.join(this.root,phase)); }
    catch(error) { if(error.code==='ENOENT')return null; throw new Error('DAILY_STORE_READ_FAILED'); }
    const dates=files.filter(x=>/^\d{4}-\d{2}-\d{2}\.json$/.test(x)).sort().reverse();
    return dates.length ? this.read(phase,dates[0].slice(0,10)) : null;
  }
}
