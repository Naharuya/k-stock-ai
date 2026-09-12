import { createEntrySnapshot, evaluateExitPosition } from "./services/entry_exit_service.js";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

function mockAnalysis({ score = 78, price = 100000, hardStop = false, trend = "UPTREND", smart5 = 1000, riskScore = 25, regime = "NEUTRAL_MIXED", news = "NEUTRAL" } = {}) {
  return {
    stockCode: "005930",
    corpName: "테스트전자",
    analyzedAt: new Date().toISOString(),
    marketData: {
      quote: { price },
      technicalMetrics: { trend, rsi14: 58, distanceFromMa20Pct: trend === "DOWNTREND" ? -5 : 2 },
      flowMetrics: { combinedSmartMoneyQty5d: smart5, combinedSmartMoneyQty20d: smart5 * 2 },
      marketContext: { score: { regime } }
    },
    scores: { news: { sentiment: news } },
    dart: { agents: { risk: { riskScore } } },
    committee: {
      status: hardStop ? "RISK" : score >= 75 ? "CONDITION_MET" : score >= 60 ? "INTEREST" : "WATCH",
      totalScore: score,
      hardStop,
      hardStopReason: hardStop ? "CRITICAL_RISK" : null,
      positiveReasons: ["테스트 진입 논리"],
      invalidConditions: ["치명적 리스크 발생"],
      components: {
        fundamental: { raw: 20, max: 25 }, valuation: { raw: 12, max: 15 }, technical: { raw: 12, max: 15 },
        flow: { raw: 12, max: 15 }, market: { raw: 7, max: 10 }, news: { raw: 7, max: 10 }, risk: { raw: 80, max: 100 }
      }
    }
  };
}

const entryAnalysis = mockAnalysis();
const entry = createEntrySnapshot(entryAnalysis, { buyPrice: 100000, quantity: 3, stopLossPct: -7, takeProfitPct: 10 });
for (const missing of [null, undefined, "", "  ", false]) {
  const analysis = mockAnalysis({ score: null });
  analysis.committee.totalScore = missing;
  analysis.committee.components.technical.raw = missing;
  const snapshot = createEntrySnapshot(analysis);
  assert.equal(snapshot.thesis.committeeScore, null);
  assert.equal(snapshot.thesis.components.technical, null);
  const result = evaluateExitPosition({ entry, currentAnalysis: analysis });
  assert.equal(result.currentScore, null);
  assert.equal(result.scoreDelta, null);
  assert.equal(result.exitPressure, null);
  assert.equal(result.status, "DATA_INCOMPLETE");
}
for (const price of [null, undefined, "", "  ", false, 0, -1]) {
  const analysis = mockAnalysis();
  analysis.marketData.quote.price = price;
  const result = evaluateExitPosition({ entry, currentAnalysis: analysis });
  assert.equal(result.currentPrice, null);
  assert.equal(result.pnlPct, null);
  assert.equal(result.exitPressure, null);
  assert.equal(result.status, "DATA_INCOMPLETE");
  assert.throws(() => createEntrySnapshot(analysis), /buyPrice/);
}
assert.equal(createEntrySnapshot(mockAnalysis(), { buyPrice: null }).buyPrice, 100000);
assert.equal(createEntrySnapshot(mockAnalysis(), { buyPrice: "100000" }).buyPrice, 100000);
const appSource = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const pnlSource = appSource.match(/function positionPnl\(entry,last\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(pnlSource, "positionPnl must be available for browser regression checks");
const browserPnl = runInNewContext("(" + pnlSource + ")");
for (const price of [null, undefined, "", "  ", 0, -1]) {
  assert.equal(browserPnl(entry, { currentPrice: price }), null);
}
assert.equal(browserPnl(entry, null), null);
assert.equal(browserPnl(entry, { currentPrice: 104000 }), 4);
const hold = evaluateExitPosition({ entry, currentAnalysis: mockAnalysis({ score: 80, price: 104000, smart5: 500 }) });
const exit = evaluateExitPosition({ entry, currentAnalysis: mockAnalysis({ score: 48, price: 92000, trend: "DOWNTREND", smart5: -500, riskScore: 60, regime: "RISK_OFF", news: "NEGATIVE" }) });
const hard = evaluateExitPosition({ entry, currentAnalysis: mockAnalysis({ score: 35, price: 99000, hardStop: true }) });

if (hold.status !== "HOLD") throw new Error(`expected HOLD, got ${hold.status}`);
if (!['EXIT_REVIEW','RISK_EXIT_REVIEW'].includes(exit.status)) throw new Error(`expected exit review, got ${exit.status}`);
if (hard.status !== "RISK_EXIT_REVIEW" || hard.exitPressure !== 100) throw new Error("hard stop must force risk exit review");

console.log(JSON.stringify({ ok: true, entry: { buyPrice: entry.buyPrice, score: entry.thesis.committeeScore }, hold, exit, hard: { status: hard.status, exitPressure: hard.exitPressure } }, null, 2));
