# DB하이텍·MU 공식 저장 근거 후속 검토 — 2026-10-12

작업 범위는 K-STOCK AI 로컬 저장 근거 검토다. AGENTS.md 및 ARI_COMPLIANCE_STANDARD.md 확인. 기준 브랜치 `auto/kstock-development-20260930`, 커밋 `ea406852610c00bef0dbe469de95c42fca662c30`. 기존 미커밋 변경과 원문은 보존했다. 이번 검토 외부 조회 0회, 주문 호출 0회. 다른 프로젝트·운영 서버·인증정보 변경 없음.

## DB하이텍: 0건 해결 / 9건 미해결

공식 최초 공시 [20260316001250](https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260316001250), 정정 [20260601001661](https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260601001661)의 저장 ZIP SHA-256을 기존 numeric-audit와 대조해 일치함을 확인했다. 기존 8개 표·200항목 직접 대조와 합계 잔차 9건을 재사용했다. 신규 원인 근거가 없으므로 모두 UNRESOLVED다.

| ID | 회계기간/기준 | 단계·측정 | 변경 전→후 합계 | 단계 구성항목 합 | 잔차 | 원인 |
|---|---|---|---|---:|---:|---|
| DB-FX-01 | 2025 연결 | 변경 전 USD 천USD | 554556→554556 | 54196 | 500360 | UNRESOLVED |
| DB-FX-02 | 2025 연결 | 변경 후 USD 천USD | 554556→554556 | 54556 | 500000 | UNRESOLVED |
| DB-FX-03 | 2025 연결 | 변경 후 JPY | 3669십만JPY→366952천JPY | 366950천JPY | 2천JPY | UNRESOLVED |
| DB-FX-04 | 2024 연결 | 변경 전 USD 원화환산 백만원 | 40026→40026 | 43889 | -3863 | UNRESOLVED |
| DB-FX-05 | 2024 연결 | 변경 후 USD 원화환산 백만원 | 40026→40026 | 43889 | -3863 | UNRESOLVED |
| DB-FX-06 | 2024 별도 | 변경 후 USD 천USD | 88974→88974 | 89024 | -50 | UNRESOLVED |
| DB-FX-07 | 2025 별도 | 변경 전 USD 원화환산 백만원 | 42431→42431 | 42432 | -1 | UNRESOLVED |
| DB-FX-08 | 2025 별도 | 변경 후 USD 원화환산 백만원 | 42431→42431 | 42432 | -1 | UNRESOLVED |
| DB-FX-09 | 2025 별도 | 변경 후 JPY | 3611십만JPY→361121천JPY | 361120천JPY | 1천JPY | UNRESOLVED |

각 잔차는 동일 문서 단계 내 표시 구성항목 단순합과 합계의 차이다. 정정 사유 “통화 단위 기재오류” 및 실제 USD 수치·JPY 단위 변경은 관측되지만, 잔차별 합계 구성 범위나 반올림 정책 설명을 제공하지 않는다. 작은 잔차를 반올림으로 해결하거나 큰 잔차를 오기/합산오류로 확정하지 않는다. CORRECTION/UNIT_DIFFERENCE/PERIOD_DIFFERENCE/SCOPE_DIFFERENCE/ROUNDING/SUMMATION_ERROR/SOURCE_CONFLICT 모두 개별 공식 원인은 NOT_ESTABLISHED다.

`numeric-audit.json`의 CFS_BALANCE/CFS_INCOME/OFS_BALANCE/OFS_INCOME 4개 본표 unchanged=true 근거를 함께 보존한다. 외화 주석 잔차 9건이 있다는 사실만으로 장부가치 본표 오류를 단정할 수 없다. 본표 동일성만으로 최신 자본·주식 종류 범위·정정 계보·10월8일 주식수를 승인하지도 않는다. 해당 주석 수치는 평가 입력에서 제외한다. 정정 접수6월1일보다 앞선 평가에는 정정 정보를 소급 적용하지 않는다.

실행: `node scripts/review-db-correction-differences.mjs` 및 `node --test test/correction_difference_review.test.js`. 새 검토 결과 `data/v2/verification/db-correction-1791783200385/difference-review-1791795736964.json`, 7 PASS / 0 FAIL. 원문 ZIP·기존 감사 파일 수정 없음.

## MU: 공식 계정 관측 확인 / 평가 입력 보류

