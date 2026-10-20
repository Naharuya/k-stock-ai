import {validDay} from './accounting_periods.js';import {isD2Eligible} from './scoring.js';
const positive=x=>Number.isFinite(x)&&x>0;
const proof=(x,asOf)=>x?.verificationStatus==='VERIFIED'&&/^[a-f\d]{64}$/.test(x.sourceHash||'')&&/^https:\/\//.test(x.sourceUrl||'')&&Number.isFinite(Date.parse(x.availableAt))&&Date.parse(x.availableAt)<=Date.parse(asOf);
export function reviewGlobalValuation({price,shares,actions,ttm,bookValue,asOf}={}){
 const reasons=[];
 if(!Number.isFinite(Date.parse(asOf)))reasons.push('INVALID_VALUATION_DATE');
 if(!proof(price,asOf)||!positive(price.close)||price.currency!=='USD'||price.basis!=='RAW'||!validDay(price.asOfDate)||Date.parse(price.asOfDate)>Date.parse(asOf)||(Date.parse(asOf)-Date.parse(price.asOfDate))>=8*86400000||!isD2Eligible(price.availableAt,asOf))reasons.push('DATED_RAW_USD_PRICE_REQUIRED');
 if(!proof(shares,asOf)||!Number.isSafeInteger(shares.count)||shares.count<=0||shares.asOfDate!==price?.asOfDate||shares.definition!=='OUTSTANDING'||shares.shareClass!=='COMMON'||shares.allEquityClassesReviewed!==true)reasons.push('SAME_DATE_COMMON_OUTSTANDING_SHARES_REQUIRED');
 const types=['SPLIT','REVERSE_SPLIT','CASH_DIVIDEND','STOCK_DIVIDEND','ISSUANCE','CANCELLATION','OTHER_SHARE_CHANGE'];
 if(!proof(actions,asOf)||!types.every(t=>actions.types?.includes(t))||actions.throughDate!==price?.asOfDate||!validDay(actions.fromDate)||!ttm?.metrics?.revenue?.periodStart||actions.fromDate>ttm.metrics.revenue.periodStart)reasons.push('FULL_CORPORATE_ACTION_COVERAGE_REQUIRED');
 const cap=reasons.length?null:price.close*shares.count;
 if(cap!==null&&!positive(cap))reasons.push('MARKET_CAP_NUMERIC_RANGE');
 const metric=(value,extra=[])=>{const errors=[...reasons,...extra];if(value!==null&&!positive(value))errors.push('MULTIPLE_NUMERIC_RANGE');return {status:value!==null&&!errors.length?'VERIFIED':'HOLD',value:value!==null&&!errors.length?value:null,reasons:errors};};
 const net=ttm?.metrics?.netIncome,rev=ttm?.metrics?.revenue;
 const periodOk=rev?.currency==='USD'&&validDay(rev.periodStart)&&validDay(rev.periodEnd)&&rev.periodEnd<=String(asOf).slice(0,10);
 const earningsOk=periodOk&&net?.currency==='USD'&&net?.periodStart===rev.periodStart&&net?.periodEnd===rev.periodEnd&&net?.status==='READY'&&positive(net.value)&&net.equityAttribution==='COMMON';
 const datedCap=cap&&rev?.periodEnd<=price?.asOfDate?cap:null;
 const per=datedCap&&earningsOk?cap/net.value:null;
 const revenueOk=periodOk&&rev?.status==='READY'&&positive(rev.value);
 const psr=datedCap&&revenueOk?cap/rev.value:null;
 const bookOk=proof(bookValue,asOf)&&bookValue.currency==='USD'&&bookValue.equityAttribution==='COMMON'&&positive(bookValue.value)&&validDay(bookValue.periodEnd)&&bookValue.periodEnd<=String(asOf).slice(0,10);
 const pbr=cap&&bookOk&&bookValue.periodEnd<=price?.asOfDate?cap/bookValue.value:null;
 return {status:'HOLD',marketCap:!reasons.length?cap:null,marketCapDefinition:'COMMON_OUTSTANDING_EQUITY_VALUE',per:metric(per,[...(!earningsOk?['TTM_COMMON_ATTRIBUTABLE_EARNINGS_REQUIRED']:[]),...(cap&&rev?.periodEnd>price?.asOfDate?['FINANCIAL_PERIOD_AFTER_PRICE']:[])]),psr:metric(psr,[...(!revenueOk?['VERIFIED_TTM_REVENUE_REQUIRED']:[]),...(cap&&rev?.periodEnd>price?.asOfDate?['FINANCIAL_PERIOD_AFTER_PRICE']:[])]),pbr:metric(pbr,[...(!bookOk?['COMMON_ATTRIBUTABLE_BOOK_VALUE_REQUIRED']:[]),...(cap&&bookOk&&bookValue.periodEnd>price?.asOfDate?['BOOK_PERIOD_AFTER_PRICE']:[])]),evEbitda:metric(null,['VERIFIED_EV_AND_EBITDA_REQUIRED']),reasons,recommendationStatus:'HOLD',minimumPeerSamples:3};
}
