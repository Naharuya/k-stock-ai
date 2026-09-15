const $ = (id) => document.getElementById(id);
const fmt = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 });
const fmtInt = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 });

const scoreDefs = [
  ['fundamental','펀더멘털'],['valuation','밸류에이션'],['technical','기술'],['flow','수급'],['market','시장'],['news','뉴스'],['risk','리스크']
];
const ko = {
  INTEREST:'관심', CONDITION_MET:'조건충족', WATCH:'관찰', RISK:'위험',
  NEUTRAL_MIXED:'중립·혼조', POSITIVE:'긍정', NEGATIVE:'부정', NEUTRAL:'중립', UNKNOWN:'미확인',
  SIDEWAYS_OR_MIXED:'혼조·횡보', UPTREND:'상승 추세', DOWNTREND:'하락 추세',
  MODERATE:'보통', STRONG:'강함', LOW:'낮음', HIGH:'높음', VERY_HIGH:'매우 높음', READY:'완료', POSITIVE:'긍정', CAUTION:'주의'
};
let selectedStockCode = '005930';
let searchTimer = null;
let lastChartRows = [];
let currentAnalysis = null;
const POSITION_KEY = 'kstock:positions:v1';
$('businessYear').value=String(new Date().getFullYear());

function n(v, fallback='-'){ return Number.isFinite(Number(v)) ? Number(v) : fallback; }
function f(v){ const x=n(v,null); return x===null?'-':fmt.format(x); }
function fi(v){ const x=n(v,null); return x===null?'-':fmtInt.format(x); }
function cls(v){ return Number(v)>0?'pos':Number(v)<0?'neg':''; }
function pct(v){ const x=n(v,null); return x===null?'-':`${x>=0?'+':''}${x.toFixed(1)}%`; }
function metric(v, unit=''){ const x=n(v,null); if(x===null)return '-'; const value=Math.abs(x)>=1000?fmtInt.format(x):fmt.format(x); return `${value}${unit}`; }
function tr(v){ return ko[v] || v || '-'; }
function setList(id, items=[]){ $(id).innerHTML = items.length ? items.map(x=>`<li>${escapeHtml(String(x))}</li>`).join('') : '<li>없음</li>'; }
function escapeHtml(s){ return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function formatDateTime(value){ if(!value) return '-'; const d=new Date(value); return Number.isNaN(d.getTime())?'-':d.toLocaleString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}); }

function badge(status){
  const map={INTEREST:['관심','interest'],CONDITION_MET:['조건충족','condition'],WATCH:['관찰','watch'],RISK:['위험','risk']};
  return map[status]||[tr(status||'대기'),'neutral'];
}
function showStatus(message, error=false){ const el=$('statusBanner'); el.textContent=message; el.classList.remove('hidden','error'); if(error)el.classList.add('error'); }

function componentPct(s){ const raw=n(s?.raw,null), max=n(s?.max,null); return raw===null||!max?null:(raw/max)*100; }
function renderInsights(c){
  const s=c.components||{}; const chips=[];
  const fp=componentPct(s.fundamental), vp=componentPct(s.valuation), tp=componentPct(s.technical), flp=componentPct(s.flow), mp=componentPct(s.market), np=componentPct(s.news);
  if(fp!==null) chips.push([fp>=70?'펀더멘털 강함 ↑':fp<50?'펀더멘털 약함 ↓':'펀더멘털 보통 →',fp>=70?'good':fp<50?'bad':'neutral']);
  if(vp!==null) chips.push([vp<40?'밸류에이션 부담 ↓':vp>=70?'밸류에이션 매력 ↑':'밸류에이션 중립 →',vp<40?'bad':vp>=70?'good':'neutral']);
  if(flp!==null) chips.push([flp>=60?'수급 우호 ↑':flp<40?'수급 약함 ↓':'수급 혼조 →',flp>=60?'good':flp<40?'bad':'neutral']);
  if(mp!==null) chips.push([mp>=60?'시장 우호 ↑':mp<40?'시장 부담 ↓':'시장 혼조 →',mp>=60?'good':mp<40?'bad':'neutral']);
  if(tp!==null && chips.length<4) chips.push([tp>=60?'기술 모멘텀 ↑':tp<40?'기술 모멘텀 ↓':'기술 중립 →',tp>=60?'good':tp<40?'bad':'neutral']);
  if(np!==null && chips.length<4) chips.push([np>=60?'뉴스 우호 ↑':np<40?'뉴스 부담 ↓':'뉴스 중립 →',np>=60?'good':np<40?'bad':'neutral']);
  $('insightChips').innerHTML=chips.slice(0,4).map(([t,k])=>`<span class="insight ${k}">${t}</span>`).join('');
}

function updateScoreHistory(data){
  const score=Number(data.committee?.totalScore); if(!Number.isFinite(score)) return;
  const key=`kstock:lastScore:${data.stockCode}`;
  let prev=null; try{ prev=JSON.parse(localStorage.getItem(key)||'null'); }catch{}
  if(prev && Number.isFinite(Number(prev.score))){
    const d=score-Number(prev.score); $('scoreDelta').textContent=d===0?'변화 없음':`${d>0?'+':''}${d}점`;
    $('scoreDelta').className=d>0?'pos':d<0?'neg':'';
    $('scoreDelta').title=`이전 ${prev.score}점 · ${formatDateTime(prev.at)}`;
  } else { $('scoreDelta').textContent='첫 분석'; $('scoreDelta').className=''; }
  localStorage.setItem(key,JSON.stringify({score,at:data.analyzedAt||new Date().toISOString()}));
}

