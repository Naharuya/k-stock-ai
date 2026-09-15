# K-Stock AI Daily Multi-Agent 상태/완료 보고

점검일: 2026-09-13 Asia/Seoul. 프로젝트 버전: 2.6.3.
기준 Git HEAD: 02950e81e31fff0f12e42f37b28a682b348f422a (master).
기존 미커밋 변경을 보존했고 이번 작업을 커밋하거나 push하지 않았다.

## 수정 전 20개 항목 점검

| 번호 | 항목 | 수정 전 구현 | 근거 / 확인한 제한 |
| --- | --- | --- | --- |
| 1 | Daily Orchestrator | 구현 | src/services/daily_agent_orchestrator.js; 10단계 실행, 실패 격리, 취소 |
| 2 | 07:00 Scheduler | 부분 구현 | morning_scheduler.js; KST, 기본 07:00, 지연 실행, 재시도. 휴장일 미실행 및 프로세스 간 재시도 상태 경쟁 보완 필요 |
| 3 | Market Agent | 구현 | morning_analysis.js → market_context_service.js; 마지막 거래일 지수 검증 |
| 4 | News Agent | 구현 | 기간 필터·중복 제거·고위험 기사 원문 검증, 부족하면 부분 상태 |
| 5 | DART Agent | 구현 | 야간 공시, 의미 분류, 중요 공시 원문 |
| 6 | Fundamental Agent | 구현 | dart_analysis_service.js; 재무 검증, 최신 중간재무·TTM 정보 |
| 7 | Valuation Agent | 구현 | 가치 지표, 비교 가능한 업종 데이터가 있을 때 상대평가 |
| 8 | Technical Agent | 구현 | 확정 일봉 120개 이상, 기준일 검증 |
| 9 | Flow Agent | 구현 | 확정 수급 20개 이상, 누락 금액을 0으로 대체하지 않음 |
| 10 | Screener Agent | 구현 | 종목 마스터 → 후보 60개; enrich=0 |
| 11 | Risk Agent | 구현 | 핵심 데이터 누락, 공시·뉴스·거래제한 위험 |
| 12 | Bear Agent | 구현 | 반대 논거와 기존 위험 근거 |
| 13 | Investment Committee | 구현 | 기존 규칙 기반 위원회 서비스, 점수 미확정·위험 결과 가능 |
| 14 | Entry Agent | 구현 | 후보 선택 및 관찰/관심/조건충족 분류; automaticBuy=false |
| 15 | Exit Agent | 구현 | 서버 보유종목과 원래 진입 근거 비교; 주문 없음 |
| 16 | Daily Report 저장 | 구현 | morning_store.js; 날짜별 원자적 파일 교체 |
| 17 | 모바일 Morning Brief API/UI | 구현 | morning_routes.js, public/morning.js; 읽기 시 분석 시작 안 함 |
| 18 | 서버 재시작 후 결과 유지 | 구현 | 날짜별 JSON 재로딩, 기존 테스트 및 이번 재로딩 검증 |
| 19 | 중복 실행 방지 | 부분 구현 | 실행 중 상태·파일 잠금·완료 보고서 확인은 존재. 스케줄 상태 경쟁과 force=true 재실행 경계 보완 필요 |
| 20 | KIS rate limit 보호 | 부분 구현 | 직렬 큐, 토큰 재사용, 429/EGW00201 재시도 존재. Infinity 등 잘못된 설정의 유한 상한 보완 필요 |

Agent는 기능별 서비스 실행 단위다. 각각이 독립 LLM 프로세스로 동작하는 구조는 아니다. 요청된 13개 분석 Agent에 QuoteValidationAgent를 더해 상태 항목은 14개다.

## 이번에 추가/수정한 기능

