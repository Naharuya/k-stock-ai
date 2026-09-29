import { assertSafeKStockV2Environment, selectCandidates } from './scoring.js';
import { runEvidenceAgent } from './agents/evidence_agent.js';
import { runCapitalTrackerAgent } from './agents/capital_tracker_agent.js';
import { runMediaMentionAgent } from './agents/media_mention_agent.js';
import { runPsychologyAgent } from './agents/psychology_agent.js';
import { runFundamentalAgent } from './agents/fundamental_agent.js';
import { runRiskAgent, runBearAgent } from './agents/risk_bear_agent.js';
import { runConsensusAgent } from './agents/consensus_agent.js';
import { runInvestmentCommitteeAgent } from './agents/investment_committee_agent.js';

export function runKStockV2Pipeline(input, env = process.env) {
  assertSafeKStockV2Environment(env);
  const evidenceGate = runEvidenceAgent(input.evidence || [], input.analysisDate);
  const byTicker = new Map();
  for (const item of evidenceGate.accepted) {
    if (!byTicker.has(item.ticker)) byTicker.set(item.ticker, []);
    byTicker.get(item.ticker).push(item);
  }
  const candidates = [];
  for (const company of input.companies || []) {
    const ev = byTicker.get(company.ticker) || [];
    const capital = runCapitalTrackerAgent(company.ticker, ev);
    const media = runMediaMentionAgent(company.ticker, ev);
    const psychology = runPsychologyAgent(company.ticker, { capitalScore: capital.score, mediaScore: media.score, actorProfile: company.actorProfile || {} });
    const fundamental = runFundamentalAgent(company.ticker, company.fundamentals || {});
    const consensus = runConsensusAgent(company.ticker, company.actorSignals || []);
    const risk = runRiskAgent(company.ticker, company.risk || {});
    const bear = runBearAgent(company.ticker, { capitalAction: capital.score, consensus: consensus.score, valuation: company.valuationScore, dataFreshness: company.dataFreshness });
    const signals = {
      capitalAction: capital.score,
      actorCredibility: psychology.score,
      consensus: consensus.score,
      mediaSignal: media.score,
      fundamental: fundamental.score,
      valuation: company.valuationScore ?? 50,
      marketFlow: company.marketFlowScore ?? 50,
      sentiment: company.sentimentScore ?? 50,
      dataFreshness: company.dataFreshness ?? 50,
      riskPenalty: risk.riskPenalty,
      bearSeverity: bear.severity,
    };
    const committee = runInvestmentCommitteeAgent(company.ticker, signals, { evidencePassed: evidenceGate.passed && ev.length > 0 });
    candidates.push({ ticker: company.ticker, market: company.market, companyName: company.companyName, score: committee.score, approved: committee.approved, committee, signals });
  }
  const approved = candidates.filter(x => x.approved);
  return {
    generatedAt: new Date().toISOString(),
    evidence: { accepted: evidenceGate.accepted.length, rejected: evidenceGate.rejected },
    KR: selectCandidates(approved, 'KR'),
    GLOBAL: selectCandidates(approved, 'GLOBAL'),
  };
}
