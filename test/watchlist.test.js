import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { runWatchlist, validateWatchlist, writeWatchlistReport } from '../src/services/watchlist_runner.js';

test('watchlist validation enforces stock identifiers, uniqueness, year and batch cap', () => {
  assert.deepEqual(validateWatchlist({ stocks: [{ symbol: '005930', name: ' 삼성전자 ', year: 2025 }] }), [
    { symbol: '005930', name: '삼성전자', year: '2025' },
  ]);
  assert.throws(() => validateWatchlist({ stocks: [] }), /at least one stock/);
  assert.throws(() => validateWatchlist([{ symbol: '5930', name: 'bad' }]), /six-digit symbol/);
  assert.throws(() => validateWatchlist([
    { symbol: '005930', name: '삼성전자' },
    { symbol: '005930', name: '중복' },
  ]), /duplicate watchlist symbol/);
  assert.throws(() => validateWatchlist([{ symbol: '005930', name: '삼성전자', year: '25' }]), /year must use YYYY/);
  assert.throws(() => validateWatchlist([
    { symbol: '005930', name: 'A' },
    { symbol: '000660', name: 'B' },
  ], 1), /exceeds the 1-stock batch limit/);
});

test('watchlist runner processes stocks sequentially and isolates per-stock failures', async () => {
  const events = [];
  let currentTime = 1_000;
  const now = () => new Date(currentTime += 10);
  const report = await runWatchlist({
    watchlist: [
      { symbol: '005930', name: '삼성전자' },
      { symbol: '000660', name: 'SK하이닉스' },
    ],
    now,
    loader: {
      async load(stock) {
        events.push(`load:${stock.symbol}`);
        if (stock.symbol === '000660') throw new Error('provider request failed');
        return {
          stockData: { symbol: stock.symbol, name: stock.name },
          snapshot: {
            corpCode: '00126380',
            dataQuality: { valid: true },
            freshness: { quoteAgeMs: 1000 },
            disclosures: { items: [], retrievedPages: 0, totalPages: 0, requestedWindows: 1, truncated: false },
          },
        };
      },
    },
    async analyze(stockData) {
      events.push(`analyze:${stockData.symbol}`);
      return { mode: 'local', committee: { status: 'WATCH' }, agents: {} };
    },
  });

  assert.deepEqual(events, ['load:005930', 'analyze:005930', 'load:000660']);
  assert.deepEqual(report.summary, { requested: 2, successful: 1, failed: 1, liveTrading: false });
  assert.equal(report.results[0].sourceData.dataQuality.valid, true);
  assert.equal(report.results[1].success, false);
  assert.match(report.results[1].error, /provider request failed/);
});

test('watchlist report is written atomically with private file and directory permissions', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'k-stock-watchlist-'));
  const outputDirectory = path.join(root, 'reports');
  try {
    const outputPath = await writeWatchlistReport({ runId: 'run-1', results: [] }, outputDirectory);
    const report = JSON.parse(await readFile(outputPath, 'utf8'));
    assert.deepEqual(report, { runId: 'run-1', results: [] });
    assert.equal((await stat(outputPath)).mode & 0o777, 0o600);
    assert.equal((await stat(outputDirectory)).mode & 0o777, 0o700);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});