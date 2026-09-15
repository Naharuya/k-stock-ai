// Saved Daily results are loaded automatically; this never starts a market scan.
const dailyLabels={READY:'정밀관심',WATCH:'관찰',DOWNGRADED:'위험증가',EXCLUDED:'제외',RISK:'위험증가'};
let dailyLoading=false;
let dailyPosting=false;
function dailyTime(value) {
  if(!value)return '아직 없음';
  return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value))+' KST';
}
function dailyNumber(value){return value==null?'-':f(value);}
function dailyCards(rows,empty) {
  if(!rows.length)return '<p class="empty">'+escapeHtml(empty)+'</p>';
  return rows.map((row,i)=>'<article class="daily-stock '+(['EXCLUDED','RISK','DOWNGRADED'].includes(row.status)?'daily-risk-card':'')+'">'+
    '<div class="daily-stock-head"><strong>'+ (i+1)+'. '+escapeHtml(row.name)+'</strong><span class="pill">'+escapeHtml(dailyLabels[row.status]||'관찰')+'</span></div>'+
    '<div class="daily-stock-metrics"><span>매력도 <b>'+dailyNumber(row.rankingScore)+'</b></span><span>검증등급 <b>'+escapeHtml(row.validationGrade)+'</b></span>'+
    (row.checkedAt?'<span>장전 점수 <b>'+dailyNumber(row.currentValidationScore)+'</b></span>':'')+'</div>'+
    '<p>'+escapeHtml((row.reasons||[]).slice(0,3).join(' · ')||'개별 상세분석 필요')+'</p>'+
    '<small>'+escapeHtml(row.code)+' · '+escapeHtml(dailyTime(row.checkedAt||row.analysisTimestamp))+'</small>'+
    '<button type="button" class="daily-detail" data-code="'+escapeHtml(row.code)+'" data-name="'+escapeHtml(row.name)+'">상세분석 →</button></article>').join('');
}
async function refreshDaily() {
  if(dailyLoading)return;
  dailyLoading=true;
  try {
    const responses=await Promise.all(['today','tomorrow','status'].map(async name=>{
      const r=await fetch('/api/daily/'+name,{cache:'no-store'});
      const body=await r.json();
      if(!r.ok||!body.success)throw new Error('저장 결과를 불러오지 못했습니다.');
      return body.result;
    }));
    const [today,tomorrow,status]=responses;
    const allowed=x=>!['EXCLUDED','RISK'].includes(x.status);
    const todayRows=(today?.candidates||[]).filter(allowed);
    const tomorrowRows=(tomorrow?.candidates||[]).filter(allowed);
    $('dailyTodayCards').innerHTML=dailyCards(todayRows.slice(0,5),'오늘 날짜의 장전 검증 결과가 아직 없습니다.');
    $('dailyTomorrowCards').innerHTML=dailyCards(tomorrowRows.slice(0,5),'다음 거래일의 장후 분석 결과가 아직 없습니다.');
    $('dailyTodayDate').textContent=today?today.targetTradingDate:'오늘';
    $('dailyTomorrowDate').textContent=tomorrow?tomorrow.targetTradingDate:'다음 거래일';
    $('dailyPreTime').textContent='장전 검증 '+(today?(today.errors.length?'일부 미완료 · ':'완료 · ')+dailyTime(today.generatedAt):'대기');
    $('dailyHeadline').textContent=$('dailyPreTime').textContent+' · 신규 위험 '+(status.newRiskCount||0)+'건';
    $('dailyAfterTime').textContent='장후 분석 '+(tomorrow?(tomorrow.errors.length?'일부 미완료 · ':'완료 · ')+dailyTime(tomorrow.generatedAt):'대기');
    const risks=(today?.candidates||[]).filter(x=>x.riskChanges?.newRisk||['EXCLUDED','RISK'].includes(x.status));
    $('dailyRiskCards').innerHTML=dailyCards(risks,'저장된 신규 위험 없음'+(today?'':' · 장전 검증 대기'));
    const stats=[['마지막 장후 분석',dailyTime(status.lastAfterMarket)],['마지막 장전 검증',dailyTime(status.lastPreMarket)],
      ['오늘 후보 수',status.todayCandidateCount],['내일 후보 수',status.tomorrowCandidateCount],
      ['신규 위험 수',status.newRiskCount],['정밀검증 후보 수',status.deepValidatedCount]];
    $('dailyStats').innerHTML=stats.map(([label,value])=>'<div class="trust-card"><span>'+label+'</span><strong>'+escapeHtml(value)+'</strong></div>').join('');
    $('dailySchedulerState').textContent=status.scheduler.enabled?'자동 실행 켜짐':'자동 실행 꺼짐';
    const lastFailure=status.lastJob?.state==='FAILED' || (status.lastFailure &&
      status.lastFailure.generatedAt>([status.lastAfterMarket,status.lastPreMarket].filter(Boolean).sort().at(-1)||''));
    const msg=status.active?'분석 진행 중 · 완료되면 자동으로 표시됩니다.':
      status.scheduler.configError?'자동 실행 시각 설정을 확인해 주세요.':
      lastFailure?'최근 실행 실패 · 이전 저장 결과를 표시합니다. 다시 실행해 주세요.':
      status.errors.length?'일부 데이터 검증 미완료 '+status.errors.length+'건 · 상세분석으로 확인해 주세요.':
      '최신 저장 결과 · 자동 주문 기능 없음';
    $('dailyMessage').textContent=msg;
    $('dailyActionMessage').textContent=msg;
    for(const id of ['dailyAfterButton','dailyPreButton'])$(id).disabled=Boolean(status.active)||dailyPosting;
    if(status.active)$('dailySection').setAttribute('aria-busy','true');else $('dailySection').removeAttribute('aria-busy');
  } catch(error) {
    $('dailyMessage').textContent=error.message+' 최신 결과 보기를 눌러 재시도하세요.';
    $('dailyActionMessage').textContent=$('dailyMessage').textContent;
  } finally {dailyLoading=false;}
}
async function runDaily(kind) {
  if(dailyPosting)return;
  dailyPosting=true;
  $('dailyAfterButton').disabled=true;$('dailyPreButton').disabled=true;
  try {
    const r=await fetch('/api/daily/'+kind,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
    const body=await r.json();
    if(!r.ok||!body.success)throw new Error(r.status===409?'이미 Daily 분석이 진행 중입니다.':'분석 요청을 시작하지 못했습니다.');
    $('dailyMessage').textContent='분석을 시작했습니다. 완료되면 자동으로 표시됩니다.';
  } catch(error) {$('dailyMessage').textContent=error.message;}
  finally {dailyPosting=false;await refreshDaily();}
}
$('dailyAfterButton').addEventListener('click',()=>runDaily('after-market'));
$('dailyPreButton').addEventListener('click',()=>runDaily('pre-market'));
$('dailyRefreshButton').addEventListener('click',refreshDaily);
$('dailySection').addEventListener('click',event=>{
  const button=event.target.closest('.daily-detail');
  if(!button)return;
  selectedStockCode=button.dataset.code;
  $('stockCode').value=button.dataset.name;
  analyze({focusDetail:true});
});
void refreshDaily();
setInterval(()=>{if(!document.hidden)void refreshDaily();},15000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refreshDaily();});
