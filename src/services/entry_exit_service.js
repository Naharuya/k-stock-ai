function finite(value) {
  if (typeof value !== "number" && typeof value !== "string") return false;
  if (typeof value === "string" && value.trim() === "") return false;
  return Number.isFinite(Number(value));
}

function num(value, fallback = null) {
  return finite(value) ? Number(value) : fallback;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function uniq(items) {
  return [...new Set((items || []).filter(Boolean))];
}

function getCurrentPrice(analysis) {
  const price = num(analysis?.marketData?.quote?.price ?? analysis?.marketData?.quote?.currentPrice);
  return price !== null && price > 0 ? price : null;
}

function componentRatio(analysis, key) {
  const component = analysis?.committee?.components?.[key];
  const raw = num(component?.raw);
  const max = num(component?.max);
  if (raw === null || max === null || max <= 0) return null;
  return (raw / max) * 100;
}

function riskScore(analysis) {
  return num(analysis?.dart?.agents?.risk?.riskScore, 50);
}

function newsSentiment(analysis) {
  return analysis?.scores?.news?.sentiment || analysis?.newsScore?.sentiment || "UNKNOWN";
}

export function createEntrySnapshot(analysis, {
  buyPrice,
  quantity = 1,
  stopLossPct = -7,
  takeProfitPct = 10,
  note = ""
} = {}) {
  if (!analysis?.stockCode) throw new Error("analysis.stockCode is required");
  const resolvedBuyPrice = num(buyPrice, getCurrentPrice(analysis));
  if (!finite(resolvedBuyPrice) || resolvedBuyPrice <= 0) throw new Error("buyPrice must be a positive number");
  const resolvedQty = Math.max(1, Math.floor(num(quantity, 1)));

  return {
    version: "ENTRY_SNAPSHOT_V1",
    stockCode: analysis.stockCode,
    corpName: analysis.corpName || analysis.stockCode,
    registeredAt: new Date().toISOString(),
    analyzedAt: analysis.analyzedAt || new Date().toISOString(),
    buyPrice: resolvedBuyPrice,
    quantity: resolvedQty,
    stopLossPct: num(stopLossPct, -7),
    takeProfitPct: num(takeProfitPct, 10),
    note: String(note || "").slice(0, 300),
    thesis: {
      committeeStatus: analysis?.committee?.status || "DATA_INCOMPLETE",
      committeeScore: num(analysis?.committee?.totalScore),
      hardStop: Boolean(analysis?.committee?.hardStop),
      components: {
        fundamental: componentRatio(analysis, "fundamental"),
        valuation: componentRatio(analysis, "valuation"),
        technical: componentRatio(analysis, "technical"),
        flow: componentRatio(analysis, "flow"),
        market: componentRatio(analysis, "market"),
        news: componentRatio(analysis, "news"),
        risk: componentRatio(analysis, "risk")
      },
      technical: {
        trend: analysis?.marketData?.technicalMetrics?.trend || "UNKNOWN",
        rsi14: num(analysis?.marketData?.technicalMetrics?.rsi14),
        distanceFromMa20Pct: num(analysis?.marketData?.technicalMetrics?.distanceFromMa20Pct)
      },
      flow: {
        combinedSmartMoneyQty5d: num(analysis?.marketData?.flowMetrics?.combinedSmartMoneyQty5d, 0),
        combinedSmartMoneyQty20d: num(analysis?.marketData?.flowMetrics?.combinedSmartMoneyQty20d, 0)
      },
      marketRegime: analysis?.marketData?.marketContext?.score?.regime || "UNKNOWN",
      newsSentiment: newsSentiment(analysis),
      riskScore: riskScore(analysis),
      entryReasons: uniq(analysis?.committee?.positiveReasons).slice(0, 5),
      invalidConditions: uniq(analysis?.committee?.invalidConditions).slice(0, 8)
    }
  };
}

export function evaluateExitPosition({ entry, currentAnalysis }) {
  if (!entry?.stockCode) throw new Error("entry snapshot is required");
  if (!currentAnalysis?.stockCode) throw new Error("currentAnalysis is required");
  if (String(entry.stockCode) !== String(currentAnalysis.stockCode)) throw new Error("entry/current stock code mismatch");

  const currentPrice = getCurrentPrice(currentAnalysis);
  const buyPrice = num(entry.buyPrice);
  const pnlPct = currentPrice !== null && buyPrice && buyPrice > 0
    ? ((currentPrice - buyPrice) / buyPrice) * 100
    : null;
  const currentScore = num(currentAnalysis?.committee?.totalScore);
  const entryScore = num(entry?.thesis?.committeeScore);
  const scoreDelta = currentScore !== null && entryScore !== null ? currentScore - entryScore : null;
  const currentTech = currentAnalysis?.marketData?.technicalMetrics || {};
  const currentFlow = currentAnalysis?.marketData?.flowMetrics || {};
  const currentRisk = riskScore(currentAnalysis);
  const entryRisk = num(entry?.thesis?.riskScore, 50);
  const currentRegime = currentAnalysis?.marketData?.marketContext?.score?.regime || "UNKNOWN";
  const currentNews = newsSentiment(currentAnalysis);
  const hardStop = Boolean(currentAnalysis?.committee?.hardStop);

  let exitPressure = 0;
  const reasons = [];
  const positives = [];

  if (hardStop) {
    exitPressure += 100;
    reasons.push(`Risk Hard Stop 발동: ${currentAnalysis?.committee?.hardStopReason || "CRITICAL_RISK"}`);
  }

  const stopLossPct = num(entry.stopLossPct, -7);
  const takeProfitPct = num(entry.takeProfitPct, 10);

  if (pnlPct !== null) {
    if (pnlPct <= stopLossPct) {
      exitPressure += 35;
      reasons.push(`손실 제한선 도달 ${pnlPct.toFixed(1)}% ≤ ${stopLossPct.toFixed(1)}%`);
    } else if (pnlPct >= takeProfitPct) {
      exitPressure += 18;
      reasons.push(`사전 이익실현 기준 도달 ${pnlPct.toFixed(1)}% ≥ +${takeProfitPct.toFixed(1)}%`);
    } else if (pnlPct > 0) {
      positives.push(`평가수익 ${pnlPct.toFixed(1)}%`);
    }
  }

  if (scoreDelta !== null) {
    if (scoreDelta <= -20) {
      exitPressure += 28;
      reasons.push(`Committee 점수 ${Math.abs(scoreDelta).toFixed(0)}점 급락`);
    } else if (scoreDelta <= -10) {
      exitPressure += 15;
      reasons.push(`Committee 점수 ${Math.abs(scoreDelta).toFixed(0)}점 하락`);
    } else if (scoreDelta >= 8) {
      positives.push(`Committee 점수 +${scoreDelta.toFixed(0)}점 개선`);
    }
  }

  const entryTrend = entry?.thesis?.technical?.trend || "UNKNOWN";
  if (currentTech.trend === "DOWNTREND") {
    exitPressure += 18;
    reasons.push("기술 추세가 하락 추세로 전환/유지");
  } else if (entryTrend !== "UPTREND" && currentTech.trend === "UPTREND") {
    positives.push("기술 추세 상승 전환");
  }
  if (num(currentTech.distanceFromMa20Pct) !== null && Number(currentTech.distanceFromMa20Pct) < -3) {
    exitPressure += 10;
    reasons.push(`MA20 대비 ${Number(currentTech.distanceFromMa20Pct).toFixed(1)}% 이탈`);
  }

  const entrySmart5 = num(entry?.thesis?.flow?.combinedSmartMoneyQty5d, 0);
  const currentSmart5 = num(currentFlow.combinedSmartMoneyQty5d, 0);
  if (entrySmart5 > 0 && currentSmart5 < 0) {
    exitPressure += 15;
    reasons.push("외국인+기관 5일 수급이 순매수에서 순매도로 반전");
  } else if (currentSmart5 > 0) {
    positives.push("외국인+기관 최근 5일 합산 순매수 유지");
  }

  const riskDelta = currentRisk - entryRisk;
  if (riskDelta >= 25) {
    exitPressure += 22;
    reasons.push(`기업 리스크 점수 +${riskDelta.toFixed(0)} 악화`);
  } else if (riskDelta >= 10) {
    exitPressure += 10;
    reasons.push(`기업 리스크 점수 +${riskDelta.toFixed(0)} 상승`);
  }

  if (currentNews === "NEGATIVE" && entry?.thesis?.newsSentiment !== "NEGATIVE") {
    exitPressure += 12;
    reasons.push("최근 뉴스 흐름이 부정적으로 전환");
  }
  if (currentRegime === "RISK_OFF" && entry?.thesis?.marketRegime !== "RISK_OFF") {
    exitPressure += 10;
    reasons.push("시장 환경이 RISK_OFF로 악화");
  }

  exitPressure = clamp(exitPressure);

  let status = "HOLD";
  if (hardStop || exitPressure >= 70) status = "RISK_EXIT_REVIEW";
  else if (exitPressure >= 50) status = "EXIT_REVIEW";
  else if (pnlPct !== null && pnlPct >= takeProfitPct) status = "TAKE_PROFIT_REVIEW";
  else if (exitPressure >= 30) status = "CAUTION";

  const labelKo = {
    HOLD: "보유 유지",
    CAUTION: "주의 관찰",
    TAKE_PROFIT_REVIEW: "이익실현 검토",
    EXIT_REVIEW: "매도 검토",
    RISK_EXIT_REVIEW: "위험 이탈 검토"
  }[status];

  return {
    version: "EXIT_ENGINE_V1",
    stockCode: currentAnalysis.stockCode,
    corpName: currentAnalysis.corpName || entry.corpName || currentAnalysis.stockCode,
    evaluatedAt: new Date().toISOString(),
    currentPrice,
    buyPrice,
    quantity: num(entry.quantity, 1),
    pnlPct: pnlPct === null ? null : Number(pnlPct.toFixed(2)),
    entryScore,
    currentScore,
    scoreDelta: scoreDelta === null ? null : Number(scoreDelta.toFixed(1)),
    exitPressure,
    status,
    labelKo,
    hardStop,
    reasons: uniq(reasons).slice(0, 8),
    positiveSignals: uniq(positives).slice(0, 6),
    checkpoints: {
      stopLossPct,
      takeProfitPct,
      currentTrend: currentTech.trend || "UNKNOWN",
      marketRegime: currentRegime,
      newsSentiment: currentNews,
      riskScore: currentRisk,
      smartMoney5d: currentSmart5
    },
    disclaimer: "Exit Engine은 보유/매도 검토를 위한 연구 지원 도구이며 자동매도 또는 수익 보장을 제공하지 않습니다."
  };
}
