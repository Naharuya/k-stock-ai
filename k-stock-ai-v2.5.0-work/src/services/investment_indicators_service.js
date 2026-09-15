function finite(value) {
  return Number.isFinite(Number(value));
}

function safeDiv(numerator, denominator) {
  if (!finite(numerator) || !finite(denominator) || Number(denominator) === 0) return null;
  return Number(numerator) / Number(denominator);
}

function round(value, digits = 2) {
  if (!finite(value)) return null;
  const p = 10 ** digits;
  return Math.round(Number(value) * p) / p;
}

/**
 * Build investor-facing indicators from KIS quote + OpenDART annual financials.
 *
 * Notes:
 * - APS is defined here as Assets Per Share (총자산 / 상장주식수).
 * - PTBR uses tangible equity ~= total equity - intangible assets - goodwill.
 * - PEG is an approximation using annual net-income growth as EPS-growth proxy
 *   when a directly comparable historical EPS growth series is unavailable.
 */
export function buildInvestmentIndicators({ quote, financials, technicalMetrics }) {
  const current = financials?.current || {};
  const metrics = financials?.metrics || {};

  const price = finite(quote?.price) ? Number(quote.price) : null;
  const shares = finite(quote?.listedShares) && Number(quote.listedShares) > 0
    ? Number(quote.listedShares)
    : null;

  const revenue = finite(current.revenue) ? Number(current.revenue) : null;
  const netIncome = finite(current.netIncome) ? Number(current.netIncome) : null;
  const assets = finite(current.assets) ? Number(current.assets) : null;
  const equity = finite(current.equity) ? Number(current.equity) : null;
  const intangibleAssets = finite(current.intangibleAssets) ? Number(current.intangibleAssets) : 0;
  const goodwill = finite(current.goodwill) ? Number(current.goodwill) : 0;

  const derivedEps = safeDiv(netIncome, shares);
  const derivedBps = safeDiv(equity, shares);
  const salesPerShare = safeDiv(revenue, shares);
  const assetsPerShare = safeDiv(assets, shares);
  const tangibleEquity = equity === null ? null : Math.max(0, equity - intangibleAssets - goodwill);
  const tangibleBookPerShare = safeDiv(tangibleEquity, shares);

  const eps = finite(quote?.eps) ? Number(quote.eps) : derivedEps;
  const bps = finite(quote?.bps) ? Number(quote.bps) : derivedBps;
  const per = finite(quote?.per) ? Number(quote.per) : safeDiv(price, eps);
  const pbr = finite(quote?.pbr) ? Number(quote.pbr) : safeDiv(price, bps);
  const psr = safeDiv(price, salesPerShare);
  const ptbr = safeDiv(price, tangibleBookPerShare);
  const roe = finite(metrics.roeApproxPct)
    ? Number(metrics.roeApproxPct)
    : (safeDiv(netIncome, equity) === null ? null : safeDiv(netIncome, equity) * 100);
  const roa = safeDiv(netIncome, assets) === null ? null : safeDiv(netIncome, assets) * 100;
  const rsi = finite(technicalMetrics?.rsi14) ? Number(technicalMetrics.rsi14) : null;

  const growthPct = finite(metrics.netIncomeGrowthPct) ? Number(metrics.netIncomeGrowthPct) : null;
  const peg = per !== null && growthPct !== null && growthPct > 0
    ? per / growthPct
    : null;

  return {
    status: "READY",
    definitions: {
      aps: "Assets Per Share (주당자산)",
      ptbr: "Price to Tangible Book Ratio (주가/유형장부가)",
      peg: "PER / 연간 EPS 성장률의 근사치"
    },
    values: {
      per: round(per),
      pbr: round(pbr),
      psr: round(psr),
      roePct: round(roe),
      eps: round(eps),
      roaPct: round(roa),
      ptbr: round(ptbr),
      rsi14: round(rsi),
      bps: round(bps),
      aps: round(assetsPerShare),
      peg: round(peg)
    },
    support: {
      listedShares: shares,
      salesPerShare: round(salesPerShare),
      tangibleBookPerShare: round(tangibleBookPerShare),
      netIncomeGrowthPct: round(growthPct),
      tangibleEquity: round(tangibleEquity, 0)
    },
    caveats: [
      "APS는 이 버전에서 총자산/상장주식수(Assets Per Share)로 정의합니다.",
      "PTBR은 자본에서 무형자산과 영업권을 차감한 유형자본을 이용한 근사치입니다.",
      "PEG는 비교 가능한 과거 EPS 성장률이 없을 때 순이익 성장률을 EPS 성장률 대용치로 사용하는 근사값입니다. 성장률이 0 이하이면 PEG를 표시하지 않습니다.",
      "PER·PBR·EPS·BPS는 KIS 제공값을 우선 사용하고, 누락 시 OpenDART 재무와 상장주식수로 보완합니다."
    ]
  };
}