function movingAverage(rows, period){
  const out=[]; let sum=0;
  for(let i=0;i<rows.length;i++){
    sum+=rows[i].close;
    if(i>=period) sum-=rows[i-period].close;
    out.push(i>=period-1?sum/period:null);
  }
  return out;
}
function drawChart(rowsInput){
  const canvas=$('priceChart'); const wrap=canvas.parentElement; const dpr=window.devicePixelRatio||1;
  const width=Math.max(320,wrap.clientWidth); const height=420;
  canvas.width=width*dpr; canvas.height=height*dpr; canvas.style.width=`${width}px`; canvas.style.height=`${height}px`;
  const ctx=canvas.getContext('2d'); ctx.scale(dpr,dpr); ctx.clearRect(0,0,width,height);
  const rows=[...(rowsInput||[])].sort((a,b)=>String(a.date).localeCompare(String(b.date))).slice(-120);
  lastChartRows=rowsInput||[];
  if(rows.length<5){ ctx.fillStyle='#728097'; ctx.font='14px sans-serif'; ctx.fillText('차트 데이터가 부족합니다.',20,40); return; }
  const pad={l:58,r:18,t:24,b:76}; const priceBottom=height-105; const chartW=width-pad.l-pad.r; const priceH=priceBottom-pad.t;
  const closes=rows.map(r=>Number(r.close)).filter(Number.isFinite); const minP=Math.min(...closes), maxP=Math.max(...closes); const span=Math.max(1,maxP-minP); const lo=minP-span*.08, hi=maxP+span*.08;
  const x=i=>pad.l+(i/(rows.length-1))*chartW; const y=v=>pad.t+(hi-v)/(hi-lo)*priceH;
  ctx.strokeStyle='#e5eaf2'; ctx.lineWidth=1; ctx.fillStyle='#728097'; ctx.font='11px sans-serif';
  for(let j=0;j<=4;j++){ const yy=pad.t+(j/4)*priceH; ctx.beginPath();ctx.moveTo(pad.l,yy);ctx.lineTo(width-pad.r,yy);ctx.stroke(); const val=hi-(j/4)*(hi-lo);ctx.fillText(fmtInt.format(val),4,yy+4); }
  const series=[
    {vals:rows.map(r=>r.close),stroke:'#172033',w:2.2},
    {vals:movingAverage(rows,5),stroke:'#315efb',w:1.5},
    {vals:movingAverage(rows,20),stroke:'#168a5b',w:1.5},
    {vals:movingAverage(rows,60),stroke:'#b77a12',w:1.5},
    {vals:movingAverage(rows,120),stroke:'#8b5cf6',w:1.5}
  ];
  for(const s of series){ ctx.strokeStyle=s.stroke;ctx.lineWidth=s.w;ctx.beginPath();let started=false; s.vals.forEach((v,i)=>{if(!Number.isFinite(Number(v)))return;const xx=x(i),yy=y(v);if(!started){ctx.moveTo(xx,yy);started=true}else ctx.lineTo(xx,yy)});ctx.stroke(); }
  const vols=rows.map(r=>Number(r.volume)||0); const maxV=Math.max(1,...vols); const volTop=height-88, volBottom=height-30; ctx.fillStyle='rgba(49,94,251,.18)';
  rows.forEach((r,i)=>{const h=(Number(r.volume)||0)/maxV*(volBottom-volTop); const bw=Math.max(1,chartW/rows.length*.65); ctx.fillRect(x(i)-bw/2,volBottom-h,bw,h);});
  ctx.fillStyle='#728097'; ctx.font='11px sans-serif'; [0,Math.floor(rows.length/3),Math.floor(rows.length*2/3),rows.length-1].forEach(i=>{const d=String(rows[i].date||''); const label=d.length===8?`${d.slice(4,6)}/${d.slice(6,8)}`:d;ctx.fillText(label,x(i)-14,height-10)});
}

function renderIndicators(data){
  const v=data.indicators?.values||{};
  const views=Object.fromEntries((data.researchProfile?.indicatorInterpretations||[]).map(x=>[x.code,x]));
  const defs=[
    ['PER','주가수익비율',v.per,'배'],['PBR','주가순자산비율',v.pbr,'배'],['PSR','주가매출비율',v.psr,'배'],
    ['ROE','자기자본이익률',v.roePct,'%'],['EPS','주당순이익',v.eps,'원'],['ROA','총자산이익률',v.roaPct,'%'],
    ['PTBR','주가/유형장부가',v.ptbr,'배'],['RSI','상대강도지수',v.rsi14,''],['BPS','주당순자산',v.bps,'원'],
    ['APS','주당자산',v.aps,'원'],['PEG','PER/성장률',v.peg,'배']
  ];
  $('indicatorGrid').innerHTML=defs.map(([code,name,value,unit])=>{const view=views[code]||{};return `<div class="indicator-card"><div class="metric-head"><span class="metric-code">${code}</span><span class="metric-name">${name}</span></div><strong>${metric(value,unit)}</strong><span class="metric-view ${view.tone||'neutral'}">${escapeHtml(view.text||'')}</span></div>`}).join('');
}

function renderResearchProfile(data){
  const rp=data.researchProfile||{}; const bull=rp.bull||{}; const bear=rp.bear||{};
  $('bullStrength').textContent=Number.isFinite(Number(bull.strength))?`${bull.strength}/100`:'-';
  $('bearStrength').textContent=Number.isFinite(Number(bear.strength))?`${bear.strength}/100`:'-';
  $('bullSummary').textContent=bull.summary||'데이터 대기'; $('bearSummaryPro').textContent=bear.summary||'데이터 대기';
  setList('bullArguments',bull.arguments||[]); setList('bearArgumentsPro',bear.arguments||[]);
  const labels={fundamental:'펀더멘털',valuation:'밸류에이션',technical:'기술',flow:'수급',market:'시장',news:'뉴스',risk:'리스크'};
  $('signalMatrix').innerHTML=(rp.signalMatrix||[]).map(x=>{const tone=x.direction==='POSITIVE'?'positive':x.direction==='CAUTION'?'caution':'neutral';return `<div class="signal-cell ${tone}"><span>${labels[x.key]||x.key}</span><strong>${escapeHtml(tr(x.direction))} · ${x.raw??'-'}/${x.max??'-'}</strong></div>`}).join('');
  $('scenarioGrid').innerHTML=(rp.scenarios||[]).map(x=>`<article class="scenario-card ${x.tone||'neutral'}"><h3>${escapeHtml(x.label||'시나리오')}</h3><ul>${(x.conditions||[]).map(c=>`<li>${escapeHtml(c)}</li>`).join('')}</ul></article>`).join('');
  $('scenarioCaveat').textContent=rp.caveat||'조건 기반 리서치 프레임입니다.';
}

