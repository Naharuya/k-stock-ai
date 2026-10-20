# K-STOCK AI 자동 개발 기록

## 2026-10-12 08:58 KST — 한국 기업가치 분석 통합

- 경로: `/Users/ari/ARI/projects/k-stock-ai`
- 브랜치: `auto/kstock-development-20260930`
- 기준 커밋: `ea406852610c00bef0dbe469de95c42fca662c30`; 이번 작업은 미커밋. 기존 변경 보존.
- 운영 대상 조사: ari-prod-01, `/srv/k-stock-ai/current`, https://kstock.ai.kr. 운영 변경 없음.
- 기준선: 오프라인 162 PASS. 최종 오프라인 175 PASS / 0 FAIL. 별도 Android 계약 3 PASS / 0 FAIL. Android 계약 최초 실행은 sandbox loopback 소켓 권한 부족으로 실패했고 권한을 확보한 재실행에서 통과.
- 신규 기능: KIS/OpenDART 읽기 전용 collector, 정규화, 일별 가격 정규화, KR PER/PBR/PSR 비교, 업종/회계기간/통화/분모/공개일/분할 검토/중복/이상치 검사, 별도 분석 상태, 기존 점수 영향 0, 후보 보류 Gate, Apple 고정 순위 보류.
- 스냅샷: 후보 결과를 SHA-256 이름의 0600 파일에 독점 생성. 동일 내용은 재사용하고 다른 내용은 새 파일로 보관. 기존 Apple 보고서를 변경하지 않고 원본 스냅샷 저장 확인.
- 성과: 다음 거래 세션 종가를 출발 기준으로 1·5·20세션 상대 성과 계산. TOTAL_RETURN와 기업행위 확인 필요. 벤치마크·거래 일정 불일치, 정지/상폐, 미성숙 기간은 PENDING. 실제 조정가격·벤치마크 수집은 미연결.
- 실제 데이터: KIS_APP_KEY/KIS_APP_SECRET/OPENDART_API_KEY 미구성. CLI는 KR_CREDENTIALS_MISSING으로 BLOCKED, 실제 요청 0. 현재 실제 입력은 Apple만 있으며 한국 종목/업종/기업코드 설정도 필요. 허위 한국 데이터를 기존 입력에 삽입하지 않음.
- Android 조사: `android/src/ai/kstock/mobile`의 앱(ai.kstock.mobile, 2.6.5)과 Gradle 앱(com.kstockai.mobile)이 공존. 실제 검증은 기존 build.mjs 기반 앱 재사용. 고정 com/example 경로 사용 안 함.
- 기기: 사용자 선택 Galaxy A33(SM-A336N), ADB authorized. Galaxy S22 Ultra도 탐지했으나 설치하지 않음.
- 빌드/설치/실행: production unsigned APK 빌드 PASS. 별도 패키지 ai.kstock.mobile.localvalidation의 개발 검증 APK 서명/설치/실행 PASS. 기존 앱 데이터 보존. 개발 APK는 127.0.0.1:3103만 허용하고 USB reverse로 Mac loopback 3104 연결. 운영 앱 TLS 정책 변경 없음.
- 실기기 검증: 웹 화면 로딩과 후보 조회/가상 기업 보류 표시 확인. 기업가치 상세 API는 INSUFFICIENT_DATA, approved=false, 성과 PENDING 확인. 실기기 상세 화면 전체/포트폴리오 실제 조회/운영 HTTPS 인증·페어링은 미검증.
- 보안: 주문/실거래 OFF, 개발 중 실제 주문 0. .env 비밀값의 Git 대상 파일 노출 검사 PASS. 상태/스냅샷/빌드 파일 Git 제외 확인. KIS/OpenDART redirect 차단 추가.
- 변경 파일: src/v2/kr_collect.js, kr_valuation.js, performance_tracking.js, orchestrator.js, run_candidates.js, candidate_service.js, valuation_comparison.js; src/services/kis_market_client.js, kis_request.js, opendart_request.js; public/app.js; package.json; android/build-local-validation.py; test/kr_valuation.test.js, performance_tracking.test.js; docs/AUTO_DEV_LOG.md, KSTOCK_KR_INTEGRATION.md, KSTOCK_DEVELOPMENT_REPORT.md.
- 남은 항목: 실제 인증정보 및 한국 종목 구성, 공식 업종 코드/사업구조 검증, 실제 재무기간·공통주식/비지배지분 정합성, 과거 시가총액·당시 공시 이력, 실제 조정가격/벤치마크 수집, 분할·배당 이벤트 검증, 실기기 상세/포트폴리오/운영 인증 검증.
- 다음 작업: 인증정보가 구성되면 1개 한국 종목의 제한된 읽기 전용 수집. 기간/단위/공시일 근거를 확보한 후 과거·비교기업 데이터와 성과 수집 검증. 검증 전 추천 순위 활성화 금지.


## 2026-10-12 — 성과 실행 경로 연결

- 동일 브랜치/HEAD, 기존 미커밋 변경 보존. 운영 배포 변경 없음.
- 변경: src/v2/performance_job.js, performance_tracking.js, orchestrator.js, package.json; test/performance_job.test.js.
- 기능: 오프라인 스냅샷 읽기·내용 해시 검증, 승인된 KR 후보만 성과 평가, 당시 거래소 정보 저장, 별도 불변 성과 보고서 생성.
- 거래일 검사: 한국 시간의 후보 분석일 다음 세션부터 측정, 종목/벤치마크 거래일 목록 일치 검사.
- 테스트: 오프라인 180 PASS / 0 FAIL. 이전 175개 유지. 신규 5개는 변조/미래 기준일/보류 종목/보고서 보존/거래일 불일치 검증.
- 실제 저장된 Apple 스냅샷으로 명령 실행: evaluatedCount=1, readyCount=0, PENDING. 실제 성과 또는 추천으로 간주하지 않음. 원본 후보 파일 변경 없음.
- 실제 외부 조회: 없음. Android 신규 설치/실행: 이번 사이클 미실시(이전 기록 유지).
- 남은 작업: 실제 한국 종목과 거래소 구성, KIS/OpenDART 인증정보, 검증된 총수익 가격·벤치마크 및 출처 자료. 성과 조회 API와 자동 실행 예약도 미연결.
- 다음: 실제 feed 정규화·출처 검증과 성과 조회 화면 연결.


## 2026-10-12 — 성과 보고서 조회 API

- 기존 브랜치/HEAD 및 운영 배포 유지. src/v2/performance_report.js, src/server.js, test/performance_report.test.js 변경/추가.
- GET /api/v2/performance(최신 50개), GET /api/v2/performance/:id 연결. 서버 기존 /api 인증 middleware 적용, Cache-Control no-store.
- 파일 해시/스키마/기준일/승인 여부/성과 숫자/거래일 검증. symlink·경로 조작·허위 READY 차단. 목록 검사 최대 1000파일, 개별 파일 최대 2MB. 내부 오류 원문과 임의 필드를 API에 노출하지 않음.
- 오프라인 183 PASS / 0 FAIL. 실제 로컬 저장 보고서 1개 읽기 성공, PENDING. 외부 요청 없음. 실행 중 서버 재시작·운영 배포·Android 신규 설치는 하지 않음.
- 남음: 성과 조회 화면, 실제 총수익 가격/벤치마크 수집·근거 검증, 한국 인증정보와 종목 설정. 다음: 성과 조회 화면 연결.


## 2026-10-12 — 성과 조회 화면 연결

- 기존 경로/브랜치/HEAD·미커밋 변경 유지, 운영 배포 변경 없음.
- 변경: public/index.html, public/app.js, test/candidate_ui.test.js.
- 기능: 성과 기록 탐색 메뉴, 보고서 목록/상세 조회, 원본 후보일·성과 기준일(한국 시간), 1·5·20거래일 종목/벤치마크/차이(%p), PENDING 및 당시 승인 보류 구분.
- 인증: 기존 세션 메모리 토큰/헤더 경로 재사용, 화면·URL·스토리지에 토큰 추가 저장 없음. 401 시 이전 상세 제거와 재입력 안내.
- 응답 경쟁: 목록 재조회 이후 과거 상세 응답은 폐기. 텍스트 노드는 textContent로 생성.
- 검증: 오프라인 187 PASS / 0 FAIL, git diff --check PASS. 추가 4개는 빈 목록/토큰 헤더, 승인·보류·기간별 표시, 인증 실패, 늦은 응답 폐기를 검증.
- 실제 데이터: 신규 조회 없음. 기존 Apple 성과는 PENDING. 실제 한국 수익률 검증 미완료.
- Android: 이번 사이클 실기기 화면 재검증·새 설치 없음. 실행 중 기존 서버 재시작 없음; 최신 성과 API 반영에는 로컬 서버 재시작이 필요.
- 남음/다음: 실제 한국 인증정보와 종목·거래소, 총수익 가격/벤치마크 출처 검증, 로컬 통합 화면·실기기 성과 화면 확인.


## 2026-10-12 — 통합 UI/UX 우선 개발

- 사용자 통합 디자인 지시서에 따라 기존 vanilla Web/Android 및 미커밋 작업 보존. Adaptive Hybrid, 반응형 내비게이션, 대시보드, 후보 필터, 상세 비교/차트, 모의 손익, 보고서/설정 구현.
- API: Health·후보·성과·일일 보고서 연결. 없는 실제 데이터는 미연결/보류 표시. Apple 순위 보류 유지.
- 검증: offline 193 PASS/0 FAIL, 별도 Android 계약 3 PASS/0 FAIL, diff check PASS. Chrome 360/390/768/1024/1440 × light/dark 검증 및 캡처.
- Galaxy A33: 최종 별도 검증 APK build/sign/install -r/launch 및 실제 화면 확인. 운영 native 수정 없음, 사용자 데이터 삭제 없음.
- .env/운영 배포 변경·신규 외부 수집 없음, 실거래 OFF/실주문 0. 모의 입력은 탭 메모리에만 저장.
- 상태 PARTIAL. 남은 실데이터·차트·기기 검사 및 변경 파일 상세: docs/KSTOCK_UIUX_REPORT.md.


## 2026-10-12 후속 검증 — 서버 재시작·실데이터·누적 차트·Galaxy 재설치

- 로컬 127.0.0.1:3000 서버만 최신 코드로 재시작, Health PASS. 맥미니 재부팅/운영 서버 변경 없음. 루프백 및 브로커·실거래 OFF 유지.
- 사용자 승인 범위 Apple 한 종목 SEC/Alpha Vantage 실제 읽기 수집. 분석 기준 2026-10-12T00:29:33.176Z, 보고서 생성 00:29:39.030Z. 실제 가격 READY 336.64 USD, 거래일 2026-10-09; 재무 READY. 추천 승인 false / APPLE_RANKING_HOLD / DATA_INCOMPLETE.
- SPLITS_PROVIDER_UNAVAILABLE로 첫 전체 갱신 실패(기존 보고서 유지). 재시도는 공급자 cooldown 및 캐시 준수. 이번 수집에만 명시적 tolerateSplitUnavailable 옵션으로 성공 가격을 유지하고 corporateActionReview 미완료·PER 계산 null·추천 보류로 저장. 기본 수집의 실패 계약은 유지. 공급자 제한을 우회하거나 유료 기능을 사용하지 않음.
- KIS_APP_KEY/KIS_APP_SECRET/OPENDART_API_KEY 미설정: 한국 실데이터 연결 BLOCKED. 인증정보 값/.env 수정 없음. 실제 총수익/벤치마크 feed 미연결. Apple 성과 보고서 새로 생성: PENDING / ready 0, 추천 성과로 표시하지 않음.
- 누적 참고 수익률: 첫 진입 종가 대비 종목/KOSPI·KOSDAQ 총수익 시계열 계산·API·SVG·수치표 연결. 미래 세션/거래일 불일치/정지·상폐/미승인/잘못된 시계열 차단. 실선·점선/수치 제공. 실제 승인 feed가 없어 실데이터 차트는 미연결 표시. 모의 포트폴리오 전체 누적 성과·미국 벤치마크는 아직 미구현.
- Galaxy A33 선택 기기: 최종 검증 APK build/sign/install -r/launch PASS. ai.kstock.mobile.localvalidation, 기존 앱 데이터 삭제 없음. USB 3103→3000. 후보 탐색·실제 Apple 카드/가격/보류 표시·스크롤·검색 AAPL·키보드·뒤로가기(키보드 닫기)·가로 화면·연결 실패/재연결·재실행 확인. 전체 시스템 뒤로가기 흐름 및 모든 오류 화면까지 검증한 것은 아님. 임시 회전 lock 후 원래 free 복원.
- 연결 실패 후 웹의 이전 온라인 헤더가 남는 버그 발견: MainActivity에서 실패 상태 알림, Web에서 정상 표시 제거/이전 자료 표시 구현. 최종 실기기 오류 캡처 확인, USB 연결 복원.
- 최종 APK: android/build/local-validation-tstpw597/build/release/k-stock-ai-local-validation.apk. 최종 재설치 후 실행/실제 Apple 카드 확인. 운영 인증·페어링 경로 보존, 운영 서명 APK/외부 접속 검증 아님.
- 최종 tests: baseline 162 보존 / offline 198 PASS, 0 FAIL + 별도 Android 3 PASS, 0 FAIL. Chrome 실제 3000 서버 5폭 × 라이트/다크 PASS. git diff --check PASS. 범위 제한 secret 패턴 검사 PASS.
- 변경: src/v2/performance_tracking.js, performance_report.js, us_prices.js, public/app.js, styles.css, android/src/ai/kstock/mobile/MainActivity.java, 관련 4개 테스트 파일 및 개발 기록. 기존 모든 미커밋 변경 보존, Git push/merge/운영 배포 없음.
- 남은 조건: 사용자 본인의 한국 API 인증정보(.env로만 입력)와 분석 대상 종목·거래소, 검증 총수익/벤치마크 feed, 미국 벤치마크 지원, 모의 포트폴리오 시계열 보유. OVERALL PARTIAL.


## 2026-10-12 — Windows 공유 폴더 인증정보 가져오기

- 사용자 지정 SMB 공유의 k_stock/.env 읽기 성공. 원본 파일 변경/전체 복사 없음.
- KIS_APP_KEY/KIS_APP_SECRET/DART_API_KEY만 선택 가져오기. DART_API_KEY→OPENDART_API_KEY, KIS_ENV prod→production 호환 변환. 기존 미국 키/기타 설정 및 실거래 OFF 보존. .env 권한 0600 / Git ignored 확인.
- 실제 읽기 검증: KIS 삼성전자 quote PASS(MCA00000), OpenDART 2025 연간 연결재무 PASS(000, 229행). 재무 API의 회사명 필드는 확인되지 않았으므로 회사명 검증으로 간주하지 않음. 실제 주문 0. 인증정보/토큰/응답 원문 로그 없음.
- 로컬 3000 서버 재시작해 설정 반영. Health는 설정 존재(CONFIGURED_NOT_VERIFIED)만 표시하며 이 시점의 실제 조회 검증과 상시 정상 수집을 구분. 운영 배포/갤럭시 재설치 없음(서버 설정만 변경).
- 기존 분석 대상은 AAPL 유지. 국내 정기 분석 대상 및 총수익·벤치마크 실제 feed 연결은 후속 작업.


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

## 2026-10-12 차기 데이터 정합성·성과·벤치마크 통합

삼성전자 실제 OpenDART 기간·누적 금액 교차 검증과 2025-07-01~2026-06-30 TTM 연결. 기업행동·동종기업·추천 Gate 보류 유지. KIS KOSPI/KOSDAQ 각각 49거래일 확보, Web 누적 가격지수/MDD/기간 선택과 실제 Galaxy A33 지수 차트 표시 확인. 가상 원장 계산 및 서버 원천 검증 API 연결; 실제 Samsung 성과는 PENDING. 기존 SEC 15근거/Apple 자료·스냅샷 보존. 오프라인 225/225, Android 계약 3/3 PASS. 운영/실거래/인증정보 변경 없음. 전체 PARTIAL. 상세: [데이터 정합성 보고서](KSTOCK_DATA_INTEGRITY_REPORT.md).

## 2026-10-12 — PARTIAL 후속 QA·TTM 실기기 검증

- Preflight/법적 기준·기획·설계·기록과 기존 변경 확인. HEAD ea406852610c00bef0dbe469de95c42fca662c30, auto/kstock-development-20260930 유지. 다른 프로젝트/운영/키 변경 없음.
- 기준선 현재 실행 225+Android 3 PASS. 누적 공시의 연속 4분기 차감·TTM 합계 대조, 실제 2025 Q3/2026 Q1 추가 연결. 삼성전자 TTM 2025-07-01~2026-06-30 READY, Web/Galaxy 세 값·기간·CFS·원 단위·근거 일치 확인.
- KIS 실제 daily-price FID_ORG_ADJ_PRC=0과 공식 동일 API 문서 대조: 원주가로 수정. 다른 itemchartprice API 계약과 혼용 금지. 이벤트 중복 방지·UNKNOWN/기업행동 미확인 구간 성과 보류 강화.
- OpenDART/KIS 실제 읽기 38회(토큰·master 포함), 3기업 SK하이닉스/DB하이텍/한미반도체 자료 연결. 업종·사업 기준·기간/가격 기준 미충족, 유효 표본 0. 기존 최소 3표본 유지. 기업개황 개인정보 필드 저장 제외.
- 공통 기간 가격 수익률/MDD/초과수익 API와 Web 차트 연결. 실제 삼성전자 PENDING(CORPORATE_ACTION_COVERAGE_REQUIRED), Apple 보류·SEC 15근거 보존. 기존 지수 49일 보존/표시 재확인, 이번 외부 지수 수집 없음.
- Galaxy A33 검증 APK 업데이트 install -r/실행 PASS, 기존 데이터 보존. TTM·상세 이동 버튼·비교표 가로 스크롤·긴 설명·연결 실패/복구 확인. 기존 OS 글자 115% 유지/반영. Chrome 6폭×2테마·글자 200% PASS. 실기기 200%/합성 오류 전체 시나리오 NOT RUN.
- 최종 offline 250/250 PASS(기존 225 포함), Android 계약 3/3 PASS, git diff --check PASS. 자동 테스트 fixture/stub, 실제 읽기 별도. 실거래 OFF/브로커 OFF/이번 실제 주문 0. 전체 PARTIAL.
- 상세 결과·수정 파일·출처·남은 조건: [PARTIAL 후속 QA 보고서](KSTOCK_QA_FOLLOWUP_REPORT.md).

## 2026-10-12 — 기업행동·발행주식수 원천 연결 및 후속 QA

- 첨부 통합 지시서/AGENTS/공통 기준/이전 QA 확인. 기존 HEAD/branch/사용자 변경 보존. 기준선 현재 offline 250 및 Android 3 PASS.
- 삼성전자·기존 비교기업 3곳 OpenDART 반기 주식 총수/증자/배당/자기주식 실제 읽기 16회. 요약 근거 132행 확보, 확정 기업행동 0: 적용일·전체 구간 coverage는 미검증.
- 삼성전자 2026-06-30 보통주 발행 5,846,278,608/자기주식 82,086,705/유통 5,764,191,903 산식 확인. 가격 2026-10-08과 정렬 근거 부족 BLOCKED. 우선주 결측을 0으로 만들지 않음.
- share_count/kr_actions 계층, 클래스·공시 이용 시점·정렬/중복 차단, 실제 입력/API/UI 연결. 보통주 가격에 합계 수량 사용 금지. 기존 median/최소 3표본 유지, 유효 0. PER/PBR/PSR/EV-EBITDA 및 종목 실제 성과 보류. Apple source/evidence 일치·추천 보류 보존.
- Web 실데이터·6폭×2테마·글자 200% PASS. Galaxy A33 기존 앱 재실행, 주식수·기준일·기업행동 요약·근거 펼침/스크롤·연결 실패/복구 직접 확인. 이번 APK 재설치 NOT RUN(native 변경 없음).
- 최종 offline 266/266 및 Android 계약 3/3 PASS, git diff --check PASS. 처음 HTTP 오류 fixture 두 곳 실패는 유효 요청 입력 보완 후 원래 오류 검증 유지.
- 키/.env/운영/다른 프로젝트 변경 없음. 실거래 OFF/브로커 OFF/실제 주문 0. PARTIAL/HOLD. 상세·차단 사유·NOT RUN: [후속 QA 보고서](KSTOCK_QA_FOLLOWUP_REPORT.md).

## 2026-10-12 — 권리 적용일 검증·부분 구간 성과·벤치마크

- 첨부 지시서/공통 Gate/이전 QA와 현재 Git 확인, 기준선 offline 266 재실행 PASS. 기존 미커밋 변경·자료 보존.
- 삼성전자 공식 IR Q2 배당: 공시 7/30, 기준 6/30, 주당 374 KRW, 지급 예정 8/28 확인. 배당락일 없음, PENDING 유지. 원문 비공개 사본/SHA/출처 보존. 기존 4회사 OpenDART 요약 132행 재사용, 다른 회사 권리 적용일은 미검증.
- entitlement 검증 계층·유상증자 단순비율 차단·자기주식 유형별 영향 구분. 계산 함수에서 중복/자본 이벤트 재차단. 검증된 부분 기간만 명시적으로 산출하는 함수 추가, 실제 삼성전자 검증 기간 0/성과 보류.
- 기존 KIS 읽기 경로 지수 재수집 3회(토큰 포함), 각각 50일 7/27~10/8. 이전 49일 파일 보존. 두 지수 비교 상태 API/UI 연결. 유효 peer 0/기존 최소 3 유지.
- Web 실데이터 6폭×2테마·200% PASS. Galaxy A33 TTM 3값/기간/출처와 공식 배당 날짜/금액/미확인 배당락일·가격 관측 구간·비교표·연결 실패 직접 확인, USB 복원. 이번 가로 스크롤 성공/새 APK 설치 NOT RUN.
- 최종 offline 283/283 + Android 계약 3/3 PASS, diff/check 문법 PASS. 키/.env/운영/다른 프로젝트 변경 없음. 실거래/브로커 OFF, 실제 주문 0. PARTIAL/HOLD. 상세: [QA 보고서](KSTOCK_QA_FOLLOWUP_REPORT.md).

## 2026-10-12 — 배당락·기업행동 조사 범위 후속 검증

- 현재 기준선 offline 283 PASS. OpenDART 삼성전자 관측 구간 8/26~10/8 공시 목록 읽기 3회, 월별 페이지 1/1씩 완료, 접수번호 중복 제거 21건. 개인정보 제출인 제외/비공개 감사 자료 저장.
- 월별 조회 범위/페이지 누락 메타데이터 추가. 공시 목록 완료와 기업행동 적용일·전수 검증 분리. 불명확 페이지는 truncated/null로 보류, 추천 Gate 활성화 없음.
- 공식 IR 9/21 공지의 9/30 배당 기준일 재확인. 배당락일·3분기 금액/지급일은 미확정. 기존 RAW·지수·Apple·.env 보존, 새 실제 성과 없음.
- offline 286/286, Android 계약 3/3, 표적 검증/diff PASS. 이번 Web/Galaxy 화면 및 재설치 NOT RUN. 추천 HOLD/전체 PARTIAL, 실거래·브로커 OFF/실제 주문 0.
- 세부 원문 조사·거래소 적용일·전수 coverage·유효 비교 표본·새 화면 검증은 남아 있음. [후속 QA 보고서](KSTOCK_QA_FOLLOWUP_REPORT.md).

## 2026-10-12 — 21건 공시 원문 확보·분류 및 Web/Android 후속 QA

- 기존 공시 목록 재사용, OpenDART document.xml 실제 21회 → 원문 ZIP/XML 21건 확보. 21건 발행회사 기업행동 비관련 분류/사유 기록, 관련 0/미확보 0. 기업집단 다른 회사 배당 및 대량보유 안내를 삼성전자 이벤트로 만들지 않음. coverage false 유지.
- 공식 IR Q3 공지 1회 읽기: 9/21 공시·9/30 기준일만 확인, 배당락/금액/지급일 미확인. Q2 374 KRW와 구분해 실제 입력 연결. 공식 보통주 KRX 적용일 원문은 아직 미확보.
- 원문 상태·정정 관계·출처 날짜 충돌·새 UI 근거 및 PERFORMANCE_BLOCKED/BENCHMARK_BLOCKED 계약 연결. 원문 개인정보/API key/로컬 경로 공개 제외.
- Web 실제 요약·기존 TTM/배당/가격·6폭×2테마·200% PASS. Galaxy 기존 앱 상세·21건 근거 펼침·Q2 배당·추천 보류·가로 비교표 스크롤·네트워크 실패/복구 확인. 이후 Q3 추가 화면/새 APK는 NOT RUN.
- Offline 292/292 + Android 3/3 PASS, 문법/diff/비밀값 scan PASS. Apple 5 snapshot·SEC 15근거 보존 확인. local health broker/live/external false, 실제 주문 0. 전체 PARTIAL/HOLD.
- [원문 검증 상세 보고서](KSTOCK_QA_FOLLOWUP_REPORT.md).

- 최종 Q3 실기기 재확인 중 다른 앱 전경을 발견해 추가 터치 중단. Q3 NOT RUN 유지, 향후 매 터치 직전 전경 패키지 검사 필요.


## 2026-10-12 KRX 권리 적용일·선행 기업행동·Galaxy Q3 검증

기준 ea406852610c00bef0dbe469de95c42fca662c30 / auto/kstock-development-20260930. 기존 미커밋·사용자 데이터 보존. AGENTS/ARI compliance preflight 수행. 현재 기준 offline 292 PASS를 재실행했고 변경 후 302/302 PASS, Android 계약 3/3 PASS.

KIND 관측 8/26~10/8 22건, 선행 6/30~8/25 844건 전9페이지 조회. 제한된 KIND 실제 읽기37회, DART21원문/지수/KIS 재수집0. 보통주 공식 배당락 적용일9/29 및 기준가격270,000 KRW 확인. RAW9/28종가와 일치하지만 수정주가/총수익 검증으로 확대하지 않음. 선행 실제 처분7/8 1,083,434주,7/13 1,132,477주 확인. 취득53,285,968주는8/24~11/21예정이며 실행량·실제 적용일미확인. 유형별 전체coverage false, 권리락일미확인.

Web Q3/실제처분/예정취득/원문링크·6폭×2테마·200% PASS. Galaxy A33 기존앱에서 Q3 기준일9/30·배당락9/29·미확인금액/지급일과 보류문구 일치 PASS; 긴 설명 스크롤 및 연결실패/복구 PASS. 매 입력 전 전면 앱검사 가드 구현/테스트, 다른기기 입력0. 캡처 docs/uiux/galaxy-a33-krx-*.png. 새APK설치·OS200%·운영인증/페어링 NOT RUN.

종목29거래일과 기존지수50일의 공통29일 날짜배열일치 확인. 기업행동 전체/주식수 날짜정렬 선행조건 미완료로 삼성전자 PERFORMANCE_BLOCKED, 지수비교 BENCHMARK_BLOCKED, 검증수익구간 없음. 유효동종표본0/최소3 유지. Apple 입력/SEC근거 보존 동등성 및 추천HOLD 확인. health externalAccess/brokerEnabled/liveTrading false, 이번 주문0(주문관련 API실행없음). 전체 PARTIAL. 다음: 실제 취득 실행 및 유형별 적용근거 → 검증구간 → 종목/동일기간지수성과. 상세 docs/KSTOCK_QA_FOLLOWUP_REPORT.md.


## 2026-10-12 자기주식 실제 체결·주식수 후속 개발

기준 ea406852610c00bef0dbe469de95c42fca662c30, auto/kstock-development-20260930. preflight AGENTS/compliance/첨부/기획·아키텍처·QA 대조, 기존 미커밋/사용자 데이터 보존. baseline302 PASS 재실행, 최종offline313/313 PASS·Android3/3 PASS.

공식 KIND7회 제한 읽기. 최초 회사 필터 미적용 전체시장 응답은 제외. 공식 회사 식별005930/KR7005930003/00126380/isur00593 확인 후 체결29건1/1페이지 확보. 실제8/24~10/6 취득56,856,305주 = 신고 누계, 예정53,285,968주와 구분. 가격 관측8/26~10/8 내 실제53,056,305주. 기존 처분2,215,911주/배당락2026-09-29 근거 유지. 실제소각수량 미확인(0으로 처리안함), 일별자료 과거공개시각 미확인(확인시각만 저장). 원문21/지수/KIS/IR 재요청0.

11유형 coverage PENDING, 보고서 보통주6/30 발행5,846,278,608/자기82,086,705/유통5,764,191,903주 보존. 실제 취득·처분으로 발행수량을 바꾸지 않는 ledger와 소각 발행변화 근거 Gate 구현. 전체변화 coverage 없으면 현재주식수/시가총액 생성차단. 종목PERFORMANCE_BLOCKED·두지수BENCHMARK_BLOCKED 유지, 검증성과구간없음. 실제한국동종3종 재검증 유효0/최소3 유지.

Web 실제수량·타임라인·보류·6폭×2테마·200% PASS. Galaxy A33 실행/서버/삼성전자/실제수량/주식수기준일/일별펼침/성과·지수비교보류/추천보류/비교표가로스크롤/네트워크실패·복구 PASS. 신규APK/OS200%/운영인증페어링 NOT RUN. 모든 입력 전 K-Stock 전면검사, 다른기기 변경없음. docs/uiux/galaxy-a33-treasury-*.png.

미국 입력·SEC근거 동등성, 전체후보승인false, health 실거래/브로커/외부접속false 확인. 이번 주문0, .env/운영/타프로젝트 변경없음. 전체PARTIAL. 다음: 실제소각·발행변화 적용근거와 전체유형coverage→주식수기준일정렬→검증종목/지수성과. 상세 docs/KSTOCK_QA_FOLLOWUP_REPORT.md.


## 2026-10-12 기초·기말 자기주식 잔고 대사

preflight AGENTS/compliance/첨부/QA로그·기획·아키텍처 확인. 기준 ea406852610c00bef0dbe469de95c42fca662c30 / auto/kstock-development-20260930, 기존 미커밋 보존. 기준313 PASS 재실행, 최종322/322 PASS·Android계약3/3 PASS. 공식재요청0, 기존56,856,305주 재사용/신규취득추가0.

6/30기초82,086,705 − 7/8처분1,083,434 − 7/13처분1,132,477 = 8/21공시잔고79,870,794주. 차이0/MATCH이나 전체변동coverage false/PENDING 유지. 현재10/8잔고원천없음/null, 취득합계로 현재잔고를 확정하지 않음. 기초·기말·실제·계획·기타조정 구분, RECONCILIATION_MISMATCH 및 누락/중복/정정/종류/미래정보 Gate 구현.

Web 새잔고/대사차이/보류·6폭×2테마·200% PASS. A33 잔고값/기간/단위/출처·긴 설명·비교표가로스크롤·네트워크실패/복구 PASS. 신규APK/OS200%/운영인증페어링 NOT RUN. 기존체결타임라인 검증기록보존. docs/uiux/galaxy-a33-balance-*.png.

우선주자기주식null/정의대기, 보통주6/30보고서와10/8가격정렬보류. 11유형coverage미완료, 성과PERFORMANCE_BLOCKED·두지수BENCHMARK_BLOCKED·peer0/최소3·Apple포함추천HOLD 유지. 미국/SEC/RAW보존 동등성 PASS. health 실거래/브로커/외부접속false, 이번주문0. .env/운영/다른프로젝트변경없음. 전체PARTIAL. 다음 공식동일기준일잔고·소각/기타변동·정정근거→기준일정렬→검증성과/지수비교. 상세 QA보고서 갱신.


## 2026-10-12 — 10/8 잔고 기준일 검증
기준선322 → 오프라인326 PASS, Android3 PASS. Aug21기초79,870,794주와 실제취득56,856,305주 재사용, Oct8공식잔고/처분/소각 미확인null. 기준일·공시일 분리, 4가지 대사 판정 및 정정 차단 추가. Web 반응형/200% PASS, A33 잔고/예정실제/스크롤/실패복구 실화면 PASS; 가로표·지수·재설치 이번NOT RUN. KIND직접3회+검색2회 원문SHA감사 보존. Apple/SEC/RAW 깊은 비교 보존. 실거래OFF, 이번주문0. 상세/차단/다음단계는 QA보고서 최신 항목. PARTIAL.


## 2026-10-12 — 공식 잔고 기준일 재설정
첨부/AGENTS/compliance/QA로그/기획·설계 확인. HEAD ea40685 및 미커밋 보존. 기준326 재실행PASS → 336 PASS, Android3 PASS. 공식Samsung IR84756 원문에서 End quantity=8/21 79,870,794주 확인, 직접1HTTP+검색1+open1. Oct8 SOURCE_NOT_CONFIRMED/존재UNKNOWN. 공식 날짜 관측 기반 구간 자동 구성, 세 날짜 분리, 중복·정정·거래일 누락·상충 최신 값 차단. June30~Aug21 차이0이나 전체 범위부족 INSUFFICIENT_DATA, 이후 실제56,856,305 재사용/새 이벤트0/잔고추정 없음. Web6폭2테마200%PASS, A33 공식구간/거래펼침/가로표/연결실패복구/지수수치PASS. 설치·지수전체차트·전체행·OS200%NOTRUN. Apple/SEC/RAW 깊은 비교PASS, secret검색0, liveOFF/이번주문0. 기업행동·현재주식수·성과·peer0추천HOLD. 전체PARTIAL. 상세 QA 최신 항목 참조.


## 2026-10-12 — A·B·C 병렬 개발·검증
기준336 재실행PASS→358PASS, Android3PASS. A 공식IR후속검색API 발견·범위8/22~10/12 공시3검증, 새잔고미확보/8/21 79,870,794주 유지. 날짜타임존오류2건 수정후전체PASS. B완전원천12유형·정정·RAW구간검증모델/후보0, 액면변경범위미확인 표시. C기존3+MU/TSM/UMC 조사3=후보6, 유효0/제외6/최소3 유지, 연결사업·통화·기간·주식수 미검증으로배수null. Web반응형/200%PASS, A33 새peer/action상태실화면PASS. 기존21원문/56,856,305실제체결/Apple/SEC/RAW/krPeers 보존. 직접공식HTTP5(4041포함), A검색2+open1/C검색2+open5+find4 감사저장. 성과·종목지수비교·추천HOLD, liveOFF/이번주문0/secret검색0. 전체PARTIAL. 상세 QA 최신항목.

추가 실기기 확인: 공식IR후속3건 표시·SOURCE_NOT_CONFIRMED·연결실패복구 및 비교표 가로스크롤/오른쪽 기준일 미확인 칸 캡처를 열어PASS 판정. streams-{continuity,failure,restored,comparison,comparison-right}.png.


## 2026-10-12 — 배수별 독립 검증 및 비교기업 6개 원인 진단

기준 HEAD ea406852610c00bef0dbe469de95c42fca662c30. Offline358 기준선 확인 후 376 PASS, Android 계약3 PASS. 공식 OpenDART 읽기10회로 국내3개 반기 및 DB 정정 공시일 보강. 현재 평가 목적과 과거 성과 조건을 별도 진단 모듈로 분리; 기존 추천 gate 유지. PER/PBR/PSR/EV EBITDA 유효 각0, 최소3. Web12레이아웃/200% 및 Galaxy A33 새 표·상세·가로스크롤·실패복구 확인. 공식8/21 잔고79,870,794 및21원문 보존, 전수 범위 미완료. 실거래OFF, 이번 주문0. PARTIAL. 상세/NOT RUN/다음순서: KSTOCK_QA_FOLLOWUP_REPORT.md 최신 섹션.


## 2026-10-12 — DB 정정 원문·10/8 기준일·배수별 실제 자료 연결

기준HEAD ea406852610c00bef0dbe469de95c42fca662c30, Offline376 재실행→399 PASS / Android3 PASS. DB 최초20260316001250→정정20260601001661 원문 확보, 주석35 통화단위/8전후 추적·주요 재무표4 동일, 과거 원문만 선택/목록 종료 후 보류 테스트. KIS 국내3 종가10/8확인(SK1681000/DB138800/한미267000), undated시총 분리. H1자본/지배지분/현금/부채 원천구분·PBR 독립선택, 현재 주식수 bridge/전체시총 미완료. 사업 출처와 연결 비교성 분리, SEC3 발행인/MU미래10K차단·20F/ADR필요, 가격provider쿨다운유지. 직접읽기10(시장3+토큰1+DART3+SEC3), 사업web7페이지. Web12조건/200%·A33DB정정전후/가격날짜/표/실패복구PASS. local3000 최신 저장보고서 연결 재시작(.env미변경), 기존형식누락 렌더회귀수정. 표본각0/최소3·추천/삼성성과HOLD, liveOFF/이번주문0. 보존deepEqual/secretmatch0. 전체PARTIAL, 미실행/차단/다음순서 QA 최신섹션.


## 2026-10-12 — DB 숫자 직접대사·동일일 시가총액/주식수 조사

HEAD ea40685/기존미커밋 보존. Offline399 재실행→414 PASS, Android3 PASS. DB8원문표200 semantic 항목/숫자변경26/단위필드변경60/원화환산100불변/최초단위미명시20유지/primary4표SHA재검증, 실제 셀 좌표200표 화면연결. KIS 기간별시세3 날짜행Oct8종가만확인, undatedoutput1자본결합금지(요약현재가격도실제차이). KRX읽기1HTTP400LOGOUT, 현재자본미확인. 직접외부6(공식문서1+token1+시장3+KRX1), DB추가0. 6기업4배수 재평가각0/최소3, 새분석시각으로새입력저장/과거기록보존. Web12조건/200%/표가로스크롤·A33DB수치6십만JPY→554천JPY/부족자료/실패복구PASS. 실거래OFF/이번주문0, 추천성과HOLD. 다음필요: 인증된KRX조회세션또는10/8공식CSV+주식수효력/전체종류대사. 전체PARTIAL, 상세 QA최신섹션.

최종 보완: 동일단위 합계76개 중 구성합 차이9건 추가발견, arithmeticStatus REVIEW_REQUIRED/valuationInputEligible=false/임의수정보정없음. 원문직접대사와 산술원인검증 구분, 추가회귀1개 포함 최종Offline415 PASS. Web최종9건문구PASS. A33 마지막문구재확인은 다른앱전경보호가드로 NOT RUN; 이전 동일작업의 수치표·값·단위·가로스크롤·실패복구확인은PASS. 해당 제한 QA 최신항목 명시.


## 2026-10-12 — Peer Validation Worker·운영/비교 UI

