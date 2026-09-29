import { selectCandidates } from '../scoring.js';
export function runRankingAgent(candidates = []) {
  const approved = candidates.filter(x=>x.approved);
  return { KR: selectCandidates(approved,'KR'), GLOBAL: selectCandidates(approved,'GLOBAL') };
}
