import {createHash} from 'node:crypto';
export function parseMoverRows(raw,{market,exchange,direction,receivedAt}){
 if(!['KR','US'].includes(market)||!['UP','DOWN'].includes(direction)||(market==='KR'?exchange!=='KRX':!['NAS','NYS','AMS'].includes(exchange))||raw?.rt_cd!=='0')throw Error('MOVERS_SCOPE_OR_PROVIDER_INVALID');
 const sourceRows=market==='KR'?raw.output:raw.output2;if(!Array.isArray(sourceRows)||sourceRows.length>2000)throw Error('MOVERS_RESPONSE_INVALID');
 const items=[],seen=new Set(),num=x=>typeof x==='number'?x:typeof x==='string'&&/^[+-]?\d+(?:\.\d+)?$/.test(x)?Number(x):NaN;
 for(const r of sourceRows){const symbol=market==='KR'?r.stck_shrn_iscd:r.symb,price=num(market==='KR'?r.stck_prpr:r.last),changePct=num(market==='KR'?r.prdy_ctrt:r.rate),volume=num(market==='KR'?r.acml_vol:r.tvol),name=market==='KR'?r.hts_kor_isnm:r.knam||r.name||r.enam||symbol;
  if(typeof symbol!=='string'||!(market==='KR'?/^[0-9][A-Z0-9]{5}$/:/^[A-Z][A-Z0-9.]{0,9}$/).test(symbol)||!Number.isFinite(price)||price<=0||price>1e12||!Number.isFinite(changePct)||changePct<=-100||changePct>10000||!Number.isSafeInteger(volume)||volume<=0||typeof name!=='string'||!name.length||name.length>150||seen.has(symbol)||(direction==='UP'?changePct<=0:changePct>=0))continue;
  if(market==='US'&&((r.excd&&r.excd!==exchange)||(r.rsym&&r.rsym!==`D${exchange}${symbol}`)))continue;
  seen.add(symbol);items.push({market,symbol,name,exchange,currency:market==='KR'?'KRW':'USD',price,changePct,volume});
 }
 items.sort((a,b)=>direction==='UP'?b.changePct-a.changePct:a.changePct-b.changePct);
 return {market,exchange,direction,receivedAt,basis:'PREVIOUS_SESSION_CHANGE',providerQuoteTime:null,items:items.slice(0,20),sourceHash:createHash('sha256').update(JSON.stringify(raw)).digest('hex'),source:'KIS_RANKING_FIRST_PAGE',orderExecution:false};
}
export function validMoverSnapshot(s,market,now=Date.now()){
 return s?.schemaVersion===1&&s.market===market&&s.basis==='PREVIOUS_SESSION_CHANGE'&&s.source==='KIS_RANKING_FIRST_PAGES'&&Array.isArray(s.sourceHashes)&&s.sourceHashes.length===(market==='KR'?2:6)&&s.sourceHashes.every(h=>/^[a-f0-9]{64}$/.test(h))&&Number.isFinite(Date.parse(s.receivedAt))&&Date.parse(s.receivedAt)<=now&&['gainers','losers'].every(k=>Array.isArray(s[k])&&s[k].length<=10&&s[k].every(i=>i.market===market&&typeof i.symbol==='string'&&(market==='KR'?/^[0-9][A-Z0-9]{5}$/:/^[A-Z][A-Z0-9.]{0,9}$/).test(i.symbol)&&(market==='KR'?i.exchange==='KRX':['NAS','NYS','AMS'].includes(i.exchange))&&i.currency===(market==='KR'?'KRW':'USD')&&typeof i.name==='string'&&i.name.length<=150&&Number.isFinite(i.price)&&i.price>0&&Number.isFinite(i.changePct)&&(k==='gainers'?i.changePct>0:i.changePct<0)&&Number.isSafeInteger(i.volume)&&i.volume>0));
}
