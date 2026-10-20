# Signal Research 공식 금융 근거 검증 — 2026-10-12

첨부 7b370d73 지시서, AGENTS·공통 준수 기준·기존 금융 QA와 승인된 가격 수집 경로를 확인했다. 기존 파일·금융 근거를 삭제하거나 대체하지 않았다. 금융 검증 Worker는 별도 저장 근거 큐를 유지한다.

## 이번 공식 읽기

직접 외부 읽기 성공 2회: FRED SP500 CSV 1회, 연준 파월 연설 PDF 1회. 별도 공식 출처 탐색용 웹 검색 1회. 최초 sandbox urllib 시도는 네트워크 접근 실패로 응답을 받지 못했으며 추가 성공 호출로 집계하지 않는다. 인증·비밀값·실거래 작업 없음.

[연준 공식 연설 PDF](https://www.federalreserve.gov/newsevents/speech/files/powell20250822.pdf)를 한 번 읽고 SHA를 계산한 뒤 macOS PDFKit으로 첫 페이지를 추출했다. 해당 문서 인물·날짜·연설 제목과 `For release on delivery` / 10:00 a.m. EDT (8:00 a.m. MDT), 2025-08-22를 확인했다. 이것은 공식 공개 예정 시각이며 실제 발언 전달이나 웹 최초 게시 시각을 관측한 것이 아니다. `officialScheduledReleaseAt=2025-08-22T10:00:00-04:00`, `publicAvailableAt=null`, precision `OFFICIAL_RELEASE_SCHEDULE`로 구분했다. America/New_York 시간대이며 예정 시각은 장중이다. SHA·URL·문서/인물 동일성·최소 확인 문구만 저장한 companion `data/v2/verification/powell-publication-time-20261012.json`은 0600이다. 전체 PDF·추출 텍스트는 /tmp에서만 다룬다.

[FRED SP500 공식 설명](https://fred.stlouisfed.org/series/SP500)은 미국 시장 종가, 배당 미포함 가격지수임을 명시한다. 제한 조회는 2025-08-21~09-23, 24행/유효 종가 23개이며 9월1일 결측을 보간하지 않았다. URL·SHA·단위 INDEX·시간대 America/New_York·날짜별 실제 응답은 Git 제외 `data/v2/verification/signal-sp500-research-20261012.json` (0600)에 저장했다. S&P 데이터 저작권 조건이 있으므로 원시 시계열을 공개 UI/저장소에 자동 배포하지 않는다.

공식 예정 시각에 기반한 미검증 시나리오의 비공개 지수 자체 관측 연구는 8월22일 종가를 시작점으로 이후 1/5/20 관측 거래일의 실제 종가 변화율을 계산했다. 종료일은 8월25일/8월29일/9월22일이다. 사건 당일 장중 반응은 이 시작점에서 빠진다. 해당 계산은 지수 자체 수익률이며 종목 수익률·벤치마크 초과수익률이 아니다. 이 셋은 null을 유지했다. public availability가 별도 검증되지 않아 상태 `PARTIAL_PUBLIC_AVAILABILITY_NOT_VERIFIED`, 표본 1, 예측력·인과관계·투자 추천 판정 없음. 주 에이전트가 정의한 엄격한 공개 시각 gate를 통과한 완료 표본으로 승격하지 않는다.

## 승인된 기존 경로의 한계

기존 KIS 요청은 국내 6자리 종목 및 KOSPI/KOSDAQ 지수만 허용하므로 미국 이벤트에 임의 종목 코드를 붙이지 않았다. 기존 Alpha Vantage Apple raw close 경로는 분석일 D-2 최신 가격용이며 이번 미국 사건 기간의 개별 종목·분할·배당 검증 자료를 제공하지 않는다. 새 유료 서비스·API 인증 변경·무제한 수집을 도입하지 않았다. 버핏 사건 기간의 가격과 정확한 공개 시각은 이번 작업에서 미확보이며 수익률을 추정하지 않는다.

## 기존 금융 검증 직접 재실행

`python3 scripts/audit-db-correction-source.py`: 공식 원문 전후 400셀 무결성/좌표 일치, 차이 9건, 해결 0/미해결 9. 이번 artifact `source-discrepancy-audit-20261012T125748Z.json`, apiReads=0. DB 894,000주 소각 기준점 포함은 별개이며 재차 차감하지 않는다.

`node scripts/run-peer-validation-worker.mjs`: UNCHANGED_SOURCE, 6기업 PARTIAL3/BLOCKED3/FAILED0, PER/PBR/PSR/EV_EBITDA 유효0. SK 자기주식 1,014주 원인 미확정, 개인 보유 변동을 회사 거래로 적용하지 않는다. 국내 10월8일 주식수·시총·PBR 보류 유지.

실제 Scheduler 관측: ownerPID 86274, enabled=true, interval 1,800,000ms, SAVED_EVIDENCE_ONLY, 다음 예정 2026-10-12 22:13:17 KST. 현재 worker.running=false는 대기 상태다. 이번 작업에서 30분 경과 자동 실행 관측 NOT RUN. 중복 Worker·스케줄러 생성/서버 재시작 없음.

## 검증 범위

이번 병렬 작업의 새 모델 실행·전체 회귀·Web·Galaxy A33는 NOT RUN이며 주 에이전트의 통합 검증과 구분한다. 추천·삼성전자 성과·Apple 순위 HOLD, 실제 주문 호출 이번 0. 자료 확보는 가능해졌으나 공식 예정 시각과 실제 공개 시각·관측 연구와 예측력·지수 반응과 종목 초과수익을 계속 구분한다.

Overall: PARTIAL.

추가 거래일 확인: [NYSE 운영사 ICE의 2025~2027 공식 휴장 발표](https://ir.theice.com/press/news-details/2024/NYSE-Group-Announces-2025-2026-and-2027-Holiday-and-Early-Closings-Calendar/default.aspx)가 2025년 Labor Day를 Monday, September 1로 명시한다. 따라서 이번 FRED 9월1일 빈 값은 공식 휴장일로 확인 가능하며 거래일로 계산하지 않는다. 추가 공식 출처 웹 검색/열람 각 1회; 가격 신규 직접 호출 없음. 주 에이전트의 보수적 일말 공개 가정·다음 세션 8월25일 종가 시작 시나리오는 위 8월22일 예정 시각 시나리오와 별개다.

## Phase 6 소규모 분산 연구 후보 — 자동 활성화 없음

별도 공식 출처 검색 2개 질의(한 도구 호출), 원문 열람 2건만 수행했다. 미국 중앙은행·미국 투자자에 집중된 기존 2건을 보완하는 유럽 중앙은행 및 대만 기업 후보다. 아래 후보는 원천 조사이며 새 AI 분석·가격 수집·실행 큐 자동 등록·활성 표본 추가를 하지 않았다.

| 후보 | 공식 날짜·당시 인물/직책 | 확인 범위 | 후보 상태·추가 조건 |
| --- | --- | --- | --- |
| [ECB: Beyond hysteresis: resilience in Europe’s labour market](https://www.ecb.europa.eu/press/key/date/2025/html/ecb.sp250823~2f476a9a97.en.html) | 2025-08-23, Christine Lagarde / President of the ECB | 기관 공식 본문이 발언자·당시 직책·행사·날짜와 발언 원문을 명시. 주제는 유럽 노동시장·물가·생산성 | PROSPECTIVE_SOURCE_IDENTIFIED. 정확한 공개 시각·시장 세션·유럽 관련 벤치마크·공식 행동 연결·신규 모델 분석은 미검증 |
| [TSMC 2025 주주총회 공식 의사일정](https://investor.tsmc.com/sites/ir/shareholders-meeting/2025-06-03/2025AGM_Agenda_wmn_1.pdf) | 2025-06-03 09:00 예정, Dr. C.C. Wei / Chairman of the Board of Directors | 당시 행사 의장과 Chairman’s Address 순서를 명시. CEO 직함은 이 의사일정의 증거 범위를 넘어 승격하지 않음 | CANDIDATE_BLOCKED_STATEMENT_TRANSCRIPT_UNVERIFIED. 의사일정은 실제 발언 원문·실제 공개 시각이 아니며 발언 실행/내용을 확인하는 공식 녹취·발언록 필요 |

미래 2025 연차보고서(2026 공개)의 직책·사실을 사건 당일 이용 가능한 근거처럼 소급 적용하지 않았다. 특정 기업 성장 전망에 대한 비공식 기사·인터뷰 인용을 공식 의사일정으로 검증 완료 처리하지 않았다. 후보 선정은 인과관계·예측 성공·투자 추천을 뜻하지 않으며 기존 2건 연구도 신호 예측력 또는 전체 연구 완료로 승격하지 않는다.
