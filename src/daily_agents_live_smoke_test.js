import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import {DailyAgentOrchestrator} from './services/daily_agent_orchestrator.js';
import {MorningStore,MorningPortfolioStore} from './services/morning_store.js';
// Explicit live, read-only integration check. Isolated portfolio and reports; no production holdings are created.
if(process.env.KSTOCK_BROKER_ENABLED!=='true')throw new Error('KIS_DISABLED');
if(process.env.KSTOCK_LIVE_TRADING_ENABLED==='true')throw new Error('LIVE_TRADING_FLAG_MUST_BE_FALSE');
const root=path.resolve('tmp/morning-live');
const portfolio=new MorningPortfolioStore(path.join(root,'positions.json'));
await portfolio.upsert({version:'ENTRY_SNAPSHOT_V1',stockCode:'003280',corpName:'흥아해운',buyPrice:1900,quantity:1342,stopLossPct:-7,takeProfitPct:10,
  registeredAt:'2026-09-01T00:00:00Z',note:'INTEGRATION_FIXTURE_ONLY: no historical investment thesis supplied',thesis:{committeeScore:null}});
const service=new DailyAgentOrchestrator({store:new MorningStore(path.join(root,'daily')),portfolio});
const result=await service.start({force:true,scope:'portfolio'}).completion;
await fs.writeFile(path.join(root,'summary.json'),JSON.stringify({version:result.version,date:result.date,status:result.status,
  sourceTradingDate:result.sourceTradingDate,agentStatus:result.agentStatus,errors:result.errors,exit:result.portfolioExitStatus},null,2));
console.log(JSON.stringify({status:result.status,sourceTradingDate:result.sourceTradingDate,agents:Object.fromEntries(Object.entries(result.agentStatus).map(([k,v])=>[k,v.status])),
  exit:result.portfolioExitStatus.map(x=>({stockCode:x.stockCode,currentPrice:x.currentPrice,status:x.status,dataStatus:x.dataStatus})),errors:result.errors},null,2));
if(result.status==='FAILED')process.exitCode=1;
