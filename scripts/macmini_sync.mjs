import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import AdmZip from 'adm-zip';
import {parse} from 'dotenv';
export const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const roots=['src','public','scripts','test','docs','android'];
const rootFiles=['package.json','package-lock.json','README.md','AGENTS.md','MACMINI_AI.md','MACMINI_SYNC.md'];
const ignored=new Set(['node_modules','.git','.cache','.data','.gradle','build','downloads','__pycache__']);
const extensions=new Set(['.js','.mjs','.cjs','.json','.html','.css','.svg','.png','.jpg','.webmanifest','.woff','.woff2','.md','.txt','.ps1','.sh','.py','.kt','.kts','.java','.xml','.gradle','.properties']);
export function permitted(name){
 const parts=name.split('/');
 return !parts.some(p=>ignored.has(p)||p.startsWith('.')||/secret|credential|keystore|\.pem$|\.key$|\.jks$|\.p12$/i.test(p)) &&
 !['local.properties','key.properties','gradle.properties'].includes(parts.at(-1)) &&
 (rootFiles.includes(name)||(roots.includes(parts[0])&&extensions.has(path.posix.extname(name))));
}
export async function buildSnapshot(root=projectRoot){
 let env={};try{env=parse(await fs.readFile(path.join(root,'.env')));}catch(e){if(e.code!=='ENOENT')throw e;}
 const secrets=Object.entries(env).filter(([k,v])=>/KEY|SECRET|TOKEN|PASSWORD|PASSWD/i.test(k)&&v.length>=12).map(([,v])=>v);
 const files=[];let bytes=0;
 async function collect(relative){
  const full=path.join(root,relative);let stat;try{stat=await fs.lstat(full);}catch(e){if(e.code==='ENOENT')return;throw e;}
  if(stat.isSymbolicLink())throw Error('SYNC_SYMLINK_REJECTED');
  if(stat.isDirectory()){
   if(ignored.has(path.basename(full)))return;
   for(const name of (await fs.readdir(full)).sort())if(!name.startsWith('.'))await collect(relative+'/'+name);
  }else if(stat.isFile()&&permitted(relative)){
   bytes+=stat.size;if(bytes>32*1024*1024)throw Error('SYNC_SIZE_LIMIT');
   const data=await fs.readFile(full);const text=data.toString('utf8');
   if(secrets.some(secret=>text.includes(secret))||/-----BEGIN (?:OPENSSH |RSA |EC )?PRIVATE KEY-----|(?:sk-proj-|ghp_)[A-Za-z0-9]{20,}/.test(text))throw Error('SYNC_SECRET_DETECTED: '+relative);
   files.push({name:relative,data,sha256:hash(data),size:data.length});
  }
 }
 for(const name of [...rootFiles,...roots])await collect(name);
 files.sort((a,b)=>a.name.localeCompare(b.name,'en'));
 const entries=files.map(({name,sha256,size})=>({name,sha256,size}));
 const canonical=JSON.stringify(entries);const id=hash(canonical);
 const zip=new AdmZip();for(const f of files)zip.addFile(f.name,f.data);
 zip.addFile('sync-manifest.json',Buffer.from(JSON.stringify({id,entries})));
 return {id,count:files.length,bytes,archive:zip.toBuffer()};
}
export async function loadConfig(){return JSON.parse(await fs.readFile(path.join(projectRoot,'.cache/macmini-access/automation.json'),'utf8'));}
export function sshArgs(config){
 if(config.host!=='192.168.0.16'||config.user!=='server')throw Error('MACMINI_TARGET_MISMATCH');
 return ['-i',config.identityFile,'-o','IdentitiesOnly=yes','-o','BatchMode=yes','-o','ConnectTimeout=8','-o','StrictHostKeyChecking=yes','-o','UserKnownHostsFile='+config.knownHosts,'-o','ServerAliveInterval=30','-o','ServerAliveCountMax=3'];
}
const quote=s=>"'"+s.replaceAll("'","'\\''")+"'";
export async function syncSnapshot(config,snapshot){
 const receiver=await fs.readFile(path.join(projectRoot,'scripts/macmini_sync_receiver.py'),'utf8');
 const command='python3 -c '+quote(receiver)+' '+snapshot.id;
 return new Promise((resolve,reject)=>{
  const child=spawn('ssh',[...sshArgs(config),config.user+'@'+config.host,command],{windowsHide:true,stdio:['pipe','pipe','pipe']});
  let output='';const timer=setTimeout(()=>{child.kill();reject(Error('SYNC_TIMEOUT'));},120000);
  child.stdout.on('data',data=>{output+=data;if(output.length>20000){child.kill();}});child.stderr.resume();child.stdin.on('error',()=>{});
  child.once('error',()=>{clearTimeout(timer);reject(Error('SYNC_SSH_START_FAILED'));});
  child.once('exit',code=>{clearTimeout(timer);if(code!==0)return reject(Error('SYNC_REMOTE_FAILED'));
   try{const result=JSON.parse(output.trim());if(result.id!==snapshot.id||result.files!==snapshot.count)throw Error();resolve(result);}catch{reject(Error('SYNC_VERIFICATION_FAILED'));}
  });
  child.stdin.end(snapshot.archive);
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const snapshot=await buildSnapshot();
 if(process.argv.includes('--dry-run'))console.log(JSON.stringify({id:snapshot.id,files:snapshot.count,bytes:snapshot.bytes,dryRun:true}));
 else console.log(JSON.stringify(await syncSnapshot(await loadConfig(),snapshot)));
}
