import {readFile,writeFile}from 'node:fs/promises';
import {verifyCancellationEvidence,verifyCancellationBaseline}from '../src/v2/cancellation_evidence.js';
if(process.cwd()!=='/Users/ari/ARI/projects/k-stock-ai')throw Error('LOCAL_SCOPE_REQUIRED');
const review=verifyCancellationEvidence(JSON.parse(await readFile('data/v2/verification/db-cancellation-input.json','utf8')));
await writeFile('data/v2/verification/db-cancellation-review.json',JSON.stringify(review,null,2),{mode:0o600});
console.log(JSON.stringify({status:review.verificationStatus,effectiveDate:review.effectiveDate,reasons:review.reasons,externalRequests:0}));

const baseline=JSON.parse(await readFile('data/v2/verification/db-cancellation-baseline-input.json','utf8'));const inclusion=verifyCancellationBaseline({cancellation:review,baseline,valuationDate:'2026-10-08'});await writeFile('data/v2/verification/db-cancellation-baseline-review.json',JSON.stringify(inclusion,null,2),{mode:0o600});console.log(JSON.stringify({baselineInclusion:inclusion.verificationStatus,included:inclusion.includedInBaseline,externalRequests:0}));
