import {validDay} from './accounting_periods.js';
import {currentCompany} from './current_universe.js';
import {XMLParser} from 'fast-xml-parser';
import {createHash} from 'node:crypto';
const parser=new XMLParser({ignoreAttributes:false,parseTagValue:false,parseAttributeValue:false,trimValues:true});
const list=x=>x==null?[]:Array.isArray(x)?x:[x];
const text=x=>typeof x==='object'?x?.['#text']:x;
export function matchSecConsolidatedFacts(xml,company,inputs){
 const parsed=parser.parse(xml),root=parsed['xbrli:xbrl']||parsed.xbrl;if(!root)throw Error('XBRL_INSTANCE_INVALID');
 const contexts=new Map(list(root['xbrli:context']||root.context).map(c=>[c['@_id'],c]));
 const units=new Map(list(root['xbrli:unit']||root.unit).map(u=>[u['@_id'],text(u['xbrli:measure']||u.measure)]));
 const get=(x,k)=>x?.['xbrli:'+k]||x?.[k];
 const identities=[...contexts.values()].map(c=>text(get(get(c,'entity'),'identifier')));
 if(!identities.some(id=>Number(id)===Number(company.cik)))throw Error('XBRL_ISSUER_MISMATCH');
 return inputs.map(input=>{
  const candidates=list(root['us-gaap:'+input.tag]);
  const matches=candidates.filter(f=>{
   const c=contexts.get(f['@_contextRef']),entity=get(c,'entity'),period=get(c,'period');
   return c&&Number(text(get(entity,'identifier')))===Number(company.cik)&&!get(entity,'segment')&&!get(c,'scenario')&&text(get(period,'startDate'))===input.start&&text(get(period,'endDate'))===input.end&&units.get(f['@_unitRef'])==='iso4217:USD'&&/^-?\d+(?:\.\d+)?$/.test(String(text(f)))&&Number(text(f))===input.value&&f['@_xsi:nil']!=='true';
  });
  return {...input,status:matches.length?'VERIFIED':'INSUFFICIENT_DATA',scope:matches.length?'CONSOLIDATED':'UNKNOWN',contextIds:matches.map(f=>f['@_contextRef']),decimals:[...new Set(matches.map(f=>f['@_decimals']).filter(x=>x!==undefined))],reason:matches.length?'ENTITY_WIDE_UNDIMENSIONED_US_GAAP_FACT_MATCH':'EXACT_ENTITY_WIDE_FACT_REQUIRED'};
 });
}
export function applySecScopeReviews(history,reviews,companyId,asOf){
 const copy=structuredClone(history);
 for(const metric of Object.values(copy?.metrics||{}))for(const frame of metric.frames||[]){
  const matched=(frame.inputs||[]).every(input=>reviews.some(r=>r.companyId===companyId&&r.documentId===input.documentId&&r.sourceUrl?.startsWith(`https://www.sec.gov/Archives/edgar/data/${Number(currentCompany(companyId).cik)}/${input.documentId.replaceAll('-','')}/`)&&r.statementSourceUrl===`https://www.sec.gov/Archives/edgar/data/${Number(currentCompany(companyId).cik)}/${input.documentId.replaceAll('-','')}/FilingSummary.xml`&&['VERIFIED','PARTIAL'].includes(r.status)&&((r.statementScope?.status==='VERIFIED'&&/^[a-f\d]{64}$/.test(r.statementSourceHash||''))||(r.consolidationPolicyProof?.status==='VERIFIED'&&r.consolidationPolicyProof.sourceHash===r.sourceHash&&r.consolidationPolicyProof.sourceUrl===r.sourceUrl&&Date.parse(r.consolidationPolicyProof.checkedAt)<=Date.parse(asOf)))&&/^[a-f\d]{64}$/.test(r.sourceHash||'')&&Date.parse(r.scopeCheckedAt||r.checkedAt)<=Date.parse(asOf)&&r.matches?.some(m=>m.status==='VERIFIED'&&m.scope==='CONSOLIDATED'&&m.tag===input.tag&&m.start===input.start&&m.end===input.end&&m.value===input.value)));
  frame.scopeSources=matched?reviews.filter(r=>r.companyId===companyId&&frame.documentIds?.includes(r.documentId)).flatMap(r=>[r.sourceUrl,r.statementSourceUrl]):[];frame.scopeVerified=!!frame.inputs?.length&&matched;frame.scope=frame.scopeVerified?'CONSOLIDATED':'UNKNOWN';
 }
 return copy;
}
export const xbrlHash=raw=>createHash('sha256').update(raw).digest('hex');
export function reviewConsolidatedSummary(xml){
 const reports=list(parser.parse(xml)?.FilingSummary?.MyReports?.Report);
 const names=reports.map(r=>String(r.ShortName||''));
 const operations=names.find(n=>/CONSOLIDATED/i.test(n)&&/STATEMENTS? OF (?:OPERATIONS|INCOME|EARNINGS)/i.test(n));
 const cashFlow=names.find(n=>/CONSOLIDATED/i.test(n)&&/CASH FLOWS?/i.test(n));
 return {status:operations&&cashFlow?'VERIFIED':'INSUFFICIENT_DATA',statementTitles:[operations,cashFlow].filter(Boolean)};
}
export function extractCoverShares(xml,company){
 const parsed=parser.parse(xml),root=parsed['xbrli:xbrl']||parsed.xbrl;
 const contexts=new Map(list(root?.['xbrli:context']||root?.context).map(c=>[c['@_id'],c]));
 const units=new Map(list(root?.['xbrli:unit']||root?.unit).map(u=>[u['@_id'],text(u['xbrli:measure']||u.measure)]));
 return list(root?.['dei:EntityCommonStockSharesOutstanding']).flatMap(f=>{const c=contexts.get(f['@_contextRef']),entity=c?.['xbrli:entity']||c?.entity,period=c?.['xbrli:period']||c?.period,id=text(entity?.['xbrli:identifier']||entity?.identifier),date=text(period?.['xbrli:instant']||period?.instant),count=Number(text(f));return Number(id)===Number(company.cik)&&['shares','xbrli:shares'].includes(units.get(f['@_unitRef']))&&validDay(date)&&Number.isSafeInteger(count)&&count>0?[{asOfDate:date,count,definition:'OUTSTANDING_NOT_ISSUED',shareClass:'UNVERIFIED',contextId:f['@_contextRef'],unit:'SHARES',reportedDecimals:f['@_decimals']??null,precisionVerified:f['@_decimals']==='INF'}]:[];});
}
export function reviewConsolidationPolicy(xml,company){
 const parsed=parser.parse(xml),root=parsed['xbrli:xbrl']||parsed.xbrl;
 const nodes=list(root?.['us-gaap:ConsolidationPolicyTextBlock']);
 const name=String(company.companyName).replace(/[.]/g,'').toLowerCase();
 for(const node of nodes){const body=String(text(node)||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').replace(/[.]/g,'').toLowerCase();if(body.includes('consolidated financial statements include the accounts of '+name+' and its subsidiaries')&&body.includes('intercompany transactions and balances have been eliminated'))return {status:'VERIFIED',basis:'EXPLICIT_ENTITY_AND_SUBSIDIARIES_POLICY',tag:'us-gaap:ConsolidationPolicyTextBlock'};}
 return {status:'INSUFFICIENT_DATA',basis:'EXPLICIT_POLICY_REQUIRED'};
}
// Issued shares and treasury shares are distinct observations, never interchangeable
// with the DEI outstanding count. Only unsegmented issuer instant contexts qualify.
export function extractCapitalShareRecords(xml,company){
 const parsed=parser.parse(xml),root=parsed['xbrli:xbrl']||parsed.xbrl;
 const contexts=new Map(list(root?.['xbrli:context']||root?.context).map(c=>[c['@_id'],c]));
 const units=new Map(list(root?.['xbrli:unit']||root?.unit).map(u=>[u['@_id'],text(u['xbrli:measure']||u.measure)]));
 return [['us-gaap:CommonStockSharesIssued','ISSUED'],['us-gaap:TreasuryStockShares','TREASURY'],['us-gaap:CommonStockSharesOutstanding','OUTSTANDING']].flatMap(([tag,definition])=>list(root?.[tag]).flatMap(f=>{
  const c=contexts.get(f['@_contextRef']),e=c?.['xbrli:entity']||c?.entity,p=c?.['xbrli:period']||c?.period,date=text(p?.['xbrli:instant']||p?.instant),count=Number(text(f)),decimals=f['@_decimals']??null;
  if(Number(text(e?.['xbrli:identifier']||e?.identifier))!==Number(company.cik)||e?.['xbrli:segment']||e?.segment||c?.['xbrli:scenario']||c?.scenario||!['shares','xbrli:shares'].includes(units.get(f['@_unitRef']))||!validDay(date)||!/^\d+$/.test(String(text(f)??''))||!Number.isSafeInteger(count)||count<0||(definition!=='TREASURY'&&count===0)||['true','1'].includes(f['@_xsi:nil']))return [];
  return [{tag,definition,shareClass:tag.includes('CommonStock')?'COMMON_TAG_SCOPE_NOT_ALL_CLASSES':'UNVERIFIED',count,asOfDate:date,unit:'SHARES',contextId:f['@_contextRef'],reportedDecimals:decimals,precisionVerified:decimals==='INF',reviewStatus:'OBSERVED_NOT_RECONCILED'}];
 }));
}
// Period totals are reported capital actions, not dated individual transactions.
export function extractShareCapitalFlows(xml,company){
 const parsed=parser.parse(xml),root=parsed['xbrli:xbrl']||parsed.xbrl;
 const contexts=new Map(list(root?.['xbrli:context']||root?.context).map(c=>[c['@_id'],c]));
 const units=new Map(list(root?.['xbrli:unit']||root?.unit).map(u=>[u['@_id'],text(u['xbrli:measure']||u.measure)]));
 return [['StockRepurchasedAndRetiredDuringPeriodShares','REPURCHASED_AND_RETIRED','SHARES'],['PaymentsForRepurchaseOfCommonStock','REPURCHASE_CASH_PAYMENT','USD']].flatMap(([tag,type,unit])=>list(root?.['us-gaap:'+tag]).flatMap(f=>{
  const c=contexts.get(f['@_contextRef']),e=c?.['xbrli:entity']||c?.entity,p=c?.['xbrli:period']||c?.period,start=text(p?.['xbrli:startDate']||p?.startDate),end=text(p?.['xbrli:endDate']||p?.endDate),value=Number(text(f)),measure=units.get(f['@_unitRef']);
  if(Number(text(e?.['xbrli:identifier']||e?.identifier))!==Number(company.cik)||e?.['xbrli:segment']||e?.segment||c?.['xbrli:scenario']||c?.scenario||!validDay(start)||!validDay(end)||start>end||!/^\d+$/.test(String(text(f)??''))||!Number.isSafeInteger(value)||value<0||['true','1'].includes(f['@_xsi:nil'])||!(unit==='SHARES'?['shares','xbrli:shares']:['iso4217:USD','USD']).includes(measure))return [];
  return [{tag:'us-gaap:'+tag,type,value,unit,periodStart:start,periodEnd:end,contextId:f['@_contextRef'],reportedDecimals:f['@_decimals']??null,effectiveDate:null,transactionDate:null,reviewStatus:'REPORTED_PERIOD_TOTAL',bridgeEligible:false}];
 }));
}
