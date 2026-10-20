export const EVENT_SOURCES=Object.freeze([
 {market:'KR',symbol:'005930',exchange:'KRX',name:'삼성전자',sourceUrl:'https://www.samsung.com/global/ir/ir-events-presentations/events/',timeZone:'Asia/Seoul',kind:'EARNINGS_CALL'},
 {market:'US',symbol:'MSFT',exchange:'NAS',name:'Microsoft',sourceUrl:'https://www.microsoft.com/en-us/investor/default',timeZone:'America/New_York',kind:'EARNINGS_RELEASE'}
]);
const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
export function parseEventSchedule(html,source,checkedAt){
 const text=html.replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ');
 const pattern=source.market==='KR'?/([1-4])Q(\d{2}) Earnings Conference Call\s+([A-Za-z]+) (\d{1,2}), (\d{4}), (\d{1,2}):(\d{2}) a\.m\. KST/g:/next earnings release will be on ([A-Za-z]+) (\d{1,2}), (\d{4})/gi;
 const dates=[];for(const match of text.matchAll(pattern)){const kr=source.market==='KR',month=months.findIndex(m=>m.toLowerCase()===match[kr?3:1].toLowerCase())+1;if(!month)continue;const year=match[kr?5:3],day=match[kr?4:2],date=`${year}-${String(month).padStart(2,'0')}-${day.padStart(2,'0')}`;if(!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)continue;if(date<checkedAt.slice(0,10)||Date.parse(date)-Date.parse(checkedAt)>120*86400000)continue;dates.push({...source,date,time:kr?`${match[6].padStart(2,'0')}:${match[7]}`:null,timePrecision:kr?'MINUTE':'DATE_ONLY',checkedAt,status:'ISSUER_PUBLISHED_SUBJECT_TO_CHANGE'});}
 return [...new Map(dates.map(d=>[d.date,d])).values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(0,1);
}
function upcoming(e,now){
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:e.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
 if(e.date!==date)return e.date>date;
 if(e.time===null)return true;
 return e.time>=new Intl.DateTimeFormat('en-GB',{timeZone:e.timeZone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(now));
}
export function eventScheduleFor(snapshot,instrument,asOf){
 const now=Date.parse(asOf),checked=Date.parse(snapshot?.checkedAt);
 if(snapshot?.schemaVersion!==1||!Number.isFinite(checked)||checked>now||now-checked>7*86400000||!Array.isArray(snapshot.events)||snapshot.events.length>20)return {status:'NOT_CONNECTED_OR_STALE',events:[],checkedAt:null,coverage:'TWO_ISSUERS_ONLY'};
 const events=snapshot.events.filter(e=>e&&typeof e==='object'&&EVENT_SOURCES.some(s=>s.market===e.market&&s.symbol===e.symbol&&s.exchange===e.exchange&&s.sourceUrl===e.sourceUrl&&s.kind===e.kind&&s.timeZone===e.timeZone)&&e.market===instrument.market&&e.symbol===instrument.symbol&&e.exchange===instrument.exchange&&e.checkedAt===snapshot.checkedAt&&/^[a-f0-9]{64}$/.test(e.sourceHash||'')&&/^\d{4}-\d{2}-\d{2}$/.test(e.date||'')&&Number.isFinite(Date.parse(e.date))&&new Date(e.date).toISOString().slice(0,10)===e.date&&upcoming(e,now)&&Date.parse(e.date)-now<=120*86400000&&e.status==='ISSUER_PUBLISHED_SUBJECT_TO_CHANGE'&&(e.time===null&&e.timePrecision==='DATE_ONLY'||e.timePrecision==='MINUTE'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(e.time))).map(e=>({market:e.market,symbol:e.symbol,date:e.date,time:e.time,timePrecision:e.timePrecision,timeZone:e.timeZone,kind:e.kind,checkedAt:e.checkedAt,sourceUrl:e.sourceUrl,status:e.status}));
 return {status:events.length?'ISSUER_PUBLISHED':'NO_CONFIRMED_UPCOMING_EVENT',events,checkedAt:snapshot.checkedAt,coverage:'TWO_ISSUERS_ONLY'};
}
