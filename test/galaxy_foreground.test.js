import test from 'node:test';import {execFileSync} from 'node:child_process';
test('Galaxy QA blocks input when another app or ambiguous activity is foreground',()=>{
 execFileSync('python3',['-c',`from scripts import galaxy_qa_guard as q
good='topResumedActivity=ActivityRecord{123 u0 ai.kstock.mobile.localvalidation/ai.kstock.mobile.MainActivity t140}'
assert q.is_kstock_foreground(good)
assert not q.is_kstock_foreground(good.replace('ai.kstock.mobile.localvalidation/','another.app/'))
assert not q.is_kstock_foreground(good.replace('localvalidation/','localvalidation.evil/'))
assert not q.is_kstock_foreground(good+'\\n'+good)
calls=[]
q._read=lambda *args: calls.append(args) or b'topResumedActivity=ActivityRecord{1 u0 another.app/Main t1}'
try:
 q.tap(10,10)
 raise AssertionError('input should be blocked')
except RuntimeError:
 pass
assert calls==[('shell','dumpsys','activity','activities')]
`],{stdio:'pipe'});
});
test('financial detail QA rejects clipped and navigation-overlapping content targets',()=>{
 execFileSync('python3',['-c',`import sys,xml.etree.ElementTree as E
sys.path.insert(0,'scripts')
import galaxy_financial_detail_qa as q
for bounds in ['[10,429][900,429]','[10,1900][900,2000]','[10,400][900,500]']:
 assert not q.visible(E.Element('node',{'bounds':bounds}))
assert q.visible(E.Element('node',{'bounds':'[10,700][900,800]'}))
assert q.visible(E.Element('node',{'bounds':'[264,159][512,294]'}),'all')
`],{stdio:'pipe'});
});
