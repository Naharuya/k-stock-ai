// Bounded one-off use of an already enabled SEC read path. No scheduler/credentials changes.
import {readFile} from 'node:fs/promises';
import dotenv from 'dotenv';
import {assertSafeKStockV2Environment} from '../src/v2/scoring.js';
import {collectCurrentCapital} from '../src/v2/current_capital_collection.js';
const env={...dotenv.parse(await readFile('.env','utf8')),...process.env};assertSafeKStockV2Environment(env);
const policy=JSON.parse(await readFile('data/v2/data-collection/research-policy.json','utf8'));
if(!policy.enabled||!policy.sources.includes('SEC')||env.KSTOCK_V2_FORM4_ENABLED!=='true'||env.KSTOCK_RESEARCH_COLLECTION_ENABLED==='false')throw Error('CURRENT_SEC_PATH_NOT_ENABLED');
if(!/^.{3,}\s+[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.KSTOCK_SEC_USER_AGENT||''))throw Error('CURRENT_SEC_USER_AGENT_REQUIRED');
const result=await collectCurrentCapital({env,approved:true});
console.log(JSON.stringify({status:result.status,reason:result.reason,cached:result.cached||false,externalRequests:result.externalRequests,documents:result.documents?.length||0,verifiedEvents:result.events?.filter(e=>e.verificationStatus==='VERIFIED').length||0}));
