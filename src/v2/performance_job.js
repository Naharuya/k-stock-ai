import 'dotenv/config';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { measurePerformance } from './performance_tracking.js';
import { assertSafeKStockV2Environment } from './scoring.js';
export async function runPerformanceJob({ snapshotPath, feedPath, outputDirectory, analysisDate = new Date().toISOString(), env = process.env } = {}) {
  assertSafeKStockV2Environment(env);
  if (!Number.isFinite(Date.parse(analysisDate))) throw new Error('PERFORMANCE_DATE_INVALID');
  const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'));
  if (snapshot.version !== 1 || !Number.isFinite(Date.parse(snapshot.analysisDate))
    || Date.parse(snapshot.analysisDate) > Date.parse(analysisDate) || !Array.isArray(snapshot.candidates) || snapshot.candidates.length > 500) throw new Error('PERFORMANCE_SNAPSHOT_INVALID');
  const snapshotId = createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
  if (path.basename(snapshotPath) !== `${snapshotId}.json`) throw new Error('PERFORMANCE_SNAPSHOT_INTEGRITY');
  const feed = feedPath ? JSON.parse(await readFile(feedPath, 'utf8')) : { prices: {}, benchmarks: {} };
  if (!feed.prices || !feed.benchmarks || typeof feed.prices !== 'object' || typeof feed.benchmarks !== 'object') throw new Error('PERFORMANCE_FEED_INVALID');
  const seen = new Set();
  const results = snapshot.candidates.map(item => {
    if (!['KR','GLOBAL'].includes(item.market) || typeof item.ticker !== 'string' || !/^[A-Za-z0-9.^-]{1,20}$/.test(item.ticker)) throw new Error('PERFORMANCE_CANDIDATE_INVALID');
    const key = `${item.market}:${item.ticker}`;
    if (seen.has(key)) throw new Error('PERFORMANCE_CANDIDATE_DUPLICATE');
    seen.add(key);
    // Unapproved analyses remain in the snapshot, but are never described as historical recommendations.
    let performance;
    if (item.approved !== true) performance = { status: 'PENDING', reason: 'NOT_AN_APPROVED_CANDIDATE' };
    else if (item.market !== 'KR') performance = { status: 'PENDING', reason: 'MARKET_BENCHMARK_NOT_SUPPORTED' };
    else if (!feed.prices[key] || !feed.benchmarks[item.exchange]) performance = { status: 'PENDING', reason: 'ADJUSTED_PRICES_OR_BENCHMARK_MISSING' };
    else performance = measurePerformance({ ...item, analysisDate: snapshot.analysisDate }, feed.prices[key], feed.benchmarks[item.exchange], analysisDate);
    return { ticker: item.ticker, market: item.market, approvedAtSnapshot: item.approved === true, performance };
  });
  const report = { version: 1, snapshotId, snapshotAnalysisDate: snapshot.analysisDate, analysisDate,
    status: results.length && results.every(x => x.performance.status === 'READY') ? 'READY' : 'PENDING',
    results, warning: 'REFERENCE_RETURNS_NOT_EXECUTED_RETURNS' };
  if (outputDirectory) {
    const id = createHash('sha256').update(JSON.stringify(report)).digest('hex');
    await mkdir(outputDirectory, { recursive: true, mode: 0o700 });
    try { await writeFile(path.join(outputDirectory, `${id}.json`), JSON.stringify(report) + '\n', { flag: 'wx', mode: 0o600 }); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
  }
  return report;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [, , flag, snapshotPath, feedPath, ...extra] = process.argv;
    if (flag !== '--offline' || !snapshotPath || extra.length) throw new Error('PERFORMANCE_USAGE');
    const report = await runPerformanceJob({ snapshotPath, feedPath, outputDirectory: path.resolve('data/v2/performance') });
    console.log(JSON.stringify({ status: report.status, evaluatedCount: report.results.length, readyCount: report.results.filter(x => x.performance.status === 'READY').length }));
  } catch { console.error(JSON.stringify({ status: 'FAILED', reason: 'PERFORMANCE_JOB_FAILED' })); process.exitCode = 1; }
}
