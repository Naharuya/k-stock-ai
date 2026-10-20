import {readFile} from 'node:fs/promises';
import dotenv from 'dotenv';
import {collectCurrentFinancials} from '../src/v2/current_financials.js';
const env={...dotenv.parse(await readFile('.env','utf8')),...process.env};
const policy=JSON.parse(await readFile('data/v2/data-collection/research-policy.json','utf8'));
if(!policy.enabled||!policy.sources.includes('SEC'))throw Error('APPROVED_SEC_PATH_REQUIRED');
const ticker=process.argv[2]||null;
const r=await collectCurrentFinancials({env,approved:true,ticker});
console.log(JSON.stringify({status:r.status,cached:r.cached===true,externalRequests:r.externalRequests,companies:r.companies?.map(c=>({ticker:c.ticker,status:c.status,reason:c.reason,periodEnd:c.financialSnapshot?.periodEnd,filed:c.financialSnapshot?.filed}))}));
