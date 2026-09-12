import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import vm from "node:vm";
import { createEntrySnapshot, evaluateExitPosition } from "./services/entry_exit_service.js";
import { buildInvestmentCommittee } from "./services/investment_committee_service.js";
import { analyzeNewsItems, classifyNewsRisk } from "./services/news_analysis_service.js";
import { buildAnalysisCompleteness } from "./services/full_analysis_service.js";
import { scoreTechnical, scoreValuation } from "./services/market_score_service.js";

function analysis() {
  return {
    stockCode: "005930", corpName: "Sample",
    committee: { status: "INTEREST", totalScore: 78 },
    marketData: { quote: { price: 100000 }, technicalMetrics: { trend: "UPTREND" },
      flowMetrics: { combinedSmartMoneyQty5d: 10 }, marketContext: { score: { regime: "RISK_ON" } } },
    dart: { agents: { risk: { riskScore: 20 } } },
    scores: { news: { sentiment: "NEUTRAL" } }
  };
}
function committeeInput() {
  const ready = () => ({ score: 18, max: 20, status: "READY" });
  return { dart: { financials: { validation: { ok: true } }, disclosures: {},
    scorecard: { score: 70, maxScore: 80, status: "PARTIAL_DART_ONLY" },
    agents: { risk: { riskScore: 20 } } },
    quote: { price: 100000 }, valuation: ready(), technical: ready(), flow: ready(),
    market: ready(), news: { ...ready(), highRiskEvents: [] }, completeness: { percent: 100 } };
}
test("Exit holds only complete data and preserves hard stops when data is missing", () => {
  const original = analysis();
  const entry = createEntrySnapshot(original);
  assert.equal(evaluateExitPosition({ entry, currentAnalysis: original }).status, "HOLD");
  for (const remove of [
    a => { delete a.marketData.quote; }, a => { a.committee.totalScore = null; },
    a => { delete a.dart; }, a => { delete a.marketData.technicalMetrics; },
    a => { delete a.marketData.flowMetrics; }, a => { delete a.scores; },
    a => { a.committee.newsReviewRequired = true; },
    a => { a.completeness = { percent: 95 }; }
  ]) {
    const current = analysis(); remove(current);
    const result = evaluateExitPosition({ entry, currentAnalysis: current });
    assert.equal(result.status, "DATA_INCOMPLETE");
    assert.equal(result.exitPressure, null);
    assert.ok(result.dataQuality.missingFields.length);
  }
  const incomplete = { stockCode: entry.stockCode, committee: { hardStop: true } };
  const result = evaluateExitPosition({ entry, currentAnalysis: incomplete });
  assert.equal(result.status, "RISK_EXIT_REVIEW");
  assert.equal(result.exitPressure, 100);
  assert.equal(result.dataQuality.complete, false);
  assert.notEqual(createEntrySnapshot(original).snapshotId, entry.snapshotId);
});
test("Committee does not score missing, invalid or unavailable components", () => {
  assert.equal(buildInvestmentCommittee({ completeness: { percent: 100 } }).totalScore, null);
  for (const value of [null, undefined, "", " ", false, [], {}, NaN, Infinity, -1, 999]) {
    for (const key of ["fundamental", "valuation", "technical", "flow", "market", "news", "risk"]) {
      const input = committeeInput();
      if (key === "fundamental") input.dart.scorecard.score = value;
      else if (key === "risk") input.dart.agents.risk.riskScore = value;
      else input[key].score = value;
      const result = buildInvestmentCommittee(input);
      assert.equal(result.status, "DATA_INCOMPLETE", key + ":" + String(value));
      assert.equal(result.totalScore, null);
      assert.equal(result.components[key].weighted, null);
      assert.ok(result.missingComponents.includes(key));
    }
  }
  const zero = committeeInput(); zero.valuation.score = 0;
  assert.equal(buildInvestmentCommittee(zero).components.valuation.weighted, 0);
  assert.notEqual(buildInvestmentCommittee(zero).totalScore, null);
  const partial = committeeInput(); partial.flow.status = "PARTIAL_HISTORY";
  assert.equal(buildInvestmentCommittee(partial).status, "DATA_INCOMPLETE");
  const hard = committeeInput(); hard.news.score = null; hard.dart.agents.risk.criticalRisk = true;
  assert.equal(buildInvestmentCommittee(hard).status, "RISK");
  assert.equal(buildInvestmentCommittee(hard).hardStop, true);
});
test("Completeness reflects actual inputs, including history and missing valuation", () => {
  const input = committeeInput();
  assert.equal(buildAnalysisCompleteness(input).percent, 100);
  input.flow.status = "INSUFFICIENT_HISTORY";
  input.dart.financials.validation.ok = false;
  input.quote.price = null;
  const result = buildAnalysisCompleteness(input);
  assert.ok(result.percent < 100);
  assert.ok(result.pending.includes("flow"));
  assert.ok(result.pending.includes("financials"));
  assert.ok(result.pending.includes("price"));
  assert.equal(scoreValuation({ per: null, pbr: null }).score, null);
  assert.equal(scoreTechnical({ trend: "UNKNOWN", rsi14: null }).score, null);
});
test("News distinguishes resolved, denied, uncertain and mixed events", () => {
  for (const title of ["거래정지 해제", "거래정지 조치 해제", "상장폐지 결정 취소", "횡령 혐의 부인", "배임 사실무근"]) {
    const news = analyzeNewsItems({ items: [{ title, publishedAt: new Date().toISOString() }] });
    assert.equal(news.highRiskEvents.length, 0, title);
    assert.ok(news.contextualRiskEvents.length, title);
    assert.equal(buildInvestmentCommittee({ ...committeeInput(), news }).hardStop, false);
  }
  for (const title of ["거래정지 해제 검토", "거래정지 해제 불발", "횡령 발생", "타사 거래정지에 동종업계 주가 하락", "횡령 혐의 부인에도 불구 수사 확대"]) {
    const news = analyzeNewsItems({ items: [{ title, publishedAt: new Date().toISOString() }] });
    assert.ok(news.highRiskEvents.length, title);
    const result = buildInvestmentCommittee({ ...committeeInput(), news });
    assert.equal(result.hardStop, false, title);
    assert.equal(result.newsReviewRequired, true, title);
    assert.ok(!["INTEREST", "CONDITION_MET"].includes(result.status));
  }
  const contexts = classifyNewsRisk("거래정지 해제, 횡령 발생");
  assert.deepEqual(contexts.map(x => x.status), ["RESOLVED", "REVIEW_REQUIRED"]);
  const news = analyzeNewsItems({ items: [{ title: "횡령 발생" }] });
  const input = committeeInput(); input.news = news;
  input.dart.agents.dart = { important: true, impact: "VERY_NEGATIVE" };
  assert.equal(buildInvestmentCommittee(input).hardStop, true);
});

