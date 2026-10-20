# 영향력 인물 엔진 병렬 금융 검증 — 2026-10-12

기준 HEAD `ea406852610c00bef0dbe469de95c42fca662c30`, branch `auto/kstock-development-20260930`. AGENTS·ARI 공통 기준·직전 QA를 확인하고 보관 공식 회사 원문만 재검증했다. 신규 금융 외부 호출 0, 개인 소유변동 자료는 회사 자기주식 거래로 사용하지 않았다. 신규 Worker·운영 변경·인증 변경·실제 주문 없음.

## SK 자기주식

[8월7일 회사 처분 결정](https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260807000537)의 정확한 본문 XML과 보관 ZIP SHA를 확인했다. 직접 보유 1,626,236주, 기타취득 73주, 직접 취득 기초 17,377,728주 − 누적 처분 451,492주 − 소각 15,300,000주 = 1,626,236주다. 계획 처분 기간 8월8일~9월7일은 실제 거래일이 아니다.

[8월21일 회사 처분 결과](https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260821000495)는 최초 8월7일 공시와 연결되며 실제 8월19일 보통주 82주 처분을 명시한다. 처분 후 법 제165조의3 보유상황 A와 신탁 B 합계는 1,625,769주다.

6월30일 총 보유 1,626,865 → 8월7일 직접+기타 1,626,309의 차이 556주와, 1,626,309 − 확정 82 − 1,625,769의 차이 458주는 산술 관측뿐이다. 중간 시점의 보유 범위 동등성과 실제 집행일별 거래가 확정되지 않았으므로 1,014주를 가상 처분으로 만들지 않았다. 개인 장내매수와 영향력 인물 이벤트로 차이를 상쇄하지 않는다. 10월8일 주식수·시총·PBR 보류 유지.

원문별 해시·재현 가능한 금융 항목만 담은 최소 기록: Git 제외 `data/v2/verification/influence-financial-review-20261012.json` (0600). 원문 인물명·연락처는 새 기록에 저장하지 않았다.

## DB 재무 차이

`python3 scripts/audit-db-correction-source.py`를 직접 재실행했다. 최초/정정 원문 ZIP SHA 및 8표·200항목의 전후 400셀 좌표와 값 일치, 차이 9건 재확인. 해결 0 / 미해결 9, `BLOCKED_NO_OFFICIAL_EXPLANATION`. 일반 통화단위 정정 사유는 9개 합계 잔차의 개별 공식 설명을 대신하지 않는다. 수정값·반올림 원인을 추정하지 않았다. 소각 894,000주의 기준점 포함 검증은 재무 9건과 별개다.

이번 결과: Git 제외 `data/v2/verification/db-correction-1791783200385/source-discrepancy-audit-20261012T120008Z.json` (0600), apiReads=0.

## 기존 Worker 실제 상태

`node scripts/run-peer-validation-worker.mjs`: 동일 입력 `UNCHANGED_SOURCE`, 총 6 / PARTIAL 3 / BLOCKED 3 / VERIFIED 0 / FAILED 0. PER·PBR·PSR·EV/EBITDA 모두 유효 표본 0. 기존 최소 표본 정책 유지.

`readPeerValidationStatus()` 실제 관측: 기존 ownerPID 83101, Scheduler 활성 / 30분 / SAVED_EVIDENCE_ONLY, 다음 예정 2026-10-12 21:17:39 KST. worker.running=false는 현재 대기 상태다. 이번 30분 경과 실행 관측 NOT RUN. 외부 자동 수집 활성화·서버 재시작 없음.

## 후속 조건

회사 옵션 지급/자기주식 실제 집행 및 같은 보유 범위의 기간별 잔고, 정정 공시 연결을 확보해야 1,014주 원인을 판정할 수 있다. DB 원문 표 차이별 공식 설명이 필요하다. 해당 선행 조건이 해결되기 전 추천·삼성전자 성과 HOLD, Apple 순위 HOLD를 유지한다. 영향력 인물 분석의 소유변동 이벤트와 회사 발행/자기주식 변경 이벤트를 분리해야 한다.

Overall: PARTIAL. 이 병렬 검증에서는 전체 회귀·Web·Galaxy A33를 실행하지 않았으며 주 에이전트의 통합 검증 결과와 구분한다.
