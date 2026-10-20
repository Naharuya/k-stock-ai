import {CURRENT_UNIVERSE} from './current_universe.js';
import {validDay} from './accounting_periods.js';
export const RISK_DOMAINS=Object.freeze(['FINANCIAL','REGULATORY','GOVERNANCE','VALUATION','DATA_FRESHNESS']);
// Official notes are observations. A document's presence never means no risk exists.
export function reviewCurrentRisk({companyId,records=[],anchors=[],asOf,flags=[]}={}){
 const now=Date.parse(asOf),day=String(asOf).slice(0,10),start=Number.isFinite(now)?new Date(now-29*86400000).toISOString().slice(0,10):null,rejected=[];
 const company=CURRENT_UNIVERSE.find(c=>c.ticker===companyId);
 const domains=RISK_DOMAINS.map(domain=>{
  const candidates=records.filter(r=>r.companyId===companyId&&r.domain===domain);
  const valid=[];
  for(const r of candidates){
   const anchor=anchors.find(a=>a.companyId===companyId&&a.documentId===r.documentId&&a.sourceUrl===r.sourceUrl&&a.sourceHash===r.sourceHash&&['VERIFIED','PARTIAL'].includes(a.status));
   const proof=anchor&&company&&/^\d{10}-\d{2}-\d{6}$/.test(r.documentId||'')&&r.sourceUrl.startsWith(`https://www.sec.gov/Archives/edgar/data/${Number(company.cik)}/${r.documentId.replaceAll('-','')}/`)&&/^[a-f\d]{64}$/.test(r.sourceHash||'')&&Number.isFinite(Date.parse(anchor.checkedAt))&&Date.parse(anchor.checkedAt)<=Date.parse(r.reviewedAt);
   const timely=Number.isFinite(now)&&[r.availableAt,r.reviewedAt].every(t=>Number.isFinite(Date.parse(t)))&&Date.parse(r.availableAt)<=Date.parse(r.reviewedAt)&&Date.parse(r.reviewedAt)<=now&&now-Date.parse(r.reviewedAt)<86400000;
   const coverage=validDay(r.coverageFrom)&&validDay(r.coverageThrough)&&r.coverageFrom<=start&&r.coverageThrough===day;
   if(!proof||!timely||!coverage||r.reviewStatus!=='VERIFIED'||r.scope!=='COMPREHENSIVE_DOMAIN_REVIEW'||!Number.isFinite(r.severity)||r.severity<0||r.severity>100){rejected.push({domain,documentId:r.documentId||null,reason:!proof?'SOURCE_PROOF_REQUIRED':!timely?'FUTURE_OR_STALE_REVIEW':!coverage?'CURRENT_COVERAGE_REQUIRED':'DOMAIN_REVIEW_REQUIRED'});continue;}
   valid.push(r);
  }
  const latest=valid.sort((a,b)=>Date.parse(b.reviewedAt)-Date.parse(a.reviewedAt))[0];
  // Conflicting same-time results must be resolved before the domain is accepted.
  const unresolved=latest&&candidates.some(r=>Number.isFinite(Date.parse(r.reviewedAt))&&Date.parse(r.reviewedAt)<=now&&Date.parse(r.reviewedAt)>=Date.parse(latest.reviewedAt)&&!valid.includes(r));
  const conflict=latest&&valid.some(r=>r.reviewedAt===latest.reviewedAt&&r.severity!==latest.severity);
  return {domain,status:latest&&!conflict&&!unresolved?'VERIFIED':'INSUFFICIENT_DATA',severity:latest&&!conflict&&!unresolved?latest.severity:null,reviewedAt:latest&&!conflict&&!unresolved?latest.reviewedAt:null,sourceUrl:latest&&!conflict&&!unresolved?latest.sourceUrl:null,reason:unresolved?'LATEST_DOMAIN_REVIEW_UNRESOLVED':conflict?'CONFLICTING_DOMAIN_REVIEWS':latest?null:'CURRENT_SOURCE_BOUND_REVIEW_REQUIRED'};
 });
 const complete=domains.every(d=>d.status==='VERIFIED');
 const observations=anchors.filter(a=>a.companyId===companyId&&Number.isFinite(Date.parse(a.checkedAt))&&Date.parse(a.checkedAt)<=now&&Date.parse(a.riskNotesCheckedAt||a.checkedAt)<=now).flatMap(a=>(a.riskNotes||[]).filter(n=>validDay(n.periodEnd)&&n.periodEnd<=day).map(n=>({...n,documentId:a.documentId,sourceUrl:a.sourceUrl,sourceHash:a.sourceHash,scope:'OFFICIAL_NOTE_NOT_COMPREHENSIVE_REVIEW'})));
 const severity=complete?Math.max(...domains.map(d=>d.severity)):null;
 return {status:complete?'VERIFIED':'INSUFFICIENT_DATA',scope:complete?'SOURCE_BOUND_FIVE_DOMAIN_REVIEW':'FINANCIAL_SCREEN_ONLY',available:complete,comprehensiveRiskVerified:complete,severity,riskPenalty:complete?Math.round(severity*.15):null,domains,missingDomains:domains.filter(d=>d.status!=='VERIFIED').map(d=>d.domain),rejected,observations,flags:complete?flags.filter(f=>f!=='REGULATORY_GOVERNANCE_REVIEW_REQUIRED'):flags,criticalKnownRisk:flags.includes('NON_POSITIVE_EQUITY')};
}
