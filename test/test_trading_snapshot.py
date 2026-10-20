import unittest,pathlib,tempfile,tarfile,io,json,hashlib,subprocess,datetime
ROOT=pathlib.Path(__file__).resolve().parents[1]
class SnapshotTests(unittest.TestCase):
 def payload(self):return {'instrumentKey':'KR-KRX-005930','source':'KIS','sourceHash':'a'*64,'priceType':'PROVIDER_ADJUSTED_DAILY_CLOSE','quality':'OBSERVED_NOT_INDEPENDENTLY_VERIFIED','timeZone':'Asia/Seoul','sourceUrl':'https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/inquire_daily_itemchartprice','receivedAt':'2026-10-19T12:00:00Z','priceAsOf':'2026-10-19','bars':[{'date':'2026-10-19','open':100,'high':110,'low':90,'close':105,'volume':10}]}
 def archive(self,folder,payload,name='KR-KRX-005930.json',bad_hash=False):
  data=json.dumps(payload).encode();manifest={'kind':'PUBLIC_KIS_MARKET_SNAPSHOT','files':[{'name':name,'sha256':'0'*64 if bad_hash else hashlib.sha256(data).hexdigest()}]};archive=pathlib.Path(folder)/'source.tar.gz'
  with tarfile.open(archive,'w:gz') as t:
   for n,b in [(name,data),('snapshot-manifest.json',json.dumps(manifest).encode())]:
    i=tarfile.TarInfo(n);i.size=len(b);t.addfile(i,io.BytesIO(b))
  return archive
 def apply(self,archive,target):return subprocess.run(['python3',str(ROOT/'scripts/apply-trading-snapshot.py'),str(archive),'--root',str(target)],capture_output=True,text=True)
 def test_valid_public_data_and_newer_preservation(self):
  with tempfile.TemporaryDirectory(prefix='kstock-trading-apply-',dir='/tmp') as d:
   target=pathlib.Path(d)/'data';p=self.payload();archive=self.archive(d,p);r=self.apply(archive,target);self.assertEqual(r.returncode,0,r.stderr)
   p['receivedAt']='2026-10-19T10:00:00Z';r=self.apply(self.archive(d,p),target);self.assertEqual(r.returncode,0,r.stderr);self.assertEqual(json.loads(r.stdout)['newerFilesPreserved'],1);self.assertEqual(json.loads((target/'KR-KRX-005930.json').read_text())['receivedAt'],'2026-10-19T12:00:00Z')
 def test_generated_public_backups_are_bounded_and_unexpected_user_files_preserved(self):
  with tempfile.TemporaryDirectory(prefix='kstock-trading-apply-',dir='/tmp') as d:
   target=pathlib.Path(d)/'data';base=target/'sync-backups';base.mkdir(parents=True)
   for n in range(50):
    folder=base/('20250101T'+str(n).zfill(12)+'Z');folder.mkdir();(folder/'KR-KRX-005930.json').write_text('{}')
   archive=self.archive(d,self.payload());r=self.apply(archive,target);self.assertEqual(r.returncode,0,r.stderr);self.assertEqual(len(list(base.iterdir())),48)
   protected=base/'20240101T000000000000Z';protected.mkdir();(protected/'user-note.txt').write_text('preserve');r=self.apply(archive,target);self.assertEqual(r.returncode,0,r.stderr);self.assertTrue((protected/'user-note.txt').exists())
 def test_private_fields_paths_and_hash_mismatch_rejected(self):
  for mode in ['holding','path','hash','future','source']:
   with self.subTest(mode=mode),tempfile.TemporaryDirectory(prefix='kstock-trading-apply-',dir='/tmp') as d:
    p=self.payload();name='KR-KRX-005930.json'
    if mode=='holding':p['holding']={'averageCost':100,'quantity':2}
    if mode=='path':name='../private.json'
    if mode=='future':p['receivedAt']=(datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(days=1)).isoformat()
    if mode=='source':p['sourceUrl']='https://evil.example/?token=fixture'
    target=pathlib.Path(d)/'data';r=self.apply(self.archive(d,p,name,mode=='hash'),target);self.assertNotEqual(r.returncode,0);self.assertFalse((target/'KR-KRX-005930.json').exists());self.assertFalse((pathlib.Path(d)/'private.json').exists())
if __name__=='__main__':unittest.main()
