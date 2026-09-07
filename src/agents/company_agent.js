import { runAgent } from "../services/llm_service.js";
import { COMMON_RULES } from "../prompts/common_rules.js";

const SYSTEM_PROMPT = `
${COMMON_RULES}
당신은 Company Analysis Agent입니다.
기업의 성장성, 수익성, 밸류에이션, 재무건전성을 분석합니다.

출력:
{
  "score": 0,
  "growthScore": 0,
  "profitabilityScore": 0,
  "valuationScore": 0,
  "financialHealthScore": 0,
  "strengths": [],
  "weaknesses": [],
  "summary": ""
}
`;

export async function runCompanyAgent(data) {
  return runAgent({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: JSON.stringify(data),
    mockResult: {
      score: 82,
      growthScore: 84,
      profitabilityScore: 83,
      valuationScore: 72,
      financialHealthScore: 88,
      strengths: ["영업이익 성장", "양호한 재무건전성"],
      weaknesses: ["밸류에이션 부담 가능성"],
      summary: "펀더멘털은 양호한 것으로 가정한 테스트 결과입니다."
    }
  });
}