415 기준선 직접재실행 → 최종441 PASS / Android기존3 PASS. 기존 Macmini candidate06:30/JINI1800초HOLD 및 이전checkout launchd 조사, 등록변경0. localhost서버에30분 SAVED_EVIDENCE_ONLY 큐 통합, 실제6처리/자료부족3/KRX차단3/완료0·배수각0. PID잠금·재시작복구·원천해시·이전결과스냅샷·영구캐시/백오프/인증차단·읽기전용연결기와 상태API 구현. 실제외부자동수집NOTRUN/요청0, 최신수집완료로표시안함. DB원문400셀/SHA재대조,9합계차이원문존재확인·파싱오정렬배제이나공식원인미확보/값보정보류. Web12조건/200%·기존삼성TTM/공시/잔고/지수회귀PASS. A33비교6/표본0/가격/가로표/DB9제한/운영dark/실패복구/앱재실행실화면PASS, 신규APK/OS200%NOTRUN. 실제API success누락수정후Web재실행PASS. liveOFF/이번주문0/secret검색0/.env·운영·타프로젝트보존. 원천자료/수집/구현/실기기범위분리해 QA최신항목기록. 전체PARTIAL. 다음KRX동일일공식자본/DB공식설명→정규화→제한외부수집한사이클.


## 2026-10-12 — Data Collection Worker / DB 차이 개별 근거 / UI

기준 HEAD ea406852610c00bef0dbe469de95c42fca662c30, offline441 재확인 후470 PASS, Android 계약3 PASS. 수집 큐·읽기 원천 어댑터·캐시·PID 잠금·인증 차단·0600 SHA 보관·상태 API와 기존30분 저장 근거 재검증 연동. 새 외부 수집 enabled=false; 저장된10월8일 국내3종가 재사용, gateAttempts3/externalRequests0. 원래 수집 시각 보존, 기준일 없는 자본 결합 차단. 금융/주식수/기업행동/지수 정규화는 추가 필요. DB 차이9건 개별 전후 값·단위·기간·표/행·공시·근거 연결, 원인0해결/9미해결. Web actualAPI/12레이아웃/200%글자 및 기존 화면 회귀 PASS. A33 비교·보류·가로 스크롤·실패/복구·재실행 확인. 새 APK 설치 없음. 최종 세부 결과 docs/KSTOCK_QA_FOLLOWUP_REPORT.md. 실거래/브로커OFF, 이번 주문·취소 호출0, 추천·성과/Apple 순위 보류. .env·원문2ZIP·기존 보고서 SHA 보존. OVERALL PARTIAL.


## 2026-10-12 — PBR 입력 검증·금융 정규화·DB/A33 상세

기준 HEAD ea406852610c00bef0dbe469de95c42fca662c30, baseline470 재확인→offline502 PASS / Android3 PASS. PBR15·정규화10·DB3·UI4 신규32. SK→DB→한미→MU→TSM→UMC 완성도 우선순위, 국내3 CFS 소유주지분 계정 식별/미검증 원천값 표시; 시총·현재주식수·전체종류·기업행동 부족으로 PBR각null/유효0 유지. 종류별시총 구성·귀속배분·기준일·통화·공시시점·정정 검증 및 Worker 독립 판정 연결. Collection observed 정규화 연결, 실제 저장재무807행은 기준·단위·공시 계보 미확인 상태로 평가입력 차단. 주식수/행동 보고수량을 적용효력으로 추정하지 않음. DB9 잔차7원인 후보 검토·0해결9미해결/공식단위정정사유와 잔차인과 분리. Web12조건/200%·기존화면 PASS. 직전 NOT RUN 새A33 상세 SK/DB금액·기간·단위·출처/DB9표·가로스크롤/실패복구·앱재실행 확인PASS. 동일결과 자동refresh 상세DOM 보존으로 스크롤초기화 수정. 신규금융API0/공식검색1(2queries), 외부자동수집disabled/기존30분저장재검증유지. 실거래·브로커OFF/이번주문·취소0/추천·성과·Apple순위HOLD. 원본·.env·보고서SHA 보존. NOT RUN/부족조건/다음순서는 QA최신 PBR보고서. OVERALL PARTIAL.


## 2026-10-12 공식 자료 수집·기준일 검증 후속

OpenDART12회+SEC3회 수동 읽기, 국내3기업 June30 주식수 및 MU SEC 원천 확보. Oct8 주식수 대사 미완료로 PBR0 유지, DB 차이0해결/9미해결. 기존 Worker만 수정: 수동 종료 자동 OFF, 기업별 변경 감지 재검증, SEC 소스 마이그레이션·fetch 주입 수정. Web 선택기업/배수/스크롤 보존, 공식 관측일 표시. 회귀507/Android3 PASS, 실거래 OFF/이번 주문0. 상세 결과와 NOT RUN은 QA 최신 보고서 참조.


## 2026-10-12 국내3기업 주식수·PBR 대사

기준507 직접재확인→최종515 PASS/Android3 PASS. OpenDART 수동11회(목록3/원문8), July1~Oct8 공시목록 SK57/DB14/Hanmi19 전페이지 확인. SK 신주1779만주·중간총수730492365 대사, 소각미정 결정일적용 차단, 처분82주/중간자기1625769 확인. DB10월1일 의결권수43504588/공개10월7일로 Oct8전체수량 승격 금지. Hanmi 종속법인설립 제외. 대사 모듈/Worker inputHash/API/Web 상세 접힘보존 연결, A33국내3/DB9표가로스크롤/실패복구/재실행 확인. PBR0/DB0해결9미해결/MU유통vs발행·미래10/9접수 차단. SK직전QA종가표기258500오류를 실제Oct8원천1681000으로 이번보고서 정정; 원천변경 없음. 추천·성과HOLD/liveOFF/이번주문0, 외부자동수집OFF. 세부범위/NOT RUN/차단은 QA최신 SHARE COUNT 보고서.

A33 삼성전자 상세/실제1개월 가격차트 재검증 완료. 종목 목록과 DB정정표 바로가기로 긴 페이지 탐색 개선. Secret literal match0, .env live/broker false, 기존 보존 해시 일치.

A33 삼성전자 TTM 기간·CFS/KRW·매출485272032000000을 저장 원천과 대조 확인. 추천 보류 유지.


## 2026-10-12 공시 분류·기간 이전 기업행동 큐

- 기존515 현재 재실행PASS →524 PASS, Android3 PASS. 기존90건 분류(유형식별61/미분류29), 원문대상58+이전5큐. 이전기간공식목록100건 별도수집. 원문8신규 확보→16SHA검증. SK8월19일자기82주 실거래확인, 소각·취득계획은미적용. DB교환441990주는 신규발행이아님.
- 기존Collection/Validation과30분저장근거 스케줄 재사용, 외부자동OFF. Web선택/접힘/표스크롤보존 및 A33국내3기업 단계·큐·한미가로스크롤·연결실패복구·재실행 확인. PBR0, DB차이9미해결, 실거래OFF/이번주문호출0, .env·기존보고·원본ZIP보존.
- PARTIAL: 10월8일 공식잔고/전체행동연속성/시총·우선주범위/자본정의/DB개별원인 미확보. 자세한현재증거와NOT RUN은 QA최상단기록.


## 2026-10-12 SK 실제발행일 및 기간이전 조회확장

- 기준524 실제PASS →532 PASS, Android3 PASS. KIND추가상장공식원문(접수20260724000133/문서20260724000273) 발행일7월15일·상장7월29일·보통주17790000 확인; 최초6월24일/정정2/결과2/KIND 6개체인 연결. 공개7월24일시점이전분석에소급하지않고증가는발행일한번만.
- 국내3기업2025년1월~2026년6월1031공시(SK737/DB174/한미120), 페이지보완/회사코드/SHA확인. 기존90/이전100재사용. 새직접공식읽기31(OpenDART27/KIND4), 원문ZIP19+KIND1. 기간이전후보40+기존58=98큐. 원문캐시VERIFIED는최신체인실패시철회.
- Web선택/접힘/스크롤보존·반응형·공식6링크 및 A33세날짜/원문링크/국내3목록범위·보류확인. 기존앱/사용자데이터보존.
- 실제SK증자/자기82주 반영후에도10월8일확정수량null, 시총/PBR0; DB차이9미해결, 추천/성과HOLD/실거래OFF/이번주문호출0. QA최상단에선행조건/NOT RUN/다음작업기록.

## 2026-10-12 — 국내 주식수 기준점·중간 잔고 대사
- 시작532 PASS 재확인, 최종537 PASS/0 FAIL/0 SKIP, Android3 PASS. 로컬 bind 제한 실패는 권한 재실행으로 해소.
- OpenDART 반기 원문2회(SK/DB), 한미 기존 원문 재사용.3기업6월30일 발행/자기 수치 일치·정정 관계 대기 분리.
- SK 2월9일 소각 이미 기준점 반영;7월15일17,790,000주 1회,7월29일 중복 차단 유지.
- 중간일 체크포인트·필드 범위·미래/클래스 차단 보완. SK 자기 차이1,014주는 불완전 입력 참고 대조,10월8일 확정값 금지.
- Worker v13,30분 저장근거 Scheduler 유지,동일자료 UNCHANGED_SOURCE2회, 외부 자동 수집OFF.
- 실제 Web/Galaxy A33 요약·DB9·가로스크롤·실패복구·재실행 확인. OS200%/전체98원문/공식10월8일확정 NOT RUN.
- PBR표본0,DB0해결/9미해결,추천·삼성성과HOLD·실거래OFF·이번주문0. 상세 QA 상단 참조.

## 2026-10-12 — 기준점 이전 소각·채권 원문 후속 검증
- 실제 시작537 PASS →539 PASS/0 FAIL/0 SKIP, Android3 PASS.
- OpenDART원문3회: SK1월28일소각15300000주와반기실제2월9일 연결; DB894000주소각과반기수량식 일치(날짜미확인); DB교환사채납입은신규주식발행에합산금지.
- SK8월7일원문 직접1626236+기타73=1626309주 관측. 범위·집행미확인으로556/458차이를실제거래로생성안함, 기존1014주미해결유지.
- 큐원문검토 metadata SHA결합, 정정발표일 분리, 평가미승격; Validator v15/30분저장근거유지. Web/A33 실제원문판정·보류 확인.
-10월8일주식수/시총/PBRnull,표본0,DB0해결9미해결,추천·삼성성과HOLD,실거래OFF/이번주문0. 상세 QA 상단.

## 2026-10-12 — DB 소각 실제일 및 SK 잔고 원문 검증
- 시작539/최종545 PASS, Android3 PASS. DB기존최초·정정사업보고서에서894000주소각실제일2025-09-30확인,등기일미확인·기준점이후중복차감차단.
- SK소유원문3회읽기:개인장내매수기록을회사자기처분으로미적용,1,014주원인미해결. 임원소유보고서는잠재원문큐로보존,큐115(SK77/DB25/한미13).
- DB원문400셀재감사,9잔차공식원인미확보·0해결9미해결. 소각일확인과금융차이해결구분.
-소각완료·정정/미래정보검증/API·Web·A33실제일/등록미확인·평가보류연결,Validatorv17·30분저장근거유지·외부자동OFF.
-10월8일주식수·시총/PBRnull·표본0·추천/삼성성과HOLD·실거래OFF·이번주문0. QA상단참조.

## 2026-10-12 — DB 소각 기준점 포함·자기주식 범위 검증
- 시작545/최종548 PASS, Android3 PASS, 금융 외부 요청0. 기존 공식 반기 원문에서894000주소각2025-09-30 및6월30일발행43504588주에포함 직접확인.
- 전체보유1054464−교환청구미행사318249=법정자기736215주 구분. 신규발행/당기취득으로합산안함. 기준점포함검증 및ALREADY_INCLUDED_IN_BASELINE applied=false연결,평가일미승격.
- SK1014주공식원인미해결,국내3October8주식수/시총null·PBR0,DB원문400셀재감사0해결9미해결 유지.
- Validationv18,6기업PARTIAL3/BLOCKED3,동일자료UNCHANGED_SOURCE,기존30분저장근거스케줄/외부자동OFF.
- Web/A33실제DB범위·기준점포함·SK차이·한미보류·DB9·가로스크롤·실패복구·재실행확인. 기존설치/사용자데이터보존.
- 추천·삼성성과HOLD/실거래OFF/이번실제주문호출0. QA상단에자료·근거·NOT RUN·다음작업기록.

## 2026-10-12 — Influence / Capital / Signal Research 로컬 v1
- 시작548/최종570 PASS, Android3 PASS. 사용자지시대로신규인물·자본·금융·UI병렬개발후통합. 신규공식Fed/버크셔2건직접읽기,캐시재실행0;원문전체저장없음.
- 당시직책인물2/공식발언2,확인회사처분82주1건/취득계획1건. SEC기존13F1+Form4 4건은원문검증대기,거래일null·신고날짜분리.기관/기업을개인과합치지않음.
- 발언신호2/자본신호2/결합0,1·5·20시장반응HOLD/수익률null. AI어댑터구현·fixture검증,실제모델NOT_RUN.
- 기존30분Scheduler에저장근거Influence논리작업통합,동시중복/실패격리·상태기록,새외부자동수집OFF. 금융6기업3PARTIAL/3BLOCKED,표본0/SK1014/DB9미해결.
- Web/A33실제메뉴·당시역할·서한·회사/기관공시·신호·시장보류·자동갱신위치·실패복구·재실행확인,기존설치/사용자데이터보존.
- 추천/삼성성과/Apple순위HOLD·실거래OFF·이번주문0. .env/latest/DBZIP보존SHA일치,secret0. 상세QA/API계약·금융검토갱신.

## 2026-10-12 — 실제 로컬 Influence AI와 Signal Research
- 기준570/현재581회귀 PASS, Android3 PASS. 실제공식2원문·로컬qwen3분석6회중최종2구조화생성,중간2schema실패반영차단/이력보존. 영어해석과한국어편집요약구분·의미검증별도.
-5신호유형·독립방향/개인주체/공개시점검사,4사건12결과행은수익률null/표본0.
- FRED공식S&P500비공개관측1사건/보수적8월25일시작1D+0.41%,5D−0.37%,20D+3.38%.예측·초과수익·인과검증으로승격안함,공식NYSE9월1일휴장확인.
- 기존30분저장근거Scheduler·금융분리큐/6논리영역·외부자동OFF,SK1014/DB9미해결·PBR0 유지.
- Web실API·선택/필터/상세/스크롤·2테마6폭·200%·실패복구확인,A33목록/AI/자본/연구/지수/가로스크롤검증.상세최종QA참조.
- .env/latest/DBZIP보존SHA일치,secretLiteral0,추천/삼성성과/Apple순위HOLD·실거래OFF·이번주문0.

- 최종 A33 31초 자동갱신 위치·선택 보존/자체 연결실패·복구/앱재실행 확인. 현재로컬owner91754·다음22:40:45KST. 전체최종581 PASS/Android3 PASS/실제주문0, PARTIAL 유지.


## 2026-10-12 공식 자본 행동·기관 연관·초과수익 연구 후속

- 기준 HEAD ea406852610c00bef0dbe469de95c42fca662c30/auto-kstock 기존 dirty 보존. 기존581 현재 재실행 후 최종594 PASS, Android 계약3 PASS/FAIL0.
- 명시적 SEC 읽기: 고정2025공시창4버전의 AAPL300,000,000→300,000,000→280,000,000주. 감소1/변화없음1/최초잔고1, NEW HOLDINGS 정정표 AAPL없음을0으로 대체하지 않음. 공식proxy 직책 관계1은 문서일2025-03-14까지만 사용. 개인 거래·실제 매도일 추정 없음.
- 이번 제한 공식 direct17회(SEC14+proxy2+Nasdaq1),24h캐시 재실행0. Nasdaq 이번2025가격 응답0행; 기존2026가격을 소급하지 않음. 신규모델0/저장AI2 보존.
- 신호8=발언2+자본5+근거부족연관1, ALIGNED/DIVERGENT0.24기간행 수익null/MARKET_REACTION_BLOCKED, 그룹9행 N0/통계null. 투자 가설 유효성 미검증.
- Chrome Web 실제API/작은화면/다크/200%/상태보존/오류복구 PASS. A33 실제 공식보유·정정·기간별보류·그룹0·가로스크롤·31초펼침/위치보존·연결복구·재실행 PASS. 기존앱·사용자데이터보존/재설치없음.
- 로컬KStock서버만 재시작 PID94530, 기존30분 저장근거Scheduler/외부자동수집false; 다음23:08:51KST. 이번30분경과tick 관측NOT RUN.
- 국내6기업 재검증 PBR/PER/PSR/EV0, SK자기주식1,014주·DB9차이 미해결, DBbaseline소각중복차감금지. 별도 금융검토 문서 추가.
- 실거래OFF/이번주문0/추천·삼성전자성과·Apple순위HOLD. .env/latest/DBZIP보존SHA모두불변, 비밀값scan0. 새자료private0600.
- 최종 상세·출처·실제검증/NOT RUN/변경파일은 docs/KSTOCK_QA_FOLLOWUP_REPORT.md 최상단 SIGNAL VALIDATION REPORT. Overall PARTIAL.


## 2026-10-12 SEC 공개 시각·Apple 역사 가격 후속

- 기준594 현재 재실행,최종606 PASS/Android3 PASS/FAIL0. 기존HEAD ea406852610c00bef0dbe469de95c42fca662c30·dirty·다른프로젝트보존.
- KIS 기존환경·인증정보 재사용 AAPL/NAS/MODP0 해외일별100×2 성공:2024-10-24~2025-03-20 /2025-04-23~09-15. S&P500 실제155개2025-02-03~09-15·휴장blank6,2구간gap보간없음. raw/adjusted구분·OHLC/identity/SHA검증.
- SEC13F3헤더 acceptance/index 일치·미국동부DST 검증. SEC공식지연FAQ/PDS규격 확인후 acceptedAt를첫웹공개로승격하지않음. 실제publicAvailableAt/tradeableFrom/transactionDate null.
- 3사건1/5/20 후보9구간 공통2/6/21가격 모두확보. 후보날짜는접수기준자료확인이지확정거래시점아님. 실제수익·초과수익null/실증표본0/MARKET_REACTION_BLOCKED. 장중일별종가만으로실행가격추정금지 강화.
- Buffett PDFpage6 Apple직접언급·일반소수지분설명 확인. 방향·인과·개인거래미검증/결합0,기존기관연관후보1보류·AI저장2보존/신규추론0.
- 직접읽기12(KIS시세2+token2/SEC3/FRED2/NYSE1/Apple403 1/Nasdaq0 1),새boundedcollector캐시외부0·최대8·24h·조회scope고정. 자동외부수집없음.
- Web 실제API/작은화면·다크·200%·상태보존·오류복구 PASS. A33 실제SEC접수/공개보류/가격200·기간·SP500·버핏관계·1/5/20·가로스크롤/31초상태유지/연결복구·재실행 PASS. 기존설치·앱데이터보존/재설치없음.
- 금융병렬저장감사80 PASS(전체606부분집합),SK1014·DB9/PBR0미해결·DB소각baseline중복차감금지. 별도market financial review추가.
- 로컬서버만최종재시작PID99118/30분저장Scheduler/다음23:53:29KST. 이번30분tick관측NOT RUN. .env/latest/DBZIP불변·비밀scan0·새자료0600.
- 추천/삼성전자성과/Apple순위HOLD,실거래OFF·이번실제주문0. 전체실증완료아닌PARTIAL. 상세출처/기간/차단/NOT RUN은최상단MARKET REACTION REPORT.

## 2026-10-12 — SEC 보수적 시작점·Apple 시장 반응
- 기준606 실제 재실행 PASS → 회귀613 PASS / Android3 PASS.
- SEC 일별색인3건 신규확보. 최초공개 시각은 미확인;5월·8월 원본 수정시각+공식 야간색인 안내를 CONSERVATIVE_START 연구경계로 분리.2월색인은5월수정으로 차단.
- Nasdaq 현금배당락2/10·5/12·8/11 원문확인,Apple 공식 이력 대조. MODP0 원주가 가격수익률,배당포함·기타전수검증은 보류.
- 기존Apple200/FRED155 재사용,공통133거래일,1/5/20각보수적2개(공시2건·기간6행),정확한공개0.8월1D -0.3023%,초과 -0.2922pp. 예측력 입증 아님.
- Web 실제계약/스크롤보존 PASS,Galaxy 새 표본/기업행동/보수적정책 표시·재실행 확인. 상세 실기기 최종 결과는 QA 보고서 참조.
- 추천/삼성성과/Apple순위 HOLD,실거래OFF,이번작업주문0.새 자동외부수집0.
- Galaxy 최종: 초과수익6행 실제 숫자 대조 PASS,가로스크롤/32초자동갱신 확인. 세로 픽셀동일성 실기기 자동검증NOT RUN. .env/기존원문해시 보존 PASS,신규3자료0600/Gitignored,비밀값 스캔0.


## 2026-10-13 KST — 비Apple 시장 반응 연구 확대

- 기준 HEAD ea40685/auto/kstock-development-20260930, 기존미커밋변경 및 .env/Apple/SEC/DB ZIP SHA 보존. 다른프로젝트·운영·배포 변경없음.
- 공식 신규 발언2(파월5/15,월러7/17), 신규인물1, 자본자료3(Apple합계/승인,MSFT완료배당+재매입합계). MSFT공식IR+SEC8-K날짜교차, 정확공개null/보수날짜종료 별도.
- MSFT실제KIS100가격/SP500기존155/공통100. 신규독립사건1의1/5/20D초과수익 -0.1609/-2.3826/-7.0352pp, 손실사례도보존. Apple기존2사건6행동일재현,2월수정원인HOLD.
- 회사/벤치마크별집계분리/연구용pub복제원본불변/정확0/결합0/holdout미확보. 신규정책발언지수관측2는초과수익표본아님.
- 기존30분저장근거Worker8영역, 외부자동수집OFF. 금융6회사표본0/SK1014/DB9미해결 유지.
- Web실제UI/API 및GalaxyA33신규값/기간/출처/가로스크롤/32초새로고침/오류복구/재실행 확인, 재설치없음. OS200%·운영인증·30분자연주기NOTRUN.
- Regression637 PASS0FAIL, Android계약3PASS0FAIL, 기존613유지. 외부수집은boundedmanual별도; 실제주문호출0/실거래OFF/추천·삼성성과·Apple순위HOLD.
- 상세출처/호출수/한계/변경파일은 KSTOCK_QA_FOLLOWUP_REPORT.md 최상단 보고서. 전체PARTIAL, 신규사건다양성/결합신호/독립검증 후속.


## 2026-10-13 — 저장 근거 자동 연구와 심플 UI

기준HEAD ea406852610c00bef0dbe469de95c42fca662c30, 기존 dirty 보존. 실제 시작637PASS→현재645PASS, Android 계약3PASS. 기존30분 INFLUENCE_VALIDATION을10단계 저장 연구 파이프라인으로 연결, 변경 감지/중복 잠금/백오프/복구/자동 근거 QA 구현. 비활성 외부 수집 OFF 유지. 새 공유 Research Dashboard API로 홈·신호·인물·연구 화면을 단순화하고 근거 상세 분리. Web24개 반응형 조합/200% 확대/선택·상세·스크롤 유지/실패 복구, Galaxy A33 홈·신호·인물·연구·시장/음의 MSFT 관측값/실패 복구/재실행 확인. 신규 독립 연구 사건0, 기존Apple2/MSFT1 보존. 정확공개0/결합0/예측신호0; 기대·전략 백테스트·외부 자동 신규 수집은 미완료. 추천·삼성전자 성과·Apple순위 HOLD, 실거래OFF, 이번 경로 주문호출0. 전체판정PARTIAL. 상세·NOT RUN은 KSTOCK_QA_FOLLOWUP_REPORT.md 최상단 참조.


## 2026-10-13 — 승인 공식 소스 자동 수집 연결

기준HEAD ea406852610c00bef0dbe469de95c42fca662c30, 실제 시작645PASS→655PASS, Android계약3PASS. 사용자 첨부651f08a7 승인으로 기존 Collection Worker에 연구 작업을 추가하고 기존30분 Scheduler에 OFFICIAL_COLLECTION/INFLUENCE_VALIDATION 연결. SEC/OpenDART/KIS/IR일별, 연준6시간별slot, 최대12fetch·1100ms·증분/중복/차단격리·복구/정정history/로컬정책저장. KRXAUTH_BLOCKED, KIND정부미연결. 실제Worker외부18건 + 제한진단5건, 신규공식Powell2025-09-23 발언1·로컬AI1·신규자본0·신규시장초과수익0. 기존Apple2/MSFT1 재현, 손실보존. Web/A33 실제13/0/14·자동수집소스·신규발언AI·32초상태유지·실패복구/재실행 확인. PBR0/SK1014/DB9미해결. 추천·삼성성과·Apple순위HOLD, 실거래OFF/이번주문0. 전체PARTIAL; 상세실행시각/원천/차단/NOTRUN은 QA최상단. 다음예정tick01:58:29KST(재시작시변경), 새원문만증분검증.


## 2026-10-13 — 자율 연구 운영 상태·문서 파이프라인 안정화

기준HEAD ea406852610c00bef0dbe469de95c42fca662c30, 현재 코드655PASS 확인→최종663PASS/Android3PASS. 소스별 실제 HTTP 누적 기록·인증/제한/다음 slot·첫 신규 발언 시각을 원자 저장하고 재시작 복구. 문서별8단계 평가 API/QA, 미래 공개 차단, 기업별 중앙값/양의 비율/최저 초과수익과 BACKTEST_BLOCKED/구간미확보 연결. 홈 오늘 공식 발언1은 직전 수집 파월 원문이며 이번 신규0/AI0/자본0/시장표본0. 실제 승인 읽기2건/최종재시작0·중복7, 로컬3회 재시작/격리 복구 PASS. Web24조합/확대/상태유지/실패복구와 Galaxy A33 홈·소스·신호·연구·32초상태유지·연결복구·재실행 확인. 기존Apple2/MSFT1, 금융SK1014/DB9/PBR0 보존, liveOFF/이번주문0/HOLD. 전체PARTIAL, 장기자연주기/OS부팅복구·신규표본실증 미완료. 상세·NOT RUN은 QA최상단.


## 2026-10-13 — MASTER PART19~24 통합 QA 사이클

Cycle ID:master-qa-20261012181646486; 시작기준실행2026-10-12T17:49:11.396946+00:00, 종료2026-10-13T03:18:16.756315+09:00; HEADea406852610c00bef0dbe469de95c42fca662c30, package1.0.0/server0.1.0/기존Android2.6.5. 시작663PASS→최종679PASS/FAIL0/SKIP0, Android3PASS/FAIL0. 백테스트입력검증10개·실제QA집계파서4개·캐시시각분리1개·초기오류UI1개 추가. 정책/구간/시간/비용/슬리피지/용량/중복/가격정의차단과공유API·보류상세,실제QA실행JSON저장. 최초연결실패로딩잔류/가독성수정. 신규공식자료/발언/자본/신호/시장표본0, 기존5/8/정확0/보수3보존, BACKTEST_BLOCKED. 기존수동프로세스30분자연주기1회0외부·중복7관측; 등록시작서비스5개경로와peer플래그문제읽기조사,다른프로젝트수정0/서비스변경0. Web40폭조합·키보드·상태·초기/캐시오류복구, A33홈/신호/인물/시장/연구/32초상태·실패·복구·재실행명시범위확인. 추천/삼성성과/Apple순위HOLD, .envbroker/liveOFF·이번실주문0. 전체PARTIAL/RESEARCH_PARTIAL. 진행률75는인수인계추정,MASTER1~18본문미확보로새%생성안함. 남은출시/OS복구/금융·독립평가는QA·매트릭스에기록;다음공식원문/가격/사전코호트,기존Scheduler자료변경만재검증.


## 2026-10-13 — 시안 기반 전체 프론트엔드 공통 개편

Web 라이트/운영 다크, 실제 홈 API 및 최근 결과, 전체 메뉴13개, 모든 기존 화면 공통 카드·상태·여백·반응형 적용. 679 회귀/Android3 PASS, Web60폭조합·라이트다크8메뉴조합·상태유지·실패복구 확인. Galaxy A33 기존APK로 홈/신호/인물/시장/연구·메뉴·스크롤 확인. 실제금융신규0/추천성과HOLD/liveOFF/이번주문0. JINI 전달응답의 코드·테스트완료주장은 실행기록(읽기/Git만)과 달라 완료미인정; 별도audit저장. 전체PARTIAL, 상세수치/OS확대/접근성/백엔드실제성과미확보는QA기록.
Galaxy 최종 연결 실패·32초 자료 유지·복구·재실행 확인, Web 오류 문구는 Chrome 별도 검증.

## 2026-10-13 — 홈에서 선택 연구 상세로 이동

홈 카드 근거 링크/선택 상세 자동 펼침/초점/메뉴 활성, Escape·바깥 클릭 닫기 구현. 동적 상세 삽입 시 펼침 상태 충돌 수정 및 회귀2 추가. 681PASS/Android3PASS, Chrome 상세·8폭테마·기존상태/오류회귀, A33 실제 홈 링크→선택 Apple 상세/근거 확인. 금융 신규0/HOLD/liveOFF/이번주문0. 전용 근거 JSON과 QA갱신; 전체PARTIAL.

## 2026-10-13 — 인물 날짜순 근거 화면

인물 공식 발언/직접 연결 행동 타임라인, 발언일·공시일·거래일 구분 및 별도 원천 근거. 기관·기업 개인거래 오인 방지 유지. 683PASS/Android3PASS, 실제API 인물3×폭4·펼침/선택/스크롤 검증. 신규연구0/HOLD/liveOFF/이번주문0, 전체PARTIAL.

## 2026-10-13 — JINI 허위 완료 차단

사용자 승인 범위로 기존 JINI 완료 판정2파일 수정(K-STOCK 한정), 로컬에이전트 재시작. 실제성공write/수정후테스트/diff/전용보고서 gate 및 JSON 증거 저장. 단위4/회귀683PASS, 실제HTTP200 요청이 NO_EXECUTED_WRITE/BACKEND_REPORT_MISSING으로 ok=false/BLOCKED임 확인. 모델 보고서 replace실패를 완료로 인정하지 않음. 자율실행·보고서 실제생성은 아직PARTIAL/수집UNVERIFIED, HOLD/서비스설정/인증보존/liveOFF/주문0. 다음 제한된Worker호출·구조화보고 연결.

## 2026-10-13 — JINI 제한 실행과 자동 보고 연결

K-STOCK 전용 실제 작업ID/시작·종료 JSON+MD, 실패·차단/중단 표시와 상태API/중복방지 연결. 기존 저장근거Worker→오프라인테스트→diff 실제JINI 실행 Job 730f7d8e-0fd2-426b-be12-04fbc0640a03: UNCHANGED_SOURCE/외부0/신규0, 683PASS/FAIL0, 보고서 경로 수신·상태API 확인. 단위8별도PASS. .env·프론트·공유보고서 agent수정차단, 제한task/secret부모env제외. 자동개발HOLD/스케줄/실거래OFF/추천성과HOLD 유지. 전체PARTIAL; 자연어개발·새외부수집은미검증.

## 2026-10-13 — JINI 자동 개발 HOLD 해제

자동지시·HTTP결과판정 정리, 실제JINI 함수/테스트/보고write3 및 수정후686PASS/diff 검증(0df76235-2137-4df7-a4c0-9892f409e84a). 리뷰 누락2조건 보강후686재확인. HOLD원본보존이동, 기존1800초launchd 첫사이클 시작PID30550/Job 797b89db-2116-4048-82eb-203d137a5f77 RUNNING·시작보고실존. 완료는미확인/장기안정성미검증. 새로운외부수집/주문활성화없음/추천성과HOLD/liveOFF. 자동보고·상태API경로QA기록.

## 2026-10-13 — 비교기업 모바일 카드/종목 상세 이동

모바일 기업6카드·배수별 상태/기준일/근거, 데스크톱표 유지. 실제삼성전자 상세조회 후stock화면이동 및 중첩route수정. 320→336px 최소폭 문제해결(최종320). 686회귀/Android3PASS, 실제API 4폭·삼성표시/A33 SK카드확인. 금융신규0/HOLD/liveOFF/주문0; 전체PARTIAL 상세전체재배치후속.

## 2026-10-13 KST — 종목 상세 정보 위계
실제 삼성전자 응답으로 종가/추천/성과 요약 카드와 상세 근거 펼침 구획 연결. Web 4개 폭에서 넘침 없음, 회귀 686 PASS. Galaxy A33의 이번 상세 개편은 NOT RUN; 추천·성과 HOLD 유지. 상세 QA 및 화면 근거는 후속 보고서 참조.

## 2026-10-13 KST — 종목 상세 Galaxy A33 QA
실기기에서 hashchange 후 상세 대신 차트 상단으로 돌아가던 문제를 발견하고 #candidate-detail 앵커로 수정. 요약/TTM 이동·긴 분기 설명 스크롤·성과 근거 터치 펼침 확인. Web/A33의 표시 TTM 값/기간/단위/공시번호 일치. Web 4개 폭 200% 본문 확대 및 Enter 펼침 확인. 회귀 686 PASS, Android 계약 3 PASS. OS 확대/TalkBack/이번 연결 복구와 재실행 NOT RUN; 추천·성과 HOLD/live OFF/이번 주문 호출0 유지.

## 2026-10-13 KST — 에이전트 작업 ID 복구 + 상세 연결 복원
JINI K-Stock 작업 허용 지시/실행기 통일, 제한된 ID 정규화와 완료 근거 교정 보완. 실제 고정 검증 Job222b700f EVIDENCE_RECORDED: report write, offline689 PASS, diff 확인. 새 코드/자료 수집 완료가 아님. 상세 재조회 실패 시 이전 내용·최신성 경고, 복구 후 기업별 펼침·가격기간·스크롤 복원 구현. Web 실제API 실패/복구/기업 전환 및 4개 화면폭 확인. Galaxy 상세 실패/복구 확인, 네이티브 연결 실패 표시가 남는 결함 수정하고 기존 검증 서명으로 데이터 보존 APK 업데이트 후 실패→연결됨 확인. 회귀689 PASS, Android 계약3 PASS, JINI fixtures15 PASS. 추천·성과 HOLD/liveOFF/이번주문0 유지. 일반 자동 개발 새 코드 완료/OS 접근성 및 Galaxy 기간·펼침 전수 검증은 미완료.


# K-STOCK MOBILE STATE & AUTOMATION STATUS — 2026-10-13 KST

- 기준 브랜치 `auto/kstock-development-20260930`, 커밋 `ea406852610c00bef0dbe469de95c42fca662c30`. 기존 사용자 변경과 앱 데이터를 보존했다. 이번 작업은 화면 검증·기록이며 기능 코드 수정은 없다.
- 자동 개발 상태: `/Users/ari/ARI/jini-agent/automation/KSTOCK_AUTO_HOLD`가 다시 존재하고 launchd 자동 개발 작업은 실행 중이 아니다. 마커에는 기획 승인·CODEX_HANDOFF 미확인 및 “Do not remove automatically”가 명시되어 있다. 이번 작업에서 HOLD를 제거하지 않았다. 30분 스케줄 설정과 실제 실행 상태를 구분한다.
- 마지막 확인 Job `222b700f-555f-4cbf-a4d8-306c9045563e`는 실행·보고 경로 검증(EVIDENCE_RECORDED, 보고 write1, 회귀689 두 차례, codeWrites0)이다. 새 일반 자동 개발/공식 수집 완료 보고는 확인되지 않았다.
- Galaxy A33 RFCW1178RRE, 기존 검증 앱2.6.5(265): 삼성전자 상세→TTM→성과 근거 펼침 및 스크롤 확인. 재조회 버튼 조작 뒤 펼친 성과 근거와 자료 부족 설명이 계속 표시됨을 관찰했다. 새 네트워크 요청 성공을 별도 계측한 결과는 아니다.
- USB reverse3103 제거 후 재조회 조작으로 실패를 유도했으나 이번 화면은 연결됨을 유지했다. 실패 상황 재현은 NOT REPRODUCED이며 실패 중 펼침 보존 PASS로 집계하지 않는다. reverse는 finally 복원했다. 이전 사이클의 실패/복구 PASS와 별도 기록한다.
- 실제 삼성전자 가격 자료는 한 달 범위만 지원한다. 복수 가격 기간 선택의 Galaxy 보존 검증은 NOT RUN이며 자료 없는 선택지를 활성화하지 않았다. OS 확대/TalkBack/앱 재시작 상태 영속 보존도 이번 작업 NOT RUN.
- `node scripts/test-offline.js`: 이번 실행 **689 PASS / 0 FAIL / 0 SKIP**. 로그 `/tmp/kstock-mobile-state-regression.log`. Android 계약은 이번 재실행 NOT RUN(직전3 PASS와 구분). 테스트 수 증가 없음.
- 근거: `docs/uiux/mobile-state-before-refresh.png`, `mobile-state-failed-refresh.png`, `mobile-state-after-refresh.png`. failed-refresh 파일명은 실패 유도 시도를 뜻하며 실제 실패 확인을 뜻하지 않는다. 검증 범위는 `data/v2/verification/frontend-redesign/mobile-state-20261013.json` 참조.
- 안전: 추천·삼성전자 성과·Apple 순위 HOLD 유지. 실거래 활성화/주문 호출/외부 수집/인증정보 변경 없음. 이번 작업 실제 주문 호출0건(계좌 감사 아님).
- 다음: 보호 HOLD의 기획 승인·인수인계 조건 확인 후 자동 개발 재개 여부 결정. 프론트엔드는 실패 유도의 실제 요청 여부를 계측하고 Galaxy 실패 중 펼침 보존 및 접근성 검증을 계속한다.
- Overall: PARTIAL.



# K-STOCK GALAXY EXPANDED DETAIL RECOVERY — 2026-10-13 KST

- 프로젝트/remote/브랜치/커밋 및 AGENTS·공통 준수 기준 확인. `auto/kstock-development-20260930` / `ea406852610c00bef0dbe469de95c42fca662c30`, localhost·Galaxy 검증 앱만 대상. 기존 변경 보존, 기능 코드 수정 없음.
- Galaxy A33 RFCW1178RRE / 검증 앱2.6.5(265): 삼성전자 성과 근거를 펼친 상태에서 전용 USB reverse3103 제거→상세 다시 확인 실행. 실제 네이티브 “서버 연결 실패” 및 Web 오류/이전 자료 유지 문구 확인. 펼친 성과 설명과 OpenDART 출처 유지 PASS.
- finally에서 reverse3103→3000 복원 후 오류 화면의 실제 버튼 위치로 재조회. 네이티브 “서버 연결됨”과 Web 성공 문구 회복, 성과 근거 펼침 유지 PASS. 스크롤은 같은 근거 구간 유지가 시각적으로 확인됐으며 픽셀 좌표 자동 계측은 NOT RUN.
- 직전 실패 유도 미재현 기록은 그대로 보존한다. 이번 별도 실행에서 미완료 항목을 확인했다. 근거 `docs/uiux/mobile-expanded-failure-20261013.png`, `mobile-expanded-restored-20261013.png`, `data/v2/verification/frontend-redesign/mobile-expanded-recovery-20261013.json`.
- 기능 코드 변경이 없어 전체 회귀/Android 계약은 이번 재실행 NOT RUN. 직전 실제 회귀689 PASS/0 FAIL/0 SKIP, Android 계약 마지막3 PASS와 구분. 이번 문서 diff 점검 수행.
- 남은 NOT RUN: Galaxy 복수 가격 기간 선택(실제 자료는1개월만 지원), OS 글자 확대/TalkBack, 앱 재시작 상태 영속 보존, 픽셀 단위 스크롤 계측.
- JINI 자동 개발 보호 HOLD 여전히 존재. 이번 제거/자동 수집 활성화 없음. 기획 승인·인수인계 조건 확인을 거치기 전 실행 중으로 표시하지 않는다.
- 추천·삼성전자 성과·Apple 순위 HOLD, 실거래 활성화 없음, 이번 실제 주문 호출0건. 인증정보/다른 프로젝트/운영환경 변경 없음.
- 다음 프론트엔드 작업: 모바일 오류 안내 높이와 접근성, 앱 재실행 시 화면/상태 정책 검증. Overall: PARTIAL.



