const finite = (x) => x !== null && x !== undefined && x !== "" && Number.isFinite(Number(x));
const clamp = (x, a = 0, b = 100) => Math.max(a, Math.min(b, Number(x) || 0));
const round1 = (x) => Math.round((Number(x) || 0) * 10) / 10;

function roeScore(roe) {
  if (!finite(roe)) return 45;
  const x = Number(roe);
  if (x <= 0) return 20;
  if (x < 5) return 45;
  if (x < 10) return 65;
  if (x < 20) return 85;
  if (x <= 35) return 95;
  if (x <= 50) return 85;
  if (x <= 65) return 70;
  return 55;
}

function perScore(per) {
  if (!finite(per) || Number(per) <= 0) return 45;
  const x = Number(per);
  if (x <= 6) return 88;
  if (x <= 12) return 100;
  if (x <= 18) return 90;
  if (x <= 25) return 78;
  if (x <= 40) return 60;
  if (x <= 60) return 45;
  return 28;
}

function pbrScore(pbr) {
  if (!finite(pbr) || Number(pbr) <= 0) return 45;
  const x = Number(pbr);
  if (x <= 0.8) return 100;
  if (x <= 1.5) return 92;
  if (x <= 3) return 78;
  if (x <= 5) return 62;
  if (x <= 8) return 45;
  return 28;
}

function momentumScore(c) {
  const q = c.quote || {};
  let parts = [];
  if (finite(q.week52High) && finite(q.price) && Number(q.week52High) > 0) {
    const r = Number(q.price) / Number(q.week52High);
    parts.push(clamp(35 + r * 65));
  }
  if (finite(q.changeRatePct)) {
    const d = Number(q.changeRatePct);
    // Reward constructive momentum, but avoid treating one-day spikes as automatically superior.
    let s = 50 + Math.max(-15, Math.min(15, d)) * 2.2;
    if (d > 10) s -= (d - 10) * 2;
    parts.push(clamp(s));
  }
  if (c.styleTags?.includes("MOMENTUM")) parts.push(78);
  if (c.styleTags?.includes("NEAR_52W_HIGH")) parts.push(82);
  return parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 45;
}

function liquidityScore(c) {
  const v = Number(c.quote?.tradingValue || 0);
  if (!finite(v) || v <= 0) return 35;
  if (v >= 200_000_000_000) return 100;
  if (v >= 100_000_000_000) return 92;
  if (v >= 50_000_000_000) return 84;
  if (v >= 20_000_000_000) return 74;
  if (v >= 10_000_000_000) return 64;
  if (v >= 3_000_000_000) return 52;
  return 40;
}

function riskScore(c) {
  if (["RISK_EXCLUDED", "VERIFIED_RISK"].includes(c.finalState)) return 10;
  let s = 92;
  const flags = c.quality?.flags || [];
  if (flags.includes("EXTREME_ROE_RECHECK")) s -= 22;
  if (flags.includes("HIGH_ROE_RECHECK")) s -= 10;
  if (flags.includes("MASTER_DART_ROE_MISMATCH")) s -= 14;
  if (flags.includes("DEEP_VALIDATION_FAILED")) s -= 20;
  const dr = Number(c.deep?.riskScore);
  if (finite(dr)) s -= clamp(dr, 0, 100) * 0.45;
  if (c.committee?.status === "WATCH") s -= 8;
  if (c.committee?.hardStop) s = 0;
  return clamp(s);
}

function confidenceScore(c) {
  if (c.validationLevel === "DEEP") return 100;
  if (c.validationLevel === "LIGHT") return 75;
  if (c.validationLevel === "PARTIAL_DEEP") return 70;
  return 45;
}

export function calculateRankingScore(c) {
  const fundamental = roeScore(c.roe);
  const valuation = (perScore(c.quote?.per) + pbrScore(c.quote?.pbr)) / 2;
  const momentum = momentumScore(c);
  const liquidity = liquidityScore(c);
  const risk = riskScore(c);
  const confidence = confidenceScore(c);
  let score = fundamental * 0.25 + valuation * 0.25 + momentum * 0.20 + liquidity * 0.10 + risk * 0.15 + confidence * 0.05;

  // Committee is an additional deep-validation opinion, not a separate trust tier.
  // It can move a deep-verified candidate up or down, but does not automatically put A above B.
  if (c.validationLevel === "DEEP" && finite(c.committee?.score)) {
    score = score * 0.85 + Number(c.committee.score) * 0.15;
  }
  if (["RISK_EXCLUDED", "VERIFIED_RISK"].includes(c.finalState)) score = Math.min(score, 39.9);

  return {
    rankingScore: round1(clamp(score)),
    rankingComponents: {
      fundamental: round1(fundamental), valuation: round1(valuation), momentum: round1(momentum),
      liquidity: round1(liquidity), risk: round1(risk), confidence: round1(confidence),
      committee: finite(c.committee?.score) ? Number(c.committee.score) : null
    }
  };
}

export function rankCandidatesForOperationalView(rows = []) {
  return rows.map((x) => ({ ...x, ...calculateRankingScore(x) })).sort((a, b) => {
    const ar = ["RISK_EXCLUDED", "VERIFIED_RISK"].includes(a.finalState) ? 1 : 0;
    const br = ["RISK_EXCLUDED", "VERIFIED_RISK"].includes(b.finalState) ? 1 : 0;
    if (ar !== br) return ar - br;
    const d = Number(b.rankingScore || 0) - Number(a.rankingScore || 0);
    if (Math.abs(d) > 0.0001) return d;
    return Number(b.finalScore || 0) - Number(a.finalScore || 0);
  });
}

export function selectDiversifiedCandidates(rows = [], { top = 20, maxPerSector = 3 } = {}) {
  const clean = rows.filter((x) => !["RISK_EXCLUDED", "VERIFIED_RISK"].includes(x.finalState));
  const chosen = [];
  const counts = new Map();
  const skipped = [];
  const sectorKey = (x) => String(x.industryLarge || "UNCLASSIFIED");

  for (const c of clean) {
    if (chosen.length >= top) break;
    const key = sectorKey(c);
    const n = counts.get(key) || 0;
    if (key !== "UNCLASSIFIED" && n >= maxPerSector) { skipped.push(c); continue; }
    chosen.push(c); counts.set(key, n + 1);
  }
  // Fill remaining slots without the cap so the engine still returns top N when the pool is concentrated.
  if (chosen.length < top) {
    for (const c of skipped) {
      if (chosen.length >= top) break;
      if (!chosen.some((x) => x.code === c.code)) chosen.push(c);
    }
  }
  return {
    selected: chosen,
    sectorCounts: Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1])),
    maxPerSector,
    capApplied: skipped.length > 0
  };
}
