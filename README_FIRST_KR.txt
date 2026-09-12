K-Stock AI v2.3.2 — 오늘의 관심종목 후보 엔진

핵심 원칙
- 관심후보 ≠ 매수추천
- 자동주문/자동매매 없음
- KIS 마스터 전종목 → Hard Risk → 현재가 → 일부 정밀분석 → Committee
- 극단 ROE는 EXTREME_ROE_RECHECK 품질 플래그로 재검증
- Risk Hard Stop 종목은 최종 관심후보에서 제외

설치/테스트 (VS Code 터미널)
1) node -p "require('./package.json').version"   => 2.3.2
2) npm.cmd install
3) npm.cmd run candidate:check                    => 오프라인 로직 테스트
4) npm.cmd run candidate:live                     => 실제 KIS 빠른 후보 테스트(정밀검증 0)
5) npm.cmd run dev
6) http://localhost:3000

대시보드 검증 강도
- 빠른: 현재가 10 / 정밀 0
- 균형: 현재가 15 / 정밀 3
- 강화: 현재가 20 / 정밀 5

주의
균형/강화 모드는 KIS/OpenDART/뉴스를 순차 호출하므로 시간이 걸릴 수 있습니다.
.env의 API 키는 ZIP에 포함하지 마세요. 기존 로컬 .env를 유지하세요.


## v2.3.2 Risk Gate diagnostics
- candidate:balanced now prints the exact hard-stop source and OpenDART risk details for rejected deep candidates.
- This patch does not weaken Risk Hard Stop rules; it makes false-positive diagnosis auditable before any policy change.

[v2.3.2 추가]
Risk Semantic Gate 적용:
- 감사보고서 제출 자체는 위험 아님
- 의견거절/부적정은 Critical 유지
- 무상증자/분할 등 기술적 거래정지는 자동 Hard Stop 제외
검증: npm.cmd run risk:semantic
