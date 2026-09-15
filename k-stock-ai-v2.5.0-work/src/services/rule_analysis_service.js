function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function pct(value) {
  return Number.isFinite(value) ? value : null;
}

export function buildCompanyRuleAnalysis(financials) {
  const m = financials.metrics || {};

  if (financials.validation?.ok === false) {
    return {
      score: null,
      strengths: [],
      weaknesses: financials.validation.errors || [],
      metrics: m,
      method: "RULE_ENGINE_V1",
      validationFailed: true,
      summary: "재무 데이터 검증에 실패하여 기업 점수를 계산하지 않았습니다."
    };
  }

  let score = 60;
  const strengths = [];
  const weaknesses = [];

  if (pct(m.revenueGrowthPct) !== null) {
    if (m.revenueGrowthPct >= 10) {
      score += 8;
      strengths.push(`매출 성장률 ${m.revenueGrowthPct.toFixed(1)}%`);
    } else if (m.revenueGrowthPct < 0) {
      score -= 8;
      weaknesses.push(`매출 감소 ${m.revenueGrowthPct.toFixed(1)}%`);
    }
  }

  if (pct(m.operatingProfitGrowthPct) !== null) {
    if (m.operatingProfitGrowthPct >= 15) {
      score += 12;
      strengths.push(`영업이익 성장률 ${m.operatingProfitGrowthPct.toFixed(1)}%`);
    } else if (m.operatingProfitGrowthPct < 0) {
      score -= 12;
      weaknesses.push(`영업이익 감소 ${m.operatingProfitGrowthPct.toFixed(1)}%`);
    }
  }

  if (pct(m.operatingMarginPct) !== null) {
    if (m.operatingMarginPct >= 10) {
      score += 7;
      strengths.push(`영업이익률 ${m.operatingMarginPct.toFixed(1)}%`);
    } else if (m.operatingMarginPct < 3) {
      score -= 6;
      weaknesses.push(`낮은 영업이익률 ${m.operatingMarginPct.toFixed(1)}%`);
    }
  }

  if (pct(m.debtRatioPct) !== null) {
    if (m.debtRatioPct <= 100) {
      score += 7;
      strengths.push(`부채비율 ${m.debtRatioPct.toFixed(1)}%`);
    } else if (m.debtRatioPct >= 200) {
      score -= 12;
      weaknesses.push(`높은 부채비율 ${m.debtRatioPct.toFixed(1)}%`);
    }
  }

  if (pct(m.roeApproxPct) !== null) {
    if (m.roeApproxPct >= 10) {
      score += 6;
      strengths.push(`근사 ROE ${m.roeApproxPct.toFixed(1)}%`);
    } else if (m.roeApproxPct < 0) {
      score -= 10;
      weaknesses.push(`근사 ROE 음수 ${m.roeApproxPct.toFixed(1)}%`);
    }
  }

  return {
    score: clamp(score),
    strengths,
    weaknesses,
    metrics: m,
    method: "RULE_ENGINE_V1",
    summary: "OpenDART 재무제표의 핵심 계정을 이용한 규칙 기반 1차 분석입니다."
  };
}

export function buildDartRuleAnalysis(disclosures) {
  let score = 80 + disclosures.totalImpact;

  return {
    score: clamp(score),
    important: disclosures.eventCount > 0,
    impact:
      disclosures.critical ? "VERY_NEGATIVE" :
      disclosures.totalImpact < -10 ? "NEGATIVE" :
      disclosures.totalImpact > 5 ? "POSITIVE" :
      "NEUTRAL",
    critical: disclosures.critical,
    events: disclosures.events,
    summary:
      disclosures.eventCount > 0
        ? `중요 키워드 공시 ${disclosures.eventCount}건을 탐지했습니다.`
        : "규칙 엔진 기준의 주요 위험 공시는 탐지되지 않았습니다.",
    method: "DISCLOSURE_RULE_ENGINE_V1"
  };
}

