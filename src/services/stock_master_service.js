import {providerFetch,requestDelay} from './request_context.js';
import fs from "node:fs/promises";
import path from "node:path";

const MASTER_URLS = {
  kospi: "https://new.real.download.dws.co.kr/common/master/kospi_code.mst.zip",
  kosdaq: "https://new.real.download.dws.co.kr/common/master/kosdaq_code.mst.zip"
};

// 아래 상세 tail 스키마는 KIS 마스터의 부가 필드를 활용하기 위한 best-effort 파서다.
// 핵심 종목코드/종목명은 KIS 공식 backtester와 동일하게 0:9 / 21:61 고정 바이트를 사용한다.
const widths = {
  kospi: [2,1,4,4,4,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,9,5,5,1,1,1,2,1,1,1,2,2,2,3,1,3,12,12,8,15,21,2,7,1,1,1,1,9,9,9,5,9,8,9,3,1,1,1],
  kosdaq:[2,1,4,4,4,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,9,5,5,1,1,1,2,1,1,1,2,2,2,3,1,3,12,12,8,15,21,2,7,1,1,1,1,9,9,9,5,9,8,9,3,1,1,1]
};
const fields = {
  kospi:["securityGroup","marketCapSize","industryLarge","industryMedium","industrySmall","manufacturing","lowLiquidity","governanceIndex","kospi200Sector","kospi100","kospi50","krx","etp","elwIssuer","krx100","krxAuto","krxSemi","krxBio","krxBank","spac","krxEnergyChem","krxSteel","shortOverheat","krxMedia","krxConstruction","non1","krxSecurities","krxShip","krxInsurance","krxTransport","sri","basePrice","regularUnit","afterHoursUnit","halted","liquidation","management","marketWarning","warningPreNotice","dishonestDisclosure","backdoorListing","lockCode","parChange","capitalIncrease","marginRate","creditAvailable","creditPeriod","prevVolume","parValue","listingDate","listedSharesThousand","capital","fiscalMonth","ipoPrice","preferred","shortSaleOverheat","abnormalSurge","krx300","kospiFlag","revenue","operatingProfit","ordinaryProfit","netIncome","roe","baseYearMonth","marketCapEok","groupCode","creditLimitExceeded","securedLoanAvailable","stockLoanAvailable"],
  kosdaq:["securityGroup","marketCapSize","industryLarge","industryMedium","industrySmall","venture","lowLiquidity","krx","etp","krx100","krxAuto","krxSemi","krxBio","krxBank","spac","krxEnergyChem","krxSteel","shortOverheat","krxMedia","krxConstruction","investmentCaution","krxSecurities","krxShip","krxInsurance","krxTransport","kosdaq150","basePrice","regularUnit","afterHoursUnit","halted","liquidation","management","marketWarning","warningPreNotice","dishonestDisclosure","backdoorListing","lockCode","parChange","capitalIncrease","marginRate","creditAvailable","creditPeriod","prevVolume","parValue","listingDate","listedSharesThousand","capital","fiscalMonth","ipoPrice","preferred","shortSaleOverheat","abnormalSurge","krx300","revenue","operatingProfit","ordinaryProfit","netIncome","roe","baseYearMonth","marketCapEok","groupCode","creditLimitExceeded","securedLoanAvailable","stockLoanAvailable"]
};
const decoder = new TextDecoder("euc-kr");
let cache = null;

function masterDir(){ return path.resolve(process.cwd(), ".cache", "stock-master"); }
function num(v){ const n=Number(String(v??"").replace(/,/g,"").trim()); return Number.isFinite(n)?n:null; }
function str(v){ return String(v??"").trim(); }
function flag(v){
  const x=str(v).toUpperCase();
  return x==="Y" || x==="1" || x==="TRUE";
}
function warningActive(v){
  const x=str(v).toUpperCase();
  // KIS master fields may carry zero/blank codes for normal status. Never treat a non-empty zero code as a warning.
  if(!x || /^(0+|N|NO|FALSE|-)$/.test(x)) return false;
  return x==="Y" || x==="1" || x==="2" || x==="3" || x==="4" || x==="5" || x==="6" || x==="7" || x==="8" || x==="9";
}

