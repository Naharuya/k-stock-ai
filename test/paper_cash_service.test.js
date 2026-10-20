import test from 'node:test';
import assert from 'node:assert/strict';
import {createPaperPerformanceService} from '../src/v2/paper_performance_service.js';
const dates=['2026-09-01','2026-09-02','2026-09-03'];
const sessions=[100,110,120].map((close,i)=>({date:dates[i],close}));
const input=()=>({positions:[{market:'KR',ticker:'005930',buy:100,quantity:1,fee:3,tax:2}],initialCash:105,fromDate:dates[0],toDate:dates[2]});
function service(priceSessions=sessions){return createPaperPerformanceService({now:()=> '2026-10-20T00:00:00Z',loadCandidates:async()=>({status:'READY',candidates:[{market:'KR',ticker:'005930',krValuationAnalysis:{evidence:{priceHistory:{qualityStatus:'READY',basis:'RAW',sessions:priceSessions},corporateActions:{status:'VERIFIED',fromDate:priceSessions[0].date,toDate:priceSessions.at(-1).date,events:[]}}}}]}),loadBenchmarks:async()=>({status:'READY',indices:[{index:'KOSPI',status:'READY',basis:'PRICE_INDEX',sessions}]})});}
test('paper API includes entered costs in capital, PnL and benchmark comparison',async()=>{
 const r=await service().calculate(input());assert.equal(r.status,'READY');assert.equal(r.portfolio.fees,3);assert.equal(r.portfolio.taxes,2);assert.equal(r.portfolio.netPnl,15);assert.equal(r.portfolio.unrealizedPnl,15);assert.equal(r.portfolio.initialCash,105);assert.equal(r.portfolio.netCashFlows,0);assert.ok(Math.abs(r.portfolio.points.at(-1).cumulativeReturnPct-(120/105-1)*100)<1e-9);assert.ok(r.comparisons[0].points.at(-1).excessReturnPct<0);
});
test('deposits and withdrawals change cash but are excluded from profit',async()=>{
 const x=input();x.cashFlows=[{id:'in',date:dates[1],timing:'BEFORE_OPEN',amount:100},{id:'out',date:dates[2],timing:'BEFORE_OPEN',amount:-20}];const r=await service().calculate(x);assert.equal(r.status,'READY');assert.equal(r.portfolio.netCashFlows,80);assert.equal(r.portfolio.netPnl,15);assert.equal(r.portfolio.points.at(-1).cash,80);assert.equal(r.portfolio.points.at(-1).value,200);assert.ok(Math.abs(r.portfolio.points[1].dailyReturnPct-5)<1e-9);
});
test('insufficient cash and non-session withdrawals stay pending without inventing sales or dates',async()=>{
 const x=input();x.initialCash=100;assert.equal((await service().calculate(x)).reason,'INSUFFICIENT_CASH');x.initialCash=105;x.cashFlows=[{id:'out',date:dates[1],timing:'BEFORE_OPEN',amount:-1}];assert.equal((await service().calculate(x)).reason,'INVALID_FLOW_OR_CAPITAL');
 const weekend={...input(),fromDate:'2026-09-04',toDate:'2026-09-07',cashFlows:[{id:'x',date:'2026-09-05',timing:'BEFORE_OPEN',amount:1}]};assert.equal((await service([{date:'2026-09-04',close:100},{date:'2026-09-07',close:120}]).calculate(weekend)).reason,'UNSUPPORTED_CASH_FLOW');
});
test('invalid costs and malformed or duplicate cash flow inputs are rejected before source loads',async()=>{
 for(const patch of [{positions:[{market:'KR',ticker:'005930',buy:100,quantity:1,fee:-1}]},{positions:[null]},{cashFlows:{}},{cashFlows:[null]},{cashFlows:[{id:'x',date:dates[1],timing:'AFTER_CLOSE',amount:1}]},{cashFlows:[{id:'x',date:dates[1],timing:'BEFORE_OPEN',amount:Infinity}]},{cashFlows:[{id:'x',date:'2026-09-04',timing:'BEFORE_OPEN',amount:1}]},{cashFlows:Array(2).fill({id:'x',date:dates[1],timing:'BEFORE_OPEN',amount:1})}]){
 let loads=0;const s=createPaperPerformanceService({loadCandidates:async()=>{loads++;throw Error('unexpected');}});await assert.rejects(()=>s.calculate({...input(),...patch}),/PAPER_INPUT_INVALID/);assert.equal(loads,0);
 }
});
test('legacy zero-cost requests retain their prior result',async()=>{const x=input();delete x.positions[0].fee;delete x.positions[0].tax;x.initialCash=100;const r=await service().calculate(x);assert.equal(r.status,'READY');assert.equal(r.portfolio.netPnl,20);assert.equal(r.portfolio.fees,0);});

