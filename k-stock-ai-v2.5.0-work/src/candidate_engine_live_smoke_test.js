import "dotenv/config";
import { runDailyCandidateEngine } from "./services/candidate_engine_service.js";

try {
  const result = await runDailyCandidateEngine({
    exchange: "all",
    top: 20,
    candidatePool: 40,
    quoteLimit: 10,
    deepLimit: 0,
    businessYear: String(new Date().getFullYear())
  });
  console.log(JSON.stringify({
    ok: result.ok,
    date: result.date,
    label: result.label,
    recommendation: result.recommendation,
    pipeline: result.pipeline,
    top: result.top.slice(0,20).map(x=>({code:x.code,name:x.name,score:x.finalScore,state:x.finalState,level:x.validationLevel,roe:x.roe,per:x.quote?.per??null,pbr:x.quote?.pbr??null,flags:x.quality.flags,tags:x.styleTags}))
  },null,2));
  if(!result.ok || result.pipeline.quoteValidated <= 0) process.exitCode=1;
} catch (error) {
  console.error(JSON.stringify({ok:false,error:error.message},null,2));
  process.exitCode=1;
}
