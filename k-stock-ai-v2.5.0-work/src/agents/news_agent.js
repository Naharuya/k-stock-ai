import { runAgent } from "../services/llm_service.js";
import { COMMON_RULES } from "../prompts/common_rules.js";

const SYSTEM_PROMPT = `
${COMMON_RULES}
당신은 한국 상장기업 News Analysis Agent입니다.
뉴스를 사실/주장, 공식발표/추정, 단기/장기, 일회성/구조적 변화로 구분합니다.
반복 기사는 하나의 이벤트로 취급합니다.

출력:
{
  "score": 0,
  "sentiment": "",
  "shortTermImpact": "",
  "longTermImpact": "",
  "structural": false,
  "keyEvents": [],
  "risks": [],
  "summary": ""
}
`;

export async function runNewsAgent(data) {
  return runAgent({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: JSON.stringify(data),
    mockResult: {
      score: 76,
      sentiment: "POSITIVE",
      shortTermImpact: "POSITIVE",
      longTermImpact: "NEUTRAL_TO_POSITIVE",
      structural: false,
      keyEvents: [],
      risks: ["뉴스 기대가 가격에 선반영됐을 가능성"],
      summary: "뉴스 흐름은 긍정으로 가정한 테스트 결과입니다."
    }
  });
}
