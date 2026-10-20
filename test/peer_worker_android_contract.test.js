import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
test('Android bridge reads worker status through authenticated native transport without browser token exposure',async()=>{
 const script=await readFile('android/assets/native-fetch.js','utf8'),calls=[];
 const status={schemaVersion:1,worker:{running:false},scheduler:{enabled:true,mode:'SAVED_EVIDENCE_ONLY'},counts:{total:6,BLOCKED:3,PARTIAL:3},metricEligibility:{PER:0,PBR:0,PSR:0,EV_EBITDA:0},jobs:[{ticker:'000990',disclosureReview:{summary:{total:14,relevant:10,originalEffectVerified:0},queue:[{documentId:'20260511800809',classification:'POTENTIAL_IMPACT',state:'PARTIAL',period:'PRIOR_ANNOUNCEMENT',eligibleForValuation:false}]},shareBridge:{issuanceChain:{verificationStatus:'VERIFIED',paymentDate:'2026-07-14',effectiveDate:'2026-07-15',listingDate:'2026-07-29',quantity:17790000,availableAt:'2026-07-24T23:59:59+09:00',documents:[{role:'LISTING',documentId:'20260724000273',sourceUrl:'https://kind.krx.co.kr/external/fixture.htm'}]},valuationDate:'2026-10-08',baselineDate:'2026-06-30',verificationStatus:'SHARE_COUNT_UNVERIFIED',october8IssuedShares:null,marketCap:null,checkpoints:[{asOfDate:'2026-10-01',disclosureDate:'2026-10-07',votingIssuedShares:43504588,status:'OFFICIAL_VOTING_SCOPE_OBSERVED_NOT_ALL_ISSUED'}]},pbrValidation:{verificationStatus:'INSUFFICIENT_DATA',value:null,eligible:false,inputs:{bookValue:{value:2393709284799,currency:'KRW',unit:'KRW',asOfDate:'2026-06-30',consolidationType:'CFS',sourceUrl:'https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260814003091',verificationStatus:'SOURCE_ACCOUNT_IDENTIFIED'}}}}]};
 const window={fetch:async()=>{throw Error('Unexpected browser transport');}};
 window.KStockNative={request(id,url,method,body){calls.push({url,method,body});queueMicrotask(()=>window.__kstockReply(id,Buffer.from(JSON.stringify({code:200,type:'application/json',body:JSON.stringify(status)})).toString('base64')));}};
 runInNewContext(script,{window,location:{href:'https://kstock.ai.kr/',origin:'https://kstock.ai.kr'},Request,Response,URL,Map,Uint8Array,TextDecoder,atob,setTimeout,clearTimeout,TypeError});
 const r=await window.fetch('/api/v2/peer-validation/status');assert.deepEqual(await r.json(),status);assert.equal(calls.length,1);assert.equal(calls[0].method,'GET');assert.equal(calls[0].url,'/api/v2/peer-validation/status');assert.equal(Object.hasOwn(calls[0],'token'),false);
});

test('Android collection status preserves replay mode and explicit external collection disabled',async()=>{
 const script=await readFile('android/assets/native-fetch.js','utf8'),calls=[];
 const status={success:true,schemaVersion:1,enabled:false,mode:'SAVED_SOURCE_REPLAY',counts:{total:6,success:3,PARTIAL:6},sources:[{name:'KRX',status:'AUTH_BLOCKED'}],jobs:[]};
 const window={fetch:async()=>{throw Error('Unexpected browser transport');}};
 window.KStockNative={request(id,url,method,body){calls.push({url,method,body});queueMicrotask(()=>window.__kstockReply(id,Buffer.from(JSON.stringify({code:200,type:'application/json',body:JSON.stringify(status)})).toString('base64')));}};
 runInNewContext(script,{window,location:{href:'https://kstock.ai.kr/',origin:'https://kstock.ai.kr'},Request,Response,URL,Map,Uint8Array,TextDecoder,atob,setTimeout,clearTimeout,TypeError});
 const d=await (await window.fetch('/api/v2/data-collection/status')).json();assert.equal(d.enabled,false);assert.equal(d.mode,'SAVED_SOURCE_REPLAY');assert.equal(d.sources[0].status,'AUTH_BLOCKED');assert.equal(calls[0].method,'GET');assert.equal(calls[0].url,'/api/v2/data-collection/status');
});
