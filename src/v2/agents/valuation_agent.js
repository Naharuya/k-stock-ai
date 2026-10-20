import { agentResult } from '../contracts.js';
const clamp=x=>Math.max(0,Math.min(100,Number(x)||0));
export function runValuationAgent(ticker, metrics = {}) {
  const available = typeof metrics.score === 'number' && Number.isFinite(metrics.score)
    || ['historicalBand', 'peerComparison', 'fcfYield', 'earningsYield'].every(key => typeof metrics[key] === 'number' && Number.isFinite(metrics[key]));
  if (!available) return agentResult('valuation', ticker, { score: 0, available: false, missing: ['valuationInputs'] });
  const score = clamp(metrics.score ?? (
    clamp(metrics.historicalBand)*0.35 +
    clamp(metrics.peerComparison)*0.25 +
    clamp(metrics.fcfYield)*0.25 +
    clamp(metrics.earningsYield)*0.15
  ));
  return agentResult('valuation',ticker,{score:Math.round(score),available:true,missing:[]});
}
