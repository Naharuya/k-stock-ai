# [K-Stock AI 운영형 전환 완료 보고]

작성: 2026-09-13 KST. 소스·APK 구현 및 검증 완료, 실행 중인 PC 서버 교체는 승인 대기.
이 문서의 거래일 정책이 이전 DAILY_MULTI_AGENT_AUDIT.md의 휴장일 자동 실행 정책을 대체한다. 기존 저장 보고서는 변경하지 않는다.

## 1. 최종 버전

소스, package.json/package-lock.json, VERSION.txt, Android manifest/APK: 2.6.4 (versionCode 264).
격리 실행한 2.6.4 서버의 /health.version과 package.json 일치: PASS.
현재 실제 3000 포트 서버의 /health.version: 2.6.3. 실행 중 프로세스를 재시작하지 않아 아직 새 health 필드가 없다. 운영 반영 완료로 표시하지 않는다.

## 2. 기존 구현 확인 결과

| 항목 | 기존 상태 | 이번 처리 |
| --- | --- | --- |
| Daily Orchestrator | 구현 | 재사용, 버전 및 거래일 정책 조정 |
| 07:00 Scheduler | 구현 | 주말·확인된 휴장일 자동 실행 제외 |
| Market Agent | 구현 | 기존 서비스 유지 |
| News Agent | 구현 | 기존 서비스·원문 검증 유지 |
| DART Agent | 구현 | 기존 공시·Semantic Gate 유지 |
| Fundamental Agent | 구현 | 기존 재무 검증 유지 |
| Valuation Agent | 구현 | 검증된 가격·재무 의존성 유지 |
| Technical Agent | 구현 | 확정 일봉 기준 유지 |
| Flow Agent | 구현 | 장전 미확정 데이터의 null/상태 처리 유지 |
| Screener Agent | 구현 | 전체 마스터 → 제한 후보 유지 |
| Risk Agent | 구현 | 기존 위험 의미 분류 유지 |
| Bear Agent | 구현 | 반대 논거 서비스 유지 |
| Investment Committee | 구현 | 점수 미확정·위험 상태 유지 |
| Entry Agent | 구현 | 상태 평가만 유지, 주문 없음 |
| Exit Agent | 구현 | 보유종목 근거 비교만 유지, 주문 없음 |
| Daily Report 저장 | 구현 | 파일 fsync 추가 |
| Morning Brief API/UI | 구현 | 카드·위험·시장·Exit·수동 제어 순서 보완 |
| 서버 재시작 후 결과 유지 | 구현 | 격리 서버 프로세스 재시작으로 재검증 |
| 중복 실행 방지 | 구현 | 실행·스케줄 잠금과 완료 보고서 재확인 유지 |
| KIS Rate Limit 보호 | 구현 | 토큰 캐시·큐·직렬화·유한 간격/재시도 유지 |

Agent는 기존 서비스의 업무 실행 단위이며, 새 독립 LLM 프로세스를 만든 것은 아니다. Valuation의 검증 가격·기술지표 의존성 등 기존 분석 의존 순서를 유지한다.

## 3. Daily Multi-Agent 구현 내용

- 거래일 확인 후 공통 시장·공시·뉴스, 마스터 선별, Quote, 정밀분석, Risk, Bear, Committee, Entry, Exit, Report 저장 구조 재사용.
- 자동 실행 기본 OFF. true일 때만 예약 실행하며 주말·확인된 휴장일은 건너뛴다.
- 동일 날짜 SUCCESS는 자동 재실행하지 않는다. force=true는 기존 수동 실행 경로로만 사용한다. 실패/부분 완료 자동 재시도는 기존 유한 예산 안에서 수행한다.
- 전체 마스터 → 후보 60 → Quote 20 → Deep 5 유지. 별도 balanced 경로는 후보 40 → Quote 15 → Deep 3.
- 장전 미확정 체결·수급을 실제 0으로 표시하지 않는다. 기존 null과 PRE_MARKET_DATA_NOT_AVAILABLE 처리 유지.
- 한 Agent 실패로 서버를 종료하지 않는 기존 부분 실패 격리 유지.

## 4. Scheduler 상태

새 소스: 기본 enabled=false, 07:00 Asia/Seoul, days=TRADING_DAYS, 30초 간격 확인, 서버 시작 후 지연 실행, 같은 날짜 중복 방지.
기존 PC의 명시적 활성 설정은 보존했다. .env를 수정하지 않았다. 현재 실행 중인 2.6.3 프로세스의 이전 정책은 2.6.4로 교체한 뒤 변경된다.
실제 07:00 정각 관측: 미검증. 월요일 07:00 시간 주입·자동 start, 06:59 미실행, 주말/휴장일 제외, 재시작 중복 방지 테스트는 PASS.

