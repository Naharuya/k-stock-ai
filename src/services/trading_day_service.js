import fs from 'node:fs';
export function officialCalendar(file=process.env.KSTOCK_CALENDAR_FILE||'.data/calendar/krx.json'){
  try{const r=JSON.parse(fs.readFileSync(file,'utf8'));
    if(!Number.isInteger(r.year)||r.source!=='KRX'||!Array.isArray(r.closures)||!Number.isFinite(Date.parse(r.retrievedAt)))return null;
    r.closures.forEach(x=>{assertDate(x.date);if(!x.date.startsWith(r.year+'-'))throw new Error('INVALID_CALENDAR_YEAR');});return r;
  }catch{return null;}
}
export const TIMEZONE = 'Asia/Seoul';
export function assertDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      (!Number.isFinite(new Date(value + 'T00:00:00Z').getTime()) || new Date(value + 'T00:00:00Z').toISOString().slice(0,10) !== value)) throw new Error('INVALID_TRADING_DATE');
  return value;
}
export function seoulClock(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE, year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', hourCycle:'h23'
  }).formatToParts(now).map(x=>[x.type,x.value]));
  return { date:parts.year+'-'+parts.month+'-'+parts.day, minute:Number(parts.hour)*60+Number(parts.minute) };
}
let cachedClosures;
let cachedValue;
function configuredClosures() {
  const value = process.env.KSTOCK_MARKET_CLOSED_DATES ?? '';
  if (cachedClosures && value === cachedValue) return cachedClosures;
  const dates = value.trim() ? value.split(',').map(date => date.trim()) : [];
  try { dates.forEach(assertDate); } catch { throw new Error('INVALID_MARKET_CLOSED_DATES'); }
  cachedClosures = new Set(dates);
  cachedValue = value;
  return cachedClosures;
}
export function tradingCalendarStatus() {
  const official=officialCalendar();return official?'KRX_OFFICIAL_'+official.year+(Date.now()-Date.parse(official.retrievedAt)>7*86400000?'_STALE':''):configuredClosures().size?'CONFIGURED_CLOSURES':'WEEKDAYS_ONLY';
}
export function isTradingDay(date) {
  const day = new Date(assertDate(date)+'T00:00:00Z').getUTCDay();
  const closures = configuredClosures();
  return day !== 0 && day !== 6 && !closures.has(date)&&!officialCalendar()?.closures.some(x=>x.date===date);
}
function shift(date, direction) {
  const d = new Date(assertDate(date)+'T00:00:00Z');
  do { d.setUTCDate(d.getUTCDate()+direction); } while (!isTradingDay(d.toISOString().slice(0,10)));
  return d.toISOString().slice(0,10);
}
export const nextTradingDate = date => shift(date,1);
export const previousTradingDate = date => shift(date,-1);
export const latestTradingDate = date => isTradingDay(date) ? date : previousTradingDate(date);
export const marketCloseAt = date => new Date(assertDate(date)+'T15:30:00+09:00');

// Availability is separate from the legacy calendar source label.
export function tradingCalendarHealth(now=new Date()) {
  const cache=officialCalendar();let sync=null;
  try{sync=JSON.parse(fs.readFileSync((process.env.KSTOCK_CALENDAR_FILE||'.data/calendar/krx.json')+'.sync-status.json','utf8'));}catch{}
  const lastSuccessfulSyncAt=cache?.retrievedAt||null;
  const stale=cache&&(cache.year!==Number(seoulClock(now).date.slice(0,4))||now-Date.parse(cache.retrievedAt)>7*86400000||Date.parse(cache.retrievedAt)>+now);
  const failed=sync?.errorType&&(!cache||Date.parse(sync.at)>=Date.parse(cache.retrievedAt));
  const status=cache?(stale?'STALE':failed?'FALLBACK':'READY'):configuredClosures().size?'FALLBACK':'FAILED';
  return {status,provider:'KRX',fallbackUsed:status!=='READY',lastSuccessfulSyncAt,coverageYear:cache?.year||null,basis:cache?'CACHED_KRX':configuredClosures().size?'CONFIGURED_CLOSURES':'WEEKDAYS_ONLY'};
}
