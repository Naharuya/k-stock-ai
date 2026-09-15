import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import express from 'express';
import {temporaryStoreDirectory,recordFixture} from './daily_test_helpers.js';

const candidates=[process.env.KSTOCK_TEST_BROWSER,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
let executable;
for(const file of candidates){try {await fs.access(file);executable=file;break;}catch{}}
if(!executable)throw new Error('Chrome/Edge not found. Set KSTOCK_TEST_BROWSER for this optional browser test.');
const temp=await temporaryStoreDirectory();
const fixture=recordFixture();
fixture.targetTradingDate='2026-09-14';
fixture.candidates=Array.from({length:5},(_,i)=>({...fixture.candidates[0],code:String(i+1).padStart(6,'0'),name:['테스트전자','테스트반도체','테스트금융','테스트자동차','테스트소프트'][i],checkedAt:'2026-09-13T23:30:00Z',currentValidationScore:84-i,reasons:['장전 변화: 이상 없음','모의 데이터 · 화면 검증용']}));
const app=express();
app.use(express.static(path.resolve('public')));
app.get('/health',(req,res)=>res.json({version:'2.6.0'}));
app.get('/api/universe/status',(req,res)=>res.json({success:true,result:{total:3989}}));
app.get('/api/daily/today',(req,res)=>res.json({success:true,result:fixture}));
app.get('/api/daily/tomorrow',(req,res)=>res.json({success:true,result:fixture}));
app.get('/api/daily/status',(req,res)=>res.json({success:true,result:{scheduler:{enabled:false},errors:[],todayCandidateCount:5,tomorrowCandidateCount:5,newRiskCount:0,deepValidatedCount:5,lastAfterMarket:fixture.generatedAt,lastPreMarket:fixture.generatedAt}}));
const morningFixture={date:'2026-09-14',sourceTradingDate:'2026-09-11',status:'SUCCESS',scope:'all',completedAt:'2026-09-13T22:12:00Z',marketRegime:'NEUTRAL_MIXED',newRiskCount:1,errors:[],portfolioExitStatus:[{stockCode:'003280',status:'WATCH'}],topCandidates:fixture.candidates.map(x=>({code:x.code,name:x.name,entryState:'WATCH',committee:{totalScore:70},reasons:x.reasons}))};
const requests=[];
app.use(express.json());
app.get('/api/daily/latest',(req,res)=>res.json({success:true,result:morningFixture}));
app.get('/api/daily/agents/status',(req,res)=>res.json({success:true,result:{date:'2026-09-14',active:null,scheduler:{enabled:false},agentStatus:{TechnicalAgent:{agent:'TechnicalAgent',status:'SUCCESS'}}}}));
app.get('/api/daily/portfolio',(req,res)=>res.json({success:true,result:{positions:[],evaluations:[]}}));
app.post('/api/daily/run',(req,res)=>{requests.push(req.body);res.status(202).json({success:true,job:{status:'RUNNING'}});});
const server=app.listen(0,'127.0.0.1');
await new Promise(resolve=>server.once('listening',resolve));
const browser=spawn(executable,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking',
  '--remote-debugging-port=0','--user-data-dir='+temp.root,'about:blank'],{windowsHide:true,stdio:'ignore'});
