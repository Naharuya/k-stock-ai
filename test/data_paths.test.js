import assert from 'node:assert/strict';
import { test } from 'node:test';
import AdmZip from 'adm-zip';
import { createOpenDartClient } from '../src/services/opendart_client.js';
import { createOpenDartRequest } from '../src/services/opendart_request.js';
import { createOpenDartCorpCodeResolver } from '../src/services/opendart_corp_code_resolver.js';
import { splitDisclosureDateRange } from '../src/services/opendart_client.js';
import { createKisMarketClient } from '../src/services/kis_market_client.js';
import { createKisRequest } from '../src/services/kis_request.js';

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

  const noDataClient = createOpenDartClient({
    request: async () => ({ status: '013', message: 'no data' }),
  });
  assert.deepEqual(await noDataClient.getDisclosures({ corpCode: '00126380' }), {
    status: '013',
    items: [],
    totalPages: 0,
    retrievedPages: 0,
    requestedWindows: 1,
    truncated: false,
  });

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

test('OpenDART HTTP adapter maps financial and disclosure requests', async () => {
  const calls = [];
  const request = createOpenDartRequest({
    apiKey: 'test-key',
    baseUrl: 'https://dart.test/api',
    fetchImpl: async (url, options) => {
      calls.push({ url: new URL(url), options });
      return { ok: true, status: 200, json: async () => ({ status: '000', list: [] }) };
    },
  });

  await request({
    service: 'opendart',
    operation: 'financials',
    params: { corpCode: '00126380', year: '2025', reportCode: '11011' },
  });
  await request({
    service: 'opendart',
    operation: 'disclosures',
    params: { corpCode: '00126380', beginDate: '20250101', endDate: '20251231', pageNo: 2, pageCount: 100 },
  });

  assert.equal(calls[0].url.pathname, '/api/fnlttSinglAcntAll.json');
  assert.equal(calls[0].url.searchParams.get('crtfc_key'), 'test-key');
  assert.equal(calls[0].url.searchParams.get('corp_code'), '00126380');
  assert.equal(calls[0].url.searchParams.get('bsns_year'), '2025');
  assert.equal(calls[0].url.searchParams.get('fs_div'), 'CFS');
  assert.equal(calls[1].url.pathname, '/api/list.json');
  assert.equal(calls[1].url.searchParams.get('bgn_de'), '20250101');
  assert.equal(calls[1].url.searchParams.get('end_de'), '20251231');
  assert.equal(calls[1].url.searchParams.get('page_no'), '2');
  assert.equal(calls[1].url.searchParams.get('page_count'), '100');
  assert.equal(calls[0].options.signal instanceof AbortSignal, true);
});

test('OpenDART disclosures paginate to the reported page count and deduplicate receipt numbers', async () => {
  const calls = [];
  const pages = new Map([
    [1, { status: '000', page_no: 1, total_page: 2, list: [
      { rcept_no: '20260101000001', report_nm: '사업보고서 제출' },
      { rcept_no: '20260101000002', report_nm: '분기보고서 제출' },
    ] }],
    [2, { status: '000', page_no: 2, total_page: 2, list: [
      { rcept_no: '20260101000002', report_nm: '분기보고서 제출' },
      { rcept_no: '20260101000003', report_nm: '주요사항보고서' },
    ] }],
  ]);
  const client = createOpenDartClient({
    request: async (input) => {
      calls.push(input);
      return pages.get(input.params.pageNo);
    },
  });

  const result = await client.getDisclosures({ corpCode: '00126380', beginDate: '20260101', endDate: '20260131' });
  assert.equal(calls.length, 2);
  assert.deepEqual(calls.map((call) => call.params.pageNo), [1, 2]);
  assert.equal(calls[0].params.pageCount, 100);
  assert.deepEqual(result.items.map((item) => item.rcept_no), [
    '20260101000001',
    '20260101000002',
    '20260101000003',
  ]);
  assert.equal(result.totalPages, 2);
  assert.equal(result.retrievedPages, 2);
  assert.equal(result.requestedWindows, 1);
  assert.equal(result.truncated, false);
});

