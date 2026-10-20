# K-STOCK AI DEVELOPMENT REPORT

> 2026-10-12 후속 검증: 현재 상태는 [PARTIAL 후속 QA 보고서](KSTOCK_QA_FOLLOWUP_REPORT.md)를 참조한다. 아래 내용은 이전 작업 시점 기록이다. API 가격 기준과 TTM 실기기 검증 상태는 후속 보고서에서 갱신했다.

검증일: 2026-10-12 KST. 신규 커밋·운영 변경·외부 공개 배포 없음. 기존 미커밋 변경을 보존했다.

```text
PROJECT: /Users/ari/ARI/projects/k-stock-ai
BRANCH: auto/kstock-development-20260930
COMMIT: ea406852610c00bef0dbe469de95c42fca662c30 (기존 HEAD)
VERSION: package 1.0.0 / Android 기존 2.6.5 / 개발 변경 미커밋
BASELINE TESTS: 199
CURRENT TESTS: 225 offline + 3 Android contracts
PASS: 225 + 3
FAIL: 0 (최종 실행)
ACCOUNTING PERIOD: 삼성전자 2025 연간, 2025·2026 반기 기간·금액·연결 기준 확인
TTM: READY / 2025-07-01 ~ 2026-06-30 / KRW / CFS
CORPORATE ACTIONS: UNDER_REVIEW / 기업행동 유형별 검증·보류 구현, 실제 완전한 커버리지 미확보
PEER COMPARISON: INSUFFICIENT_DATA / 기존 최소 3표본 유지, 실제 비교기업·역사 표본 부족
PERFORMANCE: 계산 엔진·읽기/모의 API·UI 연결, 실제 종목 성과 PENDING
CUMULATIVE RETURN: K-Stock PENDING / 가상 원장 시간가중 계산 테스트 통과
MDD: 계산 테스트 통과 / 실제 K-Stock 값 보류
KOSPI BENCHMARK: 가격지수 49거래일 / 누적 10.00% / MDD -7.26%
KOSDAQ BENCHMARK: 가격지수 49거래일 / 누적 26.41% / MDD -8.65%
WEB UI: 실제 삼성전자 차트·TTM·보류조건·지수 두 차트 표시 확인
ANDROID UI: 기존 USB 검증 APK에서 동적 Web UI 반영
GALAXY A33 TEST: 실제 지수 값·KOSPI 차트·MDD·모의 검증 안내 확인 / 삼성전자 새 TTM 실기기 표시 미검증
DATA QUALITY: 회계기간 확인, 기업행동·평가배수·동종기업 데이터 부족
RECOMMENDATION STATUS: 삼성전자 HELD / Apple 기존 보류 유지
LIVE TRADING: OFF
REAL ORDERS: 0 (이번 작업 주문 호출 0; 주문 실행 경로 비활성)
MODIFIED FILES: 아래 참조
REMAINING ISSUES: 기업행동 공식 커버리지, 가격·주식수 기준일 및 보통주/전체자본 기준, 비교기업 최소표본, 종목 누적성과 실데이터
NEXT ACTION: 검증 가능한 기업행동·동종기업 자료를 확보한 후 동일 기간 성과 검증과 Galaxy TTM 상세 확인
OVERALL: PARTIAL
```

지수 구간은 두 시장 모두 2026-07-28 ~ 2026-10-08, 49거래일이다. 배당 제외 **가격지수**의 구간 수익률이며 K-Stock의 성과가 아니다. 종목 총수익률과 혼합 비교하지 않는다. 60거래일 선택은 비활성화하고, 20거래일과 전체 확보 구간만 활성화했다. 데이터 최신성은 조회 시각과 별도로 D-2 거래일 필터로 판단한다. 독립 지수의 거래일 일치를 확인했지만 모든 한국 휴장일을 별도 거래소 캘린더로 대조한 것은 아니다.

회계기간은 [OpenDART 주요계정 기간 필드](https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS003&apiId=2019016)와 [전체 재무제표 누적 금액 필드](https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS003&apiId=2019020)를 같은 접수번호·연도·보고서·CFS·금액으로 교차 확인했다. TTM은 전년 연간 + 당년 누적 - 전년 동기간 누적으로 계산한다. 단일분기 금액을 연간과 섞지 않는다. 접수번호는 20260310002820 / 20260814003699 / 20250814003156이다. 부족한 기간, 중복·정정 관계 불명, 연결/별도 혼합, 미래 공시는 계산을 보류한다. 정정 공시는 자동으로 최신이라는 이유만으로 대체하지 않고 명시적 대체 관계가 필요하다.

