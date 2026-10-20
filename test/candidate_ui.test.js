import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
function page(fetchImpl) {
  class Node {
    constructor(tag) { this.tag = tag; this.children = []; this.value = ''; this.style = {}; this.attributes = {}; this.classList = { add() {} }; }
    set id(value) { this._id=value;nodes.set(value,this); }
    get id() { return this._id; }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = nodes; }
    addEventListener(name,callback) { (this.listeners ||= {})[name]=callback; }
    focus() { this.focused = true; }
    setAttribute(k,v) { this.attributes[k]=v; }
    removeAttribute(k) { delete this.attributes[k]; }
  }
  const nodes = new Map();
  const context = vm.createContext({ URL, Intl, Date, encodeURIComponent,
    document: { documentElement: new Node('html'), createElementNS: (_ns,tag) => new Node(tag), getElementById(id) { if (!nodes.has(id)) nodes.set(id, new Node('div')); return nodes.get(id); }, createElement: tag => new Node(tag) },
    fetch: async (url, options) => url === '/health' ? { ok: true, json: async () => ({ ok: true }) } : fetchImpl(url, options),
  });
  vm.runInContext(readFileSync(new URL('../public/paper-backup.js', import.meta.url),'utf8'),context);
  vm.runInContext(source, context);
  return { nodes, run: code => vm.runInContext(code, context) };
}
const response = body => ({ ok: true, status: 200, json: async () => body });

test('candidate UI renders empty data and uses a token only in request headers', async () => {
  const calls = [];
  const p = page(async (url, options) => { calls.push({ url, options }); return response({ success: true, status: 'NO_DATA', KR: [], GLOBAL: [] }); });
  p.nodes.get('token').value = 'test-session-token';
  await p.run('loadCandidates()');
  assert.match(p.nodes.get('candidate-message').textContent, /준비된 분석 데이터/);
  assert.equal(calls[0].url, '/api/v2/candidates');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-session-token');
  assert.equal(p.nodes.get('token').value, '');
  assert.equal(p.nodes.get('candidate-load').disabled, false);
});

test('401 clears credentials and stale candidates and enables retry', async () => {
  const p = page(async () => ({ ok: false, status: 401 }));
  p.nodes.get('token').value = 'invalid-token';
  p.run('byId("candidate-kr").append({ textContent: "stale candidate" })');
  await p.run('loadCandidates()');
  assert.equal(p.nodes.get('candidate-kr').children.length, 0);
  assert.match(p.nodes.get('candidate-message').textContent, /토큰/);
  assert.equal(p.run('sessionToken'), '');
  assert.equal(p.nodes.get('token').focused, true);
  assert.equal(p.nodes.get('candidate-load').disabled, false);
});

test('detail keeps source text inert and rejects executable source URLs', async () => {
  const p = page(async () => response({ success: true, analysisDate: '2026-09-29', candidate: {
    ticker: 'ABC', companyName: '<img src=x onerror=alert(1)>', score: 60, approved: true,
    agents: { risk: { severity: 20 }, bear: { reasons: ['valuation_risk'] } },
    evidence: [{ sourceType: 'filing', observedAt: '2026-09-27', factSummary: '<script>bad</script>', sourceUrl: 'javascript:alert(1)' }],
  } }));
  await p.run('loadCandidateDetail({ticker:"ABC",market:"KR"})');
  const detail = p.nodes.get('candidate-detail');
  assert.equal(detail.hidden, false);
  assert.equal(detail.children[0].textContent, '<img src=x onerror=alert(1)> · ABC');
  const row = detail.children.at(-1).children[0];
  assert.equal(row.children.some(node => node.tag === 'a'), false);
  assert.equal(row.children[1].textContent, '사실: <script>bad</script>');
});

test('performance UI shows no-data state and keeps credentials in headers only', async () => {
  const calls = [];
  const p = page(async (url, options) => { calls.push({ url, options }); return response({ success: true, reports: [] }); });
  p.nodes.get('token').value = 'performance-fixture-token';
  await p.run('loadPerformanceReports()');
  assert.match(p.nodes.get('performance-message').textContent, /보고서가 없습니다/);
  assert.equal(calls[0].url, '/api/v2/performance');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer performance-fixture-token');
  assert.equal(p.nodes.get('token').value, '');
  assert.equal(p.nodes.get('performance-load').disabled, false);
});
test('performance detail distinguishes held records and approved matured returns', async () => {
  const h = { status: 'READY', stockReturnPct: 5, benchmarkReturnPct: 2, excessReturnPct: 3, fromDate: '2026-09-02', toDate: '2026-09-09' };
  const p = page(async () => response({ success: true, report: { analysisDate: '2026-10-12', snapshotAnalysisDate: '2026-09-01', results: [
    { ticker: '<script>fixture</script>', market: 'KR', approvedAtSnapshot: false, performance: { horizons: { 5: h } } },
    { ticker: '005930', market: 'KR', approvedAtSnapshot: true, performance: { horizons: { 5: h } } },
  ] } }));
  await p.run('loadPerformanceDetail("' + 'a'.repeat(64) + '")');
  const detail = p.nodes.get('performance-detail');
  assert.equal(detail.hidden, false);
  assert.equal(detail.children[2].children[0].textContent, 'KR · <script>fixture</script>');
  assert.match(detail.children[2].children[3].textContent, /PENDING/);
  assert.match(detail.children[3].children[2].textContent, /5.00%.*2.00%.*3.00%p/);
});
test('performance authentication failure clears old detail and allows retry', async () => {
  const p = page(async () => ({ ok: false, status: 401 }));
  p.run('performanceDetail.append({textContent:"old result"});sessionToken="fixture"');
  await p.run('loadPerformanceReports()');
  assert.equal(p.nodes.get('performance-detail').children.length, 0);
  assert.equal(p.nodes.get('performance-detail').hidden, true);
  assert.equal(p.run('sessionToken'), '');
  assert.match(p.nodes.get('performance-message').textContent, /토큰/);
});
test('a later performance reload prevents an earlier detail response from appearing', async () => {
  let resolveDetail;
  const p = page(async url => url.endsWith('/' + 'a'.repeat(64)) ? new Promise(resolve => { resolveDetail = resolve; }) : response({ success: true, reports: [] }));
  const detail = p.run('loadPerformanceDetail("' + 'a'.repeat(64) + '")');
  await p.run('loadPerformanceReports()');
  resolveDetail(response({ success: true, report: { analysisDate: '2026-10-12', results: [] } }));
  await detail;
  assert.equal(p.nodes.get('performance-detail').hidden, true);
});

test('dashboard presents observed counts and stale state without invented market prices', () => {
  const p = page(async () => response({}));
  p.run('updateDashboard({status:"STALE",evaluatedCount:2,KR:[],GLOBAL:[],incompleteCandidates:[{}],analysisDate:"2026-10-10",generatedAt:"2026-10-10"})');
  assert.equal(p.nodes.get('dashboard-count').textContent,'2개');
  assert.match(p.nodes.get('dashboard-message').textContent,/오래된/);
  assert.match(p.nodes.get('dashboard-risk').textContent,/자료 부족 1개/);
});
test('candidate search and quality filtering preserve only matching API records', () => {
  const p = page(async () => response({}));
  p.nodes.get('candidate-search').value='apple'; p.nodes.get('candidate-quality').value='incomplete';
  p.run('renderCandidateMarket("candidate-incomplete",[{ticker:"AAPL",companyName:"Apple",approved:false,score:0},{ticker:"ABC",companyName:"Other",approved:false,score:0}])');
  assert.equal(p.nodes.get('candidate-incomplete').children.length,1);
  assert.match(p.nodes.get('candidate-incomplete').children[0].children[0].textContent,/Apple/);
});
test('valuation comparison tables retain missing samples and excluded reasons', () => {
  const p=page(async()=>response({}));
  p.run('renderValuationTables({ticker:"005930",krValuationAnalysis:{comparisons:{PER:{current:null,history:{count:0,median:null},peers:{median:null}}},peers:[],historical:[],excluded:[{ticker:"ABC",reason:"INDUSTRY_MISMATCH"}]}})');
  const detail=p.nodes.get('candidate-detail');
  assert.equal(detail.children.find(x=>x.className==='comparison-table').children[0].children[0].textContent,'과거·동종기업 평가배수 비교');
  assert.ok(detail.children.some(x=>x.textContent?.includes('공식 업종 코드가 다릅니다')));
});

test('validated price history enables only supported periods and missing selection clears old chart', () => {
  const p=page(async()=>response({}));
  p.run('renderPriceChart({ticker:"ABC",krValuationAnalysis:{evidence:{priceHistory:{qualityStatus:"READY",source:"fixture",currency:"KRW",sessions:[{date:"2026-08-01",close:100},{date:"2026-08-20",close:110},{date:"2026-09-01",close:120}]}}}})');
  const plot=p.nodes.get('price-chart');
  assert.equal(plot.children[1].children[0].disabled,false);
  assert.equal(plot.children[1].children[1].disabled,true);
  assert.equal(plot.children[2].children[0].tag,'svg');
  p.run('renderPriceChart({ticker:"MISSING"})');
  assert.match(plot.children[1].textContent,/미연결/);
});
test('daily reports consume the existing endpoint without a fabricated success field', async () => {
  const p=page(async url=>{assert.equal(url,'/api/reports?limit=10');return response({reports:[]});});
  await p.run('loadDailyReports()');
  assert.match(p.nodes.get('daily-report-message').textContent,/보고서가 없습니다/);
  assert.equal(p.nodes.get('daily-report-load').disabled,false);
});
test('paper portfolio calculates only user-entered positions with a ready reference quote', () => {
  const p=page(async()=>response({}));
  p.run('updatePaperOptions({GLOBAL:[{market:"GLOBAL",ticker:"AAPL",companyName:"Apple",priceSnapshot:{status:"READY",close:120,currency:"USD",sessionDate:"2026-10-09"}}]})');
  p.run('byId("paper-buy");byId("paper-quantity")');
  p.nodes.get('paper-stock').value='GLOBAL:AAPL';p.nodes.get('paper-buy').value='100';p.nodes.get('paper-quantity').value='2';
  p.run('addPaperPosition()');
  assert.match(p.nodes.get('paper-results').children[0].textContent,/손익 40.00.*20.00%/);
  p.nodes.get('paper-buy').value='0';p.run('addPaperPosition()');
  assert.equal(p.run('paperPositions.length'),1);
  assert.match(p.nodes.get('paper-message').textContent,/양수/);
});
test('cumulative chart renders distinct benchmark lines and accessible values only for validated approved data', () => {
 const p=page(async()=>response({}));
 p.run('globalThis.chartRow={ticker:"005930",market:"KR",approvedAtSnapshot:true,performance:{cumulative:{benchmark:"KOSPI",basis:"TOTAL_RETURN",points:[{date:"2026-09-02",stockReturnPct:0,benchmarkReturnPct:0},{date:"2026-09-03",stockReturnPct:10,benchmarkReturnPct:2}]}}};globalThis.chart=renderCumulativeChart(chartRow)');
 assert.equal(p.run('chart.children[1].tag'),'svg');assert.equal(p.run('chart.children[1].children.length'),2);
 assert.equal(p.run('chart.children[1].children[1].attributes["stroke-dasharray"]'),'6 4');
 assert.match(p.run('chart.children[3].children[1].children[2].children[1].textContent'),/10.00%/);
 assert.match(p.run('renderCumulativeChart({...chartRow,approvedAtSnapshot:false}).children[1].textContent'),/미연결/);
});
test('native connection failure clears the online indicator and labels retained data', () => {
 const p=page(async()=>response({}));p.run('latestCandidateData={analysisDate:"2026-10-12"};kstockConnectionFailed()');
 assert.equal(p.nodes.get('health-label').textContent,'서버 연결 실패');assert.equal(p.nodes.get('health-dot').className,'status-dot');
 assert.match(p.nodes.get('dashboard-message').textContent,/이전 조회.*마지막 분석/);
});
test('observed KIS history renders with review warning without pretending to be validated total return', () => {
 const p=page(async()=>response({}));
 p.run('renderPriceChart({ticker:"005930",krValuationAnalysis:{evidence:{priceHistory:{qualityStatus:"UNDER_REVIEW",displayStatus:"OBSERVED_PRICE_SERIES",basis:"PROVIDER_ADJUSTED_PRICE_NOT_TOTAL_RETURN",source:"KIS daily prices",currency:"KRW",sessions:[{date:"2026-08-01",close:100},{date:"2026-08-20",close:110},{date:"2026-09-02",close:120}]}}}})');
 assert.equal(p.nodes.get('price-chart').children[2].children[0].tag,'svg');assert.ok(p.nodes.get('price-chart').children.some(x=>/기업행동 검토 중/.test(x.textContent||'')));
 p.run('renderPriceChart({ticker:"X",krValuationAnalysis:{evidence:{priceHistory:{qualityStatus:"UNDER_REVIEW",sessions:[{date:"2026-08-01",close:100},{date:"2026-08-20",close:110},{date:"2026-09-02",close:120}]}}}})');
 assert.match(p.nodes.get('price-chart').children[1].textContent,/미연결/);
});
test('TTM UI displays quarter continuity, actual period, currency, disclosure sources and missing states',()=>{
 const p=page(async()=>response({}));
 p.run('renderCandidateDetail({ticker:"005930",companyName:"Fixture",market:"KR",approved:false,krValuationAnalysis:{status:"INSUFFICIENT_DATA",peers:[],historical:[],excluded:[],comparisons:{},risks:[],missing:[],evidence:{ttm:{status:"READY",period:{start:"2025-07-01",end:"2026-06-30",basis:"CFS"},raw:{revenue:120,operatingIncome:12,netIncome:6},availableAt:"2026-08-14",receipts:["20260814000001"],quarterVerification:{status:"READY",quarters:[]}}}}},"2026-10-12")');
 const texts=p.nodes.get('candidate-detail').children.map(x=>x.textContent||'').join(' ');
 assert.match(texts,/2025-07-01 ~ 2026-06-30/);assert.match(texts,/120 KRW/);assert.match(texts,/OpenDART 연결 공시/);assert.match(texts,/최근 4개 분기 연속성: 확인됨/);assert.match(texts,/기업행동 검증 전에는/);
 assert.ok(p.nodes.get('candidate-detail').children.some(x=>x.href==='https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260814000001'));
 p.run('renderCandidateDetail({ticker:"005930",companyName:"Fixture",market:"KR",krValuationAnalysis:{status:"INSUFFICIENT_DATA",peers:[],historical:[],excluded:[],comparisons:{},risks:[],missing:[],evidence:{ttm:{status:"INSUFFICIENT_DATA",reason:"MISSING"}}}},"2026-10-12")');
 assert.ok(p.nodes.get('candidate-detail').children.some(x=>x.textContent?.includes('추정값을 만들지 않습니다')));
});
test('observed stock comparison chart is separate from candidate approval and disables unavailable periods',()=>{
 const p=page(async()=>response({}));
 p.run('globalThis.plot=renderObservedStockChart({status:"READY",basis:"PRICE_RETURN",index:"KOSPI",points:[{date:"2026-09-01",stockReturnPct:0,benchmarkReturnPct:0},{date:"2026-09-02",stockReturnPct:10,benchmarkReturnPct:2}]},"005930")');
 assert.equal(p.run('plot.children[0].children[0].disabled'),true);assert.equal(p.run('plot.children[0].children[1].disabled'),true);assert.equal(p.run('plot.children[1].children[0].children.length'),2);assert.match(p.run('plot.children[1].children[1].textContent'),/배당 제외.*연율화 없음/);
});
test('new stock performance UI requires a KR detail request and retains the session-only auth contract',async()=>{
 const calls=[],p=page(async(url,options)=>{calls.push({url,options});return response(url.includes('stock-performance')?{success:true,status:'PENDING',reason:'CORPORATE_ACTION_COVERAGE_REQUIRED'}:{success:true,candidate:{ticker:'005930',companyName:'Fixture',market:'KR',krValuationAnalysis:{status:'INSUFFICIENT_DATA',peers:[],historical:[],comparisons:{},risks:[],missing:[],excluded:[]}}});});
 await p.run('loadCandidateDetail({ticker:"005930",market:"KR"})');assert.equal(calls.length,2);assert.equal(calls[1].url,'/api/v2/stock-performance/005930');assert.equal(calls[1].options.cache,'no-store');
});
test('share and action evidence UI distinguishes report counts from aligned valuation and effective events',()=>{
 const p=page(async()=>response({}));
 p.run('renderCandidateDetail({ticker:"005930",companyName:"Fixture",market:"KR",krValuationAnalysis:{status:"INSUFFICIENT_DATA",peers:[],historical:[],excluded:[],comparisons:{},risks:[],missing:[],evidence:{priceHistory:{asOfDate:"2026-10-08"},shareCount:{records:[{shareClass:"COMMON",issued:1000,treasury:100,outstanding:900,asOfDate:"2026-06-30",verificationStatus:"VERIFIED",sourceDocumentId:"20260814003699"}]},shareAlignment:{status:"BLOCKED"},actionEvidence:{events:[{label:"주당 현금배당금",eventType:"DIVIDEND_REPORT",sourceDocumentId:"20260814003699",sourceUrl:"https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260814003699",effectiveDate:null,recordDate:null,collectedAt:"2026-10-12"}]}}}},"2026-10-12")');
 const nodes=p.nodes.get('candidate-detail').children,text=nodes.map(x=>x.textContent||'').join(' ');
 assert.match(text,/주가 기준일: 2026-10-08.*계산 보류/);assert.match(text,/총발행 1,000주.*자기주식 100주.*유통 900주/);assert.match(text,/보고서 기준일 이후 주식수 변동/);
 const details=nodes.find(x=>x.tag==='details'&&x.children[0]?.textContent?.includes('확정 이벤트 수가 아닙니다'));assert.ok(details);assert.match(details.children[1].textContent,/권리 적용일 미확인.*주주 기준일 미확인/);assert.match(text,/EV\/EBITDA.*입력이 부족/);
});
test('official entitlement UI distinguishes confirmed amount from missing ex-date and scheduled payment',()=>{
 const p=page(async()=>response({}));
 p.run('renderCandidateDetail({ticker:"005930",companyName:"Fixture",market:"KR",krValuationAnalysis:{status:"INSUFFICIENT_DATA",peers:[],historical:[],excluded:[],comparisons:{},risks:[],missing:[],evidence:{entitlementEvents:[{shareClass:"COMMON",announcementDate:"2026-07-30",recordDate:"2026-06-30",paymentDate:"2026-08-28",exDate:null,cashPerShare:374,currency:"KRW",verificationStatus:"PENDING_VERIFICATION",sourceUrl:"https://www.samsung.com/global/ir/reports-disclosures/public-disclosure-view.84746/"}]}}},"2026-10-12")');
 const texts=p.nodes.get('candidate-detail').children.map(x=>x.textContent||'').join(' ');assert.match(texts,/기준일 2026-06-30.*배당락일 미확인.*지급 예정일 2026-08-28.*374 KRW/);assert.match(texts,/지급 완료 확인을 의미하지 않습니다/);
});
test('original review UI shows retrieved proof without exposing private archive paths',()=>{
 const p=page(async()=>response({}));
 p.run('renderCandidateDetail({ticker:"005930",market:"KR",krValuationAnalysis:{peers:[],historical:[],excluded:[],comparisons:{},risks:[],missing:[],evidence:{disclosureReview:{total:21,retrieved:21,relevant:0,documents:[{date:"20260921",title:"Fixture",classification:"NOT_RELEVANT",reason:"ownership only",originalStatus:"ORIGINAL_RETRIEVED",receipt:"20260921000001",sourceUrl:"https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260921000001",file:"private.zip"}]}}}},"2026-10-12")');
 const nodes=p.nodes.get('candidate-detail').children;assert.match(nodes.map(x=>x.textContent||'').join(' '),/원문 확보 21 \/ 21건.*관련 기업행동 0건/);
 const detail=nodes.find(x=>x.tag==='details');assert.equal(detail.children.at(-1).href,'https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260921000001');assert.ok(!JSON.stringify(nodes).includes('private.zip'));
});
test('Q3 UI distinguishes verified KRX ex-date from unknown amount/payment and pending coverage',()=>{
 const p=page(async()=>response({}));
 p.run('renderCandidateDetail({ticker:"005930",market:"KR",krValuationAnalysis:{peers:[],historical:[],excluded:[],comparisons:{},risks:[],missing:[],evidence:{rightsInvestigation:{fromDate:"2026-08-26",toDate:"2026-10-08",exDateVerified:true,exDate:"2026-09-29",listingCount:22,typeStatuses:[],references:[],treasuryEvents:[]},entitlementEvents:[{shareClass:"COMMON",announcementDate:"2026-09-21",recordDate:"2026-09-30",exDate:"2026-09-29",exDateVerified:true,cashPerShare:null,paymentDate:null,currency:"KRW",verificationStatus:"PENDING_VERIFICATION"}]}}},"2026-10-12")');
 const text=p.nodes.get('candidate-detail').children.map(x=>x.textContent||'').join(' ');assert.match(text,/배당락일: 확인됨 · 2026-09-29.*권리락일: 미확인/);assert.match(text,/기준일 2026-09-30.*배당락일 2026-09-29.*지급 예정일 미확인.*주당 미확인/);assert.match(text,/기업행동 전수 검증 대기/);
});

