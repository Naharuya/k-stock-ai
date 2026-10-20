# Peer Validation Worker 로컬 계약

`GET /api/v2/peer-validation/status`는 기존 `/api` 인증과 `Cache-Control: no-store`를 사용한다. 파일이나 내부 오류를 응답 오류에 노출하지 않는다. UI와 Android WebView는 같은 응답을 읽는다.

응답은 `schemaVersion`, `status`, `updatedAt`, `lastRunAt`, `nextRunAt`, `worker`, `scheduler`, `counts`, `jobs`, `sources`, `logs`, `metricEligibility`를 제공한다. 작업 상태는 QUEUED/COLLECTING/VALIDATING/VERIFIED/PARTIAL/BLOCKED/FAILED (기존 RUNNING 복구 호환)다. Worker 실행 중 여부와 Scheduler 활성 여부는 서로 다른 값이다. 작업 완료는 투자 추천 승인을 의미하지 않는다.

기업별 jobs에는 종목코드, 기업명, 평가일, 가격 기준일, 회계기간과 배수별 검증 결과, 비교 제외 사유, 부족 자료, 공식 원천 URL이 있다. PER/PBR/PSR/EV_EBITDA 표본은 배수 자체의 검증과 비교 적합성을 모두 통과해야 집계된다. 유효 표본 0이면 중앙값과 비교 차트를 생성하지 않는다.

서버의 `KSTOCK_PEER_WORKER_ENABLED=true`는 저장된 근거 재검증을 실행한다. 기본 주기는 1,800,000ms이며 `KSTOCK_PEER_WORKER_INTERVAL_MS`로 지정한다. launchd 작업은 추가하지 않는다. 현재 로컬 실행에만 플래그를 전달하며 `.env`, 기존 06:30 후보 수집, JINI HOLD, 운영 서버 설정을 수정하지 않는다.

현재 자동 실행 범위는 **SAVED_EVIDENCE_ONLY**다. 새 보고서/지정 원문 검증 근거의 변경을 확인해 재검증한다. 최신 외부 자료를 수집했다고 표현하지 않는다. 읽기 전용 수집기 활성화에는 기존 허용 환경과 구성된 원천 핸들러가 필요하며 KRX 인증 차단을 우회하지 않는다.

큐/검증 로그/원천 식별자를 `data/v2/peer-validation`에 Git 제외·0600 파일로 저장한다. 비밀값이나 계좌 정보는 저장하지 않는다. 외부 응답 전체를 운영 상태 API에 노출하지 않는다. 임시 파일과 원본을 구분하며 기존 원천 자료와 과거 분석을 삭제하지 않는다.

실거래/브로커 활성 환경에서는 작업을 차단한다. 추천, 삼성전자 종목 성과, Apple 추천 순위 보류 정책을 그대로 유지한다.


## 2026-10-12 Data Collection Worker 계약

`GET /api/v2/data-collection/status`는 동일 인증/no-store 정책으로 실제 저장 큐를 제공한다. 기존 peer-validation 응답의 `collection`에도 동일 상태를 포함한다. 외부 인증값과 원천 응답 전체는 반환하지 않는다.

상위 필드: schemaVersion, mode, enabled, lastRunAt, nextRunAt, worker, scheduler, counts, jobs, sources, logs. counts.success는 저장 수집 근거를 보유한 기업 수이며 새로운 외부 요청 성공 건수가 아니다. worker.running=false일 때 pid는 마지막 실행 기록이다. jobs에는 lastCollectedAt, lastValidatedAt, dataAsOf, nextTask, retryable/retryAt, sourceSnapshots가 있고 날짜를 평가일로 대체하지 않는다.

수집 주기 정책은 시장 마감·확인된 거래일/일별 또는 새 공시/명시적 재무기간으로 구분한다. 저장 근거 Validation Scheduler의 30분 주기와 분리한다. 새 외부 수집 Scheduler는 현재 enabled=false, nextRunAt=null이다. `scripts/run-data-collection-worker.mjs` 기본 실행은 비활성 큐를 준비하며 인증 설정을 변경하거나 외부 수집을 활성화하지 않는다.

현재 실제 동작은 SAVED_SOURCE_REPLAY다. 기존 KIS 10월8일 가격 근거 3개를 원래 checkedAt와 SHA256, 원래 요청 계약과 함께 보존해 재사용한다. externalRequests=0, gateAttempts=3. KRX AUTH_BLOCKED는 큐 준비와 재시작에도 유지된다. 저장 응답의 기준일 없는 자본/주식수는 결합하지 않는다. 가격 RAW는 저장 원래 요청 계약에 근거하며 모든 제공자 응답을 RAW/수정주가로 일괄 단정하지 않는다.

읽기 전용 어댑터는 기존 KIS/OpenDART와 허용 공식 호스트만 사용한다. 24시간 요청 캐시, 최소1100ms 간격, 일시 오류에만 최대3회 지수 백오프, 사이클40 gateAttempts 한도와 PID 파일 잠금을 적용한다. AUTH_BLOCKED는 재시도하지 않는다. 자격증명 필드를 포함하는 응답은 캐시/원천 보관 전에 차단한다. 상태·원천·실행 근거는 Git 제외 경로의 0600 파일에 저장한다.

