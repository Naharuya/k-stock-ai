import { agentResult } from '../contracts.js';
export function runComplianceAgent(ticker, candidate = {}, env = process.env) {
  const violations = [];
  if (env.KSTOCK_LIVE_TRADING_ENABLED === 'true') violations.push('live_trading_enabled');
  if (env.KSTOCK_BROKER_ENABLED === 'true') violations.push('broker_enabled');
  if (!candidate.evidencePassed) violations.push('evidence_missing');
  if (candidate.guaranteedReturn === true) violations.push('guaranteed_return_claim');
  if (candidate.orderInstruction === true) violations.push('order_instruction');
  return agentResult('compliance',ticker,{passed:violations.length===0,violations});
}