- 매일 07:00 실행: 휴장일에도 최신 뉴스·공시와 마지막 거래일 가격·수급으로 실행한다. NON_TRADING_DAY, MARKET_CLOSED, tradingDay=false와 UI 문구로 구분한다.
- 기존 MorningStore 잠금을 스케줄 상태에도 재사용한다. 중복 스케줄러 테스트는 수정 전 2회 요청에서 수정 후 1회 요청으로 바뀌었다.
- 자동 실행은 force=false로 완료 보고서를 실행 잠금 안에서 다시 확인한다. 실패·부분 완료 작업만 retryFailed로 재실행하고, 기존 성공 작업 캐시를 제한된 기간 재사용한다.
- 재시도 상태를 디스크에 유지하며 하루 최대 3회, 완료 시점 기준 15/30/45분 대기한다. 수동 취소 결과는 자동 재시도하지 않는다.
- KIS 설정의 NaN/Infinity/음수/비정상 값을 처리한다. 요청 간격 1,200~60,000ms, 재시도 0~5회(기본 2), 대기 1,000~300,000ms(기본 61,000)로 제한한다. 일반 403과 인증 오류는 무조건 재시도하지 않는다.
- 중지되어 있던 기존 Windows 작업 `K-Stock AI Research Server`를 시작했다. 작업 정의를 새로 만들거나 교체하지 않았으며, 실행 중 서버를 종료하지 않았다.

## 신규 파일

- src/morning_scheduler_smoke_test.js
- src/kis_rate_limit_smoke_test.js
- DAILY_MULTI_AGENT_AUDIT.md

## 수정 파일

- src/services/daily_agent_orchestrator.js
- src/services/morning_scheduler.js
- src/services/morning_store.js
- src/services/morning_analysis.js
- src/services/kis_service.js
- public/morning.js
- src/daily_agents_smoke_test.js
- src/morning_browser_smoke_test.js
- package.json (기존 daily-agents:check에 새 테스트 연결; 의존성 변경 없음)

이전 작업의 src/server.js LAN 로그 변경과 기타 기존 변경은 보존했다. 이번 작업에서 .env, API 자격증명, 주문 코드는 수정하지 않았다.

## Scheduler 상태

실행 서버 API 확인: enabled=true, running=true, 07:00 Asia/Seoul, days=EVERY_DAY, error=null.
30초 간격으로 시간을 확인하며 07:00 이후 서버가 시작되면 당일 미완료 분석을 실행한다.
이번 실데이터 실행은 07:00 정각 관측이 아니라 13:41:29 KST 서버 시작 후 지연 실행이었다. 버튼이나 POST /api/daily/run을 호출하지 않았다.
Windows 작업은 로그인 시와 06:55 실행, WakeToRun 설정이 이미 등록되어 있다. PC가 켜져 있고 사용자가 로그인되어 있으며 네트워크에 연결되어 있어야 한다. 전원 꺼짐 상태의 실행은 보장하지 않는다.

## Agent별 실행상태

2026-09-13 실제 자동 실행에서 Market, News, DART, Screener, QuoteValidation, Fundamental, Valuation, Technical, Flow, Risk, Bear, InvestmentCommittee, Entry는 SUCCESS였다.
Exit는 실제 보유종목 0개로 SKIPPED였다. 별도 오프라인 보유종목 fixture에서는 Exit까지 14개 Agent가 SUCCESS였다.
이 상태는 처리 완료 상태다. 모든 종목의 투자 점수가 확정됐다는 뜻은 아니다. 이번 정밀분석 5개 중 Committee 결과는 WATCH 1개, RISK 2개, DATA_INCOMPLETE 2개다.

## Daily Report 저장 위치 / Morning Brief 결과

- 실제 보고서: .data/daily/2026-09-13/daily-report.json
- 같은 폴더에 market, disclosures, news, candidates, committee, entry, exit, analysis, agents-status, run-all, scheduler, notification JSON 저장
- 프로필을 별도로 쓰면 .data/profiles/<profile>/daily/<YYYY-MM-DD>/ 경로 사용
- 결과: SUCCESS, 완료 시각 2026-09-13 13:42:30 KST, 오류 목록 0건
- 세션: NON_TRADING_DAY; 가격·수급 기준일 2026-09-11; 시장 분류 NEUTRAL_MIXED
- 디스크에서 새 MorningStore 인스턴스로 재로딩한 보고서가 원본과 일치함을 확인
- /health 및 /api/daily/latest, report, candidates, portfolio, agents/status 모두 실제 서버에서 HTTP 200