test('treasury UI keeps planned requested and actual shares separate and counts blocked',()=>{const p=page(async()=>response({}));p.run('renderCandidateDetail({ticker:"005930",market:"KR",krValuationAnalysis:{peers:[],historical:[],excluded:[],comparisons:{},risks:[],missing:[],evidence:{rightsInvestigation:{fromDate:"2026-08-26",toDate:"2026-10-08",treasuryEvents:[],references:[],coverageAudit:[],treasuryExecutionReview:{planQuantity:100,actualQuantity:90,observedQuantity:90,actualFromDate:"2026-09-01",actualToDate:"2026-09-01",events:[{effectiveDate:"2026-09-01",quantity:90,requestedQuantity:100,collectedAt:"2026-10-12"}]}}}}},"2026-10-12")');const text=p.nodes.get('candidate-detail').children.map(x=>x.textContent||'').join(' ');assert.match(text,/예정 취득 100주 · 실제 취득 90주/);assert.match(text,/현재 주식수 계산 보류/);assert.match(text,/실제 소각 수량 미확인/);assert.match(text,/성과 계산 가능 구간 없음/);});

test('balance UI separates historical arithmetic match from unverified current closing',()=>{
 const p=page(async()=>response({}));
 const balance={opening:{quantity:100,asOfDate:'2026-06-30',source:'fixture'},closing:{quantity:90,asOfDate:'2026-08-21',source:'fixture'},historical:{totals:{disposal:10},difference:0},current:{asOfDate:'2026-10-08'}};
 p.run(`renderCandidateDetail(${JSON.stringify({ticker:'005930',market:'KR',krValuationAnalysis:{peers:[],historical:[],excluded:[],comparisons:{},risks:[],missing:[],evidence:{rightsInvestigation:{treasuryEvents:[],references:[],balanceReview:balance}}}})},"2026-10-12")`);
 const text=p.nodes.get('candidate-detail').children.map(x=>x.textContent||'').join(' ');
 assert.match(text,/대사 차이 0주 · 산술 일치/);assert.match(text,/2026-10-08 기말잔고: 미확인/);assert.match(text,/현재 잔고를 확정하지 않습니다/);
});
test('official balance UI separates actual reference date from unconfirmed price cutoff',()=>{
 const p=page(async()=>response({}));
 const balance={opening:{quantity:100,asOfDate:'2026-06-30',source:'fixture'},closing:{quantity:90,asOfDate:'2026-08-21',source:'fixture'},historical:{totals:{disposal:10},difference:0},current:{asOfDate:'2026-10-08'},officialPeriods:{latestOfficial:{balanceAsOfDate:'2026-08-21',quantity:90,disclosureDate:'2026-08-21'},requestedSource:{requestedDate:'2026-10-08',status:'SOURCE_NOT_CONFIRMED'},intervals:[]}};
 p.run(`renderCandidateDetail(${JSON.stringify({ticker:'005930',market:'KR',krValuationAnalysis:{peers:[],historical:[],excluded:[],comparisons:{},risks:[],missing:[],evidence:{rightsInvestigation:{treasuryEvents:[],references:[],balanceReview:balance}}}})},"2026-10-12")`);
 const text=p.nodes.get('candidate-detail').children.map(x=>x.textContent||'').join(' ');assert.match(text,/확인된 최신 공식 기준일 2026-08-21 · 보통주 90주/);assert.match(text,/2026-10-08 자료 확인: 원천 미확인 · SOURCE_NOT_CONFIRMED/);assert.match(text,/자료가 존재하지 않는다는 뜻이 아닙니다/);
});
test('expanded peer investigation and action windows expose blocked states without invented multiples',()=>{
 const p=page(async()=>response({}));
 const evidence={rightsInvestigation:{treasuryEvents:[],references:[]},actionCoverageRanges:{fromDate:'2026-08-26',toDate:'2026-10-08',priceContractVerified:true,performanceCandidates:[],windows:[{fromDate:'2026-08-26',toDate:'2026-10-08',status:'PENDING_VERIFICATION',missingTypes:['PAR_VALUE_CHANGE']}]},peerExpansionReview:{candidateCount:6,counts:{ELIGIBLE:0,EXCLUDED:6,PENDING_VERIFICATION:0,INSUFFICIENT_DATA:0},minimum:3,candidates:[{ticker:'MU',companyName:'Micron',status:'EXCLUDED',reasons:['MARKET_OR_CURRENCY_SCOPE_MISMATCH'],asOfDate:null}]}};
 p.run(`renderCandidateDetail(${JSON.stringify({ticker:'005930',market:'KR',krValuationAnalysis:{peers:[],historical:[],excluded:[],comparisons:{},risks:[],missing:[],evidence}})},"2026-10-12")`);
 const text=p.nodes.get('candidate-detail').children.map(x=>x.textContent||'').join(' ');assert.match(text,/조사 후보 6개 · 유효 0개 · 제외 6개/);assert.match(text,/검증된 기업행동 구간 후보 0개/);assert.match(text,/액면변경/);assert.match(text,/Micron \(MU\) · 제외/);assert.match(text,/EV\/EBITDA.*입력 부족/);
});

 test('peer diagnosis UI preserves independent counts and explicit correction hold',()=>{
 const p=page(async()=>response({}));
 p.run('renderValuationTables({ticker:"005930",krValuationAnalysis:{evidence:{peerMetricDiagnosis:{candidateCount:0,minimum:3,metricCounts:{PER:0,PBR:2,PSR:1,EV_EBITDA:0},candidates:[]}},comparisons:{},peers:[],excluded:[]}})');
 const nodes=[];const visit=n=>{nodes.push(n);for(const child of n.children||[])visit(child)};visit(p.nodes.get('candidate-detail'));
 const table=nodes.find(n=>n.tag==='table'&&n.children[0]?.textContent==='배수별 유효 표본');
 assert.deepEqual(table.children[2].children.map(r=>r.children.slice(0,3).map(c=>c.textContent)),[['PER','0','3'],['PBR','2','3'],['PSR','1','3'],['EV/EBITDA','0','3']]);
 assert.equal(table.children[2].children.every(r=>r.children.at(-1).textContent==='추천 보류'),true);
 });

test('dated price and correction UI exposes source chain without promoting undated cap',()=>{
 const p=page(async()=>response({}));
 p.run('renderValuationTables({ticker:"005930",krValuationAnalysis:{evidence:{peerMetricDiagnosis:{valuationDate:"2026-10-08",candidateCount:1,minimum:3,metricCounts:{PER:0},candidates:[{ticker:"000990",companyName:"DB",exclusionReasons:[],missingData:[],metrics:{PBR:{value:null,asOfDate:"2026-10-08",comparisonExclusionReasons:[]}},priceEvidence:{close:138800,currency:"KRW",asOfDate:"2026-10-08",sourceUrl:"https://example.com/"},correction:{status:"VERIFIED",originalReceipt:"20260316001250",correctionReceipt:"20260601001661",publishedAt:"2026-06-01",sourceUrls:["https://dart.fss.or.kr/"],changes:[{statementBasis:"CFS",year:"2025",field:"FX",before:"old",after:"new"}],reason:"단위",reviewedThrough:"2026-10-08"}}]}},comparisons:{},peers:[],excluded:[]}})');
 const nodes=[];const visit=n=>{nodes.push(n);for(const child of n.children||[])visit(child)};visit(p.nodes.get('candidate-detail'));const text=nodes.map(n=>n.textContent||'').join(' ');
 assert.match(text,/평가 기준일 2026-10-08/);assert.match(text,/138,800 KRW/);assert.match(text,/20260316001250 → 정정 20260601001661/);assert.match(text,/변경 전: old/);assert.match(text,/변경 후: new/);assert.match(text,/당시 공개시각은 미확인/);
});

test('legacy business source without review timestamp renders pending instead of throwing',()=>{const p=page(async()=>response({}));assert.doesNotThrow(()=>p.run('renderValuationTables({ticker:"005930",krValuationAnalysis:{evidence:{peerMetricDiagnosis:{candidateCount:1,minimum:3,metricCounts:{PBR:0},candidates:[{ticker:"000990",companyName:"DB",exclusionReasons:[],missingData:[],metrics:{PBR:{comparisonExclusionReasons:[]}},businessReview:{businessIdentityConfirmed:true}}]}},comparisons:{},peers:[],excluded:[]}})'));const nodes=[];const visit=n=>{nodes.push(n);for(const c of n.children||[])visit(c)};visit(p.nodes.get('candidate-detail'));assert.ok(nodes.some(n=>n.textContent?.includes('검토 미확인')));assert.ok(!nodes.some(n=>n.textContent?.includes('undefined')));});

test('capital investigation UI distinguishes dated close from undated quote and KRX session failure',()=>{const p=page(async()=>response({}));p.run('renderValuationTables({ticker:"005930",krValuationAnalysis:{evidence:{peerMetricDiagnosis:{candidateCount:1,minimum:3,metricCounts:{PBR:0},candidates:[{ticker:"000990",companyName:"DB",exclusionReasons:[],missingData:[],metrics:{PBR:{comparisonExclusionReasons:[]}},historicalCapitalReview:{undatedSummaryPrice:131000,datedClose:138800,checkedAt:"2026-10-12",sourceUrl:"https://github.com/koreainvestment/open-trading-api",krx:{httpStatus:400,body:"LOGOUT"}}}]}},comparisons:{},peers:[],excluded:[]}})');const nodes=[];const walk=n=>{nodes.push(n);for(const c of n.children||[])walk(c)};walk(p.nodes.get('candidate-detail'));const text=nodes.map(n=>n.textContent||'').join(' ');assert.match(text,/131,000 KRW와 10월 8일 종가 138,800 KRW를 결합하지 않습니다/);assert.match(text,/HTTP 400 \/ LOGOUT/);assert.match(text,/인증된 조회 세션/);});

test('numeric reconciliation UI nests directly observed values and units in scrollable tables',()=>{const p=page(async()=>response({}));p.run('renderValuationTables({ticker:"005930",krValuationAnalysis:{evidence:{peerMetricDiagnosis:{candidateCount:1,minimum:3,metricCounts:{PBR:0},candidates:[{ticker:"000990",companyName:"DB",exclusionReasons:[],missingData:[],metrics:{PBR:{comparisonExclusionReasons:[]}},correctionNumeric:{tableCount:8,rowCount:200,numericChanges:26,unitChanges:60,unresolvedUnits:20,tables:[{statementBasis:"CFS",year:"2025",field:"외화자산",rows:[{account:"현금",currency:"JPY",measure:"FOREIGN_CURRENCY",beforeValue:6,beforeUnit:"십만JPY",afterValue:554,afterUnit:"천JPY"}]}]}}]}},comparisons:{},peers:[],excluded:[]}})');const nodes=[];const walk=n=>{nodes.push(n);for(const c of n.children||[])walk(c)};walk(p.nodes.get('candidate-detail'));const text=nodes.map(n=>n.textContent||'').join(' ');assert.match(text,/숫자 변경 26개/);assert.match(text,/단위 변경 60개/);const table=nodes.find(n=>n.tag==='table'&&n.children[0]?.textContent.includes('원문 셀 직접 대조'));assert.deepEqual(table.children[2].children[0].children.map(n=>n.textContent),['현금','JPY','외화 원액','6','십만JPY','554','천JPY','변경']);const details=nodes.find(n=>n.tag==='details'&&n.children[0]?.textContent.includes('200개 직접'));assert.equal(details.children[1].attributes.role,'region');});

function validationText(node){return [node?.textContent||'',...(node?.children||[]).map(validationText)].join(' ');}
test('worker UI displays saved status and independent eligible counts without fabricated running state',async()=>{
 const p=page(async()=>response({success:true,worker:{running:false},scheduler:{enabled:true,intervalMs:900000,mode:'SAVED_EVIDENCE_ONLY'},counts:{total:6,QUEUED:0,RUNNING:0,VERIFIED:0,PARTIAL:3,BLOCKED:3,FAILED:0},metricEligibility:{PER:0,PBR:0,PSR:0,EV_EBITDA:0},jobs:[{ticker:'000990',companyName:'DB하이텍',state:'BLOCKED',valuationDate:'2026-10-08',price:138800,priceDate:'2026-10-08',currency:'KRW',missing:['KRX_AUTH_REQUIRED'],metrics:{PER:{verificationStatus:'PENDING',value:null,exclusionReasons:['CAPITAL_DATE_MISSING']}}}],sources:[{name:'KRX',status:'AUTH_REQUIRED'}],logs:[]}));
 await p.run('refreshPeerValidation()');assert.match(p.nodes.get('agent-message').textContent,/현재 실행 작업 없음/);assert.match(p.nodes.get('agent-message').textContent,/저장된 근거 재검증/);assert.match(validationText(p.nodes.get('agent-queue')),/DB하이텍.*차단.*KRX 인증 자료 필요/);assert.match(validationText(p.nodes.get('peer-validation-table')),/138,800 KRW · 2026-10-08/);assert.match(validationText(p.nodes.get('peer-validation-table')),/자료 부족 · 계산 보류/);assert.match(validationText(p.nodes.get('peer-metrics')),/PER 유효 표본 0/);
});
test('worker UI error keeps previous results explicitly stale and allows retry',async()=>{
 const p=page(async()=>{throw Error('NETWORK');});await p.run('refreshPeerValidation()');assert.match(p.nodes.get('agent-message').textContent,/연결 실패.*최신 상태로 확인되지/);assert.equal(p.nodes.get('agent-refresh').disabled,false);assert.match(p.nodes.get('peer-validation-message').textContent,/이전 결과/);
});
test('company evidence separates metric hold from source links and missing data',()=>{
 const p=page(async()=>response({success:true}));p.run(`renderValidationEvidence({ticker:'000990',companyName:'DB하이텍',state:'BLOCKED',valuationDate:'2026-10-08',metrics:{PER:{verificationStatus:'PENDING',value:null,exclusionReasons:['CAPITAL_DATE_MISSING']}},missing:['주식수 기준일 필요'],evidence:['https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260601001661']})`);const panel=p.nodes.get('peer-company-evidence');assert.match(validationText(panel),/PER · 자료 부족 · 계산 보류/);assert.match(validationText(panel),/주식수 기준일 필요/);assert.equal(panel.children.find(n=>n.tag==='a').href,'https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260601001661');
});

test('automatic worker refresh replaces selected company evidence with current state',()=>{const p=page(async()=>response({success:true}));p.run("renderValidationEvidence({ticker:'000990',companyName:'DB하이텍',state:'RUNNING',metrics:{},missing:['이전 자료'],evidence:[]})");p.run("renderPeerValidationStatus({counts:{total:1},worker:{running:false},scheduler:{enabled:false},metricEligibility:{PER:0,PBR:0,PSR:0,EV_EBITDA:0},jobs:[{ticker:'000990',companyName:'DB하이텍',state:'BLOCKED',metrics:{},missing:['최신 인증 차단'],evidence:[]}]})");assert.match(validationText(p.nodes.get('peer-company-evidence')),/최신 인증 차단/);assert.doesNotMatch(validationText(p.nodes.get('peer-company-evidence')),/이전 자료/);});

