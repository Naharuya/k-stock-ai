# v2.6.4 실제 예약 실행 검증

실행: npm run operations:morning-check -- 2026-09-14
날짜 생략 시 현재 Asia/Seoul 날짜를 사용합니다. 07:00 실행 완료 후(예: 07:15 이후) 실행하세요. 날짜를 지정하면 과거 보고서를 읽을 수 있지만 HTTP API 검사는 현재 서버의 최신 상태입니다.

읽기 전용: .data/daily/<date>/daily-report.json 및 scheduler.json, 서버 JSONL 로그, localhost GET health/latest/report/candidates/portfolio만 조회합니다. 분석 실행, 스케줄 등록/변경, 주문 API, .env 읽기 및 운영 데이터 쓰기를 하지 않습니다.

판정:
- PENDING: 예약 전 또는 시작 후 15분 이내 보고서 대기/실행 중. 성공 판정이 아닙니다.
- PASS: 같은 날짜/engineVersion/runId, 07:00분(07:00:00~07:00:59) 시작, 완료 결과/Agent 상태/조회/안전 플래그 및 가용 로그 증거가 일치.
- PARTIAL: 달력 FALLBACK/STALE/FAILED, Agent PARTIAL/FAILED/누락, 로그 증거 부족, 여러 예약 시도 등 추가 검토 필요.
- FAIL: 시작 시각/runId/버전 불일치, 완료 보고서 실패, 15분 이후 보고서 미생성, health 실패, crash 이벤트, liveTrading=true 등.
- 종료 코드: PASS=0, FAIL=1, PARTIAL/PENDING=2 (npm/PowerShell이 비영 종료를 오류로 표시할 수 있음).

증거 한계: 기존 저장소는 실행별 불변 감사 로그가 아니므로 여러 시도를 정당한 retry와 중복 실행으로 항상 구분할 수 없습니다. 중복 증거 필드와 attempts를 함께 확인하세요. crash 검사는 가용 로그에 한정되며 조용한 OS 강제 종료를 모두 입증하지 못합니다. 주문 감사 필드는 과거 모든 주문 부재를 보증하지 않습니다. 검증기는 어떠한 주문도 호출하지 않습니다.

2026-09-13 준비 검증:
- 판정 테스트 PASS. 실제 내일 날짜 검사 PENDING/SCHEDULE_NOT_DUE.
- 운영 server12280/supervisor10520, v2.6.4, Scheduler enabled/running=true, nextRunAt 2026-09-14 07:00 KST.
- 전원 자동절전 AC/DC=0(안 함), AC 최대절전=0. 예약 작업 시간제한 PT0S, 배터리 중단 없음, WakeToRun=true, 재시작3회/PT1M. PC 수동절전/종료/정전 및 네트워크 단절은 보장 불가. 설정 변경 없음.
- Android SM-S908N USB 연결. 이전 앱 화면 페어링 및 Morning Brief 표시 성공. 이번 앱 재실행 후 잠금 상태로 쿠키 유지 실측은 미검증.
- 실제 휴대폰 Wi-Fi에서 별도 정상 페어링 검증 세션으로 health/latest/report/candidates/portfolio 모두 HTTP200. 앱 쿠키 추출/주입 없이 수행. 토큰 출력 없음.
- 앱 서버주소는 SharedPreferences의 server(기본 http://192.168.0.9:3000). 실제 저장값 직접 읽기는 비디버그 앱의 private storage 접근 제한으로 미검증. 기존 앱 LAN 표시 성공 확인. localhost/loopback는 ServerAddress 검증에서 차단.
- 인증: localhost 소유자가 일회용 코드 발급 → 동일 Origin pair POST → 7일 HttpOnly/SameSite=Strict 쿠키, HTTPS에서 Secure. WebView 관리 쿠키 저장소 사용. 서버 .data/access/sessions.json에는 토큰 해시/만료만 저장. private 쿠키 파일은 읽지 않음.
- Android cleartext 기본 DENY, 192.168.0.9 도메인만 허용. 운영 HTTPS 정책 변경 없음.
- KRX OTP404 기술부채는 별도 유지. 2026년 캐시 FALLBACK. provider 수정 없음.

남은 사용자 작업: 휴대폰 잠금을 풀고 앱을 열어 재페어링 없이 표시되는지 확인. PC 전원·Wi-Fi 유지. 9월14일07:00 실행 완료 후 위 명령을 실행해 결과 확인. 실제07:00 검증은 아직 미완료.

?? ??: 9?13?15:07:24 KST? scope=portfolio, engineVersion=2.6.4, SUCCESS ???? ?? ??? ?????. ?? ??? ?? ???? ???? ?????. ?? ??? run API? ???? ?????. ?? run-all 2.6.3? ?????. ?? ?? ?? ??? ?? ??? ??? ?? ??? ???? ???? ????. Entry/Exit? .env? ?? ??. ???? scope=all? ???? ?? ???? 07? ?? ?? ???? ???? ????.
