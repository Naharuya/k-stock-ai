import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../public/daily.css',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../public/daily.js',import.meta.url),'utf8');
assert.ok(html.includes('src="/daily.js"') && html.includes('href="/daily.css"'));
assert.ok(html.indexOf('id="dailySection"')<html.indexOf('id="candidates"'));
assert.ok(html.includes('id="runCandidates"') && html.includes('id="saveEntry"'));
assert.ok(css.includes('#dailySection{order:0') && css.includes('#portfolio{order:1') && css.includes('#dailyActions{order:2'));
const ids=[...html.matchAll(/id="([^"]+)"/g)].map(x=>x[1]);
assert.equal(new Set(ids).size,ids.length);
const elements=Object.fromEntries(ids.map(id=>[id,{innerHTML:'',textContent:'',disabled:false,addEventListener(type,fn){this[type]=fn;},setAttribute(){},removeAttribute(){}}]));
const candidate={code:'005930',name:'<unsafe>',rankingScore:84.2,validationGrade:'A',status:'READY',reasons:['이상 없음']};
const today={targetTradingDate:'2026-09-14',generatedAt:'2026-09-13T23:30:00Z',errors:[],candidates:[candidate,{...candidate,code:'000660',name:'위험기업',status:'EXCLUDED',riskChanges:{newRisk:true}}]};
const status={scheduler:{enabled:false},errors:[],todayCandidateCount:1,tomorrowCandidateCount:0,newRiskCount:1,deepValidatedCount:1,lastPreMarket:today.generatedAt};
let requests=0,analyzed=false;
const context=vm.createContext({Intl,Date,console,
  $:id=>elements[id],f:String,escapeHtml:value=>String(value).replaceAll('<','&lt;').replaceAll('>','&gt;'),
  document:{hidden:false,addEventListener(){}},setInterval(){},selectedStockCode:null,
  analyze:options=>{analyzed=options.focusDetail;},
  fetch:async(url,options)=>{requests++;assert.ok(!options.method,'Page load must never start a scan');return {ok:true,json:async()=>({success:true,result:url.endsWith('/today')?today:url.endsWith('/status')?status:null})};}
});
vm.runInContext(js,context);
for(let i=0;i<10;i++)await new Promise(resolve=>setImmediate(resolve));
assert.equal(requests,3);
assert.ok(elements.dailyTodayCards.innerHTML.includes('&lt;unsafe&gt;'));
assert.ok(!elements.dailyTodayCards.innerHTML.includes('위험기업'));
assert.ok(elements.dailyRiskCards.innerHTML.includes('위험기업'));
assert.ok(elements.dailyPreTime.textContent.includes('완료'));
assert.ok(elements.dailySchedulerState.textContent.includes('꺼짐'));
elements.dailySection.click({target:{closest:()=>({dataset:{code:'005930',name:'테스트'}})}});
assert.equal(context.selectedStockCode,'005930');assert.equal(analyzed,true);
status.lastFailure={generatedAt:'2026-09-14T00:00:00Z'};
status.lastAfterMarket=null;status.lastPreMarket=null;
await context.refreshDaily();
assert.ok(elements.dailyMessage.textContent.includes('최근 실행 실패'),'Persisted first-run failure must be visible after restart');
console.log('Daily Dashboard: automatic saved-result loading, no scan on open, risk separation, escaping, mobile order, detail navigation and existing controls passed');
