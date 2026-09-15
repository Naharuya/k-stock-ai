import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import * as kis from './services/kis_service.js';
assert.equal(typeof kis.kisRequestPolicy,'function','KIS configuration needs a finite bounded request policy');
assert.deepEqual(kis.kisRequestPolicy({}),{minIntervalMs:1200,maxRetries:2,retryMs:61000});
for(const value of ['Infinity','NaN','-1','invalid']){
  assert.deepEqual(kis.kisRequestPolicy({KIS_API_MIN_INTERVAL_MS:value,KIS_RATE_LIMIT_MAX_RETRIES:value,KIS_RATE_LIMIT_RETRY_MS:value}),{minIntervalMs:1200,maxRetries:2,retryMs:61000});
}
assert.deepEqual(kis.kisRequestPolicy({KIS_API_MIN_INTERVAL_MS:'0',KIS_RATE_LIMIT_MAX_RETRIES:'999999',KIS_RATE_LIMIT_RETRY_MS:'999999999'}),{minIntervalMs:1200,maxRetries:5,retryMs:300000});
assert.equal(kis.kisRequestPolicy({KIS_RATE_LIMIT_MAX_RETRIES:'1.5'}).maxRetries,2);
const root=await fs.mkdtemp(path.join(os.tmpdir(),'kstock-kis-policy-'));
const cwd=process.cwd(),originalFetch=globalThis.fetch;
const settings={KSTOCK_BROKER_ENABLED:'true',KSTOCK_LIVE_TRADING_ENABLED:'false',KIS_APP_KEY:'offline-placeholder',KIS_APP_SECRET:'offline-placeholder',KIS_ENV:'vts',KIS_RATE_LIMIT_MAX_RETRIES:'1',KIS_RATE_LIMIT_RETRY_MS:'1000',KIS_API_MIN_INTERVAL_MS:'1200'};
const previous=Object.fromEntries(Object.keys(settings).map(k=>[k,process.env[k]]));
let calls=0,active=0,maxActive=0,tokenCalls=0,status=200,code='0';
try{
  process.chdir(root);Object.assign(process.env,settings);
  globalThis.fetch=async(url,options)=>{
    const u=new URL(url);
    assert.equal(u.hostname,'openapivts.koreainvestment.com');
    if(u.pathname==='/oauth2/tokenP'){
      tokenCalls++;return new Response(JSON.stringify({access_token:'offline-placeholder',expires_in:86400}),{status:200});
    }
    assert.equal(options.method,'GET');assert.ok(u.pathname.startsWith('/uapi/domestic-stock/v1/quotations/'));
    calls++;active++;maxActive=Math.max(maxActive,active);
    await new Promise(resolve=>setTimeout(resolve,5));active--;
    return new Response(JSON.stringify(status===200?{rt_cd:'0',output:{stck_prpr:'2000'}}:{rt_cd:'1',msg_cd:code}),{status});
  };
  await fs.mkdir(path.join(root,'.cache'),{recursive:true});
  await fs.writeFile(path.join(root,'.cache','kis-token.json'),'SECRET123 not-json');
  const warnings=[],originalWarn=console.warn;
  try {
    console.warn=(...args)=>warnings.push(args.join(' '));
    await kis.getKisAccessToken();
  } finally { console.warn=originalWarn; }
  assert.equal(tokenCalls,1,'Corrupt token cache must fall back to token issuance');
  assert.ok(warnings.length>0,'Corrupt cache must produce a safe diagnostic');
  assert.ok(warnings.every(warning=>!warning.includes('SECRET123')),'Token cache warnings must not include file contents');
  assert.ok(warnings.includes('[KIS] token cache read skipped: INVALID_JSON'));
  const originalWrite=fs.writeFile;
  try {
    console.warn=(...args)=>warnings.push(args.join(' '));
    fs.writeFile=async()=>{throw new Error('SECRET123 write failure');};
    assert.equal(await kis.getKisAccessToken({force:true}),'offline-placeholder','Cache write failure must preserve usable token');
  } finally { fs.writeFile=originalWrite;console.warn=originalWarn; }
  assert.ok(warnings.includes('[KIS] token cache write skipped: WRITE_FAILED'));
  assert.ok(warnings.every(warning=>!warning.includes('SECRET123')),'Write errors must not leak their raw messages');
  for(const scenario of [{status:403,code:'FORBIDDEN',expected:1},{status:403,code:'EGW00201',expected:2},{status:429,code:'RATE_LIMIT',expected:2},{status:403,code:'EGW00123',expected:1}]){
    status=scenario.status;code=scenario.code;const before=calls;
    await assert.rejects(kis.getDomesticQuote('005930'),/KIS API failed/);
    assert.equal(calls-before,scenario.expected,'Error-specific retry count');
  }
  status=200;
  const quotes=await Promise.all([kis.getDomesticQuote('005930'),kis.getDomesticQuote('000660')]);
  assert.ok(quotes.every(q=>q.price===2000));assert.equal(maxActive,1);assert.equal(tokenCalls,2);
  console.log('KIS policy: safe corrupt-cache/write-failure diagnostics, finite settings, retry cap, 403 fail-fast, EGW00201/429 bounded retry, sequential queue, token reuse PASS (mock; no external requests).');
}finally{
  globalThis.fetch=originalFetch;process.chdir(cwd);
  for(const [key,value] of Object.entries(previous)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
  assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep));await fs.rm(root,{recursive:true,force:true});
}
