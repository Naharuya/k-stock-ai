# KSTOCK 제품 재기획 — 종목별 매매 판단 정보

작성: 2026-10-20 KST. 상태: 구현 전 기획안. 사용자의 “연구자료보다 실제 매수·매도할 주식 정보가 필요하다”는 요청을 최우선 요구로 반영한다. 아래 기획이 기존 연구 중심 기획보다 우선하며 과거 원문은 문서 끝에 보존한다.

## 1. 사용자가 해결할 일

앱을 열어 다음 질문에 답한다.

1. 지금 매수를 검토할 종목은 무엇인가? 어떤 가격·조건에서 검토하는가?
2. 이미 가진 종목은 유지·축소·청산 중 무엇을 검토해야 하는가?
3. 판단의 이유와 반대 근거, 언제 판단이 무효가 되는가?
4. 자료가 최신인가? 어떤 사실은 확인됐고 어떤 판단은 아직 불가능한가?

연구 사건 수, 에이전트 작업량, 공시 수집 건수는 홈의 핵심 성과가 아니다. 시장·전략별 실제 판단 가능한 종목, 유효한 가격 조건, 보유 종목 위험 변화가 핵심이다. 주문 실행 기능은 별도 범위이며 현재 PAPER_ONLY/실거래OFF를 유지한다.

## 2. 이번 기획의 기본 가정과 범위

- 국내·미국 주식을 지원한다. 기본 진입은 국내이며 시장 전환을 명확히 한다. 국내 목록은 코스피·코스닥·코넥스를 구분하고 종목 종류를 표시한다. 전체 종목 검색·자료 커버리지와 전략 적용 가능한 종목은 별개다.
- 투자 기간은 사용자 답변으로 수일~수주 매매로 확정한다. 판단은 일봉·완료된 거래 세션 기준으로 설계한다. 당일매매·실시간 체결 대응은 MVP에 포함하지 않는다. 기간이 바뀌면 전략·시세 요건·화면을 함께 수정한다.
- 먼저 지원 가능한 국내·미국 소규모 종목 묶음에서 실제 데이터 흐름을 끝까지 검증한다. 이를 전체 시장 검증으로 표현하지 않는다. 전체 종목 수집 완료는 MVP 사용의 선행조건이 아니다.
- 오늘 기획으로 매수·매도 추천이 이미 제공되는 것은 아니다. 현재 구현은 PAPER_ONLY, 대상 가격·목표가·전략 실증에 미완료 항목이 있다.

## 3. 핵심 화면과 사용자 동선

모바일 하단 메뉴: 오늘의 판단 / 관심종목 / 보유종목 / 종목검색 / 더보기. PC는 같은 구조의 사이드 메뉴와 목록·상세 동시 보기를 사용한다. 기존 보라·라벤더/네이비 디자인을 유지한다.

### 오늘의 판단

- 상단: 국내/미국, 시장 기준시각, 장 상태, 시세 지연/최신 여부, 적용 전략과 기간.
- 첫 목록: 매수 검토. 종목·기준 가격·진입 조건·핵심 근거·무효화 조건을 짧게 표시한다.
- 두 번째: 보유 종목 위험 변화. 보유를 등록한 사용자에게만 해당 종목의 축소/청산 조건을 표시한다.
- 다음: 관망 후보와 조건 미충족 사유. 매수 후보가 없으면0개를 그대로 표시하고 확인 가능한 시세·검색·관심종목은 계속 제공한다.
- 공시·실적 일정은 종목과 연결된 보조 영역에 표시한다. 작업 보고·연구 이력은 더보기 안으로 이동한다.
- 추천 수를 채우기 위한 임의 순위·가짜 종목·성과 보장 문구는 넣지 않는다. 과거 사건을 현재 후보로 재사용하지 않는다.

### 종목 상세

1. 종목명/시장/주식종류/통화, 시세 기준시각과 공급 지연 상태.
2. 현재 판단과 전략 기간·유효기한·다음 조건 재확인 시점.
3. 가격·거래량 차트와 관련 공시·실적 일정. 거래정지/분할/누락 구간을 표시한다.
4. 진입 조건·목표/청산 조건·손절/무효화 기준. 수치가 없으면 “미산출”과 구체 사유를 표시한다.
5. 판단 근거 최대3개와 반대 근거·주요 위험. 펼치면 원천과 계산 방법을 볼 수 있다.
6. 관심종목 추가, 보유 정보 등록, 모의 기록으로 시나리오 확인.

