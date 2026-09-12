import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const PROD_BASE = "https://openapi.koreainvestment.com:9443";
const VTS_BASE = "https://openapivts.koreainvestment.com:29443";

let cachedToken = null;
let tokenExpiresAt = 0;
let requestChain = Promise.resolve();
let lastApiRequestAt = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function enabled() {
  return process.env.KSTOCK_BROKER_ENABLED === "true";
}

function assertEnabled() {
  if (!enabled()) {
    throw new Error("KSTOCK_BROKER_ENABLED is false.");
  }

  if (!process.env.KIS_APP_KEY) {
    throw new Error("KIS_APP_KEY is missing.");
  }

  if (!process.env.KIS_APP_SECRET) {
    throw new Error("KIS_APP_SECRET is missing.");
  }
}

function baseUrl() {
  return (process.env.KIS_ENV || "prod").toLowerCase() === "vts"
    ? VTS_BASE
    : PROD_BASE;
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;

  const n = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function normalizeStockCode(stockCode) {
  const normalized = String(stockCode || "").replace(/\D/g, "").padStart(6, "0");

  if (!/^\d{6}$/.test(normalized)) {
    throw new Error("stockCode must be a 6-digit Korean stock code.");
  }

  return normalized;
}

function parseTokenExpiry(data) {
  if (data?.access_token_token_expired) {
    const raw = String(data.access_token_token_expired).trim();
    const isoLike = raw.includes("T") ? raw : raw.replace(" ", "T");
    const ts = new Date(isoLike).getTime();

    if (Number.isFinite(ts)) return ts;
  }

  if (Number.isFinite(Number(data?.expires_in))) {
    return Date.now() + Number(data.expires_in) * 1000;
  }

  return Date.now() + 23 * 60 * 60 * 1000;
}

function tokenCachePath() {
  return path.resolve(process.cwd(), ".cache", "kis-token.json");
}

function tokenCacheKey() {
  const source = `${process.env.KIS_ENV || "prod"}:${process.env.KIS_APP_KEY || ""}`;
  return crypto.createHash("sha256").update(source).digest("hex").slice(0, 24);
}

async function readPersistentToken() {
  try {
    const raw = await fs.readFile(tokenCachePath(), "utf8");
    const data = JSON.parse(raw);

    if (
      data?.cacheKey === tokenCacheKey() &&
      typeof data?.accessToken === "string" &&
      Number.isFinite(Number(data?.expiresAt))
    ) {
      return {
        token: data.accessToken,
        expiresAt: Number(data.expiresAt)
      };
    }
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.warn(`[KIS] token cache read skipped: ${error.message}`);
    }
  }

  return null;
}

async function writePersistentToken(token, expiresAt) {
  const file = tokenCachePath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(
    file,
    JSON.stringify({
      cacheKey: tokenCacheKey(),
      accessToken: token,
      expiresAt,
      savedAt: Date.now()
    }, null, 2),
    { encoding: "utf8", mode: 0o600 }
  );
}

export async function getKisAccessToken({ force = false } = {}) {
  assertEnabled();

  const safetyMs = Number(process.env.KIS_TOKEN_SAFETY_SECONDS || 120) * 1000;

  if (!force && cachedToken && Date.now() < tokenExpiresAt - safetyMs) {
    return cachedToken;
  }

  if (!force) {
    const persisted = await readPersistentToken();
    if (persisted && Date.now() < persisted.expiresAt - safetyMs) {
      cachedToken = persisted.token;
      tokenExpiresAt = persisted.expiresAt;
      return cachedToken;
    }
  }

  const response = await fetch(`${baseUrl()}/oauth2/tokenP`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: process.env.KIS_APP_KEY,
      appsecret: process.env.KIS_APP_SECRET
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.access_token) {
    throw new Error(
      `KIS token failed: HTTP ${response.status} ${data.error_description || data.msg1 || data.message || ""}`.trim()
    );
  }

  cachedToken = data.access_token;
  tokenExpiresAt = parseTokenExpiry(data);

  try {
    await writePersistentToken(cachedToken, tokenExpiresAt);
  } catch (error) {
    console.warn(`[KIS] token cache write skipped: ${error.message}`);
  }

  return cachedToken;
}

function apiMinIntervalMs() {
  const value = Number(process.env.KIS_API_MIN_INTERVAL_MS || 1200);
  return Number.isFinite(value) && value >= 0 ? value : 1200;
}

async function waitForApiSlot() {
  const waitMs = Math.max(0, apiMinIntervalMs() - (Date.now() - lastApiRequestAt));
  if (waitMs > 0) await sleep(waitMs);
  lastApiRequestAt = Date.now();
}

function enqueueApiRequest(task) {
  const run = requestChain.then(task, task);
  requestChain = run.catch(() => undefined);
  return run;
}

function isRateLimitError(response, data) {
  return data?.msg_cd === "EGW00201" ||
    String(data?.msg1 || "").includes("초당 거래건수") ||
    response?.status === 429;
}

