import { readdir, readFile, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { assertSafeKStockV2Environment } from './scoring.js';
const validDay = x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && Number.isFinite(Date.parse(x)) && new Date(x).toISOString().slice(0,10) === x;
const idPattern = /^[a-f0-9]{64}$/;
export function createPerformanceReportService({ directory, env = process.env, now = () => Date.now() } = {}) {
  async function get(id) {
    assertSafeKStockV2Environment(env);
    if (!idPattern.test(id || '')) throw new Error('INVALID_PERFORMANCE_ID');
    const filename = path.join(directory, `${id}.json`);
    const stats = await lstat(filename);
    if (!stats.isFile() || stats.size > 2000000) throw new Error('INVALID_PERFORMANCE_FILE');
    const report = JSON.parse(await readFile(filename, 'utf8'));
    if (createHash('sha256').update(JSON.stringify(report)).digest('hex') !== id
      || report.version !== 1 || !idPattern.test(report.snapshotId || '')
      || !['READY','PENDING'].includes(report.status) || !Array.isArray(report.results) || report.results.length > 500
      || !Number.isFinite(Date.parse(report.analysisDate)) || !Number.isFinite(Date.parse(report.snapshotAnalysisDate))
      || Date.parse(report.analysisDate) > now() + 300000 || Date.parse(report.snapshotAnalysisDate) > Date.parse(report.analysisDate)) throw new Error('INVALID_PERFORMANCE_REPORT');
    const seen = new Set();
    const results = report.results.map(row => {
      const key = `${row.market}:${row.ticker}`, p = row.performance;
      if (!['KR','GLOBAL'].includes(row.market) || typeof row.ticker !== 'string' || !/^[A-Za-z0-9.^-]{1,20}$/.test(row.ticker)
        || typeof row.approvedAtSnapshot !== 'boolean' || seen.has(key) || !['READY','PENDING'].includes(p?.status)
        || p.status === 'READY' && (!row.approvedAtSnapshot || row.market !== 'KR')) throw new Error('INVALID_PERFORMANCE_RESULT');
      seen.add(key);
      const horizons = {};
      for (const days of [1,5,20]) {
        const h = p.horizons?.[days];
        if (!h || h.status === 'PENDING') { horizons[days] = { status: 'PENDING' }; continue; }
        if (h.status !== 'READY' || !row.approvedAtSnapshot || row.market !== 'KR'
          || !['stockReturnPct','benchmarkReturnPct','excessReturnPct'].every(k => Number.isFinite(h[k]))
          || !validDay(h.fromDate) || !validDay(h.toDate)
          || h.fromDate >= h.toDate || Date.parse(h.toDate) > Date.parse(report.analysisDate)
          || Math.abs(h.stockReturnPct-h.benchmarkReturnPct-h.excessReturnPct) > 1e-7) throw new Error('INVALID_PERFORMANCE_HORIZON');
        horizons[days] = { status: 'READY', fromDate: h.fromDate, toDate: h.toDate,
          stockReturnPct: h.stockReturnPct, benchmarkReturnPct: h.benchmarkReturnPct, excessReturnPct: h.excessReturnPct };
      }
      let cumulative = null;
      if (p.cumulative != null) {
        const c = p.cumulative;
        const cutoff = new Date(Date.parse(report.analysisDate)+9*3600000).toISOString().slice(0,10);
        const anchorDay = new Date(Date.parse(report.snapshotAnalysisDate)+9*3600000).toISOString().slice(0,10);
        if (!row.approvedAtSnapshot || row.market !== 'KR' || !['KOSPI','KOSDAQ'].includes(c.benchmark)
          || c.basis !== 'TOTAL_RETURN' || !Array.isArray(c.points) || c.points.length < 2 || c.points.length > 252
          || c.points.some((x,i) => !validDay(x.date) || x.date <= anchorDay || x.date >= cutoff
            || i > 0 && c.points[i-1].date >= x.date
            || ![x.stockReturnPct,x.benchmarkReturnPct].every(v => Number.isFinite(v) && v > -100))
          || c.points[0].stockReturnPct !== 0 || c.points[0].benchmarkReturnPct !== 0)
          throw new Error('INVALID_PERFORMANCE_SERIES');
        for (const h of Object.values(horizons).filter(x => x.status === 'READY')) {
          const end = c.points.find(x => x.date === h.toDate);
          if (!end || h.fromDate !== c.points[0].date || Math.abs(end.stockReturnPct-h.stockReturnPct)>1e-7
            || Math.abs(end.benchmarkReturnPct-h.benchmarkReturnPct)>1e-7) throw new Error('INVALID_PERFORMANCE_SERIES');
        }
        cumulative = { benchmark:c.benchmark, basis:c.basis, points:c.points.map(x => ({date:x.date,stockReturnPct:x.stockReturnPct,benchmarkReturnPct:x.benchmarkReturnPct})) };
      }
      if (p.status === 'READY' && Object.values(horizons).some(x => x.status !== 'READY')) throw new Error('INVALID_PERFORMANCE_STATUS');
      return { ticker: row.ticker, market: row.market, approvedAtSnapshot: row.approvedAtSnapshot,
        performance: { status: p.status, horizons, cumulative } };
    });
    if (report.status === 'READY' && (!results.length || results.some(x => x.performance.status !== 'READY'))) throw new Error('INVALID_PERFORMANCE_STATUS');
    return { id, snapshotId: report.snapshotId, analysisDate: report.analysisDate, snapshotAnalysisDate: report.snapshotAnalysisDate,
      status: report.status, results, warning: 'REFERENCE_RETURNS_NOT_EXECUTED_RETURNS' };
  }
  async function list() {
    assertSafeKStockV2Environment(env);
    let files;
    try { files = await readdir(directory); } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
    files = files.filter(x => /^[a-f0-9]{64}\.json$/.test(x));
    if (files.length > 1000) throw new Error('PERFORMANCE_DIRECTORY_LIMIT');
    const summaries = [];
    for (const file of files) {
      const report = await get(file.slice(0,-5));
      const { results, ...summary } = report;
      summaries.push({ ...summary, evaluatedCount: results.length, readyCount: results.filter(x => x.performance.status === 'READY').length });
    }
    return summaries.sort((a,b) => Date.parse(b.analysisDate)-Date.parse(a.analysisDate) || a.id.localeCompare(b.id)).slice(0,50);
  }
  return { get, list };
}
export function registerPerformanceRoutes(app, service) {
  app.get('/api/v2/performance', async (_req,res) => {
    res.set('Cache-Control','no-store');
    try { const reports = await service.list(); res.json({ success: true, status: reports.length ? 'AVAILABLE' : 'NO_DATA', reports }); }
    catch { res.status(503).json({ success: false, error: 'PERFORMANCE_UNAVAILABLE' }); }
  });
  app.get('/api/v2/performance/:id', async (req,res) => {
    res.set('Cache-Control','no-store');
    if (!idPattern.test(req.params.id || '')) return res.status(400).json({ success: false, error: 'INVALID_PERFORMANCE_ID' });
    try { res.json({ success: true, report: await service.get(req.params.id) }); }
    catch (error) { res.status(error.code === 'ENOENT' ? 404 : 503).json({ success: false, error: error.code === 'ENOENT' ? 'PERFORMANCE_NOT_FOUND' : 'PERFORMANCE_UNAVAILABLE' }); }
  });
}
