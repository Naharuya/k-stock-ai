import {XMLParser} from 'fast-xml-parser';
import {createHash} from 'node:crypto';
import {currentCompany} from './current_universe.js';
const parser=new XMLParser({parseTagValue:false,removeNSPrefix:true,ignoreAttributes:false,trimValues:true});
const array=x=>x==null?[]:Array.isArray(x)?x:[x];
const value=x=>x&&typeof x==='object'?x.value:x;
const hash=x=>createHash('sha256').update(x).digest('hex');
const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x;
export const CORRECTION_REVIEW_VERSION='single-rsu-grant-quantity-v1';
export function currentFilingUrl(ticker,filing){
 const c=currentCompany(ticker);
 if(!/^\d{10}-\d{2}-\d{6}$/.test(filing.accessionNumber)||!/^(?:xsl[A-Za-z0-9]+\/)?[\w.-]+\.xml$/.test(filing.primaryDocument))throw Error('CORRECTION_PATH_INVALID');
 return `https://www.sec.gov/Archives/edgar/data/${Number(c.cik)}/${filing.accessionNumber.replaceAll('-','')}/${filing.primaryDocument.split('/').at(-1)}`;
}
export function reviewCurrentCorrection({ticker,original,amendment,originalXml,amendmentXml,checkedAt}){
 const company=currentCompany(ticker);
 for(const f of [original,amendment])if(!date(f.filingDate)||f.url!==currentFilingUrl(ticker,f)||!Number.isFinite(Date.parse(checkedAt))||Date.parse(f.filingDate)>Date.parse(checkedAt))throw Error('CORRECTION_PROVENANCE_INVALID');
 if(original.accessionNumber===amendment.accessionNumber||original.filingDate>amendment.filingDate)throw Error('CORRECTION_SEQUENCE_INVALID');
 const a=parser.parse(originalXml)?.ownershipDocument,b=parser.parse(amendmentXml)?.ownershipDocument;
 if(a?.documentType!=='4'||b?.documentType!=='4/A')throw Error('CORRECTION_FORM_INVALID');
 for(const d of [a,b])if(Number(d.issuer?.issuerCik)!==Number(company.cik)||d.issuer?.issuerTradingSymbol!==ticker)throw Error('CORRECTION_ISSUER_MISMATCH');
 const owners=d=>array(d.reportingOwner).map(x=>String(x.reportingOwnerId?.rptOwnerCik||'').padStart(10,'0')).sort();
 const ids=owners(a);if(!ids.length||ids.some(x=>!/^\d{10}$/.test(x))||JSON.stringify(ids)!==JSON.stringify(owners(b)))throw Error('CORRECTION_OWNER_MISMATCH');
 if(!date(a.periodOfReport)||a.periodOfReport!==b.periodOfReport||b.dateOfOriginalSubmission!==original.filingDate)throw Error('CORRECTION_RELATION_UNVERIFIED');
 function row(d){
  const rows=array(d.nonDerivativeTable?.nonDerivativeTransaction);
  if(rows.length!==1||array(d.derivativeTable?.derivativeTransaction).length||array(d.nonDerivativeTable?.nonDerivativeHolding).length||array(d.derivativeTable?.derivativeHolding).length)throw Error('CORRECTION_SCOPE_UNSUPPORTED');
  const x=rows[0],shares=value(x.transactionAmounts?.transactionShares),owned=value(x.postTransactionAmounts?.sharesOwnedFollowingTransaction);
  const fields={securityTitle:value(x.securityTitle),transactionDate:value(x.transactionDate),code:x.transactionCoding?.transactionCode,direction:value(x.transactionAmounts?.transactionAcquiredDisposedCode),price:value(x.transactionAmounts?.transactionPricePerShare),ownership:value(x.ownershipNature?.directOrIndirectOwnership),transactionFormType:x.transactionCoding?.transactionFormType,equitySwap:x.transactionCoding?.equitySwapInvolved};
  const notes=array(d.footnotes?.footnote).map(n=>typeof n==='string'?n:n['#text']||'').join(' ');
  if(fields.securityTitle!==company.form4SecurityTitle||fields.code!=='A'||fields.direction!=='A'||fields.price!=='0'||fields.ownership!=='D'||fields.transactionDate!==d.periodOfReport||!/^\d+$/.test(shares||'')||!/^\d+$/.test(owned||'')||!Number.isSafeInteger(Number(shares))||Number(shares)<=0||Number(owned)!==Number(shares)||!/RSUs/.test(notes)||!/for no consideration/i.test(notes))throw Error('CORRECTION_SCOPE_UNSUPPORTED');
  return {fields,quantity:Number(shares),notes};
 }
 if(String(a.aff10b5One)!==String(b.aff10b5One))throw Error('CORRECTION_CHANGE_UNSUPPORTED');
 const before=row(a),after=row(b);
 // Only quantity/post-grant balance and amendment/signature metadata may differ.
 const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
 function masked(d){const x=structuredClone(d);for(const k of ['documentType','dateOfOriginalSubmission','remarks','ownerSignature'])delete x[k];const r=array(x.nonDerivativeTable.nonDerivativeTransaction)[0];r.transactionAmounts.transactionShares.value='QUANTITY';r.postTransactionAmounts.sharesOwnedFollowingTransaction.value='QUANTITY';return canonical(x);}
 if(JSON.stringify(masked(a))!==JSON.stringify(masked(b)))throw Error('CORRECTION_ADDITIONAL_CHANGE_UNSUPPORTED');

 if(JSON.stringify(before.fields)!==JSON.stringify(after.fields)||before.notes!==after.notes||before.quantity===after.quantity||!/solely to correct an administrative error in the number of acquired shares/i.test(b.remarks||''))throw Error('CORRECTION_CHANGE_UNSUPPORTED');
 return {schemaVersion:1,version:CORRECTION_REVIEW_VERSION,companyId:ticker,status:'VERIFIED_RELATIONSHIP',scope:'RSU_GRANT_QUANTITY_ONLY',originalDocumentId:original.accessionNumber,amendmentDocumentId:amendment.accessionNumber,originalFilingDate:original.filingDate,amendmentFilingDate:amendment.filingDate,transactionDate:a.periodOfReport,originalSourceUrl:original.url,amendmentSourceUrl:amendment.url,originalSourceHash:hash(originalXml),amendmentSourceHash:hash(amendmentXml),checkedAt,publicAvailabilityObservedAt:checkedAt,firstPublicAvailabilityVerified:false,beforeQuantity:before.quantity,afterQuantity:after.quantity,difference:after.quantity-before.quantity,reason:'ADMINISTRATIVE_GRANT_QUANTITY_CORRECTION',eligiblePurchaseSaleEvents:0,recommendationStatus:'HOLD'};
}
export function isReviewedAmendment(review,ticker,filing,asOf){
 return review?.eligiblePurchaseSaleEvents===0&&Number.isSafeInteger(review.beforeQuantity)&&review.beforeQuantity>0&&Number.isSafeInteger(review.afterQuantity)&&review.afterQuantity>0&&review.difference===review.afterQuantity-review.beforeQuantity&&date(review.originalFilingDate)&&date(review.amendmentFilingDate)&&review.originalFilingDate<=review.amendmentFilingDate&&review?.version===CORRECTION_REVIEW_VERSION&&review.status==='VERIFIED_RELATIONSHIP'&&review.scope==='RSU_GRANT_QUANTITY_ONLY'&&review.companyId===ticker&&review.amendmentDocumentId===filing.accessionNumber&&review.amendmentFilingDate===filing.filingDate&&review.amendmentSourceUrl===currentFilingUrl(ticker,filing)&&/^[a-f\d]{64}$/.test(review.amendmentSourceHash||'')&&/^[a-f\d]{64}$/.test(review.originalSourceHash||'')&&Number.isFinite(Date.parse(review.checkedAt))&&Date.parse(review.checkedAt)<=Date.parse(asOf);
}
