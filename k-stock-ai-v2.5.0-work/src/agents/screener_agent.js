export function quantitativeScreen(stocks = []) {
  return stocks
    .filter((stock) => Number(stock.marketCap || 0) >= 300_000_000_000)
    .filter((stock) => Number(stock.operatingProfit || 0) > 0)
    .filter((stock) => Number(stock.revenueGrowth || 0) > 0)
    .filter((stock) => Number(stock.avgTradingValue20d || 0) >= 1_000_000_000)
    .filter((stock) => !stock.isManagementIssue)
    .filter((stock) => !stock.isTradingSuspended)
    .sort((a, b) => Number(b.preScore || 0) - Number(a.preScore || 0))
    .slice(0, 30);
}
