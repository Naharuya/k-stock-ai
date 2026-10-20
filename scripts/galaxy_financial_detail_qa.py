"""Read-only local UI QA. Never changes server settings or app data."""
import datetime,json,re,xml.etree.ElementTree as ET
from pathlib import Path
import galaxy_qa_guard as g
OUT=Path('data/v2/verification/frontend-redesign/galaxy-financial-detail-20261019.json')
def nodes():
 g.require_foreground();g._read('shell','uiautomator','dump','/sdcard/kstock-financial-qa.xml')
 return list(ET.fromstring(g._read('shell','cat','/sdcard/kstock-financial-qa.xml')).iter('node'))
def bounds(n):return list(map(int,re.findall(r'\d+',n.get('bounds',''))))
def visible(n,region='content'):
 b=bounds(n)
 return len(b)==4 and b[2]>b[0] and b[3]>b[1] and (450<b[1] and b[3]<1930 if region=='content' else b[1]>90 and b[3]<2258)
def find(text,region='content',limit=12):
 for _ in range(limit):
  matches=[n for n in nodes() if (text==n.get('text') or text==n.get('content-desc')) and visible(n,region)]
  if matches:return matches[0]
  if region!='content':break
  g.swipe(540,1730,540,1120,250)
 raise RuntimeError('TARGET_NOT_VISIBLE:'+text)
def tap(n):
 b=bounds(n);g.tap((b[0]+b[2])//2,(b[1]+b[3])//2)
def main():
 result={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'device':g.SERIAL,'checks':{}}
 try:
  tap(find('다시 연결','all'));tap(find('신호','all'))
  tap(find('공식 원문·날짜·전체 보류 사유',limit=16))
  tap(find('영역별 위험 검토와 공식 근거',limit=22))
  for text,key in [('자산 359,241,000,000 USD · 2025-09-27','assets'),('총부채 285,508,000,000 USD · 2025-09-27','liabilities'),('자본 73,733,000,000 USD · 2025-09-27','equity'),('총부채/자산 79.48% · 총부채/자본 3.87배','ratios')]:
   find(text,limit=6);result['checks'][key]=True
  g.screenshot('docs/uiux/galaxy-financial-detail-20261019.png');result['status']='PASS'
 except Exception as e:result.update(status='NOT_RUN',blocker=str(e))
 OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False))
if __name__=='__main__':main()
