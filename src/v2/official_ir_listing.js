import{validDay}from'./accounting_periods.js';
const months={Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
function publicationDay(text){const m=String(text).match(/^([A-Z][a-z]{2}) (\d{2})\. (\d{4})$/);return m&&months[m[1]]?`${m[3]}-${months[m[1]]}-${m[2]}`:null;}
export function verifyOfficialIrListing(response,{fromDate,toDate}={}){
 const d=response?.response?.resultData;
 const fail=reason=>({status:'SOURCE_NOT_CONFIRMED',reason,listingComplete:false,items:[],existence:'UNKNOWN'});
 if(response?.response?.statusCode!==200||response.response.siteCode!=='global'||!validDay(fromDate)||!validDay(toDate)||fromDate>toDate||d?.startDate!==fromDate.replaceAll('-','')||d?.endDate!==toDate.replaceAll('-','')||d.keyword!==''||d.pageNum!=='1'||!Array.isArray(d.irList)||Number(d.totalCount)!==d.irList.length||Number(d.fromRecord)!==1||Number(d.toRecord)!==d.irList.length)return fail('OFFICIAL_LIST_SCOPE_OR_PAGINATION_UNVERIFIED');
 const items=d.irList.map(x=>({documentId:x.irCode,title:x.title?.trim(),disclosureDate:publicationDay(x.date),sourceUrl:`https://www.samsung.com/global/ir/reports-disclosures/public-disclosure-view.${x.irCode}/`}));
 if(items.some(x=>!/^\d+$/.test(x.documentId||'')||!x.title||!validDay(x.disclosureDate)||x.disclosureDate<fromDate||x.disclosureDate>toDate)||new Set(items.map(x=>x.documentId)).size!==items.length)return fail('OFFICIAL_LIST_ITEM_INVALID');
 return {status:'LISTING_VERIFIED',listingComplete:true,fromDate,toDate,items,existence:'UNKNOWN',balanceSourceStatus:'SOURCE_NOT_CONFIRMED',warning:'DISCLOSURE_LIST_IS_NOT_A_TREASURY_BALANCE_OBSERVATION'};
}
