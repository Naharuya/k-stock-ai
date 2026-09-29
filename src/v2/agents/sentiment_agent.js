import { agentResult } from '../contracts.js';
const clamp=x=>Math.max(0,Math.min(100,Number(x)||0));
export function runSentimentAgent(ticker, sentiment = {}) {
  const tone = clamp(sentiment.tone ?? 50);
  const attention = clamp(sentiment.attention ?? 50);
  const hypeRisk = clamp(sentiment.hypeRisk ?? 0);
  const score = clamp(tone*0.65 + attention*0.2 + (100-hypeRisk)*0.15);
  return agentResult('sentiment',ticker,{score:Math.round(score),hypeRisk});
}
