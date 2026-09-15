import {seoulClock,isTradingDay,nextTradingDate,tradingCalendarHealth} from './trading_day_service.js';
export function morningConfig(env=process.env){
  const hour=Number(env.KSTOCK_DAILY_ORCHESTRATOR_HOUR??7),minute=Number(env.KSTOCK_DAILY_ORCHESTRATOR_MINUTE??0);
  const timezone=env.KSTOCK_TIMEZONE||'Asia/Seoul';
  if(!Number.isInteger(hour)||hour<0||hour>23||!Number.isInteger(minute)||minute<0||minute>59||timezone!=='Asia/Seoul')throw new Error('INVALID_MORNING_SCHEDULE');
  return {enabled:env.KSTOCK_DAILY_ORCHESTRATOR_ENABLED==='true',hour,minute,timezone};
}
export function createMorningScheduler(service,{env=process.env,now=()=>new Date(),setTimer=setInterval,clearTimer=clearInterval}={}){
  let config,error=null;
  try{config=morningConfig(env);}catch{config={enabled:false,timezone:'Asia/Seoul'};error='INVALID_MORNING_SCHEDULE';}
  let timer=null,ticking=false,lastAttemptDate=null,memory={},lastRunAt=null,lastRunStatus=null,lastRunId=null,latestReport=null;
  async function refreshStatus(){
    latestReport=await service.store.latest?.()||latestReport;
    if(latestReport){lastRunAt=latestReport.startedAt||null;lastRunStatus=latestReport.status;lastRunId=latestReport.runId||latestReport.startedAt||null;}
    const date=seoulClock(now()).date;
    const state=await service.store.readState?.(date,'scheduler');
    if(state){memory[date]=state;if(state.lastAttemptAt&&(!lastRunAt||state.lastAttemptAt>=lastRunAt)){lastRunAt=state.lastAttemptAt;lastRunStatus=state.status||'RUNNING';lastRunId=state.runId||state.lastAttemptAt;}}
  }
  function nextRunAt(){
    if(!config.enabled)return null;
    const clock=seoulClock(now());let date=clock.date;
    const state=memory[date];
    const complete=latestReport?.date===date&&(latestReport.scope||'all')==='all'&&['SUCCESS','CANCELLED'].includes(latestReport.status);
    if(!isTradingDay(date)||complete||state?.attempts>=3||service.active)date=nextTradingDate(date);
    const scheduled=new Date(date+'T'+String(config.hour).padStart(2,'0')+':'+String(config.minute).padStart(2,'0')+':00+09:00');
    return new Date(Math.max(+scheduled,+now(),date===clock.date?state?.nextAttemptAt||0:0)).toISOString();
  }
  async function attempt(){
    if(service.active)return;
    const clock=seoulClock(now());
    if(!isTradingDay(clock.date)||clock.minute<config.hour*60+config.minute)return;
    const saved=service.store.readScope?await service.store.readScope(clock.date,'all'):await service.store.read(clock.date);
    if(['SUCCESS','CANCELLED'].includes(saved?.status)){lastAttemptDate=clock.date;error=null;return;}
    const state=await service.store.readState?.(clock.date,'scheduler')||memory[clock.date]||{attempts:0};
    if(state.attempts>=3||state.nextAttemptAt>Date.parse(now()))return;
    state.attempts++;state.status='RUNNING';state.lastAttemptAt=now().toISOString();lastRunAt=state.lastAttemptAt;lastRunStatus='RUNNING';state.nextAttemptAt=Date.parse(now())+15*60000*state.attempts;
    memory[clock.date]=state;lastAttemptDate=clock.date;
    await service.store.writeState?.(clock.date,'scheduler',state);
    try{
      // The orchestrator checks completion again under its run lock, including manual runs.
      const run=service.start({force:false,scope:'all',retryFailed:true});
      state.runId=run.job?.id||state.lastAttemptAt;lastRunId=state.runId;
      await service.store.writeState?.(clock.date,'scheduler',state);
      const result=await run.completion;
      latestReport=result||latestReport;
      state.status=result?.status||'FAILED';error=['SUCCESS','CANCELLED'].includes(state.status)?null:'MORNING_SCHEDULE_INCOMPLETE';
    }catch{state.status='FAILED';error='MORNING_SCHEDULE_FAILED';}
    lastRunStatus=state.status;
    state.completedAt=now().toISOString();
    state.nextAttemptAt=Date.parse(now())+15*60000*state.attempts;
    await service.store.writeState?.(clock.date,'scheduler',state);
    await service.store.writeState?.(clock.date,'notification',{kind:'MORNING_COMPLETED',status:state.status,at:state.completedAt,attempt:state.attempts});
  }
  async function tick(){
    if(!config.enabled||ticking||service.active)return;
    ticking=true;
    try{
      await refreshStatus();
      // Serialize the persisted attempt budget as well as execution across server processes.
      if(service.store.withLock)await service.store.withLock(attempt,'scheduler');
      else await attempt();
    }catch(e){if(e.message!=='MORNING_BUSY')error='MORNING_SCHEDULE_FAILED';}
    finally{ticking=false;}
  }
  return {tick,refreshStatus,start(){if(!config.enabled||timer)return;timer=setTimer(()=>{void tick();},30000);timer.unref?.();void tick();},
    stop(){if(timer)clearTimer(timer);timer=null;},status(){return {...config,running:Boolean(timer),error,lastAttemptDate,nextRunAt:nextRunAt(),lastRunAt,lastRunStatus,lastRunId,tradingCalendar:tradingCalendarHealth(now()),days:'TRADING_DAYS',catchUp:'ON_START_AFTER_SCHEDULE',retry:'UP_TO_3_ATTEMPTS_WITH_BACKOFF'};}};
}
