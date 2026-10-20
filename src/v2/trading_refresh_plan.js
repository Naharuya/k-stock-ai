/** Bounded, independently rotating KR/US exchange queues. No network or user data. */
export function tradingRefreshPlan(items,cursors={}) {
 const groups=[['KR','KRX',12],['US','NAS',4],['US','NYS',4],['US','AMS',4]],result=[],next={};
 for(const [market,exchange,budget] of groups){const key=market+'-'+exchange,rows=items.filter(i=>i.market===market&&i.exchange===exchange).sort((a,b)=>a.symbol.localeCompare(b.symbol));const start=Number.isSafeInteger(cursors[key])&&cursors[key]>=0?cursors[key]%Math.max(1,rows.length):0;const count=Math.min(budget,rows.length);for(let i=0;i<count;i++)result.push(rows[(start+i)%rows.length]);next[key]=rows.length?(start+count)%rows.length:0;}
 return {items:result,cursors:next,maximumRefreshAttempts:24};
}
