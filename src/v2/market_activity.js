import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';import path from 'node:path';import {randomUUID} from 'node:crypto';
import {activityOperation,validActivity} from './activity_schema.js';import {createMarketGatewayRequest} from './market_gateway.js';
export function createMarketActivity({request=createMarketGatewayRequest(),directory='data/v2/trading-workspace',enabled=process.env.KSTOCK_MARKET_GATEWAY_ENABLED==='true',now=()=>Date.now(),wait=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 const saved=new Map(),pending=new Set(),attempt=new Map();let serial=Promise.resolve();
 async function get(market){
  if(!['KR','US'].includes(market))throw Error('MARKET_INVALID');
  let parts=saved.get(market);if(!parts){try{const raw=await readFile(path.join(directory,'activity-'+market+'.json'),'utf8');parts=raw.length<200000?JSON.parse(raw):[];}catch{parts=[];}if(!Array.isArray(parts))parts=[];saved.set(market,parts);}
  const scopes=(market==='KR'?['KRX']:['NAS','NYS','AMS']).flatMap(exchange=>['TURNOVER','VOLUME_GROWTH'].map(kind=>({market,exchange,kind})));
  const fresh=parts.filter(p=>scopes.some(s=>validActivity(p,s,now())));
  if(enabled&&fresh.length<scopes.length&&!pending.has(market)&&now()>=(attempt.get(market)||0)){
   pending.add(market);attempt.set(market,now()+60000);
   const task=serial.then(async()=>{let results=[...fresh];for(const scope of scopes){if(results.some(p=>validActivity(p,scope,now())))continue;await wait(2400);try{const p=await request({service:'kis',operation:activityOperation(market,scope.kind),symbol:'MARKET',params:scope});if(!validActivity(p,scope,now()))throw Error('ACTIVITY_DATA_INVALID');results=results.filter(x=>x.exchange!==scope.exchange||x.kind!==scope.kind);results.push(p);saved.set(market,results);}catch{break;}}
    await mkdir(directory,{recursive:true,mode:0o700});const file=path.join(directory,'activity-'+market+'.json'),tmp=file+'.'+randomUUID()+'.tmp';await writeFile(tmp,JSON.stringify(results),{mode:0o600});await rename(tmp,file);
   }).finally(()=>pending.delete(market));serial=task.catch(()=>{});
  }
  return {market,status:fresh.length===scopes.length?'OBSERVED':fresh.length?'PARTIAL':pending.has(market)?'LOADING':'UNAVAILABLE',refreshing:pending.has(market),sources:fresh.map(p=>({exchange:p.exchange,kind:p.kind,basis:p.basis,receivedAt:p.receivedAt,count:p.items.length})),items:fresh.flatMap(p=>p.items.map(i=>({...i,kind:p.kind,basis:p.basis,receivedAt:p.receivedAt}))),orderExecution:false};
 }
 return {get};
}
