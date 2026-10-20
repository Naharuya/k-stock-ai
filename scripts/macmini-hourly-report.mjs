import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {programSummary,cyclePolicy,cycleRequest} from './macmini-program-policy.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const directory=path.join(root,'data/v2/verification/macmini-hourly');
const hold='/Users/ari/ARI/jini-agent/automation/KSTOCK_AUTO_HOLD';
const endpoint='http://127.0.0.1:8790';
fs.mkdirSync(directory,{recursive:true,mode:0o700});
const lock=path.join(directory,'runner.lock');
try{const fd=fs.openSync(lock,'wx',0o600);fs.writeFileSync(fd,String(process.pid));fs.closeSync(fd);}
catch{let pid;try{pid=Number(fs.readFileSync(lock,'utf8'));process.kill(pid,0);process.exit(0);}catch{if(Number.isInteger(pid)&&pid>0){fs.unlinkSync(lock);}else process.exit(1);}fs.writeFileSync(lock,String(process.pid),{flag:'wx',mode:0o600});}
async function call(route,body,timeout=20000){
 const r=await fetch(endpoint+route,{method:body?'POST':'GET',headers:body?{'content-type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(timeout)});
 if(!r.ok)throw new Error('BRIDGE_HTTP_'+r.status);return r.json();
}
function progress(){try{return programSummary(JSON.parse(fs.readFileSync(path.join(root,'data/v2/verification/macmini-program/progress.json'),'utf8')));}catch{return programSummary(null);}}
function blockedCount(){
 try{const dir=path.join(root,'data/v2/verification/jini-jobs');const jobs=fs.readdirSync(dir).filter(n=>/^[a-f0-9-]+\.json$/.test(n)).map(n=>({file:path.join(dir,n),time:fs.statSync(path.join(dir,n)).mtimeMs})).sort((a,b)=>b.time-a.time).slice(0,3);let count=0;for(const j of jobs){if(JSON.parse(fs.readFileSync(j.file,'utf8')).status!=='BLOCKED')break;count++;}return count;}catch{return 0;}
}
function snapshot(job){
 const status=job?.status||'NOT_RUN';
 const delayed=status==='RUNNING'&&Date.now()-Date.parse(job.startedAt)>45*60000;
 const program=progress(),policy=cyclePolicy(job,blockedCount(),program);
 return {program,cycleMode:policy.mode,checkedAt:new Date().toISOString(),status:delayed?'DELAYED':status==='EVIDENCE_RECORDED'?'REVIEW_REQUIRED':status,jobId:job?.jobId||null,startedAt:job?.startedAt||null,finishedAt:job?.finishedAt||null,changedFiles:job?.writes||[],tests:(job?.tasks||[]).filter(t=>t.task==='kstock-offline-test').map(t=>({task:t.task,status:t.status,totals:t.totals})),sourceCollection:'NOT_RUN',recommendation:'HOLD',reportPath:job?.reportPath||null,next:status==='RUNNING'?'기존 작업 진행 확인; 중복 실행하지 않음':status==='EVIDENCE_RECORDED'?'단일 작업 근거 제출됨; 전체 완료 아님; 다음 미완료 단계 계속':'승인된 미완료 구현·테스트 재개'};
}
async function publish(report,suffix){
 const name=report.checkedAt.replace(/[^0-9]/g,'')+'-'+suffix;
 const text='# KSTOCK Mac mini 시간별 업무 보고\n\n```json\n'+JSON.stringify(report,null,2)+'\n```\n';
 fs.writeFileSync(path.join(directory,name+'.md'),text,{mode:0o600,flag:'wx'});
 let delivery='DELIVERED';try{const result=await call('/bridge',{file:'JINI_TO_ARI.md',text});if(result.ok!==true)delivery='FAILED';}catch{delivery='FAILED';}
 fs.writeFileSync(path.join(directory,name+'.json'),JSON.stringify({...report,delivery},null,2)+'\n',{mode:0o600,flag:'wx'});
 console.log(JSON.stringify({status:report.status,delivery,report:name+'.md'}));
}
const tradingMode=fs.existsSync(path.join(root,'docs/KSTOCK_TRADING_WORKER_ORDER.md'));
function runTradingCycle(){
 const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!/(KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL|AUTHORIZATION)/i.test(k)));
 const master=spawnSync('/usr/bin/python3',[path.join(root,'scripts/refresh-trading-instruments.py')],{cwd:root,env,encoding:'utf8',timeout:150000,maxBuffer:1000000});
 if(master.status!==0)return {status:'BLOCKED',reason:'MASTER_REFRESH_FAILED',next:'공식 마스터 조회 오류 확인; 원문 오류에 비밀값을 포함해 공유하지 않음'};
 const task=spawnSync(process.execPath,[path.join(root,'scripts/run-trading-data-cycle.mjs'),'--approved-read-only'],{cwd:root,env,encoding:'utf8',timeout:150000,maxBuffer:1000000});
 let value;for(const line of String(task.stdout||'').split('\n'))try{value=JSON.parse(line);}catch{}
 if(!value)return {status:'BLOCKED',reason:'TRADING_CYCLE_RESULT_UNAVAILABLE',exitCode:task.status};
 const sync=spawnSync('/usr/bin/python3',[path.join(root,'scripts/sync-trading-data.py'),'--publish'],{cwd:root,env,encoding:'utf8',timeout:150000,maxBuffer:1000000});
 let synced;try{synced=JSON.parse(sync.stdout);}catch{}
 return {status:value.status,universeSecurities:value.universeSecurities??null,uniqueAttempted:value.uniqueAttempted??null,observed:value.observed??null,refreshAttempts:value.refreshAttempts??null,externalHttpRequests:value.externalHttpRequests??null,reason:value.reason||null,exitCode:task.status,publicMarketSync:sync.status===0&&synced?.published===true?'PUBLISHED':'FAILED',syncedFiles:synced?.files??null};
}
try{
 let report;
 try{const state=await call('/developer/status?project=K-STOCK');report=snapshot(state.latestJob);}catch{report={checkedAt:new Date().toISOString(),status:'BLOCKED',reason:'JINI_STATUS_UNAVAILABLE',next:'JINI 연결 복구 필요'};await publish(report,'hourly');process.exitCode=1;}
 if(report?.jobId||report?.status==='NOT_RUN'){
  if(fs.existsSync(hold)){report.status='PAUSED';report.next='HOLD 유지 중; 상태 보고만 수행';}
  await publish(report,'hourly');
  if(!tradingMode&&!fs.existsSync(hold)&&!['RUNNING','DELAYED'].includes(report.status)&&report.cycleMode!=='INDEPENDENT_FINAL_REVIEW_REQUIRED'&&!process.argv.includes('--report-only')){
   const order=fs.readFileSync(path.join(root,'docs/KSTOCK_MACMINI_CONTINUOUS_PROMPT.md'),'utf8');
   try{
    await call('/developer/run',{project:'K-STOCK',request:cycleRequest(order,report.program,report.cycleMode)},30*60000);
    const state=await call('/developer/status?project=K-STOCK');await publish(snapshot(state.latestJob),'result');
   }catch{await publish({checkedAt:new Date().toISOString(),status:'BLOCKED',reason:'EXECUTION_RESPONSE_UNAVAILABLE',next:'기존 작업 상태를 다음 주기에 재확인; 이번 주기 재요청 없음'},'result');process.exitCode=1;}
  }
 }
 if(tradingMode&&!fs.existsSync(hold)&&!process.argv.includes('--report-only')){
  const tradingRefresh=runTradingCycle();await publish({checkedAt:new Date().toISOString(),status:tradingRefresh.status,tradingRefresh,sourceCollection:'MARKET_DATA_READ_ONLY',recommendation:'HOLD',next:'다음 시간별 미완료 시세 배치 계속; 공개 마스터/일봉만 동기화'},'trading-result');
 }
}finally{fs.unlinkSync(lock);}
