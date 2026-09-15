import "dotenv/config";
import { runScreener } from "./services/screener_service.js";
try {
  const r=await runScreener({exchange:"all",top:20,enrich:0,refresh:true});
  const ok=r.ok===true && r.scanned>200 && r.eligible>0 && Array.isArray(r.top) && r.top.length>0;
  console.log(JSON.stringify({ok,universe:r.universe,scanned:r.scanned,eligible:r.eligible,excludedHardRisk:r.excludedHardRisk,diagnostics:r.diagnostics,enriched:r.enriched,top:r.top.slice(0,10).map(x=>({code:x.code,name:x.name,exchange:x.exchange,score:x.score,roe:x.roe,industryLarge:x.industryLarge,marketWarning:x.marketWarning,marketWarningRaw:x.marketWarningRaw}))},null,2));
  if(!ok) process.exitCode=1;
} catch(e){ console.error(JSON.stringify({ok:false,error:e.message},null,2)); process.exitCode=1; }
