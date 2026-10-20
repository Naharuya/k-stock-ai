import {validDay} from './accounting_periods.js';
import {isD2Eligible} from './scoring.js';
const DAY=86400000;
const tags={revenue:['RevenueFromContractWithCustomerExcludingAssessedTax','Revenues','SalesRevenueNet'],netIncome:['NetIncomeLoss'],operatingCashFlow:['NetCashProvidedByUsedInOperatingActivities']};
export function buildSecQuarterHistory(data,company,asOf,sourceHash){
 if(String(data?.cik).padStart(10,'0')!==company.cik.padStart(10,'0')||!Number.isFinite(Date.parse(asOf))||!/^[a-f\d]{64}$/.test(sourceHash))throw Error('QUARTER_HISTORY_PROVENANCE_INVALID');
 const result={status:'PARTIAL',sourceHash,asOf,scopeVerified:false,metrics:{}};
 for(const [metric,aliases]of Object.entries(tags)){
  const facts=aliases.flatMap(tag=>(data.facts?.['us-gaap']?.[tag]?.units?.USD||[]).filter(x=>['10-Q','10-K','10-Q/A','10-K/A'].includes(x.form)&&validDay(x.start)&&validDay(x.end)&&validDay(x.filed)&&x.start<x.end&&x.end<=x.filed&&Date.parse(x.end)>=Date.parse(asOf)-800*DAY&&isD2Eligible(x.filed+'T23:59:59-05:00',asOf)&&Number.isFinite(x.val)&&/^\d{10}-\d{2}-\d{6}$/.test(x.accn||'')).map(x=>({...x,tag})));
  const grouped=new Map();let conflict=false;
  for(const f of facts){const key=f.tag+':'+f.start+':'+f.end;const old=grouped.get(key);if(old&&old.val!==f.val)conflict=true;if(!old||f.filed>old.filed)grouped.set(key,f);}
  if(conflict||facts.some(f=>f.form.endsWith('/A'))){result.metrics[metric]={status:'BLOCKED',frames:[],reason:conflict?'HISTORICAL_FACT_CONFLICT':'HISTORICAL_CORRECTION_REVIEW_REQUIRED'};continue;}
  const rows=[...grouped.values()],quarters=new Map(),conflicts=[];
  function add(f,start,value,inputs,method){
   const key=start+':'+f.end,availableAt=inputs.map(x=>x.filed+'T23:59:59-05:00').sort().at(-1);
   const frame={start,end:f.end,value,currency:'USD',unit:'CURRENCY_UNITS',amountKind:'SINGLE_QUARTER',availableAt,documentId:f.accn,documentIds:[...new Set(inputs.map(x=>x.accn))],sourceHash,scope:'UNKNOWN',scopeVerified:false,method,tag:f.tag,inputs:inputs.map(x=>({start:x.start,end:x.end,value:x.val,documentId:x.accn,filed:x.filed,tag:x.tag}))};
   const old=quarters.get(key);if(old&&old.value!==value)conflicts.push({start,end:f.end,difference:value-old.value,before:{method:old.method,value:old.value,inputs:old.inputs},after:{method,value,inputs:frame.inputs}});else if(!old||method==='DIRECT_SINGLE_QUARTER')quarters.set(key,frame);
  }
  for(const f of rows){
   const length=(Date.parse(f.end)-Date.parse(f.start))/DAY+1;
   if(length>=80&&length<=100)add(f,f.start,f.val,[f],'DIRECT_SINGLE_QUARTER');
   if(length<=100||length>380)continue;
   for(const prev of rows.filter(p=>p.tag===f.tag&&p.start===f.start&&p.end<f.end)){
    const span=(Date.parse(f.end)-Date.parse(prev.end))/DAY;
    if(span>=80&&span<=100)add(f,new Date(Date.parse(prev.end)+DAY).toISOString().slice(0,10),f.val-prev.val,[f,prev],'CUMULATIVE_DIFFERENCE');
   }
  }
  result.metrics[metric]=conflicts.length?{status:'BLOCKED',frames:[],reason:'DIRECT_DERIVED_QUARTER_CONFLICT',conflicts}:{status:'PARTIAL',frames:[...quarters.values()].sort((a,b)=>a.end.localeCompare(b.end)).slice(-8),reason:'CONSOLIDATION_SCOPE_UNVERIFIED'};
 }
 return result;
}
