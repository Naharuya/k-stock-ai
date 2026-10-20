import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
export async function saveCandidateSnapshot(report, directory) {
  if (!Number.isFinite(Date.parse(report.analysisDate)) || !Array.isArray(report.candidates)) throw new Error('SNAPSHOT_INVALID');
  const payload = JSON.stringify({ version: 1, analysisDate: report.analysisDate, candidates: report.candidates });
  const id = createHash('sha256').update(payload).digest('hex');
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const filename = path.join(directory, `${id}.json`);
  try { await writeFile(filename, payload + '\n', { flag: 'wx', mode: 0o600 }); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  return { id, filename };
}
export function measurePerformance(candidate, prices, benchmark, analysisDate) {
  const pending = reason => ({ status: 'PENDING', reason, horizons: { 1: null, 5: null, 20: null } });
  if (!candidate || !prices || !benchmark || !Number.isFinite(Date.parse(candidate.analysisDate)) || !Number.isFinite(Date.parse(analysisDate))) return pending('INVALID_INPUT');
  const kstDay = value => new Date(Date.parse(value) + 9*3600000).toISOString().slice(0,10);
  if (!['KOSPI','KOSDAQ'].includes(candidate.exchange) || benchmark.index !== candidate.exchange) return pending('BENCHMARK_MISMATCH');
  if (prices.basis !== 'TOTAL_RETURN' || benchmark.basis !== prices.basis || prices.corporateActionsReviewed !== true) return pending('ADJUSTMENT_REQUIRED');
  const check = rows => Array.isArray(rows) && rows.every((x,i) => /^\d{4}-\d{2}-\d{2}$/.test(x.date) && Number.isFinite(Date.parse(x.date)) && new Date(x.date).toISOString().slice(0,10) === x.date
    && Number.isFinite(x.close) && x.close > 0 && (!i || rows[i-1].date < x.date));
  if (!check(prices.sessions) || !check(benchmark.sessions)) return pending('INVALID_SESSIONS');
  const anchor = prices.sessions.findIndex(x => x.date > kstDay(candidate.analysisDate));
  if (anchor < 0) return pending('ENTRY_SESSION_PENDING');
  const first = prices.sessions[anchor], base = benchmark.sessions.find(x => x.date === first.date);
  if (!base || first.date >= kstDay(analysisDate)) return pending('ENTRY_SESSION_PENDING');
  if (!base || first.halted || first.delisted) return pending('ENTRY_UNAVAILABLE');
  const horizons = {};
  for (const days of [1,5,20]) {
    const end = prices.sessions[anchor + days];
    const index = end && benchmark.sessions.find(x => x.date === end.date);
    if (!end || !index || end.date >= kstDay(analysisDate)) horizons[days] = { status: 'PENDING' };
    else if (JSON.stringify(benchmark.sessions.filter(x => x.date >= first.date && x.date <= end.date).map(x => x.date)) !== JSON.stringify(prices.sessions.slice(anchor, anchor+days+1).map(x => x.date))) horizons[days] = { status: 'PENDING', reason: 'TRADING_CALENDAR_MISMATCH' };
    else if (prices.sessions.slice(anchor, anchor+days+1).some(x => x.halted || x.delisted)) horizons[days] = { status: 'PENDING', reason: 'CORPORATE_EVENT_REVIEW' };
    else { const stockReturnPct = (end.close / first.close - 1)*100, benchmarkReturnPct = (index.close / base.close - 1)*100;
      horizons[days] = { status: 'READY', fromDate: first.date, toDate: end.date, stockReturnPct, benchmarkReturnPct, excessReturnPct: stockReturnPct-benchmarkReturnPct }; }
  }
  const eligible = prices.sessions.slice(anchor).filter(x => x.date < kstDay(analysisDate));
  const calendar = benchmark.sessions.filter(x => x.date >= first.date && x.date <= eligible.at(-1)?.date);
  let cumulative = null;
  if (eligible.length >= 2 && eligible.length <= 252
    && !eligible.some(x => x.halted || x.delisted)
    && JSON.stringify(eligible.map(x => x.date)) === JSON.stringify(calendar.map(x => x.date))) {
    const points = eligible.map((x,i) => ({ date:x.date, stockReturnPct:(x.close/first.close-1)*100,
      benchmarkReturnPct:(calendar[i].close/base.close-1)*100 }));
    if (points.every(x => Number.isFinite(x.stockReturnPct) && Number.isFinite(x.benchmarkReturnPct)))
      cumulative = { benchmark:benchmark.index, basis:'TOTAL_RETURN', points };
  }
  return { cumulative, status: Object.values(horizons).every(x => x.status === 'READY') ? 'READY' : 'PENDING', horizons, warning: 'NEXT_SESSION_CLOSE_REFERENCE_NOT_EXECUTED_RETURN' };
}
