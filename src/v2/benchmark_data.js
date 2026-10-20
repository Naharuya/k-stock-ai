import { readFile, lstat } from 'node:fs/promises';
import { validDay } from './accounting_periods.js';
import { isD2Eligible, assertSafeKStockV2Environment } from './scoring.js';
export function normalizeIndexPrices(response,index,analysisDate,collectedAt) {
  if(!['KOSPI','KOSDAQ'].includes(index)||response?.rt_cd!=='0'||!Array.isArray(response.output2)||response.output2.length>1000)throw new Error('INDEX_RESPONSE_INVALID');
  const sessions=[],seen=new Set();
  for(const row of response.output2){
    const text=row.stck_bsop_date, date=typeof text==='string'&&/^\d{8}$/.test(text)?`${text.slice(0,4)}-${text.slice(4,6)}-${text.slice(6,8)}`:null;
    const close=typeof row.bstp_nmix_prpr==='string'&&/^\d+(\.\d+)?$/.test(row.bstp_nmix_prpr)?Number(row.bstp_nmix_prpr):NaN;
    if(!validDay(date)||!Number.isFinite(close)||close<=0||seen.has(date))throw new Error('INDEX_SESSION_INVALID');
    seen.add(date);if(isD2Eligible(`${date}T23:59:59+09:00`,analysisDate))sessions.push({date,close});
  }
  sessions.sort((a,b)=>a.date.localeCompare(b.date));
  return {index,code:index==='KOSPI'?'0001':'1001',basis:'PRICE_INDEX',source:'KIS',sourceUrl:'https://github.com/koreainvestment/open-trading-api',collectedAt,asOfDate:sessions.at(-1)?.date||null,status:sessions.length>=2?'READY':'INSUFFICIENT_DATA',sessions};
}
export function measureIndexPerformance(index) {
  if(index?.status!=='READY'||index.basis!=='PRICE_INDEX'||!Array.isArray(index.sessions)||index.sessions.length<2||index.sessions.some((x,i)=>!validDay(x.date)||!(Number.isFinite(x.close)&&x.close>0)||i>0&&index.sessions[i-1].date>=x.date))return {status:'PENDING',reason:'INDEX_SERIES_INVALID'};
  let peak=1,mdd=0;const base=index.sessions[0].close;
  const points=index.sessions.map((x,i)=>{const wealth=x.close/base;peak=Math.max(peak,wealth);mdd=Math.min(mdd,wealth/peak-1);return {date:x.date,cumulativeReturnPct:(wealth-1)*100,dailyReturnPct:i?(x.close/index.sessions[i-1].close-1)*100:0};});
  if(points.some(x=>!Number.isFinite(x.cumulativeReturnPct)||!Number.isFinite(x.dailyReturnPct)))return {status:'PENDING',reason:'NUMERIC_RANGE'};
  return {status:'READY',basis:'PRICE_INDEX',points,mddPct:mdd*100,fromDate:points[0].date,toDate:points.at(-1).date,dividendsIncluded:false};
}
export function compareBenchmarkReturns(portfolio, benchmark) {
  if(portfolio?.status!=='READY'||benchmark?.status!=='READY'||!(portfolio.basis===benchmark.basis || portfolio.basis==='PRICE_RETURN' && benchmark.basis==='PRICE_INDEX'))return {status:'PENDING',reason:'RETURN_BASIS_MISMATCH'};
  if(!Array.isArray(portfolio.points)||!Array.isArray(benchmark.points))return {status:'PENDING',reason:'INVALID_RETURNS'};
  if(JSON.stringify(portfolio.points?.map(x=>x.date))!==JSON.stringify(benchmark.points?.map(x=>x.date)))return {status:'PENDING',reason:'TRADING_CALENDAR_MISMATCH'};
  if(!Array.isArray(portfolio.points)||portfolio.points.length<2||[...portfolio.points,...benchmark.points].some(x=>!Number.isFinite(x.cumulativeReturnPct)))return {status:'PENDING',reason:'INVALID_RETURNS'};
  return {status:'READY',basis:portfolio.basis,points:portfolio.points.map((x,i)=>({date:x.date,stockReturnPct:x.cumulativeReturnPct,benchmarkReturnPct:benchmark.points[i].cumulativeReturnPct,excessReturnPct:x.cumulativeReturnPct-benchmark.points[i].cumulativeReturnPct})),portfolioMddPct:portfolio.mddPct,benchmarkMddPct:benchmark.mddPct};
}
export function createBenchmarkService({filename,env=process.env,now=()=>Date.now()}={}) {
  return {async load(){
    assertSafeKStockV2Environment(env);let data;
    try{const stats=await lstat(filename);if(!stats.isFile()||stats.size>1000000)throw new Error('INVALID_INDEX_FILE');data=JSON.parse(await readFile(filename,'utf8'));}
    catch(e){if(e.code==='ENOENT')return {success:true,status:'NO_DATA',indices:[]};throw e;}
    if(data.version!==1||!Number.isFinite(Date.parse(data.analysisDate))||!Number.isFinite(Date.parse(data.collectedAt))||Date.parse(data.collectedAt)>now()+300000||Date.parse(data.analysisDate)>now()+300000||!Array.isArray(data.indices)||data.indices.length!==2)throw new Error('INVALID_INDEX_REPORT');
    const seen=new Set();const indices=data.indices.map(x=>{
      if(!['KOSPI','KOSDAQ'].includes(x.index)||seen.has(x.index)||x.source!=='KIS'||x.basis!=='PRICE_INDEX'||!Array.isArray(x.sessions)||x.sessions.length>1000||x.asOfDate!==(x.sessions.at(-1)?.date||null)||x.sessions.some((r,i)=>!validDay(r.date)||!isD2Eligible(`${r.date}T23:59:59+09:00`,data.analysisDate)||!(Number.isFinite(r.close)&&r.close>0)||i>0&&x.sessions[i-1].date>=r.date))throw new Error('INVALID_INDEX_SERIES');seen.add(x.index);
      const clean={index:x.index,source:'KIS',basis:'PRICE_INDEX',asOfDate:x.asOfDate,status:x.sessions.length>=2?'READY':'INSUFFICIENT_DATA',sessions:x.sessions.map(r=>({date:r.date,close:r.close}))};return {...clean,performance:measureIndexPerformance(clean)};
    });
    return {success:true,status:now()-Math.min(Date.parse(data.collectedAt),Date.parse(data.analysisDate))>36*3600000?'STALE':'READY',analysisDate:data.analysisDate,collectedAt:data.collectedAt,indices};
  }};
}
export function registerBenchmarkRoutes(app,service) {
  app.get('/api/v2/benchmarks',async(_req,res)=>{res.set('Cache-Control','no-store');try{res.json(await service.load());}catch{res.status(503).json({success:false,error:'BENCHMARK_UNAVAILABLE'});}});
}
