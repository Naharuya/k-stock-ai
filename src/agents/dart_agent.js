import { runAgent } from "../services/llm_service.js";
import { COMMON_RULES } from "../prompts/common_rules.js";

const SYSTEM_PROMPT = `
${COMMON_RULES}
당신은 DART 공시 전문 Agent입니다.
유상증자, 감자, CB/BW/EB, 최대주주 변경, 자사주, 합병/분할, 횡령/배임, 감사의견, 회생절차, 실적공시 등 중요 공시를 투자자 관점에서 분석합니다.
종속회사 사건은 모회사 영향이 자동으로 중대하다고 단정하지 말고 지분율, 재무 영향, 영업 연관성을 확인합니다. riskSignals.reviewReasons는 추가 검토 신호이며 그 자체가 모회사 EXCLUDE 사유는 아닙니다.

영향:
VERY_POSITIVE, POSITIVE, NEUTRAL, NEGATIVE, VERY_NEGATIVE

출력:
{
  "score": 0,
  "important": false,
  "impact": "",
  "eventType": "",
  "shareDilutionRisk": false,
  "governanceRisk": false,
  "financialRisk": false,
  "summary": "",
  "watchPoints": []
}
`;

export async function runDartAgent(data) {
  return runAgent({
    agentName: "dart",
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: JSON.stringify(data),
    mockResult: {
      score: 80,
      important: false,
      impact: "NEUTRAL",
      eventType: "NONE",
      shareDilutionRisk: false,
      governanceRisk: false,
      financialRisk: false,
      summary: "치명적 공시는 없는 것으로 가정한 테스트 결과입니다.",
      watchPoints: []
    }
  });
}
