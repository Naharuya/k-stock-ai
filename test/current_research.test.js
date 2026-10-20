import test from 'node:test';import assert from 'node:assert/strict';
import {selectCurrentForm4,normalizeCurrentForm4} from '../src/v2/current_capital.js';
import {buildCurrentResearch} from '../src/v2/current_research.js';
const asOf='2026-10-19T07:00:00Z';
const event=(patch={})=>({eventId:'current:one',actorId:'sec:123',actorType:'INSIDER',companyId:'AAPL',securityId:'AAPL:COMMON',eventType:'CONFIRMED_TRANSACTION',actionType:'REPORTED_SALE',formType:'4',transactionDate:'2026-10-12',filingDate:'2026-10-15',publicAvailableAt:'2026-10-15T23:59:59-04:00',quantity:10,transactionEvidenceVerified:true,officialSource:true,sourceIntegrity:true,sourceHash:'a'.repeat(64),documentId:'doc',sourceUrl:'https://www.sec.gov/Archives/fixture.xml',verificationStatus:'VERIFIED',...patch});
const metadata=()=>({cik:'320193',name:'Apple Inc.',filings:{recent:{accessionNumber:['0001140361-26-000001','0001140361-26-000002','0001140361-26-000003'],filingDate:['2026-10-01','2026-10-15','2026-10-10'],form:['4','4','4'],primaryDocument:['form4.xml','form4.xml','form4.xml']}}});
test('current filing selection is recent deterministic capped and advances past completed documents',()=>{
 const first=selectCurrentForm4(metadata(),asOf);assert.deepEqual(first.selected.map(f=>f.filingDate),['2026-10-15','2026-10-10']);assert.equal(first.remaining,1);
 const next=selectCurrentForm4(metadata(),asOf,{completedIds:first.selected.map(f=>f.accessionNumber)});assert.deepEqual(next.selected.map(f=>f.filingDate),['2026-10-01']);
});
test('current filing selection blocks amendments and issuer/path mismatches',()=>{
 const m=metadata();m.filings.recent.form[0]='4/A';assert.equal(selectCurrentForm4(m,asOf).selected.length,0);
 assert.throws(()=>selectCurrentForm4({...metadata(),cik:'123'},asOf));const bad=metadata();bad.filings.recent.primaryDocument[1]='../other.xml';assert.throws(()=>selectCurrentForm4(bad,asOf));
});
test('future and historical filings do not enter the current source cohort',()=>{const m=metadata();m.filings.recent.filingDate=['2025-10-01','2026-10-20','2026-10-15'];assert.deepEqual(selectCurrentForm4(m,asOf).selected.map(x=>x.filingDate),['2026-10-15']);});
const xml=`<ownershipDocument><documentType>4</documentType><aff10b5One>1</aff10b5One><issuer><issuerCik>320193</issuerCik><issuerTradingSymbol>AAPL</issuerTradingSymbol></issuer><reportingOwner><reportingOwnerId><rptOwnerCik>123</rptOwnerCik></reportingOwnerId></reportingOwner><nonDerivativeTable><nonDerivativeTransaction><securityTitle><value>Common Stock</value></securityTitle><transactionDate><value>2026-10-12</value></transactionDate><transactionCoding><transactionCode>S</transactionCode></transactionCoding><transactionAmounts><transactionShares><value>10</value></transactionShares><transactionAcquiredDisposedCode><value>D</value></transactionAcquiredDisposedCode></transactionAmounts></nonDerivativeTransaction></nonDerivativeTable></ownershipDocument>`;
const filing={accessionNumber:'0001140361-26-000002',filingDate:'2026-10-15',primaryDocument:'xslF345X06/form4.xml',url:'https://www.sec.gov/Archives/edgar/data/320193/000114036126000002/form4.xml'};
test('current raw Form4 proves only reported transaction and uses observed availability without inferred public timestamp',()=>{
 const x=normalizeCurrentForm4(xml,filing,asOf).events[0];assert.equal(x.verificationStatus,'VERIFIED');assert.equal(x.actionType,'REPORTED_SALE');assert.equal(x.transactionDate,'2026-10-12');assert.equal(x.publicAvailableAt,asOf);assert.equal(x.firstPublicAvailabilityVerified,false);assert.equal(x.planned10b51,true);assert.equal(x.recommendationStatus,'HOLD');
 assert.throws(()=>normalizeCurrentForm4(xml.replace('AAPL','MSFT'),filing,asOf));assert.throws(()=>normalizeCurrentForm4(xml,filing,'2026-10-14T00:00:00Z'));
});
test('recently checked old events remain historical and never become current candidates',()=>{const r=buildCurrentResearch({asOf,capitalEvents:[event({filingDate:'2025-10-15',transactionDate:'2025-10-12',publicAvailableAt:asOf})]});assert.equal(r.companyCount,0);});
test('future information is excluded and newly observed evidence waits for D2',()=>{
 const r=buildCurrentResearch({asOf,capitalEvents:[event({publicAvailableAt:asOf}),event({eventId:'future',publicAvailableAt:'2026-10-20T00:00:00Z'})]});assert.equal(r.futureExcluded,1);assert.ok(r.candidates[0].blockers.includes('D2_AVAILABILITY_WAIT'));assert.equal(r.eligibleRecommendations,0);
});
test('negative and unverified evidence remain visible without recommendation or fabricated ranking',()=>{
 const r=buildCurrentResearch({asOf,capitalEvents:[event(),event({eventId:'missing-original',sourceIntegrity:false,sourceHash:null})]});const c=r.candidates[0];assert.equal(c.verifiedEvents,1);assert.equal(c.events.length,2);assert.equal(c.events[0].actionType,'REPORTED_SALE');assert.equal(c.rank,null);assert.equal(c.score,null);assert.equal(c.recommendationStatus,'HOLD');
});
const price={status:'READY',sessionDate:'2026-10-16',observedAt:'2026-10-16T23:59:59-04:00',close:100,currency:'USD',adjusted:false};
test('current price dates are recalculated instead of trusting stored READY or ageDays',()=>{
 for(const patch of [{sessionDate:'2026-10-01'}, {adjusted:true}, {observedAt:'2026-10-19T00:00:00Z'},{close:0}]){
 const r=buildCurrentResearch({asOf,capitalEvents:[event()],currentMarketSnapshots:{companies:[{ticker:'AAPL',priceSnapshot:{...price,...patch}}]}});assert.equal(r.candidates[0].price,null);
 }
 const r=buildCurrentResearch({asOf,capitalEvents:[event()],currentMarketSnapshots:{checkedAt:asOf,companies:[{ticker:'AAPL',priceSnapshot:price,corporateActionSnapshot:{status:'READY'}}]}});assert.equal(r.candidates[0].price.priceDate,'2026-10-16');assert.ok(r.candidates[0].blockers.includes('CORPORATE_ACTION_COVERAGE_REQUIRED'));assert.equal(r.eligibleRecommendations,0);
});
test('deduplication and explicit company links prevent duplicate events and industry-based ticker invention',()=>{
 const r=buildCurrentResearch({asOf,capitalEvents:[event(),event()],statements:[{statementDate:'2026-10-15',publicAvailableAt:asOf,relatedIndustries:['technology']}]});assert.equal(r.companyCount,1);assert.equal(r.candidates[0].events.length,1);
});

