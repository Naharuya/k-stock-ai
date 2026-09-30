import { chmod, mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { analyzeStock } from '../ai_router.js';
import { safeErrorMessage } from './secret_redactor.js';

function dateFrom(now) {
  const value = now();
  return value instanceof Date ? value : new Date(value);
}

export function validateWatchlist(input, maxStocks = 10) {
  const stocks = Array.isArray(input) ? input : input?.stocks;
  if (!Array.isArray(stocks) || stocks.length === 0) {
    throw new TypeError('watchlist must contain at least one stock');
  }
  if (!Number.isInteger(maxStocks) || maxStocks < 1) {
    throw new TypeError('maxStocks must be a positive integer');
  }
  if (stocks.length > maxStocks) {
    throw new RangeError(`watchlist exceeds the ${maxStocks}-stock batch limit`);
  }

  const seen = new Set();
  return stocks.map((stock, index) => {
    if (!stock || typeof stock !== 'object' || !/^\d{6}$/.test(stock.symbol ?? '')) {
      throw new TypeError(`watchlist item ${index + 1} must have a six-digit symbol`);
    }
    if (typeof stock.name !== 'string' || !stock.name.trim()) {
      throw new TypeError(`watchlist item ${index + 1} must have a name`);
    }
    if (seen.has(stock.symbol)) throw new Error(`duplicate watchlist symbol: ${stock.symbol}`);
    seen.add(stock.symbol);
    if (stock.year != null && !/^\d{4}$/.test(String(stock.year))) {
      throw new TypeError(`watchlist item ${index + 1} year must use YYYY`);
    }

    return {
      symbol: stock.symbol,
      name: stock.name.trim(),
      ...(stock.year == null ? {} : { year: String(stock.year) }),
      ...(stock.disclosureBeginDate == null ? {} : { disclosureBeginDate: stock.disclosureBeginDate }),
      ...(stock.disclosureEndDate == null ? {} : { disclosureEndDate: stock.disclosureEndDate }),
    };
  });
}

export async function runWatchlist({
  watchlist,
  loader,
  analyze = analyzeStock,
  now = () => new Date(),
  maxStocks = 10,
}) {
  if (typeof loader?.load !== 'function') throw new TypeError('analysis data loader is required');
  if (typeof analyze !== 'function') throw new TypeError('analysis function is required');

  const stocks = validateWatchlist(watchlist, maxStocks);
  const startedAt = dateFrom(now).toISOString();
  const results = [];

  for (const stock of stocks) {
    const itemStartedAt = dateFrom(now).getTime();
    try {
      const { stockData, snapshot } = await loader.load(stock);
      if (!snapshot) throw new Error('Live source snapshot is required for scheduled analysis');

      const analysis = await analyze(stockData);
      results.push({
        symbol: stock.symbol,
        name: stock.name,
        success: true,
        elapsedMs: Math.max(0, dateFrom(now).getTime() - itemStartedAt),
        sourceData: {
          corpCode: snapshot.corpCode,
          dataQuality: snapshot.dataQuality,
          freshness: snapshot.freshness,
          disclosures: {
            count: snapshot.disclosures.items.length,
            retrievedPages: snapshot.disclosures.retrievedPages,
            totalPages: snapshot.disclosures.totalPages,
            requestedWindows: snapshot.disclosures.requestedWindows,
            truncated: snapshot.disclosures.truncated,
          },
        },
        analysis: {
          mode: analysis.mode,
          committee: analysis.committee,
          agents: analysis.agents,
        },
      });
    } catch (error) {
      results.push({
        symbol: stock.symbol,
        name: stock.name,
        success: false,
        elapsedMs: Math.max(0, dateFrom(now).getTime() - itemStartedAt),
        error: safeErrorMessage(error),
      });
    }
  }

  const completedAt = dateFrom(now).toISOString();
  const successful = results.filter((result) => result.success).length;
  return {
    runId: completedAt.replaceAll(':', '-').replaceAll('.', '-'),
    startedAt,
    completedAt,
    mode: process.env.KSTOCK_AI_MODE || 'mock',
    summary: {
      requested: stocks.length,
      successful,
      failed: stocks.length - successful,
      liveTrading: false,
    },
    results,
  };
}

export async function writeWatchlistReport(report, reportDirectory) {
  if (!report?.runId || !Array.isArray(report.results)) {
    throw new TypeError('valid watchlist report is required');
  }
  const directory = path.resolve(reportDirectory);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);

  const filename = `watchlist-${report.runId}.json`;
  const destination = path.join(directory, filename);
  const temporary = path.join(directory, `.${filename}.${process.pid}.tmp`);
  try {
    await writeFile(temporary, `${JSON.stringify(report, null, 2)}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    await rename(temporary, destination);
    await chmod(destination, 0o600);
  } catch (error) {
    await unlink(temporary).catch(() => {});
    throw error;
  }

  return destination;
}