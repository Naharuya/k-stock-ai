import { runAgent } from "../services/llm_service.js";
import { COMMON_RULES } from "../prompts/common_rules.js";

const SYSTEM_PROMPT = `
${COMMON_RULES}
당신은 Market Agent입니다.
KOSPI/KOSDAQ, 투자자별 수급, 업종 강도, 원달러, 금리, 글로벌 시장 등 한국 증시 환경을 분석합니다.

시장 상태:
STRONG_NEGATIVE, NEGATIVE, NEUTRAL, POSITIVE, STRONG_POSITIVE

출력:
{
  "marketState": "",
  "score": 0,
  "positiveFactors": [],
  "negativeFactors": [],
  "strongSectors": [],
  "weakSectors": [],
  "summary": ""
}
`;

export async function runMarketAgent(data) {
  return runAgent({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: JSON.stringify(data),
    mockResult: {
      marketState: "POSITIVE",
      score: 74,
      positiveFactors: ["외국인 수급 개선", "반도체 업종 강세"],
      negativeFactors: ["환율 변동성"],
      strongSectors: ["반도체"],
      weakSectors: [],
      summary: "시장 환경은 완만한 긍정으로 가정한 테스트 결과입니다."
    }
  });
}