function render(data){
  currentAnalysis=data;
  window.renderFinancialEvidence?.(data);
  const q=data.marketData?.quote||{}; const c=data.committee||{}; const scores=c.components||{};
  selectedStockCode=data.stockCode; $('stockCode').value=data.corpName||data.stockCode;
  const effectiveYear=data.dart?.query?.effectiveBusinessYear||$('businessYear').value; $('corpLabel').textContent=`${data.stockCode} · 분석연도 ${effectiveYear}`; if(data.dart?.query?.usedFallback){ $('businessYear').value=effectiveYear; }
  $('corpName').textContent=data.corpName||data.stockCode;
  $('currentPrice').textContent=fi(q.price||q.currentPrice);
  if($('entryStockPill')) $('entryStockPill').textContent=`${data.corpName||data.stockCode} · ${data.stockCode}`;
  if($('entryBuyPrice')) $('entryBuyPrice').value=String(q.price||q.currentPrice||'');
  if($('saveEntry')) $('saveEntry').disabled=false;
  $('per').textContent=f(data.indicators?.values?.per ?? q.per); $('pbr').textContent=f(data.indicators?.values?.pbr ?? q.pbr); $('heroRoe').textContent=data.indicators?.values?.roePct!=null?`${f(data.indicators.values.roePct)}%`:'-';
  renderIndicators(data); renderResearchProfile(data);
  const [label,bclass]=badge(c.status); $('committeeBadge').textContent=label; $('committeeBadge').className=`badge ${bclass}`;
  $('totalScore').textContent=c.totalScore??'-'; $('confidence').textContent=c.confidence!=null?`${c.confidence}%`:'-';
  const deg=Math.max(0,Math.min(100,Number(c.totalScore)||0))*3.6; $('scoreRing').style.background=`conic-gradient(var(--accent) ${deg}deg,#e8edf5 ${deg}deg)`;
  $('summaryTitle').textContent=`${label} · ${c.totalScore ?? '-'}점`; renderInsights(c);
  $('summaryText').textContent=c.summary||'위원회 요약 없음';
  $('hardStop').textContent=`Hard Stop: ${c.hardStop ? `발동 · ${c.hardStopReason||'사유 확인 필요'}` : '미발동'}`;
  $('analyzedAt').textContent=formatDateTime(data.analyzedAt); updateScoreHistory(data);

  $('scoreGrid').innerHTML=scoreDefs.map(([key,labelText])=>{
    const s=scores[key]||{}; const max=n(s.max, key==='risk'?100:20); const raw=n(s.raw,null); const val=raw===null?0:Math.max(0,Math.min(100,(raw/max)*100));
    return `<div class="score-item"><span>${labelText}</span><strong>${raw===null?'-':f(raw)}<small> / ${max}</small></strong><div class="bar"><i style="width:${val}%"></i></div></div>`;
  }).join('');

  const chartRows=data.marketData?.chart?.rows||[]; drawChart(chartRows);
  const tm=data.marketData?.technicalMetrics||{};
  $('chartSummary').innerHTML=`현재 추세 <b>${escapeHtml(tr(tm.trend))}</b> · RSI <b>${f(tm.rsi14)}</b> · MA20 대비 <b class="${cls(tm.distanceFromMa20Pct)}">${pct(tm.distanceFromMa20Pct)}</b>`;

  const flow=data.marketData?.flowMetrics||{}; const persons=[['외국인',flow.foreign],['기관',flow.institution],['개인',flow.personal]];
  $('flowTable').className='flow-table';
  $('flowTable').innerHTML=`<div class="flow-row"><span></span><b>최근 5일</b><b>최근 20일</b></div>`+persons.map(([name,x={}] )=>`<div class="flow-row"><span>${name}</span><b class="${cls(x.netBuyQty5d)}">${fi(x.netBuyQty5d)}주</b><b class="${cls(x.netBuyQty20d)}">${fi(x.netBuyQty20d)}주</b></div>`).join('');

  const mc=data.marketData?.marketContext||{}; const mk=mc.score||{}; $('regimePill').textContent=tr(mk.regime);
  const mkItems=[mc.kospi,mc.kosdaq].filter(Boolean); $('marketCards').className='market-cards';
  $('marketCards').innerHTML=mkItems.map(x=>`<div class="market-card"><h4>${x.indexName}</h4><strong>${f(x.latestClose)}</strong><div class="market-meta"><span>20일 ${pct(x.ret20dPct)}</span><span>60일 ${pct(x.ret60dPct)}</span><span>RSI ${f(x.rsi14)}</span><span>${escapeHtml(tr(x.trend))}</span></div></div>`).join('');

  const news=data.newsData?.items||[]; const ns=data.scores?.news||{}; $('newsSentiment').textContent=tr(ns.sentiment); $('newsList').className='news-list';
  $('newsList').innerHTML=news.slice(0,6).map(x=>`<div class="news-item"><a href="${escapeHtml(x.link||'#')}" target="_blank" rel="noopener"><span class="signal ${x.signal||'NEUTRAL'}">${tr(x.signal||'NEUTRAL')}</span>${escapeHtml(x.title||'제목 없음')}</a><div class="news-meta">${escapeHtml(x.source||'출처 미상')} · ${x.publishedAt?new Date(x.publishedAt).toLocaleString('ko-KR'):'날짜 없음'}</div></div>`).join('') || '<div class="empty">뉴스 없음</div>';

  window.renderNewsEvidenceControls?.(data);
  const bear=c.bear||{}; $('bearLevel').textContent=tr(bear.level); $('bearContent').className='stack';
  const args=[...(bear.majorArguments||[]),...(bear.weakArguments||[])]; $('bearContent').innerHTML=`<div class="callout">${escapeHtml(bear.summary||'반대 논리 없음')}</div>`+args.map(x=>`<div class="callout">• ${escapeHtml(x)}</div>`).join('');
  setList('positiveReasons',c.positiveReasons); setList('negativeReasons',c.negativeReasons); setList('entryConditions',c.entryConditions); setList('invalidConditions',c.invalidConditions);
  $('disclaimer').textContent=c.disclaimer||'연구·의사결정 지원용 분석이며 수익을 보장하지 않습니다.';
}

