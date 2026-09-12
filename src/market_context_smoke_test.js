import "dotenv/config";
import { analyzeMarketContext } from "./services/market_context_service.js";

try {
  const result = await analyzeMarketContext();
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, message: error.message }, null, 2));
  process.exitCode = 1;
}
