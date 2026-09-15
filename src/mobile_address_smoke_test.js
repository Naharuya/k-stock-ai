import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
const root=await fs.mkdtemp(path.join(os.tmpdir(),'kstock-address-'));
const javaRoot=process.env.KSTOCK_TEST_JAVA||'C:/Program Files/Android/Android Studio/jbr';
const executable=name=>path.join(javaRoot,'bin',name+(process.platform==='win32'?'.exe':''));
try{
 const fixture=`import ai.kstock.mobile.ServerAddress;
public class AddressCheck {
 public static void main(String[] args) throws Exception {
  String[] allowed={"http://192.168.0.9:3000","http://10.0.0.2:3000","http://172.16.0.2","https://brief.example.com","https://192.168.0.9:443"};
  String[] denied={"http://localhost:3000","https://localhost","https://localhost.","https://127.0.0.1","http://127.1.2.3","https://[::1]","https://[0:0:0:0:0:0:0:1]","https://0.0.0.0","http://example.com","http://192.168.999.9","http://192.168.001.9","http://192.168.0.9:0","http://192.168.0.9:99999","https://user:placeholder@example.com","http://192.168.0.9/path","http://192.168.0.9?x=1","file:///tmp/a"};
  for(String url:allowed)if(!ServerAddress.isAllowed(url))throw new AssertionError("Allowed endpoint rejected");
  for(String url:denied)if(ServerAddress.isAllowed(url))throw new AssertionError("Unsafe endpoint allowed");
  if(!ServerAddress.normalize(" https://BRIEF.example.com/ ").equals("https://brief.example.com"))throw new AssertionError("Normalization");
  if(ServerAddress.allowsRequest(allowed[0],"http://example.com/image.png"))throw new AssertionError("External cleartext allowed");
  if(ServerAddress.allowsRequest(allowed[0],"https://localhost/health"))throw new AssertionError("Loopback request allowed");
  if(!ServerAddress.allowsRequest(allowed[0],allowed[0]+"/api/daily/latest"))throw new AssertionError("Same-origin request blocked");
 }
}`;
 await fs.writeFile(path.join(root,'AddressCheck.java'),fixture);
 execFileSync(executable('javac'),['-encoding','UTF-8','-d',root,path.resolve('android/src/ai/kstock/mobile/ServerAddress.java'),path.join(root,'AddressCheck.java')],{windowsHide:true,stdio:'pipe'});
 execFileSync(executable('java'),['-cp',root,'AddressCheck'],{windowsHide:true,stdio:'pipe'});
 const manifest=await fs.readFile('android/AndroidManifest.xml','utf8'),security=await fs.readFile('android/res/xml/network_security_config.xml','utf8');
 assert.ok(manifest.includes('usesCleartextTraffic="false"'));assert.ok(security.includes('base-config cleartextTrafficPermitted="false"'));assert.ok(!security.includes('>localhost<'));assert.ok(!security.includes('>127.0.0.1<'));
 console.log('Android address PASS: compiled Java checks LAN/HTTPS validation, loopback/credentials/malformed URLs blocked, cross-origin HTTP blocked; default cleartext policy remains DENY.');
}finally{assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep));await fs.rm(root,{recursive:true,force:true});}
