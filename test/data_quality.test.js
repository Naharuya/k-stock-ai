import assert from 'node:assert/strict';
import { test } from 'node:test';
import AdmZip from 'adm-zip';
import { validateQuote, validateFinancials, validateSnapshot } from '../src/services/data_quality.js';
import { createSafeDataPipeline } from '../src/services/safe_data_pipeline.js';

process.env.KSTOCK_LIVE_TRADING_ENABLED = 'false';
process.env.KSTOCK_AI_MODE = 'mock';
const NOW = Date.parse('2026-09-14T00:00:00Z');

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
    now: () => NOW,
    kisRequest: async () => ({ rt_cd: '0', output: { stck_prpr: '-500', acml_vol: '10', timestamp: '2026-09-13T23:55:00Z' } }),
    dartRequest: async () => ({ status: '000', list: [{ account_nm: '매출액', thstrm_amount: '1000', rcept_dt: '2026-03-31T00:00:00Z' }] }),
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
    now: () => NOW,
    kisRequest: async () => ({ rt_cd: '0', output: { stck_prpr: '70000', acml_vol: '123456', timestamp: '2026-09-13T23:55:00Z' } }),
    dartRequest: async () => ({ status: '000', list: [{ account_nm: '매출액', thstrm_amount: '1000000', rcept_dt: '2026-03-31T00:00:00Z' }] }),
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

test('safe data pipeline keeps OpenDART disabled unless explicitly enabled', async () => {
  const restoreFetch = forbidExternalFetch();
  const previousEnabled = process.env.KSTOCK_DART_ENABLED;
  const previousApiKey = process.env.OPENDART_API_KEY;
  process.env.KSTOCK_DART_ENABLED = 'false';
  process.env.OPENDART_API_KEY = 'test-key';
  const pipeline = createSafeDataPipeline({
    kisRequest: async () => ({ rt_cd: '0', output: { stck_prpr: '70000', timestamp: '2026-09-13T23:55:00Z' } }),
  });

  try {
    await assert.rejects(
      pipeline.loadSnapshot({ symbol: '005930', corpCode: '00126380', year: '2025' }),
      /OpenDART integration is disabled/,
    );
  } finally {
    restoreFetch();
    if (previousEnabled === undefined) delete process.env.KSTOCK_DART_ENABLED;
    else process.env.KSTOCK_DART_ENABLED = previousEnabled;
    if (previousApiKey === undefined) delete process.env.OPENDART_API_KEY;
    else process.env.OPENDART_API_KEY = previousApiKey;
  }
});

test('safe data pipeline uses the OpenDART HTTP adapter when enabled', async () => {
  const originalFetch = globalThis.fetch;
  const previousEnabled = process.env.KSTOCK_DART_ENABLED;
  const previousApiKey = process.env.OPENDART_API_KEY;
  const previousKisEnabled = process.env.KSTOCK_KIS_ENABLED;
  const previousKisAppKey = process.env.KIS_APP_KEY;
  const previousKisAppSecret = process.env.KIS_APP_SECRET;
  const calls = [];
  const archive = new AdmZip();
  archive.addFile('CORPCODE.xml', Buffer.from(
    '<result><list><corp_code>00126380</corp_code><corp_name>삼성전자</corp_name><stock_code>005930</stock_code><modify_date>20260901</modify_date></list></result>',
    'utf8',
  ));
  const archiveBuffer = archive.toBuffer();
  process.env.KSTOCK_DART_ENABLED = 'true';
  process.env.OPENDART_API_KEY = 'test-key';
  process.env.KSTOCK_KIS_ENABLED = 'true';
  process.env.KIS_APP_KEY = 'test-app-key';
  process.env.KIS_APP_SECRET = 'test-app-secret';
  globalThis.fetch = async (url) => {
    const parsedUrl = new URL(url);
    calls.push(parsedUrl);
    if (parsedUrl.pathname.endsWith('/oauth2/tokenP')) {
      return { ok: true, status: 200, json: async () => ({ access_token: 'test-token', expires_in: 3600 }) };
    }
    if (parsedUrl.pathname.endsWith('/inquire-price')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          rt_cd: '0',
          output: { stck_prpr: '70000', acml_vol: '123456', stck_bsop_date: '20260914', stck_cntg_hour: '085500' },
        }),
      };
    }
    if (parsedUrl.pathname.endsWith('/corpCode.xml')) {
      return {
        ok: true,
        status: 200,
        arrayBuffer: async () => archiveBuffer.buffer.slice(
          archiveBuffer.byteOffset,
          archiveBuffer.byteOffset + archiveBuffer.byteLength,
        ),
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        status: '000',
        list: parsedUrl.pathname.endsWith('/list.json')
          ? [{ rcept_no: '20260314000123', report_nm: '사업보고서 제출' }]
          : [{ account_nm: '매출액', thstrm_amount: '1000000', bsns_year: '2025' }],
      }),
    };
  };
  const pipeline = createSafeDataPipeline({ now: () => NOW });

  try {
    const result = await pipeline.loadSnapshot({
      symbol: '005930',
      year: '2025',
      disclosureBeginDate: '20260301',
      disclosureEndDate: '20260331',
    });
    assert.equal(result.financials.items[0].amount, 1000000);
    assert.equal(result.disclosures.items[0].report_nm, '사업보고서 제출');
    assert.equal(result.quote.price, 70000);
    assert.equal(calls.length, 5);
    assert.ok(calls.some((url) => url.pathname.endsWith('/oauth2/tokenP')));
    assert.ok(calls.some((url) => url.pathname.endsWith('/inquire-price')));
    assert.ok(calls.some((url) => url.pathname.endsWith('/api/corpCode.xml')));
    assert.ok(calls.some((url) => url.pathname.endsWith('/api/fnlttSinglAcntAll.json')));
    assert.ok(calls.some((url) => url.pathname.endsWith('/api/list.json')));
  } finally {
    globalThis.fetch = originalFetch;
    if (previousEnabled === undefined) delete process.env.KSTOCK_DART_ENABLED;
    else process.env.KSTOCK_DART_ENABLED = previousEnabled;
    if (previousApiKey === undefined) delete process.env.OPENDART_API_KEY;
    else process.env.OPENDART_API_KEY = previousApiKey;
    if (previousKisEnabled === undefined) delete process.env.KSTOCK_KIS_ENABLED;
    else process.env.KSTOCK_KIS_ENABLED = previousKisEnabled;
    if (previousKisAppKey === undefined) delete process.env.KIS_APP_KEY;
    else process.env.KIS_APP_KEY = previousKisAppKey;
    if (previousKisAppSecret === undefined) delete process.env.KIS_APP_SECRET;
    else process.env.KIS_APP_SECRET = previousKisAppSecret;
  }
});
