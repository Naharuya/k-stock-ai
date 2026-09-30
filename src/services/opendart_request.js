const ENDPOINTS = {
  financials: 'fnlttSinglAcntAll.json',
  disclosures: 'list.json',
};

function createRequestError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function createOpenDartRequest({
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

  return async function request({ service, operation, params = {} }) {
    if (service !== 'opendart' || !ENDPOINTS[operation]) {
      throw new Error('Unsupported OpenDART operation');
    }
    if (!apiKey) {
      throw new Error('OPENDART_API_KEY is missing.');
    }

    const url = new URL(ENDPOINTS[operation], `${baseUrl.replace(/\/+$/, '')}/`);
    url.searchParams.set('crtfc_key', apiKey);

    if (operation === 'financials') {
      url.searchParams.set('corp_code', params.corpCode);
      url.searchParams.set('bsns_year', params.year);
      url.searchParams.set('reprt_code', params.reportCode ?? '11011');
      url.searchParams.set('fs_div', params.fsDiv ?? 'CFS');
    } else {
      url.searchParams.set('corp_code', params.corpCode);
      if (params.beginDate) url.searchParams.set('bgn_de', params.beginDate);
      if (params.endDate) url.searchParams.set('end_de', params.endDate);
      if (params.pageNo != null) url.searchParams.set('page_no', params.pageNo);
      if (params.pageCount != null) url.searchParams.set('page_count', params.pageCount);
    }

    let response;
    try {
      response = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
    } catch (error) {
      if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
        throw createRequestError('OpenDART request timed out', 'TIMEOUT');
      }
      throw createRequestError('OpenDART request failed', 'NETWORK_ERROR');
    }

    if (response.status === 429) {
      throw createRequestError('OpenDART rate limit exceeded', 'RATE_LIMIT');
    }
    if (!response.ok) {
      throw createRequestError(`OpenDART HTTP error: ${response.status}`, `HTTP_${response.status}`);
    }

    try {
      return await response.json();
    } catch {
      throw createRequestError('Invalid OpenDART response', 'INVALID_RESPONSE');
    }
  };
}