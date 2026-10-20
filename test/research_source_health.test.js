import test from 'node:test';
import assert from 'node:assert/strict';
import {observeSourceRequest,sourceHealthView,collectedToday} from '../src/v2/research_source_health.js';
const at='2026-10-13T00:00:00Z';
const permission={sourceName:'SEC',autoCollectionEnabled:true,status:'APPROVED_READ_ONLY',rateLimit:{periodMs:86400000}};
test('source health preserves failures across restart and separates rate limit authentication and recovery',()=>{
 let ledger={statisticsSince:at,sources:{}};
 observeSourceRequest(ledger,'SEC',{at,httpStatus:429});
 ledger=JSON.parse(JSON.stringify(ledger));
 observeSourceRequest(ledger,'SEC',{at,httpStatus:401});
 assert.equal(ledger.sources.SEC.consecutiveFailures,2);
 assert.equal(ledger.sources.SEC.authenticationStatus,'AUTH_BLOCKED');
 observeSourceRequest(ledger,'SEC',{at,httpStatus:200});
 assert.equal(ledger.sources.SEC.consecutiveFailures,0);
 assert.equal(ledger.sources.SEC.failureCount,2);
 assert.equal(ledger.sources.SEC.successCount,1);
 assert.equal(ledger.sources.SEC.authenticationStatus,'ACCESS_CONFIRMED');
 assert.equal(ledger.sources.SEC.rateLimitStatus,'WITHIN_LIMIT');
});
test('health schedule exposes slot boundary while disabled and authentication-blocked sources have no scheduled query',()=>{
 const ledger={statisticsSince:at,sources:{}};
 const view=sourceHealthView(permission,ledger,at);
 assert.equal(view.nextRunAt,'2026-10-14T00:00:00.000Z');
 assert.equal(view.lastAttemptAt,null);
 assert.equal(view.successCount,0);
 assert.equal(sourceHealthView({...permission,autoCollectionEnabled:false,status:'AUTH_BLOCKED'},ledger,at).nextRunAt,null);
});
test('today counts only newly verified original documents with Korean civil date and does not count amendments twice',()=>{
 const ledger={documents:[{documentId:'a',firstCollectedAt:'2026-10-12T15:01:00Z'},{documentId:'b',firstCollectedAt:'2026-10-12T14:59:00Z'}]};
 assert.equal(collectedToday(ledger,at),1);
 assert.equal(collectedToday(ledger,'2026-10-14T00:00:00Z'),0);
});
test('legacy cached archive timestamps are preserved separately and never promoted to observed HTTP success',()=>{
 const view=sourceHealthView({...permission,lastSuccessAt:at},{statisticsSince:at,sources:{}},at);
 assert.equal(view.lastSuccessAt,null);assert.equal(view.lastArchivedAt,at);assert.equal(view.successCount,0);
});