async function kisGetOnce(pathname, trId, params) {
  const token = await getKisAccessToken();
  const url = new URL(`${baseUrl()}${pathname}`);

  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  await waitForApiSlot();

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "authorization": `Bearer ${token}`,
      "appkey": process.env.KIS_APP_KEY,
      "appsecret": process.env.KIS_APP_SECRET,
      "tr_id": trId,
      "custtype": "P",
      "Accept": "application/json"
    }
  });

  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function kisGet(pathname, trId, params) {
  return enqueueApiRequest(async () => {
    const maxRetries = Math.max(0, Number(process.env.KIS_RATE_LIMIT_MAX_RETRIES || 2));
    const retryMs = Math.max(1000, Number(process.env.KIS_RATE_LIMIT_RETRY_MS || 61000));

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const { response, data } = await kisGetOnce(pathname, trId, params);

      if (response.ok && (!data.rt_cd || data.rt_cd === "0")) {
        return data;
      }

      if (isRateLimitError(response, data) && attempt < maxRetries) {
        console.warn(
          `[KIS] rate limit (${data.msg_cd || response.status}). ${Math.round(retryMs / 1000)}초 후 재시도 ${attempt + 1}/${maxRetries}`
        );
        await sleep(retryMs);
        continue;
      }

      throw new Error(
        `KIS API failed: HTTP ${response.status} ${data.msg_cd || ""} ${data.msg1 || ""}`.trim()
      );
    }

    throw new Error("KIS API failed after retries.");
  });
}

export async function getDomesticQuote(stockCode) {
  const code = normalizeStockCode(stockCode);

  const data = await kisGet(
    "/uapi/domestic-stock/v1/quotations/inquire-price",
    "FHKST01010100",
    {
      FID_COND_MRKT_DIV_CODE: "J",
      FID_INPUT_ISCD: code
    }
  );

  const o = data.output || {};

  return {
    source: "KIS",
    stockCode: code,
    raw: o,
    price: toNumber(o.stck_prpr),
    change: toNumber(o.prdy_vrss),
    changeRatePct: toNumber(o.prdy_ctrt),
    open: toNumber(o.stck_oprc),
    high: toNumber(o.stck_hgpr),
    low: toNumber(o.stck_lwpr),
    volume: toNumber(o.acml_vol),
    tradingValue: toNumber(o.acml_tr_pbmn),
    marketCap: toNumber(o.hts_avls),
    listedShares: toNumber(o.lstn_stcn),
    per: toNumber(o.per),
    pbr: toNumber(o.pbr),
    eps: toNumber(o.eps),
    bps: toNumber(o.bps),
    week52High: toNumber(o.w52_hgpr),
    week52Low: toNumber(o.w52_lwpr),
    foreignHoldRatePct: toNumber(o.hts_frgn_ehrt)
  };
}

function yyyymmdd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function parseYyyymmdd(value) {
  const s = String(value || "");
  if (!/^\d{8}$/.test(s)) return null;
  const d = new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)));
  return Number.isNaN(d.getTime()) ? null : d;
}

function previousDayYyyymmdd(value) {
  const d = parseYyyymmdd(value);
  if (!d) return null;
  d.setDate(d.getDate() - 1);
  return yyyymmdd(d);
}

function normalizeChartRows(rows) {
  return rows.map((row) => ({
    date: row.stck_bsop_date || null,
    open: toNumber(row.stck_oprc),
    high: toNumber(row.stck_hgpr),
    low: toNumber(row.stck_lwpr),
    close: toNumber(row.stck_clpr),
    volume: toNumber(row.acml_vol),
    tradingValue: toNumber(row.acml_tr_pbmn)
  })).filter((row) => row.date && row.close !== null);
}

export async function getDomesticDailyChart({
  stockCode,
  startDate,
  endDate,
  adjusted = true,
  minRows = 130,
  maxPages = 3
}) {
  const code = normalizeStockCode(stockCode);
  const end = endDate || yyyymmdd(new Date());

  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() - 420);
  const start = startDate || yyyymmdd(defaultStart);

  const allRows = [];
  let currentEnd = end;

  for (let page = 0; page < maxPages; page += 1) {
    const data = await kisGet(
      "/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice",
      "FHKST03010100",
      {
        FID_COND_MRKT_DIV_CODE: "J",
        FID_INPUT_ISCD: code,
        FID_INPUT_DATE_1: start,
        FID_INPUT_DATE_2: currentEnd,
        FID_PERIOD_DIV_CODE: "D",
        FID_ORG_ADJ_PRC: adjusted ? "0" : "1"
      }
    );

    const rawRows = Array.isArray(data.output2) ? data.output2 : [];
    const rows = normalizeChartRows(rawRows);
    if (!rows.length) break;

    allRows.push(...rows);

    const uniqueCount = new Set(allRows.map((row) => row.date)).size;
    const oldestDate = rows.reduce(
      (oldest, row) => (!oldest || row.date < oldest ? row.date : oldest),
      null
    );

    if (uniqueCount >= minRows || rows.length < 100 || !oldestDate || oldestDate <= start) {
      break;
    }

    const nextEnd = previousDayYyyymmdd(oldestDate);
    if (!nextEnd || nextEnd >= currentEnd) break;
    currentEnd = nextEnd;
  }

  const deduped = [...new Map(allRows.map((row) => [row.date, row])).values()]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  return {
    source: "KIS",
    stockCode: code,
    startDate: start,
    endDate: end,
    rows: deduped
  };
}


