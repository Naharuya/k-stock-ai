import { normalizeDartFinancials, normalizeKisQuote } from './kr_valuation.js';
import { assertSafeKStockV2Environment } from './scoring.js';
export function normalizeCompanyProfile(response,company,collectedAt) {
  if(response?.status!=='000'||response.corp_code!==company.corpCode||response.stock_code!==company.ticker||!/^\d{2,6}$/.test(response.induty_code||''))throw new Error('PEER_COMPANY_IDENTITY_INVALID');
  // Do not retain executives, addresses, phone numbers or registration identifiers.
  return {ticker:company.ticker,corpCode:company.corpCode,companyName:response.corp_name,industryCode:response.induty_code,settlementMonth:response.acc_mt,source:'OpenDART company',sourceUrl:'https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS001&apiId=2019002',collectedAt};
}
export async function collectKrPeers({target,peers,analysisDate},{dartRequest,dartClient,kisRequest,env=process.env,now=()=>new Date().toISOString()}={}) {
  assertSafeKStockV2Environment(env);
  if(!target||target.market!=='KR'||!Array.isArray(peers)||peers.length>3||[target,...peers].some(x=>!/^\d{6}$/.test(x.ticker||'')||!/^\d{8}$/.test(x.corpCode||''))||new Set([target,...peers].map(x=>x.ticker)).size!==peers.length+1)throw new Error('PEER_SCOPE_INVALID');
  const collectedAt=now(),year=String(new Date(analysisDate).getUTCFullYear()-1),rows=[];
  const targetProfile=normalizeCompanyProfile(await dartRequest({service:'opendart',operation:'company',params:{corpCode:target.corpCode}}),target,collectedAt);
  for(const company of peers){
    const profile=normalizeCompanyProfile(await dartRequest({service:'opendart',operation:'company',params:{corpCode:company.corpCode}}),company,collectedAt);
    const financials=await dartClient.getFinancials({corpCode:company.corpCode,year});
    const periods=await dartClient.getFinancialPeriods({corpCode:company.corpCode,year});
    const disclosures=await dartClient.getDisclosures({corpCode:company.corpCode,beginDate:`${Number(year)+1}0101`,endDate:`${Number(year)+1}0430`,maxPages:1});
    const quote=await kisRequest({service:'kis',operation:'quote',symbol:company.ticker});
    rows.push({...company,companyName:profile.companyName,industryCode:profile.industryCode,companyProfile:profile,businessProfile:{required:true,verified:false,key:null,reason:'BUSINESS_SEGMENTS_REQUIRE_SOURCE_REVIEW'},krSnapshot:{price:normalizeKisQuote(quote,company,collectedAt),financial:normalizeDartFinancials(financials.items,company,{year,periodItems:periods.items,disclosures:disclosures.items,collectedAt,analysisDate})}});
  }
  return {status:'UNDER_REVIEW',analysisDate,collectedAt,targetProfile,peers:rows,warning:'COLLECTED_PEERS_ARE_NOT_AUTOMATICALLY_COMPARABLE'};
}
