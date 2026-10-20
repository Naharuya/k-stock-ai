import {extractSecRiskNotes} from './sec_risk_notes.js';
import {backfillSecCoverShares} from './sec_share_backfill.js';
import path from 'node:path';
import {currentCompany} from './current_universe.js';import {assertSafeKStockV2Environment} from './scoring.js';
import {readCurrent,saveCurrent,lockedCurrent} from './current_collection_io.js';import {matchSecConsolidatedFacts,xbrlHash,reviewConsolidatedSummary,extractCoverShares,extractCapitalShareRecords,extractShareCapitalFlows,reviewConsolidationPolicy} from './sec_xbrl_scope.js';
export async function collectSecScope({env=process.env,approved=false,ticker='AAPL',directory='data/v2',maxRequests=3,fetchImpl=globalThis.fetch,now=()=>new Date().toISOString(),sleep=ms=>new Promise(r=>setTimeout(r,ms))}={}){
assertSafeKStockV2Environment(env);if(!approved||env.KSTOCK_V2_FINANCIALS_ENABLED!=='true'||env.KSTOCK_RESEARCH_COLLECTION_ENABLED==='false')return {status:'DISABLED',externalRequests:0};
if(!Number.isInteger(maxRequests)||maxRequests<0||maxRequests>12)throw Error('SCOPE_BUDGET_INVALID');
if(!/^.{3,}\s+[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.KSTOCK_SEC_USER_AGENT||''))return {status:'BLOCKED',reason:'SEC_USER_AGENT_REQUIRED',externalRequests:0};
const company=currentCompany(ticker),financial=await readCurrent(path.join(directory,'influence/current-financials.json')),row=financial?.companies?.find(c=>c.ticker===company.ticker);if(!row?.quarterHistory)return {status:'INSUFFICIENT_DATA',externalRequests:0};
const docs=new Map();for(const m of Object.values(row.quarterHistory.metrics))for(const f of m.frames.slice(-4))for(const input of f.inputs){if(!docs.has(input.documentId))docs.set(input.documentId,[]);if(!docs.get(input.documentId).some(x=>JSON.stringify(x)===JSON.stringify(input)))docs.get(input.documentId).push(input);}
const conflicts=await readCurrent(path.join(directory,'influence/sec-quarter-conflict-review.json'));if(conflicts?.companyId===company.ticker)for(const m of Object.values(conflicts.metrics))for(const pair of m.conflicts||[])for(const input of [...pair.before.inputs,...pair.after.inputs]){if(!docs.has(input.documentId))docs.set(input.documentId,[]);if(!docs.get(input.documentId).some(x=>JSON.stringify(x)===JSON.stringify(input)))docs.get(input.documentId).push(input);}
const file=path.join(directory,'influence/sec-scope-reviews.json');let calls=0;
async function get(url){if(calls>=maxRequests)throw Error('SCOPE_CALL_LIMIT');calls++;await sleep(1100);const r=await fetchImpl(url,{headers:{'User-Agent':env.KSTOCK_SEC_USER_AGENT},redirect:'error',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('SEC_HTTP_'+r.status);const reader=r.body.getReader(),chunks=[];let n=0;while(true){const x=await reader.read();if(x.done)break;n+=x.value.length;if(n>15000000){await reader.cancel();throw Error('SCOPE_SIZE_LIMIT');}chunks.push(Buffer.from(x.value));}return Buffer.concat(chunks).toString('utf8');}
return lockedCurrent(file,async()=>{
 const old=await readCurrent(file)||{reviews:[]},reviews=[...old.reviews];
 if(reviews.some(r=>(r.reason==='SEC_AUTH_BLOCKED'||r.shareBackfill?.reason==='SEC_AUTH_BLOCKED')&&Date.parse(now())-Date.parse(r.shareBackfill?.checkedAt||r.checkedAt)<86400000))return {status:'BLOCKED',reason:'SEC_AUTH_BLOCKED',externalRequests:0,documents:docs.size};
 for(const [documentId,inputs]of docs){const cached=reviews.find(r=>r.companyId===company.ticker&&r.documentId===documentId&&r.status==='VERIFIED'&&inputs.every(i=>r.matches.some(m=>m.tag===i.tag&&m.start===i.start&&m.end===i.end&&m.value===i.value)));if(cached?.statementScope){
 if(Array.isArray(cached.shareRecords)&&(cached.documentId!==row.interimSnapshot?.accessionNumber||Array.isArray(cached.riskNotes)))continue;
 if(cached.shareBackfill?.status==='BLOCKED'&&Date.parse(now())-Date.parse(cached.shareBackfill.checkedAt)<86400000)continue;
 if(calls>=maxRequests)break;
 const expected=`https://www.sec.gov/Archives/edgar/data/${Number(company.cik)}/${documentId.replaceAll('-','')}/`;
 try{if(!cached.sourceUrl?.startsWith(expected)||!/^[\w.-]+_htm\.xml$/.test(cached.sourceUrl.slice(expected.length)))throw Error('SHARE_BACKFILL_SOURCE_INVALID');const raw=await get(cached.sourceUrl);Object.assign(cached,backfillSecCoverShares(cached,raw,company.ticker,now()));}
 catch(e){cached.shareBackfill={status:'BLOCKED',checkedAt:now(),reason:['SEC_HTTP_401','SEC_HTTP_403'].includes(e.message)?'SEC_AUTH_BLOCKED':e.message==='SHARE_BACKFILL_HASH_CONFLICT'?'SOURCE_HASH_CONFLICT':'SHARE_BACKFILL_UNAVAILABLE'};}
 await saveCurrent(file,{schemaVersion:1,checkedAt:now(),reviews});if(cached.shareBackfill?.reason==='SEC_AUTH_BLOCKED')break;continue;
 }
 if(!/^\d{10}-\d{2}-\d{6}$/.test(documentId))throw Error('SCOPE_DOCUMENT_INVALID');
 const recent=reviews.findLast(r=>r.companyId===company.ticker&&r.documentId===documentId);if(recent&&['BLOCKED','PARTIAL'].includes(recent.status)&&Date.parse(now())-Date.parse(recent.checkedAt)<86400000)continue;
 if(calls+(cached?1:3)>maxRequests)break;
 const base=`https://www.sec.gov/Archives/edgar/data/${Number(company.cik)}/${documentId.replaceAll('-','')}/`;
 try{if(cached){const summary=await get(base+'FilingSummary.xml');cached.statementScope=reviewConsolidatedSummary(summary);cached.scopeCheckedAt=now();cached.statementSourceHash=xbrlHash(summary);cached.statementSourceUrl=base+'FilingSummary.xml';await saveCurrent(file,{schemaVersion:1,checkedAt:now(),reviews});continue;}const index=JSON.parse(await get(base+'index.json'));const names=index.directory.item.map(x=>x.name).filter(n=>/^[\w.-]+_htm\.xml$/.test(n));if(names.length!==1)throw Error('SCOPE_INSTANCE_AMBIGUOUS');const sourceUrl=base+names[0],raw=await get(sourceUrl),checkedAt=now(),matches=matchSecConsolidatedFacts(raw,company,inputs),summary=await get(base+'FilingSummary.xml');reviews.push({companyId:company.ticker,documentId,sourceUrl,sourceHash:xbrlHash(raw),checkedAt,status:matches.every(m=>m.status==='VERIFIED')?'VERIFIED':'PARTIAL',matches,consolidationPolicyProof:{...reviewConsolidationPolicy(raw,company),sourceHash:xbrlHash(raw),sourceUrl,checkedAt:now()},capitalFlows:extractShareCapitalFlows(raw,company),shareRecords:extractCoverShares(raw,company),capitalShareRecords:extractCapitalShareRecords(raw,company),riskNotes:extractSecRiskNotes(raw,company),riskNotesCheckedAt:checkedAt,scopeCheckedAt:now(),statementScope:reviewConsolidatedSummary(summary),statementSourceHash:xbrlHash(summary),statementSourceUrl:base+'FilingSummary.xml'});}
 catch(error){reviews.push({companyId:company.ticker,documentId,checkedAt:now(),status:'BLOCKED',reason:['SEC_HTTP_401','SEC_HTTP_403'].includes(error.message)?'SEC_AUTH_BLOCKED':'OFFICIAL_INSTANCE_REVIEW_UNAVAILABLE'});}
 await saveCurrent(file,{schemaVersion:1,checkedAt:now(),reviews});
 }
 return {status:'CHECKED_WITH_HOLDS',externalRequests:calls,documents:docs.size};
});
}
