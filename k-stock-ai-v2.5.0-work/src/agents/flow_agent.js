import { runAgent } from "../services/llm_service.js";
import { COMMON_RULES } from "../prompts/common_rules.js";

const SYSTEM_PROMPT = `
${COMMON_RULES}
당신은 한국주식 수급 분석 Agent입니다.
외국인, 기관, 개인 및 가능한 경우 연기금/투신/금융투자/프로그램 흐름을 분석합니다.
1일보다 3일, 5일, 20일 흐름을 우선 비교합니다.

출력:
{
  "score": 0,
  "trend": "",
  "foreignFlow": "",
  "institutionFlow": "",
  "retailFlow": "",
  "positiveSignals": [],
  "negativeSignals": [],
  "summary": ""
}
`;

export async function runFlowAgent(data) {
  return runAgent({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: JSON.stringify(data),
    mockResult: {
      score: 81,
      trend: "IMPROVING",
      foreignFlow: "POSITIVE",
      institutionFlow: "POSITIVE",
      retailFlow: "NEUTRAL",
      positiveSignals: ["외국인 5일 누적 순매수", "기관 동반 순매수"],
      negativeSignals: [],
      summary: "수급은 개선되는 것으로 가정한 테스트 결과입니다."
    }
  });
}
