/* Local calculations and foreground alert transitions; no storage or network access. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KStockTradingTools=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';const positive=n=>Number.isFinite(n)&&n>0&&n<=1e15;
 function risk({entry,stop,price,quantity=0,averageCost=entry,capital,lossBudget,cashBudget}={}){
  if(![entry,stop,price].every(positive)||entry<=stop||!Number.isFinite(quantity)||quantity<0||quantity>1e9||!positive(averageCost))return {status:'UNAVAILABLE'};
  const result={status:'SCENARIO',positionValue:price*quantity,costBasis:averageCost*quantity,costToStopLoss:Math.max(0,averageCost-stop)*quantity,currentToStopLoss:Math.max(0,price-stop)*quantity};
  if(positive(capital))result.weightPct=result.positionValue/capital*100;
  if(positive(lossBudget)&&positive(cashBudget))result.maximumWholeShares=Math.min(1e9,Math.floor(Math.min(lossBudget/(entry-stop),cashBudget/entry)));
  if(Object.values(result).some(v=>typeof v==='number'&&!Number.isFinite(v)))return {status:'UNAVAILABLE'};
  return result;
 }
 function createAlertTracker(){const seen=new Map();return {clear(){seen.clear();},observe(id,data,now=Date.now()){
  if(!id||!data?.strategy)return null;
  const s=data.strategy,fresh=['OBSERVED','STORED_OBSERVATION'].includes(data.dataStatus)&&Number.isFinite(Date.parse(s.validUntil))&&Date.parse(s.validUntil)>now;
  const action=fresh?s.action:'DATA_UNAVAILABLE',date=data.quote?.date||'UNKNOWN',fingerprint=action+':'+date;
  for(const [key,value]of seen)if(now-value.at>3600000)seen.delete(key);
  const previous=seen.get(id);seen.set(id,{fingerprint,action,at:now});if(seen.size>200)seen.delete(seen.keys().next().value);
  if(previous?.fingerprint===fingerprint)return null;
  const actionable=['BUY_CONDITION_MET','EXIT_CONDITION_MET','REDUCE_CONDITION_MET','RISK_REVIEW','DATA_UNAVAILABLE'].includes(action);
  if(!actionable&&(!previous||previous.action==='WAIT'||previous.action==='HOLD_CONDITION_MET'))return null;
  return {id,action,date,at:new Date(now).toISOString(),ruleOnly:true};
 }};}
 function holdingExitSummary(holding,data,now=Date.now()){
  const unavailable=reason=>({action:'DATA_UNAVAILABLE',title:'판단 보류',reason});
  const i=data?.instrument,s=data?.strategy;
  if(!i||!s||['market','exchange','symbol','currency'].some(k=>i[k]!==holding[k]))return unavailable('IDENTITY_MISMATCH');
  if(!['OBSERVED','STORED_OBSERVATION'].includes(data.dataStatus)||s.action==='DATA_UNAVAILABLE')return unavailable(s.reason||data.reason||'DAILY_HISTORY_REQUIRED');
  if(s.holdingContext!=='NONE'||!Number.isFinite(Date.parse(s.validUntil))||Date.parse(s.validUntil)<=now)return unavailable('CONDITION_EXPIRED');
  const titles={EXIT_CONDITION_MET:'손절 조건 충족 · 청산 검토',REDUCE_CONDITION_MET:'목표 도달 · 일부 매도 검토',RISK_REVIEW:'추세 이탈 · 비중 점검',HOLD_CONDITION_MET:'유지 조건 · 매도 조건 미충족'};
  const close=data.quote?.close,sma=s.exitReference?.sma20??s.metrics?.sma20,atr=s.exitReference?.atr14??s.metrics?.atr14;
  if(!['WAIT','BUY_CONDITION_MET'].includes(s.action)||![close,atr,sma,holding.averageCost,holding.quantity].every(positive)||holding.quantity>1e9||holding.averageCost>1e12)return unavailable('DAILY_HISTORY_INVALID');
  const round=n=>Math.round(n*10000)/10000,rawStop=holding.averageCost-atr,rawTarget=holding.averageCost+2*atr,stop=round(rawStop),target=round(rawTarget);
  if(!positive(stop)||!positive(target)||stop>=target)return unavailable('HOLDING_RISK_LEVEL_INVALID');
  const action=close<=rawStop?'EXIT_CONDITION_MET':close>=rawTarget?'REDUCE_CONDITION_MET':close<sma?'RISK_REVIEW':'HOLD_CONDITION_MET';
  return {action,title:titles[action],close,stop,target,sma,priceDate:data.quote.date,receivedAt:data.receivedAt||data.history?.receivedAt,validUntil:s.validUntil,pnlPct:(close/holding.averageCost-1)*100,stopDistancePct:(stop/close-1)*100,targetDistancePct:(target/close-1)*100};
 }
 function candidateLevels(strategy,selection,now=Date.now()){
  const unavailable=reason=>({status:'UNAVAILABLE',reason});
  if(!Number.isFinite(now)||!strategy||!['BUY_CONDITION_MET','WAIT'].includes(strategy.action)||strategy.policy?.mode!=='RULE_SIMULATION'||strategy.holdingContext!=='NONE')return unavailable('DATA_UNAVAILABLE');
  const expires=Date.parse(strategy.validUntil),observed=Date.parse(selection?.receivedAt);
  if(!Number.isFinite(expires)||expires<=now||!Number.isFinite(observed)||observed>now||now-observed>=600000)return unavailable('CONDITION_EXPIRED');
  const {entry,stop,target}=strategy;if(![entry,stop,target].every(positive)||stop>=entry||target<=entry)return unavailable('LEVELS_INVALID');
  return {status:'REFERENCE',action:strategy.action,entry,stop,target,lossPct:(entry-stop)/entry*100,targetPct:(target-entry)/entry*100,rewardRisk:(target-entry)/(entry-stop),validUntil:strategy.validUntil};
 }
 return {risk,createAlertTracker,holdingExitSummary,candidateLevels};
});
