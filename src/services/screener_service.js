import { loadStockUniverse } from "./stock_master_service.js";
import { getDomesticQuote } from "./kis_service.js";

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const finite=(x)=>Number.isFinite(Number(x));
const med=(xs)=>{const a=xs.filter(finite).map(Number).sort((x,y)=>x-y); if(!a.length)return null; const m=Math.floor(a.length/2); return a.length%2?a[m]:(a[m-1]+a[m])/2;};
function percentileRank(value, values){ if(!finite(value)) return null; const a=values.filter(finite).map(Number).sort((x,y)=>x-y); if(a.length<2)return 50; const le=a.filter(x=>x<=Number(value)).length; return Math.round(le/a.length*100); }
function hardRisk(s){ return Boolean(s.halted||s.management||s.liquidation||s.dishonestDisclosure||s.marketWarning); }
function masterBaseScore(s, universe){
  let profitability=0;
  if(finite(s.roe)){ const r=Number(s.roe); profitability += r>=20?25:r>=15?21:r>=10?17:r>=5?11:r>0?6:0; }
  if(finite(s.operatingProfit)&&s.operatingProfit>0) profitability+=3;
  if(finite(s.netIncome)&&s.netIncome>0) profitability+=2;
  profitability=clamp(profitability,0,30);
  let safety=20;
  if(s.lowLiquidity)safety-=4; if(s.warningPreNotice)safety-=5; if(hardRisk(s))safety=0;
  const capPct=percentileRank(s.marketCapEok,universe.map(x=>x.marketCapEok));
  const volPct=percentileRank(s.prevVolume,universe.map(x=>x.prevVolume));
  const sizeLiquidity=Math.round(((capPct??0)*0.6+(volPct??0)*0.4)*0.15);
  return {profitability,safety,sizeLiquidity};
}
function sectorRelative(s, peers){
  const roeMed=med(peers.map(x=>x.roe)); const capMed=med(peers.map(x=>x.marketCapEok)); let score=10; const notes=[];
  if(finite(s.roe)&&finite(roeMed)){ if(Number(s.roe)>roeMed){score+=6;notes.push("업종 ROE 중앙값 상회");} else {score-=4;notes.push("업종 ROE 중앙값 이하");} }
  if(finite(s.marketCapEok)&&finite(capMed)){ if(Number(s.marketCapEok)>capMed){score+=4;notes.push("업종 내 시가총액 상위권");} }
  return {score:clamp(score,0,20),roeMedian:roeMed,marketCapMedianEok:capMed,peerCount:peers.length,notes};
}
function liveScore(q){ let valuation=12, momentum=10, notes=[];
  if(finite(q.per)){ const p=Number(q.per); valuation += p>0&&p<=10?8:p<=20?5:p<=30?2:p>40?-5:0; }
  if(finite(q.pbr)){ const p=Number(q.pbr); valuation += p>0&&p<=1?5:p<=2?3:p>4?-3:0; }
  valuation=clamp(valuation,0,25);
  if(finite(q.changeRatePct)){ const c=Number(q.changeRatePct); momentum += c>=3?5:c>=1?3:c<=-3?-5:c<=-1?-3:0; }
  if(finite(q.price)&&finite(q.week52High)&&q.week52High>0){ const d=(q.price/q.week52High)*100; if(d>=90){momentum+=4;notes.push("52주 고점 근접");} else if(d<60){momentum-=3;notes.push("52주 고점 대비 큰 괴리");} }
  return {valuation:clamp(valuation,0,25),momentum:clamp(momentum,0,20),notes};
}
export async function runScreener({exchange="all",top=20,enrich=10,refresh=false}={}){
  const master=await loadStockUniverse({refresh});
  let stocks=master.stocks.filter(s=>exchange==="all"||s.exchange===exchange);
  const groups=new Map(); for(const s of stocks){const k=`${s.exchange}:${s.industryLarge||"unknown"}`; if(!groups.has(k))groups.set(k,[]); groups.get(k).push(s);}
  const mapped=stocks.map(s=>{const b=masterBaseScore(s,stocks);const peers=groups.get(`${s.exchange}:${s.industryLarge||"unknown"}`)||[];const rel=sectorRelative(s,peers);const pre=b.profitability+b.safety+b.sizeLiquidity+rel.score;return {...s,sectorRelative:rel,preScore:pre,hardRisk:hardRisk(s)};});
  const excludedHardRisk=mapped.filter(x=>x.hardRisk).length;
  let ranked=mapped.filter(x=>!x.hardRisk).sort((a,b)=>b.preScore-a.preScore);
  const enrichCount=Math.max(0,Math.min(Number(enrich)||0,30,ranked.length));
  for(let i=0;i<enrichCount;i++){
    try{ const q=await getDomesticQuote(ranked[i].code); const live=liveScore(q); ranked[i]={...ranked[i],quote:q,live,score:clamp(Math.round(ranked[i].preScore*0.55 + (live.valuation+live.momentum)*0.45),0,100),status:"ENRICHED"}; }
    catch(e){ ranked[i]={...ranked[i],score:ranked[i].preScore,status:"MASTER_ONLY",error:e.message}; }
  }
  ranked=ranked.map(x=>({...x,score:finite(x.score)?Math.round(x.score):Math.round(x.preScore)})).sort((a,b)=>b.score-a.score);
  const n=Math.max(1,Math.min(Number(top)||20,100));
  return {ok:ranked.length>0,source:["KIS_MASTER",enrichCount?"KIS_QUOTE":null].filter(Boolean),universe:{exchange,total:stocks.length,masterTotal:master.total,status:master.status},scanned:stocks.length,eligible:ranked.length,excludedHardRisk,enriched:enrichCount,diagnostics:{withRoe:stocks.filter(x=>finite(x.roe)).length,withMarketCap:stocks.filter(x=>finite(x.marketCapEok)).length,withPrevVolume:stocks.filter(x=>finite(x.prevVolume)).length,warningFlagged:stocks.filter(x=>x.marketWarning).length,halted:stocks.filter(x=>x.halted).length,management:stocks.filter(x=>x.management).length},top:ranked.slice(0,n),caveat:"전 종목 1차 스크리닝은 KIS 종목 마스터의 ROE·위험플래그·시가총액·거래량을 사용합니다. 상위 일부만 현재가 API로 PER/PBR/52주 위치를 보강합니다. 최종 투자판정은 개별 종목 정밀분석을 거쳐야 합니다."};
}

export function runScreenerOnSample(stocks){
  const groups=new Map(); for(const s of stocks){const k=`${s.exchange}:${s.industryLarge||"unknown"}`;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(s);} return stocks.map(s=>{const b=masterBaseScore(s,stocks);const rel=sectorRelative(s,groups.get(`${s.exchange}:${s.industryLarge||"unknown"}`));return {...s,sectorRelative:rel,score:b.profitability+b.safety+b.sizeLiquidity+rel.score};}).sort((a,b)=>b.score-a.score);
}
