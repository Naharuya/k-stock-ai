"""Existing-profile local validation only. Never create/change accounts or profiles."""
import argparse, datetime, hashlib, ipaddress, pathlib, plistlib, re, shutil, subprocess
from urllib.parse import urlsplit

parser=argparse.ArgumentParser()
parser.add_argument('--device', required=True)
parser.add_argument('--url', required=True)
parser.add_argument('--https', action='store_true')
args=parser.parse_args()
url=urlsplit(args.url)
address=None if args.https else ipaddress.IPv4Address(url.hostname or '')
if args.https and args.url!='https://kstock.ai.kr/':raise SystemExit('FIXED_HTTPS_ORIGIN_REQUIRED')
if not args.https and (not address.is_private or address.is_loopback or address.is_unspecified or url.scheme!='http' or url.port!=3104 or url.username or url.password or url.query or url.fragment or url.path not in ('','/')):
    raise SystemExit('EXPLICIT_PRIVATE_LAN_PREVIEW_URL_REQUIRED')
root=pathlib.Path(__file__).resolve().parent
build=root/'build/device'; app=build/'KStockLocal.app';app.mkdir(parents=True,exist_ok=True)
bundle='ai.kstock.ios.localvalidation'
identities=subprocess.check_output(['security','find-identity','-v','-p','codesigning'],text=True)
profiles=[]
for directory in [pathlib.Path.home()/'Library/MobileDevice/Provisioning Profiles',pathlib.Path.home()/'Library/Developer/Xcode/UserData/Provisioning Profiles']:
    for f in directory.glob('*.mobileprovision'):
        r=subprocess.run(['security','cms','-D','-i',str(f)],capture_output=True)
        if r.returncode:continue
        p=plistlib.loads(r.stdout); e=p.get('Entitlements',{}); application=e.get('application-identifier','')
        prefix=(p.get('ApplicationIdentifierPrefix') or [''])[0]
        if application not in (prefix+'.*',prefix+'.'+bundle) or args.device not in p.get('ProvisionedDevices',[]):continue
        if p['ExpirationDate']<=datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None):continue
        for certificate in p.get('DeveloperCertificates',[]):
            identity=hashlib.sha1(certificate).hexdigest().upper()
            if re.search(r'\b'+identity+r'\b',identities):profiles.append((f,p,identity,prefix));break
if len(profiles)!=1:raise SystemExit('EXACTLY_ONE_EXISTING_MATCHING_PROFILE_REQUIRED')
profile, data, identity, prefix=profiles[0]
sdk=subprocess.check_output(['xcrun','--sdk','iphoneos','--show-sdk-path'],text=True).strip()
subprocess.run(['xcrun','--sdk','iphoneos','swiftc','-parse-as-library','-D',('KSTOCK_HTTPS_PREVIEW' if args.https else 'LOCAL_DEVICE_VALIDATION'),'-sdk',sdk,'-target','arm64-apple-ios18.0','-module-cache-path',str(build/'module-cache'),str(root/'App.swift'),str(root/'ServerPolicy.swift'),str(root/'AccessCredential.swift'),'-o',str(app/'KStockLocal'),'-framework','UIKit','-framework','WebKit'],check=True)
info={'CFBundleIdentifier':bundle,'CFBundleExecutable':'KStockLocal','CFBundleName':'K-Stock Local','CFBundlePackageType':'APPL','CFBundleVersion':'2','CFBundleShortVersionString':'0.1.1','MinimumOSVersion':'18.0','UIDeviceFamily':[1,2],'UILaunchScreen':{},'UIApplicationSceneManifest':{'UIApplicationSupportsMultipleScenes':False},'CFBundleSupportedPlatforms':['iPhoneOS'],'LSRequiresIPhoneOS':True,'KStockValidationURL':args.url,'NSAppTransportSecurity':{'NSAllowsLocalNetworking':True},'NSLocalNetworkUsageDescription':'같은 네트워크의 Mac에서 제공하는 K-Stock 개발 검증 화면과 공개 연구 자료에 연결합니다.','UISupportedInterfaceOrientations':['UIInterfaceOrientationPortrait','UIInterfaceOrientationLandscapeLeft','UIInterfaceOrientationLandscapeRight']}
if args.https:
 info.pop('NSAppTransportSecurity',None);info.pop('NSLocalNetworkUsageDescription',None)
 info.update(CFBundleVersion='6',CFBundleShortVersionString='0.1.5',CFBundleName='K-Stock HTTPS')
with (app/'Info.plist').open('wb') as f:plistlib.dump(info,f)
shutil.copyfile(profile,app/'embedded.mobileprovision')
if args.https:shutil.copyfile(root.parent/'scripts/physical-live-workflow.js',app/'LiveWorkflow.js')
entitlements={'application-identifier':prefix+'.'+bundle,'com.apple.developer.team-identifier':data['TeamIdentifier'][0],'get-task-allow':bool(data['Entitlements'].get('get-task-allow',False)),'keychain-access-groups':[prefix+'.'+bundle]}
with (build/'entitlements.plist').open('wb') as f:plistlib.dump(entitlements,f)
subprocess.run(['codesign','--force','--sign',identity,'--entitlements',str(build/'entitlements.plist'),'--generate-entitlement-der',str(app)],check=True)
subprocess.run(['codesign','--verify','--strict',str(app)],check=True)
print('SIGNED_WITH_EXISTING_PROFILE; NO_ACCOUNT_OR_PROFILE_CHANGES')
print(app)
