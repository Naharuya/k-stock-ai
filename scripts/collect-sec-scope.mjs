import {readFile} from 'node:fs/promises';import dotenv from 'dotenv';import {collectSecScope} from '../src/v2/sec_scope_collection.js';import {readCurrent} from '../src/v2/current_collection_io.js';
const env={...dotenv.parse(await readFile('.env','utf8')),...process.env};const policy=await readCurrent('data/v2/data-collection/research-policy.json');if(!policy.enabled||!policy.sources.includes('SEC'))throw Error('APPROVED_SEC_REQUIRED');
console.log(JSON.stringify(await collectSecScope({env,approved:true,ticker:process.argv[2],maxRequests:12})));
