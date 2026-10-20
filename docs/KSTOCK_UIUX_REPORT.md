K-STOCK AI UI/UX DEVELOPMENT REPORT

PROJECT:
/Users/ari/ARI/projects/k-stock-ai

BRANCH: auto/kstock-development-20260930
COMMIT: ea406852610c00bef0dbe469de95c42fca662c30 (기존 HEAD, 이번 변경 미커밋)
VERSION: Web package 1.0.0 / Android 2.6.5 (265)

DESIGN SYSTEM: PASS — 기존 HTML/CSS/JavaScript 유지. 3개 디자인 방향 비교 후 Adaptive Hybrid 적용. 시스템/라이트/다크, 색상 토큰, 카드·표·상태·포커스·모바일 하단 메뉴.
DASHBOARD: PARTIAL — 로컬 Health·후보 API 연결, 분석 시간·품질 표시. KOSPI/KOSDAQ와 최근 정상 수집 시각은 검증 데이터 미연결.
STOCK DETAIL: PARTIAL — 기존 재무·근거·위험 표시, 검증 READY 가격 시계열 SVG 및 지원 기간 선택 구현/fixture 검증. 실제 승인 시계열 없음.
HISTORICAL VALUATION: PARTIAL — 현재 값·중앙값·표본 수·차이·제외 사유·기준일 비교표 구현. 실제 KR 자료 검증 미완료; 분포/변화 차트 추가 필요.
PEER COMPARISON: PARTIAL — 기존 API 모델의 기업·PER/PBR/PSR·기준일 및 상대 PER 막대 표시. 실제 KR 연결 미완료.
AI CANDIDATES: PASS(UI) / PARTIAL(DATA) — 이름·업종·분석일·품질 필터, 위험/날짜 정렬, 실제 선정 이유·위험 표시. Apple 추천 순위 보류 유지.
PAPER PORTFOLIO: PARTIAL — 사용자 가상 매수가·수량과 검증 기준가격으로 평가·손익·수익률·통화별 합계·비중 계산. 탭 메모리만 사용, 새로고침 시 소멸. 누적 성과·시장 벤치마크 미연결. 실제 체결/배당/수수료 반영 없음.

ANDROID: PARTIAL — 운영 앱 인증·페어링·서버 설정 코드 유지, 별도 로컬 검증 패키지 사용.
ADB: PASS — Galaxy A33 SM-A336N, 사용자 선택 기기.
BUILD: PASS — 최종 복원된 운영 소스 복사본 빌드 및 검증용 키 서명.
INSTALL: PASS — ai.kstock.mobile.localvalidation, install -r, 기존 앱 데이터 삭제 없음.
LAUNCH: PASS — 실행·재실행 및 실제 화면 캡처로 대시보드/하단 메뉴 표시 확인. USB localhost 서버 사용. 운영 인증/페어링 미검증.
APK: android/build/local-validation-tstpw597/build/release/k-stock-ai-local-validation.apk
검증: 가로 화면, 검색 입력·키보드 및 뒤로가기로 키보드 닫기, USB 서버 연결 오류/재연결. 미검증: 전체 시스템 뒤로가기 흐름, 모든 화면의 실제 기기 오류 조작. UI 계층 도구가 WebView를 노출하지 않아 초기 빈 화면 판정은 화면 캡처로 정정했고 불필요한 native 수정은 전부 복원.

WEB: PASS(검증 범위) — 실제 headless Chrome, 로컬 실제 후보 1개/저장 성과 보고서 조회 확인.
MOBILE RESPONSIVE: PASS — 360/390px, 라이트/다크, 페이지 가로 넘침 없음, 하단 메뉴 표시.
TABLET RESPONSIVE: PASS — 768/1024px, 라이트/다크, 페이지 가로 넘침 없음.
DESKTOP RESPONSIVE: PASS — 1440px, 라이트/다크, 사이드바 표시.
증거: docs/uiux/design-directions.html, dashboard-light-desktop.png, dashboard-dark-mobile.png.

API CONNECTION: 로컬 /api/health, /api/v2/candidates 및 상세, /api/v2/performance 및 상세, /api/reports. 기존 미국 공시 화면 유지. 모의 계산은 클라이언트 메모리; 별도 주문 API 없음.
REAL DATA STATUS: 저장된 Apple 분석·성과 보고서 읽기 성공, 추천/성과 보류. KIS/OpenDART 미설정, 시장지수·KR 비교·검증 가격시계열·총수익/벤치마크 미연결. 연결 설정 유무와 정상 수집 검증을 구분. 이번 신규 외부 수집 없음.

TESTS:
BASELINE: 162
CURRENT PASS: 199 offline + 3 separate Android contracts
CURRENT FAIL: 0
추가 UI 검증: 대시보드 오래된 데이터/수치, 후보 필터, 비교 누락/제외, 차트 기간/선택 초기화, 일일 보고서 응답 계약, 모의 손익 및 잘못된 입력. 기존 인증/응답 경쟁 검사 유지. git diff --check PASS.

SECURITY:
LIVE TRADING: OFF
REAL ORDERS: 0
.env 및 인증정보 변경 없음. 브라우저 토큰은 기존 세션 메모리 방식 유지. 키/개인키 패턴 검사를 변경 UI/서버 코드와 새 디자인 자료에 수행(값 출력 없이); 발견 없음. 운영 native 변경 없음. 새 개인정보 수집/영구 저장/외부 AI 전송 없음.

MODIFIED FILES:
public/index.html, public/styles.css, public/app.js, src/server.js, src/v2/orchestrator.js, test/candidate_ui.test.js, docs/uiux/*, docs/KSTOCK_UIUX_REPORT.md, docs/AUTO_DEV_LOG.md.
기존 미커밋 백엔드 및 사용자 변경 보존. 운영 ari-prod-01 /srv/k-stock-ai/current https://kstock.ai.kr 변경 없음. Git push/merge 없음.
REMAINING ISSUES: 실제 한국 데이터, 시장 지수, 지원 가격 기간, 비교 분포/변화, 누적 모의 성과/벤치마크, 미검증 기기 조작. 전체 출시 완료로 간주하지 않음.
NEXT ACTION: 가로/키보드/뒤로가기/네트워크 상태 실기기 확인과 누적 성과 화면 개발. 실제 KR 연결은 사용자 인증정보·종목 확정이 필요.

OVERALL:
PARTIAL


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
