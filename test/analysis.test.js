import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeStock } from '../src/ai_router.js';
import { SAMPLE_STOCK } from '../src/data/sample_stock.js';
import { applyRiskHardStop, detectCriticalDartDisclosures } from '../src/utils/risk_hard_stop.js';
import { createAnalysisDataLoader, summarizeFinancials } from '../src/services/analysis_data_loader.js';
import { createOllamaClient } from '../src/services/ollama_service.js';
import { createAgentResponseSchema, validateAgentResult } from '../src/services/llm_service.js';

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

test('DART title rules detect critical events without excluding routine disclosures', () => {
  const critical = detectCriticalDartDisclosures([
    { report_nm: '횡령ㆍ배임혐의발생' },
    { report_nm: '회생절차개시신청' },
    { report_nm: '파산신청' },
    { report_nm: '부도발생' },
    { report_nm: '감사의견 거절 감사보고서 제출' },
    { report_nm: '상장폐지 사유 발생' },
  ]);
  assert.equal(critical.criticalDisclosure, true);
  assert.deepEqual(critical.reasons.map((reason) => reason.eventType), [
    'EMBEZZLEMENT_OR_BREACH',
    'REHABILITATION',
    'BANKRUPTCY',
    'INSOLVENCY',
    'ADVERSE_AUDIT_OPINION',
    'DELISTING',
  ]);

  const routine = detectCriticalDartDisclosures([
    { report_nm: '사업보고서 제출' },
    { report_nm: '유상증자결정' },
    { report_nm: '불성실공시법인지정' },
  ]);
  assert.equal(routine.criticalDisclosure, false);
  assert.deepEqual(routine.reasons, []);
});

test('subsidiary insolvency filings require review but do not directly hard-stop the parent', () => {
  const signals = detectCriticalDartDisclosures([
    { report_nm: '부도발생(종속회사의주요경영사항)' },
    { report_nm: '회생절차개시신청(종속회사의주요경영사항)' },
  ]);

  assert.equal(signals.criticalDisclosure, false);
  assert.equal(signals.matchCount, 0);
  assert.equal(signals.reviewReasons.length, 2);
  assert.equal(signals.reviewReasons[0].scope, 'SUBSIDIARY');

  const committee = applyRiskHardStop({
    committee: { status: 'WATCH', totalScore: 70 },
    risk: {},
    dart: { riskSignals: signals },
  });
  assert.equal(committee.status, 'WATCH');
  assert.equal(committee.riskOverride, false);
});

test('repeated critical amendment titles keep counts but deduplicate model reasons', () => {
  const result = detectCriticalDartDisclosures(Array.from(
    { length: 15 },
    () => ({ report_nm: '[기재정정]주요사항보고서(부도발생)' }),
  ));

  assert.equal(result.criticalDisclosure, true);
  assert.equal(result.matchCount, 15);
  assert.equal(result.inspectedCount, 15);
  assert.deepEqual(result.reasons, [{ eventType: 'INSOLVENCY', reportName: '[기재정정]주요사항보고서(부도발생)' }]);
});

test('real historical insolvency, rehabilitation, and delisting titles remain critical', () => {
  const result = detectCriticalDartDisclosures([
    { report_nm: '주요사항보고서(부도발생)' },
    { report_nm: '회생절차개시결정' },
    { report_nm: '주권매매거래정지기간변경(상장폐지 사유 발생)' },
    { report_nm: '주권매매거래해제(상장폐지에 따른 정리매매 개시)' },
  ]);

  assert.deepEqual(result.reasons.map((reason) => reason.eventType), [
    'INSOLVENCY',
    'REHABILITATION',
    'DELISTING',
    'DELISTING',
  ]);
  assert.equal(result.matchCount, 4);

  const subsidiary = detectCriticalDartDisclosures([
    { report_nm: '회생절차개시신청(종속회사의주요경영사항)' },
  ]);
  assert.equal(subsidiary.criticalDisclosure, false);
  assert.equal(subsidiary.reviewReasons[0].scope, 'SUBSIDIARY');
});

