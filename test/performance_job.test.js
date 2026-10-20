import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { saveCandidateSnapshot, measurePerformance } from '../src/v2/performance_tracking.js';
import { runPerformanceJob } from '../src/v2/performance_job.js';
async function fixture(t, approved = true) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'kstock-performance-job-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const saved = await saveCandidateSnapshot({ analysisDate: '2026-09-01T00:00:00Z', candidates: [{ ticker: '005930', market: 'KR', exchange: 'KOSPI', approved }] }, directory);
  return { directory, snapshotPath: saved.filename };
}
test('performance job records missing data as PENDING and preserves snapshot bytes', async t => {
  const f = await fixture(t), before = await readFile(f.snapshotPath, 'utf8');
  const report = await runPerformanceJob({ ...f, outputDirectory: path.join(f.directory, 'results'), analysisDate: '2026-10-12T00:00:00Z', env: {} });
  assert.equal(report.status, 'PENDING');
  assert.equal(report.results[0].performance.reason, 'ADJUSTED_PRICES_OR_BENCHMARK_MISSING');
  assert.equal(await readFile(f.snapshotPath, 'utf8'), before);
  assert.equal((await readdir(path.join(f.directory, 'results'))).length, 1);
});
test('tampered snapshots and future analysis cannot produce reports', async t => {
  const f = await fixture(t);
  await assert.rejects(runPerformanceJob({ ...f, analysisDate: '2026-08-01', env: {} }), /SNAPSHOT_INVALID/);
  const data = JSON.parse(await readFile(f.snapshotPath, 'utf8')); data.candidates[0].approved = false;
  await writeFile(f.snapshotPath, JSON.stringify(data));
  await assert.rejects(runPerformanceJob({ ...f, env: {} }), /INTEGRITY/);
});
test('held candidates are never reported as historical approved recommendations', async t => {
  const f = await fixture(t, false), result = await runPerformanceJob({ ...f, env: {} });
  assert.equal(result.results[0].approvedAtSnapshot, false);
  assert.equal(result.results[0].performance.reason, 'NOT_AN_APPROVED_CANDIDATE');
});
test('offline feeds calculate matured returns and store separate report versions', async t => {
  const f = await fixture(t), feedPath = path.join(f.directory, 'feed.json');
  const sessions = Array.from({ length: 22 }, (_,i) => ({ date: `2026-09-${String(i+2).padStart(2,'0')}`, close: 100+i }));
  await writeFile(feedPath, JSON.stringify({ prices: { 'KR:005930': { basis: 'TOTAL_RETURN', corporateActionsReviewed: true, sessions } },
    benchmarks: { KOSPI: { index: 'KOSPI', basis: 'TOTAL_RETURN', sessions: sessions.map(x => ({ ...x, close: 100 })) } } }));
  const options = { ...f, feedPath, outputDirectory: path.join(f.directory, 'results'), env: {} };
  const result = await runPerformanceJob({ ...options, analysisDate: '2026-10-01' });
  assert.equal(result.status, 'READY');
  assert.ok(Math.abs(result.results[0].performance.horizons[20].excessReturnPct - 20) < 1e-8);
  await runPerformanceJob({ ...options, analysisDate: '2026-10-02' });
  assert.equal((await readdir(options.outputDirectory)).length, 2);
});
test('same number of sessions with different dates is not a valid trading calendar', () => {
  const candidate = { exchange: 'KOSPI', analysisDate: '2026-09-01' };
  const sessions = ['2026-09-02','2026-09-04'].map(date => ({ date, close: 100 }));
  const result = measurePerformance(candidate, { sessions, basis: 'TOTAL_RETURN', corporateActionsReviewed: true },
    { index: 'KOSPI', basis: 'TOTAL_RETURN', sessions: ['2026-09-02','2026-09-03','2026-09-04'].map(date => ({ date, close: 100 })) }, '2026-10-01');
  assert.equal(result.horizons[1].reason, 'TRADING_CALENDAR_MISMATCH');
});
