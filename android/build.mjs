// Cross-platform release compilation. Never creates or replaces a production signing key.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const sdk=process.env.ANDROID_SDK_ROOT||process.env.ANDROID_HOME;
if(!sdk)throw new Error('Set ANDROID_SDK_ROOT or ANDROID_HOME');
const win=process.platform==='win32';
const java=process.env.JAVA_HOME;
const executable=name=>java?path.join(java,'bin',name+(win?'.exe':'')):name;
const tools=path.join(sdk,'build-tools',process.env.KSTOCK_BUILD_TOOLS||'36.0.0');
const androidJar=path.join(sdk,'platforms','android-35','android.jar');
const build=path.join(root,'build','release');
rmSync(build,{recursive:true,force:true});
for(const dir of ['classes','dex','generated'])mkdirSync(path.join(build,dir),{recursive:true});
function run(file,args){const r=spawnSync(file,args,{stdio:'pipe',shell:win&&file.endsWith('.bat')});if(r.status!==0){process.stderr.write(r.stderr||'');throw new Error('Android build step failed: '+path.basename(file));}}
const tool=name=>path.join(tools,name+(win?(name==='d8'||name==='apksigner'?'.bat':'.exe'):''));
run(tool('aapt2'),['compile','--dir',path.join(root,'res'),'-o',path.join(build,'resources.zip')]);
run(tool('aapt2'),['link','-o',path.join(build,'unsigned.apk'),'-I',androidJar,'--manifest',path.join(root,'AndroidManifest.xml'),'--java',path.join(build,'generated'),'-A',path.join(root,'assets'),path.join(build,'resources.zip')]);
function sources(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?sources(path.join(dir,e.name)):e.name.endsWith('.java')?[path.join(dir,e.name)]:[]);}
run(executable('javac'),['-encoding','UTF-8','-source','8','-target','8','-classpath',androidJar,'-d',path.join(build,'classes'),...sources(path.join(root,'src')),...sources(path.join(build,'generated'))]);
run(executable('jar'),['cf',path.join(build,'classes.jar'),'-C',path.join(build,'classes'),'.']);
run(tool('d8'),['--lib',androidJar,'--min-api','26','--output',path.join(build,'dex'),path.join(build,'classes.jar')]);
run(executable('jar'),['uf',path.join(build,'unsigned.apk'),'-C',path.join(build,'dex'),'classes.dex']);
const apk=path.join(build,'k-stock-ai-2.6.5-unsigned.apk');
run(tool('zipalign'),['-f','4',path.join(build,'unsigned.apk'),apk]);
run(tool('zipalign'),['-c','4',apk]);
if(process.env.KSTOCK_ANDROID_KEYSTORE){
 for(const name of ['KSTOCK_ANDROID_KEY_ALIAS','KSTOCK_ANDROID_STORE_PASSWORD','KSTOCK_ANDROID_KEY_PASSWORD'])if(!process.env[name])throw new Error('Missing signing environment: '+name);
 const signed=path.join(build,'k-stock-ai-2.6.5.apk');
 // apksigner reads passwords from environment; values never enter command arguments.
 run(tool('apksigner'),['sign','--ks',process.env.KSTOCK_ANDROID_KEYSTORE,'--ks-key-alias',process.env.KSTOCK_ANDROID_KEY_ALIAS,'--ks-pass','env:KSTOCK_ANDROID_STORE_PASSWORD','--key-pass','env:KSTOCK_ANDROID_KEY_PASSWORD','--out',signed,apk]);
 run(tool('apksigner'),['verify',signed]);
 console.log('Signed release APK:',signed);
}else console.log('Unsigned release APK (existing signing key required for device update):',apk);