async function analyze(options={}){
  const raw=$('stockCode').value.trim(); const stock=/^\d{6}$/.test(raw)?raw:selectedStockCode; const year=$('businessYear').value.trim();
  if(!/^\d{6}$/.test(stock)) return showStatus('검색 목록에서 종목을 선택하거나 6자리 종목코드를 입력해 주세요.',true);
  if(!/^\d{4}$/.test(year)) return showStatus('사업연도는 4자리로 입력해 주세요.',true);
  const btn=document.querySelector('#searchForm button'); btn.disabled=true; btn.textContent='분석 중…'; document.body.classList.add('loading'); showStatus('OpenDART · KIS · 뉴스 · Investment Committee를 통합 분석하고 있습니다.');
  try{
    const r=await fetch(`/api/full/analyze/${stock}?businessYear=${year}`); const body=await r.json();
    if(!r.ok||!body.success) throw new Error(body.message||'분석 실패');
    render(body.result);
    const q=body.result?.dart?.query||{};
    const yearNote=q.usedFallback?` · 요청 ${q.requestedBusinessYear} → 최신 공시연도 ${q.effectiveBusinessYear} 사용`:'';
    showStatus(`분석 완료 · ${body.result.corpName} · 데이터 완성도 ${body.result.completeness?.percent ?? '-'}%${yearNote}`);
    if(options.focusDetail){
      const target=$('overview');
      target?.scrollIntoView({behavior:'smooth',block:'start'});
      target?.focus({preventScroll:true});
      target?.classList.add('detail-focus-flash');
      setTimeout(()=>target?.classList.remove('detail-focus-flash'),1800);
      if($('entryHint')) $('entryHint').textContent=`${body.result.corpName} 분석 완료. 아래 매수가를 확인한 뒤 ‘매수 기준 등록’을 누르면 이 분석이 Exit 비교 기준으로 저장됩니다.`;
    }
  }catch(e){ showStatus(`분석 실패: ${e.message}`,true); }
  finally{ btn.disabled=false; btn.textContent='분석 실행'; document.body.classList.remove('loading'); }
}

async function searchStocks(q){
  const box=$('stockSuggestions'); if(!q){box.classList.add('hidden');return;}
  try{
    const r=await fetch(`/api/search/stocks?q=${encodeURIComponent(q)}`); const body=await r.json(); if(!r.ok||!body.success) return;
    const items=body.result||[]; if(!items.length){box.innerHTML='<div class="suggestion-empty">검색 결과 없음</div>';box.classList.remove('hidden');return;}
    box.innerHTML=items.map(x=>`<button type="button" class="suggestion" data-code="${x.stockCode}" data-name="${escapeHtml(x.corpName)}"><strong>${escapeHtml(x.corpName)}</strong><span>${x.stockCode}</span></button>`).join('');
    box.classList.remove('hidden');
  }catch{}
}
$('stockCode').addEventListener('input',e=>{ const v=e.target.value.trim(); if(/^\d{6}$/.test(v)) selectedStockCode=v; else selectedStockCode=''; clearTimeout(searchTimer); searchTimer=setTimeout(()=>searchStocks(v),220); });
$('stockSuggestions').addEventListener('click',e=>{const b=e.target.closest('.suggestion');if(!b)return;selectedStockCode=b.dataset.code;$('stockCode').value=b.dataset.name;$('stockSuggestions').classList.add('hidden');});
document.addEventListener('click',e=>{if(!e.target.closest('.stock-search-wrap'))$('stockSuggestions').classList.add('hidden');});
document.getElementById('searchForm').addEventListener('submit',e=>{e.preventDefault();$('stockSuggestions').classList.add('hidden');analyze();});
window.addEventListener('resize',()=>{ if(lastChartRows.length) drawChart(lastChartRows); });

// v2.1 Market-wide Screener
async function runMarketScreener(){
  const btn=$('runScreener'); if(!btn)return;
  const exchange=$('screenerExchange').value, top=$('screenerTop').value, enrich=$('screenerEnrich').value;
  btn.disabled=true; btn.textContent='스크리닝 중…';
  $('screenerSummary').textContent='KIS 종목 마스터 수집/캐시 확인 후 후보를 계산하고 있습니다. 실시간 보강 수가 많으면 KIS 호출 제한 때문에 시간이 더 걸릴 수 있습니다.';
  try{
    const r=await fetch(`/api/screener?exchange=${encodeURIComponent(exchange)}&top=${top}&enrich=${enrich}`); const body=await r.json();
    if(!r.ok||!body.success)throw new Error(body.message||'스크리닝 실패');
    const x=body.result||{}, rows=x.top||[];
    $('universePill').textContent=`전체 ${fi(x.universe?.masterTotal)}종목`;
    $('screenerSummary').textContent=`선택 시장 ${fi(x.scanned)}종목 1차 스캔 · 상위 ${fi(x.enriched)}종목 현재가 보강 · ${rows.length}개 후보 표시`;
    $('screenerBody').innerHTML=rows.length?rows.map((s,i)=>`<tr>
      <td>${i+1}</td>
      <td class="screener-stock"><strong>${escapeHtml(s.name)}</strong><span>${s.code}</span></td>
      <td>${escapeHtml(s.exchangeName||s.exchange)}</td>
      <td>${escapeHtml(s.industryLarge||'-')}</td>
      <td><span class="score-chip">${fi(s.score)}</span></td>
      <td>${s.roe==null?'-':`${f(s.roe)}%`}</td>
      <td>${s.quote?.per==null?'-':f(s.quote.per)}</td>
      <td>${s.quote?.pbr==null?'-':f(s.quote.pbr)}</td>
      <td>${s.marketCapEok==null?'-':fi(s.marketCapEok)}</td>
      <td class="${s.status==='ENRICHED'?'status-enriched':'status-master'}">${s.status==='ENRICHED'?'실시간 보강':'마스터 기반'}</td>
      <td><button class="screener-analyze" data-code="${s.code}" data-name="${escapeHtml(s.name)}">정밀분석</button></td>
    </tr>`).join(''):'<tr><td colspan="11" class="empty">조건에 맞는 종목이 없습니다.</td></tr>';
  }catch(e){ $('screenerSummary').textContent=`스크리닝 실패: ${e.message}`; $('universePill').textContent='마스터 오류'; $('screenerBody').innerHTML=`<tr><td colspan="11" class="empty neg">${escapeHtml(e.message)}</td></tr>`; }
  finally{btn.disabled=false;btn.textContent='스크리닝 실행';}
}
if($('runScreener')) $('runScreener').addEventListener('click',runMarketScreener);
if($('screenerBody')) $('screenerBody').addEventListener('click',e=>{const b=e.target.closest('.screener-analyze');if(!b)return;selectedStockCode=b.dataset.code;$('stockCode').value=b.dataset.name;analyze({focusDetail:true});});

