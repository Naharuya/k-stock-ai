import {validDay} from './accounting_periods.js';
import {measureActionAwareReturns} from './corporate_actions.js';
import {measureIndexPerformance,compareBenchmarkReturns} from './benchmark_data.js';
export function measureStockBenchmark(history,review,index,{includeDividends=false}={}) {
  const fail=reason=>({status:'PENDING',reason});
  if(history?.basis!=='RAW'||history.priceContract?.verified!==true||review?.status!=='VERIFIED'||review.priceBasis!=='RAW')return fail('CORPORATE_ACTION_COVERAGE_REQUIRED');
  const a=history.sessions,b=index?.sessions;
  if(![a,b].every(x=>Array.isArray(x)&&x.length>=2&&x.length<=1000&&x.every((r,i)=>validDay(r.date)&&Number.isFinite(r.close)&&r.close>0&&(!i||x[i-1].date<r.date))))return fail('PRICE_SERIES_INVALID');
  const fromDate=[a[0].date,b[0].date].sort().at(-1),toDate=[a.at(-1).date,b.at(-1).date].sort()[0];
  if(fromDate>=toDate)return fail('COMMON_OBSERVATION_RANGE_MISSING');
  const prices=a.filter(x=>x.date>=fromDate&&x.date<=toDate),indices=b.filter(x=>x.date>=fromDate&&x.date<=toDate);
  if(JSON.stringify(prices.map(x=>x.date))!==JSON.stringify(indices.map(x=>x.date)))return fail('TRADING_CALENDAR_MISMATCH');
  if(!validDay(review.fromDate)||!validDay(review.toDate)||review.fromDate>fromDate||review.toDate<toDate||!Array.isArray(review.events))return fail('ACTION_RANGE_INCOMPLETE');
  const stock=measureActionAwareReturns(prices,{...review,fromDate,toDate,events:review.events.filter(e=>e.date>=fromDate&&e.date<=toDate)},{includeDividends});
  const benchmark=measureIndexPerformance({...index,sessions:indices});
  const comparison=compareBenchmarkReturns(stock,benchmark);
  if(comparison.status!=='READY')return comparison;
  return {...comparison,fromDate,toDate,sessionCount:prices.length,stock,benchmark,index:index.index,annualized:false,warning:'OBSERVED_STOCK_PRICE_RETURN_NOT_RECOMMENDATION_OR_PAPER_EXECUTION'};
}
export function measureVerifiedStockPeriod(history,review,{fromDate,toDate}={}){
  const fail=reason=>({status:'PENDING',reason,fromDate,toDate,returnPct:null});
  if(!validDay(fromDate)||!validDay(toDate)||fromDate>=toDate||history?.basis!=='RAW'||history.priceContract?.verified!==true||!Array.isArray(history.sessions))return fail('PERIOD_OR_RAW_PRICE_INVALID');
  if(review?.status!=='VERIFIED'||!validDay(review.fromDate)||!validDay(review.toDate)||review.fromDate>fromDate||review.toDate<toDate||!Array.isArray(review.events))return fail('ACTION_RANGE_INCOMPLETE');
  const sessions=history.sessions.filter(x=>x.date>=fromDate&&x.date<=toDate);
  if(sessions[0]?.date!==fromDate||sessions.at(-1)?.date!==toDate)return fail('EXACT_OBSERVATIONS_REQUIRED');
  const result=measureActionAwareReturns(sessions,{...review,fromDate,toDate,events:review.events.filter(e=>e.date>=fromDate&&e.date<=toDate)});
  if(result.status!=='READY')return {...result,returnPct:null};
  return {...result,fromDate,toDate,startPrice:sessions[0].close,endPrice:sessions.at(-1).close,priceType:'RAW_PRICE',returnPct:result.points.at(-1).cumulativeReturnPct,corporateActionStatus:'VERIFIED',source:history.source,calculationMethod:'VERIFIED_ACTION_AWARE_PRICE_RETURN',recommendationEligible:false};
}
export function createStockPerformanceService({loadCandidates,loadBenchmarks}={}){
  return {async load(ticker){
    if(!/^\d{6}$/.test(ticker||''))return {success:false,status:'INVALID_INPUT'};
    const report=await loadCandidates(),data=await loadBenchmarks();
    if(report.status==='STALE'||data.status==='STALE')return {success:true,status:'PENDING',reason:'SOURCE_DATA_STALE'};
    const c=report.candidates?.find(x=>x.market==='KR'&&x.ticker===ticker);
    if(!c)return {success:true,status:'PENDING',reason:'STOCK_DATA_MISSING'};
    const source=c.krValuationAnalysis?.evidence,index=data.indices?.find(x=>x.index===c.exchange);
    const result=measureStockBenchmark(source?.priceHistory,source?.corporateActions,index);
    const benchmarks=['KOSPI','KOSDAQ'].map(name=>{
      const comparison=measureStockBenchmark(source?.priceHistory,source?.corporateActions,data.indices?.find(x=>x.index===name));
      return {index:name,...comparison,calculationStatus:comparison.status==='READY'?'READY':'BENCHMARK_BLOCKED'};
    });
    return {success:true,ticker,basis:'PRICE_RETURN',recommendationEligible:false,...result,calculationStatus:result.status==='READY'?'READY':'PERFORMANCE_BLOCKED',benchmarks};
  }};
}
export function registerStockPerformanceRoutes(app,service){
  app.get('/api/v2/stock-performance/:ticker',async(req,res)=>{res.set('Cache-Control','no-store');try{const data=await service.load(req.params.ticker);res.status(data.status==='INVALID_INPUT'?400:200).json(data);}catch{res.status(503).json({success:false,error:'STOCK_PERFORMANCE_UNAVAILABLE'});}});
}
