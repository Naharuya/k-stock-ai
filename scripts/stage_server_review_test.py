import unittest,tempfile,pathlib,subprocess,tarfile,io,json,hashlib,sys
SCRIPT=pathlib.Path(__file__).with_name('stage-server-review.py')
class ArchiveTests(unittest.TestCase):
 def run_case(self,rows,manifest=None):
  with tempfile.TemporaryDirectory() as tmp:
   root=pathlib.Path(tmp);archive=root/'candidate.tar.gz'
   with tarfile.open(archive,'w:gz') as tar:
    for name,body in rows:
     data=body.encode();item=tarfile.TarInfo(name);item.size=len(data);tar.addfile(item,io.BytesIO(data))
    if manifest:
     data=json.dumps(manifest).encode();item=tarfile.TarInfo('server-review-manifest.json');item.size=len(data);tar.addfile(item,io.BytesIO(data))
   result=subprocess.run([sys.executable,str(SCRIPT),str(archive),'--root',str(root/'server')],capture_output=True,text=True)
   self.assertNotEqual(result.returncode,0);self.assertFalse((root/'server').exists());return result.stderr
 def test_reject_private_and_traversal(self):
  for name in ['.env','../src/server.js','src/../.env','public/token.pem']:
   self.assertIn('REJECTED',self.run_case([(name,'no-secret')]))
 def test_reject_duplicate_entries(self):self.assertIn('DUPLICATE_ARCHIVE_PATH',self.run_case([('package.json','{}'),('package.json','{}')]))
 def test_reject_corrupt_hash_before_extract(self):
  manifest={'kind':'KSTOCK_SERVER_REVIEW','reviewOnly':True,'release':'review-0123456789abcdef','files':[{'path':'package.json','bytes':2,'sha256':'0'*64}]}
  self.assertIn('SOURCE_HASH_MISMATCH',self.run_case([('package.json','{}')],manifest))
if __name__=='__main__':unittest.main()
