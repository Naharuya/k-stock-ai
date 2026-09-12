function average(values) {
  const valid = values.filter(Number.isFinite);
  if (!valid.length) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function sma(rows, n) {
  if (!Array.isArray(rows) || rows.length < n) return null;
  return average(rows.slice(0, n).map((r) => r.close));
}

function rsi(rows, period = 14) {
  if (!Array.isArray(rows) || rows.length < period + 1) return null;

  const chron = [...rows].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const recent = chron.slice(-(period + 1));

  let gains = 0;
  let losses = 0;

  for (let i = 1; i < recent.length; i += 1) {
    const diff = recent[i].close - recent[i - 1].close;
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function pctDiff(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
  return ((a - b) / b) * 100;
}

export function buildTechnicalMetrics(chart) {
  const rows = [...(chart?.rows || [])]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const latest = rows[0] || null;
  const ma5 = sma(rows, 5);
  const ma20 = sma(rows, 20);
  const ma60 = sma(rows, 60);
  const ma120 = sma(rows, 120);

  const avgVolume20 = average(rows.slice(0, 20).map((r) => r.volume));
  const volumeRatio20 =
    latest && Number.isFinite(latest.volume) && Number.isFinite(avgVolume20) && avgVolume20 !== 0
      ? latest.volume / avgVolume20
      : null;

  let trend = "UNKNOWN";

  if (
    latest &&
    Number.isFinite(ma20) &&
    Number.isFinite(ma60)
  ) {
    if (latest.close > ma20 && ma20 > ma60) trend = "UPTREND";
    else if (latest.close < ma20 && ma20 < ma60) trend = "DOWNTREND";
    else trend = "SIDEWAYS_OR_MIXED";
  }

  const rsi14 = rsi(rows, 14);

  return {
    latestDate: latest?.date || null,
    latestClose: latest?.close ?? null,
    ma5,
    ma20,
    ma60,
    ma120,
    rsi14,
    volumeRatio20,
    trend,
    distanceFromMa20Pct: latest ? pctDiff(latest.close, ma20) : null,
    distanceFrom52WeekHighPct: null
  };
}
