function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function finite(value) {
  return Number.isFinite(Number(value));
}

function scale(score, max, weight) {
  if (!finite(score) || !finite(max) || Number(max) <= 0) return null;
  return (Number(score) / Number(max)) * weight;
}

function uniq(items) {
  return [...new Set((items || []).filter(Boolean))];
}

function pushScoreReason(target, label, score, max, high = 0.7, low = 0.4) {
  if (!finite(score) || !finite(max) || Number(max) <= 0) return;
  const ratio = Number(score) / Number(max);
  if (ratio >= high) target.positive.push(`${label} ${score}/${max}`);
  else if (ratio <= low) target.negative.push(`${label} ${score}/${max}`);
}

export function buildBearCase({ dart, valuation, technical, flow, market, news }) {
  const majorArguments = [];
  const weakArguments = [];
  const whatCouldGoWrong = [];
  let bearScore = 20;

  if (finite(valuation?.score) && valuation.score <= 7) {
    bearScore += 18;
    majorArguments.push("밸류에이션 부담이 높아 기대가 이미 가격에 반영됐을 가능성");
    whatCouldGoWrong.push("실적이 기대에 미달하면 밸류에이션 압축 가능성");
  }

  if (finite(technical?.score) && technical.score <= 8) {
    bearScore += 12;
    majorArguments.push("기술적 추세가 약해 추가 조정 가능성");
  } else if (finite(technical?.score) && technical.score <= 12) {
    bearScore += 5;
    weakArguments.push("기술적 모멘텀이 강하지 않음");
  }

  if (finite(flow?.score) && flow.score <= 8) {
    bearScore += 12;
    majorArguments.push("외국인·기관 수급이 약함");
    whatCouldGoWrong.push("수급 악화가 주가 하방 압력으로 이어질 가능성");
  } else if (finite(flow?.score) && flow.score <= 12) {
    bearScore += 5;
    weakArguments.push("수급이 확실한 우위 상태는 아님");
  }

  if (market?.regime === "RISK_OFF") {
    bearScore += 15;
    majorArguments.push("전체 시장이 RISK_OFF 상태");
    whatCouldGoWrong.push("시장 급락 시 개별 종목 펀더멘털과 무관한 동반 하락 가능성");
  } else if (market?.regime === "NEUTRAL_MIXED") {
    bearScore += 5;
    weakArguments.push("시장 환경이 혼조 상태");
  }

  if (news?.sentiment === "NEGATIVE") {
    bearScore += 15;
    majorArguments.push("최근 뉴스 흐름이 부정적");
  }

  if (Array.isArray(news?.highRiskEvents) && news.highRiskEvents.length > 0) {
    bearScore += Math.min(20, news.highRiskEvents.length * 8);
    majorArguments.push(`고위험 뉴스 이벤트 ${news.highRiskEvents.length}건 탐지`);
    whatCouldGoWrong.push("고위험 뉴스의 사실관계가 확인될 경우 투자 논리가 훼손될 수 있음");
  }

  const risk = dart?.agents?.risk;
  if (risk?.riskLevel === "HIGH") bearScore += 18;
  if (risk?.riskLevel === "VERY_HIGH" || risk?.criticalRisk || risk?.excludeSuggested) bearScore += 40;

  for (const item of risk?.risks || []) whatCouldGoWrong.push(item);

  const normalized = clamp(bearScore);
  return {
    bearScore: normalized,
    level: normalized >= 70 ? "STRONG" : normalized >= 45 ? "MODERATE" : "LOW",
    majorArguments: uniq(majorArguments),
    weakArguments: uniq(weakArguments),
    whatCouldGoWrong: uniq(whatCouldGoWrong),
    summary: normalized >= 70
      ? "반대 논리가 강합니다. 긍정 요인보다 위험 검증을 우선해야 합니다."
      : normalized >= 45
        ? "의미 있는 반대 논리가 있어 조건 확인이 필요합니다."
        : "현재 데이터에서 강한 반대 논리는 제한적입니다."
  };
}

