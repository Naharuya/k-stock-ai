import {buildSecQuarterHistory} from './sec_quarter_history.js';
import {buildInterimSnapshot} from './sec_interim.js';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {CURRENT_UNIVERSE,currentCompany} from './current_universe.js';
import {buildFinancialSnapshot} from './sec_financials.js';
import {assertSafeKStockV2Environment} from './scoring.js';
import {readCurrent,saveCurrent,lockedCurrent} from './current_collection_io.js';
export async function collectCurrentFinancials({env=process.env,directory='data/v2',approved=false,ticker=null,fetchImpl=globalThis.fetch,now=()=>new Date().toISOString()}={}){
 assertSafeKStockV2Environment(env);
 if(!approved||env.KSTOCK_V2_FINANCIALS_ENABLED!=='true'||env.KSTOCK_RESEARCH_COLLECTION_ENABLED==='false')return {status:'DISABLED',externalRequests:0};
 if(!/^.{3,}\s+[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.KSTOCK_SEC_USER_AGENT||''))return {status:'BLOCKED',reason:'SEC_USER_AGENT_REQUIRED',externalRequests:0};
 const file=path.join(directory,'influence/current-financials.json');
 return lockedCurrent(file,async()=>{
  const checkedAt=now(),previous=await readCurrent(file),companies=[...(previous?.companies||[])];
  if(!Number.isFinite(Date.parse(checkedAt))||companies.some(c=>Date.parse(c.checkedAt)>Date.parse(checkedAt)))throw Error('CURRENT_FINANCIAL_CLOCK_CONFLICT');
  const company=ticker?currentCompany(ticker):[...CURRENT_UNIVERSE].sort((a,b)=>(Date.parse(companies.find(c=>c.ticker===a.ticker)?.checkedAt)||0)-(Date.parse(companies.find(c=>c.ticker===b.ticker)?.checkedAt)||0))[0];
  const normalizerVersion='quarter-history-balance-v5';
  const old=companies.find(c=>c.ticker===company.ticker);
  if(old&&old.normalizerVersion===normalizerVersion&&Date.parse(checkedAt)-Date.parse(old.checkedAt)<86400000)return {...previous,cached:true,externalRequests:0};
  let externalRequests=0;const row={...old,normalizerVersion,ticker:company.ticker,companyName:company.companyName,checkedAt,status:'BLOCKED'};
  try{
   externalRequests=1;const url=`https://data.sec.gov/api/xbrl/companyfacts/CIK${company.cik}.json`;
   const response=await fetchImpl(url,{headers:{'User-Agent':env.KSTOCK_SEC_USER_AGENT,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw Error([401,403].includes(response.status)?'SEC_AUTH_BLOCKED':'SEC_FINANCIAL_UNAVAILABLE');
   const reader=response.body.getReader(),chunks=[];let size=0;while(true){const x=await reader.read();if(x.done)break;size+=x.value.length;if(size>12000000){await reader.cancel();throw Error('SEC_FINANCIAL_SIZE_LIMIT');}chunks.push(Buffer.from(x.value));}
   const raw=Buffer.concat(chunks).toString('utf8'),data=JSON.parse(raw);
   row.financialSnapshot=buildFinancialSnapshot(data,company,checkedAt);row.interimSnapshot=buildInterimSnapshot(data,company,checkedAt);row.sourceUrl=url;row.sourceHash=createHash('sha256').update(raw).digest('hex');row.quarterHistory=buildSecQuarterHistory(data,company,checkedAt,row.sourceHash);row.status='PARTIAL';row.reason='ANNUAL_DATA_NOT_TTM';
  }catch(e){row.reason=['SEC_AUTH_BLOCKED','SEC_FINANCIAL_UNAVAILABLE','SEC_FINANCIAL_SIZE_LIMIT'].includes(e.message)?e.message:'SEC_FINANCIAL_VALIDATION_FAILED';}
  const result={schemaVersion:1,checkedAt,status:row.status,externalRequests,companies:[...companies.filter(c=>c.ticker!==company.ticker),row]};await saveCurrent(file,result);return result;
 });
}
