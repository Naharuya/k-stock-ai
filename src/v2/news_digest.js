/** Bounded public news metadata. No portfolio input, article scraping or trade signals. */
import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {XMLParser} from 'fast-xml-parser';
export const NEWS_INTERVAL_MS=1800000;
export const NEWS_SOURCES=Object.freeze([
 {id:'FED_PRESS',name:'미 연준 공식 발표',url:'https://www.federalreserve.gov/feeds/press_all.xml',host:'www.federalreserve.gov'},
 {id:'FED_SPEECH',name:'미 연준 공식 연설',url:'https://www.federalreserve.gov/feeds/speeches.xml',host:'www.federalreserve.gov'},
 {id:'SEC_PRESS',name:'미 SEC 공식 발표',url:'https://www.sec.gov/news/pressreleases.rss',host:'www.sec.gov'}
]);
const queries=['반도체 주식','트럼프 주식 거래','증시 기업 실적'];
const hash=s=>createHash('sha256').update(s).digest('hex');
const plain=s=>String(s??'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();
const array=v=>Array.isArray(v)?v:v?[v]:[];
const validDate=(v,now)=>Number.isFinite(Date.parse(v))&&Date.parse(v)<=now;
export function newsLink(value,host=null){try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port||host&&u.hostname!==host||!host&&(/^localhost$|^\d+(?:\.\d+){3}$|:/.test(u.hostname)))return null;u.hash='';for(const key of [...u.searchParams.keys()])if(/^utm_|^fbclid$|^gclid$/i.test(key))u.searchParams.delete(key);return u.href;}catch{return null;}}
export function organizeNews(title){
 const tags=[];for(const [label,re]of [['반도체',/반도체|semiconductor|\bchip[s]?\b|마이크론|micron|엔비디아|nvidia|\bAMD\b/i],['인물·정책',/트럼프|trump|관세|tariff|export|수출 규제/i],['금리·통화정책',/금리|통화정책|monetary|interest rate|FOMC|inflation/i],['금융감독·규제',/규제|제재|enforcement|charges|settles|sanctions/i],['실적',/실적|earnings|revenue|매출/i],['거래·매도 보도',/매도|순매도|거래|\bsold\b|\bsales?\b|trading/i]])if(re.test(title))tags.push(label);
 const instruments=[];for(const [market,symbol,exchange,name,re]of [['KR','005930','KRX','삼성전자',/삼성전자|samsung electronics/i],['KR','000660','KRX','SK하이닉스',/SK\s*하이닉스|SK\s*hynix/i],['US','MU','NAS','Micron',/마이크론|\bmicron\b/i],['US','AMD','NAS','AMD',/\bAMD\b|어드밴스드 마이크로/i],['US','NVDA','NAS','NVIDIA',/엔비디아|\bnvidia\b/i],['US','META','NAS','Meta',/\bmeta\b|(?:^|[^가-힣A-Za-z])메타(?:$|[^가-힣A-Za-z])/i]])if(re.test(title))instruments.push({market,symbol,exchange,name});
 return {tags:tags.length?tags:['기타 발표'],instruments,organizationMethod:'TITLE_KEYWORDS_NOT_FACT_VERIFICATION',eventDate:null,eventDateStatus:'NOT_CONFIRMED',tradeDirection:'NOT_INFERRED',decision:'INFORMATION_ONLY_NOT_BUY_SELL_SIGNAL'};
}
function item(title,url,publishedAt,source,now){const text=plain(title).slice(0,240);if(!text||!url||!validDate(publishedAt,now)||now-Date.parse(publishedAt)>7*86400000)return null;return {id:hash(url),title:text,url,publishedAt:new Date(publishedAt).toISOString(),sourceId:source.id,sourceName:source.name,firstObservedAt:new Date(now).toISOString(),sourceType:source.id==='NAVER_NEWS'?'NEWS_SEARCH_METADATA':'OFFICIAL_RSS_METADATA',...organizeNews(text)};}
export function parseNewsRss(xml,source,now){
 if(typeof xml!=='string'||Buffer.byteLength(xml)>1000000||/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('FEED_INVALID');
 const feed=new XMLParser({ignoreAttributes:false,parseTagValue:false,processEntities:false}).parse(xml)?.rss?.channel;
 if(!feed||typeof feed.title!=='string')throw Error('FEED_INVALID');
 return array(feed.item).slice(0,60).map(r=>item(r.title,newsLink(r.link,source.host),r.pubDate,source,now)).filter(Boolean);
}
export function parseNewsSearch(body,now){if(!Array.isArray(body?.items)||body.items.length>20)throw Error('SEARCH_INVALID');return body.items.map(r=>item(r.title,newsLink(r.originallink)||newsLink(r.link),r.pubDate,{id:'NAVER_NEWS',name:'네이버 뉴스 검색'},now)).filter(Boolean);}
export function mergeNews(previous,incoming,now){
 const byUrl=new Map();for(const row of [...previous,...incoming])if(row&&newsLink(row.url)&&typeof row.title==='string'&&row.title.length<=240&&validDate(row.publishedAt,now)&&now-Date.parse(row.publishedAt)<=7*86400000)byUrl.set(row.url,{...row,firstObservedAt:byUrl.get(row.url)?.firstObservedAt||row.firstObservedAt||new Date(now).toISOString()});
 const titles=new Set();return [...byUrl.values()].sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)).filter(r=>{const key=plain(r.title).toLowerCase().replace(/[\s\p{P}]/gu,'');if(titles.has(key))return false;titles.add(key);return true;}).slice(0,200);
}
async function boundedText(response){const reader=response.body?.getReader();if(!reader){const text=await response.text();if(Buffer.byteLength(text)>1000000)throw Error('SOURCE_TOO_LARGE');return text;}let size=0,parts=[];for(;;){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>1000000){await reader.cancel();throw Error('SOURCE_TOO_LARGE');}parts.push(Buffer.from(r.value));}return Buffer.concat(parts).toString('utf8');}
export function createNewsDigest({directory='data/v2/news-digest',env=process.env,fetchImpl=globalThis.fetch,now=()=>Date.now()}={}){
 const file=path.join(directory,'latest.json');let running=false,timer=null,nextAttemptAt=0;
 async function read(){try{const text=await readFile(file,'utf8');if(text.length>1500000)throw Error();const v=JSON.parse(text);if(v.schemaVersion===1&&Array.isArray(v.items)&&validDate(v.checkedAt,now()))return {...v,items:mergeNews([],v.items,now())};}catch{}return null;}
 async function collect(){if(running)return {status:'SKIPPED_IN_FLIGHT'};running=true;
 try{const previous=await read(),at=now();if(at<nextAttemptAt||previous&&at-Date.parse(previous.checkedAt)<NEWS_INTERVAL_MS)return {status:'SKIPPED_INTERVAL',externalRequests:0};nextAttemptAt=at+NEWS_INTERVAL_MS;let requests=0;const results=[],items=[];
 const get=async(url,headers={})=>{requests++;const response=await fetchImpl(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(12000),headers:{'User-Agent':'KStock public RSS reader contact vjsjv7003@gmail.com',Accept:'application/rss+xml, application/xml, application/json',...headers}});if(!response.ok)throw Error('HTTP_'+response.status);return boundedText(response);};
 for(const source of NEWS_SOURCES){try{const rows=parseNewsRss(await get(source.url),source,at);items.push(...rows);results.push({id:source.id,name:source.name,status:'CHECKED',items:rows.length});}catch{results.push({id:source.id,name:source.name,status:'FETCH_FAILED',items:0});}}
 const naver=!!env.KSTOCK_NAVER_CLIENT_ID&&!!env.KSTOCK_NAVER_CLIENT_SECRET&&env.KSTOCK_NAVER_NEWS_ENABLED==='true';
 if(naver){for(const q of queries){try{const url=new URL('https://openapi.naver.com/v1/search/news.json');url.search=new URLSearchParams({query:q,display:'20',sort:'date'});const rows=parseNewsSearch(JSON.parse(await get(url.href,{'X-Naver-Client-Id':env.KSTOCK_NAVER_CLIENT_ID,'X-Naver-Client-Secret':env.KSTOCK_NAVER_CLIENT_SECRET})),at);items.push(...rows);results.push({id:'NAVER_NEWS',name:'일반 언론 뉴스 · '+q,status:'CHECKED',items:rows.length});}catch{results.push({id:'NAVER_NEWS',name:'일반 언론 뉴스 · '+q,status:'FETCH_FAILED',items:0});}}}else results.push({id:'NAVER_NEWS',name:'일반 언론 뉴스',status:'ACCOUNT_CONFIGURATION_REQUIRED',items:0});
 for(const r of results){r.checkedAt=new Date(at).toISOString();r.lastSuccessfulAt=r.status==='CHECKED'?r.checkedAt:previous?.sources?.find(p=>p.id===r.id&&p.name===r.name)?.lastSuccessfulAt||null;}
 const successful=results.filter(r=>r.status==='CHECKED').length,merged=mergeNews(previous?.items||[],items,at);
 const newItems=merged.filter(r=>!previous?.items?.some(p=>p.id===r.id)).length,topicCounts={};for(const r of merged)for(const tag of r.tags||[])topicCounts[tag]=(topicCounts[tag]||0)+1;
 const record={newItems,topicCounts,schemaVersion:1,checkedAt:new Date(at).toISOString(),lastSuccessfulAt:successful?new Date(at).toISOString():previous?.lastSuccessfulAt||null,status:successful?(results.every(r=>r.status==='CHECKED')?'CHECKED':'PARTIAL'):'FAILED',intervalSeconds:1800,externalRequests:requests,sources:results,items:merged,scope:naver?'FIXED_TOPICS_AND_OFFICIAL_RSS':'OFFICIAL_RSS_ONLY_GENERAL_NEWS_PENDING',articleBodyStored:false,aiSummaryUsed:false,retentionDays:7,maximumItems:200};
 await mkdir(directory,{recursive:true,mode:0o700});const temp=file+'.'+randomUUID()+'.tmp';await writeFile(temp,JSON.stringify(record),{mode:0o600});await rename(temp,file);return {status:record.status,externalRequests:requests,items:merged.length,sources:results};
 }finally{running=false;}}
 return {collect,async get(){const v=await read();return {...(v||{status:'NOT_CHECKED',items:[],sources:[],checkedAt:null,lastSuccessfulAt:null,intervalSeconds:1800}),schedulerEnabled:env.KSTOCK_NEWS_DIGEST_ENABLED==='true',stale:!v||!v.lastSuccessfulAt||now()-Date.parse(v.lastSuccessfulAt)>NEWS_INTERVAL_MS+120000,nextCheckAt:v?new Date(Date.parse(v.checkedAt)+NEWS_INTERVAL_MS).toISOString():null,recommendationStatus:'HOLD',orderExecution:false};},start(){if(timer||env.KSTOCK_NEWS_DIGEST_ENABLED!=='true')return;const tick=()=>collect().catch(()=>{});tick();timer=setInterval(tick,60000);timer.unref?.();},stop(){if(timer)clearInterval(timer);timer=null;}};
}
export function registerNewsDigest(app,service){app.get('/api/v2/trading/news',async(_req,res)=>{res.set('Cache-Control','no-store');try{res.json({success:true,...await service.get()});}catch{res.status(503).json({success:false,error:'NEWS_UNAVAILABLE'});}});}