export function buildInvestmentCommittee({ dart, valuation, technical, flow, market, news, completeness }) {
  const weights = {
    fundamental: 25,
    valuation: 15,
    technical: 15,
    flow: 15,
    market: 10,
    news: 10,
    risk: 10
  };

  const risk = dart?.agents?.risk || {};
  const dartRiskScore = finite(risk.riskScore) ? Number(risk.riskScore) : 50;
  const riskSafetyScore = clamp(100 - dartRiskScore);

  const components = {
    fundamental: { raw: dart?.scorecard?.score ?? null, max: dart?.scorecard?.maxScore ?? 80, weight: weights.fundamental },
    valuation: { raw: valuation?.score ?? null, max: valuation?.max ?? 20, weight: weights.valuation },
    technical: { raw: technical?.score ?? null, max: technical?.max ?? 20, weight: weights.technical },
    flow: { raw: flow?.score ?? null, max: flow?.max ?? 20, weight: weights.flow },
    market: { raw: market?.score ?? null, max: market?.max ?? 20, weight: weights.market },
    news: { raw: news?.score ?? null, max: news?.max ?? 20, weight: weights.news },
    risk: { raw: riskSafetyScore, max: 100, weight: weights.risk }
  };

  let weightedTotal = 0;
  let availableWeight = 0;
  for (const component of Object.values(components)) {
    const weighted = scale(component.raw, component.max, component.weight);
    component.weighted = weighted === null ? null : Number(weighted.toFixed(2));
    if (weighted !== null) {
      weightedTotal += weighted;
      availableWeight += component.weight;
    }
  }

  const dataReady = completeness?.percent === 100 && availableWeight === 100;
  const baseScore = dataReady ? clamp(weightedTotal) : null;
  const bear = buildBearCase({ dart, valuation, technical, flow, market, news });

  const criticalNews = Array.isArray(news?.highRiskEvents) && news.highRiskEvents.length > 0;
  const criticalDart = dart?.agents?.dart?.impact === "VERY_NEGATIVE" && dart?.agents?.dart?.important === true;
  const hardStop = Boolean(
    risk?.criticalRisk === true ||
    risk?.riskLevel === "VERY_HIGH" ||
    risk?.excludeSuggested === true ||
    criticalDart ||
    criticalNews
  );

  let adjustedScore = baseScore;
  if (adjustedScore !== null && !hardStop) {
    const bearPenalty = Math.max(0, bear.bearScore - 35) * 0.15;
    adjustedScore = clamp(adjustedScore - bearPenalty);
  }
  if (hardStop && adjustedScore !== null) adjustedScore = Math.min(adjustedScore, 39);

  let status = "DATA_INCOMPLETE";
  if (dataReady) {
    if (hardStop || adjustedScore < 45) status = "RISK";
    else if (adjustedScore < 60) status = "WATCH";
    else if (adjustedScore < 75) status = "INTEREST";
    else status = "CONDITION_MET";
  }

  const reasons = { positive: [], negative: [] };
  pushScoreReason(reasons, "펀더멘털", components.fundamental.raw, components.fundamental.max);
  pushScoreReason(reasons, "밸류에이션", components.valuation.raw, components.valuation.max);
  pushScoreReason(reasons, "기술", components.technical.raw, components.technical.max);
  pushScoreReason(reasons, "수급", components.flow.raw, components.flow.max);
  pushScoreReason(reasons, "시장", components.market.raw, components.market.max);
  pushScoreReason(reasons, "뉴스", components.news.raw, components.news.max);

  for (const item of dart?.agents?.company?.strengths || []) reasons.positive.push(item);
  for (const item of dart?.agents?.company?.weaknesses || []) reasons.negative.push(item);
  if (market?.regime === "RISK_OFF") reasons.negative.push("시장 RISK_OFF");
  if (market?.regime === "RISK_ON") reasons.positive.push("시장 RISK_ON");
  if (news?.sentiment === "NEGATIVE") reasons.negative.push("최근 뉴스 부정적");
  if (news?.sentiment === "POSITIVE") reasons.positive.push("최근 뉴스 긍정적");

  const confidence = dataReady
    ? clamp(55 + (completeness.percent * 0.25) + Math.min(15, Math.abs((adjustedScore ?? 50) - 50) * 0.3) - (bear.level === "STRONG" ? 10 : bear.level === "MODERATE" ? 4 : 0), 35, 95)
    : clamp((completeness?.percent || 0) * 0.6, 0, 60);

  const entryConditions = [
    "치명적 공시·고위험 뉴스가 새로 발생하지 않을 것",
    "외국인·기관 수급이 급격히 악화되지 않을 것",
    "시장 regime이 RISK_OFF로 악화될 경우 재평가"
  ];
  if (valuation?.score <= 7) entryConditions.push("밸류에이션 부담 완화 또는 실적 상향으로 가격 정당화 확인");
  if (technical?.score <= 10) entryConditions.push("기술적 추세 개선 확인");

  const invalidConditions = uniq([
    ...(risk?.redFlags || []),
    ...(risk?.risks || []),
    "핵심 실적 추세 급격한 악화",
    "중대한 회계·법률·거래정지 위험 발생"
  ]);

  return {
    status,
    totalScore: adjustedScore,
    baseScore,
    confidence,
    hardStop,
    hardStopReason: hardStop
      ? criticalNews ? "HIGH_RISK_NEWS" : criticalDart ? "CRITICAL_DART_EVENT" : "CRITICAL_RISK"
      : null,
    weights,
    components,
    bear,
    positiveReasons: uniq(reasons.positive).slice(0, 8),
    negativeReasons: uniq(reasons.negative).slice(0, 8),
    risks: uniq(risk?.risks || []),
    entryConditions,
    invalidConditions,
    labelKo: {
      RISK: "위험",
      WATCH: "관찰",
      INTEREST: "관심",
      CONDITION_MET: "조건충족",
      DATA_INCOMPLETE: "데이터부족"
    }[status],
    summary: !dataReady
      ? "핵심 데이터가 완전하지 않아 최종 판정을 보류합니다."
      : hardStop
        ? "Risk Hard Stop이 적용되어 위험 상태로 분류했습니다."
        : `7개 축 100점 가중치와 Bear Case를 통합한 결과 ${adjustedScore}점, ${status} 상태입니다.`,
    disclaimer: "연구·의사결정 지원용 분석이며 수익을 보장하거나 자동 매수·매도를 지시하지 않습니다."
  };
}
