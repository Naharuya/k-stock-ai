# K-STOCK MASTER QA 근거 매트릭스 — 2026-10-13

범위: 전달된 PART19~24(82~112)와 저장소 기존 지침. PART1~18/79~81은 본문 미확보; 이어 받은 답변도 제목뿐이다. 기존 구현·정책은 보존하며 새 요구사항을 추정해 추가하지 않는다.

상태 의미: IMPLEMENTED=코드 존재, TESTED=자동 또는 화면 검사 수행, VERIFIED=명시한 실자료/기기 근거 확인, PARTIAL=일부 조건 미충족, BLOCKED=선행 조건 차단, NOT RUN=미실행. 아래 TESTED는 전략 예측력 검증이 아니다.

|영역/요구|이번 근거|판정·남은 조건|
|---|---|---|
|82 자본 행동|기존 influence/SEC capital/signal 테스트 전체 회귀에 포함; 기관 보고/의향/기간 합계/개인 거래 구분 보존|TESTED / 실자료8 기존, 신규 원문0; 정정·실제 거래일 전수 검증 PARTIAL|
|83 공개 시점|기존 미국 거래 캘린더·보수 경계·미래 공시 테스트, 새 백테스트 공개 전 진입/사후 규칙 차단|TESTED / exact0·conservative3; 정확 최초 공개 확보 BLOCKED|
|84 시장 반응|Apple6행2사건 재현 PASS; MSFT음의3기간 유지; Web/기기 보수적3 사건 표시|VERIFIED 해당 저장 관측 범위 / 새 표본0, 미래 예측 아님|
|85 백테스트|backtest_input_validation10개 fixture: 구간/비용/슬리피지/포지션·사건 중복/공개·거래 시점/용량/기업행동/배당/통화·가격 기준|IMPLEMENTED·TESTED / INPUTS_VERIFIED_ONLY조차 전략 검증 아님; 실제 현재 BACKTEST_BLOCKED|
|86 Worker·Scheduler|기존 lock/복구/백오프/원천 변경/저장 오류 테스트 포함; 실제 재시작 없이30분 실행 기록|TESTED·VERIFIED 명시된1회 자연주기 / OS부팅·장기soak NOT RUN|
|87 Web·Android|기존 계약3 PASS, Web40폭 조합+키보드·상세·오류복구, A33홈/신호/인물/시장/연구·32초상태유지·실패복구/재실행|TESTED·VERIFIED 수행 범위 / A33종목TTM·긴표·실제외부링크열기 NOT RUN|
|88 실행 원칙|run-master-qa 최종679/3, exit/totals 저장, child 외부수집·broker/liveOFF·상위secret환경제외|TESTED / 유료·운영·실주문 없음|
|89~93 안전|.env false유지/정책HOLD/변경파일 secret값검사/자료4hash보존/타프로젝트 수정0|VERIFIED 제한 검사 범위 / 전체보안감사·운영변경 NOT RUN|
|94~102 기록·자동 실행|cycle JSON 실행 결과, QA/로그 갱신, 기존Scheduler 유지, 입력불변skip|IMPLEMENTED·TESTED / QA CLI가30분마다 자동 실행한다고 주장하지 않음|
|103~107 통합 QA|읽기전용 실제API·선택 화면·동일 카드/날짜/단위/출처 계약 대조|PARTIAL / 모든 화면·접근성 도구·OS복구 전수 아님|
|109 기술완료|백엔드/API/큐/자료·UI·자동테스트 부분 검증|PARTIAL; 새 공식 자본 원문/결합/부팅 경로 연결 미완료|
|110 연구완료|독립 사건3·정확0·결합0·평가구간/비용 미확보|RESEARCH_PARTIAL|
|111 A 연구용 앱|로컬 읽기 연구 화면 검증; 외부 공개/권리·개인정보·스토어 출시QA 미완료|LOCAL_RESEARCH_ONLY / RELEASE_PARTIAL|
|111 B 추천|충분한 독립 전략 검증 및 관련 검토 미확보|BLOCKED / HOLD|
|111 C 실거래|현재 안전 차단, 별도 승인 없음|BLOCKED / OFF|

