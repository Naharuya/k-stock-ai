# Requires the matching local fixture and the existing validation app in foreground.
# Uses actual guarded taps; does not install, clear app data, or change device settings.
import sys,xml.etree.ElementTree as E,re,json,pathlib,time,datetime
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'));import galaxy_qa_guard as g
def nodes():
 g.require_foreground();g._read('shell','uiautomator','dump','/sdcard/kstock-ledger-qa.xml');return list(E.fromstring(g._read('shell','cat','/sdcard/kstock-ledger-qa.xml')).iter('node'))
def tap(label):
 for attempt in range(6):
  found=[]
  for n in nodes():
   b=list(map(int,re.findall(r'\d+',n.get('bounds'))))
   if (n.get('text')==label or (n.get('content-desc') or '').endswith(label)) and len(b)==4 and 450<b[1]<b[3]<1930:found.append((n,b))
  if found:
   n,b=found[0];g.tap((b[0]+b[2])//2,(b[1]+b[3])//2);return
  g.swipe(850,1700,850,1200,300)
 raise RuntimeError('NOT_VISIBLE:'+label)
def state():
 time.sleep(.7)
 for n in nodes():
  if (n.get('text') or '').startswith('QA 상태 '):return json.loads(n.get('text')[6:])
 raise RuntimeError('STATE_NOT_VISIBLE')
tap('QA 페이지');tap('다음 기록');a=state();assert a['page']==1 and a['first']=='mobile-20',a
tap('QA 첫 기록');tap('기록 수정');b=state();assert b['editing'],b
g.screenshot('/tmp/kstock-galaxy-ledger-edit-20261020.png')
tap('수정 취소');c=state();assert not c['editing'] and c['flows']==45,c
tap('QA 첫 기록');tap('입출금 삭제');d=state();assert d['flows']==44 and d['undo'],d
tap('마지막 개별 삭제 되돌리기');e=state();assert e['flows']==45 and not e['undo'],e
g.screenshot('/tmp/kstock-galaxy-ledger-undo-20261020.png')
result={'status':'PASS','scope':'LOCAL_FIXTURE_REAL_TAPS_PAGE_EDIT_CANCEL_DELETE_UNDO','device':g.SERIAL,'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'page':a,'edit':b['editing'],'cancel':not c['editing'],'deleteCount':d['flows'],'undoCount':e['flows'],'settingsChanged':False,'appDataCleared':False,'notRun':['DATE_PICKER','SORT_PICKER','SAVE_CHANGED_FIELDS','IOS'],'screenshots':['/tmp/kstock-galaxy-ledger-edit-20261020.png','/tmp/kstock-galaxy-ledger-undo-20261020.png']}
(ROOT/'data/v2/verification/galaxy-paper-ledger-20261020.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result))
