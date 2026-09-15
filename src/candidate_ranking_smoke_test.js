import assert from "node:assert/strict";
import { rankCandidatesForOperationalView, selectDiversifiedCandidates } from "./services/candidate_rank_service.js";

const rows = [
  { code:"A", name:"A-watch-low", industryLarge:"10", finalState:"VERIFIED_WATCH", validationLevel:"DEEP", finalScore:60, roe:8, quote:{per:55,pbr:7,price:80,week52High:100,tradingValue:5e9,changeRatePct:-1}, committee:{score:54,status:"WATCH"}, quality:{flags:[]}, styleTags:[] },
  { code:"B", name:"B-quality", industryLarge:"10", finalState:"LIGHT_CANDIDATE", validationLevel:"LIGHT", finalScore:80, roe:22, quote:{per:10,pbr:1.1,price:95,week52High:100,tradingValue:80e9,changeRatePct:2}, committee:null, quality:{flags:[]}, styleTags:["QUALITY","VALUE","MOMENTUM","NEAR_52W_HIGH","LIQUID"] },
  { code:"C", name:"C-quality", industryLarge:"10", finalState:"LIGHT_CANDIDATE", validationLevel:"LIGHT", finalScore:80, roe:18, quote:{per:12,pbr:1.4,price:90,week52High:100,tradingValue:60e9,changeRatePct:1.5}, committee:null, quality:{flags:[]}, styleTags:["QUALITY","VALUE","MOMENTUM"] },
  { code:"D", name:"D-sector2", industryLarge:"20", finalState:"LIGHT_CANDIDATE", validationLevel:"LIGHT", finalScore:79, roe:17, quote:{per:14,pbr:1.8,price:88,week52High:100,tradingValue:40e9,changeRatePct:1}, committee:null, quality:{flags:[]}, styleTags:["QUALITY"] },
  { code:"R", name:"Risk", industryLarge:"30", finalState:"VERIFIED_RISK", validationLevel:"DEEP", finalScore:90, roe:30, quote:{per:8,pbr:1,price:90,week52High:100,tradingValue:100e9,changeRatePct:2}, committee:{score:70,status:"RISK"}, deep:{riskScore:75}, quality:{flags:[]}, styleTags:[] }
];
const ranked = rankCandidatesForOperationalView(rows);
assert.equal(ranked[0].name, "B-quality", "검증등급 A가 B보다 무조건 앞서면 안 됩니다.");
assert.equal(ranked.at(-1).name, "Risk", "위험 후보는 운영 후보 뒤로 가야 합니다.");
assert.ok(ranked[0].rankingScore !== ranked[1].rankingScore, "동점 완화용 Ranking Score가 필요합니다.");
const diversified = selectDiversifiedCandidates(ranked, { top: 3, maxPerSector: 2 });
assert.equal(diversified.selected.length, 3);
assert.ok(diversified.selected.some(x=>x.industryLarge==="20"), "섹터 다양성 제한이 동작해야 합니다.");
console.log(JSON.stringify({ ok:true, order:ranked.map(x=>({name:x.name,rankingScore:x.rankingScore})), diversified:diversified.selected.map(x=>x.name), capApplied:diversified.capApplied }, null, 2));
