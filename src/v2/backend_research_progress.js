import {readFile} from 'node:fs/promises';
const DAY=86400000;
export function researchProgress(input,now=Date.now()) {
 const unavailable=reason=>({status:'UNVERIFIED',reason,sourceCollection:'NOT_VERIFIED',newOfficialDocuments:null});
 const checked=Date.parse(input?.checkedAt);
 if(!Number.isFinite(checked)||checked>now||now-checked>DAY)return unavailable('RESEARCH_REPORT_MISSING_OR_STALE');
 const status=input.status;
 if(!['RUNNING','EVIDENCE_RECORDED','BLOCKED','INTERRUPTED'].includes(status))return unavailable('RESEARCH_STATUS_INVALID');
 // Publication of a receipt must never renew the underlying work's age.
 const reference=status==='RUNNING'?input.startedAt:input.finishedAt;
 const worked=Date.parse(reference);
 if(!Number.isFinite(worked)||worked>checked||worked>now)return unavailable('RESEARCH_WORK_TIME_UNVERIFIED');
 if(now-worked>DAY)return unavailable('RESEARCH_WORK_STALE');
 const started=Date.parse(input.startedAt);
 if(input.startedAt&&(!Number.isFinite(started)||started>worked))return unavailable('RESEARCH_WORK_TIME_UNVERIFIED');
 const sourceCollection=input.sourceCollection==='NOT_RUN'?'NOT_RUN':'NOT_VERIFIED';
 return {status,checkedAt:input.checkedAt,workAt:reference,startedAt:input.startedAt||null,finishedAt:status==='RUNNING'?null:reference,sourceCollection,newOfficialDocuments:sourceCollection==='NOT_RUN'?0:null,recommendationStatus:'HOLD',note:'에이전트 작업 보고와 공식 원천 수집 완료는 구분합니다.'};
}
export function registerBackendResearchProgress(app,filename) {
 app.get('/api/v2/research/progress',async(_req,res)=>{res.set('Cache-Control','no-store');let value;try{value=JSON.parse(await readFile(filename,'utf8'));}catch{}res.json({success:true,...researchProgress(value)});});
}
