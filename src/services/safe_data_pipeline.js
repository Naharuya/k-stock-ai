import { createKisMarketClient } from './kis_market_client.js';
import { createOpenDartClient } from './opendart_client.js';
import { createSafeRetry, isRetryableOpenDartError } from './safe_retry.js';
import { validateSnapshot } from './data_quality.js';

export function createSafeDataPipeline({ kisRequest, dartRequest, sleep = async () => {}, liveTradingEnabled = false }) {
  const kis = createKisMarketClient({ request: kisRequest, liveTradingEnabled });
  const dart = createOpenDartClient({ request: dartRequest });
  const retry = createSafeRetry({ sleep, maxAttempts: 3, baseDelayMs: 100 });

  async function loadSnapshot({ symbol, corpCode, year }) {
    if (!symbol || !corpCode || !year) {
      throw new Error('symbol, corpCode and year are required');
    }

    const [quote, financials] = await Promise.all([
      kis.getQuote({ symbol }),
      retry.run(
        () => dart.getFinancials({ corpCode, year }),
        { shouldRetry: isRetryableOpenDartError },
      ),
    ]);

    return validateSnapshot({
      symbol,
      corpCode,
      quote,
      financials,
      liveTradingEnabled: false,
    });
  }

  return { loadSnapshot };
}
