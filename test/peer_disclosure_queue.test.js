import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyPeerDisclosure,buildPeerDisclosureQueue} from '../src/v2/peer_disclosure_queue.js';
const opts={companyCode:'00164779',stockCode:'000660',valuationDate:'2026-10-08'};
const doc=(title,extra={})=>({receipt:'20260706000403',title,disclosureDate:'20260706',...extra});
test('issuance, treasury and conversion documents receive separate review priorities',()=>{
 assert.equal(classifyPeerDisclosure(doc('유상증자결정'),opts).classification,'SHARE_COUNT_IMPACT');
 assert.equal(classifyPeerDisclosure(doc('자기주식처분결과보고서'),opts).classification,'TREASURY_SHARE_IMPACT');
 assert.equal(classifyPeerDisclosure(doc('전환권행사'),opts).classification,'POTENTIAL_IMPACT');
});
test('title correction never establishes a relationship or actual share movement',()=>{
 const r=classifyPeerDisclosure(doc('[기재정정]유상증자결정',{relatedDocumentId:'20260624000001'}),opts);
 assert.equal(r.classification,'CORRECTION');assert.equal(r.relatedDocumentId,null);assert.equal(r.eligibleForValuation,false);
 assert.equal(classifyPeerDisclosure(doc('[기재정정]유상증자결정',{relatedDocumentId:'20260624000001',correctionRelationVerified:true}),opts).relatedDocumentId,'20260624000001');
});
test('future and malformed publications are blocked before original verification',()=>{
 for(const d of [doc('유상증자',{disclosureDate:'20261009'}),doc('유상증자',{disclosureDate:'20260230'}),doc('유상증자',{receipt:'invalid'})])assert.equal(buildPeerDisclosureQueue({ticker:'000660',valuationDate:'2026-10-08',disclosures:[d]}).queue[0].state,'BLOCKED');
});
test('identical duplicate documents are one queue task and conflicting titles block',()=>{
 const bridge={ticker:'000660',valuationDate:'2026-10-08',disclosures:[doc('유상증자'),doc('유상증자')]};
 assert.equal(buildPeerDisclosureQueue(bridge).queue.length,1);
 bridge.disclosures.push(doc('자기주식처분'));assert.equal(buildPeerDisclosureQueue(bridge).queue[0].state,'BLOCKED');
});
test('archived originals do not certify actual effect and incomplete prior coverage remains blocked',()=>{
 const r=buildPeerDisclosureQueue({ticker:'000660',valuationDate:'2026-10-08',disclosures:[doc('주식소각결정')],originalDocuments:[{documentId:'20260706000403',sha256:'a',sourceIntegrityVerified:true}],corporateActions:[{status:'DECISION_ONLY',effectiveDate:null}]});
 assert.equal(r.queue[0].state,'PARTIAL');assert.equal(r.summary.originalArchivesVerified,1);assert.equal(r.summary.originalEffectVerified,0);assert.equal(r.summary.corporateActionsVerified,0);assert.equal(r.summary.priorAnnouncementCoverage,'INSUFFICIENT_DATA');
});
test('restart keeps attempts but changed archive or valuation date invalidates verification',()=>{
 const bridge={ticker:'000660',valuationDate:'2026-10-08',disclosures:[doc('유상증자')],originalDocuments:[{documentId:'20260706000403',sha256:'new',sourceIntegrityVerified:true}]};
 const previousQueue=[{key:'000660:20260706000403',state:'VERIFIED',evidenceHash:'old',valuationDate:'2026-10-08',attempts:2}];
 const r=buildPeerDisclosureQueue(bridge,{previousQueue});assert.equal(r.queue[0].attempts,2);assert.equal(r.queue[0].state,'PARTIAL');
});

