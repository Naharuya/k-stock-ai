import "dotenv/config";
import { analyzeDartStock } from "./services/dart_analysis_service.js";

const stockCode = process.argv[2] || "005930";
const businessYear = process.argv[3] || "2025";

try {
  const result = await analyzeDartStock({
    stockCode,
    businessYear,
    reportCode: "11011",
    fsDiv: "CFS",
    disclosureLookbackDays: 180
  });

  console.log(JSON.stringify({
    ok: true,
    source: result.source,
    stockCode: result.stockCode,
    corpCode: result.corpCode,
    corpName: result.company.corpName,
    businessYear: result.query.businessYear,
    financials: result.financials.display,
    selectedAccounts: result.financials.accounts,
    validation: result.financials.validation,
    metrics: result.financials.metrics,
    disclosureEvents: result.disclosures.events.slice(0, 10),
    companyLegacyScore: result.agents.company.score,
    dartLegacyScore: result.agents.dart.score,
    riskLevel: result.agents.risk.riskLevel,
    riskScore: result.agents.risk.riskScore,
    scorecard: result.scorecard,
    readiness: result.readiness,
    committeeStatus: result.committee.status,
    totalScore: result.committee.totalScore,
    legacyDartOnlyScore: result.committee.legacyDartOnlyScore,
    warning: "현재는 DART 기반 부분 분석. 전체 투자점수는 보류"
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    message: error.message,
    dartStatus: error.dartStatus || null
  }, null, 2));
  process.exitCode = 1;
}
