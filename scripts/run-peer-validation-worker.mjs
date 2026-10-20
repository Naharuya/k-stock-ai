import { runPeerValidationWorker } from '../src/v2/peer_validation_worker.js';
const result=await runPeerValidationWorker();console.log(JSON.stringify({skipped:result.skipped,reason:result.reason,counts:result.state?.counts,metricEligibility:result.state?.metricEligibility,externalRequests:0}));
