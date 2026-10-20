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
 return {risk,createAlertTracker};
});
