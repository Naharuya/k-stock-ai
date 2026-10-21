import {newsLink} from './news_digest.js';
import {validMoverSnapshot} from './mover_schema.js';
// Public instruments only. Ranking observations do not establish trade recommendations.
export function createMarketDiscovery({workspace,movers,news,activity,now=()=>Date.now(),wait=ms=>new Promise(r=>setTimeout(r,ms))}){
 const jobs=new Map();let serial=Promise.resolve();
 const id=i=>`${i.market}:${i.exchange}:${i.symbol}`;
 async function opportunities(market){
  const source=await movers.get(market),at=now();
  const fresh=source.dataStatus==='OBSERVED'&&validMoverSnapshot(source,market,at)&&at-Date.parse(source.receivedAt)<600000;
  let activityData={status:'UNAVAILABLE',items:[],sources:[],refreshing:false};if(activity)try{activityData=await activity.get(market);}catch{}
  const pool=fresh?[...source.gainers.map(i=>({...i,direction:'UP'})),...source.losers.map(i=>({...i,direction:'DOWN'}))]:[];
  const groups=[pool.filter(i=>i.direction==='UP'),pool.filter(i=>i.direction==='DOWN'),activityData.items.filter(i=>i.kind==='TURNOVER').sort((a,b)=>b.turnover-a.turnover),activityData.items.filter(i=>i.kind==='VOLUME_GROWTH').sort((a,b)=>b.volumeGrowth-a.volumeGrowth)];
  const merged=new Map();for(let n=0;n<20;n++)for(const g of groups){const i=g[n];if(!i)continue;const reason=i.kind|| (i.direction==='UP'?'TODAY_GAINER':'TODAY_LOSER');if(merged.has(id(i))){const existing=merged.get(id(i));if(!existing.reasons.includes(reason))existing.reasons.push(reason);if(i.kind){existing.turnover=i.turnover??existing.turnover;existing.volumeGrowth=i.volumeGrowth??existing.volumeGrowth;if(i.kind==='VOLUME_GROWTH')existing.growthBasis=i.basis;}}else if(merged.size<20)merged.set(id(i),{...i,reasons:[reason],receivedAt:i.receivedAt||source.receivedAt});}
  const unique=[...merged.values()],sourceTime=unique.length?Math.min(...unique.map(i=>Date.parse(i.receivedAt))):at;

  let job=jobs.get(market);
  if(unique.length&&!activityData.refreshing&&(!job||!job.running&&at-job.startedAt>=600000)){
   job={running:true,startedAt:at,checked:0,total:unique.length};jobs.set(market,job);
   const task=serial.then(async()=>{for(const i of unique){await wait(2200);if(now()-sourceTime>=600000)break;try{await workspace.detail(i);}catch{}job.checked++;}}).finally(()=>{job.running=false;});
   serial=task.catch(()=>{});
  }
  let digest;try{digest=await news.get();}catch{digest={items:[],stale:true};}
  const candidates=[];
  for(const i of unique){
   const d=await workspace.detail(i,{storedOnly:true});
   const relatedNews=(digest.stale?[]:digest.items||[]).filter(n=>((n.instruments||[]).some(x=>id(x)===id(i))||(i.name.length>=3&&new RegExp('(?:^|[^\\p{L}\\p{N}])'+i.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:$|[^\\p{L}\\p{N}])','iu').test(n.title)))&&newsLink(n.url)).slice(0,3).map(n=>({title:n.title,url:n.url,publishedAt:n.publishedAt,eventDate:null}));
   candidates.push({instrument:{market:i.market,symbol:i.symbol,exchange:i.exchange,currency:i.currency,name:i.name},quote:d.quote,receivedAt:d.history?.receivedAt||null,strategy:d.strategy,selection:{reason:i.reasons[0],reasons:i.reasons,changePct:i.changePct,volume:i.volume,turnover:i.turnover??null,volumeGrowth:i.volumeGrowth??null,growthBasis:i.growthBasis||i.basis||null,receivedAt:i.receivedAt},relatedNews});
  }
  const rank={BUY_CONDITION_MET:0,WAIT:1,DATA_UNAVAILABLE:2};
  candidates.sort((a,b)=>(rank[a.strategy.action]??3)-(rank[b.strategy.action]??3)||Math.abs(b.selection.changePct)-Math.abs(a.selection.changePct));
  const universe=await workspace.instruments({market}),ready=candidates.filter(c=>c.strategy.action!=='DATA_UNAVAILABLE').length;
  return {market,asOf:new Date(at).toISOString(),scope:'CURRENT_MOVERS_DAILY_CLOSE_CONDITIONS',sourceStatus:fresh?'OBSERVED':source.dataStatus==='OBSERVED'?'UNVERIFIED':source.dataStatus,sourceReceivedAt:source.receivedAt||null,activityStatus:activityData.status,activitySources:activityData.sources,activityRefreshing:activityData.refreshing,discovery:{running:!!job?.running,checked:job?.checked||0,total:job?.total||0},evaluated:candidates.length,strategyReady:ready,needsRefresh:candidates.length-ready,coverageUniverse:universe.universeSecurities,notEvaluated:Math.max(0,universe.universeSecurities-candidates.length),scannedFiles:0,excluded:{stale:0,invalid:0},reasonCounts:{},buyConditions:candidates.filter(c=>c.strategy.action==='BUY_CONDITION_MET').length,candidates,newsStatus:digest.stale?'STALE_OR_UNAVAILABLE':digest.status,limitations:['RANKING_FIRST_PAGES_NOT_FULL_MARKET','PROVIDER_FIRST_PAGE_ACTIVITY_NOT_FULL_MARKET','DAILY_CLOSE_NOT_INTRADAY','NEWS_NOT_PRICE_CAUSALITY'],recommendationStatus:'HOLD',orderExecution:false};
 }
 return {...workspace,opportunities};
}
