// Read-only HTTPS deployment check. No token, POST, server change or body logging.
import {inspectWebReleaseShell} from '../src/v2/web_release_shell.js';
const base=new URL(process.argv[2]||'https://kstock.ai.kr/');
if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash||base.pathname!=='/')throw Error('HTTPS_ROOT_URL_REQUIRED');
const assets={};for(const pathname of ['/','/app.js','/paper-backup.js','/styles.css']){
 try{const response=await fetch(new URL(pathname,base),{redirect:'error',signal:AbortSignal.timeout(10000),headers:{Accept:'text/html,text/javascript,text/css'}});let body='';for await(const chunk of response.body){body+=Buffer.from(chunk).toString('utf8');if(Buffer.byteLength(body)>2000000)throw Error('ASSET_TOO_LARGE');}assets[pathname]={status:response.status,contentType:response.headers.get('content-type'),body};}
 catch{assets[pathname]={status:0,contentType:'',body:''};}
}
const result=inspectWebReleaseShell(assets);console.log(JSON.stringify({...result,origin:base.origin,checkedAt:new Date().toISOString(),responses:Object.fromEntries(Object.entries(assets).map(([key,value])=>[key,{status:value.status,contentType:value.contentType}]))}));if(result.status!=='PASS')process.exitCode=1;
