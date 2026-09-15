import {withRequestSignal,checkCancelled} from './request_context.js';
import {comparePeers} from './peer_valuation_service.js';
import {MorningStore,MorningPortfolioStore} from './morning_store.js';
import {sanitizeDaily} from './daily_candidate_store.js';
import {seoulClock,isTradingDay,previousTradingDate,tradingCalendarStatus,tradingCalendarHealth} from './trading_day_service.js';
import {morningDependencies,overnightNews,overnightDart,technicalData,flowData,valuationData,riskData,bearData,committeeData,exitData} from './morning_analysis.js';
import {lightCandidate,applyDeep,finalState} from './candidate_scoring_service.js';
import {rankCandidatesForOperationalView,selectDiversifiedCandidates} from './candidate_rank_service.js';

export const MORNING_VERSION='2.6.4';
export const AGENTS=['MarketAgent','NewsAgent','DARTAgent','ScreenerAgent','QuoteValidationAgent','FundamentalAgent','ValuationAgent','TechnicalAgent','FlowAgent','RiskAgent','BearAgent','InvestmentCommittee','EntryAgent','ExitAgent'];
const order=['COMMON_DATA','SCREENER','QUOTE_VALIDATION','DEEP_ANALYSIS','RISK','BEAR','COMMITTEE','ENTRY','EXIT','REPORT'];
export class DailyAgentOrchestrator {
  constructor({store=new MorningStore(),portfolio=new MorningPortfolioStore(),dependencies={},now=()=>new Date()}={}) {
    this.store=store;this.portfolio=portfolio;this.deps={...morningDependencies,...dependencies};this.now=now;this.active=null;this.lastJob=null;this.agentStatus={};
  }
  start({force=false,scope='all',retryFailed=false}={}) {
    if(typeof retryFailed!=='boolean'||typeof force!=='boolean'||!['all','candidates','portfolio'].includes(scope))throw new Error('INVALID_MORNING_OPTIONS');
    if(this.active)throw new Error('MORNING_BUSY');
    const job={id:this.now().toISOString(),status:'RUNNING',scope,startedAt:this.now().toISOString()};
    this.active=job;
    this.controller=new AbortController();
    const completion=Promise.resolve().then(()=>withRequestSignal(this.controller.signal,()=>this.store.withLock(()=>this.execute({force,scope,retryFailed})))).then(result=>{
      this.lastJob={...job,status:result.status,completedAt:this.now().toISOString()};return result;
    }).catch(()=>{this.lastJob={...job,status:'FAILED',completedAt:this.now().toISOString(),error:'MORNING_RUN_FAILED'};throw new Error('MORNING_RUN_FAILED');}).finally(()=>{this.active=null;});
    completion.catch(()=>{});
    return {job:{...job},completion};
  }
  cancel(){this.controller?.abort();return {cancelRequested:Boolean(this.active)};}
  async status(){
    const date=seoulClock(this.now()).date;
    const persisted=await this.store.readProgress(date);
    return sanitizeDaily({date,active:this.active,lastJob:this.lastJob,agentStatus:this.active?this.agentStatus:persisted?.agentStatus||{},lastRun:await this.store.latest()});
  }
  async execute({force,scope,retryFailed=false}) {
    const now=this.now(),date=seoulClock(now).date;
    const tradingDay=isTradingDay(date);
    if(!tradingDay&&!force)return {date,status:'SKIPPED',reason:'NOT_TRADING_DAY'};
    const prior=await this.store.read(date);
    const scoped=await this.store.readScope(date,scope);
    if(scoped&&!force&&!(retryFailed&&['FAILED','PARTIAL'].includes(scoped.status)))return {...scoped,duplicateSkipped:true};
    const minute=seoulClock(now).minute,session=!tradingDay?'NON_TRADING_DAY':minute<540?'PRE_MARKET':minute<930?'INTRADAY':'POST_MARKET';
    const sourceTradingDate=session==='POST_MARKET'?date:previousTradingDate(date);
    const eventSourceDate=previousTradingDate(date);
    const report={version:MORNING_VERSION,engineVersion:MORNING_VERSION,runId:this.active?.id||now.toISOString(),tradingCalendarStatus:tradingCalendarHealth(now).status,tradingCalendar:tradingCalendarHealth(now),date,sourceTradingDate,session,tradingDay,scope,startedAt:now.toISOString(),completedAt:null,status:'RUNNING',
      marketRegime:'UNKNOWN',topCandidates:[],riskCandidates:[],portfolioExitStatus:[],newRiskCount:0,agentStatus:{},errors:[],stages:[],
      dataBasis:session==='INTRADAY'?'LATEST_QUOTE_WITH_CONFIRMED_HISTORY':'LAST_COMPLETED_SESSION',intradayStatus:!tradingDay?'MARKET_CLOSED':session==='INTRADAY'?'QUOTE_AVAILABLE_FLOW_UNCONFIRMED':session==='POST_MARKET'?'CLOSED_SESSION':'PRE_MARKET_DATA_NOT_AVAILABLE',calendar:tradingCalendarStatus(),
      automaticOrders:false,financialBasis:'Annual rule score; latest published interim/YTD and comparable TTM provided separately'};
    const status=this.agentStatus=Object.fromEntries(AGENTS.map(agent=>[agent,{agent,status:'PENDING',startedAt:null,completedAt:null,durationMs:0,error:null,successCount:0,failureCount:0,partialCount:0}]));
    report.agentStatus=status;
    const persist=async()=>{await this.store.progress(date,{date,runStatus:report.status,agentStatus:status,stages:report.stages});};
    const cached=retryFailed?await this.store.readState(date,'task-cache'):null;
    const cacheValid=cached&&cached.sourceTradingDate===sourceTradingDate&&cached.session===session&&session!=='INTRADAY'&&now-new Date(cached.startedAt)>=0&&now-new Date(cached.startedAt)<60*60000;
    const taskCache=cacheValid?cached:{sourceTradingDate,session,startedAt:now.toISOString(),results:{}};
    const reusable=new Set(['MarketAgent','NewsAgent','DARTAgent','ScreenerAgent','QuoteValidationAgent','FundamentalAgent','TechnicalAgent','FlowAgent']);
    report.reusedTasks=0;
    const run=async(agent,task,code=null)=>{
      checkCancelled();
      const st=status[agent],start=this.now();
      st.startedAt??=start.toISOString();st.status='RUNNING';await persist();
      try {
        const key=agent+':'+(code||'market');
        let value;
        if(cacheValid&&reusable.has(agent)&&Object.hasOwn(taskCache.results,key)){value=structuredClone(taskCache.results[key]);report.reusedTasks++;}
        else{value=await task();if(reusable.has(agent)&&value!==null&&value!==undefined&&value.dataStatus!=='PARTIAL'){taskCache.results[key]=value;await this.store.writeState(date,'task-cache',taskCache);}}
        st.successCount++;if(value?.dataStatus==='PARTIAL')st.partialCount++;return value;
      }
      catch {st.failureCount++;st.error=agent.toUpperCase()+'_FAILED';report.errors.push({agent,code,error:st.error});return null;}
      finally {st.completedAt=this.now().toISOString();st.durationMs+=Math.max(0,this.now()-start);st.status=st.failureCount?(st.successCount?'PARTIAL':'FAILED'):st.partialCount?'PARTIAL':'SUCCESS';await persist();}
    };
    const stage=async name=>{report.stages.push({stage:name,index:order.indexOf(name)+1,startedAt:this.now().toISOString()});await persist();};
    const data=new Map(),artifacts={};
    let market=null,screen=null,portfolio=[],candidates=[];
    const stock=code=>{if(!data.has(code))data.set(code,{});return data.get(code);};
    const loadCommon=async(code,name)=>{
      const d=stock(code);
      if(!Object.hasOwn(d,'disclosures'))d.disclosures=await run('DARTAgent',async()=>{
        const result=overnightDart(await this.deps.disclosures({code,sourceTradingDate:eventSourceDate,targetTradingDate:date}),eventSourceDate,date);
        if(!result.complete)throw new Error('DISCLOSURES_TRUNCATED');
        result.evidence=[];
        for(const event of (result.semantic?.negativeEvents||[]).slice(0,3)){
          if(!/^\d{14}$/.test(event.receiptNo||''))continue;
          try{result.evidence.push({status:'FETCHED',...await this.deps.evidence(event.receiptNo)});}
          catch{result.evidence.push({status:'UNAVAILABLE',receiptNo:event.receiptNo});result.dataStatus='PARTIAL';}
        }
        return result;
      },code);
      if(!Object.hasOwn(d,'news'))d.news=await run('NewsAgent',async()=>{
        const result=overnightNews(await this.deps.news({stockCode:code,corpName:name||code,lookbackDays:Math.max(1,Math.ceil((now-new Date(eventSourceDate+'T15:30:00+09:00'))/86400000)),maxItems:100}),eventSourceDate,now);
        if(result.truncated)throw new Error('NEWS_TRUNCATED');
        result.evidence=[];
        for(const event of (result.score?.highRiskEvents||[]).slice(0,3)){
          const item=result.items.find(x=>x.title===event.title);
          try{const evidence=await this.deps.newsEvidence({...item,corpName:name});result.evidence.push({title:event.title,...evidence});if(evidence.status!=='PRIMARY_TEXT_COMPANY_MATCH')result.dataStatus='PARTIAL';}
          catch{result.evidence.push({title:event.title,status:'ORIGINAL_UNAVAILABLE',factsVerified:false});result.dataStatus='PARTIAL';}
        }
        return result;
      },code);
    };
    try {
      await stage('COMMON_DATA');
      portfolio=await this.portfolio.read();
      const previous=await this.store.latest();
      market=await run('MarketAgent',async()=>{
        const m=await this.deps.market({endDate:sourceTradingDate.replaceAll('-','')});
        if(m?.score?.status!=='READY'||[m.kospi,m.kosdaq].some(x=>String(x?.latestDate).replaceAll('-','')!==sourceTradingDate.replaceAll('-','')))throw new Error('MARKET_STALE');
        return m;
      });
      report.marketRegime=market?.score?.regime||'UNKNOWN';
      // Prior known symbols can load overnight events before screening; newly discovered symbols load on demand.
      const known=new Map([...(scope!=='candidates'?portfolio.map(p=>[p.entry.stockCode,p.entry.corpName]):[]),
        ...(scope!=='portfolio'?(previous?.topCandidates||[]).slice(0,5).map(p=>[p.code,p.name]):[])]);
      for(const [code,name] of known)await loadCommon(code,name);
      await stage('SCREENER');
      if(scope!=='portfolio')screen=await run('ScreenerAgent',async()=>{
        const s=await this.deps.screen({exchange:'all',top:60,enrich:0,refresh:true});
        if(!s.top?.length)throw new Error('EMPTY_UNIVERSE');return s;
      });
      await stage('QUOTE_VALIDATION');
      const rows=(screen?.top||[]).slice(0,60);
      for(let i=0;i<Math.min(20,rows.length);i++){
        const q=await run('QuoteValidationAgent',async()=>{const value=await this.deps.quote(rows[i].code);if(typeof value?.price!=='number'||!Number.isFinite(value.price)||value.price<=0)throw new Error('QUOTE_PRICE_MISSING');return value;},rows[i].code);
        // Quotes enrich valuation only; confirmed historical close is loaded before any Entry/Exit decision.
        if(q&&typeof q.price==='number'&&q.price>0)rows[i]={...rows[i],quote:q,status:'QUOTE_VALIDATED'};
        else if(q){report.errors.push({agent:'QuoteValidationAgent',code:rows[i].code,error:'QUOTE_PRICE_MISSING'});}
      }
      candidates=rows.map(lightCandidate).sort((a,b)=>Number(Boolean(b.quote))-Number(Boolean(a.quote))||b.finalScore-a.finalScore);
      const selected=candidates.filter(c=>c.quote).slice(0,5);
      report.pipeline={scanned:screen?.scanned||0,candidatePool:rows.length,quoteRequested:Math.min(20,rows.length),quoteValidated:rows.filter(r=>r.quote).length,deepRequested:selected.length};
      const targets=new Map(selected.map(c=>[c.code,{code:c.code,name:c.name,quote:c.quote}]));
      if(scope!=='candidates')for(const p of portfolio)if(!targets.has(p.entry.stockCode))targets.set(p.entry.stockCode,{code:p.entry.stockCode,name:p.entry.corpName});
      await stage('DEEP_ANALYSIS');
      for(const t of targets.values()){
        await loadCommon(t.code,t.name);const d=stock(t.code);
        d.dart=await run('FundamentalAgent',async()=>{
          const x=await this.deps.dart({stockCode:t.code,businessYear:String(Number(date.slice(0,4))-1),reportCode:'11011',fsDiv:'CFS',latest:true,asOf:now});
          if(!x.financials?.validation?.ok)throw new Error('FUNDAMENTAL_INCOMPLETE');return x;
        },t.code);
        d.technical=await run('TechnicalAgent',async()=>{
          const quote=t.quote||await this.deps.quote(t.code);
          const chart=await this.deps.chart({stockCode:t.code,endDate:sourceTradingDate.replaceAll('-',''),minRows:130,maxPages:3});
          return technicalData(chart,quote,sourceTradingDate,{session,now});
        },t.code);
        d.flow=await run('FlowAgent',async()=>flowData(await this.deps.flow(t.code),sourceTradingDate),t.code);
        d.valuation=await run('ValuationAgent',()=>valuationData(d.technical,d.dart),t.code);
        if(d.valuation)d.valuation.sectorRelative=comparePeers({code:t.code,sector:rows.find(r=>r.code===t.code)?.industryLarge,quote:d.technical?.quote,rows});
      }
      await stage('RISK');
      for(const t of targets.values())stock(t.code).risk=await run('RiskAgent',()=>riskData(stock(t.code),market),t.code);
      await stage('BEAR');
      for(const t of targets.values())stock(t.code).bear=await run('BearAgent',()=>bearData(stock(t.code),market),t.code);
      await stage('COMMITTEE');
      for(const t of targets.values())stock(t.code).committee=await run('InvestmentCommittee',()=>committeeData(stock(t.code),market),t.code);
      await stage('ENTRY');
      if(scope!=='portfolio') {
        for(let i=0;i<candidates.length;i++){
          const c=candidates[i],d=data.get(c.code);
          if(d?.committee) {
            const analysis={committee:d.committee,dart:d.dart,analyzedAt:this.now().toISOString(),
              completeness:{percent:d.risk?.incomplete.length?0:100},marketData:{quote:d.technical?.quote,technicalMetrics:d.technical?.technicalMetrics},indicators:d.valuation?.indicators};
            candidates[i]=applyDeep(c,analysis);
          }
        }
        candidates=rankCandidatesForOperationalView(candidates.map(c=>({...c,finalState:finalState(c)})));
        report.topCandidates=await run('EntryAgent',()=>selectDiversifiedCandidates(candidates,{top:5,maxPerSector:3}).selected.map(c=>{
          const d=data.get(c.code),committee=d?.committee;
          return {code:c.code,name:c.name,rankingScore:c.rankingScore??c.finalScore,validationLevel:c.validationLevel,
            status:committee?.status||'WATCH',entryState:committee?.hardStop||committee?.status==='RISK'?'EXCLUDED':
              committee?.status==='CONDITION_MET'?'CONDITION_MET':committee?.status==='INTEREST'?'INTEREST':'WATCH',
            financialBasis:d?.dart?.latestFinancials?.basis||null,ttm:d?.dart?.latestFinancials?.ttm||null,sectorRelative:d?.valuation?.sectorRelative||null,
            committee:committee||null,price:d?.technical?.quote?.price??null,sourceTradingDate,
            risk:d?.risk||{level:'HIGH',incomplete:['DEEP_VALIDATION_NOT_PERFORMED']},
            reasons:committee?.positiveReasons||c.reasons||[],automaticBuy:false};
        }))||[];
        report.riskCandidates=candidates.filter(c=>['RISK_EXCLUDED','VERIFIED_RISK'].includes(c.finalState)).map(c=>({code:c.code,name:c.name,committee:data.get(c.code)?.committee,risk:data.get(c.code)?.risk}));
      } else {
        report.topCandidates=prior?.topCandidates||[];report.riskCandidates=prior?.riskCandidates||[];
        report.candidatesCarriedFrom=prior?.completedAt||null;
      }
      await stage('EXIT');
      if(scope!=='candidates')for(const p of portfolio){
        const result=await run('ExitAgent',()=>exitData(p.entry,data.get(p.entry.stockCode),market,this.now()),p.entry.stockCode);
        report.portfolioExitStatus.push(result||{stockCode:p.entry.stockCode,status:'WATCH',exitPressure:null,pnlPct:null,dataStatus:'FAILED'});
      } else {report.portfolioExitStatus=prior?.portfolioExitStatus||[];report.portfolioCarriedFrom=prior?.completedAt||null;}
      report.newRiskCount=[...data.values()].filter(d=>d.risk?.newRisk).length;
      report.pipeline.deepCompleted=selected.filter(c=>data.get(c.code)?.committee&&data.get(c.code)?.risk?.incomplete.length===0).length;
      artifacts.market=market;artifacts.disclosures=Object.fromEntries([...data].map(([c,d])=>[c,d.disclosures]));
      artifacts.news=Object.fromEntries([...data].map(([c,d])=>[c,d.news]));
      artifacts.candidates=candidates;artifacts.committee=Object.fromEntries([...data].map(([c,d])=>[c,d.committee]));
      artifacts.entry=report.topCandidates;artifacts.exit=report.portfolioExitStatus;
      artifacts.analysis=Object.fromEntries(data);
      report.status=report.errors.length||Object.values(status).some(x=>x.status==='PARTIAL')?'PARTIAL':'SUCCESS';
      if(scope!=='portfolio'&&!report.topCandidates.length)report.status='FAILED';
    } catch {
      report.errors.push({agent:'Orchestrator',error:this.controller?.signal.aborted?'MORNING_CANCELLED':'MORNING_STAGE_FAILED'});report.status=this.controller?.signal.aborted?'CANCELLED':'FAILED';
    }
    for(const st of Object.values(status))if(st.status==='PENDING')st.status='SKIPPED';
    await stage('REPORT');
    report.completedAt=this.now().toISOString();
    await persist();
    return this.store.save(report,artifacts);
  }
}
