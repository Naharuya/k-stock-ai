import { runDailyCandidateEngine } from './candidate_engine_service.js';
import { DailyCandidateStore, sanitizeDaily } from './daily_candidate_store.js';
import { validatePreMarket } from './pre_market_validation_service.js';
import { seoulClock, isTradingDay, nextTradingDate, previousTradingDate, latestTradingDate, tradingCalendarStatus } from './trading_day_service.js';

export const DAILY_ENGINE_VERSION='2.6.0';
const number=value=>value!==null && value!==undefined && value!=='' && Number.isFinite(Number(value))?Number(value):null;
function mapCandidate(row,generatedAt) {
  const grade=row.validationLevel==='DEEP'?'A':['LIGHT','PARTIAL_DEEP'].includes(row.validationLevel)?'B':'C';
  const excluded=row.committee?.hardStop || ['RISK_EXCLUDED','VERIFIED_RISK'].includes(row.finalState);
  return {code:row.code,name:row.name,rankingScore:number(row.rankingScore??row.finalScore),
    validationGrade:grade,committeeStatus:row.committee?.status??null,committeeScore:number(row.committee?.score),
    price:number(row.quote?.price),per:number(row.quote?.per),pbr:number(row.quote?.pbr),roe:number(row.roe),
    styleTags:row.styleTags||[],reasons:row.reasons||[],
    risks:[...(row.deep?.riskReasons||[]),...(row.committee?.negativeReasons||[])],
    riskLevel:row.deep?.riskLevel||'UNKNOWN',qualityFlags:row.quality?.flags||[],
    analysisTimestamp:row.deep?.analyzedAt||generatedAt,
    status:excluded?'EXCLUDED':grade==='A'&&['INTEREST','CONDITION_MET'].includes(row.committee?.status)?'READY':'WATCH'};
}
function engineErrors(result) {
  const errors=[];
  for(const stage of ['quote','deep'])for(const x of result.errors?.[stage]||[])errors.push({stage,code:x.code,error:stage.toUpperCase()+'_VALIDATION_FAILED',message:'후보 데이터 검증 실패'});
  if(result.errors?.sharedMarket)errors.push({stage:'market',error:'MARKET_UNAVAILABLE',message:'시장 데이터 검증 실패'});
  if((result.pipeline?.deepCompleted||0)<(result.pipeline?.deepRequested||0) && !(result.errors?.deep||[]).length) {
    errors.push({stage:'deep',error:'DEEP_DATA_INCOMPLETE',message:'정밀검증 데이터 일부 미완료'});
  }
  return errors;
}
export class DailyTradingService {
  constructor({store=new DailyCandidateStore(),engine=runDailyCandidateEngine,preValidator=validatePreMarket,now=()=>new Date()}={}) {
    this.store=store; this.engine=engine; this.preValidator=preValidator; this.now=now;
    this.active=null; this.lastJob=null;
  }
  start(kind,options={}) {
    if(!['after-market','pre-market'].includes(kind))throw new Error('INVALID_DAILY_PHASE');
    if(this.active)throw new Error('DAILY_BUSY');
    const startedAt=this.now().toISOString();
    const job={id:kind+':'+startedAt,kind,state:'RUNNING',startedAt};
    this.active=job;
    const completion=Promise.resolve().then(()=>kind==='after-market'?this.afterMarket(options):this.preMarket(options))
      .then(result=>{this.lastJob={...job,state:'COMPLETED',finishedAt:this.now().toISOString(),errors:result.errors};return result;})
      .catch(async error=>{
        const allowed=['NO_AFTER_MARKET_RESULT','SOURCE_DATE_MISMATCH','NOT_TRADING_DAY','DAILY_STORE_READ_FAILED','AFTER_MARKET_EMPTY','INVALID_DAILY_OPTIONS','INVALID_MARKET_CLOSED_DATES'];
        const code=allowed.includes(error.message)?error.message:'DAILY_RUN_FAILED';
        this.lastJob={...job,state:'FAILED',finishedAt:this.now().toISOString(),error:code};
        const date=seoulClock(this.now()).date;
        try { await this.store.write('failures',date,{engineVersion:DAILY_ENGINE_VERSION,generatedAt:this.now().toISOString(),
          sourceTradingDate:latestTradingDate(date),targetTradingDate:kind==='after-market'?nextTradingDate(date):date,
          candidates:[],diagnostics:{kind,status:'FAILED'},errors:[{stage:kind,error:code,message:'실행 실패 · 이전 저장 결과 유지'}]}); }
        catch { this.lastJob.storageError='FAILURE_RECORD_WRITE_FAILED'; }
        throw new Error(code);
      }).finally(()=>{this.active=null;});
    // Background HTTP jobs are polled through /status; attach a rejection handler immediately.
    completion.catch(()=>{});
    return {job:{...job},completion};
  }
  async afterMarket(options={}) {
    const date=seoulClock(this.now()).date;
    if(!isTradingDay(date))throw new Error('NOT_TRADING_DAY');
    const limits={candidatePool:60,quoteLimit:20,deepLimit:5,top:20};
    for(const [key,min,max] of [['candidatePool',40,70],['quoteLimit',15,20],['deepLimit',3,5],['top',5,20]]) {
      if(options[key]!==undefined) {
        const value=Number(options[key]);
        if(!Number.isInteger(value)||value<min||value>max)throw new Error('INVALID_DAILY_OPTIONS');
        limits[key]=value;
      }
    }
    const result=await this.engine({...limits,exchange:'all',requireQuoteForDeep:true,refresh:true,businessYear:date.slice(0,4)});
    if(!Array.isArray(result.top)||!result.top.length)throw new Error('AFTER_MARKET_EMPTY');
    const generatedAt=this.now().toISOString();
    const errors=engineErrors(result);
    const record={engineVersion:DAILY_ENGINE_VERSION,generatedAt,sourceTradingDate:date,targetTradingDate:nextTradingDate(date),
      market:result.market||null,scanned:result.pipeline?.scanned??0,eligible:result.pipeline?.eligibleAfterHardRisk??0,
      candidates:result.top.map(x=>mapCandidate(x,generatedAt)),
      diagnostics:{status:errors.length?'PARTIAL':'COMPLETE',pipeline:result.pipeline,verificationSummary:result.verificationSummary,
        ranking:result.ranking,rejected:(result.rejected||[]).map(x=>mapCandidate(x,generatedAt)),calendar:tradingCalendarStatus(),
        manualBeforeClose:seoulClock(this.now()).minute<15*60+30},
      errors};
    return this.store.write('after-market',date,record);
  }
  async preMarket() {
    const now=this.now(); const date=seoulClock(now).date;
    if(!isTradingDay(date))throw new Error('NOT_TRADING_DAY');
    const source=await this.store.read('after-market',previousTradingDate(date));
    if(!source)throw new Error('NO_AFTER_MARKET_RESULT');
    if(source.targetTradingDate!==date)throw new Error('SOURCE_DATE_MISMATCH');
    const result=await this.preValidator(source,{now});
    return this.store.write('pre-market',date,{...result,engineVersion:DAILY_ENGINE_VERSION,generatedAt:this.now().toISOString(),
      scanned:source.scanned,eligible:source.eligible,
      diagnostics:{...result.diagnostics,sourceGeneratedAt:source.generatedAt,sourceErrors:source.errors}});
  }
  async today() {
    const date=seoulClock(this.now()).date;
    const result=await this.store.read('pre-market',date);
    return result?.targetTradingDate===date?result:null;
  }
  async tomorrow() {
    const date=seoulClock(this.now()).date;
    const result=await this.store.read('after-market',latestTradingDate(date));
    return result?.targetTradingDate===nextTradingDate(date)?result:null;
  }
  async status() {
    const [today,tomorrow,lastAfter,lastPre,lastFailure]=await Promise.all([
      this.today(),this.tomorrow(),this.store.latest('after-market'),this.store.latest('pre-market'),this.store.latest('failures')]);
    const visible=record=>(record?.candidates||[]).filter(x=>!['EXCLUDED','RISK'].includes(x.status));
    return sanitizeDaily({engineVersion:DAILY_ENGINE_VERSION,timezone:'Asia/Seoul',date:seoulClock(this.now()).date,
      active:this.active,lastJob:this.lastJob,lastFailure,
      lastAfterMarket:lastAfter?.generatedAt||null,lastPreMarket:lastPre?.generatedAt||null,
      todayCandidateCount:visible(today).length,tomorrowCandidateCount:visible(tomorrow).length,
      newRiskCount:today?.diagnostics?.newRiskCount||0,
      deepValidatedCount:visible(today).filter(x=>x.validationGrade==='A' && x.validationComplete).length,
      todayStatus:today?.diagnostics?.status||'NOT_GENERATED',tomorrowStatus:tomorrow?.diagnostics?.status||'NOT_GENERATED',
      calendar:tradingCalendarStatus(),errors:[...(today?.errors||[]),...(tomorrow?.errors||[])]});
  }
}