test('pre-baseline announcements form a separate effect-review queue without inflating the 90-document cohort',()=>{
 const r=buildPeerDisclosureQueue({ticker:'000660',valuationDate:'2026-10-08',disclosures:[doc('유상증자')],priorAnnouncements:[doc('유상증자',{receipt:'20260624000420',disclosureDate:'20260624'})]});
 assert.equal(r.summary.total,1);assert.equal(r.queue.length,2);assert.equal(r.queue[1].period,'PRIOR_ANNOUNCEMENT');assert.equal(r.queue[1].state,'QUEUED');
});

test('cached verified document is revoked when the current chain loses effective-date verification',()=>{
 const bridge={ticker:'000660',valuationDate:'2026-10-08',disclosures:[doc('유상증자결정')],originalDocuments:[{documentId:'20260706000403',sha256:'a',sourceIntegrityVerified:true}],issuanceChain:{stockCode:'000660',verificationStatus:'PARTIAL',availableAt:'2026-07-24T23:59:59+09:00'}};
 const r=buildPeerDisclosureQueue(bridge,{previousQueue:[{key:'000660:20260706000403',valuationDate:'2026-10-08',state:'VERIFIED',evidenceHash:'a'}]});assert.equal(r.queue[0].state,'PARTIAL');assert.equal(r.summary.originalEffectVerified,0);
});

test('prior original review metadata is hash-bound and never activates valuation',()=>{
 const bridge={ticker:'000660',valuationDate:'2026-10-08',priorAnnouncements:[doc('주식소각결정',{receipt:'20260128800616',disclosureDate:'20260128'})],originalDocuments:[{documentId:'20260128800616',sha256:'a',sourceIntegrityVerified:true}],priorOriginalReviews:[{sourceDocumentId:'20260128800616',sourceHash:'a',eventType:'CANCELLATION',shareClass:'COMMON',reportedQuantity:15300000,effectiveDate:'2026-02-09',verificationStatus:'PRE_BASELINE_ORIGINAL_AND_H1_MATCHED'}]};
 const r=buildPeerDisclosureQueue(bridge).queue[0];assert.equal(r.quantity,15300000);assert.equal(r.effectiveDate,'2026-02-09');assert.equal(r.appliedToValuation,false);assert.equal(r.eligibleForValuation,false);assert.equal(r.state,'PARTIAL');bridge.priorOriginalReviews[0].sourceHash='different';assert.equal(buildPeerDisclosureQueue(bridge).queue[0].originalReviewStatus,'NOT_REVIEWED');
});
test('decision date and correction relationship stay distinct in queue metadata',()=>{assert.equal(classifyPeerDisclosure(doc('주식소각결정'),opts).announcementDate,'2026-07-06');const r=classifyPeerDisclosure(doc('[정정]주식소각결정'),opts);assert.equal(r.announcementDate,null);assert.equal(r.correctionStatus,'RELATION_UNVERIFIED');});

test('ownership reports remain potential original targets rather than proving no corporate action',()=>{const r=buildPeerDisclosureQueue({ticker:'000660',valuationDate:'2026-10-08',disclosures:[doc('임원ㆍ주요주주특정증권등소유상황보고서')]});assert.equal(r.queue.length,1);assert.equal(r.disclosures[0].classification,'POTENTIAL_IMPACT');assert.equal(r.queue[0].eligibleForValuation,false);});
test('a pre-baseline decision cannot leak a later annual report verification',()=>{const bridge={ticker:'000990',valuationDate:'2025-10-08',priorAnnouncements:[doc('주식소각결정',{receipt:'20250915800392',disclosureDate:'20250915'})],originalDocuments:[{documentId:'20250915800392',sha256:'a',sourceIntegrityVerified:true}],priorOriginalReviews:[{sourceDocumentId:'20250915800392',sourceHash:'a',eventType:'CANCELLATION',reportedQuantity:894000,effectiveDate:'2025-09-30',availableAt:'2026-06-01T23:59:59+09:00'}]};const r=buildPeerDisclosureQueue(bridge).queue[0];assert.equal(r.effectiveDate,null);assert.equal(r.originalReviewStatus,'NOT_REVIEWED');});
