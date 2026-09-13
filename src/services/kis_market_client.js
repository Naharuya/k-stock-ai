export function createKisMarketClient({ request, liveTradingEnabled = false }) {
  if (typeof request !== 'function') {
    throw new TypeError('KIS request function is required');
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
      price: Number(response.output?.stck_prpr),
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
      items: Array.isArray(response.output2) ? response.output2 : [],
    };
  }

  function placeOrder() {
    throw new Error('Order operations are disabled in safe validation');
  }

  return { getQuote, getDailyPrices, placeOrder };
}
