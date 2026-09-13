import { createKisMarketClient } from './kis_market_client.js';
import { createOpenDartClient } from './opendart_client.js';
import { createSafeRetry, isRetryableOpenDartError } from './safe_retry.js';
import { validateSnapshot } from './data_quality.js';
import { validateFreshness, deriveQuoteTimestamp, deriveFinancialTimestamp } from './data_freshness.js';

export function createSafeDataPipeline({ kisRequest, dartRequest, sleep = async () => {}, liveTradingEnabled = false, now = () => Date.now(), freshness = {} }) {
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

    const validated = validateSnapshot({
      symbol,
      corpCode,
      quote,
      financials,
      liveTradingEnabled: false,
    });

    const freshnessResult = validateFreshness({
      quoteTimestamp: deriveQuoteTimestamp(validated.quote),
      financialTimestamp: deriveFinancialTimestamp(validated.financials),
      now,
      ...freshness,
    });

    return { ...validated, freshness: freshnessResult };
  }

  return { loadSnapshot };
}
