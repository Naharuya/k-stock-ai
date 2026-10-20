import {validDay} from './accounting_periods.js';
const sourceUrl=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&(!u.hash||u.hostname==='www.alphavantage.co'&&['#daily','#splits'].includes(u.hash))&&['www.sec.gov','www.alphavantage.co'].includes(u.hostname)?u.href:null;}catch{return null;}};
// A readable evidence checklist, not an investment score or worker queue.
export function buildResearchReadiness({ttm,valuationReview}={}) {
 const evidence=valuationReview?.evidence;
 const ready=key=>ttm?.metrics?.[key]?.status==='READY'
  &&Number.isFinite(ttm.metrics[key].value)
  &&!(ttm.metrics[key].reasons?.length);
 const items=[
  {id:'revenue',label:'최근 12개월 매출',status:ready('revenue')?'VERIFIED':'INSUFFICIENT_DATA',next:'연결 범위가 확인된 연속 4개 분기 매출이 필요합니다.'},
  {id:'cashFlow',label:'최근 12개월 영업현금흐름',status:ready('operatingCashFlow')?'VERIFIED':'INSUFFICIENT_DATA',next:'연결 범위가 확인된 연속 4개 분기 현금흐름이 필요합니다.'},
  {id:'price',label:'평가에 사용할 가격',status:evidence?.price?.close>0?'PENDING':'INSUFFICIENT_DATA',next:'가격 기준일과 원주가 출처 검증이 필요합니다.'},
  {id:'shares',label:'가격일과 같은 보통주 주식수',status:evidence?.shares?.count>0?'PENDING':'INSUFFICIENT_DATA',next:'가격일의 주식 종류와 주식수, 자기주식 처리 대사가 필요합니다.'},
  {id:'actions',label:'분할·배당·증자 등 기업행동',status:'INSUFFICIENT_DATA',next:'평가 기간 전체의 기업행동과 실제 적용일이 필요합니다.'},
  {id:'earnings',label:'보통주에 귀속되는 순이익',status:ready('netIncome')?'PENDING':'INSUFFICIENT_DATA',next:'4개 분기 순이익과 보통주 귀속 범위 검증이 필요합니다.'},
  {id:'equity',label:'보통주에 귀속되는 자본',status:'INSUFFICIENT_DATA',next:'평가일까지 공개된 보통주 귀속 자본 근거가 필요합니다.'},
  {id:'peers',label:'동종기업 비교와 종합 위험',status:'PENDING',next:'기존 최소 표본과 종합 위험 검증을 통과해야 합니다.'}
 ];
 const metricKeys={revenue:'revenue',cashFlow:'operatingCashFlow',earnings:'netIncome'};
 const enriched=items.map(item=>{
  const key=metricKeys[item.id],metric=key?ttm?.metrics?.[key]:null;
  const observation=item.id==='price'?evidence?.price:item.id==='shares'?evidence?.shares:null;
  const periodStart=validDay(metric?.periodStart)?metric.periodStart:null;
  const periodEnd=validDay(metric?.periodEnd)?metric.periodEnd:null;
  const asOfDate=validDay(observation?.asOfDate)?observation.asOfDate:null;
  const urls=metric?(metric.quarters||[]).flatMap(q=>q.scopeSources||[]):[observation?.sourceUrl];
  const sources=[...new Set(urls.map(sourceUrl).filter(Boolean))];
  return {...item,next:item.status==='VERIFIED'?null:item.next,evidence:{observedValue:observation&&Number.isFinite(item.id==='shares'?observation.count:observation.close)?(item.id==='shares'?observation.count:observation.close):null,reportedDecimals:observation?.reportedDecimals??null,kind:metric?'FINANCIAL_PERIOD':observation?'OBSERVED_NOT_VALIDATED':'NOT_AVAILABLE',periodStart,periodEnd,asOfDate,currency:metric?.currency||observation?.currency||null,unit:metric?.unit||(item.id==='shares'?'SHARES':null),sources}};
 });
 return {schemaVersion:1,status:'HOLD',purpose:'EVIDENCE_CHECKLIST_NOT_RECOMMENDATION',items:enriched,confirmed:items.filter(i=>i.status==='VERIFIED').map(i=>i.id),nextRequired:items.filter(i=>i.status!=='VERIFIED').map(i=>i.id),note:'자료 확인 상태이며 수집 작업의 실행·완료를 뜻하지 않습니다.'};
}
