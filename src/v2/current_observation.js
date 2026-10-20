import {measureMarketReaction} from './influence_engine.js';
import {isD2Eligible} from './scoring.js';
const proof=(x,asOf)=>{try{const u=new URL(x?.sourceUrl);return x?.verificationStatus==='VERIFIED'&&/^[a-f\d]{64}$/i.test(x.sourceHash||'')&&u.protocol==='https:'&&!u.username&&!u.password&&['nasdaq.com','nyse.com','spglobal.com','koreainvestment.com'].some(h=>u.hostname===h||u.hostname.endsWith('.'+h))&&Number.isFinite(Date.parse(x.checkedAt))&&Date.parse(x.checkedAt)<=Date.parse(asOf);}catch{return false;}};
export function observeCurrentEvent(event,{asOf,inputs=null}={}){
 const conditions={eventId:event.eventId,ticker:event.companyId,analysisMode:'CONSERVATIVE_START',conservativeAvailableBy:event.publicAvailableAt,exactPublicAvailableAt:null,returnType:'PRICE_RETURN',returnUnit:'FRACTION',benchmarkId:'SP500:PRICE_INDEX',dividendsIncluded:false,transactionCostsIncluded:false,annualized:false,recommendationStatus:'HOLD'};
 const pending=reasons=>({...conditions,status:'PENDING',reasons,periods:[1,5,20].map(tradingDays=>({tradingDays,status:'PENDING',stockReturn:null,benchmarkReturn:null,excessReturn:null})),verifiedSamples:0});
 if(event.verificationStatus!=='VERIFIED'||!Number.isFinite(Date.parse(event.publicAvailableAt))||Date.parse(event.publicAvailableAt)>Date.parse(asOf))return {...pending(['OFFICIAL_EVENT_OR_PUBLIC_AVAILABILITY_REQUIRED']),status:'BLOCKED'};
 if(!isD2Eligible(event.publicAvailableAt,asOf))return pending(['D2_AVAILABILITY_WAIT']);
 const reasons=[];
 if(!proof(inputs?.calendar,asOf))reasons.push('CALENDAR_COVERAGE_REQUIRED');
 if(!proof(inputs?.security,asOf)||inputs.security.ticker!==event.companyId||inputs.security.priceType!=='RAW_CLOSE'||inputs.security.currency!=='USD')reasons.push('SECURITY_HISTORY_REQUIRED');
 if(!proof(inputs?.benchmark,asOf)||inputs.benchmark.id!=='SP500:PRICE_INDEX'||inputs.benchmark.priceType!=='PRICE_INDEX'||inputs.benchmark.currency!=='USD')reasons.push('BENCHMARK_HISTORY_REQUIRED');
 if(!proof(inputs?.actions,asOf)||inputs.actions.ticker!==event.companyId||inputs.actions.adjustmentApplied!==false)reasons.push('CORPORATE_ACTION_COVERAGE_REQUIRED');
 if(reasons.length)return pending(reasons);
 const sessions=inputs.calendar.sessions||[];
 const calendarByDate=new Map(sessions.map(s=>[s.date,s]));
 for(const series of [inputs.security,inputs.benchmark])if((series.rows||[]).some(row=>row.date>series.checkedAt.slice(0,10)||(calendarByDate.has(row.date)&&Date.parse(calendarByDate.get(row.date).closeAt)>Date.parse(series.checkedAt))))return pending(['HISTORY_FUTURE_INFORMATION']);
 if(inputs.actions.scopeThrough>inputs.actions.checkedAt.slice(0,10))return pending(['CORPORATE_ACTION_FUTURE_SCOPE']);

 const start=sessions.find(s=>Date.parse(s.openAt)>=Date.parse(event.publicAvailableAt));
 if(!start||Date.parse(start.closeAt)>Date.parse(asOf))return pending(['BASELINE_NOT_OBSERVED']);
 const result=measureMarketReaction({publicAvailableAt:start.openAt,asOf,sessions,stockPrices:inputs.security.rows||[],benchmarkPrices:inputs.benchmark.rows||[],corporateActionsVerified:true,publicationTimePrecision:'EXACT'});
 const periods=result.periods.map(p=>{const end=p.endDate;if(p.status==='VERIFIED'&&(!end||inputs.actions.scopeFrom>start.date||inputs.actions.scopeThrough<end||!inputs.actions.scopeFrom||!inputs.actions.scopeThrough))return {...p,status:'HOLD',stockReturn:null,benchmarkReturn:null,excessReturn:null,reason:'CORPORATE_ACTION_COVERAGE_REQUIRED'};return p;});
 return {...conditions,status:periods.some(p=>p.status==='VERIFIED')?'PARTIAL':'PENDING',reasons:result.reasons||[],baselinePolicy:'FIRST_FULL_SESSION_CLOSE_AFTER_OBSERVED_PUBLIC_AVAILABILITY',baselineDate:result.baselineDate||null,periods,verifiedSamples:periods.filter(p=>p.status==='VERIFIED').length,limitations:['NOT_FIRST_PUBLIC_TIME','NOT_EXECUTED_TRADE','NO_PREDICTIVE_VALIDITY_CLAIM']};
}
