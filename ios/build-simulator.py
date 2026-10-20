"""Build a simulator-only local app; no signing account, credentials or downloads."""
from app_icons import compile_app_icons
import pathlib
import plistlib
import subprocess

root = pathlib.Path(__file__).resolve().parent
app = root / 'build' / 'KStockLocal.app'
app.mkdir(parents=True, exist_ok=True)
sdk = subprocess.check_output(['xcrun', '--sdk', 'iphonesimulator', '--show-sdk-path'], text=True).strip()
subprocess.run(['xcrun', '--sdk', 'iphonesimulator', 'swiftc', '-parse-as-library',
                '-sdk', sdk, '-target', 'arm64-apple-ios18.0-simulator',
                '-module-cache-path', str(root / 'build' / 'module-cache'),
                str(root / 'App.swift'), str(root / 'ServerPolicy.swift'), '-o', str(app / 'KStockLocal'),
                '-framework', 'UIKit', '-framework', 'WebKit'], check=True)
info = {'CFBundleIdentifier': 'ai.kstock.ios.localvalidation', 'CFBundleExecutable': 'KStockLocal',
        'CFBundleName': 'K-Stock Local', 'CFBundlePackageType': 'APPL',
        'CFBundleVersion': '1', 'CFBundleShortVersionString': '0.1.0',
        'UIApplicationSceneManifest': {'UIApplicationSupportsMultipleScenes': False},
        'MinimumOSVersion': '18.0', 'UIDeviceFamily': [1, 2], 'UILaunchScreen': {},
        'NSAppTransportSecurity': {'NSAllowsLocalNetworking': True},
        'UISupportedInterfaceOrientations': ['UIInterfaceOrientationPortrait', 'UIInterfaceOrientationLandscapeLeft', 'UIInterfaceOrientationLandscapeRight']}
info.update(compile_app_icons(root, app, 'iphonesimulator'))
with (app / 'Info.plist').open('wb') as file:
    plistlib.dump(info, file)
subprocess.run(['codesign', '--force', '--sign', '-', str(app)], check=True)
print(app)
