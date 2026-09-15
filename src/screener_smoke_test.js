import { runScreenerOnSample } from "./services/screener_service.js";
const sample=[
 {code:"005930",name:"삼성전자",exchange:"kospi",industryLarge:"0013",roe:10.4,operatingProfit:43600000,netIncome:45210000,marketCapEok:16000000,prevVolume:12000000},
 {code:"000660",name:"SK하이닉스",exchange:"kospi",industryLarge:"0013",roe:18.1,operatingProfit:30000000,netIncome:25000000,marketCapEok:5000000,prevVolume:5000000},
 {code:"035420",name:"NAVER",exchange:"kospi",industryLarge:"0018",roe:8.2,operatingProfit:2000000,netIncome:1500000,marketCapEok:500000,prevVolume:1000000}
];
const ranked=runScreenerOnSample(sample);
console.log(JSON.stringify({ok:true,rows:ranked.length,top:ranked.map(x=>({code:x.code,name:x.name,score:x.score,sectorRelative:x.sectorRelative}))},null,2));