## Candidate / Entry / Exit 결과

실제 마스터 3,988개 → 후보 60개 → KIS 후보 시세 20개 → 정밀분석 요청/완료 5개.
3,989는 기존 fixture의 수이며 실데이터 종목 수를 고정하거나 실제 3,988을 3,989로 표시하지 않았다. 전체 종목 각각에 KIS 실시간 API를 호출하지 않았다.

Entry 상위 5개는 서희건설(035890), 지엔씨에너지(119850), JW신약(067290), 에스앤에스텍(101490), 에스에이엠티(031330)이며 모두 WATCH다. 현재 순위의 상위 후보는 정밀분석 완료 대상과 다를 수 있고 이 5개는 위원회 점수가 미확정이다. 이는 자동매수 목록이 아니다.
실제 Exit 결과는 보유종목이 없어 0개. 오프라인 fixture에서는 1개 보유종목의 평가, 매수가·원래 투자 근거 보존, 데이터 부족 시 WATCH와 null 점수 처리를 검증했다.
automaticOrders=false, 실제 서버 health의 liveTrading=false를 확인했다.

## 실행한 테스트

다음 npm 명령이 실제로 종료 코드 0으로 통과했다.

- npm run daily-agents:check: 07:00 자동 시작, 주말 실행, 14개 Agent, 순서, 부분 실패, 취소, 후보 호출 제한, 저장/재시작, API, 중복 스케줄러, KIS 오류별 모의 재시도
- npm run reliability:check
- npm run daily:check (기존 파이프라인·스케줄러·API·대시보드 4개 검사)
- npm run daily:store-check
- npm run calendar:check
- npm run portfolio:check
- npm run entry-exit:check
- npm run candidate:check
- npm run daily-agents:browser-check (휴장일 표시 포함, 실제 헤드리스 브라우저, 1440px/390px)
- npm run mobile:check (모의 데이터의 모바일 화면)

변경 파일 구문 검사, 차이 검토, 비밀값 검사도 통과했다. 신규 KIS 테스트는 모든 fetch를 모의 응답으로 대체하고 임시 캐시만 사용한다.

## 실제 KIS/OpenDART 테스트 여부

기존 서버를 통한 자동 분석에서 실제 KIS/OpenDART 의존성을 사용했다. 캐시 재사용을 포함하는 연동 실행이며 모든 응답을 새로 조회했다고 주장하지 않는다. KIS 후보 시세 20개가 검증됐고 DART/재무 및 기술·수급 단계가 완료됐다. 주문 API는 호출하지 않았다.
별도 npm run kis:check, dart:check, daily-agents:live-check는 NOT RUN: 같은 데이터를 불필요하게 추가 호출하지 않았다.

## 실패/미검증 항목 및 다음 개발 권장사항

- 실행한 최종 회귀 테스트 실패 없음. 수정 중 발생한 실패는 수정 후 재실행해 통과했다.
- 실제 07:00 정각과 다음 날 연속 실행, PC 절전 복귀, 실제 프로세스 강제 종료 후 자동 복구: NOT RUN. 시간 주입·저장 재로딩·스케줄러 재생성 테스트와 구분한다.
- Android 실기기 및 APK 빌드: NOT RUN. 웹 UI만 변경했고 헤드리스 모바일 뷰포트로 검증했다.
- CI, commit, push: NOT RUN. 로컬 검증이며 기존 다수 미커밋 변경을 보존했다.
- 종목별 Committee DATA_INCOMPLETE를 처리 성공 상태와 함께 더 선명하게 노출하고, 상위 후보와 정밀검증 완료 후보를 UI에서 구분하는 개선을 권장한다.
- 다음 관측 지점은 2026-09-14 07:00 KST 자동 실행과 notification.json이다. 뉴스 원문 수집 실패나 재무 데이터 부족이 발생하면 부분 상태를 그대로 유지해야 한다.
