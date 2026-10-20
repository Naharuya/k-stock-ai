import {replaySwing} from './swing_replay.js';
import {readFile,readdir,stat,mkdir,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {createKisRequest} from '../services/kis_request.js';
import {evaluateSwing,SWING_POLICY} from './swing_strategy.js';
export const TRADING_CATALOG=Object.freeze([
 {market:'KR',symbol:'005930',name:'삼성전자',exchange:'KRX',currency:'KRW'},
 {market:'KR',symbol:'000660',name:'SK하이닉스',exchange:'KRX',currency:'KRW'},
 {market:'KR',symbol:'035420',name:'NAVER',exchange:'KRX',currency:'KRW'},
 {market:'KR',symbol:'035720',name:'카카오',exchange:'KRX',currency:'KRW'},
 {market:'US',symbol:'AAPL',name:'Apple',exchange:'NAS',currency:'USD'},
 {market:'US',symbol:'MSFT',name:'Microsoft',exchange:'NAS',currency:'USD'},
 {market:'US',symbol:'NVDA',name:'NVIDIA',exchange:'NAS',currency:'USD'},
 {market:'US',symbol:'AMZN',name:'Amazon',exchange:'NAS',currency:'USD'}
].map(Object.freeze));
export function workspaceInstrument({market,symbol,exchange}={}){
 if(!['KR','US'].includes(market)||typeof symbol!=='string'||!(market==='KR'?/^[0-9][A-Z0-9]{5}$/:/^[A-Z][A-Z0-9.]{0,9}$/).test(symbol))throw Error('INSTRUMENT_INVALID');
 const known=TRADING_CATALOG.find(c=>c.market===market&&c.symbol===symbol);
 if(market==='US'&&!['NAS','NYS','AMS'].includes(exchange||known?.exchange))throw Error('EXCHANGE_REQUIRED');
 return {...(known||{market,symbol,name:symbol,currency:market==='KR'?'KRW':'USD'}),exchange:market==='KR'?'KRX':exchange||known.exchange};
}
const day=value=>typeof value==='string'&&/^\d{8}$/.test(value)&&Number.isFinite(Date.parse(`${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}`))&&new Date(`${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}`).toISOString().slice(0,10).replaceAll('-','')===value;
const number=x=>typeof x==='number'?x:typeof x==='string'&&/^\d+(?:\.\d+)?$/.test(x)?Number(x):NaN;
export function parseWorkspaceHistory(response,instrument,{asOf,through}={}){
 if(response?.rt_cd!=='0'||!Array.isArray(response.output2)||!response.output2.length||response.output2.length>100)throw Error('PROVIDER_RESPONSE_UNAVAILABLE');
 if(instrument.market==='US'&&response.output1?.rsym!==`D${instrument.exchange}${instrument.symbol}`)throw Error('PROVIDER_IDENTITY_MISMATCH');
 const seen=new Set(),rows=[];
 for(const r of response.output2){
  const date=instrument.market==='KR'?r.stck_bsop_date:r.xymd;if(!date)continue;
  if(!day(date)||date>through)throw Error('PROVIDER_DATE_INVALID');
  const keys=instrument.market==='KR'?['stck_oprc','stck_hgpr','stck_lwpr','stck_clpr','acml_vol']:['open','high','low','clos','tvol'];
  const [open,high,low,close,volume]=keys.map(k=>number(r[k]));
  if(![open,high,low,close].every(n=>Number.isFinite(n)&&n>0)||!Number.isSafeInteger(volume)||volume<0||low>Math.min(open,close)||high<Math.max(open,close)||low>high||seen.has(date))throw Error('PROVIDER_BAR_INVALID');
  seen.add(date);rows.push({date:`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`,open,high,low,close,volume});
 }
 rows.sort((a,b)=>a.date.localeCompare(b.date));if(!rows.length)throw Error('PROVIDER_HISTORY_EMPTY');
 return {bars:rows,receivedAt:asOf,priceAsOf:rows.at(-1).date,priceType:'PROVIDER_ADJUSTED_DAILY_CLOSE',source:'KIS',sourceHash:createHash('sha256').update(JSON.stringify(response)).digest('hex'),quality:'OBSERVED_NOT_INDEPENDENTLY_VERIFIED',timeZone:instrument.market==='KR'?'Asia/Seoul':'America/New_York',sourceUrl:instrument.market==='KR'?'https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/inquire_daily_itemchartprice':'https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock/dailyprice'};
}
export function validWorkspaceSnapshot(value,id,at){
 if(value?.instrumentKey!==id||value.source!=='KIS'||!/^[a-f0-9]{64}$/.test(value.sourceHash||'')||value.priceType!=='PROVIDER_ADJUSTED_DAILY_CLOSE'||!Number.isFinite(Date.parse(value.receivedAt))||Date.parse(value.receivedAt)>at||!Array.isArray(value.bars)||!value.bars.length||value.bars.length>100)return false;
 return value.priceAsOf===value.bars.at(-1)?.date&&value.bars.every((r,i)=>typeof r?.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&Number.isFinite(Date.parse(r.date))&&new Date(r.date).toISOString().slice(0,10)===r.date&&Date.parse(r.date)<=Date.parse(value.receivedAt)&&['open','high','low','close'].every(k=>Number.isFinite(r[k])&&r[k]>0)&&Number.isSafeInteger(r.volume)&&r.volume>=0&&r.low<=Math.min(r.open,r.close)&&r.high>=Math.max(r.open,r.close)&&r.low<=r.high&&(!i||value.bars[i-1].date<r.date));
}
export function workspaceScenario(snapshot,instrument,asOf,holding=null){
 const scenario=evaluateSwing({bars:snapshot.bars,asOf,holding});
 const zone=instrument.market==='KR'?'Asia/Seoul':'America/New_York';
 const local=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(asOf));
 const clock=new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(asOf));
 const end=new Date(Date.parse(local+'T00:00:00Z')-(clock>=(instrument.market==='KR'?'16:00':'16:30')?0:86400000));
 while([0,6].includes(end.getUTCDay()))end.setUTCDate(end.getUTCDate()-1);
 if(snapshot.priceAsOf<end.toISOString().slice(0,10))return {...scenario,action:'DATA_UNAVAILABLE',reason:'LATEST_COMPLETED_SESSION_UNCONFIRMED',entry:null,stop:null,target:null,metrics:null,validUntil:null};
 return scenario;
}
export function createTradingWorkspace({env=process.env,request=createKisRequest({appKey:env.KIS_APP_KEY,appSecret:env.KIS_APP_SECRET,environment:env.KIS_ENV||'paper'}),directory='data/v2/trading-workspace',now=()=>Date.now(),loadEvents=async()=>[]}={}){
 const cache=new Map();let inFlight=null,nextRequest=0,hourStart=now(),hourRequests=0,masterSnapshot=null,masterReadAt=0;
 async function instruments({market='KR',q=''}={}){
  let snapshot=masterSnapshot;if(!snapshot||now()-masterReadAt>300000){try{const content=await readFile(path.join(directory,'instruments.json'),'utf8');if(content.length<=9000000){snapshot=JSON.parse(content);masterSnapshot=snapshot;masterReadAt=now();}}catch{}}
  const usable=snapshot?.schemaVersion===1&&Array.isArray(snapshot.items)&&snapshot.items.length<=30000&&Number.isFinite(Date.parse(snapshot.checkedAt))&&Date.parse(snapshot.checkedAt)<=now();
  const all=(usable?snapshot.items:TRADING_CATALOG).filter(i=>i.market===market&&typeof i.name==='string'&&i.name.length<=150&&i.currency===(market==='KR'?'KRW':'USD')&&(market==='KR'?/^[0-9][A-Z0-9]{5}$/:/^[A-Z][A-Z0-9.]{0,9}$/).test(i.symbol)&&['KRX','NAS','NYS','AMS'].includes(i.exchange));
  const matched=all.filter(i=>`${i.symbol} ${i.name}`.toLowerCase().includes(q.toLowerCase()));
  const seeds=TRADING_CATALOG.filter(i=>i.market===market).map(i=>matched.find(x=>x.symbol===i.symbol&&x.exchange===i.exchange)||i);
  const visible=(q?matched:seeds).slice(0,50);const items=await Promise.all(visible.map(async i=>{try{const id=`${i.market}-${i.exchange}-${i.symbol}`,saved=cache.get(id)||JSON.parse(await readFile(path.join(directory,id+'.json'),'utf8'));if(!validWorkspaceSnapshot(saved,id,now()))return i;const quote=saved.bars.at(-1);if(!quote||!Number.isFinite(quote.close)||quote.close<=0)return i;const recent=now()-Date.parse(saved.receivedAt)<300000;return {...i,cachedQuote:{close:quote.close,date:quote.date,receivedAt:saved.receivedAt,refreshStatus:recent?'RECENT':'PREVIOUS_SNAPSHOT'},cachedAction:recent?workspaceScenario(saved,i,new Date(now()).toISOString()).action:'DATA_UNAVAILABLE'};}catch{return i;}}));
  return {items,totalMatches:matched.length,universeSecurities:all.length,coverage:usable?snapshot.coverage:'STARTER_CATALOG_NOT_ALL_LISTED_STOCKS',checkedAt:usable?snapshot.checkedAt:null,sourceFreshness:usable&&now()-Date.parse(snapshot.checkedAt)<86400000?'RECENT_PROVIDER_SNAPSHOT':'STALE_OR_UNVERIFIED',directCodeLookup:true};
 }

 const key=i=>`${i.market}-${i.exchange}-${i.symbol}`;
 async function detail(instrument,{holding=null}={}){
  const listed=await instruments({market:instrument.market,q:instrument.symbol});const match=listed.items.find(i=>i.symbol===instrument.symbol&&i.exchange===instrument.exchange);if(match)instrument={...match};
  const at=now(),asOf=new Date(at).toISOString(),id=key(instrument),file=path.join(directory,id+'.json');
  let events=[];try{const all=await loadEvents();events=(Array.isArray(all)?all:[]).filter(e=>e.companyId===instrument.symbol&&Number.isFinite(Date.parse(e.publicAvailableAt))&&Date.parse(e.publicAvailableAt)<=at).slice(-20).map(e=>{let sourceUrl=null;try{const u=new URL(e.sourceUrl);if(u.protocol==='https:'&&!u.username&&!u.password&&['www.sec.gov','dart.fss.or.kr','kind.krx.co.kr'].includes(u.hostname)&&[...u.searchParams.keys()].every(k=>k==='rcpNo')&&(!u.search||/^\d{14}$/.test(u.searchParams.get('rcpNo')||'')))sourceUrl=u.href;}catch{}return {eventType:String(e.eventType||'공시').slice(0,80),actionType:String(e.actionType||'').slice(0,80),filingDate:e.filingDate||null,publicAvailableAt:e.publicAvailableAt,verificationStatus:e.verificationStatus||'UNVERIFIED',sourceUrl};});}catch{}

  let saved=cache.get(id);if(!saved){try{saved=JSON.parse(await readFile(file,'utf8'));}catch{}}
  const finish=(value,status,reason=null)=>({instrument,asOf,dataStatus:status,reason,history:value||null,quote:value?.bars?.at(-1)||null,strategy:['OBSERVED','STORED_OBSERVATION'].includes(status)?workspaceScenario(value,instrument,asOf,holding):{policy:SWING_POLICY,action:'DATA_UNAVAILABLE',reason:reason||status,entry:null,stop:null,target:null},recommendationStatus:'HOLD',orderExecution:false,events,eventsStatus:events.length?'SAVED_DISCLOSURES':'NO_LINKED_EVIDENCE',earningsCalendarStatus:'NOT_CONNECTED'});
  if(!validWorkspaceSnapshot(saved,id,at))saved=null;
  if(saved&&at-Date.parse(saved.receivedAt)<300000)return finish(saved,'OBSERVED');
  if(env.KSTOCK_DECISION_READ_ENABLED==='false')return finish(saved,'UNAVAILABLE','READ_DISABLED');
  if(!env.KIS_APP_KEY||!env.KIS_APP_SECRET)return saved&&at-Date.parse(saved.receivedAt)<86400000?finish(saved,'STORED_OBSERVATION','SERVER_USES_SYNCED_DAILY_CLOSE'):finish(saved,'UNAVAILABLE','PROVIDER_NOT_CONFIGURED');
  if(at-hourStart>=3600000){hourStart=at;hourRequests=0;}
  if(inFlight||at<nextRequest||hourRequests>=120)return finish(saved,'UNAVAILABLE','PROVIDER_COOLDOWN');
  inFlight=id;nextRequest=at+2000;hourRequests++;
  try{
   // Include today only after a conservative regular-close buffer; never use intraday bars.
   const zone=instrument.market==='KR'?'Asia/Seoul':'America/New_York';
   const local=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at));
   const clock=new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(at));
   const safelyAfterClose=clock>=(instrument.market==='KR'?'16:00':'16:30');
   const end=new Date(Date.parse(local+'T00:00:00Z')-(safelyAfterClose?0:86400000)),start=new Date(end.getTime()-180*86400000);
   const compact=d=>d.toISOString().slice(0,10).replaceAll('-','');
   const response=await request({service:'kis',operation:instrument.market==='KR'?'decision-daily-prices':'decision-us-daily-prices',symbol:instrument.symbol,params:{from:compact(start),to:compact(end),exchange:instrument.exchange}});
   const value={...parseWorkspaceHistory(response,instrument,{asOf,through:compact(end)}),instrumentKey:id};
   await mkdir(directory,{recursive:true,mode:0o700});const temporary=file+'.'+randomUUID()+'.tmp';await writeFile(temporary,JSON.stringify(value),{mode:0o600});await rename(temporary,file);cache.set(id,value);if(cache.size>1000)cache.delete(cache.keys().next().value);
   return finish(value,'OBSERVED');
  }catch(error){nextRequest=at+60000;return finish(saved,'UNAVAILABLE',['RATE_LIMIT','TIMEOUT','DATE_SCOPE_INVALID','PROVIDER_IDENTITY_MISMATCH','PROVIDER_DATE_INVALID','PROVIDER_BAR_INVALID','HTTP_403','HTTP_401'].includes(error.code||error.message)?error.code||error.message:'PROVIDER_UNAVAILABLE');}
  finally{inFlight=null;}
 }
 async function opportunities(market){
  let names=[];try{const files=(await readdir(directory)).filter(n=>new RegExp('^'+market+'-(?:KRX|NAS|NYS|AMS)-[A-Z0-9.]+\\.json$').test(n));const times=await Promise.all(files.map(async n=>({name:n,time:(await stat(path.join(directory,n))).mtimeMs})));names=times.sort((a,b)=>b.time-a.time).slice(0,500).map(x=>x.name);}catch{}
  const candidates=[];for(const file of names){try{const saved=JSON.parse(await readFile(path.join(directory,file),'utf8')),id=file.slice(0,-5);if(!validWorkspaceSnapshot(saved,id,now())||now()-Date.parse(saved.receivedAt)>86400000)continue;const [m,exchange,symbol]=id.split('-');const catalog=await instruments({market:m,q:symbol}),instrument=catalog.items.find(i=>i.symbol===symbol&&i.exchange===exchange)||workspaceInstrument({market:m,symbol,exchange});candidates.push({instrument,quote:saved.bars.at(-1),receivedAt:saved.receivedAt,strategy:workspaceScenario(saved,instrument,new Date(now()).toISOString())});}catch{}}
  candidates.sort((a,b)=>({BUY_CONDITION_MET:0,WAIT:1,DATA_UNAVAILABLE:2}[a.strategy.action]??3)-({BUY_CONDITION_MET:0,WAIT:1,DATA_UNAVAILABLE:2}[b.strategy.action]??3)||a.instrument.symbol.localeCompare(b.instrument.symbol));
  const universe=await instruments({market});return {asOf:new Date(now()).toISOString(),market,evaluated:candidates.length,strategyReady:candidates.filter(c=>c.strategy.action!=='DATA_UNAVAILABLE').length,needsRefresh:candidates.filter(c=>c.strategy.action==='DATA_UNAVAILABLE').length,coverageUniverse:universe.universeSecurities,buyConditions:candidates.filter(c=>c.strategy.action==='BUY_CONDITION_MET').length,candidates:candidates.slice(0,8),scope:'CACHED_OBSERVATIONS_NOT_FULL_MARKET_RANKING',recommendationStatus:'HOLD'};
 }
 return {detail,instruments,opportunities};
}
export function registerTradingWorkspace(app,service){
 app.get('/api/v2/trading/opportunities',async(req,res)=>{res.set('Cache-Control','no-store');const market=req.query.market||'KR';if(!['KR','US'].includes(market))return res.status(400).json({success:false,error:'MARKET_INVALID'});try{res.json({success:true,...await service.opportunities(market)});}catch{res.status(503).json({success:false,error:'OPPORTUNITIES_UNAVAILABLE'});}});
 app.post('/api/v2/trading/replay',async(req,res)=>{res.set('Cache-Control','no-store');let instrument;const costs=req.body?.costs;try{instrument=workspaceInstrument(req.body);if(!costs||![costs.feePct,costs.taxPct,costs.slippagePct].every(n=>Number.isFinite(n)&&n>=0&&n<=5))throw Error();}catch{return res.status(400).json({success:false,error:'REPLAY_INPUT_INVALID'});}try{const d=await service.detail(instrument);res.json({success:true,instrument,dataStatus:d.dataStatus,result:['OBSERVED','STORED_OBSERVATION'].includes(d.dataStatus)?replaySwing({bars:d.history.bars,...costs}):{status:'INSUFFICIENT_DATA',reason:d.reason,metrics:null,trades:[]}});}catch{res.status(503).json({success:false,error:'REPLAY_UNAVAILABLE'});}});
 app.get('/api/v2/trading/instruments',async(req,res)=>{res.set('Cache-Control','no-store');const market=req.query.market||'KR',q=String(req.query.q||'').trim().slice(0,50);if(!['KR','US'].includes(market))return res.status(400).json({success:false,error:'MARKET_INVALID'});try{res.json({success:true,...await service.instruments({market,q})});}catch{res.status(503).json({success:false,error:'INSTRUMENTS_UNAVAILABLE'});}});
 app.get('/api/v2/trading/detail',async(req,res)=>{res.set('Cache-Control','no-store');let instrument;try{instrument=workspaceInstrument(req.query);}catch{return res.status(400).json({success:false,error:'INSTRUMENT_INVALID'});}try{res.json({success:true,...await service.detail(instrument)});}catch{res.status(503).json({success:false,error:'WORKSPACE_UNAVAILABLE'});}});
 app.post('/api/v2/trading/holding-review',async(req,res)=>{res.set('Cache-Control','no-store');let instrument;const h=req.body?.holding;try{instrument=workspaceInstrument(req.body);if(!h||!Number.isFinite(h.averageCost)||h.averageCost<=0||h.averageCost>1e12||!Number.isFinite(h.quantity)||h.quantity<=0||h.quantity>1e9)throw Error();}catch{return res.status(400).json({success:false,error:'HOLDING_INVALID'});}try{res.json({success:true,...await service.detail(instrument,{holding:{averageCost:h.averageCost,quantity:h.quantity}})});}catch{res.status(503).json({success:false,error:'WORKSPACE_UNAVAILABLE'});}});
}
