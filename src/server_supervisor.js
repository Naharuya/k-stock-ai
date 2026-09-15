import {dataPath} from './services/profile_service.js';
import {parse} from 'dotenv';
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {createLogger} from './services/log_service.js';
import {writeAtomicJson} from './services/morning_store.js';
import {createRecoverySupervisor} from './services/server_recovery_service.js';
const logger=createLogger({root:dataPath('logs','supervisor')});
const root=dataPath('operations');await fs.mkdir(root,{recursive:true});
const lockFile=path.join(root,'supervisor.lock');
let lock;
for(let attempt=0;attempt<2;attempt++)try{lock=await fs.open(lockFile,'wx');await lock.writeFile(String(process.pid));await lock.sync();break;}catch(error){
 if(error.code!=='EEXIST')throw error;
 const owner=Number(await fs.readFile(lockFile,'utf8'));if(!Number.isSafeInteger(owner)||owner<=0)throw new Error('SUPERVISOR_LOCK_INVALID');
 let alive=true;try{process.kill(owner,0);}catch(e){if(e.code==='ESRCH')alive=false;}
 if(alive)process.exit(0);await fs.unlink(lockFile);
}
if(!lock)throw new Error('SUPERVISOR_LOCK_UNAVAILABLE');
const url=(process.env.KSTOCK_TLS_CERT?'https':'http')+'://localhost:'+Number(process.env.PORT||3000)+'/health';
const controller=new AbortController();
const supervisor=createRecoverySupervisor({
  health:async()=>{const response=await fetch(url,{signal:AbortSignal.timeout(5000)});const body=await response.json();return response.ok&&body.ok&&body.service==='k-stock-ai'&&Boolean(body.version);},
  record:async record=>{await writeAtomicJson(path.join(root,'heartbeat.json'),{at:new Date().toISOString(),...record});logger.info('SERVER_HEALTH',record);},
  start:async()=>{
    let configured={};try{configured=parse(await fs.readFile('.env','utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
    const freshEnv={...process.env,...configured};
    if(freshEnv.KSTOCK_LIVE_TRADING_ENABLED==='true')throw new Error('LIVE_TRADING_MUST_BE_DISABLED');
    logger.info('SERVER_RESTART_REQUESTED');
    return spawn(process.execPath,[fileURLToPath(new URL('./server.js',import.meta.url))],{cwd:process.cwd(),env:freshEnv,windowsHide:true,stdio:'ignore'});
  }
});
const stop=()=>{supervisor.stop();controller.abort();};
process.on('SIGTERM',stop);process.on('SIGINT',stop);
try{
  while(!controller.signal.aborted){
    try{await supervisor.tick();}catch{logger.error('SUPERVISOR_CYCLE_FAILED');}
    try{await delay(30000,undefined,{signal:controller.signal});}catch{break;}
  }
}finally{supervisor.stop();await lock.close();await fs.unlink(lockFile);}
