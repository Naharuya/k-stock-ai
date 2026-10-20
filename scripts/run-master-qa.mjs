import {spawnSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseExecutedTestResult} from '../src/v2/qa_test_result.js';
import {assertSafeKStockV2Environment} from '../src/v2/scoring.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
assertSafeKStockV2Environment(process.env);
const startedAt=new Date().toISOString(),cycleId='master-qa-'+startedAt.replace(/[^0-9]/g,'');
const git=(...args)=>{const p=spawnSync('git',args,{cwd:root,encoding:'utf8',timeout:5000});if(p.status!==0)throw Error('QA_REPOSITORY_IDENTITY_UNAVAILABLE');return p.stdout.trim();};
const suites=[['regression',['scripts/test-offline.js']],['androidContract',['--test','test/android_external.test.js']]];
const results={};
const testEnvironment=Object.fromEntries(Object.entries(process.env).filter(([key])=>!/(?:KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL|AUTHORIZATION)/i.test(key)));
for(const [name,args] of suites){const p=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',timeout:180000,maxBuffer:12*1024*1024,env:{...testEnvironment,KSTOCK_BROKER_ENABLED:'false',KSTOCK_LIVE_TRADING_ENABLED:'false',KSTOCK_RESEARCH_COLLECTION_ENABLED:'false'}});results[name]=parseExecutedTestResult({status:p.status,signal:p.signal,output:(p.stdout||'')+'\n'+(p.stderr||'')});console.log(JSON.stringify({suite:name,...results[name]}));}
const report={schemaVersion:1,cycleId,startedAt,finishedAt:new Date().toISOString(),timezone:'Asia/Seoul',branch:git('branch','--show-current'),commit:git('rev-parse','HEAD'),kind:'EXECUTED_OFFLINE_QA',commands:{regression:'node scripts/test-offline.js',androidContract:'node --test test/android_external.test.js'},results,externalCollectionInTestProcesses:false,parentSecretEnvironmentInherited:false,brokerEnabled:false,liveTradingEnabled:false,recommendationStatus:'HOLD',realOrderCalls:null,orderEvidence:'NO_ORDER_CALLS_CLAIMED_BY_TEST_RESULT_PARSER',notRun:[...Object.entries(results).filter(([,r])=>r.totals.skipped>0).map(([name,r])=>name+':'+r.totals.skipped+'_SKIPPED_TESTS_NOT_RUN'),'OFFICIAL_SOURCE_LIVE_VALIDATION','GALAXY_A33_PHYSICAL_QA','OS_REBOOT_RECOVERY','STRATEGY_OUT_OF_SAMPLE_VALIDATION'],overall:Object.values(results).every(r=>r.status==='TESTED_PASS')?'TESTED_PASS':Object.values(results).some(r=>r.status==='TESTED_FAIL')?'TESTED_FAIL':'TESTED_PARTIAL'};
const destination=path.join(root,'data/v2/verification/master-qa',cycleId+'.json');await mkdir(path.dirname(destination),{recursive:true});await writeFile(destination,JSON.stringify(report,null,2),{mode:0o600,flag:'wx'});console.log(JSON.stringify({report:destination,overall:report.overall}));if(report.overall!=='TESTED_PASS')process.exitCode=1;
