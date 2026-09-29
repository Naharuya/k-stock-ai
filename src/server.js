import "dotenv/config";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";

import { analyzeStock } from "./ai_router.js";
import { SAMPLE_STOCK } from "./data/sample_stock.js";
import { createLeaderDisclosureService } from "./services/leader_disclosures.js";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const externalEnabled = process.env.KSTOCK_EXTERNAL_ACCESS_ENABLED === "true";
const liveTrading = process.env.KSTOCK_LIVE_TRADING_ENABLED === "true";
const brokerEnabled = process.env.KSTOCK_BROKER_ENABLED === "true";
const accessToken = process.env.KSTOCK_EXTERNAL_ACCESS_TOKEN || "";
const disclosures = createLeaderDisclosureService();
const publicDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), "../public");

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
    const result = await analyzeStock(req.body);
    res.json({ success: true, result });
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
