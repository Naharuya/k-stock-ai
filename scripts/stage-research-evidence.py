"""Install explicitly reviewed saved public research without replacing any existing file."""
import argparse,pathlib,tarfile,json,hashlib,os
p=argparse.ArgumentParser();p.add_argument('archive');p.add_argument('--root',default='/srv/k-stock-ai/current/data/v2');args=p.parse_args();root=pathlib.Path(args.root).resolve()
with tarfile.open(args.archive,'r:gz') as tar:
 members=tar.getmembers();names=[m.name for m in members]
 if len(members)>100 or len(names)!=len(set(names)) or sum(m.size for m in members)>40_000_000:raise SystemExit('ARCHIVE_REJECTED')
 manifest=json.load(tar.extractfile('manifest.json'));expected={x['path']:x for x in manifest['files']}
 if manifest.get('kind')!='SAVED_PUBLIC_RESEARCH' or set(names)!=set(expected)|{'manifest.json'}:raise SystemExit('MANIFEST_REJECTED')
 payload=[]
 for m in members:
  if not m.isfile() or m.name.startswith('/') or '..' in pathlib.PurePosixPath(m.name).parts:raise SystemExit('PATH_REJECTED')
  if m.name=='manifest.json':continue
  if not ((m.name.startswith('influence/') and len(pathlib.PurePosixPath(m.name).parts)==2 and m.name.endswith('.json')) or m.name in ['verification/peer-share-bridge-review.json','verification/signal-sp500-research-20261012.json','reports/latest.json','research-progress.json']):raise SystemExit('FILE_NOT_APPROVED')
  data=tar.extractfile(m).read();row=expected[m.name]
  if hashlib.sha256(data).hexdigest()!=row['sha256'] or len(data)!=row['bytes']:raise SystemExit('HASH_MISMATCH')
  json.loads(data);target=root/m.name
  if target.exists() and target.read_bytes()!=data:raise SystemExit('EXISTING_DATA_PRESERVED_NO_OVERWRITE')
  if target.resolve()!=target:raise SystemExit('SYMLINK_REJECTED')
  payload.append((target,data))
 created=0
 for target,data in payload:
  target.parent.mkdir(parents=True,exist_ok=True)
  if target.exists():continue
  fd=os.open(target,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
  with os.fdopen(fd,'wb') as out:out.write(data)
  created+=1
print(json.dumps({'status':'SAVED_RESEARCH_INSTALLED','files':len(payload),'created':created,'newOfficialCollection':False,'userDataOverwritten':False,'serviceRestarted':False}))