test('partial sales use average purchase cost including fees and reconcile realized plus unrealized profit',async()=>{
 const x=input();x.positions[0].quantity=2;x.initialCash=205;x.sales=[{id:'s',ticker:'005930',date:dates[1],quantity:1,price:110,fee:1,tax:1}];const r=await service().calculate(x);assert.equal(r.status,'READY');assert.equal(r.portfolio.realizedPnl,5.5);assert.equal(r.portfolio.unrealizedPnl,17.5);assert.equal(r.portfolio.netPnl,23);assert.equal(r.portfolio.points.at(-1).cash,108);assert.equal(r.portfolio.fees,4);assert.equal(r.portfolio.taxes,3);assert.equal(r.portfolio.realizedPnl+r.portfolio.unrealizedPnl,r.portfolio.netPnl);
});
test('full sale leaves cash only while excess quantity and invalid trading days remain pending',async()=>{
 const x=input();x.sales=[{id:'s',ticker:'005930',date:dates[1],quantity:1,price:110,fee:1,tax:1}];let r=await service().calculate(x);assert.equal(r.status,'READY');assert.equal(r.portfolio.realizedPnl,3);assert.equal(r.portfolio.unrealizedPnl,0);assert.equal(r.portfolio.points.at(-1).marketValue,0);x.sales[0].quantity=2;assert.equal((await service().calculate(x)).reason,'SELL_EXCEEDS_HOLDINGS');
 const weekend={...input(),fromDate:'2026-09-04',toDate:'2026-09-07',sales:[{id:'s',ticker:'005930',date:'2026-09-05',quantity:1,price:110}]};assert.equal((await service([{date:'2026-09-04',close:100},{date:'2026-09-07',close:120}]).calculate(weekend)).reason,'INVALID_OR_DUPLICATE_TRADE');
});
test('sale payload validation rejects unknown holdings, duplicate IDs, out-of-period dates and negative costs',async()=>{
 for(const sales of [{},[null],[{id:'s',ticker:'AAPL',date:dates[1],quantity:1,price:100}],[{id:'s',ticker:'005930',date:'2026-09-04',quantity:1,price:100}],[{id:'s',ticker:'005930',date:dates[1],quantity:1,price:100,tax:-1}],Array(2).fill({id:'s',ticker:'005930',date:dates[1],quantity:1,price:100})])await assert.rejects(()=>service().calculate({...input(),sales}),/PAPER_INPUT_INVALID/);
});

