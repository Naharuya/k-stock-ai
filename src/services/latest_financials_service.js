import {getFinancialStatementsByStockCode} from './dart_service.js';
import {normalizeFinancialStatements} from './financial_normalizer.js';
export function cumulativeResponse(raw,reportCode){
  return {...raw,list:(raw.list||[]).map(row=>reportCode!=='11011'&&['IS','CIS'].includes(row.sj_div)?{...row,thstrm_amount:row.thstrm_add_amount??'',frmtrm_amount:row.frmtrm_add_amount??''}:row)};
}
export function calculateTtm(latest,annual){
  const values={},missing=[];
  for(const key of ['revenue','operatingProfit','netIncome']){
    const a=latest.accounts[key],b=annual.accounts[key];
    const comparable=a&&b&&a.accountId&&a.accountId!=='-표준계정코드 미사용-'&&a.accountId===b.accountId&&a.currency==='KRW'&&b.currency==='KRW';
    values[key]=comparable&&[a.current,a.previous,b.current].every(x=>typeof x==='number'&&Number.isFinite(x))?b.current+a.current-a.previous:null;
    if(values[key]===null)missing.push(key);
  }
  return {status:missing.length?'NOT_AVAILABLE':'READY',values,missing,formula:'PRIOR_ANNUAL + CURRENT_YTD - PRIOR_COMPARABLE_YTD'};
}
export async function getLatestFinancials({stockCode,asOf=new Date(),fsDiv='CFS',fetchStatements=getFinancialStatementsByStockCode}={}){
  const date=new Date(asOf).toLocaleDateString('en-CA',{timeZone:'Asia/Seoul'}).replaceAll('-',''),year=Number(date.slice(0,4));
  const attempts=[];
  for(let y=year;y>=year-2;y--)for(const [reportCode,end] of [['11011','1231'],['11014','0930'],['11012','0630'],['11013','0331']]){
    if(String(y)+end>=date)continue;
    try{
      const result=await fetchStatements({stockCode,businessYear:String(y),reportCode,fsDiv});
      const raw=result.financials;
      if(!raw?.list?.length||raw.list.some(r=>!/^\d{14}$/.test(r.rcept_no)||r.rcept_no.slice(0,8)>date))continue;
      const normalized=normalizeFinancialStatements(cumulativeResponse(raw,reportCode));
      const receipts=[...new Set(raw.list.map(r=>r.rcept_no))];
      const basis={businessYear:String(y),reportCode,fsDiv,periodEnd:String(y)+end,asOf:new Date(asOf).toISOString(),receipts,urls:receipts.map(r=>'https://dart.fss.or.kr/dsaf001/main.do?rcpNo='+r)};
      let ttm;
      if(reportCode==='11011')ttm={status:['revenue','operatingProfit','netIncome'].every(k=>typeof normalized.current[k]==='number'&&normalized.accounts[k]?.currency==='KRW')?'READY':'NOT_AVAILABLE',values:Object.fromEntries(['revenue','operatingProfit','netIncome'].map(k=>[k,normalized.current[k]])),formula:'ANNUAL'};
      else{
        try{
          const prior=await fetchStatements({stockCode,businessYear:String(y-1),reportCode:'11011',fsDiv});
          if(prior.financials.list.some(r=>!/^\d{14}$/.test(r.rcept_no)||r.rcept_no.slice(0,8)>date))throw Error();
          ttm=calculateTtm(normalized,normalizeFinancialStatements(prior.financials));
        }catch{ttm={status:'NOT_AVAILABLE',values:null,reason:'PRIOR_ANNUAL_UNAVAILABLE'};}
      }
      return {basis,normalized,ttm,attempts};
    }catch(e){attempts.push({businessYear:y,reportCode,status:e.dartStatus||'FAILED'});if(e.dartStatus!=='013')throw e;}
  }
  throw new Error('LATEST_FINANCIALS_UNAVAILABLE');
}
