"""Local simulator UI checks. Preserve VoiceOver state; never expose a LAN port."""
import argparse
import datetime
import json
import pathlib
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('simulator', help='Existing iOS Simulator UDID')
parser.add_argument('--voiceover', action='store_true')
args = parser.parse_args()
root = pathlib.Path(__file__).resolve().parent
stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
run = root / 'build' / ('ui-' + stamp)
run.mkdir(parents=True)
base = ['xcrun', 'devicectl', 'device']
original = run / 'voiceover-before.json'
subprocess.run(base + ['info', 'voiceover', '--device', args.simulator, '--json-output', str(original)], check=True)
was_enabled = json.loads(original.read_text())['result']['enabled']
summary = {'kind': 'EXECUTED_XCUITEST', 'voiceOverMode': args.voiceover, 'physicalDevice': False}
try:
    subprocess.run(base + ['settings', 'voiceover', '--device', args.simulator,
                          '--enable' if args.voiceover else '--disable'], check=True)
    scheme = 'KStockVoiceOver' if args.voiceover else 'KStockLocal'
    bundle = run / 'result.xcresult'
    with (run / 'xcodebuild.log').open('w') as log:
        result = subprocess.run(['xcodebuild', '-project', str(root / 'KStockLocal.xcodeproj'),
                                 '-scheme', scheme, '-destination', 'platform=iOS Simulator,id=' + args.simulator,
                                 '-derivedDataPath', str(root / 'build' / 'xcode'), '-resultBundlePath', str(bundle),
                                 'test'], stdout=log, stderr=subprocess.STDOUT, timeout=240)
    raw = subprocess.check_output(['xcrun', 'xcresulttool', 'get', 'test-results', 'summary', '--path', str(bundle)])
    report = json.loads(raw)
    summary.update({'exitCode': result.returncode, 'result': report, 'bundle': str(bundle)})
    # A zero exit without the intended tests is not a successful QA run.
    expected = 1 if args.voiceover else 3
    summary['passed'] = result.returncode == 0 and report.get('passedTests') == expected and report.get('failedTests') == 0 and report.get('skippedTests', 0) == 0
finally:
    subprocess.run(base + ['settings', 'voiceover', '--device', args.simulator,
                          '--enable' if was_enabled else '--disable'], check=True)
    after = run / 'voiceover-after.json'
    subprocess.run(base + ['info', 'voiceover', '--device', args.simulator, '--json-output', str(after)], check=True)
    summary['voiceOverRestored'] = json.loads(after.read_text())['result']['enabled'] == was_enabled
    (run / 'receipt.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'passed': summary.get('passed', False), 'restored': summary['voiceOverRestored'], 'receipt': str(run / 'receipt.json')}))
raise SystemExit(0 if summary.get('passed') and summary['voiceOverRestored'] else 1)
