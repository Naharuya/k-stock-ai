import { buildInvestmentCommittee } from "./services/investment_committee_service.js";

const result = buildInvestmentCommittee({
  dart: {
    scorecard: { score: 73, maxScore: 80 },
    agents: {
      company: {
        strengths: ["매출 성장률 10.9%", "영업이익 성장률 33.2%", "부채비율 29.9%"],
        weaknesses: []
      },
      dart: { impact: "POSITIVE", important: true },
      risk: {
        riskScore: 20,
        riskLevel: "LOW",
        criticalRisk: false,
        risks: [],
        redFlags: [],
        excludeSuggested: false
      }
    }
  },
  valuation: { score: 5, max: 20 },
  technical: { score: 12, max: 20 },
  flow: { score: 12, max: 20 },
  market: { score: 13, max: 20, regime: "NEUTRAL_MIXED" },
  news: { score: 12, max: 20, sentiment: "NEUTRAL_MIXED", highRiskEvents: [] },
  completeness: { percent: 100 }
});

const ok = Number.isFinite(result.totalScore) &&
  result.components &&
  result.bear &&
  ["RISK", "WATCH", "INTEREST", "CONDITION_MET"].includes(result.status);

console.log(JSON.stringify({ ok, committee: result }, null, 2));
if (!ok) process.exitCode = 1;
