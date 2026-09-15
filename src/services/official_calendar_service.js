import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {officialCalendar} from './trading_day_service.js';
import {createLogger} from './log_service.js';
import {providerFetch} from './request_context.js';
export const KRX_CALENDAR_URL='https://open.krx.co.kr/contents/MKD/01/0110/01100305/MKD01100305.jsp';
export async function syncOfficialCalendar({year=Number(new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Seoul'}).slice(0,4)),file=process.env.KSTOCK_CALENDAR_FILE||'.data/calendar/krx.json',fetcher=providerFetch,logger=createLogger()}={}){
  if(!Number.isInteger(year)||year<2000||year>2100)throw new Error('INVALID_CALENDAR_YEAR');
  let status=null,stage='OTP',errorType=null;
  const request=async(url,options)=>{status=null;const response=await fetcher(url,options);status=response.status;return response;};
  try {
  const headers={Referer:KRX_CALENDAR_URL};
  const otp=await request('https://open.krx.co.kr/contents/COM/GenerateOTP.jspx?'+new URLSearchParams({name:'form',bld:'MKD/01/0110/01100305/mkd01100305_01'}),{headers});
  if(!otp.ok)throw new Error('KRX_CALENDAR_UNAVAILABLE');
  const code=await otp.text();if(code.length>2000||!code.trim()||code.trim().startsWith('<'))throw new Error('KRX_CALENDAR_INVALID');
  stage='CALENDAR';
  const response=await request('https://open.krx.co.kr/contents/OPN/99/OPN99000001.jspx',{method:'POST',headers:{...headers,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,search_bas_yy:String(year),gridTp:'KRX'})});
  if(!response.ok)throw new Error('KRX_CALENDAR_UNAVAILABLE');
  const body=await response.json(),rows=body.block1;
  if(!Array.isArray(rows)||rows.length<5||rows.length>80||rows.some(r=>!new RegExp('^'+year+'-\\d{2}-\\d{2}$').test(r.calnd_dd)||!Number.isFinite(Date.parse(r.calnd_dd))||new Date(r.calnd_dd).toISOString().slice(0,10)!==r.calnd_dd))throw new Error('KRX_CALENDAR_INVALID');
  const value={source:'KRX',sourceUrl:KRX_CALENDAR_URL,year,retrievedAt:new Date().toISOString(),closures:rows.map(r=>({date:r.calnd_dd,name:String(r.holdy_nm||'')}))};
  await fs.mkdir(path.dirname(file),{recursive:true});const tmp=file+'.'+randomUUID()+'.tmp';await fs.writeFile(tmp,JSON.stringify(value,null,2));await fs.rename(tmp,file);
  await record({provider:'KRX',urlHost:'open.krx.co.kr',status,errorType:null,fallbackUsed:false,lastSuccessfulSyncAt:value.retrievedAt,calendarStatus:'READY',stage});
  return value;
  } catch(error) {
    const code=error?.cause?.code||error?.code||'';
    errorType=status!==null&&status>=400?'HTTP_ERROR':error.name==='TimeoutError'||code.includes('TIMEOUT')?'TIMEOUT':error.name==='AbortError'?'ABORTED':['ENOTFOUND','EAI_AGAIN'].includes(code)?'DNS_ERROR':/CERT|TLS|SSL/.test(code)?'TLS_ERROR':error.name==='SyntaxError'||error.message==='KRX_CALENDAR_INVALID'?'RESPONSE_FORMAT':status===null?'NETWORK_ERROR':'SYNC_ERROR';
    const cache=officialCalendar(file);
    const valid=cache?.source==='KRX'&&Array.isArray(cache.closures)&&Number.isFinite(Date.parse(cache.retrievedAt));
    const stale=valid&&(cache.year!==year||Date.now()-Date.parse(cache.retrievedAt)>7*86400000);
    const details={provider:'KRX',urlHost:'open.krx.co.kr',status,errorType,fallbackUsed:true,lastSuccessfulSyncAt:valid?cache.retrievedAt:null,calendarStatus:valid?(stale?'STALE':'FALLBACK'):'FAILED',stage};
    await record(details);
    throw Object.assign(new Error('KRX_CALENDAR_SYNC_FAILED'),{details});
  }
  async function record(details){
    const value={at:new Date().toISOString(),...details};
    try{await fs.mkdir(path.dirname(file),{recursive:true});const tmp=file+'.sync-status.'+randomUUID()+'.tmp';await fs.writeFile(tmp,JSON.stringify(value));await fs.rename(tmp,file+'.sync-status.json');}catch{logger.warn('KRX_CALENDAR_STATUS_WRITE_FAILED');}
    logger[details.errorType?'warn':'info'](details.errorType?'KRX_CALENDAR_SYNC_FAILED':'KRX_CALENDAR_SYNC_SUCCESS',details);
  }
}
