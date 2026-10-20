/** Reproducible price/volume scenario. It is not the existing recommendation gate. */
export const SWING_POLICY=Object.freeze({id:'daily-breakout-20-atr14-v1',horizon:'DAYS_TO_WEEKS',mode:'RULE_SIMULATION',lookback:20,atrPeriod:14,minimumBars:40,stopAtr:1,targetAtr:2,calibration:'NOT_ESTABLISHED',orderExecution:false});
const positive=n=>Number.isFinite(n)&&n>0;
export function evaluateSwing({bars=[],asOf,holding=null,completedSessionDate=null}={}){
 const policy=SWING_POLICY,now=Date.parse(asOf);
 const empty=reason=>({policy,action:'DATA_UNAVAILABLE',reason,entry:null,stop:null,target:null,reference:null,metrics:null,holdingContext:holding?'USER_ENTERED':'NONE',execution:'NEXT_SESSION_CONDITIONAL',validUntil:null});
 if(!Number.isFinite(now)||!Array.isArray(bars)||bars.length<policy.minimumBars)return empty('DAILY_HISTORY_REQUIRED');
 const rows=[...bars].sort((a,b)=>String(a?.date).localeCompare(String(b?.date)));
 if(rows.some((r,i)=>!/^\d{4}-\d{2}-\d{2}$/.test(r?.date||'')||!Number.isFinite(Date.parse(r.date))||new Date(r.date).toISOString().slice(0,10)!==r.date||!['open','high','low','close'].every(k=>positive(r[k]))||!Number.isSafeInteger(r.volume)||r.volume<0||r.low>Math.min(r.open,r.close)||r.high<Math.max(r.open,r.close)||r.low>r.high||Date.parse(r.date)>now||(i&&rows[i-1].date===r.date)))return empty('DAILY_HISTORY_INVALID');
 const last=rows.at(-1);if(completedSessionDate!==last.date&&now-Date.parse(last.date)>4*86400000)return empty('PRICE_STALE');
 if(last.volume===0)return empty('NO_TRADING_VOLUME_OR_HALT_REVIEW_REQUIRED');
 const prior=rows.slice(-21,-1),sma20=rows.slice(-20).reduce((s,r)=>s+r.close,0)/20,breakout=Math.max(...prior.map(r=>r.high)),averageVolume=prior.reduce((s,r)=>s+r.volume,0)/20;
 const tr=rows.slice(-14).map((r,i)=>{const previous=rows[rows.length-15+i];return Math.max(r.high-r.low,Math.abs(r.high-previous.close),Math.abs(r.low-previous.close));});
 const atr14=tr.reduce((s,n)=>s+n,0)/14;
 if(!positive(atr14)||!positive(averageVolume)||!positive(last.close-atr14))return empty('VOLATILITY_OR_VOLUME_INVALID');
 const round=n=>Math.round(n*10000)/10000;
 const checks=[{id:'BREAKOUT',passed:last.close>breakout,actual:last.close,threshold:round(breakout)},{id:'TREND',passed:last.close>sma20,actual:last.close,threshold:round(sma20)},{id:'VOLUME',passed:last.volume>averageVolume,actual:last.volume,threshold:round(averageVolume)}];
 let action=checks.every(c=>c.passed)?'BUY_CONDITION_MET':'WAIT';
 let stop=last.close-atr14,target=last.close+2*atr14;
 if(holding){
  if(!positive(holding.averageCost)||!positive(holding.quantity)||holding.quantity>1e9)return empty('HOLDING_INVALID');
  stop=holding.averageCost-atr14;target=holding.averageCost+2*atr14;
  if(!positive(stop))return empty('HOLDING_RISK_LEVEL_INVALID');
  action=last.close<=stop?'EXIT_CONDITION_MET':last.close>=target?'REDUCE_CONDITION_MET':last.close<sma20?'RISK_REVIEW':'HOLD_CONDITION_MET';
 }
 return {policy,action,checks,exitReference:{atr14,sma20},holdingPeriod:'DAYS_TO_WEEKS_NOT_FIXED',reason:holding?'USER_COST_AND_CURRENT_ATR_RECALCULATED':'CLOSE_BREAKOUT_TREND_VOLUME_RULE',entry:round(holding?holding.averageCost:last.close),stop:round(stop),target:round(target),reference:{date:last.date,close:last.close},metrics:{sma20:round(sma20),prior20High:round(breakout),atr14:round(atr14),averageVolume:round(averageVolume)},holdingContext:holding?'USER_ENTERED':'NONE',execution:'NEXT_SESSION_CONDITIONAL',validUntil:new Date(completedSessionDate===last.date?now+86400000:Math.min(now+86400000,Date.parse(last.date)+4*86400000)).toISOString(),warnings:['SIMULATION_NOT_RECOMMENDATION','LEVELS_NOT_GUARANTEED_FILLS','NO_PROFIT_PROBABILITY','SESSION_CALENDAR_NOT_INDEPENDENTLY_VERIFIED',...(holding?['COST_BASED_LEVELS_RECALCULATE_WITH_ATR_NOT_A_FIXED_STOP']:[])]};
}
