import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';import {researchProgress} from '../src/v2/backend_research_progress.js';
test('backend task completion never implies official source collection',()=>{const now=Date.parse('2026-10-20T00:00:00Z');assert.equal(researchProgress({checkedAt:'2026-10-19T23:59:00Z',status:'EVIDENCE_RECORDED',sourceCollection:'NOT_RUN',newOfficialDocuments:42},now).newOfficialDocuments,0);assert.equal(researchProgress({checkedAt:'2026-10-19T23:59:00Z',status:'EVIDENCE_RECORDED',sourceCollection:'DONE'},now).sourceCollection,'NOT_VERIFIED');for(const checkedAt of ['invalid','2026-10-18T00:00:00Z','2026-10-21T00:00:00Z'])assert.equal(researchProgress({checkedAt,status:'RUNNING'},now).status,'UNVERIFIED');});
test('late old-token rejection does not erase newly installed credential',async()=>{
 const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');const start=source.indexOf('async function candidateRequest(');const end=source.indexOf('\n}',start)+2;let settle;
 const context=vm.createContext({tokenInput:{value:'',focus(){}},fetch:()=>new Promise(resolve=>settle=resolve)});
 vm.runInContext('let sessionToken="old";'+source.slice(start,end),context);
 const pending=vm.runInContext('candidateRequest("/api/v2/candidates")',context);vm.runInContext('sessionToken="new"',context);settle({status:401});await assert.rejects(pending,/AUTH/);assert.equal(vm.runInContext('sessionToken',context),'new');
 const again=vm.runInContext('candidateRequest("/api/v2/candidates")',context);settle({status:401});await assert.rejects(again,/AUTH/);assert.equal(vm.runInContext('sessionToken',context),'');
});
