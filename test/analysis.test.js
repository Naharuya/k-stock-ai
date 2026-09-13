import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeStock } from '../src/ai_router.js';
import { SAMPLE_STOCK } from '../src/data/sample_stock.js';
import { applyRiskHardStop } from '../src/utils/risk_hard_stop.js';

process.env.KSTOCK_LIVE_TRADING_ENABLED = 'false';
process.env.KSTOCK_AI_MODE = 'mock';

test('sample analysis runs in mock mode without network or live trading', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('External request forbidden in mock validation'); };
  try {
    const result = await analyzeStock(structuredClone(SAMPLE_STOCK));
    assert.equal(result.mode, 'mock');
    assert.equal(result.symbol, SAMPLE_STOCK.symbol);
    assert.equal(process.env.KSTOCK_LIVE_TRADING_ENABLED, 'false');
    assert.equal(Object.keys(result.agents).length, 8);
    assert.ok(Number.isFinite(result.committee.totalScore));
    assert.equal(typeof result.committee.riskOverride, 'boolean');
  } finally { globalThis.fetch = originalFetch; }
});

test('missing symbol/name fail before analysis', async () => {
  for (const input of [undefined, {}, { symbol: 'fixture' }, { name: 'fixture' }]) {
    await assert.rejects(analyzeStock(input), /symbol and name are required/);
  }
});

for (const [label, risk, dart] of [
  ['critical risk', { criticalRisk: true }, {}],
  ['very high risk', { riskLevel: 'VERY_HIGH' }, {}],
  ['exclude suggested', { excludeSuggested: true }, {}],
  ['critical disclosure', {}, { impact: 'VERY_NEGATIVE', important: true }],
]) {
  test(`${label} overrides a favorable committee result`, () => {
    const committee = { status: 'WATCH', totalScore: 95 };
    const result = applyRiskHardStop({ committee, risk, dart });
    assert.equal(result.status, 'EXCLUDE');
    assert.equal(result.riskOverride, true);
    assert.equal(committee.status, 'WATCH');
  });
}
test('noncritical data keeps the original committee decision', () => {
  const result = applyRiskHardStop({ committee: { status: 'WAIT', totalScore: 50 }, risk: {}, dart: {} });
  assert.equal(result.status, 'WAIT');
  assert.equal(result.riskOverride, false);
});
