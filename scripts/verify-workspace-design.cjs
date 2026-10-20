// Real browser / local saved research only. No external collection or credentials.
const {chromium}=require(process.env.KSTOCK_PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const reportName=process.env.KSTOCK_DESIGN_REPORT_NAME||'workspace-design';if(!/^[a-z0-9-]+$/.test(reportName))throw Error('INVALID_REPORT_NAME');
const root=path.resolve(__dirname,'..'),out=path.join(root,'data/v2/verification',reportName);fs.mkdirSync(out,{recursive:true});
(async()=>{const env={PATH:process.env.PATH,HOST:'127.0.0.1',PORT:'18757',DOTENV_CONFIG_PATH:'/dev/null',KSTOCK_AI_MODE:'mock',KSTOCK_EXTERNAL_ACCESS_ENABLED:'false',KSTOCK_BROKER_ENABLED:'false',KSTOCK_LIVE_TRADING_ENABLED:'false',KSTOCK_RESEARCH_COLLECTION_ENABLED:'false',KSTOCK_PEER_WORKER_ENABLED:'false'};
 const log=fs.openSync(path.join(out,'server.log'),'w');const server=spawn(process.execPath,['src/server.js'],{cwd:root,env,stdio:['ignore',log,log]});let browser;const cases=[],errors=[];
 try{
  for(let i=0;i<80;i++){try{if((await fetch('http://127.0.0.1:18757/health')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({headless:true,channel:'chrome'});
  const axe=process.env.KSTOCK_AXE_PATH||require.resolve('axe-core/axe.min.js');
  for(const width of JSON.parse(process.env.KSTOCK_DESIGN_WIDTHS||'[320,360,390,430,768,1024,1440]')){
   const page=await browser.newPage({viewport:{width,height:1000}});page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:18757/');await page.waitForFunction(()=>typeof applyResearchScreen==='function');await page.waitForTimeout(500);await page.addScriptTag({path:axe});
   for(const theme of ['light','dark']){
    await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;},theme);
    for(const route of JSON.parse(process.env.KSTOCK_DESIGN_ROUTES||'["overview","investment-signals","paper-portfolio","agent-dashboard","settings","research-results","trade-recommendations","global-influence","market-analysis","candidates","stock-analysis","peer-validation","holdings","performance","sources"]')){
     await page.evaluate(route=>{location.hash=route;applyResearchScreen();},route);await page.waitForTimeout(250);
     const dimensions=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}));
     const violations=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});
     cases.push({width,theme,route,noOverflow:dimensions.document<=dimensions.viewport,violations});
     if(['overview','trading-today'].includes(route)&&[390,1440].includes(width))await page.screenshot({path:path.join(out,`${route==='trading-today'?'trading-home':'home'}-${width}-${theme}.png`),fullPage:true});
    }
   }
   // Enlarged text changes layout, rather than only scaling a screenshot.
   await page.evaluate(()=>{document.documentElement.dataset.theme='light';location.hash='paper-portfolio';applyResearchScreen();const typography=[...document.querySelectorAll('body *')].filter(n=>[...n.childNodes].some(c=>c.nodeType===3&&c.textContent.trim())||['INPUT','SELECT','TEXTAREA'].includes(n.tagName)).map(n=>[n,parseFloat(getComputedStyle(n).fontSize)]);for(const[n,size]of typography)if(Number.isFinite(size))n.style.fontSize=(size*2)+'px';});
   cases.push({width,theme:'light-enlarged',route:'paper-portfolio',noOverflow:await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),violations:[]});
   console.log(JSON.stringify({width,checked:cases.length,failed:cases.filter(c=>!c.noOverflow||c.violations.length).length,failures:cases.filter(c=>!c.noOverflow||c.violations.length).map(c=>({width:c.width,theme:c.theme,route:c.route,overflow:!c.noOverflow,rules:c.violations.map(v=>v.id)}))}));await page.close();
  }
  const failures=cases.filter(c=>!c.noOverflow||c.violations.length);const result={status:!failures.length&&!errors.length?'PASS':'FAIL',checkedAt:new Date().toISOString(),scope:'Chrome responsive light/dark WCAG automated; physical native toolbars verified separately',cases,errors};fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({status:result.status,cases:cases.length,failed:failures.length,errors,report:path.join(out,'report.json')}));if(result.status!=='PASS')process.exitCode=1;
 }finally{if(browser)await browser.close();server.kill();fs.closeSync(log);}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
