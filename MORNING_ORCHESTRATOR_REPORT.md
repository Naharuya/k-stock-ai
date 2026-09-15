# [K-Stock AI Daily Multi-Agent 완료 보고]

1. **구현 버전**: 2.6.1. 기존 2.6.0 장후/장전 분석, 후보 엔진, 개별 분석, Entry/Exit 화면을 유지했습니다.

2. **Daily Orchestrator**: `src/services/daily_agent_orchestrator.js`. Agent 의존성, 호출 범위, 오류 격리, 단계·상태 기록, 결과 저장을 담당합니다. 이번 Agent는 역할이 분리된 규칙·데이터 분석 모듈이며 별도의 LLM 호출을 강제하지 않습니다.

3. **Agent 목록**: Market, News, DART, Screener, Fundamental, Valuation, Technical, Flow, Risk, Bear, Investment Committee, Entry, Exit. 별도 QuoteValidationAgent도 기록합니다.

4. **Agent별 역할**

| Agent | 역할 |
|---|---|
| Market | KOSPI/KOSDAQ MA5/20/60/120, RSI, 수익률, 시장 regime. 전 거래일 기준일 검증 |
| News | 전 거래일 15:30 이후 뉴스, 발행시각 검증·중복 제거·감성·고위험 제목 탐지 |
| DART | 전 거래일 이후 공시 목록과 기존 Risk Semantic Gate. 접수시각 부재로 전 거래일 전체 포함 |
| Screener | 전체 master universe 위험 필터 → 최대 60개 후보. 전체 종목 Quote 호출 금지 |
| Quote Validation | 후보 최대 20개 순차 조회. 실패한 후보는 정밀검증 제외 |
| Fundamental | OpenDART 재무·성장률·수익성·부채비율·재무 위험 재사용 |
| Valuation | PER/PBR/PSR/PEG/BPS/APS/PTBR/EPS 계산. 업종 비교 데이터 미제공 시 NOT_AVAILABLE |
| Technical | 확정 일봉 종가, 이동평균, RSI, 거래량, 52주 범위, 5/20일 모멘텀 |
| Flow | 전 거래일까지 외국인/기관/개인 5·20일 수급. 당일 행 제외, 누락·오래된 데이터 보류 |
| Risk | LOW/MEDIUM/HIGH/CRITICAL. 공시·재무·뉴스·거래 제한·데이터 품질 위험 |
| Bear | 밸류 부담·수급 약세·추세·과열·실적·시장·뉴스·공시 반대 논리 |
| Committee | 7개 축과 Bear 결과 통합. RISK/WATCH/INTEREST/CONDITION_MET |
| Entry | EXCLUDED/WATCH/INTEREST/CONDITION_MET. 미정밀검증 후보는 WATCH |
| Exit | 저장된 원본 Entry Snapshot과 현재 상태 비교. 누락 데이터는 WATCH 및 점수 보류 |

뉴스 제목만으로 Hard Stop을 확정하지 않습니다. `verified=true`와 `evidenceSource=PRIMARY`가 명시된 검증 근거만 뉴스 Critical 판정에 사용할 수 있습니다. 현재 RSS 수집기는 이 검증 값을 생성하지 않습니다. 감사보고서 제출과 무상증자 등 기술적 거래정지는 기존 Semantic Gate를 적용합니다.

5. **실행 순서**: 공통 데이터 → Screener → Quote Validation → Deep Analysis → Risk → Bear → Committee → Entry → Exit → Report. 보유종목·이전 후보는 공통 데이터를 먼저 준비하고, 새 후보의 뉴스·공시는 발견 후 추가 수집합니다. 정밀후보 최대 5개 외에 서버 보유종목도 분석하며 중복 종목 데이터는 재사용합니다.

6. **Scheduler**: Asia/Seoul 07:00, 30초 주기 확인. 기본 꺼짐. 주말 및 `trading_day_service`의 설정 휴장일 제외. 예약 시간 이후 서버 시작 시 미생성 당일 보고서를 생성합니다. 같은 날짜에 저장된 결과가 있으면 자동 재실행하지 않습니다. 부분·실패 보고서도 `force:true` 수동 재시도가 필요합니다. 서버가 꺼져 있으면 실행할 수 없습니다.

