import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {MorningStore} from './services/morning_store.js';
import {seoulClock} from './services/trading_day_service.js';
import {AGENTS} from './services/daily_agent_orchestrator.js';
export const projectRoot=fileURLToPath(new URL('../',import.meta.url));
export async function testWorkspace(){
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'kstock-server-'));
  const date=seoulClock().date,at=new Date().toISOString();
  const version=JSON.parse(await fs.readFile(path.join(projectRoot,'package.json'),'utf8')).version;
  const agentStatus=Object.fromEntries(AGENTS.map(agent=>[agent,{agent,status:'SUCCESS',startedAt:at,completedAt:at}]));
  const report={version,date,scope:'all',session:'PRE_MARKET',startedAt:at,completedAt:at,status:'SUCCESS',sourceTradingDate:date,
    marketRegime:'NEUTRAL_MIXED',topCandidates:Array.from({length:5},(_,i)=>({code:String(i+1).padStart(6,'0'),name:'OFFLINE FIXTURE '+i,entryState:'WATCH',automaticBuy:false})),
    riskCandidates:[],portfolioExitStatus:[],newRiskCount:0,agentStatus,errors:[],automaticOrders:false};
  const store=new MorningStore(path.join(root,'.data','daily'));await store.save(report);await store.progress(date,{agentStatus});
  return {root,report,store,async cleanup(){if(!path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep))throw Error('Unsafe test cleanup');await fs.rm(root,{recursive:true,force:true});}};
}
export async function startTestServer(root){
  const env={...process.env,DOTENV_CONFIG_PATH:path.join(root,'missing.env'),PORT:'0',KSTOCK_PROFILE:'local-owner',KSTOCK_AI_MODE:'mock',
    KSTOCK_LIVE_TRADING_ENABLED:'false',KSTOCK_DAILY_AGENT_ENABLED:'false',KSTOCK_DAILY_ORCHESTRATOR_ENABLED:'false',KSTOCK_CALENDAR_SYNC_ENABLED:'false',KSTOCK_BROKER_ENABLED:'false',KSTOCK_DART_ENABLED:'false',KSTOCK_TLS_CERT:'',KSTOCK_TLS_KEY:''};
  const child=spawn(process.execPath,[path.join(projectRoot,'src','server.js')],{cwd:root,env,windowsHide:true,stdio:['ignore','pipe','pipe']});
  let output='',errors='';child.stderr.on('data',data=>errors+=data);
  const port=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{child.kill();reject(Error('TEST_SERVER_START_TIMEOUT'));},10000);
    child.once('error',()=>{clearTimeout(timer);reject(Error('TEST_SERVER_START_FAILED'));});
    child.once('exit',()=>{clearTimeout(timer);reject(Error('TEST_SERVER_EARLY_EXIT'));});
    child.stdout.on('data',data=>{output+=data;for(const line of output.split('\n'))try{const r=JSON.parse(line);if(r.event==='SERVER_LISTENING'){clearTimeout(timer);resolve(r.port);}}catch{}});
  });
  return {child,port,base:'http://localhost:'+port,logs:()=>output+errors,async stop(){if(child.exitCode!==null)return;await new Promise(resolve=>{child.once('exit',resolve);child.kill();});}};
}
export function lanIPv4(){return [...new Set(Object.values(os.networkInterfaces()).flat().filter(x=>x?.family==='IPv4'&&!x.internal&&!x.address.startsWith('169.254.')).map(x=>x.address))];}