test('collection status distinguishes disabled collection and real counts without inventing progress',()=>{
 const p=page(async()=>response({}));
 p.run(`renderPeerValidationStatus({counts:{total:6,COLLECTING:0,VALIDATING:0},worker:{running:false},scheduler:{enabled:true,intervalMs:1800000,mode:'SAVED_EVIDENCE_ONLY'},jobs:[],collection:{enabled:false,worker:{running:false},lastRunAt:'2026-10-12T08:00:00Z',nextRunAt:null,counts:{success:2,FAILED:1,unchanged:0},sources:[{name:'KRX',status:'AUTH_BLOCKED',reason:'AUTH_BLOCKED'}],jobs:[{ticker:'000990',companyName:'DB하이텍',state:'BLOCKED',dataAsOfDate:'2026-10-08',lastCollectedAt:'2026-10-12T07:59:00Z',nextTask:'KRX_AUTH_REQUIRED',retryable:false}]}})`);
 const text=validationText(p.nodes.get('agent-collection'));assert.match(text,/외부 수집 비활성/);assert.match(text,/수집 근거 보유 기업 2/);assert.match(text,/실패 기업 1/);assert.match(text,/인증 차단 소스 1/);assert.match(text,/다음 실행 예정 없음/);assert.match(text,/DB하이텍.*2026-10-08.*KRX 인증 자료 필요.*자동 재시도 없음/);assert.doesNotMatch(text,/%/);
 p.run('renderCollectionStatus(undefined)');assert.match(validationText(p.nodes.get('agent-collection')),/수집 상태 미확인/);assert.doesNotMatch(validationText(p.nodes.get('agent-collection')),/수집 성공 0/);
});
test('peer metric cells independently show verified values and withhold unverified supplied numbers',()=>{
 const p=page(async()=>response({}));
 p.run(`renderPeerValidationStatus({counts:{total:1},worker:{running:false},scheduler:{enabled:false},jobs:[{ticker:'000990',companyName:'DB하이텍',state:'VALIDATING',valuationDate:'2026-10-08',metrics:{PER:{verificationStatus:'PENDING',value:999,exclusionReasons:['CAPITAL_DATE_MISSING']},PBR:{verificationStatus:'VERIFIED',value:1.2,comparisonStatus:'INELIGIBLE',comparisonExclusionReasons:['BUSINESS_COMPARABILITY_UNVERIFIED']},PSR:{verificationStatus:'VERIFIED',value:2.3,comparisonStatus:'ELIGIBLE'},EV_EBITDA:{verificationStatus:'INSUFFICIENT_DATA',value:null,exclusionReasons:['VERIFIED_EBITDA_INPUTS_REQUIRED']}}}]})`);
 const text=validationText(p.nodes.get('peer-validation-table'));assert.doesNotMatch(text,/999/);assert.match(text,/—.*시가총액 기준일 미확인/);assert.match(text,/1.2배.*비교 보류.*연결기업 사업 비교 검증 대기/);assert.match(text,/2.3배.*비교 표본 유효/);assert.match(text,/같은 기간 EBITDA 근거 필요/);assert.match(text,/검증 중/);
});
test('company data quality includes actual collection validation times and retry conditions',()=>{
 const p=page(async()=>response({}));p.run(`renderValidationEvidence({ticker:'000990',state:'COLLECTING',valuationDate:'2026-10-08',lastCollectedAt:'2026-10-12T08:00:00Z',lastValidatedAt:'2026-10-12T08:30:00Z',nextTask:'KRX_AUTH_REQUIRED',retryable:false,metrics:{PER:{verificationStatus:'PENDING',value:999}},missing:['CAPITAL_DATE_MISSING']})`);const text=validationText(p.nodes.get('peer-company-evidence'));assert.match(text,/수집 중/);assert.match(text,/마지막 수집.*17:00:00.*마지막 검증.*17:30:00/);assert.match(text,/KRX 인증 자료 필요.*자동 재시도 없음/);assert.doesNotMatch(text,/999배/);
});
test('correction differences UI keeps observed arithmetic separate from unresolved causes and future cutoff',()=>{
 const p=page(async()=>response({}));p.run(`renderValidationEvidence({ticker:'000990',state:'BLOCKED',correctionDifferences:{resolved:0,unresolved:1,sourceAvailableAtValuationDate:false,differences:[{id:'DB-FX-01',periodStart:'2025-01-01',periodEnd:'2025-12-31',statementBasis:'CFS',originalTableIndex:35,correctionTableIndex:36,field:'외화부채',item:'합계',originalReceipt:'20260316001250',correctionReceipt:'20260601001661',beforeValue:554556,afterValue:554556,beforeUnit:'천USD',afterUnit:'천USD',stage:'after',currency:'USD',total:554556,componentSum:'54556',difference:'500000',unit:'천USD',cause:'UNRESOLVED'}]}})`);const text=validationText(p.nodes.get('peer-company-evidence'));assert.match(text,/해결 0건 · 미해결 1건/);assert.match(text,/평가 기준일 이후 자료 사용 차단/);assert.match(text,/20260316001250 → 20260601001661/);assert.match(text,/원문 합계 554556 \/ 구성합 54556 \/ 차이 500000 천USD/);assert.match(text,/미해결 · 공식 원인 설명 미확보/);assert.doesNotMatch(text,/반올림 오류 확정/);
});


test('PBR evidence exposes unverified source amounts and dates without calculating a multiple',()=>{
 const p=page(async()=>response({}));p.run(`renderValidationEvidence({ticker:'000990',state:'BLOCKED',valuationDate:'2026-10-08',nextValidationAt:'2026-10-12T09:00:00Z',pbrValidation:{verificationStatus:'INSUFFICIENT_DATA',value:999,eligible:false,priorityRank:1,completeness:{observed:5,total:10},inputs:{price:{value:138800,currency:'KRW',asOfDate:'2026-10-08',verificationStatus:'VERIFIED',sourceUrl:'https://github.com/koreainvestment/open-trading-api'},bookValue:{value:1000,currency:'KRW',unit:'KRW',asOfDate:'2026-06-30',consolidationType:'CFS',verificationStatus:'SOURCE_ACCOUNT_IDENTIFIED',sourceUrl:'https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260601001661'}},reasons:['PBR_MARKET_CAP_UNVERIFIED','PBR_SHARE_CLASS_SCOPE_MISMATCH']}})`);
 const text=validationText(p.nodes.get('peer-company-evidence'));assert.match(text,/PBR 계산 보류/);assert.doesNotMatch(text,/999배/);assert.match(text,/138,800 KRW.*2026-10-08/);assert.match(text,/1,000 KRW.*미검증 원천값.*2026-06-30/);assert.match(text,/재무 기준 연결/);assert.match(text,/동일 기준일 공식 시가총액 필요/);assert.match(text,/주식 범위 일치 필요|범위 일치 필요/);assert.match(text,/18:00:00/);
});
test('company shortcuts open evidence without navigating a wide table and preserve scheduler date',()=>{
 const p=page(async()=>response({}));p.run(`renderPeerValidationStatus({worker:{running:false},scheduler:{enabled:true},nextRunAt:'2026-10-12T09:00:00Z',jobs:[{ticker:'000660',companyName:'SK',state:'BLOCKED',pbrValidation:{priorityRank:2,inputs:{},reasons:[]}},{ticker:'000990',companyName:'DB',state:'BLOCKED',pbrValidation:{priorityRank:1,inputs:{},reasons:[]}}]})`);
 const shortcuts=p.nodes.get('peer-evidence-shortcuts');assert.equal(shortcuts.children[1].textContent,'DB · PBR 근거');shortcuts.children[1].listeners.click();assert.match(validationText(p.nodes.get('peer-company-evidence')),/DB · 기업별 검증 근거/);assert.match(validationText(p.nodes.get('peer-company-evidence')),/18:00:00/);
});
test('PBR source URLs remain inert and invalid source schemes are withheld',()=>{
 const p=page(async()=>response({}));p.run(`renderValidationEvidence({ticker:'X',state:'PARTIAL',pbrValidation:{verificationStatus:'INSUFFICIENT_DATA',inputs:{bookValue:{sourceUrl:'javascript:alert(1)',accountId:'<img src=x onerror=alert(1)>'}},reasons:[]}})`);const panel=p.nodes.get('peer-company-evidence');assert.match(validationText(panel),/출처 미확인/);const all=[];const walk=n=>{all.push(n);for(const c of n.children||[])walk(c)};walk(panel);assert.equal(all.filter(n=>n.tag==='a').length,0);assert.match(validationText(panel),/<img src=x/);
});


test('unchanged automatic refresh preserves the selected evidence DOM and horizontal scroll state',()=>{
 const p=page(async()=>response({}));const job="{ticker:'000990',companyName:'DB',state:'BLOCKED',pbrValidation:{inputs:{},reasons:[]}}";
 p.run(`renderValidationEvidence(${job})`);const panel=p.nodes.get('peer-company-evidence'),initial=panel.children[0];initial.scrollLeft=125;
 p.run(`renderValidationEvidence(${job})`);assert.equal(panel.children[0],initial);assert.equal(panel.children[0].scrollLeft,125);
 p.run(`renderValidationEvidence({...${job},state:'PARTIAL'})`);assert.notEqual(panel.children[0],initial);assert.match(validationText(panel),/자료 부족/);
});

test('share bridge detail distinguishes historical checkpoint, voting scope and withheld valuation values',()=>{const p=page(async()=>response({}));p.run('renderValidationEvidence({ticker:"000990",companyName:"DB",state:"PARTIAL",valuationDate:"2026-10-08",shareBridge:{valuationDate:"2026-10-08",coverage:{fromDate:"2026-07-01",toDate:"2026-10-08",listingComplete:true},disclosures:[],baselineRecords:[{shareClass:"COMMON",issuedShares:100,treasuryShares:5,asOfDate:"2026-06-30"}],october8IssuedShares:null,shareDifference:null,marketCap:null,checkpoints:[{asOfDate:"2026-10-01",disclosureDate:"2026-10-07",votingIssuedShares:100}]}})');const nodes=[];const walk=n=>{nodes.push(n);for(const c of n.children||[])walk(c)};walk(p.nodes.get('peer-company-evidence'));const text=nodes.map(n=>n.textContent||'').join(' ');assert.match(text,/10월 8일 검증 발행주식수: 보류/);assert.match(text,/전체 발행주식수 아님/);assert.match(text,/2026-10-01.*공개 2026-10-07/);assert.equal(nodes.find(n=>n.tag==='details').open,true);});

test('disclosure progress separates archive integrity from effect verification and renders a held queue',()=>{
 const p=page(async()=>response({}));p.run(`renderValidationEvidence({ticker:'000990',state:'BLOCKED',disclosureReview:{summary:{total:14,classified:12,relevant:10,originalArchivesVerified:2,originalEffectVerified:0,corporateActionsVerified:0},queue:[{priority:4,documentId:'20260929800684',documentTitle:'정정 공시',disclosureDate:'2026-09-29',classification:'CORRECTION',originalArchived:true,state:'PARTIAL',relatedDocumentId:null}]}})`);
 const text=validationText(p.nodes.get('peer-company-evidence'));assert.match(text,/공시 분류 → 원문 검증 → 주식수 대사 → 시가총액 → PBR/);assert.match(text,/원문 파일 무결성 확인 2건.*원문 효력 검증 완료 0건/);assert.match(text,/원문 보존 · 효력 검증 대기/);assert.match(text,/공식 연결 확인 필요/);assert.match(text,/외부 원문 수집은 자동 실행하지 않습니다/);
});

test('actual issuance evidence displays three distinct dates and official original links without enabling PBR',()=>{
 const p=page(async()=>response({}));p.run(`renderValidationEvidence({ticker:'000660',state:'PARTIAL',shareBridge:{coverage:{},issuanceChain:{verificationStatus:'VERIFIED',quantity:17790000,paymentDate:'2026-07-14',effectiveDate:'2026-07-15',listingDate:'2026-07-29',availableAt:'2026-07-24T23:59:59+09:00',documents:[{role:'LISTING',documentId:'20260724000273',disclosureDate:'2026-07-24',sourceUrl:'https://kind.krx.co.kr/external/fixture.htm'}]}},pbrValidation:{eligible:false,inputs:{},reasons:['PBR_MARKET_CAP_UNVERIFIED']}})`);
 const text=validationText(p.nodes.get('peer-company-evidence'));assert.match(text,/納|납입일 2026-07-14.*실제 발행 효력일 2026-07-15.*국내 상장일 2026-07-29/);assert.match(text,/상장일에 주식수를 다시 더하지 않습니다/);assert.match(text,/PBR 계산 보류/);
});

test('share summary distinguishes matched baseline classes from missing preferred data and keeps valuation held',()=>{
 const p=page(async()=>response({}));p.run(`renderValidationEvidence({ticker:'000660',state:'PARTIAL',shareBridge:{coverage:{},baselineOriginalReview:{documentId:'20260814003509',sourceUrl:'https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260814003509',matchedClasses:['COMMON']},baselineRecords:[{shareClass:'COMMON',issuedShares:712702365,treasuryShares:1626865},{shareClass:'PREFERRED',issuedShares:null,treasuryShares:null}],reconciliation:[{checkpointReviews:[{asOfDate:'2026-08-21',treasuryDifference:1014}]}],october8IssuedShares:null,marketCap:null}})`);const text=validationText(p.nodes.get('peer-company-evidence'));assert.match(text,/712,702,365주/);assert.match(text,/숫자 자료 없음·확정하지 않음/);assert.match(text,/자기주식 차이 1,014주/);assert.match(text,/10월 8일 발행주식수 보류.*PBR 보류/);
});

test('completed DB cancellation distinguishes actual date from missing registration and held valuation',()=>{const p=page(async()=>response({}));p.run(`renderValidationEvidence({ticker:'000990',state:'PARTIAL',shareBridge:{coverage:{},cancellationReview:{quantity:894000,effectiveDate:'2025-09-30',verificationStatus:'VERIFIED',baselineInclusion:{verificationStatus:'VERIFIED',includedInBaseline:true,baselineDate:'2026-06-30',treasuryScope:{physicalTreasuryShares:1054464,unexercisedExchangeShares:318249,statutoryTreasuryShares:736215},sourceUrl:'https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260814003091',sourceDocumentId:'20260814003091'},documents:[{role:'CORRECTION',disclosureDate:'2026-06-01',documentId:'20260601001661',sourceUrl:'https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260601001661'}]}}})`);const text=validationText(p.nodes.get('peer-company-evidence'));assert.match(text,/894,000주.*실제 소각일 2025-09-30/);assert.match(text,/변경등기일은 미확인/);assert.match(text,/10월 8일 주식수·시가총액·PBR은 별도 검증 대기/);assert.match(text,/다시 차감하지 않음/);assert.match(text,/1,054,464주.*318,249주.*736,215주/);});

test('influence research separates statement time, official evidence, unknown trade dates and interpretation',()=>{
 const p=page(async()=>response({}));p.run(`renderInfluenceResearch({asOf:'2026-10-12T10:00:00Z',people:[{personId:'test',name:'Fixture person',role:'Historical chair',verificationStatus:'VERIFIED'}],statements:[{personId:'test',title:'Fixture statement',spokenAt:null,publishedAt:'2025-08-22T14:00:00Z',verificationStatus:'VERIFIED',sourceUrl:'https://www.federalreserve.gov/fixture',analysis:{summary:'Possible relationship',modelVersion:null}}],capitalEvents:[{actorId:'test',eventType:'REPORTED_HOLDING_CHANGE',transactionDate:null,quantity:10,filingDate:'2025-09-01',verificationStatus:'VERIFIED',sourceUrl:'javascript:alert(1)'}],signals:[{signalType:'STATEMENT_SIGNAL',personId:'test',verificationStatus:'PARTIAL'}],marketReaction:{status:'HOLD'}})`);
 const text=validationText(p.nodes.get('influence-detail'));assert.match(text,/발언 시각 미확인.*공개 이용 기준/);assert.match(text,/해석·공식 발언 아님/);assert.match(text,/보고된 보유 변화.*거래일 미확인·추정하지 않음/);assert.match(text,/공식 원천자료 확인 필요/);assert.match(validationText(p.nodes.get('influence-signals')),/발언 신호.*투자 추천 HOLD/);assert.match(p.nodes.get('influence-market').textContent,/검증 보류/);
});
test('influence refresh preserves unchanged evidence and selected person, marks stale evidence on failure and recovers',async()=>{
 let fail=false;const fixture={success:true,people:[{personId:'a',name:'Fixture A'},{personId:'b',name:'Fixture B'}],statements:[],signals:[],capitalEvents:[]};const p=page(async()=>{if(fail)throw Error('offline');return response(fixture)});
 await p.run('refreshInfluenceResearch()');p.nodes.get('influence-people').children[1].listeners.click();const initial=p.nodes.get('influence-detail').children[0];await p.run('refreshInfluenceResearch()');assert.equal(p.nodes.get('influence-detail').children[0],initial);assert.equal(initial.textContent,'Fixture B');fail=true;await p.run('refreshInfluenceResearch()');assert.match(p.nodes.get('influence-message').textContent,/연결 실패.*이전 조회 결과/);assert.equal(p.nodes.get('influence-refresh').disabled,false);fail=false;await p.run('refreshInfluenceResearch()');assert.match(p.nodes.get('influence-message').textContent,/공식 근거 2명/);assert.equal(p.nodes.get('influence-detail').children[0],initial);
});

test('institution and insider disclosures stay visible without becoming the selected person transaction',()=>{
 const p=page(async()=>response({}));p.run(`renderInfluenceResearch({people:[{personId:'buffett',name:'Historical person',role:'CEO',roleScope:'AT_STATEMENT_ONLY'}],statements:[],capitalEvents:[{actorId:'sec:0001067983',actorType:'INSTITUTION',companyId:'AAPL',eventType:'REPORTED_HOLDING_CHANGE',reportingPeriod:'2025-06-30',filingDate:'2025-08-14',transactionDate:null,verificationStatus:'INSUFFICIENT_DATA',sourceValidationNote:'Preserved report comparison incomplete',sourceUrl:'https://www.sec.gov/Archives/fixture'},{actorId:'sec:insider',actorName:'Fixture insider',actorType:'INSIDER',companyId:'AAPL',eventType:'CONFIRMED_TRANSACTION',transactionDate:'2025-08-01',filingDate:'2025-08-04',verificationStatus:'PARTIAL'}],signals:[]})`);
 const text=validationText(p.nodes.get('influence-detail'));assert.match(text,/당시 직책 CEO/);assert.match(text,/기관·내부자 공시 2건.*인물 개인 거래 연결 미확인/);assert.match(text,/보고기간 2025-06-30.*공시일 2025-08-14.*거래일 미확인·추정하지 않음/);assert.match(text,/선택한 인물의 개인 거래로 연결하지 않습니다/);assert.match(text,/原|원천자료 제한 · Preserved report comparison incomplete/);assert.match(text,/내부자 Fixture insider/);
});

test('five signal research types show unavailable returns and sample limits without numerical zero substitution',()=>{
 const p=page(async()=>response({}));p.run(`renderInfluenceResearch({people:[],signals:[],signalResearch:{results:[{signalId:'fixture:statement',signalType:'STATEMENT_ONLY',publicAvailableAt:'2025-08-22T23:59:59Z',relatedSecurity:'FIXTURE',benchmark:'Fixture index',horizon:5,observedReturn:null,benchmarkReturn:null,excessReturn:null,sampleSize:0,verificationStatus:'INSUFFICIENT_DATA',limitations:['SAMPLE_SIZE_INSUFFICIENT']},{signalId:'fixture:aligned',signalType:'STATEMENT_CAPITAL_ALIGNED',horizon:20,observedReturn:0.5,benchmarkReturn:0.3,excessReturn:0.2,sampleSize:0,verificationStatus:'INSUFFICIENT_DATA',limitations:[]}]}})`);
 const text=validationText(p.nodes.get('signal-research-results'));assert.match(text,/資料|자료 부족 \(INSUFFICIENT_DATA\)/);assert.match(text,/5거래일/);assert.match(text,/20거래일/);assert.match(text,/검증 표본 부족/);assert.doesNotMatch(text,/50\.00%/);assert.doesNotMatch(text,/0\.00%/);assert.equal(p.nodes.get('signal-type-summary').children.length,5);assert.match(text,/단일 사건 반응은 예측력이나 인과관계의 증명이 아닙니다/);
 p.nodes.get('signal-research-filter').value='CAPITAL_ONLY';p.nodes.get('signal-research-filter').listeners.change();assert.match(validationText(p.nodes.get('signal-research-results')),/해당 유형의 실제 연구 결과 없음/);
 p.run(`renderInfluenceResearch({...influenceResearch,asOf:'2026-10-13T00:00:00Z'})`);assert.match(validationText(p.nodes.get('signal-research-results')),/해당 유형의 실제 연구 결과 없음/);
});
test('AI interpretation retains prompt provenance and original source reference separately from verified statement',()=>{
 const p=page(async()=>response({}));p.run(`renderInfluenceResearch({people:[{personId:'fixture',name:'Fixture'}],statements:[{personId:'fixture',statementId:'fixture:statement',verificationStatus:'VERIFIED',analysis:{kind:'AI_INFERENCE',modelVersion:'fixture-local:1',promptVersion:'research-v1',generatedAt:'2026-10-13T01:00:00Z',summary:'Fixture interpretation',evidenceIds:['fixture:statement'],sourceReferences:[{documentId:'fixture-original',sourceUrl:'https://www.federalreserve.gov/fixture'}]}}]})`);const text=validationText(p.nodes.get('influence-detail'));assert.match(text,/해석·공식 발언 아님/);assert.match(text,/분석 모델 fixture-local:1.*프롬프트 research-v1/);assert.match(text,/AI 원문 근거 ID fixture:statement/);assert.match(text,/문서 fixture-original/);
});

