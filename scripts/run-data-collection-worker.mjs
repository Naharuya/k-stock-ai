import { runDataCollectionWorker } from '../src/v2/data_collection_worker.js';
// Deliberately no CLI switch that turns on external collection or modifies secrets.
const date=process.argv[2]||'2026-10-08';
const result=await runDataCollectionWorker({valuationDate:date});
console.log(JSON.stringify({enabled:result.state.enabled,mode:result.state.mode,counts:result.state.counts,externalRequests:result.externalRequests}));