test('user net dividends increase cash and income without becoming deposits or verified total returns',async()=>{
 const x=input();x.dividends=[{id:'d',ticker:'005930',date:dates[1],amount:7,verificationStatus:'VERIFIED',entitlementVerified:true}];const r=await service().calculate(x);assert.equal(r.status,'READY');assert.equal(r.portfolio.dividendCash,7);assert.equal(r.portfolio.netCashFlows,0);assert.equal(r.portfolio.netPnl,22);assert.equal(r.portfolio.points.at(-1).cash,7);assert.equal(r.portfolio.basis,'USER_DIVIDEND_SCENARIO');assert.equal(r.portfolio.entitlementVerified,false);assert.equal(r.comparisons[0].status,'PENDING');assert.equal(r.comparisons[0].reason,'RETURN_BASIS_MISMATCH');
});
test('sale profit plus unrealized gain plus net dividend reconciles to total profit',async()=>{
 const x=input();x.positions[0].quantity=2;x.initialCash=205;x.sales=[{id:'s',ticker:'005930',date:dates[1],quantity:1,price:110,fee:1,tax:1}];x.dividends=[{id:'d',ticker:'005930',date:dates[2],amount:7}];const r=await service().calculate(x);assert.equal(r.portfolio.netPnl,30);assert.equal(r.portfolio.realizedPnl+r.portfolio.unrealizedPnl+r.portfolio.dividendCash,30);assert.equal(r.portfolio.fees,4);assert.equal(r.portfolio.taxes,3);
});
test('assumed end-of-day dividends cannot finance same-day purchases or beginning-of-day withdrawals',async()=>{
 const x=input();x.initialCash=100;x.dividends=[{id:'d',ticker:'005930',date:dates[0],amount:10}];assert.equal((await service().calculate(x)).reason,'INSUFFICIENT_CASH');x.initialCash=105;x.cashFlows=[{id:'w',date:dates[1],amount:-1,timing:'BEFORE_OPEN'}];x.dividends[0].date=dates[1];assert.equal((await service().calculate(x)).reason,'INVALID_FLOW_OR_CAPITAL');
});
test('invalid and duplicate assumed dividends fail validation and non-session dates stay pending',async()=>{
 for(const dividends of [{},[null],[{id:'d',ticker:'AAPL',date:dates[1],amount:7}],[{id:'d',ticker:'005930',date:dates[1],amount:-1}],[{id:'d',ticker:'005930',date:'2026-09-04',amount:7}],Array(2).fill({id:'d',ticker:'005930',date:dates[1],amount:7})])await assert.rejects(()=>service().calculate({...input(),dividends}),/PAPER_INPUT_INVALID/);
 const x={...input(),fromDate:'2026-09-04',toDate:'2026-09-07',dividends:[{id:'d',ticker:'005930',date:'2026-09-05',amount:7}]};assert.equal((await service([{date:x.fromDate,close:100},{date:x.toDate,close:120}]).calculate(x)).reason,'INVALID_DIVIDEND');
});

test('client dividend assertions cannot bypass missing server price and corporate-action evidence',async()=>{
 const x=input();x.dividends=[{id:'d',ticker:'005930',date:dates[1],amount:7,sourceVerified:true}];const s=createPaperPerformanceService({loadCandidates:async()=>({candidates:[]}),loadBenchmarks:async()=>({indices:[]})});assert.equal((await s.calculate(x)).reason,'RAW_PRICE_AND_CORPORATE_ACTIONS_REQUIRED');
});

test('daily ledger exposes cash movements and cumulative income without confusing capital with profit',async()=>{
 const x=input();x.cashFlows=[{id:'in',date:dates[1],timing:'BEFORE_OPEN',amount:100}];x.dividends=[{id:'d',ticker:'005930',date:dates[2],amount:7}];const r=await service().calculate(x);assert.equal(r.status,'READY');assert.deepEqual(r.portfolio.points.map(p=>p.cashFlow),[0,100,0]);assert.deepEqual(r.portfolio.points.map(p=>p.netCashFlows),[0,100,100]);assert.equal(r.portfolio.points.at(-1).netPnl,22);assert.equal(r.portfolio.points.at(-1).dividendCash,7);for(const p of r.portfolio.points){assert.equal(p.value,p.cash+p.marketValue);assert.equal(p.netPnl,p.realizedPnl+p.unrealizedPnl+p.dividendCash);assert.ok(p.drawdownPct<=0);}
});
