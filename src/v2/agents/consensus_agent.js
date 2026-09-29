import { agentResult } from '../contracts.js';
export function runConsensusAgent(ticker, actorSignals = []) {
  const rows = actorSignals.filter(x => x.ticker === ticker);
  const positive = rows.filter(x => Number(x.score) >= 60).length;
  const negative = rows.filter(x => Number(x.score) <= 40).length;
  const diversity = new Set(rows.map(x => x.actorType).filter(Boolean)).size;
  const score = Math.max(0, Math.min(100, positive * 18 + diversity * 12 - negative * 15));
  return agentResult('consensus', ticker, { score, positiveActors: positive, negativeActors: negative, actorTypeDiversity: diversity });
}