### 보유종목

- 사용자가 입력한 종목·수량·평균매수가·통화 기준으로 손익을 표시한다. 실제 증권계좌 연동이 아니면 명확히 “직접 입력” 표시.
- 가격이 검증되지 않았으면 평가손익을 계산하지 않는다. 통화 혼합 합산은 검증된 환율 없이는 제공하지 않는다.
- 등록된 전략의 유지/일부 축소/청산 검토와 발생 조건을 제공한다. 내부자 매도 공시를 사용자 보유종목 매도 지시로 바꾸지 않는다.
- 모의 보유와 실제 보유 직접입력을 구분한다. 기존 모의기록을 실제 보유로 자동 전환하지 않는다.

## 4. 종목 카드의 정보 계약

| 정보 | 표시 규칙 |
|---|---|
| 판단 | 매수 검토 / 관망 / 보유 유지 검토 / 축소 검토 / 청산 검토 / 판단 자료 부족 |
| 가격 | 원 통화, 가격 유형, 실제 시장 기준시각, 수신시각, 지연 여부 |
| 기간 | 전략 ID·버전·보유 가정 기간, 계산시각·유효기한 |
| 진입 | 조건과 기준 가격대, 주문 체결 보장 아님 |
| 목표·청산 | 산출 방식과 가격 기준; 손절/목표 미산출이면 null |
| 위험 | 판단 무효화 조건, 이벤트·유동성·급변·자료 부족 |
| 근거 | 사실/계산/AI 설명 구분, 출처 및 공개시각 |
| 보유 맥락 | 미보유/직접 입력/모의, 해당 없으면 매도 버튼이나 수량 권고 없음 |

WATCH(조건을 충족하지 않음)와 DATA_UNAVAILABLE(계산할 자료가 없음)를 구분한다. API 오류·인증 실패·오래된 시세를 관망으로 바꾸지 않는다. 공식기관 자료가 있다는 사실만으로 전체 판단을 “공식 검증”이라고 표시하지 않는다.

## 5. 판단 엔진의 책임과 출시 전 전략 정의

기존 paper-decision-v1은 점수50/35 등 규칙 예제이며 calibration NOT_ESTABLISHED, targetPrice/expectedReturn/winProbability null이다. 이 값을 검증된 전략이나 실매매 성과로 포장하지 않는다.

새 전략은 strategyId/version, 적용 시장·상품·기간, 진입/청산/위험 조건, 필요한 데이터, 계산식, 시점 규칙, 만료·재계산 조건을 고정한 후 구현한다. 본 기획에서 임의 목표가·손절 비율·승률을 확정하지 않는다. 시장 선택·전략 설계·검증을 분리한다.

- 매수 검토: 정해진 전략의 진입 조건과 해당 전략의 데이터·위험 요건을 모두 통과할 때만 제공한다.
- 관망: 데이터는 충분하지만 진입 조건을 충족하지 않는 상태다.
- 보유 축소/청산 검토: 보유 맥락과 선택 전략의 위험/청산 조건을 사용한다. 근거·예정 수량은 별도 검증 전 자동 제안하지 않는다.
- 가격 기반 전략과 재무 가치평가 전략은 필요한 데이터를 명시해 별도 구현한다. 재무·주식수 부족이 가치평가를 막는 것과 확인된 종가/공시 표시를 막는 것은 다르다. 새 전략을 만드는 방식으로 기존 검증 실패를 숨기지 않는다.
- 목표가·손절가는 검증된 시세·기업행동과 명시된 계산 방식이 있어야 한다. 일봉 종가 판정과 장중 가격 접촉을 구분한다. 갭·거래정지·유동성으로 기준 가격에 체결되지 않을 수 있다는 점을 관련 화면에 설명한다.
- 단순 가격대 비율은 조건 충족 시나리오이며 기대수익률·달성 확률이 아니다. AI는 근거 요약을 담당하며 시세·산식·전략 상태를 임의 생성하거나 뒤집지 않는다.

## 6. 데이터 설계와 신선도

