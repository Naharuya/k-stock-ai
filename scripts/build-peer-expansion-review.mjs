import { buildPeerExpansionReview } from '../src/v2/peer_expansion.js';
// All source observations below were manually checked through official public pages.
// This script performs zero network calls and does not modify latest.json.
export function applyPeerExpansionReview(input, { reviewedAt }) {
  const result = structuredClone(input);
  const target = result.companies.find(x => x.ticker === '005930');
  if (!target || !Number.isFinite(Date.parse(reviewedAt))) throw new Error('PEER_TARGET_OR_REVIEW_DATE_INVALID');
  const sources = {
    '000660':{sourceUrl:'https://www.skhynix.com/',summary:'DRAM·NAND·SSD 제품군을 공식 제품 페이지에서 확인. 삼성전자 연결 사업 전체와 동일하다는 근거는 미확보.'},
    MU:{sourceUrl:'https://www.micron.com/about/company/corporate-profile',summary:'메모리·저장장치 사업과 DRAM·NAND·NOR 제품군 확인. 삼성전자 DX·DS 연결 사업 전체 비교는 미검증.'},
    TSM:{sourceUrl:'https://www.tsmc.com/english/aboutTSMC',summary:'고객 제품 제조를 전담하는 순수 파운드리 사업 확인. 메모리·완제품을 포함한 삼성전자 연결 사업과 동일시하지 않음.'},
    UMC:{sourceUrl:'https://www.umc.com/en/About/about_overview',summary:'반도체 파운드리 및 로직·특수공정 사업 확인. 삼성전자 연결 사업 전체와 동질성은 미검증.'}
  };
  const candidates = ['000660','000990','042700'].map(ticker => (result.krPeers || result.companies).find(x=>x.ticker===ticker)).filter(Boolean).map(x=>structuredClone(x));
  for (const [ticker, companyName] of [['MU','Micron Technology'],['TSM','TSMC'],['UMC','United Microelectronics']]) candidates.push({ticker,companyName,market:'GLOBAL_RESEARCH_ONLY',industryCode:null});
  for (const candidate of candidates) if (sources[candidate.ticker]) candidate.businessEvidence={...sources[candidate.ticker],reviewedAt,verified:true};
  target.krSnapshot.peerExpansionReview = buildPeerExpansionReview(target,candidates,reviewedAt);
  target.krSnapshot.peerExpansionReview.targetBusinessEvidence={sourceUrl:'https://www.samsung.com/global/ir/ir-resources/our-business/',reviewedAt,verified:true,summary:'삼성전자 DX·DS 및 메모리·파운드리·System LSI 사업 구조. 반도체 사업만 겹치는 기업을 연결 전체 평가배수 동종 표본으로 통과시키지 않음.'};
  return result;
}