test('recent real Samsung disclosure titles do not trigger critical risk rules', () => {
  const observedTitles = [
    '임원ㆍ주요주주특정증권등소유상황보고서',
    '최대주주등소유주식변동신고서',
    '임원ㆍ주요주주특정증권등거래계획보고서',
    '대규모기업집단현황공시[분기별공시(대표회사용)]',
    '주요사항보고서(해외증권시장주권등상장폐지결정)',
    '주요사항보고서(해외증권시장주권등상장폐지)',
  ];
  const result = detectCriticalDartDisclosures(observedTitles.map((report_nm) => ({ report_nm })));

  assert.equal(result.inspectedCount, observedTitles.length);
  assert.equal(result.criticalDisclosure, false);
  assert.deepEqual(result.reasons, []);
});

test('delisting Hard Stop requires a definitive event, not a pending challenge or warning', () => {
  const pendingTitles = [
    '기타시장안내(상장폐지 관련)',
    '상장폐지 이의신청서 제출',
    '상장폐지 사유 추가 우려 안내',
    '상장폐지결정 효력정지 가처분 신청',
    '주요사항보고서(해외증권시장주권등상장폐지결정)',
  ];
  assert.equal(detectCriticalDartDisclosures(pendingTitles.map((report_nm) => ({ report_nm }))).criticalDisclosure, false);

  const definitiveTitles = [
    '상장폐지 사유 발생',
    '상장폐지에 따른 정리매매 개시',
    '형식적상장폐지',
  ];
  assert.equal(detectCriticalDartDisclosures(definitiveTitles.map((report_nm) => ({ report_nm }))).reasons.length, 3);
});

test('critical DART title beyond the model summary triggers a deterministic hard stop', async () => {
  const items = Array.from({ length: 60 }, (_, index) => ({ report_nm: `정기 공시 ${index}` }));
  items[59] = { report_nm: '회생절차개시신청' };
  const loader = createAnalysisDataLoader({
    kisEnabled: true,
    dartEnabled: true,
    pipeline: {
      loadSnapshot: async () => ({
        corpCode: '00126380',
        quote: { symbol: '005930', price: 70000 },
        financials: { status: '000', items: [] },
        disclosures: { status: '000', items, retrievedPages: 1, totalPages: 1, truncated: false },
        freshness: {},
        dataQuality: { valid: true },
      }),
    },
  });
  const { stockData } = await loader.load({ symbol: '005930', name: '삼성전자', year: '2025' });
  assert.equal(stockData.dart.disclosures.items.length, 50);
  assert.equal(stockData.dart.riskSignals.criticalDisclosure, true);

  const result = await analyzeStock(stockData);
  assert.equal(result.agents.dart.riskSignals.criticalDisclosure, true);
  assert.equal(result.committee.status, 'EXCLUDE');
  assert.equal(result.committee.riskOverride, true);
  assert.equal(result.committee.riskOverrideReason, 'CRITICAL_DART_TITLE_RULE');
});

test('subsidiary risk beyond the model summary reaches review without parent exclusion', async () => {
  const items = Array.from({ length: 60 }, (_, index) => ({ report_nm: `정기 공시 ${index}` }));
  items[59] = { report_nm: '부도발생(종속회사의주요경영사항)' };
  const loader = createAnalysisDataLoader({
    kisEnabled: true,
    dartEnabled: true,
    pipeline: {
      loadSnapshot: async () => ({
        corpCode: '00126380',
        quote: { symbol: '005930', price: 70000 },
        financials: { status: '000', items: [] },
        disclosures: { status: '000', items, retrievedPages: 1, totalPages: 1, truncated: false },
        freshness: {},
        dataQuality: { valid: true },
      }),
    },
  });
  const { stockData } = await loader.load({ symbol: '005930', name: '삼성전자', year: '2025' });
  assert.equal(stockData.dart.disclosures.items.length, 50);
  assert.equal(stockData.dart.riskSignals.criticalDisclosure, false);
  assert.equal(stockData.dart.riskSignals.reviewReasons[0].scope, 'SUBSIDIARY');

  const result = await analyzeStock(stockData);
  assert.equal(result.agents.dart.riskSignals.reviewMatchCount, 1);
  assert.equal(result.committee.status, 'INTEREST');
  assert.equal(result.committee.riskOverride, false);
});

