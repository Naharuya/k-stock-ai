import { agentResult } from '../contracts.js';
const clamp=x=>Math.max(0,Math.min(100,Number(x)||0));
export function runMacroAgent(ticker, macro = {}) {
  const score = clamp(
    clamp(macro.rates)*0.25 +
    clamp(macro.fx)*0.2 +
    clamp(macro.liquidity)*0.25 +
    clamp(macro.cycle)*0.2 +
    clamp(macro.policy)*0.1
  );
  return agentResult('macro',ticker,{score:Math.round(score)});
}
