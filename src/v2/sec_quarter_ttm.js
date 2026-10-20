import {validDay} from './accounting_periods.js';
import {isD2Eligible} from './scoring.js';
const DAY=86400000;
export function reviewUsdQuarterTtm(frames,asOf){
 const out={status:'INSUFFICIENT_DATA',value:null,currency:'USD',unit:'CURRENCY_UNITS',method:'FOUR_CONTIGUOUS_SINGLE_QUARTERS',quarters:[],reasons:[]};
 if(!Array.isArray(frames)||frames.length>40||!Number.isFinite(Date.parse(asOf)))return {...out,reasons:['INVALID_INPUT']};
 const unique=new Map();
 for(const f of frames){
  if(!validDay(f.start)||!validDay(f.end)||!Number.isFinite(f.value)||f.currency!=='USD'||f.unit!=='CURRENCY_UNITS'||f.amountKind!=='SINGLE_QUARTER'||!isD2Eligible(f.availableAt,asOf)||Date.parse(f.availableAt)<Date.parse(f.end)||!/^[a-f\d]{64}$/.test(f.sourceHash||'')||!/^\d{10}-\d{2}-\d{6}$/.test(f.documentId||''))return {...out,reasons:['UNVERIFIED_OR_FUTURE_QUARTER']};
  const days=(Date.parse(f.end)-Date.parse(f.start))/DAY+1;
  if(days<80||days>100)return {...out,reasons:['QUARTER_DURATION_INVALID']};
  const key=f.start+':'+f.end,old=unique.get(key);
  if(old&&(old.value!==f.value||old.scope!==f.scope||old.scopeVerified!==f.scopeVerified))return {...out,reasons:['QUARTER_SOURCE_CONFLICT']};
  if(!old)unique.set(key,f);
 }
 const quarters=[...unique.values()].sort((a,b)=>a.end.localeCompare(b.end)).slice(-4);out.quarters=quarters;
 if(quarters.length!==4)out.reasons.push('FOUR_QUARTERS_REQUIRED');
 if(quarters.some((q,i)=>i&&Date.parse(q.start)!==Date.parse(quarters[i-1].end)+DAY))out.reasons.push('QUARTER_GAP_OR_OVERLAP');
 if(quarters.length===4){const span=(Date.parse(quarters.at(-1).end)-Date.parse(quarters[0].start))/DAY+1;if(span<350||span>380)out.reasons.push('TWELVE_MONTH_SPAN_REQUIRED');}
 if(quarters.some(q=>q.scopeVerified!==true||q.scope!=='CONSOLIDATED'))out.reasons.push('CONSOLIDATION_SCOPE_UNVERIFIED');
 if(out.reasons.length)return out;
 const value=quarters.reduce((sum,q)=>sum+q.value,0);if(!Number.isFinite(value))return {...out,reasons:['NUMERIC_RANGE']};
 return {...out,status:'READY',value,periodStart:quarters[0].start,periodEnd:quarters.at(-1).end};
}
export function reviewSavedInterimTtm(interim,annual,sourceHash,asOf,history=null){
 const reviews={};
 for(const metric of ['revenue','netIncome','operatingCashFlow']){
  const m=interim?.metrics?.[metric];
  const frames=history?.metrics?.[metric]?.frames|| (m?.basis==='SINGLE_QUARTER'?[{start:m.periodStart,end:m.periodEnd,value:m.value,currency:m.currency,unit:m.unit,amountKind:'SINGLE_QUARTER',availableAt:interim.disclosureDate+'T23:59:59-05:00',documentId:interim.accessionNumber,sourceHash,scope:'UNKNOWN',scopeVerified:false}]:[]);
  reviews[metric]=reviewUsdQuarterTtm(frames,asOf);
  if(history?.metrics?.[metric]?.status==='BLOCKED')reviews[metric].reasons.push(history.metrics[metric].reason);
  if(m&&m.basis!=='SINGLE_QUARTER'&&!frames.some(f=>f.end===m.periodEnd))reviews[metric].reasons.push('CUMULATIVE_TO_QUARTER_EVIDENCE_REQUIRED');
  if(annual?.periodEnd>interim?.periodEnd&&(!frames.length||frames.at(-1).end<annual.periodEnd))reviews[metric].reasons.push('NEWER_ANNUAL_QUARTER_RECONCILIATION_REQUIRED');
 }
 return {status:Object.values(reviews).every(r=>r.status==='READY')?'READY':'INSUFFICIENT_DATA',metrics:reviews,required:'FOUR_CONTIGUOUS_QUARTERS_WITH_VERIFIED_SCOPE',recommendationStatus:'HOLD'};
}
