"""Package saved public research only; excludes user portfolios, credentials and worker policy."""
import pathlib,json,hashlib,tarfile,re,datetime
root=pathlib.Path(__file__).resolve().parents[1];base=root/'data/v2'
files=sorted((base/'influence').glob('*.json'))
for relative in ['research-progress.json','verification/peer-share-bridge-review.json','verification/signal-sp500-research-20261012.json','reports/latest.json']:
 p=base/relative
 if p.is_file():files.append(p)
entries=[]
for p in files:
 if p.is_symlink() or p.stat().st_size>3_000_000:raise SystemExit('INVALID_RESEARCH_SOURCE')
 data=p.read_bytes();json.loads(data)
 if re.search(rb'-----BEGIN .*PRIVATE KEY|AKIA[A-Z0-9]{16}|sk-proj-[A-Za-z0-9_-]{20,}|"(?:accessToken|password|apiKey|authorization)"\s*:',data,re.I):raise SystemExit('PRIVATE_CONTENT_REJECTED')
 entries.append({'path':str(p.relative_to(base)),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
fingerprint=hashlib.sha256(json.dumps(entries,sort_keys=True).encode()).hexdigest();name='research-'+fingerprint[:16]
out=root/'artifacts/release-prep'/name;out.mkdir(parents=True,exist_ok=True)
manifest={'kind':'SAVED_PUBLIC_RESEARCH','name':name,'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':entries,'newOfficialCollectionClaimed':False,'recommendation':'HOLD'}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2))
with tarfile.open(out/(name+'.tar.gz'),'w:gz') as tar:
 for p in files:tar.add(p,arcname=str(p.relative_to(base)),recursive=False)
 tar.add(out/'manifest.json',arcname='manifest.json')
print(json.dumps({'name':name,'archive':str(out/(name+'.tar.gz')),'sha256':hashlib.sha256((out/(name+'.tar.gz')).read_bytes()).hexdigest(),'files':len(entries)}))
