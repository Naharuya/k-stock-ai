import { getDisclosuresByStockCode } from './dart_service.js';
import { classifyDisclosures } from './disclosure_classifier.js';
import { getCompanyNews } from './news_service.js';
import { analyzeNewsItems } from './news_analysis_service.js';
import { analyzeMarketContext } from './market_context_service.js';
import { marketCloseAt } from './trading_day_service.js';

export async function loadOvernightDisclosures({code,sourceTradingDate,targetTradingDate}) {
  const rows=[];
  for(let pageNo=1;pageNo<=10;pageNo++) {
    let data;
    try {
      data=(await getDisclosuresByStockCode({stockCode:code,
        beginDate:sourceTradingDate.replaceAll('-',''),endDate:targetTradingDate.replaceAll('-',''),
        pageCount:100,pageNo})).disclosures;
    } catch(error) { if(error.dartStatus==='013')break; throw error; }
    if(data.status==='013')break;
    if(data.status && data.status!=='000')throw new Error('DISCLOSURES_UNAVAILABLE');
    rows.push(...(data.list||[]));
    if(pageNo>=Number(data.total_page||1))return {list:rows,complete:true};
    if(pageNo===10)return {list:rows,complete:false};
  }
  return {list:rows,complete:true};
}
export async function validatePreMarket(snapshot, {
  now=new Date(), disclosures=loadOvernightDisclosures, news=getCompanyNews, market=analyzeMarketContext
}={}) {
  const checkedAt=now.toISOString();
  const errors=[];
  let context=null;
  try { context=await market(); if(context?.score?.status!=='READY')throw new Error('MARKET_INCOMPLETE');
      const sourceDate=snapshot.sourceTradingDate.replaceAll('-','');
      if([context.kospi,context.kosdaq].some(x=>!x?.latestDate || ![sourceDate,snapshot.targetTradingDate.replaceAll('-','')].includes(String(x.latestDate).replaceAll('-',''))))throw new Error('MARKET_STALE'); }
  catch { errors.push({stage:'market',error:'MARKET_UNAVAILABLE',message:'시장 재검증 미완료'}); }
  const marketIncomplete=errors.length>0;
  const candidates=[];
  for(const prior of snapshot.candidates) {
    const issues=[];
    let reports={list:[]};
    let newsItems=[];
    try {
      reports=await disclosures({code:prior.code,sourceTradingDate:snapshot.sourceTradingDate,targetTradingDate:snapshot.targetTradingDate});
      if(reports.complete===false)issues.push({stage:'disclosures',error:'DISCLOSURES_TRUNCATED'});
    } catch { issues.push({stage:'disclosures',error:'DISCLOSURES_UNAVAILABLE'}); }
    // OpenDART list provides a date, not receipt time: include the entire source date conservatively.
    const begin=snapshot.sourceTradingDate.replaceAll('-','');
    const end=snapshot.targetTradingDate.replaceAll('-','');
    reports.list=(reports.list||[]).filter(x=>!x.rcept_dt || (x.rcept_dt>=begin && x.rcept_dt<=end));
    const semantic=classifyDisclosures(reports);
    try {
      const result=await news({corpName:prior.name,stockCode:prior.code,
        lookbackDays:Math.max(1,Math.ceil((now-marketCloseAt(snapshot.sourceTradingDate))/86400000)),maxItems:100});
      if(result.items?.some(x=>!Number.isFinite(Date.parse(x.publishedAt))))issues.push({stage:'news',error:'NEWS_TIMESTAMP_MISSING'});
      if(result.rows>=100)issues.push({stage:'news',error:'NEWS_LIMIT_REACHED'});
      newsItems=(result.items||[]).filter(x=>{
        const date=Date.parse(x.publishedAt);
        return date>=marketCloseAt(snapshot.sourceTradingDate).getTime() && date<=now.getTime();
      });
    } catch { issues.push({stage:'news',error:'NEWS_UNAVAILABLE'}); }
    const newsScore=analyzeNewsItems({items:newsItems});
    const negative=semantic.negativeEvents.length>0 || newsScore.sentiment==='NEGATIVE';
    const highNews=newsScore.highRiskEvents.length>0;
    const riskOff=context?.score?.regime==='RISK_OFF';
    const incomplete=marketIncomplete || issues.length>0;
    let status=prior.validationGrade==='A' && ['INTEREST','CONDITION_MET'].includes(prior.committeeStatus) ? 'READY' : 'WATCH';
    if(incomplete)status='WATCH';
    if(negative||riskOff)status='DOWNGRADED';
    if(highNews)status='RISK';
    if(semantic.critical || prior.status==='EXCLUDED' || prior.riskLevel==='VERY_HIGH')status='EXCLUDED';
    const penalty=Math.min(100,Math.max(0,-semantic.totalImpact)+(highNews?25:newsScore.sentiment==='NEGATIVE'?10:0)+(riskOff?10:0));
    const reasons=[
      ...semantic.negativeEvents.map(x=>x.reportName),
      ...(highNews?['고위험 뉴스 확인 필요']:[]),
      ...(riskOff?['시장 환경 RISK_OFF']:[]),
      ...(incomplete?['일부 데이터 재검증 미완료']:[]),
      ...(!negative&&!highNews&&!riskOff&&!incomplete?['장전 변화: 이상 없음']:[]),
      ...(prior.validationGrade!=='A'?['기존 정밀검증 미완료 · 개별 분석 필요']:[])
    ];
    errors.push(...issues.map(x=>({...x,code:prior.code,message:'장전 데이터 확인 필요'})));
    candidates.push({...prior,previousRankingScore:prior.rankingScore,
      currentValidationScore:incomplete||prior.rankingScore==null?null:Math.round(Math.max(0,prior.rankingScore-penalty)*10)/10,
      status,statusChange:{from:prior.status||'WATCH',to:status,changed:status!==(prior.status||'WATCH')},
      newDisclosures:reports.list.map(x=>({reportName:x.report_nm,receiptNo:x.rcept_no||null,receiptDate:x.rcept_dt||null,
        classifications:semantic.events.filter(e=>e.receiptNo===x.rcept_no).map(e=>({type:e.type,severity:e.severity,semanticReason:e.semanticReason}))})),
      newNews:newsItems.map(({title,publishedAt,source})=>({title,publishedAt,source})),
      newsSentiment:newsItems.length?newsScore.sentiment:incomplete?'UNKNOWN':'NEUTRAL',
      riskChanges:{previous:prior.riskLevel,current:status==='EXCLUDED'?'VERY_HIGH':(negative||highNews||riskOff)?'HIGH':prior.riskLevel,
        critical:semantic.critical,newRisk:negative||highNews||riskOff},
      reasons,checkedAt,validationComplete:!incomplete,
      diagnostics:{disclosureWindow:'SOURCE_DATE_INCLUSIVE',rawDisclosures:reports.list.length,newsCount:newsItems.length,errors:issues.length}
    });
  }
  return {generatedAt:checkedAt,sourceTradingDate:snapshot.sourceTradingDate,targetTradingDate:snapshot.targetTradingDate,
    market:context,candidates,errors,
    diagnostics:{status:errors.length?'PARTIAL':'COMPLETE',newRiskCount:candidates.filter(x=>x.riskChanges.newRisk).length,
      excludedCount:candidates.filter(x=>x.status==='EXCLUDED').length,
      disclosureWindow:'OpenDART 접수시각 미제공: 전일 전체 공시 포함',
      newsMethod:'기존 News Agent 제목 기반 분석',calendar:'WEEKDAYS_ONLY'}};
}