SEC submissions 저장본 `data/v2/verification/global-peer-identity-1791783714687.json`에서 MICRON TECHNOLOGY INC / CIK0000723125 / MU / Nasdaq / SIC3674(Semiconductors & Related Devices) 일치 확인. Companyfacts 저장 원문 `data/v2/data-collection/sources/162439f31208eaf4cd1a33939d80fd40479a559735b9488d32ac43d5516ff7bf.json`을 직접 읽어 계정·단위·기간·접수번호를 대조했다.

공식 출처: [SEC submissions](https://data.sec.gov/submissions/CIK0000723125.json), [SEC companyfacts](https://data.sec.gov/api/xbrl/companyfacts/CIK0000723125.json). 저장 원문 확보시점 2026-10-12T08:38:36.211Z. 이번 작업은 저장본 재검토이며 새 다운로드가 아니다.

| 항목 | 실제 저장 원천 값 | 기준/공개일 | 판정 |
|---|---|---|---|
| 회계연도·분기 | fy2026, fpQ3, form10-Q | 회계기간말2026-05-28 / 접수2026-06-25 | 확인됨; 국내6월말과 동일 기간 아님 |
| 자본 | us-gaap:StockholdersEquity 100724000000 USD | 2026-05-28 / 2026-06-25 | 원천 계정 확인; 단위 USD 원금액 |
| 보통주수 | dei:EntityCommonStockSharesOutstanding 1129393151 shares | 2026-06-17 / 2026-06-25 | OUTSTANDING 관측; 발행주식수로 대체 금지 |
| 원문 접수번호 | 0000723125-26-000015 | 2026-06-25 | 기준일 이전 공개 |
| 다음 연간 자료 | FY2026 10-K, 기간말2026-09-03, 자본138378000000 USD | 접수2026-10-09 | 10월8일 평가 차단 |
| 다음 보통주수 | 1131423212 shares | 기준2026-10-02 / 접수2026-10-09 | 수치 기준일이10월8일 이전이어도 공개가 이후이므로 차단 |
| 과거 비지배지분 포함 자본 | 43933000000 USD | 2021-09-02 / 접수2021-10-08 | 오래된 별도 계정; 최신 자본과 결합 금지 |

StockholdersEquity 계정 설명은 지배기업 귀속 지분이며 비지배지분과 temporary equity를 제외한다고 명시한다. 회사별 종류·우선권·자기주식 정의와 시가총액 범위를 추가 검증해야 한다. 이 계정을 전체 연결 자본이나 원화 금액으로 표시하지 않는다.

저장 submissions recent에서2025-09-01 이후 10-Q/A·10-K/A 항목은 관측되지 않았다. 이는 해당 저장 목록 내 검색 결과다. 전체 과거 제출 원문·notes 정정 계보를 완전히 검증했다는 의미는 아니므로 CORRECTION_LINEAGE_UNVERIFIED 유지. 공식10-Q 원문 전체 검토는 이번 작업 NOT RUN이다.

사업 적합성: 저장 SIC는 반도체 분류이고 기존 공식 [Micron 기업 소개](https://www.micron.com/about/company/corporate-profile) 검토 기록은 DRAM·NAND 제품 관련성을 뒷받침한다. 삼성전자는 기존 근거상 DX·DS 등 복합 사업이므로 회사 전체의 정량 사업 비중·장부가치 범위 비교성은 미검증이다. SIC·제품 유사성만으로 PBR 유효 표본 승인 금지.

가격·발행주식수·자기주식·기업행동을 동일10월8일로 연결하지 못했고 국내KRW와 MU USD 및 분기말이 다르다. 환율이나 날짜를 임의 적용하지 않는다. MU PBR/시장가치 입력 `valuationInputEligible=false`, 비교기업 유효 표본으로 등록하지 않는다. 가격 기준일·공시 이용 가능일·기업행동·주식 정의·사업 범위 검증이 다음 단계다.

## 한계와 다음 작업

DB는 공식 잔차별 합계 범위/정정 설명이 필요하다. MU는 기준일까지 공개된 10-Q 원문 회계정의·주식 종류·정정 계보 및10월8일 가격/주식수 연속성 확인이 필요하다. 실제 근거가 확보되기 전 추천과 삼성전자 성과 HOLD 유지. 이 문서는 DB/MU 저장 근거 검토 결과만 보고하며 Web/Galaxy A33·전체 회귀 검증은 주 작업 보고서에서 별도 판정한다.