| 계층 | 필수 데이터 | 부족할 때 |
|---|---|---|
| 종목 탐색 | 공식 식별·시장·종류·상장 상태 | 미확인 식별자는 판단 제외 |
| 시세 정보 | 원천 가격·거래량·세션/시간대·가격유형·수신시각 | 마지막 확인값을 시각과 함께 표시, 현재값 표현 금지 |
| 일봉 전략 | 검증된 세션별 가격/거래량·기업행동·충분한 기간 | 해당 전략만 판단 자료 부족 |
| 재무 가치평가 | 공개 시점·기간/범위·주식수·정정·동종 표본 | 재무 지표/가치평가만 미산출 |
| 보유 관리 | 사용자 입력 보유와 검증된 가격·전략 | 보유 원본 유지, 평가/판단만 중지 |

- 실시간·지연·종가 중 실제 확보하고 표시 권한이 확인된 유형만 제공한다. 데이터 제공자 계약·재배포 가능 범위·호출 한도는 구현 전 확인 항목이다. 유료 계약이나 계정 설정이 된 것으로 가정하지 않는다.
- priceAsOf/receivedAt/publicAvailableAt/decisionAt/validUntil을 분리하고 거래소 휴장·시간대·서머타임을 처리한다. 미국시장이 열려 있지 않아도 한국 날짜가 바뀌었다는 이유만으로 결측 처리하지 않는다.
- 시세 유효기간은 전략과 세션 달력·공급 지연에 맞춰 정의한다. 기존 latestPrice의8일 이내 조건을 수일~수주 매매용 최신성 기준으로 그대로 사용하지 않는다.
- 과거 백테스트는 당시 공개된 자료만 사용한다. 기존 인물·공시 연구의 D-2 원칙은 그 전략의 입력 제약으로 유지하며 화면 시세나 모든 새 전략에 일괄 적용하지 않는다. 변경되는 정보시점 정책은 전략 버전으로 검토한다.
- 시장·기능별 갱신 주기와 원천 실패 시 동작을 실제 공급 조건에 맞춰 확정한다. 화면의 “새로고침”과 공급자의 최신 시세 수신을 동일시하지 않는다.

## 7. 구현 순서와 완료 기준

### P0 — 실제 데이터를 볼 수 있는 매매 정보 화면

- 종목검색/국내·미국 전환, 검증된 시세·기준시각·지연·자료 부족 표시.
- 관심종목과 종목 상세의 공시·실적·가격·거래량, 판단 가능/불가능 사유.
- 현재 추천 API는 PAPER_ONLY 유지. 연구/에이전트 현황은 보조 메뉴로 이동.
- 완료: 실제 공급 경로에서 읽은 종목 정보가 웹·두 실제 기기에 일치하며 인증/지연/결측/거래정지에서 허위 현재값이나 추천이 나오지 않는다. fixture 통과와 실제 조회 검증을 구분한다.

### P1 — 재현 가능한 매수·관망 조건

- 하나의 명시된 일봉 전략부터 산식·매수/무효화/청산 규칙·유효기한을 구현한다. 먼저 모의 전략임을 표시한다.
- 국내·미국 각각 데이터가 확보된 종목으로 처음부터 끝까지 재현한다. 종목 수를 채우기 위해 조건을 완화하지 않는다.
- 완료: 동일 입력/버전의 동일 결과, 미래 자료 차단, 시세 만료·기업행동 발생 시 무효화, 전략에 필요한 데이터 검사와 반대 위험 근거 확인.

### P2 — 내 보유종목 유지·매도 판단

- 직접 입력 보유와 모의를 구분, 보유·전략 맥락에 따른 유지/축소/청산 조건 표시.
- 완료: 평균매수가/수량/통화/수수료 처리와 입력 수정·삭제, 잘못된 보유를 가정한 매도 판단 방지. 증권사 실제 잔고/체결을 보장하지 않는다.

### P3 — 범위 확대와 전략 실증

- 전체 국내 종목 대상 목록과 자료 커버리지를 점진 확대한다. 전수검증은 데이터 운영 과제로 유지하되 초기 기능을 인질로 잡지 않는다.
- 워크포워드/별도 평가 구간, 수수료·세금·슬리피지·기업행동·상폐/생존 편향·중복 신호·거래 가능성·벤치마크를 반영한 전략 검증.
- 검증 지표는 표본수·기간·결측·손실/낙폭·비용을 함께 공개한다. 테스트 수나 백테스트 수익률만으로 미래 매매 성과를 주장하지 않는다.

