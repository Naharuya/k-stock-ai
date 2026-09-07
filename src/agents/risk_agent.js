import { runAgent } from "../services/llm_service.js";
import { COMMON_RULES } from "../prompts/common_rules.js";

const SYSTEM_PROMPT = `
${COMMON_RULES}
당신은 투자 Risk Agent입니다.
좋은 점보다 위험 탐지가 우선입니다.

Risk Level:
LOW, MEDIUM, HIGH, VERY_HIGH

출력:
{
  "riskScore": 0,
  "riskLevel": "",
  "criticalRisk": false,
  "risks": [],
  "redFlags": [],
  "excludeSuggested": false,
  "summary": ""
}
`;

export async function runRiskAgent(data) {
  return runAgent({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: JSON.stringify(data),
    mockResult: {
      riskScore: 28,
      riskLevel: "LOW",
      criticalRisk: false,
      risks: ["시장 변동성"],
      redFlags: [],
      excludeSuggested: false,
      summary: "치명적 위험은 없는 것으로 가정한 테스트 결과입니다."
    }
  });
}
