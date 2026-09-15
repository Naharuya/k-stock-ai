(() => {
  const box=document.getElementById('morningBrief');if(!box)return;
  const details=document.createElement('details'),summary=document.createElement('summary'),state=document.createElement('p'),cancel=document.createElement('button');
  summary.textContent='연결·운영 상태';state.setAttribute('role','status');cancel.textContent='진행 중인 분석 중지';cancel.disabled=true;
  details.append(summary,state,cancel);box.append(details);
  cancel.onclick=async()=>{cancel.disabled=true;try{const r=await fetch('/api/daily/cancel',{method:'POST'});state.textContent=r.ok?'중지를 요청했습니다. 진행 상태에 반영될 때까지 기다려 주세요.':'중지 요청에 실패했습니다.';}catch{state.textContent='서버 연결을 확인해 주세요.';}};
  async function refresh(){
    try{const r=await fetch('/api/operations/health',{cache:'no-store'});if(!r.ok)return;const {result:x}=await r.json();cancel.disabled=!x.active;
      state.textContent=(x.tls?'HTTPS 연결':'로컬 HTTP 연결')+' · 서버 가동 '+Math.floor(x.uptimeSeconds/60)+'분 · '+(x.active?'분석 중':'대기 중')+(x.notification?' · 자동 분석 '+({SUCCESS:'완료',PARTIAL:'부분 완료',FAILED:'실패'}[x.notification.status]||x.notification.status):'');
    }catch{state.textContent='서버에 연결할 수 없습니다. PC 전원과 네트워크를 확인해 주세요.';}
  }
  refresh();setInterval(()=>{if(!document.hidden)refresh();},15000);
})();
