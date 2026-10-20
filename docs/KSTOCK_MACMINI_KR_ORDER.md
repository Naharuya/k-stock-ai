> 현재 우선 지시(2026-10-20): 사용자 요청으로 국내주식 전체 점검으로 범위를 확대했다. docs/KSTOCK_MACMINI_KR_ALL_STOCKS_ORDER.md를 먼저 읽고 전수 대상 목록·점검 큐·보고를 진행한다. 아래 이전 작업 범위는 새 지시와 충돌하지 않는 부분만 적용한다.

# Mac mini 국내주식 검증·구현 지시서

2026-10-20 / 사용자 승인: 국내주식 업무를 상세 지시하고 코드·테스트·보고를 회수.

## 작업 경계

프로젝트 /Users/ari/ARI/projects/k-stock-ai, origin Naharuya/k-stock-ai, 현재 작업 브랜치 auto/kstock-development-20260930. 시작 시 실제 HEAD/branch/status 확인. AGENTS.md와 docs/ARI_COMPLIANCE_STANDARD.md 준수. 기존 미커밋 보존.
운영 대상 https://kstock.ai.kr, 마지막 확인 release review-b543c85fff215010. 로컬 작업만 한다. .env/키/개인정보/운영 데이터/다른 프로젝트/public/android/ios/공통QA로그 수정 금지. push/merge/배포/재시작/기준완화 금지. 실거래·브로커 OFF, 추천 HOLD 유지.
이전 가격·주식수 양수 검증 작업은 Codex가 완료했다. 해당 코드를 재작성하지 않는다. tests/diff 예제 파일 생성은 이번 작업이 아니다.

## 1차 구현: 주식수 날짜 검증 입력 방어

수정 허용은 src/v2/share_date_review.js, test/share_date_review.test.js, 새 docs/KSTOCK_MACMINI_KR_REPORT.md 세 파일이다.

1. 대상 코드·테스트를 먼저 읽는다. reviewShareDates의 observedShares/capitalShareRecords가 null, 문자열, 객체인 경우 .filter 예외가 발생하지 않도록 배열이 아니면 빈 배열로 취급한다.
2. 배열 내부 null/undefined/문자열/숫자/배열 같은 비레코드 항목을 제거하고 날짜·관측시각 검사를 통과한 객체만 기존 로직에 전달한다. 원본 배열·객체를 변경하지 않는다.
3. 기존 양의 safe integer 주식수, 미래자료 제외, 같은날 출처충돌, 가격일 간격 및 HOLD 의미를 유지한다. 자사주 0을 실제 발행주식수와 혼동하지 않는다. 검증된 주식수·시가총액을 임의 생성하지 않는다.
4. 회귀 테스트를 추가한다: 비배열 입력, 비정상 원소와 정상 원소 혼합, frozen 입력, 정상 자료 날짜간격/동일날 출처충돌 유지. null baseline과 verifiedShares/marketCap null 유지 여부를 확인한다.
5. 실제 task kstock-offline-test 실행 후 git-diff 실행. 실행기는 각각 node scripts/test-offline.js, git diff -- . 이다. 코드 마지막 수정 이후 테스트가 통과해야 한다. 일반 npm task나 임의 셸 명령은 요청하지 않는다.
6. 보고서에 실제 수정 파일·명령·PASS/FAIL/NOT RUN·총수·실패수·시각·차단 원인을 기록한다. 기존 다른 보고서 덮어쓰기 금지. 실행기 완료 판정 때문에 기존 전용보고서 수정이 필요하면 기존 docs/KSTOCK_BACKEND_AGENT_REPORT.md 내용을 읽고 이번 결과만 추가하며 다른 내용을 보존한다.

## 국내 원천 검증 후속 큐: 이번에 해결했다고 주장하지 말 것

- SK 자기주식 1,014주: 기준일·종류·발행/자기/유통 정의, 원문 수량과 단위, 효력일·공개시각, 기준일부터 가격일까지 기업행동 전수 대사 자료가 필요하다.
- DB 정정 차이 9건: 기존 correction_difference_review 및 관련 fixture·저장 감사자료에서 차이별 원/정정 접수번호·표 좌표·연결/별도·기간·통화·단위·원문 해시를 목록화한다. 산술 차이를 반올림/오기라고 추정하지 않는다. 공식 설명이 없으면 UNRESOLVED.
- 비교기업 6개: peer_metric_diagnosis에서 PER/PBR/PSR/EV_EBITDA별 유효/제외 수와 사유, 최소 표본 정책을 확인한다. 최소 표본·사업비교성·원천 검증 조건 완화 금지.
- 이번 실행 도구는 신규 외부 수집을 지원하지 않는다. 신규 공식 수집은 NOT_RUN/0건으로 쓰고 필요한 출처·실행 경로만 제안한다. KRX 인증차단 우회, 새 자격증명·유료호출·스케줄 추가 금지.
- 1차 코드 작업을 먼저 완료한다. 후속 큐 현황은 확인한 범위만 보고하며 기존 미해결 숫자를 재측정 결과처럼 표현하지 않는다. 자료 부족은 기업별 BLOCKED/PENDING으로 남긴다.

## 결과 회수 및 시간별 보고

기존 매시간 보고 경로를 유지하되 앞으로 이 지시서를 현재 작업으로 사용한다. 실행 중에는 중복 요청하지 않는다. 코드 구현 후 제출 상태는 검토 대기이며 국내 종목 검증 완료가 아니다.
제출물: 실제 diff, 변경 파일, 마지막 코드 수정 이후 테스트 실행 기록, 전용 보고서, 신규 외부호출 수, 국내 3개 미해결 큐의 확인 여부와 다음 조치. 설명만으로 완료 처리하지 않는다.
Codex는 실행 영수증과 실제 파일을 대조하고 필요 시 독립 테스트한다. 실패한 작업은 실패로 보고한다.
