import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {syncOfficialCalendar} from './services/official_calendar_service.js';
import {tradingCalendarHealth,isTradingDay} from './services/trading_day_service.js';
import {createLogger} from './services/log_service.js';
const root=await fs.mkdtemp(path.join(os.tmpdir(),'kstock-calendar-sync-'));
const file=path.join(root,'krx.json'),old=process.env.KSTOCK_CALENDAR_FILE,closed=process.env.KSTOCK_MARKET_CLOSED_DATES;
process.env.KSTOCK_CALENDAR_FILE=file;delete process.env.KSTOCK_MARKET_CLOSED_DATES;
let output='';const logger=createLogger({root:path.join(root,'logs'),sink:{write:s=>output+=s},errorSink:{write:s=>output+=s}});
const year=new Date().getFullYear(),cache={source:'KRX',year,retrievedAt:new Date().toISOString(),closures:[{date:'2026-09-14',name:'fixture'}]};
try{
  assert.equal(tradingCalendarHealth().status,'FAILED');
  await fs.writeFile(file,JSON.stringify(cache));const original=await fs.readFile(file,'utf8');
  assert.equal(tradingCalendarHealth().status,'READY');
  for(const [type,fetcher] of [
    ['HTTP_ERROR',async()=>new Response('not found',{status:404})],
    ['TIMEOUT',async()=>{throw new DOMException('hidden','TimeoutError')}],
    ['DNS_ERROR',async()=>{throw Object.assign(new Error('hidden'),{cause:{code:'ENOTFOUND'}})}],
    ['TLS_ERROR',async()=>{throw Object.assign(new Error('hidden'),{cause:{code:'CERT_HAS_EXPIRED'}})}],
    ['RESPONSE_FORMAT',async()=>new Response('<html>invalid</html>')]
  ]){
    await assert.rejects(syncOfficialCalendar({year,file,fetcher,logger}),e=>e.details.errorType===type&&e.details.fallbackUsed);
    assert.equal(await fs.readFile(file,'utf8'),original,'Failed sync must preserve successful cache byte-for-byte');
    assert.equal(tradingCalendarHealth().status,'FALLBACK');
  }
  assert.equal(isTradingDay('2026-09-13'),false);assert.equal(isTradingDay('2026-09-14'),false);
  await fs.writeFile(file,JSON.stringify({...cache,retrievedAt:new Date(Date.now()-8*86400000).toISOString()}));
  assert.equal(tradingCalendarHealth().status,'STALE');
  await fs.writeFile(file,JSON.stringify({...cache,year:year-1,closures:[]}));assert.equal(tradingCalendarHealth().status,'STALE');
  let count=0;await syncOfficialCalendar({year,file,logger,fetcher:async()=>++count===1?new Response('fixture-code'):Response.json({block1:Array.from({length:5},(_,i)=>({calnd_dd:year+'-01-0'+(i+1),holdy_nm:'fixture'}))})});
  assert.equal(tradingCalendarHealth().status,'READY');
  assert.equal(output.includes('hidden'),false);const rows=output.trim().split('\n').map(JSON.parse);
  assert.equal(rows[0].status,404);assert.equal(rows[0].urlHost,'open.krx.co.kr');assert.ok(rows[0].lastSuccessfulSyncAt);
  console.log('Calendar sync offline PASS: 404/DNS/TLS/timeout/format classification, cache preservation, READY/FALLBACK/STALE/FAILED, weekends, recovery, safe structured logs.');
}finally{
  if(old===undefined)delete process.env.KSTOCK_CALENDAR_FILE;else process.env.KSTOCK_CALENDAR_FILE=old;
  if(closed===undefined)delete process.env.KSTOCK_MARKET_CLOSED_DATES;else process.env.KSTOCK_MARKET_CLOSED_DATES=closed;
  assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep));await fs.rm(root,{recursive:true,force:true});
}
