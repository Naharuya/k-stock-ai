import { buildResearchProfile } from './services/research_profile_service.js';
const result=buildResearchProfile({
  indicators:{values:{per:22,pbr:1.8,psr:2.1,roePct:13,eps:5000,roaPct:7,ptbr:2.2,rsi14:55,bps:70000,aps:120000,peg:1.3}},
  committee:{baseScore:68,positiveReasons:['펀더멘털 양호'],negativeReasons:['밸류에이션 점검'],bear:{bearScore:48,level:'MODERATE',majorArguments:['가격 부담'],weakArguments:['시장 혼조'],summary:'조건 확인 필요'},components:{fundamental:{raw:70,max:80},valuation:{raw:10,max:20},technical:{raw:12,max:20},flow:{raw:13,max:20},market:{raw:13,max:20},news:{raw:12,max:20},risk:{raw:80,max:100}}},
  technical:{trend:'SIDEWAYS_OR_MIXED'},
  flow:{combinedSmartMoneyQty5d:1000,combinedSmartMoneyQty20d:2000},
  market:{regime:'NEUTRAL_MIXED'},news:{sentiment:'NEUTRAL_MIXED'},dart:{financials:{metrics:{operatingProfitGrowthPct:20}}}
});
console.log(JSON.stringify({ok:result.status==='READY',researchProfile:result},null,2));
