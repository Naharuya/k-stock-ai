"""Create evidence input from preserved official original documents, offline only."""
import json,hashlib,zipfile,re,html
from pathlib import Path
root=Path.cwd();assert str(root)=='/Users/ari/ARI/projects/k-stock-ai'
archives={}
for m in sorted((root/'data/v2/verification').glob('peer-share-originals-*/manifest.json')):
 for x in json.loads(m.read_text()).get('results',[]):
  if x.get('status')=='ARCHIVED':archives[x['receipt']]=x
rows=[]
for role,receipt in [('INITIAL','20260624000420'),('CORRECTION','20260706000403'),('CORRECTION','20260710000008'),('PAYMENT_RESULT','20260715000004'),('ISSUANCE_RESULT','20260715800045')]:
 x=archives[receipt];raw=Path(x['file']).read_bytes();assert x['ticker']=='000660' and hashlib.sha256(raw).hexdigest()==x['sha256'];z=zipfile.ZipFile(Path(x['file']));t=' '.join(html.unescape(re.sub('<[^>]+>',' ',z.read(next(n for n in z.namelist() if n.endswith('.xml'))).decode())).split());assert '17,790,000' in t and '보통주' in t
 row={'role':role,'stockCode':'000660','documentId':receipt,'sourceUrl':x['sourceUrl'],'sha256':x['sha256'],'sourceIntegrityVerified':True,'disclosureDate':receipt[:4]+'-'+receipt[4:6]+'-'+receipt[6:8],'shareClass':'COMMON','quantity':17790000}
 if role=='CORRECTION':
  assert '최초제출일 : 2026년 06월 24일' in t;row.update({'relatedDocumentId':'20260624000420','correctionRelationVerified':True})
 if role in ['PAYMENT_RESULT','ISSUANCE_RESULT']:
  assert '2026년 07월 14일' in t or '납입일 2026-07-14' in t;row.update({'paymentDate':'2026-07-14','actual':True})
 rows.append(row)
m=json.loads((root/'data/v2/verification/sk-issuance-listing-1791799827787/manifest.json').read_text());raw=Path(m['file']).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['sha256'];rows.append({'role':'LISTING','stockCode':'000660','documentId':m['documentId'],'acceptanceId':m['item']['documentId'],'disclosureDate':m['item']['announcementDate'],'sourceUrl':m['sourceUrl'],'sha256':m['sha256'],'sourceIntegrityVerified':True,'html':raw.decode()})
p=root/'data/v2/verification/sk-issuance-chain-input.json';p.write_text(json.dumps({'stockCode':'000660','valuationDate':'2026-10-08','documents':rows},ensure_ascii=False));p.chmod(0o600);print('official chain input: 6 preserved originals')
