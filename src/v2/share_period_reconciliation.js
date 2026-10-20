import {validDay} from './accounting_periods.js';
// Arithmetic reconciliation of a reported period. It does not establish dated
// corporate actions, complete movement coverage, or price-date outstanding shares.
export function reconcileReportedSharePeriod({capitalShareRecords=[],flow}={}){
 const reasons=[],from=flow?.periodStart,to=flow?.periodEnd;
 const prior=validDay(from)?new Date(Date.parse(from)-86400000).toISOString().slice(0,10):null;
 if(!validDay(from)||!validDay(to)||from>to||flow?.type!=='REPURCHASED_AND_RETIRED'||flow?.unit!=='SHARES'||!Number.isSafeInteger(flow?.value)||flow.value<0)reasons.push('REPORTED_SHARE_FLOW_REQUIRED');
 if(!/^\d{10}-\d{2}-\d{6}$/.test(flow?.documentId||'')||!/^https:\/\/www\.sec\.gov\/Archives\/edgar\/data\/\d+\//.test(flow?.sourceUrl||'')||!/^[a-f\d]{64}$/.test(flow?.sourceHash||''))reasons.push('SOURCE_PROOF_REQUIRED');
 const sourceMatch=/^https:\/\/www\.sec\.gov\/Archives\/edgar\/data\/(\d+)\/(\d{18})\/[^/?#]+$/.exec(flow?.sourceUrl||'');
 if(!sourceMatch||sourceMatch[2]!==flow?.documentId?.replaceAll('-',''))reasons.push('SOURCE_DOCUMENT_IDENTITY_MISMATCH');
 const rows=capitalShareRecords.filter(r=>r.definition==='ISSUED'&&r.shareClass==='COMMON_TAG_SCOPE_NOT_ALL_CLASSES'&&r.unit==='SHARES'&&r.documentId===flow?.documentId&&r.sourceHash===flow?.sourceHash&&r.sourceUrl===flow?.sourceUrl&&Number.isSafeInteger(r.count)&&r.count>0);
 const select=day=>{const list=rows.filter(r=>r.asOfDate===day);return list.length&&new Set(list.map(r=>r.count)).size===1?list[0]:null;};
 const start=select(prior),end=select(to);
 if(!start||!end)reasons.push('SAME_SOURCE_PERIOD_BOUNDARIES_REQUIRED');
 let valid=reasons.length===0;
 let delta=valid?end.count-start.count:null,residual=valid?delta+flow.value:null;
 if(valid&&(!Number.isSafeInteger(delta)||!Number.isSafeInteger(residual))){reasons.push('SHARE_ARITHMETIC_OUT_OF_SAFE_RANGE');valid=false;delta=null;residual=null;}
 return {status:valid?'REVIEW_REQUIRED':'INSUFFICIENT_DATA',periodStart:from||null,periodEnd:to||null,baselineDate:prior,startIssuedShares:valid?start.count:null,endIssuedShares:valid?end.count:null,observedNetChange:delta,reportedRepurchasedRetiredShares:valid?flow.value:null,unexplainedNetOtherChanges:residual,reportedPrecision:valid?{start:start.reportedDecimals??null,end:end.reportedDecimals??null,flow:flow.reportedDecimals??null}:null,reasons:valid?[residual===0?'MOVEMENT_COVERAGE_AND_EFFECTIVE_DATES_UNVERIFIED':'OTHER_MOVEMENTS_REQUIRE_OFFICIAL_EVIDENCE']:reasons,sourceUrl:flow?.sourceUrl||null,sourceHash:flow?.sourceHash||null,documentId:flow?.documentId||null,exactReconciliationVerified:false,bridgeEligible:false,marketCap:null};
}
