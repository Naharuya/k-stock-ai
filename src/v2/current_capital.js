import {isReviewedAmendment} from './current_correction.js';
import {currentCompany} from './current_universe.js';
import {normalizeForm4} from './sec_form4_refresh.js';
import {validateCapitalEvent} from './influence_engine.js';
import {createHash} from 'node:crypto';
const day=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
export function selectCurrentForm4(metadata,asOf,{limit=2,days=30,completedIds=[],ticker='AAPL',correctionReviews=[]}={}){
 const company=currentCompany(ticker);
 const issuerName=String(metadata?.name||'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
 if(Number(metadata?.cik)!==Number(company.cik)||!issuerName.startsWith(company.issuerName))throw Error('CURRENT_ISSUER_MISMATCH');
 if(!Number.isFinite(Date.parse(asOf))||!Number.isInteger(limit)||limit<1||limit>2||days!==30)throw Error('CURRENT_COLLECTION_SCOPE_INVALID');
 const r=metadata.filings?.recent;
 if(!Array.isArray(r?.accessionNumber)||!['filingDate','form','primaryDocument'].every(k=>Array.isArray(r[k])&&r[k].length===r.accessionNumber.length))throw Error('CURRENT_SUBMISSIONS_INVALID');
 const start=new Date(Date.parse(asOf)-days*86400000).toISOString().slice(0,10),end=asOf.slice(0,10);
 const rows=r.accessionNumber.map((accessionNumber,i)=>({accessionNumber,filingDate:r.filingDate[i],form:r.form[i],primaryDocument:r.primaryDocument[i]})).filter(x=>['4','4/A'].includes(x.form)&&day(x.filingDate)&&x.filingDate>=start&&x.filingDate<=end);
 const unique=new Map();for(const x of rows){if(!/^\d{10}-\d{2}-\d{6}$/.test(x.accessionNumber)||!/^(?:xsl[A-Za-z0-9]+\/)?[\w.-]+\.xml$/.test(x.primaryDocument))throw Error('CURRENT_DOCUMENT_PATH_INVALID');if(unique.has(x.accessionNumber)&&JSON.stringify(unique.get(x.accessionNumber))!==JSON.stringify(x))throw Error('CURRENT_METADATA_CONFLICT');unique.set(x.accessionNumber,x);}
 const all=[...unique.values()].sort((a,b)=>b.filingDate.localeCompare(a.filingDate)||b.accessionNumber.localeCompare(a.accessionNumber));
 const amendments=all.filter(x=>x.form==='4/A');
 const unresolved=amendments.filter(f=>!correctionReviews.some(r=>isReviewedAmendment(r,ticker,f,asOf)));
 if(unresolved.length)return {selected:[],reason:'CURRENT_AMENDMENT_REVIEW_REQUIRED',total:rows.length,amendments,unresolvedAmendments:unresolved.map(x=>x.accessionNumber)};
 const completed=new Set(completedIds);const pending=all.filter(x=>x.form==='4'&&!completed.has(x.accessionNumber));
 return {selected:pending.slice(0,limit),amendments,reviewedAmendments:amendments.map(x=>x.accessionNumber),total:all.length,remaining:Math.max(0,pending.length-limit),reason:all.length?'BOUNDED_LATEST_OFFICIAL_FILINGS':'NO_CURRENT_FILINGS'};
}
export function normalizeCurrentForm4(xml,filing,checkedAt,ticker='AAPL'){
 const company=currentCompany(ticker);
 const expected=`https://www.sec.gov/Archives/edgar/data/${Number(company.cik)}/${filing.accessionNumber.replaceAll('-','')}/${filing.primaryDocument.split('/').at(-1)}`;
 if(!day(filing.filingDate)||filing.url!==expected||Date.parse(checkedAt)<Date.parse(filing.filingDate))throw Error('CURRENT_FILING_SCOPE_INVALID');
 const result=normalizeForm4(xml,company,filing);
 const sourceHash=createHash('sha256').update(xml).digest('hex');
 return {sourceHash,excludedCount:result.excludedCount,events:result.evidence.map(e=>validateCapitalEvent({eventId:e.id,actorId:e.actorId,actorType:'INSIDER',actorName:'SEC 원문 신고인',companyId:company.ticker,securityId:company.ticker+':COMMON',shareClass:'COMMON',eventType:'CONFIRMED_TRANSACTION',actionType:e.transactionCode==='P'?'REPORTED_PURCHASE':'REPORTED_SALE',formType:'4',transactionDate:e.transactionAt,filingDate:filing.filingDate,publicAvailableAt:checkedAt,publicAvailabilityObservedAt:checkedAt,publicationTimePrecision:'OBSERVED_BY',firstPublicAvailabilityVerified:false,quantity:e.shares,price:null,amount:null,currency:'USD',source:'SEC EDGAR',sourceUrl:expected,sourceHash,documentId:filing.accessionNumber,officialSource:true,sourceIntegrity:true,transactionEvidenceVerified:true,personalAttributionVerified:false,planned10b51:e.planned10b51,sourceValidationNote:'공식 원문 신고 거래입니다. 매매 동기·특정 개인 의도·최초 공개 시각·추천 타당성은 검증하지 않았습니다. 이용 가능 시점은 원문을 확인한 시각을 보수적으로 사용합니다.'},{asOf:checkedAt}))};
}
