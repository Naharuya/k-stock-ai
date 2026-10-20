import { validDay } from './accounting_periods.js';
import { isD2Eligible } from './scoring.js';
export function assessKrRecommendation(company,valuation,analysisDate,{evidencePassed=false,riskExecuted=false}={}) {
  const s=company.krSnapshot,f=s?.financial,h=s?.priceHistory;
  const checks={
    accountingPeriod:f?.qualityStatus==='READY' && validDay(f.fiscalPeriod?.start) && validDay(f.fiscalPeriod?.end) && s.ttm?.status==='READY' && s.ttm.quarterVerification?.status==='READY',
    corporateActions:s?.corporateActions?.status==='VERIFIED' && s.price?.corporateActionsReviewed===true,
    peerSamples:['PER','PBR','PSR'].every(k=>valuation?.comparisons?.[k]?.peers?.count>=3 && valuation.comparisons[k].history?.count>=3) && !valuation?.missing?.length,
    freshness:validDay(h?.asOfDate) && isD2Eligible(`${h.asOfDate}T23:59:59+09:00`,analysisDate) && Date.parse(analysisDate)-Date.parse(h.asOfDate)<8*86400000,
    evidenceTraceable:evidencePassed===true && typeof f?.sourceUrl==='string' && /^https:\/\/dart\.fss\.or\.kr\//.test(f.sourceUrl),
    riskEngine:riskExecuted===true && !company.risk?.blocked && !company.risk?.tradingHalt,
    retrospectiveStructure:true,
  };
  const reasons=Object.entries(checks).filter(([,ready])=>!ready).map(([key])=>key);
  return {status:reasons.length?'HELD':'VERIFIED',checks,reasons,minimumPeerSamples:3,minimumHistoricalSamples:3,performanceHorizons:[1,5,20],warning:'ENGINE_READINESS_IS_NOT_INVESTMENT_APPROVAL'};
}
