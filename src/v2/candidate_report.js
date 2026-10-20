import { readFile } from 'node:fs/promises';
import { assertSafeKStockV2Environment, selectCandidates } from './scoring.js';
import { runEvidenceAgent } from './agents/evidence_agent.js';

export function createCandidateReportService({ reportPath, env = process.env, read = readFile, now = () => Date.now(), maxAgeMs = 36 * 3600000 } = {}) {
  if (!Number.isFinite(maxAgeMs) || maxAgeMs <= 0) throw new Error('Invalid report freshness limit');
  return { async load() {
    assertSafeKStockV2Environment(env);
    let report;
    try { report = JSON.parse(await read(reportPath, 'utf8')); }
    catch (error) {
      if (error.code === 'ENOENT') return { success: true, status: 'NO_DATA', analysisDate: null, KR: [], GLOBAL: [], candidates: [], deliveryMode: 'BATCH_REPORT' };
      throw error;
    }
    const generated = Date.parse(report.generatedAt), analyzed = Date.parse(report.analysisDate);
    if (report.schemaVersion !== 1 || report.success !== true || !Number.isFinite(generated) || !Number.isFinite(analyzed)
        || generated > now() + 300000 || analyzed > now() + 300000 || !Array.isArray(report.candidates) || report.candidates.length > 500) throw new Error('Invalid candidate report');
    const seen = new Set();
    for (const item of report.candidates) {
      if (!item || !['KR', 'GLOBAL'].includes(item.market) || typeof item.ticker !== 'string'
          || !/^[A-Za-z0-9.^-]{1,20}$/.test(item.ticker) || typeof item.companyName !== 'string'
          || typeof item.approved !== 'boolean' || !Number.isFinite(item.score) || item.score < 0 || item.score > 100
          || !Array.isArray(item.evidence) || !Array.isArray(item.reviewRequired)) throw new Error('Invalid report candidate');
      const key = `${item.market}:${item.ticker}`;
      if (seen.has(key)) throw new Error('Duplicate report candidate');
      seen.add(key);
      const gate = runEvidenceAgent(item.evidence, report.analysisDate);
      if (gate.rejected.length || item.evidence.some(e => e.ticker !== item.ticker || e.market !== item.market)) throw new Error('Invalid report evidence');
      if(item.approved && item.market==='KR' && item.recommendationGate?.status!=='VERIFIED')throw new Error('Invalid report KR approval');
      if (item.approved && (!gate.passed || item.reviewRequired.length || item.dataBlockers?.length || !item.committee?.approved || !item.compliance?.passed)) throw new Error('Invalid report approval');
    }
    const stale = now() - Math.min(generated, analyzed) > maxAgeMs;
    const candidates = report.candidates.map(item => stale ? { ...item, approved: false } : item);
    const approved = candidates.filter(item => item.approved);
    return { ...report, deliveryMode: 'BATCH_REPORT', candidates,
      status: stale ? 'STALE' : candidates.some(item => item.reviewRequired.length) ? 'REVIEW_REQUIRED' : candidates.some(item => item.dataBlockers?.length) ? 'DATA_INCOMPLETE' : 'READY',
      reportAgeHours: Math.round((now() - generated) / 3600000 * 10) / 10,
      KR: selectCandidates(approved, 'KR'), GLOBAL: selectCandidates(approved, 'GLOBAL') };
  } };
}