# K-STOCK 1–7 EXECUTION REVIEW — 2026-10-19 KST

기준: `/Users/ari/ARI/projects/k-stock-ai`, origin Naharuya/k-stock-ai, branch `auto/kstock-development-20260930`, commit `ea406852610c00bef0dbe469de95c42fca662c30`. AGENTS와 공통 준수 기준 확인. 기존 미커밋 변경 보존. 공개 배포 없음.

| 단계 | 이번 실행 | 남은 조건 |
| --- | --- | --- |
| 1 모바일 오류 안내 | 긴 일반 오류를 짧은 상태/재시도 안내로 변경. 이전 자료임을 표시. 모바일 안내 position:static으로 본문 가림 방지 | Galaxy의 새 오류 UI 실패 화면 직접 재확인 |
| 2 접근성 | 버튼 최소44px, 키보드 focus-visible 외곽선. 실제 Chrome320/390/768/1440px·글자200% 가로 넘침 없음 | Galaxy OS 글자 확대·TalkBack NOT RUN |
| 3 통합 QA/재실행 | Web 홈/투자신호/글로벌인물/시장/연구/종목 6화면×390/1440px 진입 및 가로 넘침 없음. Galaxy 기존 데이터 보존 force-stop/start 후 네이티브·Web 연결됨/실제 홈13사건·예측신호0·주의14 확인 | Galaxy 여섯 화면 전체 조작과 선택 상태 영속 보존 NOT RUN |
| 4 HOLD 조건 | 기존 마커 및 backend directive 대조. 반복 JINI 개발 금지, 기획 승인/CODEX_HANDOFF 확인 조건 존재 | 충족 증거 없음. 마커 제거·새 서비스 활성화 없음 |
| 5 연구 확대 | 기존 승인·활성화 정책을 그대로 사용한 공식 Collection Worker 한 사이클 실행: PARTIAL, 외부 요청0, 중복7, 변경원문0, 신규발언0/자본행동0/연구사건0. 저장 연구 Worker UNCHANGED_SOURCE | 신규 검증 표본 확보 미완료. 기존 Apple/MSFT 자료 삭제·대체 없음 |
| 6 금융 검증 | 기존 Peer Worker 실행: 총6, PARTIAL3/BLOCKED3, VERIFIED0/FAILED0. PER/PBR/PSR/EV_EBITDA 각 유효표본0, 외부요청0 | SK1014주/DB9건을 해결할 신규 공식 원문 없음. 기존 차단 해제 근거 없음 |
| 7 추천 판단 | 유효표본·연구 조건 미충족으로 추천/삼성전자 성과/Apple 순위 HOLD 유지 | 추천 활성화 불가 |

## 실제 테스트

- `node scripts/run-master-qa.mjs`: 제한 환경 최초 실행 회귀689 PASS, Android2 PASS/1 FAIL. 실패 기록 `data/v2/verification/master-qa/master-qa-20261019053240774.json` 보존.
- 로컬 모의 서버 포트 허용 후 같은 명령 재실행: 회귀 **689 PASS /0 FAIL/0 SKIP**, Android 계약 **3 PASS/0 FAIL**. `data/v2/verification/master-qa/master-qa-20261019053259570.json`.
- Web 실제 API/CDP: 200% 글자·반응형, 실제 후보 API 차단 시 짧은 오류 및 이전 상세 유지 확인. `data/v2/verification/frontend-redesign/error-accessibility-20261019.json`.
- 화면 매트릭스: `data/v2/verification/frontend-redesign/screen-matrix-20261019.json`. 초기 검사에 잘못 입력한 두 화면 ID는 실제 investment-signals/global-influence로 고쳐 재실행한 결과임. 전체 기능/원천 수치 재인증을 의미하지 않음.
- Galaxy RFCW1178RRE 앱 재실행 근거 `docs/uiux/relaunch-20261019-galaxy.png`. 데이터 삭제/재설치/권한 변경 없음. OS가 띄운 일시 경보 토스트는 앱 기능 검증 대상 아님.
- 공식 Worker 실행 영수증 `data/v2/verification/official-cycle-20261019.json`. 신규 자료0을 연구 확대 완료로 세지 않음. 외부 자동 수집 설정·주기·인증정보 변경 없음.
- `node --check public/app.js`, `git diff --check` PASS.

변경 파일: `public/app.js`, `public/styles.css`, 이 QA 보고서, `docs/AUTO_DEV_LOG.md`, 검증 JSON/스크린샷. Worker는 기존 결과/큐를 정상 저장했으며 과거 원문 삭제 없음.

안전: .env의 KSTOCK_BROKER_ENABLED=false / KSTOCK_LIVE_TRADING_ENABLED=false 직접 확인. 이번 작업 실제 주문 호출0건(계좌 감사 아님). 다른 프로젝트·운영 서버·API 인증정보 변경 없음.

다음 순서: Galaxy 새 오류 안내/접근성 및 전체 화면 QA → 기획 승인·인수인계 증거 확인 → 기존 승인 소스에서 실제 신규 원문 확보 → 날짜·주식수·배수와 시장 반응 검증 → 추천 조건 재판정. OS 접근성과 신규 금융·연구 자료 부족은 미완료로 유지한다.

Overall: **PARTIAL**. 1–7 전 영역을 실행 또는 조건 검토했으며, 신규 연구/금융 표본과 반복 자동 개발을 완료했다고 주장하지 않는다.



# K-STOCK iOS SAFARI APPLICATION — 2026-10-19 KST

- AGENTS/공통 준수 기준, 저장소/remote/브랜치/커밋/기존 변경 확인. 기준 auto/kstock-development-20260930 / ea406852610c00bef0dbe469de95c42fca662c30. ios 디렉터리·Xcode 앱 프로젝트는 저장소에 없음. 이번 적용 대상은 공통 Web의 iOS Safari이며 네이티브 앱 생성/설치가 아님.
- 기존 짧은 오류/상세 재시도/상태 보존은 공통 public/app.js로 iOS에도 적용됨. public/index.html viewport-fit=cover, public/styles.css 모바일 safe-area 좌우/상단 여백, 기존 하단 safe-area 활용, 입력 최소16px, reduced-motion 시 부드러운 스크롤 해제 추가. 사용자 확대 제한 없음.
- 실제 iOS27 시뮬레이터: iPhone17(5523F72B-5CB2-4413-9CA1-F3FCCB400E42), iPadPro13 M5(983602C9-0139-42EC-A28C-5B3508E79D27). Safari localhost:3000 홈 로드 후 서버 연결됨, 실제13사건/예측신호0/주의14, iPhone 하단 메뉴/iPad 사이드바·연구 카드 표시 확인. 최초 캡처는 Safari 시작 화면이었으므로 PASS 근거로 사용하지 않고 로드 후 재캡처로 교체함. Safari 시스템 'ONARIA로 돌아가기' 표시는 기존 OS 기록이며 다른 프로젝트 파일/앱 수정 없음.
- 근거: docs/uiux/ios-iphone-home-20261019.png, ios-ipad-home-20261019.png.
- node scripts/run-master-qa.mjs 실제 실행: 회귀689 PASS/0 FAIL/0 SKIP, Android 계약3 PASS/0 FAIL. data/v2/verification/master-qa/master-qa-20261019053648779.json. git diff --check PASS.
- NOT RUN: iOS 실기기, VoiceOver/Dynamic Type, 가로 방향, Safari 오류·복구/상세 선택 전환 실조작, 네이티브 iOS 빌드/서명/설치. 홈 화면 검증을 이 항목의 대체 근거로 사용하지 않음.
- 변경: public/index.html, public/styles.css, QA/개발 로그 및 iOS 캡처. 인증정보/권한/외부 배포/자동개발 HOLD 변경 없음. 추천·삼성전자 성과·Apple 순위 HOLD, 실거래 OFF, 이번 실제 주문 호출0건.
- Overall: PARTIAL — iOS Web 적용 및 시뮬레이터 홈 확인 완료, iOS 네이티브 앱과 전체 상호작용/실기기 QA는 별도 미완료.



# K-STOCK iOS NATIVE FOUNDATION & WEBKIT QA — 2026-10-19 KST

사용자 지시 “모두 승인 할테니 진행해줘”에 따라 iOS 검증과 설치형 로컬 앱 기반을 진행했다. 실거래/추천 활성화를 뜻하지 않는다. AGENTS·공통 준수 기준 및 Git remote/branch/commit/기존 변경 확인. 기준 auto/kstock-development-20260930 / ea406852610c00bef0dbe469de95c42fca662c30. 기존 변경·사용자 데이터 보존.

## 구현

- 새 ios/App.swift: UIKit UIScene + WKWebView, 공통 Web/API 사용. 화면 로드 상태와 API 상태 구분, 재연결44pt 이상, Dynamic Type 네이티브 라벨/버튼, safe-area 제약, 명시적 사용자 HTTPS 근거 링크만 외부 열기. 다른 top-level origin/scheme 차단. 비밀값·주문 브리지 없음.
- ios/build-simulator.py: 기존 Xcode SDK만 사용한 arm64 iOS Simulator 전용 빌드, ad-hoc 서명. Apple 계정/프로비저닝/유료 서비스/인증서 변경 없음. localhost 전용 ATS local networking. 물리 기기/운영 배포용 빌드 아님. Swift 소스에도 simulator-only 컴파일 경계 추가.
- ios/verify-result.py: 실제 WKWebView 영수증과 7개 검증 묶음 확인, 10분 이내 결과만 수용. ios/README.md에 빌드·설치·QA 재현 절차와 미완료 항목 기록. .gitignore에 ios/build 및 Python 캐시 제외.
- 첫 Swift 빌드 optional 반환 처리 오류 수정. 첫 설치 앱은 최신 SDK의 UIScene 요구로 시작 실패; 프로세스 한정 로그로 확인 후 SceneDelegate/manifest 추가해 재빌드·실행 성공. 초기 실패를 PASS로 보고하지 않음.

## 실제 iOS 검증

- iPhone17 및 iPadPro13 M5, iOS27 시뮬레이터에 ai.kstock.ios.localvalidation 설치·실행. 기존 다른 앱/프로젝트 수정/삭제 없음.
- 양쪽 실제 WebKit에서 홈/투자신호/글로벌인물/시장/연구/종목 6개 화면 진입·가로 넘침 없음. 삼성전자005930 실제 상세/TTM/펼침26개 확인.
- QA용 임시 WKContentRuleList로 후보005930 API만 차단: 짧은 연결 실패 문구, 이전 상세 및 펼침 유지 확인. 규칙 제거 후 실제 재조회, 펼침 유지 및 STALE 경고 회복 확인. 오래된 자료를 최신으로 표시하지 않음. 성공/오류 모두 임시 규칙 정리.
- Web 글자200%에서 가로 넘침 없음/재시도44px 이상. 네이티브 iPhone 시스템 content_size accessibility-extra-extra-extra-large에서 라벨/버튼 확대 및 Web 표시 확인, finally 기존 large로 복원. 이 확인은 VoiceOver나 Web 본문의 OS 배율 자동 연동 인증을 대체하지 않음.
- 영수증: data/v2/verification/frontend-redesign/ios-native-{iphone,ipad}-20261019.json. 각7개 검증 묶음 PASS(프로젝트689 테스트에 합산하지 않음). 캡처 docs/uiux/ios-native-{iphone,ipad,large-text}-20261019.png.
- 물리 iPhone15 연결은 devicectl로 확인했으나 서명·HTTPS/기기 서버 연결 구성 없이 설치하지 않음. 시뮬레이터 설치를 실기기 설치로 표시하지 않음.

## 회귀·안전·남은 조건

- node scripts/run-master-qa.mjs: 회귀689 PASS/0 FAIL/0 SKIP, Android 계약3 PASS/0 FAIL. 근거 data/v2/verification/master-qa/master-qa-20261019054517083.json.
- 최종 simulator build PASS, Python 문법/git diff --check PASS. 추가 simulator-only 컴파일 guard는 런타임 화면 변경 없음.
- NOT RUN: 물리 iPhone 설치/검증, VoiceOver, 가로 방향 터치/스크롤, Safari 자체 전체 오류 사이클(실제 WKWebView에서 검증), Web/Android/iOS 모든 수치·출처 필드 전수 대조, 운영 서명/출시. Xcode 제품 프로젝트/앱 아이콘/운영 인증은 미구현.
- JINI 보호 HOLD 및 백엔드 지시 대조: 반복 무인 개발 금지/기획·CODEX_HANDOFF 확인 조건이 여전히 존재. 사용자 승인은 기록했으나 인수인계 충족 근거를 확인하지 못했으므로 마커 제거/운영 서비스 변경하지 않음. 자동 개발 재개로 보고하지 않는다. 새 공식 금융 자료 확보 없음.
- 추천·삼성전자 성과·Apple 순위 HOLD, 실거래 OFF 유지. 이번 실제 주문 호출0건(계좌 감사 아님). 인증정보/외부 공개 배포/유료 사용/데이터 삭제 없음.
- 변경: ios/App.swift, build-simulator.py, verify-result.py, README.md, .gitignore, QA/개발 로그 및 검증 근거.
- 다음: VoiceOver·가로 방향 및 실기기 연결/서명 기반 완성, 최종 API 필드 대조; 백엔드는 기획·인수인계 근거 확인 후 별도 재개. Overall PARTIAL — iOS 설치형 시뮬레이터 기반과 실제 WebKit 검증 완료, 실기기/출시/연구 선행 조건 미완료.



# K-STOCK iPHONE DEVICE INSTALL & ACCESSIBILITY FOLLOWUP — 2026-10-19 KST

- 사용자 “모두 승인할테니 진행해줘” 범위에서 실제 설치 준비/검증 수행. AGENTS·공통 준수 기준, Git remote/branch/commit/기존 변경 확인. 기준 auto/kstock-development-20260930 / ea406852610c00bef0dbe469de95c42fca662c30. 다른 프로젝트/기존 데이터 보존.
- **실기기 설치 PASS**: 연결 iPhone15, iOS26.6.1, 기존 개발 모드/페어링 상태 확인. 기존 와일드카드 프로필이 해당 기기를 포함하고, 유효기간/일치하는 개발 인증서가 확인되어 새 계정·프로필·인증서 생성 없이 서명. `python3 ios/build-device.py --device <연결기기> --url http://192.168.0.16:3104/` 성공, codesign --verify --strict 성공. `devicectl device install app`이 ai.kstock.ios.localvalidation 설치 성공 반환. 다른 앱 재서명/데이터 삭제 없음. **실기기 실행·실데이터 연결은 NOT RUN**; 설치 성공과 별개.
- ios/build-device.py: 명시적 사설IPv4/포트3104·기기·기존 일치 프로필 검증. ios/App.swift는 LOCAL_DEVICE_VALIDATION 명시 빌드만 물리 기기 허용, Info.plist의 검증 endpoint 사용. 시뮬레이터 기본 localhost:3000 유지. 서명·프로필·entitlements 산출물은 기존 ignored ios/build에만 저장.
- 준비한 ios/validation-relay.mjs: 사설IP 하나에만 바인드, 15분 한정, 정적파일3개 및 공개 연구/후보/벤치마크/상태 일부 GET 경로만 허용. 주문/계좌/watchlist/모든 쓰기 차단, 고정 localhost upstream, 인증·쿠키 헤더 전달 없음. ios/relay.test.mjs의 경계3개 PASS.
- **릴레이 실행은 자동 승인 검토에서 거절됨**. 이유: 연구 대시보드·후보·성과 API 응답이 같은 LAN의 다른 주체에 노출될 수 있고 구체 payload 및192.168.0.16 대상 명시 승인이 없음. 실행되지 않았으며 우회/터널/다른 도구를 통한 실행 없음. 구체 endpoint·자료 범위·15분 노출 위험을 설명한 사용자 선택 질문을 제출, 답변 대기. 광범위 사전 승인을 이 거절의 구체 동의로 임의 해석하지 않음.
- iPhone17 시뮬레이터 가로/VoiceOver 활성 상태에서 실제 WebKit QA: 6화면 진입·가로 넘침 없음, 삼성전자TTM, 오류 시 자료/펼침 유지, 복구 후 STALE/펼침 유지, Web200%/44px 검증 PASS. viewport750×306, voiceOverEnabled=true, 보이는 홈 컨트롤 빈 이름0. data/v2/verification/frontend-redesign/ios-landscape-voiceover-20261019.json.
- **VoiceOver 전체 조작 NOT RUN**: OS 최초 사용 제스처 안내 팝업이 있어 실제 읽기 순서/제스처/터치 검증 완료로 표시하지 않음. DOM 자동 검증 PASS와 구분. VoiceOver 비활성/portrait 복원 확인. ios-landscape-voiceover 및 ios-landscape 캡처는 시스템 팝업/회전 중 화면이므로 완전한 가로 시각 QA 근거로 사용하지 않음.
- iPad 시뮬레이터 가로 화면 로딩 완료 후 재캡처/직접 확인: 홈 사이드바·연구카드·운영상태 배치 확인. docs/uiux/ios-ipad-landscape-20261019.png. 초기 로딩/회전 중 캡처는 재캡처로 교체. 원래 방향 복원.
- `node scripts/run-master-qa.mjs`: 회귀689 PASS/0 FAIL/0 SKIP, Android 계약3 PASS/0 FAIL. 근거 data/v2/verification/master-qa/master-qa-20261019055654466.json. `node --test ios/relay.test.mjs` 별도3 PASS. Swift simulator/device build, Python 문법·node --check·git diff --check PASS.
- 변경: ios/App.swift, build-device.py, validation-relay.mjs, relay.test.mjs, README.md, QA/개발 로그/검증근거. backend JINI HOLD/인수인계 조건 미충족 상태 유지, 운영서비스·외부수집·인증정보 변경 없음. 추천·삼성전자 성과·Apple 순위 HOLD, 실거래 OFF, 이번 실제 주문 호출0건.
- 남은 조건: 구체 LAN 노출 동의 후 실기기 실행/Local Network 본인 허용 및 API값 대조, VoiceOver 실제 조작, iPhone 가로 터치 검증, 백엔드 인수인계 근거. Overall PARTIAL — 실제 iPhone 설치 완료, 실데이터 연결은 명시적 승인 대기.



# K-STOCK APPROVED LAN VALIDATION — 2026-10-19 KST

- 사용자가 192.168.0.16:3104의15분 LAN 범위를 명시 승인한 후 실행. 기존 AGENTS·공통 준수 기준, 저장소/브랜치/커밋·기존 변경 확인. auto/kstock-development-20260930 / ea406852610c00bef0dbe469de95c42fca662c30. 인증정보·운영 서버·다른 프로젝트 변경 없음.
- 직전 자동 승인 검토 거절은 구체 사용자 동의로 해소됨. 승인된 공개 연구 GET/화면 파일 범위의 기존 임시 릴레이 실행 성공. 주소·범위·쓰기 차단을 확장하지 않음.
- 실제 LAN 검증: 화면200, POST 후보403. 로컬 원본과 health/연구 dashboard의 summary·eventCards/삼성전자 candidate·analysisDate·status/benchmarks 비교 모두 일치. GET /.env, /api/account, /api/watchlist 및 POST 후보 경로403. 주문 경로 호출 없음. 근거 data/v2/verification/frontend-redesign/ios-lan-20261019.json.
- 실기기 iPhone15 앱 실행 시 Locked 오류: iOS가 기기 잠금 때문에 ai.kstock.ios.localvalidation 실행 거부. 두 차례 lockState 확인에서 passcodeRequired=true. 앱 전용 QA 파일도 미생성. **실기기 앱 실행·데이터 표시·실기기 실패/복구 NOT RUN**. 이전 설치 성공/시뮬레이터 PASS와 구분.
- 잠금 해제/Local Network 본인 허용은 기기에서 직접 해야 하므로 사용자에게 비밀번호를 보내지 말고 잠금을 해제하도록 요청. 암호 입력/생체인증·보안 우회 없음. 잠금 화면 캡처는 /tmp에만 있으며 보고서/Git에 포함하지 않음.
- 잠금 해제가 확인되지 않아 이 작업에서 시작한 node ios/validation-relay.mjs 프로세스만 확인 후 SIGTERM 종료, LAN listener 종료 확인. 별도 기존 localhost:3104 리스너/프로세스는 변경하지 않음. 노출 경과 시간·900초 승인 상한·잔여 노출 예산은 JSON에 기록.
- node --test ios/relay.test.mjs 이번3 PASS/0 FAIL. 기능 변경 없음: 전체 회귀/Android 계약 이번 재실행 NOT RUN(직전689/3 PASS와 별도). git diff --check PASS.
- 수정: ios/README.md의 승인 이력, QA/개발 로그·LAN 영수증. 추천·삼성전자 성과·Apple 순위 HOLD/실거래 OFF 유지, 이번 실제 주문 호출0건. 백엔드 반복 개발 HOLD 변경 없음.
- 다음: 기기 소유자의 잠금 해제 확인 후 승인 노출 예산을 지키며 실기기 실행/로컬 네트워크 허용·QA 결과/수치 대조·연결 복구 검증. 기기 잠금이 외부 선행 조건이므로 성공으로 표시하지 않음. Overall PARTIAL.



# K-STOCK PHYSICAL iPHONE QA SUCCESS — 2026-10-19 KST

- 사용자가 iPhone 잠금 해제를 확인한 후 실제 lockState passcodeRequired=false 확인. AGENTS·공통 준수 기준/Git 식별/기존 변경 보존. branch auto/kstock-development-20260930, commit ea406852610c00bef0dbe469de95c42fca662c30. 실거래/추천·성과 보류 유지.
- 승인된 같은 LAN endpoint192.168.0.16:3104와 공개 GET 범위로 재개. 이전221초를 차감한 잔여679초보다 짧은660초 상한 적용. 사용자 승인 범위/프로필/권한/기존 localhost 서버 변경 없음.
- **실제 iPhone15 설치 앱 실행 및 API 연결 PASS**: devicectl이 ai.kstock.ios.localvalidation 실행 성공. 앱 전용 Documents/qa-result.json 수신; physicalDevice=true, checkedAt2026-10-19T06:45:48Z, EXECUTED 확인. 잠금 해제/네트워크 허용 우회 없음.
- 실기기 WebKit QA: 홈/투자신호/글로벌인물/시장/연구/종목6개 화면 active 및 가로 넘침 없음. 삼성전자005930 상세/TTM/펼침26개 실제 표시. WebKit 임시 규칙으로 해당 후보 API만 차단→짧은 오류+이전 자료/펼침 유지; 차단 규칙 제거→실제 재조회/펼침 유지/STALE 경고 복구. 이는 물리 Wi-Fi 단절 시험을 뜻하지 않음.
- Web글자200%에서 가로 넘침 없음, 재시도 버튼44px. 실제 홈 화면에서 서버 연결됨, 연구13/검증예측0/주의14 및 추천보류 확인. docs/uiux/ios-physical-home-20261019.png. 모든 재무수치·원천필드 전수 대조/실기기VoiceOver·가로터치·앱 전체 시나리오 완료 주장 아님.
- ios/verify-result.py에 --receipt 추가. 복사한 물리기기 영수증은 physicalDevice=true 및 원래 checkedAt 최근10분 조건까지 검사. 실제9개 검증 묶음 PASS, data/v2/verification/frontend-redesign/ios-physical-20261019.json. 회귀689개에 중복 합산하지 않음.
- 임시 릴레이 옵션은1~900초 범위만 허용. 승인시간 단축/초과 차단 테스트 추가, 타이머·종료 시 활성 연결도 닫도록 보완. node --test ios/relay.test.mjs **4 PASS/0 FAIL**.
- node scripts/run-master-qa.mjs 실제 실행: 회귀 **689 PASS/0 FAIL/0 SKIP**, Android 계약 **3 PASS/0 FAIL**. data/v2/verification/master-qa/master-qa-20261019064634912.json. Python 문법/git diff --check PASS.
- 검증 직후 이번 LAN relay 프로세스만 신원 확인 후 종료, 전용 LAN listener 종료 확인. 누적 노출325초<900초. 이전 localhost:3104 프로세스는 변경하지 않음. data/v2/verification/frontend-redesign/ios-lan-20261019.json에 재개/종료/승인 잔여 기록. 기기에 앱은 유지되지만 임시 서버는 종료됐으므로 상시 연결을 제공하지 않음.
- 변경: ios/validation-relay.mjs, relay.test.mjs, verify-result.py, README.md, QA/개발 로그 및 근거. 실거래 OFF, 추천·삼성전자 성과·Apple 순위 HOLD, 이번 실제 주문 호출0건. 다른 프로젝트/계정·인증정보/운영배포/JINI HOLD 변경 없음.
- 남음: 실제 VoiceOver 읽기순서·제스처, 실기기 가로 터치와 전체 필드 대조, 상시 HTTPS/기기 인증·출시 설계, 백엔드 인수인계 및 금융 선행 조건. 이번 실기기 연결/기본 복구 범위 PASS, 전체 프로젝트 Overall PARTIAL.



# K-STOCK XCODE UI & VOICEOVER AUTOMATION — 2026-10-19 KST

## 이번 변경과 범위

- AGENTS·공통 준수 기준, pwd/remote/branch/commit/기존 변경 확인. auto/kstock-development-20260930 / ea406852610c00bef0dbe469de95c42fca662c30. 기존 미커밋 변경/데이터 보존. 로컬 localhost:3000 및 기존 iPhone17 시뮬레이터만 UI 테스트 대상.
- ios/KStockLocal.xcodeproj 및 공유 KStockLocal/KStockVoiceOver 스킴 추가. UIKit 앱과 XCTest UI 타깃, iOS Simulator 전용/CODE_SIGNING_ALLOWED=NO. 물리 기기 서명·설치·프로필 변경 없음. 기존 build-device.py와 별도이며 Xcode 제품 릴리스/상시 서버 완성을 뜻하지 않음.
- ios/UITests.swift: 실제 재연결 버튼 터치·최소44pt, 가로 프레임 확인 후 메뉴→종목 상세 이동, Apple sufficientElementDescription 접근성 감사. VoiceOver 전용 테스트는 앱 내부에서 실제 활성 상태를 확인하고 메뉴/종목 링크 터치·필요 시 이중 탭으로 화면 이동 확인.
- ios/App.swift: 상태/재연결 버튼 접근성 identifier, 재연결 힌트 추가. --voiceover-ui-test일 때만 상태 진단 value 노출, 일반 사용 화면에 진단값 표시 없음. 실제 iPhone 설치 앱은 이번 업데이트하지 않음.
- ios/run-ui-tests.py: 기존 VoiceOver 상태 기록→선택 모드 실행→finally 원상복원/재조회. xcodebuild 종료코드와 xcresult 실제 통과/실패/스킵 수 검사; 0개 실행·예상 수 불일치도 PASS 금지. 기본3개와 VoiceOver1개를 별도 스킴으로 실행. 빌드/로그/xcresult/장치 상태는 ignored ios/build에 보존.
- public/app.js: 앱 버전 안내의 Android 전용 문구를 플랫폼 공통 문구로 변경. 기존 UI/데이터 계산은 유지. .gitignore는 Xcode 사용자별 상태 제외 추가. README에 실제 재현 명령·범위 기록.

## 실제 실행 결과

- `python3 ios/run-ui-tests.py 5523F72B-5CB2-4413-9CA1-F3FCCB400E42`: 최종 일반 **3 PASS/0 FAIL/0 SKIP**, VoiceOver 원상복원 확인. build/ui-20261019T065635669796Z/receipt.json → data/v2/verification/frontend-redesign/ios-xcui-standard-20261019.json.
- 같은 명령 `--voiceover`: **1 PASS/0 FAIL/0 SKIP**, 실제 UIAccessibility.isVoiceOverRunning 확인 및 메뉴→종목 이동 성공, 종료 후 비활성 원상복원. build/ui-20261019T065511956234Z/receipt.json → data/v2/verification/frontend-redesign/ios-xcui-voiceover-20261019.json.
- 최초 일반 테스트가 기존 VoiceOver 제스처 튜토리얼을 정확한 제목·확인 버튼으로 닫았음. 인증/네트워크 권한 팝업 자동 허용은 구현하지 않음.
- 초기 가로 테스트는 UI 이동에 통과했지만 app.screenshot 영역 캡처에 회전/잘림 흔적 발견. 프레임 width>height 대기 추가 및 XCUIScreen 전체 캡처로 수정한 뒤3개 재실행 PASS. 초기 결과를 완전한 시각 검증으로 삼지 않음. 최종 캡처 docs/uiux/ios-xcui-landscape-20261019.png, ios-xcui-voiceover-20261019.png 직접 확인.
- `node scripts/run-master-qa.mjs`: 회귀 **689 PASS/0 FAIL/0 SKIP**, Android 계약 **3 PASS/0 FAIL**. data/v2/verification/master-qa/master-qa-20261019065429547.json. 이 결과와 iOS4개/relay4개는 별도 집계.
- `node --test ios/relay.test.mjs` **4 PASS/0 FAIL**. Python 문법, node --check public/app.js, git diff --check PASS.

## 한계·안전·다음

- 이번4개는 iOS27 시뮬레이터의 실제 UI 자동화 결과이며 물리 iPhone 결과로 표시하지 않음. 기존 iPhone15 실데이터 QA PASS는 앞선 별도 실행 기록으로 보존. 물리 기기 가로 터치/VoiceOver 전체 제스처/모든 읽기 순서·라벨/재무 필드 전수 대조 **NOT RUN**.
- 시뮬레이터 VoiceOver는 비활성 원상복원, UI 테스트 종료 시 portrait 복원. 물리 iPhone 잠금 해제 여부는 읽기 확인만 수행. LAN 릴레이 재실행 없음/전용LAN listener 없음. 기존 승인 노출 예산도 추가 사용 없음. 외부 수집·Apple 계정/서명·인증정보·운영환경·다른 프로젝트 변경 없음.
- 추천·삼성전자 성과·Apple 순위 HOLD/실거래 OFF 유지. 이번 실제 주문 호출0건. 백엔드 개발 HOLD/금융 선행 조건은 변경 없음.
- 다음: 실제 기기 VoiceOver·가로 조작 및 전체 데이터 필드 대조, 상시 HTTPS/기기 인증 연결과 릴리스 구성, 백엔드 인수인계/공식 금융 근거 확보. 이번 반복 UI/VoiceOver 검증 체계 PASS, 전체 프로젝트 Overall PARTIAL.



# K-STOCK 최근 공식 자료 → 현재 분석 후보 — 2026-10-19 KST

## 결과와 실제 확보 자료

- 기준 브랜치 auto/kstock-development-20260930, 커밋 ea406852610c00bef0dbe469de95c42fca662c30. 기존 사용자 변경·Apple/SEC 원본 근거 보존. 이번 상태 PARTIAL.
- 최근 30일(2026-09-20~10-19) 공시를 현재 후보로 분리. 과거 Apple 2건과 음의 초과수익 Microsoft 1건은 과거 연구 영역에 보존. 과거 원문을 오늘 조회했다고 현재 사건으로 계산하지 않음.
- 실제 SEC 읽기 3회 HTTP200: Apple submissions 1회, Form4 원문 2회. 접수번호 0001140361-26-039785(10/15 공시, 10/13 거래)와 0001140361-26-039158(10/08 공시, 10/06 거래). 각각 보고된 매도 2,399주, 10b5-1 계획 표시 확인. 매도 의도나 매도 추천으로 해석하지 않음.
- 최초 공개 시각 미확인. 실제 원문 확인 시각 2026-10-19T07:35:20/21Z를 OBSERVED_BY로 기록하며 최초 공개 시각으로 대체하지 않음. 기존 D2 이용 가능 정책 대기 유지.
- 기존 승인 AlphaVantage 경로 읽기 2회. AAPL 원주가 종가 343.46 USD, 가격 기준일 2026-10-16. 가격 상태 READY이나 기업행동 범위 INCOMPLETE이므로 총수익률·검증 완료 성과로 사용하지 않음. API 비밀값·인증 변경 없음.
- 현재 분석 후보 AAPL 1개, 후보 내 관측 5건 중 원문 검증 2건. 미검증 기존 관측 3건은 부족 상태로 보존. 최근 Form4 대상 14문서 중 2문서 처리, 12문서 대기. 검증된 추천 0개, 순위·점수 null. 전체 시장 수집 완료가 아님.

## 자동화와 화면

- 기존 Scheduler/30분 Worker에 연결. 새로운 Worker·타이머 생성 없음. 현재 신규 원문·가격 경로는 AAPL 한정. 24시간 캐시, 원문 최대2건/수집, 새 자료만 진행, 전체 주기 공유 최대12 HTTP 요청. PID 파일 잠금·재시작 결과 보존·죽은 잠금 복구. 인증 실패는 차단하고 실패 결과도 24시간 보존하며 무한 재시도 없음. 지수 백오프를 새 경로에서 구현했다고 주장하지 않음.
- 재시작 후 실제 registry currentTasks: capital/market cached=true, 신규 요청0, 신규 문서0. 이전 확보 자료 재사용 확인. 로컬127.0.0.1:3000만 재시작; 외부 공개/LAN listener 추가 없음. 기존 개발 HOLD 표식은 해제하지 않음.
- Web 홈·신호 화면에 현재 후보, 가격 기준일, 공시일, 원문 확인 수, HOLD 사유 표시. 공시일·거래일·공개 확인일 분리. 과거 연구는 별도 영역. 이전 API에 currentResearch가 없으면 자료 대기 표시하며 과거 사건을 현재 후보로 대체하지 않음.
- Chrome 실제 API 확인: 320/390/768/1440px 모두 가로 넘침 없음, 상세 펼침 새로고침 후 유지. 증거 data/v2/verification/frontend-redesign/current-research-20261019.json.
- Galaxy A33 기존 앱 재실행·서버 연결·스크롤·홈 수치1/0/1·Apple 가격/공시 기준일 Web 일치 확인. 캡처 docs/uiux/galaxy-current-research-20261019.png 및 galaxy-current-candidate-20261019.png. 기존 앱 데이터 보존, 재설치 없음. iPhone/iPad 신규 화면 실기기 검증 NOT RUN. VoiceOver/음성 테스트 실행하지 않음.

## 테스트와 실행 경계

- node scripts/run-master-qa.mjs → 회귀707 PASS/0 FAIL/0 SKIP, Android 계약3 PASS/0 FAIL. 실제 명령 node scripts/test-offline.js 및 node --test test/android_external.test.js. 증거 data/v2/verification/master-qa/master-qa-20261019074946585.json. 테스트 외부 요청 차단, 위 실자료 수집은 별도 실행.
- 기간/미래 자료 제외, 발행사·경로·정정 검증, 원문 거래 검증, D2, 가격 유형/날짜, 중복, 현재/과거 UI 분리, Worker 공유 호출 상한·캐시·실패·재시작 잠금 검증 추가. node 문법 및 git diff --check PASS.
- 추천·삼성전자 성과·Apple 순위 HOLD. KSTOCK_BROKER_ENABLED=false / KSTOCK_LIVE_TRADING_ENABLED=false 유지. 이번 작업에서 주문 API 호출0(수행 명령과 GET 수집 범위); 전체 과거 계좌 감사나 테스트 파서의 null을 0으로 바꾼 주장이 아님.
- NOT RUN/차단: 최초 공개 시각 입증, 최신 후보 기업행동 전수·재무/동종기업/Risk 재검증·예측력 검증, 신규 사건 이후1/5/20일 반응(관측 대기), iOS 신규 UI 검증. 기존 국내 PBR 표본0/SK1,014주/DB9건 문제 해결로 보고하지 않음.
- 다음 자동 작업: 일일 캐시 만료 시 처리하지 않은 Apple 공식 원문을 제한적으로 검증. 추천 활성화는 D2 대기 해소만으로 허용하지 않으며 기업행동·재무·Risk·통계 검증이 필요. 다른 종목 확대는 현재 AAPL 제한 수집기를 범용화하고 동일 검증 계약을 적용할 후속 개발.

## 이번 변경 파일

src/v2/current_capital.js, current_research.js, current_collection_io.js, current_capital_collection.js, current_market_collection.js, official_research_collection.js, influence_service.js, research_dashboard.js; scripts/collect-current-capital.mjs, refresh-current-market.mjs; public/index.html, public/app.js; test/current_research.test.js, current_collection.test.js, candidate_ui.test.js; 본 QA 및 AUTO_DEV_LOG.md. 실제 수집 JSON과 UI 증거는 로컬 data/v2·docs/uiux에 보존. 원문 전문 대신 검증에 필요한 필드·문서 식별자·링크·해시 저장, secrets 출력 없음.

---



# K-STOCK 다종목 최신 연구·검증 상태 연결 — 2026-10-19 KST

## 구현 및 실제 결과

- 기준 auto/kstock-development-20260930 / ea406852610c00bef0dbe469de95c42fca662c30, package1.0.0. AGENTS·ARI 준수 기준/remote/기존 변경 확인. 기존 미커밋 변경과 자료 보존. 대상은 로컬127.0.0.1:3000, 공개 배포 없음.
- 사전 고정 연구 대상 AAPL/MSFT/NVDA. 수익률을 조회한 뒤 선정하지 않음. SEC 메타데이터 CIK·회사명 및 Form4 XML CIK·ticker 이중 검사. 원문 Common Stock/P·S 거래만 기존 정규화 규칙으로 처리. 13F를 실제 거래로 바꾸지 않음.
- 현재 공시 수집을 기업별24시간 캐시/가장 오래 미조회한 기업 우선으로 확장. 1회1기업·메타데이터1+원문최대2·최대3요청. 기존 Worker 전체 최대12요청 유지. Apple 단일기업 저장 파일은 기존 시각/문서/이벤트를 보존해 마이그레이션. 실패도 해당 기업 캐시에 남기며 다른 기업 조회를 막지 않음. 새 Worker/타이머·인증 변경 없음.
- 실제 SEC GET 총4회: MSFT metadata+원문2(3회), NVDA metadata1회. MSFT CIK0000789019 / MICROSOFT CORP, NVDA CIK0001045810 / NVIDIA CORP 응답 신원 검증. MSFT 접수0000789019-26-000228(10/15), 0000789019-26-000226(10/14) 원문 확보. 후자에서10/13 신고 매도3,387·2,927·991주 총3건 검증. 전자는 지원하는 P/S 일반주식 거래 결과0건으로, 거래 신호를 만들지 않음. 원문 해시·제외 수·공식 링크 보존.
- NVDA 최근 Form4/4A 대상4건에 정정 공시 존재: CURRENT_AMENDMENT_REVIEW_REQUIRED. 제목/접수 목록만으로 정정 전후 관계를 해결하지 않으며 원문 이벤트 반영0. 자료 부족을 정상 완료로 표시하지 않음.
- 최신 후보 AAPL1→AAPL/MSFT2, 공식 원문 검증 거래 합계2→5. MSFT 최신 지원 거래 공시일10/14, 거래일10/13. 전체 발행사 최신 공시일10/15와 후보 거래 공시일10/14를 혼동하지 않음. 정정 대기NVDA는 수집 상태에는 보이나 가짜 사건 후보를 만들지 않음.
- 공개 가능 시점은 실제 읽기 확인 OBSERVED_BY. 최초 공개 시각 확정 아님. D2·기업행동·재무/비교기업/Risk·예측력 Gate 미충족. 추천0/HOLD, 과거Apple2/MSFT음수1 연구 보존.

