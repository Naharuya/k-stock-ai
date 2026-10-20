"""Bounded public KIS master download. No accounts, tokens, orders or unsafe extraction."""
import pathlib,urllib.request,zipfile,io,json,hashlib,datetime,re,collections,os
ROOT=pathlib.Path(__file__).resolve().parents[1]
TARGET=ROOT/'data/v2/trading-workspace/instruments.json'
SOURCES=[('KOSPI','kospi_code.mst',228),('KOSDAQ','kosdaq_code.mst',222),('KONEX','konex_code.mst',184),('NAS','nasmst.cod',None),('NYS','nysmst.cod',None),('AMS','amsmst.cod',None)]
def parse_master(board,text,tail):
 rows=[];excluded=[]
 for line in text.splitlines(keepends=True):
  if not line.strip():continue
  if tail:
   row=line.strip() if board=='KONEX' else line
   if len(row)<tail+21:raise ValueError('MASTER_ROW_TRUNCATED')
   symbol=row[:9].strip();isin=row[9:21].strip();name=row[21:-tail].strip();group=row[-tail:-tail+2].strip()
   item={'market':'KR','symbol':symbol,'name':name,'currency':'KRW','exchange':'KRX','board':board,'securityType':group,'isin':isin}
   if group not in ['ST','RT','DR','FS']:excluded.append({'symbol':symbol,'board':board,'reason':'NON_SHARE_PRODUCT_OR_UNCLASSIFIED','securityType':group});continue
   if not re.fullmatch(r'[0-9][0-9A-Z]{5}',symbol) or not re.fullmatch(r'KR[0-9A-Z]{10}',isin):excluded.append({'symbol':symbol,'board':board,'reason':'IDENTITY_FORMAT_UNSUPPORTED','securityType':group});continue
  else:
   fields=line.rstrip('\r\n').split('\t')
   if len(fields)<10:raise ValueError('MASTER_COLUMNS_INVALID')
   symbol,name,kind,currency=fields[4],fields[6] or fields[7],fields[8],fields[9]
   if kind!='2' or currency!='USD':excluded.append({'symbol':symbol,'board':board,'reason':'NON_USD_STOCK','securityType':kind});continue
   if not re.fullmatch(r'[A-Z][A-Z0-9.]{0,9}',symbol):excluded.append({'symbol':symbol,'board':board,'reason':'SYMBOL_FORMAT_UNSUPPORTED','securityType':kind});continue
   item={'market':'US','symbol':symbol,'name':name,'currency':'USD','exchange':board,'board':board,'securityType':'STOCK'}
  if not item['name'] or len(item['name'])>150:raise ValueError('MASTER_NAME_INVALID')
  rows.append(item)
 return rows,excluded

def main():
 now=datetime.datetime.now(datetime.timezone.utc)
 if TARGET.exists():
  old=json.loads(TARGET.read_text());age=(now-datetime.datetime.fromisoformat(old['checkedAt'].replace('Z','+00:00'))).total_seconds()
  if 0<=age<86400:print(json.dumps({'status':'CACHED','externalRequests':0,'securities':len(old['items'])}));return
 items=[];excluded=[];sources=[]
 for board,name,tail in SOURCES:
  url='https://new.real.download.dws.co.kr/common/master/'+name+'.zip'
  with urllib.request.urlopen(url,timeout=20) as response:
   data=response.read(8000001);modified=response.headers.get('Last-Modified')
  if len(data)>8000000:raise ValueError('MASTER_DOWNLOAD_LIMIT')
  with zipfile.ZipFile(io.BytesIO(data)) as archive:
   members=archive.infolist()
   if len(members)!=1 or members[0].filename.lower()!=name or members[0].file_size>30000000:raise ValueError('MASTER_ARCHIVE_REJECTED')
   text=archive.read(members[0]).decode('cp949')
  rows,omitted=parse_master(board,text,tail);items.extend(rows);excluded.extend(omitted)
  sources.append({'board':board,'sourceUrl':url,'sha256':hashlib.sha256(data).hexdigest(),'lastModified':modified,'included':len(rows),'excluded':len(omitted)})
 identities=[(i['market'],i['exchange'],i['symbol']) for i in items]
 if len(set(identities))!=len(items) or not all(s['included']>0 for s in sources):raise ValueError('MASTER_COMPLETENESS_OR_DUPLICATES_INVALID')
 record={'schemaVersion':1,'checkedAt':now.isoformat(),'listingAsOf':None,'coverage':'KIS_MASTER_SNAPSHOT_NOT_EXCHANGE_RECONCILED','items':items,'excluded':excluded,'sources':sources,'marketCounts':dict(collections.Counter(i['market'] for i in items)),'boardCounts':dict(collections.Counter(i['board'] for i in items)),'companyCount':None}
 TARGET.parent.mkdir(parents=True,exist_ok=True);temporary=TARGET.with_suffix('.tmp');temporary.write_text(json.dumps(record,ensure_ascii=False));temporary.chmod(0o600);os.replace(temporary,TARGET)
 print(json.dumps({'status':'DOWNLOADED','externalRequests':6,'included':len(items),'excluded':len(excluded),'marketCounts':record['marketCounts'],'boardCounts':record['boardCounts'],'listingAsOf':None}))
if __name__=='__main__':main()