가격은 명시적 날짜가 있는 응답만 정규화한다. 재무·주식수·기업행동·지수 어댑터의 원문 보관과 평가 입력 정규화는 별개다. 해당 종류는 SOURCE_ARCHIVED_PENDING_NORMALIZATION / valuationInputEligible=false를 유지한다. 전체 원천 종류의 정규화와 외부 자동 수집 운영은 아직 완료되지 않았다.

Validation Worker는 보고서/DB 차이 검토/수집 상태의 해시 변경을 감지한다. 수집 자료를 기존 평가 보고서에 무조건 덮어쓰지 않는다. 회사별 collection 상태를 연결하고 배수별 검증·비교 적합성을 따로 판정한다. DB하이텍 correctionDifferences는 9건 각각의 기간·연결/별도·정정 전후 값·단위·원문 셀·합계 차이·접수번호·출처·미해결 원인을 제공한다. 미래 정정 공시는 평가 입력에서 차단한다.


## PBR 입력 검증·정규화 계약 (2026-10-12)

peer-validation/status의 상위 pbrPriority 및 jobs[].pbrValidation은 동일 저장 근거에 대한 우선순위와 독립 계산/비교 판정을 제공한다. verificationStatus, inputVerificationStatus, value(null 또는 검증값), comparisonStatus, eligible, reasons, comparisonReasons, inputs, completeness, priorityRank, nextRequired를 제공한다. inputs는 price/marketCap/shares/bookValue/corporateActions/correction/businessFit로 구분한다. completeness.observed는 원천 필드 보유량이며 현재일 검증 완료율이 아니다. bookValue SOURCE_ACCOUNT_IDENTIFIED는 금액 정의·귀속 범위를 검증한 상태가 아니므로 계산에서 제외한다. 동종기업 적합성은 계산 가능 여부와 별도로 판정한다. 종류별/전체종류 자본 범위·구성대사·CFS 소유주지분·공개시점·기업행동·정정 조건이 부족하면 value=null 유지.

Collection financial/share/action observed에는 collection_normalization 표준 레코드가 연결된다. normalized fixture 상태와 실데이터 검증을 구분하고 valuationInputEligible=false를 유지한다. 실제 rawfull 응답의 없는 fs_div/period와 rawmajor의 없는 account_id를 추정 채우지 않는다. 실제 보고 수량은 기업행동 effective quantity가 아니며 효력·권리락 날짜는 근거 없으면 null이다. 기존 TTM 모듈·원문을 보존한다.

DB correctionDifferences는 7개 원인 후보별 causeReview 관측/사유를 제공한다. 공식 정정 사유가 단위오류라고 해서 개별 잔차가 해결되는 것은 아니다. 원인 UNRESOLVED/평가 입력 금지 유지. Web/WebView는 PBR 상세 바로가기를 제공하며 동일 job 응답이면 상세 DOM을 유지해 읽는 표의 스크롤을 초기화하지 않는다.


## 2026-10-12 수동 공식자료와 변경 감지

Collection mode MANUAL_READ_ONLY_COMPLETED는 수동 읽기 종료 상태이며 enabled/scheduler.enabled=false다. SEC companyfacts는 MU/TSM/UMC 공식 URL만 허용하고 계정·단위·기간·공개일을 관측값에 저장한다. 관측 성공은 valuationInputEligible=false이며 ADR·주식범위·기업행동 검증을 대신하지 않는다. Validation inputHash는 기업별 원천 SHA·정규화 결과·DB 정정 근거를 포함하며 미변경 기업의 checkedAt/resultHash를 보존한다. Web은 상세 배수 선택·비교표 스크롤을 갱신 후 복원한다.


## 주식수 대사 계약(2026-10-12)

jobs.shareBridge는 동일valuationDate의 국내기업만 제공한다. baselineRecords/coverage/listingWindows/disclosures/corporateActions/checkpoints/october8IssuedShares/october8TreasuryShares/shareDifference/marketCap/verificationStatus를 제공한다. 목록 페이지 완전성과 action coverage.verified를 구분하며 현재 verified=false/Oct8값null을 유지한다. votingIssuedShares는 전체발행수량으로 승격하지 않는다. 기업별shareBridge 내용이 inputHash에 포함된다. UI는 과거·중간·평가일 수치를 구분하고 선택배수·기업·상세 접힘·비교표 스크롤을 보존한다. DB차이표 바로가기는 long-page 가독성을 위한 UI이며 데이터 판정을 바꾸지 않는다.


## 공시 분류와 원문 큐 (2026-10-12)

jobs.disclosureReview는 disclosures/queue/summary를 제공한다. disclosures는 기존90건만; queue는 기간이전 후보5건을 별도 period=PRIOR_ANNOUNCEMENT로 포함한다. metadata는 companyCode/stockCode/documentId/documentTitle/disclosureDate/classification/impactClassification/relatedDocumentId/verificationStatus/availableAt/sourceUrl. relatedDocumentId는 공식원문으로 확인된 연결만 제공한다. classificationBasis=TITLE_TRIAGE_ONLY이고 eligibleForValuation=false. NOT_RELEVANT도 기업행동부재를 인증하지 않음.