```dotenv
KSTOCK_DAILY_ORCHESTRATOR_ENABLED=false
KSTOCK_DAILY_ORCHESTRATOR_HOUR=7
KSTOCK_DAILY_ORCHESTRATOR_MINUTE=0
KSTOCK_TIMEZONE=Asia/Seoul
KSTOCK_LIVE_TRADING_ENABLED=false
```

활성화하려면 로컬 환경에서 Orchestrator 플래그만 true로 설정하고 서버를 재시작합니다. 실제 로컬 설정은 변경하지 않았습니다. 서버 단일 프로세스 운영을 전제로 합니다.

7. **신규 API**

| API | 동작 |
|---|---|
| GET /api/daily/latest | 최근 저장 보고서. 이전 날짜인 경우 날짜를 함께 표시 |
| POST /api/daily/run | 백그라운드 실행, 202 반환. `{force:false,scope:"all"}` |
| GET /api/daily/agents/status | 실행상태, Agent별 상태, 예약 설정 |
| GET /api/daily/candidates | 당일 관심후보 |
| GET /api/daily/portfolio | 서버 보유정보와 당일 Exit 결과 |
| GET /api/daily/report | 당일 보고서 |
| POST /api/daily/portfolio | 원본 Entry Snapshot 등록·갱신 |
| DELETE /api/daily/portfolio/:code | 서버 보유정보 삭제 |

`scope`: all / candidates / portfolio. 후보만·보유종목만 재검증한 보고서는 다른 영역의 기존 시점을 따로 기록합니다. CLI는 같은 서버 API를 사용하므로 별도 예약 프로세스를 만들지 않습니다.

8. **저장 구조**: `.data/daily/YYYY-MM-DD/` 아래 market.json, disclosures.json, news.json, candidates.json, committee.json, entry.json, exit.json, analysis.json, agents-status.json, daily-report.json. 보고서를 마지막에 원자적으로 교체합니다. 보유정보는 `.data/portfolio/positions.json`. 재시작 후 재조회 가능하며 비밀키 필드와 환경 비밀값을 저장 결과에서 제거합니다.

9. **Morning Brief**: 모바일 첫 영역에 분석 날짜·완료시각, Top 5, 시장 regime, 신규 위험 종목 수, HOLD/WATCH/검토 상태 건수, 실패·부분완료, Agent별 상태를 표시합니다. 페이지 열기 자체로 분석을 시작하지 않습니다. 네 가지 요청 버튼과 기존 브라우저 보유정보를 서버에 연결하는 버튼을 제공합니다. 새 Entry 등록은 서버에도 저장됩니다.

10. **Entry 결과**: 오프라인 3,989종목 규모 fixture에서 60 → 20 → 5 호출 범위, Committee 생성 및 Entry 상태 생성을 검증했습니다. 기존 Ranking Quality/업종 분산을 유지하므로 최종 Top 5에 LIGHT 후보가 포함될 수 있고, 해당 후보는 점수 미확정·WATCH로 표시됩니다. 매수 주문 없음.

11. **Exit 결과**: 기존 HOLD/CAUTION/TAKE_PROFIT_REVIEW/EXIT_REVIEW/RISK_EXIT_REVIEW 엔진을 재사용하며 Morning API는 CAUTION을 WATCH로 표시합니다. 가격·Entry 근거·필수 분석 누락 시 Pressure를 생성하지 않습니다. 원본 Entry Snapshot과 평가 기준일을 결과에 보존합니다. 자유서술형 최초 투자 논리의 사실 검증은 자동화하지 않고 구조화된 점수·추세·수급·뉴스·위험 변화만 비교합니다.

