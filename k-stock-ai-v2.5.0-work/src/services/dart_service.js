import AdmZip from "adm-zip";
import { XMLParser } from "fast-xml-parser";

const DART_BASE = "https://opendart.fss.or.kr/api";

let corpCodeCache = null;
let corpCodeCacheLoadedAt = 0;

function assertDartEnabled() {
  if (process.env.KSTOCK_DART_ENABLED !== "true") {
    throw new Error("KSTOCK_DART_ENABLED is false.");
  }

  if (!process.env.DART_API_KEY) {
    throw new Error("DART_API_KEY is missing.");
  }
}

function dartUrl(path, params = {}) {
  const url = new URL(`${DART_BASE}/${path}`);
  url.searchParams.set("crtfc_key", process.env.DART_API_KEY);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

async function fetchJson(path, params = {}) {
  assertDartEnabled();

  const response = await fetch(dartUrl(path, params), {
    headers: {
      "User-Agent": "K-Stock-AI/0.2.0",
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`OpenDART HTTP ${response.status}`);
  }

  const data = await response.json();

  if (data.status && data.status !== "000") {
    const error = new Error(`OpenDART ${data.status}: ${data.message || "Unknown error"}`);
    error.dartStatus = data.status;
    throw error;
  }

  return data;
}

function normalizeCorpCodeList(parsed) {
  const list = parsed?.result?.list ?? parsed?.list ?? [];
  const rows = Array.isArray(list) ? list : [list];

  return rows
    .filter(Boolean)
    .map((item) => ({
      corpCode: String(item.corp_code || "").trim(),
      corpName: String(item.corp_name || "").trim(),
      corpEngName: String(item.corp_eng_name || "").trim(),
      stockCode: String(item.stock_code || "").trim().padStart(6, "0"),
      modifyDate: String(item.modify_date || "").trim(),
    }))
    .filter((item) => item.corpCode);
}

export async function loadCorpCodes({ force = false } = {}) {
  assertDartEnabled();

  const cacheHours = Number(process.env.DART_CORP_CODE_CACHE_HOURS || 24);
  const cacheMs = cacheHours * 60 * 60 * 1000;
  const now = Date.now();

  if (
    !force &&
    corpCodeCache &&
    now - corpCodeCacheLoadedAt < cacheMs
  ) {
    return corpCodeCache;
  }

  const response = await fetch(dartUrl("corpCode.xml"), {
    headers: {
      "User-Agent": "K-Stock-AI/0.2.0",
      "Accept": "application/zip, application/octet-stream",
    },
  });

  if (!response.ok) {
    throw new Error(`OpenDART corpCode HTTP ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const zip = new AdmZip(buffer);
  const entry = zip.getEntries().find((item) =>
    item.entryName.toLowerCase().endsWith(".xml")
  );

  if (!entry) {
    throw new Error("OpenDART corpCode ZIP did not contain XML.");
  }

  const xml = entry.getData().toString("utf8");
  const parser = new XMLParser({
    ignoreAttributes: false,
    trimValues: true,
    parseTagValue: false,
  });

  const parsed = parser.parse(xml);
  const rows = normalizeCorpCodeList(parsed);

  if (!rows.length) {
    throw new Error("OpenDART corpCode list is empty.");
  }

  corpCodeCache = rows;
  corpCodeCacheLoadedAt = now;

  return corpCodeCache;
}

export async function findCorpByStockCode(stockCode) {
  const normalized = String(stockCode || "").replace(/\D/g, "").padStart(6, "0");

  if (!/^\d{6}$/.test(normalized)) {
    throw new Error("stockCode must be a 6-digit Korean stock code.");
  }

  const rows = await loadCorpCodes();
  const match = rows.find((item) => item.stockCode === normalized);

  if (!match) {
    throw new Error(`No OpenDART corporation found for stock code ${normalized}.`);
  }

  return match;
}

export async function getCompanyByCorpCode(corpCode) {
  return fetchJson("company.json", {
    corp_code: corpCode,
  });
}

export async function getCompanyByStockCode(stockCode) {
  const corp = await findCorpByStockCode(stockCode);
  const company = await getCompanyByCorpCode(corp.corpCode);

  return {
    mapping: corp,
    company,
  };
}

export async function getDisclosuresByCorpCode({
  corpCode,
  beginDate,
  endDate,
  pageCount = 20,
  pageNo = 1,
}) {
  return fetchJson("list.json", {
    corp_code: corpCode,
    bgn_de: beginDate,
    end_de: endDate,
    page_count: pageCount,
    page_no: pageNo,
  });
}

export async function getDisclosuresByStockCode({
  stockCode,
  beginDate,
  endDate,
  pageCount = 20,
  pageNo = 1,
}) {
  const corp = await findCorpByStockCode(stockCode);
  const disclosures = await getDisclosuresByCorpCode({
    corpCode: corp.corpCode,
    beginDate,
    endDate,
    pageCount,
    pageNo,
  });

  return {
    mapping: corp,
    disclosures,
  };
}

export async function getFinancialStatementsByCorpCode({
  corpCode,
  businessYear,
  reportCode = "11011",
  fsDiv = "CFS",
}) {
  return fetchJson("fnlttSinglAcntAll.json", {
    corp_code: corpCode,
    bsns_year: businessYear,
    reprt_code: reportCode,
    fs_div: fsDiv,
  });
}

export async function getFinancialStatementsByStockCode({
  stockCode,
  businessYear,
  reportCode = "11011",
  fsDiv = "CFS",
}) {
  const corp = await findCorpByStockCode(stockCode);
  const financials = await getFinancialStatementsByCorpCode({
    corpCode: corp.corpCode,
    businessYear,
    reportCode,
    fsDiv,
  });

  return {
    mapping: corp,
    financials,
  };
}