async function loadUniverseStatus(){
  try{
    const r=await fetch('/api/universe/status'); const b=await r.json();
    if(!r.ok||!b.success) throw new Error(b.message||'마스터 상태 조회 실패');
    const s=b.result?.status||{}; const k=s.kospi?.count||0, q=s.kosdaq?.count||0, total=b.result?.total||0;
    $('universePill').textContent=`KOSPI ${fi(k)} · KOSDAQ ${fi(q)}`;
    if(total>0) $('screenerSummary').textContent=`실제 KIS 마스터 ${fi(total)}종목 준비 완료 · KOSPI ${fi(k)} / KOSDAQ ${fi(q)} · 스크리닝 실행을 눌러주세요.`;
  }catch(e){ $('universePill').textContent='마스터 확인 필요'; $('screenerSummary').textContent=`KIS 마스터 상태 확인 실패: ${e.message}`; }
}
loadUniverseStatus();

async function loadAppVersion(){
  try{
    const r=await fetch('/health'); const b=await r.json();
    if(r.ok && b.version && $('appVersion')) $('appVersion').textContent=`Pro Research Dashboard v${b.version}`;
  }catch{}
}
loadAppVersion();

// v2.3.1 Today Candidate Engine · operational dashboard
function candidateModeConfig(){
  const mode=$('candidateMode')?.value||'balanced';
  if(mode==='fast') return {quoteLimit:10,deepLimit:0,candidatePool:40};
  if(mode==='deep') return {quoteLimit:20,deepLimit:5,candidatePool:70};
  return {quoteLimit:15,deepLimit:3,candidatePool:60};
}
function verifyLabel(x){
  if(x.validationLevel==='DEEP') return ['정밀검증 완료','verify-deep','A'];
  if(x.validationLevel==='PARTIAL_DEEP') return ['정밀 일부','verify-partial','B'];
  if(x.validationLevel==='DEEP_ERROR') return ['정밀실패','verify-error','E'];
  if(x.validationLevel==='LIGHT') return ['현재가 검증','verify-light','B'];
  return ['마스터 후보','verify-master','C'];
}
function committeeLabel(c){
  const status=c?.committee?.status;
  return c?.committee?.labelKo||tr(status)||'-';
}
function candidateReason(c){
  const deepPos=c?.committee?.positiveReasons||[];
  if(deepPos.length) return deepPos[0];
  const tags=c?.styleTags||[]; const out=[];
  if(tags.includes('VALUE') && c.quote?.per!=null) out.push(`PER ${f(c.quote.per)}배 · 가치평가 매력`);
  if(tags.includes('ASSET_VALUE') && c.quote?.pbr!=null) out.push(`PBR ${f(c.quote.pbr)}배 · 자산가치 신호`);
  if(tags.includes('MOMENTUM')) out.push('주가 모멘텀 양호');
  if(tags.includes('NEAR_52W_HIGH')) out.push('52주 고점권 접근');
  if(tags.includes('LIQUID')) out.push('거래대금 유동성 양호');
  if(tags.includes('QUALITY') && c.roe!=null) out.push(`ROE ${f(c.roe)}% · 수익성 우수`);
  if(out.length) return out.slice(0,2).join(' / ');
  const light=(c?.reasons||[]).filter(x=>!String(x).includes('업종 ROE 중앙값'));
  return light[0]||c?.reasons?.[0]||'추가 검증 필요';
}
const qualityFlagKo={
  PRICE_MISSING:'현재가 미검증',TRADING_VALUE_MISSING:'거래대금 미검증',PER_UNAVAILABLE:'PER 확인 필요',PBR_UNAVAILABLE:'PBR 확인 필요',W52_HIGH_MISSING:'52주 고가 확인 필요',
  HIGH_ROE_RECHECK:'ROE 재확인 필요',EXTREME_ROE_RECHECK:'ROE 이상치 재확인',MASTER_DART_ROE_MISMATCH:'마스터·DART ROE 불일치',DEEP_VALIDATION_FAILED:'정밀검증 실패'
};
function candidateRisk(c){
  const risks=c?.deep?.riskReasons||[];
  const deepNeg=c?.committee?.negativeReasons||[];
  if(risks.length) return risks[0];
  if(deepNeg.length) return deepNeg[0];
  const flags=c?.quality?.flags||[];
  if(flags.length) return qualityFlagKo[flags[0]]||flags[0];
  if(c.validationLevel==='LIGHT') return '정밀 리스크 미검증';
  if(c.validationLevel==='MASTER_ONLY') return '현재가·정밀 리스크 미검증';
  return '주요 위험 신호 미탐지';
}
function stateLabel(s){
  return ({VERIFIED_INTEREST:'정밀 관심',VERIFIED_WATCH:'정밀 관찰',VERIFIED_RISK:'정밀 위험',RISK_EXCLUDED:'Hard Stop',LIGHT_CANDIDATE:'현재가 검증',UNVERIFIED_CANDIDATE:'미검증'})[s]||s||'-';
}
function riskLevelText(x){ return tr(x?.deep?.riskLevel||x?.riskLevel||'')||'-'; }
async function runTodayCandidates(){
  const btn=$('runCandidates'); if(!btn)return;
  const exchange=$('candidateExchange').value; const cfg=candidateModeConfig(); const year=$('businessYear').value.trim()||String(new Date().getFullYear());
  btn.disabled=true;btn.textContent='후보 검증 중…';
  $('candidateSummary').textContent='전체시장 스캔 후 현재가와 일부 정밀분석을 순차 검증합니다. 균형/강화 모드는 KIS 호출 제한 때문에 시간이 걸릴 수 있습니다.';
  if($('candidateRejectedBody')) $('candidateRejectedBody').innerHTML='<tr><td colspan="7" class="empty">정밀검증 중…</td></tr>';
  try{
    const url=`/api/candidates/today?exchange=${encodeURIComponent(exchange)}&top=20&candidatePool=${cfg.candidatePool}&quoteLimit=${cfg.quoteLimit}&deepLimit=${cfg.deepLimit}&businessYear=${year}`;
    const r=await fetch(url);const b=await r.json();if(!r.ok||!b.success)throw new Error(b.message||'관심후보 생성 실패');
    const x=b.result||{},p=x.pipeline||{},rows=x.top||[],rej=x.rejected||[],vs=x.verificationSummary||{},rk=x.ranking||{};
    $('candidatePill').textContent=`${x.date||''} · ${rows.length}개 후보`;
    $('candidateSummary').textContent=`${fi(p.scanned)}종목 스캔 → 위험필터 후 ${fi(p.eligibleAfterHardRisk)} → 현재가 ${fi(p.quoteValidated)}/${fi(p.quoteRequested)} → 정밀 ${fi(p.deepCompleted)}/${fi(p.deepRequested)} · Ranking Quality · 업종 최대 ${rk.maxPerSector||3}개 · 최종 ${rows.length}개`;
    $('candidatePipeline').innerHTML=[['전체 스캔',p.scanned],['Hard Risk 통과',p.eligibleAfterHardRisk],['현재가 검증',`${p.quoteValidated||0}/${p.quoteRequested||0}`],['정밀검증',`${p.deepCompleted||0}/${p.deepRequested||0}`],['최종 후보',rows.length]].map(([a,v])=>`<div class="pipeline-step"><span>${a}</span><strong>${typeof v==='number'?fi(v):escapeHtml(String(v??'-'))}</strong></div>`).join('');
    if($('candidateTrustSummary')) $('candidateTrustSummary').innerHTML=[
      ['A · 정밀 후보',vs.selectedDeepVerified||0,'trust-a'],['정밀 관심',vs.verifiedInterest||0,'trust-interest'],['정밀 관찰',vs.verifiedWatch||0,'trust-watch'],['정밀 위험/제외',(vs.verifiedRisk||0)+(vs.hardStopExcluded||0),'trust-risk'],['B · 현재가 검증',vs.lightValidated||0,'trust-b'],['C · 마스터만',vs.masterOnly||0,'trust-c']
    ].map(([a,v,c])=>`<div class="trust-card ${c}"><span>${a}</span><strong>${fi(v)}</strong></div>`).join('');
    $('candidateBody').innerHTML=rows.length?rows.map((c,i)=>{const [vl,vc,grade]=verifyLabel(c);const tags=(c.styleTags||[]).slice(0,3);const cs=committeeLabel(c);const st=c.committee?.status||'';const cclass=c.committee?.hardStop||st==='RISK'?'risk':(['INTEREST','CONDITION_MET'].includes(st)?'interest':st==='WATCH'?'watch':'');return `<tr>
      <td>${i+1}</td><td class="screener-stock"><strong>${escapeHtml(c.name)}</strong><span>${c.code} · ${escapeHtml(c.exchangeName||c.exchange||'-')}</span></td>
      <td><span class="score-chip">${c.rankingScore==null?fi(c.finalScore):f(c.rankingScore)}</span><small class="trust-label">기존 ${fi(c.finalScore)}</small></td>
      <td><span class="trust-badge ${vc}">${grade}</span><small class="trust-label">${vl}</small></td>
      <td class="committee-small ${cclass}">${escapeHtml(cs)}${c.committee?.score!=null?` <small>${fi(c.committee.score)}점</small>`:''}</td>
      <td class="reason-cell">${escapeHtml(candidateReason(c))}</td>
      <td class="risk-cell">${escapeHtml(candidateRisk(c))}</td>
      <td><span class="pair-metric">PER ${c.quote?.per==null?'-':f(c.quote.per)}</span><span class="pair-metric">PBR ${c.quote?.pbr==null?'-':f(c.quote.pbr)}</span></td>
      <td><div class="style-tags">${tags.length?tags.map(z=>`<span class="mini-tag">${escapeHtml(z)}</span>`).join(''):'-'}</div></td>
      <td><button class="screener-analyze candidate-analyze" data-code="${c.code}" data-name="${escapeHtml(c.name)}">상세분석 →</button></td></tr>`}).join(''):'<tr><td colspan="10" class="empty">후보가 없습니다.</td></tr>';
    if($('candidateRejectedBody')) $('candidateRejectedBody').innerHTML=rej.length?rej.map(c=>`<tr>
      <td class="screener-stock"><strong>${escapeHtml(c.name)}</strong><span>${c.code}</span></td>
      <td>${escapeHtml(stateLabel(c.finalState))}</td>
      <td class="committee-small risk">${escapeHtml(committeeLabel(c))}${c.committee?.score!=null?` <small>${fi(c.committee.score)}점</small>`:''}</td>
      <td>${escapeHtml(riskLevelText(c))}${c.deep?.riskScore!=null?` · ${fi(c.deep.riskScore)}`:''}</td>
      <td class="risk-cell">${escapeHtml(candidateRisk(c))}</td>
      <td>${c.committee?.hardStop?`<span class="hardstop-chip">${escapeHtml(c.committee.hardStopReason||'YES')}</span>`:'아님'}</td>
      <td><button class="screener-analyze candidate-analyze" data-code="${c.code}" data-name="${escapeHtml(c.name)}">상세보기</button></td></tr>`).join(''):'<tr><td colspan="7" class="empty">이번 실행에서 정밀 위험/Hard Stop 제외 종목이 없습니다.</td></tr>';
  }catch(e){$('candidateSummary').textContent=`관심후보 생성 실패: ${e.message}`;$('candidatePill').textContent='오류';$('candidateBody').innerHTML=`<tr><td colspan="10" class="empty neg">${escapeHtml(e.message)}</td></tr>`;if($('candidateRejectedBody'))$('candidateRejectedBody').innerHTML='<tr><td colspan="7" class="empty">-</td></tr>';}
  finally{btn.disabled=false;btn.textContent='관심후보 생성';}
}
if($('runCandidates')) $('runCandidates').addEventListener('click',runTodayCandidates);
function candidateAnalyzeClick(e){const b=e.target.closest('.candidate-analyze');if(!b)return;selectedStockCode=b.dataset.code;$('stockCode').value=b.dataset.name||b.dataset.code;$('stockSuggestions').classList.add('hidden');analyze({focusDetail:true});}
if($('candidateBody')) $('candidateBody').addEventListener('click',candidateAnalyzeClick);
if($('candidateRejectedBody')) $('candidateRejectedBody').addEventListener('click',candidateAnalyzeClick);


