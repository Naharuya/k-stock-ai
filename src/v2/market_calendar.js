/** Published schedules, not a guarantee against emergency closures or security halts. */
const usClosed=new Set(['2026-01-01','2026-01-19','2026-02-16','2026-04-03','2026-05-25','2026-06-19','2026-07-03','2026-09-07','2026-11-26','2026-12-25']);
const early=new Set(['2026-11-27','2026-12-24']);
export function sessionDay(market,date){
 const weekend=[0,6].includes(new Date(date+'T00:00:00Z').getUTCDay());
 if(market==='US'&&/^2026-/.test(date))return {status:'PUBLISHED_SCHEDULE',open:!weekend&&!usClosed.has(date),close:early.has(date)?'13:00':'16:00',sourceUrls:['https://www.nyse.com/trade/hours-calendars','https://www.nasdaqtrader.com/Trader.aspx?id=Calendar']};
 // KRX notice covers October only; do not infer other months from national holidays.
 if(market==='KR'&&/^2026-10-/.test(date))return {status:'PUBLISHED_SCHEDULE',open:!weekend&&!['2026-10-05','2026-10-09'].includes(date),close:'15:30',sourceUrls:['https://trn.krx.co.kr/index.jsp']};
 return {status:'UNCONFIRMED',open:!weekend,close:market==='KR'?'15:30':'16:00',sourceUrls:[]};
}
export function latestCompletedSession(market,asOf){
 const now=new Date(asOf);if(!Number.isFinite(now.getTime())||!['KR','US'].includes(market))return {status:'UNCONFIRMED',date:null,sourceUrls:[]};
 const zone=market==='KR'?'Asia/Seoul':'America/New_York';
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const clock=new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);
 for(let n=0;n<15;n++){const day=new Date(Date.parse(date+'T00:00:00Z')-n*86400000).toISOString().slice(0,10),s=sessionDay(market,day);const [h,m]=s.close.split(':').map(Number),buffer=String(h+Math.floor((m+30)/60)).padStart(2,'0')+':'+String((m+30)%60).padStart(2,'0');if(s.open&&(n>0||clock>=buffer))return {...s,date:day};}
 return {status:'UNCONFIRMED',date:null,sourceUrls:[]};
}
export function reviewTradingData(snapshot,instrument,asOf){
 const calendar=latestCompletedSession(instrument.market,asOf),rows=snapshot?.bars||[],issues=[];
 if(calendar.date&&snapshot?.priceAsOf<calendar.date)issues.push('LATEST_COMPLETED_SESSION_UNCONFIRMED');
 if(calendar.date&&snapshot?.priceAsOf>calendar.date)issues.push('PRICE_BEFORE_SCHEDULED_CLOSE');
 const present=new Set(rows.map(r=>r.date));if(rows.length>1){for(let t=Date.parse(rows[0].date);t<=Date.parse(rows.at(-1).date)&&t-Date.parse(rows[0].date)<370*86400000;t+=86400000){const date=new Date(t).toISOString().slice(0,10),s=sessionDay(instrument.market,date);if(s.status==='PUBLISHED_SCHEDULE'&&s.open&&!present.has(date))issues.push('SESSION_GAP_REVIEW_REQUIRED');}}
 for(let i=0;i<rows.length;i++){
  const scheduled=sessionDay(instrument.market,rows[i].date);if(scheduled.status==='PUBLISHED_SCHEDULE'&&!scheduled.open)issues.push('PRICE_ON_SCHEDULED_CLOSURE');
  if(i&&Math.abs(rows[i].open/rows[i-1].close-1)>=0.30)issues.push('PRICE_DISCONTINUITY_REVIEW_REQUIRED');
 }
 return {calendar:{...calendar,emergencyClosuresVerified:false},corporateActions:{status:'NOT_INDEPENDENTLY_RECONCILED',adjustment:'PROVIDER_ADJUSTED_PRICE',dividendsIncluded:false},status:issues.length?'BLOCKED':'OBSERVATION_ONLY',issues:[...new Set(issues)],independentVerification:false};
}
