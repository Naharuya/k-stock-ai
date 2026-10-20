import { agentResult } from '../contracts.js';
const clamp=x=>Math.max(0,Math.min(100,Number(x)||0));
export function runFundamentalAgent(ticker, metrics = {}) {
  const keys = metrics.source === 'SEC_ANNUAL' ? ['revenueGrowth', 'cashFlow', 'roe', 'balanceSheet'] : ['revenueGrowth', 'cashFlow', 'roe', 'balanceSheet', 'moat'];
  const missing = keys.filter(key => typeof metrics[key] !== 'number' || !Number.isFinite(metrics[key]));
  if (missing.length) return agentResult('fundamental', ticker, { score: 0, available: false, missing });
  const score = (clamp(metrics.revenueGrowth)*0.25 + clamp(metrics.cashFlow)*0.25 + clamp(metrics.roe)*0.2 + clamp(metrics.balanceSheet)*0.2 + clamp(metrics.moat)*0.1);
  return agentResult('fundamental', ticker, { score: Math.round(metrics.source === 'SEC_ANNUAL' ? score / 0.9 : score), available: true, missing: [], method: metrics.source || 'INPUT_SCORES' });
}