test('descriptive daily index observation remains separate from signal returns and predictive claims',()=>{
 const p=page(async()=>response({}));p.run(`renderInfluenceResearch({people:[],signals:[],signalResearch:{results:[],indexObservation:{status:'DESCRIPTIVE_ONLY',index:'S&P 500',baselineDate:'2025-08-25',returnType:'PRICE_INDEX_RETURN',observedEvents:1,verifiedSignalSamples:0,sourceUrl:'https://fred.stlouisfed.org/series/SP500',periods:[{horizon:5,startDate:'2025-08-25',endDate:'2025-09-02',observedIndexReturn:0.0123,status:'DESCRIPTIVE_ONLY',excessReturn:null}],limitations:[]}}})`);
 const text=validationText(p.nodes.get('signal-research-results'));assert.match(text,/보수적 일별 지수 관측/);assert.match(text,/실제 최초 공개 시각 미확인/);assert.match(text,/예측력·초과수익 검증이 아닙니다/);assert.match(text,/1\.23%/);assert.match(text,/초과수익률.*검증하지 않음/);assert.match(text,/관측 사건 1건.*검증 신호 표본 0건/);assert.match(text,/설명용 관측 \(DESCRIPTIVE_ONLY\)/);
});
test('unverified or missing descriptive index observations cannot expose numeric returns',()=>{
 const p=page(async()=>response({}));p.run(`renderInfluenceResearch({people:[],signals:[],signalResearch:{indexObservation:{status:'INSUFFICIENT_DATA',periods:[{horizon:1,status:'DESCRIPTIVE_ONLY',observedIndexReturn:0.5}]}}})`);let text=validationText(p.nodes.get('signal-research-results'));assert.doesNotMatch(text,/50\.00%/);assert.match(text,/관측값 자료 부족/);
 p.run(`renderInfluenceResearch({people:[],signals:[],signalResearch:{indexObservation:{status:'DESCRIPTIVE_ONLY',periods:[{horizon:1,status:'DESCRIPTIVE_ONLY',observedIndexReturn:null}]}}})`);text=validationText(p.nodes.get('signal-research-results'));assert.doesNotMatch(text,/0\.00%/);assert.match(text,/관측값 자료 부족/);
});

test('signal research uses readable evidence names instead of internal identifiers in the first table column',()=>{
 const p=page(async()=>response({}));p.run(`renderInfluenceResearch({people:[{personId:'person:powell',name:'Jerome Powell'}],statements:[{statementId:'statement:powell:20250822',personId:'person:powell',title:'Long source title'}],capitalEvents:[{eventId:'event:sk:disposal',actorType:'COMPANY',actionType:'TREASURY_DISPOSAL'}],signals:[{signalId:'internal:long:statement:identifier',evidenceIds:['statement:powell:20250822']},{signalId:'internal:long:capital:identifier',evidenceIds:['event:sk:disposal']}],signalResearch:{results:[{signalId:'internal:long:statement:identifier',signalType:'STATEMENT_ONLY',horizon:1,verificationStatus:'INSUFFICIENT_DATA'},{signalId:'internal:long:capital:identifier',signalType:'CAPITAL_ONLY',horizon:5,verificationStatus:'INSUFFICIENT_DATA'}]}})`);const text=validationText(p.nodes.get('signal-research-results'));assert.match(text,/파월 공식 연설 · 발언 단독/);assert.match(text,/SK 자기주식 처분 · 자본 행동 단독/);assert.doesNotMatch(text,/internal:long:/);
});

test('group comparison preserves zero samples as insufficient statistics and separates descriptive values from significance',()=>{
 const p=page(async()=>response({}));p.run(`renderInfluenceResearch({people:[],signalResearch:{groupComparison:{groups:[{group:'STATEMENT_ONLY',horizon:5,sampleSize:0,meanExcessReturn:0.9,medianExcessReturn:0.8,positiveExcessRatio:1,lossCases:0,verificationStatus:'INSUFFICIENT_DATA'},{group:'CAPITAL_ONLY',horizon:5,sampleSize:1,meanExcessReturn:0.02,medianExcessReturn:0.02,positiveExcessRatio:1,lossCases:['fixture-loss'],verificationStatus:'DESCRIPTIVE_ONLY',limitations:['SINGLE_EVENT_NOT_PREDICTIVE_VALIDATION']}]}}})`);const text=validationText(p.nodes.get('signal-research-results'));assert.match(text,/신호 그룹별 비교 · 통계적 우위 미확인/);assert.match(text,/평균 초과수익률/);assert.match(text,/양의 초과수익 비율/);assert.doesNotMatch(text,/90\.00%|80\.00%/);assert.match(text,/2\.00%/);assert.match(text,/단일 사건으로 예측력 검증 불가/);assert.match(text,/위험 조정 성과가 아닙니다/);
});
test('market research rows expose trade availability and quality while blocked returns stay unavailable',()=>{
 const p=page(async()=>response({}));p.run(`renderInfluenceResearch({people:[],signalResearch:{results:[{signalId:'fixture:blocked',signalType:'CAPITAL_ONLY',publicAvailableAt:'2025-08-14T23:59:59Z',tradeableFrom:null,securityId:'AAPL',benchmarkId:'SP500',horizon:20,securityReturn:0.9,benchmarkReturn:0.1,excessReturn:0.8,sampleSize:0,verificationStatus:'MARKET_REACTION_BLOCKED',dataQuality:'PUBLICATION_TIME_UNVERIFIED',limitations:['PUBLICATION_TIME_UNVERIFIED']}]}})`);const text=validationText(p.nodes.get('signal-research-results'));assert.match(text,/거래 가능 시점/);assert.match(text,/자료 품질/);assert.match(text,/AAPL.*SP500/);assert.match(text,/시장 반응 계산 차단 · MARKET_REACTION_BLOCKED/);assert.doesNotMatch(text,/90\.00%|80\.00%/);assert.match(text,/공개 시각 검증 미완료/);
});

test('official institutional relationship evidence is distinct from a person confirmed transaction',()=>{
 const p=page(async()=>response({}));p.run(`renderInfluenceResearch({people:[{personId:'buffett',name:'Fixture Buffett'}],capitalEvents:[{eventId:'institution-report',actorId:'berkshire',actorType:'INSTITUTION',eventType:'REPORTED_HOLDING_CHANGE',companyId:'AAPL',transactionDate:null,verificationStatus:'VERIFIED'}],actorRelationships:[{relationshipId:'fixture-role',role:'Historical CEO',validFrom:'2024-01-01',validTo:'2025-12-31',sourceUrl:'https://www.berkshirehathaway.com/fixture.pdf'}],signals:[{signalId:'fixture-combined',signalType:'INSUFFICIENT_EVIDENCE',actorId:'buffett',relationKind:'OFFICIAL_INSTITUTION_ASSOCIATION',relationshipId:'fixture-role',personalTransaction:false,evidenceIds:['institution-report']}]})`);const text=validationText(p.nodes.get('influence-signals'));assert.match(text,/공식 기관 직책 관계/);assert.match(text,/기관 보유 보고를 통한 연결이며 인물의 개인 매매가 아닙니다/);assert.match(text,/Historical CEO.*2024-01-01.*2025-12-31/);assert.match(text,/투자 추천 HOLD/);
});

test('official holdings distinguish snapshots and unchanged amounts from decreases and amendment absence from zero',()=>{
 const p=page(async()=>response({}));p.run(`renderInfluenceResearch({people:[{personId:'fixture',name:'Fixture'}],capitalCollection:{officialFilings:4,reportedHoldings:3,verifiedHoldingChanges:1,unchangedHoldings:1},capitalEvents:[{actorId:'sec:fixture',actorName:'Fixture institution',actorType:'INSTITUTION',eventType:'REPORTED_HOLDING_CHANGE',actionType:'SNAPSHOT',verificationStatus:'VERIFIED',transactionDate:null},{actorId:'sec:fixture',actorName:'Fixture institution',actorType:'INSTITUTION',eventType:'REPORTED_HOLDING_CHANGE',actionType:'UNCHANGED',verificationStatus:'VERIFIED',transactionDate:null,holdingChange:{delta:0},holdingComparison:{prior:{quantity:30,reportingPeriod:'2025-03-31'},current:{quantity:30,reportingPeriod:'2025-06-30'}}},{actorId:'sec:fixture',actorName:'Fixture institution',actorType:'INSTITUTION',eventType:'REPORTED_HOLDING_CHANGE',actionType:'DECREASE',verificationStatus:'VERIFIED',publicationTimePrecision:'DAY',transactionDate:null,holdingChange:{delta:-20},holdingComparison:{prior:{quantity:30,reportingPeriod:'2025-06-30'},current:{quantity:10,reportingPeriod:'2025-09-30'}}}],correctionReviews:[{documentId:'fixture-amendment',originalDocumentId:'fixture-initial',reportingPeriod:'2025-06-30',amendmentType:'NEW HOLDINGS',aaplPresent:false,verificationStatus:'VERIFIED_SCOPE_ONLY',sourceUrl:'https://www.sec.gov/fixture'}]})`);
 const text=validationText(p.nodes.get('influence-detail'));assert.match(text,/보고된 보유 잔고 · 변화 검증 아님/);assert.match(text,/동일 범위 보유량 변화 없음/);assert.match(text,/보고된 보유량 감소 · 실제 매도일 미확인/);assert.match(text,/차이 -20주.*실제 거래를 의미하지 않습니다/);assert.match(text,/SEC 접수 시각을 실제 최초 공개 시각으로 단정하지 않습니다/);assert.match(validationText(p.nodes.get('capital-correction-evidence')),/정정 문서에 없음·보유량 0으로 처리하지 않음/);assert.match(validationText(p.nodes.get('capital-collection-summary')),/기관 보유 보고/);
});

test('real historical prices and accepted SEC time remain separate from unverified market returns',()=>{
 const p=page(async()=>response({}));p.run(`renderInfluenceResearch({people:[],signals:[],actualMarketReview:{verifiedSamples:0,applePrice:{count:200,exchange:'NASDAQ',currency:'USD',coverage:[{from:'2025-04-23',through:'2025-09-15',count:100}]},benchmark:{benchmarkId:'SP500:PRICE_INDEX',coverage:{from:'2025-02-03',through:'2025-09-15',count:155}},calendar:{timeZone:'America/New_York',status:'VERIFIED'},publications:[{accessionNumber:'fixture-accession',acceptedAt:'2025-08-14T16:05:02-04:00',acceptanceStatus:'VERIFIED',reportingPeriodEnd:'2025-06-30',quantity:280000000}],events:[{accessionNumber:'fixture-accession',horizon:1,candidateStartDate:'2025-08-15',candidateEndDate:'2025-08-18',observationsRequired:2,observationsAvailable:2,priceCoverageStatus:'VERIFIED',candidateStartPrice:{close:231.59,tradingDate:'2025-08-15'},excessReturn:0.9}]} })`);
 const text=validationText(p.nodes.get('signal-research-results'));assert.match(text,/200개 실제 관측/);assert.match(text,/2025-04-23 ~ 2025-09-15/);assert.match(text,/16:05:02-04:00/);assert.match(text,/실제 최초 공개 시각 미확인/);assert.match(text,/231\.59 USD.*실행 가격 아님/);assert.match(text,/TRADEABLE_FROM_UNVERIFIED/);assert.match(text,/검증된 시장 반응 표본 0개/);assert.doesNotMatch(text,/90\.00%/);
});

test('conservative market UI separates percentage results from first-public and blocked windows',()=>{
 const p=page(async()=>response({}));p.run(`renderInfluenceResearch({people:[],signals:[],actualMarketReview:{verifiedSamples:0,conservativeSamples:{1:1,5:0,20:0},publications:[],events:[],conservativeEvents:[{accessionNumber:'fixture',horizon:1,verificationStatus:'VERIFIED_CONSERVATIVE',startDate:'2025-08-15',endDate:'2025-08-18',startPrice:231.59,endPrice:230.89,securityReturn:-0.3022583,benchmarkReturn:-0.0100778,excessReturn:-0.2921805,reasons:[]},{accessionNumber:'fixture',horizon:5,verificationStatus:'BLOCKED',securityReturn:99,benchmarkReturn:88,excessReturn:77,reasons:['COMMON_PRICE_MISSING_OR_CONFLICT']}]}})`);
 const text=n=>[n.textContent||'',...(n.children||[]).map(text)].join(' '),rendered=text(p.nodes.get('signal-research-results'));
 assert.match(rendered,/CONSERVATIVE_START/);assert.match(rendered,/-0.30%/);assert.match(rendered,/-0.29%/);assert.doesNotMatch(rendered,/99.00%|77.00%/);assert.match(rendered,/최초 공개 시각/);assert.match(rendered,/체결 성과/);
});

test('expanded signal comparison renders percentage-point statistics without promoting empty groups or index observations',()=>{
 const p=page(async()=>response({}));p.run(`renderInfluenceResearch({people:[],signals:[],researchExpansion:{verifiedStatements:4,verifiedCapitalEvents:7,combinedSignals:0,newStatements:2,newCapitalEvents:2,newMarketReactionSamples:0},signalResearch:{comparison:{independentEventCount:2,observationCount:6,exactPublicTimeEventCount:0,conservativeEventCount:2,groups:[{group:'CAPITAL_ONLY',analysisMode:'CONSERVATIVE_START',horizon:1,sampleSize:2,meanExcessReturn:-0.77685,medianExcessReturn:-0.77685,positiveExcessRatio:0,lossCases:[{},{}],negativeExcessCases:['a','b']},{group:'COMBINED',analysisMode:'EXACT_PUBLIC_TIME',horizon:1,sampleSize:0,meanExcessReturn:99,medianExcessReturn:99}]},newIndexObservations:[{title:'Fixture policy statement',status:'DESCRIPTIVE_ONLY',periods:[{horizon:1,status:'DESCRIPTIVE_ONLY',observedIndexReturn:.0014,startDate:'2025-07-18',endDate:'2025-07-21',excessReturn:77}]}]}})`);
 const text=n=>[n.textContent||'',...(n.children||[]).map(text)].join(' '),rendered=text(p.nodes.get('signal-research-results'));assert.match(rendered,/-0.78 pp/);assert.doesNotMatch(rendered,/99.00|77.00/);assert.match(rendered,/0.14%/);assert.match(rendered,/초과수익 표본 아님/);assert.match(rendered,/사전 등록/);assert.match(rendered,/검증된 결합 신호/);
});

test('nonApple research keeps price returns and percentage point excess separate from Apple and blocks missing windows',()=>{
 const p=page(async()=>response({}));p.run(`renderInfluenceResearch({people:[],signals:[],signalResearch:{nonAppleMarketReview:{coverage:{count:100,from:'2025-04-23',through:'2025-09-15'},independentEvents:1,verifiedSamples:1,events:[{horizon:1,verificationStatus:'VERIFIED_CONSERVATIVE',startDate:'2025-07-31',endDate:'2025-08-01',startPrice:533.50,endPrice:524.11,securityReturn:-1.76,benchmarkReturn:-1.60,excessReturn:-0.16},{horizon:20,verificationStatus:'BLOCKED',securityReturn:999,benchmarkReturn:888,excessReturn:111,reasons:['COMMON_PRICE_MISSING']}]} }})`);
 const text=validationText(p.nodes.get('signal-research-results'));assert.match(text,/Microsoft 신규 공식 자본 행동/);assert.match(text,/-1.76%/);assert.match(text,/-0.16 pp/);assert.doesNotMatch(text,/999|888|111/);assert.match(text,/실제 체결 성과가 아닙니다/);assert.match(text,/Apple 2개와 무근거 합산하지 않습니다/);
});

test('simple home separates predictive verification from conservative event cards and preserves period selection',()=>{const p=page(async()=>response({}));const fixture={asOf:'2026-10-13T00:00:00Z',summary:{researchEvents:12,verifiedSignals:0,attentionSignals:13,exactTimeSamples:0,conservativeSamples:3,combinedSignals:0,verifiedStatements:4,verifiedCapitalActions:8},automation:{schedulerEnabled:true,intervalMs:1800000,workerRunning:false,nextRunAt:'2026-10-13T00:30:00Z',jobs:[]},eventCards:[{eventId:'msft',companyId:'MSFT',companyName:'Microsoft',actorName:'Microsoft Corporation',eventLabel:'기업 배당·자사주 매입 합계',eventDate:'2025-07-30',conservativeAvailableBy:'2025-07-30T23:59:59-04:00',sourceUrl:'https://www.sec.gov/Archives/fixture',periods:[{horizon:1,verificationStatus:'VERIFIED_CONSERVATIVE',excessReturn:-0.16,securityReturn:-1.76,benchmarkReturn:-1.6,startDate:'2025-07-31',endDate:'2025-08-01',startPrice:533.5,endPrice:524.11},{horizon:20,verificationStatus:'BLOCKED',excessReturn:999}]}]};p.run(`renderSimpleResearch(${JSON.stringify(fixture)})`);const text=validationText(p.nodes.get('research-home-counts'));assert.match(text,/검증된 예측 신호 0/);assert.match(validationText(p.nodes.get('research-home-agent')),/자동 검증 대기/);const card=validationText(p.nodes.get('research-signal-cards'));assert.match(card,/-0.16%p/);assert.match(card,/연구 보류/);assert.doesNotMatch(card,/999/);p.nodes.get('research-period').value='1';p.nodes.get('research-period').listeners.change();p.run(`renderSimpleResearch(${JSON.stringify(fixture)})`);assert.equal(p.run('selectedResearchPeriod'),'1');assert.doesNotMatch(validationText(p.nodes.get('research-signal-cards')).split('공식 근거')[0],/20거래일/);assert.match(validationText(p.nodes.get('research-results-summary')),/정확한 공개 시각 표본 0건/);});

test('simple dashboard refresh reports offline recovery without generating numbers in an empty state',async()=>{let fails=true;const p=page(async()=>{if(fails)throw Error('offline');return response({success:true,asOf:'2026-10-13T00:00:00Z',summary:{},eventCards:[],automation:{schedulerEnabled:false,jobs:[]}});});await p.run('refreshSimpleResearch()');assert.match(p.nodes.get('research-home-message').textContent,/연결 실패/);fails=false;await p.run('refreshSimpleResearch()');assert.match(p.nodes.get('research-home-message').textContent,/공식 자료 기반/);assert.match(validationText(p.nodes.get('research-home-counts')),/자료 확인 중/);assert.match(validationText(p.nodes.get('research-home-recent')),/아직 검증된 시장 반응 자료가 없습니다/);});

