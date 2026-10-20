/* Existing authenticated request path; no credential persistence or source collection. */
(function(){
 const root=document.getElementById('agent-dashboard');if(!root)return;
 const panel=document.createElement('p');panel.id='backend-research-progress';panel.setAttribute('role','status');panel.textContent='맥미니 작업 보고 확인 전';root.prepend(panel);
 async function refresh(){
  try{const data=await candidateRequest('/api/v2/research/progress');const labels={RUNNING:'조사 작업 실행 중',EVIDENCE_RECORDED:'작업 보고 제출됨',BLOCKED:'조사 작업 차단',INTERRUPTED:'작업 중단',UNVERIFIED:'작업 보고 미확인'};
   panel.textContent=`맥미니: ${labels[data.status]||'미확인'} · 공식 원천 수집 ${data.sourceCollection==='NOT_RUN'?'미실행':'미확인'} · 신규 공식 자료 ${Number.isInteger(data.newOfficialDocuments)?data.newOfficialDocuments+'건':'미확인'} · 추천 보류`;
  }catch(error){panel.textContent=error.message==='AUTH'?'맥미니 작업 보고: 인증 설정 후 확인하세요.':'맥미니 작업 보고를 확인하지 못했습니다. 새로고침으로 다시 확인하세요.';}
 }
 window.addEventListener('hashchange',()=>{if(location.hash==='#agent-dashboard')refresh();});
 root.addEventListener('click',event=>{if(event.target.closest('button'))refresh();});
 refresh();
})();
