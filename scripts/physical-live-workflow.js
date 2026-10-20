(async()=>{
 const checks={};const check=(name,value)=>{checks[name]=!!value;if(!value)throw Error(name);};const set=(id,value)=>byId(id).value=String(value);const click=id=>byId(id).click();
 let result;
 try{
  check('httpsOrigin',location.origin==='https://kstock.ai.kr'&&isSecureContext);
  check('emptySessionOnly',!hasPaperRecords());
  const research=await candidateRequest('/api/v2/research/dashboard');check('authenticatedResearch',research.success===true);renderSimpleResearch(research);
  if(!window.KStockNative)check('invalidCredentialRejected',(await fetch('/api/v2/candidates',{headers:{Authorization:'Bearer invalid-device-test'},cache:'no-store'})).status===401);
  check('savedOfficialEvents',research.summary?.independentEvents>0||research.eventCards?.length>0||research.people?.length>0||research.signalCards?.length>0||Number(research.summary?.statements)>0);
  const catalog=await candidateRequest('/api/v2/trading/instruments?market=KR');check('tradingCatalogConnected',catalog.universeSecurities>0&&catalog.items.length>0);
  const kr=await candidateRequest('/api/v2/trading/detail?market=KR&symbol=005930');const us=await candidateRequest('/api/v2/trading/detail?market=US&symbol=AAPL&exchange=NAS');
  check('actualKrDailyClose',kr.quote?.close>0&&kr.history?.bars?.length>=40);check('actualUsDailyClose',us.quote?.close>0&&us.history?.bars?.length>=40);
  check('krUsCurrencySeparated',kr.instrument.currency==='KRW'&&us.instrument.currency==='USD');check('ruleSimulationNotRecommendation',kr.strategy.policy.mode==='RULE_SIMULATION'&&kr.recommendationStatus==='HOLD'&&kr.orderExecution===false);
  const holding=await candidateRequest('/api/v2/trading/holding-review',true,{method:'POST',body:{market:'KR',symbol:'005930',holding:{averageCost:kr.quote.close,quantity:1}}});check('holdingReviewNoExecution',holding.strategy.holdingContext==='USER_ENTERED'&&holding.orderExecution===false);
  location.hash='trading-today';applyResearchScreen();for(let n=0;n<100&&!document.querySelector('#trading-home-detail .trading-price');n++)await new Promise(r=>setTimeout(r,100));check('newTradingHomeVisible',document.getElementById('trading-today').classList.contains('screen-active')&&!!document.querySelector('#trading-home-detail .trading-price'));
  const publicSummary=await candidateRequest('/api/v2/trading/holding-summaries',true,{method:'POST',body:{instruments:[{market:'KR',symbol:'005930',exchange:'KRX'},{market:'US',symbol:'AAPL',exchange:'NAS'}]}});
  check('publicHoldingSummaryApi',publicSummary.success===true&&publicSummary.items?.length===2&&publicSummary.orderExecution===false);
  check('publicSummaryContainsNoUserHoldings',publicSummary.items.every(d=>!('quantity' in d)&&!('averageCost' in d)&&d.strategy.holdingContext!=='USER_ENTERED'));
  const summaryKr=publicSummary.items.find(d=>d.instrument.market==='KR');
  const localExit=window.KStockTradingTools.holdingExitSummary({...summaryKr.instrument,averageCost:kr.quote.close,quantity:1},summaryKr);
  check('holdingExitCalculatedOnDevice',['EXIT_CONDITION_MET','REDUCE_CONDITION_MET','RISK_REVIEW','HOLD_CONDITION_MET'].includes(localExit.action));
  const news=await candidateRequest('/api/v2/trading/news');check('newsDigestReadOnly',news.success===true&&Array.isArray(news.items)&&news.orderExecution===false&&news.schedulerEnabled===true);
  check('candidateDiagnosticsVisible',!!document.querySelector('#trading-opportunities .trading-diagnosis'));
  check('detailNotesAtLeast15px',Array.from(document.querySelectorAll('#trading-home-detail .trading-note')).length>0&&Array.from(document.querySelectorAll('#trading-home-detail .trading-note')).every(n=>parseFloat(getComputedStyle(n).fontSize)>=15));
  check('mobileHomeNoOverflow',document.documentElement.scrollWidth<=innerWidth);
  if(window.KStockTradingStorage){
   const store=window.KStockTradingStorage;let denied=false;try{await store.getItem('kstock-auth-token');}catch{denied=true;}check('nativeStorageCannotReadCredentialKeys',denied);
   let invalid=false;try{await store.setItem('kstock-trading-watch-v1',JSON.stringify([{market:'KR',symbol:'005930',exchange:'KRX',currency:'KRW',name:'QA',secret:'reject'}]));}catch{invalid=true;}check('nativeStorageRejectsExtraFields',invalid);
   const before=await store.getItem('kstock-trading-watch-v1');if(before===null){try{const value=JSON.stringify([{market:'KR',symbol:'005930',exchange:'KRX',currency:'KRW',name:'QA synthetic'}]);await store.setItem('kstock-trading-watch-v1',value);check('nativeKeychainRoundTrip',await store.getItem('kstock-trading-watch-v1')===value);}finally{await store.removeItem('kstock-trading-watch-v1');}check('nativeKeychainTestDataDeleted',await store.getItem('kstock-trading-watch-v1')===null);}else check('existingNativeWatchDataPreserved',true);
  }
  location.hash='stock-analysis';applyResearchScreen();check('stockWorkspace',byId('stock-analysis').classList.contains('screen-active'));
  location.hash='paper-portfolio';applyResearchScreen();
  const seed=KStockPaperBackup.serialize({positions:[{market:'KR',ticker:'005930',currency:'KRW',buy:100,quantity:2,fee:3,tax:2}],cashFlows:[],sales:[],dividends:[],initialCash:1000,fromDate:'2026-09-01',toDate:'2026-09-03'});
  set('paper-backup-text',seed);click('paper-backup-preview');click('paper-backup-apply');
  check('unverifiedQuoteRemainsMissing',paperPositions[0]?.price===null);
  set('paper-flow-date','2026-09-02');set('paper-flow-direction','DEPOSIT');set('paper-flow-amount',100);click('paper-flow-add');
  set('paper-sale-stock','005930');set('paper-sale-date','2026-09-02');set('paper-sale-quantity',1);set('paper-sale-price',110);set('paper-sale-fee',1);set('paper-sale-tax',1);click('paper-sale-add');
  set('paper-dividend-stock','005930');set('paper-dividend-date','2026-09-03');set('paper-dividend-amount',7);click('paper-dividend-add');
  check('fourRecordKinds',paperPositions.length===1&&paperCashFlows.length===1&&paperSales.length===1&&paperDividends.length===1);
  check('backupCreated',exportPaperBackup());const backup=byId('paper-backup-text').value;check('backupNoCredential',!backup.includes('Bearer')&&!backup.includes('token'));
  await loadPaperPerformance();check('officialEvidenceStillPending',byId('paper-performance-message').textContent.includes('보류')&&paperReportSnapshot===null);
  check('noUnverifiedCsv',byId('paper-report-build').disabled);
  click('paper-clear');check('recordsCleared',!hasPaperRecords());set('paper-backup-text',backup);click('paper-backup-preview');check('restorePreview',pendingPaperBackup!==null);click('paper-backup-apply');check('restoreAllFourKinds',paperPositions.length===1&&paperCashFlows.length===1&&paperSales.length===1&&paperDividends.length===1);
  click('paper-clear');check('testRecordsCleaned',!hasPaperRecords());location.hash='trading-today';applyResearchScreen();
  check('noHorizontalOverflow',document.documentElement.scrollWidth<=innerWidth);
  result={status:'PASS',scope:'REAL_PHYSICAL_WEBVIEW_LIVE_AUTH_AND_SAVED_RESEARCH_SYNTHETIC_USER_RECORDS',checks,checkedAt:new Date().toISOString()};
 }catch(error){result={status:'FAIL',checks,error:String(error.message),checkedAt:new Date().toISOString()};}
 window.KStockLiveWorkflow=result;const output=document.createElement('p');output.id='live-workflow-result';output.textContent='운영 기기 검증 '+JSON.stringify(result);document.body.prepend(output);output.scrollIntoView({block:"start"});return result;
})()
