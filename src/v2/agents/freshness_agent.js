import { agentResult } from '../contracts.js';
export function runFreshnessAgent(ticker, evidence = [], analysisDate = new Date().toISOString()) {
  const now = new Date(analysisDate).getTime();
  const dates = evidence.filter(x=>x.ticker===ticker).map(x=>new Date(x.observedAt).getTime()).filter(Number.isFinite);
  if (!dates.length) return agentResult('freshness',ticker,{score:0,label:'missing'});
  const newest = Math.max(...dates);
  const days = Math.max(0,(now-newest)/86400000);
  const score = days<=2?100:days<=7?80:days<=30?55:days<=90?30:10;
  const label = days<=2?'D-2':days<=7?'D-7':days<=30?'monthly':days<=90?'quarterly':'stale';
  return agentResult('freshness',ticker,{score,label,ageDays:Math.round(days*10)/10});
}
