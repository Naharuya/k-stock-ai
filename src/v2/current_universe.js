// Fixed before returns are inspected. Identity is checked again against SEC metadata/XML.
export const CURRENT_UNIVERSE=Object.freeze([
 Object.freeze({ticker:'AAPL',cik:'0000320193',issuerName:'APPLE INC',companyName:'Apple Inc.',form4SecurityTitle:'Common Stock'}),
 Object.freeze({ticker:'MSFT',cik:'0000789019',issuerName:'MICROSOFT CORP',companyName:'Microsoft Corporation',form4SecurityTitle:'Common Stock'}),
 Object.freeze({ticker:'NVDA',cik:'0001045810',issuerName:'NVIDIA CORP',companyName:'NVIDIA Corporation',form4SecurityTitle:'Common Stock'})
]);
export function currentCompany(ticker='AAPL'){
 const company=CURRENT_UNIVERSE.find(c=>c.ticker===ticker);
 if(!company)throw Error('CURRENT_COMPANY_SCOPE_INVALID');
 return company;
}
