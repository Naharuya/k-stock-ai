import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertSafeKStockV2Environment,
  calculateCandidateScore,
  isD2Eligible,
  selectCandidates,
} from '../src/v2/scoring.js';

test('v2 scoring keeps output in 0..100 and applies risk penalty', () => {
  const score = calculateCandidateScore({
    capitalAction: 100,
    actorCredibility: 100,
    consensus: 100,
    mediaSignal: 100,
    fundamental: 100,
    valuation: 100,
    marketFlow: 100,
    sentiment: 100,
    dataFreshness: 100,
    riskPenalty: 15,
  });
  assert.equal(score, 85);
});

test('v2 ranking returns KR 15 and Global 20 maximum', () => {
  const candidates = [];
  for (let i = 0; i < 30; i++) {
    candidates.push({ ticker: `KR${i}`, market: 'KR', signals: { capitalAction: i } });
    candidates.push({ ticker: `US${i}`, market: 'GLOBAL', signals: { capitalAction: i } });
  }
  assert.equal(selectCandidates(candidates, 'KR').length, 15);
  assert.equal(selectCandidates(candidates, 'GLOBAL').length, 20);
});

test('v2 refuses live trading and broker order execution', () => {
  assert.throws(() => assertSafeKStockV2Environment({ KSTOCK_LIVE_TRADING_ENABLED: 'true' }), /live trading/);
  assert.throws(() => assertSafeKStockV2Environment({ KSTOCK_BROKER_ENABLED: 'true' }), /broker/);
  assert.equal(assertSafeKStockV2Environment({ KSTOCK_BROKER_ENABLED: 'false', KSTOCK_LIVE_TRADING_ENABLED: 'false' }), true);
});

test('v2 D-2 eligibility uses public observation cutoff', () => {
  assert.equal(isD2Eligible('2026-09-27T12:00:00.000Z', '2026-09-29T00:00:00.000Z'), true);
  assert.equal(isD2Eligible('2026-09-28T00:00:00.000Z', '2026-09-29T00:00:00.000Z'), false);
});