test('initial research request failure replaces loading with readable errors without pretending cached values exist',async()=>{const p=page(async()=>{throw Error('offline');});await p.run('refreshSimpleResearch()');assert.match(p.nodes.get('research-home-message').textContent,/연구 자료를 불러오지 못했습니다/);assert.doesNotMatch(p.nodes.get('research-home-message').textContent,/이전 조회/);assert.match(validationText(p.nodes.get('research-home-counts')),/불러오지 못했습니다/);assert.match(validationText(p.nodes.get('research-home-recent')),/연결 후 다시/);});

test('evidence refresh preserves disclosures by identity after a new panel is inserted', () => {
  const p=page(async()=>response({}));
  const result=p.run(`(()=>{const node=(key,open)=>({scrollLeft:0,scrollTop:0,open,getAttribute:()=>key,closest:()=>({id:'research-results'})});const a=node('first',true),b=node('second',false);const saved=capturePeerView({querySelectorAll:()=>[a,b]});const inserted=node('selected',true),a2=node('first',false),b2=node('second',true);restorePeerView({querySelectorAll:()=>[inserted,a2,b2]},saved);return [inserted.open,a2.open,b2.open];})()`);
  assert.deepEqual(Array.from(result),[true,true,false]);
});

test('identical evidence identifiers in different screen containers keep independent disclosure states', () => {
  const p=page(async()=>response({}));
  const result=p.run(`(()=>{const node=(id,open)=>({scrollLeft:0,scrollTop:0,open,getAttribute:()=> 'same-event',closest:()=>({id})});const saved=capturePeerView({querySelectorAll:()=>[node('signals',false),node('selected',true)]});const selected=node('selected',false),signals=node('signals',true);restorePeerView({querySelectorAll:()=>[selected,signals]},saved);return [selected.open,signals.open];})()`);
  assert.deepEqual(Array.from(result),[true,false]);
});

test('person timeline keeps company and unrelated institutional actions separate',()=>{
 const p=page(async()=>response({}));
 const kinds=p.run(`influenceTimelineItems({statements:[{personId:'p',statementDate:'2025-02-01'}],capitalEvents:[{actorId:'p',actorType:'PERSON',filingDate:'2025-03-01'},{actorId:'p',actorType:'COMPANY',filingDate:'2025-04-01'},{actorId:'institution',actorType:'INSTITUTION',filingDate:'2025-05-01'}]},'p').map(x=>x.kind)`);
 assert.deepEqual(Array.from(kinds),['CAPITAL','STATEMENT']);
});
test('person timeline uses filing date rather than inferred transaction date and sorts unknown dates last',()=>{
 const p=page(async()=>response({}));
 const rows=p.run(`influenceTimelineItems({statements:[{personId:'p'},{personId:'p',statementDate:'2025-02-01'}],capitalEvents:[{personId:'p',actorType:'PERSON',filingDate:'2025-01-01',transactionDate:'2025-03-01'}]},'p').map(x=>x.date)`);
 assert.deepEqual(Array.from(rows),['2025-02-01','2025-01-01',null]);
});

test('detail retry retains prior same-company content on network failure and recovers',async()=>{
 let failed=false;
 const p=page(async()=>{if(failed)throw new Error('network');return response({success:true,analysisDate:'2026-10-13',candidate:{ticker:'ABC',companyName:'Company ABC',score:0,approved:false,evidence:[]}});});
 await p.run('loadCandidateDetail({ticker:"ABC",market:"US"})');
 const before=p.nodes.get('candidate-detail').children[0];failed=true;
 await p.run('loadCandidateDetail({ticker:"ABC",market:"US"})');
 assert.equal(p.nodes.get('candidate-detail').hidden,false);
 assert.equal(p.nodes.get('candidate-detail').children[0],before);
 assert.match(p.nodes.get('candidate-detail-message').textContent,/以前|이전 조회 결과/);
 assert.equal(p.nodes.get('candidate-detail-refresh').disabled,false);
 failed=false;await p.run('loadCandidateDetail({ticker:"ABC",market:"US"})');
 assert.match(p.nodes.get('candidate-detail-message').textContent,/연결됨/);
 assert.equal(p.nodes.get('candidate-detail').attributes['aria-busy'],'false');
});
test('different-company failure never displays previous company as new result and auth clears cached detail',async()=>{
 let status=200;
 const p=page(async()=>status===200?response({success:true,analysisDate:'2026-10-13',candidate:{ticker:'ABC',companyName:'Company ABC',score:0,approved:false,evidence:[]}}):{ok:false,status});
 await p.run('loadCandidateDetail({ticker:"ABC",market:"US"})');status=503;
 await p.run('loadCandidateDetail({ticker:"XYZ",market:"US"})');assert.equal(p.nodes.get('candidate-detail').hidden,true);
 status=200;await p.run('loadCandidateDetail({ticker:"ABC",market:"US"})');status=401;
 await p.run('loadCandidateDetail({ticker:"ABC",market:"US"})');assert.equal(p.nodes.get('candidate-detail').hidden,true);assert.equal(p.nodes.get('candidate-detail').children.length,0);assert.equal(p.run('candidateViews.size'),0);
});
test('price selection is restored for the same company and unsupported saved period falls back',()=>{
 const p=page(async()=>response({}));
 const item={ticker:'ABC',market:'KR',krValuationAnalysis:{evidence:{priceHistory:{qualityStatus:'READY',currency:'KRW',source:'fixture',sessions:[{date:'2026-06-01',close:100},{date:'2026-09-01',close:110},{date:'2026-10-08',close:120}]}}}};
 p.run(`renderPriceChart(${JSON.stringify(item)})`);
 p.nodes.get('price-chart').children[1].children[1].listeners.click();
 p.run(`renderPriceChart(${JSON.stringify(item)})`);
 assert.equal(p.nodes.get('price-chart').children[1].children[1].attributes['aria-pressed'],'true');
 item.krValuationAnalysis.evidence.priceHistory.sessions.shift();p.run(`renderPriceChart(${JSON.stringify(item)})`);
 assert.equal(p.nodes.get('price-chart').children[1].children[0].attributes['aria-pressed'],'true');
});

test('home current candidates do not recycle historical return cases as current picks',()=>{
 const p=page(async()=>response({}));
 const fixture={asOf:'2026-10-19T07:00:00Z',summary:{conservativeSamples:1},automation:{},currentResearch:{companyCount:1,eligibleRecommendations:0,window:{from:'2026-09-20',through:'2026-10-19'},candidates:[{companyId:'AAPL',companyName:'Apple',latestDisclosureDate:'2026-10-15',verifiedEvents:1,price:{close:100,currency:'USD',priceDate:'2026-10-16'},blockers:['CORPORATE_ACTION_COVERAGE_REQUIRED'],recommendationStatus:'HOLD',events:[{filingDate:'2026-10-15',eventDate:'2026-10-13',publicAvailableAt:'2026-10-19T07:00:00Z',publicationTimePrecision:'OBSERVED_BY',quantity:10,actionType:'REPORTED_SALE',verificationStatus:'VERIFIED',planned10b51:true,sourceUrl:'https://www.sec.gov/Archives/fixture'}]}]},eventCards:[{eventId:'old-msft',companyId:'MSFT',companyName:'Microsoft',actorName:'Microsoft Corporation',eventLabel:'過去',eventDate:'2025-07-30',periods:[]}]};
 p.run(`renderSimpleResearch(${JSON.stringify(fixture)})`);
 const home=validationText(p.nodes.get('research-home-recent'));assert.match(home,/2026-10-15/);assert.match(home,/2026-10-16/);assert.doesNotMatch(home,/2025-07-30/);assert.match(validationText(p.nodes.get('research-results-cards')),/2025-07-30/);
 const current=validationText(p.nodes.get('research-current-candidates'));assert.match(current,/신고 매도/);assert.match(current,/10b5-1/);assert.match(current,/최초 공개 시각 아님/);assert.match(current,/추천 보류/);assert.match(validationText(p.nodes.get('research-home-counts')),/연구 대상 기업 1/);assert.match(validationText(p.nodes.get('research-home-counts')),/검증 통과 추천 0/);assert.match(validationText(p.nodes.get('research-home-counts')),/추천 보류 기업 1/);
});
test('older API without current cohort shows a pending current state instead of old research candidates',()=>{
 const p=page(async()=>response({}));p.run(`renderSimpleResearch({summary:{},eventCards:[{eventId:'old',companyName:'Historical',companyId:'OLD',eventDate:'2025-01-01',periods:[]}],automation:{}})`);
 assert.match(validationText(p.nodes.get('research-home-recent')),/현재 후보 자료 확인 중/);assert.doesNotMatch(validationText(p.nodes.get('research-home-recent')),/Historical/);
});
test('current candidate detail distinguishes annual USD evidence, held valuation and pending 1/5/20-day observations',()=>{
 const p=page(async()=>response({}));
 const candidate={companyId:'MSFT',companyName:'Microsoft',latestDisclosureDate:'2026-10-14',verifiedEvents:1,events:[],blockers:[],detail:{financial:{periodStart:'2025-07-01',periodEnd:'2026-06-30',disclosureDate:'2026-07-29',raw:{revenue:1000,netIncome:100},sourceUrl:'https://www.sec.gov/Archives/fixture'},risk:{flags:['LATEST_INTERIM_NOT_VERIFIED','PEER_SAMPLE_NOT_VERIFIED']},observations:[{conservativeAvailableBy:'2026-10-19T09:00:00Z',verifiedSamples:0,reasons:['D2_AVAILABILITY_WAIT'],periods:[1,5,20].map(tradingDays=>({tradingDays,status:'PENDING',excessReturn:null}))}]}};
 const card=p.run(`renderCurrentCandidate(${JSON.stringify(candidate)})`),text=validationText(card);
 assert.match(text,/연간 기준 2025-07-01 ~ 2026-06-30/);assert.match(text,/1,000 USD/);assert.match(text,/TTM 아님/);assert.match(text,/계산 보류/);for(const h of [1,5,20])assert.match(text,new RegExp(h+'거래일 · 관측·자료 확인 대기'));assert.doesNotMatch(text,/초과수익 0/);
});
test('candidate readiness summary separates verified evidence from missing inputs without a completion score',()=>{
 const p=page(async()=>response({}));const candidate={companyId:'AAPL',companyName:'Apple',events:[],blockers:[],detail:{readiness:{items:[{id:'revenue',label:'최근 12개월 매출',status:'VERIFIED'},{id:'shares',label:'가격일과 같은 보통주 주식수',status:'PENDING',next:'동일일 주식수 근거 필요'}]}}};
 const card=p.run(`renderCurrentCandidate(${JSON.stringify(candidate)})`);const text=validationText(card);assert.match(text,/확인됨 · 최근 12개월 매출/);assert.match(text,/가격일과 같은 보통주 주식수 · 검증 대기/);assert.match(text,/동일일 주식수 근거 필요/);assert.doesNotMatch(text,/100%|추천 가능/);
});
test('readiness evidence renders fiscal and observation dates separately with source links',()=>{const p=page(async()=>response({}));const candidate={companyId:'MSFT',companyName:'Microsoft',events:[],blockers:[],detail:{readiness:{items:[{id:'revenue',label:'최근 12개월 매출',status:'VERIFIED',evidence:{periodStart:'2025-07-01',periodEnd:'2026-06-30',currency:'USD',sources:['https://www.sec.gov/Archives/fixture.xml']}},{id:'shares',label:'보통주 주식수',status:'PENDING',next:'가격일 대사 필요',evidence:{asOfDate:'2026-07-23',sources:[]}}]}}};const text=validationText(p.run(`renderCurrentCandidate(${JSON.stringify(candidate)})`));assert.match(text,/자료별 기준일·출처 보기/);assert.match(text,/재무 기간 2025-07-01 ~ 2026-06-30 · USD/);assert.match(text,/관측 기준일 2026-07-23 · 평가 검증 완료와 별도/);assert.match(text,/연결된 원천자료 없음/);});
test('candidate filters preserve real totals, selected company and empty state across refresh',()=>{const p=page(async()=>response({}));const fixture={summary:{},automation:{},currentResearch:{companyCount:2,eligibleRecommendations:0,window:{from:'2026-09-20',through:'2026-10-19'},candidates:[{companyId:'AAPL',companyName:'Apple',events:[],detail:{readiness:{confirmed:['revenue'],items:[]}}},{companyId:'NVDA',companyName:'NVIDIA',events:[],detail:{readiness:{confirmed:[],items:[]}}}]},eventCards:[]};p.run(`renderSimpleResearch(${JSON.stringify(fixture)})`);p.run("showCurrentCompany('NVDA')");assert.match(validationText(p.nodes.get('research-current-candidates')),/선택한 기업/);assert.doesNotMatch(validationText(p.nodes.get('research-current-candidates')),/Apple/);p.run(`renderSimpleResearch(${JSON.stringify(fixture)})`);assert.equal(p.nodes.get('research-candidate-search').value,'NVDA');p.run("researchReadinessFilter='TTM';renderSimpleResearch(simpleResearchData)");assert.match(validationText(p.nodes.get('research-current-candidates')),/검색 조건에 맞는 후보가 없습니다/);assert.match(p.nodes.get('research-filter-message').textContent,/표시 0 \/ 전체 2/);p.nodes.get('research-filter-reset').listeners.click();assert.match(validationText(p.nodes.get('research-current-candidates')),/Apple/);assert.equal(p.nodes.get('research-candidate-search').focused,true);});
test('operations panel distinguishes saved evidence stage results from tests and shows missing run history honestly',()=>{const p=page(async()=>response({}));p.run(`renderSimpleResearch({summary:{},eventCards:[],automation:{runReport:{counts:{running:0,verified:2,partial:1,blocked:1,queued:0},recentRuns:[],testExecution:'NOT_RUN_BY_WORKER'}}})`);const t=validationText(p.nodes.get('research-auto-stages'));assert.match(t,/최근 작업 보고/);assert.match(t,/저장된 완료 기록 없음/);assert.match(t,/회귀 테스트를 실행했다는 뜻은 아닙니다/);assert.match(t,/마지막 작업 완료 미확인/);});
test('paper recommendation UI distinguishes missing evidence from SELL and keeps simulation separate',()=>{const p=page(async()=>response({}));p.run(`renderTradeRecommendations({asOf:'2026-10-19T12:00:00Z',recommendations:[{companyId:'AAPL',companyName:'Apple',action:'INSUFFICIENT_DATA',generatedAt:'2026-10-19T12:00:00Z',validUntil:null,checks:{latestPrice:false},blockers:['latestPrice'],policyId:'paper-decision-v1'}],simulation:{mode:'RULE_SIMULATION',examples:[{name:'가상 조건 A',score:70,action:'BUY'}]}})`);const t=validationText(p.nodes.get('trade-cards'));assert.match(t,/판단 자료 부족/);assert.match(t,/자료 부족은 매도나 관망 판단이 아닙니다/);assert.match(t,/최신 가격 · 검증 필요/);assert.match(validationText(p.nodes.get('trade-examples')),/실제 종목 아님/);assert.doesNotMatch(t,/가상 조건 A/);});
test('recommendation fetch failure retains prior data with stale notice and recovers',async()=>{let online=true;const p=page(async()=>{if(!online)throw Error('offline');return response({success:true,asOf:'2026-10-19T12:00:00Z',recommendations:[{companyId:'AAPL',action:'INSUFFICIENT_DATA',checks:{},blockers:[]}]});});await p.run('refreshTradeRecommendations()');online=false;await p.run('refreshTradeRecommendations()');assert.match(p.nodes.get('trade-message').textContent,/연결 실패 · 이전 조회 판단/);assert.match(validationText(p.nodes.get('trade-cards')),/AAPL/);online=true;await p.run('refreshTradeRecommendations()');assert.match(p.nodes.get('trade-message').textContent,/실제 주문 차단/);assert.equal(p.nodes.get('trade-refresh').disabled,false);});
test('expired or undated directional judgments are suppressed rather than remaining active',()=>{const p=page(async()=>response({}));const t=Date.parse('2026-10-19T12:00:00Z');for(const row of [{action:'BUY',generatedAt:'2026-10-18T00:00:00Z',validUntil:'2026-10-19T11:59:59Z'},{action:'SELL',validUntil:null}]){const r=p.run(`currentTradeDecision(${JSON.stringify(row)},${t})`);assert.equal(r.action,'INSUFFICIENT_DATA');assert.ok(r.blockers.includes('expiredDecision'));}});
test('domain risk UI distinguishes observed filing notes from completed comprehensive reviews',()=>{const p=page(async()=>response({}));const candidate={companyId:'AAPL',companyName:'Apple',events:[],blockers:[],detail:{risk:{flags:[],domains:[{domain:'REGULATORY',status:'INSUFFICIENT_DATA'}],observations:[{topic:'CONTINGENCIES',periodEnd:'2026-06-27',sourceUrl:'https://www.sec.gov/Archives/fixture.xml'}]}}};const t=validationText(p.run(`renderCurrentCandidate(${JSON.stringify(candidate)})`));assert.match(t,/규제·법적 · 종합 검토 자료 부족/);assert.match(t,/우발채무·약정 공시 주석 확보/);assert.match(t,/위험이 없다는 의미는 아닙니다/);});

test('paper costs reduce reference profit and reject negative fees without changing records',()=>{
 const p=page(async()=>response({}));
 p.run('updatePaperOptions({KR:[{market:"KR",ticker:"005930",companyName:"삼성전자",priceSnapshot:{status:"READY",close:120,currency:"KRW",sessionDate:"2026-10-19"}}]});byId("paper-stock").value="KR:005930";byId("paper-buy").value="100";byId("paper-quantity").value="2";byId("paper-fee").value="3";byId("paper-tax").value="2";addPaperPosition()');
 assert.match(p.nodes.get('paper-results').children[0].textContent,/손익 35.00.*17.07%/);
 p.run('byId("paper-fee").value="-1";addPaperPosition()');
 assert.equal(p.run('paperPositions.length'),1);
 assert.match(p.nodes.get('paper-message').textContent,/0 이상/);
});
test('paper removal recalculates totals, invalidates performance and clearing leaves no records',()=>{
 const p=page(async()=>response({}));
 p.run('updatePaperOptions({KR:[{market:"KR",ticker:"005930",companyName:"삼성전자",priceSnapshot:{status:"READY",close:120,currency:"KRW",sessionDate:"2026-10-19"}}]});byId("paper-stock").value="KR:005930";byId("paper-buy").value="100";byId("paper-quantity").value="2";addPaperPosition();addPaperPosition();byId("paper-performance-results").append({textContent:"stale"})');
 const card=p.nodes.get('paper-results').children[1];card.children.at(-1).listeners.click();
 assert.equal(p.run('paperPositions.length'),1);
 assert.match(p.nodes.get('paper-results').children[0].textContent,/평가 240.00.*손익 40.00/);
 assert.equal(p.nodes.get('paper-performance-results').children.length,0);
 p.nodes.get('paper-clear').listeners.click();
 assert.equal(p.run('paperPositions.length'),0);
 assert.equal(p.nodes.get('paper-clear').disabled,true);
 assert.match(p.nodes.get('paper-results').children[0].textContent,/기록이 없습니다/);
});
test('paper cumulative performance never silently drops entered costs',async()=>{
 let sent;const p=page(async(_url,options)=>{sent=JSON.parse(options.body);return response({status:'PENDING'});});
 p.run('updatePaperOptions({KR:[{market:"KR",ticker:"005930",companyName:"삼성전자",priceSnapshot:{status:"READY",close:120,currency:"KRW",sessionDate:"2026-10-19"}}]});byId("paper-stock").value="KR:005930";byId("paper-buy").value="100";byId("paper-quantity").value="2";byId("paper-fee").value="3";addPaperPosition()');
 p.run('byId("paper-from").value="2026-09-01";byId("paper-to").value="2026-09-03"');
 await p.run('loadPaperPerformance()');assert.equal(sent.positions[0].fee,3);assert.equal(sent.initialCash,203);assert.deepEqual(sent.cashFlows,[]);
});

