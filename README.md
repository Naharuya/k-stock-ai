# K-Stock AI v2.6.3

07:00 자동 분석, 기기 연결 인증, 프로필별 저장, 공식 거래일 갱신, 최신 재무·TTM 및 Android 알림을 추가했습니다.
현재 Windows 운영 작업이 서버를 관리합니다. 이미 3000번 포트가 실행 중이라면 `npm.cmd run dev`를 중복 실행하지 마세요.

- [안정화 결과 및 남은 검증](RELIABILITY_IMPLEMENTATION_REPORT.md)
- [휴대폰 설치·연결](MOBILE_INSTALL.md)

## 기존 Daily Trading Agent 안내

장후 전체시장 분석으로 다음 거래일 관심종목을 저장하고, 장전 공시·뉴스·시장 위험을 재검증해 오늘의 관심종목을 표시합니다. 자동 주문 기능은 없습니다. 기존 수동 관심후보, 상세분석, Entry 등록, 보유종목, Exit 재검증을 유지합니다.

## 실행과 검증

Node.js 22 이상. 이번 변경에는 새 npm 의존성이 없습니다. 기존 설치 환경에서:

```powershell
npm.cmd run daily:check
npm.cmd run daily:store-check
npm.cmd run candidate:check
npm.cmd run candidate:rank
npm.cmd run risk:semantic
npm.cmd run entry-exit:check
npm.cmd run entry-exit-ux:check
npm.cmd run portfolio:check
npm.cmd run dashboard:check
npm.cmd start
```

브라우저: http://localhost:3000
관리자 PowerShell 필요 없음.

선택적 실제 브라우저 검증: `npm.cmd run daily:browser-check`. Windows Chrome/Edge를 숨김 모드로 실행하며 모의 데이터를 사용합니다. 다른 설치 경로는 `KSTOCK_TEST_BROWSER`로 지정합니다. 결과 이미지는 `.cache/daily-dashboard-desktop.png`, `.cache/daily-dashboard-mobile.png`에 저장됩니다.

## 자동 실행 켜기

자동 실행 기본값은 **OFF**입니다. 운영할 때 기존 .env에 아래 항목을 설정한 뒤 서버를 재시작합니다. 기존 API 키는 그대로 유지합니다. KIS/OpenDART/뉴스 수집에는 기존 KSTOCK_BROKER_ENABLED, KSTOCK_DART_ENABLED, KSTOCK_NEWS_ENABLED 설정이 true여야 합니다. 비활성 수집기는 검증 미완료/실패로 기록됩니다.

```dotenv
KSTOCK_DAILY_AGENT_ENABLED=true
KSTOCK_AFTER_MARKET_HOUR=15
KSTOCK_AFTER_MARKET_MINUTE=40
KSTOCK_PRE_MARKET_HOUR=8
KSTOCK_PRE_MARKET_MINUTE=30
KSTOCK_LIVE_TRADING_ENABLED=false
```

- Asia/Seoul 기준 평일 15:40 장후 분석, 다음 평일 08:30 장전 재검증.
- 30초 간격으로 시각 확인. 장전 재시도 가능 시간은 09:00 전까지, 장후는 설정 시각 이후 자정 전까지입니다.
- 성공 저장이 있으면 서버 재시작 후 중복 자동 실행하지 않습니다. 장 마감 전 수동 생성한 미리보기는 당일 정규 장후 작업을 막지 않습니다.
- 실패는 프로세스·날짜·작업별 최대 3회, 15분 간격으로 재시도합니다. 프로세스 재시작 시 실패 재시도 횟수는 초기화됩니다.
- Daily 작업끼리는 한 번에 하나만 실행합니다. 기존 수동 Candidate 작업과의 KIS 요청 직렬화는 기존 KIS 서비스가 유지합니다.
- **서버와 PC가 켜져 있어야 합니다.** 절전 중 실행, OS 서비스 설치, 서버를 자동으로 켜는 기능은 없습니다. 지속 운영은 `npm.cmd start`를 사용합니다.
- 장후 결과가 없으면 장전 작업은 `NO_AFTER_MARKET_RESULT`로 실패하며 이전 날짜 결과를 오늘 결과로 대체하지 않습니다.
- 단일 Node 프로세스 운영을 전제로 합니다. 동일 저장 폴더를 사용하는 다중 서버/CLI 동시 운영은 지원하지 않습니다.