// v2.5 Entry + Exit Engine -------------------------------------------------
function loadPositions(){
  try{ const x=JSON.parse(localStorage.getItem(POSITION_KEY)||'[]'); return Array.isArray(x)?x:[]; }catch{return [];}
}
function savePositions(rows){ localStorage.setItem(POSITION_KEY,JSON.stringify(rows)); }
function exitStatusClass(status){
  return ({HOLD:'exit-hold',WATCH:'exit-caution',CAUTION:'exit-caution',TAKE_PROFIT_REVIEW:'exit-profit',EXIT_REVIEW:'exit-review',RISK_EXIT_REVIEW:'exit-risk'})[status]||'exit-neutral';
}
function exitLabel(status){
  return ({HOLD:'보유 유지',WATCH:'관찰 · 확인 필요',CAUTION:'주의 관찰',TAKE_PROFIT_REVIEW:'이익실현 검토',EXIT_REVIEW:'매도 검토',RISK_EXIT_REVIEW:'위험 이탈 검토'})[status]||'재검증 필요';
}
function positionPnl(entry,last){
  if(last?.currentPrice==null||last.currentPrice===''||Number(last.currentPrice)<=0)return null; const cp=Number(last.currentPrice); const bp=Number(entry?.buyPrice); if(!Number.isFinite(cp)||!Number.isFinite(bp)||bp<=0)return null; return ((cp-bp)/bp)*100;
}
function renderPortfolio(){
  const box=$('portfolioList'); if(!box)return;
  const rows=loadPositions();
  const counts={hold:0,review:0,risk:0,pending:0};
  rows.forEach(p=>{const st=p.lastEvaluation?.status;if(st==='HOLD')counts.hold++;else if(st==='RISK_EXIT_REVIEW')counts.risk++;else if(st)counts.review++;else counts.pending++;});
  if($('portfolioSummary')) $('portfolioSummary').innerHTML=[['보유종목',rows.length,'trust-a'],['보유 유지',counts.hold,'trust-interest'],['검토 필요',counts.review,'trust-watch'],['위험 이탈',counts.risk,'trust-risk'],['재검증 대기',counts.pending,'trust-c']].map(([a,v,c])=>`<div class="trust-card ${c}"><span>${a}</span><strong>${v}</strong></div>`).join('');
  if(!rows.length){box.innerHTML='<div class="empty">개별 종목 분석 후 ‘매수 기준 등록’을 눌러주세요.</div>';return;}
  box.innerHTML=rows.map((p,i)=>{
    const e=p.entry||{}; const last=p.lastEvaluation||null; const pnl=last?.pnlPct ?? positionPnl(e,last); const st=last?.status||'PENDING';
    const reasons=(last?.reasons||[]).slice(0,3);
    return `<article class="position-card ${exitStatusClass(st)}" data-code="${escapeHtml(e.stockCode)}">
      <div class="position-head"><div><strong>${escapeHtml(e.corpName||e.stockCode)}</strong><span>${escapeHtml(e.stockCode)} · 등록 ${formatDateTime(e.registeredAt)}</span></div><span class="exit-badge ${exitStatusClass(st)}">${last?escapeHtml(last.labelKo||exitLabel(st)):'재검증 대기'}</span></div>
      <div class="position-metrics"><div><span>매수가</span><b>${fi(e.buyPrice)}원</b></div><div><span>현재가</span><b>${last?.currentPrice?`${fi(last.currentPrice)}원`:'-'}</b></div><div><span>수익률</span><b class="${cls(pnl)}">${pnl==null?'-':pct(pnl)}</b></div><div><span>Exit Pressure</span><b>${last?.exitPressure!=null?`${fi(last.exitPressure)}/100`:'-'}</b></div><div><span>진입→현재</span><b>${last?.entryScore!=null?`${fi(last.entryScore)} → ${fi(last.currentScore)}`:'-'}</b></div></div>
      <div class="position-thesis"><b>진입 논리</b><span>${escapeHtml((e.thesis?.entryReasons||[]).slice(0,2).join(' / ')||'저장된 진입 논리 없음')}</span></div>
      <div class="position-reasons">${reasons.length?reasons.map(r=>`<span>• ${escapeHtml(r)}</span>`).join(''):'<span>현재 분석과 비교하려면 Exit 재검증을 실행하세요.</span>'}</div>
      <div class="position-actions"><button class="exit-evaluate" data-index="${i}">Exit 재검증</button><button class="position-open" data-code="${escapeHtml(e.stockCode)}" data-name="${escapeHtml(e.corpName||e.stockCode)}">정밀분석</button><button class="position-delete secondary" data-index="${i}">삭제</button></div>
    </article>`;
  }).join('');
}

