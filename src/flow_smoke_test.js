import "dotenv/config";
import { getDomesticInvestorFlow } from "./services/kis_service.js";
import { buildFlowMetrics, scoreFlow } from "./services/flow_analysis_service.js";

try {
  const flow = await getDomesticInvestorFlow("005930");
  const metrics = buildFlowMetrics(flow);
  const score = scoreFlow(metrics);

  console.log(JSON.stringify({
    ok: true,
    source: flow.source,
    stockCode: flow.stockCode,
    rows: flow.rows.length,
    latestDate: metrics.latestDate,
    latest: flow.rows[0] || null,
    metrics,
    score,
    caveat: flow.caveat
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    message: error.message
  }, null, 2));
  process.exitCode = 1;
}
