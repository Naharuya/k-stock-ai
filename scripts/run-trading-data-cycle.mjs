/** Approved bounded public-data refresh on the existing Mac mini scheduler. */
import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),directory=path.join(root,'data/v2/trading-workspace'),stateFile=path.join(directory,'cycle-state.json');
if(!process.argv.includes('--approved-read-only')){console.log(JSON.stringify({status:'APPROVAL_FLAG_REQUIRED',externalRequests:0}));process.exit(0);}
await fs.mkdir(directory,{recursive:true,mode:0o700});let lock;const lockPath=path.join(directory,'cycle.lock');
for(let attempt=0;attempt<2;attempt++){
 try{lock=await fs.open(lockPath,'wx',0o600);await lock.writeFile(String(process.pid));break;}
 catch(error){if(error.code!=='EEXIST')throw error;let dead=false;try{const pid=Number(await fs.readFile(lockPath,'utf8'));if(Number.isInteger(pid)&&pid>0)try{process.kill(pid,0);}catch(e){dead=e.code==='ESRCH';}}catch{}if(dead&&attempt===0){await fs.unlink(lockPath);continue;}console.log(JSON.stringify({status:'SKIPPED',reason:'CYCLE_LOCKED',externalRequests:0}));process.exit(0);}
}
try{
 let previous;try{previous=JSON.parse(await fs.readFile(stateFile,'utf8'));}catch{}
 const at=Date.now();if(previous&&at-Date.parse(previous.startedAt)<3600000){console.log(JSON.stringify({status:'SKIPPED',reason:'HOURLY_BUDGET',externalRequests:0}));process.exitCode=0;}
 else{
  let universe;try{universe=JSON.parse(await fs.readFile(path.join(directory,'instruments.json'),'utf8'));}catch{}
  if(!Array.isArray(universe?.items)||Date.parse(universe.checkedAt)>at||at-Date.parse(universe.checkedAt)>7*86400000){console.log(JSON.stringify({status:'BLOCKED',reason:'MASTER_MISSING_OR_STALE',externalRequests:0}));process.exitCode=1;}
  else{
   await import('dotenv/config');const {createTradingWorkspace,workspaceInstrument,TRADING_CATALOG}=await import('../src/v2/trading_workspace.js');
   const snapshotId=createHash('sha256').update(JSON.stringify(universe.sources)).digest('hex');
   const same=previous?.snapshotId===snapshotId,cursor=same?previous.nextCursor||0:0,attempted=same?previous.attemptedSymbols||[]:[];
   const service=createTradingWorkspace({directory});
   const startCursor=cursor>=universe.items.length?0:cursor;const candidates=[...TRADING_CATALOG,...universe.items.slice(startCursor,startCursor+17).map((i,n)=>({...i,queueIndex:startCursor+n}))];let nextCursor=startCursor;
   const results=[];let requests=0;
   // Persist the budget before any network request; interrupted cycles do not silently retry.
   const initial={schemaVersion:1,startedAt:new Date(at).toISOString(),status:'RUNNING',snapshotId,nextCursor:cursor,attemptedSymbols:attempted};await fs.writeFile(stateFile,JSON.stringify(initial),{mode:0o600});
   for(const c of candidates){
    if(c.queueIndex!==undefined&&results.some(r=>r.market===c.market&&r.exchange===c.exchange&&r.symbol===c.symbol)){nextCursor=c.queueIndex+1;continue;}
    let instrument;try{instrument=workspaceInstrument(c);}catch{if(c.queueIndex!==undefined)nextCursor=c.queueIndex+1;continue;}
    const r=await service.detail(instrument);results.push({market:c.market,symbol:c.symbol,exchange:c.exchange,dataStatus:r.dataStatus,reason:r.reason,priceAsOf:r.history?.priceAsOf||null,action:r.strategy.action});
    // This is a count of refresh attempts, not a fabricated raw HTTP-call count.
    if(r.dataStatus!=='OBSERVED'||Date.parse(r.history.receivedAt)>=at)requests++;
    if(['HTTP_403','HTTP_401'].includes(r.reason))break;
    if(c.queueIndex!==undefined)nextCursor=c.queueIndex+1;
    await fs.writeFile(stateFile,JSON.stringify({...initial,nextCursor,attemptedSymbols:[...new Set([...attempted,...results.map(r=>`${r.market}:${r.exchange}:${r.symbol}`)])]}),{mode:0o600});
    await new Promise(resolve=>setTimeout(resolve,2100));
   }
   const identities=results.map(r=>`${r.market}:${r.exchange}:${r.symbol}`),unique=[...new Set([...attempted,...identities])];
   const record={...initial,status:results.every(r=>r.dataStatus==='OBSERVED')?'OBSERVATIONS_SAVED':'PARTIAL',finishedAt:new Date().toISOString(),universeSecurities:universe.items.length,attemptedSymbols:unique,uniqueAttempted:unique.length,nextCursor,refreshAttempts:requests,externalHttpRequests:null,observed:results.filter(r=>r.dataStatus==='OBSERVED').length,results,recommendation:'HOLD',liveTrading:false};
   await fs.writeFile(stateFile,JSON.stringify(record),{mode:0o600});const history=path.join(directory,'cycle-reports');await fs.mkdir(history,{recursive:true,mode:0o700});await fs.writeFile(path.join(history,record.startedAt.replace(/[^0-9]/g,'')+'.json'),JSON.stringify(record),{mode:0o600});console.log(JSON.stringify({status:record.status,startedAt:record.startedAt,finishedAt:record.finishedAt,universeSecurities:record.universeSecurities,uniqueAttempted:record.uniqueAttempted,refreshAttempts:record.refreshAttempts,externalHttpRequests:null,observed:record.observed,results:record.results,recommendation:'HOLD'}));
  }
 }
}finally{await lock.close();await fs.unlink(path.join(directory,'cycle.lock'));}
