import test from 'node:test';import assert from 'node:assert/strict';
import {reviewDisclosure,reconcileEventSources,selectCurrentDisclosure} from '../src/v2/disclosure_review.js';
const doc={receipt:'fixture',title:'공시',originalStatus:'ORIGINAL_RETRIEVED',sha256:'a'.repeat(64),sourceUrl:'https://dart.fss.or.kr/fixture'};
test('unavailable original cannot be classified from title alone',()=>assert.equal(reviewDisclosure({...doc,originalStatus:'SOURCE_UNAVAILABLE'},{classification:'NOT_RELEVANT',reason:'title'}).classification,'SOURCE_UNAVAILABLE'));
test('keyword or original retrieval does not generate a corporate action',()=>{assert.equal(reviewDisclosure({...doc,title:'자기주식 배당'}).classification,'PENDING_VERIFICATION');assert.equal(reviewDisclosure(doc,{classification:'NOT_RELEVANT',reason:'ownership only'}).calculationEligible,false);});
test('record date and ex-date are compared independently across verified sources',()=>{
 const e={verificationStatus:'VERIFIED',calculationEligible:true};
 assert.equal(reconcileEventSources(e,[{sourceVerified:true,recordDate:'2026-09-30'},{sourceVerified:true,exDate:'2026-09-29'}]).verificationStatus,'VERIFIED');
 const r=reconcileEventSources(e,[{sourceVerified:true,exDate:'2026-09-29'},{sourceVerified:true,exDate:'2026-09-28'}]);assert.equal(r.verificationStatus,'CONFLICT');assert.equal(r.calculationEligible,false);
});
test('correction requires explicit document relationship and source availability',()=>{
 assert.equal(selectCurrentDisclosure([{...doc,title:'정정'}],'old').status,'UNCHANGED');
 assert.equal(selectCurrentDisclosure([{...doc,supersedesReceipt:'old'}],'old').status,'CORRECTION_AVAILABLE');
 assert.equal(selectCurrentDisclosure([{...doc,supersedesReceipt:'old'},{...doc,supersedesReceipt:'old'}],'old').status,'CONFLICT');
});
