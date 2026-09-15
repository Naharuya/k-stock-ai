import {
  getCompanyByStockCode,
  getDisclosuresByStockCode,
  getFinancialStatementsByStockCode
} from "./dart_service.js";

import {
  normalizeFinancialStatements,
  formatKrw
} from "./financial_normalizer.js";

import {
  classifyDisclosures
} from "./disclosure_classifier.js";

import {
  buildCompanyRuleAnalysis,
  buildDartRuleAnalysis,
  buildRiskRuleAnalysis,
  buildCommitteeRuleAnalysis
} from "./rule_analysis_service.js";

import {
  buildFundamentalScorecard,
  buildFinalReadiness
} from "./scorecard_service.js";

function dateYYYYMMDD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return dateYYYYMMDD(d);
}


async function getFinancialsWithYearFallback({ stockCode, businessYear, reportCode, fsDiv, maxLookbackYears = 3 }) {
  const requested = Number(businessYear);
  if (!Number.isInteger(requested) || requested < 2000 || requested > 2100) {
    throw new Error("businessYear must be a valid 4-digit year.");
  }

  const attempts = [];
  for (let offset = 0; offset <= maxLookbackYears; offset++) {
    const year = String(requested - offset);
    try {
      const result = await getFinancialStatementsByStockCode({
        stockCode,
        businessYear: year,
        reportCode,
        fsDiv
      });
      return { result, requestedBusinessYear: String(businessYear), effectiveBusinessYear: year, attempts };
    } catch (error) {
      attempts.push({ year, dartStatus: error.dartStatus || null, message: error.message });
      if (error.dartStatus !== "013") throw error;
    }
  }

  const error = new Error(`OpenDART 013: ${businessYear}년부터 최근 ${maxLookbackYears + 1}개 연도에서 조회 가능한 재무제표를 찾지 못했습니다.`);
  error.dartStatus = "013";
  error.attempts = attempts;
  throw error;
}

export async function analyzeDartStock({
  stockCode,
  businessYear,
  reportCode = "11011",
  fsDiv = "CFS",
  disclosureLookbackDays = 180
}) {
  const endDate = dateYYYYMMDD(new Date());
  const beginDate = daysAgo(disclosureLookbackDays);

  const [
    companyResult,
    financialFallback,
    disclosureResult
  ] = await Promise.all([
    getCompanyByStockCode(stockCode),
    getFinancialsWithYearFallback({
      stockCode,
      businessYear,
      reportCode,
      fsDiv,
      maxLookbackYears: 3
    }),
    getDisclosuresByStockCode({
      stockCode,
      beginDate,
      endDate,
      pageCount: 100,
      pageNo: 1
    })
  ]);

  const financialResult = financialFallback.result;

  const normalizedFinancials = normalizeFinancialStatements(
    financialResult.financials
  );

  const classifiedDisclosures = classifyDisclosures(
    disclosureResult.disclosures
  );

  const companyAgent = buildCompanyRuleAnalysis(normalizedFinancials);
  const dartAgent = buildDartRuleAnalysis(classifiedDisclosures);
  const riskAgent = buildRiskRuleAnalysis({
    financials: normalizedFinancials,
    disclosures: classifiedDisclosures
  });

  const committee = buildCommitteeRuleAnalysis({
    company: companyAgent,
    dart: dartAgent,
    risk: riskAgent
  });

  const scorecard = buildFundamentalScorecard({
    financials: normalizedFinancials,
    disclosures: classifiedDisclosures
  });

  const readiness = buildFinalReadiness(scorecard);

  const current = normalizedFinancials.current;

  return {
    source: "OpenDART",
    asOf: new Date().toISOString(),
    stockCode: companyResult.mapping.stockCode,
    corpCode: companyResult.mapping.corpCode,
    company: {
      corpName: companyResult.company.corp_name,
      corpNameEng: companyResult.company.corp_name_eng,
      ceo: companyResult.company.ceo_nm,
      marketClass: companyResult.company.corp_cls,
      fiscalMonth: companyResult.company.acc_mt
    },
    query: {
      businessYear: financialFallback.effectiveBusinessYear,
      requestedBusinessYear: financialFallback.requestedBusinessYear,
      effectiveBusinessYear: financialFallback.effectiveBusinessYear,
      usedFallback: financialFallback.effectiveBusinessYear !== financialFallback.requestedBusinessYear,
      fallbackAttempts: financialFallback.attempts,
      reportCode,
      fsDiv,
      disclosureBeginDate: beginDate,
      disclosureEndDate: endDate
    },
    financials: {
      ...normalizedFinancials,
      display: {
        revenue: formatKrw(current.revenue),
        operatingProfit: formatKrw(current.operatingProfit),
        netIncome: formatKrw(current.netIncome),
        assets: formatKrw(current.assets),
        liabilities: formatKrw(current.liabilities),
        equity: formatKrw(current.equity)
      }
    },
    disclosures: classifiedDisclosures,
    agents: {
      company: companyAgent,
      dart: dartAgent,
      risk: riskAgent
    },
    scorecard,
    readiness,
    committee: {
      ...committee,
      legacyDartOnlyScore: committee.totalScore,
      totalScore: null,
      status: readiness.readyForInvestmentDecision
        ? committee.status
        : "PARTIAL_ANALYSIS",
      summary: readiness.readyForInvestmentDecision
        ? committee.summary
        : "현재는 DART 기반 부분 분석입니다. 전체 투자판단 점수는 보류합니다."
    }
  };
}
