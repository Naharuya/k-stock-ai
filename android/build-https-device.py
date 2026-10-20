"""Update the existing validation app to HTTPS using an explicitly supplied existing key."""
from pathlib import Path
import argparse,shutil,subprocess,os,tempfile
p=argparse.ArgumentParser();p.add_argument('--keystore',required=True);args=p.parse_args()
key=Path(args.keystore).resolve()
if not key.is_file():raise SystemExit('EXISTING_KEY_REQUIRED')
root=Path(__file__).resolve().parent
work=Path(tempfile.mkdtemp(prefix='https-device-',dir=root/'build'))
for name in ['src','res','assets']:shutil.copytree(root/name,work/name)
shutil.copy(root/'build.mjs',work/'build.mjs')
shutil.copy(root.parent/'scripts/physical-live-workflow.js',work/'assets/live-workflow.js')
s=(root/'AndroidManifest.xml').read_text().replace('package="ai.kstock.mobile"','package="ai.kstock.mobile.localvalidation"').replace('android:name=".MainActivity"','android:name="ai.kstock.mobile.MainActivity"').replace('android:name=".BriefNotificationJob"','android:name="ai.kstock.mobile.BriefNotificationJob"').replace('android:label="K-Stock AI"','android:label="K-Stock HTTPS"').replace('android:versionCode="265"','android:versionCode="272"').replace('android:versionName="2.6.5"','android:versionName="2.7.2"')
(work/'AndroidManifest.xml').write_text(s)
# Migrate only known validation origins, preserving custom origins and old preferences.
p=work/'src/ai/kstock/mobile/ServerAddress.java';s=p.read_text().replace('if(saved==null || saved.trim().isEmpty())return DEFAULT;', 'if(saved==null || saved.trim().isEmpty())return DEFAULT;\n  if(saved.trim().replaceAll("/+$", "").equals("http://127.0.0.1:3103"))return DEFAULT;');p.write_text(s)
p=work/'src/ai/kstock/mobile/MainActivity.java';s=p.read_text().replace('super.onCreate(state);vault=new TokenVault(this);','super.onCreate(state);vault=new TokenVault(this);getExternalFilesDir(null);if(getIntent().getBooleanExtra("kstock_holding_policy_check",false)){try{HoldingAlertRule.selfTest(this);}catch(Exception ignored){}}if(getIntent().getBooleanExtra("kstock_live_check",false))WebView.setWebContentsDebuggingEnabled(true);if(getIntent().getBooleanExtra("kstock_import_credentials",false)){try{DeviceCredentialImport.consume(this,vault);}catch(Exception ignored){}}');s=s.replace('web.setWebViewClient(new WebViewClient(){','''web.setWebViewClient(new WebViewClient(){
   private boolean liveCheckStarted=false;
   @Override public void onPageFinished(WebView view,String url){if(getIntent().getBooleanExtra("kstock_live_check",false)&&!liveCheckStarted&&ServerAddress.sameOrigin(server,url)){liveCheckStarted=true;try(InputStream in=getAssets().open("live-workflow.js")){ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] b=new byte[4096];int n;while((n=in.read(b))!=-1)out.write(b,0,n);web.evaluateJavascript(out.toString("UTF-8"),null);}catch(Exception ignored){}}}
''');p.write_text(s)
(work/'res/xml/network_security_config.xml').write_text('<network-security-config><base-config cleartextTrafficPermitted="false"><trust-anchors><certificates src="system"/></trust-anchors></base-config></network-security-config>')
env=os.environ.copy();env['ANDROID_SDK_ROOT']=env.get('ANDROID_SDK_ROOT',str(Path.home()/'Library/Android/sdk'))
subprocess.run(['node',str(work/'build.mjs')],env=env,check=True)
tools=Path(env['ANDROID_SDK_ROOT'])/'build-tools/36.0.0';apk=work/'build/release/k-stock-https-device.apk'
subprocess.run([str(tools/'apksigner'),'sign','--ks',str(key),'--ks-pass','pass:android','--key-pass','pass:android','--ks-key-alias','validation','--out',str(apk),str(work/'build/release/k-stock-ai-2.6.5-unsigned.apk')],check=True)
subprocess.run([str(tools/'apksigner'),'verify',str(apk)],check=True)
print('HTTPS_DEVICE_APK='+str(apk))
