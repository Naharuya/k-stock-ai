import assert from 'node:assert/strict';
import {runDailyCandidateEngine} from './services/candidate_engine_service.js';
import {DailyTradingService} from './services/daily_trading_service.js';
import {DailyCandidateStore} from './services/daily_candidate_store.js';
import {validatePreMarket,loadOvernightDisclosures} from './services/pre_market_validation_service.js';
import {temporaryStoreDirectory,recordFixture,marketFixture} from './daily_test_helpers.js';

const temp=await temporaryStoreDirectory();
const store=new DailyCandidateStore(temp.root);
let now=new Date('2026-09-11T06:40:00Z');
let quotes=0,deep=0;
const rows=Array.from({length:60},(_,i)=>({code:String(i+1).padStart(6,'0'),name:'테스트'+i,exchange:'kospi',
  industryLarge:String(i%8),preScore:75,roe:18,marketCapEok:50000,prevVolume:1000000,sectorRelative:{notes:[]}}));
const dependencies={
  screen:async options=>{assert.equal(options.enrich,0);return {top:rows,scanned:3989,eligible:3000,excludedHardRisk:989};},
  quote:async()=>{quotes++;if(quotes===1)throw new Error('simulated KIS failure');return {price:100000,per:10,pbr:1,tradingValue:80e9,week52High:110000};},
  market:async()=>marketFixture,
  analyze:async options=>{deep++;assert.ok(options.prefetchedQuote);return {analyzedAt:now.toISOString(),completeness:{percent:100},
    committee:{status:'INTEREST',totalScore:80,hardStop:false},dart:{agents:{risk:{riskLevel:'LOW'}}},scores:{},indicators:{values:{roePct:18}}};}
};
try {
  const service=new DailyTradingService({store,now:()=>now,engine:options=>runDailyCandidateEngine(options,dependencies)});
  const run=service.start('after-market');
  assert.throws(()=>service.start('pre-market'),/DAILY_BUSY/);
  const after=await run.completion;
  assert.equal(after.scanned,3989);assert.equal(after.targetTradingDate,'2026-09-14');
  assert.equal(quotes,20);assert.equal(deep,5);
  assert.ok(after.candidates.length>0);
  assert.equal(after.errors[0].stage,'quote');
  assert.equal(after.diagnostics.status,'PARTIAL');
  assert.deepEqual(await store.read('after-market','2026-09-11'),after);
  await assert.rejects(()=>service.start('after-market',{quoteLimit:3989}).completion,/INVALID_DAILY_OPTIONS/);
  assert.deepEqual(await store.read('after-market','2026-09-11'),after,'Failed run must preserve previous snapshot');

  let failedQuoteCalls=0;
  const noQuote=await runDailyCandidateEngine({top:20,candidatePool:60,quoteLimit:20,deepLimit:5,requireQuoteForDeep:true},{
    ...dependencies,quote:async()=>{failedQuoteCalls++;throw new Error('Quote unavailable');},
    analyze:async()=>{throw new Error('Deep must not run without a validated quote');}
  });
  assert.equal(failedQuoteCalls,20);assert.equal(noQuote.pipeline.deepRequested,0);
  assert.equal(noQuote.pipeline.deepFailed,0);assert.equal(noQuote.errors.quote.length,20);
  const fixture=recordFixture();
  now=new Date('2026-09-14T23:30:00+09:00');
  const preOptions={now,market:async()=>marketFixture,news:async()=>({items:[]}),disclosures:async()=>({list:[]})};
  const report=title=>async()=>({list:[{report_nm:title,rcept_no:'1',rcept_dt:'20260914'}]});
  for(const title of ['감사의견 거절 관련 안내','횡령 배임 발생','상장폐지결정']) {
    const result=await validatePreMarket(fixture,{...preOptions,disclosures:report(title)});
    assert.equal(result.candidates[0].status,'EXCLUDED',title);
    assert.equal(result.candidates[0].riskChanges.critical,true);
  }
  for(const title of ['감사보고서제출','주권매매거래정지 (무상증자)','주권매매거래정지 (액면분할)']) {
    const result=await validatePreMarket(fixture,{...preOptions,disclosures:report(title)});
    assert.equal(result.candidates[0].status,'READY',title);
    assert.equal(result.candidates[0].riskChanges.critical,false);
  }
  for(const title of ['유상증자결정','전환사채 발행','신주인수권부사채 발행','교환사채 발행','최대주주 변경','단기차입금증가결정']) {
    const result=await validatePreMarket(fixture,{...preOptions,disclosures:report(title)});
    assert.equal(result.candidates[0].status,'DOWNGRADED',title);
  }
  const partial=await validatePreMarket(fixture,{...preOptions,news:async()=>{throw new Error('private upstream error');}});
  assert.equal(partial.candidates[0].status,'WATCH');assert.equal(partial.candidates[0].currentValidationScore,null);
  assert.equal(partial.errors.length,1);
  const marketFailure=await validatePreMarket(fixture,{...preOptions,market:async()=>{throw new Error('KIS failed');}});
  assert.equal(marketFailure.candidates[0].status,'WATCH');assert.equal(marketFailure.diagnostics.status,'PARTIAL');
  const staleMarket=await validatePreMarket(fixture,{...preOptions,market:async()=>({...marketFixture,kospi:{latestDate:'20260910'}})});
  assert.equal(staleMarket.candidates[0].validationComplete,false);
  const overnight=await validatePreMarket(fixture,{...preOptions,news:async()=>({items:[
    {title:'과거 횡령',publishedAt:'2026-09-11T14:00:00+09:00'},
    {title:'횡령 수사',publishedAt:'2026-09-14T07:00:00+09:00'}]})});
  assert.equal(overnight.candidates[0].newNews.length,1);assert.equal(overnight.candidates[0].status,'RISK');
  const riskOff=await validatePreMarket(fixture,{...preOptions,market:async()=>({...marketFixture,score:{status:'READY',regime:'RISK_OFF'}})});
  assert.equal(riskOff.candidates[0].status,'DOWNGRADED');
  await store.write('after-market',fixture.sourceTradingDate,fixture);
  const preService=new DailyTradingService({store,now:()=>now,preValidator:(source,options)=>validatePreMarket(source,{...preOptions,...options})});
  const before=await preService.start('pre-market').completion;
  assert.equal(before.targetTradingDate,'2026-09-14');
  assert.deepEqual(await preService.today(),before);
  assert.deepEqual(await new DailyCandidateStore(temp.root).read('pre-market','2026-09-14'),before);
  now=new Date('2026-09-15T08:30:00+09:00');
  assert.equal(await preService.today(),null,'Old watchlist must not appear as today');
  await assert.rejects(()=>preService.start('pre-market').completion,/NO_AFTER_MARKET_RESULT/);
  assert.equal(preService.active,null);
  console.log('Daily pipeline: 3,989 scanned / 20 quote attempts / 5 deep validations; partial KIS failure, persistence, pre-market risk semantics, stale/missing data, date rollover and job locking passed');
} finally {await temp.cleanup();}
