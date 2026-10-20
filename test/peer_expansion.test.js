import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPeerExpansionReview } from '../src/v2/peer_expansion.js';
import { applyPeerExpansionReview } from '../scripts/build-peer-expansion-review.mjs';
const date='2026-10-12T12:00:00Z';
function fixture(ticker='005930') {
 return {ticker,market:'KR',industryCode:'264',krSnapshot:{price:{qualityStatus:'READY',currency:'KRW',asOfDate:'2026-10-08',marketCap:1000,corporateActionsReviewed:true},financial:{qualityStatus:'READY',currency:'KRW',unit:'KRW',publishedAt:'2026-02-01T00:00:00Z',fiscalPeriod:{start:'2025-01-01',end:'2025-12-31',basis:'CFS'},raw:{netIncome:100,equity:100,revenue:100}}},businessComparability:{verified:true,targetTicker:'005930',scope:'CONSOLIDATED_COMPANY'},businessEvidence:{verified:true,sourceUrl:'https://www.skhynix.com/',reviewedAt:date,summary:'사업 근거'}};
}
test('peer minimum stays three and two valid rows do not enable ranking',()=>{
 const r=buildPeerExpansionReview(fixture(),[fixture('000001'),fixture('000002')],date);
 assert.equal(r.counts.ELIGIBLE,2);assert.equal(r.minimum,3);assert.equal(r.status,'INSUFFICIENT_DATA');assert.equal(r.rankingEligible,false);
});
test('official product overlap alone cannot make peer eligible',()=>{
 const c=fixture('000001');delete c.businessComparability;
 const r=buildPeerExpansionReview(fixture(),[c],date);assert.equal(r.candidates[0].status,'PENDING_VERIFICATION');assert.equal(r.counts.ELIGIBLE,0);
});
test('global and different industry candidates remain excluded without FX estimates',()=>{
 const c=fixture('MU');c.market='US';c.industryCode='2612';const r=buildPeerExpansionReview(fixture(),[c],date);
 assert.equal(r.counts.EXCLUDED,1);assert.equal(r.candidates[0].metrics.PER,null);
});
test('unverified and future business sources are pending',()=>{
 for(const changes of [{sourceUrl:'https://example.com/'},{reviewedAt:'2026-10-13T00:00:00Z'}]){
 const c=fixture('000001');Object.assign(c.businessEvidence,changes);assert.equal(buildPeerExpansionReview(fixture(),[c],date).candidates[0].status,'PENDING_VERIFICATION');}
});
test('absent financial data and nonpositive denominators never count',()=>{
 const a=fixture('000001');delete a.krSnapshot;const b=fixture('000002');b.krSnapshot.financial.raw.netIncome=0;
 const r=buildPeerExpansionReview(fixture(),[a,b],date);assert.equal(r.counts.INSUFFICIENT_DATA,2);assert.equal(r.counts.ELIGIBLE,0);
});
test('period unit statement basis mismatch and extreme multiple are excluded',()=>{
 for(const mutate of [c=>c.krSnapshot.financial.unit='KRW_MILLION',c=>c.krSnapshot.financial.fiscalPeriod.basis='OFS',c=>c.krSnapshot.price.marketCap=100000]){
 const c=fixture('000001');mutate(c);assert.equal(buildPeerExpansionReview(fixture(),[c],date).candidates[0].status,'EXCLUDED');}
});
test('duplicates do not increase eligible counts or minimum',()=>{
 const r=buildPeerExpansionReview(fixture(),[fixture('000001'),fixture('000001'),fixture()],date);assert.equal(r.counts.ELIGIBLE,1);assert.equal(r.counts.EXCLUDED,2);
});
test('saved-source investigation expands candidates while preserving all other companies and SEC evidence',()=>{
 const input={evidence:[{id:'SEC-proof'}],companies:[fixture(),fixture('000660'),fixture('000990'),fixture('042700'),{ticker:'AAPL',sec:{unchanged:true}}]};
 for(const c of input.companies.slice(1,4))c.industryCode='2612';const before=structuredClone(input);const result=applyPeerExpansionReview(input,{reviewedAt:date});
 assert.deepEqual(input,before);assert.deepEqual(result.companies.slice(1),before.companies.slice(1));assert.deepEqual(result.evidence,before.evidence);
 const r=result.companies[0].krSnapshot.peerExpansionReview;assert.equal(r.candidateCount,6);assert.equal(r.counts.ELIGIBLE,0);assert.equal(r.counts.EXCLUDED,6);assert.equal(r.minimum,3);
});

test('existing separate krPeers registry is reused and preserved',()=>{
 const input={companies:[fixture()],krPeers:[fixture('000660'),fixture('000990'),fixture('042700')]};for(const c of input.krPeers)c.industryCode='2612';const original=structuredClone(input);const result=applyPeerExpansionReview(input,{reviewedAt:date});assert.deepEqual(result.krPeers,original.krPeers);assert.equal(result.companies[0].krSnapshot.peerExpansionReview.candidateCount,6);assert.equal(result.companies[0].krSnapshot.peerExpansionReview.counts.ELIGIBLE,0);
});
