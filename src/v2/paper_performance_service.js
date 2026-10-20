import { calculatePaperPerformance } from './paper_performance.js';
import { validDay } from './accounting_periods.js';
import { compareBenchmarkReturns, measureIndexPerformance } from './benchmark_data.js';
export function createPaperPerformanceService({loadCandidates,loadBenchmarks,now=()=>new Date().toISOString()}={}) {
  return {async calculate(input){
    if(!input||!Array.isArray(input.positions)||!input.positions.length||input.positions.length>50||!validDay(input.fromDate)||!validDay(input.toDate)||input.fromDate>=input.toDate||!Number.isFinite(input.initialCash)||input.initialCash<=0||input.positions.some(x=>!x||![x.fee??0,x.tax??0].every(v=>Number.isFinite(v)&&v>=0)||x.market!=='KR'||!/^\d{6}$/.test(x.ticker||'')||![x.buy,x.quantity].every(v=>Number.isFinite(v)&&v>0)))throw new Error('PAPER_INPUT_INVALID');
    const cashFlows=input.cashFlows??[];
    if(!Array.isArray(cashFlows)||cashFlows.length>500||cashFlows.some(f=>!f||typeof f.id!=='string'||!f.id||f.id.length>100||!validDay(f.date)||f.date<input.fromDate||f.date>input.toDate||f.timing!=='BEFORE_OPEN'||!Number.isFinite(f.amount)||f.amount===0)||new Set(cashFlows.map(f=>f.id)).size!==cashFlows.length)throw new Error('PAPER_INPUT_INVALID');
    const sales=input.sales??[];
    const tickers=new Set(input.positions.map(p=>p.ticker));
    if(!Array.isArray(sales)||sales.length+input.positions.length>500||sales.some(t=>!t||typeof t.id!=='string'||!t.id||t.id.length>100||!tickers.has(t.ticker)||!validDay(t.date)||t.date<input.fromDate||t.date>input.toDate||![t.price,t.quantity].every(v=>Number.isFinite(v)&&v>0)||![t.fee??0,t.tax??0].every(v=>Number.isFinite(v)&&v>=0))||new Set(sales.map(t=>t.id)).size!==sales.length)throw new Error('PAPER_INPUT_INVALID');
    const dividends=input.dividends??[];
    if(!Array.isArray(dividends)||dividends.length>500||dividends.some(d=>!d||typeof d.id!=='string'||!d.id||d.id.length>100||!tickers.has(d.ticker)||!validDay(d.date)||d.date<input.fromDate||d.date>input.toDate||!Number.isFinite(d.amount)||d.amount<=0)||new Set(dividends.map(d=>d.id)).size!==dividends.length)throw new Error('PAPER_INPUT_INVALID');
    const snapshot=await loadCandidates(), indexData=await loadBenchmarks();
    if(snapshot.status==='STALE'||indexData.status==='STALE')return {success:true,status:'PENDING',reason:'SOURCE_DATA_STALE'};
    const prices={},reviews=[];
    for(const p of input.positions){const candidate=snapshot.candidates?.find(x=>x.market==='KR'&&x.ticker===p.ticker),source=candidate?.krValuationAnalysis?.evidence,history=source?.priceHistory;
      if(!history||history.qualityStatus!=='READY'||history.basis!=='RAW'||source.corporateActions?.status!=='VERIFIED')return {success:true,status:'PENDING',reason:'RAW_PRICE_AND_CORPORATE_ACTIONS_REQUIRED'};
      const sessions=history.sessions.filter(x=>x.date>=input.fromDate&&x.date<=input.toDate);prices[p.ticker]={status:'READY',basis:'RAW',currency:'KRW',sessions};reviews.push(source.corporateActions);
    }
    const calendar=Object.values(prices)[0].sessions.map(x=>x.date);
    if(calendar[0]!==input.fromDate||calendar.at(-1)!==input.toDate)return {success:true,status:'PENDING',reason:'REQUESTED_RANGE_UNAVAILABLE'};
    if(reviews.some(x=>x.fromDate>input.fromDate||x.toDate<input.toDate||x.events?.length))return {success:true,status:'PENDING',reason:'ACTION_LEDGER_REVIEW_REQUIRED'};
    const portfolio=calculatePaperPerformance({currency:'KRW',initialCash:input.initialCash,calendar,prices,analysisDate:now(),dividends:dividends.map(({id,ticker,date,amount})=>({id,ticker,date,amount})),cashFlows:cashFlows.map(({id,date,timing,amount})=>({id,date,timing,amount})),trades:input.positions.map((x,i)=>({id:`paper-${i}`,date:input.fromDate,ticker:x.ticker,side:'BUY',quantity:x.quantity,price:x.buy,fee:x.fee??0,tax:x.tax??0})).concat(sales.map((t,i)=>({id:`sale-${i}`,date:t.date,ticker:t.ticker,side:'SELL',quantity:t.quantity,price:t.price,fee:t.fee??0,tax:t.tax??0})).sort((a,b)=>a.date.localeCompare(b.date))),actionCoverage:{verified:true,fromDate:input.fromDate,toDate:input.toDate,events:[],hasUnresolvedEvents:false}});
    // User-entered net receipts are scenario assumptions, never verified total returns.
    if(dividends.length&&portfolio.status==='READY'){portfolio.basis='USER_DIVIDEND_SCENARIO';portfolio.dividendMode='USER_NET_CASH_SCENARIO';portfolio.entitlementVerified=false;}
    const comparisons=(indexData.indices||[]).map(x=>({index:x.index,...compareBenchmarkReturns(portfolio,measureIndexPerformance({...x,sessions:x.sessions.filter(r=>r.date>=input.fromDate&&r.date<=input.toDate)}))}));
    return {success:true,status:portfolio.status,reason:portfolio.reason||null,portfolio,comparisons,warning:dividends.length?'USER_NET_DIVIDEND_SCENARIO_NOT_VERIFIED_TOTAL_RETURN':'VIRTUAL_USER_TRADES_USER_COSTS_BEFORE_OPEN_FLOWS_NO_DIVIDENDS'};
  }};
}
export function registerPaperPerformanceRoutes(app,service) {
  app.post('/api/v2/paper/performance',async(req,res)=>{res.set('Cache-Control','no-store');try{res.json(await service.calculate(req.body));}catch(e){res.status(e.message==='PAPER_INPUT_INVALID'?400:503).json({success:false,error:e.message==='PAPER_INPUT_INVALID'?'PAPER_INPUT_INVALID':'PAPER_PERFORMANCE_UNAVAILABLE'});}});
}