날짜·일정 약속은 공급 경로와 실제 작업량 확인 후 잡는다. 첫 개발 작업은 P0의 시세/종목 정보 데이터 계약 및 기존 코드와의 연결 범위 확정이다.

## 7-1. 실행용 개발 순서와 인수 기준

우선 지원 기간은 확정된 수일~수주 매매다. 아래 순서를 개발 티켓의 기준으로 사용한다. 각 단계는 문서 작성이 아닌 해당 산출물과 실행 근거로 완료 판정한다. 개발 시작 시 신규 단계는 미착수로 두었으며, 이후 실제 구현 결과는7-2절과 QA 기록에서 별도로 관리한다. 기존 기능은 재사용 후보일 뿐 완료 근거를 대신하지 않는다.

| 순서 | 단계 / 우선순위 | 실제 작업과 산출물 | 선행조건 | 완료 기준 |
|---|---|---|---|---|
| 1 | 기존 기능·데이터 계약 정리 / P0 | 국내·미국 식별자, 시세·일봉·공시·보유·판단 응답 필드와 상태/오류 계약. 기존 수집기·추천 API의 재사용/수정/누락 목록 | 제품 기획 | 테스트 fixture로 정상/결측/지연/권한오류 응답 계약 확인. 사용 가능한 공급 경로와 부족한 권한을 분리 |
| 2 | 실제 시세·일봉 연결 / P0 | 가격/거래량·세션·시간대·원천/수신시각·분할/배당 반영 여부, 공급자 표시 권한·한도 확인, 캐시·오류·백오프 | 1 | 국내·미국 각 실제 종목 조회와 원천 대조, 휴장/지연/인증차단/데이터 누락 처리. 외부 조회 불가면 미완료로 남김 |
| 3 | 종목검색·관심종목 / P0 | 국내/미국 전환, 회사·증권종류 구분, 종목검색 및 관심 추가/해제, 관심목록 가격시각 표시 | 1, 시세는2 | 중복/잘못된 식별자 차단, 재실행 유지·삭제 확인, 데이터 부족 종목도 정확한 상태 표시 |
| 4 | 종목 상세·홈 개편 / P0 | 가격/거래량/공시·실적·위험 상세, 오늘의 판단 홈과 보조 연구 메뉴, 매수·관망·자료 부족 구분 | 2~3 | 실제 조회 기반 탐색 흐름이 웹·Android·iPhone에서 동작. 현재 매수 판단이 없으면0개 표시 |
| 5 | 첫 전략 명세 확정 / P1 | 일봉 전략1개의 적용 종목/기간·진입·무효화·목표/손절·청산 산식·유효기한·갭/기업행동 정책과 버전 | 1~2 | 입력·산식·정상/경계/실패 사례가 재현 가능하며 AI가 임의 가격·승률을 만들지 않음. 임의 수익률 가정 금지 |
| 6 | 전략 엔진·재현 검증 / P1 | 명세 기반 계산 모듈, 시세 만료/미래 데이터 차단, 당시 사용 가능 자료로 재생하는 테스트·평가 도구 | 2,5 | 동일 입력/버전의 동일 판단. 실제 데이터 재생·오류·기업행동·정보시점 검사. fixture 성공을 전략 성과로 표현하지 않음 |
| 7 | 매수·관망 카드 / P1 | 판단 가능한 종목만 후보로 표시, 진입 가격 조건·목표/손절 산식·반대 근거·만료/재조회. 우선 모의전략임을 표시 | 4,6 | 근거와 수치 추적 가능, 누락·만료 시 즉시 판단 자료 부족. 종목 수를 맞추려는 완화 없음 |
| 8 | 내 보유·매도 조건 / P2 | 직접 입력 보유와 모의 구분, 수량/평균가/통화·비용, 유지/축소/청산 조건 및 수정·삭제 | 3,6~7 | 미보유 종목의 사용자 매도 판단 방지, 기록 삭제·손익 계산·결측/통화 처리 확인. 계좌연동으로 오인시키지 않음 |
| 9 | 통합 검증·제한 배포 / P0~P2 | 웹/양OS 반응형·접근성·인증·실패 복구·보유 삭제·실제 시세/신호 흐름, 데이터 권리·표시·개인정보·금융 기능 검토 | 4,7~8 | 필수 검사 통과와 실제 원천조회 근거. 독립 평가 전 모의전략 표시 유지. 커밋일치 후보·롤백·운영 후 확인 |
| 10 | 시장 범위 확대·지속 평가 / P3 | 국내 전체 목록/커버리지·미국 대상 확대, 원천 갱신, 워크포워드/별도기간·비용·낙폭·생존편향 평가 | 2,6,9 | 대상/확인/미확인 수 대사, 검증 가능한 성과만 공개. 보류·차단 상태를 숨기지 않음 |

