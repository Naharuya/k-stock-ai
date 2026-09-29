import { calculateCandidateScore } from '../scoring.js';
import { agentResult } from '../contracts.js';

export function runInvestmentCommitteeAgent(ticker, signals = {}, gates = {}) {
  const reasons = [];
  if (!gates.evidencePassed) reasons.push('evidence_gate_failed');
  if ((signals.bearSeverity ?? 0) >= 75) reasons.push('bear_case_severe');
  if ((signals.riskPenalty ?? 0) >= 15) reasons.push('risk_cap_reached');
  const score = calculateCandidateScore(signals);
  const approved = reasons.length === 0 && score >= 50;
  return agentResult('investment_committee', ticker, { approved, score, reasons });
}