## 가격·UI·운영

- 가격 수집도 같은 고정 대상과 기업별 캐시·결과 병합으로 확장. 보고서에 재무가 없는 기업은 재무 수치를 생성하지 않고 기업행동 범위 INCOMPLETE 유지. 기존 AAPL 가격을 새 기업 처리로 덮어쓰지 않음.
- 실제 MSFT 가격 시도 및 재시작 시NVDA 가격 시도는 기존 AlphaVantage PROVIDER_COOLDOWN에 의해 외부요청0으로 차단. 저장 공급자 제한 시각2026-10-19T13:37:07.340Z. 캐시를 삭제하거나 우회/유료 전환하지 않음. 기업별24시간 실패 캐시도 유지하므로 공급자 제한 만료 즉시 재시도를 보장하지 않음. AAPL10/16 원주가343.46USD 유지; MSFT 최신 가격 미확보를 화면에 명시.
- API currentResearch.collectionQueue에3기업별 실제 확인시각/상태/정정 보류 사유, 각 후보 validationChecks에 원문·공개 후 이용시점·최신가격·기업행동·재무/비교기업/위험·예측력 상태 제공. D2기간 통과는 최초공개시각 검증 완료와 별개로 표시. 실제 검증기가 새로 모든 조건을 완료했다고 주장하지 않음.
- Web 상세에6개 상태와 부족 사유, 기업별 공식 자료 수집 상태 추가. Chrome 실제API: 후보2/추천0, 320/390/768/1440px 가로 넘침없음, 상세 펼침 새로고침후 유지. data/v2/verification/frontend-redesign/current-multicompany-20261019.json.
- Galaxy A33 기존 앱 재실행/서버연결/스크롤, 후보2·추천0·검증대기2, Apple 공시10/15·가격10/16, MSFT 공시10/14·원문3/3·가격확인중 표시 확인. 실제UI 텍스트 data/v2/verification/frontend-redesign/galaxy-multicompany-20261019.json, 캡처 docs/uiux/galaxy-multicompany-20261019.png. 앱 데이터/설치 보존.
- 기존 서버만 안전설정으로 재시작. 기존30분 Worker에서 capital cached=true/external0, market NVDA PRICE_PROVIDER_COOLDOWN/external0 기록. 개발용 JINI HOLD 표식 해제/운영 변경 없음.

## 검증·한계·다음

- node scripts/run-master-qa.mjs 최종 회귀711 PASS/0 FAIL/0 SKIP, Android계약3 PASS/0 FAIL. 증거 data/v2/verification/master-qa/master-qa-20261019083433920.json. 초기 제한 샌드박스에서는 Android Java fixture 포트 바인딩1건 실행 실패; 허용된 로컬 검증 환경에서 동일 테스트 재실행하여 최종PASS. 테스트 삭제/완화 없음.
- 추가 회귀4개: 고정MSFT/NVDA신원/XML교차차단, 기업별캐시마이그레이션·인증실패격리·순환, 후보별부족상태, 다종목가격병합/재무없음/캐시. 전체 테스트 오프라인fixtures, 위 실SEC조회와 분리. node --check 및 git diff --check PASS.
- NOT RUN: 이번 iOS 신규UI/실기기, 새후보1/5/20거래일 관측, NVDA정정원문관계검증, MSFT/NVDA가격확보, 국내미해결금융/PBR해결, 예측전략통계검증. 추천·삼성전자성과·Apple순위HOLD, 실거래OFF, 이번 작업 실제 주문호출0(수행한 작업 범위). 전체 계좌/과거 주문 감사는 수행하지 않음.
- 다음 작업: NVDA정정원문관계 검증기와 문서버전 연결 → 공급자 제한/기업캐시 만료 후 가격검증 → 후보 재무·기업행동/Risk 실제 검증 연결 → 공개후 관측축적과 추천정책 검증 → iOS동일화면QA. UI 상태표시 구현과 추천 검증완료를 구분. 외부 공개/상시운영 완성 아님.
- 변경: src/v2/current_universe.js 신규; current_capital.js/current_capital_collection.js/current_market_collection.js/current_research.js/influence_service.js, public/app.js, test/current_collection.test.js/current_research.test.js, QA보고서/개발로그. 로컬 공식수집자료·QA증거 별도보존. 다른 프로젝트/인증정보 변경 없음.
- Overall: PARTIAL — 다종목 공식수집과 실제 후보2/화면 연결 완료, 추천과 연구 성과 검증은 보류.

---



# K-STOCK 공통 자동 검증·결과 재사용·예외 보고 — 2026-10-19 KST

## 이번 범위와 결과

- Preflight: AGENTS.md/ARI_COMPLIANCE_STANDARD, 프로젝트/remote/branch/commit/기존 변경 확인. auto/kstock-development-20260930 / ea406852610c00bef0dbe469de95c42fca662c30. 로컬 개발 대상127.0.0.1:3000. 기존 사용자 미커밋 변경·자료 보존, 다른 프로젝트 변경 없음.
- src/v2/current_validation.js: 기존 AAPL/MSFT/NVDA에 공통 저장 근거 검증 함수 적용. 입력 증분 fingerprint는 정책 버전·한국 날짜·해당 기업 이벤트·수집 상태·가격·보고서 재무/위험 근거를 포함. 변경된 기업만 재검증하고 나머지는 저장 결과 재사용. 날짜 변경 및 같은 한국 날짜 안의 가격 최신성 만료도 재검증 조건에 포함.
- 실제 저장 자료로 첫 실행 evaluated3/reused0, 두 번째 evaluated0/reused3, 외부요청 각각0 확인. NVDA 정정 관계 미확인 예외1 및 nextAction VERIFY_CORRECTION_CHAIN 유지. Apple/MSFT는 PARTIAL. 추천검증 완료 기업0. 결과는 data/v2/influence/current-validation.json에 원자 저장, PID 잠금·죽은 잠금 복구는 기존 공통 유틸 재사용. 재시작 후 결과 유지. 최근 실행 요약 history 최대30회.
- 기존30분 Worker 끝에 저장 검증/보고 단계 연결. 별도 Worker·타이머 생성 없음, 외부수집 비활성일 때도 저장 검증만 수행 가능. 입력이 잘못되면 기존 보고서는 보존하고 currentTasks.validation을 BLOCKED로 기록. 오류를 성공으로 바꾸지 않음. 변경 없음도 정상 실행 결과로 evaluated0/reused3 보고.
- 추가 안전 수정: 새로운 정정 공시/수집 차단이 발견되면 기존 원문 검증 이벤트가 남아 있어도 현재 후보 blockers에 정정 검토/수집 차단을 반영. 과거 사건·원문 검증 사실을 삭제하거나 정정값을 소급 적용하지 않음. 정정 원문 자체 해결은 이번 범위 밖이며 보류 유지.

## API·화면·실행 확인

- influence_service→currentResearch.automationValidation에 저장 보고서 제공. API는 기업별 validatedAt·재사용 여부·검증 상태·부족 자료·다음 작업 및 예외를 노출. 보고서는 저장 근거 검증이며 실제 외부 원문 재수집·기업행동/재무/PBR 검증 완료를 의미하지 않음.
- Web 신호 화면: 마지막 검증시각, 재검증/재사용/예외 수, 기업별 다음 작업을 펼쳐 확인. 색상 외 한국어 상태 표시. Chrome320/390/768/1440px 가로 넘침없음, 보고서 펼침 상태 새로고침후 유지. 증거 data/v2/verification/frontend-redesign/incremental-validation-20261019.json.
- 로컬 서버만 기존 안전 설정으로 재시작. 실제 Worker currentTasks.validation COMPLETED_WITH_HOLDS / evaluated0 / reused3 / exceptions1 / externalRequests0 / checkedAt2026-10-19T08:41:22.029Z 확인. 실행 완료 표시는 추천 완료를 뜻하지 않음. JINI 개발HOLD/운영 서버/인증 설정 변경 없음.
- Galaxy A33 기존 앱 재실행 후 서버연결·신호 화면 이동, 저장근거 자동검증/재검증0/재사용3/예외1/추천보류 및 기업별 보고서 요약 표시 확인. 처음 재실행 직후 로딩 중에는 메뉴가 없어 결과로 인정하지 않고 로딩 완료 후 재확인. 증거 data/v2/verification/frontend-redesign/galaxy-incremental-validation-20261019.json. 상세 모든 항목 터치/스크롤/연결장애 전수 재검증은 NOT RUN.

## 테스트·안전·다음

- node scripts/run-master-qa.mjs 최종 회귀718 PASS/0 FAIL/0 SKIP, Android계약3 PASS/0 FAIL. 최종 증거 data/v2/verification/master-qa/master-qa-20261019084111392.json. 명령: node scripts/test-offline.js 및 node --test test/android_external.test.js. 자동 테스트는 고정 fixture/오프라인, 실제 금융/주문 요청 없음.
- 추가7개: 예외/자료부족 판정, 변경기업만 무효화/재시작재사용, 날짜·정책 변경, 미래입력차단, 손상입력시 이전보고서 보존/실거래차단, 당일가격만료 경계, 정정발견시 현재후보 보류. 기존 Worker 통합 테스트에 저장 검증 실제 수행 assertion 추가. 초기 보고서 버전 필드 참조 오류로4개 실패한 실행은 수정 후 재실행했으며 최종 결과와 구분. node --check public/app.js/모듈 및 git diff --check PASS.
- 이번 신규 외부 금융 조회0. 기존 Apple/MSFT 사건과 가격, 음의 과거 연구 보존. Microsoft 최신가격·NVDA정정/PBR·기업행동·재무/Risk·예측전략 검증은 미완료. 추천·삼성전자 성과·Apple순위 HOLD, broker/live false, 이번 작업 실제 주문호출0(수행 작업 범위), 과거 전체 계좌 감사는 NOT RUN.
- NOT RUN: iOS 새 보고서 실기기, NVDA정정 원문관계 해결, 새로운 1/5/20일 시장반응, 실제 프로세스 강제종료/OS 재부팅복구. 재시작 결과 재사용과 fixture 잠금 검증을 OS복구 검증으로 대체하지 않음.
- 다음: 예외 목록의 공식 정정 원문 연결 검증 → 공급자/기업 캐시 만료 이후 가격 확보 → 실제 기업행동/재무/위험 모듈 결합 → iOS 동일화면 검증. 적용 대상은 사전고정3기업으로, 전체시장 자동검증 완료나 코드 자동개발 시스템 완성을 뜻하지 않음.
- 변경파일: src/v2/current_validation.js 신규, current_research.js/official_research_collection.js/influence_service.js, public/app.js, test/current_validation.test.js 신규 및 current_research.test.js/current_collection.test.js, 본 QA 및 AUTO_DEV_LOG.md. 비밀값 출력/데이터 삭제/유료 서비스/배포 없음.
- Overall PARTIAL: 증분 저장 검증·보고/화면 연결 완료, 투자 추천의 필수 금융·시장 검증은 계속 보류.

---



# K-STOCK NVIDIA 정정 원문 연결·현재 후보 반영 — 2026-10-19 KST

## 실제 공식 검증 결과

- Preflight 프로젝트/remote/branch/commit/기존 변경, AGENTS.md·ARI 기준·직전 QA 확인. auto/kstock-development-20260930 / ea406852610c00bef0dbe469de95c42fca662c30. package1.0.0. 로컬127.0.0.1:3000만 변경, 사용자 데이터/미커밋 작업 보존.
- SEC 공식 읽기 총6회: NVDA submissions1, 정정 원문1, 최초 원문1, 새 정정 근거 적용 후 submissions1+최근 Form4 원문2. 모두 읽기 전용/HTTP200. 새 인증·서비스·유료사용·API키 변경 없음.
- 정정0002152188-26-000007(2026-10-13) ↔ 최초0002152188-26-000005(2026-09-11). 정정 원문 dateOfOriginalSubmission=09/11, 같은 발행사CIK1045810/tickerNVDA·같은 신고인·보고/거래일09/09 확인. 공시기간 밖09/11 원문까지 확장해 연결했으며 이를 최근 매매 사건으로 바꾸지 않음.
- RSU 보상(A코드, 대가0, 직접보유) 수량172,507→160,418주, 차이-12,089주. 사후 보유수량도 같은 수량으로 정정. 원문 remarks의 명시적 행정상 취득수량 오류 정정과 각주 동일성 확인. 최초/정정 원문 링크·SHA256·관측시각·변경 전후 수량을 data/v2/influence/current-corrections.json에 저장. 주소·서명·원문 전문은 해당 검증 결과에 저장하지 않음.
- 이 정정은 실제 매수/매도 신호0건. 최초 공개 시각을 추정하지 않으며 실제 원문 읽기 이후 확인시각 OBSERVED_BY만 보존. 정정 수치를 과거 분석에 소급 반영하지 않음. 현재 후보에서는 이 특정 보상수량 정정의 관계 대기만 해소, 추천 승인 아님.
- 나머지 최근 Form4 0001197647-26-000011(10/09), 0001696841-26-000014(09/23) 원문 검증. 후자09/21 신고 매도12,483·13,478·4,499주3건 확인. 전자는 기존 P/S 일반주식 범위로 생성되는 사건0건이며 임의 신호 생성 없음.
- 현재 후보 AAPL/MSFT/NVDA3개, 공식 원문 검증 거래 합계8건(AAPL2/MSFT3/NVDA3). NVDA 지원 매매 사건 최신 공시일09/23과 정정10/13·전체 최신 공시10/09는 별도. 최신 후보 수 증가를 3개 추천 활성화로 표시하지 않음.

## 구현·자동화 경계

- current_correction.js 신규: 단일 RSU 보상 수량 정정 전용 보수적 비교기. 발행사·문서 유형·최초 제출일·신고인·보고기간·거래일·종류·A코드/대가0·직접보유·각주·계획표시·순서/공식경로 검사. 수량/보상후 잔고와 정정/서명 메타데이터를 제외한 XML 구조가 달라도 차단. 다중 거래·파생/다른 보유·변경 각주·알 수 없는 정정은 자동 해결하지 않음.
- scripts/review-current-correction.mjs: 이미 확보한 원문 두 개를 비교해 결과 저장하는 재현 CLI. 외부 호출 없음, 안전환경 검사, 문서해시 충돌 시 기존 결과 덮어쓰기 금지. 원문 자동 발견/다운로드 전체 파이프라인 완성을 의미하지 않음. 이번 원문 조회·최초 문서 선택은 제한된 조사 실행으로 수행.
- 현재 수집기는 회사/문서ID/공시일/링크/해시/시점이 일치하는 검증된 보상수량 정정만 매매 신호에서 제외하고 나머지 원문 검증을 계속함. 새 미검증 정정은 계속차단. 정정 근거 변경 시 해당 기업 캐시만 재검증, 동일 근거 재실행은 캐시. 최대3회/기업 및 기존 Worker 전체12회 제한 유지. 새 Worker/타이머 없음.
- 저장 검증 정책v2에 정정 근거 포함: 변경 기업 재검증 및 보고서에 정정 전후 수량·공식 출처 제공. 자동 보고서의 예외는1→0이나 기업별 상태는 모두PARTIAL, 추천HOLD 유지. 이후 가격/기업행동·재무·Risk 검증이 남음.

## 화면·테스트·안전

- 실제 Web API 후보3/추천0, 자동보고 정정09/11→10/13·172,507→160,418주·매수/매도신호 아님 표시. Chrome320/390/768/1440px 가로 넘침없음·펼침 상태 새로고침후 유지. 증거 data/v2/verification/frontend-redesign/correction-review-20261019.json.
- Galaxy A33 기존 앱 재실행/서버연결·후보3·NVDA·공시09/23·원문3/3 확인. data/v2/verification/frontend-redesign/galaxy-correction-candidates-20261019.json, docs/uiux/galaxy-correction-candidates-20261019.png. 기기에서 정정 상세 수량 전수 대조·원문 링크 터치는 NOT RUN; Web 상세 확인과 구분. 앱 데이터 보존/재설치 없음. iOS 신규화면 NOT RUN.
- 최종 node scripts/run-master-qa.mjs: 회귀727 PASS/0 FAIL/0 SKIP, Android계약3 PASS/0 FAIL. data/v2/verification/master-qa/master-qa-20261019090513228.json. 실제 명령 node scripts/test-offline.js 및 node --test test/android_external.test.js. 오프라인 fixture로 실행, 테스트 외부/주문 호출 없음. 새9개 테스트: 정정관계·수량·발행사/신고인/기간 충돌·미래/경로·지원외유형·각주/정정사유·문서별검토/새정정차단·추가XML변경·기업별캐시 무효화. node문법/git diff --check PASS.
- 로컬서버 재시작 후 Worker capital cached/external0, validation 재사용3/예외0/external0, market 기존 PRICE_PROVIDER_COOLDOWN/cached 유지. 실제공식조회6회는 별도 위 조사이며 테스트/캐시 실행과 구분.
- 실거래OFF/brokerfalse·추천/삼성전자성과/Apple순위HOLD. 이번 실제 주문호출0(수행작업 범위), 과거계좌 전체감사NOT RUN. JINI개발HOLD·운영환경·외부공개·다른프로젝트 변경 없음.

## 다음과 한계

- Microsoft/NVIDIA 최신가격은 공급자 제한·기업 캐시 만료 후 확보 필요. 기업행동 전수·재무·비교기업/Risk·공개 후1/5/20일 연구·예측력 통계검증은 미완료. 국내SK1,014주/DB9건/PBR0 문제도 이번 해결 아님.
- 다음은 후보별 실제 금융 검증 입력 연결과 가격 재검증, 정정 유형 확장 시에도 원문/버전별 공개시점 보존. 지원하지 않는 정정을 통과시키거나 조건을 낮춰 추천하지 않음.
- 변경: src/v2/current_correction.js 신규; current_capital.js/current_capital_collection.js/current_validation.js, public/app.js; scripts/review-current-correction.mjs 신규; test/current_correction.test.js 신규/current_collection.test.js; QA/AUTO_DEV_LOG. 로컬 수집·검증 JSON/화면증거 별도 보존.
- Overall PARTIAL: NVIDIA 특정 정정관계 검증과 매매 사건3건/화면 연결 완료, 금융 검증·추천은 계속 보류.

---



# K-STOCK 가격·금융 검증·상세 UI·1/5/20일 연구 연결 — 2026-10-19 KST

## 요청한 4개 작업의 판정

| 작업 | 실제 결과 | 판정 |
| --- | --- | --- |
| MSFT/NVDA 최신 가격 | 해당 기업24시간 캐시·공급자 cooldown 유지, 두 조회시도 외부0회. 기존 AAPL10/16가격 보존 | BLOCKED(자료 확보 미완료) |
| 금융·위험 검증 | 공식 SEC 연간재무3기업 연결, 기간/공시/통화/태그 검증 및 재무 위험·부족항목 화면 반영. 최신분기/기업행동 전수/동종기업·종합위험 미완료 | PARTIAL |
| 후보 상세 | 이유→재무·평가배수보류→위험→공개후관측 표시. Web/Galaxy 실제 확인 | 구현·제한된 화면검증 PASS |
| 1/5/20거래일 연구 | 보수적 관측 계산/저장/Worker/API/UI 연결. 현재4공시 사건의3기간 모두대기, 신규 검증수익률0 | 구현 PASS / 실데이터 관측 PENDING |

## 실제 금융 자료와 정합성 수정

- Preflight AGENTS/ARI 기준, 프로젝트·remote·branch·commit·기존 변경 확인. auto/kstock-development-20260930 / ea406852610c00bef0dbe469de95c42fca662c30, package1.0.0. 로컬127.0.0.1:3000만 재시작, 사용자 작업·기존Apple/SEC/MSFT음수연구 보존.
- 기존 승인·활성 SEC companyfacts GET 총5회: MSFT1/NVDA초기1/태그선택수정후NVDA1/AAPL1/재시작Worker의새정규화버전MSFT1. 모두 HTTP200. 기존flag true 확인, 인증·유료서비스 변경 없음. scripts/collect-current-financials.mjs는 기존SEC승인정책 확인. 기존30분 Worker에1기업/최대1요청·기업별24시간캐시·고정3기업 순환 연결, 주기전체12요청 상한 공유.
- 재무 결과: MSFT 연간2026-06-30/공시2026-07-29 READY; NVDA 연간2026-01-25/공시2026-02-25 INCOMPLETE; AAPL 연간2025-09-27/공시2025-10-31 READY. READY는 기존 연간 재무항목 충족을 뜻하며 기업 전체/최신분기/추천 검증완료가 아님.
- NVDA 최초 정규화에서 첫 매출태그의 과거2022년을 선택하는 문제 발견. sec_financials.js를 모든 지원 매출태그의 이용 가능한 연간기간을 먼저 비교하도록 수정. 공식응답1회 재검증으로2026년 결산 선택 확인. 선택 버전 변경 시 기업별 캐시만 갱신, 2022년을 최신실적으로 게시하지 않음. Apple2025년 연간자료는 실제 선택된 공시이며 최신분기나2026년 연간자료로 위장하지 않음.
- 동일 accession·기간·통화의 연간매출/이익/현금흐름/자본만 연결. 최신 분기·TTM 미검증 명시. 주식수·기업행동·비교표본 부족으로 PER/PBR/PSR/EV/EBITDA null/HOLD, 연간 EPS를 임의TTM 배수로 바꾸지 않음.
- 위험 검토는 FINANCIAL_SCREEN_ONLY: 확인된 자본0이하/영업현금흐름음수·부족항목과 미검토 규제/지배구조를 구분. 종합위험 낮음/LLM 검증완료/추천 허용을 생성하지 않음. 새 LLM 또는 외부AI 요청 없음.

## 시장 반응 연구 구조

- current_observation.js는 기존 measureMarketReaction 계산기를 재사용. 원문 검증·관측시각·D2 이용조건 검사, 직접 공개를 확인한 시각 이후 첫 전체 거래세션 종가를 보수적 기준으로 사용. EXACT 최초 공개 분석으로 표시하지 않음. 단위는 FRACTION(API)→%p(UI), 가격수익률/배당·비용미포함/비연율화/실제체결아님 명시.
- 동일 공시의 거래3개를 독립 연구3건으로 세지 않음. 현재 AAPL2공시/MSFT1공시/NVDA1공시=4사건, 각각1/5/20기간. 신규 검증기간0, 현재실자료는D2_AVAILABILITY_WAIT. 미래기간이나가짜가격으로0%를 채우지 않음.
- 계산하려면 verified calendar/security/benchmark/actions 입력의 공식HTTPS출처·SHA256·확인시각·종목·통화·RAW_CLOSE/SP500 PRICE_INDEX·기업행동 범위가 필요. 공개 이후 동일거래일 시계열 사용, 결측/중복일자 차단, 이미조정된가격 중복조정 방지. 미래확인시각·확인전가격·기업행동 미래범위 차단.
- 검증된 과거입력 계약은 선택파일 data/v2/influence/current-observation-inputs.json(schemaVersion1/checkedAt/companies[{companyId,inputs:{calendar,security,benchmark,actions}}])으로 받음. 현2025년 이력을2026년 연구에 재사용하지 않음. 현재 이 파일에 새실자료를 만들어 넣지 않았으며 새기간의 가격이력·거래일·지수·기업행동 전체수집은 미완료. 따라서 관측 구조 연결과 실제수익률 표본 확보를 구분.
- 금융 자료와 관측입력을 기존 증분 저장 검증의 회사별fingerprint에 추가(정책v3). 변경 기업만 재검증하며 실제Worker 재시작 결과 evaluated1/reused2, 금융요청1/기타0 확인. source financial/raw normalized 결과는 current-financials.json, 후보별 관측 상태는 current-validation.json에 저장.

## 화면·검증 결과

- Web 상세에 기준기간/공시일/USD/TTM아님, 매출·순이익·자본·영업현금흐름, 공식링크·평가배수보류·위험·시장관측 대기 표시. 실제Chrome320/390/768/1440px 가로넘침없음, MSFT재무2026-06-30·3기간대기·상세펼침 갱신후유지 확인. data/v2/verification/frontend-redesign/financial-reaction-detail-20261019.json.
- Galaxy A33 기존앱 재실행·서버연결·신호메뉴 실제터치·후보상세 실제터치/스크롤. Apple연간2024-09-29~2025-09-27/공시2025-10-31, USD숫자, 위험·배수보류·1/5/20대기 확인. docs/uiux/galaxy-financial-reaction-detail-20261019.png, galaxy-financial-values-20261019.png 직접확인. 기록 data/v2/verification/frontend-redesign/galaxy-financial-reaction-detail-20261019.json. 모든기업/장애복구/확대폰트 전수실기기 재검증은 NOT RUN. iOS 새상세 NOT RUN.
- node scripts/run-master-qa.mjs 최종 회귀741 PASS/0 FAIL/0 SKIP, Android계약3 PASS/0 FAIL. 명령 node scripts/test-offline.js / node --test test/android_external.test.js. 증거 data/v2/verification/master-qa/master-qa-20261019095103124.json. 테스트외부요청차단, 실제공식조회는위별도5회. 추가14개: 금융승인/캐시/실패/발행사, 매출태그전환, 보수시작·결측·1/5/20·기업행동/유형·미래유출·공시단위중복방지, UI연간/대기 계약. 문법/git diff --check PASS.

## 남은 조건·안전

- MSFT/NVDA가격은여전히미확보: 캐시만료 전재시도/공급자우회 없음. data/v2/verification/frontend-redesign/current-price-attempt-20261019.json에 두 요청시도 cached=true/외부0 기록.
- 최신분기/TTM/주식수·기업행동/동종기업최소표본/종합Risk·통계적예측력 미충족. 신규1D/5D/20D수익률0건. iOS와전기기전수QA/OS재부팅복구 NOT RUN. 국내기존미해결항목 해결로보고하지 않음.
- broker/live false, 추천/삼성전자성과/Apple순위HOLD. 이번 실제 주문호출0(수행작업 범위), 과거전체계좌감사는미실행. 데이터삭제·인증/권한변경·유료신규·운영서버·외부공개·다른프로젝트 변경 없음. JINI개발HOLD 해제 없음.
- 다음 자동동작: 기존30분 저장검증, 기업별캐시기한 후허용된 가격/재무확인. 다음개발은최신분기·기업행동·동일기간이력/벤치마크근거수집. 시간경과만으로추천을켜지 않음.
- 변경파일: 신규 src/v2/current_financials.js/current_candidate_detail.js/current_observation.js, scripts/collect-current-financials.mjs, test/current_financials.test.js/current_observation.test.js; 수정 sec_financials.js/current_research.js/current_validation.js/influence_service.js/official_research_collection.js, public/app.js, test/sec_financials.test.js/candidate_ui.test.js, QA/AUTO_DEV_LOG. 로컬실자료·검증증거별도저장.
- Overall PARTIAL: 4영역의 처리/표시 연결, 공급자제한·금융검증·실관측 선행조건은 남아 있음.

---



# K-STOCK 새벽 확인·아침 보고 운영 연결 — 2026-10-19 KST

- Preflight AGENTS/ARI 기준, cwd/remote/branch/commit/기존 변경 확인. auto/kstock-development-20260930 / ea406852610c00bef0dbe469de95c42fca662c30. 기존 미커밋 작업과 자료 보존. 로컬127.0.0.1:3000만 재시작.
- 기존 Scheduler 순서 OFFICIAL_COLLECTION→INFLUENCE_VALIDATION→OVERNIGHT_REPORT 연결. 새 Worker/타이머·OS스케줄·외부공개 없음. Asia/Seoul 새벽02:00~06:00 실제 주기 기록, 오전07:30 이후 첫 주기에서 하루1회 보고. 정확히07:30 실행 보장은 아니며 기존30분 기준점/앞선 작업 소요시간에 따름.
- 실제 수집은 기존 활성 승인경로·전체12HTTP·기업별캐시·공급자cooldown 유지. 새벽 집중 확인을 이유로 호출/캐시 강제우회하지 않음. 새 보고 단계는 외부 요청0.
- 밤 실행의 source receipt가 실제현재5분 이내 확인된 경우에만 수집주기 관측으로 기록. 슬롯당1회·날짜별보고1회, 재시작후 중복방지/파일잠금. 현재후보·추천통과·검증된수익기간·기업별보류사유 저장. 첫보고 신규증가null, 확인된슬롯만 보고. 입력 실패는 BLOCKED보고/후보null로 남기고 당일반복재생성하지 않음.
- 실제 로컬 서버 활성 확인: API overnight.enabled=true, Scheduler OVErNIGHT_REPORT 작업 결과 MORNING_REPORT_SAVED/외부0. 실제 생성2026-10-19T10:03:55.696Z(한국19:03), 예정07:30보다늦은 AFTER_SCHEDULE. 오늘 새벽실행을 주장하지 않으며 NO_NIGHT_EXECUTION_RECORDED/관측슬롯0/현재후보3/추천0/검증수익기간0. 다음새벽은10/20이며 실제 야간 실행은 아직 NOT RUN.
- 홈 Mac mini 영역에 새벽 시간/서버실행조건/아침보고 표시. 실제Chrome320/390/768/1440px 가로넘침없음, 보고서펼침 새로고침후유지, 새벽기록없음/첫보고기준없음 표시 확인. data/v2/verification/frontend-redesign/overnight-report-20261019.json. 이번 Galaxy/iOS 새보고서 실기기확인은 NOT RUN.
- node scripts/run-master-qa.mjs: 회귀747 PASS/0 FAIL/0 SKIP, Android계약3 PASS/0 FAIL. data/v2/verification/master-qa/master-qa-20261019100328260.json. 추가6개: KST날짜경계, 야간슬롯/재시작중복,07:30기준과일별보고,늦은시작/새벽미관측,오래된수집/비활성/실거래차단/시계역행,실패보고. node문법 및git diff --check PASS. 테스트는고정시간/fixture이며 실제밤을기다려확인한결과아님.
- 실제야간/아침무인운전·재부팅·절전복귀 NOT RUN. Mac깨우기/절전방지/로그인자동시작 미설정. Mac이깨어있고로컬서버가유지되어야실행. 운영 안내 docs/KSTOCK_OVERNIGHT_RESEARCH.md에 재실행명령/중복서버금지/실패보고한계 기록. 외부메일·푸시등전송 없음.
- 실거래OFF/brokerfalse, 추천/삼성전자성과/Apple순위HOLD, 이번 실제주문호출0(수행범위). JINI개발HOLD/원천권한/인증정보/다른프로젝트/유료서비스 변경없음. 투자검증선행조건은시간경과만으로해제하지 않음.
- 변경: src/v2/overnight_research.js 신규, src/server.js/research_automation.js, public/app.js, test/overnight_research.test.js 신규, docs/KSTOCK_OVERNIGHT_RESEARCH.md 및QA/AUTO_DEV_LOG. 저장보고/증거는로컬data/v2.
- 다음 자동작업: 서버유지시10/20 02~06시 기존주기확인→07:30이후첫주기보고. 다음 QA에서 실제슬롯/수집실패/보고생성시각 대조. Overall PARTIAL: 로컬일정·보고구현/실제API검증 완료, 실제무인야간운전은아직미검증.

---



# K-STOCK 최근 10-Q·단일 분기/누적 기간 연결 — 2026-10-19 KST

- Preflight AGENTS/ARI기준·경로/remote/branch/commit/사용자변경 확인. auto/kstock-development-20260930 / ea406852610c00bef0dbe469de95c42fca662c30. 기존 미커밋 작업·자료 보존. 로컬127.0.0.1:3000만 재시작, 기존새벽보고/30분주기 유지.
- 기존 승인SEC companyfacts 총3GET/HTTP200, 기업별1회. 새정규화버전annual-and-interim-period-v3으로 저장. 추가API·비밀값변경·유료서비스·원문반복조회 없음. 이후재시작은캐시재사용.
- 실제 최근10-Q: AAPL 기준2026-06-27/공시07-31/매출109,417,000,000USD(03-29~06-27 단일분기), 영업현금흐름116,996,000,000USD(2025-09-28~2026-06-27 누적). NVDA 기준07-26/공시08-26/매출96,221,000,000USD(04-27~07-26 단일분기), 영업현금흐름74,421,000,000USD(01-26~07-26 누적). 각 항목 기간·통화·태그·공시근거 별도보존.
- MSFT 최근10-Q 기준03-31/공시04-29/매출82,886,000,000USD(01-01~03-31), 이미 연결된06-30 연간공시보다 오래됨. 따라서 최신 전체실적으로대체하지않으며 화면에연간공시기준일이더최근이라는 안내. 4분기실적을연간차감으로추정하지 않음.
- sec_interim.js: 이용가능한10-Q/10-QA·USD·공시D2·발행사·접수번호·기준일 검증, 같은접수/공시일/종료일만 결합. 항목별80~100일 단일분기/100일초과300일이하 누적/자본시점잔액 구분. 기간길이만으로회계연도시작은확정하지않아 CUMULATIVE_PERIOD 및 회계연도시작검증대기 표시. 기존저장 YEAR_TO_DATE표현은API상세에서보수적누적표현으로호환. 누적값중복합산/연간+분기혼합 없음.
- 동일기간수치충돌·정정공시는BLOCKED, 미래공시/잘못된통화 배제. source상연결범위 완전검증은scopeVerified=false, TTM연속4분기검증은INSUFFICIENT_DATA. currentCandidateDetail에interim별도추가, 기존연간값/평가배수보류/위험HOLD 유지. latestInterimVerified를무조건true로바꾸지 않음.
- Web 실제API/Chrome320/390/768/1440px: MSFT분기03-31와더최근연간안내, 항목별USD·기간·누적/잔액 표시, 가로넘침없음/펼침새로고침유지 확인. data/v2/verification/frontend-redesign/interim-detail-20261019.json. Galaxy/iOS 신규분기화면실기기검증 NOT RUN(이전연간화면확인과구분).
- 최종 node scripts/run-master-qa.mjs 회귀752 PASS/0 FAIL/0 SKIP, Android계약3 PASS/0 FAIL. data/v2/verification/master-qa/master-qa-20261019101403862.json. 추가5개: 단일/누적/잔액 분리, 미래/통화, 충돌/정정, 접수동일성, 연간보다오래된10-Q안내. 오프라인fixture/실제주문·외부요청없음. 문법/git diff --check PASS.
- 안전: broker/live false, 추천/삼성전자성과/Apple순위HOLD. 이번주문호출0(수행범위). 신규수익률표본/기업행동전수/동종기업/종합위험해결 아님. 새벽실제무인운전/OS깨우기/재부팅 및 모바일신규화면 NOT RUN. 다른프로젝트·인증정보·운영배포·외부공개 변경 없음.
- 변경: 신규src/v2/sec_interim.js/test/sec_interim.test.js; current_financials.js/current_candidate_detail.js, public/app.js, test/current_observation.test.js, QA/AUTO_DEV_LOG. 정규화자료·API/UI증거는로컬저장. 다음: 연결범위·연속분기/TTM 검증, 실제기업행동·비교표본 연결. Overall PARTIAL(분기연결/자동검증기반 완료, 추천선행조건은보류).

---



# K-STOCK USD TTM 연속성·준비 상태 — 2026-10-19 KST

- Preflight AGENTS/ARI·경로/remote/branch/commit/기존 변경 확인. auto/kstock-development-20260930 / ea406852610c00bef0dbe469de95c42fca662c30. 기존 데이터/미커밋 작업 보존, 로컬 서버만 재시작. 이번 외부 금융 요청0.
- 기존 accounting_periods.js는 KRW/달력연도/DART 전용이므로 통화·연도를 변환해 재사용하지 않음. validDay와 공통D2 정책만 재사용하고 SEC/USD용검증을 sec_quarter_ttm.js에 추가. 단일분기80~100일, 연속4개·합계범위350~380일(52/53주포함), USD/단위, 연결범위검증, 접수번호/SHA256, 공개가능시점, 중복/수치충돌 검사. 누적값이나연간값을직접더하지 않음. 근거가검증된4개단일분기 fixture에서만합계계산 확인.
- 실제연결은 최근저장10-Q 항목의단일분기자료만 사용하는 준비상태 어댑터. 과거분기4개 수집/누적→단일분기전환/연결범위검증을 완료한것이아님. TTM 값은모두null/INSUFFICIENT_DATA 유지. AAPL/NVDA 매출·순이익각1개, 현금흐름0개(누적전환근거필요). MSFT는3항목각1개이며 더최근연간공시와4분기대사필요. 분기자료수는연결범위까지최종승인한표본수가아님.
- 후보상세에 TTM준비상태/분기자료수/부족근거 추가. 저장검증정책v4로이전보고서재사용을무효화하여새상태반영. 기존30분/새벽보고유지. Web 실제API·Chrome320/390/768/1440px 가로넘침없음/펼침갱신유지. 증거 data/v2/verification/frontend-redesign/ttm-readiness-20261019.json. Galaxy/iOS신규TTM 실기기항목NOT RUN.
- 최종 node scripts/run-master-qa.mjs 회귀758 PASS/0 FAIL/0 SKIP, Android계약3 PASS/0 FAIL. data/v2/verification/master-qa/master-qa-20261019103346082.json. 신규6개: 정상4분기·누락/중복/연결범위·충돌·미래/통화/누적/연간기간·저장누적전환/연간대사·12개월범위. 오프라인fixture이며실제TTM확보로보고하지않음. node문법/git diff --check PASS.
- 실거래OFF/brokerfalse, 추천/삼성전자성과/Apple순위HOLD, 이번 주문호출0(수행범위). 다른프로젝트/인증정보/유료/운영배포/외부공개 변경없음. 최신가격·기업행동·비교표본·종합Risk/실관측선행조건미완료.
- 변경: src/v2/sec_quarter_ttm.js 신규, current_candidate_detail.js/current_validation.js, public/app.js, test/sec_quarter_ttm.test.js 신규, QA/AUTO_DEV_LOG. 다음: 과거분기공식근거확보·누적차감검증·연결범위대사 후 실제TTM 재평가. Overall PARTIAL.

---



# K-STOCK 과거 분기 확보·누적 전환 근거 — 2026-10-19 KST

