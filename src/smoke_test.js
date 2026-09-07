import "dotenv/config";
import { analyzeStock } from "./ai_router.js";
import { SAMPLE_STOCK } from "./data/sample_stock.js";

const result = await analyzeStock(SAMPLE_STOCK);

console.log(JSON.stringify({
  symbol: result.symbol,
  name: result.name,
  mode: result.mode,
  status: result.committee.status,
  totalScore: result.committee.totalScore,
  riskOverride: result.committee.riskOverride
}, null, 2));
