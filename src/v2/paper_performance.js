import { validDay } from './accounting_periods.js';
export function calculatePaperPerformance({currency,initialCash=0,calendar=[],prices={},trades=[],cashFlows=[],dividends=[],actionCoverage,analysisDate}={}) {
  const fail=reason=>({status:'PENDING',reason});
  if(!['KRW','USD'].includes(currency)||!Number.isFinite(initialCash)||initialCash<0||!Array.isArray(calendar)||calendar.length<2||calendar.length>1000||!Number.isFinite(Date.parse(analysisDate))||calendar.some((x,i)=>!validDay(x)||Date.parse(x)>=Date.parse(analysisDate)||i>0&&calendar[i-1]>=x)||![trades,cashFlows,dividends].every(x=>Array.isArray(x)&&x.length<=500))return fail('INVALID_INPUT');
  if(actionCoverage?.verified!==true||!validDay(actionCoverage.fromDate)||!validDay(actionCoverage.toDate)||!Array.isArray(actionCoverage.events)||actionCoverage.events.some(x=>x.type!=='CASH_DIVIDEND')||actionCoverage.fromDate>calendar[0]||actionCoverage.toDate<calendar.at(-1)||actionCoverage.hasUnresolvedEvents!==false)return fail('CORPORATE_ACTION_REVIEW_REQUIRED');
  const ids=new Set(),tickers=new Set(trades.map(x=>x.ticker));
  if(!tickers.size||tickers.size>50)return fail('HOLDINGS_MISSING');
  for(const ticker of tickers){const p=prices[ticker];if(!p||p.currency!==currency||p.basis!=='RAW'||p.status!=='READY'||JSON.stringify(p.sessions?.map(x=>x.date))!==JSON.stringify(calendar)||p.sessions.some(x=>!(Number.isFinite(x.close)&&x.close>0)))return fail('PRICE_CURRENCY_BASIS_OR_CALENDAR_MISMATCH');}
  for(const t of trades){if(!['BUY','SELL'].includes(t.side)||typeof t.id!=='string'||!t.id||ids.has(t.id)||!calendar.includes(t.date)||!/^\w[\w.-]{0,19}$/.test(t.ticker||'')||![t.quantity,t.price].every(x=>Number.isFinite(x)&&x>0)||![t.fee??0,t.tax??0].every(x=>Number.isFinite(x)&&x>=0))return fail('INVALID_OR_DUPLICATE_TRADE');ids.add(t.id);}
  const flowIds=new Set(),dividendIds=new Set();
  for(const f of cashFlows){if(typeof f.id!=='string'||!f.id||flowIds.has(f.id))return fail('DUPLICATE_OR_MISSING_FLOW_ID');flowIds.add(f.id);if(!calendar.includes(f.date)||f.timing!=='BEFORE_OPEN'||!Number.isFinite(f.amount))return fail('UNSUPPORTED_CASH_FLOW');}
  for(const d of dividends){if(typeof d.id!=='string'||!d.id||dividendIds.has(d.id))return fail('DUPLICATE_OR_MISSING_DIVIDEND_ID');dividendIds.add(d.id);if(!calendar.includes(d.date)||!tickers.has(d.ticker)||!Number.isFinite(d.amount)||d.amount<0)return fail('INVALID_DIVIDEND');}
  let cash=initialCash,previousValue=initialCash,wealth=1,peak=1,mdd=0,realized=0,totalFlows=0,fees=0,taxes=0,dividendCash=0;
  const holdings=new Map(),points=[];
  const attribution=new Map([...tickers].map(t=>[t,{realizedPnl:0,fees:0,taxes:0,dividendCash:0,returnContributionPct:0}]));
  for(const [i,date] of calendar.entries()){
    const flow=cashFlows.filter(x=>x.date===date).reduce((a,x)=>a+x.amount,0),denominator=previousValue+flow;cash+=flow;totalFlows+=flow;
    if(!(denominator>0)||cash<0)return fail('INVALID_FLOW_OR_CAPITAL');
    const pnls=new Map([...tickers].map(t=>[t,-(holdings.get(t)?.quantity||0)*(i?prices[t].sessions[i-1].close:prices[t].sessions[i].close)]));
    for(const t of trades.filter(x=>x.date===date)){
      const h=holdings.get(t.ticker)||{quantity:0,cost:0},cost=t.quantity*t.price,fee=t.fee??0,tax=t.tax??0;fees+=fee;taxes+=tax;const a=attribution.get(t.ticker);a.fees+=fee;a.taxes+=tax;
      if(t.side==='BUY'){cash-=cost+fee+tax;h.quantity+=t.quantity;h.cost+=cost+fee+tax;pnls.set(t.ticker,pnls.get(t.ticker)-cost-fee-tax);}
      else{if(t.quantity>h.quantity)return fail('SELL_EXCEEDS_HOLDINGS');const basis=h.cost*t.quantity/h.quantity;realized+=cost-fee-tax-basis;a.realizedPnl+=cost-fee-tax-basis;cash+=cost-fee-tax;h.quantity-=t.quantity;h.cost-=basis;pnls.set(t.ticker,pnls.get(t.ticker)+cost-fee-tax);}
      if(cash< -1e-8)return fail('INSUFFICIENT_CASH');holdings.set(t.ticker,h);
    }
    for(const d of dividends.filter(x=>x.date===date)){cash+=d.amount;dividendCash+=d.amount;attribution.get(d.ticker).dividendCash+=d.amount;pnls.set(d.ticker,pnls.get(d.ticker)+d.amount);}
    let marketValue=0,unrealized=0;
    for(const [ticker,h] of holdings){const value=h.quantity*prices[ticker].sessions[i].close;marketValue+=value;unrealized+=value-h.cost;pnls.set(ticker,pnls.get(ticker)+value);}
    const value=cash+marketValue,daily=value/denominator-1;wealth*=1+daily;peak=Math.max(peak,wealth);mdd=Math.min(mdd,wealth/peak-1);
    if(![value,wealth,realized,unrealized,cash,totalFlows,fees,taxes,dividendCash,...pnls.values()].every(Number.isFinite)||value<=0)return fail('NUMERIC_RANGE');
    const contribution=Object.fromEntries([...pnls].map(([t,v])=>[t,v/denominator*100]));
    if(Math.abs(Object.values(contribution).reduce((a,v)=>a+v,0)-daily*100)>1e-6)return fail('CONTRIBUTION_RECONCILIATION');
    for(const [ticker,a] of attribution){a.returnContributionPct=a.returnContributionPct*(1+daily)+contribution[ticker];if(!Number.isFinite(a.returnContributionPct))return fail('NUMERIC_RANGE');}
    points.push({date,value,cash,marketValue,cashFlow:flow,netCashFlows:totalFlows,netPnl:value-initialCash-totalFlows,fees,taxes,dividendCash,drawdownPct:(wealth/peak-1)*100,dailyReturnPct:daily*100,cumulativeReturnPct:(wealth-1)*100,realizedPnl:realized,unrealizedPnl:unrealized,contributionPct:contribution});previousValue=value;
  }
  const last=points.at(-1),positions=[...attribution].map(([ticker,a])=>{
    const h=holdings.get(ticker)||{quantity:0,cost:0},marketValue=h.quantity*prices[ticker].sessions.at(-1).close,unrealizedPnl=marketValue-h.cost;
    return {ticker,quantity:h.quantity,remainingCost:h.cost,marketValue,unrealizedPnl,...a,netPnl:a.realizedPnl+unrealizedPnl+a.dividendCash,portfolioWeightPct:marketValue/last.value*100};
  });
  const near=(a,b)=>Math.abs(a-b)<=1e-6+Number.EPSILON*128*Math.max(1,Math.abs(a),Math.abs(b));
  for(const [key,total] of [['marketValue',last.marketValue],['realizedPnl',realized],['unrealizedPnl',last.unrealizedPnl],['dividendCash',dividendCash],['fees',fees],['taxes',taxes],['netPnl',last.netPnl],['returnContributionPct',last.cumulativeReturnPct]])if(!near(positions.reduce((sum,p)=>sum+p[key],0),total))return fail('POSITION_RECONCILIATION');
  if(positions.some(p=>Object.entries(p).some(([key,v])=>key!=='ticker'&&!Number.isFinite(v))))return fail('NUMERIC_RANGE');
  return {status:'READY',positions,cashWeightPct:last.cash/last.value*100,contributionMethod:'DAILY_CONTRIBUTIONS_FORWARD_LINKED',basis:dividends.length?'TOTAL_RETURN':'PRICE_RETURN',currency,points,mddPct:mdd*100,realizedPnl:realized,unrealizedPnl:points.at(-1).unrealizedPnl,netPnl:points.at(-1).value-initialCash-totalFlows,initialCash,netCashFlows:totalFlows,fees,taxes,dividendCash,method:'TIME_WEIGHTED_BEGINNING_OF_DAY_FLOWS',feesIncluded:true,taxesIncluded:true,dividendsIncluded:dividends.length>0,warning:'USER_PAPER_LEDGER_NOT_REAL_EXECUTION'};
}
