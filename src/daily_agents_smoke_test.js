import {requestDelay} from './services/request_context.js';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import express from 'express';
import {DailyAgentOrchestrator,AGENTS} from './services/daily_agent_orchestrator.js';
import {MorningStore,MorningPortfolioStore} from './services/morning_store.js';
import {createMorningScheduler,morningConfig} from './services/morning_scheduler.js';
import {flowData,technicalData,overnightNews,riskData,committeeData,bearData,exitData} from './services/morning_analysis.js';
import {registerMorningRoutes} from './morning_routes.js';
import {buildInvestmentCommittee} from './services/investment_committee_service.js';
import {classifyDisclosures} from './services/disclosure_classifier.js';
import {buildInvestmentIndicators} from './services/investment_indicators_service.js';
const root=await fs.mkdtemp(path.join(os.tmpdir(),'kstock-morning-'));
const now=()=>new Date('2026-09-10T22:00:00Z');
const quote={price:2000,per:10,pbr:1,eps:200,bps:2000,listedShares:1000000,week52High:2400,week52Low:1000,tradingValue:1e10};
const history=Array.from({length:140},(_,i)=>{const d=new Date('2026-09-10T00:00:00Z');d.setUTCDate(d.getUTCDate()-i);return {date:d.toISOString().slice(0,10).replaceAll('-',''),close:2000-i*2,open:2000,high:2010,low:1980,volume:10000,foreignNetBuyQty:100,institutionNetBuyQty:100,personalNetBuyQty:-200};});
const dart={financials:{validation:{ok:true},current:{revenue:1e9,netIncome:1e8,assets:5e9,equity:4e9},metrics:{roeApproxPct:15,netIncomeGrowthPct:10}},scorecard:{score:65,maxScore:80},
  agents:{company:{strengths:['growth'],weaknesses:[]},dart:{impact:'NEUTRAL'},risk:{riskScore:20,riskLevel:'LOW',risks:[],criticalRisk:false}}};
