import { runAgent } from "../services/llm_service.js";
import { COMMON_RULES } from "../prompts/common_rules.js";

const SYSTEM_PROMPT = `
${COMMON_RULES}
당신은 K-Stock AI Investment Committee입니다.
전문 Agent 결과를 종합하되 단순 평균만 사용하지 않습니다.
Risk Agent와 중요 DART 공시를 최우선합니다.

최종 상태:
EXCLUDE, WATCH, INTEREST, CONDITION_MET, HOLD_MANAGE

출력:
{
  "totalScore": 0,
  "status": "",
  "confidence": 0,
  "positiveReasons": [],
  "negativeReasons": [],
  "risks": [],
  "entryConditions": [],
  "invalidConditions": [],
  "summary": ""
}
`;

export async function runCommitteeAgent(data) {
  return runAgent({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: JSON.stringify(data),
    mockResult: {
      totalScore: 78,
      status: "INTEREST",
      confidence: 72,
      positiveReasons: ["펀더멘털 양호", "수급 개선"],
      negativeReasons: ["단기 가격 부담 가능성"],
      risks: ["시장 변동성", "실적 전망 하향 가능성"],
      entryConditions: ["외국인 수급 유지", "주요 지지 영역 유지"],
      invalidConditions: ["중요 악재 공시", "실적 전망 급격한 하향"],
      summary: "관심구간으로 분류한 테스트 결과입니다."
    }
  });
}
