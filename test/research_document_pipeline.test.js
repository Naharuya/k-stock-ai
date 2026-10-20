import test from 'node:test';import assert from 'node:assert/strict';
import {buildDocumentResearchProgress} from '../src/v2/research_document_pipeline.js';
import {buildOfflineResearchRisk} from '../src/v2/research_dashboard.js';
test('new original and AI analysis cannot bypass public time capital relation or price gates',()=>{
 const [r]=buildDocumentResearchProgress({asOf:'2026-10-13T00:00:00Z',statements:[{statementId:'original',personId:'actor',verificationStatus:'VERIFIED',analysisStatus:'GENERATED',publicAvailableAt:'2025-09-23T23:59:59-04:00',relatedCompanies:[]}]});
 assert.equal(r.stages.length,8);assert.equal(r.stages[2].status,'ANALYZED');assert.equal(r.stages[4].status,'PARTIAL');assert.equal(r.stages[6].status,'BLOCKED');assert.equal(r.predictiveSignalVerified,false);assert.equal(r.recommendationStatus,'HOLD');
});
test('unverified original stays blocked even if its AI record is generated',()=>{
 const [r]=buildDocumentResearchProgress({statements:[{statementId:'bad',analysisStatus:'GENERATED'}]});assert.equal(r.stages[1].status,'BLOCKED');assert.equal(r.stages[3].status,'BLOCKED');assert.equal(r.stages[4].status,'BLOCKED');
});
test('descriptive risk keeps losses includes median ratio and separates unestablished backtest partitions',()=>{
 const risk=buildOfflineResearchRisk({eventCards:[{companyId:'MSFT',periods:[{horizon:1,excessReturn:-2,securityReturn:-3}]},{companyId:'MSFT',periods:[{horizon:1,excessReturn:1,securityReturn:2}]}]});
 const h=risk.securityScopes[0].horizons[0];assert.equal(h.medianExcessReturn,-.5);assert.equal(h.positiveExcessRatio,.5);assert.equal(h.worstExcessReturn,-2);assert.equal(risk.backtestGate,'BACKTEST_BLOCKED');assert.equal(risk.partitions.finalEvaluation,'NOT_ESTABLISHED');assert.equal(risk.securityScopes[0].horizons[1].medianExcessReturn,null);
});
test('future public availability cannot pass a current document research cutoff',()=>{
 const [r]=buildDocumentResearchProgress({asOf:'2026-10-13T00:00:00Z',statements:[{statementId:'future',personId:'actor',verificationStatus:'VERIFIED',publicAvailableAt:'2026-10-14T00:00:00Z'}]});
 assert.equal(r.stages.find(s=>s.name==='PUBLIC_TIME_CHECKED').status,'BLOCKED');
});