- Preflight AGENTS/ARI·경로/remote/branch/commit/기존 작업 확인. auto/kstock-development-20260930 / ea406852610c00bef0dbe469de95c42fca662c30. 기존 미커밋 변경과 자료 보존. 로컬127.0.0.1:3000만 재시작, 기존30분/새벽보고 유지.
- SEC companyfacts 기존승인경로 총3GET/HTTP200(AAPL/MSFT/NVDA 각1). 정규화버전quarter-history-provenance-v4로최근800일 범위 근거를 수집, 항목별최근8개분기까지저장. 새 API권한·비밀값·유료서비스변경 없음. 이후재시작캐시재사용.
- sec_quarter_history.js: 같은매출/이익/현금흐름 태그·같은누적시작일·80~100일 차이인 앞뒤누적만 차감해단일분기후보생성. 연간-9개월 차감도 같은규칙으로검사. 수량·태그·기간·공시일·접수번호·sourceHash·계산입력2개·직접/누적차감방법을보존. 통화USD고정/미래공시배제/정정검토/직접분기와차감결과불일치차단. 재무범위는UNKNOWN/scopeVerified=false로유지.
- 실제AAPL 매출/순이익/현금흐름 각7개 분기후보 확보, 최근4개연속성과12개월기간검사통과. MSFT 각8개후보/최근4개연속연결. NVDA현금흐름7개후보/최근4개연속연결. 모든TTM합계는연결범위미검증으로null/INSUFFICIENT_DATA. 단순히자료4개가모였다고추천을활성화하지않음.
- NVDA매출·순이익은 직접분기값과누적차감값 불일치 DIRECT_DERIVED_QUARTER_CONFLICT로항목차단/분기반영0. 반올림·정정·원천오류 중 어느원인인지 이번에판정하지않음. 값을고르거나충돌항목만제외해TTM을만들지않음. 충돌상세 원문수치대조는다음작업.
- currentCandidateDetail의TTM준비상태가과거자료를사용하도록연결. 저장검증정책v5로갱신. Web분기전환근거에직접공시/누적차감,입력기간·금액USD·공시일·접수번호표시. 실제Chrome320/390/768/1440px에서4/4·근거·보류표시/가로넘침없음/상세펼침갱신유지확인. data/v2/verification/frontend-redesign/quarter-history-20261019.json. Galaxy/iOS새분기전환근거실기기확인NOT RUN.
- 최종 node scripts/run-master-qa.mjs 회귀762 PASS/0 FAIL/0 SKIP, Android계약3 PASS/0 FAIL. data/v2/verification/master-qa/master-qa-20261019103900747.json. 추가4개: 누적차감근거·누락/회계시작불일치·충돌/정정·미래/직접차감불일치. 초기테스트에서1USD차이허용 문제를발견해금액일치조건을엄격히수정한후최종PASS. 외부요청은별도실자료3회, 테스트는오프라인fixture. 문법/git diff --check PASS.
- 실거래OFF/brokerfalse, 추천/삼성전자성과/Apple순위HOLD, 이번 실제주문호출0(수행범위). 다른프로젝트/인증/유료/운영배포/외부공개변경없음. 최신가격/기업행동/비교기업/종합Risk·실제수익표본 해결로보고하지않음. 실제새벽무인운전·모바일새화면NOT RUN.
- 변경: 신규 src/v2/sec_quarter_history.js 및 test/sec_quarter_history.test.js; current_financials.js/sec_quarter_ttm.js/current_candidate_detail.js/current_validation.js, public/app.js, QA/AUTO_DEV_LOG. 데이터와API/UI근거는로컬보존. 다음: 공식원문XBRL 연결범위 대사, NVDA직접/차감충돌원인검증. Overall PARTIAL(과거근거확보/전환검증연결완료, 실제TTM·추천은보류).

---



# K-STOCK 원문 범위→실제 TTM→평가배수 Gate→모바일 통합 묶음 — 2026-10-19 KST

## 최종 판정

| 항목 | 이번 결과 |
| --- | --- |
| 원문 연결 범위 | Apple/MSFT 흐름 계정 검증, NVDA현금흐름 검증 |
| 실제 TTM | AAPL·MSFT 매출/순이익/영업현금흐름 READY, NVDA현금흐름만 READY |
| NVIDIA 차이 | 두 항목 각-1,000,000USD, 공식 보고정밀도와 양립. 정책검토전 TTM보류 |
| 가격·주식수·기업행동·평가배수 | 입력검증/주식수 관측/독립배수 Gate 연결. 실제값·비교표본 미충족으로보류 |
| Web/모바일 | Web 반응형·Galaxy A33 실기기·iOS Simulator WebKit 실제값대조PASS |
| 전체 | PARTIAL — 추천/삼성전자성과/Apple순위HOLD, 실거래OFF |

## 근거와 실제 계산

- Preflight AGENTS.md/ARI기준·cwd/remote/branch/commit/미커밋변경 확인. auto/kstock-development-20260930 / ea406852610c00bef0dbe469de95c42fca662c30, package1.0.0. 사용자작업·Apple/SEC·음의MSFT시장반응 보존. 로컬127.0.0.1:3000만 재시작, 다른프로젝트변경없음.
- 이번 공식SEC 실제GET 총43회: 파일목록13, XBRL인스턴스16(정책추가대조 포함), FilingSummary13, NVDA companyfacts1. 문서12건의 대사이며 새사건43건이아님. 각조사CLI 최대12회·호출간격1100ms·timeout/크기상한·인증우회/무한재시도없음. 기존승인읽기경로만 사용. 최신시세를얻으려고쿼터/캐시우회하거나유료전환하지않음.
- Apple4개공시 XBRL값/기간/USD/발행사/차원없는문맥과연결손익·현금흐름표제대조. MSFT4개공시는제표표제가일반이름이라이를연결로추정하지않고, 회사와종속기업포함·내부거래제거를명시한 us-gaap:ConsolidationPolicyTextBlock 원문추가대조. 원문해시동일성확인후별도정책증거저장. 숫자/문맥일치와명시적범위근거가모두있을때만scope검증적용.
- 저장: data/v2/influence/sec-scope-reviews.json. 회사/접수/링크/SHA256/문맥/일치사실/정밀도/표제또는정책검증시각보존. 이전receipt의표제확인시각누락은배치최종관측시각으로보수적보완. 검증시점보다과거asOf에는적용하지않음. 원문전문·주소는정규화결과에저장하지않음.
- AAPL TTM2025-06-29~2026-06-27: 매출466,823,000,000USD / 순이익128,930,000,000USD / 영업현금흐름146,724,000,000USD. MSFT2025-07-01~2026-06-30: 매출331,839,000,000USD / 순이익133,749,000,000USD / 영업현금흐름182,935,000,000USD. 실제원문보고값과4분기근거에따른합계, 예측값아님.
- NVDA현금흐름2025-07-28~2026-07-26=134,360,000,000USD. 매출/순이익은실제TTM null유지. 직접분기매출96,221,000,000 vs 누적차감96,222,000,000; 순이익59,688,000,000 vs59,689,000,000USD. 각입력원문에서decimals=-6확인. 세입력정밀도허용폭합1,500,000USD와차이1,000,000USD가양립한다는 ROUNDING_COMPATIBLE_REQUIRES_POLICY_REVIEW 판정만저장. 원인이확정된ROUNDING_ERROR/RESOLVED로표시하지않고수정보정/값선택/평균없음.

## 자동화·기업행동/평가배수

- 기존 Worker에 collectSecScope 통합, 새Worker/타이머없음. 주기별최대3HTTP/기존전체12HTTP 예산공유. 확보원문재사용, 새입력/문서만대사, 실패·부분검증24시간대기, 401/403 SEC_AUTH_BLOCKED기록. 정규화·근거저장·증분검증·기존새벽보고연결. 실제재시작scope 외부0/cached근거활용, 전체주기HTTP0확인.
- 글로벌USD용동일기준일가격/보통주유통주식수/전체주식종류/기업행동범위/통화·보통주귀속이익·장부가치 Gate 추가. KRW전용기존모듈에USD를강제대입하지않음. 원문cover의관측유통주식수는날짜·정의·종류검증대기로표시(발행주식수아님). MSFT/NVDA의각4관측기록은현재가격일확정수량으로쓰지않음. Apple원문관측목록미확보를0주로채우지않음.
- PER/PBR/PSR/EV/EBITDA독립조건/0·음수분모/원주가·수정주가/가격·주식수날짜/기업행동전수검사. 실제시장가치·배수는현재모두보류. verifiedTTM이있어도보통주귀속이익·주식수·기업행동근거없으면PER/PBR을켜지않음. 최소동종표본3정책유지. 기존국내PBR0/SK1,014주/DB9건문제해결로보고하지않음.

## Web·Android·iOS 검증

- 실제API AAPL/MSFT TTM READY, NVIDIA일부보류, 추천통과0. Chrome320/390/768/1440px 가로넘침없음, 검증된TTM수치/범위·원문전환근거·평가배수필요입력·정밀도보류·펼침갱신유지. data/v2/verification/frontend-redesign/integrated-valuation-20261019.json 및 integrated-complete-api-20261019.json.
- Galaxy A33 기존앱재실행/서버연결/신호메뉴·상세실제터치/스크롤. Apple TTM3개숫자API와일치. 캡처 docs/uiux/galaxy-integrated-ttm-20261019.png 직접확인, 기록 data/v2/verification/frontend-redesign/galaxy-integrated-ttm-20261019.json. 다른기업모든상세/모든글자확대전수재검증은NOT RUN. 기존데이터보존/재설치없음.
- iOS App.swift --qa에currentTTM API↔실제WebKit숫자및펼침상태대조추가. 기존 iPhone17 Simulator 빌드·설치·실행, ios/verify-result.py 실제receipt8항목PASS(6화면/삼성전자/연결실패·복구/큰글자/TTM대조포함). data/v2/verification/frontend-redesign/ios-integrated-ttm-20261019.json. XCTest8개가아니라nativeQA의8검사항목이며회귀집계와별도. 물리iPhone미설치/미검증, LAN노출/서명계정변경/VoiceOver음성테스트없음.

## 최종 테스트·안전·남은 조건

- node scripts/run-master-qa.mjs 최종 회귀774 PASS/0 FAIL/0 SKIP, Android계약3 PASS/0 FAIL. data/v2/verification/master-qa/master-qa-20261019112905978.json. 명령 node scripts/test-offline.js / node --test test/android_external.test.js. 추가12개: XBRL문맥/표제·정책/공식경로/미래근거, 독립배수/날짜/주식정의/분모, 정밀도·미래, Scope collector상한/캐시/비활성/인증차단. 오프라인fixture, 실제43조회와분리. node/Python문법/git diff --check·신규수집코드제한secret-pattern검사PASS(전체저장소감사아님).
- broker/live false, 추천/삼성전자성과/Apple순위HOLD. 이번실제주문호출0(수행작업범위), 과거전체계좌감사NOT RUN. 새유료/API인증/외부공개/운영서버/다른프로젝트변경없음. JINI개발HOLD해제없음.
- 남음: NVIDIA정밀도처리정책·최신가격·동일날짜주식수/기업행동전수/보통주귀속분모·유효비교표본·종합Risk/예측전략검증. 신규사건1/5/20일실관측표본은여전히0. 실제새벽무인운전/재부팅/절전깨우기/물리iPhone신규UI NOT RUN.
- 다음자동동작: 기존30분수집/범위대사/저장검증과새벽02~06/07:30이후보고. Mac이깨어있고로컬서버가유지돼야함. 새근거없이는추천Gate자동해제하지않음. 이번묶음에서독립가능한원문대사·TTM·입력Gate·Web/모바일검증·회귀/QA까지진행했고자료선행조건만보류.
- 변경: 신규 sec_xbrl_scope.js/sec_scope_collection.js/quarter_rounding_review.js/global_valuation_gate.js 및대응4개test파일, scripts/collect-sec-scope.mjs/audit-sec-quarter-conflicts.mjs/review-sec-consolidation-policy.mjs; 수정 sec_quarter_history.js/sec_quarter_ttm.js/current_candidate_detail.js/current_validation.js/influence_service.js/official_research_collection.js, public/app.js, ios/App.swift/verify-result.py, 본QA/AUTO_DEV_LOG. 운영계약 docs/KSTOCK_SEC_SCOPE_AND_TTM.md. 로컬증거와정규화결과별도저장.
- Overall PARTIAL — 실제TTM2기업연결및통합검증완료, 추천·평가배수의실자료선행조건은미완료.

---



# 평가배수 보류 원인 분리 및 저장 근거 계약 — 2026-10-19 KST

- 기준: `auto/kstock-development-20260930` / `ea406852610c00bef0dbe469de95c42fca662c30`. 기존 미커밋 작업 보존, 로컬 개발만 수행.
- 확보된 TTM 분모와 가격·주식수·기업행동의 미검증을 독립 판정. 시장 자료 부족을 매출 TTM 부족으로 잘못 표시하던 원인 수정.
- 관측 종가/가격일/통화, 주식수 관측일/출처, 기업행동 상태를 후보 상세 API의 evidence로 제공. 관측은 VERIFIED 증빙으로 승격하지 않음. 과거 기준일 이후 checkedAt·가격 관측·주식수 기준일은 제외.
- Web 상세에 평가일·관측 종가와 PER/PBR/PSR/EV·EBITDA별 부족 근거 표시. 기존 Worker 캐시 버전 v7로 변경하여 다음 실행에서 이전 결과를 재사용하지 않음.
- 잘못된 평가일 및 배수 계산 오버플로를 차단. 추천·삼성전자 성과·Apple 순위 HOLD 유지. 이 작업에서 외부 수집·실주문 호출 없음. 실행 중 서버 설정을 변경하지 않음.
- `node scripts/run-master-qa.mjs`: 회귀 778 PASS / FAIL 0, Android 계약 3 PASS / FAIL 0. 최종 결과 경로는 아래 개발 로그 참조.
- 단위/UI DOM 계약 검증 수행. 변경 화면의 실제 Chrome·Galaxy A33·iOS 렌더링 및 실행 서버의 새 버전 적용: NOT RUN. 이전 실기기 PASS를 이번 검증으로 재사용하지 않음.
- 실제 PBR 표본 증가 없음. 동일일 보통주 주식수·전체 기업행동·귀속 자본·가격 증빙이 여전히 필요함. NVIDIA 차이·국내 금융 검증 상태는 변경하지 않음.
- 변경: src/v2/global_valuation_gate.js, src/v2/current_candidate_detail.js, src/v2/current_validation.js, public/app.js, test/global_valuation_gate.test.js, test/current_valuation_evidence.test.js 및 두 진행 문서.
- 다음 작업: 실행 서버 새 코드 반영 후 Web/모바일의 배수별 보류 문구·관측일·상세 상태 보존 확인. 공식 증빙 확보 전 평가수치 활성화 금지.
- Overall: PARTIAL.

---



# 평가배수 보류 화면 실행 반영·Web/iOS QA — 2026-10-19 KST

- 기준 브랜치 `auto/kstock-development-20260930`, 커밋 `ea40685`. 기존 변경 보존. 배포 대상은 로컬 `127.0.0.1:3000`뿐이며 공개 배포 없음.
- 로컬 서버를 기존 안전 플래그로 재시작(PID 78286). 외부 접속 비활성, broker/live trading false 유지. 기존 Scheduler 활성, 연구 Worker 조회 순간 idle이며 저장 검증 3기업 재평가·예외 0. 새 수집 경로나 주기 활성화 없음.
- 실행 API: Apple 관측 종가343.46 USD/2026-10-16, Apple·MSFT 매출 TTM READY, NVDA 매출 TTM 부족. PSR 사유는 시장 증빙 부족과 재무 부족을 구분. 관측 주식수는 검증된 동일일 주식수로 승격하지 않음.
- Chrome 실제 화면 320/390/768/1440px: 넘침 없음, 평가일·배수별 보류 표시, 새로고침 후 상세 펼침 유지 PASS. `valuation-blocker-ui-20261019.json`.
- iOS Simulator(iPhone17): 실제 WKWebView QA 9개 판정 PASS. 6화면·TTM API값·평가일/배수 보류·실패/복구·상세 보존·글자 확대 확인. `ios-valuation-blockers-20261019.json`. iPhone15 실기기 신규 검증 NOT RUN.
- Galaxy A33: 기존 앱과 저장정보 보존, USB reverse 재사용. 서버 재시작 후 다시 연결로 복구, Apple 상세 열기·스크롤 및 접근성 트리에서 API와 같은 평가일/종가/4배수 사유 확인. 실제 가시 영역에서 평가일·가격일·PER/PBR/PSR 사유를 스크린샷으로 확인 PASS. EV/EBITDA는 아래 스크롤로 이어지는 항목이며 전체 내용은 접근성 트리 대조. `docs/uiux/galaxy-valuation-blockers-visible-20261019.png`. APK 재설치 없음.
- 변경 파일: `ios/App.swift`, `ios/verify-result.py`, 본 보고서와 AUTO_DEV_LOG. 검증 자료와 스크린샷 별도 저장.
- 최종 `node scripts/run-master-qa.mjs`: 회귀 778 PASS, Android 계약 3 PASS, 실패/스킵 0. 영수증 `data/v2/verification/master-qa/master-qa-20261019120643538.json`. 구문 및 diff 공백 검사 PASS.
- 이번 수동 외부 수집 없음. 기존 승인된 자동 수집 사이클의 외부 요청 1건은 runtime 상태에서 확인됨. 실제 주문 호출을 수행하지 않음(전체 운영 감사 건수로 확대 해석하지 않음).
- 추천·삼성전자 성과·Apple 순위 HOLD, 실거래 OFF. 동일일 주식수/가격 증빙·전체 기업행동·귀속 자본 등 선행 근거 부족으로 실제 배수/추천 활성화 없음.
- 전체 PARTIAL. 다음: 자료별 검증 준비 상태를 사용자용 짧은 요약으로 표시하고 기존 공식 수집 결과에 따라 갱신. 국내 주식수 차이와 NVIDIA 보고정밀도 정책 검토는 계속 보류.

---



# 자료 준비 요약 · API/Worker/Web/모바일 통합 — 2026-10-19 KST

- 기준: 브랜치 `auto/kstock-development-20260930`, 커밋 `ea40685`. 기존 미커밋 변경 보존, 로컬 개발만 수행.
- `research_readiness.js`에 확인됨/검증 대기/자료 부족 체크리스트 추가. 매출·현금흐름 TTM만 확인된 범위로 인정하며 주식 종류·순이익 귀속·자본·기업행동·비교기업·위험은 별도 조건으로 유지. 분모 값이 유한하지 않거나 충돌 사유가 있으면 확인됨으로 표시하지 않음.
- API 후보 상세 readiness 연결, 저장 검증 캐시 v8. 관측값을 VERIFIED로 승격하지 않고 완료율/추천 점수/작업 실행률로 환산하지 않음. 실행·수집 보장 문구 없음.
- Web 홈·신호 카드에 짧은 준비 요약과 다음 필요 자료 표시. 상세 화면에는 전체 필요 자료를 펼쳐 확인. 기존 디자인 토큰과 라이트/다크 테마 사용.
- 실행 서버 기존 플래그로 재시작: PID79870, `127.0.0.1:3000`, 외부 접속 비활성. 기존 Scheduler/공식 읽기 수집 설정 유지, 새 수집 경로·운영 배포·유료 API·인증 변경 없음.
- 실제 API: AAPL/MSFT 매출·현금흐름 확인됨, NVDA 현금흐름만 확인됨. 나머지 조건은 검증 대기/자료 부족. 추천·삼성전자성과·Apple순위 HOLD, live trading false.
- Chrome: 320/390/768/1440px 넘침 없음, 준비 요약·기존 TTM/배수 표시 PASS. 새 전체자료 펼침과 기존 상세 펼침이 새로고침 후 유지됨. `readiness-summary-ui-20261019.json`.
- Galaxy A33: 기존 앱 다시 연결 후 신호 화면에서 Apple 자료 준비 요약·확인 항목·다음 필요 자료 실제 가시 텍스트 대조 PASS. 스크린샷 `docs/uiux/galaxy-readiness-summary-20261019.png` 시각 확인. 기존 앱/데이터 보존, 재설치 없음. 이번 새 기능의 기기 연결실패 강제 주입은 NOT RUN.
- iOS Simulator(iPhone17) 실제 WKWebView: 준비 요약/API 확인 항목·TTM/배수·6화면·연결실패/복구·펼침 보존·글자확대 포함 10개 판정 PASS. `ios-readiness-summary-20261019.json`. iPhone15 실기기는 NOT RUN.
- `node scripts/run-master-qa.mjs`: 회귀781 PASS / Android 계약3 PASS / 실패0 / 스킵0. 영수증 `master-qa-20261019121544417.json`. `node --check public/app.js`, `git diff --check` PASS. iOS 로컬 빌드 PASS.
- 변경: src/v2/research_readiness.js, current_candidate_detail.js, current_validation.js; public/app.js, styles.css; test/research_readiness.test.js, candidate_ui.test.js; ios/App.swift, verify-result.py 및 본 보고서/개발 로그.
- 실제 주문 경로 호출 없음. 실거래 OFF 유지. 신규 금융 증빙 확보나 PBR 유효 표본 증가를 이번 UI 완료로 주장하지 않음.
- 다음: 동일일 가격·주식수와 전체 기업행동 공식 근거 확보 시 항목별 검증 상태 연결. 현재 가격/주식수 항목은 관측 인벤토리이며 모든 검증 범위를 통과한 증빙 입력의 자동 승격은 미구현. 추천 조건 완화 금지.
- Overall PARTIAL.

---



# 자료별 기준일·출처 연결 — 2026-10-19 KST

- 기준 브랜치 `auto/kstock-development-20260930`, 커밋 `ea40685`. 기존 미커밋 변경 보존. 로컬 서버만 반영(PID81123 /127.0.0.1:3000), 공개 배포 없음.
- readiness 항목에 재무 기간/관측일/통화/단위/원천 URL 배열 추가. TTM의 실제 scopeSources를 중복 제거하여 연결. 관측 가격/주식수는 OBSERVED_NOT_VALIDATED로 구분하며 투자 검증 완료로 승격하지 않음.
- HTTPS 공식 SEC·기존 가격 제공자 문서만 링크로 허용. 사용자정보·쿼리 포함 주소, 실행형 URL·외부 임의 호스트 차단. 기존 가격 문서 #daily/#splits 앵커 보존. 링크 열기나 원문 재수집은 이번 검증에서 실행하지 않음.
- Web ‘자료별 기준일·출처 보기’에 확인된 항목과 부족 항목을 모두 표시. 재무 기간과 관측 기준일을 구분하고 미확보 원천은 명시. Worker 저장 캐시 v10으로 갱신.
- 실제 API: AAPL/MSFT 매출·현금흐름 각각 원천 링크8개, NVDA 현금흐름8개, MSFT/NVDA 관측 주식수 각1개. Apple 가격 공식 제공자 문서 링크 확인. 이는 새 금융 자료 확보 수가 아니라 기존 저장 근거의 연결 수임.
- Chrome 실제 320/390/768/1440px: 넘침 없음, 재무 기간/출처 표시, 기존 TTM/배수 정보, 새로고침 후 펼침 상태 보존 PASS. 증거 `readiness-sources-ui-20261019.json`, `readiness-sources-api-20261019.json`.
- `node scripts/run-master-qa.mjs`: 회귀785 PASS, Android 계약3 PASS, FAIL0/SKIP0. 영수증 `master-qa-20261019122627697.json`. 구문·diff 검사 PASS. 추가 테스트는 출처 제한/중복 제거/공식 앵커/관측일 구분 및 UI 계약.
- Galaxy A33/iOS Simulator/iPhone 실기기의 이번 출처 펼침 변경 검증은 NOT RUN. 이전 자료 준비 요약의 PASS와 구분. 설치/데이터 변경 없음.
- 수정: src/v2/research_readiness.js, current_validation.js; public/app.js; test/research_readiness.test.js, candidate_ui.test.js 및 본 보고서/AUTO_DEV_LOG.
- 추천·삼성전자성과·Apple순위 HOLD, 실거래 OFF 유지. 실제 주문 경로 호출 없음. 자동수집 설정·인증·유료서비스 변경 없음.
- 남은 조건: 공식 동일일 주식수·전수 기업행동·귀속 자본 등 금융 증빙 미충족. 출처 연결만으로 추천이나 기업가치 검증 완료를 주장하지 않음.
- 다음: 모바일의 출처 펼침·외부 링크 전환/복귀·상세 상태 보존을 확인. Overall PARTIAL.

---



# 검색·기업/인물 탐색·실제 에이전트 보고 통합 개발 — 2026-10-19 KST

## 구현 범위

- 브랜치 `auto/kstock-development-20260930` / 기준 커밋 `ea40685`. 기존 사용자 변경 보존. 새 Worker를 만들지 않고 기존 저장 상태와 Scheduler API를 재사용.
- 신호 화면: 기업/코드/신고 인물 검색, 매출 TTM 확인/부족 필터, 표시/전체 건수, 조건 초기화, 빈 결과 안내 추가. 전체 후보 수와 과거 연구 사례는 필터 결과와 구분. 검색어는 현재 화면 메모리에만 보존하며 새 서버 전송/영구 저장 없음.
- 홈: 후보 요약은 최대3개와 짧은 보류 사유로 정리. ‘근거 보기’에서 선택한 기업의 신호 카드로 이동하고 선택 표시. 과거 연구 카드 선택은 연구 상세로 이동. Microsoft 음의 초과수익 연구 보존.
- 인물: 공식 발언/행동에 명시된 기업만 관련 후보로 연결. 기업·기관 행동을 인물 개인 거래로 추정하지 않음. 실제 버핏 발언의 AAPL 연결 확인, 기업 관계가 없는 파월 자료에는 기업 버튼을 임의 생성하지 않음. 정확히 연결된 actorId/personId에 한해 후보→인물 버튼 제공.
- 에이전트: 저장 작업 영수증을 읽기 전용 `runReport`로 제공. 마지막 완료/확인·단계별 상태·최대5개 최근 완료 기록·안전한 실패 사유·재시도 시각 표시. 종료 후 남아 있는 오래된 실패 사유 숨김. 완료 단계 수·투자 신호·회귀 실행을 구분하고 단계/원인은 한국어로 표시. 테스트 결과를 자동 보고에서 조작하지 않음.
- 검색·선택 기업·연구 기간·펼침 상태를 갱신/실패/복구 동안 유지. 필터 초기화 시 검색창으로 키보드 포커스 이동. 터치 입력 최소44px.

## 실제 검증

- Chrome 320/390/768/1440px × 라이트/다크 총8조합: 넘침 없음, 검색창48.375px. NVDA검색→매출TTM필터 빈 결과→초기화→MSFT선택/펼침→강제 네트워크 실패→복구 흐름 PASS. MSFT 검색어와 자료 펼침 유지, 과거 음의 연구 보존. 버핏→AAPL 후보 연결 PASS.
- iPhone17 iOS Simulator 실제 WKWebView: 기존 TTM/출처/6화면/글자확대/연결실패·복구에 검색·상태필터·초기화·실제 작업보고를 추가한 11개 판정 PASS. iPhone15 실기기는 NOT RUN. 음성 기능 활성화 없음.
- Galaxy A33: 기존 앱 재연결과 실제 NVDA 입력, 표시1/전체3개 확인. 초기화 버튼의 실제 가시 영역 [707,1275,1020,1407]에서 입력 해제 및 표시3/전체3개 복원 PASS. 초기 QA 좌표가 하단 메뉴와 겹친 문제는 실측 후 재검증했으며 앱 결함으로 판정하지 않음. APK 재설치나 저장자료 삭제 없음. 이번 신규 인물 탐색·운영 보고·강제 네트워크 차단의 Galaxy 개별 검증은 NOT RUN.
- 최종 `node scripts/run-master-qa.mjs`: 회귀789 PASS / Android 계약3 PASS / FAIL0 / SKIP0. 영수증 `master-qa-20261019124043669.json`. 구문·diff 검사 PASS, iOS 빌드 PASS.
- 로컬 서버 PID81986 /127.0.0.1:3000. Scheduler 활성, 조회 순간 Worker idle. 최근 완료 영수증2026-10-19T09:03:47.114Z, API 조회의 다음 실행2026-10-19T13:05:58.050Z. 서버 실행을 실제 계속 실행 중인 작업으로 과장하지 않음. 기존 수집 설정 유지, 운영 배포/LAN 공개 없음.

## 기록·제한

- 증거: `workspace-bundle-20261019.json`, `workspace-report-api-20261019.json`, `ios-workspace-bundle-20261019.json`, `galaxy-workspace-bundle-20261019.json` 및 Galaxy 스크린샷.
- 수정: public/index.html, app.js, styles.css; src/v2/research_run_report.js, research_automation.js; test/research_run_report.test.js, candidate_ui.test.js; ios/App.swift, verify-result.py 및 본 보고서/AUTO_DEV_LOG.
- 추천·삼성전자 성과·Apple 순위 HOLD, 실거래 OFF. 이번 실제 주문 경로 호출 없음. 공식 금융 증빙·유효 표본 증가나 전략 예측력 검증 완료를 주장하지 않음.
- 다음: 보고/인물 탐색의 Galaxy 나머지 동작 검증, 현재 후보와 실제 시장 반응의 추가 공식 근거 확보. 전체 PARTIAL.

---



# 첫 체험 동선·Galaxy 인물/보고 QA 마무리 — 2026-10-19 KST

- 브랜치 `auto/kstock-development-20260930`, 커밋 `ea40685`. 기존 사용자 변경 보존. 서버 PID81986의 기존 로컬 실행을 유지, 공개 배포/재설치/설정 변경 없음.
- 홈에 ‘처음 사용하기 · 지금 볼 수 있는 기능’ 접이식 안내 추가. 종목 검색→기준일/출처, 인물→명시된 기업, 에이전트→실제 저장 보고로 연결. 첫 화면을 장문으로 채우지 않도록 기본 접힘. 터치 링크44px 이상, 기존 색상 토큰 사용.
- 로컬 체험 안내 `docs/KSTOCK_LOCAL_TRIAL.md` 추가. Mac 브라우저 `http://127.0.0.1:3000/`, 기존 Galaxy 앱/USB/서버 조건과 예시 분석 버튼의 구분 설명. 연구 화면 체험 가능과 검증된 추천 가능 시점을 구분. 추천 출시일은 미확정이며 새벽 실행 횟수만으로 충족하지 않음을 명시.
- Web 실제 4화면폭×라이트/다크 기존 묶음 검증 유지, 첫 안내의 3개 링크가 실제 화면으로 이동하고 새로고침 후 안내 펼침 유지 PASS. `trial-first-use-web-20261019.json`.
- Galaxy A33 실기기: 버핏 선택→AAPL 관련 후보 이동 PASS. 첫 안내 펼침→에이전트 보고 이동 PASS. 보고 제목·실제 완료/최근 확인 시각·단계 수를 가시 영역에서 스크린샷 확인 PASS. 검증 후 앱 홈으로 복귀. `galaxy-trial-ready-20261019.json`, `galaxy-trial-agent-report-detail-20261019.png` 등.
- iPhone17 Simulator 실제 WKWebView: 첫 안내 경로 추가 포함12개 판정 PASS. iPhone 실기기의 신규 안내 검증 NOT RUN. VoiceOver/음성 활성화 없음.
- `node scripts/run-master-qa.mjs`: 회귀789 PASS / Android 계약3 PASS / FAIL0 / SKIP0. 영수증 `master-qa-20261019130900429.json`. iOS 빌드·구문·diff 검사 PASS. 안내 문구만 반영하는 단위 테스트를 중복 추가하지 않음.
- 변경: public/index.html, public/styles.css, ios/App.swift, ios/verify-result.py, docs/KSTOCK_LOCAL_TRIAL.md, 본 보고서/AUTO_DEV_LOG. 검증 산출물 별도 저장.
- 실거래 OFF, 추천·삼성전자 성과·Apple 순위 HOLD. 이번 실제 주문 경로 호출 없음. 새 외부 수집이나 유료 사용을 활성화하지 않음.
- 전체 PARTIAL. 연구·자료 확인용 로컬 체험 가능. 동일일 주식수·기업행동·귀속 재무·비교기업·위험·충분한 사후 표본 등 추천 선행 조건은 여전히 미충족. 첫 체험 검증을 추천 출시 완료로 간주하지 않음.
- 다음: 실제 사용 피드백을 화면별로 반영하고 승인된 금융 증빙 수집/검증의 차단 원인을 개선. 단기 UI 날짜 약속을 추천 출시 약속으로 제시하지 않음.

---



# 매수·매도 모의 판단 엔진/API/화면 — 2026-10-19 KST

## 승인과 실제 범위

- 사용자 승인: 매수·매도 추천 기능 개발. 실제 주문·계좌 변경·유료API·공개 배포 승인은 적용하지 않음.
- 브랜치 `auto/kstock-development-20260930`, 기준커밋 `ea40685`. 기존 미커밋 작업 보존. 현재 적용 대상은 기존 현재 코호트 AAPL/MSFT/NVDA.
- 새 `trade_recommendations.js`: BUY/SELL/WATCH/INSUFFICIENT_DATA 분기. 검증된 데이터 조건을 먼저 확인하고 기존 위원회 점수와 대사. 모의 판단 전용이며 SELL은 보유 종목 축소 검토, 공매도/주문 지시 아님.
- 자료 부족을 낮은 점수나 매도로 변환하지 않음. 공식 원문/D2·가격·연속 재무·가격일 정렬·배수·주식수/기업행동·배수별 동종/과거3표본·종합위험·지표 최신성/완전성·독립 검토 확인. 단순 승인/테스트 PASS를 금융 증빙으로 사용하지 않음.
- 기존위원회50 매수 경계를 재사용.35 매도 경계 등은 신규 실험 정책이며 성능 검증 없음. 새 정책은 `docs/KSTOCK_TRADE_RECOMMENDATIONS.md`에 명시. 목표가/기대수익/승률 null, 보장 수익 주장 없음.
- 유효 기한은 생성 후 최대24시간과 지표/가격 최신성 종료 중 빠른 시각. 만료되거나 생성시각이 미래면 UI에서 방향성 판단 비활성화. 활성 화면은 기존30초 갱신을 재사용.
- GET `/api/v2/recommendations`: 실제 종목 결과와 별도 RULE_SIMULATION 예시3개 제공. 가상 조건에 실제 종목명/공식근거를 꾸며 넣지 않음. 예시를 실제 추천 집계에 포함하지 않음.
- 홈/전체메뉴에 ‘매수·매도 판단’ 추가. 종목별 판단·기준일/가격·만료·근거/위험/부족 조건·후보 상세 연결·상태 필터·실패/복구 표시. 저장 검증 Worker 캐시 v13, 결과에 종목별 판단 저장. 기존 보고서의 실제 signals/위원회/검토 입력을 API로 보존하고 향후 생성 보고서에도 signals 저장. 검증된 평가배수 입력 계약 연결, 미검증 관측을 검증 완료로 승격하지 않음.

## 현재 실제 결과 — 추천 출시 완료 아님

- 실제 API AAPL/MSFT/NVDA 모두 `INSUFFICIENT_DATA`.
- 실제 BUY0 / SELL0 / WATCH0 / 자료부족3. 가상 예시 BUY1/SELL1/WATCH1은 별도 규칙 시험이며 실제 종목 추천이 아님.
- AAPL 최종조회 부족조건7개, MSFT11개, NVDA12개. 가격/재무 정렬 여부는 별개이며 MSFT의 확인된 TTM을 가격 부재 때문에 미확인으로 되돌리지 않음. 개별 체크는 실제 API 영수증 참조.
- 동일일 주식수·전체 기업행동·귀속 재무/배수·비교 표본·종합 위험·완전한 최신 지표·검토가 아직 부족함. 각 증빙을 생산하는 upstream 수집/검증은 이번 엔진이 대신 만들어내지 않음. 기존 Apple 순위·삼성전자 추천/성과 HOLD 유지.

## 실제 검증

- `node scripts/run-master-qa.mjs`: 회귀798 PASS / Android 계약3 PASS / FAIL0 / SKIP0. 영수증 `master-qa-20261019132145108.json`.
- 단위검증: 완전한 고정 fixture의 BUY/SELL/WATCH, 누락/정정/미래/오래된 자료 차단, 점수 대사, 기존 표본 기준, 실주문 비활성, 데이터/모의 예시 분리, 가격부재와 회계기간 구분, 유효기한/만료.
- Chrome 실제 4화면폭×라이트/다크8조합: 넘침 없음. 실제API3종목/예시 분리, SELL필터 빈결과, 상세 보존, 네트워크 강제차단/복구 PASS.
- iPhone17 Simulator 실제WKWebView: 신규 판단/API대조·필터·예시분리·주문차단 포함13개 판정 PASS. iPhone15 실기기 신규검증 NOT RUN.
- Galaxy A33 실제앱: 홈→판단화면, 실제 종목 자료부족, 자료부족≠매도 안내, 별도 가상규칙 펼침 PASS. 예시 위치 및 실제 종목 카드 스크린샷 확인. 신규 판단화면의 Galaxy 강제 네트워크 차단/복구는 NOT RUN(자동/UI계약 및 Web에서는 수행).
- iOS 로컬빌드, JS구문, git diff 공백검사 PASS. 실제 주문 경로 호출 없음. 기존 서버 실거래OFF/브로커OFF/외부접속차단 유지. 최종로컬 PID88662,127.0.0.1:3000. 운영 배포 없음.

## 파일과 다음 작업

- 변경: src/v2/trade_recommendations.js, current_research.js, current_candidate_detail.js, current_validation.js, research_automation.js, influence_service.js, orchestrator.js; public/index.html,app.js; test/trade_recommendations.test.js,candidate_ui.test.js; ios/App.swift,verify-result.py; 정책/체험 문서와 본 보고서/개발 로그.
- 증거: `trade-recommendations-api-20261019.json`, `trade-recommendations-web-20261019.json`, `ios-trade-recommendations-20261019.json`, `galaxy-trade-recommendations-20261019.json` 및 Galaxy 스크린샷.
- 다음: 실제 추천0개를 해소할 공식 주식수/기업행동/귀속 재무·비교 표본·종합위험의 검증 입력 확보와 독립 표본 정책 평가. 승인 없이 조건을 임의 완화하거나 예시를 실제 추천으로 바꾸지 않음.
- Overall PARTIAL: 모의 판단 엔진·화면 구현 및 검증 완료, 실제 검증된 추천 종목 확보는 미완료.

---



# 실제 증빙 연결 복구 · Apple 주식수 · NVIDIA 가격 확보 — 2026-10-19 KST

## 실제 해결