test('analysis data loader preserves mock input unless both live sources are enabled', async () => {
  let calls = 0;
  const loader = createAnalysisDataLoader({
    kisEnabled: false,
    dartEnabled: false,
    pipeline: { loadSnapshot: async () => { calls += 1; } },
  });
  const stockData = { symbol: '005930', name: '삼성전자' };
  const result = await loader.load(stockData);

  assert.equal(result.stockData, stockData);
  assert.equal(result.snapshot, null);
  assert.equal(calls, 0);
});

test('analysis data loader injects validated live data and preserves caller context', async () => {
  let request;
  const snapshot = {
    corpCode: '00126380',
    quote: { symbol: '005930', price: 70000 },
    financials: { status: '000', items: [] },
    disclosures: { status: '000', items: [{ report_nm: '사업보고서 제출' }] },
    freshness: { quoteAgeMs: 1000 },
    dataQuality: { valid: true },
  };
  const loader = createAnalysisDataLoader({
    kisEnabled: true,
    dartEnabled: true,
    pipeline: { loadSnapshot: async (input) => { request = input; return snapshot; } },
  });
  const result = await loader.load({
    symbol: '005930',
    name: '삼성전자',
    market: { indexContext: 'provided' },
    company: { note: 'provided' },
  });

  assert.deepEqual(request, {
    symbol: '005930',
    corpCode: undefined,
    year: String(new Date().getFullYear() - 1),
    disclosureBeginDate: undefined,
    disclosureEndDate: undefined,
  });
  assert.equal(result.snapshot, snapshot);
  assert.equal(result.stockData.market.indexContext, 'provided');
  assert.equal(result.stockData.market.quote.price, 70000);
  assert.equal(result.stockData.company.note, 'provided');
  assert.equal(result.stockData.company.financials.sourceItemCount, 0);
  assert.equal(result.stockData.dart.financials, undefined);
  assert.equal(result.stockData.dart.corpCode, '00126380');
  assert.equal(result.stockData.dart.disclosures.items[0].report_nm, '사업보고서 제출');
});

test('financial summaries retain core Korean accounts and bound large DART payloads', () => {
  const sourceItems = [
    { account_nm: '수익(매출액)', thstrm_amount: '1000', frmtrm_amount: '900', unused: 'discard' },
    { account_nm: '영업이익(손실)', thstrm_amount: '100' },
    ...Array.from({ length: 220 }, (_, index) => ({ account_nm: `기타계정${index}`, thstrm_amount: '1' })),
  ];
  const summary = summarizeFinancials({ status: '000', items: sourceItems });

  assert.equal(summary.sourceItemCount, 222);
  assert.equal(summary.selectedItemCount, 2);
  assert.equal(summary.selectionMode, 'core_accounts');
  assert.deepEqual(summary.items[0], {
    account_nm: '수익(매출액)',
    thstrm_amount: '1000',
    frmtrm_amount: '900',
  });
  assert.equal(summary.items[0].unused, undefined);
});

test('financial summaries use a bounded fallback for unfamiliar account names', () => {
  const summary = summarizeFinancials({
    status: '000',
    items: Array.from({ length: 30 }, (_, index) => ({ account_nm: `계정${index}`, thstrm_amount: '1' })),
  });
  assert.equal(summary.selectedItemCount, 24);
  assert.equal(summary.selectionMode, 'fallback');
});

test('analysis data loader refuses a partially enabled live-data configuration', async () => {
  const loader = createAnalysisDataLoader({
    kisEnabled: true,
    dartEnabled: false,
    pipeline: { loadSnapshot: async () => ({}) },
  });
  await assert.rejects(
    loader.load({ symbol: '005930', name: '삼성전자' }),
    /KIS and OpenDART must both be enabled/,
  );
});

