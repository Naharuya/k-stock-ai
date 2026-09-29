import { agentResult } from '../contracts.js';
const clamp=x=>Math.max(0,Math.min(100,Number(x)||0));
export function runFundamentalAgent(ticker, metrics = {}) {
  const score = (clamp(metrics.revenueGrowth)*0.25 + clamp(metrics.cashFlow)*0.25 + clamp(metrics.roe)*0.2 + clamp(metrics.balanceSheet)*0.2 + clamp(metrics.moat)*0.1);
  return agentResult('fundamental', ticker, { score: Math.round(score) });
}
