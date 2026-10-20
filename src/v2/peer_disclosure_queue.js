import {validDay} from './accounting_periods.js';

export const DISCLOSURE_CLASSES=['SHARE_COUNT_IMPACT','TREASURY_SHARE_IMPACT','POTENTIAL_IMPACT','CORRECTION','NOT_RELEVANT','UNCLASSIFIED'];
const day=value=>/^\d{8}$/.test(value||'')?`${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6)}`:value;
// Classification selects documents for review. It never certifies absence of an action.
export function classifyPeerDisclosure(input,{companyCode,stockCode,valuationDate}={}){
 const documentTitle=String(input.documentTitle||input.title||'').trim(),documentId=input.documentId||input.receipt;
 const disclosureDate=day(input.disclosureDate);
 let classification='UNCLASSIFIED',priority=5;
 if(/증자|주식소각|주식분할|주식병합|주식배당|발행주식|증권발행실적/.test(documentTitle)){classification='SHARE_COUNT_IMPACT';priority=1;}
 else if(/자기주식/.test(documentTitle)){classification='TREASURY_SHARE_IMPACT';priority=2;}
 else if(/전환|신주인수|교환청구/.test(documentTitle)){classification='POTENTIAL_IMPACT';priority=3;}
 else if(/증권발행|지분증권|증권예탁|기타경영|분할|합병|사업보고서|반기보고서|분기보고서|주식등의대량|최대주주|임원.*소유/.test(documentTitle)){classification='POTENTIAL_IMPACT';priority=5;}
 else if(/기업설명회|잠정.*실적|영업.*실적|매출.*실적|공정공시|단일판매|공급계약/.test(documentTitle))classification='NOT_RELEVANT';
 const impactClassification=classification;
 if(/정정/.test(documentTitle)){classification='CORRECTION';priority=Math.min(priority,4);}
 const metadataValid=/^\d{14}$/.test(documentId||'')&&validDay(disclosureDate)&&validDay(valuationDate);
 const available=metadataValid&&disclosureDate<=valuationDate;
 // A relationship must be established by original evidence; title similarity is insufficient.
 const relatedDocumentId=input.correctionRelationVerified===true&&/^\d{14}$/.test(input.relatedDocumentId||'')?input.relatedDocumentId:null;
 return {companyCode:companyCode||null,stockCode,documentId,documentTitle,disclosureDate,announcementDate:classification==='CORRECTION'?null:disclosureDate,correctionStatus:classification==='CORRECTION'?(relatedDocumentId?'RELATION_VERIFIED':'RELATION_UNVERIFIED'):'NOT_APPLICABLE',classification,impactClassification,priority,relatedDocumentId,correctionRelationStatus:classification==='CORRECTION'?(relatedDocumentId?'VERIFIED':'UNVERIFIED'):'NOT_APPLICABLE',classificationBasis:'TITLE_TRIAGE_ONLY',verificationStatus:!metadataValid?'METADATA_UNVERIFIED':!available?'FUTURE_DISCLOSURE_BLOCKED':'ORIGINAL_REVIEW_REQUIRED',sourceUrl:metadataValid?`https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${documentId}`:null,availableAt:validDay(disclosureDate)?`${disclosureDate}T23:59:59+09:00`:null,eligibleForValuation:false};
}

