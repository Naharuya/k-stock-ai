import "dotenv/config";
import { loadStockUniverse } from "./services/stock_master_service.js";
try {
  const u = await loadStockUniverse({ refresh: true });
  const kospi=u.status?.kospi?.count||0, kosdaq=u.status?.kosdaq?.count||0;
  const ok=kospi>100 && kosdaq>100 && u.total===kospi+kosdaq;
  console.log(JSON.stringify({ok,source:u.source,total:u.total,kospi:u.status.kospi,kosdaq:u.status.kosdaq,errors:u.errors||[]},null,2));
  if(!ok) process.exitCode=1;
} catch(e){ console.error(JSON.stringify({ok:false,error:e.message},null,2)); process.exitCode=1; }
