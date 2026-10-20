import test from 'node:test';import assert from 'node:assert/strict';import {reconcilePeerShares as reconcile,SHARE_BRIDGE_TYPES} from '../src/v2/peer_share_bridge.js';
const baseline={verificationStatus:'VERIFIED',asOfDate:'2026-06-30',availableAt:'2026-08-14T00:00:00Z',sourceUrl:'https://dart.fss.or.kr/dsaf001/main.do?rcpNo=1',shareClass:'COMMON',issuedShares:1000,treasuryShares:100};
const coverage={verified:true,fromDate:'2026-06-30',toDate:'2026-10-08',sourceUrl:baseline.sourceUrl,types:SHARE_BRIDGE_TYPES};const event=(type,delta)=>({type,delta,effectiveDate:'2026-09-01',availableAt:'2026-09-02T00:00:00Z',verificationStatus:'VERIFIED',shareClass:'COMMON',sourceUrl:baseline.sourceUrl,sourceDocumentId:'receipt'});const run=events=>reconcile({baseline,coverage,valuationDate:'2026-10-08',events});
test('verified baseline and full action coverage carry forward issued and treasury separately',()=>{const r=run([event('TREASURY_CHANGE',-10),event('CONVERSION',20)]);assert.equal(r.issuedShares,1020);assert.equal(r.treasuryShares,90);assert.equal(r.outstandingShares,930);});
test('actual treasury cancellation reduces issued and treasury but not outstanding',()=>{const r=run([event('CANCELLATION',-40)]);assert.equal(r.issuedShares,960);assert.equal(r.treasuryShares,60);assert.equal(r.outstandingShares,900);});
test('decision-only cancellation and incomplete list coverage never produce valuation shares',()=>{assert.equal(run([{...event('CANCELLATION',-40),status:'DECISION_ONLY'}]).issuedShares,null);assert.equal(reconcile({baseline,valuationDate:'2026-10-08',coverage:{...coverage,verified:false}}).issuedShares,null);});
test('future correction, duplicated event and wrong share class are blocked',()=>{for(const events of [[{...event('RIGHTS_ISSUE',20),availableAt:'2026-10-09T00:00:00Z'}],[event('RIGHTS_ISSUE',20),event('RIGHTS_ISSUE',20)],[{...event('RIGHTS_ISSUE',20),shareClass:'PREFERRED'}]])assert.equal(run(events).verificationStatus,'SHARE_COUNT_UNVERIFIED');});
test('same-day official conflicting checkpoint blocks an otherwise verified bridge',()=>{const r=reconcile({baseline,valuationDate:'2026-10-08',coverage,checkpoints:[{...baseline,asOfDate:'2026-10-08',issuedShares:999}]});assert.ok(r.reasons.includes('OFFICIAL_CHECKPOINT_CONFLICT'));assert.equal(r.issuedShares,null);});
test('missing warrants coverage and fractional split counts cannot pass',()=>{assert.equal(reconcile({baseline,valuationDate:'2026-10-08',coverage:{...coverage,types:SHARE_BRIDGE_TYPES.filter(t=>t!=='WARRANT_EXERCISE')}}).issuedShares,null);assert.equal(run([{...event('REVERSE_SPLIT',0),ratio:0.0033}]).issuedShares,null);});

test('intermediate checkpoint compares its own date and blocks unexplained changes',()=>{
 const point={...baseline,asOfDate:'2026-08-21',issuedShares:1000,treasuryShares:80};
 const r=reconcile({baseline,valuationDate:'2026-10-08',coverage,events:[{...event('TREASURY_CHANGE',-10),effectiveDate:'2026-08-19'},event('RIGHTS_ISSUE',20)],checkpoints:[point]});
 assert.equal(r.checkpointReviews[0].issuedDifference,0);assert.equal(r.checkpointReviews[0].treasuryDifference,10);assert.equal(r.reconciliationStatus,'SOURCE_CONFLICT');assert.equal(r.issuedShares,null);
});
test('partial issued-only checkpoints do not require an unreported treasury number',()=>{
 const {treasuryShares,...point}={...baseline,asOfDate:'2026-08-21'};
 const r=reconcile({baseline,valuationDate:'2026-10-08',coverage,events:[event('RIGHTS_ISSUE',20)],checkpoints:[point]});
 assert.equal(r.verificationStatus,'VERIFIED');assert.equal(r.checkpointReviews[0].treasuryDifference,null);assert.equal(r.checkpointReviews[0].issuedDifference,0);
});
test('future publication and a different share class cannot verify a checkpoint',()=>{
 const r=reconcile({baseline,valuationDate:'2026-10-08',coverage,checkpoints:[{...baseline,asOfDate:'2026-08-21',issuedShares:999,availableAt:'2026-10-09T00:00:00Z'},{...baseline,asOfDate:'2026-08-21',issuedShares:999,shareClass:'PREFERRED'}]});assert.equal(r.checkpointReviews.length,0);assert.equal(r.verificationStatus,'VERIFIED');
});

test('original observation exposes a partial-input difference without promoting it to verified shares',()=>{
 const r=reconcile({baseline:{...baseline,verificationStatus:'PENDING_VERIFICATION'},valuationDate:'2026-10-08',coverage:{...coverage,verified:false},events:[{...event('TREASURY_CHANGE',-10),effectiveDate:'2026-08-19'}],checkpoints:[{...baseline,verificationStatus:undefined,status:'OFFICIAL_DOCUMENT_OBSERVED',sourceIntegrityVerified:true,asOfDate:'2026-08-21',treasuryShares:80}]});assert.equal(r.checkpointReviews[0].treasuryDifference,10);assert.equal(r.checkpointReviews[0].status,'PARTIAL_INPUT_OBSERVATION');assert.equal(r.issuedShares,null);assert.equal(r.reasons.includes('OFFICIAL_CHECKPOINT_CONFLICT'),false);
});
