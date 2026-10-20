import { isD2Eligible } from './scoring.js';
export const validDay = x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && Number.isFinite(Date.parse(x)) && new Date(x).toISOString().slice(0,10) === x;
const number = x => typeof x === 'string' && /^-?\d+(\.\d+)?$/.test(x.replaceAll(',','').trim()) ? Number(x.replaceAll(',','').trim()) : null;
const flowNames = { revenue:['매출액','수익(매출액)','영업수익'], operatingIncome:['영업이익','영업이익(손실)'], netIncome:['당기순이익','당기순이익(손실)'] };
export function parseDartPeriod(text) {
  if (typeof text !== 'string') return null;
  const dates = [...text.matchAll(/(\d{4})[.\-/](\d{2})[.\-/](\d{2})/g)].map(x=>`${x[1]}-${x[2]}-${x[3]}`);
  return dates.length === 2 && dates.every(validDay) && dates[0] < dates[1] ? {start:dates[0],end:dates[1]} : null;
}
export function verifyDartPeriod(items, {corpCode, year, reportCode='11011', basis='CFS', receipt, raw}={}) {
  const missing=[], flows=[];
  const eligible = items.filter(x=>x.corp_code===corpCode && x.bsns_year===String(year) && x.reprt_code===reportCode && x.fs_div===basis && x.rcept_no===receipt && x.currency==='KRW');
  for(const [metric,names] of Object.entries(flowNames)) {
    const rows=eligible.filter(x=>x.sj_div==='IS' && names.includes(x.account_nm?.replaceAll(' ','')));
    const normalized=rows.map(x=>({period:parseDartPeriod(x.thstrm_dt),value:number(reportCode==='11011'?x.thstrm_amount:x.thstrm_add_amount)}));
    if(!normalized.length || normalized.some(x=>!x.period || !Number.isFinite(x.value) || x.value!==raw?.[metric]) || new Set(normalized.map(x=>JSON.stringify(x))).size!==1) missing.push(`periodOrAmount:${metric}`);
    else flows.push(normalized[0].period);
  }
  const period=flows[0];
  if(!period || flows.some(x=>x.start!==period.start || x.end!==period.end)) missing.push('mixedPeriods');
  const duration=period ? (Date.parse(period.end)-Date.parse(period.start))/86400000+1 : 0;
  const days={11011:[300,400],11013:[70,110],11012:[150,210],11014:[240,300]}[reportCode];
  if(!days || duration<days[0] || duration>days[1] || period?.start.slice(0,4)!==String(year) || period?.end.slice(0,4)!==String(year)) missing.push('periodDuration');
  const balance=eligible.filter(x=>x.sj_div==='BS');
  if(!balance.length || balance.some(x=>{const m=x.thstrm_dt?.match(/(\d{4})[.\-/](\d{2})[.\-/](\d{2})/);return !m || `${m[1]}-${m[2]}-${m[3]}`!==period?.end;})) missing.push('balanceSheetDate');
  return {status:missing.length?'INSUFFICIENT_DATA':'VERIFIED',start:missing.length?null:period.start,end:missing.length?null:period.end,year:String(year),reportCode,basis,currency:'KRW',unit:'KRW',amountKind:reportCode==='11011'?'ANNUAL':'CUMULATIVE_YTD',missing};
}
export function calculateTtm(frames, analysisDate) {
  const fail=reason=>({status:'INSUFFICIENT_DATA',reason,raw:null});
  if(!Array.isArray(frames)||frames.length>20||!Number.isFinite(Date.parse(analysisDate)))return fail('INVALID_INPUT');
  const seen=new Map();
  for(const f of [...frames].sort((a,b)=>String(a?.publishedAt).localeCompare(String(b?.publishedAt)))){
    const p=f?.fiscalPeriod;
    if(f?.qualityStatus!=='READY'||!validDay(p?.start)||!validDay(p?.end)||p.start>=p.end||!['CFS','OFS'].includes(p.basis)||f.currency!=='KRW'||f.unit!=='KRW'||!isD2Eligible(f.publishedAt,analysisDate)||Date.parse(f.publishedAt)<Date.parse(p.end)||!/^\d{14}$/.test(f.receipt||'')||!['ANNUAL','CUMULATIVE_YTD'].includes(f.amountKind)||!['revenue','operatingIncome','netIncome'].every(k=>Number.isFinite(f.raw?.[k])))return fail('UNVERIFIED_OR_FUTURE_FRAME');
    if(p.start.slice(5)!=='01-01'||p.start.slice(0,4)!==p.end.slice(0,4)||f.amountKind==='ANNUAL'&&p.end.slice(5)!=='12-31'||f.amountKind==='CUMULATIVE_YTD'&&!['03-31','06-30','09-30'].includes(p.end.slice(5)))return fail('INVALID_FISCAL_DURATION');
    const key=`${p.start}:${p.end}:${p.basis}`;
    if(seen.has(key)){
      const old=seen.get(key);
      if(f.receipt===old.receipt && JSON.stringify(f.raw)===JSON.stringify(old.raw))continue;
      if(f.supersedesReceipt!==old.receipt || Date.parse(f.publishedAt)<=Date.parse(old.publishedAt))return fail('AMBIGUOUS_CORRECTION');
    }
    seen.set(key,f);
  }
  const rows=[...seen.values()];
  if(new Set(rows.map(x=>x.fiscalPeriod.basis)).size>1)return fail('MIXED_CONSOLIDATION');
  const current=rows.filter(x=>x.amountKind==='CUMULATIVE_YTD').sort((a,b)=>b.fiscalPeriod.end.localeCompare(a.fiscalPeriod.end))[0];
  if(!current)return fail('CURRENT_YTD_MISSING');
  const year=Number(current.fiscalPeriod.start.slice(0,4)), prior=rows.find(x=>x.amountKind==='CUMULATIVE_YTD'&&x.fiscalPeriod.start===`${year-1}${current.fiscalPeriod.start.slice(4)}`&&x.fiscalPeriod.end===`${year-1}${current.fiscalPeriod.end.slice(4)}`);
  const annual=rows.find(x=>x.amountKind==='ANNUAL'&&x.fiscalPeriod.start===`${year-1}${current.fiscalPeriod.start.slice(4)}`&&x.fiscalPeriod.end===`${year-1}-12-31`);
  if(!prior||!annual||current.fiscalPeriod.start!==`${year}-01-01`)return fail('MATCHING_ANNUAL_OR_PRIOR_YTD_MISSING');
  const raw=Object.fromEntries(['revenue','operatingIncome','netIncome'].map(k=>[k,annual.raw[k]+current.raw[k]-prior.raw[k]]));
  if(!Object.values(raw).every(Number.isFinite))return fail('NUMERIC_RANGE');
  const end=current.fiscalPeriod.end, start=new Date(Date.parse(prior.fiscalPeriod.end)+86400000).toISOString().slice(0,10);
  return {status:'READY',raw,period:{start,end,basis:current.fiscalPeriod.basis},currency:'KRW',unit:'KRW',method:'ANNUAL_PLUS_CURRENT_YTD_MINUS_PRIOR_YTD',receipts:[annual.receipt,current.receipt,prior.receipt],availableAt:[annual,prior,current].map(x=>x.publishedAt).sort().at(-1)};
}

