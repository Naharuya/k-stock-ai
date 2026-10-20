import { calculateTtm, deriveQuarterTtm } from './accounting_periods.js';
import { validateCorporateActions } from './corporate_actions.js';
import { createKisMarketClient } from '../services/kis_market_client.js';
import { saveCandidateSnapshot } from './performance_tracking.js';
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { createKisRequest } from '../services/kis_request.js';
import { createOpenDartRequest } from '../services/opendart_request.js';
import { createOpenDartClient } from '../services/opendart_client.js';
import { assertSafeKStockV2Environment } from './scoring.js';
import { normalizeKisQuote, normalizeDartFinancials, normalizeKisDaily } from './kr_valuation.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
export async function collectKrData(input, { env = process.env, kisRequest, dartClient, now = () => new Date() } = {}) {
  assertSafeKStockV2Environment(env);
  const companies = input.companies.filter(x => x.market === 'KR');
  if (companies.length > 3 || companies.some(x => !/^\d{6}$/.test(x.ticker) || !/^\d{8}$/.test(x.corpCode || ''))) throw new Error('KR_SCOPE_INVALID');
  const configured = Boolean(env.KIS_APP_KEY && env.KIS_APP_SECRET && env.OPENDART_API_KEY);
  if (!configured && (!kisRequest || !dartClient)) return { status: 'BLOCKED', reason: 'KR_CREDENTIALS_MISSING', companies: [] };
  const kis = kisRequest || createKisRequest({ appKey: env.KIS_APP_KEY, appSecret: env.KIS_APP_SECRET, environment: env.KIS_ENV || 'paper' });
  const dart = dartClient || createOpenDartClient({ request: createOpenDartRequest({ apiKey: env.OPENDART_API_KEY }) });
  const market = createKisMarketClient({ request: kis, liveTradingEnabled: false });
  const collectedAt = now().toISOString(), year = String(new Date(input.analysisDate).getUTCFullYear() - 1), result = [];
  for (const company of companies) {
    const quote = await kis({ service: 'kis', operation: 'quote', symbol: company.ticker });
    const daily = await market.getDailyPrices({ symbol: company.ticker });
    const financials = await dart.getFinancials({ corpCode: company.corpCode, year });
    const disclosures = await dart.getDisclosures({ corpCode: company.corpCode, beginDate: `${Number(year)+1}0101`, endDate: `${Number(year)+1}0430`, maxPages: 1 });
    const periods=typeof dart.getFinancialPeriods==='function' ? await dart.getFinancialPeriods({corpCode:company.corpCode,year}) : {items:[]};
    const financial=normalizeDartFinancials(financials.items,company,{year,periodItems:periods.items,disclosures:disclosures.items,collectedAt,analysisDate:input.analysisDate});
    const frames=[financial];
    if(typeof dart.getFinancialPeriods==='function'){
      const thisYear=String(new Date(input.analysisDate).getUTCFullYear()), month=new Date(input.analysisDate).getUTCMonth()+1;
      const code=month>=12?'11014':month>=9?'11012':month>=6?'11013':null;
      if(code)for(const frameYear of [year,thisYear]){
        const rows=await dart.getFinancials({corpCode:company.corpCode,year:frameYear,reportCode:code});
        const dates=await dart.getFinancialPeriods({corpCode:company.corpCode,year:frameYear,reportCode:code});
        const pub=await dart.getDisclosures({corpCode:company.corpCode,beginDate:`${frameYear}${code==='11013'?'05':code==='11012'?'08':'11'}01`,endDate:`${frameYear}${code==='11013'?'06':code==='11012'?'09':'12'}01`,maxPages:1});
        frames.push(normalizeDartFinancials(rows.items,company,{year:frameYear,reportCode:code,periodItems:dates.items,disclosures:pub.items,collectedAt,analysisDate:input.analysisDate}));
      }
    }
    if(typeof dart.getFinancialPeriods==='function' && new Date(input.analysisDate).getUTCMonth()+1>=9){
      for(const [frameYear,reportCode,beginMonth,endMonth] of [[year,'11014','11','12'],[String(Number(year)+1),'11013','05','06']]){
        const rows=await dart.getFinancials({corpCode:company.corpCode,year:frameYear,reportCode});
        const dates=await dart.getFinancialPeriods({corpCode:company.corpCode,year:frameYear,reportCode});
        const pub=await dart.getDisclosures({corpCode:company.corpCode,beginDate:`${frameYear}${beginMonth}01`,endDate:`${frameYear}${endMonth}01`,maxPages:1});
        frames.push(normalizeDartFinancials(rows.items,company,{year:frameYear,reportCode,periodItems:dates.items,disclosures:pub.items,collectedAt,analysisDate:input.analysisDate}));
      }
    }
    const priceHistory=normalizeKisDaily(daily.items,collectedAt,input.analysisDate,daily.priceContract);
    const actions=validateCorporateActions({fromDate:priceHistory.sessions[0]?.date,toDate:priceHistory.asOfDate,priceBasis:priceHistory.basis,priceDate:priceHistory.asOfDate,shareDate:null,shares:null});
    const observed=priceHistory.sessions.at(-1);
    result.push({ ...company, priceSnapshot:observed?{status:'READY',source:'KIS',currency:'KRW',close:observed.close,sessionDate:observed.date,basis:priceHistory.basis,qualityStatus:priceHistory.qualityStatus,warning:'OBSERVED_PRICE_NOT_VERIFIED_RETURN'}:null, krSnapshot: { accountingFrames:frames,ttm:{...calculateTtm(frames,input.analysisDate),quarterVerification:deriveQuarterTtm(frames,input.analysisDate)},corporateActions:actions, priceHistory: normalizeKisDaily(daily.items, collectedAt, input.analysisDate,daily.priceContract), price: normalizeKisQuote(quote, company, collectedAt),
      financial } });
  }
  return { status: result.length ? 'UNDER_REVIEW' : 'BLOCKED', reason: result.length ? 'SOURCE_PERIOD_VALIDATION_REQUIRED' : 'KR_COMPANIES_MISSING', companies: result };
}
export function createKrRefresh(options = {}) {
  const env = options.env || process.env;
  return async input => {
    if (env.KSTOCK_V2_KR_ENABLED !== 'true') return input;
    const report = await collectKrData(input, options);
    const records = new Map(report.companies.map(x => [x.ticker, x]));
    return { ...input, krCollection: { status: report.status, reason: report.reason },
      companies: input.companies.map(x => records.get(x.ticker) || x) };
  };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 4 || process.argv[2] !== '--read-only') throw new Error('KR_READ_ONLY_MODE_REQUIRED');
    const input = JSON.parse(await readFile(process.argv[3], 'utf8'));
    const report = await collectKrData(input);
    if (report.companies.length) await saveCandidateSnapshot({ analysisDate: input.analysisDate, candidates: report.companies }, path.resolve('data/v2/kr-collections'));
    console.log(JSON.stringify({ status: report.status, reason: report.reason, count: report.companies.length }));
  } catch { console.error(JSON.stringify({ status: 'FAILED', reason: 'KR_COLLECTION_FAILED' })); process.exitCode = 1; }
}