test('local Ollama client sends constrained JSON requests and parses agent objects', async () => {
  let request;
  const client = createOllamaClient({
    baseUrl: 'http://127.0.0.1:11434',
    model: 'qwen3:8b',
    fetchImpl: async (url, options) => {
      request = { url: new URL(url), options, body: JSON.parse(options.body) };
      return { ok: true, status: 200, json: async () => ({ message: { content: '{"score":78,"status":"INTEREST"}' } }) };
    },
  });

  const result = await client.run({ systemPrompt: 'Return JSON only', userPrompt: '{"symbol":"005930"}' });
  assert.deepEqual(result, { score: 78, status: 'INTEREST' });
  assert.equal(request.url.pathname, '/api/chat');
  assert.equal(request.body.model, 'qwen3:8b');
  assert.equal(request.body.format, 'json');
  assert.equal(request.body.think, false);
  assert.equal(request.body.options.num_ctx, 8192);
  assert.equal(request.body.options.num_predict, 512);
  assert.match(request.body.messages[0].content, /Keep each list to at most 3 concise items/);
  assert.equal(request.body.messages[1].content, '{"symbol":"005930"}');
  assert.ok(request.options.signal instanceof AbortSignal);
});

test('local risk and committee agents receive a larger bounded output budget', async () => {
  let requestBody;
  const client = createOllamaClient({
    fetchImpl: async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return { ok: true, status: 200, json: async () => ({ message: { content: '{"ok":true}' } }) };
    },
  });

  await client.run({ agentName: 'risk', systemPrompt: '', userPrompt: '' });
  assert.equal(requestBody.options.num_predict, 2048);
  await client.run({ agentName: 'committee', systemPrompt: '', userPrompt: '' });
  assert.equal(requestBody.options.num_predict, 2048);
  await client.run({ agentName: 'company', systemPrompt: '', userPrompt: '' });
  assert.equal(requestBody.options.num_predict, 512);
});

test('local Risk and Committee inference receives a longer bounded timeout', async () => {
  const timeoutValues = [];
  const client = createOllamaClient({
    timeoutMs: 100,
    longTimeoutMs: 200,
    createTimeoutSignal: (timeoutMs) => {
      timeoutValues.push(timeoutMs);
      return new AbortController().signal;
    },
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ message: { content: '{"ok":true}' } }) }),
  });

  await client.run({ agentName: 'risk', systemPrompt: '', userPrompt: '' });
  await client.run({ agentName: 'committee', systemPrompt: '', userPrompt: '' });
  await client.run({ agentName: 'company', systemPrompt: '', userPrompt: '' });
  assert.deepEqual(timeoutValues, [200, 200, 100]);
});

test('local Ollama client serializes inference and rejects invalid model output', async () => {
  let active = 0;
  let maxActive = 0;
  let calls = 0;
  const client = createOllamaClient({
    fetchImpl: async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      calls += 1;
      await new Promise((resolve) => setImmediate(resolve));
      active -= 1;
      return {
        ok: true,
        status: 200,
        json: async () => ({ message: { content: calls === 1 ? '{"ok":true}' : 'not JSON' } }),
      };
    },
  });

  const results = await Promise.allSettled([
    client.run({ agentName: 'unit-test', systemPrompt: '', userPrompt: 'first' }),
    client.run({ systemPrompt: '', userPrompt: 'second' }),
  ]);
  assert.equal(maxActive, 1);
  assert.equal(results[0].status, 'fulfilled');
  assert.deepEqual(results[0].value, { ok: true });
  assert.equal(results[1].status, 'rejected');
  assert.match(results[1].reason.message, /valid JSON object/);
});

test('local Ollama timeout names the agent without exposing request contents', async () => {
  const client = createOllamaClient({
    timeoutMs: 10,
    fetchImpl: async () => { throw new DOMException('timeout', 'TimeoutError'); },
  });
  await assert.rejects(
    client.run({ agentName: 'company', systemPrompt: 'private prompt', userPrompt: 'private data' }),
    (error) => error.message === 'Local model agent company request timed out'
      && !error.message.includes('private'),
  );
});

