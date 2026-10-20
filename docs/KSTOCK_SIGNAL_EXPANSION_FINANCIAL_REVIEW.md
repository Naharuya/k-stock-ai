# 시장 반응 연구 확대 — 금융 검증 병렬 리뷰

검증일: 2026-10-13 KST. 프로젝트 `/Users/ari/ARI/projects/k-stock-ai`, branch `auto/kstock-development-20260930`, 기준 commit `ea406852610c00bef0dbe469de95c42fca662c30`, origin Naharuya/k-stock-ai. AGENTS.md와 ARI_COMPLIANCE_STANDARD, 기존 QA 및 금융 문서를 읽었다. 기존 대규모 미커밋 변경·Apple/SEC·사용자 데이터를 보존하며 운영 환경과 다른 프로젝트는 변경하지 않았다.

## 이번 실행 결과

- `node scripts/run-peer-validation-worker.mjs`: `UNCHANGED_SOURCE`; 6기업, PARTIAL 3 / BLOCKED 3 / VERIFIED 0 / FAILED 0. PER·PBR·PSR·EV/EBITDA 유효 표본 각각 0. 신규 외부 요청 0.
- `python3 scripts/audit-db-correction-source.py`: 저장 최초·정정 ZIP의 SHA와 원문 400셀을 재검증했다. 차이 9 / 해결 0 / 미해결 9, `BLOCKED_NO_OFFICIAL_EXPLANATION`, API 읽기 0. 신규 artifact는 `data/v2/verification/db-correction-1791783200385/source-discrepancy-audit-20261012T150154Z.json`이다. UTC 파일명이므로 검증일 KST와 하루 차이가 있다.
- `node --test test/treasury_ledger.test.js test/cancellation_evidence.test.js test/correction_numeric_audit.test.js test/pbr_validation.test.js test/peer_validation_worker.test.js test/data_collection_worker.test.js`: **80 PASS / 0 FAIL / 0 SKIP**, 오프라인 fixture. 로그 `/tmp/kstock-expansion-financial-tests.log`. 전체 회귀의 부분집합이며 합산하지 않는다.

## 금융 차단 근거

SK하이닉스 저장 원문 리뷰의 `remainingDifference=1014`, `arithmeticOnly=true`를 재확인했다. 6월30일 자기주식 1,626,865주 − 확인된 8월19일 처분 82주 − 8월21일 잔고 1,625,769주 = 미설명 **1,014주**다. 556/458 산술 분해를 가상 집행으로 만들거나 개인주주 장내매수로 회사 자기주식을 상쇄하지 않는다.

DB하이텍 보통주 894,000주 소각의 기준점 포함 정책과 중복 차감 차단을 유지한다. 이는 재무 원문 9개 차이의 원인 해결과 별개다. 공식 항목별 정정 설명·회계기간·단위·범위를 확보하지 않은 차이를 임의 분류하지 않는다. 국내3기업 10월8일 최종 주식수·시가총액·PBR은 보류하며 시장 반응 연구를 금융 검증 근거로 사용하지 않는다.

## Worker 관측 범위

저장 Validation 상태: SAVED_EVIDENCE_ONLY, 30분(1,800,000ms), ownerPID 1879, heartbeat 2026-10-12T14:46:31.310Z, 상태 IDLE. 저장 Collection 상태: enabled=false, 6기업 PARTIAL6. 저장 PID는 생존 확인 결과가 아니다.

이 담당의 localhost3000 상태 API 조회는 sandbox URLError로 **NOT RUN**이다. 프로세스·30분 자동 tick 관측, 전체 회귀, Web/Galaxy A33, 새 외부 수집, 운영 배포도 이 담당에서는 NOT RUN이며 주 담당의 통합 결과와 구분한다. 서버를 재시작하거나 중복 Worker를 만들지 않았다.

## 안전과 다음 작업

