import {validDay} from './accounting_periods.js';
const plain=x=>String(x||'').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ').trim();
const sourceOK=d=>{try{const u=new URL(d.sourceUrl);return u.protocol==='https:'&&['dart.fss.or.kr','kind.krx.co.kr'].includes(u.hostname)&&/^[a-f0-9]{64}$/.test(d.sha256)&&/^\d{14}$/.test(d.documentId)&&validDay(d.disclosureDate);}catch{return false;}};
export function verifyPeerIssuanceChain({stockCode,valuationDate,documents=[]}={}){
 const reasons=[],required=['INITIAL','CORRECTION','PAYMENT_RESULT','ISSUANCE_RESULT','LISTING'];
 if(!/^\d{6}$/.test(stockCode||'')||!validDay(valuationDate))reasons.push('VALUATION_SCOPE_UNVERIFIED');
 for(const role of required)if(!documents.some(d=>d.role===role))reasons.push('MISSING_'+role);
 for(const d of documents){if(!sourceOK(d)||d.stockCode!==stockCode||d.sourceIntegrityVerified!==true)reasons.push('SOURCE_CHAIN_UNVERIFIED');if(d.disclosureDate>valuationDate)reasons.push('FUTURE_DISCLOSURE_BLOCKED');}
 const initial=documents.find(d=>d.role==='INITIAL'),corrections=documents.filter(d=>d.role==='CORRECTION');
 if(corrections.some(d=>d.relatedDocumentId!==initial?.documentId||d.correctionRelationVerified!==true||d.disclosureDate<initial?.disclosureDate))reasons.push('CORRECTION_RELATION_UNVERIFIED');
 const results=documents.filter(d=>['PAYMENT_RESULT','ISSUANCE_RESULT'].includes(d.role));
 const listing=documents.find(d=>d.role==='LISTING'),text=plain(listing?.html);
 const effective=text.match(/③\s*발행일\s*:\s*(\d{4})년\s*(\d{2})월\s*(\d{2})일/),listed=text.match(/⑥\s*상장일\s*:\s*(\d{4})년\s*(\d{2})월\s*(\d{2})일/),quantity=Number(text.match(/①\s*주식의 종류와 수\s*:\s*기명식 보통주\s*([\d,]+)주/)?.[1]?.replaceAll(',',''));
 const effectiveDate=effective?`${effective[1]}-${effective[2]}-${effective[3]}`:null,listingDate=listed?`${listed[1]}-${listed[2]}-${listed[3]}`:null;
 if(!text.includes(`단축코드:A${stockCode}`)||!validDay(effectiveDate)||!validDay(listingDate)||listingDate<effectiveDate||!Number.isSafeInteger(quantity)||quantity<=0)reasons.push('ACTUAL_ISSUANCE_DATE_CLASS_QUANTITY_UNVERIFIED');
 if(effectiveDate>valuationDate)reasons.push('EVENT_OUTSIDE_VALUATION_PERIOD');
 if(initial?.shareClass!=='COMMON'||initial?.quantity!==quantity||!results.length||results.some(d=>d.actual!==true||d.shareClass!=='COMMON'||d.quantity!==quantity||!validDay(d.paymentDate)||d.paymentDate>=effectiveDate))reasons.push('PAYMENT_RESULT_CLASS_OR_QUANTITY_CONFLICT');
 if(new Set(results.map(d=>d.paymentDate)).size!==1)reasons.push('PAYMENT_DATE_CONFLICT');
 if(!/^https:\/\/kind\.krx\.co\.kr\/external\//.test(listing?.sourceUrl||''))reasons.push('OFFICIAL_LISTING_SOURCE_REQUIRED');
 const availableDate=[...documents].map(d=>d.disclosureDate).sort().at(-1),verified=!reasons.length;
 return {verificationStatus:verified?'VERIFIED':'PARTIAL',reasons:[...new Set(reasons)],stockCode,initialDocumentId:initial?.documentId||null,documents:documents.map(({html,...d})=>d),paymentDate:results[0]?.paymentDate||null,effectiveDate:verified?effectiveDate:null,observedIssuanceDate:effectiveDate,listingDate,quantity:Number.isSafeInteger(quantity)?quantity:null,shareClass:'COMMON',availableAt:validDay(availableDate)?availableDate+'T23:59:59+09:00':null,event:verified?{eventId:`${stockCode}:${initial.documentId}:COMMON`,type:'RIGHTS_ISSUE',announcementDate:initial.disclosureDate,disclosureDate:listing.disclosureDate,paymentDate:results[0].paymentDate,correctionRelationVerified:true,shareClass:'COMMON',delta:quantity,reportedShares:quantity,effectiveDate,listingDate,availableAt:availableDate+'T23:59:59+09:00',sourceUrl:listing.sourceUrl,sourceDocumentId:listing.documentId,sourceHash:listing.sha256,verificationStatus:'VERIFIED',status:'ACTUAL_ISSUANCE_CONFIRMED',reason:'거래소 추가상장 원문의 실제 발행일 확인; 상장일에 중복 증가하지 않음'}:null};
}
