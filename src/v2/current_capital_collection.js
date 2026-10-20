import {CURRENT_UNIVERSE,currentCompany} from './current_universe.js';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {assertSafeKStockV2Environment} from './scoring.js';
import {selectCurrentForm4,normalizeCurrentForm4} from './current_capital.js';
import {readCurrent,saveCurrent,lockedCurrent} from './current_collection_io.js';
export async function collectCurrentCapital({env=process.env,directory='data/v2',approved=false,ticker=null,fetchImpl=globalThis.fetch,now=()=>new Date().toISOString(),sleep=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 assertSafeKStockV2Environment(env);
 if(!approved||env.KSTOCK_V2_FORM4_ENABLED!=='true'||env.KSTOCK_RESEARCH_COLLECTION_ENABLED==='false')return {status:'DISABLED',externalRequests:0};
 if(!/^.{3,}\s+[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.KSTOCK_SEC_USER_AGENT||''))return {status:'BLOCKED',reason:'CURRENT_SEC_USER_AGENT_REQUIRED',externalRequests:0};
 const file=path.join(directory,'influence/current-capital-sources.json');
 return lockedCurrent(file,async()=>{
 const checkedAt=now(),previous=await readCurrent(file);
 const correctionFile=await readCurrent(path.join(directory,'influence/current-corrections.json'));
 const correctionReviews=(correctionFile?.reviews||[]).filter(r=>r.companyId);
 const companies={...(previous?.companies||{})};
 // Migrate the old Apple-only receipt without discarding evidence or bypassing its cache.
 if(previous&&!companies.AAPL)companies.AAPL={checkedAt:previous.checkedAt,status:previous.status,plan:previous.plan};
 const company=ticker?currentCompany(ticker):[...CURRENT_UNIVERSE].sort((a,b)=>(Date.parse(companies[a.ticker]?.checkedAt)||0)-(Date.parse(companies[b.ticker]?.checkedAt)||0))[0];
 const correctionRevision=createHash('sha256').update(JSON.stringify(correctionReviews.filter(r=>r.companyId===company.ticker))).digest('hex');
 const age=companies[company.ticker]?Date.parse(checkedAt)-Date.parse(companies[company.ticker].checkedAt):Infinity;
 if(Object.values(companies).some(c=>Date.parse(c.checkedAt)>Date.parse(checkedAt)))return {status:'BLOCKED',reason:'CURRENT_SOURCE_CLOCK_CONFLICT',externalRequests:0};
 if(age<24*3600000&&(!correctionReviews.some(r=>r.companyId===company.ticker)||companies[company.ticker]?.correctionRevision===correctionRevision))return {...previous,cached:true,externalRequests:0,newCapitalActions:0,newDocuments:0};
const records=[];let externalRequests=0;
const result={schemaVersion:1,checkedAt,status:'PARTIAL',newCapitalActions:0,newDocuments:0,targetTicker:company.ticker,companies,selectionPolicy:'FIXED_AAPL_MSFT_NVDA_OLDEST_CHECK_FIRST; LATEST_TWO_FORM4_WITHIN_30_DAYS; AMENDMENTS_BLOCK; NO_RETURN_SELECTION',events:previous?.events||[],documents:previous?.documents||[],collectionCoverage:'BOUNDED_NOT_EXHAUSTIVE',history:[...(previous?.history||[]),...(previous?[{checkedAt:previous.checkedAt,status:previous.status,documents:previous.documents}]:[])].slice(-30)};
async function get(url){
 if(++externalRequests>3)throw Error('CURRENT_SEC_CALL_LIMIT');
 const row={sourceUrl:url,checkedAt:now()};records.push(row);
 try{
  const r=await fetchImpl(url,{headers:{'User-Agent':env.KSTOCK_SEC_USER_AGENT,Accept:'application/json, application/xml'},redirect:'error',signal:AbortSignal.timeout(12000)});row.httpStatus=r.status;
  if(!r.ok)throw Error([401,403].includes(r.status)?'SEC_AUTH_BLOCKED':'SEC_HTTP_ERROR');
  const reader=r.body.getReader();let size=0,chunks=[];while(true){const x=await reader.read();if(x.done)break;size+=x.value.length;if(size>2000000){await reader.cancel();throw Error('CURRENT_SOURCE_TOO_LARGE');}chunks.push(Buffer.from(x.value));}
  const raw=Buffer.concat(chunks).toString('utf8');row.sourceHash=createHash('sha256').update(raw).digest('hex');return raw;
 }catch(e){row.reason=e.message.startsWith('SEC_')?e.message:'CURRENT_SOURCE_READ_FAILED';throw Error(row.reason);}
}
try{
 const meta=JSON.parse(await get(`https://data.sec.gov/submissions/CIK${company.cik}.json`));
 const plan=selectCurrentForm4(meta,checkedAt,{ticker:company.ticker,correctionReviews,completedIds:result.documents.map(d=>d.documentId)});result.plan=plan;
 for(const filing of plan.selected){await sleep(1100);filing.url=`https://www.sec.gov/Archives/edgar/data/${Number(company.cik)}/${filing.accessionNumber.replaceAll('-','')}/${filing.primaryDocument.split('/').at(-1)}`;
  const raw=await get(filing.url);const normalized=normalizeCurrentForm4(raw,filing,now(),company.ticker);
  if(normalized.events.length>100)throw Error('CURRENT_EVENT_LIMIT');
  result.newDocuments++;result.documents.push({companyId:company.ticker,documentId:filing.accessionNumber,filingDate:filing.filingDate,sourceUrl:filing.url,sourceHash:normalized.sourceHash,excludedRows:normalized.excludedCount});
  for(const event of normalized.events){const prior=result.events.find(x=>x.eventId===event.eventId);if(prior&&prior.sourceHash!==event.sourceHash){result.status='BLOCKED';result.reason='SOURCE_VERSION_REVIEW_REQUIRED';continue;}if(!prior){result.events.push(event);if(event.verificationStatus==='VERIFIED')result.newCapitalActions++;}}
 }
 result.reason=result.reason||plan.reason;
}catch(e){result.status='BLOCKED';result.reason=e.message.startsWith('SEC_')?e.message:'CURRENT_OFFICIAL_SOURCE_UNAVAILABLE';}
result.companies[company.ticker]={checkedAt,correctionRevision,status:result.status,reason:result.reason,plan:result.plan||null};
result.externalRequests=externalRequests;result.requests=records;
await saveCurrent(file,result);return result;

 });
}
