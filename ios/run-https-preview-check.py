"""Bounded simulator HTTPS check. No resets, credentials, orders or account changes."""
import argparse,datetime,json,pathlib,subprocess,time,hashlib
from verify_https_preview import verify
p=argparse.ArgumentParser();p.add_argument('simulator');args=p.parse_args()
root=pathlib.Path(__file__).resolve().parent;bundle='ai.kstock.ios.httpspreview'
stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
run=root/'build'/('https-check-'+stamp);run.mkdir(parents=True)
summary={'status':'NOT_RUN','kind':'EXECUTED_HTTPS_PREVIEW_CHECK','physicalDevice':False}
launched=False;exitcode=1
try:
    subprocess.run(['xcrun','simctl','list','devices','booted','--json'],check=True,capture_output=True,timeout=15)
    app=root/'build/https-simulator/KStockHTTPSPreview.app'
    summary['binarySha256']=hashlib.sha256((app/'KStockHTTPSPreview').read_bytes()).hexdigest()
    subprocess.run(['xcrun','simctl','install',args.simulator,str(app)],check=True,capture_output=True,timeout=30)
    # Terminate only our separate preview app, preserving its data and all other apps.
    subprocess.run(['xcrun','simctl','terminate',args.simulator,bundle],capture_output=True,timeout=10)
    container=subprocess.check_output(['xcrun','simctl','get_app_container',args.simulator,bundle,'data'],text=True,timeout=15).strip()
    receipt_path=pathlib.Path(container)/'Documents/https-preview-check.json'
    before=receipt_path.read_bytes() if receipt_path.exists() else None
    subprocess.run(['xcrun','simctl','launch',args.simulator,bundle,'--https-preview-check'],check=True,capture_output=True,timeout=15);launched=True
    for _ in range(60):
        if receipt_path.exists() and receipt_path.read_bytes()!=before:break
        time.sleep(.5)
    else:raise TimeoutError('FRESH_HTTPS_RECEIPT_NOT_CREATED')
    receipt=json.loads(receipt_path.read_text());summary['receipt']=receipt
    if receipt.get('serverPageStatus'):summary['reason']=receipt['serverPageStatus']
    summary['status']='BLOCKED' if receipt.get('serverPageStatus')=='BLOCKED_WEB_ASSETS_NOT_DEPLOYED' else 'PASS' if verify(receipt) else 'FAIL';exitcode=0 if summary['status']=='PASS' else 1
except subprocess.TimeoutExpired:summary['reason']='SIMULATOR_COMMAND_TIMEOUT'
except (OSError,ValueError,subprocess.CalledProcessError,TimeoutError) as error:
    summary['reason']=type(error).__name__
finally:
    if launched:
        try:subprocess.run(['xcrun','simctl','terminate',args.simulator,bundle],capture_output=True,timeout=10)
        except (OSError,subprocess.TimeoutExpired):summary['appTermination']='NOT_CONFIRMED'
    (run/'receipt.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'status':summary['status'],'reason':summary.get('reason'),'receipt':str(run/'receipt.json')}))
raise SystemExit(exitcode)
