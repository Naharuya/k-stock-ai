(() => {
  if(/KStockAndroid/.test(navigator.userAgent)){const a=document.createElement('a');a.href='kstock://notifications';a.className='install-action';a.textContent='분석 알림 켜기';document.getElementById('morningBrief')?.append(a);}
  const nav=[...document.querySelectorAll('.mobile-bottom-nav a')];
  function active(hash){nav.forEach(a=>a.setAttribute('aria-current',String(a.getAttribute('href')===hash)));}
  active(location.hash||'#morningBrief');
  window.addEventListener('hashchange',()=>active(location.hash||'#morningBrief'));
  nav.forEach(a=>a.addEventListener('click',()=>active(a.getAttribute('href'))));
  const banner=document.getElementById('networkBanner');
  const connection=()=>banner.classList.toggle('is-offline',!navigator.onLine);
  window.addEventListener('offline',connection);window.addEventListener('online',connection);connection();
  let installPrompt;
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;});
  document.getElementById('installApp').addEventListener('click',async event=>{
    if(installPrompt){event.preventDefault();await installPrompt.prompt();installPrompt=null;}
  });
})();

if(navigator.userAgent.includes('KStockAndroid')){document.getElementById('nativeSettings').hidden=false;document.getElementById('installApp').hidden=true;}
