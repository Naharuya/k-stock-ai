/** Network observations only; historical successes are not reconstructed. */
export function observeSourceRequest(ledger,sourceName,{at,httpStatus=null,error=false}={}){
 const old=ledger.sources[sourceName]||{sourceName,successCount:0,failureCount:0,consecutiveFailures:0,lastSuccessAt:null,lastNewDocumentAt:null};
 const ok=!error&&Number.isInteger(httpStatus)&&httpStatus>=200&&httpStatus<300;
 ledger.sources[sourceName]={...old,lastAttemptAt:at,lastSuccessAt:ok?at:old.lastSuccessAt,successCount:old.successCount+Number(ok),failureCount:old.failureCount+Number(!ok),consecutiveFailures:ok?0:old.consecutiveFailures+1,rateLimitStatus:httpStatus===429?'RATE_LIMITED':ok?'WITHIN_LIMIT':old.rateLimitStatus||'UNKNOWN',authenticationStatus:[401,403].includes(httpStatus)?'AUTH_BLOCKED':ok?'ACCESS_CONFIRMED':old.authenticationStatus||'UNKNOWN'};
}
export function sourceHealthView(permission,ledger,at){
 const s=ledger.sources?.[permission.sourceName]||{};const period=permission.rateLimit.periodMs;
 const next=permission.autoCollectionEnabled?new Date((Math.floor(Date.parse(at)/period)+1)*period).toISOString():null;
 return {...permission,enabled:permission.autoCollectionEnabled,statisticsSince:ledger.statisticsSince||null,lastAttemptAt:s.lastAttemptAt||null,lastSuccessAt:s.lastSuccessAt||null,lastArchivedAt:permission.lastSuccessAt||null,lastNewDocumentAt:s.lastNewDocumentAt||null,nextRunAt:next,nextRunPolicy:'SOURCE_SLOT_CHECK_SUBJECT_TO_CACHE_BACKOFF_AND_SCHEDULER',successCount:s.successCount||0,failureCount:s.failureCount||0,consecutiveFailures:s.consecutiveFailures||0,rateLimitStatus:s.rateLimitStatus||'NOT_OBSERVED',authenticationStatus:permission.status==='AUTH_BLOCKED'?'AUTH_BLOCKED':s.authenticationStatus||'NOT_OBSERVED',counterScope:'HTTP_REQUESTS_SINCE_STATISTICS_START; NOT_DOCUMENT_VALIDATION'};
}
export function collectedToday(ledger,at){
 const day=x=>new Date(Date.parse(x)+9*3600000).toISOString().slice(0,10);
 return (ledger.documents||[]).filter(d=>day(d.firstCollectedAt)===day(at)).length;
}
