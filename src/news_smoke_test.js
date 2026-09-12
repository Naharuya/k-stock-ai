import "dotenv/config";
import { getCompanyByStockCode } from "./services/dart_service.js";
import { getCompanyNews } from "./services/news_service.js";
import { analyzeNewsItems } from "./services/news_analysis_service.js";

try {
  const stockCode = "005930";
  const company = await getCompanyByStockCode(stockCode);
  const corpName = company?.corp_name || company?.corpName || "삼성전자";
  const news = await getCompanyNews({
    corpName,
    stockCode,
    lookbackDays: Number(process.env.KSTOCK_NEWS_LOOKBACK_DAYS || 7),
    maxItems: Number(process.env.KSTOCK_NEWS_MAX_ITEMS || 30)
  });
  const score = analyzeNewsItems(news);

  console.log(JSON.stringify({
    ok: true,
    source: news.source,
    stockCode,
    corpName: news.corpName,
    rows: news.rows,
    lookbackDays: news.lookbackDays,
    score,
    sample: news.items.slice(0, 5)
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, message: error.message }, null, 2));
  process.exitCode = 1;
}
