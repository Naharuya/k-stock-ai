import {providerFetch,requestDelay} from './request_context.js';
import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true
});

function enabled() {
  return process.env.KSTOCK_NEWS_ENABLED === "true";
}

function cleanCorpName(name = "") {
  return String(name)
    .replace(/\(주\)|주식회사|㈜/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTitle(title = "") {
  return String(title)
    .toLowerCase()
    .replace(/\s+-\s+[^-]+$/u, "")
    .replace(/[^0-9a-z가-힣]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function parseDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function buildGoogleNewsRssUrl({ corpName, stockCode, lookbackDays = 7 }) {
  const company = cleanCorpName(corpName);
  const query = `\"${company}\" (${stockCode} OR 주가 OR 실적 OR 공시 OR 투자) when:${Math.max(1, Number(lookbackDays) || 7)}d`;
  const params = new URLSearchParams({
    q: query,
    hl: "ko",
    gl: "KR",
    ceid: "KR:ko"
  });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

export async function getCompanyNews({ corpName, stockCode, lookbackDays = 7, maxItems = 30 }) {
  if (!enabled()) {
    throw new Error("KSTOCK_NEWS_ENABLED is false.");
  }

  const provider = process.env.KSTOCK_NEWS_PROVIDER || "google_rss";
  if (provider !== "google_rss") {
    throw new Error(`Unsupported news provider: ${provider}`);
  }

  const url = buildGoogleNewsRssUrl({ corpName, stockCode, lookbackDays });
  const response = await providerFetch(url, {
    headers: {
      "user-agent": "K-Stock-AI/0.7.0 (+personal research tool)",
      accept: "application/rss+xml, application/xml, text/xml"
    }
  });

  if (!response.ok) {
    throw new Error(`News RSS failed: HTTP ${response.status}`);
  }

  const xml = await response.text();
  const doc = parser.parse(xml);
  const rawItems = toArray(doc?.rss?.channel?.item);
  const cutoffMs = Date.now() - Math.max(1, Number(lookbackDays) || 7) * 86400000;

  const seen = new Set();
  const items = [];

  for (const item of rawItems) {
    const title = String(item?.title || "").trim();
    if (!title) continue;

    const key = normalizeTitle(title);
    if (!key || seen.has(key)) continue;

    const publishedAt = parseDate(item?.pubDate);
    if (publishedAt && publishedAt.getTime() < cutoffMs) continue;

    seen.add(key);
    items.push({
      title,
      link: String(item?.link || ""),
      publishedAt: publishedAt ? publishedAt.toISOString() : null,
      source: String(item?.source?.["#text"] || item?.source || "").trim() || null,
      sourceUrl:item?.source?.['@_url']||null,
      relevance:cleanCorpName(corpName)&&title.includes(cleanCorpName(corpName))?'COMPANY_NAME_MATCH':String(title).includes(String(stockCode))?'STOCK_CODE_MATCH':'UNVERIFIED',
      evidenceSource:'RSS_TITLE',verified:false,
      normalizedTitle: key
    });

    if (items.length >= Math.max(1, Number(maxItems) || 30)) break;
  }

  return {
    source: "GOOGLE_NEWS_RSS",
    provider,
    corpName: cleanCorpName(corpName),
    stockCode,
    lookbackDays: Number(lookbackDays) || 7,
    fetched: rawItems.length,
    rows: items.length,
    items,
    caveat: "Google News RSS의 기사 제목·발행시각·출처를 기준으로 수집합니다. 원문 전체 내용 분석이 아니므로 제목 표현과 중복 보도에 따른 편향이 있을 수 있습니다."
  };
}