### 첫 작업 묶음: 1번에서 만들 것

- 기존 `src/v2/current_market_collection.js`, `src/v2/us_market_evidence.js`, `src/v2/trade_recommendations.js` 및 국내 시세 어댑터의 실제 입출력·제약을 확인한다.
- 시장/거래소/종목/주식종류/통화 식별과 `priceAsOf`, `receivedAt`, 가격 유형, `dataStatus`, 원천 메타데이터 계약을 확정한다.
- 데이터 없는 응답, 전일 종가, 시세 지연, 거래정지, API 오류를 각각 다른 사례로 작성한다.
- 기존 추천 게이트를 삭제하지 않는다. 새 시세 정보 API와 전략별 판단 API의 경계를 정하고 호환·이전 계획을 작성한다.
- 공급자 키 값 노출 없이 실제 사용 가능한 경로를 확인하고, 유료 계약·표시 권한·인증이 필요한 부분만 구체적인 의존성으로 남긴다.

### 순서를 지키면서 병행할 작업

- 2번 실제 데이터 연결과 3~4번 화면의 fixture 구현은 병행할 수 있다. 다만 fixture 화면은 실제 조회 완료로 처리하지 않는다.
- 5번 명세는2번과 함께 준비할 수 있지만 실제 데이터 의미가 확정되기 전에 전략 계산을 확정하지 않는다.
- Mac mini 실행 복구는 별도 병행 과제다. 복구 성공 전까지 필수 제품 작업을 맥미니 전담으로 묶지 않는다. 성공 후 데이터 갱신·배치·결측 복구의 작은 티켓을 맡긴다.
- 국내 전체 목록과 SK/DB/peer 검증은10번을 위한 백엔드 품질 작업으로 계속 보존한다. 국내 전체 완료를1~9번 진입 조건으로 삼지 않는다.
- 정보 화면은4번 완료 시 중간 검토가 가능하다. 모의 판단은7번, 보유 매도 조건은8번에서 각각 확인할 수 있다. 사용자에게 보이는 운영 변경에는 해당 범위의9번 검사와 롤백 절차를 적용한다.

### 티켓 종료 시 공통 제출물

문제/변경 파일, 사용 원천·실제 조회 여부, API·화면 결과, 실제 테스트 명령/결과, 실패·미해결 항목, 다음 티켓을 기록한다. 시세/전략/보유 데이터 흐름 변경 시 정책·삭제·보유·출처 표시를 함께 점검한다. 완료되지 않은 단계의 이전 테스트 수를 현재 완료 근거로 재사용하지 않는다. 일정은1~2번 실제 공급 경로와 작업량 확인 후 산정한다.

## 7-2. 구현 결과와 실제 검증 범위 — 2026-10-20

