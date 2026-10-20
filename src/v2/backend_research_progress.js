import {readFile} from 'node:fs/promises';
export function researchProgress(input,now=Date.now()) {
 const at=Date.parse(input?.checkedAt);
 if(!Number.isFinite(at)||at>now||now-at>86400000)return {status:'UNVERIFIED',reason:'RESEARCH_REPORT_MISSING_OR_STALE',sourceCollection:'NOT_VERIFIED',newOfficialDocuments:null};
 const sourceCollection=input.sourceCollection==='NOT_RUN'?'NOT_RUN':'NOT_VERIFIED';
 return {status:['RUNNING','EVIDENCE_RECORDED','BLOCKED','INTERRUPTED'].includes(input.status)?input.status:'UNVERIFIED',checkedAt:input.checkedAt,finishedAt:input.finishedAt||null,sourceCollection,newOfficialDocuments:sourceCollection==='NOT_RUN'?0:null,recommendationStatus:'HOLD',note:'에이전트 작업 보고와 공식 원천 수집 완료는 구분합니다.'};
}
export function registerBackendResearchProgress(app,filename) {
 app.get('/api/v2/research/progress',async(_req,res)=>{res.set('Cache-Control','no-store');let value;try{value=JSON.parse(await readFile(filename,'utf8'));}catch{}res.json({success:true,...researchProgress(value)});});
}
