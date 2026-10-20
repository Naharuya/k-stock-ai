import {extractSecRiskNotes} from './sec_risk_notes.js';
import {currentCompany} from './current_universe.js';
import {extractCoverShares,extractCapitalShareRecords,extractShareCapitalFlows,xbrlHash} from './sec_xbrl_scope.js';
export function backfillSecCoverShares(review,raw,ticker,checkedAt){
 const company=currentCompany(ticker),base=`https://www.sec.gov/Archives/edgar/data/${Number(company.cik)}/${review?.documentId?.replaceAll('-','')}/`;
 if(review?.companyId!==ticker||!/^\d{10}-\d{2}-\d{6}$/.test(review.documentId||'')||!review.sourceUrl?.startsWith(base)||!/^[\w.-]+_htm\.xml$/.test(review.sourceUrl.slice(base.length))||!['VERIFIED','PARTIAL'].includes(review.status)||!Number.isFinite(Date.parse(checkedAt))||!Number.isFinite(Date.parse(review.checkedAt))||Date.parse(review.checkedAt)>Date.parse(checkedAt))throw Error('SHARE_BACKFILL_SOURCE_INVALID');
 if(Buffer.byteLength(raw)>15000000||!/^[a-f\d]{64}$/.test(review.sourceHash||'')||xbrlHash(raw)!==review.sourceHash)throw Error('SHARE_BACKFILL_HASH_CONFLICT');
 const records=extractCoverShares(raw,company).filter(r=>Date.parse(r.asOfDate)<=Date.parse(checkedAt));
 return {...review,shareRecords:records,capitalFlows:extractShareCapitalFlows(raw,company).filter(r=>Date.parse(r.periodEnd)<=Date.parse(checkedAt)),capitalShareRecords:extractCapitalShareRecords(raw,company).filter(r=>Date.parse(r.asOfDate)<=Date.parse(checkedAt)),riskNotes:extractSecRiskNotes(raw,company),riskNotesCheckedAt:checkedAt,sharesCheckedAt:checkedAt,shareBackfill:{status:'COMPLETED',checkedAt,sourceHash:review.sourceHash,records:records.length,scope:'OBSERVATION_ONLY_NOT_SAME_DATE_RECONCILIATION'}};
}
