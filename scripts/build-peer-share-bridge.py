"""Offline review of preserved official API/XML sources; never infer missing effective dates."""
import json,hashlib,re,zipfile,html
from pathlib import Path
from datetime import datetime,timezone
root=Path.cwd();assert str(root)=='/Users/ari/ARI/projects/k-stock-ai'
state=json.loads((root/'data/v2/data-collection/state.json').read_text());folder=root/'data/v2/verification/peer-share-originals-1791795830709';manifest=json.loads((folder/'manifest.json').read_text());originals={x['receipt']:x for x in manifest['results']};followup=json.loads((root/'data/v2/verification/peer-share-originals-1791796141339/manifest.json').read_text());originals.update({x['receipt']:x for x in followup['results']})
for mf in sorted((root/'data/v2/verification').glob('peer-share-originals-*/manifest.json')):
 for x in json.loads(mf.read_text()).get('results',[]):
  if x.get('status')=='ARCHIVED':originals[x['receipt']]=x
def text(receipt):
 x=originals[receipt];raw=Path(x['file']).read_bytes();assert hashlib.sha256(raw).hexdigest()==x['sha256'];z=zipfile.ZipFile(Path(x['file']));d=z.read(next(n for n in z.namelist() if n.endswith('.xml'))).decode('utf-8');return ' '.join(html.unescape(re.sub('<[^>]+>',' ',d)).split())