let socket;
try {
  let port;
  for(let i=0;i<100;i++){
    try {port=Number((await fs.readFile(path.join(temp.root,'DevToolsActivePort'),'utf8')).split('\n')[0]);break;}catch{}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.ok(port,'Browser debugging endpoint must start');
  const pages=await (await fetch('http://127.0.0.1:'+port+'/json')).json();
  socket=new WebSocket(pages.find(x=>x.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let id=0;
  const pending=new Map(),exceptions=[];
  socket.addEventListener('message',event=>{
    const message=JSON.parse(event.data);
    if(message.method==='Runtime.exceptionThrown')exceptions.push(message.params.exceptionDetails.text);
    if(message.id&&pending.has(message.id)){const done=pending.get(message.id);pending.delete(message.id);message.error?done.reject(new Error(message.error.message)):done.resolve(message.result);}
  });
  function send(method,params={}){
    return new Promise((resolve,reject)=>{const key=++id;const timer=setTimeout(()=>{pending.delete(key);reject(new Error('CDP timeout: '+method));},10000);
      pending.set(key,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});
      socket.send(JSON.stringify({id:key,method,params}));
    });
  }
  async function evaluate(expression){const result=await send('Runtime.evaluate',{expression,returnByValue:true});if(result.exceptionDetails)throw new Error('Browser evaluation failed');return result.result.value;}
  await send('Page.enable');await send('Runtime.enable');
  for(const [name,width,height,mobile] of [['desktop',1440,1000,false],['mobile',390,844,true]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
    await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port});
    let ready=false;
    for(let i=0;i<80;i++){
      if(await evaluate("document.querySelectorAll('#dailyTodayCards .daily-stock').length===5 && document.querySelectorAll('#morningCandidates .daily-stock').length===5")){ready=true;break;}
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    assert.ok(ready,'Saved watchlist must render in '+name);
    assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'),true,name+' horizontal overflow');
    assert.equal(await evaluate("document.getElementById('appVersion').textContent.includes('2.6.0')"),true);
    if(mobile) {
      const positions=await evaluate("['dailySection','portfolio','dailyActions','candidates'].map(id=>document.getElementById(id).getBoundingClientRect().top)");
      assert.ok(positions.every((value,i)=>i===0||value>positions[i-1]),'Mobile priority order');
    }
    assert.equal(await evaluate("document.getElementById('morningState').textContent.includes('07:12')"),true);
    assert.equal(await evaluate("document.getElementById('morningPortfolio').textContent.includes('관찰 1')"),true);
    if(mobile)assert.equal(await evaluate("document.getElementById('morningBrief').getBoundingClientRect().top < document.getElementById('dailySection').getBoundingClientRect().top"),true);
    assert.equal(requests.length,0,'Opening the page must not start a scan');
    const screenshot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    await fs.writeFile(path.resolve('.cache/mobile-polish-'+name+'.png'),Buffer.from(screenshot.data,'base64'));
  }
  await evaluate("document.querySelector('[data-morning-scope=portfolio]').click()");
  for(let i=0;i<50&&requests.length===0;i++)await new Promise(r=>setTimeout(r,100));
  assert.deepEqual(requests,[{force:true,scope:'portfolio'}]);
  assert.deepEqual(exceptions,[],'Browser must have no uncaught JavaScript errors');
  const manifest=await (await fetch('http://127.0.0.1:'+server.address().port+'/manifest.webmanifest')).json();
  assert.equal(manifest.display,'standalone');assert.equal(manifest.icons.length,2);
  for(const size of [192,512]) {
    await send('Emulation.setDeviceMetricsOverride',{width:size,height:size,deviceScaleFactor:1,mobile:false});
    await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/icons/app-icon.svg'});
    let loaded=false;
    for(let i=0;i<60;i++){if(await evaluate("document.documentElement.tagName.toLowerCase()==='svg'")){loaded=true;break;}await new Promise(r=>setTimeout(r,50));}
    assert.ok(loaded);await evaluate("document.documentElement.setAttribute('width','"+size+"');document.documentElement.setAttribute('height','"+size+"')");
    const png=await send('Page.captureScreenshot',{format:'png',clip:{x:0,y:0,width:size,height:size,scale:1}});
    const bytes=Buffer.from(png.data,'base64');assert.equal(bytes.readUInt32BE(16),size);assert.equal(bytes.readUInt32BE(20),size);
    await fs.writeFile(path.resolve('public/icons/app-icon-'+size+'.png'),bytes);
  }
  await send('Browser.close');
  console.log('Mobile UX + icons: read-only initial load, scoped Exit button, first-screen brief, desktop 1440px / mobile 390px; five saved cards, dynamic version, mobile order, no horizontal overflow, no JS exceptions passed (fixture data)');
} finally {
  socket?.close();
  if(browser.exitCode===null)await new Promise(resolve=>{const timer=setTimeout(()=>{browser.kill();resolve();},3000);browser.once('exit',()=>{clearTimeout(timer);resolve();});});
  await new Promise(resolve=>server.close(resolve));
  await temp.cleanup();
}
