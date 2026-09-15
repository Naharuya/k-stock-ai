(() => {
  const originalFetch=window.fetch.bind(window);let opening=false;
  async function pairing(){
    if(opening)return;opening=true;
    const dialog=document.createElement('dialog');dialog.style.cssText='max-width:440px;width:calc(100% - 48px);border:0;border-radius:20px;padding:24px';
    const title=document.createElement('h2');title.textContent='이 기기 연결';
    const body=document.createElement('p');body.textContent='PC의 localhost:3000에서 기기 연결 코드를 발급한 뒤 입력해 주세요.';
    const input=document.createElement('input');input.placeholder='연결 코드';input.autocomplete='one-time-code';input.setAttribute('aria-label','기기 연결 코드');input.style.width='100%';
    const button=document.createElement('button');button.textContent='연결하기';
    button.onclick=async()=>{button.disabled=true;try{const r=await originalFetch('/api/access/pair',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:input.value.trim()})});if(!r.ok)throw Error();location.reload();}catch{body.textContent='코드가 만료되었거나 올바르지 않습니다. PC에서 새 코드를 발급해 주세요.';button.disabled=false;}};
    dialog.append(title,body,input,button);document.body.append(dialog);dialog.showModal();dialog.addEventListener('cancel',e=>e.preventDefault());
  }
  window.fetch=async(...args)=>{const r=await originalFetch(...args);if(r.status===401)void pairing();return r;};
  originalFetch('/api/access/session').then(r=>r.json()).then(b=>{
    if(!b.result?.authenticated){if(b.result)void pairing();return;}
    if(!b.result.local)return;
    const button=document.createElement('button');button.textContent='기기 연결 코드';
    button.onclick=async()=>{const r=await originalFetch('/api/access/code',{method:'POST'}),b=await r.json();if(!r.ok)return;
      const d=document.createElement('dialog');d.style.cssText='max-width:440px;width:calc(100% - 48px);border-radius:20px;padding:24px';
      const p=document.createElement('p');p.textContent='휴대폰에 입력할 코드 · 10분 유효 · 한 번 사용';
      const code=document.createElement('input');code.value=b.result.code;code.readOnly=true;code.style.width='100%';code.onclick=()=>code.select();
      const close=document.createElement('button');close.textContent='닫기';close.onclick=()=>d.remove();d.append(p,code,close);document.body.append(d);d.showModal();
    };
    (document.querySelector('#morningBrief')||document.body).append(button);
  }).catch(()=>{});
})();
