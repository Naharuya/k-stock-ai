function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value)));
}

function finite(value) {
  return Number.isFinite(value);
}

function scoreGrowth(metrics) {
  let score = 10; // neutral base out of 25

  if (finite(metrics.revenueGrowthPct)) {
    if (metrics.revenueGrowthPct >= 15) score += 5;
    else if (metrics.revenueGrowthPct >= 5) score += 3;
    else if (metrics.revenueGrowthPct < 0) score -= 3;
  }

  if (finite(metrics.operatingProfitGrowthPct)) {
    if (metrics.operatingProfitGrowthPct >= 30) score += 7;
    else if (metrics.operatingProfitGrowthPct >= 10) score += 4;
    else if (metrics.operatingProfitGrowthPct < 0) score -= 5;
  }

  if (finite(metrics.netIncomeGrowthPct)) {
    if (metrics.netIncomeGrowthPct >= 20) score += 3;
    else if (metrics.netIncomeGrowthPct < 0) score -= 2;
  }

  return Math.round(clamp(score, 0, 25));
}

function scoreProfitability(metrics) {
  let score = 8; // out of 20

  if (finite(metrics.operatingMarginPct)) {
    if (metrics.operatingMarginPct >= 20) score += 7;
    else if (metrics.operatingMarginPct >= 10) score += 5;
    else if (metrics.operatingMarginPct >= 5) score += 3;
    else if (metrics.operatingMarginPct < 0) score -= 5;
  }

  if (finite(metrics.roeApproxPct)) {
    if (metrics.roeApproxPct >= 15) score += 5;
    else if (metrics.roeApproxPct >= 10) score += 3;
    else if (metrics.roeApproxPct < 0) score -= 4;
  }

  return Math.round(clamp(score, 0, 20));
}

function scoreFinancialHealth(metrics) {
  let score = 10; // out of 20

  if (finite(metrics.debtRatioPct)) {
    if (metrics.debtRatioPct <= 50) score += 6;
    else if (metrics.debtRatioPct <= 100) score += 4;
    else if (metrics.debtRatioPct >= 200) score -= 6;
  }

  if (finite(metrics.equityRatioPct)) {
    if (metrics.equityRatioPct >= 60) score += 4;
    else if (metrics.equityRatioPct < 30) score -= 4;
  }

  return Math.round(clamp(score, 0, 20));
}

function scoreDisclosure(disclosureResult) {
  const raw = 10 + Math.round((disclosureResult?.totalImpact || 0) / 2);
  return Math.round(clamp(raw, 0, 15));
}

export function buildFundamentalScorecard({
  financials,
  disclosures
}) {
  if (financials?.validation?.ok === false) {
    return {
      status: "DATA_VALIDATION_FAILED",
      score: null,
      maxScore: 80,
      components: {},
      completeness: {
        completed: [],
        pending: [
          "financials",
          "disclosures",
          "valuation",
          "technical",
          "flow",
          "market",
          "news"
        ],
        completedWeight: 0,
        totalWeight: 100,
        percent: 0
      }
    };
  }

  const metrics = financials?.metrics || {};

  const components = {
    growth: {
      score: scoreGrowth(metrics),
      max: 25
    },
    profitability: {
      score: scoreProfitability(metrics),
      max: 20
    },
    financialHealth: {
      score: scoreFinancialHealth(metrics),
      max: 20
    },
    disclosure: {
      score: scoreDisclosure(disclosures),
      max: 15
    },
    valuation: {
      score: null,
      max: 20,
      status: "PENDING_MARKET_DATA"
    }
  };

  const score =
    components.growth.score +
    components.profitability.score +
    components.financialHealth.score +
    components.disclosure.score;

  const completeness = {
    completed: [
      "financials",
      "disclosures",
      "risk"
    ],
    pending: [
      "valuation",
      "technical",
      "flow",
      "market",
      "news"
    ],
    completedWeight: 55,
    totalWeight: 100,
    percent: 55
  };

  return {
    status: "PARTIAL_DART_ONLY",
    score,
    maxScore: 80,
    normalizedTo100: Math.round((score / 80) * 100),
    components,
    completeness,
    interpretation:
      "현재 점수는 OpenDART 기반 펀더멘털·공시 점수이며, 전체 투자점수로 해석하면 안 됩니다."
  };
}

export function buildFinalReadiness(scorecard) {
  if (scorecard.status === "DATA_VALIDATION_FAILED") {
    return {
      readyForInvestmentDecision: false,
      label: "데이터 검증 실패",
      reason: "재무 데이터 검증 실패"
    };
  }

  if (scorecard.completeness.percent < 80) {
    return {
      readyForInvestmentDecision: false,
      label: "부분 분석",
      reason: "밸류에이션·차트·수급·시장·뉴스 데이터가 아직 미연결"
    };
  }

  return {
    readyForInvestmentDecision: true,
    label: "분석 가능",
    reason: null
  };
}
