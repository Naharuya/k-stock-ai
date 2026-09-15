import { analyzeDartStock } from "./dart_analysis_service.js";
import {
  getDomesticQuote,
  getDomesticDailyChart,
  getDomesticInvestorFlow
} from "./kis_service.js";
import { buildTechnicalMetrics } from "./technical_metrics_service.js";
import { scoreValuation, scoreTechnical } from "./market_score_service.js";
import { buildFlowMetrics, scoreFlow } from "./flow_analysis_service.js";
import { analyzeMarketContext } from "./market_context_service.js";
import { getCompanyNews } from "./news_service.js";
import { analyzeNewsItems } from "./news_analysis_service.js";
import { buildInvestmentCommittee } from "./investment_committee_service.js";
import { buildInvestmentIndicators } from "./investment_indicators_service.js";
import { buildResearchProfile } from "./research_profile_service.js";

async function loadKisMarketData(stockCode, { prefetchedQuote = null, sharedMarketContext = null } = {}) {
  // KIS API 호출은 rate limit을 고려해 직렬 실행한다. 후보 엔진은 quote/시장환경을 재사용해 중복 호출을 줄인다.
  const quote = prefetchedQuote || await getDomesticQuote(stockCode);
  const chart = await getDomesticDailyChart({ stockCode, minRows: 130, maxPages: 3 });
  const flow = await getDomesticInvestorFlow(stockCode);
  const marketContext = sharedMarketContext || await analyzeMarketContext();
  return { quote, chart, flow, marketContext };
}

export async function analyzeStockWithMarketData({ stockCode, businessYear, prefetchedQuote = null, sharedMarketContext = null }) {
  const [dart, market] = await Promise.all([
    analyzeDartStock({
      stockCode,
      businessYear,
      reportCode: "11011",
      latest: true,
      fsDiv: "CFS",
      disclosureLookbackDays: 180
    }),
    loadKisMarketData(stockCode, { prefetchedQuote, sharedMarketContext })
  ]);

  const { quote, chart, flow, marketContext } = market;
  const technicalMetrics = buildTechnicalMetrics(chart);
  const flowMetrics = buildFlowMetrics(flow);
  const valuation = scoreValuation(quote);
  const technical = scoreTechnical(technicalMetrics);
  const flowScore = scoreFlow(flowMetrics);
  const marketScore = marketContext.score;
  const indicators = buildInvestmentIndicators({
    quote,
    financials: dart.financials,
    technicalMetrics
  });

  let news = null;
  let newsScore = {
    status: "DISABLED",
    score: null,
    max: 20,
    sentiment: "UNKNOWN",
    notes: ["KSTOCK_NEWS_ENABLED=false"],
    caveat: "뉴스 분석 비활성"
  };

  if (process.env.KSTOCK_NEWS_ENABLED === "true") {
    try {
      news = await getCompanyNews({
        corpName: dart.company.corpName,
        stockCode,
        lookbackDays: Number(process.env.KSTOCK_NEWS_LOOKBACK_DAYS || 7),
        maxItems: Number(process.env.KSTOCK_NEWS_MAX_ITEMS || 30)
      });
      newsScore = analyzeNewsItems(news);
    } catch (error) {
      newsScore = {
        status: "ERROR",
        score: null,
        max: 20,
        sentiment: "UNKNOWN",
        notes: [error.message],
        caveat: "뉴스 수집 실패 시 최종 투자판정은 보류"
      };
    }
  }

  const dartBase = dart.scorecard.score ?? 0;
  const marketReady = marketScore.status === "READY" && Number.isFinite(marketScore.score);
  const newsReady = newsScore.status === "READY" && Number.isFinite(newsScore.score);

  const expandedScore = dartBase + valuation.score + technical.score + flowScore.score
    + (marketReady ? marketScore.score : 0)
    + (newsReady ? newsScore.score : 0);
  const expandedMax = 140 + (marketReady ? 20 : 0) + (newsReady ? 20 : 0);

  let completeness;
  if (marketReady && newsReady) {
    completeness = {
      completed: ["financials", "disclosures", "risk", "valuation", "technical", "price", "flow", "market", "news"],
      pending: [],
      percent: 100
    };
  } else if (marketReady) {
    completeness = {
      completed: ["financials", "disclosures", "risk", "valuation", "technical", "price", "flow", "market"],
      pending: ["news"],
      percent: 95
    };
  } else {
    completeness = {
      completed: ["financials", "disclosures", "risk", "valuation", "technical", "price", "flow"],
      pending: ["market", "news"],
      percent: 85
    };
  }

  const committee = buildInvestmentCommittee({
    dart,
    valuation,
    technical,
    flow: flowScore,
    market: marketScore,
    news: newsScore,
    completeness
  });

  const researchProfile = buildResearchProfile({
    indicators,
    committee,
    technical: technicalMetrics,
    flow: flowMetrics,
    market: marketScore,
    news: newsScore,
    dart
  });

  return {
    source: newsReady ? ["OpenDART", "KIS", "Google News RSS"] : ["OpenDART", "KIS"],
    stockCode,
    corpName: dart.company.corpName,
    dart,
    analyzedAt: new Date().toISOString(),
    marketData: {
      quote,
      chartRows: chart.rows.length,
      chart: { source: chart.source, rows: chart.rows },
      technicalMetrics,
      flowRows: flow.rows.length,
      flowMetrics,
      flowCaveat: flow.caveat,
      marketContext
    },
    indicators,
    newsData: news ? {
      source: news.source,
      rows: news.rows,
      lookbackDays: news.lookbackDays,
      items: news.items,
      caveat: news.caveat
    } : null,
    scores: {
      dartFundamental: { score: dartBase, max: dart.scorecard.maxScore },
      valuation,
      technical,
      flow: flowScore,
      market: marketScore,
      news: newsScore,
      expandedPartial: {
        score: expandedScore,
        max: expandedMax,
        normalizedTo100: Math.round((expandedScore / expandedMax) * 100)
      }
    },
    completeness,
    readiness: {
      readyForInvestmentDecision: completeness.percent === 100 && committee.status !== "DATA_INCOMPLETE",
      label: completeness.percent === 100 ? "v2.0 리서치 분석 완료" : "부분 분석",
      reason: completeness.percent === 100
        ? "핵심 데이터와 Investment Committee 통합 완료. 결과는 연구·의사결정 지원용이며 자동매매 신호가 아님"
        : "일부 핵심 데이터가 미완성"
    },
    committee,
    researchProfile
  };
}
