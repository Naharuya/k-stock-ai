import {currentRequestSignal} from './request_context.js';
import https from 'node:https';
import dns from 'node:dns/promises';
import {isIP} from 'node:net';
export function publicIPv4(address){
  if(isIP(address)!==4)return false;
  const [a,b,c]=address.split('.').map(Number);
  return !(a===0||a===10||a===127||a>=224||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||(a===100&&b>=64&&b<=127)||(a===198&&(b===18||b===19))||(a===192&&b===0)||(a===198&&b===51&&c===100)||(a===203&&b===0&&c===113));
}
export async function readPublicNews(urlValue,{signal=AbortSignal.any([AbortSignal.timeout(20000),currentRequestSignal()].filter(Boolean)),redirects=0}={}){
  signal.throwIfAborted();const url=new URL(urlValue);
  if(url.protocol!=='https:'||url.username||url.password||(url.port&&url.port!=='443')||redirects>3)throw new Error('NEWS_URL_REJECTED');
  const resolved=await new Promise((resolve,reject)=>{
    const abort=()=>reject(new Error('NEWS_REQUEST_CANCELLED'));signal.addEventListener('abort',abort,{once:true});
    dns.lookup(url.hostname,{family:4,all:true}).then(result=>{signal.removeEventListener('abort',abort);resolve(result);},error=>{signal.removeEventListener('abort',abort);reject(error);});
  });signal.throwIfAborted();
  if(!resolved.length||resolved.some(x=>!publicIPv4(x.address)))throw new Error('NEWS_ADDRESS_REJECTED');
  const address=resolved[0].address;
  const response=await new Promise((resolve,reject)=>{
    const request=https.get(url,{signal,agent:false,headers:{'User-Agent':'K-Stock-AI research evidence','Accept':'text/html','Accept-Encoding':'identity'},lookup:(_host,options,callback)=>options.all?callback(null,[{address,family:4}]):callback(null,address,4)},res=>{
      const chunks=[];let bytes=0;
      res.on('data',chunk=>{bytes+=chunk.length;if(bytes>1500000){request.destroy(new Error('NEWS_BODY_TOO_LARGE'));return;}chunks.push(chunk);});
      res.on('error',reject);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));
    });request.on('error',reject);
  });
  if([301,302,303,307,308].includes(response.status)&&response.headers.location)return readPublicNews(new URL(response.headers.location,url),{signal,redirects:redirects+1});
  if(response.status!==200||!String(response.headers['content-type']).includes('text/html')||(response.headers['content-encoding']&&response.headers['content-encoding']!=='identity'))throw new Error('NEWS_BODY_UNAVAILABLE');
  const charset=/charset=([^;\s]+)/i.exec(response.headers['content-type'])?.[1]||'utf-8';
  return {url:url.href,html:new TextDecoder(charset).decode(response.body)};
}
const decode=s=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ');
export function extractNewsEvidence(html,company){
  const clean=html.replace(/<(script|style|nav|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi,' ');
  const content=/<article\b[^>]*>([\s\S]*?)<\/article>/i.exec(clean)?.[1]||/<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(clean)?.[1];
  if(!content)return {status:'ORIGINAL_BODY_NOT_IDENTIFIED',factsVerified:false};
  const text=decode(content.replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
  if(text.length<100)return {status:'ORIGINAL_BODY_NOT_IDENTIFIED',factsVerified:false};
  const index=company?text.indexOf(company):-1;
  return {status:index>=0?'PRIMARY_TEXT_COMPANY_MATCH':'PRIMARY_TEXT_RELEVANCE_UNCONFIRMED',factsVerified:false,
    excerpt:text.slice(Math.max(0,index-150),Math.max(0,index-150)+1200),excerptTruncated:text.length>1200,companyMatched:index>=0};
}
export async function getNewsEvidence({link,sourceUrl,corpName},{reader=readPublicNews}={}){
  const source=new URL(sourceUrl);if(source.protocol!=='https:')throw new Error('NEWS_PUBLISHER_REQUIRED');
  let page=await reader(link);
  const belongs=value=>{try{const u=new URL(value);return u.protocol==='https:'&&(u.hostname===source.hostname||u.hostname.replace(/^www\./,'')===source.hostname.replace(/^www\./,''))&&u.pathname!=='/';}catch{return false;}};
  if(!belongs(page.url)){
    const links=[...page.html.matchAll(/(?:href|content)=["'](https:\/\/[^"'<>]+)["']/gi)].map(m=>decode(m[1]));
    const original=links.find(belongs);if(!original)return {status:'ORIGINAL_URL_UNRESOLVED',factsVerified:false,publisher:source.hostname};
    page=await reader(original);if(!belongs(page.url))return {status:'PUBLISHER_REDIRECT_UNCONFIRMED',factsVerified:false};
  }
  return {sourceUrl:page.url,publisher:source.hostname,retrievedAt:new Date().toISOString(),...extractNewsEvidence(page.html,corpName)};
}
