"""Create an isolated USB/loopback validation APK; production sources remain unchanged."""
from pathlib import Path
import shutil, subprocess, os, tempfile
root=Path(__file__).resolve().parent
work=Path(tempfile.mkdtemp(prefix='local-validation-',dir=root/'build'))
for name in ['src','res','assets']:
 shutil.copytree(root/name,work/name)
shutil.copy(root/'build.mjs',work/'build.mjs')
manifest=(root/'AndroidManifest.xml').read_text().replace('package="ai.kstock.mobile"','package="ai.kstock.mobile.localvalidation"').replace('android:name=".MainActivity"','android:name="ai.kstock.mobile.MainActivity"').replace('android:name=".BriefNotificationJob"','android:name="ai.kstock.mobile.BriefNotificationJob"').replace('android:label="K-Stock AI"','android:label="K-Stock Local Validation"')
(work/'AndroidManifest.xml').write_text(manifest)
(work/'res/xml/network_security_config.xml').write_text('<network-security-config><base-config cleartextTrafficPermitted="false"><trust-anchors><certificates src="system"/></trust-anchors></base-config><domain-config cleartextTrafficPermitted="true"><domain>127.0.0.1</domain></domain-config></network-security-config>')
p=work/'src/ai/kstock/mobile/ServerAddress.java'
s=p.read_text().replace('https://kstock.ai.kr','http://127.0.0.1:3103').replace('return n[0]==10','return n[0]==127 || n[0]==10')
p.write_text(s)
p=work/'src/ai/kstock/mobile/MainActivity.java'
s=p.read_text().replace('ServerAddress.normalize(server)','ServerAddress.normalize(server,true)').replace('new ApiClient(server,vault,new ApiClient.Network())','new ApiClient(server,vault,new ApiClient.Network(),true)').replace('ServerAddress.normalize(address.getText().toString())','ServerAddress.normalize(address.getText().toString(),true)')
s=s.replace('서버는 연결되었지만 인증이 필요합니다. 외부접속 토큰을 설정해 주세요.', 'USB 로컬 검증 서버 연결됨 · 운영 인증/페어링 미검증')
p.write_text(s)
p=work/'src/ai/kstock/mobile/ApiClient.java'
s=p.read_text().replace('if(api){','if(false && api){ // Fixed USB origin only; retain API method classification.')
s=s.replace('this.origin=ServerAddress.normalize(origin,debug);', 'if(!origin.equals(\"http://127.0.0.1:3103\"))throw new Exception(\"LOCAL_VALIDATION_ONLY\");this.origin=ServerAddress.normalize(origin,debug);')
p.write_text(s)
env=os.environ.copy();env['ANDROID_SDK_ROOT']=env.get('ANDROID_SDK_ROOT',str(Path.home()/'Library/Android/sdk'))
subprocess.run(['node',str(work/'build.mjs')],env=env,check=True)
key=Path(env.get('KSTOCK_LOCAL_VALIDATION_KEYSTORE',str(work/'validation.keystore')))
if not key.exists(): subprocess.run(['keytool','-genkeypair','-keystore',str(key),'-storepass','android','-keypass','android','-alias','validation','-dname','CN=Local Validation','-keyalg','RSA','-validity','30'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
tools=Path(env['ANDROID_SDK_ROOT'])/'build-tools/36.0.0'
apk=work/'build/release/k-stock-ai-local-validation.apk'
subprocess.run([str(tools/'apksigner'),'sign','--ks',str(key),'--ks-pass','pass:android','--key-pass','pass:android','--ks-key-alias','validation','--out',str(apk),str(work/'build/release/k-stock-ai-2.6.5-unsigned.apk')],check=True)
subprocess.run([str(tools/'apksigner'),'verify',str(apk)],check=True)
print('LOCAL_VALIDATION_APK='+str(apk))
