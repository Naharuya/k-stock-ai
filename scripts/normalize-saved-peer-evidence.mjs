import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {normalizeCollectedFinancials} from '../src/v2/collection_normalization.js';
const sourcePath=process.argv[2]||'data/v2/verification/peer-diagnostic-source-1791781714879.json';
const text=await readFile(sourcePath,'utf8'),source=JSON.parse(text),valuationDate='2026-10-08';
const peers=(source.peers||[]).map(peer=>{
 const company={ticker:peer.ticker,corpCode:peer.corpCode};
 // Preserve observed scope; do not certify units, publication, or correction from row labels.
 const scope={year:2026,reportCode:'11012',fsDiv:'CFS',unit:'KRW',unitVerified:false,publicationVerified:false,correctionStatus:'UNVERIFIED'};
 const results=Object.fromEntries(['financials','financial-periods'].map(operation=>[operation,normalizeCollectedFinancials(peer.raw?.[operation],company,scope,{valuationDate,collectedAt:source.checkedAt})]));
 return {ticker:peer.ticker,companyCode:peer.corpCode,results};
});
const file=`data/v2/verification/peer-normalization-review-${Date.now()}.json`;
const result={checkedAt:new Date().toISOString(),valuationDate,mode:'SAVED_EVIDENCE_ONLY',externalRequests:0,sourcePath,sourceSha256:createHash('sha256').update(text).digest('hex'),peers,valuationInputEligible:false};
await writeFile(file,JSON.stringify(result,null,2),{mode:0o600,flag:'wx'});
console.log(JSON.stringify({file,externalRequests:0,peers:peers.map(p=>({ticker:p.ticker,operations:Object.fromEntries(Object.entries(p.results).map(([key,value])=>[key,{records:value.records.length,status:value.status,issues:value.issues,valuationInputEligible:value.valuationInputEligible}]))}))}));
