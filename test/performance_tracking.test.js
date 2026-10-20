import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { saveCandidateSnapshot, measurePerformance } from '../src/v2/performance_tracking.js';
test('candidate snapshots are append-only and preserve original results', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'kstock-snapshot-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const report = { analysisDate: '2026-10-01T00:00:00Z', candidates: [{ ticker: '005930', score: 10 }] };
  const first = await saveCandidateSnapshot(report, dir); assert.equal((await saveCandidateSnapshot(report, dir)).id, first.id);
  report.candidates[0].score = 20; const second = await saveCandidateSnapshot(report, dir);
  assert.notEqual(first.id, second.id); assert.equal(JSON.parse(await readFile(first.filename, 'utf8')).candidates[0].score, 10);
});
test('performance uses future session closes, appropriate benchmark and remains pending until mature', () => {
  const candidate = { exchange: 'KOSPI', analysisDate: '2026-09-01T00:00:00Z' };
  const sessions = Array.from({ length: 22 }, (_,i) => ({ date: `2026-09-${String(i+2).padStart(2,'0')}`, close: 100+i }));
  const prices = { basis: 'TOTAL_RETURN', corporateActionsReviewed: true, sessions };
  const benchmark = { index: 'KOSPI', basis: 'TOTAL_RETURN', sessions: sessions.map(x => ({ ...x, close: 100 })) };
  const result = measurePerformance(candidate, prices, benchmark, '2026-10-01T00:00:00Z');
  assert.equal(result.status, 'READY'); assert.ok(Math.abs(result.horizons[5].excessReturnPct-5)<1e-8);
  assert.equal(measurePerformance(candidate, prices, benchmark, '2026-09-05T00:00:00Z').status, 'PENDING');
  assert.equal(measurePerformance(candidate, { ...prices, basis: 'RAW' }, benchmark, '2026-10-01').reason, 'ADJUSTMENT_REQUIRED');
  assert.equal(measurePerformance(candidate, prices, { ...benchmark, index: 'KOSDAQ' }, '2026-10-01').reason, 'BENCHMARK_MISMATCH');
  prices.sessions[1].halted = true; assert.equal(measurePerformance(candidate, prices, benchmark, '2026-10-01').horizons[1].status, 'PENDING');
});
test('cumulative reference returns exclude future sessions and reject calendar gaps', () => {
 const candidate={exchange:'KOSPI',analysisDate:'2026-09-01'};
 const sessions=[{date:'2026-09-02',close:100},{date:'2026-09-03',close:110},{date:'2026-09-04',close:120}];
 const prices={basis:'TOTAL_RETURN',corporateActionsReviewed:true,sessions};
 const benchmark={index:'KOSPI',basis:'TOTAL_RETURN',sessions:sessions.map(x=>({...x,close:100}))};
 const result=measurePerformance(candidate,prices,benchmark,'2026-09-04');
 assert.equal(result.cumulative.points.length,2);assert.ok(Math.abs(result.cumulative.points[1].stockReturnPct-10)<1e-8);
 assert.equal(result.cumulative.points[1].benchmarkReturnPct,0);
 assert.equal(measurePerformance(candidate,prices,{...benchmark,sessions:[sessions[0],sessions[2]]},'2026-09-05').cumulative,null);
});
