import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('Android production URL, migration, auth, transport and error contracts',async()=>{
 const out=await mkdtemp(path.join(tmpdir(),'kstock-android-tests-'));
 const java=name=>process.env.JAVA_HOME?path.join(process.env.JAVA_HOME,'bin',name+(process.platform==='win32'?'.exe':'')):name;
 try{
  execFileSync(java('javac'),['-encoding','UTF-8','-d',out,'android/src/ai/kstock/mobile/ServerAddress.java','android/src/ai/kstock/mobile/ApiClient.java','android/test/NetworkContractTest.java'],{stdio:'pipe'});
  const result=execFileSync(java('java'),['-cp',out,'NetworkContractTest'],{encoding:'utf8'});
  assert.match(result,/assertions passed/);
 }finally{await rm(out,{recursive:true,force:true});}
});
test('Android transport policy and secret storage release guardrails',async()=>{
 const read=p=>readFile('android/'+p,'utf8');
 const manifest=await read('AndroidManifest.xml'),security=await read('res/xml/network_security_config.xml');
 assert.match(manifest,/package="ai.kstock.mobile"/);assert.match(manifest,/allowBackup="false"/);
 assert.match(manifest,/usesCleartextTraffic="false"/);assert.doesNotMatch(security,/cleartextTrafficPermitted="true"/);
 const vault=await read('src/ai/kstock/mobile/TokenVault.java');
 assert.match(vault,/AndroidKeyStore/);assert.match(vault,/AES\/GCM\/NoPadding/);assert.match(vault,/updateAAD\(origin/);
 const main=await read('src/ai/kstock/mobile/MainActivity.java');
 assert.match(main,/TYPE_TEXT_VARIATION_PASSWORD/);assert.match(main,/FLAG_SECURE/);assert.match(main,/setSaveEnabled\(false\)/);
 for(const name of await readdir('android/src/ai/kstock/mobile')){
  const source=await read('src/ai/kstock/mobile/'+name);
  assert.doesNotMatch(source,/Log\.[divew]\(|System\.(out|err)|printStackTrace\(|setHostnameVerifier|setSSLSocketFactory|\.proceed\(/);
 }
 const server=await readFile('src/server.js','utf8');assert.match(server,/if \(liveTrading \|\| brokerEnabled\)/);
 const bridge=await read('assets/native-fetch.js');assert.doesNotMatch(bridge,/Bearer|Authorization|localStorage|sessionStorage/);
});

test('WebView fetch bridge preserves API POST bodies and never receives the token',async()=>{
 const {runInNewContext}=await import('node:vm');
 const script=await readFile('android/assets/native-fetch.js','utf8');
 const native=[],browser=[];
 const window={fetch:async(input)=>{browser.push(input);return new Response('{}');}};
 window.KStockNative={request(id,url,method,body){native.push({url,method,body});queueMicrotask(()=>window.__kstockReply(id,Buffer.from(JSON.stringify({code:200,type:'application/json',body:'{"ok":true}'})).toString('base64')));}};
 runInNewContext(script,{window,location:{href:'https://kstock.ai.kr/',origin:'https://kstock.ai.kr'},Request,Response,URL,Map,Uint8Array,TextDecoder,atob,setTimeout,clearTimeout,TypeError});
 const result=await window.fetch('/api/analyze',{method:'POST',headers:{'content-type':'application/json'},body:'{"symbol":"TEST"}'});
 assert.equal((await result.json()).ok,true);
 assert.deepEqual(native,[{url:'/api/analyze',method:'POST',body:'{"symbol":"TEST"}'}]);
 await window.fetch('/health');assert.equal(browser.length,1);assert.equal(native.length,1);
 await window.fetch(new Request('https://kstock.ai.kr/api/analyze',{method:'POST',body:'{}'}));
 assert.equal(native[1].method,'POST');assert.equal(native[1].body,'{}');
});
