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

  loadButton.disabled = true;
  showMessage("SEC 원문 공시를 확인하고 있습니다.");
  try {
    const response = await fetch("/api/disclosures/berkshire/portfolio", {
      headers: { Authorization: `Bearer ${sessionToken}`, Accept: "application/json" },
      cache: "no-store",
      redirect: "error",
    });
    if (response.status === 401) {
      sessionToken = "";
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