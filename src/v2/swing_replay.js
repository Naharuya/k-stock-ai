import {evaluateSwing,SWING_POLICY} from './swing_strategy.js';
/** Historical adjusted-price rule replay, not verified execution or out-of-sample proof. */
export function replaySwing({bars,feePct,taxPct,slippagePct}={}){
 if(![feePct,taxPct,slippagePct].every(n=>Number.isFinite(n)&&n>=0&&n<=5))throw Error('REPLAY_COSTS_REQUIRED');
 if(!Array.isArray(bars)||bars.length<60)return {status:'INSUFFICIENT_DATA',trades:[],metrics:null};
 const rows=[...bars].sort((a,b)=>String(a?.date).localeCompare(String(b?.date)));
 const validation=evaluateSwing({bars:rows,asOf:rows.at(-1)?.date+'T23:59:59Z'});
 if(validation.action==='DATA_UNAVAILABLE')return {status:'INSUFFICIENT_DATA',reason:validation.reason==='NO_TRADING_VOLUME_OR_HALT_REVIEW_REQUIRED'?'ZERO_VOLUME_EXECUTION_UNCONFIRMED':validation.reason,trades:[],metrics:null};
 // A zero-volume daily bar cannot establish executable opens, stops or targets.
 if(rows.some(row=>row.volume===0))return {status:'INSUFFICIENT_DATA',reason:'ZERO_VOLUME_EXECUTION_UNCONFIRMED',trades:[],metrics:null};
 const fee=feePct/100,tax=taxPct/100,slip=slippagePct/100,trades=[];let position=null,pending=null,equity=1,peak=1,maxDrawdown=0;
 for(let i=40;i<rows.length;i++){
  const row=rows[i];
  if(pending&&!position){const entry=row.open*(1+slip);if(entry>pending.stop&&entry<pending.target)position={entry,stop:pending.stop,target:pending.target,entryDate:row.date};pending=null;}
  if(position){
   let exit=null,reason=null;
   if(row.open<=position.stop){exit=row.open;reason='GAP_BELOW_STOP';}
   else if(row.low<=position.stop){exit=position.stop;reason='STOP_FIRST_IF_BOTH_TOUCHED';}
   else if(row.high>=position.target){exit=position.target;reason='TARGET';}
   else if(i===rows.length-1){exit=row.close;reason='END_OF_SAMPLE_MARK_TO_MARKET';}
   if(exit!==null){const actualExit=exit*(1-slip),netFactor=actualExit*(1-fee-tax)/(position.entry*(1+fee));equity*=netFactor;trades.push({...position,exitDate:row.date,exit:actualExit,reason,netReturnPct:(netFactor-1)*100});position=null;}
  }
  const marked=position?equity*row.close*(1-slip)*(1-fee-tax)/(position.entry*(1+fee)):equity;peak=Math.max(peak,marked);maxDrawdown=Math.min(maxDrawdown,marked/peak-1);
  if(!position&&i<rows.length-1){const signal=evaluateSwing({bars:rows.slice(0,i+1),asOf:row.date+'T23:59:59Z'});if(signal.action==='BUY_CONDITION_MET')pending=signal;}
 }
 const referenceEntry=rows[40].open*(1+slip),referenceExit=rows.at(-1).close*(1-slip);
 const referenceFactor=referenceExit*(1-fee-tax)/(referenceEntry*(1+fee));
 const reference={model:'SAME_INSTRUMENT_BUY_AND_HOLD_ADJUSTED_PRICE',from:rows[40].date,through:rows.at(-1).date,entry:referenceEntry,exit:referenceExit,netReturnPct:(referenceFactor-1)*100,strategyDifferencePercentagePoints:(equity-referenceFactor)*100,officialBenchmark:false};
 return {status:'SIMULATED',reference, sample:{warmupBars:40,evaluationBars:rows.length-40,independentValidation:false},policyId:SWING_POLICY.id,period:{from:rows[40].date,through:rows.at(-1).date},costs:{feePct,taxPct,slippagePct,source:'USER_SPECIFIED_NOT_VERIFIED_MARKET_RATES'},trades,metrics:{closedTrades:trades.length,netReturnPct:(equity-1)*100,maxDrawdownPct:maxDrawdown*100},executionModel:'NEXT_SESSION_OPEN_STOP_FIRST_FRACTIONAL_FULL_NOTIONAL',limitations:['ADJUSTED_PRICE_REPLAY_NOT_VERIFIED_EXECUTION','NO_LIQUIDITY_OR_SURVIVORSHIP_PROOF','NOT_OUT_OF_SAMPLE_VALIDATION','NO_BENCHMARK_OR_DIVIDEND_RETURN_PROOF','NO_FUTURE_PROFIT_CLAIM']};
}
