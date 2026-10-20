"""Compile the shared iOS AppIcon catalog and return the generated bundle metadata."""
import pathlib, plistlib, subprocess

def compile_app_icons(root, app, platform):
    partial = app.parent / 'app-icon-info.plist'
    subprocess.run(['xcrun', 'actool', str(root / 'Assets.xcassets'),
                    '--compile', str(app), '--platform', platform,
                    '--minimum-deployment-target', '18.0', '--app-icon', 'AppIcon',
                    '--target-device', 'iphone', '--target-device', 'ipad',
                    '--output-partial-info-plist', str(partial)], check=True,
                   stdout=subprocess.DEVNULL)
    with partial.open('rb') as source:
        info = plistlib.load(source)
    assert info.get('CFBundleIcons', {}).get('CFBundlePrimaryIcon', {}).get('CFBundleIconName') == 'AppIcon'
    assert (app / 'Assets.car').is_file()
    return info
