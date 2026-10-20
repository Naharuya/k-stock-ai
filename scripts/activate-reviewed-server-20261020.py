"""Prepared activation only; requires explicit arguments and separate operator approval."""
import pathlib,subprocess,json,hashlib,time,urllib.request,urllib.error,datetime,shlex,argparse
parser=argparse.ArgumentParser()
parser.add_argument('--activate',required=True,choices=['review-e0dd69f0bd83fd13'])
args=parser.parse_args()
base=pathlib.Path('/srv/k-stock-ai'); old=base/'current';stage=base/'releases'/args.activate
override=pathlib.Path('/etc/systemd/system/k-stock-ai.service.d/90-reviewed-release.conf')
envpath=pathlib.Path('/etc/k-stock-ai/k-stock-ai.env')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def run(*args):return subprocess.run(args,check=True,capture_output=True,text=True,timeout=30).stdout.strip()
assert sha(old/'src/server.js')=='88da0c2438232a9179cb1e6303b626a81defedbb30f01400f69bcf200478f25f'
assert not override.exists() and not run('systemctl','show','k-stock-ai','--value','--property=DropInPaths')
manifest=json.loads((stage/'server-review-manifest.json').read_text())
for row in manifest['files']:assert sha(stage/row['path'])==row['sha256']
assert json.loads((stage/'stage-receipt.json').read_text())['status']=='STAGED_VERIFIED_NOT_ACTIVE'
values={}
for line in envpath.read_text().splitlines():
 if '=' in line and not line.lstrip().startswith('#'):
  k,v=line.split('=',1); words=shlex.split(v);values[k.strip()]=words[0] if words else ''
assert values.get('KSTOCK_EXTERNAL_ACCESS_ENABLED')=='true' and len(values.get('KSTOCK_EXTERNAL_ACCESS_TOKEN',''))>=32
assert values.get('KSTOCK_AI_MODE','mock')=='mock'
assert all(values.get(k,'false')=='false' for k in ['KSTOCK_BROKER_ENABLED','KSTOCK_LIVE_TRADING_ENABLED','KSTOCK_RESEARCH_COLLECTION_ENABLED','KSTOCK_PEER_WORKER_ENABLED'])
envhash=sha(envpath);oldhash=sha(old/'src/server.js')
# Keep durable state under the original current directory; no user data is copied or removed.
if (stage/'data').exists():
 assert (stage/'data').is_dir() and not any((stage/'data').iterdir())
 (stage/'data').rename(stage/'data-empty-review-preserved')
(old/'data').mkdir(exist_ok=True)
run('chown','ubuntu:ubuntu',str(old/'data'))
(stage/'data').symlink_to(old/'data',target_is_directory=True)
def req(route,body=None,auth=False):
 headers={'Authorization':'Bearer '+values['KSTOCK_EXTERNAL_ACCESS_TOKEN']} if auth else {}
 if body is not None:headers['Content-Type']='application/json'
 try:r=urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:3000'+route,data=body,headers=headers),timeout=4)
 except urllib.error.HTTPError as e:r=e
 with r:return r.status,r.headers,r.read().decode()
checks=[];activated=False;rollback=False
try:
 override.parent.mkdir(exist_ok=True)
 override.write_text('[Service]\nExecStart=\nExecStart=/usr/bin/node '+str(stage/'src/server.js')+'\nEnvironment=KSTOCK_BROKER_ENABLED=false KSTOCK_LIVE_TRADING_ENABLED=false KSTOCK_RESEARCH_COLLECTION_ENABLED=false KSTOCK_PEER_WORKER_ENABLED=false\n')
 run('systemctl','daemon-reload');run('systemctl','restart','k-stock-ai');activated=True
 for _ in range(40):
  try:
   code,_,text=req('/health')
   if code==200:break
  except OSError:time.sleep(.25)
 else:raise RuntimeError('HEALTH_TIMEOUT')
 h=json.loads(text);assert h.get('brokerEnabled') is False and h.get('liveTrading') is False
 checks.append('health_trading_off')
 for route,marker in [('/','id="paper-portfolio"'),('/app.js','function loadPaperPerformance('),('/paper-backup.js','KStockPaperBackup'),('/styles.css','paper-'),('/workspace-navigation.js','availableGroups'),('/workspace-navigation.css','.navigation-group')]:
  code,_,text=req(route);assert code==200 and marker in text;checks.append('asset:'+route)
 assert req('/api/v2/candidates')[0]==401;checks.append('anonymous_401')
 assert req('/api/v2/paper/performance',b'{}',True)[0]==400;checks.append('authenticated_invalid_400')
 payload={'fromDate':'2026-09-01','toDate':'2026-09-03','initialCash':1000,'positions':[{'market':'KR','ticker':'005930','buy':100,'quantity':1}]}
 code,headers,text=req('/api/v2/paper/performance',json.dumps(payload).encode(),True)
 assert code==200 and json.loads(text).get('status')=='PENDING' and headers.get('Cache-Control')=='no-store';checks.append('authenticated_pending_no_store')
 assert sha(envpath)==envhash and sha(old/'src/server.js')==oldhash;checks.append('original_env_and_source_preserved')
 assert run('systemctl','is-active','k-stock-ai')=='active'
 status='ACTIVE_LOCAL_VERIFIED'
except Exception as e:
 override.unlink(missing_ok=True);run('systemctl','daemon-reload');run('systemctl','restart','k-stock-ai');rollback=True;status='ROLLED_BACK_'+type(e).__name__
result={'kind':'KSTOCK_REVIEWED_ACTIVATION','checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':status,'release':stage.name,'checks':checks,'rollbackExecuted':rollback,'originalEnvironmentPreserved':sha(envpath)==envhash,'originalSourcePreserved':sha(old/'src/server.js')==oldhash,'persistentDataPath':str(old/'data'),'service':run('systemctl','is-active','k-stock-ai')}
print(json.dumps(result,indent=2));raise SystemExit(0 if status=='ACTIVE_LOCAL_VERIFIED' else 1)
