"""Activate an exact committed, staged candidate with preserved configuration and rollback."""
import argparse,pathlib,re,hashlib,json,subprocess,shlex,time,urllib.request,urllib.error,datetime
p=argparse.ArgumentParser();p.add_argument('--activate',required=True);p.add_argument('--expected-active',required=True);args=p.parse_args()
if not all(re.fullmatch(r'review-[a-f0-9]{16}',x) for x in [args.activate,args.expected_active]):raise SystemExit('EXACT_RELEASE_REQUIRED')
base=pathlib.Path('/srv/k-stock-ai');stage=base/'releases'/args.activate;previous=base/'releases'/args.expected_active
unit=pathlib.Path('/etc/systemd/system/k-stock-ai.service.d/90-reviewed-release.conf');environment=pathlib.Path('/etc/k-stock-ai/k-stock-ai.env')
def run(*cmd):return subprocess.check_output(cmd,stderr=subprocess.PIPE,text=True,timeout=30).strip()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
oldunit=unit.read_bytes();assert str(previous/'src/server.js') in oldunit.decode()
assert str(previous/'src/server.js') in run('systemctl','show','k-stock-ai','--value','--property=ExecStart')
manifest=json.loads((stage/'server-review-manifest.json').read_text());assert manifest.get('sourceMatchesCommit') is True
assert json.loads((stage/'stage-receipt.json').read_text())['status']=='STAGED_VERIFIED_NOT_ACTIVE'
for row in manifest['files']:assert sha(stage/row['path'])==row['sha256']
values={}
for line in environment.read_text().splitlines():
 if '=' in line and not line.lstrip().startswith('#'):
  k,v=line.split('=',1);words=shlex.split(v);values[k.strip()]=words[0] if words else ''
assert len(values.get('KSTOCK_EXTERNAL_ACCESS_TOKEN',''))>=32 and values.get('KSTOCK_EXTERNAL_ACCESS_ENABLED')=='true'
assert all(values.get(k,'false')=='false' for k in ['KSTOCK_BROKER_ENABLED','KSTOCK_LIVE_TRADING_ENABLED','KSTOCK_RESEARCH_COLLECTION_ENABLED','KSTOCK_PEER_WORKER_ENABLED'])
before=sha(environment);data=base/'current/data';assert data.is_dir()
if (stage/'data').exists():
 assert not (stage/'data').is_symlink() and not any((stage/'data').iterdir());(stage/'data').rename(stage/'empty-review-data-preserved')
(stage/'data').symlink_to(data,target_is_directory=True)
(stage/'activation-previous-unit.conf').write_bytes(oldunit)
def request(route,body=None,auth=False):
 headers={'Authorization':'Bearer '+values['KSTOCK_EXTERNAL_ACCESS_TOKEN']} if auth else {}
 if body is not None:headers['Content-Type']='application/json'
 try:r=urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:3000'+route,data=body,headers=headers),timeout=8)
 except urllib.error.HTTPError as error:r=error
 with r:return r.status,r.headers,r.read().decode()
checks=[];rollback=False
try:
 unit.write_text('[Service]\nExecStart=\nExecStart=/usr/bin/node '+str(stage/'src/server.js')+'\nEnvironment=KSTOCK_BROKER_ENABLED=false KSTOCK_LIVE_TRADING_ENABLED=false KSTOCK_RESEARCH_COLLECTION_ENABLED=false KSTOCK_PEER_WORKER_ENABLED=false\n')
 run('systemctl','daemon-reload');run('systemctl','restart','k-stock-ai')
 for _ in range(40):
  try:
   code,_,body=request('/health')
   if code==200:break
  except OSError:time.sleep(.25)
 else:raise RuntimeError('START_TIMEOUT')
 health=json.loads(body);assert health.get('brokerEnabled') is False and health.get('liveTrading') is False;checks.append('health_trading_off')
 for route,marker in [('/','paper-portfolio'),('/app.js','requestToken'),('/workspace-navigation.js','availableGroups'),('/research-progress.js','newOfficialDocuments'),('/privacy.html','Keychain')]:
  code,_,body=request(route);assert code==200 and marker in body;checks.append(route)
 if (stage/'public/workspace-design.css').is_file():
  code,_,body=request('/workspace-design.css');assert code==200 and '--hero-glow' in body;checks.append('responsive_design_css')
  code,_,body=request('/kstock-mark.svg');assert code==200 and '<svg' in body;checks.append('brand_svg')
 assert request('/api/v2/research/dashboard')[0]==401;checks.append('anonymous_401')
 code,_,body=request('/api/v2/research/dashboard',auth=True);dashboard=json.loads(body);assert code==200 and dashboard.get('success') is True and dashboard.get('recommendationStatus')=='HOLD' and dashboard.get('summary',{}).get('researchEvents',0)>0;checks.append('authenticated_saved_research_hold')
 code,_,body=request('/api/v2/research/progress',auth=True);progress=json.loads(body);assert code==200 and progress.get('sourceCollection')=='NOT_RUN' and progress.get('newOfficialDocuments')==0;checks.append('task_completion_not_source_collection')
 assert request('/api/v2/paper/performance',b'{}',True)[0]==400;checks.append('invalid_paper_400')
 assert sha(environment)==before;checks.append('environment_preserved')
 status='ACTIVE_VERIFIED'
except Exception as error:
 unit.write_bytes(oldunit);run('systemctl','daemon-reload');run('systemctl','restart','k-stock-ai');rollback=True;status='ROLLED_BACK_'+type(error).__name__
result={'status':status,'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'release':args.activate,'sourceCommit':manifest['sourceCommit'],'rollbackExecuted':rollback,'checks':checks,'environmentPreserved':sha(environment)==before,'service':run('systemctl','is-active','k-stock-ai'),'persistentData':str(data)}
print(json.dumps(result,indent=2));raise SystemExit(0 if status=='ACTIVE_VERIFIED' else 1)
