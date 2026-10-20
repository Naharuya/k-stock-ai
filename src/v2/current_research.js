import {assessTradeRecommendation} from './trade_recommendations.js';
import {currentCandidateDetail} from './current_candidate_detail.js';
import {CURRENT_UNIVERSE} from './current_universe.js';
import {isD2Eligible} from './scoring.js';
import {validateCapitalEvent} from './influence_engine.js';
const DAY=86400000;
const civil=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
export const CURRENT_RESEARCH_POLICY={id:'recent-public-evidence-30d-v1',days:30,kind:'RESEARCH_VALIDATION_ONLY',minimumPeerSamples:3,recommendationStatus:'HOLD'};
export function buildCurrentResearch(data,{asOf=data.asOf}={}){
 if(!Number.isFinite(Date.parse(asOf)))throw Error('CURRENT_RESEARCH_CUTOFF_INVALID');
 const through=new Date(Date.parse(asOf)+9*3600000).toISOString().slice(0,10);
 const from=new Date(Date.parse(through)-(CURRENT_RESEARCH_POLICY.days-1)*DAY).toISOString().slice(0,10);
 const groups=new Map(),seen=new Set();let futureExcluded=0;
 function add(event,companyId,kind){
  const date=kind==='CAPITAL'?event.filingDate:event.statementDate;
  if(!civil(date)||date<from)return;
  const available=Date.parse(event.publicAvailableAt);
  if(date>through||!Number.isFinite(available)||available>Date.parse(asOf)){futureExcluded++;return;}
  if(!/^(?:[A-Z][A-Z0-9.-]{0,14}|\d{6})$/.test(companyId||''))return;
  const id=event.eventId||event.statementId;if(!id||seen.has(companyId+':'+id))return;seen.add(companyId+':'+id);
  const valid=kind==='CAPITAL'?validateCapitalEvent(event,{asOf}).verificationStatus==='VERIFIED':event.verificationStatus==='VERIFIED'&&event.officialSource===true&&event.sourceIntegrity===true&&/^[a-f\d]{64}$/i.test(event.sourceHash||'');
  const reasons=[...new Set([...(event.reasons||[]),...(!valid?['OFFICIAL_EVIDENCE_REQUIRED']:[]),...(!isD2Eligible(event.publicAvailableAt,asOf)?['D2_AVAILABILITY_WAIT']:[])])];
  let sourceUrl=null;try{const u=new URL(event.sourceUrl);if(u.protocol==='https:'&&!u.username&&!u.password)sourceUrl=u.href;}catch{}
  const observation={eventId:id,kind,eventType:event.eventType||'PUBLIC_STATEMENT',actionType:event.actionType||null,filingDate:date,eventDate:event.transactionDate||event.reportingPeriodEnd||event.reportingPeriod||event.statementDate||null,publicAvailableAt:event.publicAvailableAt,publicationTimePrecision:event.publicationTimePrecision||null,quantity:Number.isFinite(event.quantity)?event.quantity:null,planned10b51:event.planned10b51===true,verificationStatus:valid?'VERIFIED':'INSUFFICIENT_DATA',reasons,sourceUrl,documentId:event.documentId||null};
  if(!groups.has(companyId))groups.set(companyId,[]);groups.get(companyId).push(observation);
 }
 for(const e of data.capitalEvents||[])add(e,e.companyId,'CAPITAL');
 for(const s of data.statements||[])for(const id of s.relatedCompanies||[])add(s,id,'STATEMENT');
 const candidates=[...groups].map(([companyId,events])=>{
  events.sort((a,b)=>b.filingDate.localeCompare(a.filingDate)||a.eventId.localeCompare(b.eventId));
  const base=(data.currentCompanySnapshots||[]).find(c=>c.ticker===companyId),current=(data.currentMarketSnapshots?.companies||[]).find(c=>c.ticker===companyId);
  const price=current?.priceSnapshot||base?.priceSnapshot;
  const priceAge=civil(price?.sessionDate)?(Date.parse(asOf)-Date.parse(price.sessionDate))/DAY:Infinity;
  const priceVerified=price?.status==='READY'&&price.adjusted===false&&Number.isFinite(price.close)&&price.close>0&&civil(price.sessionDate)&&priceAge>=0&&priceAge<8&&isD2Eligible(price.observedAt,asOf);
  const blockers=[...new Set(events.flatMap(e=>e.reasons))];
  const collection=data.currentCapitalCollection?.companies?.[companyId];
  if(collection?.reason==='CURRENT_AMENDMENT_REVIEW_REQUIRED')blockers.push('CURRENT_AMENDMENT_REVIEW_REQUIRED');
  if(collection?.status==='BLOCKED')blockers.push('CURRENT_COLLECTION_BLOCKED');
  if(!priceVerified)blockers.push('CURRENT_PRICE_REQUIRED');
  if(base?.recommendationGate?.status!=='VERIFIED')blockers.push('FINANCIAL_PEER_RISK_REVALIDATION_REQUIRED');
  if(current?.corporateActionSnapshot?.status!=='VERIFIED')blockers.push('CORPORATE_ACTION_COVERAGE_REQUIRED');
  blockers.push('PREDICTIVE_VALIDATION_REQUIRED');
  const detail=currentCandidateDetail({companyId,events,financialRow:data.currentFinancials?.companies?.find(c=>c.ticker===companyId),marketRow:current,riskReviews:data.currentRiskReviews?.reviews||[],observationInputs:data.currentObservationInputs?.companies?.find(c=>c.companyId===companyId)?.inputs,asOf});
  const candidate={detail,marketCollection:data.currentMarketSnapshots?.checks?.[companyId]||null,companyId,companyName:base?.companyName||CURRENT_UNIVERSE.find(c=>c.ticker===companyId)?.companyName||companyId,latestDisclosureDate:events[0].filingDate,events,verifiedEvents:events.filter(e=>e.verificationStatus==='VERIFIED').length,price:priceVerified?{close:price.close,currency:price.currency,priceDate:price.sessionDate,priceType:'RAW_CLOSE',sourceUrl:price.sourceUrl,checkedAt:current?(current.checkedAt||data.currentMarketSnapshots.checkedAt):null}:null,priceStatus:priceVerified?'READY':'INSUFFICIENT_DATA',validationChecks:[{id:'SOURCE',label:'공식 원문',status:events.every(e=>e.verificationStatus==='VERIFIED')?'VERIFIED':'INSUFFICIENT_DATA'},{id:'PUBLIC_TIME',label:'공개 후 이용 가능 시점',status:blockers.includes('D2_AVAILABILITY_WAIT')?'PENDING':'NOT_BLOCKED_BY_D2'},{id:'PRICE',label:'최신 가격',status:priceVerified?'VERIFIED':'INSUFFICIENT_DATA'},{id:'CORPORATE_ACTIONS',label:'기업행동',status:blockers.includes('CORPORATE_ACTION_COVERAGE_REQUIRED')?'INSUFFICIENT_DATA':'VERIFIED'},{id:'FINANCIAL_RISK',label:'재무·비교기업·위험',status:blockers.includes('FINANCIAL_PEER_RISK_REVALIDATION_REQUIRED')?'PENDING':'VERIFIED'},{id:'PREDICTIVE',label:'추천 예측력',status:'PENDING'}],status:'UNDER_REVIEW',recommendationStatus:'HOLD',rank:null,score:null,blockers:[...new Set(blockers)]};
  return {...candidate,tradeRecommendation:assessTradeRecommendation({candidate,base,asOf})};
 }).sort((a,b)=>b.latestDisclosureDate.localeCompare(a.latestDisclosureDate)||a.companyId.localeCompare(b.companyId));
 return {schemaVersion:1,policy:CURRENT_RESEARCH_POLICY,asOf,window:{from,through,days:30,timeZone:'Asia/Seoul'},status:candidates.length?'UNDER_REVIEW':'INSUFFICIENT_DATA',candidates,companyCount:candidates.length,verifiedEventCount:candidates.reduce((n,c)=>n+c.verifiedEvents,0),eligibleRecommendations:0,futureExcluded,sourceCollection:data.currentCapitalCollection||null,automationValidation:data.currentValidation||null,collectionQueue:CURRENT_UNIVERSE.map(c=>({companyId:c.ticker,companyName:c.companyName,...(data.currentCapitalCollection?.companies?.[c.ticker]||{status:'QUEUED',checkedAt:null})})),limitations:['DISCLOSURE_DATE_IS_NOT_TRANSACTION_DATE','OBSERVED_AVAILABLE_BY_IS_NOT_FIRST_PUBLIC_TIME','RESEARCH_CANDIDATE_IS_NOT_BUY_OR_SELL_ADVICE'],recommendationStatus:'HOLD'};
}