## 수동 실행

장후에 실행하면 다음 거래일용 결과를 저장합니다. 아래 두 명령은 각각 해당 시점에 실행하며, 같은 날짜에 연달아 실행한다고 오늘의 목록이 생성되는 것은 아닙니다.

```powershell
# 장후: 다음 거래일 관심종목 생성 (실제 KIS/OpenDART/뉴스 호출)
npm.cmd run daily:after-market

# 다음 거래일 장전: 전 거래일 저장 결과 재검증 (실제 API 호출)
npm.cmd run daily:pre-market
```

CLI는 부분 실패도 diagnostics/errors에 출력하고 종료 코드 1을 반환합니다. 화면의 '지금 장후 분석', '지금 장전 재검증' 버튼도 수동 실행입니다. '최신 결과 보기'와 화면 자동 새로고침은 저장된 파일만 읽습니다.

## 파이프라인과 저장

기존 Candidate Engine 재사용: 전체 마스터 → Hard Risk Gate → 후보 60 → Quote 최대 20 → 상위 Deep 최대 5 → 기존 Risk Semantic Gate·Investment Committee → 최종 최대 20 저장. UI는 오늘·내일 Top 5를 표시하고 전체 결과는 API/저장 파일로 제공합니다. 전체 종목 각각에 Quote를 호출하지 않습니다.

검증등급 A/B/C와 매력도 점수는 기존 의미를 유지합니다. 장전 공시·뉴스만 재검증했다고 C/B 등급을 A로 승격하지 않습니다. 장전 데이터 누락은 WATCH 및 점수 미확정으로 표시하며, 확인된 위험은 DOWNGRADED/RISK/EXCLUDED로 보존합니다.

```text
.data/daily/
  after-market/YYYY-MM-DD.json   # sourceTradingDate 기준
  pre-market/YYYY-MM-DD.json     # targetTradingDate 기준
  failures/YYYY-MM-DD.json       # 해당 날짜의 마지막 실행 실패
```

각 결과에 engineVersion, generatedAt, sourceTradingDate, targetTradingDate, candidates, diagnostics, errors를 저장합니다. 파일별 직렬화 → 임시 파일 쓰기 → fsync → atomic rename을 사용합니다. Windows 파일 잠금은 제한된 재시도로 처리합니다. 저장 실패 시 기존 정상 결과를 유지합니다. 실패 기록도 저장할 수 없으면 실행 상태에 storageError가 남습니다.

.data는 Git에서 제외합니다. 신규 저장 데이터에는 환경설정 전체, API 응답 원문, 키/토큰 필드를 넣지 않으며 민감 문자열도 제거합니다.

## API

| Method | URL | 동작 |
| --- | --- | --- |
| POST | /api/daily/after-market | 기본 한도로 장후 분석 시작 |
| GET | /api/daily/tomorrow | 다음 거래일에 맞는 저장 결과, 없으면 null |
| POST | /api/daily/pre-market | 전 거래일 후보의 장전 재검증 시작 |
| GET | /api/daily/today | 오늘 날짜 장전 결과, 없으면 null |
| POST | /api/daily/revalidate | 장전 재검증 다시 실행 |
| GET | /api/daily/status | 실행 상태·최근 완료·실패·후보 수·스케줄러 상태 |

