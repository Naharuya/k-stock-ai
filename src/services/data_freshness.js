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
  if (raw.timestamp != null) return raw.timestamp;
  if (raw.as_of != null) return raw.as_of;

  const businessDate = String(raw.stck_bsop_date ?? '').trim();
  if (/^\d{8}$/.test(businessDate)) {
    const time = String(raw.stck_cntg_hour ?? '').trim();
    const clock = /^\d{6}$/.test(time) ? `${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}` : '00:00:00';
    return `${businessDate.slice(0, 4)}-${businessDate.slice(4, 6)}-${businessDate.slice(6, 8)}T${clock}+09:00`;
  }

  return quote?.timestamp;
}

export function deriveFinancialTimestamp(financials) {
  const first = financials?.items?.[0] ?? {};
  if (first.rcept_dt != null) {
    const receiptDate = String(first.rcept_dt).trim();
    if (/^\d{8}$/.test(receiptDate)) {
      return `${receiptDate.slice(0, 4)}-${receiptDate.slice(4, 6)}-${receiptDate.slice(6, 8)}T00:00:00Z`;
    }
    return first.rcept_dt;
  }
  if (financials?.timestamp != null) return financials.timestamp;

  const businessYear = String(first.bsns_year ?? '').trim();
  if (/^\d{4}$/.test(businessYear)) {
    return `${businessYear}-12-31T23:59:59.999Z`;
  }
  return undefined;
}
