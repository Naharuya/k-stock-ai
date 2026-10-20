import {lockedCurrent,readCurrent,saveCurrent} from './current_collection_io.js';
import {assertSafeKStockV2Environment} from './scoring.js';
import {buildResearchDashboard} from './research_dashboard.js';
const KST=9*3600000;
export const OVERNIGHT_POLICY={timeZone:'Asia/Seoul',nightFrom:'02:00',nightThrough:'06:00',morningReportAt:'07:30',execution:'EXISTING_30_MINUTE_SCHEDULER_ONLY',requires:'MAC_AWAKE_AND_LOCAL_SERVER_RUNNING',recommendationStatus:'HOLD'};
export function overnightClock(at){if(!Number.isFinite(Date.parse(at)))throw Error('OVERNIGHT_TIME_INVALID');const x=new Date(Date.parse(at)+KST);return {date:x.toISOString().slice(0,10),minute:x.getUTCHours()*60+x.getUTCMinutes()};}
export function createOvernightResearch({file='data/v2/research-automation/overnight.json',loadResearch,loadCollection=async()=>({}),env=process.env,enabled=false,now=()=>new Date().toISOString()}={}){
 async function status(){const state=await readCurrent(file);return {enabled,policy:OVERNIGHT_POLICY,lastCheckedAt:state?.lastCheckedAt||null,latestReport:state?.reports?.at(-1)||null,nightRuns:state?.nightRuns?.length||0};}
 return {status,async run(){
  assertSafeKStockV2Environment(env);if(!enabled)return {status:'DISABLED',externalRequests:0};
  return lockedCurrent(file,async()=>{
   const at=now(),clock=overnightClock(at),old=await readCurrent(file)||{nightRuns:[],reports:[]};
   if(old.lastCheckedAt&&Date.parse(old.lastCheckedAt)>Date.parse(at))return {status:'BLOCKED',reason:'OVERNIGHT_CLOCK_CONFLICT',externalRequests:0};
   const state={...old,schemaVersion:1,lastCheckedAt:at,nightRuns:[...(old.nightRuns||[])],reports:[...(old.reports||[])]};
   if(clock.minute>=120&&clock.minute<360){
    const slot=clock.date+':'+Math.floor(clock.minute/30);
    if(!state.nightRuns.some(r=>r.slot===slot)){
     const collection=await loadCollection();const age=Date.parse(at)-Date.parse(collection.lastCheckedAt);
     const observed=Number.isFinite(age)&&age>=0&&age<=5*60000;
     state.nightRuns.push({slot,checkedAt:at,date:clock.date,status:observed?'EXISTING_COLLECTION_CYCLE_OBSERVED':'COLLECTION_NOT_OBSERVED',collectionCheckedAt:observed?collection.lastCheckedAt:null,collectionStatus:observed?collection.status:null,externalRequests:observed&&Number.isInteger(collection.externalRequests)?collection.externalRequests:null});
    }
   }
   let reportCreated=false;
   if(clock.minute>=450&&!state.reports.some(r=>r.date===clock.date)){
    let data;
    try{data=await loadResearch();}catch{
     state.reports.push({date:clock.date,generatedAt:at,scheduledAt:clock.date+'T07:30:00+09:00',status:'BLOCKED',reason:'RESEARCH_INPUT_UNAVAILABLE',nightCoverage:state.nightRuns.some(r=>r.date===clock.date)?'OBSERVED_SLOTS_ONLY':'NO_NIGHT_EXECUTION_RECORDED',observedNightSlots:state.nightRuns.filter(r=>r.date===clock.date).length,candidates:null,newCandidates:null,eligibleRecommendations:0,companies:[],recommendationStatus:'HOLD'});
     state.reports=state.reports.slice(-31);await saveCurrent(file,state);return {status:'MORNING_REPORT_BLOCKED',reportCreated:true,externalRequests:0};
    }
    const dashboard=buildResearchDashboard(data),current=dashboard.currentResearch;
    const night=state.nightRuns.filter(r=>r.date===clock.date),previous=state.reports.filter(r=>r.date<clock.date).at(-1);
    const ids=current.candidates.map(c=>c.companyId),before=previous?.companyIds;
    const report={status:'PARTIAL',date:clock.date,generatedAt:at,scheduledAt:clock.date+'T07:30:00+09:00',timing:clock.minute===450?'ON_SCHEDULE':'AFTER_SCHEDULE',nightCoverage:night.length?'OBSERVED_SLOTS_ONLY':'NO_NIGHT_EXECUTION_RECORDED',observedNightSlots:night.length,failedCollectionCycles:night.filter(r=>['BLOCKED','FAILED'].includes(r.collectionStatus)).length,collectionCyclesObserved:night.filter(r=>r.status==='EXISTING_COLLECTION_CYCLE_OBSERVED').length,collectionHttpRequests:night.every(r=>Number.isInteger(r.externalRequests))?night.reduce((s,r)=>s+r.externalRequests,0):null,companyIds:ids,candidates:ids.length,newCandidates:before?ids.filter(id=>!before.includes(id)).length:null,eligibleRecommendations:current.eligibleRecommendations,verifiedReturnPeriods:current.candidates.flatMap(c=>c.detail?.observations||[]).reduce((n,o)=>n+(o.verifiedSamples||0),0),companies:current.candidates.map(c=>({companyId:c.companyId,companyName:c.companyName,latestDisclosureDate:c.latestDisclosureDate,priceDate:c.price?.priceDate||null,blockers:c.blockers,recommendationStatus:'HOLD'})),recommendationStatus:'HOLD',limitations:['NO_NIGHT_EXECUTION_WITHOUT_RUNNING_SERVER','HTTP_REQUESTS_ARE_NOT_VERIFIED_DOCUMENTS','FIRST_REPORT_HAS_NO_NEW_CANDIDATE_BASELINE','NOT_STRATEGY_VALIDATION']};
    state.reports.push(report);reportCreated=true;
   }
   state.nightRuns=state.nightRuns.slice(-31*8);state.reports=state.reports.slice(-31);
   await saveCurrent(file,state);return {status:reportCreated?'MORNING_REPORT_SAVED':clock.minute>=120&&clock.minute<360?'NIGHT_CYCLE_RECORDED':'WAITING_FOR_SCHEDULE',externalRequests:0,reportCreated};
  });
 }};
}
