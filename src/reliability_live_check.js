import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import {DailyAgentOrchestrator} from './services/daily_agent_orchestrator.js';
import {MorningStore,MorningPortfolioStore} from './services/morning_store.js';
if(process.env.KSTOCK_LIVE_TRADING_ENABLED==='true')throw new Error('LIVE_TRADING_MUST_BE_DISABLED');
const root=path.resolve('tmp/reliability/live-'+new Date().toISOString().replaceAll(':','-'));
const service=new DailyAgentOrchestrator({store:new MorningStore(path.join(root,'daily')),portfolio:new MorningPortfolioStore()});
const timer=setTimeout(()=>service.cancel(),20*60000);
try{
  const result=await service.start({force:true,scope:'all'}).completion;
  const summary={at:new Date().toISOString(),status:result.status,session:result.session,sourceTradingDate:result.sourceTradingDate,pipeline:result.pipeline,errors:result.errors,agents:Object.fromEntries(Object.entries(result.agentStatus).map(([k,v])=>[k,v.status])),portfolioCount:result.portfolioExitStatus.length,automaticOrders:false};
  await fs.writeFile(path.join(root,'summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify({...summary,reportDirectory:root},null,2));
  if(result.status==='FAILED')process.exitCode=1;
}finally{clearTimeout(timer);}
