export const KSTOCK_V2_SCORE_WEIGHTS = Object.freeze({
  capitalAction: 0.25,
  actorCredibility: 0.15,
  consensus: 0.10,
  mediaSignal: 0.10,
  fundamental: 0.15,
  valuation: 0.08,
  marketFlow: 0.07,
  sentiment: 0.05,
  dataFreshness: 0.05,
});

export const KSTOCK_V2_MARKET_LIMITS = Object.freeze({
  KR: 15,
  GLOBAL: 20,
});

const SCORE_KEYS = Object.keys(KSTOCK_V2_SCORE_WEIGHTS);

function clampScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, number));
}

export function calculateCandidateScore(input = {}) {
  let score = 0;
  for (const key of SCORE_KEYS) {
    score += clampScore(input[key]) * KSTOCK_V2_SCORE_WEIGHTS[key];
  }
  const riskPenalty = Math.max(0, Math.min(15, Number(input.riskPenalty || 0)));
  return Math.round(Math.max(0, Math.min(100, score - riskPenalty)) * 100) / 100;
}

export function selectCandidates(candidates = [], market) {
  const limit = KSTOCK_V2_MARKET_LIMITS[market];
  if (!limit) throw new Error(`Unsupported market: ${market}`);
  return candidates
    .filter(candidate => candidate.market === market)
    .map(candidate => ({
      ...candidate,
      score: candidate.score ?? calculateCandidateScore(candidate.signals || candidate),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function assertSafeKStockV2Environment(env = process.env) {
  if (env.KSTOCK_LIVE_TRADING_ENABLED === 'true') {
    throw new Error('K-Stock AI 2.0 refuses to run with live trading enabled.');
  }
  if (env.KSTOCK_BROKER_ENABLED === 'true') {
    throw new Error('K-Stock AI 2.0 refuses to run with broker order execution enabled.');
  }
  return true;
}

export function isD2Eligible(observedAt, analysisDate) {
  const observed = new Date(observedAt);
  const analysis = new Date(analysisDate);
  if (Number.isNaN(observed.getTime()) || Number.isNaN(analysis.getTime())) return false;
  const cutoff = new Date(analysis);
  cutoff.setUTCDate(cutoff.getUTCDate() - 2);
  cutoff.setUTCHours(23, 59, 59, 999);
  return observed <= cutoff;
}
