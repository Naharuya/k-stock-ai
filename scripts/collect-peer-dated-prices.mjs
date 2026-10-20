import 'dotenv/config';
import {mkdir,writeFile} from 'node:fs/promises';
import {createKisRequest} from '../src/services/kis_request.js';
import {assertSafeKStockV2Environment} from '../src/v2/scoring.js';
assertSafeKStockV2Environment(process.env);
if(process.cwd()!=='/Users/ari/ARI/projects/k-stock-ai'||process.argv[2]!=='--read-only')throw Error('READ_ONLY_SCOPE_REQUIRED');
const checkedAt=new Date().toISOString(),valuationDate='2026-10-08';
let marketReads=0,tokenReads=0;
const request=createKisRequest({fetchImpl:async(url,opts)=>{if(new URL(url).pathname==='/oauth2/tokenP')tokenReads++;else marketReads++;return fetch(url,opts);}});
const peers=[];
for(const ticker of ['000660','000990','042700']){
 try{
 const raw=await request({service:'kis',operation:'daily-prices',symbol:ticker,params:{from:'20261008',to:'20261008'}});
 const rows=Array.isArray(raw.output)?raw.output:Array.isArray(raw.output2)?raw.output2:[];
 const row=rows.find(x=>x.stck_bsop_date==='20261008');
 const close=Number(row?.stck_clpr);
 peers.push({ticker,checkedAt,valuationDate,source:'KIS inquire-daily-price',sourceUrl:'https://github.com/koreainvestment/open-trading-api/blob/main/examples_llm/domestic_stock/inquire_daily_price/inquire_daily_price.py',stockClass:'COMMON',currency:'KRW',priceBasis:'RAW',adjustmentParameter:'0',request:{from:'20261008',to:'20261008'},responseStatus:raw.rt_cd,raw,price:row&&Number.isFinite(close)&&close>0?{status:'VERIFIED_DATE_CLOSE',close,asOfDate:valuationDate,sessionDate:valuationDate,source:'KIS',currency:'KRW',stockClass:'COMMON',shareClass:'COMMON',basis:'RAW',sourceUrl:'https://github.com/koreainvestment/open-trading-api/blob/main/examples_llm/domestic_stock/inquire_daily_price/inquire_daily_price.py',availableAt:null,retrievedAt:checkedAt,availabilityStatus:'OFFICIAL_TRADING_DATE_CONFIRMED_RETRIEVED_AFTER_SESSION'}:null,marketCap:null,marketCapStatus:'NOT_PROVIDED_BY_DAILY_ENDPOINT',currentShareCountStatus:'UNVERIFIED_POST_REPORT_ACTIONS',limitation:'DATED_CLOSE_ONLY_NOT_CAPITAL_PROOF_OR_RETURN_COVERAGE'});
 }catch(error){peers.push({ticker,checkedAt,status:'FAILED',reason:error.code||'READ_FAILED'});}
}
const out={checkedAt,valuationDate,marketReads,tokenReads,peers,globalCandidates:{tickers:['MU','TSM','UMC'],status:'NOT_FETCHED',reason:'Existing approved KIS domestic client does not cover global securities; no unapproved service or currency conversion introduced.'}};
await mkdir('data/v2/verification',{recursive:true});const file=`data/v2/verification/peer-dated-prices-${Date.now()}.json`;await writeFile(file,JSON.stringify(out,null,2),{mode:0o600});
console.log(JSON.stringify({file,marketReads,tokenReads,peers:peers.map(p=>({ticker:p.ticker,status:p.price?.status||p.status||'MISSING_DATE',close:p.price?.close,date:p.price?.asOfDate}))}));
