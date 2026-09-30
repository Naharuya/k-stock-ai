import { runMarketAgent } from "./agents/market_agent.js";
import { runCompanyAgent } from "./agents/company_agent.js";
import { runDartAgent } from "./agents/dart_agent.js";
import { runFlowAgent } from "./agents/flow_agent.js";
import { runTechnicalAgent } from "./agents/technical_agent.js";
import { runNewsAgent } from "./agents/news_agent.js";
import { runRiskAgent } from "./agents/risk_agent.js";
import { runBearAgent } from "./agents/bear_agent.js";
import { runCommitteeAgent } from "./agents/committee_agent.js";
import { applyRiskHardStop, detectCriticalDartDisclosures } from "./utils/risk_hard_stop.js";

export async function analyzeStock(stockData) {
  if (!stockData?.symbol || !stockData?.name) {
    throw new Error("symbol and name are required.");
  }

  const [
    market,
    company,
    dart,
    flow,
    technical,
    news,
    risk,
  ] = await Promise.all([
    runMarketAgent(stockData.market || {}),
    runCompanyAgent(stockData.company || {}),
    runDartAgent(stockData.dart || {}),
    runFlowAgent(stockData.flow || {}),
    runTechnicalAgent(stockData.technical || {}),
    runNewsAgent(stockData.news || {}),
    runRiskAgent(stockData),
  ]);

  const detectedDartRisks = detectCriticalDartDisclosures(stockData.dart?.disclosures?.items);
  const fullSetDartRisks = stockData.dart?.riskSignals;
  const mergeReasons = (...groups) => {
    const seen = new Set();
    return groups.flatMap((group) => Array.isArray(group) ? group : []).filter((reason) => {
      const key = `${reason.eventType}\u0000${reason.reportName}\u0000${reason.scope ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 10);
  };
  const dartRiskSignals = {
    criticalDisclosure: detectedDartRisks.criticalDisclosure || fullSetDartRisks?.criticalDisclosure === true,
    reasons: mergeReasons(detectedDartRisks.reasons, fullSetDartRisks?.reasons),
    matchCount: Math.max(detectedDartRisks.matchCount, Number(fullSetDartRisks?.matchCount) || 0),
    reviewReasons: mergeReasons(detectedDartRisks.reviewReasons, fullSetDartRisks?.reviewReasons),
    reviewMatchCount: Math.max(detectedDartRisks.reviewMatchCount, Number(fullSetDartRisks?.reviewMatchCount) || 0),
    inspectedCount: Math.max(detectedDartRisks.inspectedCount, Number(fullSetDartRisks?.inspectedCount) || 0),
  };

  const preliminary = {
    market,
    company,
    dart: {
      ...dart,
      riskSignals: dartRiskSignals,
    },
    flow,
    technical,
    news,
    risk,
  };

  const bear = await runBearAgent(preliminary);

  const committee = await runCommitteeAgent({
    ...preliminary,
    bear,
  });

  const finalCommittee = applyRiskHardStop({
    committee,
    risk,
    dart: preliminary.dart,
  });

  return {
    symbol: stockData.symbol,
    name: stockData.name,
    analyzedAt: new Date().toISOString(),
    mode: process.env.KSTOCK_AI_MODE || "mock",
    agents: {
      ...preliminary,
      bear,
    },
    committee: finalCommittee,
  };
}