POST는 빈 JSON 객체 `{}`를 받습니다. 실행 시작 시 HTTP 202와 job/statusUrl을 반환합니다. 완료 여부는 status에서 확인합니다. 중복 실행은 409, 잘못된 JSON은 400, 읽기 실패는 구조화된 오류를 반환합니다. 비동기 작업 실패는 lastJob/lastFailure 및 저장 오류 기록에 표시됩니다.

## 장전 검증 범위와 제한

- 거래일 계산은 주말과 `KSTOCK_MARKET_CLOSED_DATES`에 지정한 휴장일을 제외합니다. 쉼표로 구분한 YYYY-MM-DD 날짜를 설정하고 서버를 재시작하세요. 빈 설정은 주말만 제외합니다. 공식 휴장일 자동 수집과 특별 거래시간은 아직 지원하지 않습니다. 잘못된 날짜는 실행 오류로 처리합니다. API 없는 검증: `npm.cmd run calendar:check`.
- OpenDART 접수 목록에는 날짜만 있어 전 거래일 전체 공시를 보수적으로 포함합니다. 정확한 장 마감 이후 신규 공시만 구분하거나 전날 이미 확인한 공시를 완전히 제거하지 못합니다.
- 공시는 최대 100건 × 10페이지를 확인합니다. 한도를 넘으면 미완료로 표시합니다. 단순 감사보고서 제출·기술적 거래정지 예외는 기존 Semantic Gate를 사용합니다.
- 뉴스는 기존 RSS 제목 기반 분석이며, 전일 15:30 KST 이후 시각 필터를 적용합니다. 고위험 뉴스는 사실 확인이 필요한 RISK로 표시합니다. 뉴스 수집 비활성/실패·시각 누락·상한 도달을 오류로 기록합니다.
- 시장은 기존 KIS KOSPI/KOSDAQ 일봉 분석입니다. 미국시장·선물·환율의 밤사이 변화를 새로 수집하지 않습니다.
- 장전 재검증은 저장 후보의 위험 변화를 확인합니다. 모든 후보의 재무·차트·수급·Committee를 다시 계산하지 않으며 새로 Quote API를 전수 호출하지 않습니다.
- 보유종목은 기존 브라우저 localStorage에 저장됩니다. Daily 서버 저장이 보유종목의 PC/모바일 동기화를 추가하지는 않습니다.
- 스케줄러는 기본 OFF이므로 설치만으로 자동 실행되지 않습니다.

## 이번 작업에서 실제 실행한 검증

- daily:check: 모의 3,989종목 파이프라인(Quote 20 / Deep 5), 일부 KIS 실패, 공시 위험/중립 예외, 장전 뉴스·시장, 날짜 전환, 스케줄러, HTTP API, 화면 로딩 통과.
- daily:store-check: 저장·재읽기·재시작·동시 교체·중단된 임시 파일·비밀정보 제거·손상 파일 처리 통과.
- daily:browser-check: 모의 데이터로 Chrome PC 1440px / 모바일 390px 실제 렌더링 통과.
- 기존 candidate:check, candidate:rank, risk:semantic, entry-exit:check, entry-exit-ux:check, portfolio:check, dashboard:check, screener:check, committee:check, research:check 통과.
- 기존 **OpenDART score:check 실제 API 검증 통과**. **Daily 전체 KIS/OpenDART/뉴스 실데이터 파이프라인은 실행하지 않았습니다.**
- KIS 서비스와 Entry/Exit 서비스는 작업 전후 SHA-256 동일. 토큰 캐시·직렬화·간격·재시도 및 Exit Pressure 로직 유지.

---

# K-Stock AI v2.5.1 — Entry/Exit UX Patch

## v2.5.1 변경사항
- 관심후보의 `개별분석`을 `상세분석 →`으로 변경
- 후보/스크리너에서 상세분석 실행 후 분석 완료 시 종목 상세 영역으로 자동 이동
- 상세 영역에 포커스 하이라이트를 적용해 현재 위치를 명확히 표시
- Entry 영역에 `현재 분석 → 매수 기준 등록 → 보유종목 → Exit 재검증` 4단계 흐름 표시
- 분석 완료 종목명을 Entry 안내문에 표시
- 기존 Entry/Exit 엔진, 후보 Ranking, 모바일 반응형 UI 유지
- 자동주문/자동매매 기능 없음

