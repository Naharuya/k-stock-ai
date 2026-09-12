import "dotenv/config";
import {
  getDomesticQuote,
  getDomesticDailyChart
} from "./services/kis_service.js";
import { buildTechnicalMetrics } from "./services/technical_metrics_service.js";

try {
  const quote = await getDomesticQuote("005930");
  const chart = await getDomesticDailyChart({ stockCode: "005930" });
  const technical = buildTechnicalMetrics(chart);

  console.log(JSON.stringify({
    ok: true,
    source: "KIS",
    quote: {
      stockCode: quote.stockCode,
      price: quote.price,
      changeRatePct: quote.changeRatePct,
      marketCap: quote.marketCap,
      per: quote.per,
      pbr: quote.pbr,
      week52High: quote.week52High,
      week52Low: quote.week52Low,
      volume: quote.volume,
      tradingValue: quote.tradingValue
    },
    chartRows: chart.rows.length,
    technical
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    message: error.message
  }, null, 2));
  process.exitCode = 1;
}
