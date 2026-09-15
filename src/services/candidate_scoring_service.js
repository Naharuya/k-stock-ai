const clamp = (x, a = 0, b = 100) => Math.max(a, Math.min(b, Math.round(Number(x) || 0)));
const finite = (x) => x !== null && x !== undefined && x !== "" && Number.isFinite(Number(x));
const uniq = (xs) => [...new Set((xs || []).filter(Boolean))];

export function masterQuality(row) {
  const flags = [];
  let score = 100;
  const roe = finite(row.roe) ? Number(row.roe) : null;
  if (roe === null) { score -= 18; flags.push("MASTER_ROE_MISSING"); }
  else if (Math.abs(roe) >= 80) { score -= 20; flags.push("EXTREME_ROE_RECHECK"); }
  else if (Math.abs(roe) >= 50) { score -= 10; flags.push("HIGH_ROE_RECHECK"); }
  if (!finite(row.marketCapEok) || Number(row.marketCapEok) <= 0) { score -= 18; flags.push("MARKET_CAP_MISSING"); }
  if (!finite(row.prevVolume) || Number(row.prevVolume) < 0) { score -= 10; flags.push("VOLUME_MISSING"); }
  if (!row.industryLarge || row.industryLarge === "미분류") { score -= 8; flags.push("SECTOR_MISSING"); }
  return { score: clamp(score), flags };
}

export function quoteQuality(row) {
  const q = row.quote || {};
  const flags = [];
  let score = 100;
  if (!finite(q.price) || Number(q.price) <= 0) { score -= 35; flags.push("PRICE_MISSING"); }
  if (!finite(q.tradingValue) || Number(q.tradingValue) <= 0) { score -= 15; flags.push("TRADING_VALUE_MISSING"); }
  if (!finite(q.per) || Number(q.per) <= 0) { score -= 10; flags.push("PER_UNAVAILABLE"); }
  if (!finite(q.pbr) || Number(q.pbr) <= 0) { score -= 10; flags.push("PBR_UNAVAILABLE"); }
  if (!finite(q.week52High) || Number(q.week52High) <= 0) { score -= 5; flags.push("W52_HIGH_MISSING"); }
  return { score: clamp(score), flags };
}

export function styleTags(row) {
  const q = row.quote || {};
  const tags = [];
  if (finite(row.roe) && Number(row.roe) >= 15 && Number(row.roe) < 80) tags.push("QUALITY");
  if (finite(q.per) && Number(q.per) > 0 && Number(q.per) <= 12) tags.push("VALUE");
  if (finite(q.pbr) && Number(q.pbr) > 0 && Number(q.pbr) <= 1.2) tags.push("ASSET_VALUE");
  if (finite(q.changeRatePct) && Number(q.changeRatePct) >= 1) tags.push("MOMENTUM");
  if (finite(q.week52High) && finite(q.price) && Number(q.week52High) > 0 && Number(q.price) / Number(q.week52High) >= 0.88) tags.push("NEAR_52W_HIGH");
  if (finite(q.tradingValue) && Number(q.tradingValue) >= 50_000_000_000) tags.push("LIQUID");
  return uniq(tags).slice(0, 5);
}

export function lightCandidate(row) {
  const mq = masterQuality(row);
  const qq = quoteQuality(row);
  const masterNorm = clamp((Number(row.preScore ?? row.score ?? 0) / 85) * 100);
  const liveRaw = row.live ? Number(row.live.valuation || 0) + Number(row.live.momentum || 0) : null;
  const liveNorm = finite(liveRaw) ? clamp((liveRaw / 45) * 100) : 45;
  const quality = clamp(mq.score * 0.6 + qq.score * 0.4);
  const qualityPenalty = mq.flags.includes("EXTREME_ROE_RECHECK") ? 8 : mq.flags.includes("HIGH_ROE_RECHECK") ? 4 : 0;
  const lightScore = clamp(masterNorm * 0.50 + liveNorm * 0.35 + quality * 0.15 - qualityPenalty);
  const reasons = uniq([
    ...(row.sectorRelative?.notes || []),
    finite(row.roe) && Number(row.roe) >= 15 && Number(row.roe) < 80 ? `ROE ${Number(row.roe).toFixed(1)}%` : null,
    row.live?.notes?.[0] || null,
    finite(row.quote?.per) ? `PER ${Number(row.quote.per).toFixed(1)}` : null,
    finite(row.quote?.pbr) ? `PBR ${Number(row.quote.pbr).toFixed(2)}` : null
  ]).slice(0, 5);
  return {
    code: row.code, name: row.name, exchange: row.exchange, exchangeName: row.exchangeName,
    industryLarge: row.industryLarge, masterScore: Math.round(Number(row.preScore ?? row.score ?? 0)),
    lightScore, finalScore: lightScore, roe: row.roe, marketCapEok: row.marketCapEok,
    quote: row.quote || null, styleTags: styleTags(row),
    quality: { master: mq, quote: qq, flags: uniq([...mq.flags, ...qq.flags]) },
    validationLevel: row.quote ? "LIGHT" : "MASTER_ONLY",
    validationStatus: row.quote ? "LIGHT_VALIDATED" : "MASTER_ONLY",
    reasons, committee: null, deep: null
  };
}