const source = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
function portfolioHarness() {
  let stored = ["005930", "000660"].map(stockCode => ({ entry: { stockCode, snapshotId: randomUUID(), corpName: stockCode }, lastEvaluation: null }));
  const requests = [];
  const context = vm.createContext({
    crypto: { randomUUID }, loadPositions: () => structuredClone(stored),
    savePositions: rows => { stored = structuredClone(rows); },
    document: { querySelector: () => null }, $: () => ({ value: "2025" }),
    renderPortfolio() {}, showStatus() {}, pct: String,
    fetch: () => new Promise(resolve => requests.push(resolve))
  });
  vm.runInContext(source.match(/async function evaluatePosition\(index\)\{[\s\S]*?\n\}/)[0], context);
  return { run: index => context.evaluatePosition(index), read: () => stored,
    write: rows => { stored = structuredClone(rows); },
    finish: (index, score) => requests[index]({ ok: true, json: async () => ({
      success: true, result: { evaluation: { status: "HOLD", exitPressure: score, pnlPct: null }, currentAnalysis: {} }
    }) })
  };
}
test("Portfolio: deleting during evaluation does not restore a position", async () => {
  const h = portfolioHarness(); const pending = h.run(0);
  h.write(h.read().slice(1)); h.finish(0, 10); await pending;
  assert.deepEqual(h.read().map(x => x.entry.stockCode), ["000660"]);
});
test("Portfolio: concurrent results preserve each other and new registrations", async () => {
  const h = portfolioHarness(); const a = h.run(0); const b = h.run(1);
  h.write([...h.read(), { entry: { stockCode: "035420", snapshotId: randomUUID() } }]);
  h.finish(1, 20); await b; h.finish(0, 10); await a;
  assert.equal(h.read().length, 3);
  assert.equal(h.read()[0].lastEvaluation.exitPressure, 10);
  assert.equal(h.read()[1].lastEvaluation.exitPressure, 20);
});
test("Portfolio: re-registration rejects stale evaluation", async () => {
  const h = portfolioHarness(); const pending = h.run(0);
  const rows = h.read(); rows[0] = { entry: { ...rows[0].entry, snapshotId: randomUUID() }, lastEvaluation: null };
  h.write(rows); h.finish(0, 10); await pending;
  assert.equal(h.read()[0].lastEvaluation, null);
});
test("Portfolio: most recent request wins regardless of response order", async () => {
  const h = portfolioHarness(); const first = h.run(0); const second = h.run(0);
  h.finish(1, 20); await second; h.finish(0, 10); await first;
  assert.equal(h.read()[0].lastEvaluation.exitPressure, 20);
});
test("Browser numeric display preserves zero but not missing values", () => {
  const number = vm.runInNewContext("(" + source.match(/function n\(v, fallback=.*?\n/)[0] + ")");
  for (const value of [null, undefined, "", " ", false]) assert.equal(number(value), "-");
  assert.equal(number(0), 0);
});
