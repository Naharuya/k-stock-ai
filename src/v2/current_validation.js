import {reviewQuarterRounding} from './quarter_rounding_review.js';
import {applySecScopeReviews} from './sec_xbrl_scope.js';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {CURRENT_UNIVERSE} from './current_universe.js';
import {buildCurrentResearch} from './current_research.js';
import {assertSafeKStockV2Environment} from './scoring.js';
import {readCurrent,saveCurrent,lockedCurrent} from './current_collection_io.js';
const VERSION='saved-company-validation-v21';
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
export function validateCurrentCompanies({capital=null,market=null,report=null,corrections=null,financials=null,observationInputs=null,scopeReviews=null,conflictAudit=null,riskReviews=null,previous=null,asOf}={}){
 if(!Number.isFinite(Date.parse(asOf)))throw Error('CURRENT_VALIDATION_TIME_INVALID');
 for(const input of [capital,market,corrections,financials,observationInputs,scopeReviews,conflictAudit,riskReviews])if(input&&(input.schemaVersion!==1||!Number.isFinite(Date.parse(input.checkedAt))||Date.parse(input.checkedAt)>Date.parse(asOf)))throw Error('CURRENT_VALIDATION_INPUT_INVALID');
 const day=new Date(Date.parse(asOf)+9*3600000).toISOString().slice(0,10);
 let evaluated=0,reused=0;
 const companies=CURRENT_UNIVERSE.map(company=>{
  const events=(capital?.events||[]).filter(e=>e.companyId===company.ticker).sort((a,b)=>String(a.eventId).localeCompare(String(b.eventId)));
  const collection=capital?.companies?.[company.ticker]||null;
  const reviews=(corrections?.reviews||[]).filter(r=>r.companyId===company.ticker&&Date.parse(r.checkedAt)<=Date.parse(asOf));
  const price=(market?.companies||[]).find(c=>c.ticker===company.ticker)||null;
  const companyRiskReviews=(riskReviews?.reviews||[]).filter(r=>r.companyId===company.ticker);
  const companyScopeReviews=(scopeReviews?.reviews||[]).filter(r=>r.companyId===company.ticker);
  const financialRow=financials?.companies?.find(c=>c.ticker===company.ticker)||null;
  const observations=observationInputs?.companies?.find(c=>c.companyId===company.ticker)||null;
  const base=(report?.candidates||[]).find(c=>c.ticker===company.ticker)||null;
  // Date is a dependency: freshness, recency and D2 can change without new documents.
  const q=price?.priceSnapshot||base?.priceSnapshot;
  const priceStillRecent=Number.isFinite(Date.parse(q?.sessionDate))&&Date.parse(asOf)>=Date.parse(q.sessionDate)&&Date.parse(asOf)-Date.parse(q.sessionDate)<8*86400000;
  const revision=digest({version:VERSION,day,priceStillRecent,events,collection,price,base,reviews,financialRow,observations,companyScopeReviews,companyRiskReviews,conflictAudit:conflictAudit?.companyId===company.ticker?conflictAudit:null});
  const old=previous?.version===VERSION?previous.companies?.find(c=>c.companyId===company.ticker):null;
  if(old?.revision===revision){reused++;return {...old,reused:true};}
  evaluated++;
  const research=buildCurrentResearch({asOf,currentRiskReviews:{reviews:companyRiskReviews},capitalEvents:events,currentCapitalCollection:{companies:{[company.ticker]:collection}},currentMarketSnapshots:market,currentFinancials:financials?{...financials,companies:financials.companies.map(c=>({...c,conflictReview:conflictAudit?.companyId===c.ticker?reviewQuarterRounding(conflictAudit,scopeReviews?.reviews||[],asOf):null,scopeReviews:(scopeReviews?.reviews||[]).filter(r=>r.companyId===c.ticker),quarterHistory:applySecScopeReviews(c.quarterHistory,scopeReviews?.reviews||[],c.ticker,asOf)}))}:null,currentObservationInputs:observationInputs,currentCompanySnapshots:base?[base]:[]});
  const candidate=research.candidates[0];
  const exception=collection?.reason==='CURRENT_AMENDMENT_REVIEW_REQUIRED'?'CURRENT_AMENDMENT_REVIEW_REQUIRED':collection?.status==='BLOCKED'?(collection.reason||'CURRENT_COLLECTION_BLOCKED'):null;
  const blockers=[...new Set([...(candidate?.blockers||[]),...(exception?[exception]:[]),...(!candidate?['CURRENT_VERIFIED_EVENT_REQUIRED']:[])])];
  return {companyId:company.ticker,companyName:company.companyName,revision,validatedAt:asOf,reused:false,status:exception?'BLOCKED':candidate?'PARTIAL':'INSUFFICIENT_DATA',verifiedEvents:candidate?.verifiedEvents||0,correctionReviews:reviews,detail:candidate?.detail||null,tradeRecommendation:candidate?.tradeRecommendation||null,checks:candidate?.validationChecks||[],blockers,nextAction:exception==='CURRENT_AMENDMENT_REVIEW_REQUIRED'?'VERIFY_CORRECTION_CHAIN':exception?'WAIT_FOR_OFFICIAL_SOURCE':!candidate?'COLLECT_CURRENT_OFFICIAL_EVENT':blockers.includes('CURRENT_PRICE_REQUIRED')?'WAIT_FOR_PRICE_PROVIDER':'COMPLETE_FINANCIAL_ACTION_AND_RISK_VALIDATION',recommendationStatus:'HOLD'};
 });
 return {schemaVersion:1,version:VERSION,checkedAt:asOf,mode:'SAVED_EVIDENCE_VALIDATION_ONLY',externalRequests:0,evaluated,reused,companies,exceptions:companies.filter(c=>c.status==='BLOCKED').map(c=>({companyId:c.companyId,reasons:c.blockers,nextAction:c.nextAction})),recommendationStatus:'HOLD',history:[...(previous?.history||[]),...(previous?[{checkedAt:previous.checkedAt,evaluated:previous.evaluated,reused:previous.reused,exceptions:previous.exceptions?.map(c=>c.companyId)||[]}]:[])].slice(-30)};
}
export async function runCurrentValidation({env=process.env,directory='data/v2',now=()=>new Date().toISOString()}={}){
 assertSafeKStockV2Environment(env);
 const file=path.join(directory,'influence/current-validation.json');
 return lockedCurrent(file,async()=>{
  const [capital,market,report,previous,corrections,financials,observationInputs,scopeReviews,conflictAudit,riskReviews]=await Promise.all([readCurrent(path.join(directory,'influence/current-capital-sources.json')),readCurrent(path.join(directory,'influence/current-market-snapshots.json')),readCurrent(env.KSTOCK_V2_OUTPUT_PATH||path.join(directory,'reports/latest.json')),readCurrent(file),readCurrent(path.join(directory,'influence/current-corrections.json')),readCurrent(path.join(directory,'influence/current-financials.json')),readCurrent(path.join(directory,'influence/current-observation-inputs.json')),readCurrent(path.join(directory,'influence/sec-scope-reviews.json')),readCurrent(path.join(directory,'influence/sec-quarter-conflict-review.json')),readCurrent(path.join(directory,'influence/current-risk-reviews.json'))]);
  const result=validateCurrentCompanies({capital,market,report,previous,corrections,financials,observationInputs,scopeReviews,conflictAudit,riskReviews,asOf:now()});
  await saveCurrent(file,result);return result;
 });
}
