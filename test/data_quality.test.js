import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateQuote, validateFinancials, validateSnapshot } from '../src/services/data_quality.js';
import { createSafeDataPipeline } from '../src/services/safe_data_pipeline.js';

process.env.KSTOCK_LIVE_TRADING_ENABLED = 'false';
process.env.KSTOCK_AI_MODE = 'mock';

function forbidExternalFetch() {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('External request forbidden during data-quality validation'); };
  return () => { globalThis.fetch = originalFetch; };
}

test('quote quality accepts numeric strings and normalizes volume', () => {
  const result = validateQuote({ symbol: '005930', price: '70,000', raw: { acml_vol: '123,456' } });
  assert.equal(result.price, 70000);
  assert.equal(result.quality.volume, 123456);
  assert.equal(result.quality.valid, true);
});

for (const [label, quote, pattern] of [
  ['NaN price', { symbol: '005930', price: 'not-a-number', raw: {} }, /finite number/],
  ['negative price', { symbol: '005930', price: -1, raw: {} }, /out of allowed range/],
  ['zero price', { symbol: '005930', price: 0, raw: {} }, /out of allowed range/],
  ['negative volume', { symbol: '005930', price: 70000, raw: { acml_vol: -10 } }, /out of allowed range/],
]) {
  test(`quote quality rejects ${label}`, () => {
    assert.throws(() => validateQuote(quote), pattern);
  });
}

test('financial quality supports alternate field names and numeric strings', () => {
  const result = validateFinancials({
    status: '000',
    items: [{ accountName: '매출액', amount: '1,234,567' }],
  });
  assert.equal(result.items[0].accountName, '매출액');
  assert.equal(result.items[0].amount, 1234567);
  assert.equal(result.quality.itemCount, 1);
});

test('financial quality allows missing amount but rejects malformed rows', () => {
  const missingAmount = validateFinancials({ status: '000', items: [{ account_nm: '영업이익' }] });
  assert.equal(missingAmount.items[0].amount, null);

  assert.throws(
    () => validateFinancials({ status: '000', items: [{ thstrm_amount: '1000' }] }),
    /account name is required/,
  );
  assert.throws(
    () => validateFinancials({ status: '000', items: [{ account_nm: '매출액', thstrm_amount: 'NaN' }] }),
    /finite number/,
  );
});

test('snapshot validation fails closed when identifiers or nested data are invalid', () => {
  assert.throws(() => validateSnapshot({}), /snapshot identifiers are required/);
  assert.throws(
    () => validateSnapshot({ symbol: '005930', corpCode: '00126380', quote: { symbol: '005930', price: -1 }, financials: { status: '000', items: [] } }),
    /quote.price is out of allowed range/,
  );
});

test('safe data pipeline rejects corrupted KIS market data without external calls', async () => {
  const restore = forbidExternalFetch();
  const pipeline = createSafeDataPipeline({
    kisRequest: async () => ({ rt_cd: '0', output: { stck_prpr: '-500', acml_vol: '10' } }),
    dartRequest: async () => ({ status: '000', list: [{ account_nm: '매출액', thstrm_amount: '1000' }] }),
  });

  try {
    await assert.rejects(
      pipeline.loadSnapshot({ symbol: '005930', corpCode: '00126380', year: '2025' }),
      /quote.price is out of allowed range/,
    );
  } finally {
    restore();
  }
});

test('safe data pipeline returns only validated normalized data', async () => {
  const restore = forbidExternalFetch();
  const pipeline = createSafeDataPipeline({
    kisRequest: async () => ({ rt_cd: '0', output: { stck_prpr: '70000', acml_vol: '123456' } }),
    dartRequest: async () => ({ status: '000', list: [{ account_nm: '매출액', thstrm_amount: '1000000' }] }),
  });

  try {
    const result = await pipeline.loadSnapshot({ symbol: '005930', corpCode: '00126380', year: '2025' });
    assert.equal(result.dataQuality.valid, true);
    assert.equal(result.quote.price, 70000);
    assert.equal(result.quote.quality.volume, 123456);
    assert.equal(result.financials.items[0].amount, 1000000);
    assert.equal(result.liveTradingEnabled, false);
  } finally {
    restore();
  }
});
