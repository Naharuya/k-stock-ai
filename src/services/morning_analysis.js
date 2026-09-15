import {getNewsEvidence} from './news_evidence_service.js';
import {getDisclosureEvidence} from './dart_service.js';
import {analyzeMarketContext} from './market_context_service.js';
import {analyzeDartStock} from './dart_analysis_service.js';
import {getDomesticQuote,getDomesticDailyChart,getDomesticInvestorFlow} from './kis_service.js';
import {loadOvernightDisclosures} from './pre_market_validation_service.js';
import {classifyDisclosures} from './disclosure_classifier.js';
import {getCompanyNews} from './news_service.js';
import {analyzeNewsItems} from './news_analysis_service.js';
import {buildTechnicalMetrics} from './technical_metrics_service.js';
import {buildFlowMetrics,scoreFlow} from './flow_analysis_service.js';
import {scoreValuation,scoreTechnical} from './market_score_service.js';
import {buildInvestmentIndicators} from './investment_indicators_service.js';
import {buildBearCase,buildInvestmentCommittee} from './investment_committee_service.js';
import {evaluateExitPosition} from './entry_exit_service.js';
import {runScreener} from './screener_service.js';
import {marketCloseAt} from './trading_day_service.js';

export const morningDependencies={market:analyzeMarketContext,dart:analyzeDartStock,quote:getDomesticQuote,chart:getDomesticDailyChart,
  newsEvidence:getNewsEvidence,evidence:getDisclosureEvidence,flow:getDomesticInvestorFlow,disclosures:loadOvernightDisclosures,news:getCompanyNews,screen:runScreener};
