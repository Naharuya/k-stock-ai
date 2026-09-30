import "dotenv/config";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { chmod, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";

import { analyzeStock } from "./ai_router.js";
import { SAMPLE_STOCK } from "./data/sample_stock.js";
import { createLeaderDisclosureService } from "./services/leader_disclosures.js";
import { createSafeDataPipeline } from "./services/safe_data_pipeline.js";
import { createAnalysisDataLoader } from "./services/analysis_data_loader.js";
import { getWatchlistReport, listRecentWatchlistReports } from "./services/watchlist_reports.js";
import { validateWatchlist } from "./services/watchlist_runner.js";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const externalEnabled = process.env.KSTOCK_EXTERNAL_ACCESS_ENABLED === "true";
const liveTrading = process.env.KSTOCK_LIVE_TRADING_ENABLED === "true";
const brokerEnabled = process.env.KSTOCK_BROKER_ENABLED === "true";
const accessToken = process.env.KSTOCK_EXTERNAL_ACCESS_TOKEN || "";
const disclosures = createLeaderDisclosureService();
const publicDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), "../public");
const analysisDataLoader = createAnalysisDataLoader({ pipeline: createSafeDataPipeline({}) });
const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reportDirectory = path.resolve(process.env.KSTOCK_REPORT_DIR || path.join(projectDirectory, "data", "reports"));
const watchlistPath = path.resolve(process.env.KSTOCK_WATCHLIST_PATH || path.join(projectDirectory, "data", "watchlist.json"));

if (liveTrading || brokerEnabled) {
  throw new Error("K-Stock external service refuses to start when broker/live trading is enabled.");
}
if (externalEnabled && accessToken.length < 32) {
  throw new Error("KSTOCK_EXTERNAL_ACCESS_TOKEN must be at least 32 characters when external access is enabled.");
}
if (!externalEnabled && HOST !== "127.0.0.1" && HOST !== "localhost") {
  throw new Error("Non-loopback HOST requires KSTOCK_EXTERNAL_ACCESS_ENABLED=true.");
}

app.disable("x-powered-by");
app.use(express.json({ limit: "256kb" }));
app.use(express.static(publicDirectory));

function secureEqual(a, b) {
  const left = Buffer.from(a || "");
  const right = Buffer.from(b || "");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function requireExternalAuth(req, res, next) {
  if (!externalEnabled) return next();
  const header = req.get("authorization") || "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!secureEqual(provided, accessToken)) {
    return res.status(401).json({ success: false, error: "UNAUTHORIZED" });
  }
  return next();
}

app.get("/health", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({
    ok: true,
    service: "k-stock-ai",
    version: "0.1.0",
    mode: process.env.KSTOCK_AI_MODE || "mock",
    externalAccess: externalEnabled,
    brokerEnabled: false,
    liveTrading: false,
  });
});

app.use("/api", requireExternalAuth);

app.get("/api/watchlist", async (_req, res) => {
  try {
    const saved = JSON.parse(await readFile(watchlistPath, "utf8"));
    res.json({ stocks: validateWatchlist(saved, 10) });
  } catch (error) {
    if (error?.code === "ENOENT") return res.json({ stocks: [] });
    res.status(400).json({ success: false, error: "INVALID_WATCHLIST", message: error.message });
  }
});

app.put("/api/watchlist", async (req, res) => {
  let temporaryPath;
  try {
    const stocks = validateWatchlist(req.body, 10);
    await mkdir(path.dirname(watchlistPath), { recursive: true, mode: 0o700 });
    temporaryPath = watchlistPath+"."+process.pid+".tmp";
    await writeFile(temporaryPath, JSON.stringify({ stocks }, null, 2)+"\n", { encoding: "utf8", mode: 0o600, flag: "wx" });
    await rename(temporaryPath, watchlistPath);
    await chmod(watchlistPath, 0o600);
    res.json({ success: true, stocks });
  } catch (error) {
    if (temporaryPath) await unlink(temporaryPath).catch(() => {});
    res.status(400).json({ success: false, error: "INVALID_WATCHLIST", message: error.message });
  }
});

app.get("/api/reports", async (req, res) => {
  try {
    const limit = req.query.limit == null ? 10 : Number(req.query.limit);
    res.json(await listRecentWatchlistReports(reportDirectory, limit));
  } catch (error) {
    res.status(400).json({ success: false, error: "INVALID_REPORT_QUERY", message: error.message });
  }
});

app.get("/api/reports/:runId", async (req, res) => {
  try {
    res.json({ success: true, report: await getWatchlistReport(reportDirectory, req.params.runId) });
  } catch (error) {
    const notFound = error?.code === "ENOENT";
    res.status(notFound ? 404 : 400).json({
      success: false,
      error: notFound ? "REPORT_NOT_FOUND" : "INVALID_REPORT_ID",
      message: notFound ? "Report not found." : error.message,
    });
  }
});

app.get("/api/disclosures", async (_req, res) => {
  try {
    const data = await disclosures.getBerkshireFilings();
    res.set("Cache-Control", "no-store");
    res.json({ success: true, data });
  } catch {
    console.error("disclosures_request_failed");
    res.status(503).json({ success: false, error: "DISCLOSURES_UNAVAILABLE" });
  }
});

app.get("/api/disclosures/berkshire/portfolio", async (_req, res) => {
  try {
    const data = await disclosures.getBerkshirePortfolio();
    res.set("Cache-Control", "no-store");
    res.json({ success: true, data });
  } catch {
    console.error("portfolio_request_failed");
    res.status(503).json({ success: false, error: "PORTFOLIO_UNAVAILABLE" });
  }
});

app.post("/api/test-analysis", async (_req, res) => {
  try {
    const result = await analyzeStock(SAMPLE_STOCK);
    res.json({ success: true, warning: "SAMPLE_DATA_ONLY", result });
  } catch (error) {
    console.error("test_analysis_failed");
    res.status(500).json({ success: false, error: "TEST_ANALYSIS_FAILED" });
  }
});

app.post("/api/analyze", async (req, res) => {
  try {
    const { stockData, snapshot } = await analysisDataLoader.load(req.body);
    const result = await analyzeStock(stockData);
    res.json({
      success: true,
      ...(snapshot ? {
        sourceData: {
          corpCode: snapshot.corpCode,
          dataQuality: snapshot.dataQuality,
          freshness: snapshot.freshness,
          disclosures: {
            count: snapshot.disclosures.items.length,
            retrievedPages: snapshot.disclosures.retrievedPages,
            totalPages: snapshot.disclosures.totalPages,
            truncated: snapshot.disclosures.truncated,
          },
        },
      } : {}),
      result,
    });
  } catch (error) {
    console.error("analysis_failed");
    res.status(400).json({ success: false, error: "ANALYSIS_FAILED" });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`K-Stock AI v0.1.0 running on http://${HOST}:${PORT}`);
  console.log(`Mode: ${process.env.KSTOCK_AI_MODE || "mock"}`);
  console.log(`External access: ${externalEnabled ? "enabled" : "disabled"}`);
});
