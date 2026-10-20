# Mac mini 실행 복구 지시 — 현재 최우선

2026-10-20 사용자 승인: 전수검사 전에 작은 코드 수정·테스트·diff 실행 능력부터 복구한다.
국내 전체 점검 목표는 유지하되 아래 Gate1 통과 전 전수검사·외부 수집으로 넘어가지 않는다.

## Gate1: 이번 실행은 이 작업만

1. 프로젝트 /Users/ari/ARI/projects/k-stock-ai. AGENTS.md, docs/ARI_COMPLIANCE_STANDARD.md 준수. 기존 변경 보존. src/v2/share_date_review.js와 test/share_date_review.test.js를 읽는다.
2. observedShares/capitalShareRecords가 배열이 아니면 빈 배열로 취급한다. 배열의 null/undefined/기본형/배열 원소를 제외하고 레코드 객체만 기존 필터로 처리한다. 입력을 변경하지 않는다. 주식수·출처충돌·날짜·HOLD 검증은 유지한다.
3. test/share_date_review.test.js에 null 입력과 혼합 배열 처리 회귀를 추가한다. 기존 정상 입력·출처 충돌 결과가 유지되는지도 확인한다.
4. 기존 docs/KSTOCK_BACKEND_AGENT_REPORT.md를 읽고 이번 실제 변경·차단·테스트 상태만 추가한다. 원문 덮어쓰기 금지.
5. task kstock-offline-test 실행, 이후 task git-diff 실행. 실패하면 원인 수정 후 재실행. 테스트 미실행이나 코드 미수정이면 성공 보고 금지.

사용할 작업 JSON 예시:
- {"action":"read","path":"src/v2/share_date_review.js"}
- {"action":"replace","path":"src/v2/share_date_review.js","old":"파일에서 읽은 정확한 기존 문자열","new":"실제 수정 코드"}
- {"action":"task","task":"kstock-offline-test"}
- {"action":"task","task":"git-diff"}

task 값은 위 두 이름 또는 git-status만 사용한다. 영어 지시문을 task로 보내지 않는다. git-commit/git-push/npm-test/일반 셸 실행 금지. tests/diff 샘플 생성 금지.
같은 작업이 두 번 실패하면 같은 요청을 반복하지 말고 실제 실패 action·도구 오류·수정 필요 경로를 보고한다. 실행기·정책·모델·LaunchAgent는 직접 수정하지 않는다. 부적절한 제한 우회 금지.

## 후속 Gate: 이번 한 사이클에서 임의 실행하지 말 것

- Gate2: 공식 상장종목 목록 읽기 경로의 지원 여부를 확인하고 출처·기준일·해시·저장·호출 제한·실패 복구를 검증한다. 미지원은 BLOCKED로 보고하며 수집 완료로 주장하지 않는다.
- Gate3: 코스피/코스닥/코넥스 회사·증권 목록 확정 후 배치 큐, 중단 재개, 누락/중복 집계를 구현·검증한다. 구체 범위는 전수 지시서 참고.
- Gate4: 실제 자료 확보와 검증 근거를 대조한 뒤 전수 점검을 진행한다. 코드 테스트와 국내주식 검증 완료를 구분한다.

매시간 보고는 기존 채널 유지. Gate번호, 변경 파일, 실제 테스트, 실패 원인, 전체 대상수(미확정 null), 확인/미확인/차단 수를 구분한다. 반복된 동일 실패는 자동 개발 성공으로 처리하지 않는다.
운영 https://kstock.ai.kr 및 원천자료 변경 없음. .env/키/개인정보/public/android/ios/다른 프로젝트 수정·배포·재시작 금지. 실거래OFF/추천HOLD. 기존 remote/branch/HEAD/status 기록과 미커밋 보존.