## 5. Agent별 실행상태

2.6.4 오프라인 Orchestrator fixture: Market, News, DART, Screener, QuoteValidation, Fundamental, Valuation, Technical, Flow, Risk, Bear, InvestmentCommittee, Entry, Exit 모두 SUCCESS.
부분 실패 fixture에서는 실패 Agent가 FAILED/PARTIAL로 남고 다른 Agent가 계속 실행됨을 검증했다.
현재 PC의 저장된 실데이터 결과는 이전 2.6.3 보고서다. 이번 2.6.4 실데이터 전체 자동 분석을 실행했다고 표시하지 않는다.

## 6. Morning Brief 결과

모의 데이터: 보고서 생성·저장·재로딩 PASS, 후보 카드 5개, Entry 상태 5개, Exit 평가 1개.
실제 저장 결과는 .data/daily/2026-09-13/daily-report.json에 보존되어 있다. 이전 실행의 가격·수급 기준일은 2026-09-11이며 처리 결과는 SUCCESS였다. 이는 모든 종목의 투자 점수가 확정됐다는 의미가 아니다.

## 7. 신규 API

요청한 6개 Daily API는 이미 존재하여 중복 추가하지 않았다.
GET /api/daily/latest, POST /api/daily/run, GET /api/daily/agents/status, GET /api/daily/candidates, GET /api/daily/portfolio, GET /api/daily/report.
/health에 uptime, dailyAgentEnabled, schedulerStatus를 추가하고 기존 필드도 유지했다.

## 8. 저장 구조

.data/daily/YYYY-MM-DD/{market,disclosures,news,candidates,committee,entry,exit,daily-report}.json과 기존 진행상태·스케줄·알림 기록 유지.
새 구조화 로그: .data/logs/server/YYYY-MM-DD.jsonl, .data/logs/supervisor/YYYY-MM-DD.jsonl.
운영 heartbeat: .data/operations/heartbeat.json (기존 경로 유지, 원자적 기록).
별도 프로필 사용 시 .data/profiles/<profile>/ 아래로 격리된다.
임시 파일 작성·fsync·rename 및 오류 처리 재사용. 원문 오류/요청 body/인증 헤더는 로그에 넣지 않는다.

## 9. 서버 bind address

현재 ::, IPv4 LAN 연결도 실제 HTTP 200 확인. localhost 전용이 아니므로 0.0.0.0으로 불필요하게 변경하지 않았다.

## 10. Local URL

http://localhost:3000

## 11. LAN URL

http://192.168.0.9:3000

## 12. /health 결과

현재 실제 서버 localhost/LAN 모두 HTTP 200, version=2.6.3, liveTrading=false.
격리 2.6.4 서버에서는 localhost/LAN HTTP 200 및 요청한 모든 health 필드와 버전 일치 확인.
현재 3000 포트에 2.6.4를 반영하고 재확인하는 단계는 승인 대기.

## 13. 모바일 연결 테스트 결과

- 실제 격리 서버의 LAN IP에 PC에서 모바일과 같은 인증 순서로 요청: health 200, 미연결 API 401, 1회용 pairing 후 Daily API 200, payload 검증 PASS.
- Android ServerAddress Java 클래스를 실제 컴파일/실행: LAN/HTTPS 허용, loopback/잘못된 포트/인증정보 포함 주소 거부 PASS.
- 기본 HTTP 차단 유지. 최종 APK XML 확인 결과, HTTP 예외는 192.168.0.9 하나이며 localhost/127.0.0.1 예외는 없다.
- build.ps1은 실제 PC LAN IPv4 또는 -LanHosts로 명시한 사설 IPv4만 APK 예외 목록에 넣는다. HTTP 서버 IP가 바뀌면 앱 재빌드가 필요하다. HTTPS 고정 도메인 전환은 서버 주소 설정에서 가능하다.
- WebView의 다른 HTTP 서버로 향하는 리소스 요청을 차단한다.
- 실제 헤드리스 브라우저 390px/1440px: Morning Brief, 후보, 위험, Exit, 내일 후보, 수동 제어 순서와 기존 상세분석/보유종목 흐름 PASS.
- Android APK 2.6.4 빌드, 기존 키 서명 및 v2/v3 서명 검증 PASS.
- Android 실기기: 미검증 (ADB 연결 기기 없음). iPhone Safari 실기기: 미검증. 모바일 뷰포트 테스트와 구분한다.

## 14. Candidate 결과

Daily 오프라인: 마스터 3,989 → 후보 60 → Quote 20 → Deep 5.
Balanced 오프라인: 마스터 3,989 → 후보 40 → Quote 15 → Deep 3.
3,989는 fixture 값이며 실데이터 전체 종목 수로 재표시하지 않았다. 이전 실데이터 보고서에는 3,988개가 기록되어 있다.

