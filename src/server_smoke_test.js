import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {createLogger} from './services/log_service.js';
import {createRecoverySupervisor} from './services/server_recovery_service.js';
import {testWorkspace,startTestServer,lanIPv4,projectRoot} from './server_test_helpers.js';
const workspace=await testWorkspace();let running;
try{
  running=await startTestServer(workspace.root);
  const addresses=['localhost',...lanIPv4()];
  for(const host of addresses){
    const r=await fetch('http://'+host+':'+running.port+'/health',{signal:AbortSignal.timeout(5000)});assert.equal(r.status,200);
    const b=await r.json();assert.equal(b.version,workspace.report.version);assert.ok(b.ok);assert.equal(b.dailyAgentEnabled,false);assert.equal(b.schedulerStatus.running,false);assert.equal(b.liveTrading,false);assert.ok(b.uptime>=0);
  }
  const bad=await fetch(running.base+'/api/daily/run',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'});assert.equal(bad.status,400);assert.equal((await bad.json()).error,'INVALID_DAILY_REQUEST');
  const malformed=await fetch(running.base+'/api/test-analysis',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'});assert.equal(malformed.status,400);assert.equal((await malformed.json()).error,'INVALID_JSON');
  assert.equal((await fetch(running.base+'/health')).status,200,'Bad request must not kill server');
  assert.ok(running.logs().includes('Local URL:'));if(addresses.length>1)assert.ok(running.logs().includes('LAN URL:'));
  await running.stop();running=await startTestServer(workspace.root);
  assert.deepEqual((await (await fetch(running.base+'/api/daily/latest')).json()).result,workspace.report,'Restart preserves report');
  const sink={write(){}},logRoot=path.join(workspace.root,'logs');
  const logger=createLogger({root:logRoot,sink,errorSink:sink});
  logger.error('TEST_ERROR',{message:'PRIVATE_ERROR_BODY',authorization:'PRIVATE_HEADER',code:'ECONNRESET'});
  const text=await fs.readFile(path.join(logRoot,new Date().toISOString().slice(0,10)+'.jsonl'),'utf8');assert.ok(!text.includes('PRIVATE_'));assert.equal(JSON.parse(text).code,'ECONNRESET');
  for(const [event,trigger] of [['UNHANDLED_REJECTION',"Promise.reject(new Error('PRIVATE_FATAL_PAYLOAD'))"],['UNCAUGHT_EXCEPTION',"setImmediate(()=>{throw new Error('PRIVATE_FATAL_PAYLOAD');})"]]){
    const moduleUrl=pathToFileURL(path.join(projectRoot,'src/services/server_runtime_service.js')).href;
    const script='import http from "node:http";import {installServerRuntime} from '+JSON.stringify(moduleUrl)+';const s=http.createServer((q,r)=>r.end());installServerRuntime(s,{deadlineMs:500});s.listen(0,"127.0.0.1",()=>{'+trigger+';});';
    const child=spawn(process.execPath,['--input-type=module','-e',script],{cwd:workspace.root,windowsHide:true,stdio:['ignore','pipe','pipe']});
    let captured='';child.stdout.on('data',v=>captured+=v);child.stderr.on('data',v=>captured+=v);
    const code=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{child.kill();reject(Error('Fatal handling timeout'));},3000);child.once('exit',code=>{clearTimeout(timer);resolve(code);});child.once('error',()=>{clearTimeout(timer);reject(Error('Fatal fixture start failed'));});});
    assert.equal(code,1);assert.ok(captured.includes(event));assert.ok(!captured.includes('PRIVATE_FATAL_PAYLOAD'));
  }
  let now=0,starts=0,healthy=false,owned;
  const recovery=createRecoverySupervisor({now:()=>now,baseDelayMs:10,maxDelayMs:40,health:async()=>healthy,start:async()=>{starts++;owned=new EventEmitter();owned.pid=starts;owned.kill=()=>owned.emit('exit');return owned;}});
  await recovery.tick();assert.equal(starts,1);owned.emit('exit');await recovery.tick();assert.equal(starts,1);
  now=10;await recovery.tick();assert.equal(starts,2);owned.emit('exit');now=20;await recovery.tick();assert.equal(starts,2);
  now=30;await recovery.tick();assert.equal(starts,3);healthy=true;await recovery.tick();assert.equal(recovery.status().restarts,0);recovery.stop();
  const foreign=createRecoverySupervisor({health:async()=>true,start:async()=>{throw Error('Must not spawn alongside healthy server');}});await foreign.tick();assert.equal(foreign.status().managedPid,null);
  console.log('Server PASS: version/health, localhost'+(addresses.length>1?' and LAN':' (LAN NOT RUN: no interface)')+', malformed JSON isolation, isolated server restart/report retention, structured safe logs, fatal exception/rejection controlled exit, recovery backoff (mock supervisor).');
}finally{await running?.stop();await workspace.cleanup();}