function compactEntryAnalysis(a){
  return {
    stockCode:a.stockCode,corpName:a.corpName,analyzedAt:a.analyzedAt,
    marketData:{quote:{price:a.marketData?.quote?.price},technicalMetrics:a.marketData?.technicalMetrics,flowMetrics:a.marketData?.flowMetrics,marketContext:{score:a.marketData?.marketContext?.score}},
    scores:{news:a.scores?.news},dart:{agents:{risk:a.dart?.agents?.risk}},
    committee:{status:a.committee?.status,totalScore:a.committee?.totalScore,hardStop:a.committee?.hardStop,positiveReasons:a.committee?.positiveReasons,invalidConditions:a.committee?.invalidConditions,components:a.committee?.components}
  };
}

async function saveCurrentEntry(){
  if(!currentAnalysis) return showStatus('먼저 종목 정밀분석을 실행해 주세요.',true);
  const buyPrice=Number($('entryBuyPrice')?.value); const quantity=Number($('entryQuantity')?.value||1); const stopLossPct=Number($('entryStopLoss')?.value||-7); const takeProfitPct=Number($('entryTakeProfit')?.value||10);
  if(!Number.isFinite(buyPrice)||buyPrice<=0) return showStatus('매수가를 확인해 주세요.',true);
  const btn=$('saveEntry'); btn.disabled=true; btn.textContent='등록 중…';
  try{
    const r=await fetch('/api/entry/snapshot',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({analysis:compactEntryAnalysis(currentAnalysis),buyPrice,quantity,stopLossPct,takeProfitPct})});
    const b=await r.json(); if(!r.ok||!b.success)throw new Error(b.message||'매수 기준 등록 실패');
    const saved=await fetch('/api/daily/portfolio',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({entry:b.result,expectedEntry:loadPositions().find(p=>p.entry.stockCode===b.result.stockCode)?.entry||null})});
    if(!saved.ok)throw new Error('SERVER_PORTFOLIO_SAVE_FAILED');
    let rows=loadPositions(); const idx=rows.findIndex(x=>x.entry?.stockCode===b.result.stockCode); const record={entry:b.result,lastEvaluation:null,serverManaged:true};
    if(idx>=0) rows[idx]=record; else rows.unshift(record); savePositions(rows); renderPortfolio();
    showStatus(`${b.result.corpName} 매수 기준 등록 완료 · ${fi(b.result.buyPrice)}원 · Exit 비교 기준 저장`);
    location.hash='#portfolio';
  }catch(e){showStatus(`매수 기준 등록 실패: ${e.message}`,true);}finally{btn.disabled=false;btn.textContent='매수 기준 등록';}
}