## 15. Entry 결과

오프라인 5개 상태 생성 및 자동매수 없음 확인. 이전 실데이터의 상위 5개 WATCH와 미확정 점수는 그대로 보존했다.

## 16. Exit 결과

오프라인 보유종목 1개 평가, 매수 근거 보존, 손실·위험 검토 상태, 미확정 데이터 보류 검증 PASS.
실제 보유종목은 없으므로 이번 실데이터 Exit는 미실행. 자동매도는 구현하지 않았다.

## 17. 회귀테스트 결과

실제로 실행하여 최종 통과한 항목:

- daily-agents:check (월요일 자동 실행, 주말 제외, 순서, 실패 격리, 저장·재시작·중복 방지·KIS 모의 rate limit)
- daily-agents:run / daily-agents:status의 동일 CLI 스크립트: 격리 2.6.4 서버에서 성공 응답 확인
- server:check (localhost/LAN health, JSON 오류 격리, 격리 서버 재시작, fatal 예외·Promise 오류 제어 종료, 로그 비밀값 배제, supervisor 모의 복구 간격)
- mobile-api:check (LAN pairing/API payload, Android Java 주소 검증)
- candidate:rank, candidate:balanced (기본 OFFLINE; --live로 기존 실연동 모드 유지)
- risk:semantic, entry-exit:check, dashboard:check
- daily:store-check, daily:check, reliability:check
- daily-agents:browser-check, mobile:check
- android:build (컴파일 경고는 있었으나 APK 생성·서명 검증 성공)

추가 의존성을 설치하지 않았고 기존 Risk Semantic Gate 및 주문 금지 규칙을 유지했다.

## 18. 실제 KIS/OpenDART 테스트 여부

기존 kis_quote_smoke_test.js와 dart_smoke_test.js를 실제로 실행했다.
2026-09-13 14:06 KST: 삼성전자(005930) KIS 시세·일봉 200개 조회 PASS, OpenDART 회사정보 조회 PASS. 토큰 및 캐시 재사용 포함. 결과 출력은 성공 여부·종목코드·개수로 제한했다.
실제 KIS 실데이터 테스트: 수행. 실제 2.6.4 전체 07:00 자동 분석: 미검증.
주문 API와 전체 종목 개별 Quote는 호출하지 않았다.

## 19. 실패/미검증 항목

최종 실행 테스트 실패 없음. 수정 중 발견한 기존 Daily JSON 오류 응답 차이는 기존 응답을 보존하도록 테스트를 수정하고 재실행했다.
운영 서버 2.6.4 반영·재시작: 승인 대기. 현재 /health 2.6.3과 소스 2.6.4의 불일치를 숨기지 않는다.
실제 07:00, 실제 모바일 접속, PC 절전/재부팅 복구, Mac/VPS 배포: 미검증.
CI, commit, push: NOT RUN. 다수의 기존 미커밋 변경을 보존했다.
자동 승인 검토가 Android 전역 HTTP 허용 변경을 거부했다. 해당 변경은 실행되지 않았으며, 기본 차단을 유지하는 명시적 LAN IP 예외 방식으로 구현·APK 검증을 완료했다.

## 20. 관리자 PowerShell 필요 여부

방화벽 변경 필요 없음. Wi-Fi Public 프로필에 Node.js 허용 규칙이 있고 활성 인바운드 차단 규칙은 0개였다. 관리자 방화벽 명령을 실행하지 않았다.
운영 서버 교체 승인은 관리자 방화벽 권한과 별개다.

## 21. 다음 권장 작업

AGENTS.md의 “production server를 자동 변경하거나 재시작하지 않는다”, “운영 서버 재시작 ... 사용자 승인 전에 실행하지 않는다” 지침에 따라 현재 실행 중 PC 서버의 교체는 보류했다.
승인 후 구체적인 적용 순서:

1. 실행 중 분석이 없는지와 현재 supervisor가 관리하는 PC 서버 PID를 재확인한다.
2. 해당 프로젝트의 기존 Windows 작업/관리 서버만 중지하고 같은 작업으로 2.6.4를 시작한다. 다른 Node 프로세스를 종료하지 않는다.
3. localhost/LAN /health.version=2.6.4, 새 health 필드, TRADING_DAYS 정책, 저장 결과 보존을 확인한다.
4. Android 연결 시 APK를 설치하고 실제 기기 LAN 접속을 확인한다. 서명 불일치·unauthorized는 강제로 우회하지 않는다.
5. 다음 거래일 07:00 실행·notification을 관측한다. PC 전원·로그인·네트워크 가용성은 필요하다.

## 변경 파일

