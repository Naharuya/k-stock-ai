"""Package an explicit worktree snapshot; no Git reset, secrets, data or deployment."""
import pathlib,json,hashlib,tarfile,datetime,re,subprocess,argparse
parser=argparse.ArgumentParser();parser.add_argument("--require-committed",action="store_true");args=parser.parse_args()
root=pathlib.Path(__file__).resolve().parents[1]
files=[root/'package.json',root/'package-lock.json']
for directory in ['src','public']:
 for p in sorted((root/directory).rglob('*')):
  if p.is_symlink():raise SystemExit('SOURCE_SYMLINK_REJECTED')
  if p.is_file() and p.suffix in ['.js','.json','.html','.css','.svg','.png']:files.append(p)
entries=[]
for p in files:
 data=p.read_bytes();rel=p.relative_to(root).as_posix()
 if p.suffix not in ['.png'] and re.search(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|AKIA[A-Z0-9]{16}|ghp_[A-Za-z0-9]{36}',data):raise SystemExit('SECRET_PATTERN_BLOCKED:'+rel)
 entries.append({'path':rel,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
fingerprint=hashlib.sha256(json.dumps(entries,sort_keys=True).encode()).hexdigest();release='review-'+fingerprint[:16]
out=root/'artifacts/release-prep'/release;out.mkdir(parents=True,exist_ok=True)
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
committed=True
for row in entries:
 result=subprocess.run(['git','show',commit+':'+row['path']],cwd=root,capture_output=True)
 if result.returncode or hashlib.sha256(result.stdout).hexdigest()!=row['sha256']:committed=False
if args.require_committed and not committed:raise SystemExit('SOURCE_NOT_FULLY_COMMITTED')
manifest={'sourceCommit':commit,'sourceMatchesCommit':committed,'kind':'KSTOCK_SERVER_REVIEW','release':release,'fingerprint':fingerprint,'reviewOnly':True,'files':entries,'excluded':['root data/','.env','node_modules','keys','profiles'],'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
(out/'server-review-manifest.json').write_text(json.dumps(manifest,indent=2))
archive=out/(release+'.tar.gz')
with tarfile.open(archive,'w:gz') as tar:
 for p in files:tar.add(p,arcname=p.relative_to(root).as_posix(),recursive=False)
 tar.add(out/'server-review-manifest.json',arcname='server-review-manifest.json')
receipt={'archive':str(archive),'manifest':str(out/'server-review-manifest.json'),'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'release':release,'files':len(files),'status':'PACKAGED_NOT_DEPLOYED'}
(out/'receipt.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt))