test('disclosure summaries bound model input and preserve pagination metadata', async () => {
  const { summarizeDisclosures } = await import('../src/services/analysis_data_loader.js');
  const disclosures = {
    status: '000',
    retrievedPages: 5,
    totalPages: 8,
    truncated: true,
    items: Array.from({ length: 120 }, (_, index) => ({
      rcept_no: `receipt-${index}`,
      report_nm: `공시${index}`,
      rcept_dt: index === 119 ? '20260930' : '20250101',
      unused_payload: 'not sent to model',
    })),
  };
  const summary = summarizeDisclosures(disclosures, 50);

  assert.equal(summary.sourceItemCount, 120);
  assert.equal(summary.selectedItemCount, 50);
  assert.equal(summary.retrievedPages, 5);
  assert.equal(summary.totalPages, 8);
  assert.equal(summary.truncated, true);
  assert.equal(summary.items[0].rcept_no, 'receipt-119');
  assert.equal(summary.items[0].unused_payload, undefined);
});

test('agent output validation protects required DART and Risk fields', () => {
  const dartSchema = {
    score: 0,
    important: false,
    impact: 'NEUTRAL',
    eventType: 'NONE',
    shareDilutionRisk: false,
    governanceRisk: false,
    financialRisk: false,
    summary: '',
    watchPoints: [],
  };
  const riskSchema = {
    riskScore: 0,
    riskLevel: 'LOW',
    criticalRisk: false,
    risks: [],
    redFlags: [],
    excludeSuggested: false,
    summary: '',
  };

  assert.throws(
    () => validateAgentResult('dart', { score: 20 }, dartSchema),
    /dart agent result is missing important/,
  );
  assert.throws(
    () => validateAgentResult('risk', { ...riskSchema, criticalRisk: 'false' }, riskSchema),
    /risk agent criticalRisk must be boolean/,
  );
  assert.throws(
    () => validateAgentResult('risk', { ...riskSchema, riskScore: 101 }, riskSchema),
    /risk agent riskScore must be a score from 0 to 100/,
  );
  assert.equal(validateAgentResult('risk', riskSchema, riskSchema), riskSchema);
});

test('agent response schemas constrain required risk fields and bounded arrays', () => {
  const schema = createAgentResponseSchema({
    riskScore: 0,
    criticalRisk: false,
    riskLevel: 'LOW',
    risks: [],
  });

  assert.deepEqual(schema.required, ['riskScore', 'criticalRisk', 'riskLevel', 'risks']);
  assert.equal(schema.properties.riskScore.minimum, 0);
  assert.equal(schema.properties.riskScore.maximum, 100);
  assert.equal(schema.properties.criticalRisk.type, 'boolean');
  assert.equal(schema.properties.risks.maxItems, 3);
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.properties.riskLevel.enum, ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH']);
});

test('agent output validator rejects unsupported risk and committee classifications', () => {
  assert.throws(
    () => validateAgentResult('risk', { riskScore: 20, riskLevel: 'none', criticalRisk: false, risks: [], redFlags: [], excludeSuggested: false, summary: '' }, {
      riskScore: 0, riskLevel: 'LOW', criticalRisk: false, risks: [], redFlags: [], excludeSuggested: false, summary: '',
    }),
    /risk agent riskLevel must be one of the supported values/,
  );
  assert.throws(
    () => validateAgentResult('committee', { totalScore: 50, status: 'UNKNOWN', confidence: 50, positiveReasons: [], negativeReasons: [], risks: [], entryConditions: [], invalidConditions: [], summary: '' }, {
      totalScore: 0, status: 'INTEREST', confidence: 50, positiveReasons: [], negativeReasons: [], risks: [], entryConditions: [], invalidConditions: [], summary: '',
    }),
    /committee agent status must be one of the supported values/,
  );
});