function normalizeInvestorRows(rows) {
  return rows.map((row) => ({
    date: row.stck_bsop_date || null,
    close: toNumber(row.stck_clpr),
    personalNetBuyQty: toNumber(row.prsn_ntby_qty),
    foreignNetBuyQty: toNumber(row.frgn_ntby_qty),
    institutionNetBuyQty: toNumber(row.orgn_ntby_qty),
    personalNetBuyValue: toNumber(row.prsn_ntby_tr_pbmn),
    foreignNetBuyValue: toNumber(row.frgn_ntby_tr_pbmn),
    institutionNetBuyValue: toNumber(row.orgn_ntby_tr_pbmn)
  })).filter((row) => row.date);
}

export async function getDomesticInvestorFlow(stockCode) {
  const code = normalizeStockCode(stockCode);

  const data = await kisGet(
    "/uapi/domestic-stock/v1/quotations/inquire-investor",
    "FHKST01010900",
    {
      FID_COND_MRKT_DIV_CODE: "J",
      FID_INPUT_ISCD: code
    }
  );

  const rawRows = Array.isArray(data.output) ? data.output : [];
  const rows = normalizeInvestorRows(rawRows)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  return {
    source: "KIS",
    stockCode: code,
    rows,
    caveat: "KIS 주식현재가 투자자 API 기준이며 당일 수급 데이터는 장 종료 후 제공될 수 있습니다."
  };
}


function normalizeIndexCode(indexCode) {
  const code = String(indexCode || "").trim();
  if (!/^\d{4}$/.test(code)) {
    throw new Error("indexCode must be a 4-digit KIS industry index code.");
  }
  return code;
}

function normalizeIndexRows(rows) {
  return rows.map((row) => ({
    date: row.stck_bsop_date || null,
    open: toNumber(row.bstp_nmix_oprc),
    high: toNumber(row.bstp_nmix_hgpr),
    low: toNumber(row.bstp_nmix_lwpr),
    close: toNumber(row.bstp_nmix_prpr),
    volume: toNumber(row.acml_vol),
    tradingValue: toNumber(row.acml_tr_pbmn)
  })).filter((row) => row.date && row.close !== null);
}

export async function getDomesticIndexDailyChart({
  indexCode,
  startDate,
  endDate,
  minRows = 130,
  maxPages = 4
}) {
  const code = normalizeIndexCode(indexCode);
  const end = endDate || yyyymmdd(new Date());

  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() - 420);
  const start = startDate || yyyymmdd(defaultStart);

  const allRows = [];
  let currentEnd = end;

  for (let page = 0; page < maxPages; page += 1) {
    const data = await kisGet(
      "/uapi/domestic-stock/v1/quotations/inquire-daily-indexchartprice",
      "FHKUP03500100",
      {
        FID_COND_MRKT_DIV_CODE: "U",
        FID_INPUT_ISCD: code,
        FID_INPUT_DATE_1: start,
        FID_INPUT_DATE_2: currentEnd,
        FID_PERIOD_DIV_CODE: "D"
      }
    );

    const rawRows = Array.isArray(data.output2) ? data.output2 : [];
    const rows = normalizeIndexRows(rawRows);
    if (!rows.length) break;

    allRows.push(...rows);

    const uniqueCount = new Set(allRows.map((row) => row.date)).size;
    const oldestDate = rows.reduce(
      (oldest, row) => (!oldest || row.date < oldest ? row.date : oldest),
      null
    );

    // 국내 업종지수 일봉 API는 한 호출에서 50건이 반환되는 경우가 있어
    // 종목 일봉의 100건 기준을 그대로 적용하면 첫 페이지에서 조기 종료된다.
    // 필요한 행 수를 채우거나 조회 시작일에 도달할 때까지 종료일을 과거로 이동한다.
    if (uniqueCount >= minRows || !oldestDate || oldestDate <= start) {
      break;
    }

    const nextEnd = previousDayYyyymmdd(oldestDate);
    if (!nextEnd || nextEnd >= currentEnd) break;
    currentEnd = nextEnd;
  }

  const deduped = [...new Map(allRows.map((row) => [row.date, row])).values()]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  return {
    source: "KIS",
    indexCode: code,
    indexName: code === "0001" ? "KOSPI" : code === "1001" ? "KOSDAQ" : code,
    startDate: start,
    endDate: end,
    rows: deduped
  };
}