assert '17,790,000' in text('20260715000004') and '2026년 07월 14일' in text('20260715000004')
assert '730,492,365' in text('20260819800340') and '소각 예정일 -' in text('20260819800340')
assert '82' in text('20260821000495') and '1,625,769' in text('20260821000495')
assert '95,312,200' in text('20260814003665') and '459,198' in text('20260814003665')
companies=[]
for job in state['jobs'][:3]:
 seen=set();windows=[];disclosures=[];baselines=[];prior=[];priorWindows=[]
 for r in reversed(job['results']):
  if r['sha256'] in seen:continue
  seen.add(r['sha256']);raw=(root/'data/v2/data-collection/sources'/ (r['sha256']+'.json')).read_bytes();assert hashlib.sha256(raw).hexdigest()==r['sha256'];body=json.loads(raw)
  if r['kind']=='SHARES':baselines.extend(r.get('observed',{}).get('records',[]))
  if r['kind']=='DISCLOSURE':
   is_prior='share-bridge-prior-' in r['key'];prior_range=re.search(r'share-bridge-prior-expanded:(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})',r['key']);earlier='share-bridge-jul01-aug13' in r['key'];start,end=('2026-07-01','2026-08-13') if earlier else ('2026-08-14','2026-10-08');complete=body.get('status')=='013' or body.get('status')=='000' and body.get('total_page')==1 and body.get('total_count')==len(body.get('list',[]));(priorWindows if is_prior else windows).append({'fromDate':prior_range[1] if prior_range else '2026-04-02' if is_prior else start,'toDate':prior_range[2] if prior_range else '2026-06-30' if is_prior else end,'listingComplete':complete,'count':body.get('total_count'),'sourceHash':r['sha256'],'collectedAt':r['collectedAt']})
   for x in body.get('list',[]):
    assert x.get('stock_code')==job['ticker'] and x.get('corp_code')=={'000660':'00164779','000990':'00160843','042700':'00161383'}[job['ticker']]
    title=x['report_nm'].strip();(prior if is_prior else disclosures).append({'receipt':x['rcept_no'],'disclosureDate':x['rcept_dt'],'title':title,'sourceUrl':'https://dart.fss.or.kr/dsaf001/main.do?rcpNo='+x['rcept_no'],'status':'TITLE_REVIEWED_EFFECT_UNVERIFIED','potentialShareOrTreasuryEffect':bool(re.search('증자|주식소각|자기주식|전환|신주인수|증권발행|지분증권|증권예탁|기타경영|분할|병합|주식배당',title))})
 for mf in sorted((root/'data/v2/verification').glob('peer-prior-pages-*.json')):
  for page in json.loads(mf.read_text()).get('pages',[]):
   if page['ticker']!=job['ticker']:continue
   raw=Path(page['file']).read_bytes();assert hashlib.sha256(raw).hexdigest()==page['sha256'];body=json.loads(raw)
   w=next(w for w in priorWindows if w['fromDate']==page['fromDate'] and w['toDate']==page['toDate']);w.setdefault('supplementalPages',{})[str(page['page'])]={'sha256':page['sha256'],'count':len(body['list'])}
   for x in body['list']:
    assert x.get('stock_code')==job['ticker'] and x.get('corp_code')=={'000660':'00164779','000990':'00160843','042700':'00161383'}[job['ticker']]
    prior.append({'receipt':x['rcept_no'],'disclosureDate':x['rcept_dt'],'title':x['report_nm'].strip(),'sourceUrl':'https://dart.fss.or.kr/dsaf001/main.do?rcpNo='+x['rcept_no'],'status':'TITLE_REVIEWED_EFFECT_UNVERIFIED'})
 for w in priorWindows:
  if w.get('supplementalPages'):w['listingComplete']=100+sum(p['count'] for p in w['supplementalPages'].values())==w['count']
 prior=list({x['receipt']:x for x in prior}.values())
 for d in disclosures:
  if d['receipt'] in ['20260706000403','20260710000008'] and any(x['receipt']=='20260624000420' for x in prior):
   assert '최초제출일 : 2026년 06월 24일' in text(d['receipt'])
   d.update({'relatedDocumentId':'20260624000420','correctionRelationVerified':True,'relationEvidenceHash':originals[d['receipt']]['sha256']})
 baseline_receipt={'000660':'20260814003509','000990':'20260814003091','042700':'20260814003665'}[job['ticker']]
 baseline_original_review=None
 if baseline_receipt in originals:
  source_text=text(baseline_receipt);section=source_text[source_text.find('4. 주식의 총수'):];section=section[:section.find('나. 자기주식')]
  if job['ticker']=='000660' and not section:section=source_text[source_text.find('가. 주식의 총수'):source_text.find('나. 자기주식')]
  assert '2026년 06월 30일' in section and '발행주식의 총수' in section and '자기주식수' in section
  matched=[]
  for record in baselines:
   issued=record.get('issuedShares');treasury=record.get('treasuryShares')
   if isinstance(issued,int) and isinstance(treasury,int):
    assert f'{issued:,}' in section and f'{treasury:,}' in section
    matched.append(record['shareClass'])
  baseline_original_review={'documentId':baseline_receipt,'sourceUrl':originals[baseline_receipt]['sourceUrl'],'sourceHash':originals[baseline_receipt]['sha256'],'asOfDate':'2026-06-30','unit':'SHARES','matchedClasses':matched,'verificationStatus':'ORIGINAL_VALUES_MATCHED','definition':'현재까지 누적 발행수가 아닌 감소 후 발행주식의 총수(Ⅱ−Ⅲ), 자기주식은 별도','correctionReviewStatus':'PENDING','valuationSharesEligible':False}
  if job['ticker']=='000660':
   assert '2026.02.09, 이익소각' in section
   baseline_original_review['preBaselineCancellation']={'effectiveDate':'2026-02-09','status':'REPORTED_IN_BASELINE_ORIGINAL','appliedAfterBaseline':False}
  if job['ticker']=='000990':
   assert '2025년 9월 23일' in section and '2,220,000' in section
   baseline_original_review['preBaselineTreasuryExchange']={'date':'2025-09-23','shares':2220000,'status':'REPORTED_DEEMED_DISPOSAL_NOT_NEW_ISSUANCE','appliedAfterBaseline':False}
 events=[];checkpoints=[]
 if job['ticker']=='000660':
  events=[{'type':'RIGHTS_ISSUE','reportedShares':17790000,'reportedPaymentDate':'2026-07-14','effectiveDate':None,'status':'RESULT_DOCUMENT_CONFIRMED_EFFECT_DATE_REVIEW_REQUIRED','receipt':'20260715000004','sourceHash':originals['20260715000004']['sha256']},{'type':'TREASURY_DISPOSAL','reportedShares':82,'reportedTransactionDate':'2026-08-19','status':'EXECUTION_DOCUMENT_CONFIRMED','receipt':'20260821000495','sourceHash':originals['20260821000495']['sha256']},{'type':'CANCELLATION','effectiveDate':None,'status':'DECISION_ONLY','receipt':'20260819800340','sourceHash':originals['20260819800340']['sha256'],'reason':'취득 종료 예정11월19일·소각일미정·완료후일괄소각; 결정일에 차감하지 않음'}]
  assert '2026년 08월 19일 보통주식 82 82' in text('20260821000495')
  events[1].update({'type':'TREASURY_CHANGE','shareClass':'COMMON','delta':-82,'effectiveDate':'2026-08-19','verificationStatus':'VERIFIED','reason':'공식 처분결과의 실제8월19일 보통주82주·자기주식만차감; 전체기간잔고대사완료를뜻하지않음'})
  if '20260715800045' in originals:
   assert '실제발행주식수(주) 17,790,000' in text('20260715800045') and '기명식 보통주' in text('20260715800045')
   events[0].update({'shareClass':'COMMON','actualQuantityConfirmed':True,'announcementDate':'2026-06-24','resultReceipt':'20260715800045','resultSourceHash':originals['20260715800045']['sha256'],'reason':'6월24일 결정·7월14일 납입·실제보통주17,790,000주; 상장예정일은 실제효력일로 확정하지 않음'})
  if '20260819000254' in originals:
   assert '취득예정주식(주) 보통주식 24,070,000' in text('20260819000254')
   events.append({'type':'TREASURY_ACQUISITION','reportedShares':24070000,'effectiveDate':None,'announcementDate':'2026-08-19','shareClass':'COMMON','status':'DECISION_ONLY','receipt':'20260819000254','sourceHash':originals['20260819000254']['sha256'],'reason':'취득계획24,070,000주·8월20일~11월19일; 실제 취득잔고로 적용하지 않음'})
  checkpoints=[{'asOfDate':'2026-08-19','issuedShares':730492365,'status':'OFFICIAL_DOCUMENT_OBSERVED','receipt':'20260819800340'},{'asOfDate':'2026-08-21','treasuryShares':1625769,'status':'OFFICIAL_DOCUMENT_OBSERVED','receipt':'20260821000495'}]
 if job['ticker']=='000990':
  assert '43,504,588' in text('20261007000288') and '2026년 10월 01일' in text('20261007000288')
  checkpoints=[{'asOfDate':'2026-10-01','disclosureDate':'2026-10-07','votingIssuedShares':43504588,'status':'OFFICIAL_VOTING_SCOPE_OBSERVED_NOT_ALL_ISSUED','receipt':'20261007000288'}]
 if job['ticker']=='042700':
  assert 'HANMI USA, Inc. 법인 설립' in text('20260810800065')
  events=[{'type':'SUBSIDIARY_ESTABLISHMENT','receipt':'20260810800065','status':'NON_PARENT_SHARE_ISSUANCE','reason':'미국 종속기업 설립; 모회사 발행주식수 변동으로 적용하지 않음','sourceHash':originals['20260810800065']['sha256']}]
 if job['ticker']=='000660' and '20260513000549' in originals:
  assert '종료일 2027년 03월 30일' in text('20260513000549') and '보통주식 114,209' in text('20260513000549')
  events.append({'type':'TREASURY_DISPOSAL','reportedShares':114209,'announcementDate':'2026-05-13','effectiveDate':None,'status':'DECISION_ONLY','shareClass':'COMMON','receipt':'20260513000549','sourceHash':originals['20260513000549']['sha256'],'reason':'기간 이전 결정·처분예정종료2027년3월30일·실제 누적 처분과10월8일 잔고 미확인'})
 if job['ticker']=='000990' and '20260511800809' in originals:
  assert '자사주를 교환대상으로' in text('20260511800809') and '441,990' in text('20260511800809')
  events.append({'type':'TREASURY_EXCHANGE','reportedShares':441990,'effectiveDate':None,'status':'REPORTED_CUMULATIVE_QUANTITY_EFFECT_PERIOD_UNVERIFIED','receipt':'20260511800809','sourceHash':originals['20260511800809']['sha256'],'reason':'5월11일 자기주식 교환사채 행사 누계441,990주·신규 발행으로 합산하지 않음·구체적 거래일과기간귀속확인필요'})
 for point in checkpoints:
  receipt=point['receipt'];archive=originals.get(receipt)
  if archive:point.update({'shareClass':'COMMON','sourceUrl':archive['sourceUrl'],'sourceHash':archive['sha256'],'sourceIntegrityVerified':True,'availableAt':receipt[:4]+'-'+receipt[4:6]+'-'+receipt[6:8]+'T23:59:59+09:00'})
 for event in events:
  receipt=event['receipt'];event['announcementDate']=event.get('announcementDate') or receipt[:4]+'-'+receipt[4:6]+'-'+receipt[6:8];event['disclosureDate']=receipt[:4]+'-'+receipt[4:6]+'-'+receipt[6:8];event['availableAt']=event['disclosureDate']+'T23:59:59+09:00';event['sourceDocumentId']=receipt;event['sourceUrl']='https://dart.fss.or.kr/dsaf001/main.do?rcpNo='+receipt
 prior_reviews=[]
 specs={'000660':('20260330001812',9007,'2026-03-30','자기주식 처분 계획·실제 집행/정정은 별도'), '000990':('20260120000357',300816,'2026-01-30','자기주식 처분 계획·실제 집행/정정은 별도'), '042700':('20250519800046',1302059,'2025-05-29','소각 예정일·실제 효력/정정은 별도')}
 receipt,quantity,planned_end,reason=specs[job['ticker']]
 if receipt in originals:
  assert f'{quantity:,}' in text(receipt)
  prior_reviews.append({'sourceDocumentId':receipt,'sourceHash':originals[receipt]['sha256'],'sourceUrl':originals[receipt]['sourceUrl'],'shareClass':'COMMON','reportedQuantity':quantity,'plannedEndDate':planned_end,'effectiveDate':None,'verificationStatus':'ORIGINAL_PLAN_REVIEWED_EFFECT_UNVERIFIED','reason':reason,'applied':False})
 if job['ticker']=='000660' and '20260128800616' in originals:
  receipt='20260128800616';assert '15,300,000' in text(receipt) and '2026-02-09' in text(receipt)
  assert 728002365-15300000==712702365
  prior_reviews.append({'sourceDocumentId':receipt,'sourceHash':originals[receipt]['sha256'],'sourceUrl':originals[receipt]['sourceUrl'],'eventType':'CANCELLATION','shareClass':'COMMON','reportedQuantity':15300000,'effectiveDate':'2026-02-09','availableAt':'2026-08-14T23:59:59+09:00','verificationStatus':'PRE_BASELINE_ORIGINAL_AND_H1_MATCHED','reason':'소각결정 및 반기 원문의 실제2월9일 소각·감소 후 발행수 일치; 기준점 이전이므로 다시 차감하지 않음','applied':False})
 if job['ticker']=='000990' and '20250915800392' in originals:
  receipt='20250915800392';assert '894,000' in text(receipt) and '2025-09-30' in text(receipt)
  assert 44398588-894000==43504588
  prior_reviews.append({'sourceDocumentId':receipt,'sourceHash':originals[receipt]['sha256'],'sourceUrl':originals[receipt]['sourceUrl'],'eventType':'CANCELLATION','shareClass':'COMMON','reportedQuantity':894000,'plannedEndDate':'2025-09-30','effectiveDate':None,'verificationStatus':'PRE_BASELINE_QUANTITY_MATCHED_DATE_UNVERIFIED','reason':'소각결정894,000주와 반기 누적 감소894,000주·감소 후 발행수 일치; 예정일을 실제일로 승격하지 않음','applied':False})
 if job['ticker']=='000990' and '20250923800355' in originals:
  receipt='20250923800355';assert '발행방법 교환사채 발행' in text(receipt) and '실제발행주식수(주) -' in text(receipt)
  prior_reviews.append({'sourceDocumentId':receipt,'sourceHash':originals[receipt]['sha256'],'sourceUrl':originals[receipt]['sourceUrl'],'eventType':'EXCHANGE_BOND_ISSUANCE','shareClass':None,'reportedQuantity':None,'effectiveDate':None,'paymentDate':'2025-09-23','verificationStatus':'BOND_PAYMENT_CONFIRMED_NOT_NEW_SHARE_ISSUANCE','reason':'교환사채 납입 완료·실제발행주식수 숫자 없음; 납입금액을 주식수로 환산하거나 신규 발행으로 합산하지 않음','applied':False})
 if job['ticker']=='000660':
  assert '보통주식 1,626,236' in text('20260807000537') and '보통주식 73' in text('20260807000537')
  baseline_original_review['intermediateTreasuryObservation']={'asOfDate':'2026-08-07','directShares':1626236,'otherShares':73,'reportedComponentSum':1626309,'sourceDocumentId':'20260807000537','sourceHash':originals['20260807000537']['sha256'],'sourceUrl':originals['20260807000537']['sourceUrl'],'baselineToObservationRawDifference':556,'observationToResultResidual':458,'remainingDifference':1014,'arithmeticOnly':True,'scopeStatus':'COMPONENT_SCOPE_REVIEW_REQUIRED','reason':'6월30일 합계와8월21일 법정 보유현황의 범위 일치·기간별 집행은 별도 확인;556/458을 실제 거래로 만들지 않음'}
 original_reviews=[]
 if job['ticker']=='000660':
  for receipt in ['20260716000582','20260731000082','20260821000615']:
   if receipt not in originals:continue
   assert '장내매수' in text(receipt)
   original_reviews.append({'sourceDocumentId':receipt,'sourceHash':originals[receipt]['sha256'],'sourceUrl':originals[receipt]['sourceUrl'],'eventType':'PERSONAL_HOLDING_CHANGE','shareClass':None,'reportedQuantity':None,'effectiveDate':None,'availableAt':receipt[:4]+'-'+receipt[4:6]+'-'+receipt[6:8]+'T23:59:59+09:00','verificationStatus':'PERSONAL_MARKET_TRADE_NOT_TREASURY_PROOF','reason':'보관 원문에 개인 장내매수 변동 기재; 회사 자기주식 처분·이전의 증거로 적용하지 않음','applied':False})
 cancellation_review=None
 if job['ticker']=='000990' and (root/'data/v2/verification/db-cancellation-review.json').exists():
  cancellation_review=json.loads((root/'data/v2/verification/db-cancellation-review.json').read_text())
  assert cancellation_review['stockCode']==job['ticker']
  for d in cancellation_review['documents']:
   if d['role']=='DECISION':assert originals[d['documentId']]['sha256']==d['sha256']
   else:assert hashlib.sha256((root/'data/v2/verification/db-correction-1791783200385'/(d['documentId']+'.zip')).read_bytes()).hexdigest()==d['sha256']
  inclusion_path=root/'data/v2/verification/db-cancellation-baseline-review.json'
  if inclusion_path.exists():
   inclusion=json.loads(inclusion_path.read_text());assert inclusion['sourceHash']==originals['20260814003091']['sha256']
   cancellation_review['baselineInclusion']=inclusion
  if cancellation_review['verificationStatus']=='VERIFIED':
   r=next(r for r in prior_reviews if r['sourceDocumentId']=='20250915800392')
   r.update({'effectiveDate':cancellation_review['effectiveDate'],'verificationStatus':'PRE_BASELINE_ACTUAL_DATE_VERIFIED','availableAt':cancellation_review['availableAt'],'reason':'최초·정정 사업보고서의 실제2025년9월30일 보통주894,000주 이익소각 일치; 변경등기일은 미확인·6월30일 기준점 이후에 다시 차감하지 않음'})
 chain=None
 if job['ticker']=='000660' and (root/'data/v2/verification/sk-issuance-chain-review.json').exists():
  chain=json.loads((root/'data/v2/verification/sk-issuance-chain-review.json').read_text())
  if chain.get('verificationStatus')=='VERIFIED' and chain.get('event'):
   events[0].update(chain['event']);events[0]['receipt']=chain['event']['sourceDocumentId']
 companies.append({'ticker':job['ticker'],'companyName':job['companyName'],'valuationDate':'2026-10-08','baselineDate':'2026-06-30','baselineRecords':baselines,'baselineOriginalReview':baseline_original_review,'listingWindows':windows,'disclosures':disclosures,'priorAnnouncements':prior,'priorListingWindows':priorWindows,'priorOriginalReviews':prior_reviews,'originalReviews':original_reviews,'corporateActions':events,'issuanceChain':chain,'cancellationReview':cancellation_review,'checkpoints':checkpoints,'originalDocuments':[{'documentId':r,'sha256':x['sha256'],'sourceIntegrityVerified':hashlib.sha256(Path(x['file']).read_bytes()).hexdigest()==x['sha256']} for r,x in originals.items() if x['ticker']==job['ticker']], 'coverage':{'listingComplete':len(windows)==2 and all(w['listingComplete'] for w in windows),'verified':False,'fromDate':'2026-07-01','toDate':'2026-10-08','reason':'검색 목록 완전성과 모든 기업행동 효력 검증은 별개; 임의로 주식수를 이월하지 않음'},'october8IssuedShares':None,'october8TreasuryShares':None,'shareDifference':None,'verificationStatus':'SHARE_COUNT_UNVERIFIED','marketCap':None,'officialMarketCap':None,'marketCapStatus':'MARKET_CAP_UNVERIFIED','reasons':['FULL_ACTION_EFFECT_AND_CLASS_COVERAGE_UNVERIFIED','DATED_TREASURY_AND_ISSUED_COUNT_RECONCILIATION_REQUIRED']})
review={'schemaVersion':1,'checkedAt':datetime.now(timezone.utc).isoformat(),'valuationDate':'2026-10-08','companies':companies,'recommendationStatus':'HOLD','performanceStatus':'HOLD'}
path=root/'data/v2/verification/peer-share-bridge-review.json';path.write_text(json.dumps(review,ensure_ascii=False,indent=2));path.chmod(0o600);print(json.dumps({'file':str(path.relative_to(root)),'companies':[{ 'ticker':c['ticker'],'listingCount':len(c['disclosures']),'listingComplete':c['coverage']['listingComplete'],'events':len(c['corporateActions']),'verified':False}for c in companies]}))
