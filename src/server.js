import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { analyzeStock } from "./ai_router.js";
import { SAMPLE_STOCK } from "./data/sample_stock.js";
import { analyzeDartStock } from "./services/dart_analysis_service.js";
import {
  getDomesticQuote,
  getDomesticDailyChart,
  getDomesticInvestorFlow,
  getDomesticIndexDailyChart
} from "./services/kis_service.js";
import { analyzeStockWithMarketData } from "./services/full_analysis_service.js";
import { getCompanyNews } from "./services/news_service.js";
import { analyzeNewsItems } from "./services/news_analysis_service.js";
import { loadStockUniverse } from "./services/stock_master_service.js";
import { runScreener } from "./services/screener_service.js";
import { runDailyCandidateEngine } from "./services/candidate_engine_service.js";
import { createEntrySnapshot, evaluateExitPosition } from "./services/entry_exit_service.js";
import {
  getCompanyByStockCode,
  getDisclosuresByStockCode,
  getFinancialStatementsByStockCode,
  loadCorpCodes,
} from "./services/dart_service.js";

const app = express();
const APP_VERSION = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
const PORT = Number(process.env.PORT || 3000);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "../public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.get("/api/info", (req, res) => {
  res.json({
    service: "K-Stock AI",
    version: APP_VERSION,
    endpoints: [
      "GET /health",
      "POST /api/test-analysis",
      "POST /api/analyze",
      "GET /dashboard",
      "GET /api/full/analyze/:stockCode?businessYear=YYYY",
      "GET /api/dart/company/:stockCode",
      "GET /api/dart/disclosures/:stockCode",
      "GET /api/dart/financials/:stockCode",
      "GET /api/dart/analyze/:stockCode",
      "GET /api/screener?exchange=all&top=20&enrich=10",
      "GET /api/universe/status",
      "GET /api/candidates/today?exchange=all&top=20&quoteLimit=15&deepLimit=3",
      "POST /api/entry/snapshot",
      "POST /api/exit/evaluate/:stockCode?businessYear=YYYY"
    ]
  });
});

app.get("/api/default-business-year", (req, res) => {
  res.json({ success: true, result: { requestedYear: String(new Date().getFullYear()), fallbackEnabled: true, maxLookbackYears: 3 } });
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "k-stock-ai",
    version: APP_VERSION,
    mode: process.env.KSTOCK_AI_MODE || "mock",
    dartEnabled: process.env.KSTOCK_DART_ENABLED === "true",
    liveTrading: process.env.KSTOCK_LIVE_TRADING_ENABLED === "true",
  });
});

app.post("/api/test-analysis", async (req, res) => {
  try {
    const result = await analyzeStock(SAMPLE_STOCK);

    res.json({
      success: true,
      warning: "SAMPLE_DATA_ONLY",
      result,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: "TEST_ANALYSIS_FAILED",
      message: error.message,
    });
  }
});

app.post("/api/analyze", async (req, res) => {
  try {
    const result = await analyzeStock(req.body);

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error(error);

    res.status(400).json({
      success: false,
      error: "ANALYSIS_FAILED",
      message: error.message,
    });
  }
});


app.get("/api/search/stocks", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim().toLowerCase();
    if (q.length < 1) return res.json({ success: true, result: [] });

    const rows = await loadCorpCodes();
    const listed = rows.filter((item) => /^\d{6}$/.test(item.stockCode) && item.stockCode !== "000000");
    const starts = [];
    const contains = [];

    for (const item of listed) {
      const name = item.corpName.toLowerCase();
      const code = item.stockCode;
      if (name.startsWith(q) || code.startsWith(q)) starts.push(item);
      else if (name.includes(q) || code.includes(q)) contains.push(item);
      if (starts.length + contains.length >= 30) break;
    }

    const result = [...starts, ...contains].slice(0, 12).map((item) => ({
      stockCode: item.stockCode,
      corpName: item.corpName,
      corpEngName: item.corpEngName
    }));
    res.json({ success: true, result });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, error: "STOCK_SEARCH_FAILED", message: error.message });
  }
});


app.get("/api/universe/status", async (req, res) => {
  try {
    const result = await loadStockUniverse({ refresh: req.query.refresh === "true" });
    res.json({ success: true, result: { source: result.source, total: result.total, status: result.status } });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, error: "UNIVERSE_FAILED", message: error.message });
  }
});

