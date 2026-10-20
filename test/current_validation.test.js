import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {validateCurrentCompanies,runCurrentValidation} from '../src/v2/current_validation.js';
const at='2026-10-19T08:00:00Z';
const capital={schemaVersion:1,checkedAt:at,companies:{AAPL:{status:'PARTIAL',checkedAt:at},NVDA:{status:'PARTIAL',checkedAt:at,reason:'CURRENT_AMENDMENT_REVIEW_REQUIRED'}},events:[]};
const run=(extra={})=>validateCurrentCompanies({asOf:at,capital,...extra});
test('saved validation separates exception from source success and never promotes a recommendation',()=>{
 const r=run();assert.equal(r.evaluated,3);assert.equal(r.externalRequests,0);assert.equal(r.exceptions.length,1);assert.equal(r.exceptions[0].companyId,'NVDA');assert.equal(r.exceptions[0].nextAction,'VERIFY_CORRECTION_CHAIN');assert.ok(r.companies.every(c=>c.recommendationStatus==='HOLD'));assert.equal(r.companies[0].status,'INSUFFICIENT_DATA');
});
test('unchanged company dependencies reuse results across restart; a single issuer change invalidates only that issuer',()=>{
 const first=run();const again=run({previous:JSON.parse(JSON.stringify(first))});assert.equal(again.evaluated,0);assert.equal(again.reused,3);
 const changed=structuredClone(capital);changed.companies.MSFT={status:'BLOCKED',checkedAt:at,reason:'SEC_AUTH_BLOCKED'};
 const r=run({previous:again,capital:changed});assert.equal(r.evaluated,1);assert.equal(r.reused,2);assert.equal(r.companies.find(c=>c.companyId==='MSFT').status,'BLOCKED');assert.equal(r.companies.find(c=>c.companyId==='AAPL').validatedAt,at);
});
test('daily freshness and validation policy revisions invalidate cached decisions',()=>{
 const first=run();assert.equal(run({previous:first,asOf:'2026-10-20T08:00:00Z'}).evaluated,3);
 assert.equal(run({previous:{...first,version:'old-policy'}}).evaluated,3);
});
test('future source or invalid input time fails closed instead of reusing a previous successful report',()=>{
 assert.throws(()=>run({capital:{...capital,checkedAt:'2026-10-20T08:00:00Z'}}),/INPUT_INVALID/);
 assert.throws(()=>run({asOf:'bad'}),/TIME_INVALID/);
 assert.throws(()=>run({market:{schemaVersion:1,checkedAt:'bad'}}),/INPUT_INVALID/);
});
test('persisted report recovers after restart and malformed source leaves last report intact; live trading fails before writes',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'kstock-validation-'));
 try{
 await mkdir(path.join(directory,'influence'));await writeFile(path.join(directory,'influence/current-capital-sources.json'),JSON.stringify(capital));
 const options={directory,env:{KSTOCK_BROKER_ENABLED:'false',KSTOCK_LIVE_TRADING_ENABLED:'false'},now:()=>at};
 const first=await runCurrentValidation(options);assert.equal(first.evaluated,3);assert.equal((await runCurrentValidation(options)).reused,3);
 const file=path.join(directory,'influence/current-validation.json'),before=await readFile(file,'utf8');
 await writeFile(path.join(directory,'influence/current-capital-sources.json'),'invalid json');await assert.rejects(runCurrentValidation(options));assert.equal(await readFile(file,'utf8'),before);
 await assert.rejects(runCurrentValidation({...options,env:{KSTOCK_LIVE_TRADING_ENABLED:'true'}}));
 }finally{await rm(directory,{recursive:true,force:true})}
});
test('price freshness expiry invalidates a cached company even within the same Korean date',()=>{
 const market={schemaVersion:1,checkedAt:'2026-10-18T00:00:00Z',companies:[{ticker:'AAPL',priceSnapshot:{sessionDate:'2026-10-11',status:'READY'}}]};
 const older={...capital,checkedAt:'2026-10-18T00:00:00Z'};
 const first=run({capital:older,market,asOf:'2026-10-18T23:59:00Z'});
 const next=run({capital:older,market,previous:first,asOf:'2026-10-19T00:01:00Z'});
 assert.equal(next.evaluated,1);assert.equal(next.reused,2);
});
test('a risk review change invalidates only the affected issuer snapshot',()=>{const first=run();const r=run({previous:first,riskReviews:{schemaVersion:1,checkedAt:at,reviews:[{companyId:'MSFT',domain:'REGULATORY',reviewStatus:'PENDING'}]}});assert.equal(r.evaluated,1);assert.equal(r.reused,2);});
