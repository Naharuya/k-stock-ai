import { readFile } from 'node:fs/promises';
import { runKStockV2Pipeline } from './orchestrator.js';

export function validateCandidateInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)
      || typeof input.analysisDate !== 'string' || !Number.isFinite(Date.parse(input.analysisDate))
      || !Array.isArray(input.companies) || !Array.isArray(input.evidence)
      || input.companies.length > 500 || input.evidence.length > 5000) {
    throw new Error('Invalid candidate input');
  }
  if (input.krHistory !== undefined && (!Array.isArray(input.krHistory) || input.krHistory.length > 3000)) throw new Error('Invalid KR history');
  if(input.krPeers!==undefined&&(!Array.isArray(input.krPeers)||input.krPeers.length>3||input.krPeers.some(x=>x.market!=='KR'||!/^\d{6}$/.test(x.ticker||'')||typeof x.companyName!=='string')))throw new Error('Invalid KR peers');
  const keys = new Set();
  for (const company of input.companies) {
    if (!company || !['KR', 'GLOBAL'].includes(company.market)
        || typeof company.ticker !== 'string' || !/^[A-Za-z0-9.^-]{1,20}$/.test(company.ticker)
        || typeof company.companyName !== 'string' || !company.companyName.trim()) {
      throw new Error('Invalid company');
    }
    const key = `${company.market}:${company.ticker}`;
    if (keys.has(key)) throw new Error('Duplicate company');
    keys.add(key);
  }
  return input;
}

export function createCandidateService({ inputPath, env = process.env, read = readFile, refresh = async input => input, requireVerifiedRecommendations = false } = {}) {
  async function load() {
    let input;
    try {
      input = JSON.parse(await read(inputPath, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { success: true, status: 'NO_DATA', analysisDate: null, KR: [], GLOBAL: [], candidates: [] };
      }
      throw error;
    }
    validateCandidateInput(input);
    input = await refresh(input);
    validateCandidateInput(input);
    const result = runKStockV2Pipeline({...input,requireVerifiedRecommendations}, env);
    return {
      success: true,
      status: result.candidates.some(item => item.reviewRequired.length) ? 'REVIEW_REQUIRED' : result.candidates.some(item => item.dataBlockers.length) ? 'DATA_INCOMPLETE' : 'READY',
      analysisDate: input.analysisDate,
      dataMode: input.secCollection ? (input.collection ? 'OPENDART_AND_SEC' : 'SEC_13F') : (input.collection ? 'OPENDART_OWNERSHIP' : 'LOCAL_INPUT'),
      ...(input.secCollection ? { secCollection: input.secCollection } : {}),
      ...(input.krCollection ? { krCollection: input.krCollection } : {}),
      ...(input.collection ? { collection: input.collection } : {}),
      warning: 'RESEARCH_ONLY',
      ...(input.form4Collection ? { form4Collection: input.form4Collection, dataMode: 'SEC_FORM4_COMBINED' } : {}),
      ...result,
    };
  }
  return { load };
}

export function registerCandidateRoutes(app, service) {
  app.get('/api/v2/candidates', async (_req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      const { candidates, ...report } = await service.load();
      res.json({ ...report, evaluatedCount: candidates.length,
        incompleteCandidates: candidates.filter(item => item.dataBlockers?.length),
        reviewCandidates: candidates.filter(item => item.reviewRequired?.length) });
    } catch {
      res.status(503).json({ success: false, error: 'CANDIDATES_UNAVAILABLE' });
    }
  });
  app.get('/api/v2/candidates/:ticker', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const market = req.query.market;
    if (market !== undefined && !['KR', 'GLOBAL'].includes(market)) {
      return res.status(400).json({ success: false, error: 'INVALID_MARKET' });
    }
    try {
      const report = await service.load();
      const matches = report.candidates.filter(item => item.ticker === req.params.ticker
        && (market === undefined || item.market === market));
      if (matches.length > 1) return res.status(400).json({ success: false, error: 'MARKET_REQUIRED' });
      if (!matches.length) return res.status(404).json({ success: false, error: 'CANDIDATE_NOT_FOUND' });
      res.json({ success: true, analysisDate: report.analysisDate, status: report.status,
        generatedAt: report.generatedAt, deliveryMode: report.deliveryMode, warning: 'RESEARCH_ONLY', candidate: matches[0] });
    } catch {
      res.status(503).json({ success: false, error: 'CANDIDATES_UNAVAILABLE' });
    }
  });
}