app.get("/api/screener", async (req, res) => {
  try {
    const exchange = ["all", "kospi", "kosdaq"].includes(String(req.query.exchange)) ? String(req.query.exchange) : "all";
    const top = Math.max(1, Math.min(Number(req.query.top || 20), 100));
    const enrich = Math.max(0, Math.min(Number(req.query.enrich || 10), 30));
    const result = await runScreener({ exchange, top, enrich, refresh: req.query.refresh === "true" });
    res.json({ success: true, result });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, error: "SCREENER_FAILED", message: error.message });
  }
});


app.get("/api/candidates/today", async (req, res) => {
  try {
    const exchange = ["all", "kospi", "kosdaq"].includes(String(req.query.exchange)) ? String(req.query.exchange) : "all";
    const top = Math.max(1, Math.min(Number(req.query.top || 20), 30));
    const candidatePool = Math.max(top, Math.min(Number(req.query.candidatePool || 60), 100));
    const quoteLimit = Math.max(0, Math.min(Number(req.query.quoteLimit || 15), 30));
    const deepLimit = Math.max(0, Math.min(Number(req.query.deepLimit || 3), 5));
    const businessYear = String(req.query.businessYear || new Date().getFullYear());
    const result = await runDailyCandidateEngine({ exchange, top, candidatePool, quoteLimit, deepLimit, businessYear, refresh: req.query.refresh === "true" });
    res.json({ success: true, result });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, error: "CANDIDATE_ENGINE_FAILED", message: error.message });
  }
});

app.post("/api/entry/snapshot", (req, res) => {
  try {
    const { analysis, buyPrice, quantity, stopLossPct, takeProfitPct, note } = req.body || {};
    const result = createEntrySnapshot(analysis, { buyPrice, quantity, stopLossPct, takeProfitPct, note });
    res.json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, error: "ENTRY_SNAPSHOT_FAILED", message: error.message });
  }
});

app.post("/api/exit/evaluate/:stockCode", async (req, res) => {
  try {
    const stockCode = String(req.params.stockCode || "").padStart(6, "0");
    const businessYear = String(req.query.businessYear || new Date().getFullYear());
    const entry = req.body?.entry;
    if (!entry) throw new Error("entry snapshot is required");
    const currentAnalysis = await analyzeStockWithMarketData({ stockCode, businessYear });
    const evaluation = evaluateExitPosition({ entry, currentAnalysis });
    res.json({ success: true, result: { entry, evaluation, currentAnalysis } });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, error: "EXIT_EVALUATION_FAILED", message: error.message });
  }
});

app.get("/api/dart/company/:stockCode", async (req, res) => {
  try {
    const result = await getCompanyByStockCode(req.params.stockCode);
    res.json({ success: true, result });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      success: false,
      error: "DART_COMPANY_FAILED",
      message: error.message,
      dartStatus: error.dartStatus || null,
    });
  }
});

app.get("/api/dart/disclosures/:stockCode", async (req, res) => {
  try {
    const result = await getDisclosuresByStockCode({
      stockCode: req.params.stockCode,
      beginDate: req.query.beginDate,
      endDate: req.query.endDate,
      pageCount: Number(req.query.pageCount || 20),
      pageNo: Number(req.query.pageNo || 1),
    });

    res.json({ success: true, result });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      success: false,
      error: "DART_DISCLOSURES_FAILED",
      message: error.message,
      dartStatus: error.dartStatus || null,
    });
  }
});

app.get("/api/dart/financials/:stockCode", async (req, res) => {
  try {
    const businessYear = req.query.businessYear;

    if (!/^\d{4}$/.test(String(businessYear || ""))) {
      return res.status(400).json({
        success: false,
        error: "BUSINESS_YEAR_REQUIRED",
        message: "businessYear must be a 4-digit year, e.g. 2025.",
      });
    }

    const result = await getFinancialStatementsByStockCode({
      stockCode: req.params.stockCode,
      businessYear,
      reportCode: req.query.reportCode || "11011",
      fsDiv: req.query.fsDiv || "CFS",
    });

    res.json({ success: true, result });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      success: false,
      error: "DART_FINANCIALS_FAILED",
      message: error.message,
      dartStatus: error.dartStatus || null,
    });
  }
});


