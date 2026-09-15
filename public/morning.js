(() => {
  const el=id=>document.getElementById(id);
  if(!el('morningBrief'))return;
  let polling=false;
  const text=(id,value)=>{el(id).textContent=value;};
  const time=value=>value?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value)):'-';
  async function api(url,options={}) {
    const response=await fetch(url,{cache:'no-store',...options});
    const body=await response.json();
    if(!response.ok||!body.success)throw new Error(body.error||'요청 실패');
    return body.result||body;
  }
  async function refresh(){
    if(polling)return;polling=true;
    try {
      const [report,status]=await Promise.all([api('/api/daily/latest'),api('/api/daily/agents/status')]);
      await sync();
      const saved=report.date?report:null;
      text('morningSchedule',status.scheduler?.enabled?'자동 분석 '+String(status.scheduler.hour).padStart(2,'0')+':'+String(status.scheduler.minute).padStart(2,'0')+' KST':'자동 분석 꺼짐');
      const running=Boolean(status.active);
      document.querySelectorAll('[data-morning-scope]').forEach(b=>{b.disabled=running;});
      text('morningState',running?'분석 중':saved?(saved.date===status.date?'':'이전 결과 · ')+saved.date+' · '+({SUCCESS:'분석 완료',PARTIAL:'부분 완료',FAILED:'분석 실패'}[saved.status]||saved.status)+' '+time(saved.completedAt):'아직 생성된 Morning Brief가 없습니다.');
      text('morningMarket',({RISK_ON:'상승 우위',NEUTRAL_MIXED:'중립 · 혼조',RISK_OFF:'위험 회피'})[saved?.marketRegime]||'확인 대기');
      text('morningRisk',saved?String(saved.newRiskCount)+'건':'-');
      text('morningBasis',saved?({PRE_MARKET:'장전',INTRADAY:'장중 · 최신 조회가와 확정 일봉 비교',POST_MARKET:'장후',NON_TRADING_DAY:'휴장일 · 마지막 거래일 데이터와 최신 뉴스·공시'}[saved.session]||'분석')+' · 일봉·수급 기준 '+saved.sourceTradingDate+' · 실시간 수급 확정 여부는 별도 확인':'전 거래일 확정 데이터를 기준으로 분석합니다.');
      const box=el('morningCandidates');box.replaceChildren();
      for(const c of saved?.topCandidates||[]){
        const card=document.createElement('article');card.className='daily-stock';
        const title=document.createElement('strong');title.textContent=c.name+' · '+c.code;
        const detail=document.createElement('p');detail.textContent=({WATCH:'관찰',INTEREST:'관심',CONDITION_MET:'조건 충족',EXCLUDED:'제외'})[c.entryState]+' · '+(c.committee?.totalScore==null?'점수 미확정':c.committee.totalScore+'점')+' · '+(c.reasons||[]).slice(0,2).join(' / ');
        const button=document.createElement('button');button.className='daily-detail';button.textContent='정밀분석';button.setAttribute('aria-label',c.name+' 정밀분석');
        button.addEventListener('click',()=>{selectedStockCode=c.code;el('stockCode').value=c.name||c.code;analyze({focusDetail:true});});
        card.append(title,detail,button);box.append(card);
      }
      const exits=saved?.portfolioExitStatus||[];
      text('morningPortfolio','보유 유지 '+exits.filter(x=>x.status==='HOLD').length+' · 관찰 '+exits.filter(x=>x.status==='WATCH').length+' · 검토 필요 '+exits.filter(x=>['TAKE_PROFIT_REVIEW','EXIT_REVIEW','RISK_EXIT_REVIEW'].includes(x.status)).length);
      text('morningAgents',Object.values(status.agentStatus||{}).map(x=>x.agent+': '+x.status).join(' · '));
      if(saved?.errors?.length)text('morningMessage',saved.errors.length+'건 확인 필요 · '+saved.errors.slice(0,3).map(x=>x.agent+' '+x.error).join(' / '));
      else if(saved?.agentStatus?.NewsAgent?.status==='PARTIAL')text('morningMessage','일부 뉴스 원문을 자동 확인하지 못했습니다. 관련 위험 뉴스는 기사 링크에서 확인해 주세요.');
      else if(status.lastJob?.status==='FAILED')text('morningMessage','최근 실행 실패 · 저장된 결과를 표시합니다.');
      else text('morningMessage',saved?.scope&&saved.scope!=='all'?'일부 재검증: '+saved.scope+' · 다른 영역은 기존 결과입니다.':'');
    } catch {text('morningMessage','Morning Brief를 불러오지 못했습니다. 서버 상태를 확인해 주세요.');}
    finally{polling=false;}
  }
  document.querySelectorAll('[data-morning-scope]').forEach(button=>button.addEventListener('click',async()=>{
    button.disabled=true;
    try{await api('/api/daily/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({force:true,scope:button.dataset.morningScope})});await refresh();}
    catch(e){text('morningMessage',e.message);button.disabled=false;}
  }));
  el('morningRefresh').addEventListener('click',refresh);
  el('morningImport').addEventListener('click',async()=>{
    try{
      for(const p of loadPositions())await api('/api/daily/portfolio',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({entry:p.entry,onlyIfMissing:true})});
      await sync();text('morningMessage','기존 보유종목을 서버에 연결했습니다. 다음 자동 분석부터 Exit 대상에 포함됩니다.');
    }catch{ text('morningMessage','보유정보 연결 실패 · 기존 매수 기준을 확인해 주세요.');}
  });
  async function sync(){
    const result=await api('/api/daily/portfolio'),local=loadPositions();
    const map=new Map(local.filter(x=>!x.serverManaged).map(x=>[x.entry.stockCode,x]));
    for(const p of result.positions||[]){
      const old=local.find(x=>x.entry.stockCode===p.entry.stockCode),ev=(result.evaluations||[]).find(x=>x.stockCode===p.entry.stockCode&&JSON.stringify(x.entrySnapshot)===JSON.stringify(p.entry));
      const evaluations=[ev,p.lastEvaluation,JSON.stringify(old?.entry)===JSON.stringify(p.entry)?old?.lastEvaluation:null].filter(Boolean).sort((a,b)=>(Date.parse(b.evaluatedAt)||0)-(Date.parse(a.evaluatedAt)||0));
      map.set(p.entry.stockCode,{...p,serverManaged:true,lastEvaluation:evaluations[0]||null});
    }
    savePositions([...map.values()]);renderPortfolio();
  }
  refresh();sync().catch(()=>{});
  setInterval(()=>{if(!document.hidden)refresh();},15000);
})();
