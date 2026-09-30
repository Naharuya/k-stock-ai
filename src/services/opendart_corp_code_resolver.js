import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';

function createResolverError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function createOpenDartCorpCodeResolver({
  apiKey = process.env.OPENDART_API_KEY,
  fetchImpl = globalThis.fetch,
  baseUrl = 'https://opendart.fss.or.kr/api',
  timeoutMs = 10_000,
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new TypeError('fetch implementation is required');
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
    throw new TypeError('timeoutMs must be a positive integer');
  }

  let mappingPromise;

  async function loadMapping() {
    if (!apiKey) throw new Error('OPENDART_API_KEY is missing.');

    const url = new URL('corpCode.xml', `${baseUrl.replace(/\/+$/, '')}/`);
    url.searchParams.set('crtfc_key', apiKey);

    let response;
    try {
      response = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
    } catch (error) {
      if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
        throw createResolverError('OpenDART corp-code request timed out', 'TIMEOUT');
      }
      throw createResolverError('OpenDART corp-code request failed', 'NETWORK_ERROR');
    }

    if (response.status === 429) {
      throw createResolverError('OpenDART rate limit exceeded', 'RATE_LIMIT');
    }
    if (!response.ok) {
      throw createResolverError(`OpenDART HTTP error: ${response.status}`, `HTTP_${response.status}`);
    }

    let records;
    try {
      const archive = new AdmZip(Buffer.from(await response.arrayBuffer()));
      const entry = archive.getEntry('CORPCODE.xml');
      if (!entry) throw new Error('archive entry missing');

      const parser = new XMLParser({ parseTagValue: false, trimValues: true });
      const result = parser.parse(entry.getData().toString('utf8'))?.result?.list;
      records = Array.isArray(result) ? result : result ? [result] : [];
    } catch {
      throw createResolverError('Invalid OpenDART corp-code archive', 'INVALID_RESPONSE');
    }

    const mapping = new Map();
    for (const record of records) {
      const stockCode = record.stock_code?.trim();
      const corpCode = record.corp_code?.trim();
      if (stockCode && corpCode && !mapping.has(stockCode)) {
        mapping.set(stockCode, corpCode);
      }
    }
    if (mapping.size === 0) {
      throw createResolverError('OpenDART corp-code archive has no listed companies', 'INVALID_RESPONSE');
    }

    return mapping;
  }

  async function resolve(stockCode) {
    if (typeof stockCode !== 'string' || !stockCode.trim()) {
      throw new Error('stockCode is required');
    }

    if (!mappingPromise) {
      mappingPromise = loadMapping().catch((error) => {
        mappingPromise = undefined;
        throw error;
      });
    }

    const mapping = await mappingPromise;
    const corpCode = mapping.get(stockCode.trim());
    if (!corpCode) throw new Error(`No OpenDART corp_code found for stock code ${stockCode.trim()}`);
    return corpCode;
  }

  return { resolve };
}