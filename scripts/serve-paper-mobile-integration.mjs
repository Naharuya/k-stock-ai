// Isolated synthetic QA. No real data, credentials, backend relay, or persistence.
import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {createPaperPerformanceService} from '../src/v2/paper_performance_service.js';import {privateIPv4,previewDuration} from '../ios/validation-relay.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),host=process.argv[2]||'127.0.0.1',port=host==='127.0.0.1'?3000:3104;
if(host!=='127.0.0.1'&&!privateIPv4(host))throw Error('PRIVATE_QA_BIND_REQUIRED');const duration=previewDuration(process.argv[3]||900);
const dates=['2026-09-01','2026-09-02','2026-09-03'];
const service=createPaperPerformanceService({now:()=> '2026-10-20T00:00:00Z',loadCandidates:async()=>({candidates:[{market:'KR',ticker:'005930',krValuationAnalysis:{evidence:{priceHistory:{qualityStatus:'READY',basis:'RAW',sessions:dates.map((date,i)=>({date,close:100+i*10}))},corporateActions:{status:'VERIFIED',fromDate:dates[0],toDate:dates[2],events:[]}}}}]}),loadBenchmarks:async()=>({indices:[]})});
const server=http.createServer(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 try{
 const url=new URL(req.url,'http://qa.invalid');
 if(req.method==='POST'&&url.pathname==='/api/v2/paper/performance'){
 let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>131072){res.writeHead(413);res.end('{}');return;}}
 res.setHeader('Content-Type','application/json');res.end(JSON.stringify(await service.calculate(JSON.parse(raw))));return;}
 if(req.method!=='GET'){res.writeHead(403);res.end('{}');return;}
 if(url.pathname==='/health'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:true,mode:'mock',brokerEnabled:false,liveTrading:false}));return;}
 const files={'/':'public/index.html','/app.js':'public/app.js','/styles.css':'public/styles.css','/paper-backup.js':'public/paper-backup.js','/paper-mobile-integration-harness.js':'scripts/paper-mobile-integration-harness.js'};
 const file=files[url.pathname];if(!file){res.setHeader('Content-Type','application/json');res.end('{}');return;}
 let body=await fs.readFile(path.join(root,file),'utf8');if(file.endsWith('.html'))body=body.replace('</body>','<script src="/paper-mobile-integration-harness.js" defer></script></body>');
 res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(body);
 }catch{res.writeHead(400);res.end('{}');}
});
server.requestTimeout=20000;server.listen(port,host,()=>console.log('SYNTHETIC_MOBILE_QA_READY; PORT='+port+'; MAX_SECONDS='+duration));
const stop=()=>{clearTimeout(timer);server.close();server.closeAllConnections();};const timer=setTimeout(stop,duration*1000);timer.unref();for(const signal of ['SIGINT','SIGTERM'])process.on(signal,stop);