const entry={version:'ENTRY_SNAPSHOT_V1',stockCode:'000001',corpName:'fixture',buyPrice:1900,quantity:1342,stopLossPct:-7,takeProfitPct:10,registeredAt:'2026-09-01T00:00:00Z',thesis:{committeeScore:70,technical:{trend:'UPTREND'},flow:{combinedSmartMoneyQty5d:500},riskScore:20,marketRegime:'RISK_ON',newsSentiment:'NEUTRAL',entryReasons:['original thesis'],invalidConditions:['original invalid condition']}};
let kisActive=0,kisMax=0,quoteCalls=0;
const kis=async(value)=>{kisActive++;kisMax=Math.max(kisMax,kisActive);await new Promise(r=>setTimeout(r,1));kisActive--;return structuredClone(value);};
const deps={
  market:async({endDate})=>{assert.equal(endDate,'20260910');return kis({kospi:{latestDate:'20260910'},kosdaq:{latestDate:'20260910'},score:{status:'READY',score:15,max:20,regime:'RISK_ON'}});},
  screen:async options=>{assert.equal(options.enrich,0);assert.equal(options.top,60);return {scanned:3989,top:Array.from({length:60},(_,i)=>({code:String(i+1).padStart(6,'0'),name:'Fixture '+i,preScore:70,roe:15,marketCapEok:1000,prevVolume:10000,industryLarge:'sector'+i%3}))};},
  quote:async()=>{quoteCalls++;return kis(quote);},chart:async()=>kis({rows:history}),flow:async()=>kis({rows:[{...history[0],date:'20260911',foreignNetBuyQty:0,institutionNetBuyQty:0,personalNetBuyQty:0},...history]}),
  dart:async()=>structuredClone(dart),disclosures:async()=>({list:[{report_nm:'감사보고서제출',rcept_dt:'20260910',rcept_no:'test'}],complete:true}),
  news:async()=>({items:[],rows:0})
};
const make=async(name,overrides={})=>{
  const store=new MorningStore(path.join(root,name,'daily')),portfolio=new MorningPortfolioStore(path.join(root,name,'portfolio.json'));
  await portfolio.upsert(entry);
  return new DailyAgentOrchestrator({store,portfolio,dependencies:{...deps,...overrides},now});
};
let server;
try{
  const service=await make('success');
  const {completion}=service.start();
  assert.throws(()=>service.start(),/MORNING_BUSY/);
  const result=await completion;
  assert.equal(result.status,'SUCCESS',JSON.stringify(result.errors));
  assert.equal(result.pipeline.candidatePool,60);assert.equal(result.pipeline.quoteRequested,20);assert.equal(quoteCalls,20);
  assert.equal(result.pipeline.deepRequested,5);assert.equal(kisMax,1);
  assert.equal(result.topCandidates.length,5);assert.ok(result.topCandidates.every(x=>x.entryState));
  const committees=JSON.parse(await fs.readFile(service.store.file('2026-09-11','committee'),'utf8'));assert.equal(Object.values(committees).filter(x=>x?.status).length,5);
  assert.deepEqual(result.stages.map(x=>x.index),[1,2,3,4,5,6,7,8,9,10]);
  assert.deepEqual(Object.keys(result.agentStatus),AGENTS);
  assert.ok(Object.values(result.agentStatus).every(x=>x.status==='SUCCESS'&&x.startedAt&&x.completedAt&&x.durationMs>=0));
  assert.equal(result.portfolioExitStatus.length,1);assert.equal(result.portfolioExitStatus[0].currentPrice,2000);
  assert.deepEqual(result.portfolioExitStatus[0].entrySnapshot,entry);
  assert.equal(result.portfolioExitStatus[0].pnlAmount,134200);
  const reload=new MorningStore(service.store.root);
  assert.deepEqual(await reload.read('2026-09-11'),result);
  assert.equal((await reload.latest()).date,'2026-09-11');
  for(const name of ['market','disclosures','news','candidates','committee','entry','exit','daily-report'])await fs.access(service.store.file('2026-09-11',name));
  const before=quoteCalls;assert.equal((await service.start().completion).duplicateSkipped,true);assert.equal(quoteCalls,before);
  const restart=new DailyAgentOrchestrator({store:reload,portfolio:service.portfolio,dependencies:deps,now});
  assert.equal((await restart.start().completion).duplicateSkipped,true);
  await service.start({force:true,scope:'portfolio'}).completion;
  assert.equal(quoteCalls,before+1,'Portfolio-only revalidation must not screen or quote 20 candidates');

  const portfolioFirst=await make('portfolio-first');await portfolioFirst.start({scope:'portfolio'}).completion;
  const fullAfterPortfolio=await portfolioFirst.start().completion;
  assert.equal(fullAfterPortfolio.duplicateSkipped,undefined);assert.equal(fullAfterPortfolio.pipeline.quoteRequested,20);
  const failed=await make('partial',{news:async()=>{throw new Error('SECRET_PROVIDER_RESPONSE');}});
  const partial=await failed.start().completion;
  assert.equal(partial.status,'PARTIAL');
  assert.equal(partial.agentStatus.NewsAgent.status,'FAILED');
  assert.equal(partial.agentStatus.TechnicalAgent.status,'SUCCESS');
  assert.equal(partial.agentStatus.ExitAgent.status,'PARTIAL');
  assert.equal(partial.portfolioExitStatus[0].status,'WATCH');
  assert.equal(partial.portfolioExitStatus[0].exitPressure,null);
  assert.ok(!JSON.stringify(partial).includes('SECRET_PROVIDER_RESPONSE'));
  const beforeRetry=quoteCalls;
  const retryService=new DailyAgentOrchestrator({store:failed.store,portfolio:failed.portfolio,dependencies:deps,now});
  const retried=await retryService.start({retryFailed:true}).completion;
  assert.equal(retried.status,'SUCCESS');assert.ok(retried.reusedTasks>0);assert.equal(quoteCalls,beforeRetry,'Successful quote stages must be reused');
  const mixed=await make('mixed',{news:async({stockCode})=>{if(stockCode==='000001')throw new Error('provider');return {items:[]};}});
  assert.equal((await mixed.start().completion).agentStatus.NewsAgent.status,'PARTIAL');
  const cancelled=await make('cancelled',{market:async()=>{await requestDelay(30000);return null;}});
  const pendingCancel=cancelled.start().completion;await new Promise(r=>setTimeout(r,30));cancelled.cancel();assert.equal((await pendingCancel).status,'CANCELLED');
  let cancelledRetries=0;await createMorningScheduler({active:null,store:cancelled.store,start(){cancelledRetries++;return {completion:Promise.resolve()};}},{env:{KSTOCK_DAILY_ORCHESTRATOR_ENABLED:'true'},now}).tick();assert.equal(cancelledRetries,0);
  const noScreen=await make('screen-failed',{screen:async()=>{throw new Error('screen');}});
  const screenResult=await noScreen.start().completion;
  assert.equal(screenResult.status,'FAILED');assert.equal(screenResult.portfolioExitStatus.length,1);
  const noPrice=await make('no-price',{chart:async()=>({rows:[]})});
  const noPriceResult=await noPrice.start().completion;
  assert.equal(noPriceResult.portfolioExitStatus[0].currentPrice,null);assert.equal(noPriceResult.portfolioExitStatus[0].status,'WATCH');
  const closedHistory=[{...history[0],date:'20260911'},...history];
  const weekend=await make('weekend',{
    market:async({endDate})=>{assert.equal(endDate,'20260911');return {kospi:{latestDate:'20260911'},kosdaq:{latestDate:'20260911'},score:{status:'READY',score:15,max:20,regime:'RISK_ON'}};},
    chart:async()=>({rows:closedHistory}),flow:async()=>({rows:closedHistory})
  });
  weekend.now=()=>new Date('2026-09-13T22:00:00Z');
  const automatic=createMorningScheduler(weekend,{env:{KSTOCK_DAILY_ORCHESTRATOR_ENABLED:'true'},now:weekend.now,setTimer:()=>({unref(){}}),clearTimer:()=>{}});
  automatic.start();
  let weekendReport;
  for(let i=0;i<300;i++){
    weekendReport=await weekend.store.read('2026-09-14');
    if(weekendReport&&!weekend.active)break;
    await new Promise(resolve=>setTimeout(resolve,20));
  }
  automatic.stop();
  assert.equal(weekendReport?.status,'SUCCESS','07:00 startup must generate a report without a button');
  assert.equal(weekendReport.engineVersion,'2.6.4');assert.ok(weekendReport.runId);assert.ok(['READY','FALLBACK','STALE','FAILED'].includes(weekendReport.tradingCalendarStatus));
  assert.equal(weekendReport.session,'PRE_MARKET');assert.equal(weekendReport.tradingDay,true);
  assert.equal(weekendReport.sourceTradingDate,'2026-09-11');
  assert.ok(Object.values(weekendReport.agentStatus).every(x=>x.status==='SUCCESS'));
  assert.equal(weekendReport.automaticOrders,false);assert.ok(weekendReport.topCandidates.every(x=>x.automaticBuy===false));
  const weekendRestart=new DailyAgentOrchestrator({store:new MorningStore(weekend.store.root),portfolio:weekend.portfolio,dependencies:deps,now:weekend.now});
  assert.equal((await weekendRestart.start({retryFailed:true}).completion).duplicateSkipped,true);
  console.log('Autonomous Monday 07:00 fixture: 14 agents SUCCESS, candidates=5, entry=5, exit=1, last-session basis, restart duplicate skipped.');
  const flow=flowData({rows:[{...history[0],date:'20260911',foreignNetBuyQty:0},...history]},'2026-09-10');
  assert.equal(flow.metrics.foreign.netBuyValue20d,null);assert.equal(flow.metrics.combinedSmartMoneyValue20d,null);assert.equal(flow.metrics.foreign.latestQty,100);assert.equal(flow.metrics.combinedSmartMoneyQty5d,1000);
  assert.throws(()=>flowData({rows:[]},'2026-09-10'),/FLOW/);
  assert.throws(()=>flowData({rows:history.map(x=>({...x,foreignNetBuyQty:null}))},'2026-09-10'),/FLOW/);
  assert.throws(()=>technicalData({rows:history.slice(1)},quote,'2026-09-10'),/PRICE/);
  const news=overnightNews({items:[{title:'duplicate',publishedAt:'2026-09-10T07:00:00Z'},{title:'duplicate',publishedAt:'2026-09-10T08:00:00Z'},{title:'old',publishedAt:'2026-09-10T01:00:00Z'},{title:'future',publishedAt:'2026-09-11T23:00:00Z'}]},'2026-09-10',now());
  assert.equal(news.items.length,1);
  const committeeInput={dart,valuation:{score:15,max:20},technical:{score:15,max:20},flow:{score:15,max:20},market:{score:15,max:20},news:{score:5,max:20,highRiskEvents:[{title:'횡령 의혹'}]},completeness:{percent:100}};
  assert.equal(buildInvestmentCommittee(committeeInput).hardStop,false,'Title-only news cannot hard stop');
  assert.equal(buildInvestmentCommittee({...committeeInput,valuation:{score:null,max:20}}).totalScore,null);
  assert.equal(classifyDisclosures({list:[{report_nm:'감사보고서제출'}]}).critical,false);
  assert.equal(buildInvestmentIndicators({quote:{per:10},financials:{metrics:{netIncomeGrowthPct:-10}}}).values.peg,null);
  const noDataExit=exitData(entry,null,null,now());assert.equal(noDataExit.currentPrice,null);assert.equal(noDataExit.status,'WATCH');
  assert.equal(morningConfig({}).enabled,false);
  assert.throws(()=>morningConfig({KSTOCK_TIMEZONE:'UTC'}),/INVALID/);
  let calls=0,registered=0;
  const fake={active:null,store:{read:async()=>null},start:()=>{calls++;return {completion:Promise.resolve()};}};
  const off=createMorningScheduler(fake,{env:{},now,setTimer:()=>{registered++;return 1;}});
  off.start();await off.tick();assert.equal(calls,0);assert.equal(registered,0);
  const enabled={KSTOCK_DAILY_ORCHESTRATOR_ENABLED:'true'};
  await createMorningScheduler(fake,{env:enabled,now:()=>new Date('2026-09-10T21:59:00Z')}).tick();assert.equal(calls,0);
  const on=createMorningScheduler(fake,{env:enabled,now});await on.tick();await on.tick();assert.equal(calls,1);
  await createMorningScheduler(fake,{env:enabled,now:()=>new Date('2026-09-11T22:00:00Z')}).tick();assert.equal(calls,1);
  const closed=process.env.KSTOCK_MARKET_CLOSED_DATES;process.env.KSTOCK_MARKET_CLOSED_DATES='2026-09-11';
  await createMorningScheduler(fake,{env:enabled,now}).tick();assert.equal(calls,1);
  if(closed===undefined)delete process.env.KSTOCK_MARKET_CLOSED_DATES;else process.env.KSTOCK_MARKET_CLOSED_DATES=closed;
  await createMorningScheduler({...fake,store:{read:async()=>({status:'SUCCESS'})}},{env:enabled,now}).tick();assert.equal(calls,1);
  await assert.rejects(service.portfolio.upsert({...entry,buyPrice:null}),/INVALID_ENTRY/);
  const originals=await service.portfolio.read();await service.portfolio.upsert({...entry,buyPrice:3000},{onlyIfMissing:true});assert.deepEqual(await service.portfolio.read(),originals);
  const app=express();app.use(express.json());registerMorningRoutes(app,service,off);server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const base='http://127.0.0.1:'+server.address().port;
  for(const route of ['latest','agents/status','candidates','portfolio','report']){const response=await fetch(base+'/api/daily/'+route);assert.equal(response.status,200);assert.equal((await response.json()).success,true);}
  assert.equal((await fetch(base+'/api/daily/run',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"force":"yes"}'})).status,400);
  assert.equal((await fetch(base+'/api/daily/portfolio',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"entry":{}}'})).status,400);
  const savedEntry=await fetch(base+'/api/daily/portfolio',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({entry:{...entry,stockCode:'000009'}})});assert.equal(savedEntry.status,200);
  assert.equal((await fetch(base+'/api/daily/portfolio/000009',{method:'DELETE'})).status,200);assert.ok(!(await service.portfolio.read()).some(x=>x.entry.stockCode==='000009'));
  await Promise.all([2,3,4].map(i=>service.portfolio.upsert({...entry,stockCode:String(i).padStart(6,'0')})));assert.equal((await service.portfolio.read()).length,4);
  console.log('Daily agents: orchestration, order, partial/failure isolation, bounded sequential KIS, persistence/restart, candidates/committee/entry/exit, missing/zero/stale data, semantic/news risk, scheduler, API and portfolio concurrency passed (offline fixtures).');
}finally{if(server)await new Promise(r=>server.close(r));await fs.rm(root,{recursive:true,force:true});}
