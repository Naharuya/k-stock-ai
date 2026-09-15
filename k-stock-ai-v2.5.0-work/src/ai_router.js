import { runMarketAgent } from "./agents/market_agent.js";
import { runCompanyAgent } from "./agents/company_agent.js";
import { runDartAgent } from "./agents/dart_agent.js";
import { runFlowAgent } from "./agents/flow_agent.js";
import { runTechnicalAgent } from "./agents/technical_agent.js";
import { runNewsAgent } from "./agents/news_agent.js";
import { runRiskAgent } from "./agents/risk_agent.js";
import { runBearAgent } from "./agents/bear_agent.js";
import { runCommitteeAgent } from "./agents/committee_agent.js";
import { applyRiskHardStop } from "./utils/risk_hard_stop.js";

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

  const preliminary = {
    market,
    company,
    dart,
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
    dart,
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