## 확인
```
npm.cmd run entry-exit-ux:check
npm.cmd run entry-exit:check
npm.cmd run dashboard:check
```

# K-Stock AI v2.5.0

## Entry + Exit 통합 엔진
- 기존 매수 후보/정밀분석 결과를 **매수 기준 스냅샷**으로 저장
- 매수가·수량·손실 제한·이익실현 검토 기준 등록
- 동일한 Committee·기술·수급·시장·뉴스·리스크 데이터를 현재 시점에 재분석
- 진입 당시 대비 Committee 점수 하락, 추세 붕괴, 수급 반전, 리스크 증가, 부정 뉴스, RISK_OFF를 Exit Pressure에 반영
- 상태: `보유 유지 / 주의 관찰 / 이익실현 검토 / 매도 검토 / 위험 이탈 검토`
- 보유종목은 브라우저 localStorage에 저장되며 API Key/Secret은 저장하지 않음
- 자동주문/자동매매 없음

### 테스트
```text
npm.cmd install
npm.cmd run entry-exit:check
npm.cmd run dashboard:check
npm.cmd run dev
```


## Mobile-first responsive UI
- 760px 이하에서 고정 모바일 앱바 + 하단 5탭 내비게이션
- 오늘의 관심종목 Top 20을 가로 표 대신 터치형 카드 리스트로 변환
- 검색/분석 폼을 한 손 조작 가능한 세로형으로 재배치
- A/B/C 검증등급, 매력도, 핵심 이유/위험, PER/PBR, 스타일, 개별분석을 카드에 유지
- 후보 파이프라인/검증요약을 2~3열 모바일 카드로 재배치
- 종목 상세, 11개 지표, 7축 점수, Bull/Bear, 시나리오, 차트, 수급/시장/뉴스 모두 반응형
- 데스크톱 UI는 기존 레이아웃 유지
- 자동매매 기능 없음


한국 주식 리서치용 멀티에이전트 대시보드. v2.3.2은 **오늘의 관심종목 후보 엔진**을 추가합니다. 관심후보는 매수추천이 아니며 자동매매 기능은 없습니다.

## v2.2 파이프라인
1. KIS 종목 마스터 전시장 스캔
2. 관리/거래정지 등 Hard Risk 제외
3. 상위 후보 현재가·PER·PBR·52주 위치 보강
4. 극단 ROE/누락 데이터 품질 Gate
5. 일부 상위 후보 OpenDART + 차트 + 수급 + 시장 + 뉴스 정밀검증
6. Investment Committee 및 Risk Hard Stop
7. 최종 `오늘의 관심종목 후보 Top 20` 표시

## 테스트
```
npm.cmd install
npm.cmd run candidate:check
npm.cmd run candidate:live
npm.cmd run dev
```

`candidate:live`는 호출량을 줄이기 위해 정밀검증 0, 현재가 10개만 수행합니다. 대시보드의 균형/강화 모드에서 정밀검증 3/5개를 선택할 수 있습니다.

## 안전 원칙
- `KSTOCK_LIVE_TRADING_ENABLED=false` 유지
- 주문 API 없음
- 결과는 연구·의사결정 지원용
- 품질 플래그가 있는 재무 지표는 원천 공시 대조 전 확정 판단 금지


v2.0 Pro Research Dashboard 위에 **KOSPI/KOSDAQ 종목 마스터 기반 전 종목 1차 스크리너**를 추가한 버전입니다.

## 핵심 추가 기능

