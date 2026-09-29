import { agentResult } from '../contracts.js';
const clamp=x=>Math.max(0,Math.min(100,Number(x)||0));
export function runValuationAgent(ticker, metrics = {}) {
  const score = clamp(metrics.score ?? (
    clamp(metrics.historicalBand)*0.35 +
    clamp(metrics.peerComparison)*0.25 +
    clamp(metrics.fcfYield)*0.25 +
    clamp(metrics.earningsYield)*0.15
  ));
  return agentResult('valuation',ticker,{score:Math.round(score)});
}
