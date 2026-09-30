import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const REPORT_ID_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/;

function summarizeStock(result) {
  return {
    symbol: result.symbol,
    name: result.name,
    success: result.success === true,
    elapsedMs: result.elapsedMs,
    ...(result.error ? { error: result.error } : {}),
    ...(result.analysis ? {
      committeeStatus: result.analysis.committee?.status ?? 'UNKNOWN',
      totalScore: result.analysis.committee?.totalScore ?? null,
      riskOverride: result.analysis.committee?.riskOverride === true,
      companyScore: result.analysis.agents?.company?.score ?? null,
      riskLevel: result.analysis.agents?.risk?.riskLevel ?? 'UNKNOWN',
      importantDisclosure: result.analysis.agents?.dart?.important === true,
    } : {}),
    ...(result.sourceData ? {
      dataValid: result.sourceData.dataQuality?.valid === true,
      disclosureCount: result.sourceData.disclosures?.count ?? 0,
      disclosureTruncated: result.sourceData.disclosures?.truncated === true,
    } : {}),
  };
}

async function readReport(directory, runId) {
  if (typeof runId !== 'string' || !REPORT_ID_PATTERN.test(runId)) {
    throw new TypeError('invalid report id');
  }
  const filename = `watchlist-${runId}.json`;
  const content = await readFile(path.join(directory, filename), 'utf8');
  const report = JSON.parse(content);
  if (report.runId !== runId || !Array.isArray(report.results)) {
    throw new Error('invalid watchlist report');
  }
  return report;
}

export async function listRecentWatchlistReports(directory, limit = 10) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new RangeError('report limit must be between 1 and 50');
  }

  let filenames;
  try {
    filenames = await readdir(directory);
  } catch (error) {
    if (error?.code === 'ENOENT') return { reports: [] };
    throw error;
  }

  const reportIds = filenames
    .filter((filename) => filename.startsWith('watchlist-') && filename.endsWith('.json'))
    .map((filename) => filename.slice('watchlist-'.length, -'.json'.length))
    .filter((runId) => REPORT_ID_PATTERN.test(runId))
    .sort((left, right) => right.localeCompare(left))
    .slice(0, limit);

  const reports = [];
  for (const runId of reportIds) {
    try {
      const report = await readReport(directory, runId);
      reports.push({
        runId,
        startedAt: report.startedAt,
        completedAt: report.completedAt,
        mode: report.mode,
        summary: report.summary,
        results: report.results.map(summarizeStock),
      });
    } catch {
    }
  }

  return { reports };
}

export async function getWatchlistReport(directory, runId) {
  const report = await readReport(directory, runId);
  return {
    runId: report.runId,
    startedAt: report.startedAt,
    completedAt: report.completedAt,
    mode: report.mode,
    summary: report.summary,
    results: report.results.map(summarizeStock),
  };
}