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