- 1~4: `/api/v2/trading/instruments`, `/detail`, `/opportunities`와 오늘의 판단/검색/관심/직접입력보유/상세 공통 웹 화면 구현. 국내·미국 통화/거래소·기준일·수신시각 구분. 공급자 마스터 검색 대상 국내2,856·미국6,225종목(이번 스냅샷 기준), 거래소 전수 대사 완료는 아니다.
- 5~7: `daily-breakout-20-atr14-v1` 구현. 40개 이상 일봉에서 종가>직전20일 고가 및20일 평균, 거래량>직전20일 평균이면 모의 매수 조건. 기준가-ATR14와+2ATR14로 조건부 손절/목표 시나리오를 계산한다. 이는 실증된 추천·적정가·승률이 아니다. 데이터가 늦거나 최근 완료 거래일/휴장을 확인할 수 없으면 수치는 보류한다.
- 8: 직접 입력 보유의 유지/위험/축소/청산 조건과 원 통화 가격차 손익. 평균가와 현재ATR로 매번 재계산하는 시나리오이며 고정 손절 주문 아님. 관심종목은 기기 저장, 보유는 기본 메모리/명시적 기기 저장 선택·해제·삭제. 서버는 보유 요청 원문을 저장하지 않는다.
- 9: 단위/통합·브라우저/반응형 및 실제 원천 조회 검증은 QA 보고서에 기록한다. 정식 앱스토어 출시나 최종 법적·권리 검토 완료를 뜻하지 않는다. 기기/운영 전환은 해당 실행 이후 별도로 기록한다.
- 10: 하루1회 공급자 마스터 갱신, 최대25종목/시간 체크포인트 배치와 공개 마스터·일봉의 스키마/해시 검증 동기화 구현. 최초 실제 배치25종목 조회 성공. 모든9,081종목을 검증한 것은 아니며, 운영에는 최근 최대500종목 스냅샷을 동기화한다. 운영 서버로 금융 API 키·사용자 보유·실행 파일은 옮기지 않는다.

API 응답의 `OBSERVED`는 공급자 일봉을 관측·파싱했다는 뜻이고, `STORED_OBSERVATION`은 Mac mini에서 공급자를 조회해 서버로 동기화한 종가다. 둘 다 실시간 가격·독립 원천 대사 완료가 아니다. 새 전략은 `RULE_SIMULATION`, 기존 추천 게이트는 HOLD, 실거래OFF를 유지한다.

과거 모의 재생은 사용자가 편도 수수료/매도 세금/편도 슬리피지를 입력해야 한다. 다음 시가 진입, 범위 밖 갭이면 건너뜀, 같은날 목표/손절 모두 접촉하면 손절 우선 가정을 사용한다. 수정주가·소수점 전액 투입 시나리오이며 유동성/상폐/배당/벤치마크/별도 평가기간 검증을 입증하지 않는다.

남은 외부·장기 검증: 공급자 표시·재배포 권리와 서비스 법적 범위, 독립 거래일 달력·기업행동 대사, 향후 실적 일정 공급, 전체 목록/시세 커버리지 확대, 별도기간·벤치마크·생존편향을 반영한 전략 실증. 이 항목은 기능 코드 완료와 구분해 미완료로 유지한다. 기존 공시 원문은 종목별로 연결하되 없는 자료를 만들지 않는다.

