import{readFile,readdir,writeFile}from'node:fs/promises';import{createHash}from'node:crypto';
import{verifyEntitlementEvent}from'../src/v2/entitlement_events.js';import{reconcileEventSources}from'../src/v2/disclosure_review.js';import{runCandidateJob}from'../src/v2/run_candidates.js';
import path from 'node:path';import {fileURLToPath} from 'node:url';
if(path.resolve(process.cwd())!==path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'))throw new Error('PROJECT_PATH_REQUIRED');
if(process.argv[2]!=='--saved-source'||process.argv.length!==3)throw new Error('SAVED_SOURCE_ONLY');
const dir='data/v2/verification',names=await readdir(dir),latest=prefix=>names.filter(x=>x.startsWith(prefix)).sort().at(-1),now=new Date().toISOString();
const input=JSON.parse(await readFile(`${dir}/${latest('source-review-q3-input-')}`));
const scope=JSON.parse(await readFile(`${dir}/${latest('kind-scope-')}`)),prior=JSON.parse(await readFile(`${dir}/${latest('kind-prior-')}`));
const bodyManifest=JSON.parse(await readFile(`${dir}/${latest('kind-actions-')}/body-manifest.json`));
const stock=input.companies.find(x=>x.ticker==='005930'),snapshot=stock.krSnapshot;
const q3=snapshot.entitlementEvents.find(x=>x.recordDate==='2026-09-30');if(!q3||!scope.notice.exDateVerified)throw new Error('Q3_SOURCE_REQUIRED');
const sourceRefs=[{sourceDocumentId:q3.sourceDocumentId,sourceUrl:q3.sourceUrl,sourceVerified:true,recordDate:q3.recordDate},{...scope.notice}];
snapshot.entitlementEvents=snapshot.entitlementEvents.map(x=>x===q3?reconcileEventSources(verifyEntitlementEvent({...x,exDate:scope.notice.exDate,exDateVerified:true,sourceReferences:sourceRefs},now),sourceRefs):x);
const treasury=[];
for(const [acceptanceId,eventType,date,quantity] of [['20260710000843','TREASURY_DISPOSE','2026-07-08',1083434],['20260716000982','TREASURY_DISPOSE','2026-07-13',1132477],['20260821000785','TREASURY_ACQUIRE',null,null]]){
 const doc=bodyManifest.documents.find(x=>x.acceptanceId===acceptanceId);if(!doc)throw new Error('BODY_REQUIRED');
 const html=await readFile(doc.bodyFile,'utf8');if(createHash('sha256').update(html).digest('hex')!==doc.bodyDigest)throw new Error('SOURCE_DIGEST_MISMATCH');
 const text=html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ');
 if(!text.includes('삼성전자'))throw new Error('SOURCE_COMPANY_MISMATCH');
 const common={stockCode:'005930',shareClass:'COMMON',eventType,announcementDate:doc.announcementDate,effectiveDate:date,quantity,sourceVerified:true,source:'KRX KIND',sourceUrl:doc.bodySourceUrl,sourceDocumentId:doc.documentId,sourceDigest:doc.bodyDigest,availableAt:`${doc.announcementDate}T23:59:59+09:00`,collectedAt:now};
 if(date){const korean=`${date.slice(0,4)}년 ${date.slice(5,7)}월 ${date.slice(8,10)}일`;if(!text.includes(korean)||!text.includes(quantity.toLocaleString('en-US'))||!text.includes('처분주식 총수'))throw new Error('EXECUTION_SOURCE_MISMATCH');treasury.push(verifyEntitlementEvent({...common,executionStatus:'EXECUTED'},now));}
 else{if(!['53,285,968','2026년 08월 24일','2026년 11월 21일','취득예정주식'].every(x=>text.includes(x)))throw new Error('PLAN_SOURCE_MISMATCH');treasury.push(verifyEntitlementEvent({...common,executionStatus:'PLANNED',plannedQuantity:53285968,plannedFromDate:'2026-08-24',plannedToDate:'2026-11-21'},now));}
}
if(82086705-1083434-1132477!==79870794)throw new Error('TREASURY_RECONCILIATION');
const sessions=snapshot.priceHistory.sessions,fromDate=sessions[0].date,toDate=sessions.at(-1).date;
const benchmarks=JSON.parse(await readFile('data/v2/benchmarks/latest.json'));
const alignment=benchmarks.indices.map(x=>({index:x.index,dateArraysEqual:JSON.stringify(sessions.map(s=>s.date))===JSON.stringify(x.sessions.filter(s=>s.date>=fromDate&&s.date<=toDate).map(s=>s.date))}));
const preceding=sessions.filter(x=>x.date<scope.notice.exDate).at(-1);
snapshot.rightsInvestigation={fromDate,toDate,exDate:scope.notice.exDate,exDateVerified:true,listingCount:scope.listing.items.length,source:'KRX KIND',coverageVerified:false,
 priorScope:{...prior.scope,documents:prior.items.length,listingComplete:prior.listingComplete},
 rawPriceCheck:{date:preceding?.date,close:preceding?.close,basePrice:scope.notice.basePrice,matched:preceding?.close===scope.notice.basePrice,priceType:'RAW_PRICE',adjustmentMethod:scope.notice.adjustmentMethod,adjustedPriceVerified:false},
 calendarAlignment:{fromDate,toDate,sessionCount:sessions.length,indices:alignment,holidayCalendarVerified:false},
 treasuryEvents:treasury,references:[{label:'보통주 배당락 적용일',sourceUrl:scope.notice.sourceUrl,sourceDocumentId:scope.notice.sourceDocumentId},...bodyManifest.documents.map(d=>({label:d.title,sourceUrl:d.bodySourceUrl,sourceDocumentId:d.documentId}))],
 typeStatuses:[{label:'현금배당',reason:'9/29 배당락일 확인됨 · Q3 배당금·지급일 미확인'},{label:'주식배당·분할·병합·증자·권리락',reason:'조회 목록에 관련 결의 제목 없음 · 유형별 전수 검증 대기'},{label:'자기주식 처분',reason:'7/8 1,083,434주·7/13 1,132,477주 실행 보고 확인 · 관측 시작 이전'},{label:'자기주식 취득',reason:'8/24~11/21 취득 계획 확인 · 실제 취득량·일별 적용 자료 미확인'},{label:'소각·발행주식수·액면 변경',reason:'구간 전체 적용 근거 검증 대기 · 자기주식 취득을 소각으로 처리하지 않음'}],
 verifiedPerformancePeriod:null,performanceStatus:'PERFORMANCE_BLOCKED',benchmarkStatus:'BENCHMARK_BLOCKED',reviewedAt:now};
const file=`${dir}/kind-investigation-input-${Date.now()}.json`;await writeFile(file,JSON.stringify(input),{flag:'wx',mode:0o600});await runCandidateJob({inputPath:file,outputPath:'data/v2/latest.json'});
console.log(JSON.stringify({exDate:scope.notice.exDate,treasuryVerified:treasury.filter(x=>x.verificationStatus==='VERIFIED').length,treasuryPending:treasury.filter(x=>x.verificationStatus!=='VERIFIED').length,rawPriceMatched:snapshot.rightsInvestigation.rawPriceCheck.matched,calendarAlignment:alignment,performance:'PERFORMANCE_BLOCKED'}));
