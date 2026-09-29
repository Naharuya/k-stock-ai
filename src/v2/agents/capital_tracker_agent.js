import { agentResult } from '../contracts.js';

const ACTION_SCORE = { new_position: 100, increase: 80, strategic_investment: 75, hold: 45, reduce: 20, exit: 0 };

export function runCapitalTrackerAgent(ticker, evidence = []) {
  const rows = evidence.filter(x => x.ticker === ticker && x.signalType === 'capital_action');
  const weighted = rows.reduce((sum, x) => sum + (ACTION_SCORE[x.actionType] ?? 40) * x.confidence, 0);
  const weight = rows.reduce((sum, x) => sum + x.confidence, 0);
  const score = weight ? weighted / weight : 0;
  return agentResult('capital_tracker', ticker, { score: Math.round(score), evidenceIds: rows.map(x => x.id) });
}
