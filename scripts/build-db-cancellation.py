"""Reuse hash-checked official archives; export only cancellation-specific facts."""
import json,hashlib,zipfile,re,html
from pathlib import Path
root=Path.cwd();assert str(root)=='/Users/ari/ARI/projects/k-stock-ai'
base=root/'data/v2/verification/db-correction-1791783200385'
audit=json.loads((base/'numeric-audit.json').read_text());docs=[]
for receipt,role in [('20260316001250','ANNUAL'),('20260601001661','CORRECTION')]:
 raw=(base/(receipt+'.zip')).read_bytes();sha=hashlib.sha256(raw).hexdigest();assert sha==audit['sourceArchiveHashes'][receipt]
 z=zipfile.ZipFile(base/(receipt+'.zip'));text=' '.join(html.unescape(re.sub('<[^>]+>',' ',z.read(receipt+'.xml').decode())).split())
 marker=re.search(r'\(2025\.09\.30,\s*894,000주 이익소각\)',text);assert marker and '43,504,588' in text and '112,579' in text
 row={'role':role,'stockCode':'000990','documentId':receipt,'sha256':sha,'sourceIntegrityVerified':True,'sourceUrl':'https://dart.fss.or.kr/dsaf001/main.do?rcpNo='+receipt,'disclosureDate':receipt[:4]+'-'+receipt[4:6]+'-'+receipt[6:8],'shareClass':'COMMON','issuedSharesAfter':43504588,'actualStatement':marker.group()}
 if role=='CORRECTION':
  assert '최초제출일 : 2026년 03월 16일' in text
  row.update({'relatedDocumentId':'20260316001250','correctionRelationVerified':True})
 docs.append(row)
for m in sorted((root/'data/v2/verification').glob('peer-share-originals-*/manifest.json')):
 for r in json.loads(m.read_text()).get('results',[]):
  if r.get('receipt')!='20250915800392' or r.get('status')!='ARCHIVED':continue
  raw=Path(r['file']).read_bytes();assert hashlib.sha256(raw).hexdigest()==r['sha256'];z=zipfile.ZipFile(r['file']);text=' '.join(html.unescape(re.sub('<[^>]+>',' ',z.read('20250915800392.xml').decode())).split());assert '보통주식 (주) 894,000' in text
  decision={'role':'DECISION','stockCode':'000990','documentId':r['receipt'],'sha256':r['sha256'],'sourceIntegrityVerified':True,'sourceUrl':r['sourceUrl'],'disclosureDate':'2025-09-15','shareClass':'COMMON','reportedQuantity':894000}
assert decision;docs.insert(0,decision)
p=root/'data/v2/verification/db-cancellation-input.json';p.write_text(json.dumps({'stockCode':'000990','valuationDate':'2026-10-08','quantity':894000,'beforeShares':44398588,'afterShares':43504588,'documents':docs},ensure_ascii=False));p.chmod(0o600);print('DB_CANCELLATION_ARCHIVES_HASH_CHECKED')

# H1 directly reports the completed cancellation and distinguishes treasury scopes.
h1=None
for m in sorted((root/'data/v2/verification').glob('peer-share-originals-*/manifest.json')):
 for r in json.loads(m.read_text()).get('results',[]):
  if r.get('receipt')=='20260814003091' and r.get('status')=='ARCHIVED':h1=r
assert h1
raw=Path(h1['file']).read_bytes();assert hashlib.sha256(raw).hexdigest()==h1['sha256'];z=zipfile.ZipFile(h1['file']);text=' '.join(html.unescape(re.sub('<[^>]+>',' ',z.read('20260814003091.xml').decode())).split())
assert '소각일 소각방법 주식종류 소각수량 소각금액 2025.09.30 이익소각 보통주 894,000' in text
assert '1,054,464주(교환사채 중 교환청구 미행사분 318,249주 포함)' in text
assert '736,215' in text and '43,504,588' in text and '2026년 06월 30일' in text
baseline={'stockCode':'000990','shareClass':'COMMON','asOfDate':'2026-06-30','availableAt':'2026-08-14T23:59:59+09:00','sourceDocumentId':h1['receipt'],'sourceUrl':h1['sourceUrl'],'sha256':h1['sha256'],'sourceIntegrityVerified':True,'reportedCancellationDate':'2025-09-30','reportedCancellationQuantity':894000,'issuedShares':43504588,'statutoryTreasuryShares':736215,'physicalTreasuryShares':1054464,'unexercisedExchangeShares':318249}
p=root/'data/v2/verification/db-cancellation-baseline-input.json';p.write_text(json.dumps(baseline,ensure_ascii=False));p.chmod(0o600)
