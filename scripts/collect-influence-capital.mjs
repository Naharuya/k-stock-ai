// Explicit bounded official reading; neither server nor scheduler invokes this collector.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import dotenv from 'dotenv';
import {createSecRequest} from '../src/services/leader_disclosures.js';
import {parseInstitutionHolding,parseCapitalCover} from '../src/v2/sec_capital_evidence.js';
import {assertSafeKStockV2Environment} from '../src/v2/scoring.js';
const env={...dotenv.parse(await readFile('.env','utf8')),...process.env};assertSafeKStockV2Environment(env);
if(!/^.{3,}\s+[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.KSTOCK_SEC_USER_AGENT||''))throw Error('SEC_USER_AGENT_REQUIRED');
const file='data/v2/influence/capital-sec.json',checkedAt=new Date().toISOString();
let previous;try{previous=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
if(previous?.schemaVersion===1&&Date.now()-Date.parse(previous.checkedAt)<24*3600000){console.log(JSON.stringify({cached:true,externalRequests:0,filings:previous.filings.length}));process.exit(0);}
let externalRequests=0;
const request=createSecRequest({userAgent:env.KSTOCK_SEC_USER_AGENT});
async function get(url,accept){if(++externalRequests>13)throw Error('SEC_READ_LIMIT');if(!/^https:\/\/(?:www|data)\.sec\.gov\//.test(url))throw Error('SEC_SOURCE_NOT_ALLOWED');const r=await request(url,accept);const bytes=Buffer.from(await r.arrayBuffer());if(bytes.length>2000000)throw Error('SEC_DOCUMENT_TOO_LARGE');return {text:bytes.toString(),sourceHash:createHash('sha256').update(bytes).digest('hex'),sourceUrl:url,officialSource:true,sourceIntegrity:true};}
const specs=[['0000950123-25-002701','39042.xml'],['0000950123-25-005701','form13fInfoTable.xml'],['0000950123-25-008343','43977.xml'],['0000950123-25-008361','43981.xml']];
const submissions=await get('https://data.sec.gov/submissions/CIK0001067983.json','application/json');
const recent=JSON.parse(submissions.text)?.filings?.recent;if(!Array.isArray(recent?.accessionNumber))throw Error('SEC_SUBMISSIONS_INVALID');
const filings=[];
for(const [accessionNumber,tableName]of specs){
 const pos=recent.accessionNumber.indexOf(accessionNumber);if(pos<0)throw Error('SEC_HISTORY_COVERAGE_INCOMPLETE');
 const base=`https://www.sec.gov/Archives/edgar/data/1067983/${accessionNumber.replaceAll('-','')}`;
 const index=await get(`${base}/${accessionNumber}-index.htm`,'text/html');
 const accepted=/Accepted[\s\S]*?(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/.exec(index.text);
 if(!accepted||!index.text.includes('BERKSHIRE HATHAWAY INC')||!index.text.includes(tableName))throw Error('SEC_INDEX_IDENTITY_INVALID');
 const coverRaw=await get(`${base}/primary_doc.xml`,'application/xml');const cover=parseCapitalCover(coverRaw.text);
 if(cover.reportingPeriod!==recent.reportDate[pos]||cover.form!==recent.form[pos])throw Error('SEC_INDEX_PERIOD_MISMATCH');
 const table=await get(`${base}/${tableName}`,'application/xml');const holding=parseInstitutionHolding(table.text);
 const day=accepted[1],offset=day<'2025-03-09'?'-05:00':'-04:00';
 filings.push({...cover,...holding,accessionNumber,filingDate:recent.filingDate[pos],acceptedAt:`${day}T${accepted[2]}${offset}`,publicAvailableAt:`${day}T23:59:59${offset}`,publicationTimePrecision:'DAY',publicationAssumption:'CONSERVATIVE_END_OF_DAY',firstPublicAvailabilityVerified:false,tradeableFrom:null,source:'SEC EDGAR',sourceUrl:table.sourceUrl,sourceHash:table.sourceHash,documentId:accessionNumber,officialSource:true,sourceIntegrity:true,indexEvidence:{sourceUrl:index.sourceUrl,sourceHash:index.sourceHash},coverEvidence:{sourceUrl:coverRaw.sourceUrl,sourceHash:coverRaw.sourceHash},transactionDate:null,price:null,currency:'USD',securityId:'AAPL:COMMON',companyId:'AAPL',correctionReference:cover.isAmendment?'0000950123-25-005701':null});
}
const amendments=recent.accessionNumber.map((accessionNumber,i)=>({accessionNumber,form:recent.form[i],reportingPeriod:recent.reportDate[i],filingDate:recent.filingDate[i]})).filter(x=>['13F-HR','13F-HR/A'].includes(x.form)&&x.filingDate>='2025-01-01'&&x.filingDate<='2025-08-15');
await mkdir('data/v2/influence',{recursive:true});
await writeFile(file,JSON.stringify({schemaVersion:1,checkedAt,collectionMode:'MANUAL_OFFICIAL_READ_ONLY',externalRequests,historyWindow:{from:'2025-01-01',through:'2025-08-15',coverage:'RECENT_SUBMISSIONS_WINDOW',amendments},submissionsEvidence:{sourceUrl:submissions.sourceUrl,sourceHash:submissions.sourceHash},selectionPolicy:'All four Berkshire13F filing versions in the fixed publication window; AAPL common stock only. Includes unchanged and decreasing reports, not return-selected.',filings},null,2),{mode:0o600});
console.log(JSON.stringify({externalRequests,filings:filings.length,holdings:filings.map(x=>({period:x.reportingPeriod,form:x.form,quantity:x.quantity,amendmentType:x.amendmentType}))}));
