import "dotenv/config";
import { analyzeDartStock } from "./services/dart_analysis_service.js";

try {
  const result = await analyzeDartStock({
    stockCode: "005930",
    businessYear: "2025",
    reportCode: "11011",
    fsDiv: "CFS",
    disclosureLookbackDays: 180
  });

  console.log(JSON.stringify({
    ok: true,
    stockCode: result.stockCode,
    corpName: result.company.corpName,
    validation: result.financials.validation,
    scorecard: result.scorecard,
    readiness: result.readiness,
    committee: {
      status: result.committee.status,
      totalScore: result.committee.totalScore,
      legacyDartOnlyScore: result.committee.legacyDartOnlyScore
    }
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    message: error.message
  }, null, 2));
  process.exitCode = 1;
}
