import { buildTechnicalMetrics } from "./technical_metrics_service.js";
import { getDomesticIndexDailyChart } from "./kis_service.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function pctChange(latest, past) {
  if (!Number.isFinite(latest) || !Number.isFinite(past) || past === 0) return null;
  return ((latest - past) / past) * 100;
}

function closeAt(rows, index) {
  const value = rows?.[index]?.close;
  return Number.isFinite(value) ? value : null;
}

function buildIndexSnapshot(chart) {
  const metrics = buildTechnicalMetrics(chart);
  const rows = chart.rows || [];
  const latest = closeAt(rows, 0);
  const ret5d = pctChange(latest, closeAt(rows, 5));
  const ret20d = pctChange(latest, closeAt(rows, 20));
  const ret60d = pctChange(latest, closeAt(rows, 60));

  return {
    indexCode: chart.indexCode,
    indexName: chart.indexName,
    rows: rows.length,
    latestDate: metrics.latestDate,
    latestClose: metrics.latestClose,
    ma5: metrics.ma5,
    ma20: metrics.ma20,
    ma60: metrics.ma60,
    ma120: metrics.ma120,
    rsi14: metrics.rsi14,
    trend: metrics.trend,
    ret5dPct: ret5d,
    ret20dPct: ret20d,
    ret60dPct: ret60d
  };
}

function hasEnoughIndexHistory(snapshot) {
  return snapshot.rows >= 120 &&
    Number.isFinite(snapshot.ma60) &&
    Number.isFinite(snapshot.ma120) &&
    Number.isFinite(snapshot.ret60dPct) &&
    snapshot.trend !== "UNKNOWN";
}

function scoreIndex(snapshot) {
  if (!hasEnoughIndexHistory(snapshot)) {
    return {
      score: null,
      max: 20,
      status: "INSUFFICIENT_DATA",
      notes: [`장기 시장판단 데이터 부족 (${snapshot.rows}행, 최소 120행 필요)`]
    };
  }

  let score = 10;
  const notes = [];

  if (snapshot.trend === "UPTREND") {
    score += 4;
    notes.push("중기 상승추세");
  } else if (snapshot.trend === "DOWNTREND") {
    score -= 4;
    notes.push("중기 하락추세");
  } else {
    notes.push("중기 혼조/횡보");
  }

  if (snapshot.latestClose > snapshot.ma120) {
    score += 2;
    notes.push("120일선 상회");
  } else {
    score -= 2;
    notes.push("120일선 하회");
  }

  if (snapshot.ret20dPct >= 5) {
    score += 2;
    notes.push(`20일 수익률 +${snapshot.ret20dPct.toFixed(1)}%`);
  } else if (snapshot.ret20dPct <= -5) {
    score -= 2;
    notes.push(`20일 수익률 ${snapshot.ret20dPct.toFixed(1)}%`);
  }

  if (Number.isFinite(snapshot.rsi14)) {
    if (snapshot.rsi14 >= 75) {
      score -= 1;
      notes.push(`RSI 과열 ${snapshot.rsi14.toFixed(1)}`);
    } else if (snapshot.rsi14 < 35) {
      score -= 1;
      notes.push(`RSI 약세 ${snapshot.rsi14.toFixed(1)}`);
    } else if (snapshot.rsi14 >= 45 && snapshot.rsi14 <= 65) {
      score += 1;
      notes.push(`RSI 중립/양호 ${snapshot.rsi14.toFixed(1)}`);
    }
  }

  return { score: clamp(score, 0, 20), max: 20, status: "READY", notes };
}

function classifyRegime(kospi, kosdaq, compositeScore) {
  const up = [kospi, kosdaq].filter((x) => x.trend === "UPTREND").length;
  const down = [kospi, kosdaq].filter((x) => x.trend === "DOWNTREND").length;
  if (down === 2 || compositeScore <= 7) return "RISK_OFF";
  if (up === 2 && compositeScore >= 14) return "RISK_ON";
  return "NEUTRAL_MIXED";
}

export async function analyzeMarketContext({ endDate } = {}) {
  // KIS 호출 제한을 고려해 지수 2개를 직렬 조회한다.
  const kospiChart = await getDomesticIndexDailyChart({ indexCode: "0001", endDate, minRows: 130, maxPages: 4 });
  const kosdaqChart = await getDomesticIndexDailyChart({ indexCode: "1001", endDate, minRows: 130, maxPages: 4 });

  const kospi = buildIndexSnapshot(kospiChart);
  const kosdaq = buildIndexSnapshot(kosdaqChart);
  const kospiScore = scoreIndex(kospi);
  const kosdaqScore = scoreIndex(kosdaq);
  const ready = kospiScore.status === "READY" && kosdaqScore.status === "READY";

  if (!ready) {
    return {
      source: "KIS",
      kospi,
      kosdaq,
      score: {
        score: null,
        max: 20,
        status: "INSUFFICIENT_DATA",
        regime: "UNKNOWN",
        components: { kospi: kospiScore, kosdaq: kosdaqScore },
        caveat: "KOSPI·KOSDAQ 중 하나라도 120거래일 장기 데이터가 부족하면 시장점수를 확정하지 않습니다."
      }
    };
  }

  // 대형주 중심 KOSPI 60%, 성장주/중소형주 성격의 KOSDAQ 40% 가중.
  const compositeScore = clamp(kospiScore.score * 0.6 + kosdaqScore.score * 0.4, 0, 20);
  const regime = classifyRegime(kospi, kosdaq, compositeScore);

  return {
    source: "KIS",
    kospi,
    kosdaq,
    score: {
      score: compositeScore,
      max: 20,
      status: "READY",
      regime,
      components: { kospi: kospiScore, kosdaq: kosdaqScore },
      caveat: "시장점수는 KOSPI·KOSDAQ 지수의 추세, 120일선, 20일 수익률, RSI를 결합한 1차 휴리스틱입니다. 금리·환율·미국시장·시장폭은 후속 보강 대상입니다."
    }
  };
}
