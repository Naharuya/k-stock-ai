/* Injected by the isolated fixture server only; never loaded by production index.html. */
(async()=>{
 const checks={};const check=(name,value)=>{checks[name]=!!value;if(!value)throw Error(name);};
 const set=(id,value)=>{byId(id).value=String(value);};
 const click=id=>byId(id).click();
 try{
  location.hash='#paper-portfolio';applyResearchScreen();
  updatePaperOptions({KR:[{market:'KR',ticker:'005930',companyName:'가상 검증 종목',priceSnapshot:{status:'READY',close:120,currency:'KRW',sessionDate:'2026-09-03'}}]});
  set('paper-stock','KR:005930');set('paper-buy',100);set('paper-quantity',2);set('paper-fee',3);set('paper-tax',2);click('paper-add');
  set('paper-from','2026-09-01');set('paper-to','2026-09-03');set('paper-flow-date','2026-09-02');set('paper-flow-direction','DEPOSIT');set('paper-flow-amount',100);click('paper-flow-add');
  set('paper-sale-stock','005930');set('paper-sale-date','2026-09-02');set('paper-sale-quantity',1);set('paper-sale-price',110);set('paper-sale-fee',1);set('paper-sale-tax',1);click('paper-sale-add');
  set('paper-dividend-stock','005930');set('paper-dividend-date','2026-09-03');set('paper-dividend-amount',7);click('paper-dividend-add');
  check('fourKinds',paperPositions.length===1&&paperCashFlows.length===1&&paperSales.length===1&&paperDividends.length===1);
  check('backupExport',exportPaperBackup());const backup=byId('paper-backup-text').value;
  await loadPaperPerformance();check('calculation',byId('paper-performance-results').textContent.includes('순손익 30.00'));
  set('paper-report-kind','daily');const csv=buildPaperReport();check('csv',csv?.includes('가상 배당'));
  beginPaperEdit('position',paperPositions[0]);set('paper-edit-quantity',0.5);click('paper-edit-save');check('oversellError',byId('paper-edit-quantity').getAttribute('aria-invalid')==='true'&&paperPositions[0].quantity===2);
  set('paper-edit-quantity',2);set('paper-edit-buy',90);beginPaperEdit('sale',paperSales[0]);check('draftSwitchGuard',paperEditSession.kind==='position'&&byId('paper-edit-buy').value==='90');
  const originalFetch=window.fetch;let requests=0;window.fetch=(...args)=>{requests++;return originalFetch(...args);};
  try{await loadPaperPerformance();check('dirtyNoRequest',requests===0);}finally{window.fetch=originalFetch;}
  check('dirtyBackupGuard',exportPaperBackup()===false);check('dirtyCsvGuard',buildPaperReport()===null);
  click('paper-edit-save');check('editSaved',paperPositions[0].buy===90&&paperReportSnapshot===null);
  await loadPaperPerformance();check('recalculated',byId('paper-performance-results').textContent.includes('순손익 50.00'));
  set('paper-backup-text',backup);click('paper-backup-preview');check('backupComparison',byId('paper-backup-comparison').textContent.includes('185 → 205'));
  click('paper-backup-cancel');check('backupCancel',paperPositions[0].buy===90&&pendingPaperBackup===null);
  click('paper-backup-preview');click('paper-backup-apply');check('backupRestored',paperPositions[0].buy===100&&paperSales.length===1);
  await loadPaperPerformance();check('restoredCalculation',byId('paper-performance-results').textContent.includes('순손익 30.00'));
  set('paper-record-kind','sale');byId('paper-record-kind').dispatchEvent(new Event('change'));check('kindFilter',visiblePaperRecords('sale',paperSales).length===1&&visiblePaperRecords('position',paperPositions).length===0);
  set('paper-record-from','2026-09-03');set('paper-record-to','2026-09-03');byId('paper-record-from').dispatchEvent(new Event('input'));check('dateFilter',visiblePaperRecords('sale',paperSales).length===0);
  resetPaperRecordFilter();
  for(let i=0;i<45;i++)paperCashFlows.push({id:'qa-'+i,date:i<20?'2026-09-01':'2026-09-03',timing:'BEFORE_OPEN',amount:1});invalidatePaperPerformance();renderPaperLedgers();
  check('boundedPage',byId('paper-flow-results').querySelectorAll('article').length===20);
  byId('paper-flow-results').lastElementChild.querySelectorAll('button')[1].click();check('nextPage',paperRecordPages.flow===1);
  set('paper-record-order','newest');byId('paper-record-order').dispatchEvent(new Event('change'));check('dateSort',paperRecordPages.flow===0&&pagedPaperRecords('flow',paperCashFlows)[0].date==='2026-09-03');
  check('allPagesSummary',byId('paper-record-summary').textContent.includes('입금 145 KRW'));
  const item=pagedPaperRecords('flow',paperCashFlows)[0];deletePaperRecord('flow',item);check('deleted',paperCashFlows.length===45);click('paper-delete-undo');check('undo',paperCashFlows.length===46&&paperCashFlows.some(f=>f.id===item.id));
  resetPaperRecordFilter();check('noOverflow',document.documentElement.scrollWidth<=innerWidth);
  click('paper-clear');check('cleared',!hasPaperRecords()&&paperEditSession===null&&paperReportSnapshot===null);
  window.KStockPaperMobileQAResult={status:'PASS',checks,scope:'PROGRAMMATIC_REAL_WEBVIEW_SYNTHETIC_DATA',checkedAt:new Date().toISOString()};
 }catch(error){window.KStockPaperMobileQAResult={status:'FAIL',checks,error:String(error.message),scope:'PROGRAMMATIC_REAL_WEBVIEW_SYNTHETIC_DATA',checkedAt:new Date().toISOString()};}
 const output=document.createElement('p');output.id='paper-mobile-qa-result';output.textContent='통합 검증 '+JSON.stringify(window.KStockPaperMobileQAResult);byId('paper-title').after(output);output.scrollIntoView({block:'center'});
})();
