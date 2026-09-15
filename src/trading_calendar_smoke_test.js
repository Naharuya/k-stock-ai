import assert from 'node:assert/strict';
import {assertDate,isTradingDay,nextTradingDate,previousTradingDate,latestTradingDate,tradingCalendarStatus} from './services/trading_day_service.js';
import {createDailyScheduler} from './services/daily_scheduler.js';
import {DailyTradingService} from './services/daily_trading_service.js';
const calendarOriginal=process.env.KSTOCK_CALENDAR_FILE;process.env.KSTOCK_CALENDAR_FILE='tmp/calendar-fixture-missing.json';
const original=process.env.KSTOCK_MARKET_CLOSED_DATES;
try {
 delete process.env.KSTOCK_MARKET_CLOSED_DATES;
 assert.equal(tradingCalendarStatus(),'WEEKDAYS_ONLY');
 for(const date of ['2026-02-30','2026-13-01','invalid',null])assert.throws(()=>assertDate(date),/INVALID_TRADING_DATE/);
 // Synthetic closures, not official market dates.
 process.env.KSTOCK_MARKET_CLOSED_DATES='2026-09-14, 2026-09-15,2026-09-14';
 assert.equal(nextTradingDate('2026-09-11'),'2026-09-16');
 assert.equal(previousTradingDate('2026-09-16'),'2026-09-11');
 assert.equal(latestTradingDate('2026-09-15'),'2026-09-11');
 let now=new Date('2026-09-11T16:00:00+09:00'),calls=0;
 const saved=new Map();
 const service=new DailyTradingService({now:()=>now,store:{
  read:async(k,d)=>saved.get(k+d)||null,write:async(k,d,r)=>{saved.set(k+d,r);return r;}},
  engine:async()=>({top:[{code:'005930',validationLevel:'LIGHT'}]}),
  preValidator:async source=>({...source,diagnostics:{},errors:[]})});
 const record=await service.afterMarket();
 assert.equal(record.targetTradingDate,'2026-09-16');
 assert.equal(record.diagnostics.calendar,'CONFIGURED_CLOSURES');
 now=new Date('2026-09-14T08:30:00+09:00');
 assert.equal((await service.tomorrow()).sourceTradingDate,'2026-09-11');
 await assert.rejects(service.afterMarket(),/NOT_TRADING_DAY/);
 await assert.rejects(service.preMarket(),/NOT_TRADING_DAY/);
 const scheduler=createDailyScheduler({active:null,store:{read:async()=>null},start(){calls++;return {completion:Promise.resolve()};}},
 {env:{KSTOCK_DAILY_AGENT_ENABLED:'true'},now:()=>now});
 await scheduler.tick();assert.equal(calls,0);
 now=new Date('2026-09-16T08:30:00+09:00');
 assert.equal((await service.preMarket()).sourceTradingDate,'2026-09-11');
 await scheduler.tick();assert.equal(calls,1);
 process.env.KSTOCK_MARKET_CLOSED_DATES='2026-02-30';
 assert.throws(()=>nextTradingDate('2026-09-11'),/INVALID_MARKET_CLOSED_DATES/);
 await scheduler.tick();assert.equal(scheduler.status().lastError.error,'INVALID_MARKET_CLOSED_DATES');
 assert.equal(calls,1);
 process.env.KSTOCK_MARKET_CLOSED_DATES='2026-12-31,2027-01-01';
 assert.equal(nextTradingDate('2026-12-30'),'2027-01-04');
 assert.equal(previousTradingDate('2027-01-04'),'2026-12-30');
 process.env.KSTOCK_MARKET_CLOSED_DATES='';
 assert.equal(isTradingDay('2026-09-14'),true);
} finally {
 if(calendarOriginal===undefined)delete process.env.KSTOCK_CALENDAR_FILE;else process.env.KSTOCK_CALENDAR_FILE=calendarOriginal;
 if(original===undefined)delete process.env.KSTOCK_MARKET_CLOSED_DATES;
 else process.env.KSTOCK_MARKET_CLOSED_DATES=original;
}
console.log('Offline calendar: closures, year boundary, invalid settings, daily pipeline and scheduler passed');

await import('./calendar_sync_smoke_test.js');