export function buildPeerDisclosureQueue(bridge,{companyCode,previousQueue=[]}={}){
 const records=new Map(),conflicts=[];
 for(const raw of bridge.disclosures||[]){const record=classifyPeerDisclosure(raw,{companyCode,stockCode:bridge.ticker,valuationDate:bridge.valuationDate});const old=records.get(record.documentId);if(old&&JSON.stringify(old)!==JSON.stringify(record)){conflicts.push(record.documentId);record.verificationStatus='SOURCE_CONFLICT';}records.set(record.documentId,record);}
 const disclosures=[...records.values()].sort((a,b)=>a.priority-b.priority||String(a.disclosureDate).localeCompare(String(b.disclosureDate))||String(a.documentId).localeCompare(String(b.documentId)));
 const previous=new Map(previousQueue.map(x=>[x.key,x]));
 const queue=disclosures.filter(x=>x.classification!=='NOT_RELEVANT').map(x=>{
  const key=`${bridge.ticker}:${x.documentId}`,cached=previous.get(key),archive=(bridge.originalDocuments||[]).find(d=>d.documentId===x.documentId&&d.sourceIntegrityVerified===true);
  const chainReviewed=verifiedChainDocument(bridge,x,archive);
  const blocked=['FUTURE_DISCLOSURE_BLOCKED','METADATA_UNVERIFIED','SOURCE_CONFLICT'].includes(x.verificationStatus);
  return {...x,...originalReviewMetadata(bridge,x,archive),key,valuationDate:bridge.valuationDate,task:'VERIFY_ORIGINAL_EFFECT_AND_CORRECTION',state:blocked?'BLOCKED':chainReviewed?'VERIFIED':archive?'PARTIAL':'QUEUED',evidenceHash:archive?.sha256||null,originalArchived:!!archive,reason:blocked?x.verificationStatus:chainReviewed?'OFFICIAL_CHAIN_EVIDENCE_VERIFIED':archive?'ORIGINAL_EFFECT_REVIEW_REQUIRED':'OFFICIAL_ORIGINAL_REQUIRED',attempts:cached?.attempts||0,externalCollectionEnabled:false};
 });
 const prior=buildPriorQueue(bridge,companyCode);
 return {disclosures,queue:[...queue,...prior],summary:{total:disclosures.length,classified:disclosures.filter(x=>x.classification!=='UNCLASSIFIED').length,relevant:queue.length,originalArchivesVerified:(bridge.originalDocuments||[]).filter(x=>x.sourceIntegrityVerified===true).length,originalEffectVerified:[...queue,...prior].filter(x=>x.state==='VERIFIED').length,corporateActionsVerified:(bridge.corporateActions||[]).filter(x=>x.verificationStatus==='VERIFIED'&&validDay(x.effectiveDate)&&x.effectiveDate<=bridge.valuationDate&&Number.isFinite(Date.parse(x.availableAt))&&Date.parse(x.availableAt)<=Date.parse(bridge.valuationDate+'T23:59:59+09:00')).length,classificationCounts:Object.fromEntries(DISCLOSURE_CLASSES.map(c=>[c,disclosures.filter(x=>x.classification===c).length])),conflicts,priorAnnouncementCoverage:'INSUFFICIENT_DATA',priorListingComplete:(bridge.priorListingWindows||[]).length>0&&bridge.priorListingWindows.every(w=>w.listingComplete===true),priorQueryFrom:bridge.priorListingWindows?.map(w=>w.fromDate).sort()[0]||null,priorAnnouncementsListed:bridge.priorAnnouncements?.length||0,priorOriginalReviewRequired:prior.length,nextAction:queue.find(x=>x.state!=='VERIFIED')?.task||'PRIOR_ANNOUNCEMENT_COVERAGE_REQUIRED'}};
}

function buildPriorQueue(bridge,companyCode){
 const rows=new Map();
 for(const raw of bridge.priorAnnouncements||[]){
  if(!/증자|소각|자기주식|전환|신주인수|교환청구|분할|병합|주식배당/.test(raw.title||raw.documentTitle||''))continue;
  const x=classifyPeerDisclosure(raw,{companyCode,stockCode:bridge.ticker,valuationDate:bridge.valuationDate});
  const archive=(bridge.originalDocuments||[]).find(d=>d.documentId===x.documentId&&d.sourceIntegrityVerified===true);
  rows.set(x.documentId,{...x,...originalReviewMetadata(bridge,x,archive),key:`${bridge.ticker}:${x.documentId}`,valuationDate:bridge.valuationDate,task:'VERIFY_PRIOR_ANNOUNCEMENT_EFFECT_IN_PERIOD',state:['FUTURE_DISCLOSURE_BLOCKED','METADATA_UNVERIFIED'].includes(x.verificationStatus)?'BLOCKED':verifiedChainDocument(bridge,x,archive)?'VERIFIED':archive?'PARTIAL':'QUEUED',evidenceHash:archive?.sha256||null,originalArchived:!!archive,reason:'PRE_BASELINE_ANNOUNCEMENT_EFFECT_UNVERIFIED',period:'PRIOR_ANNOUNCEMENT',attempts:0,externalCollectionEnabled:false});
 }
 return [...rows.values()];
}

function originalReviewMetadata(bridge,record,archive){
 const review=[...(bridge.priorOriginalReviews||[]),...(bridge.originalReviews||[])].find(r=>r.sourceDocumentId===record.documentId&&r.sourceHash===archive?.sha256&&archive?.sourceIntegrityVerified===true);
 if(!review||record.verificationStatus!=='ORIGINAL_REVIEW_REQUIRED'||review.availableAt&&(!Number.isFinite(Date.parse(review.availableAt))||Date.parse(review.availableAt)>Date.parse(bridge.valuationDate+'T23:59:59+09:00')))return {eventType:null,effectiveDate:null,shareClass:null,quantity:null,originalReviewStatus:'NOT_REVIEWED'};
 return {eventType:review.eventType||null,effectiveDate:review.effectiveDate||null,shareClass:review.shareClass||null,quantity:Number.isSafeInteger(review.reportedQuantity)?review.reportedQuantity:null,originalReviewStatus:review.verificationStatus,originalReviewReason:review.reason,appliedToValuation:false};
}

function verifiedChainDocument(bridge,record,archive){
 const chain=bridge.issuanceChain;
 return !!archive&&chain?.verificationStatus==='VERIFIED'&&chain.stockCode===bridge.ticker&&Number.isFinite(Date.parse(chain.availableAt))&&Date.parse(chain.availableAt)<=Date.parse(bridge.valuationDate+'T23:59:59+09:00')&&chain.documents?.some(d=>d.documentId===record.documentId&&d.sha256===archive.sha256&&d.sourceIntegrityVerified===true);
}
