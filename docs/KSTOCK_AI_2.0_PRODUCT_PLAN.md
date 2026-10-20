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
