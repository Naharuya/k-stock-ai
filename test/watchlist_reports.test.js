import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { getWatchlistReport, listRecentWatchlistReports } from '../src/services/watchlist_reports.js';

test('recent report list sorts newest-first and exposes concise stock summaries', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'k-stock-reports-'));
  try {
    const oldRun = '2026-09-29T17-30-00-000Z';
    const newRun = '2026-09-30T17-30-00-000Z';
    const report = (runId) => ({
      runId,
      startedAt: 'start',
      completedAt: 'done',
      mode: 'local',
      summary: { requested: 1, successful: 1, failed: 0, liveTrading: false },
      results: [{
        symbol: '005930',
        name: '삼성전자',
        success: true,
        elapsedMs: 1000,
        sourceData: { dataQuality: { valid: true }, disclosures: { count: 12, truncated: false } },
        analysis: {
          committee: { status: 'WATCH', totalScore: 70, riskOverride: false },
          agents: { company: { score: 75 }, risk: { riskLevel: 'MEDIUM' }, dart: { important: false } },
        },
      }],
    });
    await writeFile(path.join(directory, `watchlist-${oldRun}.json`), JSON.stringify(report(oldRun)));
    await writeFile(path.join(directory, `watchlist-${newRun}.json`), JSON.stringify(report(newRun)));
    await writeFile(path.join(directory, 'watchlist-invalid.json'), '{');

    const result = await listRecentWatchlistReports(directory, 1);
    assert.equal(result.reports.length, 1);
    assert.equal(result.reports[0].runId, newRun);
    assert.equal(result.reports[0].results[0].committeeStatus, 'WATCH');
    assert.equal(result.reports[0].results[0].companyScore, 75);
    assert.equal(result.reports[0].results[0].disclosureCount, 12);
    assert.equal('reportPath' in result.reports[0], false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('report detail rejects path traversal and returns an empty list for missing storage', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'k-stock-reports-'));
  try {
    await assert.rejects(getWatchlistReport(directory, '../.env'), /invalid report id/);
    assert.deepEqual(await listRecentWatchlistReports(path.join(directory, 'missing')), { reports: [] });
    await assert.rejects(listRecentWatchlistReports(directory, 51), /between 1 and 50/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});