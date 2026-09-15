import { buildCandidatesFromRows } from "./services/candidate_scoring_service.js";

const sample = [
  { code:"000001", name:"품질주A", exchange:"kospi", exchangeName:"코스피", industryLarge:"1001", preScore:75, roe:18, marketCapEok:50000, prevVolume:1000000, sectorRelative:{notes:["업종 ROE 중앙값 상회"]}, quote:{price:50000,per:11,pbr:1.1,tradingValue:90000000000,week52High:54000,changeRatePct:1.2}, live:{valuation:23,momentum:15,notes:["52주 고점 근접"]}},
  { code:"000002", name:"극단ROE주", exchange:"kosdaq", exchangeName:"코스닥", industryLarge:"1009", preScore:85, roe:128, marketCapEok:3000, prevVolume:2000000, sectorRelative:{notes:["업종 ROE 중앙값 상회"]}, quote:{price:3000,per:8,pbr:3.5,tradingValue:60000000000,week52High:4000,changeRatePct:2.0}, live:{valuation:20,momentum:13,notes:[]}},
  { code:"000003", name:"중립주B", exchange:"kospi", exchangeName:"코스피", industryLarge:"1002", preScore:67, roe:12, marketCapEok:20000, prevVolume:500000, sectorRelative:{notes:[]}, quote:{price:25000,per:18,pbr:1.8,tradingValue:25000000000,week52High:30000,changeRatePct:0.2}, live:{valuation:18,momentum:10,notes:[]}}
];
const top = buildCandidatesFromRows(sample, { top: 3 });
const extreme = top.find(x=>x.name==="극단ROE주");
const ok = top.length===3 && extreme?.quality?.flags?.includes("EXTREME_ROE_RECHECK") && top[0].name === "품질주A";
console.log(JSON.stringify({ok,rows:top.length,top:top.map(x=>({name:x.name,finalScore:x.finalScore,level:x.validationLevel,flags:x.quality.flags,tags:x.styleTags}))},null,2));
if(!ok) process.exitCode=1;
