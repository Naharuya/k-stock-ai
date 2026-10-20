import {evaluateSwing,SWING_POLICY} from './swing_strategy.js';
/** Historical adjusted-price rule replay, not verified execution or out-of-sample proof. */
export function replaySwing({bars,feePct,taxPct,slippagePct,evaluationStartIndex=40}={}){
 if(![feePct,taxPct,slippagePct].every(n=>Number.isFinite(n)&&n>=0&&n<=5))throw Error('REPLAY_COSTS_REQUIRED');
 if(!Number.isInteger(evaluationStartIndex)||evaluationStartIndex<40)throw Error('REPLAY_WINDOW_INVALID');
 if(!Array.isArray(bars)||bars.length<evaluationStartIndex+20)return {status:'INSUFFICIENT_DATA',trades:[],metrics:null};
 const rows=[...bars].sort((a,b)=>String(a?.date).localeCompare(String(b?.date)));
 const validation=evaluateSwing({bars:rows,asOf:rows.at(-1)?.date+'T23:59:59Z'});
 if(validation.action==='DATA_UNAVAILABLE')return {status:'INSUFFICIENT_DATA',reason:validation.reason==='NO_TRADING_VOLUME_OR_HALT_REVIEW_REQUIRED'?'ZERO_VOLUME_EXECUTION_UNCONFIRMED':validation.reason,trades:[],metrics:null};
 // A zero-volume daily bar cannot establish executable opens, stops or targets.
 if(rows.some(row=>row.volume===0))return {status:'INSUFFICIENT_DATA',reason:'ZERO_VOLUME_EXECUTION_UNCONFIRMED',trades:[],metrics:null};
 const fee=feePct/100,tax=taxPct/100,slip=slippagePct/100,trades=[];let position=null,pending=null,equity=1,peak=1,maxDrawdown=0;
 for(let i=evaluationStartIndex;i<rows.length;i++){
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
 const referenceEntry=rows[evaluationStartIndex].open*(1+slip),referenceExit=rows.at(-1).close*(1-slip);
 const referenceFactor=referenceExit*(1-fee-tax)/(referenceEntry*(1+fee));
 const reference={model:'SAME_INSTRUMENT_BUY_AND_HOLD_ADJUSTED_PRICE',from:rows[evaluationStartIndex].date,through:rows.at(-1).date,entry:referenceEntry,exit:referenceExit,netReturnPct:(referenceFactor-1)*100,strategyDifferencePercentagePoints:(equity-referenceFactor)*100,officialBenchmark:false};
 return {status:'SIMULATED',reference, sample:{warmupBars:evaluationStartIndex,evaluationBars:rows.length-evaluationStartIndex,independentValidation:false},policyId:SWING_POLICY.id,period:{from:rows[evaluationStartIndex].date,through:rows.at(-1).date},costs:{feePct,taxPct,slippagePct,source:'USER_SPECIFIED_NOT_VERIFIED_MARKET_RATES'},trades,metrics:{closedTrades:trades.length,netReturnPct:(equity-1)*100,maxDrawdownPct:maxDrawdown*100},executionModel:'NEXT_SESSION_OPEN_STOP_FIRST_FRACTIONAL_FULL_NOTIONAL',limitations:['ADJUSTED_PRICE_REPLAY_NOT_VERIFIED_EXECUTION','NO_LIQUIDITY_OR_SURVIVORSHIP_PROOF','NOT_OUT_OF_SAMPLE_VALIDATION','NO_BENCHMARK_OR_DIVIDEND_RETURN_PROOF','NO_FUTURE_PROFIT_CLAIM']};
}

/** Fixed chronological windows; no fit/optimization and no claim of unseen historical data. */
export function evaluateSwingPeriods(input={}){
 if(!Array.isArray(input.bars)||input.bars.length<100)return {status:'INSUFFICIENT_DATA',reason:'ONE_HUNDRED_BARS_REQUIRED',promotionStatus:'HOLD'};
 const rows=[...input.bars].sort((a,b)=>String(a?.date).localeCompare(String(b?.date))),split=rows.length-20;
 const development=replaySwing({...input,bars:rows.slice(0,split),evaluationStartIndex:40}),holdout=replaySwing({...input,bars:rows,evaluationStartIndex:split});
 if(development.status!=='SIMULATED'||holdout.status!=='SIMULATED')return {status:'INSUFFICIENT_DATA',reason:development.reason||holdout.reason,promotionStatus:'HOLD'};
 const summary=r=>({period:r.period,metrics:r.metrics,reference:r.reference,evaluationBars:r.sample.evaluationBars});
 return {status:'FIXED_RULE_CHRONOLOGICAL_COMPARISON',policyId:SWING_POLICY.id,development:summary(development),holdout:summary(holdout),positionsCarriedAcrossBoundary:false,parametersOptimized:false,independentValidation:false,promotionStatus:'HOLD',limitations:['HISTORICAL_DATA_ALREADY_OBSERVED','TWENTY_BAR_HOLDOUT_TOO_SHORT_FOR_VALIDATION','NO_OFFICIAL_INDEX_OR_SURVIVORSHIP_PROOF','CORPORATE_ACTIONS_NOT_INDEPENDENTLY_RECONCILED','NO_PROFIT_CLAIM']};
}
