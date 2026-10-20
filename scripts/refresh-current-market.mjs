import {readFile} from 'node:fs/promises';
import dotenv from 'dotenv';
import {collectCurrentMarket} from '../src/v2/current_market_collection.js';
const env={...dotenv.parse(await readFile('.env','utf8')),...process.env};
const result=await collectCurrentMarket({env,approved:true,ticker:process.argv[2]||null});
console.log(JSON.stringify({status:result.status,targetTicker:result.targetTicker||null,reason:result.reason||null,nextRetryAt:result.nextRetryAt||null,cached:result.cached||false,externalRequests:result.externalRequests,companies:result.companies?.map(c=>({ticker:c.ticker,priceStatus:c.priceSnapshot?.status,priceDate:c.priceSnapshot?.sessionDate,corporateActions:c.corporateActionSnapshot?.status}))}));
