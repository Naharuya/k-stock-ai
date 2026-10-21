import {createMarketActivity} from './v2/market_activity.js';
import {createMarketDiscovery} from './v2/market_discovery.js';
import {createNewsDigest,registerNewsDigest} from './v2/news_digest.js';
import {createMarketMovers,registerMarketMovers} from './v2/market_movers.js';
import {createTradingWorkspace,registerTradingWorkspace} from './v2/trading_workspace.js';
import {registerBackendResearchProgress} from './v2/backend_research_progress.js';
import {createOvernightResearch} from './v2/overnight_research.js';
import {createOfficialResearchCollection} from './v2/official_research_collection.js';
import {createAutomaticStatementAnalysis} from './v2/automatic_statement_analysis.js';
import {createStockPerformanceService,registerStockPerformanceRoutes} from './v2/stock_performance.js';
import {createPaperPerformanceService,registerPaperPerformanceRoutes} from './v2/paper_performance_service.js';
import {createBenchmarkService,registerBenchmarkRoutes} from './v2/benchmark_data.js';
import { createPerformanceReportService, registerPerformanceRoutes } from './v2/performance_report.js';
import { createKrRefresh } from './v2/kr_collect.js';
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
import { createCandidateService, registerCandidateRoutes } from "./v2/candidate_service.js";
import { createOwnershipRefresh } from "./v2/ownership_refresh.js";
import { createSec13fRefresh } from "./v2/sec_13f_refresh.js";
import { createForm4Refresh } from "./v2/sec_form4_refresh.js";
import { createCandidateReportService } from "./v2/candidate_report.js";
import { createFinancialRefresh } from "./v2/sec_financials.js";
import { createUsPriceRefresh } from "./v2/us_prices.js";
import { readPeerValidationStatus, startPeerValidationScheduler } from './v2/peer_validation_worker.js';
import { readDataCollectionStatus, runDataCollectionWorker } from './v2/data_collection_worker.js';
import {createResearchAutomation,registerResearchDashboardRoutes,savedResearchInputRevision} from './v2/research_automation.js';
import {createInfluenceResearchService,registerInfluenceResearchRoutes} from './v2/influence_service.js';

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
    dataSources: { marketGateway: process.env.KSTOCK_MARKET_GATEWAY_ENABLED === 'true' ? 'CONFIGURED_NOT_VERIFIED' : 'NOT_CONFIGURED', kis: process.env.KIS_APP_KEY && process.env.KIS_APP_SECRET ? 'CONFIGURED_NOT_VERIFIED' : 'NOT_CONFIGURED', opendart: process.env.OPENDART_API_KEY ? 'CONFIGURED_NOT_VERIFIED' : 'NOT_CONFIGURED', scheduler: 'NOT_VERIFIED' },
    brokerEnabled: false,
    liveTrading: false,
  });
});

