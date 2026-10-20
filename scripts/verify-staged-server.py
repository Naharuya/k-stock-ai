"""Verify an existing isolated candidate; never load production env or activate it."""
import argparse, copy, datetime, hashlib, json, os, pathlib, secrets, shutil, socket, subprocess, sys, tempfile, time, urllib.request, urllib.error
parser = argparse.ArgumentParser()
parser.add_argument('stage')
parser.add_argument('--local', action='store_true')
args = parser.parse_args()
stage = pathlib.Path(args.stage).resolve()
if args.local and not str(stage).startswith('/private/tmp/') and not str(stage).startswith('/tmp/'):
    raise SystemExit('LOCAL_TMP_STAGE_REQUIRED')
if stage.parent.name != 'releases' or not stage.name.startswith('review-'):
    raise SystemExit('ISOLATED_REVIEW_PATH_REQUIRED')
current = stage.parent.parent / 'current'
def signature():
    return {'path': str(current.resolve()), 'serverSha256': hashlib.sha256((current/'src/server.js').read_bytes()).hexdigest() if (current/'src/server.js').is_file() else None, 'service': 'NOT_APPLICABLE_LOCAL' if args.local else subprocess.check_output(['systemctl', 'is-active', 'k-stock-ai'], text=True).strip()}
before = signature()
checks = []
def check(name, passed):
    checks.append({'name': name, 'passed': bool(passed)})
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0)); port = sock.getsockname()[1]
token = secrets.token_urlsafe(48)
env = {'PATH': os.environ.get('PATH', '/usr/bin:/bin'), 'HOST': '127.0.0.1', 'PORT': str(port), 'KSTOCK_EXTERNAL_ACCESS_ENABLED': 'true', 'KSTOCK_EXTERNAL_ACCESS_TOKEN': token, 'KSTOCK_BROKER_ENABLED': 'false', 'KSTOCK_LIVE_TRADING_ENABLED': 'false', 'KSTOCK_RESEARCH_COLLECTION_ENABLED': 'false', 'KSTOCK_AI_MODE': 'mock'}
def request(route, auth=None, body=None):
    headers = {'Authorization': 'Bearer '+auth} if auth else {}
    if body is not None: headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(f'http://127.0.0.1:{port}'+route, headers=headers, data=body)
    try: response = urllib.request.urlopen(req, timeout=5)
    except urllib.error.HTTPError as error: response = error
    with response: return response.status, response.headers, response.read().decode()
process = None
reason = None
pending = None
try:
    with tempfile.TemporaryFile() as log:
        process = subprocess.Popen([shutil.which('node'), 'src/server.js'], cwd=stage, env=env, stdout=log, stderr=subprocess.STDOUT)
        for _ in range(50):
            try:
                code, _, text = request('/health')
                if code == 200: break
            except OSError:
                if process.poll() is not None: raise RuntimeError('CANDIDATE_EXITED')
                time.sleep(.2)
        else: raise RuntimeError('START_TIMEOUT')
        health = json.loads(text)
        check('broker_and_live_trading_disabled', health.get('brokerEnabled') is False and health.get('liveTrading') is False)
        for route, mime, marker in [('/', 'text/html', 'id="paper-portfolio"'), ('/app.js', 'javascript', 'function loadPaperPerformance('), ('/paper-backup.js', 'javascript', 'KStockPaperBackup'), ('/styles.css', 'text/css', 'paper-'), ('/workspace-navigation.js', 'javascript', 'availableGroups'), ('/workspace-navigation.css', 'text/css', '.navigation-group')]:
            code, headers, text = request(route)
            check('asset:'+route, code == 200 and mime in headers.get('Content-Type','') and marker in text)
        for route in ['/api/v2/candidates', '/api/v2/paper/performance']:
            check('anonymous_rejected:'+route, request(route, body=b'{}' if 'paper' in route else None)[0] == 401)
            check('wrong_token_rejected:'+route, request(route, 'invalid-review-token', b'{}' if 'paper' in route else None)[0] == 401)
        code, _, shell = request('/')
        check('menu_assets_linked_in_html', code == 200 and '/workspace-navigation.js' in shell and '/workspace-navigation.css' in shell)
        if (stage/'public/workspace-design.css').is_file():
            for route, mime, marker in [('/workspace-design.css','text/css','--hero-glow'),('/kstock-mark.svg','image/svg+xml','<svg')]:
                code, headers, text = request(route)
                check('design_asset:'+route, code == 200 and mime in headers.get('Content-Type','') and marker in text)
            check('responsive_design_linked', '/workspace-design.css' in shell and '/kstock-mark.svg' in shell)
        valid = {'fromDate':'2026-09-01', 'toDate':'2026-09-03', 'initialCash':1000, 'positions':[{'market':'KR','ticker':'005930','buy':100,'quantity':1,'fee':0,'tax':0}]}
        code, headers, text = request('/api/v2/paper/performance', token, json.dumps(valid).encode())
        data = json.loads(text); pending = data.get('reason')
        check('missing_official_evidence_is_pending', code == 200 and data.get('success') is True and data.get('status') == 'PENDING' and 'portfolio' not in data)
        check('paper_response_not_cached', headers.get('Cache-Control') == 'no-store')
        invalid = [('empty', {})]
        for name, field, value in [('invalid_date','fromDate','2026-02-30'), ('reversed_range','toDate','2026-08-31'), ('zero_cash','initialCash',0)]:
            item = copy.deepcopy(valid); item[field] = value; invalid.append((name,item))
        item = copy.deepcopy(valid); item['positions'][0]['fee'] = -1; invalid.append(('negative_fee',item))
        item = copy.deepcopy(valid); item['positions'][0]['quantity'] = 0; invalid.append(('zero_quantity',item))
        item = copy.deepcopy(valid); item['cashFlows'] = [{'id':'same','date':'2026-09-02','timing':'BEFORE_OPEN','amount':10}]*2; invalid.append(('duplicate_flow_ids',item))
        item = copy.deepcopy(valid); item['sales'] = [{'id':'sale','ticker':'000660','date':'2026-09-02','price':100,'quantity':1}]; invalid.append(('unheld_sale',item))
        for name, payload in invalid:
            code, _, text = request('/api/v2/paper/performance', token, json.dumps(payload).encode())
            check('invalid:'+name, code == 400 and json.loads(text).get('error') == 'PAPER_INPUT_INVALID')
        check('malformed_json_rejected', request('/api/v2/paper/performance', token, b'{')[0] == 400)
except Exception as error:
    reason = type(error).__name__
finally:
    if process:
        process.terminate()
        try: process.wait(timeout=5)
        except subprocess.TimeoutExpired: process.kill(); process.wait()
    after = signature()
    check('active_release_and_service_unchanged', before == after)
result = {'kind':'KSTOCK_STAGED_RUNTIME_VERIFICATION','checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'release':stage.name,'scope':'LOCAL_ISOLATED' if args.local else 'REMOTE_ISOLATED','status':'PASS' if checks and all(c['passed'] for c in checks) and reason is None else 'FAIL','checks':checks,'pendingReason':pending,'error':reason,'active':after,'candidateStopped':process is not None and process.poll() is not None,'productionActivated':False}
print(json.dumps(result, indent=2))
raise SystemExit(0 if result['status']=='PASS' else 1)
