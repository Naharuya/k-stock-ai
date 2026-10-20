"""Validate actual WKWebView receipts; fixtures are never counted as device runs."""
import argparse
import json
import pathlib
import subprocess
import time

parser = argparse.ArgumentParser()
parser.add_argument('device', help='iOS device UDID')
parser.add_argument('--receipt', type=pathlib.Path, help='Receipt copied from this physical app container')
parser.add_argument('output', type=pathlib.Path)
args = parser.parse_args()
if args.receipt:
    receipt = args.receipt
else:
    container = subprocess.check_output(['xcrun', 'simctl', 'get_app_container', args.device,
                                         'ai.kstock.ios.localvalidation', 'data'], text=True).strip()
    receipt = pathlib.Path(container) / 'Documents/qa-result.json'
result = json.loads(receipt.read_text())
result['receiptModifiedAtUnix'] = receipt.stat().st_mtime
checks = {
    'executed': result.get('status') == 'EXECUTED',
    'recentReceipt': 0 <= time.time() - receipt.stat().st_mtime < 600,
    'sixScreens': len(result.get('screens', [])) == 6 and all(s['active'] and not s['overflow'] for s in result['screens']),
    'actualSamsungDetail': result.get('detail', {}).get('visible') and '005930' in result['detail'].get('title', '') and result['detail'].get('ttm'),
    'failureRetainsEvidence': result.get('failure', {}).get('retained') and result['failure'].get('foldOpen') and '연결 실패' in result['failure'].get('message', ''),
    'recoveryPreservesFold': result.get('recovery', {}).get('foldOpen') and '연결 실패' not in result['recovery'].get('message', ''),
    'largeText': result.get('largeText', {}).get('overflow') is False and result['largeText'].get('buttonHeight', 0) >= 44,
}
if 'currentTtm' in result:
    ttm=result['currentTtm']
    checks['currentTtmApiUiMatch']=len(ttm.get('rows',[]))>=6 and all(r.get('rendered') for r in ttm['rows']) and ttm.get('foldPreserved') is True and ttm.get('recommendationStatus')=='HOLD'
if 'currentTtm' in result and 'valuations' in result['currentTtm']:
    rows = result['currentTtm']['valuations']
    checks['valuationBlockersApiUiMatch'] = len(rows) == 3 and all(r.get('dateRendered') and r.get('held') and r.get('psrRendered') for r in rows)
if 'currentTtm' in result and 'readiness' in result['currentTtm']:
    rows = result['currentTtm']['readiness']
    checks['readinessSummaryApiUiMatch'] = len(rows) == 3 and all(r.get('present') and r.get('rendered') for r in rows)
if 'workspace' in result:
    checks['workspaceNavigationAndReport'] = all(result['workspace'].get(k) is True for k in ['selected','retained','empty','reset','report'])
if 'firstUse' in result:
    guide = result['firstUse']
    checks['firstUseRoutes'] = len(guide.get('rows', [])) == 3 and all(r.get('active') for r in guide['rows']) and guide.get('foldPreserved') is True
if 'tradeRecommendations' in result:
    trade = result['tradeRecommendations']
    checks['tradeRecommendationsApiUiMatch'] = len(trade.get('rows', [])) == 3 and all(r.get('rendered') for r in trade['rows']) and trade.get('emptySell') is True and trade.get('separate') is True and trade.get('orderBlocked') is True and trade.get('overflow') is False
if 'currentTtm' in result and 'observedShares' in result['currentTtm']:
    rows = result['currentTtm']['observedShares']
    checks['observedShareEvidenceMatch'] = len(rows) == 3 and all(r.get('rendered') and r.get('unverified') for r in rows)
if args.receipt:
    from datetime import datetime
    try:
        age = time.time() - datetime.fromisoformat(result.get('checkedAt', '').replace('Z', '+00:00')).timestamp()
    except ValueError:
        age = float('inf')
    checks['physicalReceipt'] = result.get('physicalDevice') is True
    checks['recentExecution'] = -60 <= age < 600
result['assertions'] = checks
result['device'] = args.device
result['overall'] = 'PASS' if all(checks.values()) else 'FAIL'
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'device': args.device, 'checks': checks, 'overall': result['overall']}))
raise SystemExit(0 if all(checks.values()) else 1)
