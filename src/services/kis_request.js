import { createKisTokenManager } from './kis_token_manager.js';

const BASE_URLS = {
  paper: 'https://openapivts.koreainvestment.com:29443',
  production: 'https://openapi.koreainvestment.com:9443',
};

const OPERATIONS = {
  'decision-kr-activity':{path:'/uapi/domestic-stock/v1/quotations/volume-rank',transactionId:'FHPST01710000'},
  'decision-us-turnover':{path:'/uapi/overseas-stock/v1/ranking/trade-pbmn',transactionId:'HHDFS76320010'},
  'decision-us-growth':{path:'/uapi/overseas-stock/v1/ranking/volume-surge',transactionId:'HHDFS76270000'},
  'decision-kr-movers':{path:'/uapi/domestic-stock/v1/ranking/fluctuation',transactionId:'FHPST01700000'},
  'decision-us-movers':{path:'/uapi/overseas-stock/v1/ranking/updown-rate',transactionId:'HHDFS76290000'},
  'decision-daily-prices': {path:'/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice',transactionId:'FHKST03010100'},
  'decision-us-daily-prices': {path:'/uapi/overseas-price/v1/quotations/dailyprice',transactionId:'HHDFS76240000'},
  'nonapple-daily-prices': {path:'/uapi/overseas-price/v1/quotations/dailyprice',transactionId:'HHDFS76240000'},
  'us-daily-prices': {path:'/uapi/overseas-price/v1/quotations/dailyprice',transactionId:'HHDFS76240000'},
  'index-daily': {path:'/uapi/domestic-stock/v1/quotations/inquire-daily-indexchartprice',transactionId:'FHKUP03500100'},
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
        redirect: 'error',
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
    if (typeof symbol !== 'string' || (['decision-kr-movers','decision-us-movers','decision-kr-activity','decision-us-turnover','decision-us-growth'].includes(operation) ? symbol!=='MARKET' : operation === 'decision-daily-prices' ? !/^[0-9][A-Z0-9]{5}$/.test(symbol) : operation === 'decision-us-daily-prices' ? !/^[A-Z][A-Z0-9.]{0,9}$/.test(symbol) : operation === 'nonapple-daily-prices' ? symbol!=='MSFT' : operation === 'us-daily-prices' ? symbol!=='AAPL' : operation === 'index-daily' ? !['0001','1001'].includes(symbol) : !/^\d{6}$/.test(symbol))) {
      throw new Error('A six-digit KIS stock code is required');
    }

    const definition = OPERATIONS[operation];
    const url = new URL(definition.path, baseUrl);
    if(['decision-kr-activity','decision-us-turnover','decision-us-growth'].includes(operation)){
      if(!['TURNOVER','VOLUME_GROWTH'].includes(params.kind))throw createRequestError('Activity kind invalid','ACTIVITY_SCOPE_INVALID');
      let query;
      if(operation==='decision-kr-activity')query={FID_COND_MRKT_DIV_CODE:'J',FID_COND_SCR_DIV_CODE:'20171',FID_INPUT_ISCD:'0000',FID_DIV_CLS_CODE:'1',FID_BLNG_CLS_CODE:params.kind==='TURNOVER'?'3':'1',FID_TRGT_CLS_CODE:'111111111',FID_TRGT_EXLS_CLS_CODE:'000000',FID_INPUT_PRICE_1:'',FID_INPUT_PRICE_2:'',FID_VOL_CNT:'',FID_INPUT_DATE_1:''};
      else {if(!['NAS','NYS','AMS'].includes(params.exchange)||params.kind!==(operation==='decision-us-turnover'?'TURNOVER':'VOLUME_GROWTH'))throw createRequestError('Activity exchange invalid','ACTIVITY_SCOPE_INVALID');query={EXCD:params.exchange,VOL_RANG:'0',AUTH:'',KEYB:'',...(operation==='decision-us-turnover'?{NDAY:'0',PRC1:'',PRC2:''}:{MINX:'5'})};}
      for(const [k,v]of Object.entries(query))url.searchParams.set(k,v);
    }else if(['decision-kr-movers','decision-us-movers'].includes(operation)){
      if(!['UP','DOWN'].includes(params.direction))throw createRequestError('Mover direction invalid','MOVERS_SCOPE_INVALID');
      if(operation==='decision-us-movers'){
        if(!['NAS','NYS','AMS'].includes(params.exchange))throw createRequestError('Mover exchange invalid','MOVERS_SCOPE_INVALID');
        for(const [k,v]of Object.entries({EXCD:params.exchange,NDAY:'0',GUBN:params.direction==='UP'?'1':'0',VOL_RANG:'0',AUTH:'',KEYB:''}))url.searchParams.set(k,v);
      }else{
        for(const [k,v]of Object.entries({FID_COND_MRKT_DIV_CODE:'J',FID_COND_SCR_DIV_CODE:'20170',FID_INPUT_ISCD:'0000',FID_RANK_SORT_CLS_CODE:params.direction==='UP'?'0':'1',FID_INPUT_CNT_1:'0',FID_PRC_CLS_CODE:'0',FID_INPUT_PRICE_1:'',FID_INPUT_PRICE_2:'',FID_VOL_CNT:'',FID_TRGT_CLS_CODE:'0',FID_TRGT_EXLS_CLS_CODE:'0',FID_DIV_CLS_CODE:'0',FID_RSFL_RATE1:'',FID_RSFL_RATE2:''}))url.searchParams.set(k,v);
      }
    }else if(operation==='decision-us-daily-prices'||operation==='decision-daily-prices') {
      const valid=d=>typeof d==='string'&&/^\d{8}$/.test(d)&&Number.isFinite(Date.parse(`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`))&&new Date(`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`).toISOString().slice(0,10).replaceAll('-','')===d;
      const today=new Date(now()).toISOString().slice(0,10).replaceAll('-','');
      if(!valid(params.from)||!valid(params.to)||params.from>params.to||params.to>today||Date.parse(`${params.to.slice(0,4)}-${params.to.slice(4,6)}-${params.to.slice(6,8)}`)-Date.parse(`${params.from.slice(0,4)}-${params.from.slice(4,6)}-${params.from.slice(6,8)}`)>200*86400000)throw createRequestError('Decision date scope invalid','DATE_SCOPE_INVALID');
      if(operation==='decision-us-daily-prices') {
        if(!['NAS','NYS','AMS'].includes(params.exchange))throw createRequestError('Decision exchange invalid','EXCHANGE_INVALID');
        for(const [k,v]of Object.entries({AUTH:'',EXCD:params.exchange,SYMB:symbol,GUBN:'0',BYMD:params.to,MODP:'1'}))url.searchParams.set(k,v);
      }else{
        for(const [k,v]of Object.entries({FID_COND_MRKT_DIV_CODE:'J',FID_INPUT_ISCD:symbol,FID_INPUT_DATE_1:params.from,FID_INPUT_DATE_2:params.to,FID_PERIOD_DIV_CODE:'D',FID_ORG_ADJ_PRC:'0'}))url.searchParams.set(k,v);
      }
    }else if(operation==='us-daily-prices'||operation==='nonapple-daily-prices') {
      const d=params.to;
      if(typeof d!=='string'||!/^2025\d{4}$/.test(d)||!Number.isFinite(Date.parse(`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`))||new Date(`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`).toISOString().slice(0,10).replaceAll('-','')!==d)throw new Error('US_PRICE_DATE_SCOPE_INVALID');
      for(const [k,v]of Object.entries({AUTH:'',EXCD:'NAS',SYMB:symbol,GUBN:'0',BYMD:d,MODP:'0'}))url.searchParams.set(k,v);
    }else {
      url.searchParams.set('FID_COND_MRKT_DIV_CODE', operation === 'index-daily' ? 'U' : 'J');
      url.searchParams.set('FID_INPUT_ISCD', symbol);
    }

    if (operation === 'index-daily') {
      const valid=d=>typeof d==='string'&&/^\d{8}$/.test(d)&&new Date(`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`).toISOString().slice(0,10).replaceAll('-','')===d;
      if(!valid(params.from)||!valid(params.to)||params.from>params.to||Date.parse(`${params.to.slice(0,4)}-${params.to.slice(4,6)}-${params.to.slice(6,8)}`)-Date.parse(`${params.from.slice(0,4)}-${params.from.slice(4,6)}-${params.from.slice(6,8)}`)>100*86400000)throw new Error('INDEX_DATE_SCOPE_INVALID');
      url.searchParams.set('FID_INPUT_DATE_1',params.from);url.searchParams.set('FID_INPUT_DATE_2',params.to);url.searchParams.set('FID_PERIOD_DIV_CODE','D');
    }
    if (operation === 'daily-prices') {
      url.searchParams.set('FID_PERIOD_DIV_CODE', 'D');
      url.searchParams.set('FID_ORG_ADJ_PRC', '0');
      if (params.from) url.searchParams.set('FID_INPUT_DATE_1', params.from);
      if (params.to) url.searchParams.set('FID_INPUT_DATE_2', params.to);
    }

    const token = await tokenManager.getToken();
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