function parseLine(buf, exchange){
  // KIS 공식 backtester: 9바이트 단축코드, 12바이트 표준코드, 40바이트 한글종목명.
  if(buf.length < 61) return null;
  let code=decoder.decode(buf.subarray(0,9)).trim();
  if(code.length>6) code=code.slice(-6);
  const standardCode=decoder.decode(buf.subarray(9,21)).trim();
  const name=decoder.decode(buf.subarray(21,61)).trim();
  if(!/^\d{6}$/.test(code) || !name) return null;

  const meta={};
  const ws=widths[exchange], names=fields[exchange];
  let off=61;
  if(buf.length >= 61 + ws.reduce((a,b)=>a+b,0)) {
    ws.forEach((w,i)=>{ meta[names[i]]=decoder.decode(buf.subarray(off,off+w)).trim(); off+=w; });
  }
  return {
    code,name,standardCode,exchange,exchangeName:exchange==="kospi"?"코스피":"코스닥",
    securityGroup:str(meta.securityGroup)||null,
    marketCapSize:str(meta.marketCapSize)||null,
    industryLarge:str(meta.industryLarge)||"미분류",
    industryMedium:str(meta.industryMedium)||null,
    industrySmall:str(meta.industrySmall)||null,
    halted:flag(meta.halted),
    management:flag(meta.management),
    liquidation:flag(meta.liquidation),
    dishonestDisclosure:flag(meta.dishonestDisclosure),
    warningPreNotice:flag(meta.warningPreNotice),
    marketWarning:warningActive(meta.marketWarning),
    marketWarningRaw:str(meta.marketWarning)||null,
    lowLiquidity:flag(meta.lowLiquidity),
    preferred:str(meta.preferred),
    prevVolume:num(meta.prevVolume), roe:num(meta.roe), revenue:num(meta.revenue),
    operatingProfit:num(meta.operatingProfit), netIncome:num(meta.netIncome), marketCapEok:num(meta.marketCapEok),
    baseYearMonth:str(meta.baseYearMonth), listingDate:str(meta.listingDate),
    detailParsed:Object.keys(meta).length>0
  };
}
function parseMaster(bytes, exchange){
  const rows=[]; let start=0;
  for(let i=0;i<=bytes.length;i++){
    if(i===bytes.length || bytes[i]===10){
      let end=i; if(end>start && bytes[end-1]===13) end--;
      if(end>start){ const row=parseLine(bytes.subarray(start,end),exchange); if(row) rows.push(row); }
      start=i+1;
    }
  }
  return rows;
}
async function readCached(exchange){
  try{const data=JSON.parse(await fs.readFile(path.join(masterDir(),`${exchange}.json`),"utf8")); return data;}catch{return null;}
}
async function download(exchange){
  const r=await providerFetch(MASTER_URLS[exchange]);
  if(!r.ok) throw new Error(`KIS 마스터 다운로드 실패(${exchange}): HTTP ${r.status}`);
  const { default: AdmZip } = await import("adm-zip");
  const zip=new AdmZip(Buffer.from(await r.arrayBuffer()));
  const entry=zip.getEntries().find(x=>!x.isDirectory);
  if(!entry) throw new Error(`KIS 마스터 ZIP 비어 있음: ${exchange}`);
  const rows=parseMaster(entry.getData(),exchange);
  if(rows.length < 100) throw new Error(`KIS 마스터 파싱 결과가 비정상적으로 적음(${exchange}: ${rows.length}종목)`);
  const payload={updatedAt:new Date().toISOString(),rows,rawCount:rows.length,detailCount:rows.filter(x=>x.detailParsed).length,url:MASTER_URLS[exchange]};
  await fs.mkdir(masterDir(),{recursive:true});
  await fs.writeFile(path.join(masterDir(),`${exchange}.json`),JSON.stringify(payload),"utf8");
  return payload;
}

export async function loadStockUniverse({refresh=false}={}){
  if(cache && !refresh) return cache;
  const out=[]; const status={}; const errors=[];
  for(const ex of ["kospi","kosdaq"]){
    let data=!refresh?await readCached(ex):null;
    const stale=!data || !data.updatedAt || (Date.now()-new Date(data.updatedAt).getTime())>24*3600*1000;
    let source=stale?"download":"cache";
    if(stale){
      try{data=await download(ex);}catch(e){
        if(!data){ errors.push(`${ex}: ${e.message}`); status[ex]={count:0,updatedAt:null,source:"error",error:e.message}; continue; }
        source="stale-cache"; errors.push(`${ex}: ${e.message} (기존 캐시 사용)`);
      }
    }
    const rows=(data?.rows||[]).filter(x=>/^\d{6}$/.test(x.code)&&x.name);
    out.push(...rows);
    status[ex]={count:rows.length,rawCount:data?.rawCount??rows.length,detailCount:data?.detailCount??rows.filter(x=>x.detailParsed).length,updatedAt:data?.updatedAt||null,source,error:null};
  }
  if(out.length<100) {
    const detail=errors.length?errors.join(" | "):"유효 종목이 100개 미만";
    throw new Error(`KIS 종목 마스터 universe 생성 실패: ${detail}`);
  }
  cache={source:"KIS_MASTER",total:out.length,stocks:out,status,errors};
  return cache;
}