test('paper cash flows submit signed KRW amounts with initial cash and invalidate old results',async()=>{
 let sent;const p=page(async(_url,options)=>{sent=JSON.parse(options.body);return response({status:'PENDING',reason:'INSUFFICIENT_CASH'});});
 p.run('paperPositions.push({market:"KR",ticker:"005930",buy:100,quantity:1,fee:2,tax:1});byId("paper-from").value="2026-09-01";byId("paper-to").value="2026-09-03";byId("paper-initial-cash").value="200";byId("paper-flow-date").value="2026-09-02";byId("paper-flow-amount").value="50";byId("paper-flow-direction").value="WITHDRAWAL";addPaperCashFlow()');
 await p.run('loadPaperPerformance()');assert.equal(sent.initialCash,200);assert.equal(sent.cashFlows[0].amount,-50);assert.equal(sent.cashFlows[0].timing,'BEFORE_OPEN');assert.match(p.nodes.get('paper-performance-message').textContent,/出金|출금 가능액/);
 p.nodes.get('paper-flow-results').children[0].children.at(-1).listeners.click();assert.equal(p.run('paperCashFlows.length'),0);
});
test('paper rejects invalid flow dates and out of range flows without an API request',async()=>{
 let calls=0;const p=page(async()=>{calls++;return response({});});
 p.run('byId("paper-flow-date").value="2026-02-30";byId("paper-flow-amount").value="1";byId("paper-flow-direction").value="DEPOSIT";addPaperCashFlow()');assert.equal(p.run('paperCashFlows.length'),0);
 p.run('paperPositions.push({market:"KR",ticker:"005930",buy:100,quantity:1,fee:0,tax:0});byId("paper-from").value="2026-09-01";byId("paper-to").value="2026-09-03";byId("paper-flow-date").value="2026-09-04";addPaperCashFlow()');
 await p.run('loadPaperPerformance()');assert.equal(calls,0);assert.match(p.nodes.get('paper-performance-message').textContent,/기간 밖/);
 p.nodes.get('paper-clear').listeners.click();assert.equal(p.run('paperCashFlows.length'),0);assert.equal(p.run('paperPositions.length'),0);
});

test('paper sale records enforce remaining holdings, submit costs and can be removed',async()=>{
 let sent;const p=page(async(_url,options)=>{sent=JSON.parse(options.body);return response({status:'PENDING',reason:'SELL_EXCEEDS_HOLDINGS'});});
 p.run('paperPositions.push({market:"KR",currency:"KRW",ticker:"005930",buy:100,quantity:2,fee:3,tax:2});renderPaperPositions();byId("paper-from").value="2026-09-01";byId("paper-to").value="2026-09-03";byId("paper-sale-stock").value="005930";byId("paper-sale-date").value="2026-09-02";byId("paper-sale-price").value="110";byId("paper-sale-quantity").value="1";byId("paper-sale-fee").value="1";byId("paper-sale-tax").value="1";addPaperSale()');
 assert.equal(p.run('paperSales.length'),1);p.run('byId("paper-sale-quantity").value="2";addPaperSale()');assert.equal(p.run('paperSales.length'),1);assert.match(p.nodes.get('paper-sale-message').textContent,/남은 매수 수량/);
 await p.run('loadPaperPerformance()');assert.equal(sent.sales[0].price,110);assert.equal(sent.sales[0].fee,1);assert.match(p.nodes.get('paper-performance-message').textContent,/보유 수량/);
 p.nodes.get('paper-sale-results').children[0].children.at(-1).listeners.click();assert.equal(p.run('paperSales.length'),0);
});
test('paper sales outside the requested range never submit and clearing removes all ledger entries',async()=>{
 let calls=0;const p=page(async()=>{calls++;return response({});});p.run('paperPositions.push({market:"KR",ticker:"005930",buy:100,quantity:1,fee:0,tax:0});paperSales.push({id:"s",ticker:"005930",date:"2026-09-04",quantity:1,price:110});byId("paper-from").value="2026-09-01";byId("paper-to").value="2026-09-03"');await p.run('loadPaperPerformance()');assert.equal(calls,0);assert.match(p.nodes.get('paper-performance-message').textContent,/매도 날짜/);p.nodes.get('paper-clear').listeners.click();assert.equal(p.run('paperSales.length+paperPositions.length'),0);
});

test('paper dividend scenarios submit net cash and support delete and clear without granting entitlement',async()=>{
 let sent;const p=page(async(_url,options)=>{sent=JSON.parse(options.body);return response({status:'PENDING',reason:'INVALID_DIVIDEND'});});p.run('paperPositions.push({market:"KR",currency:"KRW",ticker:"005930",buy:100,quantity:1,fee:3,tax:2});renderPaperPositions();byId("paper-from").value="2026-09-01";byId("paper-to").value="2026-09-03";byId("paper-dividend-stock").value="005930";byId("paper-dividend-date").value="2026-09-02";byId("paper-dividend-amount").value="7";addPaperDividend()');await p.run('loadPaperPerformance()');assert.equal(sent.dividends[0].amount,7);assert.equal(sent.dividends[0].verificationStatus,undefined);assert.match(p.nodes.get('paper-performance-message').textContent,/가상 배당.*거래일/);p.nodes.get('paper-dividend-results').children[0].children.at(-1).listeners.click();assert.equal(p.run('paperDividends.length'),0);p.run('addPaperDividend()');p.nodes.get('paper-clear').listeners.click();assert.equal(p.run('paperDividends.length'),0);
});
test('paper rejects invalid scenario amounts and never submits dividends outside the calculation range',async()=>{
 let calls=0;const p=page(async()=>{calls++;return response({});});p.run('paperPositions.push({market:"KR",currency:"KRW",ticker:"005930",buy:100,quantity:1,fee:0,tax:0});byId("paper-from").value="2026-09-01";byId("paper-to").value="2026-09-03";byId("paper-dividend-stock").value="005930";byId("paper-dividend-date").value="2026-09-02";byId("paper-dividend-amount").value="-1";addPaperDividend()');assert.equal(p.run('paperDividends.length'),0);p.run('byId("paper-dividend-amount").value="7";byId("paper-dividend-date").value="2026-09-04";addPaperDividend()');await p.run('loadPaperPerformance()');assert.equal(calls,0);assert.match(p.nodes.get('paper-performance-message').textContent,/가상 배당 날짜/);
});

test('paper backup preview preserves current records and restore never trusts saved quotes',()=>{
 const p=page(async()=>response({}));p.run('paperPositions.push({market:"KR",currency:"KRW",ticker:"005930",buy:100,quantity:2,fee:3,tax:2,price:120,date:"2026-09-03"});exportPaperBackup();globalThis.savedBackup=byId("paper-backup-text").value;paperPositions[0].buy=90;byId("paper-backup-text").value=savedBackup;previewPaperBackup()');assert.equal(p.run('paperPositions[0].buy'),90);assert.equal(p.nodes.get('paper-backup-apply').disabled,false);p.run('applyPaperBackup()');assert.equal(p.run('paperPositions[0].buy'),100);assert.equal(p.run('paperPositions[0].price'),null);assert.match(p.nodes.get('paper-results').children[0].textContent,/평가·손익 보류/);p.run('updatePaperOptions({KR:[{market:"KR",ticker:"005930",companyName:"fixture",priceSnapshot:{status:"READY",close:130,currency:"KRW",sessionDate:"2026-09-04"}}]})');assert.equal(p.run('paperPositions[0].price'),130);assert.match(p.nodes.get('paper-results').children[0].textContent,/손익 55.00/);
});
test('invalid backups leave the ledger unchanged and further edits cancel a pending replacement',()=>{
 const p=page(async()=>response({}));p.run('paperPositions.push({market:"KR",currency:"KRW",ticker:"005930",buy:100,quantity:1,fee:0,tax:0,price:120,date:"2026-09-03"});exportPaperBackup();globalThis.savedBackup=byId("paper-backup-text").value;byId("paper-backup-text").value="{}";previewPaperBackup();applyPaperBackup()');assert.equal(p.run('paperPositions.length'),1);assert.equal(p.run('paperPositions[0].buy'),100);assert.equal(p.nodes.get('paper-backup-apply').disabled,true);p.run('byId("paper-backup-text").value=savedBackup;previewPaperBackup();invalidatePaperPerformance();applyPaperBackup()');assert.equal(p.nodes.get('paper-backup-apply').disabled,true);
});
test('restoring cash flow IDs avoids collisions and clear removes backup text too',()=>{
 const p=page(async()=>response({}));p.run('paperCashFlows.push({id:"flow-12",date:"2026-09-02",amount:10,timing:"BEFORE_OPEN"});exportPaperBackup();previewPaperBackup();applyPaperBackup();byId("paper-flow-date").value="2026-09-03";byId("paper-flow-amount").value="20";byId("paper-flow-direction").value="DEPOSIT";addPaperCashFlow()');assert.equal(p.run('new Set(paperCashFlows.map(f=>f.id)).size'),2);p.nodes.get('paper-clear').listeners.click();assert.equal(p.nodes.get('paper-backup-text').value,'');assert.equal(p.run('paperCashFlows.length'),0);
});

test('stale asynchronous backup file reads cannot overwrite text after ledger changes',async()=>{
 const p=page(async()=>response({}));let resolve;const read=new Promise(r=>{resolve=r;});p.nodes.get('paper-backup-file').files=[{size:10,text:()=>read}];const running=p.nodes.get('paper-backup-file').listeners.change();p.run('invalidatePaperPerformance();byId("paper-backup-text").value="newer user text"');resolve('{}');await running;assert.equal(p.nodes.get('paper-backup-text').value,'newer user text');assert.equal(p.nodes.get('paper-backup-apply').disabled,true);
});

async function timelineFixture(){
 const {calculatePaperPerformance}=await import('../src/v2/paper_performance.js');
 const calendar=Array.from({length:22},(_,i)=>new Date(Date.UTC(2026,8,i+1)).toISOString().slice(0,10));
 return calculatePaperPerformance({currency:'KRW',initialCash:100,calendar,prices:{'005930':{status:'READY',basis:'RAW',currency:'KRW',sessions:calendar.map(date=>({date,close:100}))}},trades:[{id:'b',ticker:'005930',date:calendar[0],side:'BUY',quantity:1,price:100}],cashFlows:[{id:'in',date:calendar[1],timing:'BEFORE_OPEN',amount:100}],actionCoverage:{verified:true,fromDate:calendar[0],toDate:calendar.at(-1),events:[],hasUnresolvedEvents:false},analysisDate:'2026-10-20T00:00:00Z'});
}
test('paper daily view switches metrics and range while retaining the complete accessible ledger',async()=>{
 const r=await timelineFixture(),p=page(async()=>response({}));p.run(`globalThis.timeline=renderPaperTimeline(${JSON.stringify(r)})`);let chart=p.run('timeline.children.at(-2)');assert.equal(chart.children[0].children.length,3);assert.match(chart.children[0].attributes['aria-label'],/총자산·현금·주식평가/);const controls=p.run('timeline.children[3]'),metric=controls.children[0].children[0],range=controls.children[1].children[0];metric.value='netPnl';metric.listeners.change();assert.equal(chart.children[0].children.length,1);assert.match(chart.children[0].attributes['aria-label'],/누적 순손익/);range.value='20';range.listeners.change();const area=p.run('timeline.children.at(-1)');assert.equal(area.attributes.tabindex,'0');assert.equal(area.children[0].children.at(-1).children.length,20);assert.match(validationText(area),/당일 순입출금.*누적 순손익/);
});
test('paper daily view rejects missing, inconsistent or unverified rows instead of plotting them',async()=>{
 const original=await timelineFixture(),p=page(async()=>response({}));for(const change of [x=>x.status='PENDING',x=>delete x.points[1].netPnl,x=>x.points[1].cash=999,x=>x.points[1].date=x.points[0].date,x=>x.currency='USD',x=>x.basis='TOTAL_RETURN',x=>x.netPnl=999,x=>x.mddPct=-50]){const x=structuredClone(original);change(x);assert.equal(p.run(`validPaperTimeline(${JSON.stringify(x)})`),false);p.run(`globalThis.badTimeline=renderPaperTimeline(${JSON.stringify(x)})`);assert.match(validationText(p.run('badTimeline')),/자료 부족/);}
});
test('changing a ledger during an in-flight daily calculation discards its chart and rows',async()=>{
 const fixture=await timelineFixture();let resolve;const pending=new Promise(r=>{resolve=r;});const p=page(async()=>pending);p.run('paperPositions.push({market:"KR",ticker:"005930",buy:100,quantity:1,fee:0,tax:0});byId("paper-from").value="2026-09-01";byId("paper-to").value="2026-09-22"');const running=p.run('loadPaperPerformance()');p.run('invalidatePaperPerformance()');resolve(response({status:'READY',portfolio:fixture}));await running;assert.equal(p.nodes.get('paper-performance-results').children.length,0);
});

test('large portfolio values do not hide a one-won cash reconciliation error',async()=>{
 const fixture=await timelineFixture();const keys=['value','cash','marketValue','cashFlow','netCashFlows','netPnl','fees','taxes','dividendCash','realizedPnl','unrealizedPnl'];for(const row of fixture.points)for(const k of keys)row[k]*=1000000;for(const k of ['initialCash','netCashFlows','netPnl','fees','taxes','dividendCash','realizedPnl','unrealizedPnl'])fixture[k]*=1000000;const p=page(async()=>response({}));assert.equal(p.run(`validPaperTimeline(${JSON.stringify(fixture)})`),true);fixture.points[1].cash+=1;assert.equal(p.run(`validPaperTimeline(${JSON.stringify(fixture)})`),false);
});

test('paper attribution distinguishes cash-inclusive weights from stock returns and filters sold positions',async()=>{
 const r=await timelineFixture(),p=page(async()=>response({}));p.run(`globalThis.positionsView=renderPaperAttribution(${JSON.stringify(r)})`);assert.equal(p.run(`validPaperAttribution(${JSON.stringify(r)})`),true);const text=validationText(p.run('positionsView'));assert.match(text,/현금 비중 50.00%/);assert.match(text,/전체 자산 내 비중 50.00%/);assert.match(text,/수익 기여도 0.0000%p/);const filter=p.run('positionsView.children.at(-2).children[0].children[0]');filter.value='closed';filter.listeners.change();assert.match(validationText(p.run('positionsView.children.at(-1)')),/기록이 없습니다/);
});
test('paper attribution refuses corrupt totals, duplicate positions and missing data',async()=>{
 const original=await timelineFixture(),p=page(async()=>response({}));for(const edit of [x=>delete x.positions,x=>x.positions.push({...x.positions[0]}),x=>x.positions[0].netPnl=1,x=>x.positions[0].returnContributionPct=1,x=>x.cashWeightPct=100,x=>x.positions[0].remainingCost=999]){const r=structuredClone(original);edit(r);assert.equal(p.run(`validPaperAttribution(${JSON.stringify(r)})`),false);p.run(`globalThis.badAttribution=renderPaperAttribution(${JSON.stringify(r)})`);assert.match(validationText(p.run('badAttribution')),/자료 부족/);}
});

test('paper position reconciliation failures are reported as accounting mismatches',async()=>{
 const p=page(async()=>response({status:'PENDING',reason:'POSITION_RECONCILIATION'}));p.run('paperPositions.push({market:"KR",ticker:"005930",buy:100,quantity:1,fee:0,tax:0});byId("paper-from").value="2026-09-01";byId("paper-to").value="2026-09-03"');await p.run('loadPaperPerformance()');assert.match(p.nodes.get('paper-performance-message').textContent,/종목별 손익·수익 기여도 합계/);assert.equal(p.nodes.get('paper-performance-results').children.length,0);
});

test('paper CSV reports preserve full-period numeric data and exclude credential or verification metadata',async()=>{
 const r=await timelineFixture(),p=page(async()=>response({}));r.token='DO_NOT_EXPORT';r.approved=true;const csv=p.run(`makePaperReportCsv(${JSON.stringify(r)},'daily')`);assert.equal(csv.charCodeAt(0),0xfeff);assert.equal(csv.trim().split('\r\n').length,23);assert.match(csv,/실거래 성과 아님/);assert.match(csv,/당일 순입출금/);assert.doesNotMatch(csv,/DO_NOT_EXPORT|approved/);const stock=p.run(`makePaperReportCsv(${JSON.stringify(r)},'positions')`);assert.match(stock,/"KR:005930"/);assert.match(stock,/수익 기여도\(%p\)/);assert.equal(stock.trim().split('\r\n').length,2);
});
test('CSV export rejects invalid results, corrupt contribution data and formula-like ticker strings',async()=>{
 const r=await timelineFixture(),p=page(async()=>response({}));for(const change of [x=>x.status='PENDING',x=>x.positions[0].ticker='=HYPERLINK("bad")',x=>x.positions[0].returnContributionPct=999]){const v=structuredClone(r);change(v);assert.throws(()=>p.run(`makePaperReportCsv(${JSON.stringify(v)},'positions')`),/PAPER_REPORT_UNVERIFIED/);}assert.throws(()=>p.run(`makePaperReportCsv(${JSON.stringify(r)},'unknown')`),/PAPER_REPORT_UNVERIFIED/);
});
test('reports are enabled only after calculation and a changed ledger erases generated report text',async()=>{
 const r=await timelineFixture(),p=page(async()=>response({status:'READY',portfolio:r}));p.run('paperPositions.push({market:"KR",ticker:"005930",buy:100,quantity:1,fee:0,tax:0});byId("paper-from").value="2026-09-01";byId("paper-to").value="2026-09-22";byId("paper-report-kind").value="daily"');await p.run('loadPaperPerformance()');assert.equal(p.nodes.get('paper-report-build').disabled,false);p.nodes.get('paper-report-build').listeners.click();assert.match(p.nodes.get('paper-report-text').value,/총자산/);p.run('invalidatePaperPerformance()');assert.equal(p.nodes.get('paper-report-text').value,'');assert.equal(p.nodes.get('paper-report-build').disabled,true);assert.equal(p.run('buildPaperReport()'),null);
});
test('CSV scenario labels cannot be mistaken for verified total returns and report kind changes clear old text',async()=>{
 const r=await timelineFixture();r.basis='USER_DIVIDEND_SCENARIO';const p=page(async()=>response({}));const csv=p.run(`makePaperReportCsv(${JSON.stringify(r)},'daily')`);assert.match(csv,/사용자 가상 배당 시나리오 · 공식 총수익 아님/);p.run('byId("paper-report-text")');p.nodes.get('paper-report-text').value=csv;p.nodes.get('paper-report-kind').listeners.change();assert.equal(p.nodes.get('paper-report-text').value,'');
});

