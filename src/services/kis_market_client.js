function toNumber(value) {
  if (typeof value === 'string') return Number(value.replaceAll(',', '').trim());
  return Number(value);
}

export function createKisMarketClient({ request, liveTradingEnabled = false, now = () => Date.now() }) {
  if (typeof request !== 'function') {
    throw new TypeError('KIS request function is required');
  }
  if (typeof now !== 'function') {
    throw new TypeError('now function is required');
  }
  if (liveTradingEnabled) {
    throw new Error('Live trading must remain disabled for this client');
  }

  async function getQuote({ symbol }) {
    if (!symbol) throw new Error('symbol is required');

    const response = await request({
      service: 'kis',
      operation: 'quote',
      symbol,
    });

    if (!response || typeof response !== 'object') {
      throw new Error('Invalid KIS response');
    }
    if (response.rt_cd && response.rt_cd !== '0') {
      throw new Error(`KIS error: ${response.msg_cd ?? response.rt_cd}`);
    }

    return {
      symbol,
      price: toNumber(response.output?.stck_prpr),
      timestamp: new Date(now()).toISOString(),
      raw: response.output ?? {},
    };
  }

  async function getDailyPrices({ symbol, from, to }) {
    if (!symbol) throw new Error('symbol is required');

    const response = await request({
      service: 'kis',
      operation: 'daily-prices',
      symbol,
      params: { from, to },
    });

    if (!response || typeof response !== 'object') {
      throw new Error('Invalid KIS response');
    }
    if (response.rt_cd && response.rt_cd !== '0') {
      throw new Error(`KIS error: ${response.msg_cd ?? response.rt_cd}`);
    }

    return {
      symbol,
      priceContract: {verified:true,operation:'daily-prices',adjustmentParameter:'0',basis:'RAW',sourceUrl:'https://github.com/koreainvestment/open-trading-api/blob/main/examples_llm/domestic_stock/inquire_daily_price/inquire_daily_price.py', limitation:'NO_DIVIDEND_REINVESTMENT_OR_ACTION_COVERAGE'},
      items: Array.isArray(response.output2) ? response.output2 : Array.isArray(response.output) ? response.output : [],
    };
  }

  function placeOrder() {
    throw new Error('Order operations are disabled in safe validation');
  }

  return { getQuote, getDailyPrices, placeOrder };
}
