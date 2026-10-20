import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCollectedFinancials as finances, normalizeCollectedShares as shares, normalizeCollectedActions as actions, normalizeCollectedEvidence} from '../src/v2/collection_normalization.js';
import {mkdtemp} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {runDataCollectionWorker} from '../src/v2/data_collection_worker.js';
const company={ticker:'000990',corpCode:'00160843'};
const scope={year:2026,reportCode:'11012',fsDiv:'CFS',receipt:'20260814000001',availableAt:'2026-08-14',publicationVerified:true,unit:'KRW',unitVerified:true,correctionStatus:'ORIGINAL'};
const context={valuationDate:'2026-10-08',collectedAt:'2026-10-12T00:00:00Z'};
const row={corp_code:company.corpCode,bsns_year:'2026',reprt_code:'11012',fs_div:'CFS',rcept_no:scope.receipt,currency:'KRW',sj_div:'BS',account_id:'ifrs-full_EquityAttributableToOwnersOfParent',account_nm:'지배기업 소유주지분',thstrm_dt:'2026.06.30',thstrm_amount:'1,000'};
const body=(rows=[row])=>({status:'000',list:rows});
test('balance sheet normalization preserves parent equity definition without authorizing PBR',()=>{
 const result=finances(body(),company,scope,context);assert.equal(result.status,'NORMALIZED');assert.equal(result.records[0].periodType,'INSTANT');assert.equal(result.records[0].value,1000);assert.equal(result.records[0].accountId,row.account_id);assert.equal(result.valuationInputEligible,false);
});
test('flow normalization separates cumulative YTD and reported single period',()=>{
 const result=finances(body([{...row,sj_div:'IS',account_id:'ifrs-full_Revenue',thstrm_dt:'2026.01.01 ~ 2026.06.30',thstrm_amount:'400',thstrm_add_amount:'700'}]),company,scope,context);
 assert.equal(result.status,'NORMALIZED');assert.equal(result.records[0].value,700);assert.equal(result.records[0].singlePeriodValue,400);assert.equal(result.records[0].periodType,'CUMULATIVE_YTD');
});
test('mixed basis, unknown unit, duplicate account and future publication cannot normalize as verified',()=>{
 for(const [rows,s,reason] of [[[row,{...row,fs_div:'OFS'}],scope,'CONSOLIDATION_MISMATCH'],[[row],{...scope,unitVerified:false},'UNIT_UNVERIFIED'],[[row,row],scope,'DUPLICATE_ACCOUNT_PERIOD'],[[row],{...scope,availableAt:'2026-10-09'},'PUBLICATION_OR_CORRECTION_UNVERIFIED']]) {const result=finances(body(rows),company,s,context);assert.notEqual(result.status,'NORMALIZED');assert.ok(result.issues.includes(reason));}
});
test('correction lineage and identity must be explicit; unknown currencies do not convert',()=>{
 for(const [r,s,reason] of [[{...row,rcept_no:'20261009000001'},scope,'PUBLICATION_OR_CORRECTION_UNVERIFIED'],[row,{...scope,correctionStatus:'VERIFIED_CORRECTION'},'CORRECTION_LINEAGE_MISSING'],[{...row,currency:'USD'},scope,'CURRENCY_UNVERIFIED'],[{...row,corp_code:'00000000'},scope,'IDENTITY_OR_FISCAL_SCOPE_MISMATCH']])assert.ok(finances(body([r]),company,s,context).issues.includes(reason));
});
const shareRow={corp_code:company.corpCode,rcept_no:scope.receipt,se:'보통주',stlm_dt:'2026-06-30',istc_totqy:'100',tesstk_co:'10',distb_stock_co:'90'};
test('share standard fields preserve issued vs treasury and require publication',()=>{
 const good=shares(body([shareRow]),company,scope,context);assert.equal(good.status,'NORMALIZED');assert.deepEqual([good.records[0].issuedShares,good.records[0].treasuryShares,good.records[0].outstandingShares],[100,10,90]);assert.equal(good.valuationInputEligible,false);
 const unavailable=shares(body([shareRow]),company,{...scope,publicationVerified:false},context);assert.equal(unavailable.status,'PENDING_VERIFICATION');assert.equal(unavailable.records[0].verificationStatus,'PENDING_VERIFICATION');
});
test('duplicate classes, unbalanced counts and future share date remain pending',()=>{
 for(const rows of [[shareRow,shareRow],[{...shareRow,distb_stock_co:'100'}],[{...shareRow,stlm_dt:'2026-10-09'}]])assert.equal(shares(body(rows),company,scope,context).status,'PENDING_VERIFICATION');
});
test('treasury or cancellation report quantity is never an effective share event',()=>{
 const result=actions(body([{corp_code:company.corpCode,rcept_no:scope.receipt,acqs_mth3:'소각',change_qy_acqs:'10'}]),'treasury',company,scope,context);
 assert.equal(result.events[0].quantity,null);assert.equal(result.events[0].effectiveDate,null);assert.equal(result.events[0].exDate,null);assert.equal(result.events[0].reportedQuantity,'10');assert.equal(result.coverage.verified,false);assert.equal(result.valuationInputEligible,false);
});
test('collector archives and exposes normalized financial facts while keeping validation pending',async()=>{
 const statePath=path.join(await mkdtemp(path.join(os.tmpdir(),'kstock-normalization-')),'state.json');
 const result=await runDataCollectionWorker({statePath,valuationDate:context.valuationDate,companies:[{...company,companyName:'DB하이텍'}],approved:true,disclosureRevision:scope.receipt,financialScopes:{[company.ticker]:scope},gate:{async collect(source,query){return {httpStatus:200,body:query.operation === 'disclosures' ? {status:'013',list:[]} : query.operation === 'share-count' ? body([shareRow]) : query.operation === 'financials' || query.operation === 'financial-periods' ? body() : {status:'013',list:[]}};}}});
 const job=result.state.jobs[0];assert.equal(job.state,'PARTIAL');assert.equal(job.results.find(e=>e.kind==='FINANCIAL').observed.status,'NORMALIZED');assert.equal(job.results.find(e=>e.kind==='SHARES').observed.records[0].issuedShares,100);assert.ok(job.results.every(e=>e.observed.valuationInputEligible===false));
});