공식 구현 참조: [국내 기간별 일봉](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/inquire_daily_itemchartprice), [미국 일봉](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock/dailyprice), [종목 마스터](https://github.com/koreainvestment/open-trading-api/tree/main/stocks_info). 과거 원문은 아래에 보존한다.

## 8. 역할과 Mac mini 업무 재정렬

- 주 개발자: 화면·API 계약·전략 명세·웹/실제기기 검증 및 결과 검토.
- Mac mini: 작은 구현 완주로 실행 복구 → 실제 시세/종목 데이터 접근 경로 점검 → 관심/후보 종목 데이터 갱신·실패 복구 → 범위 확대. 원문 연구량 증가를 주 목표로 삼지 않는다.
- 전체 전수 목록·SK/DB/peer 문제는 가치평가 품질 과제로 보존한다. 이 문제가 해결돼야만 모든 시세 정보 화면을 만들 수 있다는 가정은 폐기한다.
- 시간별 보고도 처리 문서 수 대신 실제 조회 가능한 종목 수, 전략 판단 가능 수, 최신 가격 커버리지, 결측/오류, 구현·테스트·다음 작업을 중심으로 바꾼다.
- 이 문서는 재기획안이다. 기존 자동화는 현재 승인된 범위만 수행하며 실행 프롬프트·권한·전략 정책 변경은 다음 구현 작업에서 함께 정렬한다. 기획만으로 새 수집·매매 추천을 실행한 것으로 표시하지 않는다.

## 9. 검토·출시 기준

데이터 출처/표시 권한과 금융정보·투자판단 기능에 적용되는 법적 범위는 실제 배포 지역·개인화·과금·표현·데이터 흐름 기준으로 확인한다. 문구만 바꿔 출시 가능하다고 판단하지 않는다. 보유 정보 저장 위치·삭제·암호화·백업 및 개인정보 고지는 구현과 일치시킨다. 지금의 기획이 개인화 투자자문 또는 실거래 서비스 승인을 의미하지 않는다.

성공 기준은 사용자가 종목을 찾고, 가격 시점을 이해하고, 판단 조건·위험을 확인하고, 자신의 보유와 연결해 다음 검토 행동을 결정할 수 있는지다. 모든 종목에 매수/매도 라벨을 억지로 붙이는 것은 성공 기준이 아니다.

---

## 보존: 이전 연구 중심 기획 (현행 우선순위 아님)

<details>
<summary>이전 기획 원문 보기</summary>

# K-Stock AI 2.0 Product Plan

## Working name
K-Stock AI 2.0 — Capital Behavior Intelligence

## Product definition
K-Stock AI 2.0 is an investment intelligence app that tracks influential investors, institutions, insiders, major shareholders and global business leaders. It combines their capital actions, public statements, media mentions, company fundamentals, market flow, risk and opposing evidence to produce a daily research candidate list:

- Korea: 15 candidates
- Global: 20 candidates

This is not an automatic trading system and not a guaranteed buy recommendation system. It is a research and decision-support product.

## Core belief
Money is not only numbers. Money moves through people, psychology, authority, incentives, fear, conviction and capital allocation. The product therefore begins with people and capital behavior, then checks companies and markets.

## D-2 principle
Daily analysis uses only information publicly available up to D-2 23:59.

Important distinction:
- D-2 does not mean the person definitely bought the stock two days ago.
- D-2 means the system only uses information that was publicly observable by D-2.
- Actual trade date, filing date, publication date and analysis date must be stored separately.

Examples:
- SEC 13F can be delayed and must not be presented as yesterday's trade.
- Form 4 and domestic ownership reports may provide faster signals.
- Media and public comments are weaker than actual capital action.

## Tracked actor groups

### 1. Global investors
- Warren Buffett / Berkshire Hathaway
- Value investors
- Growth investors
- Macro investors
- Hedge funds and large asset managers

### 2. Global entrepreneurs and capital allocators
- Founders and CEOs of AI, semiconductor, energy, finance and consumer platforms
- Executives making large capital allocation, capex, partnership or acquisition decisions

### 3. Institutions, insiders and major shareholders
- SEC 13F institutions
- SEC Form 4 insiders
- OpenDART executives and major shareholders
- Significant holding reports
- Major shareholder changes

### 4. Industry influencers
- Analysts
- Industry experts
- Supply-chain leaders
- Conference speakers
- Official IR and investor day sources

## Evidence classes

### Highest weight: capital action
- New position
- Increased stake
- Reduced stake
- Exit
- Insider purchase
- Insider sale
- Buyback
- Strategic acquisition or investment

### Medium weight: verified public statements
- Investor letters
- Official interviews
- Earnings calls
- Shareholder meetings
- Conference talks
- Official social posts

### Supporting signal: media and online mentions
- YouTube
- Instagram
- X
- Reddit
- podcasts
- news
- blogs

All media mentions must be classified as one of:
- positive capital intent
- positive strategic view
- neutral mention
- risk warning
- negative capital intent

## Candidate output
Each candidate must include:
- ticker and company name
- market: KR or Global
- capital behavior score
- influential actor signal
- media mention signal
- fundamental score
- valuation score
- flow/momentum score
- sentiment score
- risk score
- evidence confidence
- data freshness label
- positive thesis
- bear thesis
- source list
- final committee opinion

## User experience principle
The user should not see only a score. The user should see why the candidate was selected, who or what created the signal, how fresh the evidence is, and what could be wrong.

## Safety and compliance
- No live trading.
- No broker orders.
- No guaranteed return language.
- No “must buy” language.
- Show data delay and source confidence.
- Separate fact from inference.
- Present candidates as research watchlist, not investment advice.

## MVP scope
MVP should implement:
1. Evidence registry
2. D-2 data freshness model
3. Actor profile model
4. Capital tracker skeleton
5. Media mention skeleton
6. Psychology interpretation skeleton
7. Fundamental scoring placeholder
8. Evidence/fact-check gate
9. Risk/Bear gate
10. Ranking output: KR 15 / Global 20

## Non-goals for MVP
- No automatic order execution
- No KIS order placement
- No real-money trading
- No unverified social-rumor recommendations
- No hidden black-box score without evidence

</details>
