import {validDay} from './accounting_periods.js';
export function reviewShareDates({observedShares=[],capitalShareRecords=[],priceDate,asOf}={}){
 const now=Date.parse(asOf),day=String(asOf).slice(0,10);
 const eligible=x=>validDay(x.asOfDate)&&x.asOfDate<=priceDate&&x.asOfDate<=day&&Number.isSafeInteger(x.count)&&x.count>0&&Number.isFinite(Date.parse(x.observedAt))&&Date.parse(x.observedAt)<=now;
 const candidates=validDay(priceDate)&&priceDate<=day?observedShares.filter(eligible).sort((a,b)=>b.asOfDate.localeCompare(a.asOfDate)):[];
 const latest=candidates[0],same=candidates.filter(x=>x.asOfDate===latest?.asOfDate);
 const conflict=new Set(same.map(x=>x.count)).size>1;
 const gap=latest?Math.round((Date.parse(priceDate)-Date.parse(latest.asOfDate))/86400000):null;
 return {status:conflict?'SOURCE_CONFLICT':latest?gap===0?'SAME_DATE_OBSERVATION_NOT_VERIFIED':'DATE_BRIDGE_REQUIRED':'INSUFFICIENT_DATA',priceDate:validDay(priceDate)?priceDate:null,baseline:latest&&!conflict?latest:null,gapCalendarDays:gap,bridgeFrom:latest?.asOfDate||null,bridgeThrough:validDay(priceDate)?priceDate:null,capitalShareRecords:capitalShareRecords.filter(x=>validDay(x.asOfDate)&&x.asOfDate<=day&&Number.isFinite(Date.parse(x.observedAt))&&Date.parse(x.observedAt)<=now),required:['SOURCE_BOUND_SHARE_CLASS_REVIEW','REPORTED_PRECISION_REVIEW','FULL_CORPORATE_ACTION_COVERAGE','EFFECTIVE_DATE_RECONCILIATION','ISSUED_TREASURY_OUTSTANDING_DEFINITION'],verifiedShares:null,marketCap:null,recommendationStatus:'HOLD'};
}
