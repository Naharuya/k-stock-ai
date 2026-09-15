import "dotenv/config";
import { analyzeStockWithMarketData } from "./services/full_analysis_service.js";

try {
  const result = await analyzeStockWithMarketData({ stockCode: "005930", businessYear: "2025" });
  console.log(JSON.stringify({
    ok: true,
    stockCode: result.stockCode,
    corpName: result.corpName,
    currentPrice: result.marketData.quote.price,
    per: result.marketData.quote.per,
    pbr: result.marketData.quote.pbr,
    chartRows: result.marketData.chartRows,
    technical: result.marketData.technicalMetrics,
    flowRows: result.marketData.flowRows,
    flow: result.marketData.flowMetrics,
    marketContext: result.marketData.marketContext,
    newsRows: result.newsData?.rows ?? 0,
    news: result.scores.news,
    newsSample: result.newsData?.items?.slice(0, 3) ?? [],
    scores: result.scores,
    completeness: result.completeness,
    readiness: result.readiness,
    committee: result.committee
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, message: error.message }, null, 2));
  process.exitCode = 1;
}
