"""Apply public-market data only, as service user; no environment or unit changes."""
import pathlib,json,tarfile,hashlib,re,argparse,datetime,fcntl,os,shutil
p=argparse.ArgumentParser();p.add_argument('archive');p.add_argument('--root',default='/srv/k-stock-ai/current/data/v2/trading-workspace');a=p.parse_args()
root=pathlib.Path(a.root);assert str(root)=='/srv/k-stock-ai/current/data/v2/trading-workspace' or str(root).startswith('/tmp/kstock-trading-apply-')
root.mkdir(parents=True,exist_ok=True);lock=open(root/'sync.lock','a');fcntl.flock(lock,fcntl.LOCK_EX)
now=datetime.datetime.now(datetime.timezone.utc)
def time(value):
 t=datetime.datetime.fromisoformat(value.replace('Z','+00:00'));assert t.tzinfo is not None and t<=now;return t

def validate(name,d):
 if name=='instruments.json':
  assert set(d)<=set('schemaVersion checkedAt listingAsOf coverage items excluded sources marketCounts boardCounts companyCount'.split())
  assert d['schemaVersion']==1 and 0<len(d['items'])<=30000 and len(d['sources'])==6
  time(d['checkedAt']);assert d['listingAsOf'] is None and d['companyCount'] is None
  assert {s['board'] for s in d['sources']}=={'KOSPI','KOSDAQ','KONEX','NAS','NYS','AMS'}
  for s in d['sources']:
   assert re.fullmatch(r'https://new\.real\.download\.dws\.co\.kr/common/master/(kospi_code\.mst|kosdaq_code\.mst|konex_code\.mst|nasmst\.cod|nysmst\.cod|amsmst\.cod)\.zip',s['sourceUrl']) and re.fullmatch('[a-f0-9]{64}',s['sha256'])
  assert d['coverage']=='KIS_MASTER_SNAPSHOT_NOT_EXCHANGE_RECONCILED'
  for i in d['items']:
   assert set(i)<=set('market symbol name currency exchange board securityType isin'.split())
   assert i['market'] in ['KR','US'] and i['exchange'] in ['KRX','NAS','NYS','AMS'] and isinstance(i['name'],str) and len(i['name'])<=150
   assert re.fullmatch(r'[0-9][A-Z0-9]{5}' if i['market']=='KR' else r'[A-Z][A-Z0-9.]{0,9}',i['symbol'])
 else:
  assert re.fullmatch(r'(KR-KRX-[0-9][A-Z0-9]{5}|US-(NAS|NYS|AMS)-[A-Z][A-Z0-9.]{0,9})\.json',name)
  assert set(d)<=set('bars receivedAt priceAsOf priceType source sourceHash quality timeZone sourceUrl instrumentKey'.split())
  assert d['sourceUrl'] in ['https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/inquire_daily_itemchartprice','https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock/dailyprice']
  assert d['quality']=='OBSERVED_NOT_INDEPENDENTLY_VERIFIED'
  assert d['instrumentKey']==name[:-5] and d['source']=='KIS' and re.fullmatch('[a-f0-9]{64}',d['sourceHash'])
  assert d['priceType']=='PROVIDER_ADJUSTED_DAILY_CLOSE' and 0<len(d['bars'])<=100;time(d['receivedAt'])
  prior=None
  for b in d['bars']:
   assert set(b)==set('date open high low close volume'.split());date=datetime.date.fromisoformat(b['date']);assert date<=now.date()
   assert all(type(b[k]) in [int,float] and 0<b[k]<1e15 for k in ['open','high','low','close'])
   assert type(b['volume']) is int and 0<=b['volume']<=2**53-1 and b['low']<=min(b['open'],b['close'])<=max(b['open'],b['close'])<=b['high']
   assert prior is None or prior<date;prior=date
  assert d['priceAsOf']==d['bars'][-1]['date']
with tarfile.open(a.archive,'r:gz') as archive:
 members=archive.getmembers();assert len(members)<=502 and sum(m.size for m in members)<=50000000
 assert all(m.isfile() and '/' not in m.name and '\\' not in m.name and m.size<=9000000 for m in members)
 assert len({m.name for m in members})==len(members)
 manifest=json.load(archive.extractfile('snapshot-manifest.json'));assert manifest['kind']=='PUBLIC_KIS_MARKET_SNAPSHOT'
 expected={r['name']:r for r in manifest['files']};assert set(expected)=={m.name for m in members}-{'snapshot-manifest.json'}
 payload={}
 for name,row in expected.items():
  data=archive.extractfile(name).read();assert hashlib.sha256(data).hexdigest()==row['sha256'];validate(name,json.loads(data));payload[name]=data
stamp=now.strftime('%Y%m%dT%H%M%S%fZ');backup=root/'sync-backups'/stamp;backup.mkdir(parents=True)
applied=[];skipped=[]
try:
 for name,data in payload.items():
  target=root/name;assert not target.is_symlink()
  if target.exists():
   previous=json.loads(target.read_text());incoming=json.loads(data);field='checkedAt' if name=='instruments.json' else 'receivedAt'
   if time(previous[field])>time(incoming[field]):skipped.append(name);continue
   (backup/name).write_bytes(target.read_bytes())
  temporary=root/(name+'.'+stamp+'.tmp');temporary.write_bytes(data);temporary.chmod(0o600);os.replace(temporary,target);applied.append(name)
except:
 for name in reversed(applied):
  if (backup/name).exists():os.replace(backup/name,root/name)
  else:(root/name).unlink()
 raise
# Bound only our generated public-market backups; preserve any unexpected files.
backups=sorted(p for p in (root/'sync-backups').iterdir() if p.is_dir() and not p.is_symlink() and re.fullmatch(r'\d{8}T\d{12}Z',p.name))
for old in backups[:-48]:
 if all(p.is_file() and not p.is_symlink() and (p.name=='instruments.json' or re.fullmatch(r'(KR-KRX-[0-9][A-Z0-9]{5}|US-(NAS|NYS|AMS)-[A-Z][A-Z0-9.]{0,9})\.json',p.name)) for p in old.iterdir()):shutil.rmtree(old)
print(json.dumps({'status':'APPLIED_PUBLIC_DATA','files':len(applied),'newerFilesPreserved':len(skipped),'userDataIncluded':False,'environmentChanged':False,'serviceChanged':False}))
