// Read-only projection of saved run receipts. No fabricated execution or test status.
export function buildResearchRunReport(state={}) {
 const date=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))?v:null;
 const jobs=Array.isArray(state.jobs)?state.jobs:[];
 const counts={running:0,verified:0,partial:0,blocked:0,queued:0,unknown:0};
 const keys={RUNNING:'running',VERIFIED:'verified',PARTIAL:'partial',BLOCKED:'blocked',QUEUED:'queued'};
 for(const job of jobs)counts[keys[job.status]||'unknown']++;
 return {kind:'SAVED_EVIDENCE_REVIEW',lastCompletedAt:date(state.lastRunAt),lastCheckedAt:date(state.lastCheckedAt),startedAt:date(state.startedAt),retryAt:date(state.retryAt),failureReason:['BLOCKED','RETRY_PENDING','RECOVERY_PENDING'].includes(state.status)&&['TEMPORARY_RESEARCH_INPUT_ERROR','RESEARCH_INPUT_UNAVAILABLE','RESEARCH_PROCESSING_UNAVAILABLE'].includes(state.failureReason)?state.failureReason:null,counts,recentRuns:(Array.isArray(state.history)?state.history:[]).slice(-5).reverse().filter(r=>date(r.at)).map(r=>({completedAt:r.at,independentEvents:Number.isInteger(r.summary?.researchEvents)?r.summary.researchEvents:null,conservativeSamples:Number.isInteger(r.summary?.conservativeSamples)?r.summary.conservativeSamples:null})),testExecution:'NOT_RUN_BY_WORKER',recommendationStatus:'HOLD'};
}
