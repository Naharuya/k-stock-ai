const fs=require('fs'),path=require('path'),{spawn}=require('child_process'),{chromium}=require('/Users/ari/ARI/projects/onaria/backend/node_modules/playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),out=path.join(root,'data/v2/verification/holding-exits');fs.mkdirSync(out,{recursive:true});
 const checks={},check=(name,pass)=>{checks[name]=!!pass;if(!pass)throw Error(name)};
 const server=spawn(process.execPath,['src/server.js'],{cwd:root,env:{PATH:process.env.PATH,PORT:'18765',HOST:'127.0.0.1',DOTENV_CONFIG_PATH:'/dev/null',KSTOCK_AI_MODE:'mock',KSTOCK_EXTERNAL_ACCESS_ENABLED:'false',KSTOCK_BROKER_ENABLED:'false',KSTOCK_LIVE_TRADING_ENABLED:'false',KSTOCK_RESEARCH_COLLECTION_ENABLED:'false',KSTOCK_PEER_WORKER_ENABLED:'false'},stdio:'ignore'});
 let browser;
 const holdings=['005930','000660','035420','035720','051910','005380','IBM'].map((symbol,index)=>({market:index===6?'US':'KR',exchange:index===6?'NYS':'KRX',currency:index===6?'USD':'KRW',name:'합성 보유 '+index,symbol,averageCost:100,quantity:1}));
 const actions=['EXIT_CONDITION_MET','REDUCE_CONDITION_MET','RISK_REVIEW','HOLD_CONDITION_MET','DATA_UNAVAILABLE','EXIT_CONDITION_MET','HOLD_CONDITION_MET'];
 try{
  for(let i=0;i<80;i++){try{if((await fetch('http://127.0.0.1:18765/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
  browser=await chromium.launch({headless:true});
  for(const width of [320,390,1440]){
   const page=await browser.newPage({viewport:{width,height:844}});let denied=false,delay=0,calls=0,validTypes=true;const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(rows=>localStorage.setItem('kstock-user-holdings-v1',JSON.stringify(rows)),holdings);
   await page.route('**/api/v2/trading/holding-summaries',async route=>{
    calls++;validTypes&&=(route.request().headers()['content-type']||'').startsWith('application/json')&&!/quantity|averageCost/.test(route.request().postData()||'');const rows=route.request().postDataJSON().instruments;
    if(delay)await new Promise(r=>setTimeout(r,delay));
    if(denied){await route.fulfill({status:401,json:{success:false}}).catch(()=>{});return}
    const items=rows.map(h=>{const index=holdings.findIndex(i=>i.symbol===h.symbol);return {success:true,instrument:{...h,currency:h.market==='KR'?'KRW':'USD'},dataStatus:index===4?'UNAVAILABLE':'STORED_OBSERVATION',quote:{close:([89,111,99,105,105,89,105][index]),date:'2026-10-20'},receivedAt:new Date().toISOString(),strategy:{action:index===4?'DATA_UNAVAILABLE':'WAIT',reason:index===4?'DAILY_HISTORY_REQUIRED':null,holdingContext:'NONE',entry:105,stop:95,target:110,metrics:{sma20:102,atr14:5},validUntil:new Date(Date.now()+(index===5?-1000:3600000)).toISOString()}}});
    await route.fulfill({json:{success:true,items}}).catch(()=>{});
   });
   await page.goto('http://127.0.0.1:18765/#my-stocks');await page.waitForSelector('.holding-exit-summary[data-action]');
   check('oneBatchForSeven:'+width,calls===1&&await page.locator('.holding-exit-summary').count()===7);
   for(const action of ['EXIT_CONDITION_MET','REDUCE_CONDITION_MET','RISK_REVIEW','HOLD_CONDITION_MET'])check(action+':'+width,await page.locator('.holding-exit-summary[data-action="'+action+'"]').count()>=1);
   check('missingAndExpiredHaveNoLevels:'+width,await page.locator('.holding-exit-summary[data-action="DATA_UNAVAILABLE"]').count()===2&&await page.locator('.holding-exit-summary[data-action="DATA_UNAVAILABLE"] .holding-exit-levels').count()===0);
   check('separateCurrency:'+width,(await page.locator('.trading-holding-row').last().innerText()).includes('US$'));
   check('noOverflow:'+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   check('readableNotes:'+width,await page.locator('.holding-exit-summary .trading-note').evaluateAll(ns=>ns.length>0&&ns.every(n=>parseFloat(getComputedStyle(n).fontSize)>=15)));
   await page.addScriptTag({path:'/Users/ari/ARI/projects/onaria/backend/node_modules/axe-core/axe.min.js'});
   const axe=await page.evaluate(async()=>window.axe.run(document.getElementById('trading-holding-list'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}}));
   check('filledCardsAccessibility:'+width,axe.violations.length===0);
   await page.screenshot({path:path.join(out,'holdings-'+width+'.png'),fullPage:true});
   delay=250;await page.locator('#trading-holding-refresh').click();await page.locator('.trading-holding-row').first().getByRole('button',{name:'삭제',exact:true}).click();await page.waitForTimeout(700);
   check('removedHoldingCannotReappear:'+width,await page.locator('.trading-holding-row').count()===6&&!(await page.locator('#trading-holding-list').innerText()).includes('005930'));
   denied=true;delay=0;await page.locator('#trading-holding-refresh').click();await page.waitForFunction(()=>document.querySelector('#trading-holding-list')?.textContent.includes('인증 설정 후'));
   check('authFailureClearsAllLevels:'+width,await page.locator('.holding-exit-levels').count()===0&&await page.locator('.holding-exit-summary[data-action="DATA_UNAVAILABLE"]').count()===6);
   check('jsonAndNoErrors:'+width,validTypes&&errors.length===0);
   await page.close();
  }
  const report={status:'PASS',scope:'SYNTHETIC_HOLDINGS_AND_ROUTED_API_NO_REAL_FINANCIAL_ADVICE',checks};fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }catch(e){fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'FAIL',checks,error:e.message},null,2));console.error(e.stack);process.exitCode=1}finally{if(browser)await browser.close();server.kill()}
})();