export function applyDeep(candidate, analysis) {
  const committee = analysis?.committee || {};
  const committeeScore = finite(committee.totalScore) ? Number(committee.totalScore) : null;
  const hardStop = committee.hardStop === true;
  const complete = analysis?.completeness?.percent === 100 && committeeScore !== null;
  let finalScore = candidate.lightScore;
  if (complete) finalScore = clamp(candidate.lightScore * 0.40 + committeeScore * 0.60);
  if (hardStop) finalScore = Math.min(finalScore, 39);
  const dartRoe = analysis?.indicators?.values?.roePct;
  const roeMismatch = finite(candidate.roe) && finite(dartRoe) && Math.abs(Number(candidate.roe) - Number(dartRoe)) >= 20;
  const flags = uniq([...candidate.quality.flags, roeMismatch ? "MASTER_DART_ROE_MISMATCH" : null, hardStop ? "RISK_HARD_STOP" : null]);
  return {
    ...candidate, finalScore,
    validationLevel: complete ? "DEEP" : "PARTIAL_DEEP",
    validationStatus: hardStop ? "REJECTED_BY_RISK" : complete ? "DEEP_VALIDATED" : "DEEP_PARTIAL",
    quality: { ...candidate.quality, flags, roeCrossCheck: { master: candidate.roe ?? null, dart: finite(dartRoe) ? Number(dartRoe) : null, mismatch: roeMismatch } },
    committee: {
      status: committee.status || null, labelKo: committee.labelKo || null, score: committeeScore,
      confidence: committee.confidence ?? null, hardStop, hardStopReason: committee.hardStopReason || null,
      positiveReasons: committee.positiveReasons || [], negativeReasons: committee.negativeReasons || []
    },
    deep: {
      analyzedAt: analysis?.analyzedAt || null, businessYear: analysis?.dart?.query?.effectiveBusinessYear || null,
      completeness: analysis?.completeness?.percent ?? null, flowScore: analysis?.scores?.flow?.score ?? null,
      technicalScore: analysis?.scores?.technical?.score ?? null, marketScore: analysis?.scores?.market?.score ?? null,
      newsScore: analysis?.scores?.news?.score ?? null,
      riskLevel: analysis?.dart?.agents?.risk?.riskLevel || null,
      riskScore: analysis?.dart?.agents?.risk?.riskScore ?? null,
      criticalRisk: analysis?.dart?.agents?.risk?.criticalRisk === true,
      excludeSuggested: analysis?.dart?.agents?.risk?.excludeSuggested === true,
      riskReasons: analysis?.dart?.agents?.risk?.risks || [],
      redFlags: analysis?.dart?.agents?.risk?.redFlags || [],
      dartImpact: analysis?.dart?.agents?.dart?.impact || null,
      dartImportant: analysis?.dart?.agents?.dart?.important === true,
      newsHighRiskEvents: analysis?.scores?.news?.highRiskEvents || analysis?.newsData?.highRiskEvents || [],
      committeeStatus: committee.status || null,
      committeeScore,
      riskHardStop: hardStop,
      hardStopReason: committee.hardStopReason || null
    }
  };
}

export function finalState(candidate) {
  if (candidate.committee?.hardStop) return "RISK_EXCLUDED";
  if (candidate.validationLevel === "DEEP") {
    if (["INTEREST", "CONDITION_MET"].includes(candidate.committee?.status)) return "VERIFIED_INTEREST";
    if (candidate.committee?.status === "WATCH") return "VERIFIED_WATCH";
    if (candidate.committee?.status === "RISK") return "VERIFIED_RISK";
  }
  if (candidate.validationLevel === "LIGHT") return "LIGHT_CANDIDATE";
  return "UNVERIFIED_CANDIDATE";
}

export function buildCandidatesFromRows(rows, { top = 20 } = {}) {
  const candidates = rows.map(lightCandidate).map((x) => ({ ...x, finalState: finalState(x) }));
  return candidates.sort((a, b) => b.finalScore - a.finalScore).slice(0, top);
}
