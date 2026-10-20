import {validDay} from './accounting_periods.js';
import {normalizeShareCount} from './share_count.js';
import {assertSafeKStockV2Environment} from './scoring.js';
const date=x=>{if(typeof x!=='string')return null;const v=x.trim().replaceAll('.','-');return validDay(v)?v:null;};
export function normalizeActionEvidence(response,operation,company,collectedAt){
  const result=[],seen=new Set();
  for(const r of response?.status==='000'&&Array.isArray(response.list)?response.list:[]){
    if(r.corp_code!==company.corpCode||!/^\d{14}$/.test(r.rcept_no||''))continue;
    const label=operation==='capital'?r.isu_dcrs_stle:operation==='dividends'?r.se:r.acqs_mth3;
    if(!label||label==='-'||label==='해당사항 없음')continue;
    const eventType=operation==='dividends'?'DIVIDEND_REPORT':operation==='treasury'?'TREASURY_CHANGE':/무상증자/.test(label)?'BONUS_ISSUE':/유상증자/.test(label)?'RIGHTS_ISSUE':/분할/.test(label)?'SPLIT':/병합/.test(label)?'REVERSE_SPLIT':'SHARE_COUNT_CHANGE';
    const reportedDate=operation==='capital'?date(r.isu_dcrs_de):null;
    const reportDate=date(r.stlm_dt),shareClass=r.stock_knd||r.isu_dcrs_stock_knd||null;
    const value=operation==='dividends'?r.thstrm:operation==='capital'?r.isu_dcrs_qy:r.change_qy_acqs;
    const key=JSON.stringify([operation,r.rcept_no,label,shareClass,reportedDate,value,r.acqs_mth1,r.acqs_mth2]);if(seen.has(key))continue;seen.add(key);
    result.push({stockCode:company.ticker,eventType,announcementDate:null,effectiveDate:null,recordDate:null,reportedDate,reportDate,shareClass,source:'OpenDART '+operation,sourceDocumentId:r.rcept_no,sourceUrl:`https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${r.rcept_no}`,collectedAt,verificationStatus:'PENDING_VERIFICATION',label,value:value??null,reason:'REPORT_SUMMARY_IS_NOT_EX_DATE_OR_COMPLETE_EVENT_COVERAGE'});
  }
  return result;
}
export async function collectKrActionEvidence(companies,{request,year,reportCode='11012',analysisDate,env=process.env}={}){
  assertSafeKStockV2Environment(env);
  if(!Array.isArray(companies)||companies.length<1||companies.length>4||new Set(companies.map(x=>x.ticker)).size!==companies.length||companies.some(x=>x.market!=='KR'||!/^\d{6}$/.test(x.ticker||'')||!/^\d{8}$/.test(x.corpCode||'')))throw new Error('ACTION_SCOPE_INVALID');
  const collectedAt=new Date().toISOString(),rows=[];
  for(const company of companies){
    const responses={},failures=[];
    for(const operation of ['share-count','capital','dividends','treasury']){
      try{responses[operation]=await request({service:'opendart',operation,params:{corpCode:company.corpCode,year,reportCode}});}
      catch(e){failures.push({operation,code:e.code||'SOURCE_FAILED'});responses[operation]={status:'FAILED'};}
    }
    rows.push({stockCode:company.ticker,companyName:company.companyName,shareCount:normalizeShareCount(responses['share-count'],company,{collectedAt,analysisDate}),events:['capital','dividends','treasury'].flatMap(op=>normalizeActionEvidence(responses[op],op,company,collectedAt)),failures,sourceStatuses:Object.fromEntries(Object.entries(responses).map(([k,v])=>[k,v.status])),status:'PARTIAL',coverage:{verified:false,fromDate:null,toDate:null,reason:'PERIODIC_REPORTS_DO_NOT_ESTABLISH_FULL_DAILY_EVENT_COVERAGE'}});
  }
  return {collectedAt,analysisDate,year,reportCode,companies:rows,status:'PARTIAL'};
}
