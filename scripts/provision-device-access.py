"""Explicit owner provisioning; no credentials in arguments, logs, source, APKs or receipts.
Temporary files are removed after one-shot device import into native secure storage.
"""
import subprocess,pathlib,tempfile,json,time,os
root=pathlib.Path(__file__).resolve().parents[1]
android='RFCW1178RRE';iphone='00008120-001855410CC3A01E';package='ai.kstock.mobile.localvalidation';bundle='ai.kstock.ios.localvalidation'
def run(args,**kwargs):return subprocess.run(args,check=True,capture_output=True,timeout=40,**kwargs)
# Read only the existing access token; keep stdout in process memory, never print it.
remote="""import pathlib,shlex,json
values={}
for line in pathlib.Path('/etc/k-stock-ai/k-stock-ai.env').read_text().splitlines():
 if '=' in line and not line.lstrip().startswith('#'):
  key,value=line.split('=',1);words=shlex.split(value);values[key.strip()]=words[0] if words else ''
print(json.dumps({'token':values['KSTOCK_EXTERNAL_ACCESS_TOKEN']}))
"""
result=run(['ssh','-i','/Users/ari/.ssh/ari-production-key.pem','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','ubuntu@1.201.113.102','sudo','-n','python3','-'],input=remote.encode())
token=json.loads(result.stdout)['token']
if not 32<=len(token)<=4096:raise SystemExit('ACCESS_CONFIGURATION_INVALID')
remote_file='/sdcard/Android/data/'+package+'/files/kstock-auth-import.json'
with tempfile.TemporaryDirectory(prefix='kstock-auth-',dir='/private/tmp') as directory:
 file=pathlib.Path(directory)/'credential.json';fd=os.open(file,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
 with os.fdopen(fd,'w') as output:json.dump({'origin':'https://kstock.ai.kr','issuedAt':time.time(),'token':token},output)
 try:
  run(['adb','-s',android,'push',str(file),remote_file])
  run(['adb','-s',android,'shell','am','force-stop',package])
  run(['adb','-s',android,'shell','am','start','-n',package+'/ai.kstock.mobile.MainActivity','--ez','kstock_import_credentials','true'])
  run(['xcrun','devicectl','device','copy','to','--device',iphone,'--domain-type','appDataContainer','--domain-identifier',bundle,'--source',str(file),'--destination','Documents/kstock-auth-import.json','--timeout','25'])
  run(['xcrun','devicectl','device','process','launch','--device',iphone,'--terminate-existing',bundle,'--import-auth','--access-check'])
 finally:
  file.unlink(missing_ok=True)
  run(['adb','-s',android,'shell','rm','-f',remote_file])
print(json.dumps({'status':'PROVISIONING_SENT','android':'ENCRYPTED_VAULT_IMPORT','ios':'KEYCHAIN_IMPORT','localTemporaryCredentialRemoved':True,'tokenPrinted':False}))