- 브랜치 `auto/kstock-development-20260930` / 기준커밋 `ea40685`. 기존 미커밋 변경 보존. 추천 기능의 원천 부족을 조사하여 캐시/대기열 결함을 수정.
- Apple 기존 VERIFIED 원문 캐시는 shareRecords 필드 추가 이전 자료였으나 원문 범위 검증이 있으면 무조건 반환하여 주식수 추출이 실행되지 않았음. 기존 flow/범위 증빙을 보존하고 누락 주식수만 보강하는 경로 추가.
- 공식 SEC Apple 최신 원문1건 읽기(HTTP200), 기존 SHA-256과 정확히 일치. 저장 원문을 offline hash-bound backfill로 재사용(추가 HTTP0). 기존 Worker는 남은 Apple 원문3건만 보강(HTTP3). 총4공시에 관측 주식수 보존.
- 최신 Apple 관측값: **2026-07-17 /14,594,180,000주**, `decimals=-3`, SHARES 단위. 전체 보통주 클래스/정확한 가격일 대사는 미확인으로 유지. 보고 정밀도와 관측일을 API/상세에 표시하며 오늘 가격과 곱하지 않음.
- 원문 해시/공식 URL/발행인/주식 단위/유효일 확인, 다른 원문/잘못된 단위/미래 관측/소스 변경 차단. SEC 인증 차단 시 큐 중단과24시간 재조회 방지. 완료 후 다시 같은 보강을 실행하지 않음.
- 가격 수집은 캐시가 유효한 먼저 선택된 기업 때문에 대기 종료된 다른 기업을 조회하지 못할 수 있었음. 실제 due 기업만 선택하도록 수정. 성공은24시간 캐시 유지, 일시 통신 오류는 제한된 백오프, 공급자 제한·API 키/상태 오류는 별도 대기. 기존 공급자 cooldown/일일20요청 한도를 지우거나 우회하지 않음.
- 공급자 대기 종료 전 CLI 실행은 외부 요청0건. **2026-10-19 22:37:30 KST** 이후 due였던 NVDA를 실제 조회(가격/분할 합계HTTP2). **2026-10-16 종가214.13 USD /원주가 /READY** 확보. 분할 응답은 unavailable로 기업행동 INCOMPLETE 유지. Apple343.46 USD와 함께 현재 가격 연결2기업, MSFT 가격 부족은 유지.
- 새 가격으로 기존 Worker 실행: NVDA1기업 재평가/다른2기업 재사용. NVDA latestPrice 조건 false→true. 기존 flow/정정 근거와 HOLD 기록 보존.

## 구현/표시

- `sec_share_backfill.js`, `scripts/backfill-sec-shares.mjs`: 기존 원문 해시를 대조하는 읽기 자료 보강. 원본 재작성/삭제 없음.
- `market_collection_due.js`: 기업별 due·백오프·provider cooldown 계산. 기존 Collector/Scheduler 재사용, 새 자동 경로/타이머 활성화 없음.
- 가격 nextRetryAt을 저장/API에 전달하고 UI에서는 ‘재조회 가능 시점’으로 표시. 성공 보장 시각으로 표현하지 않음. 원문 숫자를 요약에서 바로 확인하도록 관측값/단위/정밀도 표시, 여러 원문 링크는 별도 펼침으로 정리.
- `sec_scope_collection.js`, `sec_xbrl_scope.js`, `current_market_collection.js`, `official_research_collection.js`, `current_candidate_detail.js`, `research_readiness.js`, `current_research.js`, `trade_recommendations.js`, `influence_service.js`, `current_validation.js(v15)`, `public/app.js`, 관련 CLI/테스트/iOS 검증 및 본 문서/개발로그 변경.

## 실제 검증

- 외부 수집 API HTTP6건: 수동 SEC원문1 + 기존 Worker SEC원문3 + Alpha Vantage2. 원문 조회/검증 시점·URL/해시/숫자와 가격 응답은 `data/v2/verification/current-collection/evidence-unblock-20261019.json`. 공식 API 문서 웹 검색은 별도 실시했으며 SPLITS 실패를 임의로 요금제 문제라고 단정하지 않음.
- `node scripts/run-master-qa.mjs`: 회귀805 PASS / Android 계약3 PASS / FAIL0 / SKIP0. 최종 영수증 `master-qa-20261019133855644.json`.
- Chrome 실제 4폭×2테마: 넘침 없음, Apple 관측값/기준일/정밀도 일치, 새 가격의 판단/API, 가상 예시 분리/실패복구 PASS. `evidence-unblock-web-20261019.json`.
- Galaxy A33: 실제 Apple 숫자·날짜·정밀도·‘평가 입력 검증과 별도’ 문구의 가시 영역 확인 PASS. `galaxy-apple-share-backfill-20261019.json` 및 스크린샷. 이번 NVIDIA 가격값의 Galaxy 별도 시각 대조는 NOT RUN.
- iPhone17 Simulator: 실제 WKWebView에 관측 주식수/API 대조를 추가하여14개 판정 PASS. iPhone15 실기기는 NOT RUN. 음성 활성화/데이터 삭제/재설치 없음(Galaxy 기존 앱 유지, iOS Simulator만 업데이트).
- 실제 주문 경로 호출 없음. 실거래/브로커 OFF, 외부 접속 비활성, 서버127.0.0.1:3000 PID91671. 유료서비스·인증 변경·운영 배포 없음.

## 미완료/다음

- 실제 BUY0 / SELL0. AAPL/MSFT/NVDA INSUFFICIENT_DATA 유지. 주식수 관측 복구와 가격 READY는 평가/추천 전체 통과가 아님.
- 동일 가격일 주식수 연속 대사, 전체 기업행동과 적용일, 공통 귀속 재무/배수, 비교 표본 및 종합 위험 검증이 남음. NVIDIA 매출/순이익 직접분기/누적 차이도 여전히 보류. 국내 SK1014주/DB9건/PBR 표본 이슈는 이번에 해결로 변경하지 않음.
- 다음: 현재 공급자 대기를 준수하며 MSFT 가격과 기업행동 공식 자료 확보, 가격일과 일치하는 주식수 연결 및 실제 위험 검증. 기존 Apple 순위·삼성전자 추천/성과 HOLD 유지.
- Overall PARTIAL: 실제 원천 누락·대기열 결함 해결 및 추가 가격 확보, 검증된 실제 추천은 미확보.

---



# 위험 검토 근거 연결 및 미확인 값 처리 개선 — 2026-10-19 KST

- 기준 브랜치 `auto/kstock-development-20260930`, 커밋 `ea40685`. 기존 사용자 변경과 Apple/SEC 자료 보존. 안전한 로컬 구현만 수행.
- 기존 Risk Agent가 누락 위험 값을 0으로 처리하는 문제 수정: 누락은 available=false, severity/riskPenalty=null. 숫자 검사와 공식 근거를 갖춘 종합 위험 검토를 구분.
- `src/v2/current_risk_review.js`: 재무·규제/법적·지배구조·평가·자료 최신성 5개 영역의 검토 계약. 기업/문서/SEC URL/해시, 검토 시각, 공개 시점, 최근 관측기간을 검증. 동시 충돌과 최신 미해결 검토는 차단. 원문 존재만으로 위험 없음이나 종합 검토 완료로 처리하지 않음.
- `src/v2/sec_risk_notes.js`: SEC XBRL 부채·자본·우발채무 주석의 발행인/기간/범위 확인 및 해시·길이·출처 저장. 원문 본문이나 비밀값은 UI/로그에 출력하지 않음.
- 기존 hash-bound backfill 및 Collector에 연결. Apple은 저장 원문 재사용(수동 외부 요청0), 기존 Worker가 MSFT/NVDA 최신 원문2건 읽기. 이번 확인 시 공식 주석 AAPL3/MSFT2/NVDA3개. 이는 OBSERVED_NOT_REVIEWED이며 위험 점수로 추정하지 않음.
- 선택적 `current-risk-reviews.json` 입력을 기존 연구/Validation Worker에 연결, v16 의존성 해시로 해당 기업만 재검증. 검토 완료 자료를 임의 생성하지 않음. 기존 30분 Scheduler 유지, 새 외부 수집 경로 활성화 없음.
- 모의 판단에서 위험 점수 불일치와 알려진 중대 위험의 BUY 발행을 차단. 위험/비교 표본 변경을 판단 지문에 포함해 변경 추적.
- Web 상세에 영역별 부족 상태, 공식 주석 기간/출처 및 ‘위험이 없다는 의미는 아닙니다’ 안내. 원문 확보와 종합 검토 완료를 구분.

## 검증 결과

- `node scripts/run-master-qa.mjs`: **회귀816 PASS / Android 계약3 PASS / FAIL0 / SKIP0**. `data/v2/verification/master-qa/master-qa-20261019135402773.json`.
- `git diff --check` PASS. 고정 fixture로 미래/오래된 검토/해시 불일치/충돌/미확인 위험/주석 추출/기업별 변경 재검증/중대 위험 BUY 차단 검증. 테스트의 VERIFIED fixture는 실데이터가 아님.
- Chrome 실제 로컬 API: 320/390/768/1440px × 라이트/다크 8조합 넘침 없음. 실제 종목/API 상태 일치, 매도 빈 결과, 가상 예시 분리, 연결 실패·복구 및 상세 펼침 보존 PASS. `data/v2/verification/frontend-redesign/risk-review-web-20261019.json`.
- Web에서 실제 위험 주석 수3/2/3, 5영역 자료 부족, severity=null 대조 PASS. Galaxy A33 및 iPhone의 **이번 신규 위험 상세 실기기 확인 NOT RUN**. 기존 기기 검증 결과를 이번 검증으로 재사용하지 않음.

## 현재 상태와 다음 작업

- 실제 BUY0 / SELL0, AAPL/MSFT/NVDA 모두 INSUFFICIENT_DATA. 공식 주석 확보는 종합 검토의 대체가 아님. 현재 5개 영역의 실제 완료 검토 자료는 없음.
- 가격일 주식수·기업행동 대사, 귀속 범위가 확인된 평가배수, 비교 표본, 최신 독립 분석 근거가 계속 필요. 기존 국내 SK1014주/DB9건/PBR 문제 해결로 표시하지 않음.
- 실거래/브로커 OFF, 이번 작업 실제 주문 호출 없음. 추천·삼성전자 성과·Apple 순위 기존 HOLD 유지. 운영 배포/인증 변경/데이터 삭제 없음.
- 다음: 공식 주석의 구체적인 재무 수치와 위험 항목 검증, 가격일 주식수/기업행동 대사, 신규 위험 상세 Galaxy/iOS 화면 검증. 검증된 영역만 단계적으로 연결하고 누락을 0으로 바꾸지 않음.
- Overall: **PARTIAL** — 위험 근거 전달 및 미확인 처리 결함 수정 완료, 실제 추천의 필수 자료 부족은 유지.

---



# 연간 재무 대사·위험 비율 실제 연결 — 2026-10-19 KST

- 기준 ea40685 / auto/kstock-development-20260930. 기존 미커밋 자료 보존, 로컬 서버만 기존 OFF/루프백 설정으로 재시작(PID96007). 운영 배포 없음.
- `src/v2/financial_risk_screen.js` 추가: SEC Company Facts 발행인 URL·저장 해시, 공개일/조회일, USD 단위, 연간 기준 및 유효기간 확인. 자산−부채=자본이 정확히 일치할 때만 총부채/자산·총부채/자본 계산. 누락·불일치·미래자료·잘못된 단위·비양수 분모는 차단. 반올림 차이를 임의 허용하지 않음.
- 기존 SEC 정규화는 같은 접수번호·같은 결산일의 USD instant 항목을 선택함을 코드에서 확인. 연간 수치를 TTM과 혼합하지 않음. 관측 재무 대사는 종합 위험 검토/신용등급/매수추천이 아님.
- 저장 공식 자료 재사용, 이번 수동 외부 수집0. AAPL: 2025-09-27 자산359241/부채285508/자본73733 백만USD, 총부채/자산79.48%, 총부채/자본3.87배. MSFT: 2026-06-30 758376/315989/442387 백만USD, 41.67%/0.71배. NVDA: 2026-01-25 206803/49510/157293 백만USD, 23.94%/0.31배. 최신 분기 수치라고 표시하지 않음.
- 상세 API `risk.financialScreen` 및 Web 공통 화면 연결. 수치마다 USD·결산 기준일 표시, SEC 원천 링크 제공. 총부채와 이자부 차입금의 차이 및 판단 한계 안내. Validation 버전 v17로 저장 근거 재평가.
- 변경: 위 신규 모듈, current_candidate_detail.js, current_validation.js, public/app.js, test/financial_risk_screen.test.js 및 QA/개발 로그.
- `node scripts/run-master-qa.mjs`: 회귀819 PASS / Android 계약3 PASS / FAIL0 / SKIP0. `master-qa-20261019140122068.json`. 구문 검사와 git diff --check PASS.
- Chrome 실제 API/Web 대조: 3기업 재무 대사와 비율 응답, Apple 실제 수치 표시 PASS. 4폭×2테마 넘침 없음, 연결 실패/복구·상세 보존 PASS. `data/v2/verification/frontend-redesign/balance-screen-web-20261019.json`.
- iPhone 신규 화면 검증 NOT RUN. Galaxy 결과는 아래 별도 기록. 이전 실기기 결과를 재사용하지 않음.
- 실제 BUY0/SELL0, 종합 위험 5영역 자료 부족 유지. 주식수·기업행동·배수/비교표본 부족도 유지. 실거래/브로커 OFF, 이번 실제 주문 호출0. 기존 Apple 순위·삼성전자 추천/성과 HOLD.
- 다음: 최신 분기 재무 대사 근거 확장 및 가격일 주식수·기업행동 대사. 계산 비율만으로 추천 제한을 해제하지 않음.
- Overall PARTIAL: 실제 재무 수치 화면 연결 완료, 추천에 필요한 전체 검증은 미완료.

---


- Galaxy A33: 기존 앱 실행 및 USB 로컬 연결 준비는 수행했으나 현재 앱의 네이티브 버튼 위치가 기존 QA 스크립트와 달라 상세 진입 실패. 설정값은 저장/변경하지 않고 창 취소. 신규 재무 수치의 실기기 대조 NOT RUN. 영수증 `galaxy-balance-screen-20261019.json`에 TARGET_NOT_VISIBLE 기록.


# Galaxy 재무 상세 실제 검증 완료 — 2026-10-19 KST

- 브랜치 auto/kstock-development-20260930 / 기준 ea40685. 저장소/remote/사용자 변경과 AGENTS·공통 compliance 확인. 로컬 USB 기기 및 루프백 API만 사용, 배포·삭제·인증 설정 변경 없음.
- `scripts/galaxy_financial_detail_qa.py` 추가. 고정 버튼 좌표 대신 현재 접근성 트리의 텍스트/설명을 조회. 전경 앱 일치 확인, 화면 밖/0높이/하단 메뉴 겹침 요소 거부, 제한된 스크롤 후 실패 기록. 기존 설정창이나 다른 앱 입력 금지. 기존 앱/사용자 데이터 보존.
- Galaxy A33 실제 PASS: 서버 연결→신호→공식 근거 상세→영역별 위험 검토. Apple 자산359,241,000,000 USD·부채285,508,000,000 USD·자본73,733,000,000 USD, 기준2025-09-27, 총부채/자산79.48%·총부채/자본3.87배 가시 영역 확인. 현재 API 수치와 대조 일치. 공식 원천 링크와 종합 검토 자료 부족/연간 수치 한계 안내를 스크린샷에서 확인. 링크 클릭 후 외부 브라우저 검증은 하지 않음.
- 증빙: `data/v2/verification/frontend-redesign/galaxy-financial-detail-20261019.json`, `docs/uiux/galaxy-financial-detail-20261019.png`. 이전 NOT RUN 기록은 과거 사실로 보존하고 이번 별도 검증에서 PASS 처리. 이번 iPhone·MSFT/NVDA 실기기 대조·신규 연결 실패복구 NOT RUN.
- `test/galaxy_foreground.test.js`: 전경 앱 보호 및 가시 영역 판정 회귀 검증. `node scripts/run-master-qa.mjs`: 회귀820 PASS / Android 계약3 PASS / FAIL0 / SKIP0. `master-qa-20261019140757155.json`. git diff --check PASS.
- 변경 파일: 위 QA 스크립트, 테스트, 실기기 영수증/스크린샷, 본 보고서와 AUTO_DEV_LOG. 신규 금융 데이터 외부 수집0, 실제 주문 호출0, 실거래/브로커 OFF 유지. 추천·삼성전자 성과·Apple 순위 HOLD 유지.
- 다음: 검증 완료된 모바일 표시를 바탕으로 최신 분기 재무 대사와 가격일 주식수·기업행동 근거 확장. 추천의 필수 자료 부족은 그대로 유지.
- Overall PARTIAL: 신규 Galaxy Apple 재무 상세 실기기 검증 완료, 전체 추천 검증 미완료.

---



# 10-Q 잔액 대사 및 공식 재수집 — 2026-10-19 KST

- 기준 ea40685 / auto/kstock-development-20260930. AGENTS/compliance 및 Git 상태 확인, 기존 변경·Apple SEC 근거 보존. 로컬 서버 재시작 PID1898, 루프백/실거래 OFF 유지.
- `sec_interim.js`: Assets/Liabilities 추가. 같은 공시 접수번호·공시일·결산일·USD instant 값만 채택. 기간 실적/누적 실적을 잔액으로 사용하지 않음. 충돌/정정은 기존 차단 유지.
- `financial_risk_screen.js`: INTERIM_INSTANT와 연간 관측을 구분. `current_candidate_detail.js`에서 세 잔액 필드의 기준일·단위·통화를 일치시킨 경우만 전달. `risk.interimFinancialScreen` 추가, 종합 검토 상태를 자동 통과시키지 않음.
- 기존 금융 Collector normalizer v5 / Validation v18로 갱신. 승인된 기존 SEC CLI로 기업별 Company Facts 각1회, 총HTTP3건. 새 수집 경로나 인증 설정 활성화 없음. 원천 URL·SHA/조회시각/공시일은 current-financials.json 저장. 기존 연간/TTM/공시 자료 유지.
- 실제 대사: AAPL 2026-06-27 자산383266/부채275746/자본107520 백만USD, 총부채/자산71.95%. MSFT 2026-03-31 694228/279861/414367 백만USD, 40.31%. NVDA 2026-07-26 320272/91288/228984 백만USD, 28.50%. 모두 정확한 잔액 일치. Microsoft는 2026-06-30 연간 자료가 더 최근이며, 기존 화면의 최신 전체 실적 대체 금지 안내 유지.
- Web 위험 근거에 최근10-Q 대사를 연간과 별도로 표시. 금액/통화/기준일/공시일/공식 출처 제공. 실제 대사는 매수 추천이나 종합 위험 검토 완료가 아님.
- `node scripts/run-master-qa.mjs`: 회귀822 PASS / Android 계약3 PASS / FAIL0 / SKIP0, master-qa-20261019141004748.json. 분기 instant와 기간 실적 혼합 차단 추가 테스트. 구문 및 git diff --check PASS.
- 실제 Chrome API/Web: 세기업 분기 대사 상태/기준일/비율 확인, 새 항목 렌더링 PASS. 4폭×2테마 넘침 없음, 실패복구·상세 보존 PASS. 영수증 interim-balance-web-20261019.json. 이번 신규 10-Q 표시 Galaxy/iPhone 실기기 NOT RUN(이전 연간 실기기 PASS와 별도).
- 변경: sec_interim.js, financial_risk_screen.js, current_candidate_detail.js, current_financials.js, current_validation.js, public/app.js, 관련2테스트와 본문/개발로그, 공식 수집/검증 저장 결과.
- 실제 BUY0/SELL0 유지. 주식수·기업행동·배수/비교표본·영역별 종합 위험 검토 자료 필요. 추천·삼성전자 성과·Apple 순위 HOLD. 실거래/브로커 OFF, 이번 주문 호출0, 데이터 삭제/운영 변경 없음.
- 다음: 가격일과 일치하는 발행주식수 및 기업행동 연결 근거 검증, 신규 분기 상세 기기 확인. Overall PARTIAL.

---



# 가격일·주식수 기준일 대사 및 발행주식수 원문 연결 — 2026-10-19 KST

- 기준 ea40685 / auto/kstock-development-20260930. AGENTS/compliance·remote·기존 변경 확인, 자료 보존. 루프백 로컬 서버 PID2447, 외부 접속 비활성 유지.
- `extractCapitalShareRecords` 추가: SEC 원문 발행인·비분할 컨텍스트·instant 날짜·shares 단위 검증. 발행주식수/자기주식수/outstanding을 별개 정의로 저장. 세그먼트/다른 발행인/빈 숫자/nil/잘못된 단위 차단. 보고 decimals=-3은 관측 정밀도로 보존하며 정확한 수량으로 승격하지 않음.
- 기존 hash-bound backfill에 연결, 저장 Apple 원문 재사용하여 최신 원문1건 보강(외부요청0). 신규 원문 수집 시도 기존 Collector에 같은 추출 적용. 기존 캐시에 대한 무제한 추가 외부 조회는 도입하지 않음.
- 실제 SEC 0000320193-26-000020: 2026-06-27 발행14,608,963,000주 및 outstanding14,608,963,000주; 비교일2025-09-27 14,773,260,000주. 자기주식 항목은 추출되지 않아 자료 부족 유지(0으로 추정하지 않음). 기존 표지7월17일14,594,180,000주 관측 보존. 서로 다른 날짜의 차이를 특정 거래로 해석하지 않음.
- `share_date_review.js`: 가격일 이전에 관측·수집된 가장 최근 주식수와 가격일의 간격 계산. 같은 날짜에 다른 수량이면 충돌, 미래 관측 차단. 같은 날짜라도 정의/정밀도/종류/기업행동 검증 전 verifiedShares/marketCap=null 유지.
- 현재 API: AAPL7월17일→가격10월16일91달력일, NVDA56달력일 연결 필요. MSFT 가격 부족으로 대사 보류. 관측 간격은 거래일 수익률이 아님. 이 기간 전체의 공식 기업행동 및 효력일 검증은 아직 확보되지 않음.
- 공통 Web 상세 ‘가격일과 주식수 기준일 대사’ 추가. 가격·주식수 날짜, 부족 구간, 정의별 원문 수량/정밀도/출처 표시. Validation v19로 저장 검증 갱신. 기존 global valuation 조건 완화 없음.
- 변경: sec_xbrl_scope.js, sec_share_backfill.js, sec_scope_collection.js, scripts/backfill-sec-shares.mjs, share_date_review.js, current_candidate_detail.js, current_validation.js, public/app.js, test/share_date_review.test.js 및 본 보고서/로그·로컬 결과.
- `node scripts/run-master-qa.mjs`: 회귀826 PASS / Android 계약3 PASS / FAIL0 / SKIP0. 최종 master-qa-20261019141431772.json. 구문 검사/git diff --check PASS.
- 실제 Chrome/API: 날짜 간격91/56, Apple 정의별4관측, MSFT 부족 상태 및 렌더링 PASS. 4폭×2테마 넘침 없음, 연결 실패복구/상세 보존 PASS. share-date-web-20261019.json. 이번 신규 주식수 대사 화면 Galaxy/iPhone 실기기 NOT RUN.
- 실제 BUY0/SELL0, 추천·삼성전자 성과·Apple 순위 HOLD. 실거래/브로커 OFF, 이번 실제 주문 호출0. 운영 배포/유료 사용/인증 변경/데이터 삭제 없음.
- 다음: 공시별 발행·자기주식 변경과 실제 효력일을 가격일까지 연속 대사할 공식 근거 확보. 현재 추가 관측만으로 가격일 주식수를 재현하거나 추천을 허용하지 않음.
- Overall PARTIAL: 정의별 원문 관측과 날짜 부족 구간 표시 완료, 주식수 연속 대사/시가총액 검증은 미완료.

---



# 공식 자사주 매입·소각 기간 합계 연결 — 2026-10-19 KST

- 기준 ea40685 / auto/kstock-development-20260930. AGENTS/compliance/Git 확인. 기존 사용자 변경·원문·Apple/SEC 증빙 보존. 로컬 서버 PID3498, 루프백/실거래 OFF 유지.
- `extractShareCapitalFlows` 추가. SEC 원문 발행인, 비분할 컨텍스트, 기간 시작/종료, shares/USD 단위, 정수·nil을 검증해 매입·소각 보고 수량과 매입 현금 지급액을 분리 추출. 원문 보고 정밀도 보존. 기간 합계를 개별 거래일/효력일로 변환하지 않음.
- 기존 hash-bound backfill 및 새 원문 Collector 경로 재사용. 저장 Apple 원문 1건 보강, 외부 요청0. 원문 해시 28f986bb243c8fdd445560d381df4b57912ca290b03b8451ecd518e63cdb5d2b, SEC 접수0000320193-26-000020. 원문 링크는 API/영수증에 보존.
- 실제 보고 기간2025-09-28~2026-06-27: 매입·소각215,000,000주(decimals=-6), 매입 현금 지급62,094,000,000USD(decimals=-6). 전년 비교기간 현금70,579,000,000USD도 별도 보존. 수량과 현금 합계를 같은 이벤트로 합산하거나 나누어 평균 체결가격을 만들지 않음.
- 세 수치 모두 REPORTED_PERIOD_TOTAL, effectiveDate/transactionDate=null, bridgeEligible=false. 현재 가격까지의 주식수 연결 구간 밖 자료이므로 91일 공백을 해결한 것으로 처리하지 않음. 추가 수집 없이 실제 보고 자본 행동 근거를 API와 공통 Web 상세에 표시.
- 변경: sec_xbrl_scope.js, sec_share_backfill.js, sec_scope_collection.js, backfill CLI, current_candidate_detail.js, current_validation.js(v20), public/app.js, test/share_capital_flows.test.js, QA/로그 및 저장 증빙. 기존 평가배수/추천 조건 완화 없음.
- `node scripts/run-master-qa.mjs`: 회귀828 PASS / Android 계약3 PASS / FAIL0 / SKIP0. master-qa-20261019142455845.json. 구문/git diff --check PASS.
- Chrome 실제 API/Web:215,000,000주·기간·원문 정밀도 및 대사 미반영 안내 PASS. 4폭×2테마 넘침 없음, 연결 실패/복구·상세 보존 PASS. capital-flow-web-20261019.json. Galaxy 결과 별도 추가, iPhone 신규 화면 NOT RUN.
- 추천·삼성전자 성과·Apple 순위 HOLD, 실제 BUY0/SELL0. 실거래/브로커 OFF, 이번 실제 주문 호출0. 운영/유료/인증/삭제 변경 없음.
- 남음: 기준일 사이 기업행동의 실제 효력일 및 모든 주식수 변동 원인 확인. 보고 기간 합계만으로 발행/유통 주식수를 복원하지 않음. Overall PARTIAL.

---


- Galaxy A33 신규 화면 PASS:215,000,000주·보고기간·정밀도와 ‘개별 거래일·소각 효력일이 없어 대사 미반영’ 안내를 실제 가시 영역에서 확인. galaxy-capital-flow-20261019.json 및 docs/uiux/galaxy-capital-flow-20261019.png. 기존 앱/설정/사용자 데이터 유지.


# 같은 보고기간 주식수 순변동 대사 — 2026-10-19 KST

- 기준 ea40685 / auto/kstock-development-20260930. AGENTS/compliance/Git 상태 확인, 기존 변경과 원문 보존. 로컬 API/USB만 사용. 운영 변경/삭제/유료/인증 변경 없음.
- `share_period_reconciliation.js` 추가. 같은 원문 URL·SHA, 보통주 발행 수량 정의, 기간 시작 직전일/종료일의 잔액과 해당 기간 매입·소각 수량을 대조. 서로 다른 기간·원문·주식 종류·중복 충돌을 합치지 않음.
- 실제 Apple 접수0000320193-26-000020: 2025-09-27 14,773,260,000주 →2026-06-27 14,608,963,000주, 보고 순변동 -164,297,000주. 2025-09-28~2026-06-27 보고 매입·소각215,000,000주와 비교 시 +50,703,000주 미설명 순변동. 이는 산술 잔차이며 신규 발행·보상주식이라고 확정하지 않음. 시작/종료 decimals=-3, flow=-6의 보고 정밀도 유지.
- 잔차가0이어도 전체 변동 전수조사·효력일 검증 없이 완료로 표시하지 않음. exactReconciliationVerified=false/bridgeEligible=false/marketCap=null. 과거 기간의 산술 대사는 가격일까지의91일 공백 해소와 별도.
- `current_candidate_detail.js`에서 원문 관측과 대사 결과를 연결, Validation v21. Web 공통 상세에 보고기간·순변동·미설명 차이·원인 미확인 안내와 공식 링크 표시. 추정 수량·거래일 생성 없음. 외부 수집0, 저장 원문/수치만 사용.
- 변경: 신규 모듈, current_candidate_detail.js, current_validation.js, public/app.js, test/share_period_reconciliation.test.js, QA/개발로그 및 검증 영수증.
- Chrome 실제 API/Web: 미설명50,703,000주와 보류 상태 일치 PASS,4폭×2테마 넘침 없음, 연결 실패복구/상세 보존 PASS. share-period-web-20261019.json. iPhone 신규 화면 NOT RUN, Galaxy 결과 별도 기록.
- 실제 BUY0/SELL0, 추천·삼성전자 성과·Apple 순위 HOLD, 실거래/브로커 OFF, 이번 주문 호출0.
- 다음: 추가 변동을 설명하는 주식 발행·주식보상·원천징수 및 실제 효력일의 공식 자료 검증. RSU 권리확정 수량을 실제 신주 발행 수량으로 대신 쓰지 않음. Overall PARTIAL.

---


- 최종 자동 테스트: `node scripts/run-master-qa.mjs` 회귀831 PASS / Android 계약3 PASS / FAIL0 / SKIP0. master-qa-20261019143110152.json. 구문 검사·git diff --check PASS.

- Galaxy A33 신규 대사 화면 PASS: 순변동 -164,297,000주, 미설명50,703,000주 및 신규 발행·보상으로 추정하지 않는 안내를 실제 가시 영역에서 확인. galaxy-share-period-20261019.json / docs/uiux/galaxy-share-period-20261019.png. 기기 설정·앱 데이터 보존.

## 2026-10-19 — 보고기간 대사 입력 검증 강화

- share_period_reconciliation.js: accession 경로/문서 식별 및 안전 정수 잔차 검증. test/share_period_reconciliation.test.js 회귀 2개 추가.
- 회귀833 + Android3 PASS, 최종 대상5 PASS, diff check PASS. Android 소켓 제한은 권한 확보 재실행으로 해소.
- 실제 미설명50,703,000주 원인 확인은 미완료. 기존 자료·운영 보존, 외부 요청0. Overall PARTIAL.

## 2026-10-20 — Mac mini 위임과 모의 포트폴리오 관리

- KSTOCK_SHARE_BACKEND_DIRECTIVE.md를 로컬/ARI_MAC-01에 저장, 기존 실행기에 주식수 검증 한 사이클 요청. job 9d6bce6c-d554-4275-8db0-47373cdf75ed RUNNING 확인. 새 자동화/스케줄/도구 권한 변경 없음.
- public/app.js/index.html의 모의 기록 비용 반영·개별 삭제·전체 비우기. 비용 포함 누적 시계열은 미연결로 명시적 보류. 입출금/매도/배당 미구현.
- test/candidate_ui.test.js 3개 추가, 전체836 + Android3 PASS. 실기기/브라우저 QA NOT RUN, Overall PARTIAL.

## 2026-10-20 — 비용 포함 모의 누적 성과·현금 입출금

- 가상 매수 비용을 기존 엔진/API/화면에 연결. 시작 현금 및 BEFORE_OPEN KRW 입출금, 순입출금/순손익/비용 표시. 거래일·기간·중복·현금 부족 검증, 기존 zero-cost 요청 호환.
- UI91/신규 API5 PASS, 전체843 + Android3 PASS. Chrome 별도 fixture4폭×2테마×200% 확대 및 정상/출금 부족/삭제/복구 PASS. 실기기 NOT RUN, 실종목 선행 데이터 보류 유지.
- package.json의 잘못된 module 설정 삽입만 복구, 맥미니 지시서에 설정 변경 금지 추가. 주식수 job은 마지막 확인 RUNNING. 운영/실거래 변경 없음. 전체 PARTIAL.

## 2026-10-20 — 모바일 비용·입출금 QA 및 로컬 APK POST 수정

- 검증 APK의 api=false 치환으로 POST가 차단되는 문제를 android/build-local-validation.py에서 수정. 고정 USB 원점/운영 인증 코드/주문 차단 유지. 기존 동일 키로 build/sign/install -r, 데이터 보존.
- 모의 폼 min-content 폭 수정 및 누적 성과 고정 미연결 문구 정정. 활성 화면4폭×2테마×200% 확대 폭 유지 PASS.
- Galaxy 실제 POST/결과 가시성 PASS. iPhone17 시뮬레이터 별도 임시 XCTest1 PASS, 물리 iPhone NOT RUN. 전체843+Android3 PASS. fixture 서버·검증 앱 종료/USB 설정 보존.
- 맥미니 종료 영수증 검토: 공식 수집 NOT_RUN/주식수 근거 확보 미완료, 보고서의 미입증 코드 변경 주장 인정하지 않음. KSTOCK_SHARE_BACKEND_REPORT.md 기록. 전체 PARTIAL.

## 2026-10-20 — 모의 매도·실현 손익 연결

- 선택적 sales API, 날짜/보유량/비용/중복 검증, 평균원가 기반 부분·전량 매도. UI 매도 입력·삭제·전체 비우기, 결과 무효화. 기존 시작일 매수·장 시작 전 입출금·자료 Gate 보존.
- 전체848 + Android3 PASS. Chrome 정상/초과매도/삭제/4폭×2테마×200% PASS. Galaxy 실제 POST·가시 손익 PASS, iPhone17 시뮬레이터 XCTest1 PASS. 물리 iPhone NOT RUN.
- fixture 서버·검증 앱 종료, 운영·주문·개인정보 영구저장 변경 없음. 전체 PARTIAL, 추천 HOLD.

## 2026-10-20 — 사용자 가상 배당 시나리오

- 선택적 dividends 순수령액을 매매 뒤 현금·손익에 반영. 공식 배당/권리/총수익 검증과 분리하고 가격지수 비교 보류. 서버 근거 Gate 유지, UI 추가/삭제/전체 비우기·순수령 표시.
- 전체855 + Android3 PASS, Chrome fixture/4폭×2테마×200% PASS, Galaxy 실제 POST·가시 고지/결과 PASS, iPhone17 시뮬레이터 XCTest1 PASS. 물리 iPhone NOT RUN.
- fixture 서버·앱 종료/USB 설정 보존. 실제 배당/세율/권리 추정·계좌·실거래·영구저장·운영 변경 없음. 전체 PARTIAL.

## 2026-10-20 — 모의 기록 로컬 백업·복원

- public/paper-backup.js의 엄격한 v1 사용자 기록 스키마와 JSON/텍스트 내보내기·미리보기·명시적 교체. 시세/토큰/검증 필드 제외, 가격 미확인 보류, ID 재생성, 불량 파일/비동기 경쟁에서 기존 기록 보존.
- 파일 보관/삭제·평문·OS 복사본 고지, Android 앱은 텍스트 경로. 서버 저장/자동 localStorage/새 네이티브 권한 없음. iOS relay는 새 정적 GET 자산만 추가하고 실행하지 않음.
- 전체863 + Android3 PASS, relay4 PASS. Chrome 실제 파일 왕복 및 재계산 PASS. Galaxy 텍스트복원/가시결과 PASS, iPhone17 시뮬레이터 XCTest1 PASS. 물리 iPhone/네이티브 파일 저장 NOT RUN. 임시 서버·앱 종료, 운영/실거래 변경 없음. 전체 PARTIAL.

## 2026-10-20 — 일별 모의 자산·현금·손익 뷰

- 계산 point의 일별 입출금·누적 손익/비용/가상배당/낙폭 연결. 자산·손익 대사 후 표/추이 지표·구간 선택 제공. 표 내부 스크롤·키보드·SVG 설명, 시나리오 구분 및 오래된 응답 폐기.
- 전체868 + Android3 PASS. Chrome 수치/전환/내부스크롤/4폭×2테마×200% PASS, Galaxy 추이 화면 가시 확인, iPhone17 시뮬레이터 제목 가시 XCTest1 PASS. 모바일 모든 열·지표/물리 iPhone 전수 QA NOT RUN.
- 임시 서버·검증 앱 종료, 기존 설정·운영·실거래·개인정보 흐름 보존. 전체 PARTIAL.

## 2026-10-20 — 종목별 모의 손익·기간 수익 기여도

- 종목별 평균원가/잔여량/실현·미실현/비용/가상배당 집계, 일별 기여도 복리 연결. 합계 대사 후 출력하며 현금 포함 비중과 전량 매도 기록 보존. 보유 상태 필터 및 대사 실패 전용 안내.
- 전체875 + Android3 PASS. Chrome 부분/전량매도·필터·비중/손익·작은 화면 회귀 PASS. Galaxy 카드/기여도 실제 가시 확인, iPhone17 시뮬레이터 제목 가시 XCTest1 PASS. 물리 iPhone/모든 모바일 필터 전수 QA NOT RUN.
- 임시 서버·검증 앱 종료/USB 설정 보존. 운영·실거래·개인정보 흐름 변경 없음. 전체 PARTIAL.

## 2026-10-20 — 모의 성과 CSV 보고서

- 일별/종목별 전체 계산 결과를 허용 필드 CSV로 투영. 계산·대사 및 기록 버전 확인, 기록 변경/재계산 시 이전 보고서 무효화. 가상 배당·기간·단위/실거래 아님 고지, BOM/CRLF/종목코드 보존. 서버 저장·추가 조회 없음.
- 전체879 + Android3 PASS, Chrome 실제 다운로드/바이트/무효화/작은 화면 PASS. Galaxy 텍스트 생성 가시 확인, iPhone17 시뮬레이터 XCTest1 PASS. 물리 iPhone·모바일 파일 저장 NOT RUN.
- 임시 서버·검증 앱 종료, USB/데이터/기기 설정 보존. 새 개인정보·운영·실거래 변경 없음. 전체 PARTIAL.


# 모의 포트폴리오 계산 전 입력 점검 — 2026-10-20 KST