// Flow accounts only: balance-sheet amounts must never be differenced.
export function deriveQuarterTtm(frames, analysisDate) {
  const fail=reason=>({status:'INSUFFICIENT_DATA',reason,quarters:[],raw:null});
  const aggregate=calculateTtm(frames,analysisDate);
  if(aggregate.status!=='READY')return fail(aggregate.reason);
  const rows=new Map();
  for(const f of [...frames].sort((a,b)=>a.publishedAt.localeCompare(b.publishedAt)))rows.set(f.fiscalPeriod.end,f);
  const current=aggregate.period.end, selected=[];
  for(const f of rows.values()){
    const end=f.fiscalPeriod.end,month=end.slice(5,7),year=end.slice(0,4);
    if(end<aggregate.period.start||end>current)continue;
    const quarter={'03':1,'06':2,'09':3,'12':4}[month];
    if(!quarter)return fail('QUARTER_BOUNDARY_INVALID');
    const previousEnd=quarter>1?`${year}-${['03-31','06-30','09-30'][quarter-2]}`:null;
    const previous=previousEnd?rows.get(previousEnd):null;
    if(quarter>1&&!previous)return fail('PRECEDING_CUMULATIVE_PERIOD_MISSING');
    if(previous&&(previous.fiscalPeriod.basis!==f.fiscalPeriod.basis||previous.currency!==f.currency||previous.unit!==f.unit))return fail('QUARTER_DEFINITION_MISMATCH');
    const start=previousEnd?new Date(Date.parse(previousEnd)+86400000).toISOString().slice(0,10):`${year}-01-01`;
    const raw=Object.fromEntries(['revenue','operatingIncome','netIncome'].map(k=>[k,f.raw[k]-(previous?.raw[k]||0)]));
    if(!Object.values(raw).every(Number.isFinite))return fail('NUMERIC_RANGE');
    selected.push({start,end,quarter,year,basis:f.fiscalPeriod.basis,currency:f.currency,unit:f.unit,raw,receipts:[...(previous?[previous.receipt]:[]),f.receipt],availableAt:[f.publishedAt,previous?.publishedAt].filter(Boolean).sort().at(-1)});
  }
  selected.sort((a,b)=>a.end.localeCompare(b.end));
  if(selected.length!==4||selected[0].start!==aggregate.period.start||selected.at(-1).end!==current||selected.some((q,i)=>i&&Date.parse(q.start)!==Date.parse(selected[i-1].end)+86400000))return fail('FOUR_CONTIGUOUS_QUARTERS_REQUIRED');
  const raw=Object.fromEntries(['revenue','operatingIncome','netIncome'].map(k=>[k,selected.reduce((a,q)=>a+q.raw[k],0)]));
  if(Object.keys(raw).some(k=>Math.abs(raw[k]-aggregate.raw[k])>Math.max(1,Math.abs(raw[k])*1e-12)))return fail('AGGREGATE_RECONCILIATION_FAILED');
  return {status:'READY',method:'FOUR_CONTIGUOUS_QUARTERS_FROM_CUMULATIVE',period:aggregate.period,currency:'KRW',unit:'KRW',quarters:selected,raw};
}