summary.total/classified/relevant는 기존기간만, priorAnnouncementsListed/priorOriginalReviewRequired는 이전기간. originalArchivesVerified는 전체보존원문무결성으로 효력검증originalEffectVerified와 구분한다. corporateActionsVerified는 단일검증거래수이며 전체기간잔고대사완료가 아님. queue는 key/priority/task/state/evidenceHash/originalArchived/attempts/externalCollectionEnabled=false를 제공한다. 원문보존은PARTIAL, 자료미확보QUEUED, 미래/충돌BLOCKED. 기존저장큐는 자동외부수집하지 않는다.

shareBridge.reconciliation[].reconciliationStatus는 RECONCILED/PARTIAL/INSUFFICIENT_DATA/SOURCE_CONFLICT이며 기존verificationStatus와호환된다. 최종주식수는 coverage/효력일/클래스/공개시점/중복/대사가 모두통과해야만제공한다.


## 실제 발행 체인과 확장 범위 (2026-10-12)

shareBridge.issuanceChain은 verificationStatus/quantity/shareClass/paymentDate/effectiveDate/listingDate/availableAt/documents/event를 제공한다. 실제발행일은KIND본문③발행일, 상장일은⑥상장일이며 예정값으로생성하지않는다. 최초·정정·납입·실제발행·거래소수량/종류와공개시점을대조한다. documents에는공식ID/role/공개일/sourceUrl/SHA만보내고HTML은제외한다. availableAt은체인최신공개일의보수적일말; 과거분석에소급하지않는다. eventId는한증자의공통ID여서상장일/복수결과보고서를중복적용하지않는다.

priorAnnouncements/priorListingWindows는2025-01-01부터확장한별도목록이며기존기간90건count와분리한다. summary.priorQueryFrom/priorListingComplete는조회목록범위정보로경제적coverage승인을의미하지않는다. priorOriginalReviews는계획종료/보고수량/실제효력미확인/applied=false의공식원문대조다. chain연결5개DART역할은원문검증계수지만기업행동5건이아님. 새chain의검증실패가확인되면현재큐VERIFIED를철회하고PARTIAL로돌린다. 최종대사커버리지미확보시기존PBR/시총/추천보류계약유지.

## 기준점 이전 원문 검토 메타데이터
큐의 eventType/effectiveDate/shareClass/quantity/originalReviewStatus는 보존 원문 SHA가 검토 근거와 일치할 때만 연결한다. announcementDate는 정정 접수일과 구분하며 최초일 미확인 시 null이다. 소각 예정일을 실제 효력일로 승격하지 않는다. 기준점 이전 소각과 교환사채 납입은 평가기간 신주 발행으로 더하지 않는다. appliedToValuation=false와 eligibleForValuation=false를 유지하며 원문검토 판정은 전체 이벤트 커버리지 검증을 대신하지 않는다.

## 소각 완료 근거 및 공개 시점
shareBridge.cancellationReview는 실제 이익소각일의 사업보고서/정정 완료기록과 변경등기일을 구분한다. registrationDate는 공식증거없으면null이다. 개별소각검증은평가일전체주식수검증을대신하지않는다. priorOriginalReviews.availableAt 이후에만큐검토정보를연결한다. 임원소유보고서는잠재원문대상으로보존하며개인장내매수를회사자기주식처분으로합산하지않는다.

## DB 기준점 포함·자기주식 범위 계약 (2026-10-12)

`jobs[].shareBridge.cancellationReview.baselineInclusion`은 개별 소각의 기준점 포함 판정이다. verificationStatus, includedInBaseline, baselineDate, baselineIssuedShares, cancellationDate, quantity, shareClass, stockCode, sourceDocumentId/sourceUrl/sourceHash, availableAt, reasons를 제공한다. 현재 DB COMMON894000주는2025-09-30소각·2026-06-30기준점포함 VERIFIED다. appliedAfterBaseline=false, valuationShareCountEligible=false를 유지하며 전체 정정·기업행동 커버리지나10월8일주식수/PBR 검증을 대체하지 않는다.

`treasuryScope`의 statutoryTreasuryShares736215, physicalTreasuryShares1054464, unexercisedExchangeShares318249는 같은 반기의 서로 다른 범위다. 전체보유−교환청구미행사=법정공시자기주식 관계와 원문 무결성을 함께 검사한다. 원문 공개 전 분석 또는 범위·종류·수량이 불일치하면 includedInBaseline=null / PENDING_VERIFICATION이다. Web와Android는 같은 응답으로 구분 표시한다.

검증된 소각 이벤트와 동일 기준점·원천·주식종류·발행수·공개시점이 일치하면 대사 movement는 ALREADY_INCLUDED_IN_BASELINE / applied=false로 보존한다. 기준점 이전 소각을 재차 차감하지 않는다. 불명확한 이벤트를 이 규칙으로 무시하지 않는다. 현재3기업October8주식수와시총은null,4개배수표본0,추천/삼성성과HOLD다.