- 프로젝트/Git/compliance·기존 변경사항 확인 및 보존. 운영 배포 없음. 현재 입력 점검과 오류 위치 이동을 추가했다. 날짜·기간·매수/매도 수량·비용·가정 배당·입출금 형식 및 시작 현금을 확인한다. 삭제된 매수에 연결된 초과 매도도 차단한다.
- 장 시작 전 입출금 → 시작일 매수/비용 → 매도 → 가정 배당 순으로 알려진 현금 흐름을 점검한다. 당일 매도·배당으로 장 시작 전 출금을 충당하지 않는다. 잘못된 입력은 API 요청 전에 차단하며 기록을 자동 수정하지 않는다. 문제 위치 이동은 접힌 영역을 열고 해당 입력에 포커스한다. 입력 변경 시 이전 점검·계산·보고서를 무효화한다.
- 로컬 통과와 서버 원천자료 검증을 구분한다. 거래일·RAW 가격·기업행동·자료 최신성·요청기간 Gate는 유지한다. 서버 입력 거절(HTTP400)과 통신 오류 안내를 구분한다. 실제 주식수 미확인 사항은 별도 백엔드 업무로 유지한다.
- 회귀885 PASS / Android 운영 계약3 PASS / FAIL0 / SKIP0. 신규6개: 날짜/포커스, 매수 삭제 후 초과 매도, 현금 처리 순서, 수동 점검·오류 초기화, 서버400 안내·기록 보존, 로컬 통과 후 서버 보류. master-qa-20261019161417145.json. 구문/diff check PASS.
- Chrome fixture: 잘못된 시작 현금·날짜에서 요청0, 수정 후 정상 계산, 문제 입력 포커스, 오류 화면320/390px 가로 넘침 없음. 기존4폭×2테마×200% 및 매도/배당/백업/보고서 흐름 회귀. data/v2/verification/paper-precheck-web-20261020.json.
- Galaxy A33 실기기: 백업 복원 후 시작 현금 부족 안내 → 문제 위치 이동 → 시작 현금 입력 포커스 PASS. data/v2/verification/galaxy-paper-precheck-20261020.json. 기존 APK 재사용, 앱 데이터·설정 보존.
- iPhone17/iOS27 시뮬레이터 XCTest1 PASS/FAIL0/SKIP0: WKWebView에서 동일 오류와 입력 이동 확인. data/v2/verification/ios-paper-precheck-20261020.json. 물리 iPhone·전체 접근성 제스처 QA NOT RUN. 저장소 네이티브 소스/서명 변경 없음.
- 임시 fixture 서버·검증 앱 종료, 기존 USB 연결 보존. 모든 검증은 가상 fixture 기능 검증이며 실종목 정확성 근거가 아니다. 새 개인정보 수집·영구 서버 저장·외부 자료 수집·실거래 없음. 실제 자료/권리 등 미완료로 전체 PARTIAL/추천 HOLD 유지.


# 모의 기록 페이지 이탈 경고 — 2026-10-20 KST

- 프로젝트 경로/origin/branch 및 ARI compliance 확인, 기존 미커밋 보존. 운영 대상 kstock.ai.kr/ari-prod-01 배포 없음.
- public/app.js: 매수·입출금·매도·가정 배당 중 기록이 남아 있을 때만 beforeunload 처리기를 연결한다. 매수 없이 남은 입출금 등도 보호하며 마지막 기록 삭제·모두 비우기에서 처리기를 해제한다. 백업 텍스트 생성은 실제 파일 저장을 증명하지 않으므로 경고를 해제하지 않는다. 이벤트 처리 자체는 기록을 수정하거나 전송하지 않는다.
- public/index.html에 먼저 백업을 직접 저장하도록 안내. 브라우저 사용자 상호작용·종료 방식 및 WebView 지원에 따라 경고가 생략될 수 있으며 자동 저장/앱 강제 종료 복구를 보장하지 않는다. 새 저장소·권한·서버 보유 데이터 없음. 비우기는 기존 메모리와 백업 입력을 지우며 외부 저장 파일은 직접 삭제해야 한다는 기존 고지 유지.
- 신규3개 계약 테스트: 빈 상태/중복 연결/해제, 네 종류 기록과 이벤트 비변경, 백업 생성 후 경고 유지·모두 비우기. UI119 PASS, 최종 전체 회귀888 PASS/Android 계약3 PASS/FAIL0/SKIP0. master-qa-20261019163439434.json. 최초 제한 환경은 Java 임시 HTTP 소켓 Operation not permitted로 Android1 FAIL이었으며 해당 실패 기록을 보존했다. 로컬 소켓 허용 후 재실행에서 모두 통과. 구문/diff check PASS.
- 실제 headless Chrome에서 cancelable beforeunload 이벤트를 dispatch하여 기록 존재/백업 생성 후 preventDefault 및 비우기 후 미취소·처리기 해제를 확인했다. 기존 계산/입력 점검/백업/CSV 및 320/390/768/1440px×light/dark 회귀 PASS. data/v2/verification/paper-exit-guard-web-20261020.json. 실제 브라우저 종료 확인창·Galaxy/iPhone 종료 동작은 이번 NOT RUN이며 이벤트 검증과 구분한다. 임시 Chrome/HTTP 서버 종료.
- 실제 자료 수집·주식수 근거 검증·실거래·운영 배포 없음. 주식수 확인은 별도 백엔드 업무로 유지. 전체 PARTIAL/추천 HOLD.


# 모의 기록 개별 삭제 되돌리기 — 2026-10-20 KST

- 프로젝트/origin/branch·compliance 및 기존 변경 확인/보존. 운영 대상 kstock.ai.kr/ari-prod-01 배포 없음.
- 매수·입출금·매도·가정 배당의 마지막 개별 삭제 한 건을 원래 배열 위치에 복원한다. 개별 삭제 후 공통 되돌리기 버튼으로 포커스 이동, 상태 안내 제공. 두 번째 삭제는 이전 사본을 교체하며 무제한 이력을 쌓지 않는다.
- 다른 입력·기록 변경/백업 적용/모두 비우기 시 되돌리기 사본 제거. 모두 비우기 자체는 되돌리지 않는다. 마지막 활성 기록을 삭제해도 사본이 있으면 나가기 경고와 모두 비우기 버튼을 유지한다. 화면에 메모리 사본 존재와 제거 방법을 고지. 영구 저장·외부 전송·새 권한 없음.
- 복원은 이전 계산·CSV·입력 점검·백업 미리보기를 무효화한다. 매수 가격은 현재 검증 가격으로 재연결하거나 미확인 null 처리하며 삭제 당시 가격을 그대로 신뢰하지 않는다. 기존 서버 원천자료·권리 Gate 유지.
- 신규4개 테스트: 네 종류 복원/순서/계산 무효화, 마지막 사본과 모두 비우기, 입력 변경 후 복원 금지, 두 번째 삭제의 단일 사본 교체. UI123 PASS. 전체 회귀892 PASS/Android 계약3 PASS/FAIL0/SKIP0. master-qa-20261019164621787.json. 구문/diff check PASS.
- 실제 headless Chrome fixture에서 삭제 버튼 → 공통 되돌리기 버튼 포커스 → 복원 → 재삭제/모두 비우기 후 복원 불가 확인. 기존 계산/매도/배당/백업/CSV/입력 점검 흐름과 4폭×2테마 회귀, 추가320/390px 넘침 없음. data/v2/verification/paper-delete-undo-web-20261020.json. 임시 Chrome/HTTP 서버 종료. 이번 Galaxy/iPhone 실기기·시뮬레이터 신규 동작 QA는 NOT RUN.
- 실제 주식수 원천 확인은 별도 백엔드 업무 유지. 외부 자료 수집·실거래·운영 배포 없음. 전체 PARTIAL/추천 HOLD.


# 모의 기록 수정·저장·취소 — 2026-10-20 KST

- 프로젝트/origin/branch·ARI compliance 확인 및 기존 미커밋 보존. 운영 kstock.ai.kr/ari-prod-01 배포 없음.
- public/app.js/index.html: 매수·입출금·매도·가정 배당 카드에 기록 수정 버튼 추가. 공통 수정 영역으로 이동·첫 입력 포커스. 종목/통화/내부ID/기록 순서를 유지하며 날짜·수량·가격·비용·입출금/배당 금액을 수정한다. 입출금은 양수 입금/음수 출금으로 안내.
- 편집 중에는 원본 불변. 수정 취소는 계산 결과를 무효화하지 않는다. 저장 시 전체 기록 초안을 기존 백업 검증 계약으로 검사한 뒤 한 건만 교체한다. 빈 필드·실재하지 않는 날짜·0/음수 금액·비유한값/큰 수·매수 수량 축소 또는 매도 증가에 따른 초과 매도는 저장 거부, 초안과 원본 유지. 거래일·기간·현금 흐름 및 원천자료는 기존 계산 Gate로 별도 검증한다.
- 저장 성공 시 성과/CSV/입력 점검/삭제 되돌리기 사본/백업 미리보기 무효화. 다른 기록·계산 입력 변경, 백업 적용, 모두 비우기는 수정 세션과 입력 DOM을 지워 오래된 수정 내용의 덮어쓰기를 막는다. 저장 전 수정 내용은 계산/백업에 포함되지 않음을 고지. 추가 영구 저장·권한·서버 수집 없음.
- 신규5개: 네 종류 수정/식별자·순서 보존, 양쪽 초과 매도 거부, 날짜/빈 입력/범위 오류와 API 미요청, 취소 원본·계산 버전 보존, 모두 비우기 후 오래된 저장 차단. UI128 PASS, 최종 전체 회귀897 PASS/Android 계약3 PASS/FAIL0/SKIP0. master-qa-20261019164915429.json. 구문/diff check PASS.
- 실제 headless Chrome fixture: 카드 수정 버튼→첫 입력 포커스→매수 수량 축소 거절→매수가/수량 정상 저장→매도가 수정 취소. 기존 계산/매도/배당/백업/CSV/입력 점검/삭제 되돌리기 회귀, 4폭×2테마 및 수정 화면320/390px 넘침 없음. data/v2/verification/paper-edit-web-20261020.json. 임시 Chrome/HTTP 서버 종료. 모든 수정 항목의 모바일 전수 검증·Galaxy/iPhone 신규 동작 QA는 이번 NOT RUN.
- 실제 주식수 근거 확인은 별도 백엔드 업무 유지. 외부 자료 수집·운영 배포·실거래 없음. fixture 검증은 실종목 데이터 정확성 근거가 아니며 전체 PARTIAL/추천 HOLD.


# 백업 교체 전후 요약·미리보기 취소 — 2026-10-20 KST

- 프로젝트/origin/branch·compliance 및 기존 변경 확인/보존. 운영 대상 kstock.ai.kr/ari-prod-01 배포 없음.
- 백업 검증 후 현재 → 불러올 백업 순서로 매수/매도/입출금/가정 배당 건수, 종목별 매수 수량·비용 포함 원가, 가상 매도 순수령·순입출금·가정 배당 합계, 시작 현금·계산 기간을 표시한다. KRW/USD와 종목을 분리하며 미설정/자동 계산도 명시한다. 합계는 입력 기록의 참고 요약이며 시세·투자 수익 검증이 아니다. 비유한 합계는 숫자로 표시하지 않는다.
- 같은 건수라도 원가 변화가 보인다. 다만 개별 날짜/가격의 완전한 차이 비교가 아니므로 합계가 같아도 기록이 다를 수 있음을 고지한다. 병합이 아닌 전체 기록/계산 조건 교체이고 개별 삭제 되돌리기로 복구 불가함을 알린다. 기존 기록을 먼저 백업하도록 안내한다.
- 미리보기 취소는 현재 기록과 붙여넣은 텍스트를 유지하며 보류 중 백업 사본·요약을 제거하고 적용을 비활성화한다. 원본 입력 변경·불량 백업·적용 완료 시 이전 요약도 제거한다. 새 영구 저장·권한·API 요청·외부 전송 없음.
- 신규4개: 동일 건수/서로 다른 원가와 통화 구분·원본 불변, 취소/텍스트 보존/적용 금지, 변경/불량/적용 후 요약 제거, 빈 백업의 삭제 예정 표시·API 미요청. UI132 PASS. 전체 회귀901 PASS/Android 계약3 PASS/FAIL0/SKIP0. master-qa-20261019165145963.json. 구문/diff check PASS.
- 실제 headless Chrome fixture: 원가450 → 270 요약·현재 원본 불변·취소 후 텍스트 유지/적용 비활성 확인. 기존 계산/백업/CSV/삭제 복구/수정 흐름 회귀 및4폭×2테마, 요약 펼친320/390px 넘침 없음. data/v2/verification/paper-backup-preview-web-20261020.json. 임시 Chrome/HTTP 서버 종료. Galaxy/iPhone 신규 동작 QA는 이번 NOT RUN.
- 실제 주식수 원천 확인은 별도 백엔드 업무 유지. 외부 자료 수집·실거래·운영 배포 없음. 모든 검증은 가상 fixture 기능 검증이며 전체 PARTIAL/추천 HOLD.


# 모의 기록 종류·종목 코드 필터 — 2026-10-20 KST

- 프로젝트/origin/branch·ARI compliance·기존 변경 확인/보존. 운영 kstock.ai.kr/ari-prod-01 배포 없음.
- public/app.js/index.html: 전체/매수/매도/입출금/가정 배당 기록 종류와 종목 코드 부분 검색, 조건 초기화 및 전체/표시 건수 추가. 영문 코드는 대소문자 구분 없이 찾는다. 종목 코드 검색 중 종목이 없는 입출금은 숨겨지며 이를 화면에 고지한다. 각 종류의 조건 일치 기록 없음도 안내한다.
- 필터는 원본 배열을 변경하지 않는다. 전체 계산·백업·모두 비우기·매수 합계는 숨겨진 기록을 포함하며 이를 화면에 명시한다. 필터 변경은 성과/CSV/수정 세션/백업 미리보기를 무효화하지 않는다. 표시된 카드의 수정·삭제는 원본 객체에 연결, 삭제 복구 시 원래 순서와 현재 표시 조건을 유지한다.
- 입력 점검의 문제 위치 이동은 필터를 초기화하여 숨겨진 오류 기록을 드러낸 후 대상 영역에 포커스한다. 새로운 영구 저장·권한·API 요청 없음.
- 신규4개: 종류/종목 일치·백업/계산버전 보존, 영문 검색/입출금 제외/초기화, 필터 상태 특정 기록 삭제·복구, 오류 이동 시 표시 초기화. UI136 PASS. 전체 회귀905 PASS/Android 계약3 PASS/FAIL0/SKIP0. master-qa-20261019165349199.json. 구문/diff check PASS.
- 실제 headless Chrome fixture: 종류 변경/검색 input 이벤트→전체2건 중1건/0건 표시→백업·계산버전 동일→초기화2건 및 검색 입력 포커스. 기존 계산/매도/배당/백업/CSV/수정/삭제 복구/백업 비교 회귀, 4폭×2테마 및 추가320/390px 넘침 없음. data/v2/verification/paper-record-filter-web-20261020.json. 임시 Chrome/HTTP 서버 종료. Galaxy/iPhone 신규 동작 QA·최대 기록 부하 검증은 이번 NOT RUN.
- 실제 주식수 원천 확인은 별도 백엔드 업무 유지. 외부 자료 수집·운영 배포·실거래 없음. 모든 기능 검증은 가상 fixture 범위이며 전체 PARTIAL/추천 HOLD.


# 모의 기록 20건 페이지 표시 — 2026-10-20 KST

- 프로젝트/origin/branch·ARI compliance 및 기존 변경 확인/보존. 운영 kstock.ai.kr/ari-prod-01 배포 없음.
- 매수/입출금/매도/가정 배당을 종류별 페이지당 최대20건만 DOM에 표시한다. 조건 일치 건수·현재 페이지/전체 페이지·등록 순서·이전/다음 버튼 제공. 경계 버튼 비활성화, 이동 후 해당 목록에 포커스/스크롤. 전체 기록 수·조건 일치 수와 실제 현재 페이지 표시 수를 구분한다.
- 필터 변경/초기화 및 오류 위치 이동에서 페이지도 초기화한다. 삭제/교체 등으로 마지막 페이지가 없어지면 유효한 페이지로 보정한다. 페이지 전환은 원본 배열·계산버전·백업·기존 성과를 바꾸지 않는다. 계산/백업/모두 비우기는 모든 페이지를 포함한다.
- 신규3개: 입출금500건의20개 DOM/다음·마지막 페이지/백업 전체 보존, 마지막 페이지 삭제 후 보정·복구, 필터 페이지 초기화·모두 비우기. UI139 PASS. 전체 회귀908 PASS/Android 계약3 PASS/FAIL0/SKIP0. master-qa-20261019165525260.json. 구문/diff check PASS.
- 실제 headless Chrome fixture: 입출금500건의 첫/마지막 페이지 모두 카드20개, 다음 페이지 첫 ID p20/마지막 ID p499, 마지막 다음 버튼 비활성, 이동 후 목록 포커스, 백업500건 및 바이트 동일 확인. 기존 계산/매도/배당/백업/CSV/수정/삭제복구/필터 회귀,4폭×2테마와500건 페이지320/390px 넘침 없음. data/v2/verification/paper-record-paging-web-20261020.json. 임시 Chrome/HTTP 서버 종료. 모든 종류 동시 최대 부하/기기 성능 수치·Galaxy/iPhone 신규 동작 QA는 이번 NOT RUN.
- 새 저장소·권한·API 요청·실제 금융 자료 수집·운영 배포·실거래 없음. 실제 주식수 원천 확인은 별도 백엔드 업무 유지. 기능 fixture 검증이며 전체 PARTIAL/추천 HOLD.


# 모의 기록 날짜 정렬 — 2026-10-20 KST

- 프로젝트/origin/branch·ARI compliance·기존 변경 확인/보존. 운영 kstock.ai.kr/ari-prod-01 배포 없음.
- 기록 표시 순서에 등록 순서/날짜 최신순/과거순 추가. 입출금·매도·가정 배당은 날짜로 정렬하며 같은 날짜는 등록 순서를 유지한다. 매수의 date는 가격 기준일이므로 거래일로 오인하지 않도록 매수는 등록 순서를 유지하고 화면에 설명한다.
- 원본 배열이 아닌 필터 결과 사본을 정렬하여 계산·동일일 거래 순서·백업 원본을 보존한다. 정렬 변경은 페이지를 초기화하고 성과/CSV/계산버전은 유지한다. 조건 초기화/오류 위치 이동에서 정렬도 등록 순서로 복귀. 정렬된 카드의 삭제/복구는 원본 위치를 정확히 사용한다. 페이지 안내에 적용 순서를 표시한다.
- 신규3개: 날짜 방향/동일일 안정성·백업/계산버전 보존, 매수 가격일 정렬 제외, 정렬 후 페이지 초기화·원본 삭제/복구. UI142 PASS. 전체 회귀911 PASS/Android 계약3 PASS/FAIL0/SKIP0. master-qa-20261019165648516.json. 구문/diff check PASS.
- 실제 headless Chrome fixture:500건 중 늦은 날짜의 마지막 등록 기록이 최신순 첫 항목, 과거순은 기존 p0/p1 동일일 순서 유지, 마지막 페이지에서 정렬 변경 시0페이지, 백업/계산버전 동일 확인. 기존 전체 기능·500건 페이지 회귀,4폭×2테마 및 정렬 화면320/390px 넘침 없음. data/v2/verification/paper-record-sort-web-20261020.json. 임시 Chrome/HTTP 서버 종료. Galaxy/iPhone 신규 정렬 QA는 이번 NOT RUN.
- 추가 저장소·권한·API 요청·외부 자료 수집·운영 배포·실거래 없음. 실제 주식수 원천 확인은 별도 백엔드 업무 유지. 가상 fixture 기능 검증이며 전체 PARTIAL/추천 HOLD.


# 모의 기록 조회 날짜 범위 — 2026-10-20 KST

- 프로젝트/origin/branch·ARI compliance·기존 변경 확인/보존. 운영 kstock.ai.kr/ari-prod-01 배포 없음.
- 기록 조회 시작일/종료일 추가. 양 끝 날짜 포함·같은 날 조회·한쪽 날짜만 지정 가능. 거래 날짜가 있는 입출금/매도/가정 배당을 필터링한다. 매수의 가격 기준일은 거래일이 아니므로 날짜 조회 중 매수를 숨기고 이를 고지한다. 계산 시작/종료일과는 별도이며 백업에도 조회 조건을 넣지 않는다.
- 실제 날짜/브라우저 badInput/역순 범위를 확인하여 잘못된 조회는 빈 목록과 안내·aria-invalid로 표시한다. 원본·성과·CSV·백업·계산버전은 유지한다. 날짜 변경 시 페이지 초기화, 표시 조건 초기화/오류 위치 이동에서 조회 날짜도 제거한다. 숨겨진 기록도 계산/백업/전체 비우기에 포함하는 기존 정책 유지.
- 신규3개: 경계/같은날·매수 제외·백업/계산기간 보존, 불가능한 날짜/역순·안내·복구, 열린 범위·페이지 초기화·API 미요청. UI145 PASS. 전체 회귀914 PASS/Android 계약3 PASS/FAIL0/SKIP0. master-qa-20261019165804261.json. 구문/diff check PASS.
- 실제 headless Chrome fixture:500건에서 같은날 조회로 p499 한 건만 표시, 역순 입력에서 빈 결과/오류 속성, 백업/계산버전 동일, 조건 초기화 확인. 기존 기능/페이지/정렬 회귀,4폭×2테마 및 추가320/390px 넘침 없음. data/v2/verification/paper-record-range-web-20261020.json. 임시 Chrome/HTTP 서버 종료. Galaxy/iPhone 날짜 선택 UI/신규 동작 QA는 이번 NOT RUN.
- 추가 저장소·권한·API 요청·실제 자료 수집·실거래·운영 배포 없음. 실제 주식수 원천 확인은 별도 백엔드 업무 유지. 가상 fixture 기능 검증이며 전체 PARTIAL/추천 HOLD.


# 조회 조건별 모의 기록 금액 요약 — 2026-10-20 KST

- 프로젝트/origin/branch·ARI compliance 및 기존 변경 확인/보존. 운영 kstock.ai.kr/ari-prod-01 배포 없음.
- 현재 종류/종목/날짜 조건에 맞는 모든 페이지의 입력 금액을 합산한다. 통화별 매수 원가·비용, 입금/출금/순입출금, 매도 총액/비용/순수령, 사용자 가정 배당 순수령 및 종류별 건수 표시. 서로 다른 통화 합산/종목 간 수량 합산 없음.
- 현재 페이지의 합계가 아님을 명시한다. 매도 순수령은 실현 손익이 아니며 보유 수량·현금 잔액·수익률이나 권리 검증 결과로 표현하지 않는다. 날짜 오류 시 합계를 보류하고 비유한 값/합계는 수치 범위 확인 필요로 표시. 일치 기록 없음은 별도 안내한다. 원본·백업·계산·서버 Gate는 유지한다.
- 신규3개: 입금/출금·비용 차감 매도·가정 배당 구분, 여러 페이지 합계/기간 축소/백업 보존, 통화 분리·날짜 오류·비유한 합계 보류. UI148 PASS. 전체 회귀917 PASS/Android 계약3 PASS/FAIL0/SKIP0. master-qa-20261019165919118.json. 구문/diff check PASS.
- 실제 headless Chrome fixture:500건 전체 입금125250 KRW가 마지막 페이지에서도 동일, 날짜 축소 시1건500 KRW, 백업 원본 동일 확인. 기존 전체 기능 회귀,4폭×2테마 및 요약 펼친320/390px 넘침 없음. data/v2/verification/paper-record-summary-web-20261020.json. 임시 Chrome/HTTP 서버 종료. Galaxy/iPhone 신규 합계 QA는 이번 NOT RUN.
- 추가 저장소·권한·API 요청·외부 금융 자료 수집·실거래·운영 배포 없음. 실제 주식수 원천 확인은 별도 백엔드 업무 유지. 가상 fixture 기능 검증이며 전체 PARTIAL/추천 HOLD.


# Galaxy 모의 기록 모바일 회귀·검증 도구 — 2026-10-20 KST

- 프로젝트/origin/branch·ARI compliance·기존 변경 확인/보존. 운영 kstock.ai.kr/ari-prod-01 변경 없음. 최근 추가 기능의 모바일 미검증 항목 중 페이지/수정 취소/개별 삭제 복구를 실제 Galaxy A33에서 확인했다.
- 가상 입출금45건 fixture로 실제 다음 기록 터치→2/3페이지·첫 기록 mobile-20, 기록 수정 터치→편집 중, 취소→원본45건, 해당 카드 삭제→44건·복구 가능, 되돌리기→45건·사본 제거 PASS. DOM 상태를 임시 QA 화면에 표시해 접근성 XML 및 실제 화면과 대조했다. /tmp/kstock-galaxy-ledger-edit-20261020.png 및 undo 캡처. data/v2/verification/galaxy-paper-ledger-20261020.json.
- 초기 임시 검증 상태 전송은 네이티브 허용 API 경계로 차단되어 화면 상태 방식으로 바꿨다. 재연결 뒤 기존 화면 잔존과 접근성 이름/텍스트 차이로 발생한 도구 실패를 수정하고 재실행했다. 제품 API 허용 범위·네이티브 소스·앱 데이터/설정은 변경하지 않았다. 이 실패를 제품 기능 PASS로 간주하지 않았으며 최종 실제 흐름을 별도로 확인했다.
- 재현 도구 추가: scripts/serve-paper-ledger-mobile-qa.mjs(루트에서 실행하는127.0.0.1:3000 전용 가상 서버) 및 scripts/galaxy_paper_ledger_qa.py(기존 전경 보호기 사용·실제 터치/상태 대조). 현재 receipt의 실제 실행은 같은 도구의 /tmp 개발본이며 저장소 버전은 경로 일반화/초기 단계 복원 후 Node 구문·Python AST 검증을 수행했다. 저장소 버전의 처음부터 끝까지 재실행은 NOT RUN.
- 재현 순서: 기존 로컬3000 사용 여부 확인 → node scripts/serve-paper-ledger-mobile-qa.mjs → 기존 검증 앱을 새 fixture로 실행(USB tcp3103→3000) → python3 scripts/galaxy_paper_ledger_qa.py. 앱 설치/데이터 삭제/기기 설정 변경은 스크립트에 포함하지 않는다. QA 버튼/상태는 임시 fixture에만 삽입하며 운영 UI에는 추가하지 않는다.
- 이번 제품 코드 변경 없음. 마지막 전체 회귀917/Android 계약3 PASS는 이전 실행(master-qa-20261019165919118.json)이며 이번 재실행 수치로 주장하지 않는다. 신규 스크립트 구문/diff check PASS. 날짜 선택기·정렬 선택기·변경값 저장·모든 종류 필터·iPhone 및 전체 접근성 QA는 미검증으로 유지.
- 임시 서버·검증 앱 종료, 기존 USB 매핑 보존. 새 자료 수집·실제 주문·운영 배포 없음. 실제 주식수 원천 업무는 별도 유지. 모바일의 위 제한된 기능 fixture PASS이며 전체 PARTIAL/추천 HOLD.


# 기록 수정 입력별 오류·포커스 — 2026-10-20 KST

- 프로젝트/origin/branch·ARI compliance·기존 변경 확인/보존. 운영 kstock.ai.kr/ari-prod-01 배포 없음.
- public/app.js: 수정 저장 시 날짜/필수값/브라우저 badInput/유한값/안전 금액 범위/양수 수량·가격/0이상 비용/0아닌 입출금을 먼저 검사한다. 잘못된 모든 입력에 aria-invalid 및 오류 안내 연결, 첫 오류로 포커스 이동. 오류 안내에 항목 이름과 수정 조건을 표시한다.
- 매수 수량 축소·매도 수량 증가의 초과 매도 및 수량×가격 범위 초과를 수량 입력에 연결한다. 원본은 저장 검증 통과 전 유지한다. 입력 수정 시 이전 오류 속성을 지우고 재검증 필요 안내, 다음 저장에서 다시 확인한다. 전체 백업 검증 계약/서버 자료 Gate는 유지하며 여기서 포착하지 못한 전체 기록 오류는 기존 안내로 보류한다.
- 신규3개: 여러 입력 오류/최초 포커스·원본 보존, 초과 매도 수량 위치/정상 재시도/오류 제거, 부호 있는 출금/0거절/곱 범위 초과. UI151 PASS. 전체 회귀920 PASS/Android 계약3 PASS/FAIL0/SKIP0. master-qa-20261019170746744.json. 구문/diff check PASS.
- 실제 headless Chrome fixture:초과 매도 수량 오류→해당 입력 포커스/속성/원본 유지→input 이벤트로 오류 속성 제거→유효 수정 저장 확인. 기존 전체 흐름 및4폭×2테마 회귀 PASS. data/v2/verification/paper-edit-errors-web-20261020.json. 임시 Chrome/HTTP 서버 종료. 신규 오류 화면 자체의 모든 폭/VoiceOver/TalkBack·Galaxy/iPhone 검증은 이번 NOT RUN.
- 추가 저장소·권한·API 요청·외부 자료 수집·운영 배포·실거래 없음. 실제 주식수 원천 확인은 별도 백엔드 업무 유지. 가상 fixture 기능 검증이며 전체 PARTIAL/추천 HOLD.


# 기록 수정 전환 시 초안 보존 — 2026-10-20 KST

- 프로젝트/origin/branch·ARI compliance 및 기존 변경 확인/보존. 운영 kstock.ai.kr/ari-prod-01 배포 없음.
- 다른 기록 수정 버튼을 눌렀을 때 현재 초안에 변경이 있으면 전환을 중단하고 현재 입력값을 보존한다. 저장 또는 수정 취소 후 전환하도록 안내하고 현재 수정 화면에 포커스/스크롤한다. 같은 기록을 다시 누르면 입력과 기존 오류를 초기화하지 않는다.
- 변경 없는 초안은 다른 기록으로 바로 전환 가능. 숫자100/100.00 등 값이 같은 표기는 변경으로 간주하지 않는다. 빈값/브라우저 badInput은 변경으로 보호한다. 이 기능은 수정 버튼 사이 전환에 적용하며 다른 기록 추가/삭제·계산 입력 변경·백업 적용·모두 비우기 시 초안을 닫는 기존 정책은 유지하고 기존 화면 고지도 유지한다. 자동 저장/새 이력 저장 없음.
- 신규3개: 다른 기록 전환 차단·값/원본 보존/취소 후 전환, 같은 기록 재선택·오류 보존, 동등 숫자/빈 입력 보호. UI 테스트 DOM 모형이 동적id를 실제 노드와 연결하도록 개선했고 기존 양쪽 초과 매도 검증은 명시적 취소 후 다음 기록을 검사하도록 보정했다. UI154 PASS. 전체 회귀923 PASS/Android 계약3 PASS/FAIL0/SKIP0. master-qa-20261019170923601.json. 구문/diff check PASS.
- 실제 headless Chrome fixture:매수가95 초안→다른 매도 수정 버튼→전환 차단/현재 입력 포커스/원본100 보존→동일 기록 재선택 유지→취소 후 매도 수정 전환 확인. 기존 전체 기능 회귀 및4폭×2테마, 수정 화면320/390px 넘침 없음. data/v2/verification/paper-edit-draft-web-20261020.json. 임시 Chrome/HTTP 서버 종료. Galaxy/iPhone 신규 전환 보호 QA는 이번 NOT RUN.
- 추가 영구 저장·권한·API 요청·외부 자료 수집·운영 배포·실거래 없음. 실제 주식수 원천 업무는 별도 유지. 기능 fixture 검증이며 전체 PARTIAL/추천 HOLD.


# 미저장 수정 중 계산·JSON 백업 실행 보호 — 2026-10-20 KST

- 프로젝트/origin/branch·ARI compliance·기존 변경 확인/보존. 운영 kstock.ai.kr/ari-prod-01 배포 없음.
- 수정 초안이 원본과 다르면 누적 성과 계산·JSON 백업 텍스트 생성·파일 다운로드를 시작하지 않고 현재 수정 화면에 포커스/스크롤한다. 저장 또는 취소 후 다시 실행하도록 안내한다. 변경 없는 수정 세션은 정상 실행 가능하다.
- 계산 API 요청·이전 결과 제거·CSV 초기화 전에 검사하여 기존 결과를 유지한다. 백업은 이전 텍스트/원본 기록을 유지하고 Blob/파일 생성 전에 중단한다. exportPaperBackup의 성공 여부를 다운로드 경로에서 확인하여 검증 실패에도 다운로드가 이어지던 경로도 방지한다. 직접 복사한 기존 텍스트/이미 저장한 외부 파일은 자동 변경하지 않는다.
- 신규3개: 계산 요청0/결과·초안 보존, 백업 텍스트·파일 경로 중단/원본 보존, 변경 없는 세션·취소·저장 후 정상 내보내기. UI157 PASS. 전체 회귀926 PASS/Android 계약3 PASS/FAIL0/SKIP0. master-qa-20261019171054235.json. 구문/diff check PASS.
- 실제 headless Chrome fixture:미저장 매수가 수정→계산 요청0/안내→백업 생성·다운로드 버튼 중단/기존 텍스트 동일→취소 후 정상 백업 확인. 기존 전체 흐름·4폭×2테마 회귀 PASS. data/v2/verification/paper-edit-action-gate-web-20261020.json. 임시 Chrome/HTTP 서버 종료. Galaxy/iPhone 신규 보호 동작·모든 오류 화면 폭/보조기술 QA는 이번 NOT RUN.
- 적용 범위는 누적 계산과 JSON 백업 생성이며 기존 계산에서 생성하는 CSV 동작은 기존 정책을 유지한다. 추가 저장소·권한·API 요청·외부 자료 수집·운영 배포·실거래 없음. 실제 주식수 원천 업무는 별도 유지. 기능 fixture 검증이며 전체 PARTIAL/추천 HOLD.


# 미저장 수정 중 CSV 생성·다운로드 보호 — 2026-10-20 KST

- 프로젝트/origin/branch·ARI compliance·기존 변경 확인/보존. 운영 kstock.ai.kr/ari-prod-01 배포 없음.
- CSV 생성 공통 진입점에 미저장 수정 검사를 추가하여 텍스트 생성과 다운로드 모두 동일하게 보호한다. 기존 CSV 텍스트를 지우거나 파일 Blob을 만들기 전에 중단하고 저장/취소 안내 및 수정 입력 포커스 제공. 편집 안내에도 CSV 포함을 반영했다.
- 취소 후에는 기존 검증 결과로 다시 내보낼 수 있다. 수정 저장은 기존 정책대로 결과/CSV 스냅샷을 무효화하므로 재계산 전 내보내기 불가. 변경 없는 편집 세션은 차단하지 않는다. 이전에 복사한 텍스트/외부 저장 파일은 자동 변경하지 않는다.
- 신규2개: CSV 생성/다운로드 차단·기존 텍스트/스냅샷 보존, 변경 없는 세션·취소 후 재개 및 저장 후 재계산 요구. UI159 PASS. 전체 회귀928 PASS/Android 계약3 PASS/FAIL0/SKIP0. master-qa-20261019171214494.json. 구문/diff check PASS.
- 실제 headless Chrome fixture: 검증된 계산으로 CSV 생성→미저장 수정→생성/다운로드 중단·Blob0·기존 CSV 동일→취소 후 동일 CSV 재생성 확인. data/v2/verification/paper-csv-edit-gate-web-20261020.json. 기존 전체 기능/4폭×2테마 회귀 PASS. 최초 다운로드 읽기는 파일 존재 직후 아직 작성 중인 시점의 검사 실패로, 완료 내용 일치까지 대기하도록 검증 도구를 수정한 뒤 통과. textarea LF/파일 CRLF 차이를 유지하며 비교했다. 임시 Chrome/HTTP 서버 종료. 신규 보호 동작 Galaxy/iPhone QA는 이번 NOT RUN.
- 새 저장소·권한·API 요청·외부 자료 수집·운영 배포·실거래 없음. 실제 주식수 원천 업무는 별도 유지. 기능 fixture 검증이며 전체 PARTIAL/추천 HOLD.


# 모바일 통합·백엔드 연결 확인·배포 준비 — 2026-10-20 KST

- 사용자 승인1~3단계를 연속 수행. 프로젝트/origin/branch·compliance·운영 대상 확인, 기존 미커밋/사용자 데이터 보존. 운영자 사실값 조세진/vjsjv7003@gmail.com/사업자 미등록을 사용자 답변대로 반영했다. 공개 배포·스토어 제출 완료를 의미하지 않는다.
- Galaxy A33 실기기/iPhone15 실기기/iPhone17 시뮬레이터 각각25개 실제 WebView/WKWebView 프로그램 통합 항목 PASS. 입력→순손익30 계산→CSV→초과매도 오류·미저장 보호→매수가 수정 저장·재계산50→백업 비교/취소/복원·재계산30→필터/날짜/페이지/정렬/합계→삭제/복구→모두비우기. 영수증 galaxy-paper-full-integration-20261020.json, ios-paper-full-integration-{physical,simulator}-20261020.json. 전체 제스처·보조기술·OS파일앱/선택기 전수 감사와 구분한다.
- scripts/paper-mobile-integration-harness.js 및 serve-paper-mobile-integration.mjs로 가상 검증 재현. iOS --paper-integration-qa 명시 모드에서만 검증 결과를 앱 문서에 저장하도록 추가, 정상 실행은 해당 모드를 시작하지 않는다. 기존 iPhone 프로파일/인증서로 로컬 앱 업데이트 후 실기기 실행 확인. 새 계정/프로파일/서명키 생성·기기 설정 변경·데이터 삭제 없음. 한시적192.168.0.16:3104 가상 서버/loopback서버·검증 앱 모두 종료, USB매핑 보존.
- 백엔드 저장서비스→현재 후보 출력을 재대조. 외부요청0/신규공식문서0, AAPL/MSFT/NVDA valuation HOLD. Apple SAME_SOURCE_PERIOD_BOUNDARIES_REQUIRED/bridgeEligible=false/marketCap=null 유지. 과거 백엔드 실행 완료를 공식 근거 확보 완료로 연결하지 않았다. mobile-release-backend-review-20261020.json 및 전용 주식수 보고서 append.
- 배포 재현성 문제 수정: 실제 사용하는3패키지 선언 추가, 존재하지 않던 swagger-jsdoc 버전을 레지스트리 확인6.3.0으로 변경, 중복 dependency 의미 보존 정리, 실제 main/start/Node요건 반영 및 lockfile 일치. 기존 node_modules는 보존. 별도 clean install(--ignore-scripts)·로컬 서버 health/개인정보 검토본 제공 PASS, 같은 clean 환경의 핵심184테스트 PASS. 최초 offline 캐시부족/존재하지 않는 버전/잘못된 prefix 방식의 실패는 성공으로 표시하지 않고 수정 후 검증했다.
- Android 현재 origin 저장 토큰 삭제 버튼·영속삭제 실패 처리 추가. 다른서버 토큰/웹별도입력 보존. 소스 계약과 실제컴파일 PASS이며 실제 사용자 토큰 삭제 런타임 검증은 미실행. 개인정보·이용 안내 검토본과 데이터 흐름표를 추가했으나 최종 방침/스토어 고지로 확정하지 않았다.
- 별도 위치에서 unsigned Android APK 빌드/zipalign·manifest 확인. 기존 서명환경4항목이 모두 미설정임을 값 노출 없이 확인. 공개 업데이트 서명·설치 검증은 미완료. iOS는 개발용 로컬앱이며 운영 HTTPS/인증/배포 타깃·아이콘/스토어 메타데이터가 미완료다.
- 전체 회귀931 PASS/Android계약4 PASS/FAIL0/SKIP0, master-qa-20261019172327707.json. iOS 임시연결 경계4 PASS. src/v2/mobile_release_readiness.js는 모바일 성공과 공개배포/금융기능 승인을 구분하며 누락/오래된/기기종류가 다른 영수증을 거부한다. 구문/AST/diff check PASS.
- 검토번들 artifacts/release-prep/20261019172436789/kstock-mobile-review.zip,165파일 SHA256 검증. root data/·.env·node_modules·키스토어/프로파일/서명iOS 제외. src/data/sample_stock.js는 공개 소스 fixture로 구분. source/APK·manifest·연락처/데이터흐름 초안 포함, 공개 배포용 파일로 표시하지 않는다. mobile-release-review-bundle-20261020.json.
- 공개 https://kstock.ai.kr/health 읽기200/mock/broker=false/liveTrading=false 확인, 운영 배포/설정/주문0. 결과 REVIEW_BUNDLE_READY/공개배포 BLOCKED/전체 PARTIAL/추천 HOLD. 상세 산출물·남은 단계: docs/KSTOCK_RELEASE_PREPARATION.md. Android 운영서명·업데이트 경로, iOS 운영배포 구성, 실제 운영 로그/처리업체/보관·파기/스토어 고지 확인이 남아 있다.


