import {assessKrRecommendation} from './recommendation_gate.js';
import { analyzeKrValuation } from './kr_valuation.js';
import { buildValuationComparison } from './valuation_comparison.js';
import { assertSafeKStockV2Environment } from './scoring.js';
import { runEvidenceAgent } from './agents/evidence_agent.js';
import { runCapitalTrackerAgent } from './agents/capital_tracker_agent.js';
import { runMediaMentionAgent } from './agents/media_mention_agent.js';
import { runInfluentialPersonAgent } from './agents/influential_person_agent.js';
import { runPsychologyAgent } from './agents/psychology_agent.js';
import { runFundamentalAgent } from './agents/fundamental_agent.js';
import { runValuationAgent } from './agents/valuation_agent.js';
import { runMarketFlowAgent } from './agents/market_flow_agent.js';
import { runMacroAgent } from './agents/macro_agent.js';
import { runSentimentAgent } from './agents/sentiment_agent.js';
import { runFreshnessAgent } from './agents/freshness_agent.js';
import { runRiskAgent, runBearAgent } from './agents/risk_bear_agent.js';
import { runConsensusAgent } from './agents/consensus_agent.js';
import { runInvestmentCommitteeAgent } from './agents/investment_committee_agent.js';
import { runComplianceAgent } from './agents/compliance_agent.js';
import { runRankingAgent } from './agents/ranking_agent.js';

export function runKStockV2Pipeline(input, env = process.env) {
  assertSafeKStockV2Environment(env);

  const evidenceGate = runEvidenceAgent(input.evidence || [], input.analysisDate);
  const byTicker = new Map();
  for (const item of evidenceGate.accepted) {
    const key = `${item.market}:${item.ticker}`;
    if (!byTicker.has(key)) byTicker.set(key, []);
    byTicker.get(key).push(item);
  }

  const candidates = [];
  for (const company of input.companies || []) {
    const ev = byTicker.get(`${company.market}:${company.ticker}`) || [];

    const capital = runCapitalTrackerAgent(company.ticker, ev);
    const media = runMediaMentionAgent(company.ticker, ev);
    const influential = runInfluentialPersonAgent(
      company.ticker,
      company.actorProfile || {},
      company.actorSignals || [],
    );
    const psychology = runPsychologyAgent(company.ticker, {
      capitalScore: capital.score,
      mediaScore: media.score,
      actorProfile: company.actorProfile || {},
    });
    const fundamental = runFundamentalAgent(company.ticker, company.fundamentals || {});
    const valuation = runValuationAgent(company.ticker, company.valuation || { score: company.valuationScore });
    const flow = runMarketFlowAgent(company.ticker, company.marketFlow || {});
    const macro = runMacroAgent(company.ticker, company.macro || {});
    const sentiment = runSentimentAgent(company.ticker, company.sentiment || {});
    const freshness = runFreshnessAgent(company.ticker, ev, input.analysisDate);
    const consensus = runConsensusAgent(company.ticker, company.actorSignals || []);
    const risk = runRiskAgent(company.ticker, company.risk || {});
    const bear = runBearAgent(company.ticker, {
      capitalAction: capital.score,
      consensus: consensus.score,
      valuation: valuation.score,
      dataFreshness: freshness.score,
    });

    const signals = {
      capitalAction: capital.score,
      actorCredibility: Math.round((influential.score + psychology.score) / 2),
      consensus: consensus.score,
      mediaSignal: media.score,
      fundamental: fundamental.score,
      valuation: valuation.score,
      marketFlow: Math.round((flow.score * 0.75) + (macro.score * 0.25)),
      sentiment: sentiment.score,
      dataFreshness: freshness.score,
      riskPenalty: risk.riskPenalty,
      bearSeverity: bear.severity,
    };

    const reviewRequired = (input.reviewRequired || []).filter(item => item.ticker === company.ticker && item.market === company.market);
    const krAnalysis = company.market === 'KR' ? analyzeKrValuation(company, [...input.companies,...(input.krPeers || [])], input.krHistory || [], input.analysisDate) : null;
    const recommendationGate=company.market==='KR' && (company.krSnapshot || input.requireVerifiedRecommendations)
      ? assessKrRecommendation(company,krAnalysis,input.analysisDate,{evidencePassed:evidenceGate.passed&&ev.length>0&&reviewRequired.length===0,riskExecuted:true}) : null;
    const dataBlockers = [];
    if(recommendationGate?.status==='HELD')dataBlockers.push('KR_RECOMMENDATION_GATE_HELD');
    if (company.market === 'GLOBAL' && company.ticker === 'AAPL') dataBlockers.push('APPLE_RANKING_HOLD');
    if (company.krSnapshot && ['INSUFFICIENT_DATA', 'UNDER_REVIEW'].includes(krAnalysis?.status)) dataBlockers.push('KR_VALUATION_REVIEW_REQUIRED');
    if (!fundamental.available || company.financialSnapshot && company.financialSnapshot.status !== 'READY') dataBlockers.push('FINANCIAL_DATA_INCOMPLETE');
    if (!valuation.available) dataBlockers.push('VALUATION_DATA_MISSING');
    const evidencePassed = evidenceGate.passed && ev.length > 0 && reviewRequired.length === 0 && dataBlockers.length === 0;
    const committee = runInvestmentCommitteeAgent(company.ticker, signals, { evidencePassed });
    const compliance = runComplianceAgent(company.ticker, {
      evidencePassed,
      guaranteedReturn: false,
      orderInstruction: false,
    }, env);

    const approved = committee.approved && compliance.passed;
    candidates.push({
      ticker: company.ticker,
      market: company.market,
      companyName: company.companyName,
      industryCode: company.industryCode || null,
      exchange: company.market === 'KR' && ['KOSPI','KOSDAQ'].includes(company.exchange) ? company.exchange : null,
      score: committee.score,
      signals,
      approved,
      reviewRequired,
      dataBlockers,
      krValuationAnalysis: krAnalysis,
      recommendationGate,
      financialSnapshot: company.financialSnapshot || null,
      priceSnapshot: company.priceSnapshot || null,
      corporateActionSnapshot: company.corporateActionSnapshot || null,
      valuationSnapshot: company.valuationSnapshot || null,
      valuationComparisonSnapshot: company.market === 'GLOBAL' ? buildValuationComparison(company, input.analysisDate) : null,
      evidence: ev,
      selectionReasons: committee.reasons,
      performanceTracking: { status: 'PENDING', horizons: [1, 5, 20], reason: 'ADJUSTED_PRICES_NOT_CONNECTED' },
      committee,
      compliance,
      agents: {
        capital,
        media,
        influential,
        psychology,
        fundamental,
        valuation,
        flow,
        macro,
        sentiment,
        freshness,
        consensus,
        risk,
        bear,
      },
      signals,
    });
  }

  const ranked = runRankingAgent(candidates);
  return {
    generatedAt: new Date().toISOString(),
    evidence: { accepted: evidenceGate.accepted.length, rejected: evidenceGate.rejected },
    candidates,
    KR: ranked.KR,
    GLOBAL: ranked.GLOBAL,
  };
}