test('paper precheck blocks malformed and reversed dates before API calls and links errors to inputs',async()=>{
 let calls=0;const p=page(async()=>{calls++;return response({});});p.run('paperPositions.push({market:"KR",ticker:"005930",buy:100,quantity:1,fee:0,tax:0});byId("paper-from").value="2026-02-30";byId("paper-to").value="2026-09-01"');await p.run('loadPaperPerformance()');assert.equal(calls,0);assert.equal(p.nodes.get('paper-from').attributes['aria-invalid'],'true');p.nodes.get('paper-input-review-results').children[0].children[1].listeners.click();assert.equal(p.nodes.get('paper-from').focused,true);p.run('byId("paper-from").value="2026-09-03";byId("paper-to").value="2026-09-01"');await p.run('loadPaperPerformance()');assert.equal(calls,0);assert.match(p.nodes.get('paper-performance-message').textContent,/시작 거래일보다 뒤/);
});
test('paper precheck detects oversold records after purchase deletion and leaves records unchanged',async()=>{
 let calls=0;const p=page(async()=>{calls++;return response({});});p.run('paperPositions.push({market:"KR",ticker:"005930",buy:100,quantity:1,fee:0,tax:0});paperSales.push({id:"s",ticker:"005930",date:"2026-09-02",quantity:2,price:110});byId("paper-from").value="2026-09-01";byId("paper-to").value="2026-09-03"');await p.run('loadPaperPerformance()');assert.equal(calls,0);assert.match(p.nodes.get('paper-performance-message').textContent,/보유 수량/);assert.equal(p.run('paperSales.length'),1);
});
test('paper precheck enforces beginning-of-day cash before sales and dividends but permits known opening deposits',()=>{
 const p=page(async()=>response({}));p.run('paperPositions.push({market:"KR",ticker:"005930",buy:100,quantity:1,fee:0,tax:0});byId("paper-from").value="2026-09-01";byId("paper-to").value="2026-09-03";byId("paper-initial-cash").value="90"');assert.match(p.run('inspectPaperInput().issues[0].message'),/매수액·비용/);p.run('paperCashFlows.push({id:"in",date:"2026-09-01",timing:"BEFORE_OPEN",amount:10})');assert.equal(p.run('inspectPaperInput().issues.length'),0);p.run('paperSales.push({id:"s",ticker:"005930",date:"2026-09-02",quantity:1,price:110});paperDividends.push({id:"d",ticker:"005930",date:"2026-09-02",amount:7});paperCashFlows.push({id:"out",date:"2026-09-02",timing:"BEFORE_OPEN",amount:-1})');assert.match(p.run('inspectPaperInput().issues[0].message'),/장 시작 전 출금 가능액/);
});
test('manual precheck never calls an API and changed records clear prior error attributes',()=>{
 let calls=0;const p=page(async()=>{calls++;return response({});});p.nodes.get('paper-input-check').listeners.click();assert.equal(calls,0);assert.equal(p.nodes.get('paper-from').attributes['aria-invalid'],'true');p.run('invalidatePaperPerformance()');assert.equal(p.nodes.get('paper-from').attributes['aria-invalid'],undefined);
});
test('server input rejection is distinguished from network failure without losing user records',async()=>{
 let calls=0;const p=page(async()=>{calls++;return {ok:false,status:400};});p.run('paperPositions.push({market:"KR",ticker:"005930",buy:100,quantity:1,fee:0,tax:0});byId("paper-from").value="2026-09-01";byId("paper-to").value="2026-09-03"');await p.run('loadPaperPerformance()');assert.equal(calls,1);assert.match(p.nodes.get('paper-performance-message').textContent,/서버가 입력을 거부/);assert.equal(p.run('paperPositions.length'),1);assert.equal(p.nodes.get('paper-report-build').disabled,true);
});
test('local input approval never substitutes for stale server evidence',async()=>{
 const p=page(async()=>response({status:'PENDING',reason:'SOURCE_DATA_STALE'}));p.run('paperPositions.push({market:"KR",ticker:"005930",buy:100,quantity:1,fee:0,tax:0});byId("paper-from").value="2026-09-01";byId("paper-to").value="2026-09-03"');await p.run('loadPaperPerformance()');assert.match(validationText(p.nodes.get('paper-input-review-results')),/로컬 입력 점검 통과/);assert.match(p.nodes.get('paper-performance-message').textContent,/자료가 오래/);assert.equal(p.nodes.get('paper-performance-results').children.length,0);
});

test('paper exit guard is attached only while records remain and emptying releases it', () => {
  const p=page(async()=>response({}));
  p.run(`globalThis.guardEvents=[];globalThis.guardTarget={addEventListener:(name,fn)=>guardEvents.push(['add',name,fn]),removeEventListener:(name,fn)=>guardEvents.push(['remove',name,fn])};syncPaperExitGuard(guardTarget)`);
  assert.equal(p.run('guardEvents.length'),0);
  p.run('paperPositions.push({});syncPaperExitGuard(guardTarget);syncPaperExitGuard(guardTarget)');
  assert.equal(p.run('guardEvents.length'),1);
  assert.equal(p.run('guardEvents[0][1]'),'beforeunload');
  p.run('paperPositions.length=0;syncPaperExitGuard(guardTarget)');
  assert.equal(p.run('guardEvents[1][0]'),'remove');
  assert.equal(p.run('guardEvents[0][2]===guardEvents[1][2]'),true);
});

test('paper exit warning covers orphaned flows sales and dividends without changing records', () => {
  const p=page(async()=>response({}));
  for(const list of ['paperPositions','paperCashFlows','paperSales','paperDividends']){
    p.run(`${list}.push({});globalThis.exitEvent={prevented:false,preventDefault(){this.prevented=true;}};warnBeforePaperExit(exitEvent)`);
    assert.equal(p.run('exitEvent.prevented'),true);
    assert.equal(p.run('exitEvent.returnValue'),'');
    assert.equal(p.run(`${list}.length`),1);
    p.run(`${list}.length=0`);
  }
  p.run('globalThis.exitEvent={preventDefault(){throw Error("empty should not warn")}};warnBeforePaperExit(exitEvent)');
  assert.equal(p.run('exitEvent.returnValue'),undefined);
});

test('paper backup export does not suppress exit warning and clear removes all ledger warnings', () => {
  const p=page(async()=>response({}));
  p.run(`paperPositions.push({market:'KR',ticker:'005930',currency:'KRW',buy:100,quantity:1,fee:0,tax:0,price:110,date:'2026-09-01'});exportPaperBackup()`);
  assert.match(p.nodes.get('paper-backup-text').value,/005930/);
  assert.equal(p.run('hasPaperRecords()'),true);
  p.nodes.get('paper-clear').listeners.click();
  assert.equal(p.run('hasPaperRecords()'),false);
  assert.equal(p.nodes.get('paper-backup-text').value,'');
});

test('individual paper deletion restores each ledger in original order and invalidates results',()=>{
 const p=page(async()=>response({}));
 for(const [kind,list] of [['position','paperPositions'],['flow','paperCashFlows'],['sale','paperSales'],['dividend','paperDividends']]){
  p.run(`${list}.push({ticker:'005930',market:'KR',currency:'KRW',buy:100,quantity:1,fee:0,tax:0,price:110,date:'2026-09-01',amount:10,id:'first'},{ticker:'005930',market:'KR',currency:'KRW',buy:200,quantity:1,fee:0,tax:0,price:210,date:'2026-09-02',amount:20,id:'second'});deletePaperRecord('${kind}',${list}[0])`);
  assert.equal(p.run(`${list}.length`),1);assert.equal(p.nodes.get('paper-delete-undo').disabled,false);
  p.run('undoPaperDelete()');assert.equal(p.run(`${list}[0].id`),'first');assert.equal(p.run(`${list}[1].id`),'second');
  assert.equal(p.nodes.get('paper-delete-undo').disabled,true);assert.equal(p.run('paperReportSnapshot'),null);
  if(kind==='position')assert.equal(p.run('paperPositions[0].price'),null);
  p.run(`${list}.length=0`);
 }
});

test('deleted last record remains protected until undo is discarded and clear erases the copy',()=>{
 const p=page(async()=>response({}));p.run("paperCashFlows.push({date:'2026-09-01',amount:10});deletePaperRecord('flow',paperCashFlows[0])");
 assert.equal(p.run('hasPaperRecords()'),true);assert.equal(p.nodes.get('paper-clear').disabled,false);
 p.nodes.get('paper-clear').listeners.click();assert.equal(p.run('paperDeletedRecord'),null);assert.equal(p.run('hasPaperRecords()'),false);
 p.run('undoPaperDelete()');assert.equal(p.run('paperCashFlows.length'),0);
});

test('subsequent input change cannot revive a stale deleted record',()=>{
 const p=page(async()=>response({}));p.run("paperDividends.push({ticker:'005930',date:'2026-09-01',amount:7});deletePaperRecord('dividend',paperDividends[0]);invalidatePaperPerformance();undoPaperDelete()");
 assert.equal(p.run('paperDividends.length'),0);assert.equal(p.run('paperDeletedRecord'),null);
 assert.equal(p.nodes.get('paper-delete-undo').disabled,true);
});

test('a second deletion replaces undo instead of accumulating history',()=>{
 const p=page(async()=>response({}));p.run("paperSales.push({ticker:'005930',id:'a'},{ticker:'005930',id:'b'});deletePaperRecord('sale',paperSales[0]);deletePaperRecord('sale',paperSales[0]);undoPaperDelete();undoPaperDelete()");
 assert.equal(p.run('paperSales.length'),1);assert.equal(p.run('paperSales[0].id'),'b');
});

function editFixture(p){p.run(`paperPositions.push({market:'KR',currency:'KRW',ticker:'005930',buy:100,quantity:2,fee:0,tax:0,price:110,date:'2026-09-01'});paperSales.push({id:'s1',ticker:'005930',date:'2026-09-02',quantity:1,price:120,fee:0,tax:0});paperCashFlows.push({id:'f1',date:'2026-09-01',timing:'BEFORE_OPEN',amount:10});paperDividends.push({id:'d1',ticker:'005930',date:'2026-09-03',amount:7});`);}
function setEdit(p,values){for(const [key,value] of Object.entries(values))p.run(`byId('paper-edit-${key}').value=${JSON.stringify(String(value))}`);}
test('paper edit saves each ledger atomically while preserving identity fields and sequence',()=>{
 const p=page(async()=>response({}));editFixture(p);
 for(const [kind,list,values] of [['position','paperPositions',{buy:90,quantity:3,fee:2,tax:1}],['sale','paperSales',{date:'2026-09-02',quantity:2,price:125,fee:1,tax:1}],['flow','paperCashFlows',{date:'2026-09-02',amount:-5}],['dividend','paperDividends',{date:'2026-09-03',amount:8}]]){
  p.run(`beginPaperEdit('${kind}',${list}[0])`);setEdit(p,values);p.run('savePaperEdit()');
  for(const [key,value] of Object.entries(values))assert.equal(p.run(`${list}[0].${key}`),value);
  assert.equal(p.run(`${list}.length`),1);assert.equal(p.run('paperEditSession'),null);
 }
 assert.equal(p.run('paperSales[0].id'),'s1');assert.equal(p.run('paperPositions[0].ticker'),'005930');assert.equal(p.run('paperReportSnapshot'),null);
});
test('paper edit rejects overselling from either side and keeps original plus draft',()=>{
 const p=page(async()=>response({}));editFixture(p);p.run("beginPaperEdit('position',paperPositions[0])");setEdit(p,{buy:100,quantity:0.5,fee:0,tax:0});p.run('savePaperEdit()');assert.equal(p.run('paperPositions[0].quantity'),2);assert.notEqual(p.run('paperEditSession'),null);assert.match(p.nodes.get('paper-edit-message').textContent,/저장하지 않았습니다/);
 p.nodes.get('paper-edit-cancel').listeners.click();p.run("beginPaperEdit('sale',paperSales[0])");setEdit(p,{date:'2026-09-02',quantity:3,price:120,fee:0,tax:0});p.run('savePaperEdit()');assert.equal(p.run('paperSales[0].quantity'),1);
});
test('paper edit rejects impossible dates blank fields and overflow without requests',()=>{
 let calls=0;const p=page(async()=>{calls++;return response({});});editFixture(p);
 for(const values of [{date:'2026-02-30',amount:5},{date:'2026-09-01',amount:''},{date:'2026-09-01',amount:1e100}]){p.run("beginPaperEdit('flow',paperCashFlows[0])");setEdit(p,values);p.run('savePaperEdit()');assert.equal(p.run('paperCashFlows[0].amount'),10);}
 assert.equal(calls,0);
});
test('paper edit cancel leaves calculations and original records unchanged',()=>{
 const p=page(async()=>response({}));editFixture(p);const version=p.run('paperPerformanceVersion');p.run("beginPaperEdit('position',paperPositions[0])");setEdit(p,{buy:1});p.nodes.get('paper-edit-cancel').listeners.click();assert.equal(p.run('paperPositions[0].buy'),100);assert.equal(p.run('paperPerformanceVersion'),version);assert.equal(p.nodes.get('paper-edit-panel').hidden,true);assert.equal(p.nodes.get('paper-edit-fields').children.length,0);
});
test('paper edit closes on other changes and cannot overwrite imported or cleared records',()=>{
 const p=page(async()=>response({}));editFixture(p);p.run("beginPaperEdit('flow',paperCashFlows[0])");setEdit(p,{date:'2026-09-01',amount:99});p.nodes.get('paper-clear').listeners.click();p.run('savePaperEdit()');assert.equal(p.run('paperCashFlows.length'),0);assert.equal(p.run('paperEditSession'),null);
});

test('backup replacement preview separates currencies and exposes equal-count changes without mutation',()=>{
 const p=page(async()=>response({}));editFixture(p);p.run(`paperPositions.push({market:'GLOBAL',ticker:'AAPL',currency:'USD',buy:10,quantity:1,fee:1,tax:0});exportPaperBackup();globalThis.originalBackup=byId('paper-backup-text').value;paperPositions[0].buy=200;byId('paper-initial-cash').value='900';byId('paper-from').value='2026-09-01';previewPaperBackup()`);
 const text=validationText(p.nodes.get('paper-backup-comparison'));
 assert.match(text,/매수 기록 수: 2 → 2/);assert.match(text,/005930 매수 원가·비용 \(KRW\): 400 → 200/);assert.match(text,/AAPL 매수 원가·비용 \(USD\): 11 → 11/);assert.match(text,/가상 시작 현금 \(KRW\): 900 → 자동 계산/);assert.match(text,/합계가 같아도/);assert.match(text,/전체 기록과 계산 조건/);
 assert.equal(p.run('paperPositions[0].buy'),200);assert.equal(p.nodes.get('paper-backup-apply').disabled,false);
});

test('backup preview cancel preserves source text and original records but prevents application',()=>{
 const p=page(async()=>response({}));editFixture(p);p.run('exportPaperBackup();previewPaperBackup();globalThis.previewText=byId("paper-backup-text").value');
 p.nodes.get('paper-backup-cancel').listeners.click();p.run('applyPaperBackup()');
 assert.equal(p.run('paperPositions[0].buy'),100);assert.equal(p.run('pendingPaperBackup'),null);assert.equal(p.nodes.get('paper-backup-comparison').children.length,0);assert.equal(p.nodes.get('paper-backup-apply').disabled,true);assert.equal(p.nodes.get('paper-backup-text').value,p.run('previewText'));
});

test('backup summary is removed after changed input invalid backup or successful application',()=>{
 const p=page(async()=>response({}));editFixture(p);p.run('exportPaperBackup();previewPaperBackup();invalidatePaperPerformance()');assert.equal(p.nodes.get('paper-backup-comparison').children.length,0);
 p.run('previewPaperBackup();byId("paper-backup-text").value="invalid";previewPaperBackup()');assert.equal(p.nodes.get('paper-backup-comparison').children.length,0);assert.equal(p.nodes.get('paper-backup-cancel').disabled,true);
 p.run('exportPaperBackup();previewPaperBackup();applyPaperBackup()');assert.equal(p.nodes.get('paper-backup-comparison').children.length,0);assert.equal(p.nodes.get('paper-backup-apply').disabled,true);
});

test('empty backup clearly previews removal of existing holdings without API access',()=>{
 let calls=0;const p=page(async()=>{calls++;return response({});});p.run('exportPaperBackup();globalThis.emptyBackup=byId("paper-backup-text").value');editFixture(p);p.run('byId("paper-backup-text").value=emptyBackup;previewPaperBackup()');
 assert.match(validationText(p.nodes.get('paper-backup-comparison')),/005930 매수 수량: 2 → 0/);assert.match(validationText(p.nodes.get('paper-backup-comparison')),/매수 기록 수: 1 → 0/);assert.equal(p.run('paperPositions.length'),1);assert.equal(calls,0);
});

test('paper record filters show ticker and kind matches without changing ledger backup or calculation version',()=>{
 const p=page(async()=>response({}));editFixture(p);p.run('globalThis.beforeFilter=makePaperBackup();globalThis.beforeVersion=paperPerformanceVersion;byId("paper-record-kind").value="sale";byId("paper-record-search").value="0059";renderPaperLedgers()');
 assert.equal(p.run("visiblePaperRecords('position',paperPositions).length"),0);assert.equal(p.run("visiblePaperRecords('sale',paperSales).length"),1);assert.match(p.nodes.get('paper-record-count').textContent,/전체 4건 중 1건/);assert.equal(p.run('makePaperBackup()===beforeFilter'),true);assert.equal(p.run('paperPerformanceVersion===beforeVersion'),true);
});
test('paper record ticker search excludes cash flows and handles lowercase global codes',()=>{
 const p=page(async()=>response({}));editFixture(p);p.run("paperPositions.push({market:'GLOBAL',currency:'USD',ticker:'AAPL',buy:10,quantity:1,fee:0,tax:0,price:11});byId('paper-record-search').value=' aapl ';renderPaperLedgers()");assert.equal(p.run("visiblePaperRecords('position',paperPositions)[0].ticker"),'AAPL');assert.equal(p.run("visiblePaperRecords('flow',paperCashFlows).length"),0);assert.match(validationText(p.nodes.get('paper-flow-results')),/선택한 조건/);
 p.nodes.get('paper-record-reset').listeners.click();assert.match(p.nodes.get('paper-record-count').textContent,/전체 5건 중 5건/);assert.equal(p.nodes.get('paper-record-search').focused,true);
});
test('paper filtered deletion changes only the selected original record and undo restores it',()=>{
 const p=page(async()=>response({}));editFixture(p);p.run("paperSales.push({...paperSales[0],id:'s2'});byId('paper-record-kind').value='sale';renderPaperLedgers()");p.nodes.get('paper-sale-results').children[1].children.at(-1).listeners.click();assert.equal(p.run('paperSales.length'),1);assert.equal(p.run('paperSales[0].id'),'s1');p.run('undoPaperDelete()');assert.equal(p.run('paperSales[1].id'),'s2');assert.match(p.nodes.get('paper-record-count').textContent,/전체 5건 중 2건/);
});
test('paper issue navigation reveals hidden records by resetting display filters',()=>{
 const p=page(async()=>response({}));editFixture(p);p.run("byId('paper-record-kind').value='flow';byId('paper-record-search').value='missing';renderPaperLedgers();renderPaperInputReview({issues:[{target:'paper-sale-results',message:'매도 기록 확인'}]})");p.nodes.get('paper-input-review-results').children[0].children[1].listeners.click();assert.equal(p.nodes.get('paper-record-kind').value,'all');assert.equal(p.nodes.get('paper-record-search').value,'');assert.equal(p.nodes.get('paper-sale-results').focused,true);assert.equal(p.nodes.get('paper-sale-results').children.length,1);
});

