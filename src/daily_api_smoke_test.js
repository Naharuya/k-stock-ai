import assert from 'node:assert/strict';
import express from 'express';
import {registerDailyRoutes} from './daily_routes.js';
import {DailyTradingService} from './services/daily_trading_service.js';
import {DailyCandidateStore} from './services/daily_candidate_store.js';
import {temporaryStoreDirectory,recordFixture,marketFixture} from './daily_test_helpers.js';
import {validatePreMarket} from './services/pre_market_validation_service.js';
const temp=await temporaryStoreDirectory();
let now=new Date('2026-09-11T16:00:00+09:00');
let release;
const gate=new Promise(resolve=>{release=resolve;});
const service=new DailyTradingService({store:new DailyCandidateStore(temp.root),now:()=>now,
  engine:async()=>{await gate;return {top:[{code:'005930',name:'테스트',validationLevel:'DEEP',rankingScore:84,
    committee:{status:'INTEREST',score:80},deep:{riskLevel:'LOW'}}],pipeline:{scanned:3989,eligibleAfterHardRisk:3000},errors:{},market:marketFixture};},
  preValidator:(record,options)=>validatePreMarket(record,{...options,market:async()=>marketFixture,news:async()=>({items:[]}),disclosures:async()=>({list:[]})})
});
const app=express();app.use(express.json());
registerDailyRoutes(app,service,{status:()=>({enabled:false})});
const server=app.listen(0,'127.0.0.1');
await new Promise(resolve=>server.once('listening',resolve));
const base='http://127.0.0.1:'+server.address().port;
async function request(route,method='GET',body) {
  const response=await fetch(base+'/api/daily/'+route,{method,...(method==='POST'?{headers:{'Content-Type':'application/json'},body:body??'{}'}:{})});
  return {status:response.status,body:await response.json()};
}
async function idle() {
  for(let i=0;i<100&&service.active;i++)await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(service.active,null);
}
try {
  assert.equal((await request('today')).body.result,null);
  const started=await request('after-market','POST');assert.equal(started.status,202);
  assert.equal((await request('status')).body.result.active.kind,'after-market');
  assert.equal((await request('pre-market','POST')).status,409);
  release();await idle();
  assert.equal((await request('tomorrow')).body.result.targetTradingDate,'2026-09-14');
  now=new Date('2026-09-14T08:30:00+09:00');
  assert.equal((await request('pre-market','POST')).status,202);await idle();
  assert.equal((await request('today')).body.result.candidates[0].status,'READY');
  assert.equal((await request('revalidate','POST')).status,202);await idle();
  assert.equal((await request('after-market','POST','[]')).status,400);
  assert.equal((await request('after-market','POST','{')).status,400);
  now=new Date('2026-09-15T08:30:00+09:00');
  assert.equal((await request('pre-market','POST')).status,202);await idle();
  const state=(await request('status')).body.result;
  assert.equal(state.lastJob.error,'NO_AFTER_MARKET_RESULT');
  assert.equal(state.lastFailure.errors[0].error,'NO_AFTER_MARKET_RESULT');
  assert.equal((await request('today')).status,200,'Server must survive failed job');
  console.log('Daily API: all six endpoints, 202 background jobs, 409 overlap, malformed input, persisted failure and server survival passed');
} finally {await new Promise(resolve=>server.close(resolve));await temp.cleanup();}
