import {validDay} from './accounting_periods.js';
import {createHash} from 'node:crypto';
import {isD2Eligible,calculateCandidateScore,KSTOCK_V2_SCORE_WEIGHTS} from './scoring.js';
export const TRADE_RECOMMENDATION_POLICY=Object.freeze({id:'paper-decision-v1',mode:'PAPER_ONLY',buyScore:50,sellScore:35,severeBear:75,maxRiskPenalty:15,minimumPeers:3,validityHours:24,calibration:'NOT_ESTABLISHED',orderExecution:false});
// Rule outputs alone are simulations. Publication requires the independent data checks below.
export function classifyTradeRule({score,bearSeverity,riskPenalty}={}){
 if(![score,bearSeverity,riskPenalty].every(Number.isFinite)||score<0||score>100||bearSeverity<0||bearSeverity>100||riskPenalty<0||riskPenalty>15)return 'INSUFFICIENT_DATA';
 if(bearSeverity>=75||riskPenalty>=15||score<35)return 'SELL';
 return score>=50?'BUY':'WATCH';
}
export function assessTradeRecommendation({candidate,base,asOf}={}){
 const policy=TRADE_RECOMMENDATION_POLICY;
 const at=Date.parse(asOf),detail=candidate?.detail,ttm=detail?.ttm,valuation=detail?.valuationReview;
 const validTime=Number.isFinite(at),price=candidate?.price;
 const reference=ttm?.metrics?.revenue;
 const financialReady=['revenue','netIncome','operatingCashFlow'].every(k=>{const m=ttm?.metrics?.[k];return m?.status==='READY'&&Number.isFinite(m.value)&&!m.reasons?.length&&validDay(m.periodStart)&&validDay(m.periodEnd)&&m.periodStart===reference.periodStart&&m.periodEnd===reference.periodEnd&&m.periodEnd<=String(asOf).slice(0,10);});
 const signals=base?.signals;
 const metrics=base?.krValuationAnalysis?.comparisons||base?.valuationComparisons;
 const checks={
  analysisTime:validTime,
  latestPrice:!!(price&&Number.isFinite(price.close)&&price.close>0&&['USD','KRW'].includes(price.currency)&&Number.isFinite(Date.parse(price.priceDate))&&validTime&&at>=Date.parse(price.priceDate)&&at-Date.parse(price.priceDate)<8*86400000),
  publicEvidence:!!(candidate?.events?.length&&candidate.events.every(e=>e.verificationStatus==='VERIFIED'&&isD2Eligible(e.publicAvailableAt,asOf))&&!candidate.blockers?.some(r=>['CURRENT_AMENDMENT_REVIEW_REQUIRED','CURRENT_COLLECTION_BLOCKED'].includes(r))),
  accountingPeriod:financialReady,
  financialPriceAlignment:!!(financialReady&&price&&reference.periodEnd<=price.priceDate),
  valuation:!!(valuation&&['per','pbr','psr'].every(k=>valuation[k]?.status==='VERIFIED'&&Number.isFinite(valuation[k].value)&&valuation[k].value>0)),
  sharesAndActions:!!(valuation?.marketCap>0&&!valuation.reasons?.length),
  peerSamples:['PER','PBR','PSR'].every(k=>metrics?.[k]?.peers?.count>=3&&metrics?.[k]?.history?.count>=3),
  comprehensiveRisk:detail?.risk?.comprehensiveRiskVerified===true&&(detail?.risk?.available===true||base?.agents?.risk?.available===true),
  riskScoreConsistency:detail?.risk?.available!==true||detail.risk.riskPenalty===signals?.riskPenalty,
  signalFreshness:!!(validTime&&Number.isFinite(Date.parse(base?.analysisDate||base?.analyzedAt||base?.checkedAt))&&Date.parse(base.analysisDate||base.analyzedAt||base.checkedAt)<=at&&at-Date.parse(base.analysisDate||base.analyzedAt||base.checkedAt)<24*3600000),
  committeeScore:!!(signals&&Number.isFinite(base?.committee?.score)&&Math.abs(calculateCandidateScore(signals)-base.committee.score)<0.005),
  completeSignals:!!(signals&&Object.keys(KSTOCK_V2_SCORE_WEIGHTS).every(k=>Number.isFinite(signals[k])&&signals[k]>=0&&signals[k]<=100)&&Number.isFinite(signals.bearSeverity)&&Number.isFinite(signals.riskPenalty)),
  independentReview:base?.compliance?.passed===true&&!base?.reviewRequired?.length&&!base?.dataBlockers?.length&&base?.recommendationGate?.status==='VERIFIED'
 };
 const blockers=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);
 // Reuse the committee score; never default absent components to zero.
 const score=Number.isFinite(base?.committee?.score)?base.committee.score:null;
 let action=blockers.length?'INSUFFICIENT_DATA':classifyTradeRule({score,bearSeverity:signals?.bearSeverity,riskPenalty:signals?.riskPenalty});
 if(!blockers.length&&action==='INSUFFICIENT_DATA')blockers.push('invalidRuleInputs');
 if(action==='BUY'&&detail?.risk?.criticalKnownRisk===true){blockers.push('criticalKnownRisk');action='INSUFFICIENT_DATA';}
 if(action==='BUY'&&base?.committee?.approved!==true){blockers.push('committeeApproval');action='INSUFFICIENT_DATA';}
 const publishable=action!=='INSUFFICIENT_DATA';
 const result={riskReview:detail?.risk?{status:detail.risk.status,missingDomains:detail.risk.missingDomains||[],observedNotes:detail.risk.observations?.length||0}:null,marketCollection:candidate?.marketCollection?{status:candidate.marketCollection.status,reason:candidate.marketCollection.reason||null,nextRetryAt:candidate.marketCollection.nextRetryAt||null}:null,companyId:candidate?.companyId||null,policyId:policy.id,mode:'PAPER_ONLY',action,status:publishable?'PAPER_REVIEW':'INSUFFICIENT_DATA',generatedAt:validTime?new Date(at).toISOString():null,validUntil:publishable?new Date(Math.min(at+policy.validityHours*3600000,Date.parse(price.priceDate)+8*86400000,Date.parse(base.analysisDate||base.analyzedAt||base.checkedAt)+24*3600000)).toISOString():null,priceReference:price?{value:price.close,currency:price.currency,asOfDate:price.priceDate}:null,score:publishable?score:null,checks,blockers,reasons:publishable?[action==='BUY'?'COMMITTEE_SCORE_AND_DATA_CHECKS_PASSED':action==='SELL'?'LOW_SCORE_OR_CONFIRMED_RISK_REVIEW':'NO_DIRECTIONAL_RULE_TRIGGER']:[],sellMeaning:'REDUCE_EXISTING_HOLDING_NOT_SHORT_SALE',targetPrice:null,expectedReturn:null,winProbability:null,calibration:policy.calibration,orderExecution:false};
 return {...result,evidenceFingerprint:createHash('sha256').update(JSON.stringify({companyId:result.companyId,price,ttm,valuation,signals,risk:detail?.risk,peerComparisons:metrics,checks,blockers,policyId:policy.id,review:base?.recommendationGate})).digest('hex')};
}
export function tradeRuleExamples(){return {mode:'RULE_SIMULATION',actualRecommendations:false,examples:[{name:'가상 조건 A',score:65,bearSeverity:10,riskPenalty:2},{name:'가상 조건 B',score:30,bearSeverity:80,riskPenalty:12},{name:'가상 조건 C',score:42,bearSeverity:20,riskPenalty:3}].map(x=>({...x,action:classifyTradeRule(x)}))};}
