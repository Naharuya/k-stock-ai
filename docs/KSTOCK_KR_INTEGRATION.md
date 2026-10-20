# 한국 기업가치 통합 상태

> 2026-10-12 후속 검증: 현재 상태는 [PARTIAL 후속 QA 보고서](KSTOCK_QA_FOLLOWUP_REPORT.md)를 참조한다. 아래 내용은 이전 작업 시점 기록이다. API 가격 기준과 TTM 실기기 검증 상태는 후속 보고서에서 갱신했다.

현재는 fixture 검증이 완료된 분석 기반입니다. 실제 한국 데이터 연결과 실제 성과 검증은 BLOCKED/미완료입니다. Apple은 미국 종목 AAPL이며 `APPLE_RANKING_HOLD`를 명시적으로 유지합니다.

`npm run v2:kr:read-only -- --read-only <input.json>`은 최대 한국 회사 3개에 대해 기존 KIS/OpenDART 클라이언트를 재사용합니다. `KIS_APP_KEY`, `KIS_APP_SECRET`, `OPENDART_API_KEY`가 없으면 외부 호출 없이 BLOCKED입니다. 회사에는 6자리 ticker, 8자리 corpCode가 필요합니다. `KSTOCK_V2_KR_ENABLED=true`는 일반 배치/서비스 수집에 이 경로를 추가합니다. 현재 설정은 변경하지 않았습니다. collector 성공 자료는 비공개 data/v2/kr-collections에 보존합니다. 계좌/주문 경로는 구현하지 않습니다.

KIS 현재가의 조회시각은 가격 기준일을 입증하지 않으므로 asOfDate=null, UNDER_REVIEW입니다. 현재가의 시가총액은 hts_avls를 억원으로 해석한 변환값이며 실제 응답 단위를 검증하기 전 평가에 사용하지 않습니다. 제공자 PER/PBR의 분모와 기간도 검증 전입니다. 일별 가격은 D-2/날짜/양수 종가/거래량/중복 검사 후 보관합니다. 제공자 조정가격을 총수익 가격이라고 주장하지 않습니다. 현재 발행주식수를 과거 종가에 곱하여 과거 시가총액을 만들어내지 않습니다.

OpenDART는 CFS 사업보고서 표준 계정 ID로 원 단위 수치를 선택합니다. 회사/연도/보고서/재무제표 종류/통화가 일치하고 값이 충돌하지 않아야 합니다. 접수번호에 해당하는 공개일을 유지하며 API 사업연도만으로 회계기간 날짜를 만들어내지 않습니다. 회계기간 시작·끝 근거가 없으면 INCOMPLETE입니다. 공시 수집은 다음해 1~4월, 월별 최대 1페이지의 제한 범위이며 이 범위 밖의 지연·정정 공시는 확인하지 못합니다. 따라서 전체 공시 이력을 수집했다고 표시하지 않습니다.

