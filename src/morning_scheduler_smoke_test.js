import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {MorningStore} from './services/morning_store.js';
import {createMorningScheduler} from './services/morning_scheduler.js';
const root=await fs.mkdtemp(path.join(os.tmpdir(),'kstock-schedule-'));
const env={KSTOCK_DAILY_ORCHESTRATOR_ENABLED:'true'};
let current=new Date('2026-09-10T22:00:00Z'),calls=0;
const now=()=>current;
function service(store,status='SUCCESS'){
  return {active:null,store,start(options){
    calls++;
    return {completion:(async()=>{
      await new Promise(resolve=>setTimeout(resolve,30));
      const report={date:'2026-09-11',scope:'all',status,topCandidates:[],agentStatus:{}};
      await store.save(report);
      return report;
    })()};
  }};
}
try{
  const store=new MorningStore(path.join(root,'concurrent'));
  const a=createMorningScheduler(service(store),{env,now});
  const b=createMorningScheduler(service(new MorningStore(store.root)),{env,now});
  await Promise.all([a.tick(),b.tick()]);
  assert.equal(a.status().lastRunStatus,'SUCCESS');
  assert.ok(a.status().lastRunId);
  assert.equal(a.status().nextRunAt,'2026-09-13T22:00:00.000Z');
  assert.equal(calls,1,'Concurrent schedulers must submit only one run');
  current=new Date('2026-09-10T23:00:00Z');
  await createMorningScheduler(service(new MorningStore(store.root)),{env,now}).tick();
  assert.equal(calls,1,'Restart must retain completion');
  assert.equal((await store.readState('2026-09-11','scheduler')).attempts,1);
  assert.equal((await store.readState('2026-09-11','notification')).status,'SUCCESS');
  const retries=new MorningStore(path.join(root,'retries'));
  current=new Date('2026-09-10T22:00:00Z');
  for(const minute of [0,1,16,17,47,120]){
    current=new Date(Date.parse('2026-09-10T22:00:00Z')+minute*60000);
    await createMorningScheduler(service(retries,'PARTIAL'),{env,now}).tick();
  }
  assert.equal(calls,4,'Persistent retry budget allows three attempts only');
  assert.equal((await retries.readState('2026-09-11','scheduler')).attempts,3);
  console.log('Morning scheduler: concurrent ownership, restart, notification, persistent bounded retry PASS (offline).');
}finally{
  assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep));
  await fs.rm(root,{recursive:true,force:true});
}