## 개발 진행률

이전75%는 인수인계 추정치이며 재검증된 전체 완료율이 아니다. 전체 MASTER 본문과 영역별 완료 항목/가중치가 없어 새 숫자를 만들어 비교하지 않는다. Current Estimate=NOT_ASSESSED. 현재9영역 증거는 아래와 같으며 투자 성공 확률로 환산하지 않는다.

|영역|실제 확보·구현|핵심 미완료|
|---|---|---|
|백엔드/API|공유읽기API·큐·HOLD응답 자동테스트 및화면|출시/운영 검증|
|공식 자동 수집|5승인소스·캐시·상한·중복·소스상태|소스 원문→자본 행동 전수 연결·장기 안정성|
|AI|기존로컬생성3·자동분석 경로|이번 신규 실행0·사실/결합 검증|
|자본 행동|검증자료8·유형구분·기관관계|신규 원문0/국내 잔고·정정 미해결|
|시장 반응|보수적 독립3/9기간 관측|정확공개0·다양한 표본·검증가격 확대|
|전략 백테스트|입력안전검증·차단·통계분리|사전코호트·학습/검증/최종평가·비용·예측력|
|Web UI/UX|40폭 조합·상태유지·키보드·오류|종목 상세 실자료 전수/출시 접근성|
|Android QA|A33기존앱 5주요화면·실패복구·재실행|종목TTM·비교표·OS확대·운영페어링|
|운영 안정성|현재수동프로세스30분 자연1회·캐시·중복|기존시작서비스 경로/Worker플래그·OS복구·장기soak|

## 시작 서비스 조사 / 승인 경계

현재 사용자 launchctl에 K-Stock 관련5개 등록 확인. 조사 시 PID는 모두 '-'이며, 예약 작업의 '-'는 조사 순간 미실행을 의미한다. com.k-stock-ai.api/watchlist는 last exit1, 다른3개는0. 이를 정상 지속 실행으로 보고하지 않는다.

- com.ari.k-stock-ai: 현 프로젝트 workingDirectory, /Users/ari/ARI/k-stock-start.sh, RunAtLoad=true/KeepAlive SuccessfulExit=false. 읽은 시작 스크립트에 KSTOCK_PEER_WORKER_ENABLED 없음; 현 .env에도 명시 없음. 현재 연구Scheduler는 CLI의peer=true로 실행되므로 이 시작 경로만으로 부팅 후 동일 연구가 연결됐다고 판정할 수 없음.
- com.k-stock-ai.api/watchlist: /Users/ari/ari-server/projects/k-stock-ai (다른 존재하는 체크아웃), APIport3002. 현 작업은 이 체크아웃·서비스·로그 수정/재시작 안 함.
- com.k-stock-ai.candidates: 현 프로젝트 daily06:30, RunAtLoad/KeepAlive=false. 전체 신호 연구30분Scheduler와 별도.
- com.ari.jini-kstock-auto: 다른 프로젝트 jini-agent의 automation/kstock-auto.mjs, interval1800, 현 프로젝트workingDirectory. 새 에이전트나 중복 타이머 생성 안 함.

새 시작 서비스를 이 작업에서 설치하지 않았다는 사실과 기존 등록 서비스가 없다는 주장은 다르다. 이전 보고의 부팅 서비스 미수행 범위는 이 조사로 보완한다. 실제 OS재부팅/기존서비스강제재시작/외부script수정 NOT RUN.

승인 후에만 할 작업 목록: 기존 시작 서비스/외부 startup script 경로·Worker 설정 변경 및 다른 checkout/jini 영향 변경, 외부 배포, 유료 서비스, 삭제, 인증·권한 변경, 운영 변경. 이번에는 실행하지 않았다. 실주문은 계속 금지.
