import { createKisTokenManager } from './kis_token_manager.js';

const BASE_URLS = {
  paper: 'https://openapivts.koreainvestment.com:29443',
  production: 'https://openapi.koreainvestment.com:9443',
};

const OPERATIONS = {
  quote: {
    path: '/uapi/domestic-stock/v1/quotations/inquire-price',
    transactionId: 'FHKST01010100',
  },
  'daily-prices': {
    path: '/uapi/domestic-stock/v1/quotations/inquire-daily-price',
    transactionId: 'FHKST01010400',
  },
};

function createRequestError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function createKisRequest({
  appKey = process.env.KIS_APP_KEY,
  appSecret = process.env.KIS_APP_SECRET,
  environment = process.env.KIS_ENV || 'paper',
  baseUrl = BASE_URLS[environment],
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
  timeoutMs = 10_000,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetch implementation is required');
  if (!baseUrl) throw new Error('KIS_ENV must be paper or production');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
    throw new TypeError('timeoutMs must be a positive integer');
  }

  async function fetchJson(url, options) {
    let response;
    try {
      response = await fetchImpl(url, {
        ...options,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
        throw createRequestError('KIS request timed out', 'TIMEOUT');
      }
      throw createRequestError('KIS request failed', 'NETWORK_ERROR');
    }

    if (response.status === 429) throw createRequestError('KIS rate limit exceeded', 'RATE_LIMIT');
    if (!response.ok) {
      throw createRequestError(`KIS HTTP error: ${response.status}`, `HTTP_${response.status}`);
    }
    try {
      return await response.json();
    } catch {
      throw createRequestError('Invalid KIS response', 'INVALID_RESPONSE');
    }
  }

  const tokenManager = createKisTokenManager({
    now,
    requestToken: async () => {
      if (!appKey || !appSecret) {
        throw new Error('KIS_APP_KEY and KIS_APP_SECRET are required.');
      }
      return fetchJson(new URL('/oauth2/tokenP', baseUrl), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          appkey: appKey,
          appsecret: appSecret,
        }),
      });
    },
  });

  return async function request({ service, operation, symbol, params = {} }) {
    if (service !== 'kis' || !OPERATIONS[operation]) {
      throw new Error('Unsupported KIS operation');
    }
    if (!appKey || !appSecret) {
      throw new Error('KIS_APP_KEY and KIS_APP_SECRET are required.');
    }
    if (typeof symbol !== 'string' || !/^\d{6}$/.test(symbol)) {
      throw new Error('A six-digit KIS stock code is required');
    }

    const token = await tokenManager.getToken();
    const definition = OPERATIONS[operation];
    const url = new URL(definition.path, baseUrl);
    url.searchParams.set('FID_COND_MRKT_DIV_CODE', 'J');
    url.searchParams.set('FID_INPUT_ISCD', symbol);

    if (operation === 'daily-prices') {
      url.searchParams.set('FID_PERIOD_DIV_CODE', 'D');
      url.searchParams.set('FID_ORG_ADJ_PRC', '0');
      if (params.from) url.searchParams.set('FID_INPUT_DATE_1', params.from);
      if (params.to) url.searchParams.set('FID_INPUT_DATE_2', params.to);
    }

    return fetchJson(url, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${token}`,
        appkey: appKey,
        appsecret: appSecret,
        tr_id: definition.transactionId,
        custtype: 'P',
      },
    });
  };
}