app.get("/api/dart/analyze/:stockCode", async (req, res) => {
  try {
    const businessYear = req.query.businessYear;

    if (!/^\d{4}$/.test(String(businessYear || ""))) {
      return res.status(400).json({
        success: false,
        error: "BUSINESS_YEAR_REQUIRED",
        message: "businessYear must be a 4-digit year, e.g. 2025."
      });
    }

    const result = await analyzeDartStock({
      stockCode: req.params.stockCode,
      businessYear,
      reportCode: req.query.reportCode || "11011",
      fsDiv: req.query.fsDiv || "CFS",
      disclosureLookbackDays: Number(req.query.disclosureLookbackDays || 180)
    });

    res.json({
      success: true,
      warning: "DART_ONLY_ANALYSIS_NO_PRICE_FLOW_NEWS",
      result
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      success: false,
      error: "DART_ANALYSIS_FAILED",
      message: error.message,
      dartStatus: error.dartStatus || null
    });
  }
});


app.get("/api/kis/quote/:stockCode", async (req, res) => {
  try {
    const result = await getDomesticQuote(req.params.stockCode);
    res.json({ success: true, result });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      success: false,
      error: "KIS_QUOTE_FAILED",
      message: error.message
    });
  }
});

app.get("/api/kis/chart/:stockCode", async (req, res) => {
  try {
    const result = await getDomesticDailyChart({
      stockCode: req.params.stockCode,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    });
    res.json({ success: true, result });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      success: false,
      error: "KIS_CHART_FAILED",
      message: error.message
    });
  }
});


app.get("/api/kis/flow/:stockCode", async (req, res) => {
  try {
    const result = await getDomesticInvestorFlow(req.params.stockCode);
    res.json({ success: true, result });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      success: false,
      error: "KIS_FLOW_FAILED",
      message: error.message
    });
  }
});


app.get("/api/kis/index/:indexCode", async (req, res) => {
  try {
    const result = await getDomesticIndexDailyChart({
      indexCode: req.params.indexCode,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      minRows: Number(req.query.minRows || 130),
      maxPages: Number(req.query.maxPages || 3)
    });
    res.json({ success: true, result });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, error: "KIS_INDEX_FAILED", message: error.message });
  }
});


app.get("/api/news/:stockCode", async (req, res) => {
  try {
    const company = await getCompanyByStockCode(req.params.stockCode);
    const corpName = company?.corp_name || company?.corpName || req.params.stockCode;
    const news = await getCompanyNews({
      corpName,
      stockCode: req.params.stockCode,
      lookbackDays: Number(req.query.lookbackDays || process.env.KSTOCK_NEWS_LOOKBACK_DAYS || 7),
      maxItems: Number(req.query.maxItems || process.env.KSTOCK_NEWS_MAX_ITEMS || 30)
    });
    res.json({ success: true, result: { news, score: analyzeNewsItems(news) } });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, error: "NEWS_FAILED", message: error.message });
  }
});

app.get("/api/full/analyze/:stockCode", async (req, res) => {
  try {
    const businessYear = String(req.query.businessYear || new Date().getFullYear());

    if (!/^\d{4}$/.test(businessYear)) {
      return res.status(400).json({
        success: false,
        error: "BUSINESS_YEAR_INVALID",
        message: "businessYear must be a 4-digit year, e.g. 2026."
      });
    }

    const result = await analyzeStockWithMarketData({
      stockCode: req.params.stockCode,
      businessYear
    });

    res.json({
      success: true,
      warning: result.completeness.percent === 100 ? "V1_COMMITTEE_READY" : "PARTIAL_ANALYSIS",
      result
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      success: false,
      error: "FULL_ANALYSIS_FAILED",
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`K-Stock AI v${APP_VERSION} running on http://localhost:${PORT}`);
  console.log(`Mode: ${process.env.KSTOCK_AI_MODE || "mock"}`);
  console.log(`OpenDART: ${process.env.KSTOCK_DART_ENABLED === "true" ? "enabled" : "disabled"}`);

  if (process.env.KSTOCK_LIVE_TRADING_ENABLED === "true") {
    console.warn(`WARNING: live trading flag is true. v${APP_VERSION} does not implement live orders.`);
  }
});
