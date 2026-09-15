import http from 'node:http';
const fetch=(url,options={})=>new Promise((resolve,reject)=>{const req=http.request(url,options,res=>{let text='';res.on('data',c=>text+=c);res.on('end',()=>resolve({status:res.statusCode,json:async()=>JSON.parse(text),headers:{get:k=>Array.isArray(res.headers[k])?res.headers[k].join(';'):res.headers[k]}}));});req.on('error',reject);req.end(options.body);});
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import {installAccess} from './services/access_service.js';
import {MorningStore,MorningPortfolioStore} from './services/morning_store.js';
import {createMorningScheduler} from './services/morning_scheduler.js';
import {createEntrySnapshot,evaluateExitPosition} from './services/entry_exit_service.js';
import {withRequestSignal,providerFetch,requestDelay} from './services/request_context.js';
import {dataPath} from './services/profile_service.js';
import {comparePeers} from './services/peer_valuation_service.js';
import {calculateTtm,cumulativeResponse} from './services/latest_financials_service.js';
const root=await fs.mkdtemp(path.join(os.tmpdir(),'kstock-reliability-'));
const entry=createEntrySnapshot({stockCode:'003280'},{buyPrice:1900,quantity:1342});
let server;
try{
  for(const price of [null,undefined,'',0,-1]){
    const ev=evaluateExitPosition({entry,currentAnalysis:{stockCode:'003280',marketData:{quote:{price}}}});
    assert.equal(ev.currentPrice,null);assert.equal(ev.pnlPct,null);assert.equal(ev.exitPressure,null);assert.equal(ev.status,'WATCH');
  }
  const originalProfile=process.env.KSTOCK_PROFILE;
  try{process.env.KSTOCK_PROFILE='alice';const a=dataPath('portfolio');process.env.KSTOCK_PROFILE='bob';assert.notEqual(a,dataPath('portfolio'));process.env.KSTOCK_PROFILE='../escape';assert.throws(()=>dataPath(),/INVALID_PROFILE/);}
  finally{if(originalProfile===undefined)delete process.env.KSTOCK_PROFILE;else process.env.KSTOCK_PROFILE=originalProfile;}
  const peers=comparePeers({code:'0',sector:'s',quote:{per:12,pbr:1},rows:[1,2,3].map(i=>({code:String(i),industryLarge:'s',quote:{per:i*10,pbr:i}}))});
  assert.equal(peers.per.value,20);assert.equal(peers.targetPrice,null);assert.equal(peers.status,'LIMITED_SAMPLE');
  const p=new MorningPortfolioStore(path.join(root,'positions.json'));await p.upsert(entry);
  const old={stockCode:'003280',evaluatedAt:'2026-01-01T00:00:00Z',status:'WATCH'},recent={...old,evaluatedAt:'2026-01-02T00:00:00Z',status:'HOLD'};
  await p.saveEvaluation(entry,recent);await p.saveEvaluation(entry,old);assert.equal((await p.read())[0].lastEvaluation.status,'HOLD');
  await p.upsert({...entry,buyPrice:2000});await assert.rejects(p.remove(entry.stockCode,{entry}),/CONFLICT/);await assert.rejects(p.upsert(entry,{expectedEntry:entry}),/CONFLICT/);await assert.rejects(p.saveEvaluation(entry,recent),/CONFLICT/);
  await p.remove(entry.stockCode);await assert.rejects(p.saveEvaluation(entry,recent),/CONFLICT/);
  const store=new MorningStore(path.join(root,'daily')),report={date:'2026-09-11',scope:'portfolio',status:'SUCCESS',topCandidates:[],agentStatus:{}};
  await store.save(report);assert.equal(await store.readScope(report.date,'all'),null);assert.equal((await store.readScope(report.date,'portfolio')).status,'SUCCESS');
  await store.withLock(async()=>{await assert.rejects(new MorningStore(store.root).withLock(async()=>{}),/BUSY/);});
  let current=new Date('2026-09-11T07:00:00+09:00'),calls=0;
  const service={store,active:null,start(){calls++;return {completion:Promise.resolve({status:'FAILED'})};}};
  const options={env:{KSTOCK_DAILY_ORCHESTRATOR_ENABLED:'true'},now:()=>current};
  await createMorningScheduler(service,options).tick();assert.equal(calls,1);
  await createMorningScheduler(service,options).tick();assert.equal(calls,1,'Restart must retain retry backoff');
  current=new Date(+current+16*60000);await createMorningScheduler(service,options).tick();assert.equal(calls,2);
  current=new Date(+current+31*60000);await createMorningScheduler(service,options).tick();assert.equal(calls,3);
  current=new Date(+current+61*60000);await createMorningScheduler(service,options).tick();assert.equal(calls,3);
  const controller=new AbortController();controller.abort();
  await assert.rejects(withRequestSignal(controller.signal,()=>requestDelay(5000)));
  assert.throws(()=>withRequestSignal(controller.signal,()=>providerFetch('http://127.0.0.1:1')));
  const raw={list:[{sj_div:'IS',thstrm_amount:'3',thstrm_add_amount:'6',frmtrm_amount:'12',frmtrm_add_amount:'5'}]};
  assert.equal(cumulativeResponse(raw,'11012').list[0].thstrm_amount,'6');
  const accounts=Object.fromEntries(['revenue','operatingProfit','netIncome'].map(k=>[k,{accountId:k,currency:'KRW',current:6,previous:5}]));
  const annual={accounts:Object.fromEntries(Object.entries(accounts).map(([k,v])=>[k,{...v,current:12}]))};
  assert.equal(calculateTtm({accounts},annual).values.revenue,13);
  accounts.revenue.previous=null;assert.equal(calculateTtm({accounts},annual).values.revenue,null);
  const app=express();app.get('/slow',(req,res)=>{res.writeHead(200);res.write('partial');});app.use(express.json());installAccess(app,{root:path.join(root,'access')});app.get('/api/private',(req,res)=>res.json({ok:true}));
  server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
  const oldTimeout=process.env.KSTOCK_PROVIDER_TIMEOUT_MS;
  try{process.env.KSTOCK_PROVIDER_TIMEOUT_MS='1000';const slow=await providerFetch(base+'/slow');await assert.rejects(slow.text());}finally{if(oldTimeout===undefined)delete process.env.KSTOCK_PROVIDER_TIMEOUT_MS;else process.env.KSTOCK_PROVIDER_TIMEOUT_MS=oldTimeout;}
  const remote={Host:'phone.example',Origin:'http://phone.example'};
  assert.equal((await fetch(base+'/api/private',{headers:remote})).status,401);
  assert.equal((await fetch(base+'/api/access/code',{method:'POST',headers:remote})).status,403);
  const code=(await(await fetch(base+'/api/access/code',{method:'POST'})).json()).result.code;
  const pair=await fetch(base+'/api/access/pair',{method:'POST',headers:{...remote,'Content-Type':'application/json'},body:JSON.stringify({code})});
  assert.equal(pair.status,200);const cookie=pair.headers.get('set-cookie');assert.ok(cookie.includes('HttpOnly'));assert.ok(cookie.includes('SameSite=Strict'));
  assert.equal((await fetch(base+'/api/private',{headers:{...remote,Cookie:cookie.split(';')[0]}})).status,200);
  assert.equal((await fetch(base+'/api/access/pair',{method:'POST',headers:{...remote,'Content-Type':'application/json'},body:JSON.stringify({code})})).status,401);
  await fetch(base+'/api/access/revoke',{method:'POST'});assert.equal((await fetch(base+'/api/private',{headers:{...remote,Cookie:cookie}})).status,401);
  console.log('Reliability: missing prices, scope isolation, saved evaluations, conflicts, process lock, persistent retry cap/backoff, cancellation, YTD/TTM, pairing/replay/revocation passed.');
}finally{if(server)await new Promise(r=>server.close(r));await fs.rm(root,{recursive:true,force:true});}