test('conflicting source metadata and expanded cohort limits fail closed',()=>{const m=metadata();m.filings.recent.accessionNumber[0]=m.filings.recent.accessionNumber[1];assert.throws(()=>selectCurrentForm4(m,asOf),/CONFLICT/);assert.throws(()=>selectCurrentForm4(metadata(),asOf,{days:365}));});
test('fixed Microsoft and NVIDIA identities accept only matching official metadata and XML',()=>{
 for(const [ticker,cik,name] of [['MSFT',789019,'MICROSOFT CORP'],['NVDA',1045810,'NVIDIA CORP']]){
 const m=metadata();m.cik=cik;m.name=name;assert.ok(selectCurrentForm4(m,asOf,{ticker}).selected.length);
 assert.throws(()=>selectCurrentForm4(m,asOf,{ticker:'AAPL'}),/ISSUER_MISMATCH/);
 const raw=xml.replace('320193',String(cik)).replace('AAPL',ticker);
 const f={...filing,url:filing.url.replace('/320193/','/'+cik+'/')};
 const e=normalizeCurrentForm4(raw,f,asOf,ticker).events[0];assert.equal(e.companyId,ticker);assert.equal(e.securityId,ticker+':COMMON');assert.equal(e.verificationStatus,'VERIFIED');
 assert.throws(()=>normalizeCurrentForm4(xml,f,asOf,ticker));
 }
});
test('per-company checks expose missing risk, price and action evidence without enabling recommendations',()=>{
 const r=buildCurrentResearch({asOf,capitalEvents:[event({companyId:'MSFT',securityId:'MSFT:COMMON'})],currentCapitalCollection:{companies:{MSFT:{status:'PARTIAL',checkedAt:asOf}}}});
 const c=r.candidates[0];assert.equal(c.companyName,'Microsoft Corporation');assert.equal(c.validationChecks.find(x=>x.id==='PRICE').status,'INSUFFICIENT_DATA');assert.equal(c.validationChecks.find(x=>x.id==='PREDICTIVE').status,'PENDING');assert.equal(r.collectionQueue.find(x=>x.companyId==='NVDA').status,'QUEUED');assert.equal(r.eligibleRecommendations,0);
});
test('a newly detected amendment blocks the current candidate despite preserved verified historical evidence',()=>{
 const r=buildCurrentResearch({asOf,capitalEvents:[event()],currentCapitalCollection:{companies:{AAPL:{status:'PARTIAL',reason:'CURRENT_AMENDMENT_REVIEW_REQUIRED'}}}});
 assert.equal(r.candidates[0].verifiedEvents,1);assert.ok(r.candidates[0].blockers.includes('CURRENT_AMENDMENT_REVIEW_REQUIRED'));assert.equal(r.eligibleRecommendations,0);
});
