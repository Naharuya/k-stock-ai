// Browser tooling may be supplied from an existing development install; no production dependency.
const {chromium}=require(process.env.KSTOCK_PLAYWRIGHT_MODULE || 'playwright');
const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const server=spawn('python3',['-m','http.server','18749','--bind','127.0.0.1','--directory',path.resolve(__dirname,'../public')],{stdio:'ignore'});
 let browser;const checks=[];const errors=[];
 try{
  for(let n=0;n<40;n++){try{if((await fetch('http://127.0.0.1:18749/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({headless:true,channel:'chrome'});
  for(const [name,width,height] of [['web',1440,1000],['android',360,800],['iphone',390,844]]){
   const page=await browser.newPage({viewport:{width,height}});page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:18749/');await page.waitForSelector('.navigation-group',{state:'attached'});
   const record=(label,value)=>{assert.ok(value,name+':'+label);checks.push(name+':'+label);};
   record('all_internal_targets_exist',await page.locator('.workspace-menu nav a').evaluateAll(nodes=>nodes.every(n=>!n.hash||!!document.getElementById(n.hash==='#overview'?'research-home':n.hash.slice(1)))));
   record('privacy_same_webview',await page.locator('.workspace-menu nav a[href="/privacy.html"]').count()===1);
   record('no_fake_account_controls',!(await page.locator('.workspace-menu nav').innerText()).match(/회원탈퇴|로그아웃|미니게임/));
   if(width<768){
    await page.locator('.bottom-nav button').click();record('more_opens',await page.locator('.workspace-menu').evaluate(n=>n.open));
    record('expanded_announced',await page.locator('.bottom-nav button').getAttribute('aria-expanded')==='true');
    await page.locator('.workspace-menu nav a[href="#paper-portfolio"]').click();
    await page.locator('#paper-portfolio').waitFor({state:'visible'});
    record('paper_route_visible',await page.locator('#paper-portfolio').isVisible());
    record('menu_closes',!(await page.locator('.workspace-menu').evaluate(n=>n.open)));
    record('paper_active',await page.locator('.bottom-nav a[href="#paper-portfolio"]').getAttribute('aria-current')==='page');
    await page.locator('.bottom-nav button').click();await page.keyboard.press('Escape');
    record('escape_closes',!(await page.locator('.workspace-menu').evaluate(n=>n.open)));
    record('escape_restores_focus',await page.locator('.workspace-menu summary').evaluate(n=>n===document.activeElement));
   }else{
    await page.locator('.rail nav a[href="#performance"]').click();await page.locator('#performance').waitFor({state:'visible'});record('desktop_performance_visible',await page.locator('#performance').isVisible());
    record('desktop_active',await page.locator('.rail nav a[href="#performance"]').getAttribute('aria-current')==='page');
   }
   record('no_horizontal_overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.close();
  }
  assert.deepEqual(errors,[]);checks.push('no_browser_runtime_errors');
  const result={status:'PASS',checkedAt:new Date().toISOString(),checks,scope:'Desktop Chrome and Android/iPhone viewport emulation; physical WebViews NOT RUN'};
  fs.writeFileSync(path.resolve(__dirname,'../data/v2/verification/workspace-navigation-20261020.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
