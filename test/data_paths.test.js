import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createOpenDartClient } from '../src/services/opendart_client.js';
import { createKisMarketClient } from '../src/services/kis_market_client.js';

process.env.KSTOCK_LIVE_TRADING_ENABLED = 'false';

function forbidExternalFetch() {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error('External request forbidden during mock validation');
  };
  return () => { globalThis.fetch = originalFetch; };
}

test('OpenDART financials use only injected stub and normalize list', async () => {
  const restore = forbidExternalFetch();
  const calls = [];
  const client = createOpenDartClient({
    request: async (input) => {
      calls.push(input);
      return { status: '000', list: [{ account_nm: '매출액', thstrm_amount: '1000' }] };
    },
  });

  try {
    const result = await client.getFinancials({ corpCode: '00126380', year: '2025' });
    assert.equal(result.status, '000');
    assert.equal(result.items.length, 1);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].service, 'opendart');
    assert.equal(calls[0].operation, 'financials');
  } finally {
    restore();
  }
});

test('OpenDART empty list is safe and API errors fail closed', async () => {
  const emptyClient = createOpenDartClient({
    request: async () => ({ status: '000' }),
  });
  const empty = await emptyClient.getDisclosures({ corpCode: '00126380' });
  assert.deepEqual(empty.items, []);

  const errorClient = createOpenDartClient({
    request: async () => ({ status: '013', message: 'no data' }),
  });
  await assert.rejects(
    errorClient.getFinancials({ corpCode: '00126380', year: '2025' }),
    /OpenDART error: 013/,
  );
});

test('OpenDART rejects malformed responses and missing required identifiers', async () => {
  const malformed = createOpenDartClient({ request: async () => null });
  await assert.rejects(
    malformed.getFinancials({ corpCode: '00126380', year: '2025' }),
    /Invalid OpenDART response/,
  );
  await assert.rejects(
    malformed.getFinancials({ corpCode: '', year: '2025' }),
    /corpCode and year are required/,
  );
});

test('KIS quote uses injected stub only and normalizes current price', async () => {
  const restore = forbidExternalFetch();
  const calls = [];
  const client = createKisMarketClient({
    liveTradingEnabled: false,
    request: async (input) => {
      calls.push(input);
      return { rt_cd: '0', output: { stck_prpr: '70000', acml_vol: '123456' } };
    },
  });

  try {
    const result = await client.getQuote({ symbol: '005930' });
    assert.equal(result.symbol, '005930');
    assert.equal(result.price, 70000);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].service, 'kis');
    assert.equal(calls[0].operation, 'quote');
  } finally {
    restore();
  }
});

test('KIS daily prices normalize an empty response safely', async () => {
  const client = createKisMarketClient({
    request: async () => ({ rt_cd: '0' }),
  });
  const result = await client.getDailyPrices({ symbol: '005930' });
  assert.deepEqual(result.items, []);
});

test('KIS API errors and malformed responses fail closed', async () => {
  const rateLimited = createKisMarketClient({
    request: async () => ({ rt_cd: '1', msg_cd: 'EGW00201' }),
  });
  await assert.rejects(rateLimited.getQuote({ symbol: '005930' }), /KIS error: EGW00201/);

  const malformed = createKisMarketClient({ request: async () => undefined });
  await assert.rejects(malformed.getQuote({ symbol: '005930' }), /Invalid KIS response/);
});

test('KIS safe client cannot be created with live trading enabled', () => {
  assert.throws(
    () => createKisMarketClient({ request: async () => ({}), liveTradingEnabled: true }),
    /Live trading must remain disabled/,
  );
});

test('KIS order operation is always blocked in safe validation', () => {
  const client = createKisMarketClient({ request: async () => ({}) });
  assert.throws(() => client.placeOrder(), /Order operations are disabled/);
  assert.equal(process.env.KSTOCK_LIVE_TRADING_ENABLED, 'false');
});
