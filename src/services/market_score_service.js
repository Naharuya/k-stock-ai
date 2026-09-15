function clamp(v, min, max) {
  return Math.max(min, Math.min(max, Math.round(v)));
}

export function scoreValuation(quote) {
  let score = 10;
  const notes = [];

  if (Number.isFinite(quote.per) && quote.per > 0) {
    if (quote.per <= 10) {
      score += 4;
      notes.push(`PER ${quote.per}`);
    } else if (quote.per <= 20) {
      score += 2;
      notes.push(`PER ${quote.per}`);
    } else if (quote.per >= 35) {
      score -= 3;
      notes.push(`높은 PER ${quote.per}`);
    }
  }

  if (Number.isFinite(quote.pbr) && quote.pbr > 0) {
    if (quote.pbr <= 1.2) {
      score += 3;
      notes.push(`PBR ${quote.pbr}`);
    } else if (quote.pbr >= 3) {
      score -= 2;
      notes.push(`높은 PBR ${quote.pbr}`);
    }
  }

  return {
    score: clamp(score, 0, 20),
    max: 20,
    notes,
    caveat: "PER/PBR 단순 절대수준 평가이며 업종·과거밴드 비교는 다음 단계에서 보강"
  };
}

export function scoreTechnical(metrics) {
  let score = 10;
  const notes = [];

  if (metrics.trend === "UPTREND") {
    score += 4;
    notes.push("중기 상승추세");
  } else if (metrics.trend === "DOWNTREND") {
    score -= 4;
    notes.push("중기 하락추세");
  }

  if (Number.isFinite(metrics.rsi14)) {
    if (metrics.rsi14 >= 70) {
      score -= 2;
      notes.push(`RSI 과열 ${metrics.rsi14.toFixed(1)}`);
    } else if (metrics.rsi14 >= 45 && metrics.rsi14 <= 65) {
      score += 2;
      notes.push(`RSI 중립/양호 ${metrics.rsi14.toFixed(1)}`);
    }
  }

  if (Number.isFinite(metrics.volumeRatio20) && metrics.volumeRatio20 >= 1.5) {
    score += 2;
    notes.push(`20일 평균 대비 거래량 ${metrics.volumeRatio20.toFixed(2)}배`);
  }

  return {
    score: clamp(score, 0, 20),
    max: 20,
    notes
  };
}
