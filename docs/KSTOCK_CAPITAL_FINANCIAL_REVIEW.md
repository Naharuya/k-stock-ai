# Capital Signal 금융 병렬 검증 — 2026-10-12

첨부 28dd91b9의 Workstream 및 AGENTS/ARI 기준·기존 금융 근거·가격 클라이언트를 확인했다. HEAD ea406852610c00bef0dbe469de95c42fca662c30, 기존 변경·Apple/SEC 원문 보존. 신규 금융 데이터를 수정하거나 기존 원문을 삭제하지 않았다. SEC 수집은 주 에이전트 작업이며 이번 병렬 작업에서 중복 조회하지 않았다.

## 기존 금융 근거 실제 재검증

`node scripts/run-peer-validation-worker.mjs` 직접 실행: UNCHANGED_SOURCE, 총6/PARTIAL3/BLOCKED3/FAILED0, PER/PBR/PSR/EV_EBITDA 모두 유효0. 동일 원문으로 판정을 완화하지 않았다.

`python3 scripts/audit-db-correction-source.py` 직접 실행: 기존 최초/정정 ZIP SHA·정확 본문 XML·전후 좌표400셀 일치, 재무 차이9/해결0/미해결9. 이번 artifact `data/v2/verification/db-correction-1791783200385/source-discrepancy-audit-20261012T132106Z.json` (0600), apiReads0. 통화단위 정정 일반 문구로 개별 합계 잔차 원인을 확정하지 않았다.

SK 보존 회사 근거의 6월30일 보유1,626,865주 − 실제8월19일 처분82주 − 8월21일 관측1,625,769주 = 미설명1,014주를 유지한다. 보유 범위·정정·실제 집행일별 내역 검증 없이 가상 처분을 만들지 않는다. 저장 bridge의 `shareDifference=null`은 전체 발행주식수 판정 필드이며 1,014주의 자기주식 산술 미설명값과 혼동하지 않는다. 10월8일 발행/자기주식 확정값은 null, 시총/PBR 보류다.

DB cancellationReview.baselineInclusion.includedInBaseline=true 유지. 894,000주 기준점 이전 소각을 다시 차감하지 않는다. 개인 보유 보고·Berkshire13F 신호가 국내 회사 자기주식 차이를 해결하는 증거가 아니다.

실제 저장 Scheduler ownerPID91754, 30분 SAVED_EVIDENCE_ONLY 활성, 다음 예정2026-10-12 22:40:45 KST. 새 Worker·서버 재시작·자동 외부 수집 활성화 없음. 이번 30분 경과 실행 관측 NOT RUN.

## 2025년 미국 사건 가격 경로

보관 Alpha Vantage TIME_SERIES_DAILY:AAPL 실제 100개 날짜 범위는 2026-05-19~2026-10-09다. 2025 버핏 서한·SEC 공개 사건의 가격이 아니다. 기존 최신 가격을 과거 사건 가격으로 사용하지 않는다. 기존 KIS는 국내 종목/국내 지수 경로이므로 미국 코드를 임의 통과시키지 않는다.

[Alpha Vantage 공식 문서](https://www.alphavantage.co/documentation/#daily)를 이번 확인했다. 기존 클라이언트의 compact는 최신100개만 반환한다. 장기 full 출력은 premium키 범위이며 조정 일별 가격 경로도 premium이다. 현재 서비스 권한을 추정하거나 유료 가입/키 변경/무제한 재시도를 수행하지 않았다. 따라서 2025 AAPL 1/5/20거래일의 종목 가격은 미확보다. 현재 compact에 같은 무료 호출을 반복하는 것은 해당 과거 범위를 해결하지 않는다.

이전 수집의 SP500 자료는 2025-08-21~09-23만 보존한다. 2025-02-22 버핏 서한 또는 새 SEC 사건의 날짜가 이 관측 구간에 포함되는지 먼저 검사해야 하며 근거 없이 재사용하지 않는다. S&P 원시 시계열 저작권 조건과 비공개 연구 범위도 유지한다. 이번 SP500·가격 신규 직접 호출0, 수익률 신규 생성0.

## 기업행동·공개 시점

[Apple 공식 배당 이력](https://investor.apple.com/dividend-history/default.aspx)을 확인했다. 2025년 1월30일 공표/2월10일 record/2월13일 payable/$0.25, 5월1일/5월12일/5월15일/$0.26, 7월31일/8월11일/8월14일/$0.26, 10월30일/11월10일/11월13일/$0.26가 각각 열로 구분된다. 이 표에는 배당락일 열이 없으므로 record/payable 날짜를 배당락일로 추정하지 않는다. 금액은 분할 조정되지 않았다는 공식 주의도 있다. 특정20거래일 구간의 기업행동 전수 없음·배당 포함 총수익 검증을 이 단일 표로 완료하지 않았다.

SEC ACCEPTANCE-DATETIME/원문 공개 시각 및 13F reportingPeriod/filingDate 검증은 주 에이전트의 정확한 수집 결과가 필요하다. 거래일은 원문에서 확인되지 않으면 null이다. 기관 보유 변화와 개인 매수·매도 날짜를 혼동하지 않는다. 초과수익률은 검증된 종목·지수 동일 세션·기간·가격 기준이 확보되기 전 null/MARKET_REACTION_BLOCKED다.

## 호출·검증 경계

이번 공식 웹 탐색은 검색1회(질의2), 문서 열람1회(2페이지), 추가 내부 find/열람1회다. 직접 금융 API/SEC 신규 요청0. Worker·DB 감사는 오프라인이다. 전체 회귀·새 AI·Web·Galaxy A33는 이 병렬 작업에서 NOT RUN이며 주 에이전트 통합 검증과 구분한다.

실거래 OFF·추천/삼성전자 성과/Apple 순위 HOLD, 이번 실제 주문 호출0. Modified: 이 문서와 Git 제외 새 DB 감사 artifact만. Overall PARTIAL. 다음 조건은 공식 2025 AAPL 날짜별 가격 및 corporate action 커버리지, 정확 사건 공개시각, 공통 벤치마크 관측 구간이다. 실제 가격·자료를 확보하지 못한 것을 테스트 수로 대체하지 않는다.

주 에이전트 통합 확인: 로컬 서버 재시작 후 ownerPID94530, 저장근거 Scheduler30분/다음2026-10-12 23:08:51 KST. 전체594/Android3 PASS, Web와Galaxy A33 실제 검증은 최상단 통합 QA 보고서 참조. 앞의 PID/NOT RUN은 병렬 조사 당시 범위다. 신규 자동 외부 수집은 비활성이다.