이번 실행은 저장 원문 감사·오프라인 테스트·별도 문서 작성뿐이며 외부 데이터 호출 및 실제 주문 호출 각각 **0**이다. 추천·삼성전자 성과·Apple 순위 HOLD와 실거래 OFF 정책을 유지하며 설정·인증정보는 수정하지 않았다. 계좌 전체 주문 이력의 독립 감사는 NOT RUN이다.

Modified: 이 문서 및 Git 제외 감사 artifact. **Overall PARTIAL**. 다음 금융 작업은 SK 회사 실제 집행·보유 범위로 1,014주 원인 확인, DB 9개 공식 항목별 설명 확보, 국내3기업 효력일·주식 종류별 10월8일 주식수 검증이다. 공식 자료가 바뀐 기업만 기존 Worker로 재검증하고 PBR0을 임의 해제하지 않는다.

## 추가 위임: MSFT 단일 종목 연구 가격

기존 `us-daily-prices`의 AAPL 전용 제한을 유지하고 별도 `nonapple-daily-prices`를 MSFT 한 종목/NAS/2025년/원주가만 허용하도록 추가했다. 기존 인증정보를 그대로 사용하는 명시 실행 스크립트 `scripts/collect-nonapple-prices.mjs --read-only`는 토큰 및 가격 최대2회, 12초 timeout, 재시도 없음,24시간 캐시, 비공개0600 저장이다. 자동 Worker 등록 없음.

실제 KIS 100건: 2025-04-23~2025-09-15. 성공2회(토큰1+가격GET1). 최초 sandbox 토큰 fetch 실패 시도1회는 성공 응답으로 세지 않는다. 공식 Microsoft 기업행동 페이지 직접 GET2회는 HTTPError로 실패; 웹 출처 검색1회 및 두 공식 페이지 열람2회씩(총4개 열람)으로 공식 배당락8월21일/$0.83과 현재 IR의 마지막9번째분할2003-02-18을 확인했다. 중복 웹 열람은 새 사건 표본으로 세지 않는다. 원천 SHA는 공식 페이지 브라우저 추출문 해시이며 HTTP 원문 해시가 아님을 저장했다. 신규 S&P500·NYSE 수집은0, 기존 저장 근거 재사용.

제한된 7월31일~8월28일 원주가·배당미포함 연구에서 1/5/20거래일 결과는 각각 -1.76007498/-2.37300843/-4.47235239%, 동일 기간 S&P500 대비 차이는 -0.16086748/-2.38263081/-7.03521727%p다. 시작 종가533.50USD, 종료524.11/520.84/509.64USD. 시작점은 주 담당의 공식 SEC8-K·IR 날짜 대조에 따른 CONSERVATIVE_START이며 정밀 공개·실제 체결·개인 거래·예측력 검증이 아니다. 다른 모든 기업행동의 완전한 전수조사나 총수익률 검증을 주장하지 않는다.

`node --test test/nonapple_market_evidence.test.js test/us_market_evidence.test.js`:22 PASS/0 FAIL(신규7,기존15). `normalizeNonappleHistory`, `reviewNonapplePriceCoverage`, `reviewNonappleConservativeReturns`를 제공하며 publication/actions/cutoff/가격 유형/동일 거래일/중복/결측 근거가 부족하면 수익률null/HOLD다. 주 담당이 API·Web·Android 통합 및 전체 회귀를 별도 수행한다. 실제 주문 호출0, 금융 PBR0·SK1014·DB9 차단은 유지한다.

## Root integration verification — 2026-10-13 KST

Earlier API NOT RUN above is this isolated subtask's sandbox outcome, not final integration status. Root read actual local /api/v2/peer-validation/status:6 companies PARTIAL3/BLOCKED3, four metric eligibility counts0, saved-only30-minute scheduler enabled and8 research/financial domains. Full637 offline regression and Android3 contracts pass. MSFT read-only prices/actions/publication were integrated into research API, three conservative windows verify; Web and Galaxy A33 display the same pp returns. Financial unresolved counts remain unchanged. See current QA report for complete scope, sources/calls and NOT RUN.
