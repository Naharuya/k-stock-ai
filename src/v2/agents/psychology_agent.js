import { agentResult } from '../contracts.js';

export function runPsychologyAgent(ticker, { capitalScore = 0, mediaScore = 0, actorProfile = {} } = {}) {
  const horizonBonus = actorProfile.timeHorizon === 'long' ? 8 : 0;
  const disciplineBonus = actorProfile.style === 'value' ? 5 : 0;
  const score = Math.max(0, Math.min(100, capitalScore * 0.6 + mediaScore * 0.3 + horizonBonus + disciplineBonus));
  const pattern = capitalScore >= 70 && mediaScore < 60 ? 'action_over_words'
    : mediaScore >= 70 && capitalScore < 40 ? 'words_over_action'
    : capitalScore >= 70 && mediaScore >= 70 ? 'aligned_conviction'
    : 'mixed_signal';
  return agentResult('investor_psychology', ticker, { score: Math.round(score), pattern });
}
