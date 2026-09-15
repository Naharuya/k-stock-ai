# K-Stock AI v2.6.0 implementation audit

Base: package.json 2.5.1. Target: Daily Trading Agent; no order APIs.

- Reuse runDailyCandidateEngine: existing master screening, bounded quotes, deep analysis, semantic risk and committee pipeline.
- Preserve kis_service.js token cache, serialization, interval and retry behavior.
- Preserve entry_exit_service.js and existing dashboard handlers.
- Add atomic daily persistence, Seoul trading-day abstraction, pre-market validation and default-off scheduler.
- Existing candidate, semantic risk, Entry/Exit and dashboard smoke tests will be run before and after changes.
- Production API tests are separate from deterministic tests. No secrets are recorded here.

[K-Stock AI v2.6.0 완료 보고]

1. 구현 요약
기존 Candidate Engine 위에 장후 분석, 영속 저장, 장전 재검증, 기본 OFF 스케줄러와 자동 조회 Dashboard를 추가했습니다. 주문 API는 추가하지 않았습니다.

2. 추가 파일
- src/services/daily_trading_service.js
- src/services/daily_candidate_store.js
- src/services/pre_market_validation_service.js
- src/services/trading_day_service.js
- src/services/daily_scheduler.js
- src/daily_routes.js, src/daily_cli.js
- src/daily_smoke_test.js, src/daily_store_smoke_test.js
- src/daily_scheduler_smoke_test.js, src/daily_api_smoke_test.js
- src/daily_dashboard_smoke_test.js, src/daily_browser_smoke_test.js
- src/daily_test_helpers.js
- public/daily.js, public/daily.css

3. 수정 파일
- src/server.js: Daily API 및 스케줄러 연결
- src/services/candidate_engine_service.js: 시장 요약 반환 및 테스트 의존성 주입; 기본 실행 흐름 유지
- src/services/disclosure_classifier.js: 상장폐지·중요 자금조달 규칙 추가
- public/index.html: Daily 영역, 스크립트/CSS 연결, 모바일 홈
- package.json, package-lock.json, VERSION.txt: 2.6.0 및 실행 명령
- src/entry_exit_ux_smoke_test.js, src/dashboard_operational_smoke_test.js: 버전 기대값
- .env.example: 자동 실행 OFF 및 기본 실행 시각
- .gitignore: .data 제외
- .env: 실거래 플래그 false 유지 처리; API 키 값은 출력·변경하지 않음
- README.md와 이 보고서: 실제 구현 및 검증 내용

4. 신규 API
POST /api/daily/after-market, GET /api/daily/tomorrow,
POST /api/daily/pre-market, GET /api/daily/today,
POST /api/daily/revalidate, GET /api/daily/status.
POST는 202 비동기 작업이며 상태 조회로 성공/실패를 확인합니다.

5. Scheduler 구조
기본 OFF, Asia/Seoul 평일 15:40/08:30. 30초 주기 확인, 실행 중복 방지, 저장 결과 기반 재시작 중복 방지, 실패 재시도 15분 간격 최대 3회(프로세스·날짜·작업별). 서버 상시 실행이 필요합니다.

6. 저장 구조
.data/daily/after-market, pre-market, failures 아래 날짜별 JSON. 파일별 직렬화와 fsync/atomic rename, Windows 잠금 재시도. 실패 시 이전 성공 결과 유지. 민감 필드·문자열 제거.

7. 장후 분석 테스트 결과
daily:check 통과. 모의 3,989종목에서 Quote 시도 20, Deep 5를 확인했습니다. Quote 일부 실패가 전체 실패로 번지지 않고 diagnostics/errors와 부분 결과에 남았습니다.

8. 장전 재검증 테스트 결과
Critical 공시 EXCLUDED, 단순 감사보고서제출·무상증자/액면분할 거래정지 Hard Stop 아님, 자금조달 위험 DOWNGRADED, 뉴스 위험 RISK, 시장/뉴스 실패 시 미완료 표시와 날짜 전환 검증 통과.

9. 기존 Candidate 회귀테스트
candidate:check, candidate:rank, risk:semantic, screener:check 통과.

10. 기존 Entry/Exit 회귀테스트
entry-exit:check, entry-exit-ux:check, portfolio:check 통과. entry_exit_service.js 원본 SHA-256 동일.

11. Dashboard 테스트
dashboard:check와 Daily 화면 테스트 통과. Chrome PC 1440px/모바일 390px에서 모의 저장 Top 5, 모바일 순서, 버전, 가로 넘침 없음, JavaScript 미처리 예외 없음을 확인했습니다. 테스트 이미지는 .cache/daily-dashboard-desktop.png 및 daily-dashboard-mobile.png입니다.

12. 실제 API 테스트 여부
기존 OpenDART score:check는 실제 실행하여 통과했습니다. 신규 Daily 장후→장전 전체 KIS/OpenDART/뉴스 실데이터 흐름은 실행하지 않았습니다. 이번 Daily 데이터 테스트와 브라우저 테스트는 모의 데이터입니다.

13. 알려진 제한사항
공휴일·특별 거래시간 TODO, OpenDART 날짜 단위 공시 포함, 뉴스 제목 기반 판단, KIS 일봉 기반 시장 상태, 단일 프로세스 운영, 서버/PC가 꺼지면 예약 실행 불가. 보유종목은 기존 브라우저 localStorage이며 기기 간 동기화는 추가하지 않았습니다. 장전 검증은 기존 Committee 재계산이나 등급 승격을 수행하지 않습니다.

14. 다음 권장 작업
KRX 휴장일 연동, 장후와 다음 거래일 장전의 실데이터 운영 검증, 상시 실행 환경 구성. 자동 실행을 원하는 경우 README의 .env 설정을 적용한 후 서버를 재시작합니다.

실행 명령:
```powershell
npm.cmd run daily:check
npm.cmd run daily:store-check
npm.cmd run candidate:rank
npm.cmd run entry-exit:check
npm.cmd run dashboard:check
npm.cmd start
```
관리자 PowerShell 필요 없음.
