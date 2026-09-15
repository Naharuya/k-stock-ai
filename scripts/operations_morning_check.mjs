import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const kstDate=now=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
export function assess({date,now=new Date(),health,report,scheduler,events=[],logCoverage=false,api={}}){
 const scheduledAt=new Date(date+'T07:00:00+09:00');
 const agents=Object.fromEntries(Object.entries(report?.agentStatus||{}).map(([k,v])=>[k,v.status]));
 const result={date,checkedAt:now.toISOString(),scheduledAt:scheduledAt.toISOString(),verdict:'PENDING',lastRunAt:scheduler?.lastAttemptAt||null,lastRunStatus:scheduler?.status||null,lastRunId:scheduler?.runId||null,engineVersion:report?.engineVersion||null,reportScope:report?.scope||null,dailyReportStored:Boolean(report),morningBriefCreated:Boolean(report?.completedAt),candidateCount:report?.topCandidates?.length??null,agents,exitAgentStatus:agents.ExitAgent||null,exitCount:report?.portfolioExitStatus?.length??null,newRiskCount:report?.newRiskCount??null,tradingCalendarStatus:report?.tradingCalendarStatus||null,attempts:scheduler?.attempts??0,health:health?.ok===true,liveTrading:health?.liveTrading??null,api,findings:[],duplicateRunEvidence:'UNVERIFIED',crashEvidence:'UNVERIFIED',orderAudit:'No order calls made by this checker; live flag and report flags checked, not a complete historical order audit.'};
 const fail=[],partial=[];
 if(!health?.ok||health.version!=='2.6.4')fail.push('SERVER_HEALTH_OR_VERSION');
 if(health?.liveTrading!==false||report?.automaticOrders===true)fail.push('LIVE_TRADING_SAFETY');
 if(now<scheduledAt){result.findings=['SCHEDULE_NOT_DUE',...fail];result.verdict=fail.length?'FAIL':'PENDING';return result;}
 if(!report||!scheduler){result.findings=[...fail,'SCHEDULE_OR_REPORT_MISSING'];result.verdict=fail.length||now-scheduledAt>15*60000?'FAIL':'PENDING';return result;}
 if(report.scope!=='all')fail.push('NOT_A_FULL_DAILY_RUN');
 if(report.date!==date||report.engineVersion!=='2.6.4')fail.push('REPORT_DATE_OR_ENGINE_VERSION');
 if(!scheduler.runId||scheduler.runId!==report.runId)fail.push('SCHEDULE_REPORT_RUN_ID_MISMATCH');
 const started=Date.parse(scheduler.lastAttemptAt),reportStarted=Date.parse(report.startedAt);
 if(!Number.isFinite(started)||started<+scheduledAt||started>=+scheduledAt+60000)fail.push('NOT_OBSERVED_AT_0700');
 if(!Number.isFinite(reportStarted)||Math.abs(reportStarted-started)>60000)fail.push('ORCHESTRATOR_START_MISMATCH');
 if(report.status==='RUNNING'||scheduler.status==='RUNNING'){result.findings=[...fail,'RUN_IN_PROGRESS'];result.verdict=fail.length?'FAIL':'PENDING';return result;}
 if(!report.completedAt||['FAILED','CANCELLED','SKIPPED'].includes(report.status))fail.push('REPORT_NOT_COMPLETED');
 if(scheduler.attempts===1)result.duplicateRunEvidence='SINGLE_PERSISTED_SCHEDULER_ATTEMPT_MATCHING_REPORT';
 else {result.duplicateRunEvidence='MULTIPLE_OR_UNKNOWN_ATTEMPTS';partial.push('RETRY_OR_DUPLICATE_REQUIRES_REVIEW');}
 const windowEvents=events.filter(e=>Date.parse(e.at)>=+scheduledAt&&Date.parse(e.at)<=+now);
 const crashes=windowEvents.filter(e=>['UNCAUGHT_EXCEPTION','UNHANDLED_REJECTION','SERVER_SHUTDOWN_FAILED','SERVER_LISTEN_FAILED'].includes(e.event));
 if(crashes.length||windowEvents.filter(e=>e.event==='SERVER_LISTENING').length>1){fail.push('CRASH_OR_MULTIPLE_SERVER_STARTS');result.crashEvidence='FAILURE_EVENTS_FOUND';}
 else if(logCoverage)result.crashEvidence='NO_CRASH_EVENTS_IN_AVAILABLE_LOGS';else partial.push('CRASH_LOG_COVERAGE_UNVERIFIED');
 const required=['MarketAgent','NewsAgent','DARTAgent','ScreenerAgent','QuoteValidationAgent','FundamentalAgent','ValuationAgent','TechnicalAgent','FlowAgent','RiskAgent','BearAgent','InvestmentCommittee','EntryAgent','ExitAgent'];
 for(const agent of required){const value=agents[agent];if(value==='SUCCESS'||agent==='ExitAgent'&&value==='SKIPPED'&&report.portfolioExitStatus?.length===0)continue;partial.push(agent+':'+(value||'MISSING'));}
 if(!Array.isArray(report.topCandidates)||!Array.isArray(report.portfolioExitStatus))fail.push('CANDIDATE_OR_EXIT_RESULT_MISSING');
 if(report.status==='PARTIAL'||report.tradingCalendarStatus!=='READY')partial.push('PARTIAL_REPORT_OR_CALENDAR_FALLBACK');
 if(Object.values(api).some(v=>v!==200))fail.push('API_READ_FAILED');
 result.findings=[...fail,...partial];result.verdict=fail.length?'FAIL':partial.length?'PARTIAL':'PASS';return result;
}
export async function run(){
 const args=process.argv.slice(2);if(args.length>1)throw Error('INVALID_ARGUMENTS');
 const now=new Date(),date=args[0]||kstDate(now);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw Error('INVALID_DATE');
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 const read=f=>{try{return JSON.parse(fs.readFileSync(f,'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw Error('RECORD_READ_FAILED');}};
 const base=path.join(root,'.data','daily',date),report=read(path.join(base,'daily-report.json')),scheduler=read(path.join(base,'scheduler.json'));
 const events=[];const logs=path.join(root,'.data','logs','server');
 if(fs.existsSync(logs))for(const file of fs.readdirSync(logs).filter(f=>/^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f))){for(const line of fs.readFileSync(path.join(logs,file),'utf8').split('\n').filter(Boolean))events.push(JSON.parse(line));}
 const api={};let health=null;
 for(const endpoint of ['/health','/api/daily/latest','/api/daily/report','/api/daily/candidates','/api/daily/portfolio']){
  try{const r=await fetch('http://localhost:3000'+endpoint,{method:'GET',signal:AbortSignal.timeout(5000)});api[endpoint]=r.status;const b=await r.json();if(endpoint==='/health')health=b;else if(r.ok&&b.success!==true)api[endpoint]=502;}catch{api[endpoint]=0;}
 }
 const scheduledAt=Date.parse(date+'T07:00:00+09:00');
 const result=assess({date,now,health,report,scheduler,events,logCoverage:events.some(e=>e.event==='SERVER_LISTENING'&&Date.parse(e.at)<=scheduledAt),api});
 console.log(JSON.stringify(result,null,2));process.exitCode={PASS:0,PARTIAL:2,PENDING:2,FAIL:1}[result.verdict];
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))run().catch(()=>{console.log(JSON.stringify({verdict:'FAIL',error:'READ_ONLY_CHECK_FAILED'}));process.exitCode=1;});
