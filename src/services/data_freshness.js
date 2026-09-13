function parseTimestamp(value, label) {
  if (value == null || value === '') throw new Error(`${label} timestamp is required`);
  const ms = typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(ms)) throw new Error(`${label} timestamp is invalid`);
  return ms;
}

export function validateFreshness({ quoteTimestamp, financialTimestamp, now = Date.now(), maxQuoteAgeMs = 15 * 60 * 1000, maxFinancialAgeMs = 550 * 24 * 60 * 60 * 1000, maxSkewMs = 550 * 24 * 60 * 60 * 1000 }) {
  const quoteMs = parseTimestamp(quoteTimestamp, 'quote');
  const financialMs = parseTimestamp(financialTimestamp, 'financial');
  const nowMs = typeof now === 'function' ? now() : now;
  if (!Number.isFinite(nowMs)) throw new Error('now timestamp is invalid');

  if (quoteMs > nowMs + 60_000) throw new Error('quote timestamp is in the future');
  if (financialMs > nowMs + 60_000) throw new Error('financial timestamp is in the future');

  const quoteAgeMs = nowMs - quoteMs;
  const financialAgeMs = nowMs - financialMs;
  const skewMs = Math.abs(quoteMs - financialMs);

  if (quoteAgeMs > maxQuoteAgeMs) throw new Error('quote data is stale');
  if (financialAgeMs > maxFinancialAgeMs) throw new Error('financial data is stale');
  if (skewMs > maxSkewMs) throw new Error('data timestamps are too far apart');

  return { quoteAgeMs, financialAgeMs, skewMs };
}

export function deriveQuoteTimestamp(quote) {
  const raw = quote?.raw ?? {};
  return raw.timestamp ?? raw.as_of ?? raw.stck_bsop_date ?? quote?.timestamp;
}

export function deriveFinancialTimestamp(financials) {
  const first = financials?.items?.[0] ?? {};
  return first.rcept_dt ?? first.bsns_year ?? financials?.timestamp;
}