12. **테스트 결과**
- daily-agents:check: 통과 — 단계 순서, Agent 실패 격리, 실패/부분 성공, 보유종목 처리, 저장·재시작, 날짜 중복 방지, API, 포트폴리오 동시 저장.
- 기존 candidate_engine / balanced / ranking: 통과.
- 기존 entry_exit / entry_exit_ux: 통과. UX 테스트의 고정 버전 검사를 2.6.x 패치 호환으로 변경 후 재실행.
- 기존 dashboard_operational / daily_dashboard: 통과.
- 기존 disclosure_semantic / committee: 통과.
- 기존 daily / daily_scheduler / daily_api / daily_store / trading_calendar / portfolio_concurrency: 통과.
- 실제 Chrome 브라우저: 1440px 데스크톱, 390px 모바일, Morning Brief 우선 표시·Top 5·WATCH 건수·수동 Exit 요청·화면 넘침 없음·JS 예외 없음 통과. 화면 데이터는 fixture.
- 기존 KIS 서비스의 Token Cache·전역 Queue·직렬화·min interval·EGW00201 재시도 코드는 변경하지 않았습니다. 새 오케스트레이터의 mock 동시 호출 최대값 1 및 20개 Quote 상한을 검증했습니다.

13. **실제 KIS 테스트**: 격리된 `tmp/morning-live/` 저장소에서 흥아해운 003280 한 종목의 보유종목 전용 실행을 수행했습니다. 2026-09-10 확정 종가 1,901원, Market/News/DART/Fundamental/Valuation/Technical/Flow/Risk/Bear/Committee 성공. 실제 과거 투자근거가 없는 fixture이므로 Exit WATCH/PARTIAL, Pressure 보류. 실제 전체시장 Screener/20개 Quote/5개 Deep 실행은 수행하지 않았습니다. 운영 보유정보에 테스트 종목을 추가하지 않았습니다.

14. **실패/부분성공 테스트**: News 전체 실패 및 일부 종목 실패, Screener 실패 후 보유종목 Exit 계속 실행, 가격 이력 누락, 오래된 가격·수급, 당일 수급 0, 누락 수급, 뉴스 중복·기간 초과, 제목-only 위험, 주말·휴장일·07:00 이전·동일 날짜 중복·기본 비활성화를 검증했습니다.

15. **알려진 제한사항**
- 기본 꺼짐이며 서버를 계속 실행해야 합니다. Windows 서비스/작업 스케줄러 자동 부팅 및 다중 서버 분산 잠금은 이번 범위에 포함하지 않았습니다.
- 휴장일은 기존 설정 `KSTOCK_MARKET_CLOSED_DATES` 관리가 필요하며 KRX 공휴일 자동 다운로드는 없습니다.
- 모든 Morning 실행(오후 수동 포함)은 전 거래일 확정 데이터 기준입니다. 실시간 장중 분석은 기존 정밀분석 기능을 사용합니다.
- KIS Quote 밸류에이션과 52주 범위에는 별도 거래시각이 없으며 확정 종가는 일봉으로 검증합니다.
- OpenDART 재무는 최신 사용 가능한 연간 자료입니다. 최신 분기/반기 자동 선택은 아직 없습니다.
- 뉴스는 제목 기반이고, 공시는 목록의 의미 분류이며 원문 전문 사실 검증은 아닙니다.
- 기존 브라우저 보유정보는 '기존 보유종목 연결'을 한 번 눌러야 브라우저가 닫힌 상태의 자동 Exit 대상이 됩니다.
- 서버 저장소/API는 기존 로컬 단일 사용자 모델을 따릅니다. 공용 인터넷 배포 전 인증과 사용자별 데이터 분리가 필요합니다.
- 가격 목표 구간을 새로 추정하거나 주문 기능을 추가하지 않았습니다.

16. **다음 개발 권장사항**: 휴장일 공식 데이터 동기화, 분기·반기 재무 선택, 원문 근거 검증, OS 시작 시 서비스 실행, 다중 인스턴스 잠금 및 사용자별 보유정보 분리.

실행:
```powershell
npm.cmd run dev
npm.cmd run daily-agents:check
npm.cmd run daily-agents:status
npm.cmd run daily-agents:run
npm.cmd run daily-agents:run -- --force
```

브라우저: http://localhost:3000
