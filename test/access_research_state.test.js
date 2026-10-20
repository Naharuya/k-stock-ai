import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';import {researchProgress} from '../src/v2/backend_research_progress.js';
test('backend task completion never implies official source collection',()=>{const now=Date.parse('2026-10-20T00:00:00Z');assert.equal(researchProgress({checkedAt:'2026-10-19T23:59:00Z',status:'EVIDENCE_RECORDED',finishedAt:'2026-10-19T23:58:00Z',sourceCollection:'NOT_RUN',newOfficialDocuments:42},now).newOfficialDocuments,0);assert.equal(researchProgress({checkedAt:'2026-10-19T23:59:00Z',status:'EVIDENCE_RECORDED',finishedAt:'2026-10-19T23:58:00Z',sourceCollection:'DONE'},now).sourceCollection,'NOT_VERIFIED');for(const checkedAt of ['invalid','2026-10-18T00:00:00Z','2026-10-21T00:00:00Z'])assert.equal(researchProgress({checkedAt,status:'RUNNING'},now).status,'UNVERIFIED');});
test('late old-token rejection does not erase newly installed credential',async()=>{
 const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');const start=source.indexOf('async function candidateRequest(');const end=source.indexOf('\n}',start)+2;let settle;
 const context=vm.createContext({tokenInput:{value:'',focus(){}},fetch:()=>new Promise(resolve=>settle=resolve)});
 vm.runInContext('let sessionToken="old";'+source.slice(start,end),context);
 const pending=vm.runInContext('candidateRequest("/api/v2/candidates")',context);vm.runInContext('sessionToken="new"',context);settle({status:401});await assert.rejects(pending,/AUTH/);assert.equal(vm.runInContext('sessionToken',context),'new');
 const again=vm.runInContext('candidateRequest("/api/v2/candidates")',context);settle({status:401});await assert.rejects(again,/AUTH/);assert.equal(vm.runInContext('sessionToken',context),'');
});
test('republishing old work cannot renew research freshness',()=>{
 const now=Date.parse('2026-10-20T12:00:00Z');
 const base={checkedAt:'2026-10-20T11:59:00Z',status:'EVIDENCE_RECORDED',sourceCollection:'NOT_RUN',finishedAt:'2026-10-18T11:59:00Z'};
 assert.equal(researchProgress(base,now).reason,'RESEARCH_WORK_STALE');
 for(const finishedAt of [undefined,'invalid','2026-10-20T12:01:00Z'])assert.equal(researchProgress({...base,finishedAt},now).reason,'RESEARCH_WORK_TIME_UNVERIFIED');
 assert.equal(researchProgress({...base,finishedAt:'2026-10-20T11:58:00Z',startedAt:'2026-10-20T11:59:00Z'},now).reason,'RESEARCH_WORK_TIME_UNVERIFIED');
 const running=researchProgress({...base,status:'RUNNING',startedAt:'2026-10-20T11:57:00Z'},now);assert.equal(running.status,'RUNNING');assert.equal(running.workAt,'2026-10-20T11:57:00Z');assert.equal(running.finishedAt,null);
 assert.equal(researchProgress({...base,status:'DONE'},now).reason,'RESEARCH_STATUS_INVALID');
});

test('request cancellation works even when the Android bridge ignores AbortSignal',async()=>{
 const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');const start=source.indexOf('async function candidateRequest(');const end=source.indexOf('\n}',start)+2;let settle;
 const controller=new AbortController();const context=vm.createContext({controller,tokenInput:{value:'',focus(){}},fetch:()=>new Promise(resolve=>settle=resolve)});
 vm.runInContext('let sessionToken="current";'+source.slice(start,end),context);
 const pending=vm.runInContext('candidateRequest("/api/v2/research/progress",true,{signal:controller.signal})',context);
 controller.abort();await assert.rejects(pending,error=>error.name==='AbortError');settle({status:401});await new Promise(resolve=>setImmediate(resolve));assert.equal(vm.runInContext('sessionToken',context),'current');
});

test('JSON calculation requests carry content type and the serialized body',async()=>{
 const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');const start=source.indexOf('async function candidateRequest('),end=source.indexOf('\n}',start)+2;let captured;
 const context=vm.createContext({tokenInput:{value:'',focus(){}},fetch:async(url,options)=>{captured={url,options};return {status:200,ok:true,json:async()=>({success:true})};}});
 vm.runInContext('let sessionToken="fixture-token";'+source.slice(start,end),context);
 await vm.runInContext('candidateRequest("/api/v2/trading/holding-review",true,{method:"POST",body:{holding:{averageCost:100,quantity:1}}})',context);
 assert.equal(captured.options.headers['Content-Type'],'application/json');assert.equal(captured.options.method,'POST');assert.equal(JSON.parse(captured.options.body).holding.quantity,1);assert.equal(captured.options.headers.Authorization,'Bearer fixture-token');
});
test('legacy portfolio fetch has no dependency on calculation request options',async()=>{
 const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');const start=source.indexOf('async function loadPortfolio('),end=source.indexOf('\n}',start)+2;let fetched=false,rendered=false,last;
 const context=vm.createContext({tokenInput:{value:'',focus(){}},loadButton:{disabled:false},showMessage:(text,kind)=>last=kind,byId:()=>({}),numberFormat:{format:n=>String(n)},dateFormat:{format:()=>''},renderHoldings:()=>rendered=true,fetch:async()=>{fetched=true;return {status:200,ok:true,json:async()=>({data:{holdings:[],checkedAt:'2026-10-20T00:00:00Z'}})};}});
 vm.runInContext('let sessionToken="fixture-token",holdings=[];'+source.slice(start,end),context);await vm.runInContext('loadPortfolio()',context);assert.equal(fetched,true);assert.equal(rendered,true);assert.equal(last,'success');assert.equal(context.loadButton.disabled,false);
});
