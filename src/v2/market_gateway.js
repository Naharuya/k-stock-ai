import {createHash} from 'node:crypto';
export function createMarketGatewayRequest({fetchImpl=globalThis.fetch}={}){
 return async({operation,symbol,params={}})=>{
  if(!['decision-daily-prices','decision-us-daily-prices'].includes(operation))throw Error('GATEWAY_OPERATION_REJECTED');
  const query=new URLSearchParams({market:operation==='decision-daily-prices'?'KR':'US',symbol,exchange:params.exchange||'KRX',from:params.from,to:params.to});
  const r=await fetchImpl('http://127.0.0.1:18880/daily?'+query,{redirect:'error',signal:AbortSignal.timeout(12000)});
  if(!r.ok)throw Object.assign(Error('MARKET_GATEWAY_UNAVAILABLE'),{code:r.status===429?'RATE_LIMIT':'MARKET_GATEWAY_UNAVAILABLE'});
  return r.json();
 };
}
export function createMarketGatewayHandler({request,now=()=>Date.now()}={}){
 let busy=false,availableAt=0,bucketAt=now(),calls=0;
 return async(req,res)=>{
  const reply=(code,value)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  if(req.method!=='GET')return reply(405,{error:'READ_ONLY'});
  const u=new URL(req.url,'http://127.0.0.1');if(u.pathname==='/health')return reply(200,{ok:true,mode:'READ_ONLY_MARKET_FIELDS',orderExecution:false});
  if(u.pathname!=='/daily')return reply(404,{error:'NOT_FOUND'});
  const market=u.searchParams.get('market'),symbol=u.searchParams.get('symbol')||'',exchange=u.searchParams.get('exchange');
  if(!['KR','US'].includes(market)||!(market==='KR'?/^[0-9][A-Z0-9]{5}$/:/^[A-Z][A-Z0-9.]{0,9}$/).test(symbol)||(market==='US'&&!['NAS','NYS','AMS'].includes(exchange)))return reply(400,{error:'SCOPE_INVALID'});
  if(now()-bucketAt>=3600000){bucketAt=now();calls=0;}if(busy||now()<availableAt||calls>=120)return reply(429,{error:'MARKET_GATEWAY_COOLDOWN'});
  busy=true;availableAt=now()+2000;calls++;
  try{
   const raw=await request({service:'kis',operation:market==='KR'?'decision-daily-prices':'decision-us-daily-prices',symbol,params:{exchange,from:u.searchParams.get('from'),to:u.searchParams.get('to')}});
   // Send only public market fields, never provider messages, headers or credentials.
   const keys=market==='KR'?['stck_bsop_date','stck_oprc','stck_hgpr','stck_lwpr','stck_clpr','acml_vol']:['xymd','open','high','low','clos','tvol'];
   if(raw?.rt_cd!=='0'||!Array.isArray(raw.output2)||raw.output2.length>100||(market==='US'&&raw.output1?.rsym!==`D${exchange}${symbol}`)||raw.output2.some(r=>keys.some(k=>Object.hasOwn(r,k)&&!((typeof r[k]==='string'&&r[k].length<=64&&/^[0-9.]*$/.test(r[k]))||(typeof r[k]==='number'&&Number.isFinite(r[k]))))))return reply(503,{error:'PROVIDER_DATA_UNAVAILABLE'});
   reply(200,{rt_cd:'0',output1:market==='US'?{rsym:raw.output1?.rsym}:{},output2:raw.output2.map(r=>Object.fromEntries(keys.filter(k=>Object.hasOwn(r,k)).map(k=>[k,r[k]]))),sourceFingerprint:createHash('sha256').update(JSON.stringify(raw)).digest('hex')});
  }catch{availableAt=now()+60000;reply(503,{error:'PROVIDER_UNAVAILABLE'});}finally{busy=false;}
 };
}
