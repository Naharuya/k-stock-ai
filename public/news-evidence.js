window.renderNewsEvidenceControls=data=>{
  const items=data.newsData?.items||[];
  document.querySelectorAll('#newsList .news-item').forEach((row,index)=>{
    const item=items[index],button=document.createElement('button');button.textContent='원문 근거 확인';row.append(button);
    button.onclick=async()=>{
      button.disabled=true;
      const result=document.createElement('p');result.style.whiteSpace='pre-wrap';row.append(result);
      try{
        const r=await fetch('/api/news/evidence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({link:item?.link,sourceUrl:item?.sourceUrl,corpName:data.corpName})});
        const b=await r.json();if(!r.ok)throw Error();
        const evidence=b.result;
        result.textContent=evidence.excerpt?(evidence.companyMatched?'발행사 본문에서 회사명 확인 · 사실 해석은 검토 필요':'본문의 종목 연관성 확인 필요')+'\n'+evidence.excerpt:'원문 주소 또는 본문을 자동 확인하지 못했습니다. 기사 링크에서 확인해 주세요.';
      }catch{result.textContent='원문을 조회할 수 없습니다. 기사 링크에서 직접 확인해 주세요.';}
      finally{button.disabled=false;}
    };
  });
};
