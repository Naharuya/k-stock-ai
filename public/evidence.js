window.renderFinancialEvidence=data=>{
  let box=document.getElementById('financialEvidence');
  if(!box){box=document.createElement('section');box.id='financialEvidence';box.className='section-card';(document.querySelector('main')||document.body).append(box);}
  box.replaceChildren();const title=document.createElement('h3');title.textContent='최신 재무 · 공시 근거';box.append(title);
  const latest=data.dart?.latestFinancials,p=document.createElement('p');
  p.textContent=latest?.basis?latest.basis.businessYear+'년 '+({'11011':'사업보고서','11012':'반기보고서','11013':'1분기보고서','11014':'3분기보고서'}[latest.basis.reportCode]||'보고서')+' · '+latest.basis.fsDiv+' · 점수는 기존 연간 모델 기준':'최신 재무 데이터 확인 필요';box.append(p);
  if(latest?.ttm?.status==='READY'){const line=document.createElement('p');line.textContent='최근 12개월 · '+Object.entries(latest.ttm.values).map(([k,v])=>({revenue:'매출',operatingProfit:'영업이익',netIncome:'순이익'}[k])+': '+(v==null?'-':Math.round(v).toLocaleString('ko-KR')+'원')).join(' · ');box.append(line);}
  else{const line=document.createElement('p');line.textContent='TTM: 비교 가능한 원자료가 없어 계산을 보류합니다.';box.append(line);}
  const receipts=[...(latest?.basis?.receipts||[]),...(data.dart?.disclosures?.events||[]).map(x=>x.receiptNo)].filter(x=>/^\d{14}$/.test(x));
  for(const receipt of [...new Set(receipts)].slice(0,6)){
    const row=document.createElement('p'),a=document.createElement('a'),button=document.createElement('button');
    a.href='https://dart.fss.or.kr/dsaf001/main.do?rcpNo='+receipt;a.target='_blank';a.rel='noopener';a.textContent='DART 공시 '+receipt;
    button.textContent='원문 확인';button.onclick=async()=>{button.disabled=true;try{const r=await fetch('/api/dart/evidence/'+receipt),body=await r.json();if(!r.ok)throw Error();const details=document.createElement('details'),summary=document.createElement('summary'),pre=document.createElement('p');summary.textContent='공식 원문 발췌 · 해석 검토 필요';pre.style.whiteSpace='pre-wrap';pre.textContent=body.result.documents.map(d=>d.text).join('\n').slice(0,12000);details.append(summary,pre);row.append(details);}catch{button.textContent='원문 조회 실패 · DART 링크 확인';}finally{button.disabled=false;}};
    row.append(a,document.createTextNode(' '),button);box.append(row);
  }
};
