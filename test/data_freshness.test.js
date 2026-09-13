import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateFreshness } from '../src/services/data_freshness.js';
import { createSafeDataPipeline } from '../src/services/safe_data_pipeline.js';

process.env.KSTOCK_LIVE_TRADING_ENABLED = 'false';
process.env.KSTOCK_AI_MODE = 'mock';

const NOW = Date.parse('2026-09-14T00:00:00Z');

function forbidExternalFetch() {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('External request forbidden during freshness validation'); };
  return () => { globalThis.fetch = originalFetch; };
}

test('fresh quote and financial timestamps pass with deterministic ages', () => {
  const result = validateFreshness({
    quoteTimestamp: '2026-09-13T23:55:00Z',
    financialTimestamp: '2026-03-31T00:00:00Z',
    now: NOW,
  });
  assert.equal(result.quoteAgeMs, 5 * 60 * 1000);
  assert.ok(result.financialAgeMs > 0);
});

test('stale quote fails closed', () => {
  assert.throws(() => validateFreshness({
    quoteTimestamp: '2026-09-13T23:00:00Z',
    financialTimestamp: '2026-03-31T00:00:00Z',
    now: NOW,
  }), /quote data is stale/);
});

test('stale financial data fails closed', () => {
  assert.throws(() => validateFreshness({
    quoteTimestamp: '2026-09-13T23:55:00Z',
    financialTimestamp: '2024-01-01T00:00:00Z',
    now: NOW,
  }), /financial data is stale/);
});

test('timestamps too far apart fail closed', () => {
  assert.throws(() => validateFreshness({
    quoteTimestamp: '2026-09-13T23:55:00Z',
    financialTimestamp: '2026-01-01T00:00:00Z',
    now: NOW,
    maxFinancialAgeMs: 400 * 24 * 60 * 60 * 1000,
    maxSkewMs: 100 * 24 * 60 * 60 * 1000,
  }), /data timestamps are too far apart/);
});

test('future and malformed timestamps fail closed', () => {
  assert.throws(() => validateFreshness({
    quoteTimestamp: '2026-09-14T00:10:00Z',
    financialTimestamp: '2026-03-31T00:00:00Z',
    now: NOW,
  }), /quote timestamp is in the future/);

  assert.throws(() => validateFreshness({
    quoteTimestamp: 'not-a-date',
    financialTimestamp: '2026-03-31T00:00:00Z',
    now: NOW,
  }), /quote timestamp is invalid/);
});

test('pipeline blocks stale source data and never uses external fetch', async () => {
  const restore = forbidExternalFetch();
  const pipeline = createSafeDataPipeline({
    now: () => NOW,
    kisRequest: async () => ({
      rt_cd: '0',
      output: { stck_prpr: '70000', acml_vol: '1000', timestamp: '2026-09-13T22:00:00Z' },
    }),
    dartRequest: async () => ({
      status: '000',
      list: [{ account_nm: '매출액', thstrm_amount: '1000', rcept_dt: '2026-03-31T00:00:00Z' }],
    }),
  });

  try {
    await assert.rejects(
      pipeline.loadSnapshot({ symbol: '005930', corpCode: '00126380', year: '2026' }),
      /quote data is stale/,
    );
  } finally {
    restore();
  }
});

test('pipeline accepts fresh aligned stub data and reports freshness metadata', async () => {
  const pipeline = createSafeDataPipeline({
    now: () => NOW,
    freshness: { maxQuoteAgeMs: 10 * 60 * 1000 },
    kisRequest: async () => ({
      rt_cd: '0',
      output: { stck_prpr: '70,000', acml_vol: '1,000', timestamp: '2026-09-13T23:55:00Z' },
    }),
    dartRequest: async () => ({
      status: '000',
      list: [{ account_nm: '매출액', thstrm_amount: '1,000', rcept_dt: '2026-03-31T00:00:00Z' }],
    }),
  });

  const result = await pipeline.loadSnapshot({ symbol: '005930', corpCode: '00126380', year: '2026' });
  assert.equal(result.quote.price, 70000);
  assert.equal(result.freshness.quoteAgeMs, 5 * 60 * 1000);
  assert.equal(result.liveTradingEnabled, false);
});