신규: src/services/log_service.js, server_runtime_service.js, server_recovery_service.js; src/server_test_helpers.js, server_smoke_test.js, mobile_api_smoke_test.js, mobile_address_smoke_test.js; android/src/ai/kstock/mobile/ServerAddress.java; OPERATIONS_TRANSITION_REPORT.md.
수정: package.json, package-lock.json, VERSION.txt, .env.example, src/server.js, src/server_supervisor.js, src/daily_agents_cli.js, src/services/daily_agent_orchestrator.js, morning_scheduler.js, morning_store.js, src/daily_agents_smoke_test.js, morning_browser_smoke_test.js, candidate_engine_balanced_smoke_test.js, public/index.html, android/AndroidManifest.xml, android/res/xml/network_security_config.xml, android/src/ai/kstock/mobile/MainActivity.java, BriefNotificationJob.java, android/build.ps1.
기존 .env 및 API 자격증명은 출력·수정하지 않았다. KSTOCK_LIVE_TRADING_ENABLED=false 상태를 확인했다.

APK: public/downloads/k-stock-ai-2.6.4.apk.


## 운영 서버 전환 결과 (2026-09-13)

기존 승인 대기 상태는 해소되었습니다.

[K-Stock AI v2.6.4 운영 서버 전환 완료 보고]

검증 시각: 2026-09-13 14:28 Asia/Seoul

1. 교체 결과: v2.6.4 전환 완료. 기존 예약 작업 재사용. 의존성 변경이 없어 npm install 불필요.
2. 이전 실행 버전: 2.6.3 (PID 3044, supervisor 22404).
3. 현재 실행 버전: 2.6.4. package.json과 실제 /health 일치.
4. 서버 PID: 13672. supervisor PID: 29272. heartbeat healthy=true, consecutiveFailures=0.
5. bind address: :: (IPv4 LAN 접근 확인), TCP 3000.
6. Local URL: http://localhost:3000
7. LAN URL: http://192.168.0.9:3000 (Wi-Fi 실제 IPv4 확인).
8. /health 결과: localhost 및 LAN 모두 실제 HTTP 200, version=2.6.4.
9. Daily Multi-Agent 상태: 유휴. 기존 저장 실행 결과 13 Agent SUCCESS, ExitAgent SKIPPED(보유 종목 없음). 재시작 후 새 분석은 실행하지 않음.
10. Scheduler 상태: enabled/running=true, 07:00 Asia/Seoul, TRADING_DAYS, 오류 필드 null. 실제 07:00 자동 실행 관찰은 NOT RUN.
11. Morning Brief 상태: /api/daily/latest 및 /api/daily/report HTTP 200. 2026-09-13 SUCCESS 보고서 보존. 보고서 생성 버전 2.6.3은 역사적 기록으로 유지.
12. Candidate 상태: /api/daily/candidates HTTP 200, 기존 후보 5개.
13. Entry/Exit 데이터 보존: 두 날짜의 Entry/Exit 및 모든 기존 Daily 파일 해시 일치. 기존 파일 36개 중 34개 동일, 로그 1개 원문 보존 후 추가, heartbeat 1개 정상 갱신. 누락/손상 없음. .env 해시 동일. portfolio 조회 HTTP 200, 보유 0/평가 0.
14. Dashboard 결과: /dashboard 및 / 실제 HTTP 200. 이번 운영 전환에서 실제 브라우저 UI 조작은 NOT RUN. 격리 server:check PASS.
15. 실제 모바일 테스트 여부: NOT RUN. adb 연결 기기 없음. PC에서 LAN HTTP 접근은 PASS.
16. 실거래 비활성화: KSTOCK_LIVE_TRADING_ENABLED=false 확인, health liveTrading=false. 주문 API 호출 및 자동매매 활성화 없음.
17. 오류/경고: 시작 로그 KRX_CALENDAR_SYNC_FAILED. 기존 calendar/krx.json 해시 동일, scheduler running=true. 원격 동기화 실패 원인은 이번 전환에서 미확정. 종료 중 이미 종료된 PID에 대한 Stop-Process 경합 발생; 두 기존 PID 부재 및 포트 해제 확인 후 한 차례 시작. 추가 재시작/수동 동기화는 하지 않음.
18. 롤백 가능 여부: rollback-v2.6.3에 코드/정적 파일/scripts/package 잠금 파일 보관, 버전 2.6.3 확인. before.json/after.json에 보존 검증 기록. 실제 롤백 부팅은 NOT RUN. 복구 시 예약 작업을 중지하고 복구 코드만 원래 프로젝트에 반영; .env/.data/로그는 덮어쓰거나 삭제하지 않음.
19. 다음 권장 작업: KRX 달력 동기화 원인 점검, 다음 거래일 07:00 실행 확인, 휴대폰에서 LAN 주소 접속 확인.