test('missing full-account statement metadata remains unknown rather than an asserted basis conflict',()=>{
 const result=finances(body([{...row,fs_div:undefined,thstrm_dt:undefined}]),company,scope,context);
 assert.ok(result.issues.includes('CONSOLIDATION_UNVERIFIED'));assert.ok(result.issues.includes('PERIOD_UNVERIFIED'));assert.ok(!result.issues.includes('CONSOLIDATION_MISMATCH'));assert.equal(result.valuationInputEligible,false);
});
test('distinct financial account details are retained without treating separate scopes as a duplicate',()=>{
 const result=finances(body([{...row,account_detail:'지배기업 소유주'},{...row,account_detail:'비지배지분'}]),company,scope,context);
 assert.ok(!result.issues.includes('DUPLICATE_ACCOUNT_PERIOD'));assert.equal(result.records[0].accountDetail,'지배기업 소유주');assert.equal(result.records[1].accountDetail,'비지배지분');assert.equal(result.valuationInputEligible,false);
});


test('actual OpenDART common-share label 보통주식 is recognized without guessing generic 종류주식',()=>{
 const result=shares(body([{...shareRow,se:'보통주식'},{...shareRow,se:'종류주식',istc_totqy:'-',tesstk_co:'-',distb_stock_co:'-'}]),company,scope,context);
 assert.equal(result.records.length,1);assert.equal(result.records[0].shareClass,'COMMON');assert.equal(result.records[0].issuedShares,100);assert.equal(result.valuationInputEligible,false);
});

test('SEC official facts reject identity mismatch and future filings without approving ADR valuation',()=>{
 const task={source:'SEC',query:{url:'https://data.sec.gov/api/xbrl/companyfacts/CIK0000723125.json'}};
 const facts={cik:723125,facts:{'us-gaap':{StockholdersEquity:{units:{USD:[{end:'2026-06-30',filed:'2026-08-14',val:100,accn:'original'},{end:'2026-06-30',filed:'2026-10-09',val:999,accn:'future'}]}}}}};
 const result=normalizeCollectedEvidence(facts,task,{ticker:'MU'},null,context);
 assert.equal(result.records[0].value,100);assert.equal(result.records[0].unit,'USD');assert.equal(result.valuationInputEligible,false);
 assert.equal(normalizeCollectedEvidence({...facts,cik:1},task,{ticker:'MU'},null,context).status,'INSUFFICIENT_DATA');
});
