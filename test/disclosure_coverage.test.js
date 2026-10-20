import test from 'node:test';
import assert from 'node:assert/strict';
import {createOpenDartClient} from '../src/services/opendart_client.js';
const scope={corpCode:'00126380',beginDate:'20260826',endDate:'20261008'};
test('monthly listing scope remains distinct from verified action coverage',async()=>{
 const out=await createOpenDartClient({request:async()=>({status:'013'})}).getDisclosures(scope);
 assert.equal(out.windows.length,3);assert.equal(out.windows[0].beginDate,'20260826');
 assert.equal(out.windows[2].endDate,'20261008');assert.equal(out.truncated,false);
 assert.equal(out.corporateActionCoverageVerified,false);
});
test('pagination limit is recorded per window and cannot imply full coverage',async()=>{
 const out=await createOpenDartClient({request:async()=>({status:'000',total_page:2,list:[{rcept_no:'fixture'}]})}).getDisclosures({...scope,maxPages:1});
 assert.equal(out.truncated,true);assert.ok(out.windows.every(x=>x.truncated));assert.equal(out.items.length,1);
});
test('missing or contradictory pagination metadata fails closed',async()=>{
 for(const total_page of [undefined,0,'invalid']){
  const out=await createOpenDartClient({request:async()=>({status:'000',total_page,list:[]})}).getDisclosures(scope);
  assert.equal(out.truncated,true);assert.ok(out.windows.every(x=>x.totalPages===null));
 }
});