지수 요청은 [한국투자증권 공식 예제](https://github.com/koreainvestment/open-trading-api/blob/main/backtester/kis_backtest/providers/kis/data.py)의 읽기 전용 일별 지수 경로를 사용했다. 주문 요청은 추가하지 않았다. 실제 Samsung/Apple 데이터와 기존 SEC 근거 15개를 보존했다. 분석 스냅샷을 새 파일로 추가하고 과거 기록은 수정하지 않았다. 신규 사후 성과도 미승인 후보이므로 PENDING, READY 0건이다.

모의 원장은 가상 입력만 계산하고 서버에 저장하지 않는다. 평가금액, 실현·미실현 손익, 일별/누적 시간가중 수익률, MDD, 종목 기여도, 수수료·세금·배당을 구분한다. 현금 흐름은 거래 시작 전만 지원하고 시간 불명 흐름은 보류한다. 현금·배당 중복 ID를 차단한다. 실제 공개 API는 서버 원천의 원주가·기업행동 검증을 요구하여 클라이언트가 검증값을 위조해 계산을 허용할 수 없다. 삼성전자 실제 API 확인 결과는 RAW_PRICE_AND_CORPORATE_ACTIONS_REQUIRED / PENDING이다. Web 폼의 기본 가상 시나리오는 수수료·세금 0, 배당 제외로 표시한다. 기업행동이 있는 원장의 자동 조정은 별도 검토가 필요하다.

검증:

- 기존 199개를 포함한 오프라인 225개 PASS. 신규 26개는 TTM, 정정, 미래정보, 분할/병합/배당, 자본변경 보류, 현금흐름, MDD, 기여도, 지수 달력·기준, API 원천 강제 검증을 포함한다.
- Android 통신/보안 계약 3개 PASS. 최초 제한 샌드박스의 로컬 소켓 권한 실패 후 허용된 실행으로 재검증했다.
- 실제 Chrome 360/390/768/1024/1440px, 밝은/어두운 테마 가로 넘침 없음. 삼성전자 가격 차트, 1개월 활성 및 긴 기간 비활성, TTM 기간, 지수 SVG 2개 확인.
- Galaxy A33 RFCW1178RRE에서 기존 별도 검증 패키지를 재실행했다. 이번 변경은 서버/Web이므로 APK 재빌드·재설치는 하지 않았다. 운영 인증/페어링 및 운영 APK를 검증한 것이 아니다. S22는 변경하지 않았다. USB reverse 유지.
- 실기기 KOSPI 6625.93 / KOSDAQ 892.27, KOSPI 49거래일 누적 차트와 MDD, 모의 성과 검증 안내를 화면 캡처로 확인했다. Galaxy 새 TTM 상세·지수 선택 터치·네트워크 실패 전체 재검증은 미완료다.
- src/public/docs/test 143개 파일에서 현재 구성된 주요 API 키의 원문 일치 0건. .env·개인 자료·기기 상태 캡처는 공개 산출물에 포함하지 않았다.
- git diff --check PASS. 운영 서버·실거래·인증정보·유료 서비스 변경 없음.

수정 파일(이번 단계):

- src/v2/accounting_periods.js, corporate_actions.js, benchmark_data.js, paper_performance.js, paper_performance_service.js, recommendation_gate.js
- src/v2/kr_collect.js, kr_valuation.js, orchestrator.js, candidate_service.js, candidate_report.js, run_candidates.js
- src/services/kis_request.js, opendart_request.js, opendart_client.js, src/server.js
- public/index.html, public/app.js, test/integrated_accuracy.test.js
- docs/KSTOCK_DATA_INTEGRITY_REPORT.md, docs/AUTO_DEV_LOG.md, docs/uiux/benchmark-real-mobile.png

[Web 실제 지수 화면](uiux/benchmark-real-mobile.png). 기기 캡처는 /tmp/kstock-integrated-a33-final-chart.png에 로컬 보관했다.

완료 판정은 PARTIAL이다. 계산 엔진·실제 회계기간/TTM·지수 연동·Web/일부 실기기 검증은 수행했지만, 검증된 기업행동과 동종기업 표본 및 종목 누적 성과가 없으므로 전체 PASS나 추천 활성화로 판정하지 않는다.
