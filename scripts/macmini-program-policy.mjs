const stages=new Set(['GATE1','GATE2','GATE3','GATE4','FINAL_REVIEW']);
const statuses=new Set(['RUNNING','BLOCKED','REVIEW_REQUIRED']);
const countKeys=['totalCompanies','totalSecurities','checkedSecurities','verified','pending','blocked','unprocessed'];
export function programSummary(input,now=Date.now()){
 const unknown={verification:'UNVERIFIED',stage:'GATE1',status:'UNKNOWN',counts:null};
 if(input?.schemaVersion!==1||!stages.has(input.stage)||!statuses.has(input.status))return unknown;
 const time=Date.parse(input.checkedAt);
 if(!Number.isFinite(time)||time>now||now-time>86400000)return unknown;
 if(!countKeys.every(k=>input[k]===null||Number.isSafeInteger(input[k])&&input[k]>=0))return unknown;
 const all=keys=>keys.every(k=>input[k]!==null);
 if(all(['checkedSecurities','verified','pending','blocked'])&&input.checkedSecurities!==input.verified+input.pending+input.blocked)return unknown;
 if(all(['totalSecurities','checkedSecurities','unprocessed'])&&input.totalSecurities!==input.checkedSecurities+input.unprocessed)return unknown;
 if(all(['totalCompanies','totalSecurities'])&&input.totalCompanies>input.totalSecurities)return unknown;
 for(const key of ['checkedSecurities','verified','pending','blocked','unprocessed'])if(all(['totalSecurities',key])&&input[key]>input.totalSecurities)return unknown;
 return {verification:'AGENT_REPORTED_NOT_INDEPENDENTLY_VERIFIED',stage:input.stage,status:input.status,checkedAt:input.checkedAt,counts:Object.fromEntries(countKeys.map(k=>[k,input[k]]))};
}
export function cyclePolicy(job,consecutiveBlocked,summary){
 if(job?.status==='RUNNING')return {run:false,mode:'WAIT_RUNNING'};
 if(summary.stage==='FINAL_REVIEW'&&summary.status==='REVIEW_REQUIRED'&&summary.counts?.totalSecurities>0&&summary.counts.unprocessed===0&&summary.counts.pending===0&&summary.counts.blocked===0&&summary.counts.checkedSecurities===summary.counts.totalSecurities&&summary.counts.verified===summary.counts.totalSecurities)return {run:false,mode:'INDEPENDENT_FINAL_REVIEW_REQUIRED'};
 return {run:true,mode:consecutiveBlocked>=2?'REPAIR_EXECUTION':'CONTINUE_NEXT_UNFINISHED_TASK'};
}
export function cycleRequest(full,summary,mode){
 const marker={GATE1:'## C.',GATE2:'## D.',GATE3:'## E.',GATE4:'## F.',FINAL_REVIEW:'## H.'}[summary.stage]||'## C.';
 const start=full.indexOf(marker),end=full.indexOf('\n## ',start+1);
 if(start<0)throw Error('PROGRAM_STAGE_INSTRUCTIONS_MISSING');
 const section=full.slice(start,end<0?undefined:end);
 return 'KSTOCK 지속 업무의 이번 작은 사이클만 수행한다. 전체 지시서는 docs/KSTOCK_MACMINI_CONTINUOUS_PROMPT.md에 보존돼 있다. AGENTS.md와 docs/ARI_COMPLIANCE_STANDARD.md 준수. 기존 미커밋·원문 보고서 보존. 운영/환경/키/프런트/모바일/실거래/에이전트 정책 변경 및 commit/push 금지. task는 git-status, kstock-offline-test, git-diff만 사용. tests/diff 예제 생성 금지.\n현재 모드: '+mode+' / 단계: '+summary.stage+'. 반복 실패면 실제 실패를 읽고 더 작은 exact replace 또는 도구 오류 기록으로 접근을 바꿔라.\n'+section+'\n결과는 기존 docs/KSTOCK_BACKEND_AGENT_REPORT.md에 추가하고 docs/KSTOCK_MACMINI_CONTINUOUS_REPORT.md에 현재 단계·수정·실행 테스트·차단·다음 작은 작업을 기록하라. 마지막 파일 수정 후 kstock-offline-test, git-diff를 실행하라. 단일 사이클 종료는 전체 완료가 아니다. 다음 사이클은 미완료 단계부터 이어간다. 검증하지 않은 다음 단계 진입이나 전체 완료 선언 금지. 진행 JSON 스키마는 전체 지시서 G절을 필요한 때 읽어라.';
}