test('paper record pages bound DOM at 500 flows and preserve all backup records',()=>{
 const p=page(async()=>response({}));p.run("for(let i=0;i<500;i++)paperCashFlows.push({id:'f'+i,date:'2026-09-01',timing:'BEFORE_OPEN',amount:i+1});renderPaperLedgers();globalThis.pagingBackup=makePaperBackup()");
 assert.equal(p.nodes.get('paper-flow-results').children.filter(n=>n.tag==='article').length,20);assert.match(p.nodes.get('paper-record-count').textContent,/현재 페이지 20건/);
 p.nodes.get('paper-flow-results').children.at(-1).children.at(-1).listeners.click();assert.equal(p.run("pagedPaperRecords('flow',paperCashFlows)[0].id"),'f20');assert.equal(p.run('makePaperBackup()===pagingBackup'),true);assert.equal(p.nodes.get('paper-flow-results').focused,true);
 p.run('paperRecordPages.flow=24;renderPaperLedgers()');assert.equal(p.run("pagedPaperRecords('flow',paperCashFlows).at(-1).id"),'f499');assert.equal(p.nodes.get('paper-flow-results').children.at(-1).children.at(-1).disabled,true);
});
test('paper record page clamps after last-page deletion and restores the original record',()=>{
 const p=page(async()=>response({}));p.run("for(let i=0;i<21;i++)paperCashFlows.push({id:'f'+i,date:'2026-09-01',timing:'BEFORE_OPEN',amount:1});paperRecordPages.flow=1;renderPaperLedgers()");p.nodes.get('paper-flow-results').children[0].children.at(-1).listeners.click();assert.equal(p.run('paperRecordPages.flow'),0);assert.equal(p.run('paperCashFlows.length'),20);p.run('undoPaperDelete();paperRecordPages.flow=1;renderPaperLedgers()');assert.equal(p.run("pagedPaperRecords('flow',paperCashFlows)[0].id"),'f20');
});
test('paper filters reset pages while keeping calculation version and full records',()=>{
 const p=page(async()=>response({}));p.run("for(let i=0;i<45;i++)paperCashFlows.push({date:'2026-09-01',timing:'BEFORE_OPEN',amount:1});paperRecordPages.flow=2;renderPaperLedgers();globalThis.pageVersion=paperPerformanceVersion");p.nodes.get('paper-record-kind').value='flow';p.nodes.get('paper-record-kind').listeners.change();assert.equal(p.run('paperRecordPages.flow'),0);assert.equal(p.run('paperPerformanceVersion===pageVersion'),true);p.nodes.get('paper-clear').listeners.click();assert.equal(p.run('paperCashFlows.length'),0);assert.equal(p.run('paperRecordPages.flow'),0);
});

test('paper date sorting preserves same-day order and original backup order',()=>{
 const p=page(async()=>response({}));editFixture(p);p.run("paperCashFlows.splice(0,paperCashFlows.length,{id:'late',date:'2026-09-03',timing:'BEFORE_OPEN',amount:3},{id:'early1',date:'2026-09-01',timing:'BEFORE_OPEN',amount:1},{id:'early2',date:'2026-09-01',timing:'BEFORE_OPEN',amount:2});globalThis.beforeSort=makePaperBackup();globalThis.sortVersion=paperPerformanceVersion;byId('paper-record-order').value='oldest';renderPaperLedgers()");assert.equal(p.run("visiblePaperRecords('flow',paperCashFlows).map(x=>x.id).join(',')"),'early1,early2,late');p.run("byId('paper-record-order').value='newest';renderPaperLedgers()");assert.equal(p.run("visiblePaperRecords('flow',paperCashFlows).map(x=>x.id).join(',')"),'late,early1,early2');assert.equal(p.run('makePaperBackup()===beforeSort'),true);assert.equal(p.run('paperPerformanceVersion===sortVersion'),true);
});
test('paper purchase quote dates never become transaction sorting dates',()=>{
 const p=page(async()=>response({}));editFixture(p);p.run("paperPositions.push({...paperPositions[0],buy:200,date:'2026-10-01'});byId('paper-record-order').value='newest'");assert.equal(p.run("visiblePaperRecords('position',paperPositions)[0].buy"),100);
});
test('date sort resets pages and sorted deletion restores original sequence',()=>{
 const p=page(async()=>response({}));p.run("for(let i=0;i<25;i++)paperCashFlows.push({id:'f'+i,date:i===24?'2026-09-03':'2026-09-01',timing:'BEFORE_OPEN',amount:1});paperRecordPages.flow=1;byId('paper-record-order').value='newest'");p.nodes.get('paper-record-order').listeners.change();assert.equal(p.run('paperRecordPages.flow'),0);assert.equal(p.run("pagedPaperRecords('flow',paperCashFlows)[0].id"),'f24');p.nodes.get('paper-flow-results').children[0].children.at(-1).listeners.click();assert.equal(p.run('paperCashFlows.length'),24);p.run('undoPaperDelete()');assert.equal(p.run('paperCashFlows[24].id'),'f24');assert.equal(p.run("pagedPaperRecords('flow',paperCashFlows)[0].id"),'f24');p.nodes.get('paper-record-reset').listeners.click();assert.equal(p.nodes.get('paper-record-order').value,'registered');
});

test('paper record range includes boundaries and keeps calculation dates and full backup',()=>{
 const p=page(async()=>response({}));editFixture(p);p.run("byId('paper-from').value='2026-09-01';byId('paper-to').value='2026-09-30';globalThis.rangeBackup=makePaperBackup();byId('paper-record-from').value='2026-09-02';byId('paper-record-to').value='2026-09-03';renderPaperLedgers()");assert.equal(p.run("visiblePaperRecords('sale',paperSales).length"),1);assert.equal(p.run("visiblePaperRecords('dividend',paperDividends).length"),1);assert.equal(p.run("visiblePaperRecords('flow',paperCashFlows).length"),0);assert.equal(p.run("visiblePaperRecords('position',paperPositions).length"),0);assert.equal(p.run('makePaperBackup()===rangeBackup'),true);
 p.run("byId('paper-record-to').value='2026-09-02';renderPaperLedgers()");assert.equal(p.run("visiblePaperRecords('sale',paperSales).length"),1);assert.equal(p.run("visiblePaperRecords('dividend',paperDividends).length"),0);
});
test('invalid or reversed record range reports errors without changing original data',()=>{
 const p=page(async()=>response({}));editFixture(p);for(const from of ['2026-02-30','2026-09-04']){p.run(`byId('paper-record-from').value='${from}';byId('paper-record-to').value='2026-03-01';renderPaperLedgers()`);assert.equal(p.nodes.get('paper-record-from').attributes['aria-invalid'],'true');assert.match(p.nodes.get('paper-record-date-message').textContent,/조회 날짜를 확인/);assert.equal(p.run('paperSales.length'),1);assert.equal(p.run("visiblePaperRecords('sale',paperSales).length"),0);}
 p.nodes.get('paper-record-reset').listeners.click();assert.equal(p.nodes.get('paper-record-from').value,'');assert.equal(p.nodes.get('paper-record-to').value,'');assert.equal(p.nodes.get('paper-record-from').attributes['aria-invalid'],undefined);
});
test('open-ended record ranges compose with sort and reset paging without requests',()=>{
 let calls=0;const p=page(async()=>{calls++;return response({});});editFixture(p);p.run("paperRecordPages.flow=4;byId('paper-record-from').value='2026-09-02'");p.nodes.get('paper-record-from').listeners.input();assert.equal(p.run('paperRecordPages.flow'),0);assert.equal(p.run("visiblePaperRecords('dividend',paperDividends).length"),1);p.run("byId('paper-record-from').value='';byId('paper-record-to').value='2026-09-01';renderPaperLedgers()");assert.equal(p.run("visiblePaperRecords('flow',paperCashFlows).length"),1);assert.equal(calls,0);
});

test('record summary separates deposit withdrawal sale proceeds and hypothetical dividends',()=>{
 const p=page(async()=>response({}));editFixture(p);p.run("paperCashFlows.push({date:'2026-09-02',amount:-4,timing:'BEFORE_OPEN'});paperSales[0].fee=2;paperSales[0].tax=1;renderPaperLedgers()");const text=validationText(p.nodes.get('paper-record-summary'));assert.match(text,/입금 10 KRW · 출금 4 KRW · 순입출금 6 KRW/);assert.match(text,/매도 총액 120 KRW · 비용 3 KRW · 순수령 117 KRW/);assert.match(text,/실현 손익 아님/);assert.match(text,/가정 배당 순수령 7 KRW/);
});
test('record summary covers all matching pages and preserves backup while filters narrow totals',()=>{
 const p=page(async()=>response({}));p.run("for(let i=0;i<45;i++)paperCashFlows.push({date:i<20?'2026-09-01':'2026-09-02',amount:1,timing:'BEFORE_OPEN'});globalThis.summaryBackup=makePaperBackup();renderPaperLedgers()");assert.match(validationText(p.nodes.get('paper-record-summary')),/입금 45 KRW/);p.run("paperRecordPages.flow=2;renderPaperLedgers()");assert.match(validationText(p.nodes.get('paper-record-summary')),/입금 45 KRW/);p.run("byId('paper-record-from').value='2026-09-02';renderPaperLedgers()");assert.match(validationText(p.nodes.get('paper-record-summary')),/입금 25 KRW/);assert.equal(p.run('makePaperBackup()===summaryBackup'),true);
});
test('record summary separates currencies and withholds invalid date or nonfinite sums',()=>{
 const p=page(async()=>response({}));editFixture(p);p.run("paperPositions.push({market:'GLOBAL',ticker:'AAPL',currency:'USD',buy:10,quantity:2,fee:1,tax:0});renderPaperLedgers()");let text=validationText(p.nodes.get('paper-record-summary'));assert.match(text,/\(KRW\) 200/);assert.match(text,/\(USD\) 21/);p.run("paperCashFlows.push({date:'2026-09-01',amount:Infinity});renderPaperLedgers()");assert.match(validationText(p.nodes.get('paper-record-summary')),/수치 범위 확인 필요/);p.run("byId('paper-record-from').value='bad';renderPaperLedgers()");assert.match(validationText(p.nodes.get('paper-record-summary')),/합계를 보류/);
});

test('edit validation marks all invalid fields and focuses first without changing original',()=>{
 const p=page(async()=>response({}));editFixture(p);p.run("beginPaperEdit('sale',paperSales[0])");setEdit(p,{date:'2026-02-30',quantity:0,price:120,fee:-1,tax:0});p.run('savePaperEdit()');for(const key of ['date','quantity','fee']){assert.equal(p.nodes.get('paper-edit-'+key).attributes['aria-invalid'],'true');assert.equal(p.nodes.get('paper-edit-'+key).attributes['aria-describedby'],'paper-edit-message');}assert.equal(p.nodes.get('paper-edit-date').focused,true);assert.match(p.nodes.get('paper-edit-message').textContent,/실제 날짜/);assert.equal(p.run('paperSales[0].quantity'),1);
});
test('oversold edit points to quantity and valid retry saves then removes error state',()=>{
 const p=page(async()=>response({}));editFixture(p);p.run("beginPaperEdit('position',paperPositions[0])");setEdit(p,{buy:100,quantity:0.5,fee:0,tax:0});p.run('savePaperEdit()');assert.equal(p.nodes.get('paper-edit-quantity').attributes['aria-invalid'],'true');assert.equal(p.nodes.get('paper-edit-quantity').focused,true);assert.match(p.nodes.get('paper-edit-message').textContent,/전체 매수 수량/);setEdit(p,{buy:100,quantity:3,fee:0,tax:0});p.run('savePaperEdit()');assert.equal(p.run('paperPositions[0].quantity'),3);assert.equal(p.nodes.get('paper-edit-quantity').attributes['aria-invalid'],undefined);
});
test('edit amount supports signed withdrawals but rejects zero and excessive price products',()=>{
 const p=page(async()=>response({}));editFixture(p);p.run("beginPaperEdit('flow',paperCashFlows[0])");setEdit(p,{date:'2026-09-01',amount:0});p.run('savePaperEdit()');assert.equal(p.nodes.get('paper-edit-amount').attributes['aria-invalid'],'true');setEdit(p,{date:'2026-09-01',amount:-10});p.run('savePaperEdit()');assert.equal(p.run('paperCashFlows[0].amount'),-10);p.run("beginPaperEdit('position',paperPositions[0])");setEdit(p,{buy:1e10,quantity:1e10,fee:0,tax:0});p.run('savePaperEdit()');assert.equal(p.nodes.get('paper-edit-quantity').attributes['aria-invalid'],'true');assert.equal(p.run('paperPositions[0].quantity'),2);
});

test('opening another editor preserves dirty draft and focuses the existing editor',()=>{
 const p=page(async()=>response({}));editFixture(p);p.run("beginPaperEdit('position',paperPositions[0])");setEdit(p,{buy:95});p.run("beginPaperEdit('sale',paperSales[0])");assert.equal(p.run('paperEditSession.kind'),'position');assert.equal(p.nodes.get('paper-edit-buy').value,'95');assert.equal(p.nodes.get('paper-edit-buy').focused,true);assert.match(p.nodes.get('paper-edit-message').textContent,/저장하지 않은/);assert.equal(p.run('paperPositions[0].buy'),100);
 p.nodes.get('paper-edit-cancel').listeners.click();p.run("beginPaperEdit('sale',paperSales[0])");assert.equal(p.run('paperEditSession.kind'),'sale');
});
test('opening the same record twice retains draft and validation errors',()=>{
 const p=page(async()=>response({}));editFixture(p);p.run("beginPaperEdit('position',paperPositions[0])");setEdit(p,{quantity:0});p.run("savePaperEdit();beginPaperEdit('position',paperPositions[0])");assert.equal(p.nodes.get('paper-edit-quantity').value,'0');assert.equal(p.nodes.get('paper-edit-quantity').attributes['aria-invalid'],'true');assert.equal(p.run('paperPositions[0].quantity'),2);
});
test('unchanged equivalent numeric input permits editor switching but blank input is protected',()=>{
 const p=page(async()=>response({}));editFixture(p);p.run("beginPaperEdit('position',paperPositions[0])");setEdit(p,{buy:'100.00'});assert.equal(p.run('paperEditHasChanges()'),false);p.run("beginPaperEdit('flow',paperCashFlows[0])");assert.equal(p.run('paperEditSession.kind'),'flow');setEdit(p,{amount:''});p.run("beginPaperEdit('dividend',paperDividends[0])");assert.equal(p.run('paperEditSession.kind'),'flow');assert.equal(p.nodes.get('paper-edit-amount').value,'');
});

test('dirty edit blocks calculation requests without discarding existing results or draft',async()=>{
 let calls=0;const p=page(async()=>{calls++;return response({});});editFixture(p);p.run("byId('paper-performance-results').append({textContent:'existing'});beginPaperEdit('position',paperPositions[0])");setEdit(p,{buy:95});await p.run('loadPaperPerformance()');assert.equal(calls,0);assert.equal(p.nodes.get('paper-performance-results').children[0].textContent,'existing');assert.equal(p.nodes.get('paper-edit-buy').value,'95');assert.equal(p.nodes.get('paper-edit-buy').focused,true);assert.match(p.nodes.get('paper-performance-message').textContent,/저장하지 않은/);
});
test('dirty edit blocks backup text and file creation preserving old text and record values',()=>{
 const p=page(async()=>response({}));editFixture(p);p.run("exportPaperBackup();globalThis.oldBackup=byId('paper-backup-text').value;beginPaperEdit('flow',paperCashFlows[0])");setEdit(p,{amount:20});assert.equal(p.run('exportPaperBackup()'),false);p.nodes.get('paper-backup-download').listeners.click();assert.equal(p.nodes.get('paper-backup-text').value,p.run('oldBackup'));assert.equal(p.run('paperCashFlows[0].amount'),10);assert.match(p.nodes.get('paper-backup-message').textContent,/저장하지 않은/);
});
test('cancel or save restores backup export while unchanged editor allows normal export',()=>{
 const p=page(async()=>response({}));editFixture(p);p.run("beginPaperEdit('position',paperPositions[0])");assert.equal(p.run('exportPaperBackup()'),true);setEdit(p,{buy:95});p.nodes.get('paper-edit-cancel').listeners.click();assert.equal(p.run('exportPaperBackup()'),true);assert.equal(JSON.parse(p.nodes.get('paper-backup-text').value).positions[0].buy,100);p.run("beginPaperEdit('position',paperPositions[0])");setEdit(p,{buy:95});p.run('savePaperEdit()');assert.equal(p.run('exportPaperBackup()'),true);assert.equal(JSON.parse(p.nodes.get('paper-backup-text').value).positions[0].buy,95);
});

test('dirty edits block both CSV actions before clearing an existing report or creating a file',async()=>{
 const result=await timelineFixture(),p=page(async()=>response({}));editFixture(p);p.run(`paperReportSnapshot={version:paperPerformanceVersion,portfolio:${JSON.stringify(result)}};byId('paper-report-kind').value='daily';buildPaperReport();globalThis.previousCsv=byId('paper-report-text').value;globalThis.previousSnapshot=paperReportSnapshot;beginPaperEdit('position',paperPositions[0])`);setEdit(p,{buy:95});assert.equal(p.run('buildPaperReport()'),null);p.nodes.get('paper-report-download').listeners.click();assert.equal(p.nodes.get('paper-report-text').value,p.run('previousCsv'));assert.equal(p.run('paperReportSnapshot===previousSnapshot'),true);assert.match(p.nodes.get('paper-report-message').textContent,/저장하지 않은/);assert.equal(p.nodes.get('paper-edit-buy').focused,true);
});
test('CSV export resumes after cancel while saved edits require recalculation',async()=>{
 const result=await timelineFixture(),p=page(async()=>response({}));editFixture(p);p.run(`paperReportSnapshot={version:paperPerformanceVersion,portfolio:${JSON.stringify(result)}};byId('paper-report-kind').value='daily';beginPaperEdit('position',paperPositions[0])`);assert.match(p.run('buildPaperReport()'),/총자산/);setEdit(p,{buy:95});p.nodes.get('paper-edit-cancel').listeners.click();assert.match(p.run('buildPaperReport()'),/총자산/);p.run("beginPaperEdit('position',paperPositions[0])");setEdit(p,{buy:95});p.run('savePaperEdit()');assert.equal(p.run('buildPaperReport()'),null);assert.equal(p.run('paperReportSnapshot'),null);assert.equal(p.nodes.get('paper-report-download').disabled,true);
});
