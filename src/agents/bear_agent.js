import { runAgent } from "../services/llm_service.js";
import { COMMON_RULES } from "../prompts/common_rules.js";

const SYSTEM_PROMPT = `
${COMMON_RULES}
당신은 Bear Case Agent입니다.
긍정 평가가 있더라도 투자하지 말아야 할 이유를 찾습니다.
억지 반대 논리는 만들지 않습니다.

출력:
{
  "bearScore": 0,
  "majorArguments": [],
  "weakArguments": [],
  "whatCouldGoWrong": [],
  "summary": ""
}
`;

export async function runBearAgent(data) {
  return runAgent({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: JSON.stringify(data),
    mockResult: {
      bearScore: 38,
      majorArguments: ["업황 기대가 가격에 선반영될 가능성"],
      weakArguments: [],
      whatCouldGoWrong: ["실적 전망 하향", "외국인 수급 반전"],
      summary: "반대 논리도 함께 확인해야 합니다."
    }
  });
}
