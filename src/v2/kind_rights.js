import {validDay} from './accounting_periods.js';
const plain=html=>String(html||'').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
export function parseKindListing(html,{fromDate,toDate,stockCode='005930'}={}){
 if(!validDay(fromDate)||!validDay(toDate)||fromDate>toDate||!['005930','000660','000990','042700'].includes(stockCode))throw new Error('INVALID_KIND_SCOPE');
 const items=[];
 for(const row of String(html).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
  const content=row[1],notice=content.match(/openDisclsViewer\('([0-9]{14})'.*?title=['"]([^'"]+)['"]/s);
  if(!notice)continue;
  const day=content.match(/<td class="txc">(\d{4}-\d{2}-\d{2})/);
  const company=content.match(/companysummary_open\('([0-9]+)'/);
  if(!day||!validDay(day[1])||day[1]<fromDate||day[1]>toDate||company?.[1]!==stockCode.slice(0,5))throw new Error('KIND_SCOPE_MISMATCH');
  items.push({documentId:notice[1],announcementDate:day[1],title:plain(notice[2]),stockCode,
   sourceUrl:`https://kind.krx.co.kr/common/disclsviewer.do?method=search&acptno=${notice[1]}`});
 }
 const pages=plain(html).match(/전체\s*([\d,]+)\s*건\s*:\s*(\d+)\s*\/\s*(\d+)/);
 const duplicate=items.length!==new Set(items.map(x=>x.documentId)).size;
 return {fromDate,toDate,items,total:pages?Number(pages[1].replaceAll(',','')):null,
  page:pages?Number(pages[2]):null,pages:pages?Number(pages[3]):null,
  listingComplete:!!pages&&!duplicate&&pages[2]==='1'&&pages[3]==='1'&&Number(pages[1].replaceAll(',',''))===items.length,
  issues:duplicate?['DUPLICATE_DOCUMENT_ID']:[],
  economicCoverageVerified:false};
}
export function verifyKindDividendNotice(html,{listingItem,documentId,sourceUrl,collectedAt,sourceDigest}={}){
 const text=plain(html),issues=[];
 if(listingItem?.stockCode!=='005930'||listingItem?.title!=='중간(분기)배당락 기준가격 안내'||!/^\d{14}$/.test(documentId||'')||!/^https:\/\/kind\.krx\.co\.kr\/external\//.test(sourceUrl||'')||! /^[a-f0-9]{64}$/.test(sourceDigest||''))issues.push('SOURCE_CHAIN_UNVERIFIED');
 if(!/1\.\s*회사명\s*삼성전자\s*2\./.test(text)||!/보통주식/.test(text)||/삼성전자우/.test(text))issues.push('SHARE_CLASS_OR_COMPANY_MISMATCH');
 const exDate=text.match(/4\.\s*적용일\s*(\d{4}-\d{2}-\d{2})/)?.[1]??null;
 if(new Set([...text.matchAll(/4\.\s*적용일\s*(\d{4}-\d{2}-\d{2})/g)].map(x=>x[1])).size>1)issues.push('DATE_CONFLICT');
 if(!validDay(exDate)||!validDay(listingItem?.announcementDate)||listingItem.announcementDate>exDate||Date.parse(`${listingItem?.announcementDate}T23:59:59+09:00`)>Date.parse(collectedAt)||!Number.isFinite(Date.parse(collectedAt)))issues.push('DATE_UNVERIFIED');
 const unchanged=/중간\(분기\)배당락\(기준가격 변동없음\)/.test(text);
 const basePriceText=text.match(/보통주식\s+([\d,]+)/)?.[1];
 const basePrice=basePriceText?Number(basePriceText.replaceAll(',','')):null;
 if(!(Number.isSafeInteger(basePrice)&&basePrice>0))issues.push('BASE_PRICE_UNVERIFIED');
 if(!unchanged)issues.push('ADJUSTMENT_METHOD_UNVERIFIED');
 return {stockCode:'005930',shareClass:'COMMON',eventType:'CASH_DIVIDEND_EX_DATE',announcementDate:listingItem?.announcementDate,
  exDate:issues.length?null:exDate,effectiveDate:issues.length?null:exDate,recordDate:null,paymentDate:null,cashPerShare:null,
  source:'KRX KIND',sourceDocumentId:documentId,acceptanceId:listingItem?.documentId,sourceUrl,sourceDigest,collectedAt,
  sourceVerified:issues.length===0,exDateVerified:issues.length===0,verificationStatus:issues.length?'PENDING_VERIFICATION':'VERIFIED',
  basePrice,currency:'KRW',adjustmentMethod:unchanged?'BASE_PRICE_UNCHANGED':null,issues,calculationEligible:false,coverageVerified:false};
}