근거: [KIS 공식 조회 예제](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/inquire_price), [OpenDART 공식 재무정보](https://opendart.fss.or.kr/disclosureinfo/fnltt/dwld/list.do).

KR 분석 입력은 회사의 krSnapshot.price/financial에 source, asOfDate, collectedAt, currency, fiscalPeriod, industryCode, qualityStatus를 유지합니다. 계산은 READY로 검토된 자료만 사용합니다. 이 상태값 자체는 독립 원문 검증을 증명하지 않습니다. 가격에는 marketCap, corporateActionsReviewed가, 재무에는 publishedAt, fiscalPeriod.start/end/basis 및 raw.revenue/netIncome/equity/assets/liabilities가 필요합니다. 회계기간은 300~400일, 재무 종료일부터 가격일까지 550일 이내여야 합니다. 공시가 가격일 이후 공개되면 제외합니다.

PER/PBR/PSR은 시가총액/양수 연간 순이익·자본·매출입니다. 공통주식 시가총액과 지배기업 이익/자본의 경제적 정합성, 일회성 실적 등은 추가 실제 검증 대상입니다. EV/EBITDA는 데이터 미확보로 null입니다. 과거 비교는 최근 6년의 서로 다른 연도 3개 이상, 700일 이상 간격이 필요합니다. 비교기업은 정확한 동일 업종 코드, 동일 회계기간/연결·별도 기준/가격일의 서로 다른 기업만 받습니다. 자동 분류 모델이나 상장기업 전체 마스터는 미연결이며 입력된 universe 안에서만 선택합니다.

기존 중앙값 함수를 공유합니다. PER 500배, PBR/PSR 100배 초과는 이상치 검토 사유로 표시하고 비교 표본에서 제외합니다. 이 임계값은 제품의 보수적 검토 규칙이며 검증된 시장 최적값이 아닙니다. 각 지표별 과거·동종기업 유효 표본 3개 미만이면 INSUFFICIENT_DATA입니다. 모두 20% 이상 낮거나 높으면 RELATIVELY_LOW/HIGH, 그 외 NEUTRAL이며 위험 항목이 있으면 UNDER_REVIEW입니다. 이 분류는 매수 신호가 아닙니다. 점수 영향 0, 기존 위험/근거 Gate 유지, 불완전 KR 자료는 추가 승인 차단을 적용합니다. 실제 universe 선정과 점수 영향 시뮬레이션은 미완료입니다.

배치 보고서의 후보 원본은 data/v2/snapshots에 내용 해시별로 독점 생성하여 보존합니다. 사후 수정본이 생겨도 기존 파일을 덮어쓰지 않습니다. 보유기간 정책이나 자동 파기를 새로 약속하지 않습니다. 성과 모듈은 다음 거래 세션 종가를 출발점으로 하며 실제 체결 수익률이 아닙니다. TOTAL_RETURN 조정 확인과 KOSPI/KOSDAQ 벤치마크가 필요합니다. 실제 성과 수집·예약 계산·성과 API는 아직 미연결입니다.

Android 로컬 검증은 `android/build-local-validation.py`로 생성하며 ai.kstock.mobile.localvalidation 패키지를 사용합니다. 운영 소스의 HTTPS/키 저장 정책은 유지합니다. 개발 APK에는 API 인증을 사용하지 않으므로 전송 목적지를 loopback 한 곳으로 제한합니다. 같은 앱을 업데이트하려면 `KSTOCK_LOCAL_VALIDATION_KEYSTORE`에 최초 검증 keystore 경로를 설정합니다. USB reverse 3103→3104와 fixture 서버를 사용했습니다. 운영 인증/페어링과 실제 포트폴리오 조회는 이 검증에 포함되지 않습니다.


## 오프라인 성과 실행

`npm run v2:performance:offline -- --offline <snapshot.json> [feed.json]`으로 실행합니다. 네트워크 요청은 하지 않습니다. 스냅샷 파일명은 저장 당시 내용의 SHA-256과 일치해야 합니다. 원본은 읽기만 하며 결과는 data/v2/performance에 새 내용 해시 파일(0600)로 저장합니다. 원본 스냅샷의 승인값이 true인 KR 종목만 성과 대상이며 보류 종목은 PENDING입니다. 새 후보에는 exchange(KOSPI/KOSDAQ)를 보존합니다. 예전 기록의 거래소를 사후 추측하여 보충하지 않습니다.

feed는 `{ prices: { "KR:종목코드": { basis: "TOTAL_RETURN", corporateActionsReviewed: true, sessions: [{date, close}] } }, benchmarks: { KOSPI: {index: "KOSPI", basis: "TOTAL_RETURN", sessions: [{date, close}]} } }` 형식입니다. fixture로 계약만 검증했으며 입력 선언은 제공자의 실제 조정·출처를 독립적으로 검증했다는 뜻이 아닙니다. 실제 데이터 확보 전 자동 추천 성과나 실체결 수익으로 표시하지 않습니다. 거래정지·상폐는 session의 halted/delisted가 true이면 해당 기간을 보류합니다.


## 성과 보고서 조회 API

`GET /api/v2/performance`는 비공개 저장소의 최신 성과 보고서 최대 50개를 요약합니다. 저장된 보고서가 없으면 NO_DATA이며 파일 변조나 잘못된 결과는 503으로 차단합니다. `GET /api/v2/performance/:id`는 64자리 SHA-256 보고서 ID로 조회합니다. 잘못된 ID는 400, 없는 보고서는 404입니다. 원본 오류 메시지와 임의 필드는 응답에 포함하지 않습니다. 성과의 READY는 계산된 참고 수익률이며 원천 제공자 데이터의 독립 검증이나 실제 체결을 뜻하지 않습니다. 기존 서버 API 인증 정책을 적용하며 실행 중 서버에 반영하려면 이후 재시작이 필요합니다.


## 2026-10-12 — 삼성전자 국내 실데이터 화면 연결

- 삼성전자 005930 / OpenDART 00126380 / KOSPI를 연결 검증 및 분석 보류 대상으로 추가. 기존 AAPL 설정·가격·재무 및 이전 SEC 근거 15개 보존. private 입력 변경 전 사본 유지.
- 실제 읽기 수집: KIS 시세·일별 가격, OpenDART 2025 연간 연결재무·공시. D-2 필터 통과 가격 이력 29개, 마지막 거래일 2026-10-08. 6개 재무 항목 확보, fiscalPeriodDates 미검증. 가격 이력·회계기간·기업행동·과거/동종기업 검토 미완료로 추천 보류 유지.
- UI: 실제 수집 종가 및 한국 재무 수치 표시. KIS 정규화 가격 이력만 OBSERVED_PRICE_SERIES 표시, UNDER_REVIEW 유지. 일별 종가 차트는 배당 포함 총수익/가치평가 검증과 구분하고 경고 표시. 실제 지원 1개월만 활성. 장기간·누적 총수익·벤치마크는 미연결.
- .env: 국내 읽기 수집 활성, 가격 공급자 부분 실패 명시적 옵션 활성. 분할 조회가 실패해도 가격 성공 자료만 유지하고 배수/추천 검증은 보류. 기본 옵션 미설정 실패 계약은 유지. 실거래/브로커 false, 키 값/기존 기타 설정 보존.
- 로컬 서버 3000 최신 설정 재시작. 운영 서버 변경/외부 공개 없음. 실제 예약 실행 및 갱신 성공은 미검증.
- 검증: offline 199 PASS/0 FAIL; git diff --check PASS. 실제 Chrome 5폭 × light/dark 및 국내 상세/차트/경고/기간 활성 확인. Galaxy A33 기존 검증 앱 재실행·실제 목록/삼성전자 종가/가격 차트·보류 화면 캡처 확인. 이번 native 수정/새 APK 재설치 없음; 웹 UI는 서버에서 반영.
- 증거: docs/uiux/kr-observed-price-mobile.png(실제 브라우저). 실기기 화면은 기기 상태 아이콘 포함으로 Git 추가 없이 /tmp에 확인용 보관.
- 변경: src/v2/kr_valuation.js, us_prices.js, public/app.js, test/candidate_ui.test.js, us_prices.test.js 및 기록. 새 개인정보 수집 없음.
- 현재 성과: AAPL/삼성전자 승인 보류로 PENDING/READY 0, 합산 누적 모의 성과 미구현. 다음: 회계기간·공시 원문 및 기업행동 검증, 공식 업종·비교 표본, 총수익 및 벤치마크 feed. 상태 PARTIAL.