- KIS 공식 종목 마스터 파일(`kospi_code.mst.zip`, `kosdaq_code.mst.zip`) 수집 및 24시간 로컬 캐시
- 코스피/코스닥 전체 종목 universe 구성
- 마스터 데이터 기반 1차 스캔: ROE, 영업이익/순이익 방향, 시가총액, 전일 거래량, 위험 플래그
- 거래정지·관리종목·정리매매·불성실공시·시장경고 종목 Hard Risk 제외
- 동일 거래소 + 지수 업종 대분류 코드 기준 상대평가
- 상위 N개만 KIS 현재가 API로 PER/PBR/52주 고점 위치 보강
- 스크리너에서 `정밀분석`을 누르면 기존 v2.0 개별 종목 분석으로 연결
- 자동주문/자동매매는 포함하지 않음

## 왜 2단계 스크리닝인가

KIS 현재가 API를 2천 개 이상 종목에 매번 순차 호출하면 호출 제한과 처리시간 부담이 큽니다. 그래서 v2.1은 **마스터 파일로 전 종목을 빠르게 1차 필터링하고, 상위 일부만 실시간 API로 보강**합니다. 최종 투자 판단은 기존 OpenDART·KIS·수급·시장·뉴스·Risk·Committee 정밀분석을 거칩니다.

## 실행

```text
node -p "require('./package.json').version"
npm.cmd install
npm.cmd run screener:check
npm.cmd run dev
```

브라우저: `http://localhost:3000`

## API

- `GET /api/universe/status`
- `GET /api/screener?exchange=all&top=20&enrich=10`
- 기존 `GET /api/full/analyze/:stockCode?businessYear=YYYY`

## 주의

마스터 기반 스크리너 점수는 **후보 탐색용 1차 휴리스틱**입니다. 업종 상대평가도 현재는 KIS 마스터의 지수 업종 대분류 코드를 기준으로 하며, 향후 업종별 PER/PBR 역사 밴드와 컨센서스 데이터를 추가해 고도화합니다.

## v2.3.2 안정화

- OpenDART `013`은 공식 문서상 "조회된 데이터가 없습니다" 상태입니다. 연차보고서가 아직 없는 연도라면 요청연도부터 최대 3년 이전까지 자동으로 조회합니다.
- KIS 종목 마스터는 공식 backtester와 동일하게 단축코드 0:9, 한글종목명 21:61 고정 바이트를 핵심 파싱 규칙으로 사용합니다.
- `npm.cmd run universe:check`: 실제 KOSPI/KOSDAQ 마스터 다운로드 + 종목 수 검증
- `npm.cmd run screener:live`: 실제 마스터 기반 전체시장 1차 스크리너 검증(현재가 API 보강 없음)


## v2.3.2 안정화
- KIS marketWarning의 정상값(0/00/blank)을 위험으로 오판해 전 종목이 제외되던 버그 수정
- 실데이터 스크리너 진단값(eligible/excludedHardRisk/withRoe/withMarketCap/withPrevVolume) 추가
- top이 비어 있으면 live smoke test가 실패하도록 검증 강화


## v2.3.2 패치
- 후보 엔진의 KIS 현재가 검증을 Screener 내부 재정렬과 분리했습니다.
- 이전 버전에서는 상위 종목을 현재가 보강한 뒤 재정렬하면서, 보강된 종목이 후보 Pool 밖으로 밀려 `quoteValidated: 0`이 될 수 있었습니다.
- 이제 Master 후보 Pool을 먼저 고정한 다음 후보 엔진이 상위 N종목을 직접 KIS 현재가로 검증합니다.
- `quoteRequested`, `quoteValidated`, `quoteFailed` 진단값을 추가했습니다.
- `candidate:live`는 현재가 검증이 0건이면 실패 코드로 종료합니다.


## v2.3.2 Risk Gate diagnostics
- candidate:balanced now prints the exact hard-stop source and OpenDART risk details for rejected deep candidates.
- This patch does not weaken Risk Hard Stop rules; it makes false-positive diagnosis auditable before any policy change.

