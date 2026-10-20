import {isD2Eligible} from './scoring.js';
const aliases={revenue:['RevenueFromContractWithCustomerExcludingAssessedTax','Revenues','SalesRevenueNet'],netIncome:['NetIncomeLoss'],operatingCashFlow:['NetCashProvidedByUsedInOperatingActivities'],equity:['StockholdersEquity'],assets:['Assets'],liabilities:['Liabilities']};
const day=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x;
function eligible(x,asOf){return ['10-Q','10-Q/A'].includes(x.form)&&Number.isFinite(x.val)&&day(x.end)&&day(x.filed)&&x.end<=x.filed&&/^\d{10}-\d{2}-\d{6}$/.test(x.accn||'')&&isD2Eligible(x.filed+'T23:59:59-05:00',asOf);}
export function buildInterimSnapshot(data,company,asOf){
 if(!Number.isFinite(Date.parse(asOf))||String(data?.cik).padStart(10,'0')!==company.cik.padStart(10,'0'))throw Error('SEC_INTERIM_IDENTITY_OR_TIME_INVALID');
 const facts=data.facts?.['us-gaap'];if(!facts||typeof facts!=='object')throw Error('SEC_INTERIM_FACTS_MISSING');
 const rows=Object.entries(aliases).flatMap(([key,tags])=>tags.flatMap(tag=>(facts[tag]?.units?.USD||[]).filter(x=>eligible(x,asOf)).map(x=>({...x,key,tag}))));
 rows.sort((a,b)=>b.end.localeCompare(a.end)||b.filed.localeCompare(a.filed)||b.accn.localeCompare(a.accn));
 const anchor=rows[0];if(!anchor)return {status:'INSUFFICIENT_DATA',metrics:{},ttmStatus:'INSUFFICIENT_DATA',reasons:['LATEST_INTERIM_REQUIRED']};
 const base={periodEnd:anchor.end,disclosureDate:anchor.filed,accessionNumber:anchor.accn,currency:'USD',unit:'CURRENCY_UNITS',sourceUrl:`https://www.sec.gov/Archives/edgar/data/${Number(company.cik)}/${anchor.accn.replaceAll('-','')}/${anchor.accn}-index.html`,ttmStatus:'INSUFFICIENT_DATA',scopeVerified:false};
 if(rows.some(x=>x.end===anchor.end&&x.form==='10-Q/A'&&x.filed>=anchor.filed))return {...base,status:'BLOCKED',metrics:{},reasons:['INTERIM_CORRECTION_REVIEW_REQUIRED']};
 const metrics={},reasons=['FINANCIAL_SCOPE_REVIEW_REQUIRED','TTM_CONTINUITY_NOT_VERIFIED'];
 for(const key of Object.keys(aliases)){
  const choices=rows.filter(x=>x.key===key&&x.end===anchor.end&&x.accn===anchor.accn&&x.filed===anchor.filed&&x.form==='10-Q').map(x=>{
   const duration=day(x.start)?(Date.parse(x.end)-Date.parse(x.start))/86400000+1:null;
   const basis=['equity','assets','liabilities'].includes(key)&&!x.start?'INSTANT':duration>=80&&duration<=100?'SINGLE_QUARTER':duration>100&&duration<=300?'CUMULATIVE_PERIOD':null;
   return {...x,duration,basis};
  }).filter(x=>x.basis&&(['equity','assets','liabilities'].includes(key)?x.basis==='INSTANT':x.basis!=='INSTANT'));
  choices.sort((a,b)=>(a.duration??0)-(b.duration??0));const pick=choices[0];
  if(!pick){metrics[key]=null;reasons.push(key.toUpperCase()+'_MISSING');continue;}
  const same=choices.filter(x=>x.start===pick.start&&x.basis===pick.basis);
  if(new Set(same.map(x=>x.val)).size!==1)return {...base,status:'BLOCKED',metrics:{},reasons:['INTERIM_FACT_CONFLICT']};
  metrics[key]={value:pick.val,periodStart:pick.start||null,periodEnd:pick.end,basis:pick.basis,currency:'USD',unit:'CURRENCY_UNITS',tag:pick.tag};
 }
 return {...base,status:'PARTIAL',metrics,reasons};
}
