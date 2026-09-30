import { createKisMarketClient } from './kis_market_client.js';
import { createKisRequest } from './kis_request.js';
import { createOpenDartClient } from './opendart_client.js';
import { createOpenDartRequest } from './opendart_request.js';
import { createOpenDartCorpCodeResolver } from './opendart_corp_code_resolver.js';
import { createSafeRetry, isRetryableKisError, isRetryableOpenDartError } from './safe_retry.js';
import { validateSnapshot } from './data_quality.js';
import { validateFreshness, deriveQuoteTimestamp, deriveFinancialTimestamp } from './data_freshness.js';

export function createSafeDataPipeline({ kisRequest, dartRequest, corpCodeResolver, sleep = async () => {}, liveTradingEnabled = false, now = () => Date.now(), freshness = {} }) {
  const configuredKisRequest = kisRequest ?? (
    process.env.KSTOCK_KIS_ENABLED === 'true'
      ? createKisRequest()
      : async () => { throw new Error('KIS integration is disabled'); }
  );
  const kis = createKisMarketClient({ request: configuredKisRequest, liveTradingEnabled, now });
  const configuredDartRequest = dartRequest ?? (
    process.env.KSTOCK_DART_ENABLED === 'true'
      ? createOpenDartRequest()
      : async () => { throw new Error('OpenDART integration is disabled'); }
  );
  const corpCodeLookup = corpCodeResolver ?? (
    process.env.KSTOCK_DART_ENABLED === 'true'
      ? createOpenDartCorpCodeResolver()
      : undefined
  );
  const dart = createOpenDartClient({ request: configuredDartRequest });
  const retry = createSafeRetry({ sleep, maxAttempts: 3, baseDelayMs: 100 });

  async function loadSnapshot({ symbol, corpCode, year, disclosureBeginDate, disclosureEndDate }) {
    if (!symbol || !year || (!corpCode && !corpCodeLookup)) {
      throw new Error('symbol, corpCode and year are required');
    }
    const resolvedCorpCode = corpCode ?? await retry.run(
      () => corpCodeLookup.resolve(symbol),
      { shouldRetry: isRetryableOpenDartError },
    );

    const [quote, financials, disclosures] = await Promise.all([
      retry.run(
        () => kis.getQuote({ symbol }),
        { shouldRetry: isRetryableKisError },
      ),
      retry.run(
        () => dart.getFinancials({ corpCode: resolvedCorpCode, year }),
        { shouldRetry: isRetryableOpenDartError },
      ),
      retry.run(
        () => dart.getDisclosures({
          corpCode: resolvedCorpCode,
          beginDate: disclosureBeginDate ?? `${year}0101`,
          endDate: disclosureEndDate ?? new Date().toISOString().slice(0, 10).replaceAll('-', ''),
        }),
        { shouldRetry: isRetryableOpenDartError },
      ),
    ]);

    const validated = validateSnapshot({
      symbol,
      corpCode: resolvedCorpCode,
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

    return { ...validated, disclosures, freshness: freshnessResult };
  }

  return { loadSnapshot };
}