## v2.3.2 Risk Semantic Gate

- `감사보고서제출` 자체는 정보성 공시로 처리하며 `AUDIT_RISK`를 발생시키지 않습니다.
- 감사의견 거절/부적정은 `VERY_HIGH` 감사위험으로 유지합니다.
- 한정의견/계속기업 불확실성은 `HIGH` 경고로 분리합니다.
- 무상증자/주식분할/액면분할/병합 등 기술적 사유의 거래정지는 정보성 일시정지로 분류하며 자동 Hard Stop을 금지합니다.
- 원인 불명 또는 비기술적 거래정지는 기존 `VERY_HIGH` Hard Stop을 유지합니다.
- `npm.cmd run risk:semantic`으로 오탐 방지 규칙을 오프라인 검증할 수 있습니다.

## v2.3.2 Operational Candidate Dashboard
- 오늘의 관심종목 화면에 데이터 검증 신뢰등급(A/B/C)을 표시합니다.
- 정밀검증 완료, 현재가 검증, 마스터-only 후보를 명확히 구분합니다.
- 후보별 핵심 이유, 주요 위험, PER/PBR, 스타일 태그, Committee 점수를 한 화면에 표시합니다.
- 정밀분석 결과 `VERIFIED_RISK` 또는 `RISK_EXCLUDED` 종목을 별도 위험 테이블에 표시합니다.
- 신뢰등급은 데이터 검증 깊이를 뜻하며 투자성과 또는 수익확률을 의미하지 않습니다.
- 자동주문/자동매매 기능은 포함하지 않습니다.

정적 UI 검증:
`npm.cmd run dashboard:check`

## v2.3.2 Candidate Ranking & UX Fix
- 정밀검증 통과 후보(VERIFIED_INTEREST/WATCH)를 LIGHT/MASTER 후보보다 우선 노출
- 위험/제외 후보는 기존처럼 별도 테이블로 분리
- 신뢰요약의 A등급을 실제 최종 후보에 포함된 정밀검증 종목 수로 표시
- 반복되던 후보 사유를 VALUE/ASSET_VALUE/MOMENTUM/52주 고점/유동성/ROE 기준으로 다양화
- 개발자용 품질 플래그를 한글 위험 문구로 변환
- LIGHT/C 후보에 “정밀 리스크 미검증”을 명시하여 거짓 안전감 방지
- 개별분석 버튼 클릭 시 6자리 종목코드를 입력창에 자동 반영 후 정밀분석 실행
- UI 버전은 /health에서 읽고, 서버 버전은 package.json을 단일 기준으로 사용

## v2.3.2 Ranking Quality Engine
- 검증등급(A/B/C)과 투자매력 순위를 분리했습니다.
- Ranking Score(0~100): 펀더멘털 25%, 밸류에이션 25%, 모멘텀 20%, 유동성 10%, 위험 15%, 데이터 신뢰도 5%.
- DEEP 후보는 Committee 점수를 보조 입력(15%)으로 반영하되 A등급이 B등급보다 자동 우선하지 않습니다.
- VERIFIED_RISK / RISK_EXCLUDED는 후보 Top 20에서 제외합니다.
- 업종코드(industryLarge) 기준 기본 최대 3개 제한을 적용하고, 후보 수가 부족할 때만 제한을 완화해 Top N을 채웁니다.
- 화면의 `매력도`는 후보 정렬용 연구 점수이며 수익률 예측·매수추천이 아닙니다.


## v2.6.1 Morning Brief

07:00 Asia/Seoul daily research orchestration is available and disabled by default. See [implementation report and setup](MORNING_ORCHESTRATOR_REPORT.md).

Use `npm run daily-agents:check`, `npm run daily-agents:status`, and `npm run daily-agents:run`. CLI run/status require the development server. Force rerun: `npm run daily-agents:run -- --force`. Existing browser positions require one-time connection using the Morning Brief import button. No order API is implemented.
