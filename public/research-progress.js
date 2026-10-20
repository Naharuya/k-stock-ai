/* Authenticated report reads only. No collection, storage or worker activation. */
(function(){
 const root=document.getElementById('agent-dashboard');if(!root)return;
 const box=document.createElement('div'),panel=document.createElement('p'),retry=document.createElement('button');
 panel.id='backend-research-progress';panel.setAttribute('role','status');panel.textContent='맥미니 작업 보고 확인 전';
 retry.type='button';retry.className='candidate-button';retry.textContent='작업 보고 새로고침';retry.id='backend-research-refresh';box.append(panel,retry);root.prepend(box);
 const labels={RUNNING:'조사 작업 실행 중',EVIDENCE_RECORDED:'작업 보고 제출됨',BLOCKED:'조사 작업 차단',INTERRUPTED:'작업 중단',UNVERIFIED:'작업 보고 미확인'};
 const reasons={RESEARCH_REPORT_MISSING_OR_STALE:'보고가 없거나 오래되었습니다.',RESEARCH_WORK_STALE:'실제 작업 시각이 오래되었습니다. 보고를 다시 게시해도 작업이 갱신되지는 않습니다.',RESEARCH_WORK_TIME_UNVERIFIED:'실제 작업 시각을 확인하지 못했습니다.',RESEARCH_STATUS_INVALID:'작업 상태를 확인하지 못했습니다.'};
 let active=null,sequence=0;
 async function refresh(){
  const ticket=++sequence;if(active)active.abort();const controller=new AbortController();active=controller;
  retry.disabled=true;panel.textContent='맥미니 작업 보고 확인 중';
  const timer=setTimeout(()=>controller.abort(),10000);
  try{
   const data=await candidateRequest('/api/v2/research/progress',true,{signal:controller.signal});if(ticket!==sequence)return;
   const time=Date.parse(data.workAt);const when=Number.isFinite(time)?new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Seoul'}).format(time):'미확인';
   panel.textContent=`맥미니: ${labels[data.status]||'미확인'} · 실제 작업 ${when} · 공식 원천 수집 ${data.sourceCollection==='NOT_RUN'?'미실행':'미확인'} · 신규 공식 자료 ${Number.isInteger(data.newOfficialDocuments)?data.newOfficialDocuments+'건':'미확인'} · 추천 보류${reasons[data.reason]?' · '+reasons[data.reason]:''}`;
  }catch(error){if(ticket!==sequence)return;panel.textContent=error.message==='AUTH'?'맥미니 작업 보고: 인증 설정 후 확인하세요.':error.name==='AbortError'?'작업 보고 조회 시간이 초과됐습니다. 다시 조회하세요.':'맥미니 작업 보고를 확인하지 못했습니다. 새로고침으로 다시 확인하세요.';}
  finally{clearTimeout(timer);if(ticket===sequence){active=null;retry.disabled=false;}}
 }
 retry.addEventListener('click',refresh);
 window.addEventListener('hashchange',()=>{if(location.hash==='#agent-dashboard')refresh();});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&location.hash==='#agent-dashboard')refresh();});
 window.addEventListener('pagehide',()=>{sequence++;active?.abort();active=null;retry.disabled=false;});
 refresh();
})();
