import test from 'node:test';
import assert from 'node:assert/strict';
import {programSummary,cyclePolicy,cycleRequest} from '../scripts/macmini-program-policy.mjs';
const now=Date.parse('2026-10-20T08:00:00Z');
const progress=(patch={})=>({schemaVersion:1,checkedAt:'2026-10-20T07:00:00Z',stage:'GATE3',status:'RUNNING',totalCompanies:2,totalSecurities:3,checkedSecurities:2,verified:1,pending:1,blocked:0,unprocessed:1,...patch});
test('one successful job does not end the multi-stage program',()=>{
 assert.deepEqual(cyclePolicy({status:'EVIDENCE_RECORDED'},0,programSummary(progress(),now)),{run:true,mode:'CONTINUE_NEXT_UNFINISHED_TASK'});
 assert.equal(cyclePolicy({status:'RUNNING'},3,programSummary(null,now)).run,false);
});
test('repeated blocked jobs change recovery strategy instead of declaring completion',()=>{
 assert.deepEqual(cyclePolicy({status:'BLOCKED'},2,programSummary(null,now)),{run:true,mode:'REPAIR_EXECUTION'});
});
test('progress is unverified for forged completion, stale times and inconsistent counts',()=>{
 for(const patch of [{status:'COMPLETE'},{stage:'COMPLETE'},{checkedAt:'2026-10-18T00:00:00Z'},{checkedAt:'2026-10-21T00:00:00Z'},{totalSecurities:4},{checkedSecurities:3},{totalCompanies:4},{verified:-1},{blocked:'0'},{unprocessed:undefined},{totalCompanies:Number.MAX_SAFE_INTEGER+1}])assert.equal(programSummary(progress(patch),now).verification,'UNVERIFIED');
});
test('unknown totals stay null and reports never include arbitrary agent text',()=>{
 const r=programSummary(progress({totalCompanies:null,totalSecurities:null,checkedSecurities:null,verified:null,pending:null,blocked:null,unprocessed:null,nextAction:'SENSITIVE_TEXT'}),now);
 assert.equal(r.counts.totalSecurities,null);assert.equal(r.verification,'AGENT_REPORTED_NOT_INDEPENDENTLY_VERIFIED');assert.ok(!JSON.stringify(r).includes('SENSITIVE_TEXT'));
});
test('final self-report requires independent review and pending data cannot finish verification',()=>{
 const completed=progress({stage:'FINAL_REVIEW',status:'REVIEW_REQUIRED',checkedSecurities:3,verified:3,pending:0,blocked:0,unprocessed:0});
 const r=programSummary(completed,now);assert.equal(cyclePolicy({status:'EVIDENCE_RECORDED'},0,r).mode,'INDEPENDENT_FINAL_REVIEW_REQUIRED');
 assert.equal(cyclePolicy({},0,programSummary({...completed,pending:1,verified:2},now)).run,true);
 assert.equal(cyclePolicy({},0,programSummary({...completed,totalCompanies:0,totalSecurities:0,checkedSecurities:0,verified:0},now)).run,true);
});

test('dispatcher sends only the current gate to keep the local model task bounded',()=>{
 const full='## C. pilot\nEDIT_ONE_FILE\n## D. sources\nCOLLECT_ALL\n## E. universe\nALL_MARKETS';
 const r=cycleRequest(full,{stage:'GATE1'},'REPAIR_EXECUTION');assert.match(r,/EDIT_ONE_FILE/);assert.doesNotMatch(r,/COLLECT_ALL|ALL_MARKETS/);assert.match(r,/REPAIR_EXECUTION/);assert.throws(()=>cycleRequest('missing',{stage:'GATE1'},'X'));
});