app.use("/api", requireExternalAuth);
const newsDigest=createNewsDigest({directory:path.join(projectDirectory,"data/v2/news-digest")});registerNewsDigest(app,newsDigest);newsDigest.start();
const marketMovers=createMarketMovers({directory:path.join(projectDirectory,'data/v2/trading-workspace')});registerMarketMovers(app,marketMovers);
registerTradingWorkspace(app,createMarketDiscovery({activity:createMarketActivity({directory:path.join(projectDirectory,'data/v2/trading-workspace')}),movers:marketMovers,news:newsDigest,workspace:createTradingWorkspace({directory:path.join(projectDirectory,"data/v2/trading-workspace"),loadEvents:async()=>{const r=await influenceService.load();return r.capitalEvents||[];}})}));
registerBackendResearchProgress(app,path.join(projectDirectory,"data/v2/research-progress.json"));
const refreshOwnership = createOwnershipRefresh();
const refreshSec = createSec13fRefresh();
const refreshForm4 = createForm4Refresh();
const refreshFinancial = createFinancialRefresh();
const refreshKr = createKrRefresh();
const refreshPrices = createUsPriceRefresh();
const candidateService = process.env.KSTOCK_V2_READ_BATCH_REPORT === 'true' ? createCandidateReportService({
  reportPath: path.resolve(process.env.KSTOCK_V2_OUTPUT_PATH || path.join(projectDirectory, 'data/v2/latest.json')),
}) : createCandidateService({
  requireVerifiedRecommendations:true,
  refresh: async input => refreshPrices(await refreshFinancial(await refreshForm4(await refreshSec(await refreshOwnership(await refreshKr(input)))))),
  inputPath: path.resolve(process.env.KSTOCK_V2_INPUT_PATH || path.join(projectDirectory, "data", "v2-input.json")),
});
registerCandidateRoutes(app, candidateService);
const peerStatePath = path.join(projectDirectory, 'data/v2/peer-validation/state.json');
const collectionStatePath = path.join(projectDirectory, 'data/v2/data-collection/state.json');
const influenceService=createInfluenceResearchService({sourcesPath:path.join(projectDirectory,'data/v2/influence/sources.json'),bridgePath:path.join(projectDirectory,'data/v2/verification/peer-share-bridge-review.json'),reportPath:path.resolve(process.env.KSTOCK_V2_OUTPUT_PATH||path.join(projectDirectory,'data/v2/reports/latest.json'))});
registerInfluenceResearchRoutes(app,influenceService);
let researchPolicy;try{researchPolicy=JSON.parse(await readFile(path.join(projectDirectory,'data/v2/data-collection/research-policy.json'),'utf8'));}catch{}
const collectionEnabled=process.env.KSTOCK_RESEARCH_COLLECTION_ENABLED==='true'||(process.env.KSTOCK_RESEARCH_COLLECTION_ENABLED===undefined&&researchPolicy?.schemaVersion===1&&researchPolicy.enabled===true&&researchPolicy.scopeId==='approved-official-read-only-v1'&&researchPolicy.liveTradingEnabled===false);
const officialCollection=createOfficialResearchCollection({directory:path.join(projectDirectory,'data/v2'),env:{...process.env,KSTOCK_RESEARCH_COLLECTION_ENABLED:String(collectionEnabled)},onAnalysis:createAutomaticStatementAnalysis({directory:path.join(projectDirectory,'data/v2/influence')})});
const researchAutomation=createResearchAutomation({loadResearch:()=>influenceService.load(),statePath:path.join(projectDirectory,'data/v2/research-automation/state.json'),collectionPath:collectionStatePath,inputRevision:()=>savedResearchInputRevision(path.join(projectDirectory,'data/v2/influence'))});
const overnightResearch=createOvernightResearch({file:path.join(projectDirectory,'data/v2/research-automation/overnight.json'),loadResearch:()=>influenceService.load(),loadCollection:()=>officialCollection.status(),enabled:process.env.KSTOCK_PEER_WORKER_ENABLED==='true'});
registerResearchDashboardRoutes(app,{loadResearch:()=>influenceService.load(),automation:researchAutomation,loadOvernight:()=>overnightResearch.status(),loadCollection:()=>officialCollection.status(),loadScheduler:()=>readPeerValidationStatus({statePath:peerStatePath})});
app.get('/api/v2/data-collection/status', async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  try { res.json({ success: true, ...await readDataCollectionStatus({ statePath: collectionStatePath }) }); }
  catch { res.status(503).json({ success: false, status: 'UNAVAILABLE', error: 'COLLECTION_STATUS_UNAVAILABLE' }); }
});
app.get('/api/v2/peer-validation/status', async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const [validation, collection] = await Promise.all([
      readPeerValidationStatus({ statePath: peerStatePath }),
      readDataCollectionStatus({ statePath: collectionStatePath }),
    ]);
    res.json({ success: true, ...validation, collection });
  }
  catch { res.status(503).json({ success: false, status: 'UNAVAILABLE', error: 'PEER_VALIDATION_UNAVAILABLE' }); }
});
// Local saved-evidence processing only: credentials and collection switches are unchanged.
const peerScheduler = process.env.KSTOCK_PEER_WORKER_ENABLED === 'true'
  ? startPeerValidationScheduler({ statePath: peerStatePath,
      externalCollectionEnabled:collectionEnabled,
      savedEvidenceTasks:[...(collectionEnabled?[{name:'OFFICIAL_COLLECTION',run:()=>officialCollection.run()}]:[]),{name:'INFLUENCE_VALIDATION',run:()=>researchAutomation.run()},{name:'OVERNIGHT_REPORT',run:()=>overnightResearch.run()}],
      reportPath: path.resolve(process.env.KSTOCK_V2_OUTPUT_PATH || path.join(projectDirectory, 'data/v2/reports/latest.json')),
      intervalMs: Number(process.env.KSTOCK_PEER_WORKER_INTERVAL_MS || 1800000) }) : null;
if (peerScheduler) (async () => {
  const collection = await readDataCollectionStatus({ statePath: collectionStatePath });
  if (!collection.jobs.length) await runDataCollectionWorker({ statePath: collectionStatePath, valuationDate: '2026-10-08', approved: false });
  await peerScheduler.tick();
})().catch(() => console.error('peer_validation_start_failed'));
const benchmarkService=createBenchmarkService({filename:path.join(projectDirectory,'data/v2/benchmarks/latest.json')});
registerBenchmarkRoutes(app,benchmarkService);
registerStockPerformanceRoutes(app,createStockPerformanceService({loadCandidates:()=>candidateService.load(),loadBenchmarks:()=>benchmarkService.load()}));
registerPaperPerformanceRoutes(app,createPaperPerformanceService({loadCandidates:()=>candidateService.load(),loadBenchmarks:()=>benchmarkService.load()}));
registerPerformanceRoutes(app, createPerformanceReportService({ directory: path.join(projectDirectory, 'data/v2/performance') }));

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
