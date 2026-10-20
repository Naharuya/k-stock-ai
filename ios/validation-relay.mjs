// Temporary LAN preview of public research only. Never forward credentials or writes.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export function allowedPath(method, pathname) {
 if(method!=='GET')return false;
 return ['/', '/app.js', '/paper-backup.js', '/styles.css', '/health', '/api/v2/research/dashboard', '/api/v2/influence/research', '/api/v2/benchmarks', '/api/v2/peer-validation/status', '/api/v2/candidates', '/api/v2/performance'].includes(pathname)
  || /^\/api\/v2\/(candidates\/[A-Z0-9.-]+|stock-performance\/\d{6})$/.test(pathname);
}
export function privateIPv4(host) {
 const parts=host.split('.');if(parts.length!==4||parts.some(p=>!/^\d{1,3}$/.test(p)||Number(p)>255))return false;
 const [a,b]=parts.map(Number);return a===10||(a===172&&b>=16&&b<=31)||(a===192&&b===168);
}
export function previewDuration(value=900){
 const seconds=Number(value);
 if(!Number.isInteger(seconds)||seconds<1||seconds>900)throw Error('PREVIEW_DURATION_OUT_OF_RANGE');
 return seconds;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const host=process.argv[2],port=3104,durationSeconds=previewDuration(process.argv[3]);
 if(!host||!privateIPv4(host))throw Error('PRIVATE_LAN_ADDRESS_REQUIRED');
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public');
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  try{
   const url=new URL(req.url,'http://local.invalid');
   if(!allowedPath(req.method,url.pathname)){res.writeHead(403);res.end('READ_ONLY_PREVIEW_ONLY');return;}
   if(['/','/app.js','/paper-backup.js','/styles.css'].includes(url.pathname)){
    const file=url.pathname==='/'?'index.html':url.pathname.slice(1);
    const body=await fs.readFile(path.join(root,file));
    res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(body);return;
   }
   // Fixed loopback upstream. No user-supplied host, cookies, auth or forwarding headers.
   const response=await fetch('http://127.0.0.1:3000'+url.pathname+url.search,{method:'GET',redirect:'error',signal:AbortSignal.timeout(15000)});
   res.writeHead(response.status,{'Content-Type':'application/json'});res.end(await response.text());
  }catch{res.writeHead(502);res.end('{"success":false,"error":"LOCAL_PREVIEW_UNAVAILABLE"}');}
 });
 server.requestTimeout=20000;
 server.listen(port,host,()=>console.log('KSTOCK_READ_ONLY_LAN_PREVIEW_STARTED; MAX_SECONDS='+durationSeconds));
 const stop=()=>{clearTimeout(timer);server.close();server.closeAllConnections();};
 const timer=setTimeout(stop,durationSeconds*1000);timer.unref();
 for(const sig of ['SIGINT','SIGTERM'])process.on(sig,stop);
}
