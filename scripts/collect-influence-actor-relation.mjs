import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import dotenv from 'dotenv';
import {createSecRequest} from '../src/services/leader_disclosures.js';
import {assertSafeKStockV2Environment} from '../src/v2/scoring.js';
const env={...dotenv.parse(await readFile('.env','utf8')),...process.env};assertSafeKStockV2Environment(env);
const file='data/v2/influence/actor-relations.json',checkedAt=new Date().toISOString();
let cached;try{cached=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
if(cached?.schemaVersion===1&&Date.now()-Date.parse(cached.checkedAt)<24*3600000){console.log(JSON.stringify({cached:true,externalRequests:0}));process.exit(0);}
const request=createSecRequest({userAgent:env.KSTOCK_SEC_USER_AGENT});
const base='https://www.sec.gov/Archives/edgar/data/1067983/000119312525054877';
const sources=[];
for(const name of ['0001193125-25-054877-index.htm','d812428ddef14a.htm']){
 const sourceUrl=base+'/'+name,r=await request(sourceUrl,'text/html');const b=Buffer.from(await r.arrayBuffer());if(b.length>2000000)throw Error('ROLE_SOURCE_TOO_LARGE');sources.push({sourceUrl,sourceHash:createHash('sha256').update(b).digest('hex'),text:b.toString()});
}
const [index,body]=sources,accepted=/Accepted[\s\S]*?(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/.exec(index.text);
const text=body.text.replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ');
if(!accepted||accepted[1]!=='2025-03-14'||!text.includes('Chief Executive Officer since 1970')||!text.includes('WARREN E. BUFFETT'))throw Error('HISTORICAL_ACTOR_ROLE_UNVERIFIED');
const relation={relationshipId:'buffett-berkshire-2025-proxy',personId:'warren-buffett',institutionId:'sec:0001067983',role:'이사회 의장·최고경영자 (2025년 위임장 당시)',validFrom:'1970-12-31',validTo:'2025-03-14',roleStartYear:1970,roleStartPrecision:'YEAR',roleStartAssumption:'CONSERVATIVE_YEAR_END',periodScope:'DOCUMENT_AS_OF_DATE_ONLY',publicAvailableAt:'2025-03-14T23:59:59-04:00',acceptedAt:`${accepted[1]}T${accepted[2]}-04:00`,publicationTimePrecision:'DAY',sourceUrl:body.sourceUrl,sourceHash:body.sourceHash,documentId:'0001193125-25-054877',sourceIntegrity:true,officialSource:true,personalTransaction:false,individualInvestmentDecisionVerified:false,indexEvidence:{sourceUrl:index.sourceUrl,sourceHash:index.sourceHash},limitations:['공식 직책 관계는 기관의 개별 매매를 버핏 개인이 지시했다는 근거가 아닙니다.','이 문서 이후 역할 유지 기간은 추정하지 않습니다.']};
await writeFile(file,JSON.stringify({schemaVersion:1,checkedAt,externalRequests:2,relations:[relation]},null,2),{mode:0o600});console.log(JSON.stringify({externalRequests:2,relations:1,validThrough:relation.validTo,personalTransaction:false}));
