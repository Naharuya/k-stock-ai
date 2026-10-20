import {XMLParser} from 'fast-xml-parser';
const parser=new XMLParser({ignoreAttributes:true,parseTagValue:false,removeNSPrefix:true,trimValues:true});
export function parseInstitutionHolding(xml,{cusip='037833100',shareClass='COM'}={}){
 const entries=parser.parse(xml)?.informationTable?.infoTable;
 if(!entries)throw Error('SEC_INFORMATION_TABLE_INVALID');
 const rows=(Array.isArray(entries)?entries:[entries]).filter(x=>x.cusip===cusip&&x.titleOfClass===shareClass&&!x.putCall&&x.shrsOrPrnAmt?.sshPrnamtType==='SH');
 if(!rows.length)return {present:false,quantity:null,reportedValueUsd:null,rowCount:0};
 const keys=new Set();let quantity=0,reportedValueUsd=0;
 for(const r of rows){
  const key=JSON.stringify(r);if(keys.has(key))throw Error('SEC_DUPLICATE_HOLDING_ROW');keys.add(key);
  if(!/^\d+$/.test(r.shrsOrPrnAmt.sshPrnamt||'')||!/^\d+(?:\.\d+)?$/.test(r.value||''))throw Error('SEC_HOLDING_AMOUNT_INVALID');
  const q=Number(r.shrsOrPrnAmt.sshPrnamt),v=Number(r.value);
  if(!Number.isSafeInteger(q)||q<0||!Number.isFinite(v)||v<0)throw Error('SEC_HOLDING_AMOUNT_INVALID');
  quantity+=q;reportedValueUsd+=v;
 }
 if(!Number.isSafeInteger(quantity))throw Error('SEC_HOLDING_TOTAL_INVALID');
 return {present:true,quantity,reportedValueUsd,rowCount:rows.length,cusip,shareClass,issuer:rows[0].nameOfIssuer};
}
export function parseCapitalCover(xml){
 const document=parser.parse(xml)?.edgarSubmission;
 const header=document?.headerData,cover=document?.formData?.coverPage;
 if(!header||!cover)throw Error('SEC_COVER_INVALID');
 const cik=String(header.filerInfo?.filer?.credentials?.cik||'').padStart(10,'0');
 if(cik!=='0001067983'||!['13F-HR','13F-HR/A'].includes(header.submissionType))throw Error('SEC_INSTITUTION_MISMATCH');
 const raw=cover.reportCalendarOrQuarter;
 const m=/^(\d{2})-(\d{2})-(\d{4})$/.exec(raw||'');
 const reportingPeriod=m?`${m[3]}-${m[1]}-${m[2]}`:raw;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(reportingPeriod||'')||!Number.isFinite(Date.parse(reportingPeriod))||new Date(reportingPeriod).toISOString().slice(0,10)!==reportingPeriod)throw Error('SEC_REPORTING_PERIOD_INVALID');
 return {actorId:'sec:0001067983',institutionName:cover.filingManager?.name,form:header.submissionType,reportingPeriod,isAmendment:cover.isAmendment==='true',amendmentType:cover.amendmentInfo?.amendmentType||null,amendmentNumber:cover.amendmentInfo?.amendmentNo||null};
}