export const present=x=>typeof x==='number'&&Number.isFinite(x);
const dateKey=x=>String(x||'').replaceAll('-','');
export function closedRows(rows,sourceDate){
  return [...new Map((rows||[]).filter(r=>/^\d{8}$/.test(dateKey(r.date))&&dateKey(r.date)<=dateKey(sourceDate)).map(r=>[dateKey(r.date),{...r,date:dateKey(r.date)}])).values()].sort((a,b)=>b.date.localeCompare(a.date));
}
export function overnightNews(result,sourceDate,now){
  if(!Array.isArray(result?.items))throw new Error('NEWS_UNAVAILABLE');
  if(result.items.some(x=>!Number.isFinite(Date.parse(x.publishedAt))))throw new Error('NEWS_TIMESTAMP_MISSING');
  const from=marketCloseAt(sourceDate).getTime();
  const seen=new Set();
  const items=result.items.filter(x=>{
    const timestamp=Date.parse(x.publishedAt),key=(x.normalizedTitle||x.title||'').toLowerCase().replace(/\s+/g,' ').trim();
    if(timestamp<from||timestamp>now.getTime()||!key||seen.has(key))return false;
    seen.add(key);return true;
  });
  return {items,score:analyzeNewsItems({items}),from:new Date(from).toISOString(),to:now.toISOString(),method:'RSS_TITLE_REVIEW_ONLY',truncated:result.rows>=100};
}
export function overnightDart(result,sourceDate,date){
  const list=(result.list||[]).filter(x=>x.rcept_dt>=dateKey(sourceDate)&&x.rcept_dt<=dateKey(date));
  return {list,semantic:classifyDisclosures({list}),complete:result.complete!==false,window:'SOURCE_DATE_INCLUSIVE_RECEIPT_TIME_UNAVAILABLE'};
}
export function technicalData(chart,quote,sourceDate,{session='PRE_MARKET',now=new Date()}={}){
  const rows=closedRows(chart?.rows,sourceDate),latest=rows[0];
  if(!latest||latest.date!==dateKey(sourceDate)||!present(latest.close)||latest.close<=0)throw new Error('PRICE_STALE_OR_MISSING');
  const metrics=buildTechnicalMetrics({rows});
  if(rows.length<120||!present(metrics.ma120))throw new Error('TECHNICAL_HISTORY_INCOMPLETE');
  const intraday=session==='INTRADAY',price=intraday?(present(quote?.price)&&quote.price>0?quote.price:null):latest.close;
  return {sourceDates:{technical:sourceDate,quoteRetrievedAt:now.toISOString(),quoteTradeDate:quote?.tradeDate??null},quote:{...quote,price,currentPrice:price,asOf:intraday?now.toISOString():sourceDate,priceBasis:intraday?'LATEST_AVAILABLE_QUOTE':'LAST_COMPLETED_SESSION_CLOSE'},
    chart:{source:'KIS',rows},technicalMetrics:metrics,score:scoreTechnical(metrics),
    previousClose:rows[1]?.close??null,volume:latest.volume,week52High:quote?.week52High??null,week52Low:quote?.week52Low??null,
    momentum:{return5dPct:rows[5]?.close>0?(latest.close/rows[5].close-1)*100:null,return20dPct:rows[20]?.close>0?(latest.close/rows[20].close-1)*100:null},
    intraday:{status:session==='NON_TRADING_DAY'?'MARKET_CLOSED':intraday?'LATEST_QUOTE_WITH_CONFIRMED_HISTORY':'PRE_MARKET_DATA_NOT_AVAILABLE',price:intraday?price:null,volume:null,foreign:null,institution:null,personal:null}};
}
export function flowData(raw,sourceDate){
  const rows=closedRows(raw?.rows,sourceDate);
  if(rows[0]?.date!==dateKey(sourceDate)||rows.length<20||
    rows.slice(0,20).some(r=>['foreign','institution','personal'].some(p=>!present(r[p+'NetBuyQty']))))throw new Error('FLOW_STALE_OR_INCOMPLETE');
  const metrics=buildFlowMetrics({rows});
  for(const participant of ['foreign','institution','personal'])for(const count of [5,20]){if(rows.slice(0,count).some(r=>!present(r[participant+'NetBuyValue'])))metrics[participant]['netBuyValue'+count+'d']=null;}
  for(const participant of ['foreign','institution','personal'])if(!present(rows[0][participant+'NetBuyValue']))metrics[participant].latestValue=null;
  for(const count of [5,20])if(!present(metrics.foreign['netBuyValue'+count+'d'])||!present(metrics.institution['netBuyValue'+count+'d']))metrics['combinedSmartMoneyValue'+count+'d']=null;
  return {metrics,score:scoreFlow(metrics),sourceDate,intradayStatus:'PRE_MARKET_DATA_NOT_AVAILABLE'};
}
export function valuationData(technical,dart){
  if(!technical?.quote||!dart?.financials?.validation?.ok)throw new Error('VALUATION_DEPENDENCY_MISSING');
  return {score:scoreValuation(technical.quote),indicators:buildInvestmentIndicators({quote:technical.quote,financials:dart.financials,technicalMetrics:technical.technicalMetrics}),
    sectorRelative:{status:'NOT_AVAILABLE',reason:'No comparable sector valuation dataset supplied'}};
}
export function riskData(data,market) {
  const incomplete=['dart','news','disclosures','technical','flow','valuation'].filter(k=>!data[k]);
  if(!market||market.score?.status!=='READY')incomplete.push('market');
  if(data.disclosures?.complete===false)incomplete.push('disclosuresTruncated');
  if(data.news?.truncated)incomplete.push('newsTruncated');
  const semantic=data.disclosures?.semantic;
  const hardStop=Boolean(semantic?.critical||data.dart?.agents?.risk?.criticalRisk||data.dart?.agents?.risk?.excludeSuggested);
  const highNews=Boolean(data.news?.score?.highRiskEvents?.length);
  const quoteRisk=Boolean(data.technical?.quote?.raw?.mang_issu_cls_code==='Y'||data.technical?.quote?.raw?.temp_stop_yn==='Y'||data.technical?.quote?.raw?.sltr_yn==='Y');
  const newRisk=Boolean(semantic?.negativeEvents?.length||highNews||data.news?.score?.sentiment==='NEGATIVE'||quoteRisk);
  const level=hardStop?'CRITICAL':incomplete.length||highNews||quoteRisk||data.dart?.agents?.risk?.riskLevel==='HIGH'?'HIGH':
    data.dart?.agents?.risk?.riskLevel==='LOW'&&!newRisk?'LOW':'MEDIUM';
  return {level,hardStop,newRisk,incomplete,newsRequiresVerification:highNews,tradingRiskRequiresReview:quoteRisk,reasons:[
    ...(quoteRisk?['Trading restriction flag: verify semantic reason; no automatic hard stop']:[]),
    ...(data.dart?.agents?.risk?.risks||[]),...(semantic?.negativeEvents||[]).map(x=>x.reportName),
    ...(highNews?['고위험 뉴스 제목 · 원문 확인 필요']:[]),...incomplete.map(x=>'DATA_INCOMPLETE: '+x)]};
}
export function committeeInput(data,market) {
  const dart=structuredClone(data.dart||{});
  dart.agents??={};dart.agents.risk??={};
  if(data.risk?.hardStop){dart.agents.risk.criticalRisk=true;dart.agents.risk.excludeSuggested=true;}
  return {dart,valuation:data.valuation?.score,technical:data.technical?.score,flow:data.flow?.score,
    market:market?.score,news:data.news?.score,completeness:{percent:data.risk?.incomplete.length?0:100}};
}
export function bearData(data,market){
  const result=buildBearCase(committeeInput(data,market));
  if(data.technical?.technicalMetrics?.rsi14>=75)result.majorArguments.push('RSI 과열');
  for(const reason of data.risk?.reasons||[])if(!result.whatCouldGoWrong.includes(reason))result.whatCouldGoWrong.push(reason);
  return result;
}
export function committeeData(data,market){
  const result=buildInvestmentCommittee({...committeeInput(data,market),bear:data.bear});
  if(data.risk.hardStop){result.hardStop=true;result.status='RISK';result.hardStopReason='SEMANTIC_OR_FINANCIAL_CRITICAL';}
  else if(data.risk.incomplete.length){result.status='WATCH';result.totalScore=null;result.confidence=0;result.negativeReasons.push('핵심 데이터 미완성 · 판정 보류');}
  else if((data.risk.newsRequiresVerification||data.risk.tradingRiskRequiresReview)&&['INTEREST','CONDITION_MET'].includes(result.status)){result.status='WATCH';result.negativeReasons.push('고위험 뉴스 원문 확인 대기');}
  return result;
}
export function exitData(entry,data,market,now){
  const currentAnalysis={stockCode:entry.stockCode,corpName:entry.corpName,analyzedAt:now.toISOString(),
    committee:data?.committee,dart:data?.dart,scores:{news:data?.news?.score},
    marketData:{quote:data?.technical?.quote,technicalMetrics:data?.technical?.technicalMetrics,flowMetrics:data?.flow?.metrics,marketContext:market}};
  const missing=[...(data?.risk?.incomplete||[])];
  if(!data?.committee)missing.push('committee');
  if(!entry.thesis||!present(entry.thesis.committeeScore)||!present(entry.thesis.riskScore)||!present(entry.thesis.flow?.combinedSmartMoneyQty5d)||!entry.thesis.technical?.trend)missing.push('entryThesis');
  const price=data?.technical?.quote?.price;
  if(!present(price)||price<=0)missing.push('price');
  let result;
  if(missing.length||!present(price)||price<=0) {
    result={stockCode:entry.stockCode,corpName:entry.corpName,currentPrice:present(price)&&price>0?price:null,
      buyPrice:entry.buyPrice,quantity:entry.quantity,pnlPct:present(price)&&price>0?(price/entry.buyPrice-1)*100:null,
      exitPressure:null,status:data?.risk?.hardStop?'RISK_EXIT_REVIEW':'WATCH',reasons:['DATA_INCOMPLETE',...missing],
      evaluatedAt:now.toISOString(),labelKo:data?.risk?.hardStop?'위험 이탈 검토':'데이터 확인 필요'};
  } else {
    result=evaluateExitPosition({entry,currentAnalysis});
    if(result.status==='CAUTION'){result.status='WATCH';result.labelKo='주의 관찰';}
    if((data.risk.newsRequiresVerification||data.risk.tradingRiskRequiresReview)&&result.status==='HOLD'){result.status='WATCH';result.labelKo='뉴스 확인 필요';}
  }
  return {...result,evaluatedAt:now.toISOString(),entryRegisteredAt:entry.registeredAt,entrySnapshot:entry,
    pnlAmount:present(result.currentPrice)?(result.currentPrice-entry.buyPrice)*entry.quantity:null,
    dataStatus:missing.length?'PARTIAL':'SUCCESS',priceBasis:data?.technical?.quote?.priceBasis||'LAST_COMPLETED_SESSION_CLOSE',
    thesisComparison:{entryScore:entry.thesis?.committeeScore??null,currentScore:data?.committee?.totalScore??null,
      originalReasons:entry.thesis?.entryReasons||[],invalidConditions:entry.thesis?.invalidConditions||[],
      method:'STRUCTURED_SCORE_TREND_FLOW_NEWS_RISK_COMPARISON',freeTextThesisValidation:'NOT_AUTOMATED'}};
}
