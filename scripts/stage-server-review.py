"""Stage and smoke-test only. Never changes current/, systemd, nginx, .env or user data."""
import argparse,pathlib,tarfile,json,hashlib,tempfile,subprocess,os,secrets,socket,time,urllib.request,urllib.error,shutil
p=argparse.ArgumentParser();p.add_argument('archive');p.add_argument('--root',default='/srv/k-stock-ai');args=p.parse_args()
base=pathlib.Path(args.root).resolve();archive=pathlib.Path(args.archive).resolve()
with tarfile.open(archive,'r:gz') as tar:
 members=tar.getmembers()
 if len(members)>3000 or sum(m.size for m in members)>30_000_000:raise SystemExit('ARCHIVE_LIMIT_EXCEEDED')
 names=[m.name for m in members]
 if len(set(names))!=len(names):raise SystemExit('DUPLICATE_ARCHIVE_PATH')
 for m in members:
  parts=pathlib.PurePosixPath(m.name).parts
  if not m.isfile() or not parts or '..' in parts or m.name.startswith('/') or parts[0] not in ['src','public','package.json','package-lock.json','server-review-manifest.json']:raise SystemExit('ARCHIVE_PATH_REJECTED')
  if any(part in ['.env','node_modules'] or part.endswith(('.pem','.keystore','.mobileprovision')) for part in parts):raise SystemExit('PRIVATE_FILE_REJECTED')
 manifest=json.load(tar.extractfile('server-review-manifest.json'))
 import re
 if manifest.get('kind')!='KSTOCK_SERVER_REVIEW' or manifest.get('reviewOnly') is not True or not re.fullmatch(r'review-[a-f0-9]{16}',manifest.get('release','')):raise SystemExit('REVIEW_MANIFEST_REQUIRED')
 expected={row['path']:row for row in manifest['files']}
 if set(names)!=set(expected)|{'server-review-manifest.json'}:raise SystemExit('MANIFEST_MEMBERS_MISMATCH')
 for name,row in expected.items():
  data=tar.extractfile(name).read()
  if len(data)!=row['bytes'] or hashlib.sha256(data).hexdigest()!=row['sha256']:raise SystemExit('SOURCE_HASH_MISMATCH')
 releases=base/'releases'
 if releases.resolve()!=releases:raise SystemExit('RELEASES_SYMLINK_REJECTED')
 releases.mkdir(parents=True,exist_ok=True);stage=releases/manifest['release']
 if stage.exists():raise SystemExit('REVIEW_ALREADY_EXISTS_NO_OVERWRITE')
 stage.mkdir()
 for member in members:
  target=stage/member.name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(tar.extractfile(member).read());target.chmod(0o600)
def active_signature():
 current=base/'current';server=current/'src/server.js'
 return {'target':str(current.resolve()),'exists':current.exists(),'server':hashlib.sha256(server.read_bytes()).hexdigest() if server.is_file() else None}
before_active=active_signature()
def require(value,reason):
 if not value:raise RuntimeError(reason)
result={'status':'STAGE_FAILED','release':manifest['release'],'path':str(stage),'currentChanged':False,'serviceChanged':False,'environmentChanged':False,'userDataCopied':False}
process=None
try:
 with (stage/'install.log').open('w') as log:
  subprocess.run(['npm','ci','--ignore-scripts','--no-audit','--no-fund'],cwd=stage,stdout=log,stderr=subprocess.STDOUT,check=True,timeout=180)
 # Never load the real service environment or production authentication token.
 with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
 token=secrets.token_urlsafe(48)
 env={'PATH':os.environ.get('PATH','/usr/bin:/bin'),'HOST':'127.0.0.1','PORT':str(port),'KSTOCK_EXTERNAL_ACCESS_ENABLED':'true','KSTOCK_EXTERNAL_ACCESS_TOKEN':token,'KSTOCK_BROKER_ENABLED':'false','KSTOCK_LIVE_TRADING_ENABLED':'false','KSTOCK_RESEARCH_COLLECTION_ENABLED':'false','KSTOCK_AI_MODE':'mock'}
 def request(route,auth=False,body=None):
  headers={'Authorization':'Bearer '+token} if auth else {}
  if body is not None:headers['Content-Type']='application/json'
  r=urllib.request.Request('http://127.0.0.1:'+str(port)+route,data=body,headers=headers)
  try:
   with urllib.request.urlopen(r,timeout=3) as response:return response.status,response.headers.get('Content-Type',''),response.read().decode()
  except urllib.error.HTTPError as error:return error.code,error.headers.get('Content-Type',''),''
 with (stage/'smoke.log').open('w') as log:
  process=subprocess.Popen([shutil.which('node'),'src/server.js'],cwd=stage,env=env,stdout=log,stderr=subprocess.STDOUT)
  for _ in range(50):
   try:
    code,_,body=request('/health');health=json.loads(body)
    if code==200:break
   except (OSError,ValueError):
    if process.poll() is not None:raise RuntimeError('REVIEW_SERVER_EXITED')
    time.sleep(.2)
  else:raise RuntimeError('REVIEW_SERVER_TIMEOUT')
  require(health.get('brokerEnabled') is False and health.get('liveTrading') is False,'TRADING_GUARD_FAILED')
  code,mime,html=request('/');require(code==200 and 'text/html' in mime and 'id="paper-portfolio"' in html,'WEB_HTML_FAILED')
  for route,marker in [('/app.js','function loadPaperPerformance('),('/paper-backup.js','KStockPaperBackup'),('/styles.css','paper-')]:
   code,_,body=request(route);require(code==200 and marker in body,'WEB_ASSET_FAILED')
  require(request('/api/v2/candidates')[0]==401,'ANONYMOUS_CANDIDATES_NOT_REJECTED')
  require(request('/api/v2/paper/performance')[0]==401,'ANONYMOUS_PAPER_NOT_REJECTED')
  require(request('/api/v2/paper/performance',auth=True,body=b'{}')[0]==400,'PAPER_ROUTE_MISSING')
 result.update(status='STAGED_VERIFIED_NOT_ACTIVE',webAssets=True,anonymousApiRejected=True,paperRouteRegistered=True,brokerEnabled=False,liveTrading=False)
except Exception as error:
 result['reason']=type(error).__name__
finally:
 if process:
  process.terminate()
  try:process.wait(timeout=5)
  except subprocess.TimeoutExpired:process.kill();process.wait()
 result['currentChanged']=active_signature()!=before_active
 if result['currentChanged']:result.update(status='STAGE_FAILED',reason='ACTIVE_RELEASE_CHANGED_DURING_STAGING')
 (stage/'stage-receipt.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result));raise SystemExit(0 if result['status']=='STAGED_VERIFIED_NOT_ACTIVE' else 1)