# iOS 고정 HTTPS 검토용 구성 — 2026-10-20 KST

- 프로젝트/origin/branch·ARI compliance 및 기존 변경 확인/보존. 기존 승인된 배포 준비 범위에서 iOS 고정 HTTPS 검토 모드를 구현했다. origin/운영 서버/기존 사용자 데이터·로컬 앱식별자 변경 없음. 공개 배포·스토어 제출은 수행하지 않았다.
- ios/ServerPolicy.swift에 https://kstock.ai.kr/ 고정 시작주소·URL 검증/동일 origin 정책. HTTP/다른호스트·포트/URL인증정보 차단, 기본443 동일 origin 허용. 외부 근거 링크는 명시 사용자 링크의 HTTPS이며 URL인증정보가 없어야 한다. 매개변수/fragment를 가진 시작주소도 거부한다.
- KSTOCK_HTTPS_PREVIEW 모드에서 nonpersistent WKWebView 사용, 네이티브 토큰 저장/주입 없음. 기존 웹 메모리 토큰 입력 경로 사용. 로컬 fixture QA 인자는 이 모드에서 실행하지 않는다. 명시 --https-preview-check는 읽기 전용 HTTPS origin/secureContext/API비인증상태/저장소 모드를 별도 파일로 기록하도록 구현했다. 실제 로그인/세션만료 검증은 남아 있다.
- ios/build-https-preview.py로 별도ai.kstock.ios.httpspreview 앱 생성. 시뮬레이터 ad-hoc 서명·기기 unsigned 빌드 PASS, 양쪽 Info.plist ATS/HTTP 예외 없음 확인. 기존 로컬 시뮬레이터 빌드 PASS. 로컬/기기 빌더와 Xcode 프로젝트에 공유 정책 소스 연결. App Store 배포 서명/프로파일 생성·계정 변경 없음.
- Foundation 정책 실행 PASS. 초기 기본 Swift 캐시 경로 제한은 /tmp 명시 캐시로 해결. 첫 preview 빌드 도중 소스를 수정해 중단됐으며 소스 고정 후 재빌드 PASS. 전체 회귀931 PASS/Android계약4 PASS/FAIL0/SKIP0. master-qa-20261019174637188.json. Python AST/diff check PASS.
- 실제 HTTPS 시뮬레이터 설치/실행은 CoreSimulator 서비스 무응답으로 완료 확인 불가. 별도15초 제한 상태조회도 TIMEOUT. 직접 시작한 설치 명령만 종료했고 공유 시뮬레이터 초기화/다른 앱 종료는 하지 않았다. 실제 접속·비인증API401·ephemeral 저장소 런타임·실제 토큰 인증/물리iPhone는 NOT RUN으로 기록한다. 빌드 성공을 접속 성공으로 표시하지 않는다.
- 영수증 data/v2/verification/ios-https-preview-build-20261020.json, 산출물 ios/build/https-{simulator,device}/KStockHTTPSPreview.app. README에 재현 명령/범위/기존 로컬 모드 구분 추가. 이전 release-prep 압축파일은 이전 소스 검토본이며 새 HTTPS 구성을 포함한다고 주장하지 않는다.
- 최종 개인정보/스토어고지·iOS실인증/배포서명·Android기존키업데이트·금융원천 Gate 유지. 추가 영구 인증정보 수집·실거래·운영 배포 없음. 전체 PARTIAL/추천 HOLD/공개배포 BLOCKED.


# iOS HTTPS 실제 접속·운영 웹 제공 상태 진단 — 2026-10-20 KST

- 프로젝트/origin/branch·ARI compliance·기존 변경 확인/보존. 시뮬레이터 상태가 복구돼 이전 NOT RUN HTTPS 검증을 실제 실행했다. 기기/시뮬레이터 초기화·다른 앱 종료·서버 변경 없음.
- 첫 연결 영수증은 HTTPS origin/secureContext/비영구 WebView/API401을 확인했지만 title이 비어 있었다. 별도 공개GET으로 운영 /가 application/json200, /app.js·/paper-backup.js·/styles.css가404임을 확인했다. 연결/비인증 차단 성공과 실제 앱 화면 제공을 구분하여 이전 영수증에 APP_NOT_READY 재평가를 append했다. root JSON 본문이나 인증정보는 로그/영수증에 보관하지 않았다.
- ios/App.swift: HTTPS preview의 메인 응답이 HTML200이 아니면 탐색 취소 및 운영 웹 제공 상태 확인 안내. 취소 콜백이 구체 안내를 일반 오류로 덮지 않도록 상태 유지. 실제 앱 요소/계산 함수가 있어야 검증 통과하도록 appShellReady 추가. 로컬 검증 모드의 기존 탐색 정책은 유지.
- 재현 도구 ios/run-https-preview-check.py: 명령별15~30초 제한·새 영수증 대조·별도 preview앱만 설치/실행/종료. ios/verify_https_preview.py:10분 이내·미래시간 제외·HTTPS·secureContext·비영구 저장·API401·실제 앱 요소 모두 요구. 잘못된형식/누락/낡은/미래/오류/모순된차단영수증/API200/403을 성공으로 인정하지 않는다. 검증기 unittest4 PASS.
- 최종 preview 빌드/기존 로컬 빌드 PASS. 실제 시뮬레이터 재실행 결과 BLOCKED_WEB_ASSETS_NOT_DEPLOYED, HTTP200/application/json, nonpersistent=false(영구 저장 아님) 확인. data/v2/verification/ios-https-preview-app-readiness-20261020.json. 실제 토큰 인증/세션만료/물리 iPhone HTTPS 검증은 아직 NOT RUN.
- src/v2/web_release_shell.js 및 scripts/verify-web-release.mjs: health와 별개로 HTML 앱 요소 및 app.js/백업JS/CSS의 상태·MIME·필수 내용 점검, 읽기전용 GET·redirect 거부·요청시간/응답크기 제한·본문 로그 없음. 기존 verify-gabia-deploy.sh에7번째 단계로 연결했다. 운영 점검은 새 GET 도구만 실행했으며 기존 배포 스크립트의 systemd/nginx/POST 단계는 실행하지 않았다.
- 신규 Node3개: 정상 앱 자산, healthy JSON/JS404 거부, 잘못된 MIME/일반 로그인·오류 페이지 거부. 전체 회귀934 PASS/Android계약4 PASS/FAIL0/SKIP0. master-qa-20261019180647596.json. Python4 PASS/AST·Node구문·bash -n·diff check PASS. production-web-app-readiness-20261020.json에 실제4경로 차단 영수증 저장.
- 운영 웹이 현재 주소에서 제공되지 않음은 확인했지만 원격 파일 누락/라우팅/구버전 중 근본 원인은 아직 확정하지 않았다. 원격 배포나 설정을 변경하지 않았으며 기존 검토 압축파일을 새 배포본으로 덮어쓰지 않았다. 다음 운영 작업은 실제 서비스 대상/정적파일 경로를 대조하고 올바른 웹/API 구성을 배포·검증하는 것이다. 추천 HOLD/실거래 OFF/공개배포 BLOCKED/전체 PARTIAL 유지.


# 운영 구버전 원인 확정·통합 후보 서버 검증 — 2026-10-20 KST

- 프로젝트/origin/branch·ARI compliance·기존 미커밋/사용자 데이터 보존. 운영 별칭 ari-prod-01 해석 실패 후 DNS와 known_hosts가 일치하는 대상에 기존 키로 접속, 개인키·env값 출력 없이 읽기 전용 진단. systemd active/workingdir current, cleanmaster fe81e6a1b1581d7f0e94d07b3b7d5056359ceb50/Node22.23.2/package0.1.0 확인.
- 실제 current에 public4파일이 없고 server.js에 static middleware/paper 경로도 없다. loopback에서도 루트JSON/JS404 재현. 단순 프런트 복사로 해결되지 않는 구버전 API 배포가 확인된 원인이다. 운영 코드·service·nginx·env는 변경하지 않았다.
- scripts/package-server-review.py 및 stage-server-review.py 추가. 현재 src/public/package/lock163개를 해시 manifest와 아카이브로 준비. 경로 탈출/심볼릭링크/개인 파일/중복/해시 불일치/기존 후보 덮어쓰기 거부. 원본 current 해시/경로 비교. npm ci는 scripts 미실행, 임시loopback만 사용, 별도 랜덤 토큰(비출력)과 수집/실거래 OFF로 기동·검증 후 종료.
- 로컬 리허설 PASS 후 운영 `/srv/k-stock-ai/releases/review-acfaa246ece5fad5`에 격리 stage만 수행. Node22에서 HTML·JS·백업JS·CSS 제공/익명API401/인증된 불량모의입력400/실거래false PASS. 상태 STAGED_VERIFIED_NOT_ACTIVE. active서버SHA 88da0c2438232a9179cb1e6303b626a81defedbb30f01400f69bcf200478f25f 및 서비스active 유지, 원격/로컬 아카이브SHA 일치. 실사용 토큰·데이터·설정 미변경. 영수증 server-staged-review-20261020.json 및 server-review-package-20261020.json.
- 기존 install-gabia-server.sh의 movingmaster 자동pull을 제거했다. 새 설치만 --bootstrap+검토된40자리커밋 요구, 기존 current 존재 시 거부, completeWeb/API소스 확인 후 설치 진행. 인자 없는 실행이 exit64/무변경임을 실제테스트. 운영에서는 이 설치 스크립트/재시작을 실행하지 않았다.
- 전체 회귀935 PASS/Android계약4 PASS/FAIL0/SKIP0, master-qa-20261019181626946.json. Python 아카이브 보안3 PASS, 구문/AST/bash -n/diff check PASS. 원천 금융검증·추천HOLD·실거래OFF 유지.
- 검토 아카이브 artifacts/release-prep/review-acfaa246ece5fad5/review-acfaa246ece5fad5.tar.gz. 후보 승격·롤백 전 검토 절차 docs/KSTOCK_SERVER_RELEASE_REVIEW.md 작성. 현재 공개 주소는 여전히 구버전으로 앱 화면 준비 미완료이며 후보검증을 운영배포완료로 표시하지 않는다. 전체 PARTIAL/공개배포 BLOCKED.


# 격리 후보 심화 검증·공개 주소 재확인 — 2026-10-20 KST

- 프로젝트/origin/branch·ARI compliance·기존 변경 보존을 확인하고 검증만 수행했다. `scripts/verify-staged-server.py` 추가: 기존 review 후보만 허용, 실제 운영 env/토큰을 읽지 않고 새 랜덤 토큰과 loopback 임시 포트를 사용한다. 수집/브로커/실거래 OFF, 본문·토큰 로그 없음, 자신이 띄운 프로세스만 종료한다.
- 원격 후보 review-acfaa246ece5fad5에서 실제 HTTP 21개 검증 PASS: HTML/JS/백업JS/CSS, 익명·잘못된 토큰401, 정상 입력의 공식 자료 미확보 PENDING(`RAW_PRICE_AND_CORPORATE_ACTIONS_REQUIRED`), Cache-Control no-store, 빈입력·잘못된날짜·역전기간·0현금·음수수수료·0수량·중복자금흐름ID·미보유종목매도·깨진JSON400, 운영 소스해시/서비스 상태 유지. 영수증 `data/v2/verification/server-staged-runtime-20261020.json`. 검증 프로세스 종료 확인, 운영 활성화 없음.
- 공개 HTTPS GET 재검증은 BLOCKED_WEB_ASSETS_NOT_DEPLOYED: /200 application/json, /app.js·/paper-backup.js·/styles.css404. 영수증 `data/v2/verification/production-web-recheck-20261020.json`. 운영 앱 준비 완료로 표시하지 않는다.
- Python AST·git diff --check PASS. 이번에는 제품 코드 변경이 없어 기존 전체 회귀935/Android4/Python아카이브3 통과 기록을 재실행으로 표현하지 않는다. 후보 런타임 검증 PASS, 공개 앱 BLOCKED, 금융 원천 검증 미완료/HOLD/실거래OFF 유지. 서비스·nginx·env·current 전환 없음.

---



# 운영 전환 준비·자동 승인 거부 — 2026-10-20 KST

- 운영 unit/drop-in/env 경로를 값 노출 없이 확인: workingdir current, EnvironmentFile /etc/k-stock-ai/k-stock-ai.env, 기존 drop-in 없음. 실제 env는 외부접속 인증 활성/토큰길이조건 충족, broker/live OFF. current/data 및 후보의 사용자 데이터 파일 없음.
- scripts/activate-reviewed-server-20261020.py에 특정 검증 후보의 manifest 대조, 기존 env/소스 보존 확인, current/data 영구 경로 연결, 새 systemd drop-in으로 ExecStart만 전환, 실거래/수집/worker OFF, 재시작 후 health/정적/익명401/실제토큰400/PENDING 검증, 실패 시 drop-in 제거 및 기존 서비스 재시작 절차 준비. Python AST PASS. 실제 전환 실행 검증은 NOT RUN.
- 자동 승인 검토가 실행 전에 거부: “다음 단계”만으로 systemd 실행 경로 변경·디렉터리/권한 변경·재시작에 대한 명시적 운영 승인 부족, 서비스 중단/구성 변경 위험. 우회·재시도 없음. 운영 변경 미실행. 사용자에게 구체 전환과 짧은 중단 가능성에 대한 명시 승인 요청 필요. 공개 앱 BLOCKED/추천 HOLD/실거래 OFF 유지.

---



# 웹·앱 공통 메뉴 적용·커밋·푸시 — 2026-10-20 KST

- Onaria의 메뉴 그룹/모바일 전체 메뉴/키보드 동작을 KSTOCK 기존 기능에 맞게 적용. 종교·회원·게임 기능 이식 없음. 웹과 Android/iOS WebView 공통 자산 사용. 리서치/모의 기록·성과/데이터·설정·이용 안내 그룹, 모바일 모의 기록·전체 메뉴, 활성 상태/aria-current/aria-expanded/Escape·포커스/같은 WebView 개인정보 경로 제공.
- 현재 HTML에 존재하는 목적지만 표시. 구형 공개 화면에서는 기존 목적지만 제공하는 호환 경로도 검증. 이번 변경만 5개 파일163줄 커밋: 2b9e23a5517624dacff924aec2e25084e91845e1, origin auto/kstock-development-20260930 일반 push 성공. index는 이번 로드 태그2개만 선택 반영, 기존 미커밋 변경은 보존. docs/KSTOCK_WORKSPACE_MENU.md 참조.
- 전체 회귀935 PASS/Android 계약4 PASS (master-qa-20261019183253226.json). 최초 샌드박스 소켓 바인딩 실패 기록 보존. Chrome 웹1440/Android360/iPhone390px 29개 메뉴 검증 PASS (workspace-navigation-20261020.json), 커밋 인덱스만 추출한 구형 화면 데스크톱/모바일 smoke PASS. 모바일 버튼과 바깥 클릭 닫기 충돌 수정. 실제 물리 WebView/새 native 빌드 NOT RUN. secrets/구문/diff check PASS.
- 기존 서버 후보는 이번 메뉴를 포함하지 않으므로 후속 운영 전환 전 새 검토 후보 구성이 필요하다. 서비스/환경/데이터/운영 전환·재시작 없음. 추천 HOLD/실거래 OFF 유지. CI는 master 전용 트리거라 현재 작업 브랜치 자동 실행 대상이 아니다.

---



# 새 메뉴 포함 후보 전환 전 준비 — 2026-10-20 KST

- 프로젝트/branch/origin/기존 변경·ARI 기준 확인. 메뉴 커밋2b9e23a와 기존 미커밋 개발이 포함된 명시적 worktree snapshot을 새 후보 review-e0dd69f0bd83fd13으로 생성.165개 파일, SHA256 a328827b922e5c926fa1ef4dcb0372dbb1d11bdea6ced7f38b4f1e6c2be9aaa4. src/public/package/lock만 포함, 사용자 data/env/키 제외. 메뉴JS/CSS 포함·아카이브해시 재대조 PASS. 이 후보를 Git 커밋 단독 재현물로 표현하지 않는다.
- 로컬 /tmp/kstock-menu-pretransition-20261020에 npm ci --ignore-scripts 및 loopback 검증 PASS. 아카이브 보안 unittest3 PASS. scripts/verify-staged-server.py에 메뉴자산2개/HTML연결 검사와 --local 모드 추가. 런타임24개 PASS, 공식자료없음 PENDING/인증401/입력400/no-store/실거래OFF, 프로세스종료 확인. 로컬 서비스 상태 NOT_APPLICABLE로 구분. 영수증 server-menu-local-stage-20261020.json/server-menu-local-runtime-20261020.json.
- 준비된 활성화 스크립트를 새 후보로 고정하고 --activate review-e0dd69f0bd83fd13 필수 인자 없으면 exit2/무변경 확인. 메뉴자산도 전환 후 검사 대상으로 추가. 활성화 실행/서비스재시작 NOT RUN. 운영 절차의 실제 검증을 완료로 표시하지 않는다.
- 원격 /tmp 업로드는 자동 승인 검토가 소스 전송 목적지 승인/소유근거 부족으로 실행 전에 거부. 우회·전송 없음. 원격 새 후보 설치/Node22 검증 NOT RUN. 기존 원격 후보를 최신 메뉴 포함 후보라고 표현하지 않는다. 전환/재시작 승인과 구분하여 지정 운영 호스트의 /tmp 및 releases 격리 업로드·검증 승인이 필요하다. 원격 운영 변경 없음/HOLD/실거래OFF 유지. server-menu-pretransition-20261020.json 참조.

---



# 새 메뉴 후보 원격 격리 검증 완료 — 2026-10-20 KST

- 사용자에게 지정 호스트 /tmp·releases 업로드 및 검증의 명시 승인을 받은 뒤 실행했다. 이전 자동 승인 거부는 승인으로 해소됐으며 운영 전환·재시작 승인은 포함하지 않는다. 프로젝트/branch/origin/기존변경·ARI 기준 확인 및 보존.
- review-e0dd69f0bd83fd13 (165파일) 업로드 후 원격 SHA256 a328827b922e5c926fa1ef4dcb0372dbb1d11bdea6ced7f38b4f1e6c2be9aaa4 일치. 기존 경로 미존재 확인 후 /srv/k-stock-ai/releases/review-e0dd69f0bd83fd13에 격리 설치. Node22.23.2/npm ci --ignore-scripts PASS. 상태 STAGED_VERIFIED_NOT_ACTIVE. current·systemd·nginx·운영env·사용자데이터 미변경.
- 원격 후보 임시loopback/별도랜덤토큰/실거래·수집OFF 런타임24개 PASS: 기본자산4개/메뉴JS·CSS 및 HTML연결/익명·잘못된토큰401/잘못된입력400/공식자료없음PENDING(RAW_PRICE_AND_CORPORATE_ACTIONS_REQUIRED)/no-store/운영소스·active상태유지. 임시프로세스 종료 확인. 실제 운영토큰·env 사용 없음. server-menu-remote-stage-20261020.json/server-menu-remote-runtime-20261020.json.
- 기존 운영 소스SHA 88da0c2438232a9179cb1e6303b626a81defedbb30f01400f69bcf200478f25f, 서비스active 유지. 공개GET은 여전히 루트JSON200/JS·백업JS·CSS404, BLOCKED_WEB_ASSETS_NOT_DEPLOYED. server-menu-production-baseline-20261020.json. 원격 후보 PASS를 운영 앱 PASS로 표시하지 않는다.
- 로컬 추출후보 브라우저29/런타임24/보안3 PASS 기록 유지. 실제 원격 후보를 통한 물리 WebView/운영HTTPS 앱 검증은 전환 전이라 NOT RUN. 새 원천금융자료 검증 아님, 추천HOLD/실거래OFF 유지. server-menu-pretransition-20261020.json을 최신 REMOTE_STAGED_VERIFIED_NOT_ACTIVE로 갱신. 다음 단계는 별도 승인된 운영 전환·재시작 및 실패시 복원, 이후 HTTPS/iOS 검증이다.

---



# KSTOCK 서비스 전환·재시작 및 HTTPS 검증 — 2026-10-20 KST

- 사용자 “KSTOCK 서비스 재시작해” 승인에 따라 앞서 설명한 검증후보 전환·KSTOCK 서비스 재시작 실행. 서버 OS 재부팅 없음. 프로젝트/origin/branch·ARI 기준·기존 변경 보존 확인.
- review-e0dd69f0bd83fd13의 manifest165파일 전체 해시/기존 sourceSHA/환경 안전 조건/기존drop-in없음 대조 후 90-reviewed-release.conf로 ExecStart만 후보로 전환. WorkingDirectory와 기존 /etc/k-stock-ai/k-stock-ai.env 유지. 기존 current는 삭제·덮어쓰기하지 않고 current/data를 영구경로로 생성·후보data에 연결. 사용자 데이터 복사/삭제 없음. broker/live/collection/peerworker OFF. 서비스active.
- 재시작 후11개 확인 PASS: health/HTML·앱JS·백업JS·CSS·메뉴JS·CSS/익명401/기존 실제토큰 불량입력400/자료미확보PENDING/no-store/기존env·소스보존. 실제 토큰·env값 로그 없음. 자동복원 절차 준비대로 유지, 실패 없어 롤백 미실행. server-menu-activation-20261020.json.
- 공개 https://kstock.ai.kr/ HTML200, app.js/백업JS/CSS200, 실제 앱요소 검증 PASS. 이전 JSON/404 차단 해소. server-menu-production-active-20261020.json. 서버 전체 재부팅/다른프로젝트 서비스 조작 없음.
- 기존 iPhone17 시뮬레이터의 별도 HTTPS preview앱으로 실제 WebView 접속 PASS: appShellReady/secureContext/익명API401/비영구 저장 확인. 앱만 검증 후 종료. ios-https-postactivation-20261020.json. 최초 sandbox simctl 조회제한은 허용 환경 조회로 해소. 물리iPhone/Android 운영HTTPS 전체기능·실제사용자세션 검증은 NOT RUN.
- 운영 화면 준비 PASS는 정식 스토어출시·최종개인정보고지·공식금융자료 검증 완료를 의미하지 않는다. 추천HOLD/실거래OFF/자료미확보PENDING 유지. 후보는 메뉴커밋 및 기존미커밋 제품소스의 manifest스냅샷이며 모든 소스가 Git푸시됐다고 표현하지 않는다. server-menu-pretransition-20261020.json 최신 ACTIVE_HTTPS_VERIFIED로 갱신.

---



# Android·실제 iPhone 운영 HTTPS 업데이트 — 2026-10-20 KST

- 사용자 “모두 진행해줘” 승인에 따라 기기 로컬서버 의존성을 제거하는 업데이트 진행. 프로젝트/origin/branch/기존변경·ARI 기준 확인. 운영 서비스 변경 없음.
- Android 기존 ai.kstock.mobile.localvalidation의 공개 인증서를 기존 검증용 keystore와 대조해 단일 일치 확인. 새 키 생성 없이 동일ID/동일서명 2.6.6(266) APK 빌드·apksigner 검증·adb install -r 성공. build-https-device.py 추가. 원래 production 소스를 기반으로 인증 우회 제거/cleartext OFF/기존127.0.0.1:3103주소만 운영HTTPS로 이전, 사용자지정 주소·토큰·데이터 삭제 없음.
- 실제 Galaxy A33 캡처로 운영 홈/전체 메뉴/모의기록 메뉴 표시 확인. 운영 토큰 미설정으로 AUTH_REQUIRED 및 연구 조회 실패 안내가 남음. 이를 인증된 자료 조회 성공으로 표현하지 않는다. 원문토큰을 앱/빌드/로그에 넣지 않았다.
- iOS build-device.py에 --https 고정운영주소 모드 추가. 기존 appID ai.kstock.ios.localvalidation·기존 기기 프로파일·서명 재사용, 0.1.2(3)로 덮어쓰기 설치 PASS. ATS HTTP예외·로컬네트워크용도문구 제거. WKWebView 비영구저장 사용. 실제 iPhone15에서 앱실행·새영수증 조회 PASS: appShellReady/secureContext/운영origin/익명401. ios-physical-https-device-update-20261020.json. 앱삭제/기기초기화/새계정·프로파일 생성 없음.
- Android 계약4/Python HTTPS 검증기4 PASS, 빌드·구문·diff check 확인. physical-https-device-update-20261020.json. 설치된 앱은 기존 테스트 앱 ID를 유지한 HTTPS 기기검증 빌드이며 정식 스토어 출시나 인증 세션 준비 완료가 아니다. 연구 API 인증은 별도 토큰 설정 필요, 금융원천HOLD·실거래OFF 유지.

---



# 기기 인증·저장 연구 연결·실제 기기 흐름 검증 — 2026-10-20 KST

- 사용자1~4단계 일괄 승인으로 진행. 프로젝트/origin/branch·ARI 기준 확인, 기존 데이터와 미커밋 보존. Android 기존 AES-GCM vault에 운영 인증 설정, iPhone에 기기전용 잠금해제 접근 Keychain 저장/갱신/삭제 UI 추가. 고정 HTTPS origin에서만 웹 탭 메모리로 인증을 전달한다. iPhone 최초401 실패는 초기 비인증 조회와 새 인증값의 경합으로 확인, 초기조회 대기 및 이전토큰401이 새 토큰을 지우지 않는 웹 방어 추가. 실제 iPhone 재실행 인증200/자격보유 PASS. Android 저장 인증 연결 확인.
- 소유자 요청에 따른 1회 인증 가져오기는 SSH로 기존 토큰을 프로세스 메모리에서 읽어 USB로 앱별 임시 파일 전달, 즉시삭제 후 Android 암호화 vault/iOS Keychain 보관. 토큰은 source/APK/Git/로그/명령 인자에 포함하지 않았다. 임시파일은 origin/5분 유효성 확인 및 읽은 직후 삭제. iOS Documents 목록에 인증파일 없음 확인. 해당 도구는 명시 운영자 실행용이며 일반앱 자동수집 경로가 아니다. 개인정보 안내 Keychain 동작 갱신.
- Mac mini job6b7df4b9 완료 보고는 EVIDENCE_RECORDED이지만 sourceCollection NOT_RUN. 신규 공식 수집 완료로 인정하지 않는다. 저장 연구 JSON33개를 해시 manifest로 패키징·운영 current/data/v2에 신규 설치, 기존 파일 덮어쓰기/사용자 기록 이동 없음. 기존 원천의 공식 사건21/보수적 시장반응3은 재조회 시점과 원문기준일을 분리. 신규 수집이 아니다. 연구 progress API/UI 추가는 stale24시간·미래·형식오류 UNVERIFIED, 완료 보고와 자료 확보를 구분하며 추천HOLD.
- 실제 Galaxy A33/iPhone15 각16개 PASS: 운영HTTPS/인증된저장연구/종목화면/미검증가격null/가상4종기록/토큰없는백업/PENDING/CSV차단/비우기/복원미리보기/4종복원/검증기록제거/가로넘침없음. android-physical-live-workflow-20261020.json 및 ios-physical-live-workflow-20261020.json. 실제 사용자 거래/공식성과가 아닌 빈 새 세션의 가상입력이다. Android QA WebView디버그는 명시 플래그에서만 켜고 완료후포워드 제거·일반모드재실행. iPhone16개결과는 최종 QA자산의 선택적 추가401검사 이전 빌드에서 실행됐으며16항목만 주장한다.
- 전체937 PASS/Android4 PASS (master-qa-20261020005336264.json), Python아카이브3/iOS영수증4 PASS. 새 회귀2개는 늦은401 경합 및 연구보고 신뢰/신선도/신규수집수 위조 방어. 실제 물리기기 결과는 로컬fixture 기존25항목과 구분. 공식 원주가·기업행동 미확보/HOLD/실거래OFF 유지. 정식스토어 제출은 미실행. 전체변경 커밋·재현가능 후보·운영소스 일치 작업은 다음 기록에서 완료 여부 확인한다.

---

# 1~4단계 완료·커밋 기반 운영본 일치 — 2026-10-20 KST

- 인증: Android 기존 암호화 vault와 iPhone 기기전용 Keychain 설정, 실제 운영 인증조회 및 재실행200 확인. 만료/거절 안내·갱신/삭제 UI, 이전401이 새인증을 지우지 않는 방어 회귀 PASS. 기기별 임시 가져오기 파일 삭제 확인, 비밀값 source/Git/APK/log 미포함. 저장인증 삭제 UI의 실제 삭제·재설정 전체 사용자 조작은 NOT RUN이며 기존 Android계약/Keychain 저장재실행 검증과 구분한다.
- 연구: 저장공식자료33개를 운영에 신규 연결, 기존파일/사용자자료 덮어쓰기 없음. 맥미니 보고 EVIDENCE_RECORDED와 외부수집 NOT_RUN/신규0 구분. `/api/v2/research/progress` 인증필수/no-store/24시간이후 UNVERIFIED. 검증운영 메뉴에 작업보고 상태 연결. 공식가격·기업행동 미확보는 PENDING/HOLD, 연구 사건수나 회귀통과로 투자성과를 주장하지 않는다.
- 두 실제 기기: 운영 전환 후 Galaxy A33/iPhone15 각16개 PASS 재확인. 운영인증·저장연구·종목화면 이동·가상기록4종·백업·복원·미확보가격null·실제API PENDING·미검증CSV차단·테스트기록제거. 종목별 실제가격/배당권리의 완전검증이 아니다. Android 디버깅포워드 제거·일반모드 재실행, iPhone도 QA 없는 인증연결 실행으로 복귀. android/ios-physical-postdeploy-workflow-20261020.json.
- Git: 미커밋제품/테스트/문서357파일 검토·secret패턴0 확인 후 5811ad676593c1701c8fcc1e4aa26381aff9d99b 커밋 및 작업브랜치 push 성공. 생성화면349개는 로컬보존·해시목록만 영수증 저장, 사용자데이터/data/env/키/네이티브빌드/Git제외. docs/AUTO_DEV_LOG.md EOF 공백은 후속기록에서 정리. Git archive만 추출한 깨끗한 디렉터리에서 새 npm ci --ignore-scripts+회귀937/Android4 PASS. clean-commit-build-20261020.json. native 서명키/기기프로파일은 기존 외부자산을 재사용하며 정식 스토어 배포가 아니다. GitHub CI는 master전용이라 현재브랜치 실행0/NOT RUN.
- 배포: 커밋과 서버/웹167파일 해시가 모두 일치하는 review-c8624b74d51f4584 생성(--require-committed), archiveSHA208b5bb0911f6b6ca8cd0f63aba3bc904ead1d3b213efe0203fb17456ad1fd8f. 원격격리설치/런타임24 PASS 뒤 기존검토경로에서 실행경로만 전환·KSTOCK재시작. 기존unit백업·환경해시보존·current/data재사용·실거래/수집/workerOFF. 실패복원구비/롤백미실행. 전환후11개 및 공개HTTPS PASS, 인증된저장연구/HOLD/progress공식수집미실행 확인. committed-server-stage/runtime/activation-20261020.json 및 access-research-public-https-20261020.json.
- 전체회귀937/Android4/브라우저29/Python보안3/iOS영수증4 PASS. 정식스토어제출/최종운영개인정보정책/공식원천신규수집/검증가격기반실성과는 미완료로 유지한다. 추가동작을 사용자에게 완료로 오인시키지 않는다. 제품 코드 기준커밋은5811ad6이며 이 문서의 후속커밋은 검증기록만 추가한다.

---

# 연구 작업 상태 신선도·재조회 보강 — 2026-10-20 KST

- 프로젝트/origin/branch/기존변경·ARI 기준 확인. 작업보고 checkedAt을 다시 게시하면 실제 오래된 작업이 최신으로 보일 수 있는 문제 수정. 완료작업 finishedAt/실행중 startedAt을 기준으로24시간 신선도를 판단, 누락/미래/게시이후작업시각/시작종료역전/알수없는상태는 UNVERIFIED. sourceCollection NOT_RUN과 신규0 구분 유지. 새 외부수집/worker활성화/실거래 없음.
- 검증운영 화면에 실제 작업시각(KST), 오래됨/시각미확인 사유, 작업보고 새로고침 버튼 추가. 요청10초 UI시간제한/새요청시기존요청취소/늦은결과무시/백그라운드복귀재확인/페이지종료취소. Android 네이티브 fetch가 AbortSignal을 무시해도 대기화면이복구되도록 candidateRequest에서 별도 취소경합 처리. 이미실행된 네이티브 HTTP작업 자체의 즉시중단을 보장하는 것은 아니며 기존30초 bridge제한은 유지.
- 신규회귀4개: 재게시신선도위장/작업시각오류, 취소신호무시중401이새인증변경못함, 늦은UI응답덮기방지, 시간초과·인증실패·페이지종료후버튼복구. 전체941 PASS/Android계약4 PASS (master-qa-20261020010415161.json), 실제Chrome 웹/Android360/iPhone390화면크기29 PASS, Node구문/diff check PASS. 이번 물리기기 검증은 후속실행기록 참조. 이전 실제기기16개 통과를 이번 변경의 재실행으로 표현하지 않는다.
- 인증정보/사용자기록/금융근거/운영환경파일 변경 없음. 추천HOLD/실거래OFF 유지. 커밋·후보·운영 반영 여부는 후속 검증기록으로 남긴다.

---

# 연구 상태 보강 운영 반영 완료 — 2026-10-20 KST

- 제품 커밋 d1a0c458d7042581a26b4daccce340f17df3c490 / 작업브랜치 push 완료. sourceMatchesCommit=true인 review-f5894b1cf096c9f3/167파일, archiveSHA951a7271c38080a3f411500c2800b6674e16e712887c8b541950d34e86ffd913 생성. 원격격리설치·런타임24 PASS 뒤 이전 review-c8624b74d51f4584에서 전환. 환경파일·current/data 보존, 기존unit백업, 자동복원준비, 롤백미실행.
- 전환후11개/공개HTTPS PASS. 실제 인증된 progress API가 finishedAt을 workAt으로 반환함을 확인, sourceCollection NOT_RUN/신규0/HOLD 유지. research-freshness-remote-stage/runtime/activation/public-https/live-api-20261020.json. 서비스active/실거래OFF 유지. 앱재설치 없이 새로고침시 공통웹코드 반영.
- 최종 전체941/Android계약4/브라우저29 PASS. CI는 master브랜치필터로 작업브랜치 실행0/NOT RUN. 이번 실제 물리기기 재실행은 NOT RUN이며 이전16개를 새실행으로 표현하지 않는다. 새 공식원천 수집/가격검증/스토어출시 완료가 아니다.

---

# 5번 시안 기반 반응형 UI/UX 재구성 — 2026-10-20 KST

- 사용자 제공 ARVIA5번의 보라/라벤더/빛·여백을 참고해 KSTOCK 자체 SVG표식, 세리프제목, 네이비본문과 연구우선 홈을 구성. 외부 이미지·웹폰트 추가 없음. CSS디자인 토큰을 별도정리하고 라이트/다크·모바일/태블릿/데스크톱 대응. 모바일 정상웹화면의 Android샘플버튼 숨김, 양OS연결도구모음 축소. 로컬Mac필수라는 오래된 문구 수정.
- Chrome217조합(7폭×2테마×15화면+7글자2배확대) PASS/가로넘침0/axe WCAG태그위반0/런타임오류0. 데스크톱홈ID우선순위 수정후 영향폭1000/1024/1440의 라이트/다크/확대9개추가 PASS. 메뉴29 PASS. 저대비 운영패널/다크인물선택 수정, 최초 실패는 최종PASS로 덮어쓰지 않고 수정내역 기록. docs/KSTOCK_UIUX_VIOLET_REVIEW.md.
- 최종 회귀941/Android4 PASS (master-qa-20261020012340763.json), 양네이티브동일서명빌드·설치 PASS. Android2.6.8(268)/iOS0.1.4(5) 대상. source/asset/backend/auth 보존. 후보·운영전환 후 실제기기 검증은 후속기록 참조. VoiceOver/TalkBack 수동전체검토/기기전체범위 미실행. 금융근거HOLD/실거래OFF 유지.

---

# 5번 디자인 최종 운영·실제 기기 확인 — 2026-10-20 KST

- 최종 제품 커밋6a5473c/후보review-b543c85fff215010(169파일, SHA be6702fdea1594d42d3b796ef0bd0792d802749fc379424d245fd0db8d4346b5)로 운영 반영. 원격27검증 및 전환후13검증/공개HTTPS PASS. 환경파일/current/data/기존인증 보존, 이전unit백업, 롤백미실행, 실거래OFF/HOLD 유지. violet-design-final-stage/runtime/activation/public-https-20261020.json.
- 실제 Galaxy A33 최종 Android2.6.8(268) 동일서명업데이트 후16개기능검증 PASS, iPhone15 iOS0.1.4(5) 동일ID/기존서명업데이트 후17개 PASS. 인증·연구·가상기록·PENDING·복원·가로넘침 확인. 검증기록은비우고 Android디버깅포워드제거/양앱일반모드복귀. native안전영역중복을줄인 최종실기기캡처 android-physical-home-final.png로 시각확인. 요약수치가 안내보다앞에표시되고 하단중복여백해소. iPhone시각전체·수동VoiceOver/TalkBack전체검토를 완료로 표현하지 않는다.
- iPhone결과파일 초기복사는 자동검토가 민감정보가능성으로거부해 실행되지않음. signed빌드의LiveWorkflow.js해시와 생성코드(status/불리언checks/time만 포함)를 확인·입증 후 결과파일1개 제한복사 승인. 토큰/사용자원장/전체컨테이너조회 없음. violet-design-final-ios-physical-20261020.json 및 Android동명영수증.
- 전체941/Android4 PASS (master-qa-20261020013047268.json). 전체반응형217 PASS 후 데스크톱홈영향9 및 최종홈밀도21 재검증 PASS, 메뉴29 PASS. 같은조합재검증을 고유테스트수로합산하지않는다. WCAG자동태그위반0/가로넘침0이며 접근성인증아님. source code/Git/secret검사완료, 제품커밋push됨. 원천금융자료검증/정식스토어제출/최종개인정보고지는별도미완료.

---
