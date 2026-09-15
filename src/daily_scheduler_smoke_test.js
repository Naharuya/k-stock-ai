import assert from 'node:assert/strict';
import {createDailyScheduler} from './services/daily_scheduler.js';
import {seoulClock,nextTradingDate,previousTradingDate,isTradingDay} from './services/trading_day_service.js';
assert.equal(seoulClock(new Date('2026-09-10T15:30:00Z')).date,'2026-09-11');
assert.equal(nextTradingDate('2026-09-11'),'2026-09-14');
assert.equal(previousTradingDate('2026-09-14'),'2026-09-11');
assert.equal(isTradingDay('2026-09-12'),false);
let now=new Date('2026-09-11T15:40:00+09:00');
let calls=[];const saved=new Map();
const service={active:null,store:{read:async(kind,date)=>saved.get(kind+date)||null},
  start(kind){calls.push(kind);saved.set(kind+seoulClock(now).date,{diagnostics:{}});return {completion:Promise.resolve()};}};
const off=createDailyScheduler(service,{env:{},now:()=>now});
off.start();await off.tick();assert.equal(calls.length,0);assert.equal(off.status().running,false);
const scheduler=createDailyScheduler(service,{env:{KSTOCK_DAILY_AGENT_ENABLED:'true'},now:()=>now});
await scheduler.tick();await scheduler.tick();assert.deepEqual(calls,['after-market']);
const restarted=createDailyScheduler(service,{env:{KSTOCK_DAILY_AGENT_ENABLED:'true'},now:()=>now});
await restarted.tick();assert.equal(calls.length,1,'Restart must honor persisted result');
now=new Date('2026-09-12T15:40:00+09:00');await scheduler.tick();assert.equal(calls.length,1);
now=new Date('2026-09-14T08:29:00+09:00');await scheduler.tick();assert.equal(calls.length,1);
now=new Date('2026-09-14T08:30:00+09:00');await scheduler.tick();assert.equal(calls.at(-1),'pre-market');
now=new Date('2026-09-15T09:30:00+09:00');await scheduler.tick();assert.equal(calls.length,2,'Do not label midday automatic runs pre-market');
const invalid=createDailyScheduler(service,{env:{KSTOCK_DAILY_AGENT_ENABLED:'true',KSTOCK_PRE_MARKET_HOUR:'oops'}});
assert.equal(invalid.status().enabled,false);
now=new Date('2026-09-16T16:00:00+09:00');
let failures=0;
const failing=createDailyScheduler({active:null,store:{read:async()=>null},start(){failures++;return {completion:Promise.reject(new Error('FAILED'))};}},
  {env:{KSTOCK_DAILY_AGENT_ENABLED:'true'},now:()=>now});
await failing.tick();await failing.tick();assert.equal(failures,1);
for(let i=0;i<5;i++){now=new Date(now.getTime()+16*60000);await failing.tick();}
assert.equal(failures,3);assert.equal(failing.status().lastError.error,'FAILED');
console.log('Daily scheduler: default OFF, KST, weekends, timing, restart idempotency, invalid config, bounded retries passed');
