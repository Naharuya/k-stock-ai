import { agentResult } from '../contracts.js';

const DIRECTION = { positive_capital_intent: 100, positive_strategic_view: 75, neutral_mention: 50, risk_warning: 25, negative_capital_intent: 0 };

export function runMediaMentionAgent(ticker, evidence = []) {
  const rows = evidence.filter(x => x.ticker === ticker && x.signalType === 'public_mention');
  const total = rows.reduce((s,x)=>s + (DIRECTION[x.direction] ?? 50) * x.confidence, 0);
  const w = rows.reduce((s,x)=>s+x.confidence,0);
  return agentResult('media_mention', ticker, { score: w ? Math.round(total/w) : 0, mentions: rows.length, evidenceIds: rows.map(x=>x.id) });
}
