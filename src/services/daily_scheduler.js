import { isTradingDay, seoulClock } from './trading_day_service.js';

function setting(env,key,fallback,max) {
  const value=env[key]===undefined?fallback:Number(env[key]);
  if(!Number.isInteger(value)||value<0||value>max)throw new Error('INVALID_SCHEDULER_TIME');
  return value;
}
export function schedulerConfig(env=process.env) {
  const config={enabled:env.KSTOCK_DAILY_AGENT_ENABLED==='true',timezone:'Asia/Seoul',
    afterHour:setting(env,'KSTOCK_AFTER_MARKET_HOUR',15,23),afterMinute:setting(env,'KSTOCK_AFTER_MARKET_MINUTE',40,59),
    preHour:setting(env,'KSTOCK_PRE_MARKET_HOUR',8,23),preMinute:setting(env,'KSTOCK_PRE_MARKET_MINUTE',30,59)};
  if(config.preHour>=9 || config.afterHour*60+config.afterMinute<15*60+30)throw new Error('INVALID_SCHEDULER_TIME');
  return config;
}
export function createDailyScheduler(service,{env=process.env,now=()=>new Date()}={}) {
  let config,configError=null;
  try {config=schedulerConfig(env);} catch {config={enabled:false,timezone:'Asia/Seoul'};configError='INVALID_SCHEDULER_TIME';}
  const attempts=new Map();
  let timer=null,ticking=false,lastError=null;
  async function tick() {
    if(!config.enabled||ticking||service.active)return;
    ticking=true;
    try {
      const clock=seoulClock(now());
      if(!isTradingDay(clock.date))return;
      const jobs=[];
      if(clock.minute>=config.preHour*60+config.preMinute && clock.minute<9*60)jobs.push('pre-market');
      if(clock.minute>=config.afterHour*60+config.afterMinute)jobs.push('after-market');
      for(const kind of jobs) {
        if(service.active)break;
        const key=clock.date+':'+kind;
        const attempted=attempts.get(key);
        if(attempted && now().getTime()-attempted.time<15*60*1000)continue;
        if(attempted?.count>=3)continue;
        const existing=await service.store.read(kind,clock.date);
        // An intraday manual preview must not suppress the scheduled post-close run.
        if(existing && !(kind==='after-market'&&existing.diagnostics?.manualBeforeClose))continue;
        attempts.set(key,{time:now().getTime(),count:(attempted?.count||0)+1});
        const {completion}=service.start(kind);
        try {await completion;lastError=null;} catch(error) {lastError={kind,error:error.message,at:now().toISOString()};}
      }
      for(const key of attempts.keys())if(!key.startsWith(clock.date))attempts.delete(key);
    } catch(error) {lastError={error:error.message==='INVALID_MARKET_CLOSED_DATES'?error.message:'SCHEDULER_CHECK_FAILED',at:now().toISOString()};}
    finally {ticking=false;}
  }
  return {tick,
    start(){if(!config.enabled||timer)return;timer=setInterval(()=>{void tick();},30000);timer.unref();void tick();},
    stop(){if(timer)clearInterval(timer);timer=null;},
    status(){return {...config,configError,lastError,running:Boolean(timer),catchUp:'PRE_BEFORE_09:00_AFTER_UNTIL_MIDNIGHT',retry:'15 minutes, maximum 3 attempts per process/day'};}
  };
}
