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
  for(const [name,width,height,mobile] of [['desktop',1440,1000,false],['tablet',837,1000,false],['breakpoint',760,1000,true],['mobile',390,844,true],['small',320,740,true]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
    await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port});
    let ready=false;
    for(let i=0;i<80;i++){
      if(await evaluate("document.querySelectorAll('#dailyTodayCards .daily-stock').length===5")){ready=true;break;}
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    assert.ok(ready,'Saved watchlist must render in '+name);
    assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'),true,name+' horizontal overflow');
    assert.equal(await evaluate("document.getElementById('appVersion').textContent.includes('2.6.0')"),true);
    if(mobile) {
      const positions=await evaluate("['dailySection','portfolio','dailyActions','candidates'].map(id=>document.getElementById(id).getBoundingClientRect().top)");
      assert.ok(positions.every((value,i)=>i===0||value>positions[i-1]),'Mobile priority order');
    }
    const originalCandidateBody = await evaluate("document.getElementById('candidateBody').innerHTML");
    for (const message of [null, '??? ????.', '??: ' + '??????'.repeat(30)]) {
      if (message !== null) await evaluate("document.querySelector('#candidateBody .empty').textContent=" + JSON.stringify(message));
      const layout = await evaluate(`(() => {
        const cell = document.querySelector('#candidateBody .empty');
        const row = cell.parentElement.getBoundingClientRect();
        const box = cell.getBoundingClientRect();
        const range = document.createRange(); range.selectNodeContents(cell);
        const text = range.getBoundingClientRect();
        const wrap = cell.closest('.screener-table-wrap').getBoundingClientRect();
        return {width: box.width, rowWidth: row.width, contained: text.bottom <= row.bottom + 1 && text.right <= row.right + 1,
          fits: wrap.right <= innerWidth, nextTop: document.querySelector('.candidate-rejected-wrap').getBoundingClientRect().top, bottom: row.bottom};
      })()`);
      assert.ok(layout.contained, name + ' candidate message stays inside its row');
      assert.ok(layout.nextTop >= layout.bottom, name + ' candidate message does not overlap risk section');
      if (width <= 760) assert.ok(layout.width > layout.rowWidth * .7 && layout.fits, name + ' message uses full card width');
    }
    if (width <= 760) {
      const cells = ['1', 'Fixture stock 000001', '84', 'A', 'WATCH', 'Reason '.repeat(15), 'Risk '.repeat(15), 'PER 12', 'Value', '<button>Details</button>'];
      await evaluate("document.getElementById('candidateBody').innerHTML=" + JSON.stringify('<tr>' + cells.map(text => '<td>' + text + '</td>').join('') + '</tr>'));
      const card = await evaluate(`(() => {
        const row = document.querySelector('#candidateBody tr').getBoundingClientRect();
        const cells = [...document.querySelectorAll('#candidateBody td')].map(cell => cell.getBoundingClientRect());
        return {rankWidth: cells[0].width, rankHeight: cells[0].height,
          contained: cells.every(cell => cell.left >= row.left && cell.right <= row.right && cell.bottom <= row.bottom),
          nextTop: document.querySelector('.candidate-rejected-wrap').getBoundingClientRect().top, bottom: row.bottom};
      })()`);
      assert.equal(card.rankWidth, 30); assert.equal(card.rankHeight, 30);
      assert.ok(card.contained && card.nextTop >= card.bottom, name + ' populated candidate card stays contained');
    }
    await evaluate("document.getElementById('candidateBody').innerHTML=" + JSON.stringify(originalCandidateBody));
    const screenshot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    await fs.writeFile(path.resolve('.cache/daily-dashboard-'+name+'.png'),Buffer.from(screenshot.data,'base64'));
  }
  assert.deepEqual(exceptions,[],'Browser must have no uncaught JavaScript errors');
  await send('Browser.close');
  console.log('Chrome browser: 320/390/760/837/1440px; candidate status messages and populated mobile cards, five saved cards, dynamic version, mobile order, no horizontal overflow, no JS exceptions passed (fixture data)');
} catch (error) {
  console.error(error);
  throw error;
} finally {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({id: 999999, method: 'Browser.close'}));
  }
  socket?.close();
  if(browser.exitCode===null)await new Promise(resolve=>{const timer=setTimeout(()=>{browser.kill();resolve();},3000);browser.once('exit',()=>{clearTimeout(timer);resolve();});});
  await new Promise(resolve=>server.close(resolve));
  await temp.cleanup();
}
