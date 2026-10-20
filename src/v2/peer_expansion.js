import { annualMultiples } from './kr_valuation.js';

export const PEER_MINIMUM = 3;
const officialHosts = new Set(['www.samsung.com', 'www.skhynix.com', 'www.micron.com', 'www.tsmc.com', 'www.umc.com']);
function verifiedBusiness(proof, analysisDate) {
  try {
    const url = new URL(proof?.sourceUrl);
    return proof?.verified === true && officialHosts.has(url.hostname) && url.protocol === 'https:'
      && !url.username && !url.password && Number.isFinite(Date.parse(proof.reviewedAt))
      && Date.parse(proof.reviewedAt) <= Date.parse(analysisDate) && typeof proof.summary === 'string';
  } catch { return false; }
}
// Investigation candidates are never inserted into the recommendation universe.
// A product overlap alone cannot establish comparable consolidated earnings.
export function buildPeerExpansionReview(target, candidates, analysisDate) {
  if (!Array.isArray(candidates) || candidates.length > 30 || !Number.isFinite(Date.parse(analysisDate))) throw new Error('PEER_REVIEW_SCOPE_INVALID');
  const seen = new Set([target.ticker]);
  const rows = candidates.map(candidate => {
    const reasons = [];
    let status;
    if (!candidate?.ticker || seen.has(candidate.ticker)) reasons.push('DUPLICATE_OR_SELF');
    seen.add(candidate?.ticker);
    if (candidate?.market !== target.market) reasons.push('MARKET_OR_CURRENCY_SCOPE_MISMATCH');
    if (candidate?.industryCode !== target.industryCode) reasons.push('INDUSTRY_MISMATCH');
    const businessVerified = verifiedBusiness(candidate?.businessEvidence, analysisDate);
    if (!businessVerified) reasons.push('BUSINESS_SOURCE_PENDING');
    if (!candidate?.businessComparability?.verified || candidate.businessComparability.targetTicker !== target.ticker
      || candidate.businessComparability.scope !== 'CONSOLIDATED_COMPANY') reasons.push('CONSOLIDATED_BUSINESS_COMPARABILITY_PENDING');
    const f = candidate?.krSnapshot?.financial, p = candidate?.krSnapshot?.price;
    const tf = target.krSnapshot?.financial, tp = target.krSnapshot?.price;
    if (!f || !p) reasons.push('FINANCIAL_AND_DATED_SHARE_INPUTS_MISSING');
    else {
      if (f.currency !== tf?.currency || p.currency !== tp?.currency || f.unit !== tf?.unit
        || f.fiscalPeriod?.basis !== tf?.fiscalPeriod?.basis || f.fiscalPeriod?.start !== tf?.fiscalPeriod?.start
        || f.fiscalPeriod?.end !== tf?.fiscalPeriod?.end || p.asOfDate !== tp?.asOfDate) reasons.push('PERIOD_CURRENCY_UNIT_OR_BASIS_MISMATCH');
      reasons.push(...annualMultiples(candidate.krSnapshot, analysisDate).issues);
    }
    const multiple = annualMultiples(candidate?.krSnapshot, analysisDate);
    if (!reasons.length && (multiple.metrics.PER === null || multiple.metrics.PBR === null || multiple.metrics.PSR === null)) reasons.push('NON_POSITIVE_OR_MISSING_DENOMINATOR');
    if (!reasons.length && (multiple.metrics.PER > 500 || multiple.metrics.PBR > 100 || multiple.metrics.PSR > 100)) reasons.push('EXTREME_MULTIPLE_REVIEW');
    if (reasons.some(x => ['DUPLICATE_OR_SELF','MARKET_OR_CURRENCY_SCOPE_MISMATCH','INDUSTRY_MISMATCH','PERIOD_CURRENCY_UNIT_OR_BASIS_MISMATCH','EXTREME_MULTIPLE_REVIEW'].includes(x))) status = 'EXCLUDED';
    else if (reasons.includes('FINANCIAL_AND_DATED_SHARE_INPUTS_MISSING') || reasons.includes('NON_POSITIVE_OR_MISSING_DENOMINATOR')) status = 'INSUFFICIENT_DATA';
    else status = reasons.length ? 'PENDING_VERIFICATION' : 'ELIGIBLE';
    return { ticker:candidate?.ticker, companyName:candidate?.companyName, market:candidate?.market, status,
      reasons:[...new Set(reasons)], businessEvidence:businessVerified ? candidate.businessEvidence : null,
      semiconductorRevenueShare:null, semiconductorRevenueShareStatus:'INSUFFICIENT_DATA',
      asOfDate:p?.asOfDate || null, statementBasis:f?.fiscalPeriod?.basis || null,
      fiscalPeriod:f?.fiscalPeriod || null, currency:f?.currency || null, unit:f?.unit || null,
      metrics:status === 'ELIGIBLE' ? multiple.metrics : {PER:null,PBR:null,PSR:null,EV_EBITDA:null} };
  });
  const counts = Object.fromEntries(['ELIGIBLE','EXCLUDED','PENDING_VERIFICATION','INSUFFICIENT_DATA'].map(status => [status, rows.filter(x=>x.status===status).length]));
  return { status:counts.ELIGIBLE >= PEER_MINIMUM ? 'REFERENCE_ONLY' : 'INSUFFICIENT_DATA', minimum:PEER_MINIMUM,
    candidateCount:rows.length, counts, candidates:rows, reviewedAt:analysisDate, rankingEligible:false,
    policy:'EXISTING_KR_CONSOLIDATED_SCOPE_NO_FX_OR_SEGMENT_NORMALIZATION',
    warning:'PRODUCT_OVERLAP_IS_NOT_CONSOLIDATED_BUSINESS_COMPARABILITY' };
}
