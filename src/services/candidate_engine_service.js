import { runScreener } from "./screener_service.js";
import { analyzeStockWithMarketData } from "./full_analysis_service.js";
import { analyzeMarketContext } from "./market_context_service.js";
import { getDomesticQuote } from "./kis_service.js";
import { lightCandidate, applyDeep, finalState, buildCandidatesFromRows } from "./candidate_scoring_service.js";
import { rankCandidatesForOperationalView, selectDiversifiedCandidates } from "./candidate_rank_service.js";

const uniq = (xs) => [...new Set((xs || []).filter(Boolean))];
export { buildCandidatesFromRows };


export async function runDailyCandidateEngine({
  exchange = "all",
  top = 20,
  candidatePool = 60,
  quoteLimit = 15,
  deepLimit = 3,
  businessYear = String(new Date().getFullYear()),
  refresh = false
} = {}) {
  const poolN = Math.max(top, Math.min(Number(candidatePool) || 60, 100));
  const quoteN = Math.max(0, Math.min(Number(quoteLimit) || 0, 30, poolN));
  const deepN = Math.max(0, Math.min(Number(deepLimit) || 0, 5, quoteN));
  // Stage 1: master-only screening. Quote enrichment is handled here so the
  // candidate pool cannot lose enriched rows after screener re-sorting.
  const screen = await runScreener({ exchange, top: poolN, enrich: 0, refresh });
  const candidateRows = screen.top.map((row) => ({ ...row }));
  const quoteErrors = [];
  for (let i = 0; i < Math.min(quoteN, candidateRows.length); i += 1) {
    const row = candidateRows[i];
    try {
      const quote = await getDomesticQuote(row.code);
      candidateRows[i] = { ...row, quote, status: "QUOTE_VALIDATED" };
    } catch (error) {
      quoteErrors.push({ code: row.code, name: row.name, message: error.message });
      candidateRows[i] = { ...row, status: "QUOTE_ERROR", quoteError: error.message };
    }
  }
  let candidates = candidateRows.map(lightCandidate);

  // Deep validation should target the strongest quote-validated candidates,
  // not merely the original master-order rows. Quote-validated rows are
  // preferred, then ranked by the light-stage score.
  candidates.sort((a, b) => {
    const qa = a.validationLevel === "LIGHT" ? 1 : 0;
    const qb = b.validationLevel === "LIGHT" ? 1 : 0;
    if (qa !== qb) return qb - qa;
    return b.finalScore - a.finalScore;
  });

  let sharedMarketContext = null;
  let sharedMarketError = null;
  if (deepN > 0) {
    try { sharedMarketContext = await analyzeMarketContext(); }
    catch (error) { sharedMarketError = error.message; }
  }

  const deepErrors = [];
  for (let i = 0; i < Math.min(deepN, candidates.length); i += 1) {
    const c = candidates[i];
    try {
      const analysis = await analyzeStockWithMarketData({
        stockCode: c.code, businessYear, prefetchedQuote: c.quote, sharedMarketContext
      });
      candidates[i] = applyDeep(c, analysis);
    } catch (error) {
      deepErrors.push({ code: c.code, name: c.name, message: error.message });
      candidates[i] = {
        ...c, validationLevel: "DEEP_ERROR", validationStatus: "DEEP_ERROR",
        quality: { ...c.quality, flags: uniq([...c.quality.flags, "DEEP_VALIDATION_FAILED"]) },
        deep: { error: error.message }
      };
    }
  }

  candidates = candidates.map((x) => ({ ...x, finalState: finalState(x) }));

  // Validation depth is a confidence tier, not a return forecast. Deep-verified
  // candidates that survived Risk/Committee are surfaced before LIGHT/MASTER.
  candidates = rankCandidatesForOperationalView(candidates);
  const diversified = selectDiversifiedCandidates(candidates, { top, maxPerSector: 3 });
  const selected = diversified.selected;
  const rejected = candidates.filter((x) => ["RISK_EXCLUDED", "VERIFIED_RISK"].includes(x.finalState));
  const verificationSummary = {
    deepVerified: candidates.filter((x) => x.validationLevel === "DEEP").length,
    selectedDeepVerified: selected.filter((x) => x.validationLevel === "DEEP").length,
    verifiedInterest: candidates.filter((x) => x.finalState === "VERIFIED_INTEREST").length,
    verifiedWatch: candidates.filter((x) => x.finalState === "VERIFIED_WATCH").length,
    verifiedRisk: candidates.filter((x) => x.finalState === "VERIFIED_RISK").length,
    hardStopExcluded: candidates.filter((x) => x.finalState === "RISK_EXCLUDED").length,
    lightValidated: candidates.filter((x) => x.finalState === "LIGHT_CANDIDATE").length,
    masterOnly: candidates.filter((x) => x.finalState === "UNVERIFIED_CANDIDATE").length
  };

  return {
    ok: selected.length > 0,
    date: new Date().toISOString().slice(0, 10),
    label: "오늘의 관심종목 후보",
    recommendation: false,
    universe: screen.universe,
    pipeline: {
      scanned: screen.scanned, eligibleAfterHardRisk: screen.eligible,
      excludedMasterHardRisk: screen.excludedHardRisk, candidatePool: candidateRows.length,
      quoteRequested: Math.min(quoteN, candidateRows.length),
      quoteValidated: candidateRows.filter((x) => x.quote).length,
      quoteFailed: quoteErrors.length,
      deepRequested: deepN,
      deepCompleted: candidates.filter((x) => x.validationLevel === "DEEP").length,
      deepFailed: deepErrors.length,
      sharedMarketContext: sharedMarketContext ? "READY" : deepN > 0 ? "ERROR" : "SKIPPED"
    },
    verificationSummary,
    ranking: { model: "RANKING_QUALITY_V1", maxPerSector: diversified.maxPerSector, capApplied: diversified.capApplied, sectorCounts: diversified.sectorCounts },
    top: selected, rejected: rejected.slice(0, 10),
    errors: { quote: quoteErrors, sharedMarket: sharedMarketError, deep: deepErrors },
    caveats: [
      "관심후보는 매수추천이 아닙니다.",
      "마스터 ROE가 비정상적으로 높으면 OpenDART 재검증 전까지 품질 플래그가 유지됩니다.",
      "정밀검증을 통과한 종목만 Investment Committee 상태를 함께 표시합니다.",
      "자동주문·자동매매 기능은 포함하지 않습니다."
    ]
  };
}
