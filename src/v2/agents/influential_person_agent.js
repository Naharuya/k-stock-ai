import { agentResult } from '../contracts.js';
const clamp=x=>Math.max(0,Math.min(100,Number(x)||0));
export function runInfluentialPersonAgent(ticker, profile = {}, actorSignals = []) {
  const rows = actorSignals.filter(x=>x.ticker===ticker);
  const historical = clamp(profile.historicalDiscipline ?? 50);
  const transparency = clamp(profile.transparency ?? 50);
  const alignment = rows.length ? rows.reduce((s,x)=>s+clamp(x.score),0)/rows.length : 50;
  const score = historical*0.4 + transparency*0.2 + alignment*0.4;
  return agentResult('influential_person',ticker,{score:Math.round(score),style:profile.style||'unknown',timeHorizon:profile.timeHorizon||'unknown',actorSignals:rows.length});
}
