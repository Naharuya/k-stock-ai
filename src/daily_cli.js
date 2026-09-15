import 'dotenv/config';
import { DailyTradingService } from './services/daily_trading_service.js';
const kind=process.argv[2];
if(!['after-market','pre-market'].includes(kind)) {
  console.error('Usage: node src/daily_cli.js after-market|pre-market');
  process.exitCode=1;
} else {
  try {
    const service=new DailyTradingService();
    const result=await service.start(kind).completion;
    console.log(JSON.stringify({kind,generatedAt:result.generatedAt,sourceTradingDate:result.sourceTradingDate,
      targetTradingDate:result.targetTradingDate,candidates:result.candidates.length,diagnostics:result.diagnostics,errors:result.errors},null,2));
    if(result.errors.length)process.exitCode=1;
  } catch(error) {console.error(JSON.stringify({success:false,error:error.message}));process.exitCode=1;}
}
