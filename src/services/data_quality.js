function toFiniteNumber(value, label, { min = 0, allowZero = true } = {}) {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value.replaceAll(',', '')) : Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`${label} must be a finite number`);
  }
  if (number < min || (!allowZero && number === 0)) {
    throw new Error(`${label} is out of allowed range`);
  }
  return number;
}

export function validateQuote(quote) {
  if (!quote || typeof quote !== 'object') throw new Error('quote is required');
  if (!quote.symbol) throw new Error('quote.symbol is required');

  const price = toFiniteNumber(quote.price, 'quote.price', { min: 0, allowZero: false });
  const rawVolume = quote.raw?.acml_vol;
  const volume = rawVolume == null ? null : toFiniteNumber(rawVolume, 'quote.volume', { min: 0, allowZero: true });

  return {
    ...quote,
    price,
    quality: {
      valid: true,
      volume,
    },
  };
}

export function validateFinancials(financials) {
  if (!financials || typeof financials !== 'object') throw new Error('financials are required');
  if (financials.status !== '000') throw new Error('financials.status must be 000');
  if (!Array.isArray(financials.items)) throw new Error('financials.items must be an array');

  const items = financials.items.map((item, index) => {
    if (!item || typeof item !== 'object') throw new Error(`financials.items[${index}] must be an object`);
    const accountName = item.account_nm ?? item.accountName;
    if (!accountName || typeof accountName !== 'string') {
      throw new Error(`financials.items[${index}].account name is required`);
    }

    const amountSource = item.thstrm_amount ?? item.amount ?? null;
    const amount = amountSource == null || amountSource === ''
      ? null
      : toFiniteNumber(amountSource, `financials.items[${index}].amount`, { min: Number.MIN_SAFE_INTEGER, allowZero: true });

    return {
      ...item,
      accountName,
      amount,
    };
  });

  return {
    ...financials,
    items,
    quality: {
      valid: true,
      itemCount: items.length,
    },
  };
}

export function validateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') throw new Error('snapshot is required');
  if (!snapshot.symbol || !snapshot.corpCode) throw new Error('snapshot identifiers are required');

  return {
    ...snapshot,
    quote: validateQuote(snapshot.quote),
    financials: validateFinancials(snapshot.financials),
    dataQuality: {
      valid: true,
    },
  };
}
