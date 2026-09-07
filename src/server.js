import "dotenv/config";
import express from "express";

import { analyzeStock } from "./ai_router.js";
import { SAMPLE_STOCK } from "./data/sample_stock.js";

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
  res.json({
    service: "K-Stock AI",
    version: "0.1.0",
    endpoints: [
      "GET /health",
      "POST /api/test-analysis",
      "POST /api/analyze"
    ]
  });
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "k-stock-ai",
    version: "0.1.0",
    mode: process.env.KSTOCK_AI_MODE || "mock",
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

app.listen(PORT, () => {
  console.log(`K-Stock AI v0.1.0 running on http://localhost:${PORT}`);
  console.log(`Mode: ${process.env.KSTOCK_AI_MODE || "mock"}`);

  if (process.env.KSTOCK_LIVE_TRADING_ENABLED === "true") {
    console.warn("WARNING: live trading flag is true. v0.1.0 does not implement live orders.");
  }
});
