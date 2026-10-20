"""Publish only schema-validated public KIS master/bars over existing trusted SSH."""
import pathlib,subprocess,json,hashlib,tarfile,datetime,re,argparse,io
p=argparse.ArgumentParser();p.add_argument('--publish',action='store_true');a=p.parse_args()
root=pathlib.Path(__file__).resolve().parents[1];source=root/'data/v2/trading-workspace';out=root/'data/v2/verification/trading-sync';out.mkdir(parents=True,exist_ok=True)
files=[source/'instruments.json']+([source/'scheduled-events.json'] if (source/'scheduled-events.json').is_file() else [])+sorted((p for p in source.glob('*.json') if re.fullmatch(r'(KR-KRX-[0-9][A-Z0-9]{5}|US-(NAS|NYS|AMS)-[A-Z][A-Z0-9.]{0,9})\.json',p.name)),key=lambda p:p.stat().st_mtime,reverse=True)[:500]
assert len(files)<=502 and all(p.is_file() and not p.is_symlink() and p.stat().st_size<=9000000 for p in files)
manifest={'kind':'PUBLIC_KIS_MARKET_SNAPSHOT','checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':[{'name':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]}
stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ');archive=out/(stamp+'.tar.gz')
with tarfile.open(archive,'w:gz') as tar:
 for f in files:tar.add(f,arcname=f.name,recursive=False)
 data=json.dumps(manifest).encode();info=tarfile.TarInfo('snapshot-manifest.json');info.size=len(data);tar.addfile(info,io.BytesIO(data))
receipt={'status':'PACKAGED_PUBLIC_DATA','files':len(files),'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'published':False}
if a.publish:
 ssh=['ssh','-i','/Users/ari/.ssh/ari-production-key.pem','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','ubuntu@1.201.113.102']
 remote=subprocess.check_output(ssh+['mktemp -d /tmp/kstock-market-sync-XXXXXXXX'],text=True).strip();assert re.fullmatch('/tmp/kstock-market-sync-[A-Za-z0-9]+',remote)
 subprocess.run(['scp','-i','/Users/ari/.ssh/ari-production-key.pem','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes',str(archive),str(root/'scripts/apply-trading-snapshot.py'),'ubuntu@1.201.113.102:'+remote+'/'],check=True,capture_output=True,timeout=60)
 r=subprocess.run(ssh+['python3 '+remote+'/apply-trading-snapshot.py '+remote+'/'+archive.name],capture_output=True,text=True,check=True,timeout=60)
 receipt.update({'status':'PUBLISHED_PUBLIC_DATA','published':True,'remoteReceipt':json.loads(r.stdout)})
for old in sorted((p for p in out.glob('*.tar.gz') if not p.is_symlink() and re.fullmatch(r'\d{8}T\d{12}Z\.tar\.gz',p.name)),key=lambda p:p.name)[:-48]:old.unlink()
(out/(stamp+'-receipt.json')).write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt))