test('OpenDART date ranges split by month and preserve exact boundaries across leap years', () => {
  assert.deepEqual(splitDisclosureDateRange({ beginDate: '20240228', endDate: '20240302' }), [
    { beginDate: '20240228', endDate: '20240229' },
    { beginDate: '20240301', endDate: '20240302' },
  ]);
  assert.throws(
    () => splitDisclosureDateRange({ beginDate: '20240230', endDate: '20240302' }),
    /beginDate is not a valid date/,
  );
  assert.throws(
    () => splitDisclosureDateRange({ beginDate: '20250301', endDate: '20250228' }),
    /beginDate must be on or before endDate/,
  );
  assert.throws(
    () => splitDisclosureDateRange({ beginDate: '20200101', endDate: '20250101', maxWindows: 12 }),
    /exceeds 12 monthly windows/,
  );
});

test('OpenDART combines monthly windows, pages, and no-data intervals', async () => {
  const calls = [];
  const request = async (input) => {
    calls.push(input);
    if (input.params.beginDate === '20260131') {
      return {
        status: '000',
        total_page: 2,
        list: [{ rcept_no: `2026013100000${input.params.pageNo}`, report_nm: `1월 공시 ${input.params.pageNo}` }],
      };
    }
    return { status: '013', message: 'no data' };
  };
  const client = createOpenDartClient({ request });
  const result = await client.getDisclosures({
    corpCode: '00126380',
    beginDate: '20260131',
    endDate: '20260201',
  });

  assert.deepEqual(calls.map((call) => [call.params.beginDate, call.params.endDate, call.params.pageNo]), [
    ['20260131', '20260131', 1],
    ['20260131', '20260131', 2],
    ['20260201', '20260201', 1],
  ]);
  assert.equal(result.items.length, 2);
  assert.equal(result.totalPages, 2);
  assert.equal(result.retrievedPages, 2);
  assert.equal(result.requestedWindows, 2);
  assert.equal(result.truncated, false);
});

test('OpenDART disclosure pagination stops at the configured page cap', async () => {
  const calls = [];
  const client = createOpenDartClient({
    request: async (input) => {
      calls.push(input);
      return { status: '000', total_page: 12, list: [{ rcept_no: `receipt-${input.params.pageNo}` }] };
    },
  });

  const result = await client.getDisclosures({ corpCode: '00126380', pageCount: 10, maxPages: 3 });
  assert.equal(calls.length, 3);
  assert.equal(result.retrievedPages, 3);
  assert.equal(result.totalPages, 12);
  assert.equal(result.truncated, true);
});

test('OpenDART disclosure pagination validates safe request bounds', async () => {
  const client = createOpenDartClient({ request: async () => ({ status: '000' }) });
  await assert.rejects(client.getDisclosures({ corpCode: '00126380', pageCount: 101 }), /pageCount must be an integer/);
  await assert.rejects(client.getDisclosures({ corpCode: '00126380', maxPages: 21 }), /maxPages must be an integer/);
});

test('OpenDART HTTP adapter fails safely and tags retryable failures', async () => {
  const rateLimited = createOpenDartRequest({
    apiKey: 'test-key',
    fetchImpl: async () => ({ ok: false, status: 429 }),
  });
  await assert.rejects(
    rateLimited({ service: 'opendart', operation: 'financials' }),
    (error) => error.code === 'RATE_LIMIT',
  );

  const timedOut = createOpenDartRequest({
    apiKey: 'test-key',
    fetchImpl: async () => { throw new DOMException('timeout', 'TimeoutError'); },
  });
  await assert.rejects(
    timedOut({ service: 'opendart', operation: 'financials' }),
    (error) => error.code === 'TIMEOUT',
  );

  const missingKey = createOpenDartRequest({ apiKey: '', fetchImpl: async () => ({}) });
  await assert.rejects(
    missingKey({ service: 'opendart', operation: 'financials' }),
    /OPENDART_API_KEY is missing/,
  );
});

