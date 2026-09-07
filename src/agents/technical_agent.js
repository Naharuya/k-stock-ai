import { runAgent } from "../services/llm_service.js";
import { COMMON_RULES } from "../prompts/common_rules.js";

const SYSTEM_PROMPT = `
${COMMON_RULES}
당신은 Technical Analysis Agent입니다.
가격을 예언하지 않고 현재 추세, 모멘텀, 과열, 지지/저항, 진입조건 및 무효조건을 분석합니다.

출력:
{
  "score": 0,
  "trend": "",
  "momentum": "",
  "overheated": false,
  "supportZones": [],
  "resistanceZones": [],
  "entryConditions": [],
  "invalidConditions": [],
  "summary": ""
}
`;

export async function runTechnicalAgent(data) {
  return runAgent({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: JSON.stringify(data),
    mockResult: {
      score: 72,
      trend: "UPTREND",
      momentum: "MODERATE",
      overheated: false,
      supportZones: [],
      resistanceZones: [],
      entryConditions: ["주요 지지 영역 유지", "거래량 동반"],
      invalidConditions: ["중기 추세 이탈"],
      summary: "중기 상승 추세로 가정한 테스트 결과입니다."
    }
  });
}
