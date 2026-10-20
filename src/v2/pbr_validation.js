// PBR input verification is independent of business-comparison eligibility.
const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value ? value : null;
const positive = value => Number.isFinite(value) && value > 0;
const official = source => {try {const u=new URL(source);return u.protocol==='https:' && ['dart.fss.or.kr','opendart.fss.or.kr','data.krx.co.kr','openapi.krx.co.kr','www.sec.gov','www.skhynix.com','news.skhynix.com','www.dbhitek.com','www.hanmisemi.com'].includes(u.hostname) || u.protocol==='https:' && u.hostname==='github.com' && u.pathname.startsWith('/koreainvestment/open-trading-api/');}catch{return false;}};
const known = value => typeof value==='string' && value.length>0;
const available = (value,cutoff) => Number.isFinite(Date.parse(value)) && Date.parse(value)<=Date.parse(cutoff+'T23:59:59+09:00');
export function validatePbrInputs(input,valuationDate){
 const reasons=[];const add=(condition,reason)=>{if(!condition)reasons.push(reason);};
 const p=input.price||{},m=input.marketCap||{},s=input.shares||{},b=input.bookValue||{},a=input.corporateActions||{},c=input.correction||{},fit=input.businessFit||{};
 add(!!date(valuationDate),'VALUATION_DATE_UNVERIFIED');
 add(p.verificationStatus==='VERIFIED'&&positive(p.value)&&p.asOfDate===valuationDate&&official(p.sourceUrl),'PBR_PRICE_UNVERIFIED');
 add(m.verificationStatus==='VERIFIED'&&positive(m.value)&&m.asOfDate===valuationDate&&official(m.sourceUrl),'PBR_MARKET_CAP_UNVERIFIED');
 add(s.verificationStatus==='VERIFIED'&&positive(s.issuedShares)&&Number.isFinite(s.treasuryShares)&&s.treasuryShares>=0&&s.treasuryShares<=s.issuedShares&&s.outstandingShares===s.issuedShares-s.treasuryShares&&s.asOfDate===valuationDate&&official(s.sourceUrl),'PBR_SHARE_COUNT_UNVERIFIED');
 add(['ISSUED','OUTSTANDING'].includes(m.shareCountBasis),'PBR_CAPITAL_DEFINITION_UNVERIFIED');
 const multiplier=m.shareCountBasis==='ISSUED'?s.issuedShares:s.outstandingShares;
 let expected=positive(p.value)&&positive(multiplier)?p.value*multiplier:null;
 if(m.shareClassScope==='ALL_PARENT_EQUITY'){
  const parts=m.components||[];const classes=new Set(parts.map(x=>x.shareClass));
  const verified=parts.length>0&&classes.size===parts.length&&m.classCoverageVerified===true&&s.classCoverageVerified===true&&parts.every(x=>['COMMON','PREFERRED'].includes(x.shareClass)&&x.verificationStatus==='VERIFIED'&&x.asOfDate===valuationDate&&x.currency===m.currency&&positive(x.close)&&positive(x.issuedShares)&&Number.isFinite(x.treasuryShares)&&x.treasuryShares>=0&&x.treasuryShares<=x.issuedShares&&x.outstandingShares===x.issuedShares-x.treasuryShares&&official(x.sourceUrl));
  add(verified,'PBR_ALL_CLASS_COMPONENTS_UNVERIFIED');
  add(verified&&parts.reduce((n,x)=>n+x.issuedShares,0)===s.issuedShares&&parts.reduce((n,x)=>n+x.treasuryShares,0)===s.treasuryShares,'PBR_ALL_CLASS_SHARE_RECONCILIATION_FAILED');
  expected=verified?parts.reduce((n,x)=>n+x.close*(m.shareCountBasis==='ISSUED'?x.issuedShares:x.outstandingShares),0):null;
 }else add(['COMMON','PREFERRED'].includes(m.shareClassScope)&&b.classAllocationVerified===true,'PBR_CLASS_BOOK_ALLOCATION_UNVERIFIED');
 add(positive(expected)&&positive(m.value)&&Math.abs(expected-m.value)<=Math.max(1,m.value*0.000001),'PBR_CAPITAL_RECONCILIATION_FAILED');
 add(b.verificationStatus==='VERIFIED'&&positive(b.value)&&date(b.asOfDate)&&b.asOfDate<=valuationDate&&official(b.sourceUrl),'PBR_BOOK_VALUE_UNVERIFIED');
 add(['CFS','OFS'].includes(b.consolidationType)&&b.periodKind==='POINT_IN_TIME','PBR_FINANCIAL_BASIS_UNVERIFIED');
 add(b.consolidationType==='CFS'?b.accountId==='ifrs-full_EquityAttributableToOwnersOfParent':b.accountId==='ifrs-full_Equity','PBR_BOOK_VALUE_DEFINITION_MISMATCH');
 add(known(m.shareClassScope)&&m.shareClassScope===b.shareClassScope&&s.shareClassScope===m.shareClassScope,'PBR_SHARE_CLASS_SCOPE_MISMATCH');
 add(known(p.currency)&&p.currency===m.currency&&m.currency===b.currency&&m.unit===b.unit&&m.unit===m.currency,'PBR_CURRENCY_UNIT_MISMATCH');
 add(available(b.availableAt,valuationDate)&&available(s.availableAt,valuationDate),'PBR_FUTURE_OR_UNKNOWN_PUBLICATION');
 add(a.verificationStatus==='VERIFIED'&&a.coverageEnd===valuationDate&&date(a.coverageStart)&&a.coverageStart<=b.asOfDate&&a.duplicateApplication===false&&a.priceBasisVerified===true&&available(a.availableAt,valuationDate)&&official(a.sourceUrl),'PBR_CORPORATE_ACTION_UNVERIFIED');
 add(c.verificationStatus==='VERIFIED'&&['NOT_CORRECTED','CORRECTED_VERIFIED'].includes(c.status)&&available(c.availableAt,valuationDate)&&official(c.sourceUrl),'PBR_CORRECTION_UNVERIFIED');
 const verified=reasons.length===0;const comparisonReasons=[];
 if(fit.verificationStatus!=='VERIFIED'||fit.comparable!==true||!official(fit.sourceUrl))comparisonReasons.push('BUSINESS_COMPARABILITY_UNVERIFIED');
 if(input.comparisonPeriodVerified!==true)comparisonReasons.push('FINANCIAL_PERIOD_MISMATCH');
 return {verificationStatus:verified?'VERIFIED':'INSUFFICIENT_DATA',inputVerificationStatus:verified?'VERIFIED':'INSUFFICIENT_DATA',value:verified?m.value/b.value:null,asOfDate:valuationDate,currency:p.currency||b.currency||null,unit:'MULTIPLE',denominatorDefinition:b.consolidationType==='CFS'?'OWNERS_EQUITY':'ENTITY_EQUITY',comparisonStatus:verified&&comparisonReasons.length===0?'ELIGIBLE':'EXCLUDED',eligible:verified&&comparisonReasons.length===0,reasons:[...new Set(reasons)],comparisonReasons,inputs:structuredClone(input),recommendationEligible:false};
}
export function pbrInputsFromSavedPeer(row,valuationDate){
 const p=row.priceEvidence||{},b=row.balanceEvidence||{},o=b.accounts?.ownersEquity,eq=b.basis==='CFS'?o:b.accounts?.equity;const capital=row.pbrInputEvidence?.marketCap||{},shares=row.pbrInputEvidence?.shares||{};
 const input={price:{value:p.close??row.price??null,asOfDate:p.asOfDate??row.priceDate??null,currency:p.currency??null,sourceUrl:p.sourceUrl??row.priceSource??null,verificationStatus:p.status==='VERIFIED_DATE_CLOSE'?'VERIFIED':'INSUFFICIENT_DATA'},marketCap:capital,shares,bookValue:{value:eq?.value??null,asOfDate:b.asOfDate??null,availableAt:b.publishedAt??null,consolidationType:b.basis??null,periodKind:'POINT_IN_TIME',accountId:eq?.accountId??null,currency:b.currency??null,unit:b.unit??null,sourceUrl:b.sourceUrl??null,sourceDocument:b.sourceDocument??null,verificationStatus:eq?.status==='VERIFIED'?'VERIFIED':eq?'SOURCE_ACCOUNT_IDENTIFIED':'INSUFFICIENT_DATA',shareClassScope:b.shareClassScope??null},corporateActions:row.pbrInputEvidence?.corporateActions||{},correction:row.pbrInputEvidence?.correction||{},businessFit:{verificationStatus:row.businessReview?.businessFitStatus==='VERIFIED'?'VERIFIED':'INSUFFICIENT_DATA',comparable:row.businessReview?.comparableToTargetConsolidated===true,sourceUrl:row.businessReview?.sourceUrl||null},comparisonPeriodVerified:row.pbrInputEvidence?.comparisonPeriodVerified===true};
 if(row.pbrInputEvidence?.bookValue)input.bookValue=structuredClone(row.pbrInputEvidence.bookValue);
 const review=validatePbrInputs(input,valuationDate);
 const observed={price:positive(input.price.value)&&input.price.asOfDate===valuationDate,marketCap:positive(capital.value)&&capital.asOfDate===valuationDate,issuedShares:(row.observedShareCounts||[]).some(x=>positive(x.issued)),treasuryShares:(row.observedShareCounts||[]).some(x=>Number.isFinite(x.treasury)),shareClass:(row.observedShareCounts||[]).some(x=>['COMMON','PREFERRED'].includes(x.shareClass)),ownersEquity:positive(o?.value),financialDate:!!date(b.asOfDate),publication:available(b.publishedAt,valuationDate),corporateActions:input.corporateActions.verificationStatus==='VERIFIED',businessFit:input.businessFit.comparable===true};
 const verified=Object.values(input).filter(x=>x&&typeof x==='object'&&x.verificationStatus==='VERIFIED').length;
 review.completeness={observed:Object.values(observed).filter(Boolean).length,total:10,verified,ratio:Object.values(observed).filter(Boolean).length/10,fields:observed};review.nextRequired=review.reasons;return review;
}
export function prioritizePbrPeers(rows,valuationDate){return rows.map(row=>({ticker:row.ticker,companyName:row.companyName,...pbrInputsFromSavedPeer(row,valuationDate)})).sort((a,b)=>b.completeness.observed-a.completeness.observed||b.completeness.verified-a.completeness.verified||a.ticker.localeCompare(b.ticker)).map((row,index)=>({...row,priorityRank:index+1}));}
