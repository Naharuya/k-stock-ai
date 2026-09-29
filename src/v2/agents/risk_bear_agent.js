import { agentResult } from '../contracts.js';
const clamp=x=>Math.max(0,Math.min(100,Number(x)||0));
export function runRiskAgent(ticker, risk = {}) {
  const severity = Math.max(clamp(risk.financial),clamp(risk.regulatory),clamp(risk.governance),clamp(risk.valuation),clamp(risk.dataStaleness));
  return agentResult('risk', ticker, { severity, riskPenalty: Math.round(severity * 0.15) });
}
export function runBearAgent(ticker, input = {}) {
  const reasons = [];
  if ((input.valuation ?? 50) < 35) reasons.push('valuation_risk');
  if ((input.capitalAction ?? 50) < 35) reasons.push('weak_capital_action');
  if ((input.dataFreshness ?? 100) < 50) reasons.push('stale_evidence');
  if ((input.consensus ?? 50) < 30) reasons.push('low_consensus');
  return agentResult('bear', ticker, { reasons, severity: Math.min(100, reasons.length * 25) });
}
