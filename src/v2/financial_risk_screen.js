import {CURRENT_UNIVERSE} from './current_universe.js';
import {validDay} from './accounting_periods.js';
// A reconciled annual balance sheet is an observation, never a credit rating.
export function screenFinancialRisk({companyId,financial={},sourceUrl,sourceHash,asOf}={}){
 const company=CURRENT_UNIVERSE.find(c=>c.ticker===companyId),now=Date.parse(asOf),day=String(asOf).slice(0,10),reasons=[];
 if(!company||sourceUrl!==`https://data.sec.gov/api/xbrl/companyfacts/CIK${company?.cik}.json`||!/^[a-f0-9]{64}$/.test(sourceHash||''))reasons.push('OFFICIAL_SOURCE_PROOF_REQUIRED');
 const end=financial.periodEnd,filed=financial.disclosureDate;
 if(!Number.isFinite(now)||!validDay(end)||!validDay(filed)||end>filed||filed>day||!Number.isFinite(Date.parse(financial.checkedAt))||Date.parse(financial.checkedAt)>now)reasons.push('POINT_IN_TIME_INVALID');
 if(!['ANNUAL_NOT_TTM','INTERIM_INSTANT'].includes(financial.basis)||financial.currency!=='USD'||financial.unit!=='CURRENCY_UNITS')reasons.push('BASIS_OR_UNIT_INVALID');
 if(validDay(end)&&now-Date.parse(end)>550*86400000)reasons.push('ANNUAL_STATEMENT_STALE');
 const {assets,liabilities,equity}=financial.raw||{};
 if(![assets,liabilities,equity].every(Number.isSafeInteger))reasons.push('BALANCE_FIELDS_REQUIRED');
 else if(assets<=0||liabilities<0)reasons.push('BALANCE_VALUES_INVALID');
 else if(assets-liabilities!==equity)reasons.push('BALANCE_RECONCILIATION_REQUIRED');
 const ready=reasons.length===0;
 return {status:ready?'OBSERVED_RECONCILED':'INSUFFICIENT_DATA',scope:financial.basis==='INTERIM_INSTANT'?'INTERIM_BALANCE_SHEET_ONLY':'ANNUAL_BALANCE_SHEET_ONLY',periodEnd:end||null,disclosureDate:filed||null,currency:financial.currency||null,unit:financial.unit||null,sourceUrl:sourceUrl||null,sourceHash:sourceHash||null,assets:ready?assets:null,liabilities:ready?liabilities:null,equity:ready?equity:null,liabilitiesToAssetsPct:ready?liabilities/assets*100:null,liabilitiesToEquity:ready&&equity>0?liabilities/equity:null,nonPositiveEquity:ready?equity<=0:null,reasons,comprehensiveRiskVerified:false};
}