async function evaluatePosition(index){
  const rows=loadPositions(); const row=rows[index]; if(!row?.entry)return;
  const card=document.querySelector(`.position-card[data-code="${row.entry.stockCode}"]`); const btn=card?.querySelector('.exit-evaluate'); if(btn){btn.disabled=true;btn.textContent='재검증 중…';}
  try{
    const year=$('businessYear')?.value||String(new Date().getFullYear());
    const r=await fetch(`/api/exit/evaluate/${row.entry.stockCode}?businessYear=${encodeURIComponent(year)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({entry:row.entry})});
    const b=await r.json(); if(!r.ok||!b.success)throw new Error(b.message||'Exit 재검증 실패');
    const latestRows=loadPositions();
    const latestIndex=latestRows.findIndex(x=>JSON.stringify(x.entry)===JSON.stringify(row.entry));
    if(latestIndex<0){renderPortfolio();return;}
    latestRows[latestIndex]={...latestRows[latestIndex],lastEvaluation:b.result.evaluation,lastAnalysisAt:b.result.currentAnalysis?.analyzedAt};
    savePositions(latestRows); renderPortfolio();
    const ev=b.result.evaluation; showStatus(`${row.entry.corpName} Exit 재검증 완료 · ${ev.labelKo} · Exit Pressure ${ev.exitPressure==null?'-':ev.exitPressure+'/100'} · 수익률 ${ev.pnlPct==null?'-':pct(ev.pnlPct)}`);
  }catch(e){showStatus(`Exit 재검증 실패: ${e.message}`,true);if(btn){btn.disabled=false;btn.textContent='Exit 재검증';}}
}

if($('saveEntry')) $('saveEntry').addEventListener('click',saveCurrentEntry);
if($('portfolioList')) $('portfolioList').addEventListener('click',async e=>{
  const evalBtn=e.target.closest('.exit-evaluate'); if(evalBtn){evaluatePosition(Number(evalBtn.dataset.index));return;}
  const del=e.target.closest('.position-delete'); if(del){const rows=loadPositions(),position=rows[Number(del.dataset.index)];if(!position)return;del.disabled=true;try{const r=await fetch('/api/daily/portfolio/'+position.entry.stockCode,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({entry:position.entry})});if(!r.ok)throw new Error('SERVER_PORTFOLIO_DELETE_FAILED');const latest=loadPositions().filter(x=>JSON.stringify(x.entry)!==JSON.stringify(position.entry));savePositions(latest);renderPortfolio();}catch(e){showStatus(e.message,true);del.disabled=false;}return;}
  const open=e.target.closest('.position-open'); if(open){selectedStockCode=open.dataset.code;$('stockCode').value=open.dataset.name;location.hash='#overview';analyze();}
});
renderPortfolio();
