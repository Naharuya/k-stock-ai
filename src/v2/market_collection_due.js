const HOUR=3600000;
export function marketNextAttempt(check,provider={}){
 const at=Date.parse(check?.checkedAt);if(!Number.isFinite(at))return 0;
 if(check.status!=='BLOCKED')return at+24*HOUR;
 if(['PRICE_PROVIDER_COOLDOWN','PRICE_PROVIDER_UNAVAILABLE','SPLITS_PROVIDER_COOLDOWN','SPLITS_PROVIDER_UNAVAILABLE'].includes(check.reason))return Math.max(at+HOUR,Number.isFinite(provider.blockedUntil)&&provider.blockedUntil>0?provider.blockedUntil:at+6*HOUR);
 if(['PRICE_NETWORK_UNAVAILABLE','PRICE_HTTP_UNAVAILABLE','PRICE_COLLECTION_BUSY'].includes(check.reason))return at+Math.min(24,2**Math.min(5,Math.max(0,(check.attempts||1)-1)))*HOUR;
 return at+24*HOUR;
}
export function selectDueMarketCompany(companies,checks,provider,asOf){
 const now=Date.parse(asOf);if(!Number.isFinite(now))throw Error('MARKET_DUE_TIME_INVALID');
 return companies.filter(c=>marketNextAttempt(checks[c.ticker],provider)<=now).sort((a,b)=>marketNextAttempt(checks[a.ticker],provider)-marketNextAttempt(checks[b.ticker],provider)||a.ticker.localeCompare(b.ticker))[0]||null;
}
