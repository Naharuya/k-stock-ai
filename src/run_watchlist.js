import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSafeDataPipeline } from './services/safe_data_pipeline.js';
import { createAnalysisDataLoader } from './services/analysis_data_loader.js';
import { runWatchlist, writeWatchlistReport } from './services/watchlist_runner.js';

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function assertSafeRuntime() {
  if (process.env.KSTOCK_AI_MODE !== 'local') {
    throw new Error('Scheduled analysis requires KSTOCK_AI_MODE=local');
  }
  if (process.env.KSTOCK_KIS_ENABLED !== 'true' || process.env.KSTOCK_DART_ENABLED !== 'true') {
    throw new Error('Scheduled analysis requires both read-only data providers');
  }
  if (process.env.KSTOCK_LIVE_TRADING_ENABLED === 'true' || process.env.KSTOCK_BROKER_ENABLED === 'true') {
    throw new Error('Scheduled analysis refuses any live trading or broker activation');
  }
}

try {
  assertSafeRuntime();
  const watchlistPath = path.resolve(process.env.KSTOCK_WATCHLIST_PATH || path.join(projectDirectory, 'data', 'watchlist.json'));
  const reportDirectory = path.resolve(process.env.KSTOCK_REPORT_DIR || path.join(projectDirectory, 'data', 'reports'));
  const watchlist = JSON.parse(await readFile(watchlistPath, 'utf8'));
  const loader = createAnalysisDataLoader({ pipeline: createSafeDataPipeline({}) });
  const report = await runWatchlist({ watchlist, loader });
  const reportPath = await writeWatchlistReport(report, reportDirectory);

  console.log(JSON.stringify({ reportPath, summary: report.summary, completedAt: report.completedAt }));
  if (report.summary.failed > 0) process.exitCode = 1;
} catch (error) {
  console.error(JSON.stringify({ error: error.message }));
  process.exitCode = 1;
}