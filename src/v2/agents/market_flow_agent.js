import { agentResult } from '../contracts.js';
const clamp=x=>Math.max(0,Math.min(100,Number(x)||0));
export function runMarketFlowAgent(ticker, flow = {}) {
  const score = clamp(
    clamp(flow.institutional)*0.35 +
    clamp(flow.foreign)*0.25 +
    clamp(flow.volume)*0.2 +
    clamp(flow.etf)*0.1 +
    clamp(flow.shortInterest)*0.1
  );
  return agentResult('market_flow',ticker,{score:Math.round(score)});
}
