import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseKindListing,verifyKindDividendNotice} from '../src/v2/kind_rights.js';
import path from 'node:path';import {fileURLToPath} from 'node:url';
if(path.resolve(process.cwd())!==path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'))throw new Error('PROJECT_PATH_REQUIRED');
if(process.argv[2]!=='--saved-source'||process.argv.length!==3)throw new Error('SAVED_SOURCE_ONLY');
const dir='data/v2/verification',collectedAt=new Date().toISOString();
const listingHtml=await readFile('/tmp/kstock-kind-period.html','utf8');
const listing=parseKindListing(listingHtml,{fromDate:'2026-08-26',toDate:'2026-10-08'});
const listingItem=listing.items.find(x=>x.documentId==='20260928000389');
const raw=await readFile('/tmp/kstock-kind-common-exdate.html');
let html;try{html=new TextDecoder('utf-8',{fatal:true}).decode(raw);}catch{html=new TextDecoder('euc-kr',{fatal:true}).decode(raw);}
const notice=verifyKindDividendNotice(html,{listingItem,documentId:'20260928001095',sourceUrl:'https://kind.krx.co.kr/external/2026/09/28/000389/20260928001095/99335.htm',collectedAt,sourceDigest:createHash('sha256').update(raw).digest('hex')});
if(!listing.listingComplete||!notice.exDateVerified)throw new Error('KIND_SOURCE_VALIDATION_FAILED');
await mkdir(dir,{recursive:true,mode:0o700});
const stamp=Date.now();await writeFile(`${dir}/kind-common-exdate-${stamp}.html`,raw,{mode:0o600,flag:'wx'});
await writeFile(`${dir}/kind-scope-${stamp}.json`,JSON.stringify({collectedAt,source:'KRX KIND public detail search',listing,listingDigest:createHash('sha256').update(listingHtml).digest('hex'),notice,economicCoverageVerified:false}),{mode:0o600,flag:'wx'});
console.log(JSON.stringify({documents:listing.items.length,listingComplete:listing.listingComplete,exDate:notice.exDate,exDateVerified:notice.exDateVerified,totalReturnEligible:false}));