test('OpenDART corp-code resolver preserves leading zeroes and caches the archive', async () => {
  const archive = new AdmZip();
  archive.addFile('CORPCODE.xml', Buffer.from(
    '<result><list><corp_code>00126380</corp_code><corp_name>삼성전자</corp_name><stock_code>005930</stock_code><modify_date>20260901</modify_date></list><list><corp_code>00434003</corp_code><corp_name>비상장사</corp_name><stock_code></stock_code><modify_date>20260901</modify_date></list></result>',
    'utf8',
  ));
  const archiveBuffer = archive.toBuffer();
  const calls = [];
  const resolver = createOpenDartCorpCodeResolver({
    apiKey: 'test-key',
    baseUrl: 'https://dart.test/api',
    fetchImpl: async (url) => {
      calls.push(new URL(url));
      return {
        ok: true,
        status: 200,
        arrayBuffer: async () => archiveBuffer.buffer.slice(
          archiveBuffer.byteOffset,
          archiveBuffer.byteOffset + archiveBuffer.byteLength,
        ),
      };
    },
  });

  assert.equal(await resolver.resolve('005930'), '00126380');
  assert.equal(await resolver.resolve('005930'), '00126380');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].pathname, '/api/corpCode.xml');
  await assert.rejects(resolver.resolve('000000'), /No OpenDART corp_code found/);
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

test('KIS quote adds a retrieval timestamp when the response omits one', async () => {
  const client = createKisMarketClient({
    now: () => Date.parse('2026-09-14T00:00:00Z'),
    request: async () => ({ rt_cd: '0', output: { stck_prpr: '70000' } }),
  });
  const quote = await client.getQuote({ symbol: '005930' });
  assert.equal(quote.timestamp, '2026-09-14T00:00:00.000Z');
});

test('KIS HTTP adapter obtains a token and requests a quote without exposing credentials', async () => {
  const calls = [];
  const request = createKisRequest({
    appKey: 'test-app-key',
    appSecret: 'test-app-secret',
    environment: 'paper',
    baseUrl: 'https://kis.test:29443',
    now: () => 1_000,
    fetchImpl: async (url, options) => {
      calls.push({ url: new URL(url), options });
      if (new URL(url).pathname === '/oauth2/tokenP') {
        return { ok: true, status: 200, json: async () => ({ access_token: 'test-token', expires_in: 3600 }) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ rt_cd: '0', output: { stck_prpr: '70000', acml_vol: '123456' } }),
      };
    },
  });
  const client = createKisMarketClient({ request });

  const quote = await client.getQuote({ symbol: '005930' });
  assert.equal(quote.price, 70000);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url.pathname, '/oauth2/tokenP');
  assert.equal(JSON.parse(calls[0].options.body).appsecret, 'test-app-secret');
  assert.equal(calls[1].url.pathname, '/uapi/domestic-stock/v1/quotations/inquire-price');
  assert.equal(calls[1].url.searchParams.get('FID_INPUT_ISCD'), '005930');
  assert.equal(calls[1].options.headers.authorization, 'Bearer test-token');
  assert.equal(calls[1].options.headers.tr_id, 'FHKST01010100');
});

test('KIS HTTP adapter rejects missing credentials and invalid stock codes before fetch', async () => {
  let calls = 0;
  const request = createKisRequest({
    appKey: '',
    appSecret: '',
    baseUrl: 'https://kis.test:29443',
    fetchImpl: async () => { calls += 1; return { ok: true, status: 200, json: async () => ({}) }; },
  });

  await assert.rejects(
    request({ service: 'kis', operation: 'quote', symbol: '005930' }),
    /KIS_APP_KEY and KIS_APP_SECRET are required/,
  );
  assert.equal(calls, 0);
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