export function buildRiskRuleAnalysis({ financials, disclosures }) {
  const m = financials.metrics || {};

  if (financials.validation?.ok === false) {
    return {
      riskScore: null,
      riskLevel: "DATA_VALIDATION_FAILED",
      criticalRisk: false,
      risks: financials.validation.errors || [],
      redFlags: [],
      excludeSuggested: false,
      method: "RISK_RULE_ENGINE_V1",
      validationFailed: true,
      summary: "재무 데이터 검증 실패로 위험 점수를 계산하지 않았습니다."
    };
  }

  const risks = [];
  const redFlags = [];
  let riskScore = 20;

  if (pct(m.operatingProfitGrowthPct) !== null && m.operatingProfitGrowthPct < -30) {
    riskScore += 20;
    risks.push(`영업이익 급감 ${m.operatingProfitGrowthPct.toFixed(1)}%`);
  }

  if (pct(m.netIncomeGrowthPct) !== null && m.netIncomeGrowthPct < -30) {
    riskScore += 15;
    risks.push(`순이익 급감 ${m.netIncomeGrowthPct.toFixed(1)}%`);
  }

  if (pct(m.debtRatioPct) !== null && m.debtRatioPct >= 200) {
    riskScore += 20;
    risks.push(`높은 부채비율 ${m.debtRatioPct.toFixed(1)}%`);
  }

  for (const event of disclosures.negativeEvents) {
    riskScore += Math.min(25, Math.abs(event.scoreImpact));
    risks.push(event.reportName);

    if (event.severity === "VERY_HIGH") {
      redFlags.push(event.type);
    }
  }

  const criticalRisk = disclosures.critical || redFlags.length > 0;
  const normalized = clamp(riskScore);

  let riskLevel = "LOW";
  if (normalized >= 80) riskLevel = "VERY_HIGH";
  else if (normalized >= 60) riskLevel = "HIGH";
  else if (normalized >= 35) riskLevel = "MEDIUM";

  return {
    riskScore: normalized,
    riskLevel,
    criticalRisk,
    risks: [...new Set(risks)],
    redFlags: [...new Set(redFlags)],
    excludeSuggested: criticalRisk,
    method: "RISK_RULE_ENGINE_V1",
    summary: criticalRisk
      ? "치명적 위험 신호가 탐지되었습니다."
      : "OpenDART 기반 규칙 엔진에서 치명적 위험은 탐지되지 않았습니다."
  };
}

export function buildCommitteeRuleAnalysis({
  company,
  dart,
  risk
}) {
  if (company.validationFailed || risk.validationFailed) {
    return {
      totalScore: null,
      status: "DATA_VALIDATION_FAILED",
      confidence: 0,
      positiveReasons: [],
      negativeReasons: company.weaknesses || [],
      risks: risk.risks || [],
      entryConditions: [],
      invalidConditions: [],
      riskOverride: false,
      method: "COMMITTEE_RULE_ENGINE_V1",
      summary: "재무 데이터 검증 실패로 투자위원회 점수를 계산하지 않았습니다."
    };
  }

  if (risk.criticalRisk || risk.excludeSuggested) {
    return {
      totalScore: Math.min(company.score, 49),
      status: "EXCLUDE",
      confidence: 90,
      positiveReasons: company.strengths,
      negativeReasons: [...company.weaknesses, ...risk.risks],
      risks: risk.risks,
      entryConditions: [],
      invalidConditions: [],
      riskOverride: true,
      method: "COMMITTEE_RULE_ENGINE_V1",
      summary: "Risk Hard Stop이 적용되어 관심 제외 상태입니다."
    };
  }

  const score = clamp(
    company.score * 0.65 +
    dart.score * 0.20 +
    (100 - risk.riskScore) * 0.15
  );

  let status = "WATCH";
  if (score >= 82) status = "CONDITION_MET";
  else if (score >= 70) status = "INTEREST";
  else if (score < 55) status = "EXCLUDE";

  return {
    totalScore: score,
    status,
    confidence: 72,
    positiveReasons: company.strengths,
    negativeReasons: company.weaknesses,
    risks: risk.risks,
    entryConditions: [
      "실제 주가/수급 데이터 연결 후 가격 조건 확인",
      "최근 중요 공시 지속 확인"
    ],
    invalidConditions: [
      "치명적 공시 발생",
      "실적 추세 급격한 악화"
    ],
    riskOverride: false,
    method: "COMMITTEE_RULE_ENGINE_V1",
    summary: "OpenDART 실제 데이터만 사용한 1차 투자위원회 평가입니다. 아직 주가·수급·뉴스는 반영되지 않았습니다."
  };
}
