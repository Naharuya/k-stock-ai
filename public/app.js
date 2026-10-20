const byId = (id) => document.getElementById(id);
const tokenInput = byId("token");
const loadButton = byId("load-button");
const message = byId("message");
const tableBody = byId("holdings-body");
const searchInput = byId("search");
let sessionToken = "";
let holdings = [];

const dateFormat = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeZone: "Asia/Seoul" });
const moneyFormat = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

byId("today").textContent = dateFormat.format(new Date());

function showMessage(text, kind = "") {
  message.textContent = text;
  message.className = `message${kind ? ` ${kind}` : ""}`;
}

function renderHoldings() {
  const term = searchInput.value.trim().toLowerCase();
  const rows = holdings.filter((item) => `${item.issuer} ${item.cusip}`.toLowerCase().includes(term));
  tableBody.replaceChildren();

  if (!rows.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.className = "empty";
    cell.textContent = holdings.length ? "검색 결과가 없습니다." : "공시를 불러오면 SEC 원문 기준 보유 종목이 표시됩니다.";
    row.append(cell);
    tableBody.append(row);
    return;
  }

  for (const item of rows) {
    const row = document.createElement("tr");
    const issuer = document.createElement("td");
    issuer.className = "issuer-cell";
    issuer.textContent = item.issuer;
    const securityClass = document.createElement("td");
    securityClass.textContent = item.putCall ? `${item.securityClass} · ${item.putCall}` : item.securityClass;
    const shares = document.createElement("td");
    shares.className = "numeric";
    shares.textContent = `${numberFormat.format(item.shares)} ${item.shareType || ""}`.trim();
    const value = document.createElement("td");
    value.className = "numeric value-cell";
    value.textContent = moneyFormat.format(item.valueUsd);
    const cusip = document.createElement("td");
    cusip.className = "cusip-cell";
    cusip.textContent = item.cusip;
    row.append(issuer, securityClass, shares, value, cusip);
    tableBody.append(row);
  }
}

async function checkHealth() {
  try {
    const response = await fetch("/health", { cache: "no-store" });
    const health = await response.json();
    if (!response.ok || !health.ok) throw new Error("health");
    byId("settings-version").textContent = `서버 버전: ${health.version || "미확인"} · 설치된 앱 버전은 해당 앱 설정에서 확인하세요.`;
    const sourceLabel = value => value === "NOT_CONFIGURED" ? "인증정보 미구성" : "실제 연결 미검증";
    byId("dashboard-sources").textContent = `KIS: ${sourceLabel(health.dataSources?.kis)} · OpenDART: ${sourceLabel(health.dataSources?.opendart)} · Scheduler: 실행 미검증`;
    byId("health-dot").classList.add("online");
    byId("health-label").textContent = "서버 연결됨";
    byId("server-state").textContent = "SEC 공시 조회 가능";
  } catch {
    byId("health-label").textContent = "서버 연결 실패";
    byId("server-state").textContent = "연결 확인 필요";
  }
}

async function loadPortfolio() {
  sessionToken = tokenInput.value.trim() || sessionToken;
  tokenInput.value = "";
  if (!sessionToken) {
    showMessage("서버는 공개되어 있지만 SEC 조회 API는 인증이 필요합니다. 외부접속 토큰을 입력해 주세요.", "warning");
    tokenInput.focus();
    return;
  }

  const requestToken = sessionToken;
  loadButton.disabled = true;
  showMessage("SEC 원문 공시를 확인하고 있습니다.");
  try {
    const response = await fetch("/api/disclosures/berkshire/portfolio", {
      headers: { Authorization: `Bearer ${sessionToken}`, Accept: "application/json" },
      cache: "no-store",
      redirect: "error",
    });
    if (response.status === 401) {
      if (sessionToken === requestToken) sessionToken = "";
      showMessage("서버는 연결되었지만 토큰 인증이 필요하거나 토큰이 올바르지 않습니다.", "warning");
      tokenInput.focus();
      return;
    }
    if (response.status === 403) {
      showMessage("조회 권한이 없습니다. 서버 접근 권한을 확인해 주세요.", "error");
      return;
    }
    if (!response.ok) throw new Error(response.status >= 500 ? "server" : "request");

    const result = await response.json();
    const data = result.data;
    holdings = data.holdings;
    byId("quarter-date").textContent = data.quarterEnd || "미제공";
    byId("filing-date").textContent = data.filingDate || "미제공";
    byId("filing-form").textContent = `${data.form} · SEC 제출 자료`;
    byId("holding-count").textContent = numberFormat.format(holdings.length);
    byId("source-link").href = data.holdingsUrl;
    byId("updated-at").textContent = `확인 시각 ${dateFormat.format(new Date(data.checkedAt))}`;
    renderHoldings();
    showMessage("분기 말 보유 현황입니다. 실제 체결일별 거래 내역이나 전일 매매를 뜻하지 않습니다.", "success");
  } catch (error) {
    showMessage(error.message === "server" ? "SEC 자료를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요." : "네트워크 연결 또는 서버 주소를 확인해 주세요.", "error");
  } finally {
    loadButton.disabled = false;
  }
}

loadButton.addEventListener("click", loadPortfolio);
searchInput.addEventListener("input", renderHoldings);
tokenInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") loadPortfolio();
});
checkHealth();
const candidateButton = byId("candidate-load");
const candidateMessage = byId("candidate-message");
const candidateDetail = byId("candidate-detail");
let candidateVersion = 0;
let selectedCandidateItem=null, displayedCandidateKey=null;
const candidateViews=new Map(), candidatePricePeriods=new Map();
const candidateKey=item=>`${item.market}:${item.ticker}`;
function rememberCandidateView(){
 if(!displayedCandidateKey||candidateDetail.hidden)return;
 if(typeof window!=='undefined'&&byId('stock-analysis').classList.contains&&!byId('stock-analysis').classList.contains('screen-active'))return;
 candidateViews.set(displayedCandidateKey,{view:capturePeerView(candidateDetail),scroll:typeof window!=='undefined'?window.scrollY:null});
 if(candidateViews.size>20)candidateViews.delete(candidateViews.keys().next().value);
}
function detailStatus(text,kind=''){
 const message=byId('candidate-detail-message');message.textContent=text;message.className=`message ${kind}`;
}
byId('candidate-detail-refresh').addEventListener('click',()=>{if(selectedCandidateItem)loadCandidateDetail(selectedCandidateItem);});

function candidateNode(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

function candidateStatus(text, kind = "") {
  candidateMessage.textContent = text;
  candidateMessage.className = `message ${kind}`;
}

async function candidateRequest(url, requireSuccess = true, options = {}) {
  sessionToken = tokenInput.value.trim() || sessionToken;
  tokenInput.value = "";
  const requestToken = sessionToken;
  if(options.signal?.aborted)throw Object.assign(new Error("REQUEST_ABORTED"),{name:"AbortError"});
  const request = fetch(url, {
    signal: options.signal,
    headers: { ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}), Accept: "application/json" },
    cache: "no-store", redirect: "error",
  });
  let removeAbort=()=>{};
  let response;
  try {
    response=await (options.signal?new Promise((resolve,reject)=>{
      const abort=()=>reject(Object.assign(new Error("REQUEST_ABORTED"),{name:"AbortError"}));
      options.signal.addEventListener('abort',abort,{once:true});removeAbort=()=>options.signal.removeEventListener('abort',abort);
      if(options.signal.aborted)abort();
      request.then(resolve,reject);
    }):request);
  } finally {removeAbort();}
  if (response.status === 401) {
    if (sessionToken === requestToken) sessionToken = "";
    tokenInput.focus();
    throw new Error("AUTH");
  }
  if (response.status === 404) throw new Error("MISSING");
  if (!response.ok) throw new Error("UNAVAILABLE");
  const data = await response.json();
  if (requireSuccess && !data.success) throw new Error("UNAVAILABLE");
  return data;
}

function candidateError(error) {
  return error.message === "AUTH" ? "외부접속 토큰을 입력하거나 확인해 주세요."
    : error.message === "MISSING" ? "해당 종목의 분석 데이터가 없습니다. 목록을 다시 불러와 주세요."
      : "후보를 불러오지 못했습니다. 연결과 분석 데이터 상태를 확인하고 다시 시도해 주세요.";
}

let latestCandidateData;
function renderCandidateMarket(id, items) {
  const search = (byId("candidate-search").value || "").trim().toLowerCase();
  const quality = byId("candidate-quality").value || "all";
  const industry = (byId("candidate-industry").value || "").trim().toLowerCase();
  const selectedDate = byId("candidate-analysis-date").value;
  const analyzed = latestCandidateData?.analysisDate;
  const analyzedDay = analyzed && Number.isFinite(Date.parse(analyzed)) ? new Date(Date.parse(analyzed)+9*3600000).toISOString().slice(0,10) : "";
  items = items.filter(item => `${item.companyName} ${item.ticker}`.toLowerCase().includes(search)
    && (!industry || String(item.industryCode || "").toLowerCase().includes(industry))
    && (!selectedDate || analyzedDay === selectedDate)
    && (quality === "all" || quality === "ready" && item.approved || quality === "incomplete" && !item.approved));
  items = [...items].sort((a,b) => byId("candidate-sort").value === "risk"
    ? (b.signals?.riskPenalty || 0) - (a.signals?.riskPenalty || 0)
    : byId("candidate-sort").value === "date" ? (b.priceSnapshot?.sessionDate || b.krValuationAnalysis?.asOfDate || "").localeCompare(a.priceSnapshot?.sessionDate || a.krValuationAnalysis?.asOfDate || "")
    : a.companyName.localeCompare(b.companyName, "ko"));
  const target = byId(id);
  target.replaceChildren();
  if (!items.length) {
    target.append(candidateNode("p", "표시할 분석 기록이 없습니다."));
    return;
  }
  for (const item of items) {
    const card = candidateNode("article", "", "candidate-card");
    card.append(candidateNode("h4", `${item.companyName} · ${item.ticker}`));
    card.append(candidateNode("p", item.reviewRequired?.length ? "정정 공시 검토 전 후보 선정 보류" : item.dataBlockers?.length ? "분석 데이터 부족으로 후보 선정 보류" : `분석 점수 ${item.score} / 100 · 근거 ${item.evidence?.length || 0}건`));
    const price = item.priceSnapshot;
    const observedClose=item.market === "KR" ? item.krValuationAnalysis?.evidence?.priceHistory?.sessions?.at(-1) : null;
    if(Number.isFinite(observedClose?.close))card.append(candidateNode("p",`수집 종가: ${numberFormat.format(observedClose.close)} KRW · ${observedClose.date} · 검토 중`));
    card.append(candidateNode("p", Number.isFinite(price?.close) ? `기준가격: ${price.close} ${price.currency} · ${price.sessionDate}` : "기준가격: 검증된 가격 미연결"));
    card.append(candidateNode("p", `선정/보류 사유: ${(item.selectionReasons || item.committee?.reasons || []).map(researchReasonLabel).join(" · ") || "종목 상세 근거 확인 필요"}`));
    card.append(candidateNode("p", `주요 위험: ${(item.agents?.bear?.reasons || []).map(researchReasonLabel).join(" · ") || "위험 근거 확인 필요"}`));
    card.append(candidateNode("p", `자료 시차: ${({missing:"공개 근거 시점 부족",stale:"오래된 자료"})[item.agents?.freshness?.label] || item.agents?.freshness?.label || "미제공"}`));
    const button = candidateNode("button", "근거와 위험 보기", "candidate-button");
    button.type = "button";
    button.addEventListener("click", () => loadCandidateDetail(item));
    card.append(button);
    target.append(card);
  }
}

function renderCandidateDetail(item, analysisDate) {
  candidateDetail.replaceChildren();
  candidateDetail.hidden = false;
  const title = candidateNode("h3", `${item.companyName} · ${item.ticker}`);
  title.id = "candidate-detail-title";
  title.tabIndex = -1;
  candidateDetail.append(title);
  if(item.market==='KR'&&item.krValuationAnalysis){
    const navigation=candidateNode('div',undefined,'period-controls');
    for(const [label,id] of [['TTM·회계기간','ttm-heading'],['동종기업 비교','valuation-comparison-heading'],['가격 차트','price-chart']]){const button=candidateNode('button',label);button.type='button';button.addEventListener('click',()=>{const target=byId(id);const disclosure=target?.closest('details');if(disclosure)disclosure.open=true;target?.scrollIntoView({block:'start'});});navigation.append(button);}candidateDetail.append(navigation);
  }
  candidateDetail.append(candidateNode("p", `분석 기준: ${analysisDate} · 점수 ${item.score} / 100 · ${item.approved ? "연구 후보 조건 통과" : "후보 조건 미충족"}`));
  for (const blocker of item.dataBlockers || []) candidateDetail.append(candidateNode("p", blocker === "KR_RECOMMENDATION_GATE_HELD" ? "회계기간·기업행동·비교 표본·근거 확인 조건 중 미완료 항목이 있어 추천을 보류합니다." : blocker === "APPLE_RANKING_HOLD" ? "Apple(AAPL)은 검증 기준 확정 전 추천 순위를 보류합니다." : blocker === "KR_VALUATION_REVIEW_REQUIRED" ? "한국 기업가치 자료 또는 위험 검토가 필요하여 후보 선정을 보류했습니다." : blocker === "VALUATION_DATA_MISSING" ? "가치평가에 필요한 가격·비교 데이터가 없습니다." : "후보 평가에 필요한 재무지표 검증이 부족하거나 오래되어 선정을 보류했습니다."));
  if (item.krValuationAnalysis) {
    const analysis = item.krValuationAnalysis;
    candidateDetail.append(candidateNode("h4", `한국 기업가치 분석: ${analysis.status==="INSUFFICIENT_DATA"?"자료 부족":analysis.status==="UNDER_REVIEW"?"검증 대기":"비교 조건 확인됨"}`));
    candidateDetail.append(candidateNode("p", `기준일 ${analysis.asOfDate || "미확인"} · 비교기업 ${analysis.peers.length}개 · 과거 표본 ${analysis.historical.length}개`));
    for (const [name, metric] of Object.entries(analysis.comparisons)) candidateDetail.append(candidateNode("p", `${name}: ${Number.isFinite(metric.current) ? metric.current.toFixed(2) : "자료 부족"}`));
    candidateDetail.append(candidateNode("p", `위험: ${analysis.risks.map(researchReasonLabel).join(" · ") || "확인된 항목 없음"} · 부족한 자료: ${analysis.missing.map(researchReasonLabel).join(" · ") || "없음"}`));
    const ttm=analysis.evidence?.ttm;
    if(ttm){const ttmHeading=candidateNode("h4",`TTM: ${ttm.status==="READY"?"기간 합산 확인됨":"자료 부족"}`);ttmHeading.id="ttm-heading";candidateDetail.append(ttmHeading);
      if(ttm.status==="READY"){
        candidateDetail.append(candidateNode("p",`${ttm.period.start} ~ ${ttm.period.end} · ${ttm.period.basis} · KRW · 연간 + 당기 누적 − 전년 동기간 누적`));
        for(const [key,label] of [["revenue","매출"],["operatingIncome","영업이익"],["netIncome","순이익"]])candidateDetail.append(candidateNode("p",`TTM ${label}: ${numberFormat.format(ttm.raw[key])} KRW`));
        candidateDetail.append(candidateNode("p",`단위: 원(KRW) · 출처: OpenDART 연결 공시 · 자료 이용 가능 시점: ${ttm.availableAt} · 공시 접수번호: ${ttm.receipts.join(", ")}`));
      }else candidateDetail.append(candidateNode("p","자료 부족 · 일치하는 연간·누적 공시와 공개 시점 검증이 필요합니다. 추정값을 만들지 않습니다."));
    }
    if(ttm?.status==='READY'){
      const q=ttm.quarterVerification;
      candidateDetail.append(candidateNode('p',`최근 4개 분기 연속성: ${q?.status==='READY'?'확인됨 · 누적 공시 차감 후 TTM 합계 일치':'자료 부족 · 누락된 분기 공시가 필요합니다. 기간 합산 값만 확인했습니다.'}`));
      for(const quarter of q?.quarters||[])candidateDetail.append(candidateNode('p',`${quarter.year}년 ${quarter.quarter}분기 · ${quarter.start} ~ ${quarter.end} · 매출 ${numberFormat.format(quarter.raw.revenue)} KRW · 연결 · 누적 공시 차감`));
      for(const receipt of ttm.receipts||[]){const link=candidateNode('a',`OpenDART 공시 ${receipt}`);link.href=`https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${receipt}`;link.target='_blank';link.rel='noreferrer noopener';candidateDetail.append(link);}
    }
    const observedPerformance=item.observedPerformance;
    candidateDetail.append(candidateNode('h4','종목 누적 성과 · 동일 기간 KOSPI/KOSDAQ 비교'));
    if(observedPerformance?.status==='READY'){
      const result=observedPerformance,point=result.points.at(-1);
      candidateDetail.append(renderObservedStockChart(result,item.ticker));
      candidateDetail.append(candidateNode('p',`${result.fromDate} ~ ${result.toDate} · ${result.sessionCount}거래일 · 가격 수익률(배당 제외) · 종목 누적 ${point.stockReturnPct.toFixed(2)}% · ${result.index} 대비 ${point.excessReturnPct.toFixed(2)}% · MDD ${result.portfolioMddPct.toFixed(2)}% · 연율화하지 않음`));
    }else candidateDetail.append(candidateNode('p','자료 부족 · 분할·병합·배당·증자 전체 구간의 확인 자료가 필요합니다. 원주가만 확보되어도 기업행동 검증 전에는 누적 수익률·MDD·초과수익률을 계산하지 않습니다.'));
    for(const b of observedPerformance?.benchmarks||[])candidateDetail.append(candidateNode('p',`${b.index} 동일 기간 비교: ${b.status==='READY'?`${b.fromDate} ~ ${b.toDate}`:'자료 부족 · 검증된 종목 구간 확보 후 계산'}`));
    const action=analysis.evidence?.corporateActions;
    if(action)candidateDetail.append(candidateNode("p",`기업행동: ${action.status==="VERIFIED"?"확인됨":"검증 대기"} · 가격·주식수 기준일과 분할·배당·증자 자료가 필요합니다. 해당 기간 성과는 보류합니다.`));
    const shares=analysis.evidence?.shareCount,alignment=analysis.evidence?.shareAlignment,actionEvidence=analysis.evidence?.actionEvidence;
    if(shares){
      candidateDetail.append(candidateNode('h4','발행주식수 · 가격 기준일 정합성'));
      candidateDetail.append(candidateNode('p',`주가 기준일: ${analysis.evidence?.priceHistory?.asOfDate || analysis.asOfDate || '미확인'} · 가격 유형: 원주가 · 주식수 정렬: ${alignment?.status==='VERIFIED'?'확인됨':'계산 보류'} · 보통주 가격에 우선주 수량을 합산하지 않습니다.`));
      for(const r of shares.records||[]){
        const cls=({COMMON:'보통주',PREFERRED:'우선주',TOTAL:'전체 합계'})[r.shareClass]||'종류 미확인';
        const n=x=>Number.isFinite(x)?numberFormat.format(x)+'주':'자료 부족';
        candidateDetail.append(candidateNode('p',`${cls} · 기준일 ${r.asOfDate||'미확인'} · 총발행 ${n(r.issued)} · 자기주식 ${n(r.treasury)} · 유통 ${n(r.outstanding)} · ${r.verificationStatus==='VERIFIED'?'보고서 수량 대조 확인됨':'수량 검증 대기'} · 공시 ${r.sourceDocumentId}`));
      }
      candidateDetail.append(candidateNode('p',alignment?.status==='VERIFIED'?'주식 종류·가격·주식수 기준 정렬 확인됨':'보고서 기준일 이후 주식수 변동과 권리 적용일 확인이 필요합니다. 시가총액과 평가배수 계산은 보류합니다.'));
    }
    if(actionEvidence){
      candidateDetail.append(candidateNode('h4','기업행동 원천자료 · 적용일 검증 대기'));
      candidateDetail.append(candidateNode('p',`출처: OpenDART 정기보고서 · 수집 ${actionEvidence.events?.[0]?.collectedAt||'미확인'} · 전체 구간 조사 미완료 · 공시 요약은 실제 권리 적용일을 입증하지 않습니다.`));
      const list=candidateNode('details');list.append(candidateNode('summary',`수집 근거 ${(actionEvidence.events||[]).length}건 · 배당 지표와 자기주식 집계 포함 (확정 이벤트 수가 아닙니다)`));
      for(const e of actionEvidence.events||[]){
        list.append(candidateNode('p',`${e.label} · ${e.shareClass||'주식 종류 미확인'} · 보고된 날짜 ${e.reportedDate||e.reportDate||'없음'} · 권리 적용일 ${e.effectiveDate||'미확인'} · 주주 기준일 ${e.recordDate||'미확인'} · 검증 대기`));
        const link=candidateNode('a',`원천 공시 ${e.sourceDocumentId}`);if(/^https:\/\/dart\.fss\.or\.kr\//.test(e.sourceUrl||'')){link.href=e.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';list.append(link);}
      }candidateDetail.append(list);
      candidateDetail.append(candidateNode('p','전체 기업행동 타임라인과 과거 평가배수 차트는 적용일·주식수·가격 자료 검증 후 표시합니다. EV/EBITDA는 검증된 기업가치·EBITDA 입력이 부족하여 계산하지 않습니다.'));
    }
    const review=analysis.evidence?.disclosureReview;
    if(review){
      candidateDetail.append(candidateNode('h4','공시 원문 조사 · 기업행동 검증 범위'));
      candidateDetail.append(candidateNode('p',`원문 확보 ${review.retrieved} / ${review.total}건 · 관련 기업행동 ${review.relevant}건 · 검증된 성과 구간 없음 · 전체 구간 거래소 자료 대조 필요`));
      const details=candidateNode('details');details.append(candidateNode('summary','21건 원문 분류와 근거 보기'));
      for(const r of review.documents||[]){
        details.append(candidateNode('p',`${r.date} · ${r.title} · ${r.classification==='NOT_RELEVANT'?'기업행동 비관련':r.classification==='SOURCE_UNAVAILABLE'?'원문 확보 실패':'검증 대기'} · ${r.reason}`));
        if(r.originalStatus==='ORIGINAL_RETRIEVED'&&/^https:\/\/dart\.fss\.or\.kr\/dsaf001\/main\.do\?rcpNo=\d{14}$/.test(r.sourceUrl||'')){
          const a=candidateNode('a',`확보한 공시 원문 · ${r.receipt}`);a.href=r.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';details.append(a);
        }
      }
      candidateDetail.append(details);
    }
    const rights=analysis.evidence?.rightsInvestigation;
    if(rights){
      candidateDetail.append(candidateNode('h4','거래소 권리 적용일 · 조사 범위'));
      candidateDetail.append(candidateNode('p',`배당락일: ${rights.exDateVerified?'확인됨 · '+rights.exDate:'검증 대기'} · 권리락일: 미확인 · 조회 구간 ${rights.fromDate} ~ ${rights.toDate} · KIND 공시 ${rights.listingCount}건 조회 완료 · 기업행동 전수 검증 대기`));
      candidateDetail.append(candidateNode('p','배당락 기준가격 변동 없음은 배당을 포함한 총수익률이나 수정주가 검증을 뜻하지 않습니다. 자기주식 취득 예정량을 실제 취득량으로 사용하지 않습니다.'));
      for(const row of rights.typeStatuses||[])candidateDetail.append(candidateNode('p',`${row.label}: ${row.reason}`));
      for(const event of rights.treasuryEvents||[]){
        candidateDetail.append(candidateNode('p',`${event.eventType==='TREASURY_DISPOSE'?'자기주식 처분':'자기주식 취득 계획'} · 공시일 ${event.announcementDate} · 실제 적용일 ${event.effectiveDate||'미확인'} · 실제 수량 ${Number.isFinite(event.quantity)?numberFormat.format(event.quantity)+'주':(event.executionStatus==='PLANNED'&&rights.treasuryExecutionReview?.status==='VERIFIED'?'아래 실제 체결내역 참조':'미확인')} · 예정 수량 ${Number.isFinite(event.plannedQuantity)?numberFormat.format(event.plannedQuantity)+'주':'해당 없음'} · ${event.verificationStatus==='VERIFIED'?'실행 근거 확인됨':'실행 검증 대기'}`));
      }
      const balance=rights.balanceReview;
      if(balance){
        candidateDetail.append(candidateNode('h4','자기주식 기초·기말 잔고 대사'));
        candidateDetail.append(candidateNode('p',`보통주 기초잔고 ${numberFormat.format(balance.opening.quantity)}주 · ${balance.opening.asOfDate} · ${balance.opening.source}`));
        candidateDetail.append(candidateNode('p',`공시 기말잔고 ${numberFormat.format(balance.closing.quantity)}주 · ${balance.closing.asOfDate} · ${balance.closing.source}`));
        candidateDetail.append(candidateNode('p',`확인된 실제 처분 ${numberFormat.format(balance.historical.totals.disposal)}주 · 대사 차이 ${numberFormat.format(balance.historical.difference)}주 · 산술 일치 · 해당 구간 모든 변동 검증은 대기`));
        candidateDetail.append(candidateNode('p',`${balance.current.asOfDate} 기말잔고: 미확인 · 실제 소각·기타 변동 및 동일 기준일 잔고가 필요합니다. 취득 합계를 더해 현재 잔고를 확정하지 않습니다.`));
        if(balance.current.reconciliationStatus)candidateDetail.append(candidateNode('p',`8월 21일 이후 잔고 대사: ${balance.current.reconciliationStatus==='PENDING_CORRECTION'?'정정 원문 확인 대기':'자료 부족'} · ${balance.current.reconciliationStatus} · 공시 접수일과 잔고 기준일은 별도로 확인합니다.`));
        const official=balance.officialPeriods;
        if(official){
          candidateDetail.append(candidateNode('h4','공식 잔고 기준일 · 검증 구간'));
          const latest=official.latestOfficial;
          candidateDetail.append(candidateNode('p',latest?`확인된 최신 공식 기준일 ${latest.balanceAsOfDate} · 보통주 ${numberFormat.format(latest.quantity)}주 · 공시일 ${latest.disclosureDate||'미확인'}`:'공식 기준일: 검증 대기'));
          candidateDetail.append(candidateNode('p',`${official.requestedSource.requestedDate} 자료 확인: ${official.requestedSource.status==='SOURCE_CONFIRMED'?'확인됨':'원천 미확인 · SOURCE_NOT_CONFIRMED'} · 조회 미확보는 자료가 존재하지 않는다는 뜻이 아닙니다. 다음 공식 잔고 기준일을 확보하면 후속 대사합니다.`));
          for(const interval of official.intervals)candidateDetail.append(candidateNode('p',`공식 잔고 구간 ${interval.opening.asOfDate} ~ ${interval.closing.asOfDate} · ${interval.result.equationStatus==='MATCH'?'산술 일치':'검증 대기'} · ${interval.result.reconciliationStatus} · 기업행동 전체 범위 검증 필요`));
          if(latest?.crossCheck){const link=candidateNode('a','삼성전자 공식 IR · 잔고 기준일 교차 확인');link.href=latest.crossCheck.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';candidateDetail.append(link);}
        }
        for(const point of [balance.opening,balance.closing])if(/^https:\/\//.test(point.sourceUrl||'')){const link=candidateNode('a',`${point.asOfDate} 잔고 원천 공시`);link.href=point.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';candidateDetail.append(link);}
      }
      const continuity=rights.continuityInvestigation;
      if(continuity){candidateDetail.append(candidateNode('p',`후속 공식 잔고 조사 ${continuity.fromDate} ~ ${continuity.toDate} · 삼성전자 IR 공시 ${continuity.items.length}건 목록 확인 · 다음 공식 잔고 ${continuity.balanceSourceStatus} · 공시일을 잔고 기준일로 대체하지 않습니다.`));}
      const ranges=analysis.evidence?.actionCoverageRanges;
      if(ranges){
        candidateDetail.append(candidateNode('h4','기업행동 검증 구간 · 성과 선행조건'));
        candidateDetail.append(candidateNode('p',`${ranges.fromDate} ~ ${ranges.toDate} · 원주가 계약 ${ranges.priceContractVerified?'확인됨':'검증 대기'} · 검증된 기업행동 구간 후보 ${ranges.performanceCandidates.length}개 · 전체 누적 성과 보류`));
        for(const window of ranges.windows)candidateDetail.append(candidateNode('p',`${window.fromDate} ~ ${window.toDate} · ${window.status==='VERIFIED'?'확인됨':'검증 대기'} · 미확인 유형 ${window.missingTypes.map(x=>x==='PAR_VALUE_CHANGE'?'액면변경':x).join(', ')||'없음'} · 전체 변동을 확인할 원문과 정정 관계가 필요합니다.`));
        candidateDetail.append(candidateNode('p','21건 공시에서 결의가 발견되지 않았다는 결과는 기업행동이 없다는 증명이 아닙니다. 잔고·주식수와 기업행동을 모두 검증한 뒤 종목 성과와 같은 기간 지수 비교를 연결합니다.'));
      }
      const execution=rights.treasuryExecutionReview;
      if(execution){
        candidateDetail.append(candidateNode('h4','자기주식 실제 체결 · 주식수 정합성'));
        candidateDetail.append(candidateNode('p',`예정 취득 ${numberFormat.format(execution.planQuantity)}주 · 실제 취득 ${numberFormat.format(execution.actualQuantity)}주 · ${execution.actualFromDate} ~ ${execution.actualToDate} · ${execution.events.length}거래일 체결 · KIND 신고 누계 대조 확인됨`));
        candidateDetail.append(candidateNode('p',`가격 관측기간 내 실제 취득 ${numberFormat.format(execution.observedQuantity)}주 · 실제 소각 수량 미확인 · 현재 주식수 계산 보류 · 보고서 이후 모든 주식수 변동 검증이 필요합니다.`));
        candidateDetail.append(candidateNode('p','신청수량과 실제 체결수량은 다릅니다. 자기주식 취득·처분은 발행주식수 자체를 바꾸지 않습니다. 체결자료의 과거 공개 시각은 확인되지 않아 과거 평가에 소급 사용하지 않습니다.'));
        const timeline=candidateNode('details');timeline.append(candidateNode('summary','기업행동 타임라인 · 일별 실제 취득 보기'));
        for(const e of execution.events)timeline.append(candidateNode('p',`${e.effectiveDate} · 보통주 실제 취득 ${numberFormat.format(e.quantity)}주 · 신청 ${numberFormat.format(e.requestedQuantity)}주 · 출처 KRX KIND · 확인 ${e.collectedAt.slice(0,10)}`));
        candidateDetail.append(timeline);
        const link=candidateNode('a','KRX KIND 자기주식 체결내역');link.href='https://kind.krx.co.kr/corpgeneral/treasurystk.do?method=loadInitPage';link.target='_blank';link.rel='noopener noreferrer';candidateDetail.append(link);
        candidateDetail.append(candidateNode('p',`기업행동 유형별 전수 검증 ${rights.coverageAudit?.filter(x=>x.verificationStatus==='VERIFIED').length||0} / ${rights.coverageAudit?.length||11} · 확인된 개별 체결과 전체 기간 검증은 별도로 판단합니다. 성과 계산 가능 구간 없음 · KOSPI/KOSDAQ 종목 비교 보류`));
      }
      for(const ref of rights.references||[]){if(/^https:\/\/kind\.krx\.co\.kr\/external\//.test(ref.sourceUrl||'')){const a=candidateNode('a',`${ref.label} · KRX KIND 원문`);a.href=ref.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';candidateDetail.append(a);}}
    }
    const entitlementEvents=analysis.evidence?.entitlementEvents;
    if(entitlementEvents?.length){
      candidateDetail.append(candidateNode('h4','권리 적용일 검증 · 공식 공시'));
      for(const e of entitlementEvents){
        candidateDetail.append(candidateNode('p',`현금배당 · ${e.shareClass==='COMMON'?'보통주':'우선주'} · 공시일 ${e.announcementDate||'미확인'} · 기준일 ${e.recordDate||'미확인'} · 배당락일 ${e.exDate||'미확인'} · 지급 예정일 ${e.paymentDate||'미확인'} · 주당 ${Number.isFinite(e.cashPerShare)?numberFormat.format(e.cashPerShare):'미확인'} ${e.currency||''} · ${e.verificationStatus==='VERIFIED'?'이벤트 조건 확인됨':'권리 적용일 검증 대기'}`));
        candidateDetail.append(candidateNode('p','기준일·배당락일·지급일은 서로 다른 날짜입니다. 예정 지급일은 지급 완료 확인을 의미하지 않습니다. 배당락일과 전 구간 기업행동 검증 전에는 총수익을 계산하지 않습니다.'));
        if(e.exDateVerified===true)candidateDetail.append(candidateNode('p','배당락일은 거래소 원문으로 확인됨 · 배당금·지급일 및 전체 기업행동 검증 대기'));
        const a=candidateNode('a','삼성전자 공식 IR 공시');if(/^https:\/\/www\.samsung\.com\//.test(e.sourceUrl||'')){a.href=e.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';candidateDetail.append(a);}
      }
    }
    const observed=analysis.evidence?.priceHistory?.sessions;
    if(observed?.length){candidateDetail.append(candidateNode('p',`가격 관측 구간: ${observed[0].date} ~ ${observed.at(-1).date} · 시작 ${numberFormat.format(observed[0].close)} KRW · 종료 ${numberFormat.format(observed.at(-1).close)} KRW · 원주가 · 검증된 성과 구간: ${item.observedPerformance?.status==='READY'?'동일 기간 비교 결과 참조':'없음 · 기업행동 조사 범위와 권리 적용일 자료 부족'}`));}
    const f=analysis.evidence?.financial;
    if(f){
      candidateDetail.append(candidateNode("h4","한국 연간 연결재무 · 수집 자료"));
      candidateDetail.append(candidateNode("p",`${f.source} · 공시일 ${f.asOfDate || "미확인"} · 품질 ${f.qualityStatus} · 회계기간 ${f.fiscalPeriod?.start || "미확인"} ~ ${f.fiscalPeriod?.end || "미확인"} · ${f.fiscalPeriod?.basis || "미확인"} · ${f.amountKind || "기준 미확인"}`));
      for(const [key,label] of [["revenue","매출액"],["operatingIncome","영업이익"],["netIncome","순이익"],["assets","자산"],["liabilities","부채"],["equity","자본"]])candidateDetail.append(candidateNode("p",`${label}: ${Number.isFinite(f.raw?.[key]) ? numberFormat.format(f.raw[key])+" KRW" : "자료 없음"}`));
    }
    candidateDetail.append(candidateNode("p", "비교 분석은 기존 후보 점수에 반영하지 않습니다. 위험 검토와 실제 자료 검증이 필요합니다."));
  }
  const financial = item.financialSnapshot;
  if (item.priceSnapshot) {
    const price = item.priceSnapshot;
    candidateDetail.append(candidateNode("h4", "미국 주식 일별 종가"));
    candidateDetail.append(candidateNode("p", `${price.sessionDate} 종가: ${moneyFormat.format(price.close)} · ${price.status === "STALE" ? "오래된 가격" : "D-2 이전 가격"}`));
    candidateDetail.append(candidateNode("p", "분할·배당 미조정 종가입니다. 실시간 가격이 아닙니다."));
    if (item.corporateActionSnapshot) candidateDetail.append(candidateNode("p", item.corporateActionSnapshot.status === "READY" ? "연간 EPS 기준일부터 가격 기준일까지 주식 분할 이력 없음(제공자 조회 기준)." : "주식 분할 또는 기준일 확인이 필요하여 EPS 배수를 보류합니다."));
    if (Number.isFinite(item.valuationSnapshot?.annualEarningsYieldPct)) candidateDetail.append(candidateNode("p", `연간 이익/가격 비율: ${item.valuationSnapshot.annualEarningsYieldPct.toFixed(2)}% · 배당률 또는 예상 수익률이 아닙니다.`));
    if (Number.isFinite(item.valuationSnapshot?.annualPe)) candidateDetail.append(candidateNode("p", `연간 EPS 기준 단순 배수: ${item.valuationSnapshot.annualPe.toFixed(2)}배 · TTM이 아닌 연간 실적 참고치`));
  }
  const comparison = item.valuationComparisonSnapshot;
  if (comparison) {
    candidateDetail.append(candidateNode("h4", "연간 EPS 배수 비교 · 참고 자료"));
    candidateDetail.append(candidateNode("p", `과거 표본 ${comparison.history.count}개 · 동종기업 ${comparison.peers.count}개`));
    const missingLabels = { currentAnnualPe: "현재 연간 EPS 배수", historicalAnnualPeSamples: "3개 연도 이상의 과거 표본", sameSectorAnnualPePeers: "동일 업종·가격 기준일의 비교기업 3개 이상" };
    for (const key of comparison.missing || []) candidateDetail.append(candidateNode("p", `부족한 자료: ${missingLabels[key] || key}`));
    for (const [key, label] of [["history", "과거"], ["peers", "동종기업"]]) {
      if (Number.isFinite(comparison[key].medianPe)) candidateDetail.append(candidateNode("p", `${label} 중앙값: ${comparison[key].medianPe.toFixed(2)}배`));
    }
    candidateDetail.append(candidateNode("p", "입력 자료의 출처는 독립적으로 검증되지 않았으며 추천 점수에 반영하지 않습니다."));
  }
  const krHistory=item.krValuationAnalysis?.evidence?.priceHistory;
  if(item.market==="KR" && krHistory?.sessions?.length){const last=krHistory.sessions.at(-1);candidateDetail.append(candidateNode("p",`수집 종가: ${numberFormat.format(last.close)} KRW · ${last.date} · 기업행동/가치평가 검토 중`));}
  renderValuationTables(item);
  renderPriceChart(item);
    if(item.recommendationGate){
      candidateDetail.append(candidateNode("h4","추천 검증 조건"));
      const labels={accountingPeriod:"회계기간·TTM",corporateActions:"기업행동·가격/주식수",peerSamples:"과거/비교기업 각 3개 이상",freshness:"가격 최신성",evidenceTraceable:"분석 근거 추적",riskEngine:"Risk Engine",retrospectiveStructure:"1/5/20거래일 사후 검증 구조"};
      for(const [key,value] of Object.entries(item.recommendationGate.checks))candidateDetail.append(candidateNode("p",`${labels[key]||key}: ${value?"조건 확인":"보류·검증 필요"}`));
    }

  if (financial?.raw) {
    candidateDetail.append(candidateNode("h4", "SEC 연간 재무 · 최근 12개월 수치와 다를 수 있음"));
    candidateDetail.append(candidateNode("p", `회계기간: ${financial.periodStart || "미제공"} ~ ${financial.periodEnd || "미제공"} · 제출일: ${financial.filed || "미제공"}`));
    const labels = { revenue: "매출", netIncome: "순이익", operatingCashFlow: "영업현금흐름", capex: "설비 투자", freeCashFlow: "잉여현금흐름", assets: "자산", liabilities: "총부채", equity: "자본" };
    for (const [key, label] of Object.entries(labels)) candidateDetail.append(candidateNode("p", `${label}: ${Number.isFinite(financial.raw[key]) ? moneyFormat.format(financial.raw[key]) : "미제공"}`));
    candidateDetail.append(candidateNode("p", "재무 점수는 규칙 기반 참고치입니다. 자사주 매입으로 자본이 줄면 ROE가 높게 나타날 수 있습니다."));
  }
  for (const review of item.reviewRequired || []) {
    candidateDetail.append(candidateNode("p", `${review.reason === "SEC_13F_AMENDMENT" ? "버크셔 13F" : "Form 4"} 정정 공시 발견 · ${review.accessionNumber} · 검토 전 후보 선정 보류`));
    try {
      const url = new URL(review.sourceUrl);
      if (url.protocol === "https:" && url.hostname === "www.sec.gov" && !url.username && !url.password) {
        const link = candidateNode("a", "정정 공시 원문 확인 ↗");
        link.href = url.href; link.target = "_blank"; link.rel = "noreferrer noopener";
        candidateDetail.append(link);
      }
    } catch { /* The review reason remains visible without a usable link. */ }
  }
  candidateDetail.append(candidateNode("h4", "위험과 반대 논거"));
  const reasons = {
    valuation_risk: "가치평가 위험", weak_capital_action: "자금 행동 근거 부족",
    stale_evidence: "오래된 근거", low_consensus: "신호 간 합의 부족",
    evidence_gate_failed: "근거 검증 미통과", bear_case_severe: "반대 논거 위험이 큼", risk_cap_reached: "위험 한도 도달",
  };
  candidateDetail.append(candidateNode("p", `위험 수준 ${item.agents?.risk?.severity ?? "미제공"} / 100`));
  const bear = item.agents?.bear?.reasons || [];
  candidateDetail.append(candidateNode("p", bear.length ? bear.map(x => reasons[x] || x).join(" · ") : "규칙 기반 반대 신호가 감지되지 않았습니다. 위험이 없다는 뜻은 아닙니다."));
  const committee = item.committee?.reasons || [];
  if (committee.length) candidateDetail.append(candidateNode("p", committee.map(x => reasons[x] || x).join(" · ")));
  candidateDetail.append(candidateNode("h4", "공개 근거 · 사실과 해석"));
  const list = document.createElement("ul");
  for (const evidence of item.evidence || []) {
    const row = document.createElement("li");
    row.append(candidateNode("p", `출처: ${evidence.sourceName || evidence.sourceType} · 공개 관측일: ${evidence.observedAt}`));
    if (evidence.periodEnd) row.append(candidateNode("p", `분기 보유 기준일: ${evidence.periodEnd} · 실제 거래일: 미확인`));
    if (evidence.transactionAt) row.append(candidateNode("p", `신고 거래일: ${evidence.transactionAt}${evidence.planned10b51 ? " · 10b5-1 계획 거래" : ""}`));
    row.append(candidateNode("p", `사실: ${evidence.factSummary || "요약 미제공"}`));
    row.append(candidateNode("p", `해석: ${evidence.inferenceSummary || "해석 미제공"}`));
    try {
      const url = new URL(evidence.sourceUrl);
      if (["https:", "http:"].includes(url.protocol) && !url.username && !url.password) {
        const link = candidateNode("a", "원문 확인 ↗");
        link.href = url.href;
        link.target = "_blank";
        link.rel = "noreferrer noopener";
        row.append(link);
      }
    } catch { /* Source names remain visible when no usable URL exists. */ }
    list.append(row);
  }
  candidateDetail.append(list);
  organizeStockDetail(item);
  title.focus();
}

function organizeStockDetail(item) {
  // Keep the existing rendering and provenance intact; structure its actual nodes.
  if (!candidateDetail.querySelectorAll || !candidateDetail.insertBefore) return;
  const history=item.krValuationAnalysis?.evidence?.priceHistory;
  const last=history?.sessions?.at(-1);
  const overview=candidateNode('div',undefined,'stock-overview');
  const values=[['현재 수집 종가',last?`${numberFormat.format(last.close)} KRW`:'자료 확인 중',last?`${last.date} · 원주가 · 기업행동 검증 대기`:'가격 기준일 미확인'],['추천 상태','추천 보류','필수 검증 완료 전에는 추천하지 않습니다.'],['종목 성과',item.observedPerformance?.status==='READY'?'관측 구간 확인됨':'연구 보류','기업행동·동일 기간 가격 검증 기준']];
  for(const [label,value,note] of values){const card=candidateNode('div',undefined,'stock-overview-card');card.append(candidateNode('span',label),candidateNode('strong',value),candidateNode('p',note));overview.append(card);}
  candidateDetail.insertBefore(overview,candidateDetail.children[1]||null);
  let section=null;
  for(const node of Array.from(candidateDetail.children)){
    if(node.tagName==='H4'){
      const primary=/한국 기업가치|TTM:|동종기업.*비교|위험과 반대/.test(node.textContent);
      section=candidateNode(primary?'section':'details',undefined,'stock-detail-section');
      candidateDetail.insertBefore(section,node);
      if(primary)section.append(node);else {const summary=candidateNode('summary',node.textContent);section.dataset.evidenceKey=`stock:${node.textContent}`;node.classList.add('sr-only');section.append(summary,node);}
    }else if(section && node!==section)section.append(node);
  }
}

async function loadCandidateDetail(item) {
  const version = ++candidateVersion;
  rememberCandidateView();
  const key=candidateKey(item),same=displayedCandidateKey===key&&!candidateDetail.hidden;
  selectedCandidateItem={ticker:item.ticker,market:item.market};
  if(!same)candidateDetail.hidden=true;
  candidateDetail.setAttribute('aria-busy','true');
  byId('candidate-detail-refresh').disabled=true;
  detailStatus(same?'다시 확인 중 · 아래는 이전 조회 결과입니다.':'종목 근거와 위험을 확인하고 있습니다.');
  candidateStatus("종목 근거와 위험을 확인하고 있습니다.");
  const originalScroll=candidateViews.get(key)?.scroll;
  if(same&&originalScroll!=null&&typeof window!=='undefined')window.scrollTo(0,originalScroll);
  try {
    const data = await candidateRequest(`/api/v2/candidates/${encodeURIComponent(item.ticker)}?market=${encodeURIComponent(item.market)}`);
    if (version !== candidateVersion) return;
    if(item.market==='KR'){
      try{data.candidate.observedPerformance=await candidateRequest(`/api/v2/stock-performance/${encodeURIComponent(item.ticker)}`);}catch{data.candidate.observedPerformance={status:'PENDING',reason:'PERFORMANCE_UNAVAILABLE'};}
      if(version!==candidateVersion)return;
    }
    renderCandidateDetail(data.candidate, data.analysisDate);
    displayedCandidateKey=key;
    const saved=candidateViews.get(key);if(saved)restorePeerView(candidateDetail,saved.view);
    detailStatus(data.status==='STALE'?'오래된 보고서 · 최신 분석 확인이 필요합니다.':'연결됨 · 저장된 종목 근거를 다시 확인했습니다.',data.status==='STALE'?'warning':'success');
    if(typeof window!=='undefined'){window.location.hash='candidate-detail';applyResearchScreen();byId('candidate-detail-title')?.focus({preventScroll:true});if(same&&saved?.scroll!=null)window.scrollTo(0,saved.scroll);}
    candidateStatus(data.status === "STALE" ? "오래된 보고서입니다. 후보 선정은 보류되며 아래 내용은 과거 분석입니다." : "종목별 공개 근거와 위험을 확인했습니다.", data.status === "STALE" ? "warning" : "success");
  } catch (error) {
    if (version === candidateVersion){
      candidateStatus(candidateError(error), "error");
      if(error.message==='AUTH'){candidateDetail.replaceChildren();candidateDetail.hidden=true;displayedCandidateKey=null;candidateViews.clear();candidatePricePeriods.clear();renderPriceChart({ticker:item.ticker});}
      detailStatus(error.message==='AUTH'?'인증 확인이 필요합니다. 연결 설정을 확인해 주세요.':same?'연결 실패 · 이전 조회 결과입니다. 다시 확인해 주세요.':'자료를 불러오지 못했습니다. 다시 확인해 주세요.','error');
      if(same&&error.message!=='AUTH'&&originalScroll!=null&&typeof window!=='undefined')window.scrollTo(0,originalScroll);
    }
  }finally{if(version===candidateVersion){candidateDetail.setAttribute('aria-busy','false');byId('candidate-detail-refresh').disabled=false;}}
}

async function loadCandidates() {
  const version = ++candidateVersion;
  candidateButton.disabled = true;
  rememberCandidateView();displayedCandidateKey=null;selectedCandidateItem=null;byId('candidate-detail-refresh').disabled=true;
  candidateDetail.hidden = true;
  candidateDetail.replaceChildren();
  byId("candidate-kr").replaceChildren();
  byId("candidate-global").replaceChildren();
  byId("candidate-review").replaceChildren();
  byId("candidate-incomplete").replaceChildren();
  byId("candidate-date").textContent = "";
  candidateStatus("분석 후보를 확인하고 있습니다.");
  try {
    const data = await candidateRequest("/api/v2/candidates");
    if (version !== candidateVersion) return;
    latestCandidateData = data;
    updateDashboard(data);
    renderCandidateMarket("candidate-kr", data.KR);
    renderCandidateMarket("candidate-global", data.GLOBAL);
    renderCandidateMarket("candidate-review", data.reviewCandidates || []);
    renderCandidateMarket("candidate-incomplete", data.incompleteCandidates || []);
    byId("candidate-date").textContent = data.analysisDate ? `분석 기준: ${data.analysisDate}` : "";
    if (data.deliveryMode === "BATCH_REPORT") byId("candidate-date").textContent += ` · 배치 보고서 생성: ${data.generatedAt || "미제공"}`;
    if (data.form4Collection) byId("candidate-date").textContent += ` · Form 4: ${data.form4Collection.windowStart} 이후 제출 구간 확인 · 추가 이력 파일 ${data.form4Collection.historyFilesRead ?? 0}개 (전체 거래 이력 아님)`;
    candidateStatus(data.status === "NO_DATA" ? "아직 준비된 분석 데이터가 없습니다."
      : data.status === "REVIEW_REQUIRED" ? "정정 공시 검토가 필요한 종목은 후보에서 제외했습니다. 아래 검토 목록에서 원문을 확인하세요."
        : data.status === "DATA_INCOMPLETE" ? "재무 또는 가치평가 데이터가 부족한 종목은 후보에서 제외했습니다. 분석 데이터 확인 필요 목록을 살펴보세요."
        : data.status === "STALE" ? "보고서가 오래되어 후보 선정을 보류했습니다. 새 수집 보고서가 필요합니다."
        : `${data.evaluatedCount}개 종목을 평가했습니다. 자료 시차와 원문을 함께 확인하세요.`, ["REVIEW_REQUIRED", "DATA_INCOMPLETE", "STALE"].includes(data.status) ? "warning" : data.status === "NO_DATA" ? "" : "success");
  } catch (error) {
    if (version === candidateVersion) {
      candidateStatus(candidateError(error), "error");
      byId("dashboard-message").textContent = "분석 상태 조회 실패 · 표시된 이전 기록이 있다면 해당 기준일을 확인하세요.";
    }
  } finally {
    candidateButton.disabled = false;
  }
}

candidateButton.addEventListener("click", loadCandidates);

const performanceButton = byId("performance-load");
const performanceMessage = byId("performance-message");
const performanceList = byId("performance-list");
const performanceDetail = byId("performance-detail");
let performanceVersion = 0;
function performanceStatus(text, kind = "") {
  performanceMessage.textContent = text;
  performanceMessage.className = `message ${kind}`;
}
function performanceError(error) {
  return error.message === "AUTH" ? "외부접속 토큰을 입력하거나 확인해 주세요."
    : error.message === "MISSING" ? "성과 보고서가 없습니다. 목록을 다시 불러와 주세요."
      : "성과 보고서를 불러오지 못했습니다. 연결과 저장된 보고서를 확인하고 다시 시도해 주세요.";
}
function performanceDate(value) {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? dateFormat.format(parsed) : "기준일 미확인";
}
async function loadPerformanceReports() {
  const version = ++performanceVersion;
  performanceButton.disabled = true;
  performanceList.replaceChildren(candidateNode("p","보고서를 불러오는 중입니다.","loading-skeleton"));
  performanceDetail.replaceChildren();
  performanceDetail.hidden = true;
  performanceStatus("성과 보고서를 확인하고 있습니다.");
  try {
    const data = await candidateRequest("/api/v2/performance");
    if (version !== performanceVersion) return;
    if (!Array.isArray(data.reports)) throw new Error("UNAVAILABLE");
    performanceList.replaceChildren();
    for (const report of data.reports) {
      if (!/^[a-f0-9]{64}$/.test(report.id || "")) throw new Error("UNAVAILABLE");
      const card = candidateNode("article", undefined, "candidate-card");
      card.append(candidateNode("h3", `성과 기준: ${performanceDate(report.analysisDate)}`));
      card.append(candidateNode("p", `후보 분석일: ${performanceDate(report.snapshotAnalysisDate)}`));
      card.append(candidateNode("p", report.status === "READY" ? "기간별 계산 완료" : "PENDING · 자료 또는 기간 확인 필요"));
      card.append(candidateNode("p", `기록 ${report.evaluatedCount}개 · 전체 기간 계산 완료 ${report.readyCount}개`));
      const button = candidateNode("button", "기간별 성과 보기", "candidate-button");
      button.type = "button";
      button.addEventListener("click", () => loadPerformanceDetail(report.id));
      card.append(button);
      performanceList.append(card);
    }
    performanceStatus(data.reports.length ? "저장된 성과 보고서를 확인했습니다." : "저장된 성과 보고서가 없습니다.");
  } catch (error) {
    if (version === performanceVersion) {
      performanceList.replaceChildren();
      performanceStatus(performanceError(error), "error");
    }
  } finally { performanceButton.disabled = false; }
}
async function loadPerformanceDetail(id) {
  const version = ++performanceVersion;
  performanceDetail.replaceChildren();
  performanceDetail.hidden = true;
  performanceStatus("기간별 성과를 확인하고 있습니다.");
  try {
    if (!/^[a-f0-9]{64}$/.test(id || "")) throw new Error("UNAVAILABLE");
    const data = await candidateRequest(`/api/v2/performance/${id}`);
    if (version !== performanceVersion) return;
    const report = data.report;
    if (!report || !Array.isArray(report.results)) throw new Error("UNAVAILABLE");
    const title = candidateNode("h3", `성과 기준: ${performanceDate(report.analysisDate)}`);
    title.id = "performance-detail-title"; title.tabIndex = -1;
    performanceDetail.append(title);
    performanceDetail.append(candidateNode("p", `원본 후보 분석일: ${performanceDate(report.snapshotAnalysisDate)}`));
    for (const row of report.results) {
      const card = candidateNode("article", undefined, "candidate-card");
      card.append(candidateNode("h4", `${row.market} · ${row.ticker}`));
      if (!row.approvedAtSnapshot) card.append(candidateNode("p", "당시 후보 승인 보류 · 추천 성과 집계 대상이 아닙니다."));
      for (const days of [1, 5, 20]) {
        const h = row.performance?.horizons?.[days];
        const ready = row.approvedAtSnapshot && h?.status === "READY"
          && [h.stockReturnPct, h.benchmarkReturnPct, h.excessReturnPct].every(Number.isFinite);
        card.append(candidateNode("p", ready
          ? `${days}거래일: 종목 ${h.stockReturnPct.toFixed(2)}% · 벤치마크 ${h.benchmarkReturnPct.toFixed(2)}% · 차이 ${h.excessReturnPct.toFixed(2)}%p (${h.fromDate} ~ ${h.toDate})`
          : `${days}거래일: PENDING · 자료 또는 기간 확인 필요`));
      }
      card.append(renderCumulativeChart(row));
      performanceDetail.append(card);
    }
    performanceDetail.append(candidateNode("p", "입력 가격의 조정·출처 확인이 필요합니다. 참고 계산 결과는 실제 매매 성과를 의미하지 않습니다."));
    performanceDetail.hidden = false;
    performanceStatus("기간별 기록을 확인했습니다.");
    title.focus();
  } catch (error) {
    if (version === performanceVersion) {
      performanceDetail.replaceChildren();
      performanceDetail.hidden = true;
      performanceStatus(performanceError(error), "error");
    }
  }
}
performanceButton.addEventListener("click", loadPerformanceReports);

function updateDashboard(data) {
  byId("dashboard-count").textContent = Number.isFinite(data.evaluatedCount) ? `${data.evaluatedCount}개` : "미확인";
  byId("dashboard-approved").textContent = `${(data.KR?.length || 0) + (data.GLOBAL?.length || 0)}개 조건 통과`;
  byId("dashboard-date").textContent = data.analysisDate ? `분석 기준: ${performanceDate(data.analysisDate)}` : "분석 기록 없음";
  byId("dashboard-risk").textContent = `검토 필요 ${data.reviewCandidates?.length || 0}개 · 자료 부족 ${data.incompleteCandidates?.length || 0}개`;
  byId("dashboard-collection").textContent = data.generatedAt ? `보고서 생성: ${performanceDate(data.generatedAt)} · 실제 수집 성공 시각과 다를 수 있음` : "최근 정상 수집 시각: 확인 전";
  updatePaperOptions(data);
  byId("dashboard-message").textContent = data.status === "STALE" ? "오래된 분석 기록입니다. 새로운 데이터 수집이 필요합니다."
    : data.status === "NO_DATA" ? "아직 저장된 분석 데이터가 없습니다." : "저장된 분석 상태입니다. 조건 통과는 투자 권유가 아닙니다.";
}
async function refreshDashboard() {
  const button = byId("dashboard-refresh"); button.disabled = true;
  byId("dashboard-message").textContent = "저장된 분석 상태를 확인하고 있습니다.";
  try { await loadCandidates(); await loadBenchmarks(); }
  finally { button.disabled = false; }
}
byId("dashboard-refresh").addEventListener("click", refreshDashboard);
function applyCandidateFilters() {
  if (!latestCandidateData) return;
  for (const [id, rows] of [["candidate-kr",latestCandidateData.KR],["candidate-global",latestCandidateData.GLOBAL],
    ["candidate-review",latestCandidateData.reviewCandidates],["candidate-incomplete",latestCandidateData.incompleteCandidates]]) renderCandidateMarket(id,rows || []);
}
for (const id of ["candidate-search","candidate-quality","candidate-sort","candidate-industry","candidate-analysis-date"]) byId(id).addEventListener("input", applyCandidateFilters);
byId("theme-select").addEventListener("change", () => {
  const choice = byId("theme-select").value;
  if (choice === "light" || choice === "dark") document.documentElement.setAttribute("data-theme", choice);
  else document.documentElement.removeAttribute("data-theme");
});
function renderValuationTables(item) {
  const analysis = item.krValuationAnalysis;
  if (!analysis) return;
  const number = x => Number.isFinite(x) ? x.toFixed(2) : "자료 부족";
  const table = (captionText, headers, rows, destination=candidateDetail) => {
    const wrapper = candidateNode("div", undefined, "comparison-table");
    wrapper.tabIndex=0;wrapper.setAttribute("role","region");wrapper.setAttribute("aria-label",`${captionText} · 가로 스크롤 비교표`);
    const element = document.createElement("table");
    element.append(candidateNode("caption",captionText));
    const head = document.createElement("thead"), header = document.createElement("tr");
    for (const label of headers) { const th = candidateNode("th",label); th.scope = "col"; header.append(th); }
    head.append(header); element.append(head);
    const body = document.createElement("tbody");
    for (const values of rows) { const row = document.createElement("tr"); for (const value of values) row.append(candidateNode("td",String(value))); body.append(row); }
    element.append(body); wrapper.append(element); destination.append(wrapper);
  };
  const comparisonHeading=candidateNode("h4","동종기업 비교 · 유효 표본과 제외 사유");comparisonHeading.id="valuation-comparison-heading";candidateDetail.append(comparisonHeading);
  candidateDetail.append(candidateNode("p","비교표는 가로로 스크롤하면 모든 지표를 볼 수 있습니다. 유효 표본은 지표마다 3개 이상이 필요하며, 비교값이 있어도 추천 승인을 뜻하지 않습니다."));
  const diagnosis=analysis.evidence?.peerMetricDiagnosis;
  if(diagnosis){
    candidateDetail.append(candidateNode('h4','배수별 독립 검증 · 기업별 원인 진단'));
    if(diagnosis.valuationDate)candidateDetail.append(candidateNode('p',`평가 기준일 ${diagnosis.valuationDate} · 공식 응답 거래일과 종가 확인 · 가격 관측과 전체 자본 검증은 별도 상태입니다.`));
    candidateDetail.append(candidateNode('p',`후보 ${diagnosis.candidateCount}개 · 최소 유효 표본 ${diagnosis.minimum}개 유지 · 현재 기업가치와 과거 성과의 검증 목적을 구분합니다. 현재 주식수·자본 변동 근거가 없으면 배수도 보류합니다.`));
    table('배수별 유효 표본',[ '배수','유효 기업 수','최소 기준','중앙값(배)','삼성전자 현재(배)','상태'],Object.entries(diagnosis.metricCounts).map(([metric,count])=>{const x=diagnosis.metricComparisons?.[metric];return [metric==='EV_EBITDA'?'EV/EBITDA':metric,count,diagnosis.minimum,number(x?.median),number(x?.current),'추천 보류'];}));
    const labels={FINANCIAL_PERIOD_MISMATCH:'같은 회계기간·실적 정의 확인 필요',MISSING_FINANCIAL_DATA:'배수 분모 재무자료 부족',MISSING_MARKET_CAP:'시가총액 자료 없음',MISSING_SHARE_COUNT:'발행·자기주식 자료 부족',CURRENCY_MISMATCH:'동일 통화 비교 조건 미충족',BUSINESS_MODEL_MISMATCH:'공식 업종 분류 차이',BUSINESS_SOURCE_UNVERIFIED:'평가 기준일에 공개된 공식 사업 근거 확인 필요',BUSINESS_COMPARABILITY_UNVERIFIED:'연결 사업 전체 비교 적합성 미검증',CORPORATE_ACTION_UNVERIFIED:'현재 자본에 영향을 준 기업행동 미검증',INVALID_VALUATION_DENOMINATOR:'분모가 0 또는 음수',STALE_DATA:'자료 최신성 조건 미충족',SOURCE_CONFLICT:'같은 기준의 원천자료 상충',PRICE_DATE_UNVERIFIED:'가격 기준일 미확인',FINANCIAL_PUBLICATION_UNVERIFIED:'재무 공시 이용 가능 시점 미확인',CORRECTION_REVIEW_REQUIRED:'정정 내용과 최종 원문 확인 필요',AMOUNT_UNIT_MISMATCH:'금액 단위 불일치',SHARE_COUNT_DATE_OR_PUBLICATION_UNVERIFIED:'보고서 주식수는 있으나 현재 기준일·공개 근거 미검증',CURRENT_CAPITAL_SOURCE_UNVERIFIED:'현재 시가총액·주식수 정의와 기준일 미검증',VERIFIED_EV_INPUTS_REQUIRED:'부채·현금 등을 포함한 기업가치 근거 부족',VERIFIED_EBITDA_INPUTS_REQUIRED:'같은 기간 EBITDA 근거 부족',EXTREME_MULTIPLE_REVIEW:'극단 배수 검토 필요',DUPLICATE_OR_SELF:'중복 기업 또는 자기 자신'};
    const explain=values=>[...new Set(values.map(x=>labels[x]||x))].join(' / ');
    for(const peer of diagnosis.candidates){
      const detail=candidateNode('details');detail.append(candidateNode('summary',`${peer.companyName} (${peer.ticker}) · 배수 검증·누락 자료 보기`));
      detail.append(candidateNode('p',`전체 제외 사유: ${explain(peer.exclusionReasons)}`));
      if(peer.priceEvidence){const p=peer.priceEvidence;detail.append(candidateNode('p',`보통주 종가 ${numberFormat.format(p.close)} ${p.currency} · ${p.asOfDate} · 원주가 · 거래일·종가 확인됨 · 정확한 당시 공개시각은 미확인`));const a=candidateNode('a','공식 가격 API 정의');a.href=p.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';detail.append(a);}
      if(peer.observedUndatedQuote)detail.append(candidateNode('p',`과거 날짜 미확인 시가총액 관측 ${numberFormat.format(peer.observedUndatedQuote.marketCap)} KRW · 이번 기준일 계산에 사용하지 않습니다.`));
      if(peer.capitalAlignment)detail.append(candidateNode('p','현재 자본 정렬: 검증 대기 · 보고서 이후 기업행동 전체 범위와 우선주 등 전체 주식 종류별 가격·수량 근거가 필요합니다.'));
      if(peer.balanceEvidence){const f=peer.balanceEvidence;const val=k=>Number.isFinite(f.accounts[k]?.value)?numberFormat.format(f.accounts[k].value)+' KRW':'자료 부족';detail.append(candidateNode('p',`자본 자료 기준 ${f.asOfDate} · 연결 · 공시 ${f.publishedAt.slice(0,10)} · 자본총계 ${val('equity')} · 지배기업 소유주지분 ${val('ownersEquity')} · 현금및현금성자산 ${val('cash')} · 부채총계 ${val('liabilities')} · 서로 다른 정의를 대체하지 않습니다.`));const a=candidateNode('a','반기 자본·현금·부채 원천');a.href=f.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';detail.append(a);}
      if(peer.businessReview)detail.append(candidateNode('p',`사업 근거: ${peer.businessReview.summary||'사업 원천 확인'} · ${peer.businessReview.businessFitStatus==='MISMATCH'?'사업모델 차이 확인됨':'연결기업 전체 비교 적합성 검증 대기'} · ${peer.businessReview.reason||'연결 사업 비교 근거 추가 확인 필요'} · 검토 ${peer.businessReview.reviewedAt?.slice(0,10)||'미확인'} · 과거 공개시점 ${peer.businessReview.historicalAvailabilityVerified?'근거 확인됨':'미확인'}`));
      if(peer.globalSourceReview){const g=peer.globalSourceReview;detail.append(candidateNode('p',`SEC 발행인 ${g.cik} · 종목 일치 확인됨 · 가격 제공자 재시도 대기 · 재무·주식 종류·ADR 비율·환산 기준 별도 검증 필요`));for(const item of g.annualFormSummary||[]){if(item.latest)detail.append(candidateNode('p',`${item.form} · 공시 ${item.latest.filingDate} · 회계 기준 ${item.latest.reportDate} · ${item.latest.filingDate>diagnosis.valuationDate?'평가일 이후 공시이므로 사용하지 않습니다.':'공시 목록만 확인, 재무 수치 검증 대기'}`));}const a=candidateNode('a','SEC 공식 발행인·공시 목록');a.href=g.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';detail.append(a);}
      if(peer.historicalCapitalReview){const r=peer.historicalCapitalReview;detail.append(candidateNode('p',`동일일 자본 조회: 자료 부족 · 날짜가 있는 가격 행에는 시가총액·주식수가 없습니다. 날짜 없는 요약 가격 ${numberFormat.format(r.undatedSummaryPrice)} KRW와 10월 8일 종가 ${numberFormat.format(r.datedClose)} KRW를 결합하지 않습니다. · 확인 ${r.checkedAt.slice(0,10)}`));detail.append(candidateNode('p',`KRX 날짜별 자료: 미확보 · HTTP ${r.krx.httpStatus} / ${r.krx.body} · 인증된 조회 세션 또는 동일일자 공식 원천자료가 필요합니다.`));const a=candidateNode('a','기간별 시세 공식 API 정의');a.href=r.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';detail.append(a);}
      if(peer.correctionNumeric){const n=peer.correctionNumeric;detail.append(candidateNode('p',`DB하이텍 변경 전후 수치 대사: 확인됨 · ${n.tableCount}개 표 / ${n.rowCount}개 항목 · 숫자 변경 ${n.numericChanges}개 / 단위 변경 ${n.unitChanges}개 · 원화 환산금액 모두 동일 · 최초 단위 미명시 ${n.unresolvedUnits}개는 추정하지 않습니다.`));if(n.totalDifferences?.length)detail.append(candidateNode('p',`원문 합계와 구성항목의 단순합 차이 ${n.totalDifferences.length}건 · 반올림·단위·원문 기재 원인은 검증 대기 · 수치 보정과 평가 입력 사용을 보류합니다.`));const numeric=candidateNode('details');numeric.append(candidateNode('summary',`정정 수치·단위 ${n.rowCount}개 직접 대조 보기`));for(const t of n.tables){table(`${t.statementBasis} ${t.year} ${t.field} · 원문 셀 직접 대조`,['계정','통화','측정','변경 전','이전 단위','변경 후','이후 단위','수치 상태'],t.rows.map(r=>[r.account,r.currency,r.measure==='KRW_TRANSLATED'?'원화 환산':'외화 원액',numberFormat.format(r.beforeValue),r.beforeUnit,numberFormat.format(r.afterValue),r.afterUnit,r.beforeValue===r.afterValue?'동일':'변경']),numeric);}detail.append(numeric);}
      if(peer.correction){const c=peer.correction;detail.append(candidateNode('p',`DB하이텍 정정 공시: 확인됨 · 최초 ${c.originalReceipt} → 정정 ${c.correctionReceipt} · 공시 ${c.publishedAt.slice(0,10)} · ${c.reason} · 연결·별도 주요 재무제표 4개 표 동일 · 최종 버전 조사 종료 ${c.reviewedThrough}`));for(const [i,url]of c.sourceUrls.entries()){const a=candidateNode('a',i?'정정 공시 원문':'최초 공시 원문');a.href=url;a.target='_blank';a.rel='noopener noreferrer';detail.append(a);}const changes=candidateNode('details');changes.append(candidateNode('summary','정정 전·후 8개 항목 원문 보기'));for(const x of c.changes){changes.append(candidateNode('p',`${x.statementBasis} · ${x.year} · ${x.field}`));changes.append(candidateNode('p','변경 전: '+x.before));changes.append(candidateNode('p','변경 후: '+x.after));}detail.append(changes);}

      detail.append(candidateNode('p',`필요한 자료: ${explain(peer.missingData)||'사업·통화·기간 비교 조건 확인'} · TTM ${peer.ttmStatus==='READY'?'분기 연속성 확인됨':'4개 연속 분기 자료 부족'}`));
      detail.append(candidateNode('p',`관측 시가총액 ${Number.isFinite(peer.marketCap)?numberFormat.format(peer.marketCap)+' KRW':'미확인'} · 가격 기준일 ${peer.metrics.PBR.asOfDate||'미확인'} · 미검증 관측값은 평가배수에 사용하지 않습니다.`));
      for(const record of peer.observedShareCounts||[])detail.append(candidateNode('p',`보고서 ${record.shareClass==='COMMON'?'보통주':record.shareClass==='PREFERRED'?'우선주':'전체 주식'} · ${record.asOfDate} · 발행 ${Number.isFinite(record.issued)?numberFormat.format(record.issued)+'주':'미확인'} · 자기주식 ${Number.isFinite(record.treasury)?numberFormat.format(record.treasury)+'주':'미확인'} · 현재 기준일 정렬 필요`));
      for(const [metric,x]of Object.entries(peer.metrics))detail.append(candidateNode('p',`${metric==='EV_EBITDA'?'EV/EBITDA':metric}: ${number(x.value)}${Number.isFinite(x.value)?'배':''} · ${x.verificationStatus==='VERIFIED'?'계산 근거 확인됨':'자료 부족'} · 재무 ${x.fiscalPeriod?.start||'미확인'} ~ ${x.fiscalPeriod?.end||'미확인'} · ${x.currency||'통화 미확인'} · ${x.unit||'단위 미확인'} · ${explain(x.comparisonExclusionReasons)}`));
      if(peer.supplementalFinancial){const f=peer.supplementalFinancial;detail.append(candidateNode('p',`추가 확보 반기 자료 ${f.fiscalPeriod.start} ~ ${f.fiscalPeriod.end} · 연결 · 누적 실적 · ${f.currency}/${f.unit} · 공시 ${f.publishedAt.slice(0,10)} · 연간·TTM 실적으로 대체하지 않습니다.`));const link=candidateNode('a','추가 반기 공시 원천');link.href=f.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';detail.append(link);}
      detail.append(candidateNode('p',`개선 내용: ${peer.fixApplied||'추가 자료 확인 필요'}`));
      candidateDetail.append(detail);
    }
  }
  const expansion=analysis.evidence?.peerExpansionReview;
  if(expansion){
    candidateDetail.append(candidateNode('h4','비교기업 조사 확대 · 연결 사업 기준'));
    candidateDetail.append(candidateNode('p',`조사 후보 ${expansion.candidateCount}개 · 유효 ${expansion.counts.ELIGIBLE}개 · 제외 ${expansion.counts.EXCLUDED}개 · 검증 대기 ${expansion.counts.PENDING_VERIFICATION}개 · 자료 부족 ${expansion.counts.INSUFFICIENT_DATA}개 · 최소 ${expansion.minimum}개 유지`));
    candidateDetail.append(candidateNode('p','메모리나 파운드리 제품이 겹쳐도 삼성전자 연결 사업 전체와 비교 가능하다는 뜻은 아닙니다. 사업 비중·같은 회계기간·통화·주식수 기준일을 확인해야 합니다. EV/EBITDA는 기업가치와 EBITDA 입력 부족으로 보류합니다.'));
    const labels={ELIGIBLE:'비교 가능',EXCLUDED:'제외',PENDING_VERIFICATION:'검증 대기',INSUFFICIENT_DATA:'자료 부족'};
    const reasons={MARKET_OR_CURRENCY_SCOPE_MISMATCH:'현재 국내·동일통화 비교 범위 밖',INDUSTRY_MISMATCH:'공식 업종 분류가 다름',BUSINESS_SOURCE_PENDING:'사업 원문 확인 필요',CONSOLIDATED_BUSINESS_COMPARABILITY_PENDING:'연결 사업 전체 비교 근거 부족',FINANCIAL_AND_DATED_SHARE_INPUTS_MISSING:'동일 기간 재무·주식수 자료 부족',PERIOD_CURRENCY_UNIT_OR_BASIS_MISMATCH:'기간·통화·단위·재무제표 기준 불일치'};
    for(const peer of (diagnosis?[]:expansion.candidates)){candidateDetail.append(candidateNode('p',`${peer.companyName} (${peer.ticker}) · ${labels[peer.status]} · ${peer.reasons.map(x=>reasons[x]||'평가배수 산출 근거 추가 검증 필요').join(' / ')} · 반도체 사업 비중 미확인 · 기준일 ${peer.asOfDate||'미확인'}`));if(peer.businessEvidence){const link=candidateNode('a',`${peer.companyName} 공식 사업 근거`);link.href=peer.businessEvidence.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';candidateDetail.append(link);}}
  }
  table("과거·동종기업 평가배수 비교", ["지표(배)","현재","과거 중앙값","과거 표본","과거 차이(%)","동종 중앙값","유효 기업 수","동종 차이(%)"],
    Object.entries(analysis.comparisons || {}).map(([metric,x]) => [metric,number(x.current),number(x.history?.median),x.history?.count || 0,number(x.history?.differencePct),number(x.peers?.median),x.peers?.count || 0,number(x.peers?.differencePct)]));
  const peers = analysis.peers || [];
  table("비교기업 · 동일 회계기간/가격 기준일",["종목","PER","PBR","PSR","기준일"],
    [[item.ticker,number(analysis.comparisons?.PER?.current),number(analysis.comparisons?.PBR?.current),number(analysis.comparisons?.PSR?.current),analysis.asOfDate || "미확인"],
      ...peers.map(x => [x.ticker,number(x.PER),number(x.PBR),number(x.PSR),analysis.asOfDate || "미확인"])]);
  if (!peers.length) candidateDetail.append(candidateNode("p","비교기업 데이터 미연결 또는 표본 부족 · 임의 기업을 추가하지 않습니다."));
  const bars = peers.filter(x => Number.isFinite(x.PER) && x.PER > 0);
  if (bars.length) {
    const max = Math.max(...bars.map(x=>x.PER),analysis.comparisons?.PER?.current || 0);
    candidateDetail.append(candidateNode("h4","PER 비교 분포 · 상대 막대 길이"));
    for (const row of [...bars,{ticker:item.ticker,PER:analysis.comparisons?.PER?.current}].filter(x=>Number.isFinite(x.PER) && x.PER>0)) {
      const label = candidateNode("p",`${row.ticker}: ${number(row.PER)}배`);
      const bar = candidateNode("div",undefined,"comparison-bar"); bar.style.width = `${Math.min(100,row.PER/max*100)}%`; label.append(bar); candidateDetail.append(label);
    }
  }
  for (const excluded of analysis.excluded || []) candidateDetail.append(candidateNode("p",`제외: ${excluded.companyName || excluded.ticker || "표본"} (${excluded.ticker || ""}) · ${({INDUSTRY_MISMATCH:"공식 업종 코드가 다릅니다",BUSINESS_PROFILE_UNVERIFIED_OR_MISMATCH:"사업 구성의 동질성 확인이 필요합니다",PERIOD_OR_PRICE_DATE_MISMATCH:"회계기간 또는 가격 기준일이 다릅니다",DATA_QUALITY:"가격·주식수·기업행동 또는 재무 검증이 부족합니다",DUPLICATE_OR_SELF:"중복 기업 또는 자기 자신",EXTREME_MULTIPLE_REVIEW:"의미 없는 극단 배수 검토 필요",NON_POSITIVE_OR_MISSING_DENOMINATOR:"양수인 이익·자본·매출 자료가 부족합니다",INVALID_HISTORY:"과거 표본 기간·근거 부족"})[excluded.reason] || excluded.reason} · 재무 ${excluded.fiscalPeriod?.start || "미확인"} ~ ${excluded.fiscalPeriod?.end || "미확인"} · 공개 ${excluded.publishedAt?.slice(0,10) || "미확인"} · 가격 기준 ${excluded.asOfDate || "미확인"}`));
  candidateDetail.append(candidateNode("p",`가격 기준일: ${analysis.asOfDate || "미확인"} · 과거 표본 ${analysis.historical?.length || 0}개 · 제외 ${analysis.excluded?.length || 0}개 · 실제 원천 데이터 검증 여부를 확인하세요.`));
}

function renderPriceChart(item) {
  const target = byId("price-chart"), history = item.krValuationAnalysis?.evidence?.priceHistory;
  target.replaceChildren(candidateNode("h3","가격 차트"),candidateNode("p","검증된 가격 이력 미연결 · 지원하지 않는 기간은 비활성화됩니다."));
  const emptyControls=candidateNode("div",undefined,"period-controls");
  for(const text of ["1개월","3개월","6개월","1년","3년"]){const b=candidateNode("button",text);b.disabled=true;emptyControls.append(b);}target.append(emptyControls);
  const observed = history?.qualityStatus === "UNDER_REVIEW" && history.displayStatus === "OBSERVED_PRICE_SERIES"
    && history.source === "KIS daily prices" && ["RAW","UNKNOWN","PROVIDER_ADJUSTED_PRICE_NOT_TOTAL_RETURN"].includes(history.basis);
  if ((history?.qualityStatus !== "READY" && !observed) || !Array.isArray(history.sessions) || history.sessions.length < 2 || history.sessions.length > 2000) return;
  const rows = history.sessions;
  if (rows.some((row,index) => !Number.isFinite(row.close) || row.close <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)
    || !Number.isFinite(Date.parse(row.date)) || new Date(row.date).toISOString().slice(0,10) !== row.date || index && row.date <= rows[index-1].date)) return;
  target.replaceChildren(candidateNode("h3", `${item.ticker} · 일별 종가`));
  const controls = candidateNode("div",undefined,"period-controls"), plot = candidateNode("div");
  const periodKey=candidateKey(item);
  const draw = days => {
    candidatePricePeriods.set(periodKey,days);if(candidatePricePeriods.size>20)candidatePricePeriods.delete(candidatePricePeriods.keys().next().value);
    for(const button of controls.children)button.setAttribute('aria-pressed',String(button.priceDays===days));
    const end = Date.parse(rows.at(-1).date), selected = rows.filter(x=>Date.parse(x.date)>=end-days*86400000);
    plot.replaceChildren();
    if(selected.length<2){plot.append(candidateNode("p","이 기간의 가격 표본이 부족합니다."));return;}
    const low = Math.min(...selected.map(x=>x.close)), high = Math.max(...selected.map(x=>x.close));
    const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
    svg.setAttribute("viewBox","0 0 600 200"); svg.setAttribute("role","img");
    svg.setAttribute("aria-label",`${selected[0].date}부터 ${selected.at(-1).date}까지 종가, 최저 ${low}, 최고 ${high}`);
    const line = document.createElementNS("http://www.w3.org/2000/svg","polyline");
    line.setAttribute("points",selected.map((row,i)=>`${10+i/(selected.length-1)*580},${180-(row.close-low)/(high-low || 1)*160}`).join(" "));
    line.setAttribute("fill","none");line.setAttribute("stroke","currentColor");line.setAttribute("stroke-width","2");svg.append(line);plot.append(svg);
    plot.append(candidateNode("p",`${selected[0].date} ~ ${selected.at(-1).date} · 최저 ${low} / 최고 ${high} ${history.currency} · 출처: ${history.source}`));
  };
  const span=(Date.parse(rows.at(-1).date)-Date.parse(rows[0].date))/86400000;
  let first;
  for(const [label,days] of [["1개월",30],["3개월",90],["6개월",180],["1년",365],["3년",1095]]) {
    const button=candidateNode("button",label);button.type="button";button.disabled=span<days;button.setAttribute('data-days',String(days));button.priceDays=days;
    button.addEventListener("click",()=>draw(days));controls.append(button);if(!button.disabled && first===undefined)first=days;
  }
  target.append(controls,plot);
  target.append(candidateNode("p",`가격 기준: ${history.basis==="RAW"?"원주가 · 수정 미반영":history.basis==="UNKNOWN"?"가격 조정 여부 미확인":"기존 저장 자료의 조정 여부 재검증 필요"} · 배당 제외 · 기업행동 커버리지 미확인`));
  if(observed) target.append(candidateNode("p","실제 수집 가격 이력 · 기업행동 검토 중. 배당을 반영한 총수익·검증된 기업가치 자료가 아니며 추천 승인에 사용하지 않습니다.","message warning"));
  const previous=candidatePricePeriods.get(periodKey);
  if(first!==undefined)draw(previous&&span>=previous?previous:first);else plot.append(candidateNode("p","지원 기간을 표시할 충분한 가격 이력이 없습니다."));
}

if (document.querySelectorAll) {
  const links = document.querySelectorAll('.rail-link, .bottom-nav a');
  for (const link of links) link.addEventListener('click', () => {
    for (const other of links) {
      const selected = other.getAttribute('href') === link.getAttribute('href');
      other.classList.toggle('active', selected);
      if(selected)other.setAttribute('aria-current','location');else other.removeAttribute('aria-current');
    }
  });
}

async function loadDailyReports() {
  const button=byId("daily-report-load"), target=byId("daily-report-list"), message=byId("daily-report-message");
  button.disabled=true;target.replaceChildren();message.textContent="일일 분석 보고서를 확인하고 있습니다.";
  try {
    const data=await candidateRequest("/api/reports?limit=10",false);
    if(!Array.isArray(data.reports))throw new Error("UNAVAILABLE");
    for(const report of data.reports){
      const card=candidateNode("article",undefined,"candidate-card");
      card.append(candidateNode("h4",`분석 실행: ${performanceDate(report.completedAt || report.startedAt)}`));
      card.append(candidateNode("p",`실행 모드: ${report.mode || "미확인"} · 분석 기록 ${report.results?.length || 0}개`));
      for(const result of report.results || [])card.append(candidateNode("p",`${result.name || result.symbol} · ${result.symbol} · ${result.success ? "분석 기록 확인" : "분석 실패/미완료"} · 데이터 품질 ${result.dataValid === true ? "검증 조건 통과" : "확인 필요"}`));
      target.append(card);
    }
    message.textContent=data.reports.length ? "저장된 일일 분석 기록입니다. 실제 수익률이나 추천 순위가 아닙니다." : "저장된 일일 분석 보고서가 없습니다.";
  }catch(error){target.replaceChildren();message.textContent=error.message==="AUTH" ? "외부접속 토큰을 확인해 주세요." : "일일 보고서 조회 실패 · 연결과 저장된 데이터를 확인하세요.";}
  finally{button.disabled=false;}
}
byId("daily-report-load").addEventListener("click",loadDailyReports);

const paperPositions = [];
const paperCashFlows = [];
const paperSales = [];
const paperDividends = [];
let paperDividendSequence = 0;
let paperSaleSequence = 0;
let paperFlowSequence = 0;
let paperPerformanceVersion = 0;
let paperReportSnapshot=null;
const paperInputErrorTargets=new Set();
let paperQuotes = new Map();
let paperExitGuardAttached=false;
let paperDeletedRecord=null;
let paperEditSession=null;
const paperEditableFields={position:[['buy','가상 매수가'],['quantity','가상 수량'],['fee','매수 수수료 총액'],['tax','매수 세금 총액']],flow:[['date','입출금 날짜'],['amount','입금은 양수·출금은 음수 (KRW)']],sale:[['date','매도 날짜'],['quantity','매도 수량'],['price','매도 가격'],['fee','매도 수수료 총액'],['tax','매도 세금 총액']],dividend:[['date','가정 배당 날짜'],['amount','가정 배당 순수령액 (KRW)']]};
function clearPaperEditor(){paperEditSession=null;byId('paper-edit-fields').replaceChildren();byId('paper-edit-panel').hidden=true;}
function paperEditHasChanges(){
  if(!paperEditSession)return false;
  return paperEditableFields[paperEditSession.kind].some(([key])=>{const field=byId(`paper-edit-${key}`),text=field.value.trim(),original=paperEditSession.item[key]??0;return field.validity?.badInput||!text||(key==='date'?text!==original:Number(text)!==original);});
}
function requireSavedPaperEdit(messageId){
  if(!paperEditHasChanges())return true;
  const text='저장하지 않은 수정 내용이 있습니다. 현재 수정을 저장하거나 수정 취소를 누른 뒤 다시 실행하세요. 원본 기록과 기존 결과는 유지됩니다.';
  byId(messageId).textContent=text;byId('paper-edit-message').textContent=text;
  byId(`paper-edit-${paperEditableFields[paperEditSession.kind][0][0]}`).focus();byId('paper-edit-panel').scrollIntoView?.({block:'center'});return false;
}
function beginPaperEdit(kind,item){
  const rows={position:paperPositions,flow:paperCashFlows,sale:paperSales,dividend:paperDividends}[kind];
  if(!rows?.includes(item))return;
  if(paperEditSession&&(paperEditSession.item===item&&paperEditSession.kind===kind||paperEditHasChanges())){
    if(paperEditSession.item!==item||paperEditSession.kind!==kind)byId('paper-edit-message').textContent='저장하지 않은 수정 내용이 있습니다. 현재 수정을 저장하거나 수정 취소를 누른 뒤 다른 기록을 수정하세요.';
    byId(`paper-edit-${paperEditableFields[paperEditSession.kind][0][0]}`).focus();byId('paper-edit-panel').scrollIntoView?.({block:'center'});return;
  }
  clearPaperEditor();paperEditSession={kind,item,version:paperPerformanceVersion};
  byId('paper-edit-panel').hidden=false;byId('paper-edit-message').textContent=`${item.ticker||'입출금'} 기록 수정 중 · 저장 전에는 원본이 바뀌지 않습니다. 종목·통화는 유지하며 거래일·현금·자료 검증은 계산 시 별도 진행합니다.`;
  for(const [key,title] of paperEditableFields[kind]){const label=candidateNode('label',title),input=candidateNode('input');input.id=`paper-edit-${key}`;input.type=key==='date'?'date':'number';if(key!=='date'){input.step='any';input.inputMode='decimal';}input.value=String(item[key]??0);input.addEventListener('input',()=>{clearPaperEditErrors();byId('paper-edit-message').textContent='수정 중입니다. 저장을 눌러 입력을 다시 확인하세요. 원본은 아직 바뀌지 않았습니다.';});label.append(input);byId('paper-edit-fields').append(label);}
  byId(`paper-edit-${paperEditableFields[kind][0][0]}`).focus();byId('paper-edit-panel').scrollIntoView?.({block:'center'});
}
function clearPaperEditErrors(){
  if(!paperEditSession)return;
  for(const [key] of paperEditableFields[paperEditSession.kind]){const field=byId(`paper-edit-${key}`);field.removeAttribute('aria-invalid');field.removeAttribute('aria-describedby');}
}
function inspectPaperEdit(kind,item){
  const replacement={...item},issues=[];
  for(const [key,title] of paperEditableFields[kind]){
    const field=byId(`paper-edit-${key}`),text=field.value.trim(),value=key==='date'?text:Number(text);replacement[key]=value;
    const validDate=key==='date'&&/^\d{4}-\d{2}-\d{2}$/.test(text)&&Number.isFinite(Date.parse(text))&&new Date(text).toISOString().slice(0,10)===text;
    const validNumber=key!=='date'&&Number.isFinite(value)&&Math.abs(value)<=Number.MAX_SAFE_INTEGER&&(['fee','tax'].includes(key)?value>=0:kind==='flow'&&key==='amount'?value!==0:value>0);
    if(!text||field.validity?.badInput||!(key==='date'?validDate:validNumber))issues.push({key,message:`${title}: ${key==='date'?'실제 날짜를 입력하세요.':kind==='flow'?'0이 아닌 유효한 금액을 입력하세요.':['fee','tax'].includes(key)?'0 이상의 유효한 금액을 입력하세요.':'양수인 유효한 금액·수량을 입력하세요.'}`});
  }
  if(!issues.length&&['position','sale'].includes(kind)){
    const held=paperPositions.filter(p=>p.market==='KR'&&p.ticker===item.ticker).reduce((n,p)=>n+(p===item?replacement.quantity:p.quantity),0),sold=paperSales.filter(p=>p.ticker===item.ticker).reduce((n,p)=>n+(p===item?replacement.quantity:p.quantity),0);
    if(item.market!=='GLOBAL'&&(!Number.isFinite(held)||!Number.isFinite(sold)||sold>held))issues.push({key:'quantity',message:'수량: 전체 매수 수량보다 가상 매도 수량이 많습니다. 매수·매도 기록을 확인하세요.'});
    const amount=replacement.quantity*(kind==='position'?replacement.buy:replacement.price);
    if(!Number.isFinite(amount)||amount>Number.MAX_SAFE_INTEGER)issues.push({key:'quantity',message:'수량과 가격의 곱이 계산 가능한 금액 범위를 넘습니다.'});
  }
  return {replacement,issues};
}
function savePaperEdit(){
  const session=paperEditSession;if(!session)return;
  const {kind,item,version}=session,rows={position:paperPositions,flow:paperCashFlows,sale:paperSales,dividend:paperDividends}[kind];
  if(version!==paperPerformanceVersion||!rows.includes(item)){clearPaperEditor();return;}
  clearPaperEditErrors();const {replacement,issues}=inspectPaperEdit(kind,item);
  if(issues.length){byId('paper-edit-message').textContent='저장하지 않았습니다. '+issues.map(issue=>issue.message).join(' ')+' 원본 기록은 유지됩니다.';for(const issue of issues){byId(`paper-edit-${issue.key}`).setAttribute('aria-invalid','true');byId(`paper-edit-${issue.key}`).setAttribute('aria-describedby','paper-edit-message');}byId(`paper-edit-${issues[0].key}`).focus();return;}
  try{
    const draft={positions:paperPositions,cashFlows:paperCashFlows,sales:paperSales,dividends:paperDividends,initialCash:null,fromDate:null,toDate:null};
    draft[{position:'positions',flow:'cashFlows',sale:'sales',dividend:'dividends'}[kind]]=rows.map(row=>row===item?replacement:row);
    KStockPaperBackup.serialize(draft);
    if(kind==='position'&&Number.isFinite(replacement.price)&&!Number.isFinite(replacement.price*replacement.quantity))throw Error('RANGE');
  }catch{byId('paper-edit-message').textContent='저장하지 않았습니다. 날짜·필수 금액·수량·비용과 전체 매수 대비 매도 수량을 확인하세요. 원본 기록은 유지됩니다.';return;}
  rows[rows.indexOf(item)]=replacement;invalidatePaperPerformance();renderPaperLedgers();byId('paper-message').textContent='기록 수정을 저장했습니다. 입력 점검과 누적 성과를 다시 계산하세요.';byId('paper-add').focus();
}
function paperEditButton(kind,item){const button=candidateNode('button','기록 수정','candidate-button');button.type='button';button.setAttribute('aria-label',`${item.ticker||'입출금'} ${item.date||''} 기록 수정`);button.addEventListener('click',()=>beginPaperEdit(kind,item));return button;}
byId('paper-edit-save').addEventListener('click',savePaperEdit);
byId('paper-edit-cancel').addEventListener('click',()=>{clearPaperEditor();byId('paper-add').focus();});

function clearPaperDeleteUndo(){
  paperDeletedRecord=null;byId('paper-delete-undo').disabled=true;
  byId('paper-delete-message').textContent='개별 삭제 직후 한 번만 되돌릴 수 있습니다. 다른 기록·입력 변경 또는 모두 비우기는 되돌리기 사본도 지웁니다.';
}
function paperRecordDateRange(){
  const start=byId('paper-record-from'),end=byId('paper-record-to'),from=start.value,to=end.value;
  const valid=field=>!field.validity?.badInput&&(!field.value||/^\d{4}-\d{2}-\d{2}$/.test(field.value)&&Number.isFinite(Date.parse(field.value))&&new Date(field.value).toISOString().slice(0,10)===field.value);
  return {from,to,valid:valid(start)&&valid(end)&&(!from||!to||from<=to)};
}
function visiblePaperRecords(kind,rows){
  const selected=byId('paper-record-kind').value||'all',query=byId('paper-record-search').value.trim().toUpperCase();
  const range=paperRecordDateRange();if(!range.valid)return [];
  const matches=rows.filter(item=>(!range.from&&!range.to||kind!=='position'&&(!range.from||item.date>=range.from)&&(!range.to||item.date<=range.to))&&(selected==='all'||selected===kind)&&(!query||String(item.ticker||'').toUpperCase().includes(query)));
  const order=byId('paper-record-order').value;
  // Purchase date is a quote date, not a transaction date; keep purchases in registration order.
  if(kind==='position'||!['newest','oldest'].includes(order))return matches;
  return matches.map((item,index)=>({item,index})).sort((a,b)=>{
    const left=a.item.date||'',right=b.item.date||'';
    return (left===right?0:(left<right?-1:1))*(order==='newest'?-1:1)||a.index-b.index;
  }).map(entry=>entry.item);
}
const paperRecordPages={position:0,flow:0,sale:0,dividend:0};
function resetPaperRecordPages(){for(const kind of Object.keys(paperRecordPages))paperRecordPages[kind]=0;}
function pagedPaperRecords(kind,rows){
  const matches=visiblePaperRecords(kind,rows);paperRecordPages[kind]=Math.min(paperRecordPages[kind],Math.max(0,Math.ceil(matches.length/20)-1));
  return matches.slice(paperRecordPages[kind]*20,(paperRecordPages[kind]+1)*20);
}
function paperRecordOrderLabel(kind){return kind==='position'?'매수 등록 순서':({newest:'날짜 최신순',oldest:'날짜 과거순'}[byId('paper-record-order').value]||'등록 순서');}
function appendPaperRecordPager(kind,rows,target){
  const matches=visiblePaperRecords(kind,rows);if(matches.length<=20)return;
  const page=paperRecordPages[kind],pages=Math.ceil(matches.length/20),controls=candidateNode('div',undefined,'period-controls');
  controls.append(candidateNode('p',`조건 일치 ${matches.length}건 · ${page+1}/${pages}페이지 · 페이지당 최대 20건 · ${paperRecordOrderLabel(kind)}`));
  for(const [label,step] of [['이전 기록',-1],['다음 기록',1]]){const button=candidateNode('button',label,'candidate-button');button.type='button';button.disabled=step<0?page===0:page===pages-1;button.addEventListener('click',()=>{paperRecordPages[kind]+=step;renderPaperLedgers();target.setAttribute('tabindex','-1');target.focus();target.scrollIntoView?.({block:'start'});});controls.append(button);}
  target.append(controls);
}
function renderPaperRecordSummary(){
  const target=byId('paper-record-summary');target.replaceChildren(candidateNode('h4','조회 조건에 맞는 기록 합계'));
  if(!paperRecordDateRange().valid){target.append(candidateNode('p','조회 날짜 오류로 합계를 보류합니다.'));return;}
  target.append(candidateNode('p','현재 페이지뿐 아니라 조회 조건에 맞는 모든 페이지의 입력 금액입니다. 보유 수량·현금 잔액·수익률이 아니며 거래일·체결·배당 권리 검증 전 참고 요약입니다.'));
  const positions=visiblePaperRecords('position',paperPositions),flows=visiblePaperRecords('flow',paperCashFlows),sales=visiblePaperRecords('sale',paperSales),dividends=visiblePaperRecords('dividend',paperDividends);
  if(!positions.length&&!flows.length&&!sales.length&&!dividends.length){target.append(candidateNode('p','조건에 맞는 기록이 없습니다.'));return;}
  const sum=(rows,fn)=>{const values=rows.map(fn),total=values.reduce((a,b)=>a+b,0);return values.every(Number.isFinite)&&Number.isFinite(total)?String(total):'수치 범위 확인 필요';};
  for(const currency of [...new Set(positions.map(p=>p.currency))].sort()){const rows=positions.filter(p=>p.currency===currency);target.append(candidateNode('p',`매수 원가·비용 (${currency}) ${sum(rows,p=>p.buy*p.quantity+(p.fee??0)+(p.tax??0))} · 매수 기록 ${rows.length}건`));}
  if(flows.length)target.append(candidateNode('p',`가상 입금 ${sum(flows.filter(f=>f.amount>0),f=>f.amount)} KRW · 출금 ${sum(flows.filter(f=>f.amount<0),f=>-f.amount)} KRW · 순입출금 ${sum(flows,f=>f.amount)} KRW · ${flows.length}건`));
  if(sales.length)target.append(candidateNode('p',`가상 매도 총액 ${sum(sales,t=>t.quantity*t.price)} KRW · 비용 ${sum(sales,t=>(t.fee??0)+(t.tax??0))} KRW · 순수령 ${sum(sales,t=>t.quantity*t.price-(t.fee??0)-(t.tax??0))} KRW · ${sales.length}건 · 실현 손익 아님`));
  if(dividends.length)target.append(candidateNode('p',`사용자 가정 배당 순수령 ${sum(dividends,d=>d.amount)} KRW · ${dividends.length}건 · 공식 배당 아님`));
}
function updatePaperRecordCount(){renderPaperRecordSummary();
  const range=paperRecordDateRange();
  for(const id of ['paper-record-from','paper-record-to']){if(range.valid)byId(id).removeAttribute('aria-invalid');else byId(id).setAttribute('aria-invalid','true');}
  byId('paper-record-date-message').textContent=range.valid?'조회 기간은 양 끝 날짜를 포함합니다. 빈 날짜는 해당 방향 전체이며 계산 기간은 바뀌지 않습니다.':'조회 날짜를 확인하세요. 실제 날짜를 입력하고 시작일을 종료일 이전 또는 같은 날로 지정하세요. 원본 기록은 유지됩니다.';
  const entries=[['position',paperPositions],['flow',paperCashFlows],['sale',paperSales],['dividend',paperDividends]],total=entries.reduce((n,[,rows])=>n+rows.length,0),visible=entries.reduce((n,[kind,rows])=>n+visiblePaperRecords(kind,rows).length,0);
  const shown=entries.reduce((n,[kind,rows])=>n+pagedPaperRecords(kind,rows).length,0);
  byId('paper-record-count').textContent=`전체 ${total}건 중 ${visible}건 표시 대상 · 현재 페이지 ${shown}건 표시 · 계산·백업·전체 비우기는 숨겨진 기록을 포함합니다. 매수 합계도 전체 기록 기준입니다.`;
}
function resetPaperRecordFilter(){resetPaperRecordPages();byId('paper-record-from').value='';byId('paper-record-to').value='';byId('paper-record-kind').value='all';byId('paper-record-order').value='registered';byId('paper-record-search').value='';renderPaperLedgers();}
byId('paper-record-kind').addEventListener('change',()=>{resetPaperRecordPages();renderPaperLedgers();});
byId('paper-record-order').addEventListener('change',()=>{resetPaperRecordPages();renderPaperLedgers();});
byId('paper-record-search').addEventListener('input',()=>{resetPaperRecordPages();renderPaperLedgers();});
for(const id of ['paper-record-from','paper-record-to'])byId(id).addEventListener('input',()=>{resetPaperRecordPages();renderPaperLedgers();});
byId('paper-record-reset').addEventListener('click',()=>{resetPaperRecordFilter();byId('paper-record-search').focus();});
function renderPaperLedgers(){renderPaperPositions();renderPaperCashFlows();renderPaperSales();renderPaperDividends();}
function deletePaperRecord(kind,item){
  const rows={position:paperPositions,flow:paperCashFlows,sale:paperSales,dividend:paperDividends}[kind];
  const index=rows?.indexOf(item);if(index===undefined||index<0)return;
  const record={...item};rows.splice(index,1);invalidatePaperPerformance();
  paperDeletedRecord={kind,index,record};byId('paper-delete-undo').disabled=false;
  byId('paper-delete-message').textContent='선택한 기록을 삭제했습니다. 마지막 삭제 한 건이 이 탭 메모리에 남아 있습니다. 다른 입력 변경 전에 되돌릴 수 있으며 모두 비우면 사본도 삭제됩니다.';
  renderPaperLedgers();byId('paper-delete-undo').focus();
}
function undoPaperDelete(){
  if(!paperDeletedRecord)return;
  const {kind,index,record}=paperDeletedRecord;
  const rows={position:paperPositions,flow:paperCashFlows,sale:paperSales,dividend:paperDividends}[kind];
  // Restored purchases must obtain a current validated quote again.
  if(kind==='position'){const quote=paperQuotes.get(`${record.market}:${record.ticker}`)?.priceSnapshot;record.price=quote?.status==='READY'&&Number.isFinite(quote.close*record.quantity)?quote.close:null;record.date=record.price===null?null:quote.sessionDate;}
  rows.splice(index,0,record);invalidatePaperPerformance();renderPaperLedgers();
  byId('paper-delete-message').textContent='마지막 삭제 기록을 원래 순서로 되돌렸습니다. 입력 점검과 누적 성과 계산을 다시 실행하세요.';
  byId('paper-add').focus();
}
byId('paper-delete-undo').addEventListener('click',undoPaperDelete);
function hasPaperRecords(){return !!paperDeletedRecord||[paperPositions,paperCashFlows,paperSales,paperDividends].some(rows=>rows.length>0);}
function warnBeforePaperExit(event){
  if(!hasPaperRecords())return;
  event.preventDefault();event.returnValue='';
}
function syncPaperExitGuard(target=globalThis){
  if(!target.addEventListener||!target.removeEventListener)return;
  const needed=hasPaperRecords();
  if(needed===paperExitGuardAttached)return;
  if(needed)target.addEventListener('beforeunload',warnBeforePaperExit);
  else target.removeEventListener('beforeunload',warnBeforePaperExit);
  paperExitGuardAttached=needed;
}

function updatePaperOptions(data) {
  const select=byId("paper-stock");const previous=select.value;
  select.replaceChildren(candidateNode("option","종목을 선택하세요"));paperQuotes=new Map();
  if(data.status==="STALE")return;
  for(const item of [...(data.KR || []),...(data.GLOBAL || []),...(data.incompleteCandidates || [])]) {
    if(item.priceSnapshot?.status!=="READY" || !Number.isFinite(item.priceSnapshot.close) || item.priceSnapshot.close<=0)continue;
    const key=`${item.market}:${item.ticker}`;if(paperQuotes.has(key))continue;paperQuotes.set(key,item);
    const option=candidateNode("option",`${item.companyName} · ${item.ticker} · ${item.priceSnapshot.currency}`);option.value=key;select.append(option);
  }
  select.value=paperQuotes.has(previous) ? previous : "";
  let rebound=false;
  for(const p of paperPositions)if(p.price===null){const q=paperQuotes.get(`${p.market}:${p.ticker}`);if(q&&Number.isFinite(q.priceSnapshot.close*p.quantity)){p.price=q.priceSnapshot.close;p.date=q.priceSnapshot.sessionDate;rebound=true;}}
  if(rebound){invalidatePaperPerformance();renderPaperPositions();}

}
function addPaperPosition() {
  const message=byId("paper-message"), quote=paperQuotes.get(byId("paper-stock").value);
  const buy=Number(byId("paper-buy").value), quantity=Number(byId("paper-quantity").value);
  const fee=Number(byId("paper-fee").value), tax=Number(byId("paper-tax").value);
  if(![fee,tax].every(x=>Number.isFinite(x)&&x>=0)){message.textContent="가상 매수 수수료·세금은 0 이상의 금액을 입력하세요.";return;}
  if(!quote || !Number.isFinite(buy) || !Number.isFinite(quantity) || buy<=0 || quantity<=0 || !Number.isFinite(buy*quantity) || !Number.isFinite(quote.priceSnapshot.close*quantity)) {
    message.textContent="검증된 가격의 종목과 양수인 가상 매수가·수량을 입력하세요.";return;
  }
  const sameCurrency=paperPositions.filter(x=>x.currency===quote.priceSnapshot.currency);
  const priorCost=sameCurrency.reduce((sum,x)=>sum+x.buy*x.quantity+x.fee+x.tax,0), priorValue=sameCurrency.reduce((sum,x)=>sum+x.price*x.quantity,0);
  if(paperPositions.length>=50 || !Number.isFinite(priorCost+buy*quantity+fee+tax) || !Number.isFinite(priorValue+quote.priceSnapshot.close*quantity)
    || !Number.isFinite(quote.priceSnapshot.close/buy*100)) {message.textContent="모의 기록 한도 또는 계산 가능한 수치 범위를 넘었습니다.";return;}
  invalidatePaperPerformance();
  paperPositions.push({market:quote.market,ticker:quote.ticker,currency:quote.priceSnapshot.currency,buy,quantity,fee,tax,price:quote.priceSnapshot.close,date:quote.priceSnapshot.sessionDate});
  renderPaperPositions();
  message.textContent="이 탭에만 있는 가상 기록입니다. 실제 주문이나 추천이 아니며 통화별로 합산합니다.";
}
function renderPaperPositions() {
  syncPaperExitGuard();updatePaperRecordCount();
  const target=byId("paper-results");target.replaceChildren();const totals=new Map();
  renderPaperSaleOptions();
  byId("paper-clear").disabled=!hasPaperRecords();
  if(!paperPositions.length){target.append(candidateNode("p","모의 기록이 없습니다."));return;}
  for(const item of paperPositions){const total=totals.get(item.currency)||{cost:0,value:0};total.cost+=item.buy*item.quantity+item.fee+item.tax;if(Number.isFinite(item.price)&&item.price>0&&Number.isFinite(item.price*item.quantity))total.value+=item.price*item.quantity;else total.pending=true;totals.set(item.currency,total);}
  for(const [currency,total] of totals)if(total.pending)target.append(candidateNode("p",`모의 합계 ${currency}: 매수원가 ${total.cost.toFixed(2)} · 평가·손익 보류 · 분석 상태 새로고침으로 기준가격을 확인하세요.`));else target.append(candidateNode("p",`모의 합계 ${currency}: 평가 ${total.value.toFixed(2)} · 손익 ${(total.value-total.cost).toFixed(2)} · 수익률 ${((total.value/total.cost-1)*100).toFixed(2)}%`));
  const visible=pagedPaperRecords('position',paperPositions);if(!visible.length)target.append(candidateNode('p','선택한 조건에 맞는 매수 기록이 없습니다.'));
  for(const item of visible){
    const card=candidateNode("article",undefined,"candidate-card"), value=item.price*item.quantity;
    card.append(candidateNode("h4",`${item.ticker} · 모의투자`));
    if(Number.isFinite(item.price)&&item.price>0&&Number.isFinite(value)){
    card.append(candidateNode("p",`가상 매수가 ${item.buy} / 수량 ${item.quantity} · 매수 수수료 ${item.fee} / 세금 ${item.tax} ${item.currency} · 평가가격 ${item.price} ${item.currency} (${item.date})`));
    card.append(candidateNode("p",`평가금액 ${value.toFixed(2)} · 손익 ${(value-item.buy*item.quantity-item.fee-item.tax).toFixed(2)} · 참고 수익률 ${((value/(item.buy*item.quantity+item.fee+item.tax)-1)*100).toFixed(2)}%`));
    if(!totals.get(item.currency).pending){const weight=value/totals.get(item.currency).value*100;card.append(candidateNode("p",`동일 통화 내 비중 ${weight.toFixed(1)}%`));
    const bar=candidateNode("div",undefined,"comparison-bar");bar.style.width=`${weight}%`;card.append(bar);}
    }else card.append(candidateNode('p',`가상 매수가 ${item.buy} · 수량 ${item.quantity} · 매수 수수료 ${item.fee} · 세금 ${item.tax} ${item.currency} · 기준가격 미확인으로 평가·손익 보류`));
    const remove=candidateNode("button","기록 삭제","candidate-button");remove.type="button";remove.setAttribute("aria-label",`${item.ticker} 모의 기록 삭제`);
    remove.addEventListener("click",()=>{deletePaperRecord('position',item);});
    card.append(paperEditButton('position',item),remove);target.append(card);
  }
  appendPaperRecordPager('position',paperPositions,target);
}
function invalidatePaperPerformance(){clearPaperEditor();clearPaperDeleteUndo();syncPaperExitGuard();byId("paper-clear").disabled=!hasPaperRecords();clearPaperInputReview();clearPaperReport();clearPaperBackupPreview();paperPerformanceVersion++;byId("paper-performance-results").replaceChildren();byId("paper-performance-message").textContent="가상 기록이 변경되었습니다. 누적 성과를 다시 계산하세요.";}
byId("paper-clear").addEventListener("click",()=>{paperPositions.length=0;paperCashFlows.length=0;paperSales.length=0;paperDividends.length=0;byId("paper-backup-text").value="";byId("paper-backup-file").value="";renderPaperDividends();renderPaperSales();byId("paper-initial-cash").value="";invalidatePaperPerformance();renderPaperPositions();renderPaperCashFlows();byId("paper-message").textContent="이 탭의 모의 기록을 모두 비웠습니다.";byId("paper-add").focus();});
byId("paper-add").addEventListener("click",addPaperPosition);
function addPaperCashFlow(){
  const date=byId('paper-flow-date').value,amount=Number(byId('paper-flow-amount').value),direction=byId('paper-flow-direction').value;
  const message=byId('paper-flow-message');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||!Number.isFinite(amount)||amount<=0||!['DEPOSIT','WITHDRAWAL'].includes(direction)||paperCashFlows.length>=500){message.textContent='유효한 날짜와 양수 금액, 입금 또는 출금을 선택하세요. 최대 500건입니다.';return;}
  paperCashFlows.push({id:`flow-${++paperFlowSequence}`,date,timing:'BEFORE_OPEN',amount:direction==='DEPOSIT'?amount:-amount});
  invalidatePaperPerformance();renderPaperCashFlows();renderPaperPositions();message.textContent='가상 입출금을 추가했습니다. 거래일·기간·출금 가능액은 누적 성과 계산 시 검증합니다.';
}
function renderPaperCashFlows(){
  const target=byId('paper-flow-results');target.replaceChildren();
  for(const flow of pagedPaperRecords('flow',paperCashFlows)){
    const row=candidateNode('article',undefined,'candidate-card');row.append(candidateNode('p',`${flow.date} · 장 시작 전 가상 ${flow.amount>0?'입금':'출금'} ${Math.abs(flow.amount)} KRW`));
    const remove=candidateNode('button','입출금 삭제','candidate-button');remove.type='button';remove.setAttribute('aria-label',`${flow.date} 가상 입출금 삭제`);
    remove.addEventListener('click',()=>{deletePaperRecord('flow',flow);});row.append(paperEditButton('flow',flow),remove);target.append(row);
  }
  appendPaperRecordPager('flow',paperCashFlows,target);
  if(paperCashFlows.length&&!visiblePaperRecords('flow',paperCashFlows).length)target.append(candidateNode('p','선택한 조건에 맞는 입출금 기록이 없습니다.'));
  if(!paperCashFlows.length)target.append(candidateNode('p','가상 입출금 기록이 없습니다.'));
}
byId('paper-flow-add').addEventListener('click',addPaperCashFlow);
byId('paper-initial-cash').addEventListener('input',invalidatePaperPerformance);
function renderPaperSaleOptions(){
  for(const id of ['paper-sale-stock','paper-dividend-stock']){
    const select=byId(id),previous=select.value;select.replaceChildren(candidateNode('option','매수 기록의 한국 종목 선택'));
    for(const ticker of new Set(paperPositions.filter(p=>p.market==='KR'&&p.currency==='KRW').map(p=>p.ticker))){const option=candidateNode('option',ticker);option.value=ticker;select.append(option);}select.value=previous;
  }
}
function addPaperSale(){
  const ticker=byId('paper-sale-stock').value,date=byId('paper-sale-date').value,quantity=Number(byId('paper-sale-quantity').value),price=Number(byId('paper-sale-price').value),fee=Number(byId('paper-sale-fee').value),tax=Number(byId('paper-sale-tax').value),message=byId('paper-sale-message');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||![quantity,price].every(v=>Number.isFinite(v)&&v>0)||![fee,tax].every(v=>Number.isFinite(v)&&v>=0)||!Number.isFinite(quantity*price)||paperSales.length>=450){message.textContent='유효한 날짜·양수 가격·수량과 0 이상의 비용을 입력하세요. 매도는 최대 450건입니다.';return;}
  const held=paperPositions.filter(p=>p.market==='KR'&&p.currency==='KRW'&&p.ticker===ticker).reduce((s,p)=>s+p.quantity,0),sold=paperSales.filter(t=>t.ticker===ticker).reduce((s,t)=>s+t.quantity,0);
  if(!Number.isFinite(held)||!Number.isFinite(sold+quantity)||quantity>held-sold){message.textContent='가상 매도 수량이 남은 매수 수량을 넘습니다.';return;}
  paperSales.push({id:`sale-${++paperSaleSequence}`,ticker,date,quantity,price,fee,tax});invalidatePaperPerformance();renderPaperSales();renderPaperPositions();message.textContent='가상 매도를 추가했습니다. 거래일·기간·현금은 누적 성과 계산 시 검증합니다.';
}
function renderPaperSales(){
  const target=byId('paper-sale-results');target.replaceChildren();
  for(const sale of pagedPaperRecords('sale',paperSales)){const row=candidateNode('article',undefined,'candidate-card');row.append(candidateNode('p',`${sale.date} · ${sale.ticker} 가상 매도 ${sale.quantity}주 × ${sale.price} KRW · 수수료 ${sale.fee} · 세금 ${sale.tax}`));const remove=candidateNode('button','매도 기록 삭제','candidate-button');remove.type='button';remove.setAttribute('aria-label',`${sale.ticker} ${sale.date} 가상 매도 삭제`);remove.addEventListener('click',()=>{deletePaperRecord('sale',sale);});row.append(paperEditButton('sale',sale),remove);target.append(row);}
  appendPaperRecordPager('sale',paperSales,target);
  if(paperSales.length&&!visiblePaperRecords('sale',paperSales).length)target.append(candidateNode('p','선택한 조건에 맞는 매도 기록이 없습니다.'));
  if(!paperSales.length)target.append(candidateNode('p','가상 매도 기록이 없습니다.'));
}
byId('paper-sale-add').addEventListener('click',addPaperSale);
function addPaperDividend(){
  const ticker=byId('paper-dividend-stock').value,date=byId('paper-dividend-date').value,amount=Number(byId('paper-dividend-amount').value),message=byId('paper-dividend-message');
  if(!paperPositions.some(p=>p.market==='KR'&&p.currency==='KRW'&&p.ticker===ticker)||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||!Number.isFinite(amount)||amount<=0||paperDividends.length>=500){message.textContent='매수 기록의 한국 종목·유효한 날짜·양수 순수령액을 입력하세요. 최대 500건입니다.';return;}
  paperDividends.push({id:`dividend-${++paperDividendSequence}`,ticker,date,amount});invalidatePaperPerformance();renderPaperDividends();renderPaperPositions();message.textContent='가상 배당 순수령액을 추가했습니다. 공식 배당·권리 확인 자료가 아니며 거래일은 계산 시 검증합니다.';
}
function renderPaperDividends(){
  const target=byId('paper-dividend-results');target.replaceChildren();
  for(const d of pagedPaperRecords('dividend',paperDividends)){const row=candidateNode('article',undefined,'candidate-card');row.append(candidateNode('p',`${d.date} · ${d.ticker} 가상 배당 순수령 ${d.amount} KRW · 사용자 가정`));const remove=candidateNode('button','가상 배당 삭제','candidate-button');remove.type='button';remove.setAttribute('aria-label',`${d.ticker} ${d.date} 가상 배당 삭제`);remove.addEventListener('click',()=>{deletePaperRecord('dividend',d);});row.append(paperEditButton('dividend',d),remove);target.append(row);}
  appendPaperRecordPager('dividend',paperDividends,target);
  if(paperDividends.length&&!visiblePaperRecords('dividend',paperDividends).length)target.append(candidateNode('p','선택한 조건에 맞는 가정 배당 기록이 없습니다.'));
  if(!paperDividends.length)target.append(candidateNode('p','가상 배당 기록이 없습니다.'));
}
byId('paper-dividend-add').addEventListener('click',addPaperDividend);
let pendingPaperBackup=null,paperBackupReadVersion=0;
function clearPaperBackupPreview(){pendingPaperBackup=null;paperBackupReadVersion++;byId('paper-backup-apply').disabled=true;byId('paper-backup-comparison').replaceChildren();byId('paper-backup-cancel').disabled=true;}
function makePaperBackup(){
  const cash=byId('paper-initial-cash').value.trim();
  return KStockPaperBackup.serialize({positions:paperPositions,cashFlows:paperCashFlows,sales:paperSales,dividends:paperDividends,initialCash:cash?Number(cash):null,fromDate:byId('paper-from').value||null,toDate:byId('paper-to').value||null});
}
function exportPaperBackup(){
  if(!requireSavedPaperEdit('paper-backup-message'))return false;
  clearPaperBackupPreview();try{byId('paper-backup-text').value=makePaperBackup();byId('paper-backup-message').textContent='백업 텍스트를 만들었습니다. 가상 기록만 포함하며 시세와 토큰은 포함하지 않습니다. 직접 복사하거나 파일로 저장하세요.';return true;}catch{byId('paper-backup-message').textContent='백업을 만들지 못했습니다. 날짜·수량·금액 범위와 매도 수량을 확인하세요.';return false;}
}
function renderPaperBackupComparison(incoming){
  const target=byId('paper-backup-comparison');
  target.replaceChildren(candidateNode('h4','교체 전후 요약'));
  target.append(candidateNode('p','현재 → 불러올 백업 순서입니다. 합계가 같아도 개별 날짜·가격·기록은 다를 수 있습니다. 병합하지 않고 전체 기록과 계산 조건을 교체하며, 교체는 개별 삭제 되돌리기로 복구할 수 없습니다. 필요하면 현재 기록을 먼저 백업하세요.'));
  const current={positions:paperPositions,sales:paperSales,cashFlows:paperCashFlows,dividends:paperDividends};
  const row=(title,before,after)=>target.append(candidateNode('p',`${title}: ${before} → ${after}`));
  for(const [key,title] of [['positions','매수 기록 수'],['sales','매도 기록 수'],['cashFlows','입출금 기록 수'],['dividends','가정 배당 기록 수']])row(title,current[key].length,incoming[key].length);
  const number=value=>Number.isFinite(value)?String(value):'수치 범위 확인 필요';
  const sum=(rows,value)=>number(rows.reduce((total,item)=>total+value(item),0));
  const groups=new Set([...current.positions,...incoming.positions].map(p=>`${p.market}:${p.ticker}:${p.currency}`));
  for(const group of [...groups].sort()){
    const [market,ticker,currency]=group.split(':'),a=current.positions.filter(p=>`${p.market}:${p.ticker}:${p.currency}`===group),b=incoming.positions.filter(p=>`${p.market}:${p.ticker}:${p.currency}`===group);
    row(`${market} ${ticker} 매수 수량`,sum(a,p=>p.quantity),sum(b,p=>p.quantity));
    row(`${market} ${ticker} 매수 원가·비용 (${currency})`,sum(a,p=>p.buy*p.quantity+(p.fee??0)+(p.tax??0)),sum(b,p=>p.buy*p.quantity+p.fee+p.tax));
  }
  row('가상 매도 순수령 합계 (KRW)',sum(current.sales,t=>t.price*t.quantity-(t.fee??0)-(t.tax??0)),sum(incoming.sales,t=>t.price*t.quantity-t.fee-t.tax));
  row('순입출금 합계 (KRW)',sum(current.cashFlows,f=>f.amount),sum(incoming.cashFlows,f=>f.amount));
  row('가정 배당 합계 (KRW)',sum(current.dividends,d=>d.amount),sum(incoming.dividends,d=>d.amount));
  row('가상 시작 현금 (KRW)',byId('paper-initial-cash').value.trim()||'자동 계산',incoming.initialCash===null?'자동 계산':incoming.initialCash);
  row('계산 시작일',byId('paper-from').value||'미설정',incoming.fromDate||'미설정');row('계산 종료일',byId('paper-to').value||'미설정',incoming.toDate||'미설정');
  target.append(candidateNode('p','시세·성과·기업행동·배당 권리 검증 결과는 백업에 포함되지 않습니다. 요약은 현재 평가액이나 투자 수익이 아닙니다.'));
}
byId('paper-backup-cancel').addEventListener('click',()=>{clearPaperBackupPreview();byId('paper-backup-message').textContent='불러오기 미리보기를 취소했습니다. 현재 기록과 입력한 백업 텍스트는 유지됩니다.';byId('paper-backup-preview').focus();});
function previewPaperBackup(){
  clearPaperBackupPreview();try{pendingPaperBackup=KStockPaperBackup.parse(byId('paper-backup-text').value);const p=pendingPaperBackup;renderPaperBackupComparison(p);byId('paper-backup-cancel').disabled=false;byId('paper-backup-message').textContent=`확인: 매수 ${p.positions.length}건 · 매도 ${p.sales.length}건 · 입출금 ${p.cashFlows.length}건 · 가상 배당 ${p.dividends.length}건. 교체하면 현재 기록이 바뀝니다. 시세·성과·권리는 다시 검증합니다.`;byId('paper-backup-apply').disabled=false;}catch{byId('paper-backup-message').textContent='백업 형식·버전·날짜·수치·종목을 확인하세요. 현재 기록은 유지했습니다.';}
}
function applyPaperBackup(){
  if(!pendingPaperBackup)return;
  const p=pendingPaperBackup;
  const positions=p.positions.map(row=>{const q=paperQuotes.get(`${row.market}:${row.ticker}`)?.priceSnapshot;return {...row,price:q?.status==='READY'&&Number.isFinite(q.close*row.quantity)?q.close:null,date:q?.status==='READY'?q.sessionDate:null};});
  // Validation and projection finish before any existing ledger is replaced.
  paperPositions.splice(0,paperPositions.length,...positions);
  paperCashFlows.splice(0,paperCashFlows.length,...p.cashFlows.map((row,i)=>({...row,id:`flow-${i+1}`})));
  paperSales.splice(0,paperSales.length,...p.sales.map((row,i)=>({...row,id:`sale-${i+1}`})));
  paperDividends.splice(0,paperDividends.length,...p.dividends.map((row,i)=>({...row,id:`dividend-${i+1}`})));
  paperFlowSequence=p.cashFlows.length;paperSaleSequence=p.sales.length;paperDividendSequence=p.dividends.length;
  byId('paper-initial-cash').value=p.initialCash===null?'':String(p.initialCash);byId('paper-from').value=p.fromDate||'';byId('paper-to').value=p.toDate||'';
  invalidatePaperPerformance();renderPaperPositions();renderPaperCashFlows();renderPaperSales();renderPaperDividends();
  byId('paper-backup-message').textContent='가상 기록을 교체했습니다. 기준가격이 없으면 평가를 보류합니다. 누적 성과는 다시 계산하세요.';byId('paper-add').focus();
}
byId('paper-backup-export').addEventListener('click',exportPaperBackup);
byId('paper-backup-preview').addEventListener('click',previewPaperBackup);
byId('paper-backup-apply').addEventListener('click',applyPaperBackup);
byId('paper-backup-text').addEventListener('input',clearPaperBackupPreview);
byId('paper-backup-file').addEventListener('change',async()=>{
  clearPaperBackupPreview();const version=paperBackupReadVersion,file=byId('paper-backup-file').files?.[0];
  if(!file)return;
  try{if(file.size>KStockPaperBackup.MAX_TEXT)throw Error('SIZE');const text=await file.text();if(version!==paperBackupReadVersion)return;byId('paper-backup-text').value=text;previewPaperBackup();}catch{if(version===paperBackupReadVersion)byId('paper-backup-message').textContent='파일을 읽지 못했거나 256KB를 넘었습니다. 현재 기록은 유지했습니다.';}finally{byId('paper-backup-file').value='';}
});
if(typeof window!=='undefined'&&window.KStockNative){byId('paper-backup-download').disabled=true;byId('paper-backup-file').disabled=true;}
byId('paper-backup-download').addEventListener('click',()=>{
  if(!exportPaperBackup())return;try{const text=makePaperBackup(),url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='kstock-paper-ledger.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);byId('paper-backup-message').textContent='브라우저에 파일 저장을 요청했습니다. 저장되지 않으면 백업 텍스트를 직접 복사하세요.';}catch{byId('paper-backup-message').textContent='이 환경에서는 파일 저장을 요청하지 못했습니다. 백업 텍스트를 직접 복사하세요.';}
});





function renderCumulativeChart(row) {
  const container=candidateNode("div",undefined,"performance-chart");
  container.append(candidateNode("h5","종목 누적 참고 수익률 · 벤치마크"));
  const c=row.performance?.cumulative, points=c?.points;
  const valid=row.approvedAtSnapshot === true && row.market === "KR" && c?.basis === "TOTAL_RETURN"
    && ["KOSPI","KOSDAQ"].includes(c?.benchmark) && Array.isArray(points) && points.length>=2 && points.length<=252
    && points.every((x,i)=> /^\d{4}-\d{2}-\d{2}$/.test(x.date) && Number.isFinite(Date.parse(x.date))
      && (!i || points[i-1].date<x.date) && [x.stockReturnPct,x.benchmarkReturnPct].every(v=>Number.isFinite(v)&&v>-100))
    && points[0].stockReturnPct===0 && points[0].benchmarkReturnPct===0;
  if(!valid){container.append(candidateNode("p","누적 성과·벤치마크 미연결: 승인된 종목의 검증 총수익 시계열이 필요합니다."));return container;}
  const values=points.flatMap(x=>[x.stockReturnPct,x.benchmarkReturnPct]), low=Math.min(0,...values),high=Math.max(0,...values),span=high-low||1;
  const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("viewBox","0 0 640 240");svg.setAttribute("role","img");
  svg.setAttribute("aria-label",`${row.ticker}와 ${c.benchmark} 누적 참고 수익률, ${points[0].date}부터 ${points.at(-1).date}, ${low.toFixed(2)}%부터 ${high.toFixed(2)}%`);
  for(const [key,color,dash] of [["stockReturnPct","var(--accent)",""],["benchmarkReturnPct","var(--muted)","6 4"]]){
    const line=document.createElementNS("http://www.w3.org/2000/svg","polyline");line.setAttribute("points",points.map((x,i)=>`${20+i/(points.length-1)*600},${215-(x[key]-low)/span*190}`).join(" "));
    line.setAttribute("fill","none");line.setAttribute("stroke",color);line.setAttribute("stroke-width","3");if(dash)line.setAttribute("stroke-dasharray",dash);svg.append(line);
  }
  container.append(svg);container.append(candidateNode("p",`실선: ${row.ticker} · 점선: ${c.benchmark} · ${points[0].date} ~ ${points.at(-1).date} · 범위 ${low.toFixed(2)}% ~ ${high.toFixed(2)}%`));
  const table=candidateNode("table"),head=candidateNode("tr");
  for(const label of ["거래일","종목 누적 수익률","벤치마크 누적 수익률"]){const th=candidateNode("th",label);th.setAttribute("scope","col");head.append(th);}table.append(head);
  for(const x of points){const tr=candidateNode("tr");for(const v of [x.date,`${x.stockReturnPct.toFixed(2)}%`,`${x.benchmarkReturnPct.toFixed(2)}%`])tr.append(candidateNode("td",v));table.append(tr);}
  const details=candidateNode("details"),summary=candidateNode("summary","차트 수치 확인");details.append(summary,table);container.append(details);
  container.append(candidateNode("p","첫 진입 기준 종가 대비 누적 참고 계산입니다. 모의 포트폴리오 합산·실제 체결 수익률이 아닙니다."));return container;
}

function kstockConnectionFailed() {
  byId("health-dot").className="status-dot";
  byId("health-label").textContent="서버 연결 실패";
  const last=latestCandidateData?.analysisDate;
  byId("dashboard-message").textContent=`서버 연결 실패 · 화면에 남은 자료는 이전 조회 결과입니다.${last ? ` 마지막 분석 기준: ${performanceDate(last)}` : ""}`;
  byId("dashboard-message").className="message error";
}

function renderIndexSeries(index, count) {
  const rows=index.sessions.slice(-count), base=rows[0]?.close;
  const card=candidateNode('article',undefined,'candidate-card');
  card.append(candidateNode('h4',`${index.index} · 가격지수`));
  if(rows.length<2||!base){card.append(candidateNode('p','비교 가능한 거래일이 부족합니다.'));return card;}
  const points=rows.map(x=>({...x,returnPct:(x.close/base-1)*100}));let peak=base,mdd=0;
  for(const x of rows){peak=Math.max(peak,x.close);mdd=Math.min(mdd,x.close/peak-1);}
  card.append(candidateNode('p',`${rows[0].date} ~ ${rows.at(-1).date} · ${rows.length}거래일 · 누적 ${points.at(-1).returnPct.toFixed(2)}% · MDD ${(mdd*100).toFixed(2)}%`));
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 640 240');svg.setAttribute('role','img');svg.setAttribute('aria-label',`${index.index} 가격지수 누적 수익률`);
  const low=Math.min(0,...points.map(x=>x.returnPct)),high=Math.max(0,...points.map(x=>x.returnPct)),span=high-low||1;
  const line=document.createElementNS('http://www.w3.org/2000/svg','polyline');line.setAttribute('points',points.map((x,i)=>`${20+i/(points.length-1)*600},${215-(x.returnPct-low)/span*190}`).join(' '));line.setAttribute('fill','none');line.setAttribute('stroke','var(--accent)');line.setAttribute('stroke-width','3');svg.append(line);
  const wrap=candidateNode('div',undefined,'performance-chart');wrap.append(svg);card.append(wrap);
  const table=candidateNode('table'),head=candidateNode('tr');for(const label of ['거래일','지수','누적 수익률']){const th=candidateNode('th',label);th.setAttribute('scope','col');head.append(th);}table.append(head);
  for(const x of points){const tr=candidateNode('tr');for(const value of [x.date,x.close.toFixed(2),`${x.returnPct.toFixed(2)}%`])tr.append(candidateNode('td',value));table.append(tr);}
  const details=candidateNode('details');details.append(candidateNode('summary','차트 수치 확인'),table);card.append(details);return card;
}
async function loadBenchmarks() {
  const button=byId('benchmark-load'),target=byId('benchmark-results'),message=byId('benchmark-message');button.disabled=true;target.replaceChildren();message.textContent='공식 가격지수 이력을 확인하고 있습니다.';
  try {
    const data=await candidateRequest('/api/v2/benchmarks');
    for(const index of data.indices||[]){const key=index.index.toLowerCase();byId(`market-${key}`).textContent=index.sessions.at(-1)?.close?.toFixed(2)||'—';byId(`market-${key}-date`).textContent=`${index.asOfDate||'자료 없음'} · 가격지수${data.status==='STALE'?' · 이전 자료':''}`;}
    if(data.status!=='READY'||data.indices?.length!==2){message.textContent='지수 데이터가 없거나 최신성 검증이 필요합니다. 성과 비교를 보류합니다.';return;}
    const common=data.indices[0].sessions.map(x=>x.date);
    if(data.indices.some(x=>JSON.stringify(x.sessions.map(r=>r.date))!==JSON.stringify(common))){message.textContent='지수 거래일이 일치하지 않아 비교를 보류합니다.';return;}
    const select=candidateNode('select');select.setAttribute('aria-label','지수 성과 기간');
    for(const [label,count] of [['최근 20거래일',20],['최근 60거래일',60],['전체 확보 기간',common.length]]){const option=candidateNode('option',label);option.value=String(count);option.disabled=count>common.length;select.append(option);}select.value=String(common.length);
    const charts=candidateNode('div');const render=()=>{charts.replaceChildren();for(const index of data.indices)charts.append(renderIndexSeries(index,Number(select.value)));};select.addEventListener('change',render);target.append(select,charts);render();
    for(const id of ['paper-from','paper-to']){byId(id).min=common[0];byId(id).max=common.at(-1);}byId('paper-from').value ||= common[0];byId('paper-to').value ||= common.at(-1);
    message.textContent=`KIS 출처 · ${common.length}개 동일 거래일 · 배당 제외 가격지수. K-Stock 누적 성과와 초과수익률은 기업행동 검증 전 보류합니다.`;
  }catch(error){message.textContent=candidateError(error);for(const key of ['kospi','kosdaq'])byId(`market-${key}-date`).textContent='조회 실패 · 이전 값은 최신성 미확인';}
  finally{button.disabled=false;}
}
byId('benchmark-load').addEventListener('click',loadBenchmarks);
for(const id of ['paper-from','paper-to'])byId(id).addEventListener('change',invalidatePaperPerformance);
function validPaperTimeline(p){
  const near=(a,b)=>Math.abs(a-b)<=1e-6+Number.EPSILON*128*Math.max(1,Math.abs(a),Math.abs(b));
  const fields=['value','cash','marketValue','cashFlow','netCashFlows','netPnl','fees','taxes','dividendCash','drawdownPct','dailyReturnPct','cumulativeReturnPct','realizedPnl','unrealizedPnl'];
  if(p?.status!=='READY'||p.currency!=='KRW'||!['PRICE_RETURN','USER_DIVIDEND_SCENARIO'].includes(p.basis)||!Number.isFinite(p.initialCash)||p.initialCash<=0||!Array.isArray(p.points)||p.points.length<2||p.points.length>1000)return false;
  let flows=0;
  for(const [i,r] of p.points.entries()){
    if(!r||typeof r.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||!Number.isFinite(Date.parse(r.date))||new Date(r.date).toISOString().slice(0,10)!==r.date||i>0&&p.points[i-1].date>=r.date||fields.some(k=>!Number.isFinite(r[k]))||r.value<=0||r.cash< -1e-8||r.marketValue<0||r.fees<0||r.taxes<0||r.dividendCash<0||r.drawdownPct>1e-6||r.drawdownPct< -100)return false;
    flows+=r.cashFlow;
    if(!near(r.value,r.cash+r.marketValue)||!near(r.netCashFlows,flows)||!near(r.netPnl,r.value-p.initialCash-r.netCashFlows)||!near(r.netPnl,r.realizedPnl+r.unrealizedPnl+r.dividendCash))return false;
  }
  const last=p.points.at(-1);
  return ['netCashFlows','netPnl','realizedPnl','unrealizedPnl','fees','taxes','dividendCash'].every(k=>Number.isFinite(p[k])&&near(p[k],last[k]))&&Number.isFinite(p.mddPct)&&near(p.mddPct,Math.min(...p.points.map(r=>r.drawdownPct)));
}
function validPaperAttribution(p){
  if(!validPaperTimeline(p)||p.contributionMethod!=='DAILY_CONTRIBUTIONS_FORWARD_LINKED'||!Array.isArray(p.positions)||!p.positions.length||p.positions.length>50||!Number.isFinite(p.cashWeightPct))return false;
  const near=(a,b)=>Math.abs(a-b)<=1e-6+Number.EPSILON*128*Math.max(1,Math.abs(a),Math.abs(b)),keys=['quantity','remainingCost','marketValue','unrealizedPnl','realizedPnl','fees','taxes','dividendCash','netPnl','portfolioWeightPct','returnContributionPct'],seen=new Set(),last=p.points.at(-1);
  for(const r of p.positions){
    if(!r||typeof r.ticker!=='string'||!/^\d{6}$/.test(r.ticker)||seen.has(r.ticker)||keys.some(k=>!Number.isFinite(r[k]))||['quantity','remainingCost','marketValue','fees','taxes','dividendCash'].some(k=>r[k]< -1e-8)||!near(r.netPnl,r.realizedPnl+r.unrealizedPnl+r.dividendCash)||!near(r.unrealizedPnl,r.marketValue-r.remainingCost)||!near(r.portfolioWeightPct,r.marketValue/last.value*100))return false;seen.add(r.ticker);
  }
  for(const [key,total] of [['marketValue',last.marketValue],['realizedPnl',p.realizedPnl],['unrealizedPnl',p.unrealizedPnl],['fees',p.fees],['taxes',p.taxes],['dividendCash',p.dividendCash],['netPnl',p.netPnl],['returnContributionPct',last.cumulativeReturnPct]])if(!near(p.positions.reduce((sum,r)=>sum+r[key],0),total))return false;
  return near(p.cashWeightPct,last.cash/last.value*100)&&near(p.cashWeightPct+p.positions.reduce((sum,r)=>sum+r.portfolioWeightPct,0),100);
}
function renderPaperAttribution(p){
  const section=candidateNode('section',undefined,'paper-attribution');section.append(candidateNode('h3','종목별 모의 손익·수익 기여도'));
  if(!validPaperAttribution(p)){section.append(candidateNode('p','종목별 손익 합계·수익 기여도 대사 자료 부족으로 상세 표시를 보류합니다.'));return section;}
  section.append(candidateNode('p',`전체 계산 기간 ${p.points[0].date} ~ ${p.points.at(-1).date} · 현금 비중 ${p.cashWeightPct.toFixed(2)}% · 종목별 손익 합계 ${p.netPnl.toFixed(2)} KRW`));
  section.append(candidateNode('p','비중은 현금을 포함한 전체 자산 기준입니다. 수익 기여도(%p)는 종목 자체의 수익률이 아니며, 일별 기여도를 이후 수익률에 연결해 전체 시간가중 수익률과 맞춥니다. 입출금은 손익에 포함하지 않습니다. 전량 매도 기록도 남깁니다.'));
  if(p.basis==='USER_DIVIDEND_SCENARIO')section.append(candidateNode('p','사용자 가상 배당 포함 시나리오 · 공식 총수익·실제 배당 권리 미검증'));
  const label=candidateNode('label','표시할 종목 기록'),filter=candidateNode('select');filter.setAttribute('aria-label','모의 종목 보유 상태');for(const [value,text] of [['all','전체 기록'],['open','현재 보유'],['closed','전량 매도']]){const option=candidateNode('option',text);option.value=value;filter.append(option);}filter.value='all';label.append(filter);const controls=candidateNode('div',undefined,'filter-row');controls.append(label);section.append(controls);const cards=candidateNode('div',undefined,'candidate-list');section.append(cards);
  const draw=()=>{
    cards.replaceChildren();const rows=p.positions.filter(r=>filter.value==='all'||(filter.value==='open'?r.quantity>0:r.quantity===0));
    if(!rows.length){cards.append(candidateNode('p','선택한 상태의 종목 기록이 없습니다.'));return;}
    for(const r of rows){const card=candidateNode('article',undefined,'candidate-card');card.append(candidateNode('h4',`${r.ticker} · ${r.quantity===0?'전량 매도':'현재 보유'}`),candidateNode('p',`잔여 수량 ${r.quantity} · 잔여 원가 ${r.remainingCost.toFixed(2)} KRW · 주식평가 ${r.marketValue.toFixed(2)} KRW · 전체 자산 내 비중 ${r.portfolioWeightPct.toFixed(2)}%`),candidateNode('p',`실현 손익 ${r.realizedPnl.toFixed(2)} · 미실현 손익 ${r.unrealizedPnl.toFixed(2)} · 가상 배당 순수령 ${r.dividendCash.toFixed(2)} · 순손익 ${r.netPnl.toFixed(2)} KRW`),candidateNode('p',`매매 수수료 ${r.fees.toFixed(2)} · 매매 세금 ${r.taxes.toFixed(2)} KRW · 전체 기간 수익 기여도 ${r.returnContributionPct.toFixed(4)}%p`));cards.append(card);}
  };filter.addEventListener('change',draw);draw();return section;
}
function renderPaperTimeline(p){
  const section=candidateNode('section',undefined,'paper-timeline');section.append(candidateNode('h3','일별 모의 자산·현금·손익'));
  if(!validPaperTimeline(p)){section.append(candidateNode('p','일별 잔액·손익 대사 자료 부족으로 차트와 표를 표시하지 않습니다.'));return section;}
  section.append(candidateNode('p',p.basis==='USER_DIVIDEND_SCENARIO'?'사용자 가상 배당 포함 시나리오 · 공식 총수익률 아님':'가상 매매 기록의 가격수익 기준 · 배당 제외'));
  section.append(candidateNode('p','총자산에는 입출금이 반영됩니다. 순손익은 입출금을 제외하며 시간가중 수익률과 구분합니다. 비용·배당은 누계, 입출금은 당일 금액입니다. 선택 구간에서도 수익률과 낙폭의 기준은 전체 계산 시작일입니다.'));
  const controls=candidateNode('div',undefined,'filter-row'),metricLabel=candidateNode('label','표시할 추이'),metric=candidateNode('select'),rangeLabel=candidateNode('label','표시 구간'),range=candidateNode('select');metric.setAttribute('aria-label','모의 추이 지표');range.setAttribute('aria-label','모의 추이 구간');
  for(const [value,label] of [['value','총자산·현금·주식평가 (KRW)'],['netPnl','입출금 제외 누적 순손익 (KRW)'],['cumulativeReturnPct','시간가중 누적 수익률 (%)'],['drawdownPct','고점 대비 낙폭 (%)']]){const option=candidateNode('option',label);option.value=value;metric.append(option);}metric.value='value';
  for(const [value,label] of [['20','최근 20거래일'],['60','최근 60거래일'],['all','전체 계산 기간']]){const option=candidateNode('option',label);option.value=value;option.disabled=value!=='all'&&p.points.length<Number(value);range.append(option);}range.value=p.points.length>20?'20':'all';metricLabel.append(metric);rangeLabel.append(range);controls.append(metricLabel,rangeLabel);section.append(controls);
  const chart=candidateNode('div',undefined,'performance-chart'),tableArea=candidateNode('div',undefined,'paper-timeline-table');tableArea.setAttribute('role','region');tableArea.setAttribute('aria-label','일별 모의 잔액 표 · 좌우 스크롤');tableArea.setAttribute('tabindex','0');section.append(chart,tableArea);
  const draw=()=>{
    chart.replaceChildren();tableArea.replaceChildren();const rows=range.value==='all'?p.points:p.points.slice(-Number(range.value));
    const series=metric.value==='value'?[['value','총자산','var(--accent)',''],['cash','현금','var(--muted)','6 4'],['marketValue','주식평가','var(--positive)','2 4']]:[[metric.value,{netPnl:'누적 순손익',cumulativeReturnPct:'시간가중 누적 수익률',drawdownPct:'고점 대비 낙폭'}[metric.value],'var(--accent)','']];
    const values=rows.flatMap(r=>series.map(([key])=>r[key])),low=Math.min(0,...values),high=Math.max(0,...values),span=high-low||1;
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 640 240');svg.setAttribute('role','img');svg.setAttribute('aria-label',`${series.map(s=>s[1]).join('·')} · ${rows[0].date}부터 ${rows.at(-1).date} · 최소 ${low.toFixed(2)} 최대 ${high.toFixed(2)} · 상세 수치는 일별 표 참조`);
    for(const [key,label,color,dash] of series){const line=document.createElementNS('http://www.w3.org/2000/svg','polyline');line.setAttribute('points',rows.map((r,i)=>`${20+i/(rows.length-1)*600},${215-(r[key]-low)/span*190}`).join(' '));line.setAttribute('fill','none');line.setAttribute('stroke',color);line.setAttribute('stroke-width','3');if(dash)line.setAttribute('stroke-dasharray',dash);svg.append(line);}
    chart.append(svg,candidateNode('p',`${metric.value==='value'?'실선 총자산 / 긴 점선 현금 / 짧은 점선 주식평가':series.map(s=>s[1]).join(' / ')} · 범위 ${low.toFixed(2)} ~ ${high.toFixed(2)} ${metric.value.endsWith('Pct')?'%':'KRW'} · ${rows[0].date} ~ ${rows.at(-1).date} · ${rows.length}거래일`));
    const table=candidateNode('table'),caption=candidateNode('caption','일별 모의 잔액·손익 (금액 KRW, 수익률·낙폭 %)'),head=candidateNode('tr');table.append(caption);
    for(const label of ['거래일','총자산','현금','주식평가','당일 순입출금','누적 순손익','실현 손익','미실현 손익','가상 배당 누계','매매 비용 누계','시간가중 수익률','고점 대비 낙폭']){const th=candidateNode('th',label);th.setAttribute('scope','col');head.append(th);}const thead=candidateNode('thead');thead.append(head);table.append(thead);const body=candidateNode('tbody');
    for(const r of rows){const row=candidateNode('tr'),date=candidateNode('th',r.date);date.setAttribute('scope','row');row.append(date);for(const value of [r.value,r.cash,r.marketValue,r.cashFlow,r.netPnl,r.realizedPnl,r.unrealizedPnl,r.dividendCash,r.fees+r.taxes,r.cumulativeReturnPct,r.drawdownPct])row.append(candidateNode('td',value.toFixed(2)));body.append(row);}table.append(body);tableArea.append(table);
  };
  metric.addEventListener('change',draw);range.addEventListener('change',draw);draw();return section;
}
function clearPaperReport(){
  paperReportSnapshot=null;byId('paper-report-text').value='';byId('paper-report-build').disabled=true;byId('paper-report-download').disabled=true;byId('paper-report-message').textContent='보고서를 비웠습니다. 모의 누적 성과를 다시 계산하세요.';
}
function makePaperReportCsv(p,kind){
  if(!validPaperTimeline(p)||!['daily','positions'].includes(kind)||kind==='positions'&&!validPaperAttribution(p))throw Error('PAPER_REPORT_UNVERIFIED');
  const start=p.points[0].date,end=p.points.at(-1).date,basis=p.basis==='USER_DIVIDEND_SCENARIO'?'사용자 가상 배당 시나리오 · 공식 총수익 아님':'가상 가격수익 · 배당 제외';
  const prefix=['실거래 성과 아님',basis,start,end,'KRW'],header=['기록 구분','계산 유형','계산 시작일','계산 종료일','통화'];let rows;
  if(kind==='daily'){
    header.push('거래일','총자산','현금','주식평가','당일 순입출금','누적 순입출금','누적 순손익','누적 실현 손익','미실현 손익','가상 배당 순수령 누계','매매 수수료 누계','매매 세금 누계','당일 수익률(%)','시간가중 누적 수익률(%)','고점 대비 낙폭(%)');
    rows=p.points.map(r=>[...prefix,r.date,...['value','cash','marketValue','cashFlow','netCashFlows','netPnl','realizedPnl','unrealizedPnl','dividendCash','fees','taxes','dailyReturnPct','cumulativeReturnPct','drawdownPct'].map(k=>r[k])]);
  }else{
    header.push('종목코드(KR 접두사)','잔여 수량','잔여 원가','주식평가','실현 손익','미실현 손익','가상 배당 순수령','순손익','매매 수수료','매매 세금','전체 자산 내 종목 비중(%)','전체 자산 내 현금 비중(%)','전체 기간 수익 기여도(%p)');
    rows=p.positions.map(r=>[...prefix,`KR:${r.ticker}`,...['quantity','remainingCost','marketValue','realizedPnl','unrealizedPnl','dividendCash','netPnl','fees','taxes','portfolioWeightPct'].map(k=>r[k]),p.cashWeightPct,r.returnContributionPct]);
  }
  // Only validated numbers, dates, fixed labels and prefixed KR codes enter CSV cells.
  const cell=v=>'"'+String(v).replaceAll('"','""')+'"';
  return '\uFEFF'+[header,...rows].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}
function buildPaperReport(){
  if(!requireSavedPaperEdit('paper-report-message'))return null;
  const message=byId('paper-report-message');byId('paper-report-text').value='';
  try{if(!paperReportSnapshot||paperReportSnapshot.version!==paperPerformanceVersion)throw Error('STALE');const csv=makePaperReportCsv(paperReportSnapshot.portfolio,byId('paper-report-kind').value);byId('paper-report-text').value=csv;message.textContent='전체 계산 기간의 CSV 텍스트를 만들었습니다. 실제 성과·추천·권리 증빙이 아닙니다.';return csv;}catch{message.textContent='계산 또는 종목별 대사가 완료되지 않았습니다. 보고서를 생성하지 않았습니다.';return null;}
}
byId('paper-report-kind').addEventListener('change',()=>{byId('paper-report-text').value='';byId('paper-report-message').textContent='보고서 종류를 바꿨습니다. CSV 보고서 만들기를 눌러 주세요.';});
byId('paper-report-build').addEventListener('click',buildPaperReport);
byId('paper-report-download').addEventListener('click',()=>{
  const csv=buildPaperReport();if(csv===null)return;
  try{const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`kstock-paper-${byId('paper-report-kind').value}.csv`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);byId('paper-report-message').textContent='브라우저에 CSV 저장을 요청했습니다. 저장되지 않으면 보고서 텍스트를 복사하세요.';}catch{byId('paper-report-message').textContent='이 환경에서는 파일 저장을 요청하지 못했습니다. CSV 텍스트를 복사하세요.';}
});
function clearPaperInputReview(){
  for(const id of paperInputErrorTargets){byId(id).removeAttribute('aria-invalid');byId(id).removeAttribute('aria-describedby');}paperInputErrorTargets.clear();
  byId('paper-input-review-results').replaceChildren(candidateNode('p','기록이 변경되면 입력 점검을 다시 실행하세요. 서버 거래일·근거 검증은 별도입니다.'));
}
function inspectPaperInput(){
  const issues=[],fromDate=byId('paper-from').value,toDate=byId('paper-to').value,cashText=byId('paper-initial-cash').value.trim();
  const day=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
  const issue=(target,message)=>issues.push({target,message});
  if(!day(fromDate))issue('paper-from','시작 거래일에 유효한 날짜를 입력하세요.');
  if(!day(toDate))issue('paper-to','종료 거래일에 유효한 날짜를 입력하세요.');
  if(day(fromDate)&&day(toDate)&&fromDate>=toDate)issue('paper-to','종료 거래일은 시작 거래일보다 뒤여야 합니다.');
  if(!paperPositions.length||paperPositions.length>50||paperPositions.some(p=>!p||p.market!=='KR'||!/^\d{6}$/.test(p.ticker||'')||![p.buy,p.quantity].every(v=>Number.isFinite(v)&&v>0)||![p.fee??0,p.tax??0].every(v=>Number.isFinite(v)&&v>=0)))issue('paper-results','한국 종목의 양수 매수가·수량과 0 이상의 비용을 확인하세요. 미국 종목과 통화를 혼합하지 않습니다.');
  const openingCost=paperPositions.reduce((sum,p)=>sum+(p?.buy??NaN)*(p?.quantity??NaN)+(p?.fee??0)+(p?.tax??0),0),initialCash=cashText?Number(cashText):openingCost;
  if(!Number.isFinite(openingCost))issue('paper-results','매수 원가·비용 합계가 계산 가능한 범위를 넘었습니다.');
  if(!Number.isFinite(initialCash)||initialCash<=0)issue('paper-initial-cash','가상 시작 현금은 양수여야 합니다. 비우면 매수액과 비용 합계를 사용합니다.');
  const holdings=new Map();for(const p of paperPositions)if(p)holdings.set(p.ticker,(holdings.get(p.ticker)||0)+p.quantity);
  if([...holdings.values()].some(n=>!Number.isFinite(n)))issue('paper-results','종목별 합산 수량이 계산 가능한 범위를 넘었습니다.');
  const within=date=>day(date)&&day(fromDate)&&day(toDate)&&date>=fromDate&&date<=toDate;
  if(paperDividends.length>500||paperDividends.some(d=>!d||!within(d.date)||!holdings.has(d.ticker)||!Number.isFinite(d.amount)||d.amount<=0))issue('paper-dividend-results','가상 배당 날짜가 계산 기간 밖이거나 매수 기록·양수 순수령액이 없습니다.');
  if(paperSales.length+paperPositions.length>500||paperSales.some(t=>!t||!within(t.date)||!holdings.has(t.ticker)||![t.quantity,t.price].every(v=>Number.isFinite(v)&&v>0)||![t.fee??0,t.tax??0].every(v=>Number.isFinite(v)&&v>=0)))issue('paper-sale-results','매도 날짜가 계산 기간 밖이거나 매수 기록·수량·가격·비용이 올바르지 않습니다.');
  if(paperCashFlows.length>500||paperCashFlows.some(f=>!f||!within(f.date)||f.timing!=='BEFORE_OPEN'||!Number.isFinite(f.amount)||f.amount===0))issue('paper-flow-results','입출금 날짜가 계산 기간 밖이거나 금액·장 시작 전 처리 조건이 올바르지 않습니다.');
  const sold=new Map();for(const t of paperSales)if(t)sold.set(t.ticker,(sold.get(t.ticker)||0)+t.quantity);
  if([...sold].some(([ticker,n])=>!Number.isFinite(n)||n>(holdings.get(ticker)||0)))issue('paper-sale-results','가상 매도 수량이 현재 매수 기록의 보유 수량을 넘습니다. 매수 기록 삭제 후 매도 기록도 확인하세요.');
  if(!issues.length){
    let cash=initialCash;
    const dates=[...new Set([fromDate,...paperCashFlows.map(f=>f.date),...paperSales.map(t=>t.date),...paperDividends.map(d=>d.date)])].sort();
    for(const date of dates){
      cash+=paperCashFlows.filter(f=>f.date===date).reduce((sum,f)=>sum+f.amount,0);
      if(!Number.isFinite(cash)||cash< -1e-8){issue('paper-flow-results',`${date} 장 시작 전 출금 가능액이 부족하거나 금액 범위를 넘었습니다. 같은 날 매도·가상 배당 대금은 아직 반영되지 않습니다.`);break;}
      if(date===fromDate)cash-=openingCost;
      if(!Number.isFinite(cash)||cash< -1e-8){issue('paper-initial-cash',`${date} 매수액·비용에 비해 시작 현금과 당일 입금이 부족합니다.`);break;}
      for(const t of paperSales.filter(t=>t.date===date)){cash+=t.price*t.quantity-(t.fee??0)-(t.tax??0);if(!Number.isFinite(cash)||cash< -1e-8){issue('paper-sale-results',`${date} 매도 비용 또는 금액 범위를 확인하세요. 같은 날 가상 배당으로 매도 비용을 충당하지 않습니다.`);break;}}
      if(issues.length)break;
      cash+=paperDividends.filter(d=>d.date===date).reduce((sum,d)=>sum+d.amount,0);
      if(!Number.isFinite(cash)){issue('paper-dividend-results','가상 배당 합계가 계산 가능한 금액 범위를 넘었습니다.');break;}
      if(cash===0&&[...holdings].every(([ticker,n])=>n-paperSales.filter(t=>t.ticker===ticker&&t.date<=date).reduce((sum,t)=>sum+t.quantity,0)===0)){issue('paper-flow-results',`${date} 전액 매도·출금 후 계산 자산이 0입니다. 시간가중 수익률을 계산할 자본이 필요합니다.`);break;}
    }
  }
  return {issues,initialCash,fromDate,toDate,openingCost};
}
function renderPaperInputReview(review){
  clearPaperInputReview();const target=byId('paper-input-review-results');target.replaceChildren();
  if(!review.issues.length){target.append(candidateNode('p',`로컬 입력 점검 통과 · 가상 시작 현금 ${review.initialCash.toFixed(2)} KRW · 매수 원가·비용 ${review.openingCost.toFixed(2)} KRW. 거래일·시세·기업행동은 서버에서 다시 검증합니다. 실제 투자·배당 검증 완료가 아닙니다.`));return;}
  const descriptions=new Map();
  review.issues.forEach((issue,index)=>{const row=candidateNode('article',undefined,'candidate-card'),text=candidateNode('p',issue.message),id=`paper-input-error-${index}`;text.id=id;row.append(text);const field=byId(issue.target);field.setAttribute('aria-invalid','true');const ids=[...(descriptions.get(issue.target)||[]),id];descriptions.set(issue.target,ids);field.setAttribute('aria-describedby',ids.join(' '));paperInputErrorTargets.add(issue.target);const move=candidateNode('button','문제 위치로 이동','candidate-button');move.type='button';move.setAttribute('aria-label',issue.message+' 문제 위치로 이동');move.addEventListener('click',()=>{resetPaperRecordFilter();const parent=field.closest?.('details');if(parent)parent.open=true;if(!field.matches?.('input,select,textarea,button,a'))field.setAttribute('tabindex','-1');field.scrollIntoView?.({block:'center'});field.focus();});row.append(move);target.append(row);});
}
byId('paper-input-check').addEventListener('click',()=>{const review=inspectPaperInput();if(review.issues.length)invalidatePaperPerformance();renderPaperInputReview(review);});
async function loadPaperPerformance() {
  const button=byId('paper-performance-load'),message=byId('paper-performance-message'),target=byId('paper-performance-results'),version=paperPerformanceVersion;
  if(!requireSavedPaperEdit('paper-performance-message'))return;
  target.replaceChildren();clearPaperReport();
  const review=inspectPaperInput();renderPaperInputReview(review);
  if(review.issues.length){message.textContent=review.issues.map(issue=>issue.message).join(' ');byId('paper-input-review').focus();return;}
  const {initialCash,fromDate,toDate}=review;
  button.disabled=true;message.textContent='원주가·기업행동·거래일을 검증하고 있습니다.';
  try {
    const requestToken=sessionToken;
    const response=await fetch('/api/v2/paper/performance',{method:'POST',headers:{'Content-Type':'application/json',...(sessionToken?{Authorization:`Bearer ${sessionToken}`}:{})},body:JSON.stringify({positions:paperPositions,fromDate,toDate,initialCash,cashFlows:paperCashFlows,sales:paperSales,dividends:paperDividends}),cache:'no-store',redirect:'error'});
    if(response.status===401){if(sessionToken===requestToken)sessionToken='';throw new Error('AUTH');}if(response.status===400)throw new Error('PAPER_INPUT');if(!response.ok)throw new Error('UNAVAILABLE');const data=await response.json();if(version!==paperPerformanceVersion)return;
    if(data.status!=='READY'){const reason=data.reason||data.portfolio?.reason;const sourceMessages={SOURCE_DATA_STALE:'누적 성과 보류: 서버의 저장 시세·지수 자료가 오래되었습니다. 새 근거로 갱신한 뒤 다시 계산하세요. 입력 점검 통과와 별도입니다.',RAW_PRICE_AND_CORPORATE_ACTIONS_REQUIRED:'누적 성과 보류: 서버에 검증된 원주가·기업행동 근거가 부족합니다. 가상 입력으로 이 조건을 해제할 수 없습니다.',REQUESTED_RANGE_UNAVAILABLE:'누적 성과 보류: 요청한 시작·종료 거래일의 서버 가격 자료가 없습니다. 기간과 저장 거래일 범위를 확인하세요. 날짜를 자동 이동하지 않습니다.',ACTION_LEDGER_REVIEW_REQUIRED:'누적 성과 보류: 해당 기간의 기업행동 변동 대사가 필요합니다. 입력 점검만으로 성과를 활성화하지 않습니다.',PRICE_CURRENCY_BASIS_OR_CALENDAR_MISMATCH:'누적 성과 보류: 종목별 통화·원주가 기준·거래일이 일치하지 않습니다. 서버 원천 자료 검증이 필요합니다.'};if(Object.hasOwn(sourceMessages,reason)){message.textContent=sourceMessages[reason];return;}if(['POSITION_RECONCILIATION','CONTRIBUTION_RECONCILIATION'].includes(reason)){message.textContent='누적 성과 보류: 종목별 손익·수익 기여도 합계가 전체 결과와 일치하지 않아 검토가 필요합니다.';return;}if(['INVALID_DIVIDEND','DUPLICATE_OR_MISSING_DIVIDEND_ID'].includes(reason)){message.textContent='누적 성과 보류: 가상 배당 날짜가 검증된 거래일인지, 금액·중복 기록이 올바른지 확인하세요.';return;}if(['SELL_EXCEEDS_HOLDINGS','INVALID_OR_DUPLICATE_TRADE'].includes(reason)){message.textContent='누적 성과 보류: 매도 거래일·보유 수량·비용을 확인하세요.';return;}if(['INSUFFICIENT_CASH','INVALID_FLOW_OR_CAPITAL'].includes(reason)){message.textContent='누적 성과 보류: 시작 현금·매수 비용·출금 가능액을 확인하세요. 입출금은 장 시작 전에 반영합니다.';return;}if(reason==='UNSUPPORTED_CASH_FLOW'){message.textContent='누적 성과 보류: 입출금 날짜가 검증된 거래일이 아닙니다.';return;}message.textContent='누적 성과 보류: 원주가와 기업행동 검증 또는 요청 기간의 거래일 자료가 부족합니다. 추정 수익률을 표시하지 않습니다.';return;}
    const p=data.portfolio;if(!validPaperTimeline(p)){message.textContent='누적 성과 보류: 일별 잔액·손익 대사 자료가 부족합니다.';return;}if(p.basis==='USER_DIVIDEND_SCENARIO')target.append(candidateNode('p','사용자 가상 배당 시나리오 · 공식 총수익률 아님 · 배당 권리 미검증'));target.append(candidateNode('p',`시간가중 누적 수익률 ${p.points.at(-1).cumulativeReturnPct.toFixed(2)}% · MDD ${p.mddPct.toFixed(2)}% · 평가금액 ${p.points.at(-1).value.toFixed(2)} KRW · 실현 ${p.realizedPnl.toFixed(2)} · 미실현 ${p.unrealizedPnl.toFixed(2)} · 순입출금 ${p.netCashFlows.toFixed(2)} · 입출금 제외 순손익 ${p.netPnl.toFixed(2)} · 수수료 ${p.fees.toFixed(2)} · 세금 ${p.taxes.toFixed(2)} · 가상 배당 순수령 ${(p.dividendCash||0).toFixed(2)}`));
    target.append(renderPaperAttribution(p),renderPaperTimeline(p));
    for(const comparison of data.comparisons||[])target.append(candidateNode('p',comparison.status==='READY'?`${comparison.index} 대비 초과수익률 ${comparison.points.at(-1).excessReturnPct.toFixed(2)}%`:`${comparison.index} 비교 보류 · ${p.basis==='USER_DIVIDEND_SCENARIO'?'사용자 가상 배당은 공식 총수익률·가격지수 초과수익과 비교하지 않습니다':'동일 거래일·수익률 기준 필요'}`));
    paperReportSnapshot={version,portfolio:JSON.parse(JSON.stringify(p))};byId('paper-report-build').disabled=false;byId('paper-report-download').disabled=typeof window!=='undefined'&&Boolean(window.KStockNative);byId('paper-report-message').textContent='현재 계산 결과를 CSV 보고서로 만들 수 있습니다. 전체 계산 기간을 사용합니다.';
    message.textContent=p.basis==='USER_DIVIDEND_SCENARIO'?'사용자 가정 배당을 장 마감 후 현금에 반영한 시나리오입니다. 입출금은 수익에서 제외하며 실제 배당 권리·총수익률은 확인하지 않습니다.':'가상 기록의 성과입니다. 입력한 매수·매도 비용과 장 시작 전 입출금을 반영한 시간가중 수익률이며 배당은 제외합니다. 실제 주문은 발생하지 않습니다.';
  }catch(error){if(version===paperPerformanceVersion)message.textContent=error.message==='PAPER_INPUT'?'서버가 입력을 거부했습니다. 입력 점검으로 기간·수량·금액을 확인하세요. 기록은 유지했습니다.':candidateError(error);}finally{button.disabled=false;}
}
byId('paper-performance-load').addEventListener('click',loadPaperPerformance);

function renderObservedStockChart(result,ticker) {
  const target=candidateNode('div',undefined,'performance-chart'),select=candidateNode('select'),plot=candidateNode('div');select.setAttribute('aria-label','종목과 지수 성과 기간');
  if(result.status!=='READY'||result.basis!=='PRICE_RETURN'||!Array.isArray(result.points)||result.points.length<2){target.append(candidateNode('p','자료 부족 · 검증된 가격 수익률이 필요합니다.'));return target;}
  for(const [label,count] of [['최근 20거래일',20],['최근 60거래일',60],['전체 공통 관측기간',result.points.length]]){const o=candidateNode('option',label);o.value=String(count);o.disabled=count>result.points.length;select.append(o);}select.value=String(result.points.length);
  const draw=()=>{
    const rows=result.points.slice(-Number(select.value));
    if(rows.some(x=>![x.stockReturnPct,x.benchmarkReturnPct].every(Number.isFinite)))return;
    const points=rows.map(x=>({date:x.date,stockReturnPct:((1+x.stockReturnPct/100)/(1+rows[0].stockReturnPct/100)-1)*100,benchmarkReturnPct:((1+x.benchmarkReturnPct/100)/(1+rows[0].benchmarkReturnPct/100)-1)*100}));
    const low=Math.min(0,...points.flatMap(x=>[x.stockReturnPct,x.benchmarkReturnPct])),high=Math.max(0,...points.flatMap(x=>[x.stockReturnPct,x.benchmarkReturnPct])),span=high-low||1;
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 640 240');svg.setAttribute('role','img');svg.setAttribute('aria-label',`${ticker}와 ${result.index} 동일 시작일 누적 가격 수익률`);
    for(const [key,color,dash] of [['stockReturnPct','var(--accent)',''],['benchmarkReturnPct','var(--muted)','6 4']]){const line=document.createElementNS('http://www.w3.org/2000/svg','polyline');line.setAttribute('points',points.map((x,i)=>`${20+i/(points.length-1)*600},${215-(x[key]-low)/span*190}`).join(' '));line.setAttribute('fill','none');line.setAttribute('stroke',color);line.setAttribute('stroke-width','3');if(dash)line.setAttribute('stroke-dasharray',dash);svg.append(line);}
    plot.replaceChildren(svg,candidateNode('p',`실선 ${ticker} · 점선 ${result.index} · ${points[0].date} ~ ${points.at(-1).date} · 배당 제외 · 시작일 0% · 연율화 없음`));
    const table=candidateNode('table'),head=candidateNode('tr');for(const text of ['거래일','종목 누적(%)','지수 누적(%)']){const th=candidateNode('th',text);th.setAttribute('scope','col');head.append(th);}table.append(head);for(const row of points){const tr=candidateNode('tr');for(const text of [row.date,row.stockReturnPct.toFixed(2),row.benchmarkReturnPct.toFixed(2)])tr.append(candidateNode('td',text));table.append(tr);}const details=candidateNode('details');details.append(candidateNode('summary','차트 수치 확인'),table);plot.append(details);
  };
  select.addEventListener('change',draw);target.append(select,plot);draw();return target;
}
function researchReasonLabel(key) {
  return ({evidence_gate_failed:'분석 근거 확인 필요',bear_case_severe:'반대 논거 위험이 큼',valuation_risk:'가치평가 검증 필요',weak_capital_action:'확인된 자본 행동 부족',stale_evidence:'오래된 근거',low_consensus:'신호 간 합의 부족',risk_cap_reached:'위험 한도 도달',QUALITY_OR_CURRENCY:'재무·가격 품질과 통화 확인 필요',POINT_IN_TIME:'공개 시점과 가격 기준일 확인 필요',FISCAL_PERIOD:'동일 회계기간 확인 필요',CORPORATE_ACTION_REVIEW:'분할·배당·증자 확인 필요',SHARE_DATE_OR_EARNINGS_DEFINITION:'주식수 기준일·이익 범위 확인 필요',MARKET_CAP:'검증된 시가총액 필요',HISTORY_COVERAGE:'3개 연도·700일 이상의 과거 표본 필요',PER:'주가수익비율 비교 표본 부족',PBR:'주가순자산비율 비교 표본 부족',PSR:'주가매출비율 비교 표본 부족',LOSS_OR_ZERO_PROFIT:'순이익이 0 이하',NON_POSITIVE_EQUITY:'자본이 0 이하',HIGH_LIABILITIES:'높은 부채 비율',EXISTING_RISK_BLOCK:'거래정지 또는 위험 차단',AMOUNT_UNIT_MISMATCH:'금액 단위 불일치',STATEMENT_BASIS_INVALID:'연결·별도 기준 미확인',SHARE_ALIGNMENT_BLOCKED:'주가·주식수 기준일 정렬 근거 부족'})[key] || '추가 자료 검증 필요';
}

// Shared Web/WebView status contract. Refresh reads local state only; it never starts collection.
function validationTime(value){const d=new Date(value);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(d):'시각 미확인';}
const validationLabels = {QUEUED:'대기',RUNNING:'실행 중',COLLECTING:'수집 중',VALIDATING:'검증 중',VERIFIED:'검증 완료',PARTIAL:'자료 부족',BLOCKED:'차단',FAILED:'실패'};
function validationReason(reason) {
  const labels={CORPORATE_ACTION_UNVERIFIED:'기업행동 검증 대기',AMOUNT_UNIT_MISMATCH:'금액 단위 불일치',FINANCIAL_PUBLICATION_UNVERIFIED:'재무 공시 이용 가능일 미확인',VERIFIED_EV_INPUTS_REQUIRED:'기업가치 계산용 현금·부채 검증 필요',VERIFIED_EBITDA_INPUTS_REQUIRED:'같은 기간 EBITDA 근거 필요',STALE_DATA:'자료 최신성 확인 필요',SOURCE_CONFLICT:'원천자료 상충 검증 필요',METRIC_MISSING:'배수 계산 자료 부족',CORRECTION_REVIEW_REQUIRED:'정정 공시 검증 대기',KRX_AUTH_REQUIRED:'KRX 인증 자료 필요',DISABLED:'외부 수집 비활성',NOT_CONFIGURED:'수집 경로 설정 필요',SOURCE_ARCHIVED:'원천자료 저장 · 계산 검증 대기',COLLECT_OFFICIAL_EVIDENCE:'승인된 공식 원천자료 수집',EXTERNAL_COLLECTION_ACTIVATION_REQUIRED:'승인 범위 확인 후 외부 수집 활성화 필요',BOUNDED_RETRY_AFTER_BACKOFF:'호출 간격 이후 제한된 재시도',NORMALIZE_AND_VALIDATE_OFFICIAL_EVIDENCE:'공식 원천자료 정규화·검증',WAIT_FOR_NEW_OFFICIAL_EVIDENCE:'새 공식 자료 확보 대기',OFFICIAL_CAUSAL_EXPLANATION_NOT_ESTABLISHED:'공식 원인 설명 미확보',AUTH_BLOCKED:'인증 차단 · 공식 인증 자료 필요',EXTERNAL_COLLECTION_DISABLED:'외부 자동 수집 비활성',SOURCE_HANDLER_NOT_CONFIGURED:'승인된 수집 경로 설정 필요',RETRY_BACKOFF:'일시 장애 재시도 대기',SOURCE_RATE_LIMIT:'데이터 소스 호출 간격 대기',RETRY_EXHAUSTED:'재시도 한도 도달',NEW_OFFICIAL_EVIDENCE_REQUIRED:'새 공식 자료 확보 후 재검증',MISSING_MARKET_CAP:'동일 기준일 시가총액 필요',SHARE_COUNT_DATE_OR_PUBLICATION_UNVERIFIED:'주식수 기준일·공시일 검증 필요',CURRENT_CAPITAL_SOURCE_UNVERIFIED:'현재 자본 원천 검증 대기',MISSING_FINANCIAL_DATA:'재무 자료 부족',BUSINESS_COMPARABILITY_UNVERIFIED:'연결기업 사업 비교 검증 대기',BUSINESS_MODEL_MISMATCH:'사업 성격 차이로 제외',FINANCIAL_PERIOD_MISMATCH:'재무 회계기간 불일치',OFFICIAL_SOURCE_REQUIRED:'공식 원천자료 필요',PERIOD_NORMALIZATION_REQUIRED:'연속 분기·TTM 검증 필요',PRICE_SOURCE_UNVERIFIED:'가격 원천 검증 대기',MISSING_PRICE:'가격 자료 부족',PRICE_DATE_UNVERIFIED:'가격 기준일 미확인',CURRENCY_MISMATCH:'통화 불일치',MISSING_SHARE_COUNT:'발행주식수 자료 부족',VALUATION_DATE_MISMATCH:'평가 기준일 불일치',BUSINESS_SOURCE_UNVERIFIED:'사업 근거 검증 대기',CAPITAL_DATE_MISSING:'시가총액 기준일 미확인'};
  const pbr={PBR_CAPITAL_DEFINITION_UNVERIFIED:'시가총액에 포함한 주식 범위 확인 필요',PBR_CLASS_BOOK_ALLOCATION_UNVERIFIED:'주식 종류별 장부가치 배분 근거 필요',PBR_CAPITAL_RECONCILIATION_FAILED:'공식 시가총액과 계산 근거 대사 필요',PBR_CURRENCY_UNIT_MISMATCH:'PBR 통화·금액 단위 검증 필요',PBR_FUTURE_OR_UNKNOWN_PUBLICATION:'평가일 이전 공개 여부 확인 필요',PBR_CORPORATE_ACTION_UNVERIFIED:'PBR 기업행동 검증 필요',PBR_CORRECTION_UNVERIFIED:'PBR 정정 공시 검증 필요',PBR_BOOK_VALUE_UNVERIFIED:'PBR 장부가치 정의 검증 필요',PBR_SHARE_CLASS_SCOPE_MISMATCH:'보통주·우선주 적용 범위 검증 필요',PBR_MARKET_CAP_UNVERIFIED:'PBR 동일 기준일 시가총액 필요',PBR_SHARE_COUNT_UNVERIFIED:'PBR 동일 기준일 주식수 필요'};
  return labels[reason]||pbr[reason]||reason;
}
function validationBadge(state) {
  const n=candidateNode('span',validationLabels[state]||'확인 전',`status-badge status-${validationLabels[state]?state.toLowerCase():'partial'}`);
  n.setAttribute('aria-label',`검증 상태: ${n.textContent}`);return n;
}
function validationTable(target,caption,headers,rows) {
  const wrap=candidateNode('div',undefined,'comparison-table');wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label',caption+' · 가로 스크롤');
  const t=candidateNode('table'),head=candidateNode('thead'),tr=candidateNode('tr'),body=candidateNode('tbody');t.append(candidateNode('caption',caption));
  for(const text of headers){const th=candidateNode('th',text);th.setAttribute('scope','col');tr.append(th);}head.append(tr);
  for(const row of rows){const r=candidateNode('tr');for(const value of row){const cell=candidateNode('td');if(value&&typeof value==='object')cell.append(value);else cell.textContent=String(value??'미확인');r.append(cell);}body.append(r);}
  t.append(head,body);wrap.append(t);target.append(wrap);return wrap;
}
function validationCount(target,label,value) {
  const card=candidateNode('article',undefined,'metric-card');card.append(candidateNode('span',label),candidateNode('strong',Number.isInteger(value)&&value>=0?String(value):'미확인'));target.append(card);
}
function validationMetricCell(result) {
  const cell=candidateNode('div',undefined,'metric-comparison-cell');
  const verified=result?.verificationStatus==='VERIFIED'&&Number.isFinite(result.value);
  cell.append(candidateNode('strong',verified?`${new Intl.NumberFormat('ko-KR',{maximumFractionDigits:3}).format(result.value)}배`:'—'));
  const reasons=[...new Set([...(result?.comparisonExclusionReasons||[]),...(result?.reasons||[]),...(result?.exclusionReasons||[])])];
  cell.append(candidateNode('p',`${verified?'계산 근거 확인됨':'자료 부족'} · ${result?.comparisonStatus==='ELIGIBLE'?'비교 표본 유효':'비교 보류'} · ${reasons.map(validationReason).join(' / ')||'판정 근거 확인 전'}`));return cell;
}
function pbrReason(reason) {
  return ({PBR_ALL_CLASS_COMPONENTS_UNVERIFIED:'보통주·우선주별 가격과 시가총액 구성 근거 필요',PBR_ALL_CLASS_SHARE_RECONCILIATION_FAILED:'종류별 주식수와 전체 주식수 대사 필요',PBR_CLASS_BOOK_ALLOCATION_UNVERIFIED:'해당 주식 종류에 귀속되는 장부가치 검증 필요',PBR_PRICE_UNVERIFIED:'평가일 종가와 공식 출처 확인 필요',PBR_MARKET_CAP_UNVERIFIED:'동일 기준일 공식 시가총액 필요',PBR_SHARE_COUNT_UNVERIFIED:'발행·자기·유통주식수 및 기준일 확인 필요',PBR_CAPITAL_DEFINITION_UNVERIFIED:'시가총액의 주식수 정의 확인 필요',PBR_CAPITAL_RECONCILIATION_FAILED:'가격과 주식수로 시가총액 대사 필요',PBR_BOOK_VALUE_UNVERIFIED:'장부가치 원천과 금액 검증 필요',PBR_FINANCIAL_BASIS_UNVERIFIED:'재무 기준일과 연결·별도 확인 필요',PBR_BOOK_VALUE_DEFINITION_MISMATCH:'자본총계와 지배기업 소유주지분 구분 필요',PBR_SHARE_CLASS_SCOPE_MISMATCH:'시가총액과 자본의 보통주·우선주 범위 일치 필요',PBR_CURRENCY_UNIT_MISMATCH:'통화·금액 단위 정규화 필요',PBR_FUTURE_OR_UNKNOWN_PUBLICATION:'분석일 이전 공시 이용 가능 시점 확인 필요',PBR_CORPORATE_ACTION_UNVERIFIED:'기업행동 영향과 중복 조정 여부 확인 필요',PBR_CORRECTION_UNVERIFIED:'정정 공시와 최초 공시 대조 필요',VALUATION_DATE_UNVERIFIED:'평가 기준일 확인 필요'})[reason]||validationReason(reason);
}
function renderPbrEvidence(job,panel) {
  const review=job.pbrValidation,section=candidateNode('section',undefined,'pbr-evidence');section.setAttribute('aria-label','PBR 입력 검증 근거');
  section.append(candidateNode('h4','PBR 입력 검증'));
  if(!review){section.append(candidateNode('p','검증 대기 · PBR 입력 근거가 아직 연결되지 않았습니다.'));panel.append(section);return;}
  const verified=review.verificationStatus==='VERIFIED'&&Number.isFinite(review.value);
  section.append(candidateNode('strong',verified?`PBR ${numberFormat.format(review.value)}배`:'PBR 계산 보류'),candidateNode('p',`검증 우선순위 ${Number.isInteger(review.priorityRank)?review.priorityRank:'미확인'} · 원천 필드 확보 ${review.completeness?.observed??'미확인'}/${review.completeness?.total??'미확인'} · 기준일·정의 검증 별도 · ${review.eligible===true?'비교 표본 유효':'동종기업 비교 보류'} · 추천 보류`));
  section.append(candidateNode('p',`다음 자동 검증 ${job.nextValidationAt?validationTime(job.nextValidationAt):'예정 미확인'} · 새 자료 수집과 저장 근거 재검증은 별개입니다.`));
  const inputs=review.inputs||{},grid=candidateNode('div',undefined,'pbr-input-grid');
  for(const [key,label] of [['price','종가'],['marketCap','시가총액'],['shares','주식수'],['bookValue','장부가치'],['corporateActions','기업행동'],['correction','정정 공시'],['businessFit','사업 적합성']]){
    const input=inputs[key]||{},card=candidateNode('article',undefined,'pbr-input-card');
    card.append(candidateNode('h5',label),candidateNode('p',input.verificationStatus==='VERIFIED'?'확인됨':input.verificationStatus==='SOURCE_ACCOUNT_IDENTIFIED'?'원천 계정 확인 · 금액 정의 검증 대기':'자료 부족 · 검증 대기'));
    if(['price','marketCap','bookValue'].includes(key))card.append(candidateNode('p',Number.isFinite(input.value)?`${numberFormat.format(input.value)} ${input.currency||'통화 미확인'} · 단위 ${input.unit||input.currency||'미확인'}${input.verificationStatus==='VERIFIED'?'':' · 미검증 원천값(계산 제외)'}`:'금액 자료 부족'));
    if(key==='shares')card.append(candidateNode('p',`발행 ${Number.isFinite(input.issuedShares)?numberFormat.format(input.issuedShares)+'주':'미확인'} · 자기 ${Number.isFinite(input.treasuryShares)?numberFormat.format(input.treasuryShares)+'주':'미확인'} · 유통 ${Number.isFinite(input.outstandingShares)?numberFormat.format(input.outstandingShares)+'주':'미확인'}`));
    card.append(candidateNode('p',`기준일 ${input.asOfDate||input.coverageEnd||'미확인'} · 주식 범위 ${input.shareClassScope||'미확인'}`));
    if(key==='bookValue')card.append(candidateNode('p',`재무 기준 ${input.consolidationType==='CFS'?'연결':input.consolidationType==='OFS'?'별도':'미확인'} · 계정 ${input.accountId||'미확인'} · 공시 이용 가능 ${input.availableAt||'미확인'}`));
    if(key==='correction')card.append(candidateNode('p',`정정 상태 ${input.status==='CORRECTED_VERIFIED'?'정정 확인':input.status==='NOT_CORRECTED'?'정정 없음 확인':'검증 대기'}`));
    if(typeof input.sourceUrl==='string'&&/^https:\/\//.test(input.sourceUrl)){const link=candidateNode('a','공식 원천자료');link.href=input.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';card.append(link);}else card.append(candidateNode('p','출처 미확인'));
    grid.append(card);
  }
  section.append(grid,candidateNode('h5','계산·비교 보류 사유'));
  for(const reason of [...new Set([...(review.reasons||[]),...(review.comparisonReasons||[])])])section.append(candidateNode('p',pbrReason(reason)));
  panel.append(section);
}
function renderCollectionStatus(data) {
  const target=byId('agent-collection');target.replaceChildren();
  if(!data){target.append(candidateNode('p','수집 상태 미확인 · 외부 수집 실행 여부를 추정하지 않습니다.','empty-state'));return;}
  target.append(candidateNode('p',`Data Collection Worker · ${data.worker?.running===true?'수집 실행 중':data.worker?.running===false?'현재 수집 작업 없음':'실행 미확인'} · ${data.enabled===true?'외부 수집 활성':data.enabled===false?'외부 수집 비활성':'외부 수집 여부 미확인'} · ${data.mode==='SAVED_SOURCE_REPLAY'?'저장 원천자료 재검증 · 새 외부 수집 아님':data.mode==='MANUAL_READ_ONLY_COMPLETED'?'수동 공식자료 확인 완료 · 외부 자동 수집 없음':''}`));
  target.append(candidateNode('p',`마지막 실행 ${data.lastRunAt?validationTime(data.lastRunAt):'기록 없음'} · 다음 실행 ${data.nextRunAt?validationTime(data.nextRunAt):'예정 없음'}`));
  const cards=candidateNode('div',undefined,'validation-counts');validationCount(cards,'수집 근거 보유 기업',data.counts?.success);validationCount(cards,'실패 기업',data.counts?.FAILED);validationCount(cards,'인증 차단 소스',Array.isArray(data.sources)?data.sources.filter(source=>source.status==='AUTH_BLOCKED').length:undefined);validationCount(cards,'자료 미변경',data.counts?.unchanged);target.append(cards);
  for(const source of data.sources||[])target.append(candidateNode('p',`${source.name||source.source||'데이터 소스'} · ${validationReason(source.reason||source.status||'미확인')} · 마지막 수집 ${source.lastCollectedAt?validationTime(source.lastCollectedAt):'기록 없음'} · 다음 작업 ${validationReason(source.nextTask||'NEW_OFFICIAL_EVIDENCE_REQUIRED')}`));
  if((data.jobs||[]).length)validationTable(target,'기업별 데이터 수집',['기업 · 코드','상태','데이터 기준일','마지막 수집','다음 작업','재시도'],data.jobs.map(j=>[`${j.companyName||''} · ${j.ticker}`,validationBadge(j.state),j.dataAsOfDate||(typeof j.dataAsOf==='string'?j.dataAsOf:null)||'미확인',j.lastCollectedAt?validationTime(j.lastCollectedAt):'기록 없음',validationReason(j.nextTask||j.reason||'NEW_OFFICIAL_EVIDENCE_REQUIRED'),j.retryable===true?'가능':j.retryable===false?'자동 재시도 없음':'조건 미확인']));
}
function capturePeerView(root) {
  return [...(root?.querySelectorAll?.('.comparison-table, details')||[])].map(n=>({key:n.getAttribute?.('data-evidence-key')?`${n.closest?.('[id]')?.id||''}:${n.getAttribute('data-evidence-key')}`:null,left:n.scrollLeft,top:n.scrollTop,open:n.open}));
}
function restorePeerView(root,state) {
  [...(root?.querySelectorAll?.('.comparison-table, details')||[])].forEach((n,i)=>{const key=n.getAttribute?.('data-evidence-key')?`${n.closest?.('[id]')?.id||''}:${n.getAttribute('data-evidence-key')}`:null;const saved=key?state.find(item=>item.key===key):state[i]?.key?null:state[i];if(saved){n.scrollLeft=saved.left;n.scrollTop=saved.top;if(typeof saved.open==='boolean')n.open=saved.open;}});
}
let selectedPeerTicker=null,selectedPeerFingerprint=null,selectedPeerMetric='ALL',selectedPeerJob=null;
function renderValidationEvidence(job) {
  const fingerprint=JSON.stringify([job,selectedPeerMetric]);selectedPeerJob=job;
  if(selectedPeerTicker===job.ticker&&selectedPeerFingerprint===fingerprint)return;
  selectedPeerTicker=job.ticker;selectedPeerFingerprint=fingerprint;
  const panel=byId('peer-company-evidence'),savedView=capturePeerView(panel);panel.replaceChildren(candidateNode('h3',`${job.companyName||job.ticker} · 기업별 검증 근거`),validationBadge(job.state));
  panel.append(candidateNode('p',`평가 기준일 ${job.valuationDate||'미확인'} · 가격·시가총액·주식수는 각각의 기준일 검증이 필요합니다.`));
  panel.append(candidateNode('p',`마지막 수집 ${job.lastCollectedAt?validationTime(job.lastCollectedAt):'기록 없음'} · 마지막 검증 ${job.lastValidatedAt||job.checkedAt?validationTime(job.lastValidatedAt||job.checkedAt):'기록 없음'} · 데이터 기준일 ${job.dataAsOfDate||(typeof job.dataAsOf==='string'?job.dataAsOf:null)||'미확인'}`));
  panel.append(candidateNode('p',`다음 작업: ${validationReason(job.nextTask||'NEW_OFFICIAL_EVIDENCE_REQUIRED')} · 재시도 ${job.retryable===true?'가능':job.retryable===false?'자동 재시도 없음':'조건 미확인'}`));
  if(job.correctionDifferences?.differences?.length){const jump=candidateNode('button','DB하이텍 정정 차이 9건 바로 보기','candidate-button');jump.type='button';jump.addEventListener('click',()=>byId('peer-correction-table')?.scrollIntoView?.({block:'start'}));panel.append(jump);}
  const filter=candidateNode('select');filter.setAttribute('aria-label','상세 평가배수 선택');for(const metric of ['ALL','PER','PBR','PSR','EV_EBITDA']){const option=candidateNode('option',metric==='ALL'?'전체 평가배수':metric);option.value=metric;filter.append(option);}filter.value=selectedPeerMetric;filter.addEventListener('change',()=>{selectedPeerMetric=filter.value;renderValidationEvidence(selectedPeerJob);});panel.append(filter);
  if(job.shareBridge?.baselineOriginalReview){
    const bridge=job.shareBridge,summary=candidateNode('section',undefined,'pbr-evidence');summary.id='peer-share-summary';summary.append(candidateNode('h4','주식수 대사 · 현재 확인 범위'));
    for(const record of bridge.baselineRecords||[])if(['COMMON','PREFERRED'].includes(record.shareClass))summary.append(candidateNode('p',`6월 30일 ${record.shareClass==='COMMON'?'보통주':'우선주'} · 발행 ${Number.isSafeInteger(record.issuedShares)?record.issuedShares.toLocaleString('ko-KR'):'미확인'}주 · 자기 ${Number.isSafeInteger(record.treasuryShares)?record.treasuryShares.toLocaleString('ko-KR'):'미확인'}주 · ${bridge.baselineOriginalReview.matchedClasses?.includes(record.shareClass)?'원문 수치 대조 완료':'숫자 자료 없음·확정하지 않음'} · 정정 관계 검증 대기`));
    for(const r of bridge.reconciliation||[])for(const point of r.checkpointReviews||[])if(point.treasuryDifference!==null)summary.append(candidateNode('p',`${point.asOfDate} 자기주식 차이 ${point.treasuryDifference.toLocaleString('ko-KR')}주 · 확인된 변동만 반영한 참고 대조 · 미확인 변동 조사 필요`));
    summary.append(candidateNode('p',`10월 8일 발행주식수 ${bridge.october8IssuedShares??'보류'} · 시가총액 ${bridge.marketCap??'검증 대기'} · PBR ${job.pbrValidation?.eligible?'검증 완료':'보류'} · 전체 기업행동과 정정 관계를 확인해야 합니다.`));
    for(const prior of bridge.priorOriginalReviews||[])if(prior.eventType)summary.append(candidateNode('p',`기준점 이전 원문 확인 · ${Number.isSafeInteger(prior.reportedQuantity)?prior.reportedQuantity.toLocaleString('ko-KR')+'주':'주식수 미확인'} · ${prior.reason} · 공시 ${prior.sourceDocumentId}`));
    for(const r of bridge.originalReviews||[])summary.append(candidateNode('p',`원문 추가 검토 · ${r.reason} · 공시 ${r.sourceDocumentId}`));
    if(bridge.baselineOriginalReview.intermediateTreasuryObservation){const o=bridge.baselineOriginalReview.intermediateTreasuryObservation;summary.append(candidateNode('p',`${o.asOfDate} 처분 전 잔고 · 직접 ${o.directShares.toLocaleString('ko-KR')}주 / 기타 ${o.otherShares}주 · 합계 ${o.reportedComponentSum.toLocaleString('ko-KR')}주 · 다른 공시와 보유 범위·실제 거래 확인 필요`));}
    const a=candidateNode('a',`반기보고서 원문 · ${bridge.baselineOriginalReview.documentId}`);a.href=bridge.baselineOriginalReview.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';summary.append(a);panel.append(summary);
  }
  if(job.shareBridge?.cancellationReview){
    const review=job.shareBridge.cancellationReview,section=candidateNode('section',undefined,'pbr-evidence');section.id='peer-cancellation-evidence';section.append(candidateNode('h4','DB하이텍 소각 효력일'),candidateNode('p',`보통주 ${review.quantity.toLocaleString('ko-KR')}주 · 실제 소각일 ${review.effectiveDate||'검증 대기'} · ${review.verificationStatus==='VERIFIED'?'최초·정정 보고서의 완료 기록 일치':'공식 근거 검증 대기'}`),candidateNode('p','변경등기일은 미확인입니다. 기준점 이전 소각을 6월 30일 이후 다시 차감하지 않습니다. 10월 8일 주식수·시가총액·PBR은 별도 검증 대기입니다.'));
    if(review.baselineInclusion){const b=review.baselineInclusion;section.append(candidateNode('p',`6월 30일 기준점 포함: ${b.includedInBaseline===true?'확인됨·다시 차감하지 않음':'검증 대기'} · 기준일 ${b.baselineDate}`));if(b.treasuryScope){const t=b.treasuryScope;section.append(candidateNode('p',`자기주식 범위 · 전체 보유 ${t.physicalTreasuryShares.toLocaleString('ko-KR')}주 − 교환청구 미행사 ${t.unexercisedExchangeShares.toLocaleString('ko-KR')}주 = 공시 자기주식 ${t.statutoryTreasuryShares.toLocaleString('ko-KR')}주 · 서로 다른 범위를 합산하지 않습니다.`));}const a=candidateNode('a',`기준점 반기보고서 · ${b.sourceDocumentId}`);if(/^https:\/\/dart.fss.or.kr\//.test(b.sourceUrl||'')){a.href=b.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';section.append(a,candidateNode('br'));}}
    for(const doc of review.documents||[]){const a=candidateNode('a',`${doc.role==='DECISION'?'소각 결정':doc.role==='ANNUAL'?'최초 사업보고서':'정정 사업보고서'} · ${doc.disclosureDate} · ${doc.documentId}`);if(/^https:\/\/dart.fss.or.kr\//.test(doc.sourceUrl||'')){a.href=doc.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';section.append(a,candidateNode('br'));}}panel.append(section);
  }
  if(job.shareBridge?.issuanceChain){
    const chain=job.shareBridge.issuanceChain,section=candidateNode('section',undefined,'pbr-evidence');section.id='peer-issuance-chain';
    section.append(candidateNode('h4','최초 공시 → 정정 → 납입 → 실제 발행 → 국내 상장'),candidateNode('p',`보통주 ${Number.isSafeInteger(chain.quantity)?new Intl.NumberFormat('ko-KR').format(chain.quantity):'미확인'}주 · 납입일 ${chain.paymentDate||'미확인'} · 실제 발행 효력일 ${chain.effectiveDate||'검증 대기'} · 국내 상장일 ${chain.listingDate||'검증 대기'}`));
    section.append(candidateNode('p',`근거 공개일 ${chain.availableAt?.slice(0,10)||'미확인'} · 당일 공개시각 미확인 · ${chain.verificationStatus==='VERIFIED'?'공식 원문 연결 확인됨':'원문 연결 검증 대기'} · 상장일에 주식수를 다시 더하지 않습니다. 전체 기간의 잔고 대사는 별도입니다.`));
    for(const doc of chain.documents||[]){const label=({INITIAL:'최초 결정',CORRECTION:'정정',PAYMENT_RESULT:'납입 결과',ISSUANCE_RESULT:'실제 발행 결과',LISTING:'거래소 실제 발행·상장 공지'})[doc.role]||doc.role;const a=candidateNode('a',`${label} · ${doc.disclosureDate} · ${doc.documentId}`);if(/^https:\/\/(dart.fss.or.kr|kind.krx.co.kr)\//.test(doc.sourceUrl||'')){a.href=doc.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';section.append(a,candidateNode('br'));}}
    panel.append(section);
  }
  if(job.disclosureReview){
    const review=job.disclosureReview,summary=review.summary,stages=candidateNode('details');stages.open=true;stages.append(candidateNode('summary','공시 분류 → 원문 검증 → 주식수 대사 → 시가총액 → PBR'));
    stages.append(candidateNode('p',`공시 ${summary.total}건 · 기간 이전 추가 목록 ${summary.priorAnnouncementsListed||0}건 · 제목 분류 ${summary.classified}건 · 원문 검증 대상 ${summary.relevant}건 · 원문 파일 무결성 확인 ${summary.originalArchivesVerified}건 · 원문 효력 검증 완료 ${summary.originalEffectVerified}건 · 기업행동 전체 조건 확인 ${summary.corporateActionsVerified}건`));
    stages.append(candidateNode('p',`주식수 대사: ${({RECONCILED:'검증 완료',PARTIAL:'일부 검증',SOURCE_CONFLICT:'원천자료 충돌',INSUFFICIENT_DATA:'자료 부족'})[job.shareBridge?.reconciliation?.[0]?.reconciliationStatus]||'자료 부족'} · 시가총액 ${job.shareBridge?.marketCap??'자료 부족'} · PBR ${job.pbrValidation?.eligible?'검증 완료':'자료 부족'}`));
    stages.append(candidateNode('p',`이전 공시 조회 시작 ${summary.priorQueryFrom||'미확인'} · ${summary.priorListingComplete?'조회 범위의 목록 페이지 확인 완료':'조회 목록 페이지 확인 필요'} · 기업행동 전체 효력 확인은 별도입니다.`));
    stages.append(candidateNode('p','제목 분류는 기업행동 확인을 뜻하지 않습니다. 6월 30일 이전 공시의 기간 내 효력도 추가 확인해야 합니다. 다음 자동 작업은 저장된 근거 재검증이며, 외부 원문 수집은 자동 실행하지 않습니다.'));
    const labels={SHARE_COUNT_IMPACT:'발행주식수 영향 가능',TREASURY_SHARE_IMPACT:'자기주식 영향 가능',POTENTIAL_IMPACT:'영향 확인 필요',CORRECTION:'정정 관계 확인',UNCLASSIFIED:'미분류',NOT_RELEVANT:'제목상 관련성 낮음'};
    validationTable(stages,'공식 원문 우선 검증 큐',['우선순위','공시일 · 문서','분류','원문 · 상태','정정 관계'],review.queue.map(x=>[x.priority,`${x.disclosureDate} · ${x.documentTitle} · ${x.documentId}`,labels[x.classification]||x.classification,x.state==='BLOCKED'?'차단 · '+x.reason:x.state==='VERIFIED'?'효력 검증 완료':x.originalArchived?'원문 보존 · 효력 검증 대기':'원문 확보 대기',x.relatedDocumentId|| (x.classification==='CORRECTION'?'공식 연결 확인 필요':'해당 없음')]));
    panel.append(stages);
  }
  if(job.shareBridge){
    const bridge=job.shareBridge,detail=candidateNode('details');detail.open=true;detail.append(candidateNode('summary','6월 말 → 10월 8일 주식수 대사'));
    detail.append(candidateNode('p',`조사 기간 ${bridge.coverage?.fromDate||'미확인'} ~ ${bridge.coverage?.toDate||'미확인'} · 공시 목록 ${bridge.disclosures?.length||0}건 · ${bridge.coverage?.listingComplete?'목록 페이지 확인 완료':'목록 자료 부족'} · 기업행동 효력 검증은 별도입니다.`));
    if(bridge.baselineOriginalReview)detail.append(candidateNode('p',`6월 30일 원문 대조: 발행주식수·자기주식수 일치 · 감소 후 발행주식수 기준 · 정정 관계 검증 대기 · 공시 ${bridge.baselineOriginalReview.documentId}`));
    if(bridge.baselineOriginalReview?.preBaselineCancellation)detail.append(candidateNode('p','기준점 이전 소각: 2026-02-09 · 반기 발행주식수에 이미 반영 · 7~10월에 다시 차감하지 않음'));
    for(const reconciliation of bridge.reconciliation||[])for(const point of reconciliation.checkpointReviews||[])if(point.treasuryDifference!==null)detail.append(candidateNode('p',`중간 잔고 대조 ${point.asOfDate} · 반영된 변동 기준 자기주식 차이 ${point.treasuryDifference.toLocaleString('ko-KR')}주 · 전체 변동 확인 전 참고값 · 10월 8일 확정 잔고가 아닙니다.`));
    for(const record of bridge.baselineRecords||[])detail.append(candidateNode('p',`6월 30일 원천 주식수 · ${record.shareClass==='COMMON'?'보통주':record.shareClass==='PREFERRED'?'우선주':'합계'} · 발행 ${record.issuedShares??record.issued??'미확인'}주 · 자기 ${record.treasuryShares??record.treasury??'미확인'}주 · ${record.asOfDate||bridge.baselineDate} · 공시 ${record.sourceDocumentId||'미확인'}`));
    detail.append(candidateNode('p',`10월 8일 검증 발행주식수: ${bridge.october8IssuedShares??'보류'} · 주식수 차이: ${bridge.shareDifference??'계산 보류'} · 시가총액: ${bridge.marketCap??'검증 보류'} · 중간 기준일 관측값을 평가일 값으로 사용하지 않습니다.`));
    for(const prior of bridge.priorOriginalReviews||[])detail.append(candidateNode('p',`기간 이전 원문 대조 · ${prior.shareClass==='COMMON'?'보통주':'주식 종류 해당 없음·확인 대기'} ${Number.isSafeInteger(prior.reportedQuantity)?prior.reportedQuantity.toLocaleString('ko-KR')+'주':'주식수 미확인'} · 계획 종료 ${prior.plannedEndDate||'해당 없음'} · 실제 효력일 ${prior.effectiveDate||'미확인'} · ${prior.reason} · 주식수에 적용하지 않음 · 공시 ${prior.sourceDocumentId}`));
    for(const point of bridge.checkpoints||[])detail.append(candidateNode('p',`공식 중간 관측 · ${point.asOfDate} · ${point.votingIssuedShares!=null?'의결권 있는 주식 '+point.votingIssuedShares+'주 · 전체 발행주식수 아님 · 공개 '+point.disclosureDate:'발행 '+(point.issuedShares??'미확인')+'주'} · 자기 ${point.treasuryShares??'미확인'}주 · 10월 8일 검증값 아님`));
    for(const event of bridge.corporateActions||[])detail.append(candidateNode('p',`${({RIGHTS_ISSUE:'유상증자 결과',TREASURY_CHANGE:'자기주식 실제 처분',TREASURY_DISPOSAL:'자기주식 처분 근거',TREASURY_ACQUISITION:'자기주식 취득 계획',TREASURY_EXCHANGE:'자기주식 교환 근거',CANCELLATION:'소각 결정',SUBSIDIARY_ESTABLISHMENT:'종속기업 설립'})[event.type]||event.type} · 공시일 ${event.disclosureDate||'미확인'} · 효력일 ${event.effectiveDate||'미확인'} · ${event.shareClass==='COMMON'?'보통주':event.shareClass||'주식 종류 미확인'} · ${event.reportedShares!=null?event.reportedShares+'주':'주식수 적용 보류'} · ${event.reason||'효력일·주식수 대사 별도'} · 공시 ${event.receipt}`));
    const affected=(bridge.disclosures||[]).filter(x=>x.potentialShareOrTreasuryEffect);for(const item of affected){const a=candidateNode('a',`${item.disclosureDate} · ${item.title} · 공식 근거`);a.href=item.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';detail.append(a,candidateNode('br'));}
    panel.append(detail);
  }
  renderPbrEvidence(job,panel);
  const shownOfficialFacts=new Set();
  for(const observation of job.collection?.observations||[]) {
    if(!['SHARES','SEC_FACTS'].includes(observation.kind))continue;
    for(const record of observation.observed?.records||[]){const recordKey=JSON.stringify([observation.source,record.shareClass,record.accountId,record.asOfDate,record.issuedShares??record.value,record.unit]);if(shownOfficialFacts.has(recordKey))continue;shownOfficialFacts.add(recordKey);panel.append(candidateNode('p',`공식 자료 관측 · ${record.shareClass||record.accountId||'주식수'} · ${record.issuedShares??record.value??'미확인'} ${record.unit||'주'} · 기준일 ${record.asOfDate||'미확인'} · 출처 ${observation.source} · 현재 평가에는 사용 보류`));}
  }
  for(const [metric,result]of Object.entries(job.metrics||{}).filter(([metric])=>selectedPeerMetric==='ALL'||metric===selectedPeerMetric))panel.append(candidateNode('p',`${metric==='EV_EBITDA'?'EV/EBITDA':metric} · ${result.verificationStatus==='VERIFIED'?'계산 근거 확인됨':'자료 부족'} · ${result.verificationStatus==='VERIFIED'&&Number.isFinite(result.value)?result.value+'배':'계산 보류'} · ${[...new Set([...(result.comparisonExclusionReasons||[]),...(result.reasons||[]),...(result.exclusionReasons||[])])].map(validationReason).join(' / ')||'판정 근거 확인 전'}`));
  if(job.correctionNumeric)panel.append(candidateNode('p',`정정 공시 원문 합계 차이 ${job.correctionNumeric.totalDifferences?.length||0}건 · 공식 원인 설명 검증 대기 · 반올림·단위를 추정하여 보정하지 않습니다.`));
  if(job.correctionCauseReview)panel.append(candidateNode('p',job.correctionCauseReview.summary||'원문 셀 재검증 결과 확인 전'));
  if(job.correctionDifferences){
    const review=job.correctionDifferences;
    panel.append(candidateNode('p',`정정 차이 원인 검증 · 해결 ${Number.isInteger(review.resolved)?review.resolved:'미확인'}건 · 미해결 ${Number.isInteger(review.unresolved)?review.unresolved:'미확인'}건 · ${review.sourceAvailableAtValuationDate===false?'평가 기준일 이후 자료 사용 차단':'공식 설명 확보 전 평가 입력 보류'}`));
    if((review.differences||[]).length){const correctionTable=validationTable(panel,'DB하이텍 원문 합계 차이별 검증',['차이 ID','기간 · 연결/별도','표 · 항목','원문/정정 문서','변경 전 · 단위','변경 후 · 단위','대조 측정값','차이 원인'],review.differences.map(d=>[d.id,`${d.periodStart||d.year} ~ ${d.periodEnd||d.year} · ${d.statementBasis==='CFS'?'연결':d.statementBasis==='OFS'?'별도':'기준 미확인'}`,`${d.originalTableIndex??'미확인'} → ${d.correctionTableIndex??'미확인'} · ${d.field||''} · ${d.item||''}`,`${d.originalReceipt||'미확인'} → ${d.correctionReceipt||'미확인'}`,`${d.beforeValue??'—'} ${d.beforeUnit||'단위 미확인'}`,`${d.afterValue??'—'} ${d.afterUnit||'단위 미확인'}`,`${d.stage==='before'?'변경 전':d.stage==='after'?'변경 후':d.stage||''} ${d.currency||''} · 원문 합계 ${d.total??'—'} / 구성합 ${d.componentSum??'—'} / 차이 ${d.difference??'—'} ${d.unit||''}`,d.cause==='UNRESOLVED'?'미해결 · 공식 원인 설명 미확보':d.cause||'원인 미확인']));correctionTable.id='peer-correction-table';}
  }
  panel.append(candidateNode('h4','제한 사항과 필요한 자료'),candidateNode('p',(job.missing||[]).map(validationReason).join(' / ')||'작업 근거의 별도 검증이 필요합니다.'));
  for(const source of job.evidence||[]){if(typeof source==='string'){if(/^https:\/\//.test(source)){const a=candidateNode('a','공식 원천자료');a.href=source;a.target='_blank';a.rel='noopener noreferrer';panel.append(a);}else panel.append(candidateNode('p',source));continue;}panel.append(candidateNode('p',source.label||source.description||source.kind||'저장된 근거'));if(source.sourceUrl&&/^https:\/\//.test(source.sourceUrl)){const a=candidateNode('a','공식 원천자료');a.href=source.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';panel.append(a);}}
  restorePeerView(panel,savedView);
}
function renderPeerValidationStatus(data) {
  const savedTables=capturePeerView(document.body);
  const counts=byId('agent-counts'),queue=byId('agent-queue'),sources=byId('agent-sources'),logs=byId('agent-logs'),metrics=byId('peer-metrics'),peers=byId('peer-validation-table');
  for(const n of [counts,queue,sources,logs,metrics,peers])n.replaceChildren();
  validationCount(counts,'검증 대상',data.counts?.total);for(const state of ['QUEUED','COLLECTING','VALIDATING','RUNNING','VERIFIED','PARTIAL','BLOCKED','FAILED'])validationCount(counts,validationLabels[state],data.counts?.[state]);
  byId('agent-message').textContent=`Worker: ${data.worker?.running===true?'실행 중':data.worker?.running===false?'현재 실행 작업 없음':'실행 미확인'} · ${data.scheduler?.enabled===true?'스케줄 활성':data.scheduler?.enabled===false?'스케줄 비활성':'스케줄 미확인'} · ${data.scheduler?.mode==='SAVED_EVIDENCE_ONLY'?'저장된 근거 재검증 모드 · 외부 자동 수집 없음':'실행 모드 확인 전'}`;
  byId('agent-timing').textContent=`마지막 실행 ${data.lastRunAt?validationTime(data.lastRunAt):'기록 없음'} · 다음 실행 ${data.nextRunAt?validationTime(data.nextRunAt):'예정 없음'} · 실행 주기 ${Number.isFinite(data.scheduler?.intervalMs)?data.scheduler.intervalMs/60000+'분':'미확인'}`;
  const jobs=Array.isArray(data.jobs)?data.jobs:[];
  const shortcuts=byId('peer-evidence-shortcuts');shortcuts.replaceChildren(candidateNode('h3','기업별 상세 근거 바로 보기'));
  for(const job of [...jobs].sort((a,b)=>(a.pbrValidation?.priorityRank||99)-(b.pbrValidation?.priorityRank||99))){const b=candidateNode('button',`${job.companyName||job.ticker} · PBR 근거`,'candidate-button');b.type='button';b.addEventListener('click',()=>{renderValidationEvidence({...job,nextValidationAt:data.nextRunAt});byId('peer-company-evidence').scrollIntoView?.({block:'start'});});shortcuts.append(b);}
  renderCollectionStatus(data.collection);
  if(selectedPeerTicker){const selected=jobs.find(j=>j.ticker===selectedPeerTicker);if(selected)renderValidationEvidence({...selected,nextValidationAt:data.nextRunAt});else{byId('peer-company-evidence').replaceChildren(candidateNode('p','선택한 기업의 최신 검증 결과가 없습니다.'));selectedPeerTicker=null;}}
  validationTable(queue,'기업별 검증 작업 큐',['기업','코드','상태','평가 기준일','마지막 수집','마지막 검증','다음 작업 · 재시도','부족 자료'],jobs.map(j=>[j.companyName,j.ticker,validationBadge(j.state),j.valuationDate,j.lastCollectedAt?validationTime(j.lastCollectedAt):'기록 없음',j.lastValidatedAt||j.checkedAt?validationTime(j.lastValidatedAt||j.checkedAt):'기록 없음',`${validationReason(j.nextTask||'NEW_OFFICIAL_EVIDENCE_REQUIRED')} · ${j.retryable===true?'재시도 가능':j.retryable===false?'자동 재시도 없음':'조건 미확인'}`,(j.missing||[]).map(validationReason).join(' / ')||'근거 확인 전']));
  for(const source of data.sources||[])sources.append(candidateNode('p',`${source.name||source.source||'데이터 소스'} · ${({SAVED_EVIDENCE_ONLY:'저장된 근거 재검증',AUTH_BLOCKED:'인증 차단',BLOCKED:'차단',FAILED:'실패'})[source.status]||source.status||'미확인'} · ${source.reason||'실제 조회 근거 확인 필요'}`));
  if(!(data.sources||[]).length)sources.append(candidateNode('p','데이터 소스 조회 기록 없음','empty-state'));
  for(const log of (data.logs||[]).slice(-20).reverse())logs.append(candidateNode('p',`${log.at||log.timestamp||'시각 미확인'} · ${log.ticker||''} · ${log.message||log.reason||log.event||log.state||'작업 기록'}`));
  if(!(data.logs||[]).length)logs.append(candidateNode('p','실행 로그 없음','empty-state'));
  byId('peer-validation-message').textContent=jobs.length?`평가 기준일 ${[...new Set(jobs.map(j=>j.valuationDate).filter(Boolean))].join(' / ')||'미확인'} · ${jobs.length}개 기업 · 배수별 독립 검증 · 추천 보류`:'검증 기업 자료 없음 · 비교 차트를 생성하지 않습니다.';
  for(const key of ['PER','PBR','PSR','EV_EBITDA'])validationCount(metrics,(key==='EV_EBITDA'?'EV/EBITDA':key)+' 유효 표본',data.metricEligibility?.[key]);
  validationTable(peers,'동종기업 검증 결과',['기업 · 코드','종가 · 기준일','시가총액 · 기준일','주식수 기준일','재무 회계기간','사업 적합성','PER','PBR','PSR','EV/EBITDA','검증 상태','근거'],jobs.map(j=>{
    const b=candidateNode('button','검증 근거 보기','candidate-button');b.type='button';b.addEventListener('click',()=>{renderValidationEvidence({...j,nextValidationAt:data.nextRunAt});byId('peer-company-evidence').scrollIntoView?.({block:'start'});});
    const p=j.price&&typeof j.price==='object'?j.price:{close:j.price,asOfDate:j.priceDate,currency:j.currency||'통화 미확인'},c=j.capital||{},f=j.fiscalPeriod||Object.values(j.metrics||{}).find(m=>m.fiscalPeriod)?.fiscalPeriod||{};
    return [`${j.companyName||'미확인'} · ${j.ticker}`,Number.isFinite(p.close)?`${numberFormat.format(p.close)} ${p.currency||'통화 미확인'} · ${p.asOfDate||'미확인'}`:'— · 가격 자료 부족',Number.isFinite(c.marketCap)&&c.verified===true?`${numberFormat.format(c.marketCap)} ${c.currency||'통화 미확인'} · ${c.asOfDate||'미확인'}`:'— · 자료 부족 · 계산 보류',j.shareDate||c.shareCountDate||'미확인',f.start&&f.end?`${f.start} ~ ${f.end}`:'미확인',({UNVERIFIED:'검증 대기',MISMATCH:'사업 차이로 제외',VERIFIED:'확인됨'})[j.businessReview?.businessFitStatus||j.businessFitStatus]||'검증 대기',...['PER','PBR','PSR','EV_EBITDA'].map(key=>validationMetricCell(j.metrics?.[key])),validationBadge(j.state),b];
  }));
  const mobile=byId('peer-mobile-jobs');mobile.replaceChildren();
  for(const job of jobs){const card=candidateNode('article',undefined,'peer-mobile-card');card.append(candidateNode('h3',`${job.companyName||'기업명 미확인'} · ${job.ticker}`),validationBadge(job.state),candidateNode('p',`평가 기준일 ${job.valuationDate||'미확인'} · 주식수 기준일 ${job.shareDate||job.capital?.shareCountDate||'미확인'}`,'research-note'));const p=job.price&&typeof job.price==='object'?job.price:{close:job.price,asOfDate:job.priceDate,currency:job.currency};card.append(candidateNode('p',Number.isFinite(p.close)?`종가 ${numberFormat.format(p.close)} ${p.currency||'통화 미확인'} · ${p.asOfDate||'가격 기준일 미확인'}`:'가격 자료 부족 · 추정하지 않습니다.'));const grid=candidateNode('div',undefined,'peer-mobile-metrics');for(const key of ['PER','PBR','PSR','EV_EBITDA']){const cell=candidateNode('div');cell.append(candidateNode('strong',key==='EV_EBITDA'?'EV/EBITDA':key),validationMetricCell(job.metrics?.[key]));grid.append(cell);}card.append(grid);const button=candidateNode('button','기준일·제외 사유·공식 근거 보기','candidate-button');button.type='button';button.addEventListener('click',()=>{renderValidationEvidence({...job,nextValidationAt:data.nextRunAt});byId('peer-company-evidence').scrollIntoView?.({block:'start'});});card.append(button);mobile.append(card);}
  restorePeerView(document.body,savedTables);
}
let peerValidationLoading=false;
async function refreshPeerValidation() {
  if(peerValidationLoading)return;peerValidationLoading=true;const b=byId('agent-refresh');b.disabled=true;
  byId('agent-message').textContent='검증 상태를 불러오는 중';byId('agent-message').className='message loading-skeleton';
  try{const data=await candidateRequest('/api/v2/peer-validation/status');renderPeerValidationStatus(data);byId('agent-message').className='message';}
  catch(error){byId('agent-message').textContent=`검증 상태 연결 실패 · 이전 표시 결과는 최신 상태로 확인되지 않았습니다. ${candidateError(error)}`;byId('agent-message').className='message error';byId('peer-validation-message').textContent='연결 실패 · 이전 결과의 기준일을 확인하세요.';}
  finally{b.disabled=false;peerValidationLoading=false;}
}
byId('agent-refresh').addEventListener('click',refreshPeerValidation);
if(document.querySelectorAll)for(const link of document.querySelectorAll('a[href="#agent-dashboard"],a[href="#peer-validation"]'))link.addEventListener('click',refreshPeerValidation);
// Visibility-aware status reads use the same guarded path as manual refresh.
if(typeof window!=='undefined'&&typeof window.setInterval==='function'){
  window.setInterval(()=>{if(document.visibilityState==='visible')refreshPeerValidation();},30000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshPeerValidation();});
  refreshPeerValidation();
}

// Official-source research shares this WebView contract with Android.
let influenceResearch=null, selectedInfluencePerson=null, influenceFingerprint=null, influenceLoading=false, selectedSignalResearchType='ALL';
function influenceDate(value){return value?validationTime(value):'미확인';}
function influenceSource(target,item){
  const url=item.sourceUrl||item.source?.url||item.source?.sourceUrl;
  if(typeof url==='string'&&/^https:\/\//.test(url)){const a=candidateNode('a','공식 원천자료');a.href=url;a.target='_blank';a.rel='noopener noreferrer';target.append(a);}else target.append(candidateNode('p','공식 원천자료 확인 필요'));
  if(item.documentId)target.append(candidateNode('p',`문서 ${item.documentId}`));
}
function influenceRisk(value){return ({CORRELATION_NOT_CAUSATION:'상관관계·인과관계 미확인',SELECTION_BIAS_NOT_ASSESSED:'표본 선택 편향 미검증',SURVIVORSHIP_BIAS_NOT_ASSESSED:'생존자 편향 미검증',CORPORATE_ACTIONS_UNVERIFIED:'기업행동 검증 미완료',PUBLICATION_TIME_PRECISION_INSUFFICIENT:'정확한 공개 시각 부족',COMMON_OBSERVATIONS_MISSING:'종목·벤치마크 공통 가격 부족',SAMPLE_SIZE_INSUFFICIENT:'검증 표본 부족',STATISTICAL_SIGNIFICANCE_NOT_ESTABLISHED:'통계적 유효성 미확인',DISCLOSURE_DELAY:'공시 공개 지연',SINGLE_EVENT_NOT_PREDICTIVE_VALIDATION:'단일 사건으로 예측력 검증 불가',MARKET_REACTION_OR_SIGNAL_UNVERIFIED:'시장 반응·신호 검증 자료 부족',PUBLICATION_TIME_UNVERIFIED:'공개 시각 검증 미완료',HISTORICAL_PUBLICATION_BOUND_UNVERIFIED:'과거 공개 가능 시점 미확인',AGGREGATE_EXECUTION_NOT_DATED_TRANSACTION:'기간 합계이며 개별 거래일 미확인',MSFT_HISTORICAL_PRICE_NOT_COLLECTED:'Microsoft 과거 가격 자료 부족',ALIGNED_BENCHMARK_NOT_VERIFIED:'동일 기간 벤치마크 검증 대기',SMALL_UNCONTROLLED_SAMPLE:'소규모 비통제 표본',MARKET_AND_INDUSTRY_BIAS_NOT_CONTROLLED:'시장·산업 편향 미통제',TRANSACTION_COSTS_EXCLUDED:'거래비용 미포함',NO_TRAIN_TEST_SPLIT:'학습·검증 구간 미분리',INSUFFICIENT_DATA:'자료 부족'})[value]||value;}
function influenceStatus(value){if(value==='MARKET_REACTION_BLOCKED')return '시장 반응 계산 차단';if(value==='DESCRIPTIVE_ONLY')return '기술 통계·유효성 미확인';return value==='VERIFIED'?'확인됨':value==='BLOCKED'?'차단':value==='PARTIAL'?'일부 확인·자료 부족':'검증 대기';}
function influenceTimelineItems(data,personId){
 const items=(data.statements||[]).filter(s=>s.personId===personId).map(s=>({kind:'STATEMENT',date:s.statementDate||null,dateLabel:'발언일',item:s}));
 for(const e of data.capitalEvents||[])if(e.actorType!=='COMPANY'&&(e.actorId===personId||e.personId===personId))items.push({kind:'CAPITAL',date:e.filingDate||null,dateLabel:'공시일',item:e});
 return items.sort((a,b)=>a.date&&b.date?b.date.localeCompare(a.date):a.date?-1:b.date?1:0);
}
function renderInfluencePerson(){
  const panel=byId('influence-detail'),view=capturePeerView(panel);panel.replaceChildren();
  const person=(influenceResearch?.people||[]).find(p=>p.personId===selectedInfluencePerson);
  if(!person){panel.append(candidateNode('p','공식 근거가 확보된 인물이 없습니다.'));return;}
  panel.append(candidateNode('h3',person.name),candidateNode('p',`당시 직책 ${person.roleAsOf?.role||person.role||'직책 확인 필요'} · ${person.roleAsOf?.organization||person.organization||'소속 확인 필요'} · ${person.country||'국가 확인 필요'}`),candidateNode('p',`인물 정보 ${influenceStatus(person.verificationStatus)} · 직책·소속은 해당 발언 시점 기준`));
  for(const source of person.officialSources||[])influenceSource(panel,typeof source==='string'?{sourceUrl:source}:source);
  const timeline=candidateNode('section',undefined,'person-timeline');timeline.append(candidateNode('h4','날짜순으로 살펴보기'),candidateNode('p','발언일과 공시일을 구분합니다. 공시일은 실제 거래일이 아닙니다. 기업·기관 행동을 개인의 거래로 추정하지 않습니다.','research-note'));const entries=influenceTimelineItems(influenceResearch,person.personId),ordered=candidateNode('ol');
  for(const entry of entries){const item=entry.item,row=candidateNode('li',undefined,'person-timeline-item');row.append(candidateNode('span',`${entry.dateLabel} · ${entry.date||'날짜 미확인'}`,'research-card-date'),candidateNode('strong',entry.kind==='STATEMENT'?item.title||'공식 발언':'자본 행동 공시 · '+(item.companyId||item.securityId||'대상 미확인')),candidateNode('span',`${entry.kind==='STATEMENT'?'공식 발언':'공시된 행동'} · ${influenceStatus(item.verificationStatus)}`,'research-badge'));if(entry.kind==='STATEMENT')row.append(candidateNode('p',item.summary||'요약 자료 확인 중'));else row.append(candidateNode('p',`유형 ${item.eventType==='CONFIRMED_TRANSACTION'?'확인된 거래':item.eventType==='REPORTED_HOLDING_CHANGE'?'보고된 보유 변화':item.eventType==='ANNOUNCED_INTENTION'?'발표된 의향':'유형 확인 필요'} · 거래일 ${item.transactionDate||'미확인·추정하지 않음'}`));const evidence=candidateNode('details',undefined,'research-detail');evidence.setAttribute('data-evidence-key','timeline:'+entry.kind+':'+(item.documentId||item.eventId||item.statementId||entry.date||'unknown'));evidence.append(candidateNode('summary','공개 시점과 공식 근거'),candidateNode('p',`공개 이용 기준 ${influenceDate(entry.kind==='STATEMENT'?item.publishedAt:item.publicAvailableAt)} · 정확한 최초 공개 시각과 구분`));influenceSource(evidence,item);row.append(evidence);for(const companyId of entry.kind==='STATEMENT'?(item.relatedCompanies||[]):[item.companyId].filter(Boolean))addRelatedCompanyLink(row,companyId);ordered.append(row);}
  if(!entries.length)timeline.append(candidateNode('p','선택한 인물에 직접 연결된 발언·행동 자료가 없습니다. 기관 자료는 아래 별도 근거에서 확인하세요.','research-empty'));else timeline.append(ordered);panel.append(timeline);
  const statements=(influenceResearch.statements||[]).filter(s=>s.personId===person.personId).sort((a,b)=>(b.statementDate||'').localeCompare(a.statementDate||''));
  panel.append(candidateNode('h4',`공식 발언 ${statements.length}건`));
  for(const s of statements){const detail=candidateNode('details',undefined,'influence-evidence');detail.setAttribute('data-evidence-key','statement:'+(s.documentId||s.statementId||s.statementDate));detail.append(candidateNode('summary',`${s.statementDate||'날짜 미확인'} · ${s.title||'공식 발언'} · ${influenceStatus(s.verificationStatus)}`),candidateNode('p',`발언 시각 ${influenceDate(s.spokenAt)} · 공개 이용 기준 ${s.publicationTimePrecision==='DAY'?'(일 단위 보수값) ':''}${influenceDate(s.publishedAt)}`),candidateNode('p',`당시 직책 ${s.roleAtStatement?.role||s.role||person.role||'미확인'} · ${s.roleAtStatement?.organization||s.organizationAtStatement||s.organization||person.organization||'미확인'}`),candidateNode('p',`관련 기업 ${(s.relatedCompanies||[]).join(' · ')||'자료 없음'} · 산업 ${(s.relatedIndustries||[]).join(' · ')||'자료 없음'}`));
    if(s.statementDate)detail.append(candidateNode('p',`원문 기준 날짜 ${s.statementDate} · 날짜 단위 자료`));if(s.summary)detail.append(candidateNode('p',`자료 요약 · ${s.summary}`));
    if(s.spokenDate)detail.append(candidateNode('p',`발언 날짜 ${s.spokenDate} · 정확한 발언 시각 미확인`));if(s.publicationTimePrecision==='DAY')detail.append(candidateNode('p','공개 시각은 일 단위 자료의 보수적 종료 시각 · 실제 공개 시각으로 단정하지 않습니다.'));
    const analysis=s.analysis;if(analysis&&analysis.status!=='NOT_RUN'){detail.append(candidateNode('p',`AI 해석·공식 발언 아님${!/[가-힣]/.test(analysis.summary||'')?' · 영문 출력(한국어 변환 미검증)':''} · ${analysis.summary||analysis.text||'분석 대기'}`,'influence-interpretation'),candidateNode('p',`분석 모델 ${analysis.modelVersion||'미사용·확인 필요'} · 프롬프트 ${analysis.promptVersion||'확인 필요'} · 생성 ${influenceDate(analysis.generatedAt)} · 불확실성 ${(analysis.uncertainties||[]).join(' / ')||'검증 필요'} · 반대 근거 ${(analysis.counterEvidence||[]).join(' / ')||'미확보'}`));detail.append(candidateNode('p',`AI 해석 방향 ${({POSITIVE:'긍정',NEGATIVE:'부정',NEUTRAL:'중립',MIXED:'혼합'})[analysis.sentiment]||analysis.sentiment||'미확인'} · 관련 산업 ${(analysis.relatedIndustries||[]).join(' · ')||'분석 자료 없음'} · 해석상 관련 기업 ${(analysis.relatedCompanies||[]).join(' · ')||'분석 자료 없음'} · 직접 언급·추천 여부는 원문 확인 필요`,'influence-interpretation'));if(analysis.policyImpact)detail.append(candidateNode('p',`AI 정책 영향 해석 · ${analysis.policyImpact}`,'influence-interpretation'));if(analysis.investmentRelevance)detail.append(candidateNode('p',`AI 투자 관련성 해석 · ${analysis.investmentRelevance}`,'influence-interpretation'));for(const id of analysis.evidenceIds||[])detail.append(candidateNode('p',`AI 원문 근거 ID ${id}`));for(const evidence of analysis.sourceReferences||analysis.sources||[])influenceSource(detail,typeof evidence==='string'?{sourceUrl:evidence}:evidence);if(analysis.status)detail.append(candidateNode('p',`AI 실행 상태 ${analysis.status} · 분석은 사실 확인과 별도`));}else detail.append(candidateNode('p','AI 분석 미실행 · 숨겨진 의도를 추정하지 않습니다.','influence-interpretation'));
    influenceSource(detail,s);panel.append(detail);
  }
  const capitalDetails=candidateNode('details',undefined,'research-detail');capitalDetails.append(candidateNode('summary','자본 행동·기관 공시 상세 · 개인 거래와 구분'));panel.append(capitalDetails);
  const events=(influenceResearch.capitalEvents||[]).filter(e=>e.actorId===person.personId||e.personId===person.personId||e.actorType==='COMPANY').sort((a,b)=>(b.filingDate||'').localeCompare(a.filingDate||''));
  capitalDetails.append(candidateNode('h4',`공식 자본 행동 ${events.length}건 · 기업 행동은 인물의 개인 거래와 별도`));if(!events.length)capitalDetails.append(candidateNode('p','이 인물에게 연결된 검증 가능한 자본 행동 자료 없음 · 개인 거래를 추정하지 않습니다.'));
  const labels={REPORTED_EXECUTION_AGGREGATE:'보고기간 실제 실행 합계 · 일별 거래 아님',CONFIRMED_TRANSACTION:'확인된 거래',REPORTED_HOLDING_CHANGE:'보고된 보유 변화',ANNOUNCED_INTENTION:'발표된 의향'};
  for(const e of events){const card=candidateNode('article',undefined,'influence-evidence');card.append(candidateNode('h4',`${e.verificationStatus==='VERIFIED'?(['SNAPSHOT','REPORTED_HOLDING_SNAPSHOT'].includes(e.actionType)?'보고된 보유 잔고 · 변화 검증 아님':['UNCHANGED','REPORTED_HOLDING_UNCHANGED'].includes(e.actionType)?'동일 범위 보유량 변화 없음':['DECREASE','REPORTED_HOLDING_DECREASE'].includes(e.actionType)?'보고된 보유량 감소 · 실제 매도일 미확인':labels[e.eventType]||'유형 검증 대기'):'원문 검증 대기 · '+(e.eventType==='REPORTED_HOLDING_CHANGE'?'보유 보고':'거래 신고')} · ${e.companyId||e.securityId||'대상 확인 필요'} · ${e.actorType==='COMPANY'?'기업 자체 행동·인물과 연결 미확인':'인물 연결 근거 확인'}`),candidateNode('p',`${influenceStatus(e.verificationStatus)} · 거래일 ${e.transactionDate||'미확인·추정하지 않음'} · 보고기간 ${e.reportingPeriod&&typeof e.reportingPeriod==='object'?JSON.stringify(e.reportingPeriod):e.reportingPeriod||'미확인'}`),candidateNode('p',`공시일 ${e.filingDate||'미확인'} · 공개 이용 가능 ${influenceDate(e.publicAvailableAt)}`),candidateNode('p',`수량 ${Number.isFinite(e.quantity)?numberFormat.format(e.quantity)+' '+(e.quantityUnit||'주'):'미확인'} · 가격 ${Number.isFinite(e.price)?e.price+' '+(e.currency||'통화 미확인'):'미확인'} · 주식 종류 ${e.shareClass||e.securityId||'미확인'}`));if(e.eventType==='REPORTED_EXECUTION_AGGREGATE')card.append(candidateNode('p',`${e.actionType==='DIVIDEND_AND_SHARE_REPURCHASE_AGGREGATE'?'배당·자사주 매입 합계(공식 반올림 값)':'실제 재매입 현금지출'} ${Number.isFinite(e.amount)?numberFormat.format(e.amount)+' '+e.currency:'자료 부족'} · 기간 ${e.aggregatePeriodStart||'미확인'} ~ ${e.aggregatePeriodEnd||'미확인'} · 일별 매매일·주식수·체결 가격·개인 매매 미확인`));else if(Number.isFinite(e.amount))card.append(candidateNode('p',`공시 금액 ${numberFormat.format(e.amount)} ${e.currency||'통화 미확인'} · 실행 여부는 사건 유형 참조`));if(e.sourceValidationNote)card.append(candidateNode('p',e.sourceValidationNote));if(e.companyId==='MSFT')card.append(candidateNode('p',`${influenceResearch.signalResearch?.nonAppleMarketReview?.independentEvents>0?'보수적 날짜 기준 시장 반응 별도 확인 · 실제 최초 공개·총수익 미검증':'연구 자료 부족 · '+(e.collectionResearchReasons||[]).map(influenceRisk).join(' / ')} · 정확한 최초 공개 ${influenceDate(e.firstPublicAvailableAt)}`));influenceSource(card,e);capitalDetails.append(card);}
  const unrelated=(influenceResearch.capitalEvents||[]).filter(e=>e.actorId!==person.personId&&e.personId!==person.personId&&e.actorType!=='COMPANY');
  capitalDetails.append(candidateNode('h4',`기관·내부자 공시 ${unrelated.length}건 · 인물 개인 거래 연결 미확인`));
  for(const e of unrelated){const card=candidateNode('article',undefined,'influence-evidence');card.append(candidateNode('h4',`${e.verificationStatus==='VERIFIED'?(['SNAPSHOT','REPORTED_HOLDING_SNAPSHOT'].includes(e.actionType)?'보고된 보유 잔고 · 변화 검증 아님':['UNCHANGED','REPORTED_HOLDING_UNCHANGED'].includes(e.actionType)?'동일 범위 보유량 변화 없음':['DECREASE','REPORTED_HOLDING_DECREASE'].includes(e.actionType)?'보고된 보유량 감소 · 실제 매도일 미확인':labels[e.eventType]||'유형 검증 대기'):'원문 검증 대기 · '+(e.eventType==='REPORTED_HOLDING_CHANGE'?'보유 보고':'거래 신고')} · ${e.actorType==='INSTITUTION'?'기관':e.actorType==='INSIDER'?'내부자':'공시 주체'} ${e.actorName||'주체 이름 확인 필요'}`),candidateNode('p',`대상 ${e.companyId||e.securityId||'미확인'} · ${influenceStatus(e.verificationStatus)} · 선택한 인물의 개인 거래로 연결하지 않습니다.`),candidateNode('p',`보고기간 ${e.reportingPeriod&&typeof e.reportingPeriod==='object'?JSON.stringify(e.reportingPeriod):e.reportingPeriod||'미확인'} · 공시일 ${e.filingDate||'미확인'} · 거래일 ${e.transactionDate||'미확인·추정하지 않음'}`),candidateNode('p',`공개 이용 가능 ${influenceDate(e.publicAvailableAt)} · 수량 ${Number.isFinite(e.quantity)?numberFormat.format(e.quantity)+' '+(e.quantityUnit||'주'):'미확인'}`));if(e.publicationTimePrecision==='DAY')card.append(candidateNode('p','공개 이용 시각은 일 단위 보수값 · SEC 접수 시각을 실제 최초 공개 시각으로 단정하지 않습니다.'));if(e.holdingComparison){const prior=e.holdingComparison.prior,current=e.holdingComparison.current;card.append(candidateNode('p',`기관 보유 대조 · 이전 ${Number.isFinite(prior?.quantity)?numberFormat.format(prior.quantity)+'주':'자료 없음'} (${prior?.reportingPeriod||'기간 미확인'}) → 현재 ${Number.isFinite(current?.quantity)?numberFormat.format(current.quantity)+'주':'자료 없음'} (${current?.reportingPeriod||'기간 미확인'}) · 차이 ${Number.isFinite(e.holdingChange?.delta)?numberFormat.format(e.holdingChange.delta)+'주':'미확인·추정하지 않음'} · 실제 거래를 의미하지 않습니다.`));if(prior)influenceSource(card,prior);if(current)influenceSource(card,current);}if(e.reportedTransactionDate)card.append(candidateNode('p',`기존 신고자료 거래 날짜 ${e.reportedTransactionDate} · 원문 재검증 대기, 확정 거래일로 사용하지 않음`));if(e.sourceValidationNote)card.append(candidateNode('p',`원천자료 제한 · ${e.sourceValidationNote}`));if(e.sourceValidationNote)card.append(candidateNode('p',e.sourceValidationNote));if(e.companyId==='MSFT')card.append(candidateNode('p',`${influenceResearch.signalResearch?.nonAppleMarketReview?.independentEvents>0?'보수적 날짜 기준 시장 반응 별도 확인 · 실제 최초 공개·총수익 미검증':'연구 자료 부족 · '+(e.collectionResearchReasons||[]).map(influenceRisk).join(' / ')} · 정확한 최초 공개 ${influenceDate(e.firstPublicAvailableAt)}`));influenceSource(card,e);capitalDetails.append(card);}
  restorePeerView(panel,view);
}
function renderInfluenceResearch(data){
  const fingerprint=JSON.stringify(data);influenceResearch=data;
  const persons=data.people||[];if(!persons.some(p=>p.personId===selectedInfluencePerson))selectedInfluencePerson=persons[0]?.personId||null;
  byId('influence-message').textContent=`공식 근거 ${persons.length}명 · 기준 시각 ${influenceDate(data.asOf||data.generatedAt)} · 추천 HOLD`;
  byId('influence-message').className='message';
  if(fingerprint===influenceFingerprint)return;influenceFingerprint=fingerprint;
  const collection=data.capitalCollection||{},collectionTarget=byId('capital-collection-summary');collectionTarget.replaceChildren();for(const [key,label]of [['officialFilings','확보한 공식 공시'],['reportedHoldings','기관 보유 보고'],['verifiedHoldingChanges','검증 보유 변화'],['unchangedHoldings','동일 범위 변화 없음']])validationCount(collectionTarget,label,collection[key]);if(collection.lastCollectedAt)collectionTarget.append(candidateNode('p',`공식 자료 확인 ${influenceDate(collection.lastCollectedAt)} · 거래일은 원문 확인 없이 추정하지 않습니다.`));
  const corrections=byId('capital-correction-evidence'),correctionView=capturePeerView(corrections);corrections.replaceChildren();if((data.correctionReviews||[]).length){corrections.append(candidateNode('h3','기관 보유 보고 정정 · 보고 범위 검증'));for(const review of data.correctionReviews){const detail=candidateNode('details',undefined,'influence-evidence');detail.append(candidateNode('summary',`${review.reportingPeriod||'기간 미확인'} · ${review.amendmentType||'정정 유형 미확인'} · 정정 범위 확인`),candidateNode('p',`최초 문서 ${review.originalDocumentId||'미확인'} → 정정 문서 ${review.documentId||'미확인'} · 공개 이용 가능 ${influenceDate(review.publicAvailableAt)}`),candidateNode('p',`AAPL 포함 여부 ${review.aaplPresent===false?'정정 문서에 없음·보유량 0으로 처리하지 않음':review.aaplPresent===true?'포함·범위 확인 필요':'미확인'} · ${review.verificationStatus||'검증 대기'}`),candidateNode('p',`처리 근거 ${review.treatment||'기존 보유 보고를 임의 대체하지 않음'}`));influenceSource(detail,review);corrections.append(detail);}}restorePeerView(corrections,correctionView);
  const list=byId('influence-people');list.replaceChildren();
  for(const p of persons){const b=candidateNode('button',`${p.name} · 당시 ${p.roleAsOf?.role||p.role||'직책 미확인'} · ${influenceStatus(p.verificationStatus)}${p.personId===selectedInfluencePerson?' · 선택됨':''}`,'candidate-button');b.type='button';b.setAttribute('aria-pressed',String(p.personId===selectedInfluencePerson));b.addEventListener('click',()=>{selectedInfluencePerson=p.personId;influenceFingerprint=null;renderInfluenceResearch(influenceResearch);});list.append(b);}
  if(!persons.length)list.append(candidateNode('p','공식 인물 자료가 없습니다.','empty-state'));renderInfluencePerson();
  const target=byId('influence-signals');target.replaceChildren();const types={STATEMENT_SIGNAL:'발언 신호',CAPITAL_SIGNAL:'자본 행동 신호',COMBINED_SIGNAL:'발언·자본 결합 신호',STATEMENT_ONLY:'발언 단독',CAPITAL_ONLY:'자본 행동 단독',STATEMENT_CAPITAL_ALIGNED:'발언·행동 일치',STATEMENT_CAPITAL_DIVERGENT:'발언·행동 불일치',INSUFFICIENT_EVIDENCE:'근거 부족'};
  for(const signal of data.signals||[]){const statementRef=(data.statements||[]).find(x=>(signal.evidenceIds||[]).includes(x.statementId));const eventRef=(data.capitalEvents||[]).find(x=>(signal.evidenceIds||[]).includes(x.eventId));const actorDisplay=(data.people||[]).find(x=>x.personId===(signal.personId||signal.actorId))?.name||eventRef?.actorName||'주체 확인 필요';const title=signal.title||statementRef?.title||(eventRef?.actionType==='TREASURY_DISPOSAL'?'자기주식 처분':eventRef?.actionType==='TREASURY_ACQUISITION_PLAN'?'자기주식 취득 계획':'공식 근거 연구');const card=candidateNode('article',undefined,'candidate-card');card.append(candidateNode('h4',`${types[signal.signalType||signal.type]||'유형 검증 대기'} · ${title}`),candidateNode('p',`${eventRef?.actorType==='COMPANY'?'행동 주체':'관련 인물'} ${actorDisplay} · 기업 ${(signal.relatedCompanies||[]).join(' · ')||'미확인'}`),candidateNode('p',`공개 이용 가능 ${influenceDate(signal.publicAvailableAt)} · ${influenceStatus(signal.verificationStatus)}`),candidateNode('p',`관계 ${(signal.relationshipType==='OBSERVED'||signal.relationKind==='OBSERVED_ASSOCIATION')?'관측된 관계':'해석·인과관계 미확인'} · 위험 ${(signal.reasons||signal.risks||signal.riskFactors||[]).map(influenceRisk).join(' / ')||'자료·인과관계 검증 필요'}`),candidateNode('p',`시장 반응 ${influenceStatus(signal.marketReaction?.status)} · 투자 추천 HOLD`));if(signal.relationKind==='OFFICIAL_INSTITUTION_ASSOCIATION'){card.append(candidateNode('p','공식 기관 직책 관계 · 기관 보유 보고를 통한 연결이며 인물의 개인 매매가 아닙니다.'));const relationship=(data.actorRelationships||[]).find(r=>r.relationshipId===signal.relationshipId);if(relationship){if((relationship.limitations||[]).length)card.append(candidateNode('p',`관계 범위 제한 ${(relationship.limitations||[]).map(influenceRisk).join(' / ')} · 문서 기준 당시 관계이며 현재 직책을 단정하지 않습니다.`));card.append(candidateNode('p',`관계 ${relationship.role||relationship.relationshipType||'공식 직책'} · 유효기간 ${relationship.validFrom||'미확인'} ~ ${relationship.validTo||'자료 기준 이후 미확인'}`));influenceSource(card,relationship);}}for(const evidence of signal.evidence||[])influenceSource(card,typeof evidence==='string'?{sourceUrl:evidence}:evidence);for(const id of signal.evidenceIds||[]){const evidence=[...(data.statements||[]),...(data.capitalEvents||[])].find(x=>x.statementId===id||x.eventId===id);if(evidence)influenceSource(card,evidence);}target.append(card);}
  if(!(data.signals||[]).length)target.append(candidateNode('p','검증 가능한 신호가 없습니다. 가짜 신호나 성과 차트를 생성하지 않습니다.','empty-state'));
  renderSignalResearchResults(data);
  byId('influence-market').textContent=`시장 반응 ${(data.marketReaction?.status==='VERIFIED')?'검증 결과 상세 확인 필요':'검증 보류'} · 1·5·20거래일 · ${(data.marketReaction?.reasons||[]).map(influenceRisk).join(' / ')||'기업행동·같은 기간 벤치마크·공개 시각 자료 필요'} · 추천 HOLD`;
}
async function refreshInfluenceResearch(){
  if(influenceLoading)return;influenceLoading=true;byId('influence-refresh').disabled=true;byId('influence-message').textContent='공식 근거 확인 중…';
  try{renderInfluenceResearch(await candidateRequest('/api/v2/influence/research'));}catch{byId('influence-message').className='message error';byId('influence-message').textContent='연결 실패 · 현재 근거는 이전 조회 결과입니다. 새로고침으로 다시 확인하세요.';}finally{influenceLoading=false;byId('influence-refresh').disabled=false;}
}
byId('influence-refresh').addEventListener('click',refreshInfluenceResearch);
if(document.querySelectorAll)for(const link of document.querySelectorAll('a[href="#global-influence"],a[href="#signal-research"]'))link.addEventListener('click',refreshInfluenceResearch);
if(typeof window!=='undefined'&&window.setInterval){window.setInterval(()=>{if(document.visibilityState==='visible')refreshInfluenceResearch();},30000);refreshInfluenceResearch();}

function renderSignalResearchResults(data){
  const research=data.signalResearch||{},rows=Array.isArray(research)?research:(research.results||[]),target=byId('signal-research-results'),saved=capturePeerView(target);target.replaceChildren();
  const labels={STATEMENT_ONLY:'발언 단독',CAPITAL_ONLY:'자본 행동 단독',STATEMENT_CAPITAL_ALIGNED:'발언·행동 일치',STATEMENT_CAPITAL_DIVERGENT:'발언·행동 불일치',INSUFFICIENT_EVIDENCE:'근거 부족'};
  const counts=byId('signal-type-summary');counts.replaceChildren();for(const [key,label]of Object.entries(labels)){const distinct=new Set(rows.filter(r=>r.signalType===key).map(r=>r.signalId));validationCount(counts,label,distinct.size);}
  const filtered=rows.filter(r=>selectedSignalResearchType==='ALL'||r.signalType===selectedSignalResearchType);
  target.append(candidateNode('h3','시장 반응과 신호 유효성 연구'),candidateNode('p','공개 이용 가능 시점 이후 1·5·20거래일을 비교합니다. 가격수익률·배당 미포함·거래비용 미포함이며 연율화하지 않습니다. 단일 사건 반응은 예측력이나 인과관계의 증명이 아닙니다.'));
  const expansion=data.researchExpansion;
  if(expansion){const summary=candidateNode('section',undefined,'validation-counts');summary.id='signal-expansion-summary';for(const [name,value]of [['공식 발언',expansion.verifiedStatements],['공식 자본 자료',expansion.verifiedCapitalEvents],['검증된 결합 신호',expansion.combinedSignals],['신규 시장 반응',expansion.newMarketReactionSamples]])validationCount(summary,name,value);target.append(summary,candidateNode('p',`이번 추가 공식 발언 ${expansion.newStatements||0}건 · 자본 자료 ${expansion.newCapitalEvents||0}건 · 비Apple 공식 사건 ${expansion.nonAppleEvents||0}건 · ${expansion.newMarketReactionSamples>0?'Microsoft 1건의 보수적 시장 반응을 별도 확인했으며 다른 신규 사건은 검증 대기입니다.':'신규 사건 가격·기업행동·동일 기간 벤치마크는 검증 대기입니다.'} 보유 보고·기간 합계 실행·계획과 실제 일별 거래를 구분합니다.`));}
  if(expansion){const navigation=candidateNode('div',undefined,'research-jump-links');navigation.id='signal-expansion-navigation';for(const [href,label]of [['#signal-expanded-comparison','정확한 공개·보수적 신호 그룹 비교'],['#expanded-index-observations','신규 공식 발언 지수 관측'],['#nonapple-market-research','Microsoft 신규 시장 반응']]){const link=candidateNode('a',label);link.href=href;navigation.append(link,candidateNode('span',' · '));}target.append(navigation);}
  const actual=data.actualMarketReview;
  if(actual){
    const panel=candidateNode('section',undefined,'company-evidence');panel.id='sec-apple-market-evidence';
    panel.append(candidateNode('h4','SEC 공개 시각 · Apple 실제 과거 가격'),candidateNode('p','확보한 가격과 시장 반응 검증은 다릅니다. 접수 시각은 실제 웹 공개 시각이 아니며, 아래 관측 후보 날짜는 실행 가능한 거래일로 확정하지 않습니다.'));
    const price=actual.applePrice||{},bench=actual.benchmark||{};
    panel.append(candidateNode('p',`Apple ${price.exchange||'거래소 미확인'} · ${price.currency||'통화 미확인'} · ${price.count||0}개 실제 관측 · 원주가 RAW_CLOSE / 수정종가 미확보`),candidateNode('p',`가격 확보 구간 ${(price.coverage||[]).map(c=>`${c.from} ~ ${c.through} (${c.count}개)`).join(' / ')||'자료 부족'} · 구간 사이 결측은 보간하지 않습니다.`),candidateNode('p',`벤치마크 ${bench.benchmarkId||'미확인'} · ${bench.coverage?.from||'미확인'} ~ ${bench.coverage?.through||'미확인'} · ${bench.coverage?.count||0}개 · 배당 미포함 가격지수`),candidateNode('p',`거래 달력 ${actual.calendar?.timeZone||'미확인'} · ${actual.calendar?.status||'INSUFFICIENT_DATA'} · 검증된 시장 반응 표본 ${actual.verifiedSamples||0}개 · MARKET_REACTION_BLOCKED`));
    influenceSource(panel,{sourceUrl:price.sourceUrl});influenceSource(panel,{sourceUrl:bench.sourceUrl});influenceSource(panel,{sourceUrl:actual.calendar?.sourceUrl});
    const relation=actual.buffettRelation;if(relation){panel.append(candidateNode('h4','버핏 서한과 Apple 보유 변화'),candidateNode('p',`서한 기준 ${relation.statementDate} · Apple 직접 언급 ${relation.appleDirectMention?'확인됨':'검증 대기'} · 소수지분 보유 기업의 일반 설명`),candidateNode('p','2월 SEC 보고 뒤 서한이 공개되었고, 이후 3월 보유량은 동일하며 6월 보고에서 감소했습니다. 이 선후관계만으로 발언·매매 방향 일치나 인과관계를 확정하지 않습니다. 결합 신호 INSUFFICIENT_EVIDENCE · 개인 거래일 미확인.'));influenceSource(panel,relation);}
    for(const publication of actual.publications||[]){const detail=candidateNode('details',undefined,'influence-evidence');detail.setAttribute('data-evidence-key','publication:'+publication.accessionNumber);detail.append(candidateNode('summary',`${publication.accessionNumber} · 보고기간 ${publication.reportingPeriodEnd||'미확인'} · 공개 시각 미확인`),candidateNode('p',`기관 ${publication.institution||'미확인'} · CIK ${publication.cik||'미확인'} · CUSIP ${publication.cusip||'미확인'} · 주식 종류 ${publication.shareClass||'미확인'} · 수량 ${Number.isFinite(publication.quantity)?numberFormat.format(publication.quantity)+'주':'미확인'}`),candidateNode('p',`SEC 접수 ${publication.acceptedAt||'미확인'} (미국 동부) · 접수일 ${publication.filingDate||'미확인'} · 접수 기록 ${publication.acceptanceStatus||'검증 대기'}`),candidateNode('p','실제 최초 공개 시각 미확인 · 거래일 미확인 · 거래 가능 시점 TRADEABLE_FROM_UNVERIFIED · 평균 공개 지연을 더해 시각을 만들지 않습니다.'));
    const eventRows=(actual.events||[]).filter(e=>e.accessionNumber===publication.accessionNumber);if(eventRows.length)validationTable(detail,'사건별 기간 자료 확보 · 수익률 보류',['기간','접수 기준 관측 후보 시작','관측 후보 끝','필요 관측 수','공통 가격 확보','Apple 참고 종가·일자','시장 반응','초과수익'],eventRows.map(e=>[`${e.horizon}거래일`,e.candidateStartDate||'미확인',e.candidateEndDate||'미확인',e.observationsRequired,`${e.observationsAvailable}개 · ${e.priceCoverageStatus}`,e.priceCoverageStatus==='VERIFIED'&&Number.isFinite(e.candidateStartPrice?.close)?`${e.candidateStartPrice.close.toFixed(2)} USD · ${e.candidateStartPrice.tradingDate} · 실행 가격 아님`:'자료 부족','보류 · MARKET_REACTION_BLOCKED','— · 공개 시각·거래 가능 가격·기업행동 검증 필요']));influenceSource(detail,publication);panel.append(detail);}
    const conservative=actual.conservativeEvents||[];
    panel.append(candidateNode('h4','보수적 공개 근거 이후 시장 반응 · CONSERVATIVE_START'),candidateNode('p','SEC 야간 공개 색인의 원본 수정 시각을 보수적 연구 경계로 사용합니다. 최초 공개 시각이나 당시 수신 로그가 확인된 결과는 아닙니다. 경계 뒤 첫 거래일 종가부터 비교하며 실제 체결 성과와 구분합니다.'));
    const samples=actual.conservativeSamples||{};panel.append(candidateNode('p',`보수적 유효 표본: 1거래일 ${samples[1]||0}개 · 5거래일 ${samples[5]||0}개 · 20거래일 ${samples[20]||0}개 · 정확한 최초 공개 시각 표본 ${actual.verifiedSamples||0}개`));
    const actions=actual.corporateActions;if(actions){panel.append(candidateNode('p',`Apple 기업행동 ${actions.status} · 원주가 가격수익률 · 배당 미포함 · 조정계수 적용 없음`));for(const e of actions.events||[])panel.append(candidateNode('p',`현금배당 ${e.amount} USD · 배당락 ${e.exDate} · 기준일 ${e.recordDate} · 지급일 ${e.paymentDate}`));}
    if(actions){for(const source of actions.sources||[])influenceSource(panel,source);influenceSource(panel,actions.splitReview);}
    const pct=(e,k)=>e.verificationStatus==='VERIFIED_CONSERVATIVE'&&Number.isFinite(e[k])?e[k].toFixed(2)+'%':'— · 보류';
    if(conservative.length)validationTable(panel,'보수적 시작점 연구 · 같은 거래일 가격수익률',['공시','기간','공개 근거 경계','거래 가능 세션','시작 종가 일자','종료 일자','Apple 시작 종가','Apple 종료 종가','Apple 수익률','S&P 500 수익률','초과수익률','판정·차단 사유'],conservative.map(e=>[e.accessionNumber,`${e.horizon}거래일`,e.conservativeAvailableBy||'미확인',e.tradeableFrom||'미확인',e.startDate||'보류',e.endDate||'보류',Number.isFinite(e.startPrice)?`${e.startPrice.toFixed(2)} USD`:'—',Number.isFinite(e.endPrice)?`${e.endPrice.toFixed(2)} USD`:'—',pct(e,'securityReturn'),pct(e,'benchmarkReturn'),pct(e,'excessReturn'),`${e.verificationStatus} · ${(e.reasons||[]).join(' / ')||'CONSERVATIVE_START · 예측력 미검증'}`]));
    for(const e of conservative.filter(e=>e.horizon===1))influenceSource(panel,e);
    panel.append(candidateNode('p','원주가에 조정을 중복 적용하지 않습니다. 공식 배당락일과 분할 이력을 조사한 원주가 가격수익률 연구이며, 배당 포함 총수익률과 기타 미확인 기업행동은 별도로 보류합니다. 투자 전략의 유효성이 입증된 상태가 아닙니다.'));target.append(panel);
  }
  const returnValue=(r,key)=>r.verificationStatus==='VERIFIED'&&Number.isFinite(r[key]??(key==='observedReturn'?r.securityReturn:null))?((r[key]??r.securityReturn)*100).toFixed(2)+'%':'— · 자료 부족 (INSUFFICIENT_DATA)';
  const researchTitle=r=>{const signal=(data.signals||[]).find(s=>s.signalId===r.signalId),ids=signal?.evidenceIds||[];const statement=(data.statements||[]).find(s=>ids.includes(s.statementId)),event=(data.capitalEvents||[]).find(e=>ids.includes(e.eventId));if(statement){const person=(data.people||[]).find(p=>p.personId===statement.personId);return person?.personId==='powell'||/Powell|파월/i.test(person?.name||'')?'파월 공식 연설':person?.personId==='buffett'||/Buffett|버핏/i.test(person?.name||'')?'버핏 주주서한':statement.title||'공식 발언';}if(event)return event.actionType==='TREASURY_DISPOSAL'?'SK 자기주식 처분':event.actionType==='TREASURY_ACQUISITION_PLAN'?'SK 자기주식 취득 계획':event.actorName?'공식 자본 행동 · '+event.actorName:'공식 자본 행동';return signal?.title||'공식 근거 연구';};
  if(filtered.length)validationTable(target,'신호별 시장 반응 · 같은 관측기간 비교',['신호 · 유형','공개 이용 가능 시각','거래 가능 시점','대상 종목','벤치마크','연구 기간','종목 수익률','벤치마크 수익률','초과수익률','검증 표본 수','검증 상태','자료 품질','연구 한계'],filtered.map(r=>[`${researchTitle(r)} · ${labels[r.signalType]||'유형 미확인'}`,influenceDate(r.publicAvailableAt),influenceDate(r.tradeableFrom),r.securityId||r.relatedSecurity||'미확인',typeof (r.benchmarkId||r.benchmark)==='object'?r.benchmark?.name||r.benchmark?.id||'미확인':r.benchmarkId||r.benchmark||'미확인',`${r.horizon||'미확인'}거래일`,returnValue(r,'observedReturn'),returnValue(r,'benchmarkReturn'),returnValue(r,'excessReturn'),Number.isInteger(r.sampleSize)?r.sampleSize:'미확인',`${influenceStatus(r.verificationStatus)} · ${r.verificationStatus||'INSUFFICIENT_DATA'}${r.verificationStatus!=='VERIFIED'?' · MARKET_REACTION_BLOCKED':''}`,typeof r.dataQuality==='object'?JSON.stringify(r.dataQuality):r.dataQuality||'자료 품질 검증 대기',(r.limitations||[]).map(influenceRisk).join(' / ')||'통계적 유효성·표본 편향 미검증']));
  else target.append(candidateNode('p','해당 유형의 실제 연구 결과 없음 · INSUFFICIENT_DATA · 가짜 수익률을 만들지 않습니다.','empty-state'));
  const expandedComparison=research.comparison;
  if(expandedComparison){const summary=candidateNode('section',undefined,'signal-group-comparison');summary.id='signal-expanded-comparison';summary.append(candidateNode('h4','정확한 공개·보수적 시작점 별도 신호 비교'),candidateNode('p',`독립 사건 ${expandedComparison.independentEventCount||0}건 · 기간 관측 ${expandedComparison.observationCount||0}행 · 정확한 공개 ${expandedComparison.exactPublicTimeEventCount||0}건 · 보수적 시작점 ${expandedComparison.conservativeEventCount||0}건. 같은 사건의 1·5·20거래일을 서로 독립인 3개 사건으로 세지 않습니다.`),candidateNode('p','현재 통계 범위는 Apple·S&P 500 원주가 가격수익률입니다. 과거 자료를 사후 조사한 고정 규칙이며 사전 등록·독립 검증 기간은 미확보입니다. 시장 상황·산업 편향·공개 지연·거래비용을 통제하지 않아 예측력이나 그룹 우위를 판정하지 않습니다.'));
   const groupNames={STATEMENT_ONLY:'발언 단독',CAPITAL_ONLY:'자본 자료 단독',COMBINED:'결합 신호'},format=(g,k)=>g.sampleSize>0&&Number.isFinite(g[k])?g[k].toFixed(2)+' pp':'— · 자료 부족';
   validationTable(summary,'신호 유형·공개 기준·기간별 비교',['그룹','공개 기준','기간','독립 표본','평균 초과수익','중앙값 초과수익','양의 초과수익 비율','종목 손실 사건','초과수익 음수 사건','판정'],(expandedComparison.groups||[]).map(g=>[groupNames[g.group]||g.group,g.analysisMode==='CONSERVATIVE_START'?'보수적 시작점':'정확한 공개',`${g.horizon}거래일`,g.sampleSize,format(g,'meanExcessReturn'),format(g,'medianExcessReturn'),g.sampleSize>0&&Number.isFinite(g.positiveExcessRatio)?(g.positiveExcessRatio*100).toFixed(1)+'%':'—',g.sampleSize>0?(g.lossCases||[]).length:'—',g.sampleSize>0?(g.negativeExcessCases||[]).length:'—',g.sampleSize>0?'기술 통계 · 예측력 미검증':'자료 부족']));target.append(summary);
  }
  const comparison=research.groupComparison||research.groupComparisons||{},groups=Array.isArray(comparison)?comparison:(comparison.groups||[]);
  const groupPanel=candidateNode('section',undefined,'signal-group-comparison');groupPanel.append(candidateNode('h4','신호 그룹별 비교 · 통계적 우위 미확인'),candidateNode('p','같은 기간의 검증 표본만 비교합니다. 평균·중앙값·양의 초과수익 비율은 위험 조정 성과가 아닙니다. 표본이 부족하면 유효성·예측 성공을 주장하지 않습니다.'));
  const groupLabels={STATEMENT_ONLY:'발언 단독',CAPITAL_ONLY:'자본 행동 단독',COMBINED:'결합 신호',STATEMENT_CAPITAL_ALIGNED:'발언·행동 일치',STATEMENT_CAPITAL_DIVERGENT:'발언·행동 불일치'};
  const statistic=(g,key)=>Number.isInteger(g.sampleSize)&&g.sampleSize>0&&Number.isFinite(g[key])?(g[key]*100).toFixed(2)+'%':'— · 자료 부족';
  if(groups.length)validationTable(groupPanel,'신호 그룹별 표본과 기술 통계',['연구 그룹','기간','검증 표본 수','평균 초과수익률','중앙값 초과수익률','양의 초과수익 비율','손실 사례','검증 상태','제한 사항'],groups.map(g=>[groupLabels[g.group||g.signalType]||'유형 미확인',`${g.horizon||'미확인'}거래일`,Number.isInteger(g.sampleSize)?g.sampleSize:'미확인',statistic(g,'meanExcessReturn'),statistic(g,'medianExcessReturn'),statistic(g,'positiveExcessRatio'),g.sampleSize>0&&Array.isArray(g.lossCases)?g.lossCases.length:Number.isInteger(g.lossCases)&&g.sampleSize>0?g.lossCases:'— · 자료 부족',`${influenceStatus(g.verificationStatus)} · 통계적 우위 미확인`,(g.limitations||[]).map(influenceRisk).join(' / ')||'표본 부족·시장 상황·산업 편향·공개 지연·거래비용 검증 필요']));else groupPanel.append(candidateNode('p','그룹별 검증 표본 자료 없음 · INSUFFICIENT_DATA · 비교 통계를 만들지 않습니다.','empty-state'));
  target.append(groupPanel);
  const nonapple=research.nonAppleMarketReview;
  if(nonapple){const section=candidateNode('section',undefined,'company-evidence');section.id='nonapple-market-research';section.append(candidateNode('h4','Microsoft 신규 공식 자본 행동 · Apple와 별도 연구'),candidateNode('p',`MSFT · USD · ${nonapple.coverage?.count||0}개 가격 · ${nonapple.coverage?.from||'자료 부족'} ~ ${nonapple.coverage?.through||'자료 부족'} · 원주가 RAW_CLOSE · 배당 미포함 가격수익률`),candidateNode('p','2025-07-30 공식 발표와 SEC 8-K의 발행 날짜 확인을 이용한 보수적 날짜 종료 기준입니다. 정확한 최초 공개 시각·개별 거래일·개인 행동은 미확인입니다. 발표에는 실적과 여러 정보가 함께 있어 자본 행동의 효과만 분리하지 못합니다.'),candidateNode('p',`신규 독립 사건 ${nonapple.independentEvents||0}건 · 검증 기간 관측 ${nonapple.verifiedSamples||0}행 · 공개 기준 ${nonapple.publication?.conservativeAvailableBy||'자료 부족'} · 첫 종가 이후 종가 비교이며 실제 체결 성과가 아닙니다.`));
    const capital=influenceResearch?.capitalEvents?.find(e=>e.eventId==='microsoft-fy25-q4-capital-return-aggregate');if(capital?.verificationStatus==='VERIFIED'){section.append(candidateNode('p',`공식 자본 행동 · 배당·자사주 매입 합계 ${numberFormat.format(capital.amount)} ${capital.currency} · ${capital.aggregatePeriodStart} ~ ${capital.aggregatePeriodEnd} · 공식 반올림 값 · 개별 거래일·수량 미확인`));influenceSource(section,capital);}
    validationTable(section,'Microsoft·S&P 500 보수적 기간별 시장 반응',['기간','시작일','종료일','시작·종료 가격 USD','MSFT 가격수익률','S&P 500 가격지수','초과수익 pp','판정'],(nonapple.events||[]).map(e=>{const valid=e.verificationStatus==='VERIFIED_CONSERVATIVE',percent=v=>valid&&Number.isFinite(v)?v.toFixed(2)+'%':'— · 자료 부족';return [`${e.horizon}거래일`,e.startDate||'자료 부족',e.endDate||'자료 부족',valid?`${e.startPrice} → ${e.endPrice}`:'자료 부족',percent(e.securityReturn),percent(e.benchmarkReturn),valid&&Number.isFinite(e.excessReturn)?e.excessReturn.toFixed(2)+' pp':'— · 자료 부족',valid?'보수적 연구 · CONSERVATIVE_START':(e.reasons||[]).map(influenceRisk).join(' / ')||'검증 대기'];}));
    const scoped=(nonapple.comparisonReview?.comparison?.scopeGroups||[]).filter(g=>g.securityId==='MSFT:COMMON'&&g.analysisMode==='CONSERVATIVE_START');if(scoped.length)validationTable(section,'Microsoft 신호 그룹 비교 · 정확한 공개 시각 표본 0',['그룹','기간','독립 사건','평균·중앙 초과수익 pp','양의 초과수익 비율','주가 손실 사례'],scoped.map(g=>[({STATEMENT_ONLY:'발언 단독',CAPITAL_ONLY:'자본 행동 단독',COMBINED:'결합 신호'})[g.group]||g.group,`${g.horizon}거래일`,g.sampleSize,g.sampleSize>0?`${g.meanExcessReturn.toFixed(2)} / ${g.medianExcessReturn.toFixed(2)} pp`:'— · 자료 부족',g.sampleSize>0?`${(g.positiveExcessRatio*100).toFixed(0)}%`:'— · 자료 부족',g.sampleSize>0?g.lossCases.length:'— · 자료 부족']));
    section.append(candidateNode('p',`발언 단독·결합 신호 표본 0 · Microsoft 자본 행동 단독 사건 ${nonapple.independentEvents||0}개를 Apple 2개와 무근거 합산하지 않습니다. 총수익률·거래비용·독립 검증 기간·예측력은 미검증 · 추천 HOLD`));
    for(const event of nonapple.events||[])for(const sourceUrl of event.sourceUrls||[])if(!section.querySelector||!Array.from(section.querySelectorAll('a')).some(a=>a.href===sourceUrl))influenceSource(section,{sourceUrl});influenceSource(section,nonapple);target.append(section);
  }
  const newObservations=research.newIndexObservations||[];
  if(newObservations.length){const section=candidateNode('section',undefined,'index-observation');section.id='expanded-index-observations';section.append(candidateNode('h4','신규 공식 발언 이후 시장지수 관측 · 초과수익 표본 아님'),candidateNode('p','공식 발언 날짜 뒤 첫 S&P 500 종가를 기준으로 조사한 일 단위 관측입니다. 정확한 최초 공개 시각·개별 종목·대조군이 없어 발언의 영향이나 투자 신호의 초과수익으로 사용하지 않습니다.'));
   for(const o of newObservations){section.append(candidateNode('h4',o.title||o.statementId));validationTable(section,'신규 발언의 보수적 지수 관측',['기간','시작일','종료일','S&P 500 가격지수 수익률','초과수익','판정'],(o.periods||[]).map(p=>[`${p.horizon}거래일`,p.startDate||'자료 부족',p.endDate||'자료 부족',o.status==='DESCRIPTIVE_ONLY'&&p.status==='DESCRIPTIVE_ONLY'&&Number.isFinite(p.observedIndexReturn)?(p.observedIndexReturn*100).toFixed(2)+'%':'—','— · 개별 종목·대조군 없음','설명용 관측 · 검증 신호 0']));influenceSource(section,{sourceUrl:o.statementSourceUrl});influenceSource(section,o);}target.append(section);
  }
  const observation=research.indexObservation;
  if(observation){const section=candidateNode('section',undefined,'index-observation');section.append(candidateNode('h4','보수적 일별 지수 관측 · 신호 유효성 검증과 별도'),candidateNode('p',`지수 ${observation.index||'미확인'} · 기준 시작일 ${observation.baselineDate||'미확인'} · 가격지수 수익률·배당 미포함`),candidateNode('p','실제 최초 공개 시각 미확인 · 보수적 일 단위 기준의 관측입니다. 예측력·초과수익 검증이 아닙니다.'));
    const observed=(observation.periods||[]).filter(p=>observation.status==='DESCRIPTIVE_ONLY'&&p.status==='DESCRIPTIVE_ONLY'&&Number.isFinite(p.observedIndexReturn));
    if(observed.length)validationTable(section,'지수 관측 결과 · 투자 신호 검증 아님',['관측 기간','시작일','종료일','지수 가격수익률','초과수익률','관측 상태'],observed.map(p=>[`${p.horizon}거래일`,p.startDate||'미확인',p.endDate||'미확인',(p.observedIndexReturn*100).toFixed(2)+'%','— · 검증하지 않음','설명용 관측 (DESCRIPTIVE_ONLY)']));
    else section.append(candidateNode('p','관측값 자료 부족 · INSUFFICIENT_DATA · 검증되지 않은 숫자를 표시하지 않습니다.','empty-state'));
    section.append(candidateNode('p',`관측 사건 ${Number.isInteger(observation.observedEvents)?observation.observedEvents:'미확인'}건 · 검증 신호 표본 ${Number.isInteger(observation.verifiedSignalSamples)?observation.verifiedSignalSamples:'미확인'}건 · ${(observation.limitations||[]).map(influenceRisk).join(' / ')||'최초 공개 시각·사건 이전 추세·유사 사건·표본 편향 검증 필요'}`));influenceSource(section,observation);target.append(section);
  }
  target.append(candidateNode('p',`공통 연구 한계 ${(research.limitations||[]).map(influenceRisk).join(' / ')||'표본 부족·선택 편향·생존자 편향·공시 지연 검증 필요'} · 추천 HOLD`));restorePeerView(target,saved);
}
byId('signal-research-filter').addEventListener('change',()=>{selectedSignalResearchType=byId('signal-research-filter').value;if(influenceResearch)renderSignalResearchResults(influenceResearch);});

// Concise research screens share the same read-only API in Web and Android.
let simpleResearchData=null,simpleResearchLoading=false,selectedResearchPeriod='ALL',selectedResearchEvent=null,researchCandidateQuery='',researchReadinessFilter='ALL',selectedCurrentCompany=null;
const researchPercent=v=>Number.isFinite(v)?v.toFixed(2)+'%':'자료 확인 중';
function renderResearchEvent(card,{compact=false}={}){
 const node=candidateNode('article',undefined,'research-event-card');node.setAttribute('data-event-id',card.eventId);if(selectedResearchEvent===card.eventId)node.classList.add('research-event-selected');
 const header=candidateNode('div',undefined,'research-card-heading');header.append(candidateNode('h3',`${card.companyName} · ${card.companyId}`),candidateNode('span','보수적 연구','research-badge'));node.append(header,candidateNode('p',`${card.actorName} · ${card.eventLabel}`,'research-card-context'),candidateNode('p',`${card.eventDate} 공개 자료 · S&P 500 비교`,'research-card-date'));
 const periods=candidateNode('div',undefined,'research-return-grid');
 for(const horizon of [1,5,20].filter(h=>selectedResearchPeriod==='ALL'||String(h)===selectedResearchPeriod)){const p=(card.periods||[]).find(r=>r.horizon===horizon&&r.verificationStatus==='VERIFIED_CONSERVATIVE');const item=candidateNode('div',undefined,'research-return');if(p&&Number.isFinite(p.excessReturn))item.classList.add(p.excessReturn<0?'return-negative':p.excessReturn>0?'return-positive':'return-neutral');item.append(candidateNode('span',`${horizon}거래일 초과수익`),candidateNode('strong',p&&Number.isFinite(p.excessReturn)?p.excessReturn.toFixed(2)+'%p':'연구 보류'),candidateNode('small',p?`${p.startDate} → ${p.endDate}`:'공통 가격 확인 중'));periods.append(item);}node.append(periods);
 if(!compact){const details=candidateNode('details',undefined,'research-detail');details.setAttribute('data-evidence-key',card.eventId);details.append(candidateNode('summary','공식 근거와 연구 범위 확인'),candidateNode('p',`정확한 최초 공개 시각 미확인 · 보수적 기준 ${card.conservativeAvailableBy} · 원주가 가격수익률 · 배당·거래비용 미포함 · 실제 체결 성과 아님`));
 for(const row of card.periods||[]){details.append(candidateNode('p',`${row.horizon}거래일 · 종목 ${researchPercent(row.securityReturn)} / S&P 500 ${researchPercent(row.benchmarkReturn)} · ${row.startDate} ~ ${row.endDate} · ${row.startPrice} → ${row.endPrice} USD`));}influenceSource(details,card);node.append(details);const button=candidateNode('button',selectedResearchEvent===card.eventId?'선택한 연구':'이 연구 선택','research-select');button.type='button';button.setAttribute('aria-pressed',String(selectedResearchEvent===card.eventId));button.addEventListener('click',()=>{selectedResearchEvent=card.eventId;renderSimpleResearch(simpleResearchData);if(typeof window!=='undefined')window.location.hash='research-selected-event';});node.append(button);}
 if(compact){const link=candidateNode('a','연구 결과와 공식 근거 보기 →','research-card-link');link.href='#research-selected-event';link.addEventListener('click',()=>{selectedResearchEvent=card.eventId;renderSimpleResearch(simpleResearchData);});node.append(link);}
 return node;
}
const currentReasonLabels={CURRENT_AMENDMENT_REVIEW_REQUIRED:'정정 공시 관계 검토 필요',CURRENT_COLLECTION_BLOCKED:'공식 자료 수집 차단 · 기존 근거만으로 추천 불가',OFFICIAL_DOCUMENT_UNVERIFIED:'공식 원문 근거 확인 필요',OFFICIAL_EVIDENCE_REQUIRED:'공식 원문 검증 필요',TRANSACTION_DATE_UNVERIFIED:'신고 거래일 검증 필요',D2_AVAILABILITY_WAIT:'공개 확인 후 D-2 이용 가능 기준 대기',CURRENT_PRICE_REQUIRED:'최신 가격 확인 필요',FINANCIAL_PEER_RISK_REVALIDATION_REQUIRED:'최신 재무·비교기업·위험 재검증 필요',CORPORATE_ACTION_COVERAGE_REQUIRED:'기업행동 전체 범위 확인 필요',PREDICTIVE_VALIDATION_REQUIRED:'추천 예측력 검증 미완료'};
const researchStageLabels={'Official Source Collection':'공식 자료 수집','Statement AI Analysis':'발언 해석 검토','Capital Behavior Validation':'자본 행동 검증','Public Availability Validation':'공개 시점 검증','Market Expectation Research':'시장 기대 자료 확인','Signal Correlation':'발언·행동 관계 검토','Market Reaction Research':'시장 반응 연구','Backtesting & Risk Validation':'백테스트·위험 검토','API & UI Update':'화면 자료 갱신','Automated QA Report':'저장 근거 보고'};
const researchStageReasons={EXTERNAL_COLLECTION_OWNED_BY_EXISTING_COLLECTOR:'기존 수집기가 공식 자료를 담당합니다.',EXTERNAL_COLLECTION_DISABLED:'외부 자동 수집이 꺼져 있습니다.',VERIFIED_FULL_SOURCE_CONTEXT_REQUIRED:'원문 전체 맥락이 필요합니다.',SAVED_LOCAL_ANALYSIS_AVAILABLE:'저장된 해석 자료를 확인했습니다.',TRANSACTION_HOLDING_INTENTION_AND_AGGREGATE_SEPARATE:'실제 거래·보유 변화·계획을 구분해 검토합니다.',EXACT_PUBLIC_TIME_UNVERIFIED:'정확한 최초 공개 시각이 확인되지 않았습니다.',CONSENSUS_DATA_UNAVAILABLE:'검증된 시장 기대 자료가 없습니다.',ACTOR_DIRECTION_COUNTER_EVIDENCE_REQUIRED:'행동 주체와 방향, 반대 근거 확인이 필요합니다.',CONSERVATIVE_RESEARCH_NOT_PREDICTION:'보수적 시작점의 과거 관측이며 예측이 아닙니다.',DESCRIPTIVE_BACKTEST_ONLY:'기술 통계 단계이며 전략 유효성은 미검증입니다.',SAME_READ_ONLY_DASHBOARD_CONTRACT:'같은 읽기 전용 API로 화면에 연결합니다.',SAVED_EVIDENCE_QA_REPORT_NOT_TEST_EXECUTION:'저장 근거 보고이며 테스트 실행과 별도입니다.'};
function matchingResearchCandidates(candidates){const q=researchCandidateQuery.trim().toLocaleLowerCase();return candidates.filter(c=>{const ready=(c.detail?.readiness?.confirmed||[]).includes('revenue');return (researchReadinessFilter==='ALL'||(researchReadinessFilter==='TTM'?ready:!ready))&&(!q||[c.companyName,c.companyId,...(c.events||[]).map(e=>e.actorName||e.reportingOwnerName||'')].join(' ').toLocaleLowerCase().includes(q));});}
function showCurrentCompany(companyId){researchCandidateQuery=String(companyId).slice(0,100);researchReadinessFilter='ALL';selectedCurrentCompany=companyId;byId('research-candidate-search').value=researchCandidateQuery;byId('research-readiness-filter').value='ALL';if(simpleResearchData)renderSimpleResearch(simpleResearchData);if(typeof window!=='undefined')window.location.hash='investment-signals';}
function addRelatedCompanyLink(target,companyId){if(typeof companyId!=='string'||!companyId)return;const b=candidateNode('button',companyId+' 관련 후보 보기','candidate-button');b.type='button';b.addEventListener('click',()=>showCurrentCompany(companyId));target.append(b);}
function renderCurrentCandidate(candidate,{compact=false}={}){
 const card=candidateNode('article',undefined,'research-card');
 card.append(candidateNode('h3',`${candidate.companyName} · ${candidate.companyId}`),candidateNode('span','분석 후보 · 추천 보류','research-badge'));
 if(selectedCurrentCompany===candidate.companyId)card.append(candidateNode('span','선택한 기업','research-badge'));
 const price=candidate.price;
 card.append(candidateNode('p',price?`${price.close.toLocaleString('ko-KR')} ${price.currency} · 원주가 · 가격 기준 ${price.priceDate}`:'최신 가격 자료 확인 중'),candidateNode('p',`최근 공시 ${candidate.latestDisclosureDate} · 원문 확인 ${candidate.verifiedEvents} / ${candidate.events.length}건`,'research-card-date'));
 card.append(candidateNode('p',(candidate.blockers||[]).slice(0,compact?1:3).map(r=>currentReasonLabels[r]||'추가 근거 확인 필요').join(' · '),'research-note'));
 const readiness=candidate.detail?.readiness;if(readiness){const summary=candidateNode('section',undefined,'research-readiness');summary.setAttribute('aria-label','자료 준비 요약');summary.append(candidateNode('h4','자료 준비 요약'));const items=readiness.items||[];const confirmed=items.filter(i=>i.status==='VERIFIED');summary.append(candidateNode('p',confirmed.length?'확인됨 · '+confirmed.map(i=>i.label).join(' · '):'확인된 평가 자료를 준비하고 있습니다.'));const pending=items.filter(i=>i.status!=='VERIFIED');summary.append(candidateNode('p','다음에 필요한 자료','research-note'));const list=candidateNode('ul');for(const item of pending.slice(0,compact?2:3))list.append(candidateNode('li',`${item.label} · ${item.status==='PENDING'?'검증 대기':'자료 부족'}`));summary.append(list);if(!compact){const more=candidateNode('details',undefined,'research-detail');more.setAttribute('data-evidence-key','readiness:'+candidate.companyId);more.append(candidateNode('summary','자료별 기준일·출처 보기'));for(const item of items){const entry=candidateNode('div');entry.append(candidateNode('p',`${item.label} · ${item.status==='VERIFIED'?'확인됨':item.status==='PENDING'?'검증 대기':'자료 부족'}`));if(item.next)entry.append(candidateNode('p',item.next));const e=item.evidence;if(e){if(e.periodStart&&e.periodEnd)entry.append(candidateNode('p',`재무 기간 ${e.periodStart} ~ ${e.periodEnd} · ${e.currency||'통화 미확인'}`));if(Number.isFinite(e.observedValue))entry.append(candidateNode('p',`관측값 ${e.observedValue.toLocaleString('ko-KR')} ${e.unit==='SHARES'?'주':e.currency||''}${e.reportedDecimals?' · 원문 decimals '+e.reportedDecimals:''} · 평가 입력 검증과 별도`));if(e.asOfDate)entry.append(candidateNode('p',`관측 기준일 ${e.asOfDate} · 평가 검증 완료와 별도`));if(e.sources?.length){const sources=candidateNode('details',undefined,'research-detail');sources.setAttribute('data-evidence-key',`readiness-sources:${candidate.companyId}:${item.id}`);sources.append(candidateNode('summary',`출처 확인 · 원문 ${e.sources.length}개`));for(const sourceUrl of e.sources)influenceSource(sources,{sourceUrl});entry.append(sources);}else entry.append(candidateNode('p','연결된 원천자료 없음'));}more.append(entry);}more.append(candidateNode('p',readiness.note||'자료 확인 상태이며 작업 실행 상태와 별도입니다.'));summary.append(more);}card.append(summary);}
 if(compact){const link=candidateNode('a','현재 후보의 근거·보류 사유 보기 →');link.href='#investment-signals';link.addEventListener('click',()=>showCurrentCompany(candidate.companyId));card.append(link);return card;}
 for(const id of [...new Set((candidate.events||[]).map(e=>e.personId||e.actorId).filter(Boolean))]){const person=(influenceResearch?.people||[]).find(p=>p.personId===id);if(person){const b=candidateNode('button',person.name+'의 발언·행동 보기','candidate-button');b.type='button';b.addEventListener('click',()=>{selectedInfluencePerson=id;renderInfluencePerson();if(typeof window!=='undefined')window.location.hash='global-influence';});card.append(b);}}
 const details=candidateNode('details',undefined,'research-detail');details.setAttribute('data-evidence-key','current:'+candidate.companyId);details.append(candidateNode('summary','공식 원문·날짜·전체 보류 사유'));
 for(const check of candidate.validationChecks||[])details.append(candidateNode('p',`${check.label} · ${{VERIFIED:'확인됨',INSUFFICIENT_DATA:'자료 부족',PENDING:'검증 대기',NOT_BLOCKED_BY_D2:'대기 기간 통과 · 최초 공개 시각 검증과 별도'}[check.status]||'검증 대기'}`));
 const detail=candidate.detail;
 if(detail){
 details.append(candidateNode('h4','분석 대상인 이유'),candidateNode('p','최근 공식 자본 행동 공시가 확인된 분석 대상입니다. 내부자 신고 거래만으로 매수·매도 방향을 판단하지 않습니다.'));
 const f=detail.financial;details.append(candidateNode('h4','기업가치와 재무 근거'),candidateNode('p',f?.periodEnd?`연간 기준 ${f.periodStart} ~ ${f.periodEnd} · 공시 ${f.disclosureDate} · USD · TTM 아님 · 최신 분기 검증 대기`:'공식 재무 자료 확인 중'));
 for(const [key,label]of [['revenue','매출'],['netIncome','순이익'],['equity','자본'],['operatingCashFlow','영업 현금흐름']])details.append(candidateNode('p',`${label} · ${Number.isFinite(f?.raw?.[key])?f.raw[key].toLocaleString('ko-KR')+' USD':'자료 부족'}`));
 if(f?.sourceUrl)influenceSource(details,{sourceUrl:f.sourceUrl});
 const q=detail.interim;if(q){details.append(candidateNode('h4','최근 10-Q 분기 공시 · 기간별 자료'),candidateNode('p',q.periodEnd?`기준 ${q.periodEnd} · 공시 ${q.disclosureDate} · ${detail.ttm?.status==='READY'?'TTM 연결 완료 · 재무 전체 검증과 별도':'항목별 연결 범위·TTM 검증 상태는 아래 근거에서 확인'}`:'최신 분기 자료 확인 중'));for(const [key,label]of [['revenue','매출'],['netIncome','순이익'],['operatingCashFlow','영업 현금흐름'],['equity','자본']]){const m=q.metrics?.[key];details.append(candidateNode('p',m?`${label} · ${m.value.toLocaleString('ko-KR')} USD · ${{SINGLE_QUARTER:'단일 분기',YEAR_TO_DATE:'누적 기간 · 회계연도 시작 검증 대기',CUMULATIVE_PERIOD:'누적 기간 · 회계연도 시작 검증 대기',INSTANT:'해당일 잔액'}[m.basis]} · ${m.periodStart?m.periodStart+' ~ ':''}${m.periodEnd}`:`${label} · 자료 부족`));}if(q.annualPeriodIsNewer)details.append(candidateNode('p','연간 공시 기준일이 더 최근입니다. 이 표는 최근 10-Q 공시이며 최신 전체 실적으로 대체하지 않습니다.'));if(q.status==='BLOCKED')details.append(candidateNode('p','정정 공시 또는 재무 수치 충돌 검토 전 반영 보류'));if(q.sourceUrl)influenceSource(details,{sourceUrl:q.sourceUrl});}

 if(detail.ttm){details.append(candidateNode('h4','TTM 준비 상태'));const labels={DIRECT_DERIVED_QUARTER_CONFLICT:'직접 분기값과 누적 차감값 불일치 · 대사 필요',HISTORICAL_FACT_CONFLICT:'과거 공시 수치 충돌 · 정정 관계 확인 필요',HISTORICAL_CORRECTION_REVIEW_REQUIRED:'과거 정정 공시 검토 필요',TWELVE_MONTH_SPAN_REQUIRED:'약 12개월 범위 검증 필요',FOUR_QUARTERS_REQUIRED:'연속 4개 분기 자료 필요',QUARTER_GAP_OR_OVERLAP:'분기 사이 누락 또는 중복 확인 필요',CONSOLIDATION_SCOPE_UNVERIFIED:'연결 재무 범위 검증 필요',CUMULATIVE_TO_QUARTER_EVIDENCE_REQUIRED:'누적 실적을 단일 분기로 전환할 근거 필요',NEWER_ANNUAL_QUARTER_RECONCILIATION_REQUIRED:'더 최근 연간 공시와 4분기 대사 필요',UNVERIFIED_OR_FUTURE_QUARTER:'공시 시점·원천 근거 검증 필요'};for(const [key,label]of [['revenue','매출'],['netIncome','순이익'],['operatingCashFlow','영업 현금흐름']]){const r=detail.ttm.metrics?.[key];details.append(candidateNode('p',`${label} TTM · ${r?.status==='READY'&&Number.isFinite(r.value)?r.value.toLocaleString('ko-KR')+' USD · '+r.periodStart+' ~ '+r.periodEnd:'계산 보류'} · 확인 분기 ${r?.quarters?.length||0}/4 · ${(r?.reasons||[]).map(x=>labels[x]||'추가 기간 검증 필요').join(' · ')}`));if(r?.quarters?.length){const evidence=candidateNode('details',undefined,'research-detail');evidence.setAttribute('data-evidence-key',`quarters:${candidate.companyId}:${key}`);evidence.append(candidateNode('summary',`${label} 분기 전환 근거`));for(const frame of r.quarters){evidence.append(candidateNode('p',`${frame.start} ~ ${frame.end} · ${frame.method==='CUMULATIVE_DIFFERENCE'?'누적 차감':'직접 공시 분기'} · ${frame.scopeVerified?'연결 범위 확인':'연결 범위 검증 대기'}`));for(const input of frame.inputs||[])evidence.append(candidateNode('p',`${input.start} ~ ${input.end} · ${input.value.toLocaleString('ko-KR')} USD · 공시 ${input.filed} · ${input.documentId}`));}details.append(evidence);}}}
 if(detail.conflictReview){details.append(candidateNode('h4','수치 불일치 원문 대사'));for(const [metric,pairs]of Object.entries(detail.conflictReview.metrics||{}))for(const pair of pairs)details.append(candidateNode('p',`${{revenue:'매출',netIncome:'순이익',operatingCashFlow:'영업 현금흐름'}[metric]} · ${pair.start} ~ ${pair.end} · 차이 ${pair.difference.toLocaleString('ko-KR')} USD · ${pair.status==='ROUNDING_COMPATIBLE_REQUIRES_POLICY_REVIEW'?'원문 보고 정밀도와 양립 · 처리 정책 검토 전 TTM 보류':'원인 미확인 · TTM 보류'}`));}
 if(detail.valuationReview){details.append(candidateNode('h4','평가배수 입력 검증'),candidateNode('p','동일 기준일 USD 원주가·보통주 유통주식수·전체 기업행동 범위가 필요합니다. 보고서의 특정일 주식수를 오늘 가격에 그대로 곱하지 않습니다.'));const labels={DATED_RAW_USD_PRICE_REQUIRED:'원주가 기준일·출처 검증 필요',SAME_DATE_COMMON_OUTSTANDING_SHARES_REQUIRED:'가격일과 같은 보통주 주식수 대사 필요',FULL_CORPORATE_ACTION_COVERAGE_REQUIRED:'분할·배당·증자 등 전체 기업행동 확인 필요',TTM_COMMON_ATTRIBUTABLE_EARNINGS_REQUIRED:'보통주 귀속 순이익 검증 필요',VERIFIED_TTM_REVENUE_REQUIRED:'연속 4분기 매출 검증 필요',COMMON_ATTRIBUTABLE_BOOK_VALUE_REQUIRED:'보통주 귀속 자본 검증 필요',VERIFIED_EV_AND_EBITDA_REQUIRED:'기업가치와 EBITDA 근거 필요'};const e=detail.valuationReview.evidence;if(e){details.append(candidateNode('p',`평가 기준일 ${e.valuationDate} · 관측 종가 ${Number.isFinite(e.price.close)?e.price.close.toLocaleString('ko-KR')+' '+e.price.currency:'자료 부족'} · 가격일 ${e.price.asOfDate||'미확인'} · 관측값은 평가 검증 완료와 별도`));}for(const [key,label]of [['per','PER'],['pbr','PBR'],['psr','PSR'],['evEbitda','EV/EBITDA']])details.append(candidateNode('p',`${label} · 연구 보류 · ${(detail.valuationReview[key]?.reasons||[]).map(r=>labels[r]||'추가 근거 확인 필요').join(' · ')}`));for(const row of (detail.observedShares||[]).slice(0,2))details.append(candidateNode('p',`원문 관측 주식수 ${row.count.toLocaleString('ko-KR')}주 · ${row.asOfDate} · 유통주식수(발행주식수 아님) · ${row.precisionVerified?'원문 정확도 표기 INF':row.reportedDecimals?('원문 decimals '+row.reportedDecimals+' · 정밀도 대사 필요'):'보고 정밀도 미확인'} · 주식 종류·가격일 대사 필요`));}
 details.append(candidateNode('p','PER·PBR·PSR·EV/EBITDA · 주식수·기업행동·비교기업 검증 전 계산 보류'),candidateNode('h4','주요 위험과 제한'));
 const risks={FINANCIAL_DATA_MISSING:'공식 재무 자료 부족',NON_POSITIVE_EQUITY:'공시 자본이 0 이하',NEGATIVE_OPERATING_CASH_FLOW:'공시 영업 현금흐름이 음수',FINANCIAL_FIELDS_INCOMPLETE:'연간 재무 항목 일부 부족',LATEST_INTERIM_NOT_VERIFIED:'최신 분기 재무 검증 대기',CORPORATE_ACTIONS_NOT_FULLY_VERIFIED:'분할·배당 등 기업행동 전수 확인 필요',PEER_SAMPLE_NOT_VERIFIED:'동종기업 비교 표본 검증 필요',REGULATORY_GOVERNANCE_REVIEW_REQUIRED:'규제·지배구조 위험 검토 필요'};
 const shareDates=detail.shareDateReview;if(shareDates){const panel=candidateNode('details',undefined,'research-detail');panel.setAttribute('data-evidence-key','share-dates:'+candidate.companyId);panel.append(candidateNode('summary','가격일과 주식수 기준일 대사'));panel.append(candidateNode('p',`가격 기준 ${shareDates.priceDate||'자료 부족'} · 주식수 관측 ${shareDates.bridgeFrom||'자료 부족'} · ${shareDates.gapCalendarDays===null?'연결 기간 확인 중':shareDates.gapCalendarDays+'일 간격(달력일)'}`));panel.append(candidateNode('p','관측 이후 기업행동과 실제 효력일, 주식 종류 및 반올림 정밀도 검토가 필요합니다. 최신 가격에 과거 주식수를 그대로 곱하지 않습니다.'));for(const r of shareDates.capitalShareRecords||[]){panel.append(candidateNode('p',`${{ISSUED:'발행주식수',TREASURY:'자기주식수',OUTSTANDING:'유통 중 주식수'}[r.definition]} 관측 ${r.count.toLocaleString('ko-KR')}주 · ${r.asOfDate} · 원문 decimals ${r.reportedDecimals??'미확인'} · 대사 전`));influenceSource(panel,{sourceUrl:r.sourceUrl});}for(const r of shareDates.periodReconciliations||[]){panel.append(candidateNode('h4','보고기간 주식수 변동 대사'));panel.append(candidateNode('p',`${r.periodStart} ~ ${r.periodEnd} · ${r.status==='REVIEW_REQUIRED'?'변동 원인 검토 필요':'기간·원문 자료 부족'}`));if(r.observedNetChange!==null){panel.append(candidateNode('p',`발행주식수 순변동 ${r.observedNetChange.toLocaleString('ko-KR')}주 · 매입·소각 보고 ${r.reportedRepurchasedRetiredShares.toLocaleString('ko-KR')}주`));panel.append(candidateNode('p',`미설명 순변동 ${r.unexplainedNetOtherChanges.toLocaleString('ko-KR')}주 · 보고 수치 기준`));panel.append(candidateNode('p','이 차이를 신규 발행·보상주식으로 추정하지 않습니다. 보고 정밀도와 다른 변동 원문, 실제 효력일을 확인해야 합니다.'));}influenceSource(panel,{sourceUrl:r.sourceUrl});}for(const f of shareDates.capitalFlows||[]){panel.append(candidateNode('p',`${f.type==='REPURCHASED_AND_RETIRED'?'기간 중 매입·소각 보고 수량':'자사주 매입 현금 지급액'} ${f.value.toLocaleString('ko-KR')} ${f.unit==='SHARES'?'주':'USD'} · ${f.periodStart} ~ ${f.periodEnd} · 원문 decimals ${f.reportedDecimals??'미확인'}`));panel.append(candidateNode('p','기간 합계 공시입니다. 개별 거래일·소각 효력일이 없어 가격일 주식수 대사에는 반영하지 않았습니다.'));influenceSource(panel,{sourceUrl:f.sourceUrl});}if(!shareDates.capitalShareRecords?.length)panel.append(candidateNode('p','연결된 발행·자기주식 원문 수치 부족'));details.append(panel);}
 const riskDomains={FINANCIAL:'재무',REGULATORY:'규제·법적',GOVERNANCE:'지배구조',VALUATION:'평가',DATA_FRESHNESS:'자료 최신성'};if(detail.risk?.domains){const coverage=candidateNode('details',undefined,'research-detail');coverage.setAttribute('data-evidence-key','risk:'+candidate.companyId);coverage.append(candidateNode('summary','영역별 위험 검토와 공식 근거'));const latestBalance=detail.risk.interimFinancialScreen;if(latestBalance){coverage.append(candidateNode('p','최근 10-Q 잔액 대사'+' · '+(latestBalance.periodEnd||'기준일 미확인')+' · '+(latestBalance.status==='OBSERVED_RECONCILED'?'자산·부채·자본 일치 확인':'동일 기준일 자료 부족')));if(latestBalance.status==='OBSERVED_RECONCILED'){for(const [label,key]of [['자산','assets'],['총부채','liabilities'],['자본','equity']])coverage.append(candidateNode('p',`${label} ${Number(latestBalance[key]).toLocaleString('en-US')} USD · ${latestBalance.periodEnd}`));coverage.append(candidateNode('p',`총부채/자산 ${latestBalance.liabilitiesToAssetsPct.toFixed(2)}% · 총부채/자본 ${latestBalance.liabilitiesToEquity===null?'계산 보류':latestBalance.liabilitiesToEquity.toFixed(2)+'배'} · 공시 ${latestBalance.disclosureDate}`));influenceSource(coverage,{sourceUrl:latestBalance.sourceUrl});}}const screen=detail.risk.financialScreen;if(screen){coverage.append(candidateNode('p',`연간 재무 수치 · ${screen.periodEnd||'기준일 미확인'} · ${screen.status==='OBSERVED_RECONCILED'?'자산·부채·자본 일치 확인':'수치 대사 보류'}`));if(screen.status==='OBSERVED_RECONCILED'){for(const [label,key] of [['자산','assets'],['총부채','liabilities'],['자본','equity']])coverage.append(candidateNode('p',`${label} ${Number(screen[key]).toLocaleString('en-US')} USD · ${screen.periodEnd}`));coverage.append(candidateNode('p',`총부채/자산 ${screen.liabilitiesToAssetsPct.toFixed(2)}% · 총부채/자본 ${screen.liabilitiesToEquity===null?'계산 보류':screen.liabilitiesToEquity.toFixed(2)+'배'}`));coverage.append(candidateNode('p','연간 공시 수치입니다. 총부채는 이자부 차입금과 다르며, 이 비율만으로 안전성이나 매수·매도를 판단하지 않습니다.'));influenceSource(coverage,{sourceUrl:screen.sourceUrl});}}for(const d of detail.risk.domains)coverage.append(candidateNode('p',`${riskDomains[d.domain]||d.domain} · ${d.status==='VERIFIED'?'범위 검토 확인':'종합 검토 자료 부족'}${d.reviewedAt?' · 검토 '+influenceDate(d.reviewedAt):''}`));for(const n of detail.risk.observations||[]){coverage.append(candidateNode('p',`${{DEBT:'부채',EQUITY:'자본',CONTINGENCIES:'우발채무·약정'}[n.topic]||'위험 관련'} 공시 주석 확보 · ${n.periodEnd||'기간 미확인'} · 위험이 없다는 의미는 아닙니다.`));influenceSource(coverage,{sourceUrl:n.sourceUrl});}if(!detail.risk.observations?.length)coverage.append(candidateNode('p','연결된 위험 관련 원문 없음'));details.append(coverage);}
 for(const flag of detail.risk?.flags||[])details.append(candidateNode('p',risks[flag]||'추가 위험 검증 필요'));
 details.append(candidateNode('h4','공개 이후 시장 반응'),candidateNode('p','직접 공개를 확인한 시각 이후의 보수적 관측입니다. 배당·거래비용 미포함 가격수익률이며 실제 체결 성과나 예측이 아닙니다.'));
 for(const observation of detail.observations||[]){const reasons={D2_AVAILABILITY_WAIT:'공개 확인 후 이용 가능 기준 대기',CALENDAR_COVERAGE_REQUIRED:'해당 기간 거래일 달력 검증 필요',SECURITY_HISTORY_REQUIRED:'종목 가격 이력 부족',BENCHMARK_HISTORY_REQUIRED:'동일 기간 S&P 500 자료 부족',CORPORATE_ACTION_COVERAGE_REQUIRED:'기업행동 범위 확인 필요',BASELINE_NOT_OBSERVED:'공개 확인 이후 시작 종가 관측 대기'};for(const reason of observation.reasons||[])details.append(candidateNode('p',reasons[reason]||'시장 반응 근거 추가 확인 필요'));details.append(candidateNode('p',`관측 기준 ${influenceDate(observation.conservativeAvailableBy)} · ${observation.verifiedSamples||0}개 기간 확인`));for(const p of observation.periods||[])details.append(candidateNode('p',`${p.tradingDays}거래일 · ${p.status==='VERIFIED'&&Number.isFinite(p.excessReturn)?'초과수익 '+(p.excessReturn*100).toFixed(2)+'%p':p.status==='PENDING'?'관측·자료 확인 대기':'근거 부족으로 보류'}`));}
 }
 for(const reason of candidate.blockers||[])details.append(candidateNode('p',currentReasonLabels[reason]||'추가 공식 근거 확인 필요'));
 for(const event of candidate.events||[]){
  const type={REPORTED_PURCHASE:'신고 매수',REPORTED_SALE:'신고 매도',PUBLIC_STATEMENT:'공식 발언'}[event.actionType||event.eventType]||'자본 행동 자료';
  details.append(candidateNode('h4',`${event.filingDate} · ${type} · ${event.verificationStatus==='VERIFIED'?'원문 확인':'자료 부족'}`),candidateNode('p',`행동·보고 기준 ${event.eventDate||'미확인'}${event.quantity!==null?' · 수량 '+event.quantity.toLocaleString('ko-KR')+'주':''}`),candidateNode('p',`${event.publicationTimePrecision==='OBSERVED_BY'?'원문 공개를 직접 확인한 시각 (최초 공개 시각 아님)':'보수적 이용 가능 시점'} · ${influenceDate(event.publicAvailableAt)}`));
  if(event.planned10b51)details.append(candidateNode('p','10b5-1 계획 거래 표시 · 매매 동기나 향후 주가 방향을 확정하지 않습니다.'));
  if(event.sourceUrl)influenceSource(details,{sourceUrl:event.sourceUrl});
 }
 card.append(details);return card;
}
function renderSimpleResearch(data){
 simpleResearchData=data;const root=typeof document.querySelectorAll==='function'?document.body:null,view=capturePeerView(root),scroll=typeof window!=='undefined'?window.scrollY:null;
 const summary=byId('research-home-counts');summary.replaceChildren();const currentCounts=data.currentResearch?{currentCompanies:data.currentResearch.companyCount,eligible:data.currentResearch.eligibleRecommendations,pending:data.currentResearch.candidates?.filter(c=>c.recommendationStatus==='HOLD').length}:data.summary;const statRows=data.currentResearch?[['currentCompanies','최근 분석 후보'],['eligible','추천 조건 통과'],['pending','추천 검증 대기']]:[['researchEvents','보관된 연구 사건'],['verifiedSignals','검증된 예측 신호'],['attentionSignals','검토할 신호 기록']];for(const [key,label]of statRows){const node=candidateNode('article',undefined,'research-stat');node.append(candidateNode('span',label),candidateNode('strong',Number.isInteger(currentCounts?.[key])?String(currentCounts[key]):'자료 확인 중'));summary.append(node);}
 const agent=byId('research-home-agent');agent.replaceChildren();const automation=data.automation||{};agent.append(candidateNode('span',automation.workerRunning?'검증 진행 중':automation.schedulerEnabled?'자동 검증 대기':'자동 실행 미확인','research-badge'),candidateNode('strong','Mac mini 연구 에이전트'),candidateNode('p',automation.schedulerEnabled?`저장된 공식 근거를 ${Math.round(automation.intervalMs/60000)}분마다 검증합니다.`:'실행 일정을 확인할 자료가 없습니다.'));
 if(data.overnight){const n=data.overnight;agent.append(candidateNode('p',n.enabled?'새벽 02:00–06:00 기존 주기로 확인 · 아침 07:30 이후 첫 주기에 보고':'새벽 보고 자동 실행 비활성'),candidateNode('p','자동 연구 상태와 앱 연결 상태는 다릅니다.'));const r=n.latestReport;if(r){const d=candidateNode('details',undefined,'research-detail');d.setAttribute('data-evidence-key','overnight:report');d.append(candidateNode('summary',`${r.date} 아침 연구 보고${r.status==='BLOCKED'?' · 자료 읽기 실패':''}`),candidateNode('p',`실제 생성 ${influenceDate(r.generatedAt)} · ${r.nightCoverage==='NO_NIGHT_EXECUTION_RECORDED'?'새벽 실행 기록 없음':'기록된 새벽 확인 '+r.observedNightSlots+'회'} · 후보 ${Number.isInteger(r.candidates)?r.candidates+'개':'자료 확인 불가'} · 추천 조건 통과 ${r.eligibleRecommendations}개`),candidateNode('p',r.newCandidates===null?'첫 보고 · 신규 후보 증가 비교 기준 없음':`이전 보고 대비 신규 후보 ${r.newCandidates}개`));for(const c of r.companies||[])d.append(candidateNode('p',`${c.companyName} · ${(c.blockers||[]).map(x=>currentReasonLabels[x]||'추가 검증 필요').join(' · ')}`));agent.append(d);}else agent.append(candidateNode('p','아침 보고 생성 대기'));}

 if(automation.nextRunAt)agent.append(candidateNode('p',`다음 검증 ${influenceDate(automation.nextRunAt)}`,'research-card-date'));const operations=candidateNode('a','자동 연구 단계 보기');operations.href='#agent-dashboard';agent.append(operations);
 const newDocs=byId('research-home-new-documents');newDocs.textContent=Number.isInteger(automation.newOfficialDocumentsToday)?`오늘 새로 확보한 공식 발언 ${automation.newOfficialDocumentsToday}건 · 한국 시간 기준`:'오늘의 공식 원문 수 확인 중';
 const sourceDetails=candidateNode('details',undefined,'research-detail');sourceDetails.setAttribute('data-evidence-key','research-source-health');sourceDetails.append(candidateNode('summary',automation.externalCollectionEnabled?'공식 자료 자동 수집 상태':'공식 자료 수집 상태 확인'));for(const source of automation.collectionSources||[]){const label=source.status==='AUTH_BLOCKED'?'인증 차단':source.autoCollectionEnabled?'자동 수집 연결':source.permissionVerified?'자료 부족':'미연결';sourceDetails.append(candidateNode('p',`${source.sourceName} · ${label}${source.lastSuccessAt?' · 최근 연결 '+influenceDate(source.lastSuccessAt):source.lastArchivedAt?' · 최근 저장 응답 '+influenceDate(source.lastArchivedAt):''}`));sourceDetails.append(candidateNode('p',`연결 성공 ${source.successCount??0}회 · 실패 ${source.failureCount??0}회 · 연속 실패 ${source.consecutiveFailures??0}회${source.statisticsSince?' · 집계 시작 '+influenceDate(source.statisticsSince):''}${source.nextRunAt?' · 다음 조회 확인 '+influenceDate(source.nextRunAt):''}`));}agent.append(sourceDetails);
 const current=data.currentResearch;
 for(const [id,compact]of [['research-home-recent',true],['research-current-candidates',false]]){const target=byId(id);target.replaceChildren();if(current){target.append(candidateNode('p',`공시 관측 ${current.window.from} ~ ${current.window.through} · 분석 후보 ${current.companyCount}개 · 추천 조건 통과 ${current.eligibleRecommendations}개`,'research-note'));const visible=compact?(current.candidates||[]).slice(0,3):matchingResearchCandidates(current.candidates||[]);for(const c of visible)target.append(renderCurrentCandidate(c,{compact}));if(!compact){byId('research-filter-message').textContent=`표시 ${visible.length} / 전체 ${(current.candidates||[]).length}개 · 과거 연구 사례는 별도 목록입니다.`;if(!visible.length&&current.candidates?.length)target.append(candidateNode('p','검색 조건에 맞는 후보가 없습니다. 필터를 초기화해 다시 확인하세요.','research-empty'));}if(!compact&&current.automationValidation){const r=current.automationValidation;target.append(candidateNode('p',`저장 근거 자동 검증 · ${influenceDate(r.checkedAt)} · 재검증 ${r.evaluated}개 · 기존 결과 재사용 ${r.reused}개 · 예외 검토 ${r.exceptions?.length||0}개 · 추천 보류`,'research-note'));const report=candidateNode('details',undefined,'research-detail');report.setAttribute('data-evidence-key','current:validation');report.append(candidateNode('summary','기업별 자동 검증 결과와 다음 작업'));for(const c of r.companies||[])report.append(candidateNode('p',`${c.companyName} · ${{BLOCKED:'검증 차단',PARTIAL:'일부 근거 확인',INSUFFICIENT_DATA:'자료 부족'}[c.status]||'검증 대기'} · ${c.reused?'기존 결과 재사용':'변경 자료 검증'} · ${{VERIFY_CORRECTION_CHAIN:'정정 공시 연결 확인 필요',WAIT_FOR_OFFICIAL_SOURCE:'공식 출처 조회 대기',COLLECT_CURRENT_OFFICIAL_EVENT:'최신 공식 사건 수집 필요',WAIT_FOR_PRICE_PROVIDER:'가격 공급자 조회 대기',COMPLETE_FINANCIAL_ACTION_AND_RISK_VALIDATION:'기업행동·재무·위험 검증 필요'}[c.nextAction]||'추가 근거 검토 필요'}`));for(const c of r.companies||[])for(const review of c.correctionReviews||[]){const row=candidateNode('p',`${c.companyName} · 정정 원문 연결 확인 · ${review.originalFilingDate} → ${review.amendmentFilingDate} · RSU 보상 ${review.beforeQuantity.toLocaleString('ko-KR')} → ${review.afterQuantity.toLocaleString('ko-KR')}주 · 실제 매수·매도 신호 아님`);report.append(row);if(review.amendmentSourceUrl)influenceSource(report,{sourceUrl:review.amendmentSourceUrl});}target.append(report);}if(!compact&&current.collectionQueue?.length){const queue=candidateNode('details',undefined,'research-detail');queue.setAttribute('data-evidence-key','current:queue');queue.append(candidateNode('summary','기업별 공식 자료 수집 상태'));for(const row of current.collectionQueue)queue.append(candidateNode('p',`${row.companyName} · ${{QUEUED:'조회 대기',PARTIAL:'일부 자료 확인',BLOCKED:'조회 차단'}[row.status]||'확인 중'} · ${row.checkedAt?influenceDate(row.checkedAt):'조회 기록 없음'}${row.reason==='CURRENT_AMENDMENT_REVIEW_REQUIRED'?' · 정정 공시 관계 검토 필요':row.reason==='SEC_AUTH_BLOCKED'?' · 공식 출처 접근 차단':''}`));target.append(queue);}if(!current.candidates?.length)target.append(candidateNode('p','최근 기간에 확인된 분석 후보가 없습니다. 과거 사례를 현재 후보로 대체하지 않습니다.','research-empty'));}else target.append(candidateNode('p','현재 후보 자료 확인 중 · 아직 검증된 시장 반응 자료가 없습니다. 과거 사례는 연구 화면에서 확인할 수 있습니다.','research-empty'));}
 const cards=data.eventCards||[];for(const [id,list,compact]of [['research-signal-cards',cards,false],['research-results-cards',cards,false]]){const target=byId(id);target.replaceChildren();for(const card of list)target.append(renderResearchEvent(card,{compact}));if(!list.length)target.append(candidateNode('p','아직 검증된 시장 반응 자료가 없습니다. 새로운 공식 자료를 확인하고 있습니다.','research-empty'));}
 const selectedPanel=byId('research-selected-event');selectedPanel.replaceChildren();const selectedCard=cards.find(card=>card.eventId===selectedResearchEvent);if(selectedCard){selectedPanel.append(candidateNode('h3','선택한 연구 · 상세 근거'),renderResearchEvent(selectedCard));const detail=selectedPanel.querySelector?.('details');if(detail){detail.setAttribute('data-evidence-key','selected:'+selectedCard.eventId);detail.open=true;}}else{selectedPanel.append(candidateNode('p','신호 카드에서 연구를 선택하면 해당 사건의 수익률과 공식 근거를 함께 확인할 수 있습니다.','research-empty'));}
 const resultSummary=byId('research-results-summary');resultSummary.replaceChildren(candidateNode('p',`정확한 공개 시각 표본 ${data.summary?.exactTimeSamples??'확인 중'}건 · 보수적 시작점 표본 ${data.summary?.conservativeSamples??'확인 중'}건`),candidateNode('p','같은 사건의 세 기간을 각각 독립 사건으로 세지 않습니다. 종목별로 비교하며, 미래 수익을 예측하지 않습니다.'));
 if(data.riskReview?.inputValidation){const gate=candidateNode('details',undefined,'research-detail');gate.setAttribute('data-evidence-key','backtest-input-readiness');gate.append(candidateNode('summary','전략 백테스트 보류 이유'),candidateNode('p','학습·검증·최종 평가 자료, 실제 공개·거래 가능 시각, 거래비용·슬리피지와 유동성 근거를 확인해야 합니다. 현재 표시는 과거 시장 반응 연구입니다.'));resultSummary.append(gate);}
 const pending=byId('research-pending-signals');pending.replaceChildren(candidateNode('p',`결합 신호 ${data.summary?.combinedSignals??'확인 중'}건 · 공식 발언 ${data.summary?.verifiedStatements??'확인 중'}건 · 자본 자료 ${data.summary?.verifiedCapitalActions??'확인 중'}건. 발언·개인·기관의 관계와 방향 근거가 부족한 신호는 연구 보류입니다.`));const people=candidateNode('a','인물·공식 발언 확인');people.href='#global-influence';pending.append(people);
 const risk=byId('research-risk-summary');risk.replaceChildren(candidateNode('p','가격수익률 기준 · 총수익·거래비용 미검증. 표본 선택 편향·공개 지연·시장 상황을 통제하지 못했습니다. 독립 검증 기간과 사전 고정 코호트가 없어 전략 우위를 판정하지 않습니다.'),candidateNode('p','시장 기대·컨센서스 자료가 없어 기대 대비 놀라움이나 선반영 정도는 계산하지 않습니다.'));
 const jobTarget=byId('research-auto-stages');if(jobTarget){jobTarget.replaceChildren();const receipt=automation.runReport;if(receipt){const panel=candidateNode('section',undefined,'research-readiness');panel.append(candidateNode('h3','최근 작업 보고'),candidateNode('p',`마지막 작업 완료 ${influenceDate(receipt.lastCompletedAt)} · 최근 확인 ${influenceDate(receipt.lastCheckedAt)}`));const c=receipt.counts||{};panel.append(candidateNode('p',`진행 ${c.running??'미확인'} · 단계 확인 ${c.verified??'미확인'} · 일부 확인 ${c.partial??'미확인'} · 차단 ${c.blocked??'미확인'} · 대기 ${c.queued??'미확인'}`),candidateNode('p','단계별 근거 확인 수이며 검증된 투자 신호 수가 아닙니다.'));if(receipt.failureReason)panel.append(candidateNode('p',receipt.failureReason==='TEMPORARY_RESEARCH_INPUT_ERROR'?'입력 자료 읽기 일시 오류 · 재시도 대기':'입력 자료 또는 처리 오류 · 저장 근거 확인 필요','research-error'));if(receipt.retryAt)panel.append(candidateNode('p','재시도 예정 '+influenceDate(receipt.retryAt)));const history=candidateNode('details',undefined,'research-detail');history.setAttribute('data-evidence-key','research:run-history');history.append(candidateNode('summary','최근 완료 기록'));for(const r of receipt.recentRuns||[])history.append(candidateNode('p',`${influenceDate(r.completedAt)} · 연구 사건 ${r.independentEvents??'미확인'} · 보수적 표본 ${r.conservativeSamples??'미확인'}`));if(!receipt.recentRuns?.length)history.append(candidateNode('p','저장된 완료 기록 없음'));history.append(candidateNode('p','저장 근거 검토 보고입니다. 회귀 테스트를 실행했다는 뜻은 아닙니다.'));panel.append(history);jobTarget.append(panel);}for(const job of automation.jobs||[]){jobTarget.append(candidateNode('p',`${researchStageLabels[job.name]||'기타 검증 단계'} · ${{VERIFIED:'확인됨',PARTIAL:'일부 확인',BLOCKED:'자료 부족',QUEUED:'대기',RUNNING:'진행 중'}[job.status]||'상태 미확인'} · ${researchStageReasons[job.reason]||'추가 근거 확인 필요'}`));}jobTarget.append(candidateNode('p',`${automation.externalCollectionEnabled?'승인된 공식 자료 자동 수집 연결':'외부 자동 수집 비활성'} · 저장 근거 자동 검증 · 새 AI 해석은 검증된 원문 맥락이 있을 때만 수행 · 자동 QA는 근거 상태 보고이며 테스트 실행과 별도`));
 }
 restorePeerView(root,view);if(scroll!==null&&typeof window.scrollTo==='function')window.scrollTo(0,scroll);
}
async function refreshSimpleResearch(){if(simpleResearchLoading)return;simpleResearchLoading=true;const button=byId('research-home-refresh'),message=byId('research-home-message');button.disabled=true;message.textContent='연구 자료 확인 중';message.className='research-loading';try{const data=await candidateRequest('/api/v2/research/dashboard');renderSimpleResearch(data);message.textContent=`공식 자료 기반 · 화면 조회 ${influenceDate(data.asOf)} · 사건·가격 기준일은 각 카드에 표시 · 추천 보류`;message.className='research-note';}catch(error){if(error.message==='AUTH'){message.textContent='인증이 만료되었거나 거절되었습니다. 인증 설정에서 토큰을 갱신한 뒤 다시 조회하세요.';message.className='research-error';return;}message.textContent=simpleResearchData?'연결 실패 · 표시된 자료는 이전 조회 결과입니다. 새로고침으로 다시 확인하세요.':'연결 실패 · 연구 자료를 불러오지 못했습니다. 새로고침으로 다시 확인하세요.';message.className='research-error';if(!simpleResearchData){byId('research-home-counts').replaceChildren(candidateNode('p','연구 현황을 불러오지 못했습니다. 연결 후 다시 확인하세요.','research-error'));for(const id of ['research-home-recent','research-current-candidates','research-signal-cards','research-results-cards'])byId(id).replaceChildren(candidateNode('p','연구 자료를 불러오지 못했습니다. 연결 후 다시 확인하세요.','research-error'));}}finally{button.disabled=false;simpleResearchLoading=false;}}
byId('research-home-refresh').addEventListener('click',refreshSimpleResearch);
byId('research-candidate-search').addEventListener('input',()=>{researchCandidateQuery=byId('research-candidate-search').value.slice(0,100);if(simpleResearchData)renderSimpleResearch(simpleResearchData);});
byId('research-readiness-filter').addEventListener('change',()=>{researchReadinessFilter=byId('research-readiness-filter').value;if(simpleResearchData)renderSimpleResearch(simpleResearchData);});
byId('research-filter-reset').addEventListener('click',()=>{researchCandidateQuery='';researchReadinessFilter='ALL';selectedCurrentCompany=null;byId('research-candidate-search').value='';byId('research-readiness-filter').value='ALL';if(simpleResearchData)renderSimpleResearch(simpleResearchData);byId('research-candidate-search').focus();});
byId('research-period').addEventListener('change',()=>{selectedResearchPeriod=byId('research-period').value;if(simpleResearchData)renderSimpleResearch(simpleResearchData);});

// Read-only paper decisions. Missing evidence is never interpreted as a sell signal.
let tradeData=null,tradeLoading=false,tradeFilter='ALL';
const tradeActionLabels={BUY:'매수 검토',SELL:'매도 검토 · 보유 시',WATCH:'관망',INSUFFICIENT_DATA:'판단 자료 부족'};
const tradeCheckLabels={analysisTime:'분석 기준 시각',latestPrice:'최신 가격',publicEvidence:'공식 원문·공개 시점',accountingPeriod:'연속 4분기 재무',financialPriceAlignment:'재무·가격 기준일 정렬',valuation:'PER·PBR·PSR',sharesAndActions:'동일일 주식수·기업행동',peerSamples:'동종·과거 비교 표본',comprehensiveRisk:'종합 위험 검토',riskScoreConsistency:'검토된 위험과 점수 대사',criticalKnownRisk:'확인된 중요 위험의 매수 검토 차단',completeSignals:'필수 분석 지표',signalFreshness:'분석 지표 최신성',committeeScore:'분석 점수 대사',independentReview:'근거·독립 검토',committeeApproval:'매수 검토 통과',invalidRuleInputs:'판단 규칙 입력',expiredDecision:'판단 만료 · 최신 자료 재검증'};
function currentTradeDecision(row,now=Date.now()){if(['BUY','SELL','WATCH'].includes(row.action)&&(!Number.isFinite(Date.parse(row.validUntil))||Date.parse(row.validUntil)<=now||Date.parse(row.generatedAt)>now))return {...row,action:'INSUFFICIENT_DATA',status:'EXPIRED',blockers:[...(row.blockers||[]),'expiredDecision'],validUntil:null};return row;}
function renderTradeRecommendations(data){
 tradeData=data;const root=byId('trade-recommendations'),view=capturePeerView(root);const rows=(data.recommendations||[]).map(r=>currentTradeDecision(r));const counts=byId('trade-counts');counts.replaceChildren();for(const action of ['BUY','SELL','WATCH','INSUFFICIENT_DATA']){const stat=candidateNode('article',undefined,'research-stat');stat.append(candidateNode('span',tradeActionLabels[action]),candidateNode('strong',String(rows.filter(r=>r.action===action).length)));counts.append(stat);}
 const target=byId('trade-cards');target.replaceChildren();const filtered=rows.filter(r=>tradeFilter==='ALL'||r.action===tradeFilter);for(const row of filtered){const card=candidateNode('article',undefined,'research-card');card.append(candidateNode('h3',`${row.companyName||row.companyId} · ${row.companyId}`),candidateNode('strong',tradeActionLabels[row.action]||'판단 자료 부족','research-badge'),candidateNode('p',`판단 기준 ${influenceDate(row.generatedAt)} · ${row.validUntil?'유효 기한 '+influenceDate(row.validUntil):'유효한 추천 없음'}`));if(row.marketCollection?.nextRetryAt)card.append(candidateNode('p',`가격 재조회 가능 시점 ${influenceDate(row.marketCollection.nextRetryAt)} · 자동 주기에서 확인`));if(row.priceReference)card.append(candidateNode('p',`참고 가격 ${row.priceReference.value.toLocaleString('ko-KR')} ${row.priceReference.currency} · ${row.priceReference.asOfDate}`));if(row.action==='INSUFFICIENT_DATA')card.append(candidateNode('p','자료 부족은 매도나 관망 판단이 아닙니다. 부족한 근거가 확보되면 다시 평가합니다.'));else card.append(candidateNode('p',row.action==='BUY'?'필수 자료와 매수 점수 조건 통과 · 모의 검토 대상':row.action==='SELL'?'낮은 분석 점수 또는 확인된 위험 조건 · 보유 종목 축소 검토':'현재 규칙에서 매수·매도 조건이 발생하지 않았습니다.'));const evidence=candidateNode('details',undefined,'research-detail');evidence.setAttribute('data-evidence-key','trade:'+row.companyId);evidence.append(candidateNode('summary','판단 근거·위험·부족 자료'));for(const [key,passed]of Object.entries(row.checks||{}))evidence.append(candidateNode('p',`${tradeCheckLabels[key]||'추가 검증'} · ${passed?'확인됨':'검증 필요'}`));for(const reason of row.blockers||[])evidence.append(candidateNode('p','필요 자료 · '+(tradeCheckLabels[reason]||'추가 검증')));if(row.riskReview){const labels={FINANCIAL:'재무',REGULATORY:'규제·법적',GOVERNANCE:'지배구조',VALUATION:'평가',DATA_FRESHNESS:'자료 최신성'};evidence.append(candidateNode('p',`위험 관련 공식 주석 ${row.riskReview.observedNotes||0}개 · 원문 확보와 종합 검토는 별도입니다.`));for(const domain of row.riskReview.missingDomains||[])evidence.append(candidateNode('p','위험 검토 필요 · '+(labels[domain]||domain)));}evidence.append(candidateNode('p',`정책 ${row.policyId} · 예측 성능 미입증 · 실제 주문 없음`));card.append(evidence);addRelatedCompanyLink(card,row.companyId);target.append(card);}if(!filtered.length)target.append(candidateNode('p','이 상태에 해당하는 종목이 없습니다. 자료 부족 종목을 매수·매도로 대신 표시하지 않습니다.','research-empty'));
 const examples=byId('trade-examples');examples.replaceChildren();if(data.simulation?.mode==='RULE_SIMULATION')for(const r of data.simulation.examples||[])examples.append(candidateNode('p',`${r.name} · 가상 점수 ${r.score} · ${tradeActionLabels[r.action]||'자료 부족'} · 실제 종목 아님`));restorePeerView(root,view);
}
async function refreshTradeRecommendations(){if(tradeLoading)return;tradeLoading=true;byId('trade-refresh').disabled=true;byId('trade-message').textContent='판단 자료 확인 중';try{const data=await candidateRequest('/api/v2/recommendations');renderTradeRecommendations(data);byId('trade-message').textContent=`조회 ${influenceDate(data.asOf)} · 모의 판단 전용 · 실제 주문 차단`;}catch{byId('trade-message').textContent=tradeData?'연결 실패 · 이전 조회 판단입니다. 유효 기한과 기준일을 확인하고 다시 조회하세요.':'연결 실패 · 판단 자료를 불러오지 못했습니다.';if(!tradeData)byId('trade-cards').replaceChildren(candidateNode('p','자료를 불러오지 못했습니다. 다시 조회해 주세요.','research-error'));}finally{tradeLoading=false;byId('trade-refresh').disabled=false;}}
byId('trade-refresh').addEventListener('click',refreshTradeRecommendations);
byId('trade-filter').addEventListener('change',()=>{tradeFilter=byId('trade-filter').value;if(tradeData)renderTradeRecommendations(tradeData);});

function applyResearchScreen(){
 if(!document.querySelectorAll||typeof window==='undefined')return;
 rememberCandidateView();
 const id=window.location.hash.slice(1)||'overview',target=byId(id==='overview'?'research-home':id),section=target?.closest?.('.main > section')||byId('research-home');
 document.body.classList.add('research-ui');document.querySelectorAll('.workspace-menu').forEach(menu=>{menu.open=false;});for(const node of document.querySelectorAll('.main > section'))node.classList.toggle('screen-active',node===section);
 if(id==='trade-recommendations')refreshTradeRecommendations();
 if(id==='market-analysis'&&byId('market-kospi').textContent==='—')loadBenchmarks();
 for(const link of document.querySelectorAll('.rail-link, .bottom-nav a')){const href=link.getAttribute('href'),active=href==='#'+section.id||(id==='research-home'&&href==='#overview');link.classList.toggle('active',active);if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');}
 if(target&&target!==section){target.scrollIntoView?.({block:'start'});(id==='candidate-detail'?byId('candidate-detail-title'):target)?.focus?.({preventScroll:true});}else if(typeof window.scrollTo==='function')window.scrollTo(0,0);
}
if(typeof window!=='undefined'&&window.addEventListener){window.addEventListener('hashchange',applyResearchScreen);applyResearchScreen();window.setInterval(()=>{if(document.visibilityState==='visible'){refreshSimpleResearch();if(window.location.hash==='#trade-recommendations')refreshTradeRecommendations();}},30000);refreshSimpleResearch();}

// Native disclosure menus also close with Escape and outside interaction.
if(document.querySelectorAll&&document.addEventListener){document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;for(const menu of document.querySelectorAll('.workspace-menu[open]')){menu.open=false;menu.querySelector('summary')?.focus();}});document.addEventListener('click',event=>{for(const menu of document.querySelectorAll('.workspace-menu[open]'))if(!menu.contains(event.target))menu.open=false;});}
