import test from 'node:test';import assert from 'node:assert/strict';
import {verifiedMobileReceipt,assessMobileRelease,MOBILE_INTEGRATION_CHECKS} from '../src/v2/mobile_release_readiness.js';
const now=Date.parse('2026-10-20T00:00:00Z');
const receipt=physicalDevice=>({physicalDevice,result:{status:'PASS',checkedAt:'2026-10-19T23:59:00Z',checks:Object.fromEntries(MOBILE_INTEGRATION_CHECKS.map(key=>[key,true]))}});
test('mobile receipts require each intended check, freshness and actual device class',()=>{
 assert.equal(verifiedMobileReceipt(receipt(true),{physicalDevice:true,now}),true);
 for(const mutate of [x=>delete x.result.checks.undo,x=>x.result.status='EXECUTED',x=>x.result.checkedAt='2026-10-10T00:00:00Z',x=>x.result.checkedAt='2026-10-21T00:00:00Z',x=>x.physicalDevice=false]){const x=receipt(true);mutate(x);assert.equal(verifiedMobileReceipt(x,{physicalDevice:true,now}),false);}
});
test('successful synthetic integration cannot enable public distribution or financial recommendations',()=>{
 const result=assessMobileRelease({now,receipts:{galaxy:receipt(true),iphone:receipt(true),simulator:receipt(false)},regressionPassed:true,androidBuilt:true,iosBuilt:true,backend:{newOfficialDocuments:0,candidates:[{valuation:{status:'HOLD'},shareDateReview:{bridgeEligible:false}}]}});
 assert.equal(result.reviewReady,true);assert.equal(result.productionDistribution,'BLOCKED');assert.equal(result.financialFeatureActivation,'BLOCKED');assert.equal(result.recommendationStatus,'HOLD');assert.equal(result.liveTradingEnabled,false);
});
test('one missing physical receipt or failed build prevents a complete review bundle',()=>{
 const result=assessMobileRelease({now,receipts:{galaxy:receipt(true),simulator:receipt(false)},regressionPassed:true,androidBuilt:false,iosBuilt:true});assert.equal(result.reviewReady,false);assert.ok(result.blockers.includes('BUILD_OR_CURRENT_INTEGRATION_EVIDENCE_REQUIRED'));
});
