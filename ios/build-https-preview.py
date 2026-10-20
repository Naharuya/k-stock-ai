"""Unsigned HTTPS review target. No profiles, credentials, account or server changes."""
import argparse,pathlib,plistlib,subprocess
p=argparse.ArgumentParser();p.add_argument('--device',action='store_true');args=p.parse_args()
root=pathlib.Path(__file__).resolve().parent
platform='iphoneos' if args.device else 'iphonesimulator'
app=root/'build'/('https-device' if args.device else 'https-simulator')/'KStockHTTPSPreview.app';app.mkdir(parents=True,exist_ok=True)
sdk=subprocess.check_output(['xcrun','--sdk',platform,'--show-sdk-path'],text=True).strip()
target='arm64-apple-ios18.0'+('' if args.device else '-simulator')
subprocess.run(['xcrun','--sdk',platform,'swiftc','-parse-as-library','-D','KSTOCK_HTTPS_PREVIEW','-sdk',sdk,'-target',target,'-module-cache-path',str(root/'build/https-module-cache'),str(root/'App.swift'),str(root/'ServerPolicy.swift'),str(root/'AccessCredential.swift'),str(root/'MarketAlerts.swift'),'-o',str(app/'KStockHTTPSPreview'),'-framework','UIKit','-framework','WebKit'],check=True)
info={'CFBundleIdentifier':'ai.kstock.ios.httpspreview','CFBundleExecutable':'KStockHTTPSPreview','CFBundleName':'K-Stock HTTPS Preview','CFBundlePackageType':'APPL','CFBundleVersion':'1','CFBundleShortVersionString':'0.1.0','MinimumOSVersion':'18.0','UIDeviceFamily':[1,2],'UILaunchScreen':{},'UIApplicationSceneManifest':{'UIApplicationSupportsMultipleScenes':False},'UISupportedInterfaceOrientations':['UIInterfaceOrientationPortrait','UIInterfaceOrientationLandscapeLeft','UIInterfaceOrientationLandscapeRight']}
info['UIBackgroundModes']=['fetch']
info['BGTaskSchedulerPermittedIdentifiers']=[info['CFBundleIdentifier']+'.market-alerts']
with (app/'Info.plist').open('wb') as f:plistlib.dump(info,f)
if not args.device:subprocess.run(['codesign','--force','--sign','-',str(app)],check=True)
print('HTTPS_PREVIEW_ONLY; DEVICE_UNSIGNED='+str(args.device));print(app)
