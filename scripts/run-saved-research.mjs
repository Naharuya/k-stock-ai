import {createInfluenceResearchService} from '../src/v2/influence_service.js';
import {createResearchAutomation,savedResearchInputRevision} from '../src/v2/research_automation.js';
const env={...process.env,KSTOCK_BROKER_ENABLED:'false',KSTOCK_LIVE_TRADING_ENABLED:'false',KSTOCK_RESEARCH_COLLECTION_ENABLED:'false',KSTOCK_AI_MODE:'mock'};
const service=createInfluenceResearchService({env});
const worker=createResearchAutomation({env,loadResearch:()=>service.load(),inputRevision:()=>savedResearchInputRevision('data/v2/influence')});
const result=await worker.run();
console.log(JSON.stringify({kind:'SAVED_RESEARCH_RECEIPT',status:result.status||'UNKNOWN',reason:result.reason||null,externalRequests:result.externalRequests??0,newOfficialDocuments:0,liveTrading:false,recommendation:'HOLD'}));
if(['FAILED','BLOCKED'].includes(result.status))process.exitCode=1;
