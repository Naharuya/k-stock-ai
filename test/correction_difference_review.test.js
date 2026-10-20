import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewCorrectionDifferences, CORRECTION_CAUSES } from '../src/v2/correction_difference_review.js';
const fixture=()=>({verificationStatus:'VERIFIED',originalReceipt:'20260316001250',correctionReceipt:'20260601001661',sourceArchiveHashes:{'20260316001250':'a'.repeat(64),'20260601001661':'b'.repeat(64)},primaryFinancialChecks:['CFS_BALANCE','CFS_INCOME','OFS_BALANCE','OFS_INCOME'].map(label=>({label,unchanged:true,sha256:'c'.repeat(64)})),tables:Array.from({length:8},(_,i)=>({statementBasis:i<4?'CFS':'OFS',year:i%4<2?'2025':'2024',field:i%2?'負債':'資産',originalTableIndex:i,correctionTableIndex:i+100,rows:['FOREIGN_CURRENCY','KRW_TRANSLATED'].flatMap(measure=>['現金','資産計'].map((account,j)=>({account:j?'資産계':account,currency:'USD',measure,beforeValue:100,afterValue:measure==='FOREIGN_CURRENCY'&&j?101:100,beforeUnit:measure==='FOREIGN_CURRENCY'?'천USD':'백만원',afterUnit:measure==='FOREIGN_CURRENCY'?'천USD':'백만원',beforeCell:{value:100,row:j,column:1},afterCell:{value:measure==='FOREIGN_CURRENCY'&&j?101:100,row:j,column:2}})))}))});
test('arithmetic difference never automatically establishes rounding or summation error cause',()=>{const r=reviewCorrectionDifferences(fixture());assert.equal(r.unresolved,8);assert.equal(r.resolved,0);assert.ok(r.differences.every(d=>d.cause==='UNRESOLVED'&&!d.resolved));assert.ok(CORRECTION_CAUSES.includes('ROUNDING'));});
test('individual discrepancy retains receipts table coordinates units period basis and raw components',()=>{const d=reviewCorrectionDifferences(fixture()).differences[0];assert.equal(d.beforeValue,100);assert.equal(d.afterValue,101);assert.equal(d.originalTableIndex,0);assert.equal(d.correctionTableIndex,100);assert.equal(d.statementBasis,'CFS');assert.equal(d.periodEnd,'2025-12-31');assert.equal(d.components[0].afterValue,100);assert.equal(d.valuationInputEligible,false);});
test('correction published after valuation date cannot be eligible even if direct comparison verified',()=>{const r=reviewCorrectionDifferences(fixture(),{valuationDate:'2026-05-31'});assert.equal(r.status,'FUTURE_INFORMATION_BLOCKED');assert.ok(r.differences.every(d=>!d.sourceAvailableAtValuationDate));});
test('missing source provenance prevents issuing a difference review',()=>{const f=fixture();delete f.tables[0].rows[0].beforeCell;const r=reviewCorrectionDifferences(f);assert.equal(r.status,'CORRECTION_UNVERIFIED');assert.deepEqual(r.differences,[]);});

test('unit changes remain observations and arithmetic scope uses the correct document stage',()=>{
 const f=fixture();
 for(const r of f.tables[0].rows)r.currency='JPY';
 for(const r of f.tables[0].rows.filter(r=>r.measure==='FOREIGN_CURRENCY')){r.beforeUnit='십만JPY';r.afterUnit='천JPY';r.currency='JPY';}
 const changed=f.tables[0].rows.find(r=>r.measure==='FOREIGN_CURRENCY'&&r.account.endsWith('계'));changed.beforeValue=102;changed.beforeCell.value=102;
 const r=reviewCorrectionDifferences(f);
 const before=r.differences.find(d=>d.originalTableIndex===0&&d.stage==='before');
 const after=r.differences.find(d=>d.originalTableIndex===0&&d.stage==='after');
 assert.deepEqual(before.arithmeticScope.units,['십만JPY']);
 assert.deepEqual(after.arithmeticScope.units,['천JPY']);
 assert.equal(after.causeAssessments.find(c=>c.cause==='UNIT_DIFFERENCE').observation,'UNIT_CHANGE_OBSERVED');
 assert.ok(after.causeAssessments.every(c=>c.status==='NOT_ESTABLISHED'));
 assert.equal(after.cause,'UNRESOLVED');
});
test('all seven candidate causes are independently reviewed without resolving a residual',()=>{
 const r=reviewCorrectionDifferences(fixture(),{valuationDate:'2026-10-08'});
 for(const d of r.differences){
  assert.deepEqual(d.causeAssessments.map(c=>c.cause),CORRECTION_CAUSES.filter(c=>c!=='UNRESOLVED'));
  assert.ok(d.causeAssessments.every(c=>c.reason&&c.observation&&c.status==='NOT_ESTABLISHED'));
  assert.equal(d.valuationInputEligible,false);
 }
 assert.equal(r.resolved,0);
});
test('invalid calendar cutoff cannot make correction available',()=>{
 const r=reviewCorrectionDifferences(fixture(),{valuationDate:'2026-02-30'});
 assert.equal(r.status,'FUTURE_INFORMATION_BLOCKED');
 assert.ok(r.differences.every(d=>!d.sourceAvailableAtValuationDate));
});
