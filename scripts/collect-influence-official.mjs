// Explicit, bounded read-only collection. This script is never scheduled externally.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const directory='data/v2/influence';
const file=directory+'/sources.json';
const checkedAt=new Date().toISOString();
const specs=[
 {personId:'jerome-powell',name:'제롬 파월',role:'연준 의장 (2025-08-22 당시)',organization:'Federal Reserve',country:'US',influenceCategory:'CENTRAL_BANK',date:'2025-08-22',sourceType:'OFFICIAL_SPEECH',sourceUrl:'https://www.federalreserve.gov/newsevents/speech/powell20250822a.htm',documentId:'powell20250822a',title:'통화정책과 연준 정책체계 검토',summary:'고용과 물가 위험의 균형 및 정책체계 변경을 설명한 공식 연설입니다.',relatedCompanies:[],relatedIndustries:['통화정책','금융'],reviewMethod:'OFFICIAL_HTML_MARKERS'},
 {personId:'warren-buffett',name:'워런 버핏',role:'이사회 의장 (2025-02-22 당시)',organization:'Berkshire Hathaway',country:'US',influenceCategory:'PROFESSIONAL_INVESTOR',date:'2025-02-22',sourceType:'SHAREHOLDER_LETTER',sourceUrl:'https://www.berkshirehathaway.com/letters/2024ltr.pdf',documentId:'berkshire-2024-shareholder-letter',title:'2024년 버크셔 주주서한',summary:'기업 소유와 자본 배분의 원칙을 설명한 주주서한입니다. 특정 날짜의 개인 거래를 뜻하지 않습니다.',relatedCompanies:['AAPL','BRK'],relatedIndustries:['자본 배분','보험'],reviewMethod:'MANUAL_OFFICIAL_PDF_REVIEW'}
];
let previous;try{previous=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
const sources=[];let externalRequests=0;
for(const spec of specs){
 const cached=previous?.sources?.find(x=>x.sourceUrl===spec.sourceUrl);
 if(cached&&Date.now()-Date.parse(cached.checkedAt)<24*3600000){sources.push(cached);continue;}
 externalRequests++;
 const response=await fetch(spec.sourceUrl,{headers:{'User-Agent':'K-Stock AI public source research'},redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error('OFFICIAL_SOURCE_HTTP_'+response.status);
 const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>2000000)throw new Error('SOURCE_TOO_LARGE');
 if(spec.sourceType==='OFFICIAL_SPEECH'&&!['August 22, 2025','Chair Jerome H. Powell','Monetary Policy'].every(x=>bytes.toString('utf8').includes(x)))throw new Error('OFFICIAL_IDENTITY_MARKERS_MISSING');
 if(spec.sourceType==='SHAREHOLDER_LETTER'&&!bytes.subarray(0,5).equals(Buffer.from('%PDF-')))throw new Error('OFFICIAL_PDF_UNAVAILABLE');
 // Full copyrighted originals are referenced, never persisted or served by this collector.
 sources.push({...spec,checkedAt,sourceHash:createHash('sha256').update(bytes).digest('hex'),sourceIntegrity:true,officialSource:true,publishedAt:spec.date+(spec.sourceType==='OFFICIAL_SPEECH'?'T23:59:59-04:00':'T23:59:59-05:00'),publicationTimePrecision:'DAY',publicationAssumption:'CONSERVATIVE_END_OF_DAY',originalTextReference:spec.sourceUrl+(spec.sourceType==='SHAREHOLDER_LETTER'?'#page=13':'')});
}
await mkdir(directory,{recursive:true});await writeFile(file,JSON.stringify({schemaVersion:1,checkedAt:externalRequests?checkedAt:previous?.checkedAt||checkedAt,lastRunAt:checkedAt,externalRequests,sources},null,2),{mode:0o600});
console.log(JSON.stringify({officialSources:sources.length,externalRequests,fullOriginalsStored:false}));
