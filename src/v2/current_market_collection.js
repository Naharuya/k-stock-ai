import {marketNextAttempt,selectDueMarketCompany} from './market_collection_due.js';
import {CURRENT_UNIVERSE,currentCompany} from './current_universe.js';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {createUsPriceRefresh} from './us_prices.js';
import {assertSafeKStockV2Environment} from './scoring.js';
import {readCurrent,saveCurrent,lockedCurrent} from './current_collection_io.js';
export async function collectCurrentMarket({env=process.env,directory='data/v2',approved=false,ticker=null,fetchImpl=globalThis.fetch,now=()=>new Date().toISOString()}={}){
 assertSafeKStockV2Environment(env);
 if(!approved||env.KSTOCK_V2_US_PRICE_ENABLED!=='true'||env.KSTOCK_RESEARCH_COLLECTION_ENABLED==='false')return {status:'DISABLED',externalRequests:0};
 const file=path.join(directory,'influence/current-market-snapshots.json');
 return lockedCurrent(file,async()=>{
 const checkedAt=now(),previous=await readCurrent(file);
 const checks={...(previous?.checks||{})};
 for(const c of previous?.companies||[])if(!checks[c.ticker])checks[c.ticker]={checkedAt:previous.checkedAt,status:previous.status};
 if(Object.values(checks).some(c=>Date.parse(c.checkedAt)>Date.parse(checkedAt)))return {status:'BLOCKED',reason:'CURRENT_SOURCE_CLOCK_CONFLICT',externalRequests:0};
 const provider=await readCurrent(path.join(directory,'alpha-vantage-state.json'))||{};
 const target=ticker?currentCompany(ticker):selectDueMarketCompany(CURRENT_UNIVERSE,checks,provider,checkedAt);
 const nextRetry=()=>{const times=CURRENT_UNIVERSE.map(c=>marketNextAttempt(checks[c.ticker],provider)).filter(t=>t>Date.parse(checkedAt));return times.length?new Date(Math.min(...times)).toISOString():null;};
 if(!target||marketNextAttempt(checks[target.ticker],provider)>Date.parse(checkedAt))return {...previous,cached:true,externalRequests:0,nextRetryAt:nextRetry()};
const input=JSON.parse(await readFile(path.join(path.dirname(directory),'v2-input.json'),'utf8'));
const report=JSON.parse(await readFile(env.KSTOCK_V2_OUTPUT_PATH||path.join(directory,'reports/latest.json'),'utf8'));
const base=input.companies.find(c=>c.ticker===target.ticker&&c.market==='GLOBAL')||{...target,market:'GLOBAL',currency:'USD'};
const saved=report.candidates.find(c=>c.ticker===target.ticker);
let externalRequests=0;
const boundedFetch=async(...args)=>{if(++externalRequests>2)throw Error('CURRENT_PRICE_CALL_LIMIT');return fetchImpl(...args);};
const result={schemaVersion:1,checkedAt,targetTicker:target.ticker,checks,history:[...(previous?.history||[]),...(previous?[{checkedAt:previous.checkedAt,companies:previous.companies}]:[])].slice(-30),companies:previous?.companies||[]};
try{
 const output=await createUsPriceRefresh({env,fetchImpl:boundedFetch,statePath:path.join(directory,'alpha-vantage-state.json'),now:()=>Date.parse(checkedAt)})({analysisDate:checkedAt,companies:[{...base,financialSnapshot:saved?.financialSnapshot}],evidence:[]});
 result.companies=[...result.companies.filter(c=>c.ticker!==target.ticker),...output.companies.map(c=>({ticker:c.ticker,companyName:c.companyName,market:c.market,priceSnapshot:c.priceSnapshot,corporateActionSnapshot:c.corporateActionSnapshot,recommendationStatus:'HOLD',checkedAt}))];
 result.status='PARTIAL';
}catch(error){result.status='BLOCKED';result.reason=/^(?:PRICE|SPLITS)_(?:PROVIDER_COOLDOWN|PROVIDER_UNAVAILABLE|LOCAL_REQUEST_LIMIT|COLLECTION_BUSY|STATE_INVALID|API_KEY_REQUIRED|NETWORK_UNAVAILABLE|HTTP_UNAVAILABLE)$/.test(error.message)?error.message:'CURRENT_MARKET_DATA_UNAVAILABLE';}
result.checks[target.ticker]={checkedAt,status:result.status,reason:result.reason||null,attempts:result.status==='BLOCKED'?(checks[target.ticker]?.attempts||0)+1:0};const after=await readCurrent(path.join(directory,'alpha-vantage-state.json'))||provider;result.checks[target.ticker].nextRetryAt=new Date(marketNextAttempt(result.checks[target.ticker],after)).toISOString();result.nextRetryAt=result.checks[target.ticker].nextRetryAt;result.externalRequests=externalRequests;await saveCurrent(file,result);return result;

 });
}
