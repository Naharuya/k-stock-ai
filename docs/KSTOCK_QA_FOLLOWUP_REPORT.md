# iOS 홈 화면 앱 아이콘 적용 — 2026-10-20 KST

기존 iOS 수동 빌드와 Xcode 프로젝트에 AppIcon 연결이 없어 홈 화면 아이콘이 누락돼 있었다. public/kstock-mark.svg의 기존 보라색/금색 심벌 형태를 불투명1024×1024 PNG로 만들고 Assets.xcassets/AppIcon으로 등록했다. 생성 소스 render-app-icon.swift를 보존했다. 수동 기기/시뮬레이터/HTTPS 미리보기 빌드가 공통 actool 도우미로 Assets.car 및 CFBundleIcons/iPad 설정을 포함하도록 연결하고 Xcode 리소스 단계도 추가했다.

기기 빌드·기존프로필 서명 검증 PASS, Xcode KStockLocal 시뮬레이터 BUILD SUCCEEDED. 원본 PNG1024×1024/알파없음 확인 및 육안 검토. 실제 빌드의 iPhone AppIcon60x60/iPad AppIcon76x76 설정·PNG·Assets.car 확인. **iOS0.1.8(9)**를 기존 iPhone 동일ID에 업데이트 설치·일반실행 성공, 데이터 초기화 없음. 아이폰 홈 화면 자체의 캡처 검사는 수행하지 않았으며 설치·번들 검증과 구분한다. Android/서버 변경 없음. 기존 backend/continuous 보고서 및 tests/diff는 보존·커밋 제외.

---

# 매매 판단 후속 1~6 개발·운영 반영 — 2026-10-20 KST

사용자가 승인한 6개 항목의 구현을 이어서 운영 및 기존 두 실기기에 반영했다. **전체 상장종목 분석 완료, 확정 추천 출시, 실제 수익 검증 또는 자연 백그라운드 알림 전달 완료를 의미하지 않는다.** 추천 HOLD·실주문 OFF를 유지한다.

## 적용한 기능

1. **후보 제외 이유**: 기초자료 형식 오류/수신24시간 경과를 따로 세고, 판단 불가 사유 및 고가 돌파·추세·거래량 미충족을 종목별/집계로 표시한다. 중복 사유임을 명시한다. 미분석 검색목록 수·최근 최대500개 저장파일 검사 범위를 보여준다. 자료 Gate에 막히면 조건 체크도 제거한다.
2. **분석 범위 확대 자동화**: 기존 시간별 Mac 작업에서 국내12·미국 NAS/NYS/AMS 각4, 최대24종목을 독립 순환한다. 마스터 갱신 때도 커서를 보존하여 첫 종목부터 반복하는 문제를 막았다. 기존 시간당 예산·잠금·공급자 제한을 유지한다. 실제 실행은 HOURLY_BUDGET으로 외부요청0회 건너뛰었고, 기존 hourly worker 등록/3600초 간격을 확인했다. 새 분배의 실제 다음 수집 결과/전시장 최신 분석 완료는 아직 확인하지 않았다. 500개 최근 저장자료를 보는 화면을 전체 시장 순위로 표시하지 않는다.
3. **매매 카드**: 손절·목표·진입과 함께 수일~수주/다음 세션 조건, 세 가지 판단 근거와 무효화 조건을 접지 않고 표시한다. 보유 상세에는 설치형 앱의 종가 조건 알림 설정 링크를 추가했다.
4. **보유종목 종가 알림**: 사용자가 상세에서 확인한 **1종목**의 고정 손절·목표/유효기한을 기기에 암호화 보관한다. 새 기준은 이전 기준을 교체한다. 공개 식별자만 일봉 API로 조회하여 손절/목표 또는20일 평균 아래 종가를 비교한다. 수량·평균가·손절/목표를 백그라운드 서버로 보내지 않는다. 기존 시장 알림을 켠 상태에서 별도로 선택해야 하며 실제 사용자 보유 기준을 임의 등록하지 않았다. 실시간 가격 도달 알림이 아니다. 최대24시간 유효, 만료 후 다음 OS조회 시 제거한다. OS미실행 중 정시 삭제를 보장하지 않는다. 끄기/인증 삭제/보유 수정·삭제/기준 삭제 경로를 제공하고 기준 교체·삭제와 작업의 충돌을 차단한다. 자연 잠금화면 전달, 장시간 만료 후 실제 삭제, iOS 전용 규칙 Keychain 전체 수명 검증은 미완료다.
5. **전략 성과 검증 표시**: 비용 반영 거래수·수익률·종가 기준 최대낙폭에 승률/최악 거래를 추가한다. 거래0건이면 승률을 null로 반환한다. 기존 시간 분리 평가 및 동일 종목 보유 비교를 유지한다. 삼성전자/Apple 실제 저장 일봉을 편도 수수료0.1%·매도세금0.1%·편도슬리피지0.1%의 **임의 시험 가정**으로 재생했다. 각각 종료거래1/3건, 수익률 약-3.48%/-2.46%, 종가 최대낙폭 약-3.48%/-7.66%였다. 실제 세율·실체결·장기/독립 검증 성과가 아니며 추천을 승격하지 않았다.
6. **실기기 사용성**: Android2.7.1(271)·iOS0.1.7(8)을 동일ID/기존서명/데이터 보존으로 설치했다. 실제 운영 API 기반 매매 흐름과 후보 진단·15px 이상 안내·가로 넘침을 양쪽 WebView에서 확인했다. Android 실제 급등락20행의 가격 잘림과 글자 크기도 확인하고 캡처를 육안 검토했다. 일반 실행 복원, Android 디버그 forward 해제, 기존 알림 허용·예약 유지.

## 검증 증빙과 범위

주요 자료: data/v2/verification/trading-followup-six/ (Git 제외 실행 증빙).

| 검사 | 결과/범위 |
| --- | --- |
| 최종 전체 오프라인 | **1,001 PASS**, /tmp/kstock-six-offline-final.log |
| 기존 Android 통신계약 | **4 PASS**, /tmp/kstock-six-android-contract.log |
| 브라우저 매매 흐름 | **34 PASS**, trading-ui/workflow.json. 합성 API·실제 HTTP 계약 포함 |
| 급등락 브라우저 | **21 PASS**, movers-ui/report.json. 합성20행·가격15px·넘침·인증 오류 |
| 모바일/데스크톱·테마·접근성 | **27 PASS**, workspace-six-final/report.json. 320/390/1440px 및 확대 |
| iOS 알림 판단 독립 코드 | **8 PASS**, HoldingAlertPolicyTests.swift. 합성 자료; OS전달 검사가 아님 |
| Android 실기기 알림 정책 | **9 PASS**, android-policy.json. 손절/목표/추세/다른종목/자료불가/만료 차단 및 별도 시험 Keystore 저장·암호문·삭제; 실알림 전달 검사가 아님 |
| 실기기 매매/화면 | **Android26 / iPhone31 PASS**, android-physical.json / ios-workflow.json |
| Android 실제 급등락 | **4 PASS**, android-movers-ui.json 및 android-market-movers.png |
| iOS 권한/기존 시장 예약 | enabled/scheduled true, authorization2, state CHECKED. ios-alert-status.json |
| 최종 후보 격리/전환 | **37 / 21 PASS**, final-staging.txt / final-activation.json |
| 시간별 수집 | 예약 등록3600초 확인. cycle.json은 예산 보존 SKIPPED이며 새 분배 실행 성공으로 세지 않음 |
| 실제 저장자료 재생 | live-replay.json. 국내/미국 각 SIMULATED, 고정 분리구간 비교 성공; 2종목 손실 결과 포함 |

초기 실기기 검사는 d75f 후보에서 실행했다. 최종 a3e 후보의 추가 차이는 데이터 Gate 차단 시 체크 제거이며 회귀·격리·전환 검사를 다시 수행했다. 전체 독립대사/전수 시세/미관측 장기 전략/스토어 개인정보·보유기간 Gate는 미완료로 유지한다. 개인정보 안내·배포 데이터 목록에 새 기기 저장·삭제·백그라운드 흐름을 반영했다.

운영 최종 후보 **review-a3e3344ba74ba8c2**, 소스 **8768c3a**,182파일, archive SHA256 **ac6482744a615abb39d10232348c772c870bc838c297eec97468811f3ae65084**. 이전3e/d75 후보와 환경·사용자 데이터/복원 경로 보존. 제품 및 수집 변경 origin/auto/kstock-development-20260930 푸시. 기존 backend 보고서·continuous 보고서·tests/diff는 이번 커밋에서 제외했다.

---

# 작은 글씨 가독성·매수 검토 후보 안내 — 2026-10-20 KST

급등락 화면의 10~12px 축소 스타일을 제거하고 종목명·가격·상태·매매 안내를 15px 이상으로 조정했다. 가격은 기본 본문색으로 대비를 높이고, 두 열을 유지하면서 행의 높이를 늘려 긴 가격을 생략하지 않는다. 오늘의 판단 제목을 **매수 검토 후보 · 모의 조건**으로 명확히 했다. 세로 스크롤을 허용하며 전체20행의 한 뷰포트 수용을 보장하지 않는다.

- 운영 API 확인(2026-10-20 19:42 KST): 국내 확보39/판단가능21/매수조건0, 미국 확보5/판단가능5/매수조건0. 검색목록 국내2856·미국6225 전체를 판단했다는 의미가 아니다. 양시장 추천 HOLD·실주문 OFF 유지.
- 브라우저 급등락 **21 PASS**: 320/390/1440px,20행·15px 이상 가격·긴 가격 잘림 방지·통화·인증실패 초기화·넘침 검사. 합성 API 사용, movers-ui/report.json.
- 기존 매매 흐름 **33 PASS**, 반응형·밝은/어두운 테마·접근성 **21 PASS**. trading-ui/workflow.json 및 workspace-readability/report.json. 이번 변경의 실기기 육안 확인은 별도 수행하지 않았다.
- 소스 **5b1980c** 커밋·푸시, 운영 **review-3e1c2a66265dd39b** 전환. 격리37·전환후21검사 PASS. 환경/사용자데이터 보존, native 알림 설정 변경 없음. 웹 자산 변경이므로 앱 재설치 불필요.

---

# 화면 꺼짐 시장 알림·급상승/급하락 TOP10 — 2026-10-20 KST

사용자의 화면 꺼짐 알림/20종목 동시 비교 요청에 따라 웹·네이티브 코드를 구현·커밋·푸시하고 운영 및 기존 실기기 앱에 반영했다. 메뉴의 **급상승·급하락 TOP10**에서 국내/미국을 선택하면 상승10·하락10을 같은 페이지의 두 열로 본다. 작은 화면·큰 글자에서는 세로 스크롤을 사용하며 모든20행이 반드시 한 뷰포트에 들어간다고 보장하지 않는다. 종목 행을 누르면 기존 일봉·매매조건 상세로 이동한다.

## 실제 설정·동작

- 국내는 KRX, 미국은 NAS/NYS/AMS의 공급자 등락률 순위 첫 페이지를 합산한다. **전일 대비 등락률**이며 기존 일부 일봉을 전시장 급등락 순위로 가장하지 않는다. 방향별10개 미만이면 실제 수만 표시하고 임의로 채우지 않는다. 종목/거래소/부호/유한 양수가격/거래량/중복/원천해시 확인, 표시 필드만 전달. 최대10분 캐시·수신시각·미제공 호가시각/실시간 보장 없음 표시. 숫자 줄바꿈을 막고 작은 화면의 정확한 가격은 접근성 이름·상세에서도 확인 가능.
- 읽기 전용 원천은 [KIS 국내 등락률 순위](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/fluctuation)와 [해외 상승률/하락률](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock/updown_rate)다. 기존 Mac mini 루프백 게이트웨이의 한정된2개 순위 작업만 추가했다. 계좌/주문/금융키/사용자 보유는 전달하지 않으며 기존120회/시간 제한·간격을 공유한다. 두 시장 갱신은 병합·직렬화하고 실패/오래된 자료는 현재 순위 또는 알림으로 처리하지 않는다.
- **Android 시장 알림 켜짐**, 기본 상승+5%/하락-5%,1~30%와 방향 설정 가능. POST_NOTIFICATIONS 실제 OS허용 후 JobScheduler264 예약. 화면 OFF 상태에서 OS작업을 강제 시험 실행하여 실제 KSTOCK264 알림 게시를 확인했다. AOD Dozing을 단순 Asleep 검사만으로 판단한 최초 검사는 false였으나 기본 물리 디스플레이 OFF와 알림 게시를 별도로 재확인했다. 이는 **자연 예약시각/절전 지연을 입증한 검사가 아니다**. 일반실행 복원 후 작업waiting 확인.
- **iPhone 시장 알림 켜짐**, 사용자가 직접 OS권한 허용 완료를 회신했다. 기기에서 authorization2/threshold5/enabled true/scheduled true/state CHECKED를 회수했다. 실제 인증 순위 조회 성공이며, 자연 백그라운드 실행/화면 잠김 상태의 실제 도착 시각은 미확인이다. BGAppRefreshTask를 사용한다. [Apple의 earliestBeginDate 설명](https://developer.apple.com/documentation/backgroundtasks/bgtaskrequest/earliestbegindate)처럼 요청 시각의 실행을 보장하지 않는다. [Android 백그라운드 작업 정책](https://developer.android.com/develop/background-work/background-tasks)에도 OS 실행 제한이 있다.
- 이 기능은 **시장 TOP10 급등락 기준 로컬 OS알림**이다. 기존 관심·직접입력보유의 전략조건 화면알림과 구분한다. APNs/FCM·서버푸시/웹브라우저 백그라운드 알림을 제공한다고 표시하지 않는다. 최소15분 예약 요청, OS절전/강제종료/연결에 따라 지연 또는 미실행 가능. 같은 종목·방향1시간 중복 방지,최대40개 기록,끄기·기록삭제 제공. 시간 경과 정리는 다음 조회 때 수행하도록 구현했다. 이 보존/삭제 전체의 장기 실기기 검증까지 완료했다는 뜻은 아니다.
- iOS가 잠긴 동안 인증 조회할 수 있도록 **사용자가 켤 때만** 별도 기기 전용 AfterFirstUnlockThisDeviceOnly Keychain 사본을 저장한다. 기존 인증의 WhenUnlockedThisDeviceOnly 보호 유지. 끄기·인증삭제 시 예약/사본/중복기록 제거,인증 갱신 시 활성화된 사본만 갱신. Android는 기존 Keystore암호화 인증 사용. 알림 본문은 종목 수 요약이며 보유금액/인증값 없음. 새 장치등록/서버푸시토큰 저장·외부알림업체 없음. 개인정보/출시 데이터 목록·기획7-4와 실제 흐름을 일치시켰으며 최종 스토어/보유기간 검증Gate는 유지한다.

## 수정 중 발견한 경계와 검증

처음 운영 실기기 검사에서 순위 갱신과 일봉 조회가 겹치면 24시간 이내의 유효한 저장자료까지 UNAVAILABLE로 내려가 holding context 검사에 실패했다. 실패영수증 android-initial-physical.json을 보존했다. cooldown에서는 검증된 저장자료만 STORED_OBSERVATION으로 제공하되 최근세션/기업행동·가격 급변 차단은 우회하지 않도록 수정했고 회귀 및 물리검사를 재통과했다. 재생·추천HOLD/실주문OFF 유지. 백그라운드 첫 조회가 오래된 캐시만 반복해서 받지 않도록 ALL시장 갱신 후 제한된 재확인 루프를 추가했다. 갱신 중 들어온 가격의 시각을 작업 시작시각으로 잘못 제외하지 않도록 현재시각 기준으로 수정했다.

검증 자료는 data/v2/verification/market-movers-release 아래(별도 표기 제외)다.

| 범위 | 실제 결과 |
| --- | --- |
| 전체 오프라인 / Android 통신계약 | **997 / 4 PASS** (/tmp/kstock-movers-final-offline.log, android-contract.log) |
| 순위 전용 테스트 |5 PASS. 공급자 파라미터 고정/범위 거부·원문 필드 제거·부호/거래소·병합/캐시·실패백오프·ALL시장 분리 |
| 실제 제한 공급자 조회 | 국내2방향·미국NAS2방향 성공, 이후3거래소 합산 각10개 확인. market-movers-provider-smoke.json / market-movers-aggregate-smoke.json |
| 새 화면 브라우저 | **18 PASS** (movers-ui/report.json),320/390/1440에서20행·미국통화·인증오류 초기화·넘침·런타임. 합성 API를 명시 사용 |
| 기존 매매 브라우저 흐름 | **33 PASS**,trading-ui/workflow.json. 실제시세 검증과 구분 |
| 최종 반응형·테마·접근성 | **21 PASS**,workspace-movers-final/report.json |
| 최종 운영 후보 격리/전환 후 | **37 / 21 PASS**,compact-isolated.json / compact-activation.json |
| 최종 실제 운영 순위 | **국내10+10 / 미국10+10 PASS**,compact-live.json. 수신2026-10-20T10:33~34Z,providerQuoteTime null 명시 |
| 실기기 기반 흐름 | **Android23 / iPhone28 PASS**,final-android-physical.json / final-ios-physical.json. cooldown수정후 통과,이후 화면 밀도 수정은 별도 아래검사 |
| 최종 Android 실제 순위 화면 | **3 PASS**,android-movers-ui.json. 국내20·미국20·넘침없음. 캡처 android-market-movers.png는 이전저장자료 표시가 있는 갱신중 장면이며 최신호가 증명이 아님 |
| 화면 OFF Android 알림 게시 | **PASS**,android-screen-off-result.json. 기본물리패널OFF·ID264게시,강제시험범위 명시. android-restored-job-state.json은 일반실행후waiting |
| iOS권한·예약·실제 인증조회 | **확인**,ios-final-alert-state.json. 자연 잠금화면 도착까지 확인했다고 하지 않음 |
| iOS빌드 | 기존프로필 HTTPS기기 및 일반시뮬레이터 빌드·서명 검증 성공. 알림탭은 고정 급등락 화면으로 연결 |
| 공개HTTPS·무인증차단 | PASS,public.json;기존 /api 인증유지 |

## 배포와 보존

최종 서버 후보 **review-b7fc9a7e5155d5ac**,소스303da74,181파일,archive SHA256 aac2627fa41015cd5116b830675b956a460e8a84685e02f7e1ca644334af46cc. 최종전 후보74bfee 및e893의 검증·수정 이력도 보존. 기존 환경/사용자데이터/복원 경로 유지. 제품/네이티브/화면 코드 모두 origin/auto/kstock-development-20260930 푸시. Android2.7.0(270)/iOS0.1.6(7) 동일ID·기존서명 업데이트,삭제/초기화 없음. 양기기 일반실행으로 복원하고 Android디버그forward제거. 사용자 허용 설정을 유지했으며 기존사용자/에이전트 backend문서·continuous문서·tests/diff 변경은 커밋에서 제외했다.

금융자료 독립대사·전수검증·장기전략실증·재배포권리·스토어출시 Gate는 미완료이며 이번 알림 설정/기능구현 완료와 구분한다.

---

# 후속6항목 개발·운영·실기기 확인 — 2026-10-20 KST

사용자6번까지 진행 승인에 따라 아래 기능을 구현·푸시·운영 반영했다. 기능 코드와 실제 금융 검증/장기 관측/플랫폼 푸시 범위를 구분하며, 모든 시장 검증이 끝났다는 의미가 아니다.

| 요청 | 이번 실제 반영 | 남은 범위 |
| --- | --- | --- |
| 1 거래일·기업행동 | 미국2026 예정 휴장/조기종료, 국내2026-10 공지 범위 대조. 휴장일 가격/예정일 누락/미완료 일봉/전일 종가대비 시가30% 이상 단절 시 조건·재생 보류. 알려진 긴 휴장과 조기종료·DST 경계 처리 | 국내 다른 달, 비상휴장·종목별 거래정지, 분할·배당의 독립 대사 미완료. corporateActions=NOT_INDEPENDENTLY_RECONCILED, independentVerification=false |
| 2 매매 판단 카드 | 종가/고가돌파/평균/거래량 조건별 충족 여부, 검토기간, 다음 시가 범위 이탈·자료 만료 무효화, 갭·유동성·원천 검토 표시 | 실증된 추천 아님; 기존HOLD 유지 |
| 3 보유 위험 관리 | 평균가/현재가에서 손절 기준까지 금액, 같은통화 총자산 대비 비중, 손실예산·투자한도로 제한한 정수 신규 수량. 신규 진입은 최신 기준종가 사용 | 비용·환율·갭·실제 체결 미반영, 손실 상한 보장 아님 |
| 4 실적·공시 일정 | 삼성전자/Microsoft 고정 공식IR2곳 하루1회 조회·해시·수신시각·시간정밀도 보존. 기존 공시와 별도 표시.7일 경과 숨김, 시각 명시 일정은 시각 경과 후 예정목록 제외 | 전체 발행사 아님. 미연결·파싱실패는 일정 없음으로 확정하지 않음 |
| 5 전략 평가 | 100일봉에서40일 준비 후 앞 기간/마지막20일 분리 비교, 비용·동일종목 보유 비교. 경계포지션 이월/최적화 없음. 비용 외 필드가 원천 bars/평가창을 덮어쓰지 못하도록 차단 | 이미 본 과거자료이며 독립 미관측 검증 아님. 공식 지수·기업행동·생존편향·긴 평가기간 실증 미완료. promotionStatus=HOLD |
| 6 조건 알림 | 명시 시작/중지/기록삭제. 화면 활성 중3분마다 최대3종목 관심·보유 순환, 조건 변화·자료 부족 알림, 동일 상태·가격일1시간 중복 방지, 메모리20개 제한 | 앱 종료/숨김 중 백그라운드 푸시·OS알림은 미구현. 푸시 토큰/새 외부 사업자 없음 |

달력은 [NYSE 예정 일정](https://www.nyse.com/trade/hours-calendars), [Nasdaq2026 일정](https://www.nasdaqtrader.com/Trader.aspx?id=Calendar), [KRX10월 휴장 공지](https://trn.krx.co.kr/index.jsp)의 확인 범위에 한정한다. 예정 일정 대조가 비상휴장·개별 거래정지 확인을 대신하지 않는다. 실제 수집한 [삼성전자IR 일정](https://www.samsung.com/global/ir/ir-events-presentations/events/)과 [MicrosoftIR](https://www.microsoft.com/en-us/investor/default)은 공개 페이지에서 명시된 날짜만 추출했으며 미래 분기를 추정하지 않았다. 삼성전자10월29일10시KST, Microsoft10월28일(시각 미확인) 공지를 운영 API에서 확인했다.

## 배포·운영

- 최종 제품 커밋 f9c2d4a (선행1ba55b1 포함), origin/auto/kstock-development-20260930 푸시. 활성 후보 review-9c463470ec0bc5b2,178파일, archive SHA256 44833e5b138452938fe06f8ca24a67fc294bc440641053611b9f5f52ddf651b4. 직전 review-8f6eeb772c7b07da도 검증/활성 이력 보존. 기존 환경·데이터·복원 경로 유지, 금융 키의 서버 복사/주문 활성화 없음.
- 앞선 SSH신규접속 실패는 이번 재검사에서 접속 성공·서비스active·운영18880루프백 확인. 시세 연결 스크립트에 초기접속10초/1회 제한 추가 후 전용LaunchAgent 재실행, 기존 재접속과 함께 적용. 실제 원격게이트웨이health 및 운영API PASS. 일시 거부 원인을 단정하거나 영구 연결 보장을 하지 않는다.
- 갱신한 시간별 runner 실제 실행:20261020094626581-trading-result.json. 시세는 HOURLY_BUDGET로 SKIPPED(추가 수집 성공이라고 하지 않음), 일정 확인 실행, 공개44파일 동기화·보고전달 성공, deliveryAttempts1. 동기화 실패상위BLOCKED와 브리지전달 최대3회 재시도 유지. 구체 업무지시도 기존 ARI_TO_JINI 브리지로 전달 성공(worker-order-delivery.json).
- 총자산·손실예산·투자한도는 화면 메모리 계산이며 전송/저장 없음. 알림은 기존 인증 계산API만 사용하고 알림기록은 메모리. 보유 저장 선택/삭제 및 인증 격리는 유지. 개인정보·기획7-3·맥미니 작업지시를 실제 흐름에 맞췄다.

## 검증 근거

증거 기본위치는 data/v2/verification/이며 금융값·인증값을 로그에 출력하지 않았다.

| 검사 | 실제 결과 |
| --- | --- |
| 최종 전체 오프라인 회귀 | 991 PASS / 0 FAIL; /tmp/kstock-six-final-offline.log |
| 새 거래일·일정·위험·알림·기간/입력방어 테스트 | trading_six.test.js12개 포함. 동종 전용 테스트 초기실패는 부동소수 허용오차/복수 차단사유 순서에 맞춰 수정 후 통과 |
| Python 공개스냅샷 | 4 PASS. 일정의 임의 필드·호스트·발행사 거부, 신규 checkedAt/백업 처리 포함 |
| 실제 브라우저 기능 흐름 | 33 PASS, trading-ui/workflow.json. 합성 API + 실제 로컬 JSON 계약; 위험 계산/저장 안함/예정 일정/알림 시작·중지·삭제 포함 |
| 반응형·테마·접근성 | 33 PASS, workspace-six/report.json;320/390/1440×5화면×라이트다크 및 확대. 최종 두 로직 수정 전 동일 레이아웃 검사 |
| 최종 후보 격리·운영 전환 후 | 36 / 20 PASS, trading-six/final-isolated.json / final-activation.json |
| 운영 실제자료 확인 | 7 PASS, trading-six/final-live.json. 삼성전자/MSFT 일정·명시 검증상태·분리평가·비용입력 방어·게이트웨이health |
| 최종 운영 Android | 23 PASS, trading-six/final-android-physical.json |
| Android 새 화면 | 5 PASS, trading-six/android-new-ui.json. 실제 달력 상태·위험 계산·공식 일정·알림 범위·넘침. 사용자 저장값 변경 없음 |
| 최종 운영 iPhone | 28 PASS, trading-six/final-ios-physical.json; 인증과 분리한Keychain 계약 포함. 새 위험/알림 입력의 iPhone 별도 물리조작은 미실행이며 브라우저 검사와 구분 |
| 공개 HTTPS·새자산·무인증401 | PASS, trading-six/final-public.json |

양기기는 최종 전환 이후 checkedAt을 검증했고 테스트 합성 모의기록을 정리한 뒤 일반 실행으로 복원했다. Android디버그forward 제거. 기존 사용자/에이전트의 backend 보고서 변경·continuous 보고서·tests/diff는 보존하고 이번 커밋에서 제외했다. secrets 패턴은 패키저 검사 통과, diff check PASS.

전체 전수 금융 검증·독립 기업행동/거래일 대사·실제 미관측 장기 성과·공식지수 비교·공급자 재배포 권한·스토어 출시 Gate는 미완료다. 추천HOLD / RULE_SIMULATION / 실주문OFF를 유지한다.

---

# 과거 재생 비교·거래량 검증 및 시간별 보고 보강 — 2026-10-20 KST

- 동일 종목 단순 보유 비교를 과거 모의 재생 API/화면에 추가했다. 전략과 동일한 평가기간(40일 준비구간 이후)·편도 수수료·매도세금·편도 슬리피지 가정을 적용하며 차이는 퍼센트포인트로 표시한다. 공식 지수/배당 포함 성과/별도 기간 검증이 아니다. 준비 일봉 수·평가 일봉 수와 독립 검증 false를 API에 명시했다.
- 거래량0 일봉이 있으면 과거 체결을 가정하지 않고 ZERO_VOLUME_EXECUTION_UNCONFIRMED로 전체 재생을 보류한다. 초기·진입일·마지막일 거래량0과 비용/기간/차이 계산 테스트를 추가했다.
- 시간별 수집이 SKIPPED여도 공개자료 동기화 실패를 상위 BLOCKED로 표시하도록 수정했다. 실제 상태 OBSERVATIONS_SAVED/SKIPPED/PARTIAL만 허용한다. 수집·동기화 성공과 보고 전달 성공은 분리한다.
- 전체 오프라인979 PASS, 브라우저28 PASS(합성 API+로컬 실제 JSON 계약), 계산/보고정책13 PASS. 브라우저 첫 실행은 sandbox 바인딩 제한으로 실패하여 허용 실행에서 통과했다. 운영후 실제 Android 인증 HTTPS에서 삼성전자·Apple 각각60평가일봉의 동일기간 비교 계산 PASS. 검증 스크립트 최초 호출 인자 오류(GET 사용)를 수정한 후 POST 검사 통과; 제품 API 결함으로 확인된 것은 아니다. 기존 Android 운영 흐름23 PASS, 합성 기록 정리·일반실행 복원·디버그forward 제거. 이번 변경의 iPhone 물리 재검사는 미실행, 직전 버전28 PASS 기록과 구분한다.
- 코드9f1dbac2ab20c851aefc3d8213d33002132052e1 푸시. 후보review-27d20cece836c244, archive SHA256 73733480203662aad9eb4dce5f42270e64a9f0353a01104883420235becbdbe3. 격리35/전환19 PASS, active·환경/데이터 보존. 증거 data/v2/verification/replay-reference-{isolated,activation,live}.json 및 trading-ui/workflow.json.
- 맥미니 이번 주기 실제25종목 조회 성공, 누적고유시도42(전수9081완료 아님), 공개43파일 동기화 성공. 20261020091934915-trading-result.json의 최초 브리지전달 FAILED는 보존하고 재전달 성공을 replay-hourly-redelivery.json에 별도 기록했다. 앞선 실패 동기화도 재시도26파일 성공(최신 trading-sync 영수증). 자동 생성 문서의 주장만으로 구현 완료를 판단하지 않았다.
- 전환 직후 추가 SSH 연결이 Connection refused로 실패했으나 공개HTTPS health200 및 Android 인증API는 정상. 추가 서버명령 대신 기기의 승인된 인증통로로 검증했다. SSH 신규 연결 원인은 미확정이며 서버 접근 경로의 별도 운영 점검 항목으로 남긴다. 기존 공개 서비스/사용자 자료를 변경하지 않았다.

기존 미완료 시장 전수·거래일/기업행동 독립 대조·전략 실증·재배포 권리·스토어 Gate는 그대로 유지한다. 추천HOLD/실주문OFF.

---

# 수일~수주 매매 정보 개발·최종 운영 검증 — 2026-10-20 KST

사용자 전체 진행 승인에 따라 기획 순서의 구현 가능한 개발·테스트·운영 반영을 수행했다. 커밋 `154a962f1bbcad8c45b7e38ddee2849dc866b6f1`을 origin/auto/kstock-development-20260930에 푸시하고, 175파일 후보 `review-f0a6ea71a74082d7`을 활성화했다. 배포 archive SHA256 `d1a9cf530b6389a229d847d065037fe4017c2f859bba4ee01ad0fc5f782aaa60`. 운영 서비스 active, 기존 환경파일·사용자 데이터 보존. 이전 후보와 복원 경로 유지.

- 실제 국내·미국 일봉, 종목 검색, 오늘 화면, 관심 종목, 사용자 입력 보유 종목, 조건 충족/대기·진입/손절/목표 계산과 비용 입력 과거 재현을 웹·기기 앱에 연결했다. 일봉 기준 RULE_SIMULATION이며 추천 승인 HOLD, 실주문 OFF. ATR 기준 가격은 가치평가/수익 보장/실제 주문이 아니다.
- 초기 저장 목록 밖 IBM(NYS)·LG화학(051910)을 **운영 인증 API**로 조회하여 각각100일봉 OBSERVED 확인. 미국 기준일2026-10-19, 국내2026-10-20. 시세 필드만 Mac의 로컬 게이트웨이/SSH 루프백으로 전달하며 운영 서버에 금융 키를 복사하지 않았다. 보유 원문·계좌·주문을 통로로 전달하지 않는다.
- Mac 시간별 작업은 공식 master 갱신·제한된25종목 순환·검증된 공개 스냅샷 동기화·보고 기록을 수행한다. master 국내2856/미국6225 증권은 **검색 목록 규모**이며, 전수 시세·기업·수익성 검증 완료 수가 아니다. Mac 종료/로그아웃/연결 단절 때 신규 조회는 보장하지 않으며 저장시각과 자료 부족을 표시한다.
- 보유 정보는 기본 메모리, 명시적 동의 시 기기에 저장·삭제 가능. iPhone은 인증과 분리한 기기 전용 Keychain, 웹/Android는 고지된 로컬 저장. 서버에는 계산 요청 중만 처리하고 보유 원문을 저장·AI 전달하지 않는다.

| 실제 검증 | 결과·증거 (data/v2/verification 아래, 개인정보 없는 로컬 기록) |
| --- | --- |
| 전체 회귀 / Android 계약 | 976 / 4 PASS, master-qa/master-qa-20261020084539684.json |
| 반응형·테마·글자확대 | 33 PASS, workspace-trading-final-viewport/report.json |
| 브라우저 사용자 흐름 | 27 PASS, trading-ui/workflow.json (합성 API와 별도 실제 로컬 JSON 계약, 물리 기기 검사와 구분) |
| master / snapshot Python | 3 / 3 PASS |
| 운영 후보 격리 / 전환 후 | 35 / 19 PASS, trading-final-stage.json / trading-final-activation.json |
| 최종 운영의 외부 목록 조회 | 2종목100일봉 PASS, trading-final-demand.json |
| Galaxy A33 기존 앱 | 23 PASS, trading-final-android-physical.json |
| iPhone15 기존 앱 | 28 PASS, trading-final-ios-physical.json; Keychain 저장/삭제·금지 키 검사 포함 |
| 공개 HTTPS·무인증 차단 | PASS, trading-final-public-https.json |

실기기는 최종 운영 코드에서 재검사했으며 임시 합성 사용자 기록을 삭제하고 일반 실행으로 복원했다. Android 디버그 전달을 제거했다. 기존 사용자 기록은 보존했다. 앞선 물리검사 실패와 안전 복원은 아래 기록·실패 증거에 보존하며 테스트 통과로 덮어쓰지 않았다.

남은 출시·검증 조건: 전체 종목 가격/기업행동·거래일 독립 대조, 미래 실적발표 일정 연결, 별도 기간/표본의 전략 성과 및 생존편향·유동성 검증, 공급자 재배포 권한/법적 사실·스토어 공개 심사, 전체 VoiceOver/TalkBack 수동 점검. 이 항목들은 미완료이며 전체 증권 검증·수익성 검증·스토어 출시 완료로 표시하지 않는다. 구현과 승인된 운영 적용은 완료, 시장 검증은 계속 진행한다.

---

# 미캐시 종목 즉시 조회를 위한 시세 필드 전용 통로 — 2026-10-20 KST

- 운영 서버에는 KIS 키를 옮기지 않았다. 초기 스냅샷 외 종목도 조회하기 위해 Mac mini 로컬127.0.0.1:18880 게이트웨이와 기존 SSH의 운영127.0.0.1:18880 역방향 연결을 구현·등록했다. 실제 ss 확인으로0.0.0.0/공개바인딩 없음. 새 외부 계정/공개 API/계좌·주문 경로 없음.
- 허용: 국내/미국 일봉GET2종류, 한정된 날짜범위·종목/거래소, 숫자형 공개 일봉 필드/정확한US응답식별자. 공급자메시지/헤더/키/사용자 보유/사이트인증은 전달하지 않음. 원문 해시는 게이트웨이에서 계산. 직렬2초 및120/시간 제한·오류백오프·연결실패시 저장자료 fallback/최신세션 미확인 보류.
- 신규 com.ari.kstock-market-gateway는 이 좁은 연결만 담당하며 기존 시간별 배치와 역할이 다르다. 기존 시간별 작업은 공유 게이트웨이로 토큰/요청 정책 일원화. 로컬·원격health 및 캐시 밖NYSE IBM100일봉 실제 제한 조회PASS. /etc 환경파일 및 키 미변경,95-market-read-gateway.conf에 읽기 플래그만 준비. 당시 서비스재시작 미실행. market-gateway/loopback-setup.json 및 remote-demand-smoke.json.
- 게이트웨이 필드/범위·주문거부·속도제한·고정루프백 회귀4개와 서버무키/보유비전달1개 추가. 전체976회귀/Android계약4 PASS(최신master-qa 참조). 실제 운영 기능 활성화·후속 물리검증은 다음 기록을 따른다. 맥미니 종료/로그아웃/네트워크 단절 중 새 시세 제공은 보장하지 않는다.

---

# 물리기기 통합 결함 발견·안전 복원 및 수정 — 2026-10-20 KST

- review-83f6a83b92be435c는 격리35/전환후19검사 통과했지만 물리검사에서 Android 신규경로403 및 iPhone 계산POST400 발견. 완료 처리하지 않고 실제 실패영수증(trading-android-physical-initial-failure-20261020.json 및 iOS동명)을 보존했다. 이전 review-ccc0cc13d582097f로 명시적 안전복원, 서비스active/환경보존 확인. trading-physical-failure-safe-restore-20261020.json.
- 원인: candidateRequest의 JSON Content-Type 누락 및 기존 공시함수에 잘못 들어간 options 참조, Android ApiClient의 trading 이름 전체차단. JSON헤더를 계산요청에만 연결하고 기존조회 참조 제거. Android는 정확한GET3개/POST2개만 허용하며 주문·하위경로·틀린메서드·유사경로 차단 유지.
- 단위 회귀2개 추가, Java 실제 Transport 계약에 정확한정보경로·거래차단 검증 추가. 브라우저 fixture도 실제 요청 Content-Type을 확인하도록 수정하고 실제Express JSON 양성/음성 계약 검사 추가. 수정 후 재빌드·재전환·양기기 결과는 후속기록.

---

# iPhone 선택 저장의 실제 데이터 흐름 보강 — 2026-10-20 KST

- 출시 전 기기 검토에서 iPhone HTTPS 앱의 nonPersistent WebView에는 localStorage 선택 저장이 앱 종료 후 유지되지 않는 점 확인. WebView 임시 모드는 유지하고 인증과 별도 서비스의 기기전용 Keychain 저장 브리지로 관심/선택 보유만 연결했다.
- fixed HTTPS origin/mainFrame/키2개/get-set-remove/허용필드/100개/50KB/유한 양수 검증. 인증키·임의 키·추가 필드 거부. WhenUnlockedThisDeviceOnly 사용, 실패 시 평문 웹 저장소 우회 없음. 웹·Android와 iPhone 저장 안내 및 개인정보 문서 일치.
- 동일 서명 iPhone 앱 재빌드 성공. 원격에 먼저 준비한 이전 후보는 활성화하지 않았으며 변경된 웹소스 커밋의 새 후보로 격리 검증·전환한다. 물리 Keychain roundtrip과 삭제/격리 검사는 후속 기록.

---

# 매매 정보 제품 구현 및 출시 후보 준비 — 2026-10-20 KST

- 기획1~10의 기능 구현: 오늘의 판단/국내·미국 검색/관심/직접입력보유/상세, 독립 일봉 조회 API·현재 확보 자료의 모의 조건 목록, 진입/손절/목표 시나리오, 비용 입력 과거 규칙 재생, 시간별 체크포인트 배치·공개 시장자료 동기화. 상품 전략 실증/전수 금융검증/최종 권리·법적 검토와 구현 완료를 구분한다. 제품 기획7-2절에 범위·산식·미완료 항목 기록.
- 실제 KIS 마스터6개에서 국내2,856/미국6,225 지원종목 검색 인덱스 생성. 상품구분/지원하지 않는 코드형식 등 제외8,292개와 원천해시 보존. 이는 공급자 스냅샷이며 회사수/거래소 기준일 미확정(null), 전수 검증 완료 아님. 국내 영문혼합6자리 코드도 누락 방지.
- 실제 일봉 최초25종목 조회 성공. 국내 주요4개는 장종료 후10월20일 일봉으로 추가 갱신. 미국은 마지막 완료일10월19일. source HTTP403 발생 초기 재실행은 원인 확인·간격 확보 후 조회 성공, 실패를 PASS로 덮어쓰지 않음. 데이터 부족/지연/마감 이후 전일 자료/휴장 불확실성은 조건 보류하며 기존 추천HOLD·실거래OFF 유지.
- 기존 시간별 Mac mini 경로는 실제 검증된 제한 읽기 스크립트 실행으로 전환. 하루1회 마스터, 최대25종목/시간 및 요청 간격·인증차단중지·종목별 체크포인트·죽은잠금복구. 공개 마스터/일봉만 스키마·해시 확인해 기존 운영 data에 동기화, 금융키·보유·환경·실행파일 동기화 없음. 최근500종목만 전송, 자동 생성 공개백업48개 보존/이상 파일 보존. 최초26파일 실제 동기화/시간별 보고 전달 확인.
- 최종969회귀/Android계약4 PASS, Python마스터3/스냅샷3 PASS. 실제Chrome 기능17 PASS(합성 API를 명시 주입한 UI 검사), 반응형33 PASS(320/390/1440×신규5화면×라이트다크30+기존모의글자확대3). source secret패턴0/diff check PASS. 실제 금융자료 조회 근거와 합성 UI 검사를 구분.
- 처음 브라우저 실행의 today id 충돌로 런타임 오류 발견→trading-today로 분리; 터치영역 source링크 오류→44px 영역 수정; 모바일 홈 과밀→선택종목 우선/긴 계산·차트·추가목록 접기. 수정 후 검사 통과. 기존iPhone 인증 주입 뒤 신규홈 자동 복구 이벤트 추가(토큰 값 전달 안함).
- Android2.6.9(269)/iOS0.1.5(6) 기존검증서명·ID 유지 빌드 성공. 실제기기 검사 스크립트와 번들 해시 일치 확인. 기기 설치·운영 전환·물리검사 완료는 후속기록으로 남긴다. 저장 보유는 명시적 기기 저장 선택과 해제/삭제 검증, 서버 보유 원문 저장·외부 AI 전송 없음.
- 초기 시세/마스터 영수증: trading-workspace-provider-smoke.json 및 trading-workspace-us-smoke.json, trading-kr-after-close-refresh.json, trading-workspace/cycle-state.json, trading-sync/*-receipt.json. UI: trading-ui/workflow.json 및 workspace-trading-compact/report.json. master-qa 최신 실행 기록 참조. 전수 대상 전체의 금융자료·시세 검증/향후 실적일정·별도기간 전략실증은 미완료로 유지한다.

---

# 재기획 기반 개발 실행 순서 — 2026-10-20 KST

- KSTOCK_AI_2.0_PRODUCT_PLAN.md의7-1절에10단계 개발 티켓·선행조건·산출물·완료기준·첫 작업 묶음을 추가했다. 확정된 수일~수주/일봉 기준이며1번 계약 정리부터 시작한다.
- 실제 데이터 연결/화면 fixture 병행, 정보 화면 중간 검토, 전략 명세/검증/보유 맥락 분리, 전수점검의 비차단 병행을 명시. 각 출시 범위는 해당 통합검증을 거친다.
- 이번은 개발 순서 문서화만 수행. 제품코드·운영 https://kstock.ai.kr·실거래·에이전트 권한 변경 없음. 새 단계 완료/새 테스트 실행을 주장하지 않는다.

---

# 우선 투자 기간 확정 — 2026-10-20 KST

- 사용자가 수일~수주 매매를 선택했다. 제품 기획서의 임시 기간을 확정 요구로 갱신했다. 일봉·종가 기반 진입/청산 조건을 우선 설계하며 당일매매는 MVP 범위 밖으로 유지한다. 문서 변경만 수행, 운영 대상 https://kstock.ai.kr/제품 코드 변경 없음.

---

# 제품 재기획: 실제 종목별 매매 판단 정보 — 2026-10-20 KST

- 사용자 요청에 따라 KSTOCK_AI_2.0_PRODUCT_PLAN.md를 재작성. 기존 연구 중심 원문은 문서 끝에 보존하고 새로운 요구를 우선한다. 홈은 오늘의 판단/관심/보유/검색/더보기, 국내·미국 분리, 가격시각·진입/청산 조건·반대 근거를 중심으로 설계했다.
- P0 실제 시세·종목정보 → P1 명시된 모의전략 → P2 보유 매도조건 → P3 범위확대/실증 순서. 전체 전수검증 완료를 모든 정보 제공의 선행조건으로 두지 않으며 기존 게이트를 몰래 완화하지 않는다. 투자 기간은 사용자 응답 전 수일~수주/일봉 임시 가정.
- 코드 확인: 현재 paper-decision-v1/calibration NOT_ESTABLISHED 및 targetPrice null을 기획과 구분. 기존8일 가격허용과 D-2 연구시점은 새 매매전략의 최신성 정의로 그대로 재사용하지 않도록 구현 요구 기록.
- 이번은 문서 기획 작업이며 제품코드·전략·실거래·운영서버·Mac mini 실행기 변경 없음. 회귀/실제기기/새 공식 수집은 이번 작업 NOT RUN; 이전952검사를 이번 기획 검증으로 재사용하지 않는다. 공급자·권리·실제시세경로·전략실증은 미확정 항목으로 유지.

---

# Mac mini 지속 업무 프롬프트·시간별 실행 보강 — 2026-10-20 KST

- 사용자 요청으로 KSTOCK_MACMINI_CONTINUOUS_PROMPT.md 작성·전문 전달. 실행복구 → 공식 읽기/저장 경로 → 전수 대상/배치 큐 → 종목별 검증 → 독립 최종 검토를 명시. 기존 단일 Gate1 종료 지시는 대체했다.
- 기존 com.ari.jini-kstock-auto 3600초 주기 재사용. 단일 EVIDENCE_RECORDED로 전체 프로그램이 멈추던 동작 제거, 미완료 단계 계속. 최근2회 이상 BLOCKED면 REPAIR_EXECUTION 모드. 긴 전체 프롬프트와 별개로 이후 실행 요청은 현재 Gate만 추출하여 로컬 모델 작업 범위를 제한한다.
- 진행 집계는 에이전트 보고/독립미검증으로 구분. 미확정 종목수 null 유지, 오래됨/미래/음수/비정수/상태별 합계 불일치/임의 COMPLETE 상태 거부. 전체 점검·미해결0을 자체 보고한 경우도 최종독립검토대기이며 자동완료로 표시하지 않는다. 실행중 중복 요청 방지 및 시간별 보고는 유지한다.
- 새 전달 영수증 macmini-continuous-dispatch.json. 1시간 설정·첫 보고 전달 DELIVERED 확인, job7f39e9d9-b965-4325-8880-af05dbed87a8 실행 시작/RUNNING 확인. 실행복구 성공·전수자료 확보 완료를 뜻하지 않는다.
- 정책/분기 회귀6개 및 전체952 PASS/FAIL0/SKIP0. 외부 수집 tool지원 부족은 실제 미해결이며 새 유료·대량 호출·인증우회·정책변경을 허용하지 않음. Mac종료/로그아웃/잠자기 중 정시 실행 보장 없음. 이번 변경은 로컬 Mac mini 자동화와 지시서이며 운영 웹·앱 서버 변경 없음.

---

# 마무리: 커밋·운영 반영 및 실제 기기 확인 — 2026-10-20 KST

- 제품 ec6ab6fad4c16da6b74476bd4399e9725a0d12e7 커밋·작업 브랜치 push 완료. 커밋 일치169파일 후보 review-ccc0cc13d582097f, archive SHA256 8f4751db5efcd05f63ac7fe09ad19058e04b805eda8a91c77304f7bca6e2e74a.
- 최초 root 격리 설치 때문에 0600 후보 파일을 서비스 사용자 ubuntu가 읽지 못해 시작 실패(EACCES), 자동 롤백 실행. 기존 서비스active/환경·데이터 보존. 실패를 완료로 처리하지 않고 finalize-activation-20261020.json에 보존했다.
- 새 후보의 소유권만 ubuntu로 수정(심볼릭 링크 대상 데이터 소유권 변경 없음), 실제 ubuntu 사용자로 격리27검사 재통과. 전환 스크립트에 서비스 사용자 읽기권한 사전검사와 동일 데이터 링크 재시도 검증 추가. 재전환 후13검사 PASS/서비스active/환경보존. finalize-runtime-service-user-20261020.json 및 finalize-activation-retry-20261020.json. 두 번째 시도 롤백 없음.
- 공개HTTPS 신규홈·JS·작업보고 및 익명API401 PASS: finalize-public-https-20261020.json.
- 실제 Galaxy A33 운영인증·저장연구·합성모의기록16 PASS; 홈 통계/추천보류링크/보고일치/가로넘침 추가5 PASS. 실제 iPhone15 운영 흐름17 PASS. finalize-android-physical/home-20261020.json, finalize-ios-physical-20261020.json. 기존 앱·서명·인증 그대로 사용, 앱 재설치 없음. 합성기록정리 확인 후 Android디버깅포워드 제거·양기기 QA플래그 없는 일반실행 복귀.
- 전체946/Android계약4 및 브라우저27 최종PASS는 이전 후보검증 기록 참조. 이번 제품변경 이후 추가 변경은 전환 도구·기록뿐. 운영 원천자료 확보·국내전수검증·맥미니 실행복구·정식스토어출시는 미완료. 서버 작업보고는 서버에 게시된 자료이며 로컬 JINI 시간별 결과 자동 동기화 아님. 추천HOLD/실거래OFF 유지.
- 에이전트 생성 tests/diff 예제2개는 사용자 작업 보존을 위해 삭제하지 않았으며 제품 커밋·배포에서 제외했다.

---

# 미반영 변경 출시 후보 검증 — 2026-10-20 KST

- 기존 사용자·에이전트 변경 보존. 에이전트 tests/diff 예제는 제품에서 제외하고 로컬 보존. 덮어써졌던 이전 에이전트 보고 원문도 현재 검토와 구분해 복원 보존했다.
- 최종 전체946/Android계약4 PASS/FAIL0/SKIP0: master-qa-20261020054844380.json. Chrome320/390/1440 × 홈/판단/검증운영/모의기록 라이트·다크24개 및 모의기록 글자확대3개 총27 PASS/가로넘침0/axe위반0/런타임오류0: workspace-finalize/report.json. 코드/문서 secret패턴0 및 diff검사 PASS.
- 이 시점의 결과는 로컬 후보검증이며 운영 반영·기기 확인 결과는 후속 기록한다. 추천HOLD/실거래OFF/신규공식수집미실행 유지. Mac mini 실행 복구는 별도 미완료 업무이며 업무 지시서와 실패 근거를 제품 검증 성공과 구분한다.

---

# 국내주식 Mac mini 상세 지시 및 결과 회수 — 2026-10-20 KST

- KSTOCK_MACMINI_KR_ORDER.md 작성·전문 전달·실제 실행. 기존 시간별 작업 지시도 국내주식으로 갱신. job f4b26740-955f-448c-ad8a-230edc5138a1 최종 BLOCKED/ok=false, writes=[]로 코드 미구현. 상세 회수 검토는 KSTOCK_MACMINI_KR_REPORT.md.
- 에이전트 기존 전체946 PASS/0 FAIL/0 SKIP 기록과 별개로 신규 요청 코드를 수정하지 않음. 허용되지 않은 task/commit/push 시도는 실행기에서 차단. Codex 독립 국내 관련 기존30테스트 PASS/0 FAIL/0 SKIP. 실제 원천 검증·SK1014주·DB9건·peer 표본 해결을 뜻하지 않는다. 신규 외부수집 NOT_RUN/추천HOLD/운영변경없음.

---

# 가격·주식수 관측값 입력 검증 — 2026-10-20 KST

- Mac mini 작업은 BLOCKED로 종료했으며 제품 코드 수정 없음. 테스트 실행 기록만으로 구현 완료 처리하지 않음. 기존 에이전트 생성 파일 보존 후 Codex가 구체 작업을 직접 마무리했다.
- research_readiness에서 문자열·무한대 등이 PENDING으로 잘못 표시되는 문제 수정. 유한 양수 number만 관측값으로 유지, 비정상·0·음수는 INSUFFICIENT_DATA/observedValue null. 정상 관측값도 PENDING이며 추천 HOLD 유지. 출처·기준일과 입력 객체 보존.
- 신규 경계값/정상값 회귀4개 포함 대상9 PASS, 최종 전체946 PASS/FAIL0/SKIP0. readiness-positive-observations-20261020.json에 실제 명령·파일 해시·종료코드 기록. 운영 대상은 기존 https://kstock.ai.kr / review-b543c85fff215010이며 이번 운영 반영·물리기기 재검증은 NOT RUN.

---

# 홈 연구·추천 구분 및 작업 보고 노출 — 2026-10-20 KST

- 추가 터널 없이 기존 HTTPS 웹·앱 공통 화면 개발. 운영 대상 https://kstock.ai.kr / 마지막 운영 후보 review-b543c85fff215010 확인; 이번 변경은 로컬 검증이며 배포·재시작하지 않았다.
- 홈 통계명을 연구 대상 기업 / 검증 통과 추천 / 추천 보류 기업으로 구분하고 매수·매도 판단·보류 사유 화면 링크 추가. 종목 수와 추천 승인 수를 혼동하지 않도록 한다.
- 기존 인증된 작업 보고 API 결과를 홈에도 표시. 홈 복귀·앱 전경 복귀 시 재조회하며 오래된 보고, 인증 실패, 조회 실패도 함께 갱신한다. 표시 대상은 서버에 게시된 보고이며 로컬 JINI 최신 작업·시간별 보고가 자동으로 운영에 동기화된다는 뜻이 아니다. 새 수집·검증 완료·추천 승인으로 해석하지 않는다.
- 실제 회귀 node scripts/test-offline.js: 942 PASS / FAIL 0 / SKIP 0. 최초 실행은 기존 화면 문구 assertion 1개 실패; 새 통계 세 항목 및 값 검증으로 갱신한 뒤 전체 재실행 통과.
- Chrome 반응형 검사: 320/390/1440 각 라이트·다크 홈 6개와 기존 모의 기록 글자 확대 3개, 총 9 PASS / 가로 넘침 0 / axe 위반 0 / 런타임 오류 0. data/v2/verification/workspace-home-progress/report.json. 물리 기기 재검증·이번 운영 반영은 NOT RUN.
- Mac mini 작업 b22a7f12-ef0b-4c22-a3ef-ff757deb513f는 확인 시 RUNNING. 에이전트가 생성한 보고서·tests/diff는 보존했으며 요청한 제품 코드 수정·테스트 완료 근거로 인정하지 않았다. 동시 작업 충돌을 피하려고 해당 백엔드 파일은 수정하지 않았다.

---

# 5번 디자인 최종 운영·실제 기기 확인 — 2026-10-20 KST

- 최종 제품 커밋6a5473c/후보review-b543c85fff215010(169파일, SHA be6702fdea1594d42d3b796ef0bd0792d802749fc379424d245fd0db8d4346b5)로 운영 반영. 원격27검증 및 전환후13검증/공개HTTPS PASS. 환경파일/current/data/기존인증 보존, 이전unit백업, 롤백미실행, 실거래OFF/HOLD 유지. violet-design-final-stage/runtime/activation/public-https-20261020.json.
- 실제 Galaxy A33 최종 Android2.6.8(268) 동일서명업데이트 후16개기능검증 PASS, iPhone15 iOS0.1.4(5) 동일ID/기존서명업데이트 후17개 PASS. 인증·연구·가상기록·PENDING·복원·가로넘침 확인. 검증기록은비우고 Android디버깅포워드제거/양앱일반모드복귀. native안전영역중복을줄인 최종실기기캡처 android-physical-home-final.png로 시각확인. 요약수치가 안내보다앞에표시되고 하단중복여백해소. iPhone시각전체·수동VoiceOver/TalkBack전체검토를 완료로 표현하지 않는다.
- iPhone결과파일 초기복사는 자동검토가 민감정보가능성으로거부해 실행되지않음. signed빌드의LiveWorkflow.js해시와 생성코드(status/불리언checks/time만 포함)를 확인·입증 후 결과파일1개 제한복사 승인. 토큰/사용자원장/전체컨테이너조회 없음. violet-design-final-ios-physical-20261020.json 및 Android동명영수증.
- 전체941/Android4 PASS (master-qa-20261020013047268.json). 전체반응형217 PASS 후 데스크톱홈영향9 및 최종홈밀도21 재검증 PASS, 메뉴29 PASS. 같은조합재검증을 고유테스트수로합산하지않는다. WCAG자동태그위반0/가로넘침0이며 접근성인증아님. source code/Git/secret검사완료, 제품커밋push됨. 원천금융자료검증/정식스토어제출/최종개인정보고지는별도미완료.

---

# 5번 시안 기반 반응형 UI/UX 재구성 — 2026-10-20 KST

- 사용자 제공 ARVIA5번의 보라/라벤더/빛·여백을 참고해 KSTOCK 자체 SVG표식, 세리프제목, 네이비본문과 연구우선 홈을 구성. 외부 이미지·웹폰트 추가 없음. CSS디자인 토큰을 별도정리하고 라이트/다크·모바일/태블릿/데스크톱 대응. 모바일 정상웹화면의 Android샘플버튼 숨김, 양OS연결도구모음 축소. 로컬Mac필수라는 오래된 문구 수정.
- Chrome217조합(7폭×2테마×15화면+7글자2배확대) PASS/가로넘침0/axe WCAG태그위반0/런타임오류0. 데스크톱홈ID우선순위 수정후 영향폭1000/1024/1440의 라이트/다크/확대9개추가 PASS. 메뉴29 PASS. 저대비 운영패널/다크인물선택 수정, 최초 실패는 최종PASS로 덮어쓰지 않고 수정내역 기록. docs/KSTOCK_UIUX_VIOLET_REVIEW.md.
- 최종 회귀941/Android4 PASS (master-qa-20261020012340763.json), 양네이티브동일서명빌드·설치 PASS. Android2.6.8(268)/iOS0.1.4(5) 대상. source/asset/backend/auth 보존. 후보·운영전환 후 실제기기 검증은 후속기록 참조. VoiceOver/TalkBack 수동전체검토/기기전체범위 미실행. 금융근거HOLD/실거래OFF 유지.

---

# 연구 상태 보강 운영 반영 완료 — 2026-10-20 KST

- 제품 커밋 d1a0c458d7042581a26b4daccce340f17df3c490 / 작업브랜치 push 완료. sourceMatchesCommit=true인 review-f5894b1cf096c9f3/167파일, archiveSHA951a7271c38080a3f411500c2800b6674e16e712887c8b541950d34e86ffd913 생성. 원격격리설치·런타임24 PASS 뒤 이전 review-c8624b74d51f4584에서 전환. 환경파일·current/data 보존, 기존unit백업, 자동복원준비, 롤백미실행.
- 전환후11개/공개HTTPS PASS. 실제 인증된 progress API가 finishedAt을 workAt으로 반환함을 확인, sourceCollection NOT_RUN/신규0/HOLD 유지. research-freshness-remote-stage/runtime/activation/public-https/live-api-20261020.json. 서비스active/실거래OFF 유지. 앱재설치 없이 새로고침시 공통웹코드 반영.
- 최종 전체941/Android계약4/브라우저29 PASS. CI는 master브랜치필터로 작업브랜치 실행0/NOT RUN. 이번 실제 물리기기 재실행은 NOT RUN이며 이전16개를 새실행으로 표현하지 않는다. 새 공식원천 수집/가격검증/스토어출시 완료가 아니다.

---

# 연구 작업 상태 신선도·재조회 보강 — 2026-10-20 KST

- 프로젝트/origin/branch/기존변경·ARI 기준 확인. 작업보고 checkedAt을 다시 게시하면 실제 오래된 작업이 최신으로 보일 수 있는 문제 수정. 완료작업 finishedAt/실행중 startedAt을 기준으로24시간 신선도를 판단, 누락/미래/게시이후작업시각/시작종료역전/알수없는상태는 UNVERIFIED. sourceCollection NOT_RUN과 신규0 구분 유지. 새 외부수집/worker활성화/실거래 없음.
- 검증운영 화면에 실제 작업시각(KST), 오래됨/시각미확인 사유, 작업보고 새로고침 버튼 추가. 요청10초 UI시간제한/새요청시기존요청취소/늦은결과무시/백그라운드복귀재확인/페이지종료취소. Android 네이티브 fetch가 AbortSignal을 무시해도 대기화면이복구되도록 candidateRequest에서 별도 취소경합 처리. 이미실행된 네이티브 HTTP작업 자체의 즉시중단을 보장하는 것은 아니며 기존30초 bridge제한은 유지.
- 신규회귀4개: 재게시신선도위장/작업시각오류, 취소신호무시중401이새인증변경못함, 늦은UI응답덮기방지, 시간초과·인증실패·페이지종료후버튼복구. 전체941 PASS/Android계약4 PASS (master-qa-20261020010415161.json), 실제Chrome 웹/Android360/iPhone390화면크기29 PASS, Node구문/diff check PASS. 이번 물리기기 검증은 후속실행기록 참조. 이전 실제기기16개 통과를 이번 변경의 재실행으로 표현하지 않는다.
- 인증정보/사용자기록/금융근거/운영환경파일 변경 없음. 추천HOLD/실거래OFF 유지. 커밋·후보·운영 반영 여부는 후속 검증기록으로 남긴다.

---

# 1~4단계 완료·커밋 기반 운영본 일치 — 2026-10-20 KST

- 인증: Android 기존 암호화 vault와 iPhone 기기전용 Keychain 설정, 실제 운영 인증조회 및 재실행200 확인. 만료/거절 안내·갱신/삭제 UI, 이전401이 새인증을 지우지 않는 방어 회귀 PASS. 기기별 임시 가져오기 파일 삭제 확인, 비밀값 source/Git/APK/log 미포함. 저장인증 삭제 UI의 실제 삭제·재설정 전체 사용자 조작은 NOT RUN이며 기존 Android계약/Keychain 저장재실행 검증과 구분한다.
- 연구: 저장공식자료33개를 운영에 신규 연결, 기존파일/사용자자료 덮어쓰기 없음. 맥미니 보고 EVIDENCE_RECORDED와 외부수집 NOT_RUN/신규0 구분. `/api/v2/research/progress` 인증필수/no-store/24시간이후 UNVERIFIED. 검증운영 메뉴에 작업보고 상태 연결. 공식가격·기업행동 미확보는 PENDING/HOLD, 연구 사건수나 회귀통과로 투자성과를 주장하지 않는다.
- 두 실제 기기: 운영 전환 후 Galaxy A33/iPhone15 각16개 PASS 재확인. 운영인증·저장연구·종목화면 이동·가상기록4종·백업·복원·미확보가격null·실제API PENDING·미검증CSV차단·테스트기록제거. 종목별 실제가격/배당권리의 완전검증이 아니다. Android 디버깅포워드 제거·일반모드 재실행, iPhone도 QA 없는 인증연결 실행으로 복귀. android/ios-physical-postdeploy-workflow-20261020.json.
- Git: 미커밋제품/테스트/문서357파일 검토·secret패턴0 확인 후 5811ad676593c1701c8fcc1e4aa26381aff9d99b 커밋 및 작업브랜치 push 성공. 생성화면349개는 로컬보존·해시목록만 영수증 저장, 사용자데이터/data/env/키/네이티브빌드/Git제외. docs/AUTO_DEV_LOG.md EOF 공백은 후속기록에서 정리. Git archive만 추출한 깨끗한 디렉터리에서 새 npm ci --ignore-scripts+회귀937/Android4 PASS. clean-commit-build-20261020.json. native 서명키/기기프로파일은 기존 외부자산을 재사용하며 정식 스토어 배포가 아니다. GitHub CI는 master전용이라 현재브랜치 실행0/NOT RUN.
- 배포: 커밋과 서버/웹167파일 해시가 모두 일치하는 review-c8624b74d51f4584 생성(--require-committed), archiveSHA208b5bb0911f6b6ca8cd0f63aba3bc904ead1d3b213efe0203fb17456ad1fd8f. 원격격리설치/런타임24 PASS 뒤 기존검토경로에서 실행경로만 전환·KSTOCK재시작. 기존unit백업·환경해시보존·current/data재사용·실거래/수집/workerOFF. 실패복원구비/롤백미실행. 전환후11개 및 공개HTTPS PASS, 인증된저장연구/HOLD/progress공식수집미실행 확인. committed-server-stage/runtime/activation-20261020.json 및 access-research-public-https-20261020.json.
- 전체회귀937/Android4/브라우저29/Python보안3/iOS영수증4 PASS. 정식스토어제출/최종운영개인정보정책/공식원천신규수집/검증가격기반실성과는 미완료로 유지한다. 추가동작을 사용자에게 완료로 오인시키지 않는다. 제품 코드 기준커밋은5811ad6이며 이 문서의 후속커밋은 검증기록만 추가한다.

---

# 기기 인증·저장 연구 연결·실제 기기 흐름 검증 — 2026-10-20 KST

- 사용자1~4단계 일괄 승인으로 진행. 프로젝트/origin/branch·ARI 기준 확인, 기존 데이터와 미커밋 보존. Android 기존 AES-GCM vault에 운영 인증 설정, iPhone에 기기전용 잠금해제 접근 Keychain 저장/갱신/삭제 UI 추가. 고정 HTTPS origin에서만 웹 탭 메모리로 인증을 전달한다. iPhone 최초401 실패는 초기 비인증 조회와 새 인증값의 경합으로 확인, 초기조회 대기 및 이전토큰401이 새 토큰을 지우지 않는 웹 방어 추가. 실제 iPhone 재실행 인증200/자격보유 PASS. Android 저장 인증 연결 확인.
- 소유자 요청에 따른 1회 인증 가져오기는 SSH로 기존 토큰을 프로세스 메모리에서 읽어 USB로 앱별 임시 파일 전달, 즉시삭제 후 Android 암호화 vault/iOS Keychain 보관. 토큰은 source/APK/Git/로그/명령 인자에 포함하지 않았다. 임시파일은 origin/5분 유효성 확인 및 읽은 직후 삭제. iOS Documents 목록에 인증파일 없음 확인. 해당 도구는 명시 운영자 실행용이며 일반앱 자동수집 경로가 아니다. 개인정보 안내 Keychain 동작 갱신.
- Mac mini job6b7df4b9 완료 보고는 EVIDENCE_RECORDED이지만 sourceCollection NOT_RUN. 신규 공식 수집 완료로 인정하지 않는다. 저장 연구 JSON33개를 해시 manifest로 패키징·운영 current/data/v2에 신규 설치, 기존 파일 덮어쓰기/사용자 기록 이동 없음. 기존 원천의 공식 사건21/보수적 시장반응3은 재조회 시점과 원문기준일을 분리. 신규 수집이 아니다. 연구 progress API/UI 추가는 stale24시간·미래·형식오류 UNVERIFIED, 완료 보고와 자료 확보를 구분하며 추천HOLD.
- 실제 Galaxy A33/iPhone15 각16개 PASS: 운영HTTPS/인증된저장연구/종목화면/미검증가격null/가상4종기록/토큰없는백업/PENDING/CSV차단/비우기/복원미리보기/4종복원/검증기록제거/가로넘침없음. android-physical-live-workflow-20261020.json 및 ios-physical-live-workflow-20261020.json. 실제 사용자 거래/공식성과가 아닌 빈 새 세션의 가상입력이다. Android QA WebView디버그는 명시 플래그에서만 켜고 완료후포워드 제거·일반모드재실행. iPhone16개결과는 최종 QA자산의 선택적 추가401검사 이전 빌드에서 실행됐으며16항목만 주장한다.
- 전체937 PASS/Android4 PASS (master-qa-20261020005336264.json), Python아카이브3/iOS영수증4 PASS. 새 회귀2개는 늦은401 경합 및 연구보고 신뢰/신선도/신규수집수 위조 방어. 실제 물리기기 결과는 로컬fixture 기존25항목과 구분. 공식 원주가·기업행동 미확보/HOLD/실거래OFF 유지. 정식스토어 제출은 미실행. 전체변경 커밋·재현가능 후보·운영소스 일치 작업은 다음 기록에서 완료 여부 확인한다.

---

# Android·실제 iPhone 운영 HTTPS 업데이트 — 2026-10-20 KST

- 사용자 “모두 진행해줘” 승인에 따라 기기 로컬서버 의존성을 제거하는 업데이트 진행. 프로젝트/origin/branch/기존변경·ARI 기준 확인. 운영 서비스 변경 없음.
- Android 기존 ai.kstock.mobile.localvalidation의 공개 인증서를 기존 검증용 keystore와 대조해 단일 일치 확인. 새 키 생성 없이 동일ID/동일서명 2.6.6(266) APK 빌드·apksigner 검증·adb install -r 성공. build-https-device.py 추가. 원래 production 소스를 기반으로 인증 우회 제거/cleartext OFF/기존127.0.0.1:3103주소만 운영HTTPS로 이전, 사용자지정 주소·토큰·데이터 삭제 없음.
- 실제 Galaxy A33 캡처로 운영 홈/전체 메뉴/모의기록 메뉴 표시 확인. 운영 토큰 미설정으로 AUTH_REQUIRED 및 연구 조회 실패 안내가 남음. 이를 인증된 자료 조회 성공으로 표현하지 않는다. 원문토큰을 앱/빌드/로그에 넣지 않았다.
- iOS build-device.py에 --https 고정운영주소 모드 추가. 기존 appID ai.kstock.ios.localvalidation·기존 기기 프로파일·서명 재사용, 0.1.2(3)로 덮어쓰기 설치 PASS. ATS HTTP예외·로컬네트워크용도문구 제거. WKWebView 비영구저장 사용. 실제 iPhone15에서 앱실행·새영수증 조회 PASS: appShellReady/secureContext/운영origin/익명401. ios-physical-https-device-update-20261020.json. 앱삭제/기기초기화/새계정·프로파일 생성 없음.
- Android 계약4/Python HTTPS 검증기4 PASS, 빌드·구문·diff check 확인. physical-https-device-update-20261020.json. 설치된 앱은 기존 테스트 앱 ID를 유지한 HTTPS 기기검증 빌드이며 정식 스토어 출시나 인증 세션 준비 완료가 아니다. 연구 API 인증은 별도 토큰 설정 필요, 금융원천HOLD·실거래OFF 유지.

---

# KSTOCK 서비스 전환·재시작 및 HTTPS 검증 — 2026-10-20 KST

- 사용자 “KSTOCK 서비스 재시작해” 승인에 따라 앞서 설명한 검증후보 전환·KSTOCK 서비스 재시작 실행. 서버 OS 재부팅 없음. 프로젝트/origin/branch·ARI 기준·기존 변경 보존 확인.
- review-e0dd69f0bd83fd13의 manifest165파일 전체 해시/기존 sourceSHA/환경 안전 조건/기존drop-in없음 대조 후 90-reviewed-release.conf로 ExecStart만 후보로 전환. WorkingDirectory와 기존 /etc/k-stock-ai/k-stock-ai.env 유지. 기존 current는 삭제·덮어쓰기하지 않고 current/data를 영구경로로 생성·후보data에 연결. 사용자 데이터 복사/삭제 없음. broker/live/collection/peerworker OFF. 서비스active.
- 재시작 후11개 확인 PASS: health/HTML·앱JS·백업JS·CSS·메뉴JS·CSS/익명401/기존 실제토큰 불량입력400/자료미확보PENDING/no-store/기존env·소스보존. 실제 토큰·env값 로그 없음. 자동복원 절차 준비대로 유지, 실패 없어 롤백 미실행. server-menu-activation-20261020.json.
- 공개 https://kstock.ai.kr/ HTML200, app.js/백업JS/CSS200, 실제 앱요소 검증 PASS. 이전 JSON/404 차단 해소. server-menu-production-active-20261020.json. 서버 전체 재부팅/다른프로젝트 서비스 조작 없음.
- 기존 iPhone17 시뮬레이터의 별도 HTTPS preview앱으로 실제 WebView 접속 PASS: appShellReady/secureContext/익명API401/비영구 저장 확인. 앱만 검증 후 종료. ios-https-postactivation-20261020.json. 최초 sandbox simctl 조회제한은 허용 환경 조회로 해소. 물리iPhone/Android 운영HTTPS 전체기능·실제사용자세션 검증은 NOT RUN.
- 운영 화면 준비 PASS는 정식 스토어출시·최종개인정보고지·공식금융자료 검증 완료를 의미하지 않는다. 추천HOLD/실거래OFF/자료미확보PENDING 유지. 후보는 메뉴커밋 및 기존미커밋 제품소스의 manifest스냅샷이며 모든 소스가 Git푸시됐다고 표현하지 않는다. server-menu-pretransition-20261020.json 최신 ACTIVE_HTTPS_VERIFIED로 갱신.

---

# 새 메뉴 후보 원격 격리 검증 완료 — 2026-10-20 KST

- 사용자에게 지정 호스트 /tmp·releases 업로드 및 검증의 명시 승인을 받은 뒤 실행했다. 이전 자동 승인 거부는 승인으로 해소됐으며 운영 전환·재시작 승인은 포함하지 않는다. 프로젝트/branch/origin/기존변경·ARI 기준 확인 및 보존.
- review-e0dd69f0bd83fd13 (165파일) 업로드 후 원격 SHA256 a328827b922e5c926fa1ef4dcb0372dbb1d11bdea6ced7f38b4f1e6c2be9aaa4 일치. 기존 경로 미존재 확인 후 /srv/k-stock-ai/releases/review-e0dd69f0bd83fd13에 격리 설치. Node22.23.2/npm ci --ignore-scripts PASS. 상태 STAGED_VERIFIED_NOT_ACTIVE. current·systemd·nginx·운영env·사용자데이터 미변경.
- 원격 후보 임시loopback/별도랜덤토큰/실거래·수집OFF 런타임24개 PASS: 기본자산4개/메뉴JS·CSS 및 HTML연결/익명·잘못된토큰401/잘못된입력400/공식자료없음PENDING(RAW_PRICE_AND_CORPORATE_ACTIONS_REQUIRED)/no-store/운영소스·active상태유지. 임시프로세스 종료 확인. 실제 운영토큰·env 사용 없음. server-menu-remote-stage-20261020.json/server-menu-remote-runtime-20261020.json.
- 기존 운영 소스SHA 88da0c2438232a9179cb1e6303b626a81defedbb30f01400f69bcf200478f25f, 서비스active 유지. 공개GET은 여전히 루트JSON200/JS·백업JS·CSS404, BLOCKED_WEB_ASSETS_NOT_DEPLOYED. server-menu-production-baseline-20261020.json. 원격 후보 PASS를 운영 앱 PASS로 표시하지 않는다.
- 로컬 추출후보 브라우저29/런타임24/보안3 PASS 기록 유지. 실제 원격 후보를 통한 물리 WebView/운영HTTPS 앱 검증은 전환 전이라 NOT RUN. 새 원천금융자료 검증 아님, 추천HOLD/실거래OFF 유지. server-menu-pretransition-20261020.json을 최신 REMOTE_STAGED_VERIFIED_NOT_ACTIVE로 갱신. 다음 단계는 별도 승인된 운영 전환·재시작 및 실패시 복원, 이후 HTTPS/iOS 검증이다.

---

# 새 메뉴 포함 후보 전환 전 준비 — 2026-10-20 KST

- 프로젝트/branch/origin/기존 변경·ARI 기준 확인. 메뉴 커밋2b9e23a와 기존 미커밋 개발이 포함된 명시적 worktree snapshot을 새 후보 review-e0dd69f0bd83fd13으로 생성.165개 파일, SHA256 a328827b922e5c926fa1ef4dcb0372dbb1d11bdea6ced7f38b4f1e6c2be9aaa4. src/public/package/lock만 포함, 사용자 data/env/키 제외. 메뉴JS/CSS 포함·아카이브해시 재대조 PASS. 이 후보를 Git 커밋 단독 재현물로 표현하지 않는다.
- 로컬 /tmp/kstock-menu-pretransition-20261020에 npm ci --ignore-scripts 및 loopback 검증 PASS. 아카이브 보안 unittest3 PASS. scripts/verify-staged-server.py에 메뉴자산2개/HTML연결 검사와 --local 모드 추가. 런타임24개 PASS, 공식자료없음 PENDING/인증401/입력400/no-store/실거래OFF, 프로세스종료 확인. 로컬 서비스 상태 NOT_APPLICABLE로 구분. 영수증 server-menu-local-stage-20261020.json/server-menu-local-runtime-20261020.json.
- 추출된 새 후보 자산으로 Chrome 데스크톱1440/Android360/iPhone390px 브라우저29항목 PASS. server-menu-candidate-browser-20261020.json. 실제 물리 기기 WebView는 NOT RUN.
- 준비된 활성화 스크립트를 새 후보로 고정하고 --activate review-e0dd69f0bd83fd13 필수 인자 없으면 exit2/무변경 확인. 메뉴자산도 전환 후 검사 대상으로 추가. 활성화 실행/서비스재시작 NOT RUN. 운영 절차의 실제 검증을 완료로 표시하지 않는다.
- 원격 /tmp 업로드는 자동 승인 검토가 소스 전송 목적지 승인/소유근거 부족으로 실행 전에 거부. 우회·전송 없음. 원격 새 후보 설치/Node22 검증 NOT RUN. 기존 원격 후보를 최신 메뉴 포함 후보라고 표현하지 않는다. 전환/재시작 승인과 구분하여 지정 운영 호스트의 /tmp 및 releases 격리 업로드·검증 승인이 필요하다. 원격 운영 변경 없음/HOLD/실거래OFF 유지. server-menu-pretransition-20261020.json 참조.

---

# 웹·앱 공통 메뉴 적용·커밋·푸시 — 2026-10-20 KST

- Onaria의 메뉴 그룹/모바일 전체 메뉴/키보드 동작을 KSTOCK 기존 기능에 맞게 적용. 종교·회원·게임 기능 이식 없음. 웹과 Android/iOS WebView 공통 자산 사용. 리서치/모의 기록·성과/데이터·설정·이용 안내 그룹, 모바일 모의 기록·전체 메뉴, 활성 상태/aria-current/aria-expanded/Escape·포커스/같은 WebView 개인정보 경로 제공.
- 현재 HTML에 존재하는 목적지만 표시. 구형 공개 화면에서는 기존 목적지만 제공하는 호환 경로도 검증. 이번 변경만 5개 파일163줄 커밋: 2b9e23a5517624dacff924aec2e25084e91845e1, origin auto/kstock-development-20260930 일반 push 성공. index는 이번 로드 태그2개만 선택 반영, 기존 미커밋 변경은 보존. docs/KSTOCK_WORKSPACE_MENU.md 참조.
- 전체 회귀935 PASS/Android 계약4 PASS (master-qa-20261019183253226.json). 최초 샌드박스 소켓 바인딩 실패 기록 보존. Chrome 웹1440/Android360/iPhone390px 29개 메뉴 검증 PASS (workspace-navigation-20261020.json), 커밋 인덱스만 추출한 구형 화면 데스크톱/모바일 smoke PASS. 모바일 버튼과 바깥 클릭 닫기 충돌 수정. 실제 물리 WebView/새 native 빌드 NOT RUN. secrets/구문/diff check PASS.
- 기존 서버 후보는 이번 메뉴를 포함하지 않으므로 후속 운영 전환 전 새 검토 후보 구성이 필요하다. 서비스/환경/데이터/운영 전환·재시작 없음. 추천 HOLD/실거래 OFF 유지. CI는 master 전용 트리거라 현재 작업 브랜치 자동 실행 대상이 아니다.

---

# 운영 전환 준비·자동 승인 거부 — 2026-10-20 KST

- 운영 unit/drop-in/env 경로를 값 노출 없이 확인: workingdir current, EnvironmentFile /etc/k-stock-ai/k-stock-ai.env, 기존 drop-in 없음. 실제 env는 외부접속 인증 활성/토큰길이조건 충족, broker/live OFF. current/data 및 후보의 사용자 데이터 파일 없음.
- scripts/activate-reviewed-server-20261020.py에 특정 검증 후보의 manifest 대조, 기존 env/소스 보존 확인, current/data 영구 경로 연결, 새 systemd drop-in으로 ExecStart만 전환, 실거래/수집/worker OFF, 재시작 후 health/정적/익명401/실제토큰400/PENDING 검증, 실패 시 drop-in 제거 및 기존 서비스 재시작 절차 준비. Python AST PASS. 실제 전환 실행 검증은 NOT RUN.
- 자동 승인 검토가 실행 전에 거부: “다음 단계”만으로 systemd 실행 경로 변경·디렉터리/권한 변경·재시작에 대한 명시적 운영 승인 부족, 서비스 중단/구성 변경 위험. 우회·재시도 없음. 운영 변경 미실행. 사용자에게 구체 전환과 짧은 중단 가능성에 대한 명시 승인 요청 필요. 공개 앱 BLOCKED/추천 HOLD/실거래 OFF 유지.

---

# 격리 후보 심화 검증·공개 주소 재확인 — 2026-10-20 KST

- 프로젝트/origin/branch·ARI compliance·기존 변경 보존을 확인하고 검증만 수행했다. `scripts/verify-staged-server.py` 추가: 기존 review 후보만 허용, 실제 운영 env/토큰을 읽지 않고 새 랜덤 토큰과 loopback 임시 포트를 사용한다. 수집/브로커/실거래 OFF, 본문·토큰 로그 없음, 자신이 띄운 프로세스만 종료한다.
- 원격 후보 review-acfaa246ece5fad5에서 실제 HTTP 21개 검증 PASS: HTML/JS/백업JS/CSS, 익명·잘못된 토큰401, 정상 입력의 공식 자료 미확보 PENDING(`RAW_PRICE_AND_CORPORATE_ACTIONS_REQUIRED`), Cache-Control no-store, 빈입력·잘못된날짜·역전기간·0현금·음수수수료·0수량·중복자금흐름ID·미보유종목매도·깨진JSON400, 운영 소스해시/서비스 상태 유지. 영수증 `data/v2/verification/server-staged-runtime-20261020.json`. 검증 프로세스 종료 확인, 운영 활성화 없음.
- 공개 HTTPS GET 재검증은 BLOCKED_WEB_ASSETS_NOT_DEPLOYED: /200 application/json, /app.js·/paper-backup.js·/styles.css404. 영수증 `data/v2/verification/production-web-recheck-20261020.json`. 운영 앱 준비 완료로 표시하지 않는다.
- Python AST·git diff --check PASS. 이번에는 제품 코드 변경이 없어 기존 전체 회귀935/Android4/Python아카이브3 통과 기록을 재실행으로 표현하지 않는다. 후보 런타임 검증 PASS, 공개 앱 BLOCKED, 금융 원천 검증 미완료/HOLD/실거래OFF 유지. 서비스·nginx·env·current 전환 없음.

---

# 운영 구버전 원인 확정·통합 후보 서버 검증 — 2026-10-20 KST

- 프로젝트/origin/branch·ARI compliance·기존 미커밋/사용자 데이터 보존. 운영 별칭 ari-prod-01 해석 실패 후 DNS와 known_hosts가 일치하는 대상에 기존 키로 접속, 개인키·env값 출력 없이 읽기 전용 진단. systemd active/workingdir current, cleanmaster fe81e6a1b1581d7f0e94d07b3b7d5056359ceb50/Node22.23.2/package0.1.0 확인.
- 실제 current에 public4파일이 없고 server.js에 static middleware/paper 경로도 없다. loopback에서도 루트JSON/JS404 재현. 단순 프런트 복사로 해결되지 않는 구버전 API 배포가 확인된 원인이다. 운영 코드·service·nginx·env는 변경하지 않았다.
- scripts/package-server-review.py 및 stage-server-review.py 추가. 현재 src/public/package/lock163개를 해시 manifest와 아카이브로 준비. 경로 탈출/심볼릭링크/개인 파일/중복/해시 불일치/기존 후보 덮어쓰기 거부. 원본 current 해시/경로 비교. npm ci는 scripts 미실행, 임시loopback만 사용, 별도 랜덤 토큰(비출력)과 수집/실거래 OFF로 기동·검증 후 종료.
- 로컬 리허설 PASS 후 운영 `/srv/k-stock-ai/releases/review-acfaa246ece5fad5`에 격리 stage만 수행. Node22에서 HTML·JS·백업JS·CSS 제공/익명API401/인증된 불량모의입력400/실거래false PASS. 상태 STAGED_VERIFIED_NOT_ACTIVE. active서버SHA 88da0c2438232a9179cb1e6303b626a81defedbb30f01400f69bcf200478f25f 및 서비스active 유지, 원격/로컬 아카이브SHA 일치. 실사용 토큰·데이터·설정 미변경. 영수증 server-staged-review-20261020.json 및 server-review-package-20261020.json.
- 기존 install-gabia-server.sh의 movingmaster 자동pull을 제거했다. 새 설치만 --bootstrap+검토된40자리커밋 요구, 기존 current 존재 시 거부, completeWeb/API소스 확인 후 설치 진행. 인자 없는 실행이 exit64/무변경임을 실제테스트. 운영에서는 이 설치 스크립트/재시작을 실행하지 않았다.
- 전체 회귀935 PASS/Android계약4 PASS/FAIL0/SKIP0, master-qa-20261019181626946.json. Python 아카이브 보안3 PASS, 구문/AST/bash -n/diff check PASS. 원천 금융검증·추천HOLD·실거래OFF 유지.
- 검토 아카이브 artifacts/release-prep/review-acfaa246ece5fad5/review-acfaa246ece5fad5.tar.gz. 후보 승격·롤백 전 검토 절차 docs/KSTOCK_SERVER_RELEASE_REVIEW.md 작성. 현재 공개 주소는 여전히 구버전으로 앱 화면 준비 미완료이며 후보검증을 운영배포완료로 표시하지 않는다. 전체 PARTIAL/공개배포 BLOCKED.

---

# iOS HTTPS 실제 접속·운영 웹 제공 상태 진단 — 2026-10-20 KST

- 프로젝트/origin/branch·ARI compliance·기존 변경 확인/보존. 시뮬레이터 상태가 복구돼 이전 NOT RUN HTTPS 검증을 실제 실행했다. 기기/시뮬레이터 초기화·다른 앱 종료·서버 변경 없음.
- 첫 연결 영수증은 HTTPS origin/secureContext/비영구 WebView/API401을 확인했지만 title이 비어 있었다. 별도 공개GET으로 운영 /가 application/json200, /app.js·/paper-backup.js·/styles.css가404임을 확인했다. 연결/비인증 차단 성공과 실제 앱 화면 제공을 구분하여 이전 영수증에 APP_NOT_READY 재평가를 append했다. root JSON 본문이나 인증정보는 로그/영수증에 보관하지 않았다.
- ios/App.swift: HTTPS preview의 메인 응답이 HTML200이 아니면 탐색 취소 및 운영 웹 제공 상태 확인 안내. 취소 콜백이 구체 안내를 일반 오류로 덮지 않도록 상태 유지. 실제 앱 요소/계산 함수가 있어야 검증 통과하도록 appShellReady 추가. 로컬 검증 모드의 기존 탐색 정책은 유지.
- 재현 도구 ios/run-https-preview-check.py: 명령별15~30초 제한·새 영수증 대조·별도 preview앱만 설치/실행/종료. ios/verify_https_preview.py:10분 이내·미래시간 제외·HTTPS·secureContext·비영구 저장·API401·실제 앱 요소 모두 요구. 잘못된형식/누락/낡은/미래/오류/모순된차단영수증/API200/403을 성공으로 인정하지 않는다. 검증기 unittest4 PASS.
- 최종 preview 빌드/기존 로컬 빌드 PASS. 실제 시뮬레이터 재실행 결과 BLOCKED_WEB_ASSETS_NOT_DEPLOYED, HTTP200/application/json, nonpersistent=false(영구 저장 아님) 확인. data/v2/verification/ios-https-preview-app-readiness-20261020.json. 실제 토큰 인증/세션만료/물리 iPhone HTTPS 검증은 아직 NOT RUN.
- src/v2/web_release_shell.js 및 scripts/verify-web-release.mjs: health와 별개로 HTML 앱 요소 및 app.js/백업JS/CSS의 상태·MIME·필수 내용 점검, 읽기전용 GET·redirect 거부·요청시간/응답크기 제한·본문 로그 없음. 기존 verify-gabia-deploy.sh에7번째 단계로 연결했다. 운영 점검은 새 GET 도구만 실행했으며 기존 배포 스크립트의 systemd/nginx/POST 단계는 실행하지 않았다.
- 신규 Node3개: 정상 앱 자산, healthy JSON/JS404 거부, 잘못된 MIME/일반 로그인·오류 페이지 거부. 전체 회귀934 PASS/Android계약4 PASS/FAIL0/SKIP0. master-qa-20261019180647596.json. Python4 PASS/AST·Node구문·bash -n·diff check PASS. production-web-app-readiness-20261020.json에 실제4경로 차단 영수증 저장.
- 운영 웹이 현재 주소에서 제공되지 않음은 확인했지만 원격 파일 누락/라우팅/구버전 중 근본 원인은 아직 확정하지 않았다. 원격 배포나 설정을 변경하지 않았으며 기존 검토 압축파일을 새 배포본으로 덮어쓰지 않았다. 다음 운영 작업은 실제 서비스 대상/정적파일 경로를 대조하고 올바른 웹/API 구성을 배포·검증하는 것이다. 추천 HOLD/실거래 OFF/공개배포 BLOCKED/전체 PARTIAL 유지.

---

# iOS 고정 HTTPS 검토용 구성 — 2026-10-20 KST

- 프로젝트/origin/branch·ARI compliance 및 기존 변경 확인/보존. 기존 승인된 배포 준비 범위에서 iOS 고정 HTTPS 검토 모드를 구현했다. origin/운영 서버/기존 사용자 데이터·로컬 앱식별자 변경 없음. 공개 배포·스토어 제출은 수행하지 않았다.
- ios/ServerPolicy.swift에 https://kstock.ai.kr/ 고정 시작주소·URL 검증/동일 origin 정책. HTTP/다른호스트·포트/URL인증정보 차단, 기본443 동일 origin 허용. 외부 근거 링크는 명시 사용자 링크의 HTTPS이며 URL인증정보가 없어야 한다. 매개변수/fragment를 가진 시작주소도 거부한다.
- KSTOCK_HTTPS_PREVIEW 모드에서 nonpersistent WKWebView 사용, 네이티브 토큰 저장/주입 없음. 기존 웹 메모리 토큰 입력 경로 사용. 로컬 fixture QA 인자는 이 모드에서 실행하지 않는다. 명시 --https-preview-check는 읽기 전용 HTTPS origin/secureContext/API비인증상태/저장소 모드를 별도 파일로 기록하도록 구현했다. 실제 로그인/세션만료 검증은 남아 있다.
- ios/build-https-preview.py로 별도ai.kstock.ios.httpspreview 앱 생성. 시뮬레이터 ad-hoc 서명·기기 unsigned 빌드 PASS, 양쪽 Info.plist ATS/HTTP 예외 없음 확인. 기존 로컬 시뮬레이터 빌드 PASS. 로컬/기기 빌더와 Xcode 프로젝트에 공유 정책 소스 연결. App Store 배포 서명/프로파일 생성·계정 변경 없음.
- Foundation 정책 실행 PASS. 초기 기본 Swift 캐시 경로 제한은 /tmp 명시 캐시로 해결. 첫 preview 빌드 도중 소스를 수정해 중단됐으며 소스 고정 후 재빌드 PASS. 전체 회귀931 PASS/Android계약4 PASS/FAIL0/SKIP0. master-qa-20261019174637188.json. Python AST/diff check PASS.
- 실제 HTTPS 시뮬레이터 설치/실행은 CoreSimulator 서비스 무응답으로 완료 확인 불가. 별도15초 제한 상태조회도 TIMEOUT. 직접 시작한 설치 명령만 종료했고 공유 시뮬레이터 초기화/다른 앱 종료는 하지 않았다. 실제 접속·비인증API401·ephemeral 저장소 런타임·실제 토큰 인증/물리iPhone는 NOT RUN으로 기록한다. 빌드 성공을 접속 성공으로 표시하지 않는다.
- 영수증 data/v2/verification/ios-https-preview-build-20261020.json, 산출물 ios/build/https-{simulator,device}/KStockHTTPSPreview.app. README에 재현 명령/범위/기존 로컬 모드 구분 추가. 이전 release-prep 압축파일은 이전 소스 검토본이며 새 HTTPS 구성을 포함한다고 주장하지 않는다.
- 최종 개인정보/스토어고지·iOS실인증/배포서명·Android기존키업데이트·금융원천 Gate 유지. 추가 영구 인증정보 수집·실거래·운영 배포 없음. 전체 PARTIAL/추천 HOLD/공개배포 BLOCKED.

---

# 모바일 통합·백엔드 연결 확인·배포 준비 — 2026-10-20 KST

- 사용자 승인1~3단계를 연속 수행. 프로젝트/origin/branch·compliance·운영 대상 확인, 기존 미커밋/사용자 데이터 보존. 운영자 사실값 조세진/vjsjv7003@gmail.com/사업자 미등록을 사용자 답변대로 반영했다. 공개 배포·스토어 제출 완료를 의미하지 않는다.
- Galaxy A33 실기기/iPhone15 실기기/iPhone17 시뮬레이터 각각25개 실제 WebView/WKWebView 프로그램 통합 항목 PASS. 입력→순손익30 계산→CSV→초과매도 오류·미저장 보호→매수가 수정 저장·재계산50→백업 비교/취소/복원·재계산30→필터/날짜/페이지/정렬/합계→삭제/복구→모두비우기. 영수증 galaxy-paper-full-integration-20261020.json, ios-paper-full-integration-{physical,simulator}-20261020.json. 전체 제스처·보조기술·OS파일앱/선택기 전수 감사와 구분한다.
- scripts/paper-mobile-integration-harness.js 및 serve-paper-mobile-integration.mjs로 가상 검증 재현. iOS --paper-integration-qa 명시 모드에서만 검증 결과를 앱 문서에 저장하도록 추가, 정상 실행은 해당 모드를 시작하지 않는다. 기존 iPhone 프로파일/인증서로 로컬 앱 업데이트 후 실기기 실행 확인. 새 계정/프로파일/서명키 생성·기기 설정 변경·데이터 삭제 없음. 한시적192.168.0.16:3104 가상 서버/loopback서버·검증 앱 모두 종료, USB매핑 보존.
- 백엔드 저장서비스→현재 후보 출력을 재대조. 외부요청0/신규공식문서0, AAPL/MSFT/NVDA valuation HOLD. Apple SAME_SOURCE_PERIOD_BOUNDARIES_REQUIRED/bridgeEligible=false/marketCap=null 유지. 과거 백엔드 실행 완료를 공식 근거 확보 완료로 연결하지 않았다. mobile-release-backend-review-20261020.json 및 전용 주식수 보고서 append.
- 배포 재현성 문제 수정: 실제 사용하는3패키지 선언 추가, 존재하지 않던 swagger-jsdoc 버전을 레지스트리 확인6.3.0으로 변경, 중복 dependency 의미 보존 정리, 실제 main/start/Node요건 반영 및 lockfile 일치. 기존 node_modules는 보존. 별도 clean install(--ignore-scripts)·로컬 서버 health/개인정보 검토본 제공 PASS, 같은 clean 환경의 핵심184테스트 PASS. 최초 offline 캐시부족/존재하지 않는 버전/잘못된 prefix 방식의 실패는 성공으로 표시하지 않고 수정 후 검증했다.
- Android 현재 origin 저장 토큰 삭제 버튼·영속삭제 실패 처리 추가. 다른서버 토큰/웹별도입력 보존. 소스 계약과 실제컴파일 PASS이며 실제 사용자 토큰 삭제 런타임 검증은 미실행. 개인정보·이용 안내 검토본과 데이터 흐름표를 추가했으나 최종 방침/스토어 고지로 확정하지 않았다.
- 별도 위치에서 unsigned Android APK 빌드/zipalign·manifest 확인. 기존 서명환경4항목이 모두 미설정임을 값 노출 없이 확인. 공개 업데이트 서명·설치 검증은 미완료. iOS는 개발용 로컬앱이며 운영 HTTPS/인증/배포 타깃·아이콘/스토어 메타데이터가 미완료다.
- 전체 회귀931 PASS/Android계약4 PASS/FAIL0/SKIP0, master-qa-20261019172327707.json. iOS 임시연결 경계4 PASS. src/v2/mobile_release_readiness.js는 모바일 성공과 공개배포/금융기능 승인을 구분하며 누락/오래된/기기종류가 다른 영수증을 거부한다. 구문/AST/diff check PASS.
- 검토번들 artifacts/release-prep/20261019172436789/kstock-mobile-review.zip,165파일 SHA256 검증. root data/·.env·node_modules·키스토어/프로파일/서명iOS 제외. src/data/sample_stock.js는 공개 소스 fixture로 구분. source/APK·manifest·연락처/데이터흐름 초안 포함, 공개 배포용 파일로 표시하지 않는다. mobile-release-review-bundle-20261020.json.
- 공개 https://kstock.ai.kr/health 읽기200/mock/broker=false/liveTrading=false 확인, 운영 배포/설정/주문0. 결과 REVIEW_BUNDLE_READY/공개배포 BLOCKED/전체 PARTIAL/추천 HOLD. 상세 산출물·남은 단계: docs/KSTOCK_RELEASE_PREPARATION.md. Android 운영서명·업데이트 경로, iOS 운영배포 구성, 실제 운영 로그/처리업체/보관·파기/스토어 고지 확인이 남아 있다.

---

# 미저장 수정 중 CSV 생성·다운로드 보호 — 2026-10-20 KST

- 프로젝트/origin/branch·ARI compliance·기존 변경 확인/보존. 운영 kstock.ai.kr/ari-prod-01 배포 없음.
- CSV 생성 공통 진입점에 미저장 수정 검사를 추가하여 텍스트 생성과 다운로드 모두 동일하게 보호한다. 기존 CSV 텍스트를 지우거나 파일 Blob을 만들기 전에 중단하고 저장/취소 안내 및 수정 입력 포커스 제공. 편집 안내에도 CSV 포함을 반영했다.
- 취소 후에는 기존 검증 결과로 다시 내보낼 수 있다. 수정 저장은 기존 정책대로 결과/CSV 스냅샷을 무효화하므로 재계산 전 내보내기 불가. 변경 없는 편집 세션은 차단하지 않는다. 이전에 복사한 텍스트/외부 저장 파일은 자동 변경하지 않는다.
- 신규2개: CSV 생성/다운로드 차단·기존 텍스트/스냅샷 보존, 변경 없는 세션·취소 후 재개 및 저장 후 재계산 요구. UI159 PASS. 전체 회귀928 PASS/Android 계약3 PASS/FAIL0/SKIP0. master-qa-20261019171214494.json. 구문/diff check PASS.
- 실제 headless Chrome fixture: 검증된 계산으로 CSV 생성→미저장 수정→생성/다운로드 중단·Blob0·기존 CSV 동일→취소 후 동일 CSV 재생성 확인. data/v2/verification/paper-csv-edit-gate-web-20261020.json. 기존 전체 기능/4폭×2테마 회귀 PASS. 최초 다운로드 읽기는 파일 존재 직후 아직 작성 중인 시점의 검사 실패로, 완료 내용 일치까지 대기하도록 검증 도구를 수정한 뒤 통과. textarea LF/파일 CRLF 차이를 유지하며 비교했다. 임시 Chrome/HTTP 서버 종료. 신규 보호 동작 Galaxy/iPhone QA는 이번 NOT RUN.
- 새 저장소·권한·API 요청·외부 자료 수집·운영 배포·실거래 없음. 실제 주식수 원천 업무는 별도 유지. 기능 fixture 검증이며 전체 PARTIAL/추천 HOLD.

---

# 미저장 수정 중 계산·JSON 백업 실행 보호 — 2026-10-20 KST

- 프로젝트/origin/branch·ARI compliance·기존 변경 확인/보존. 운영 kstock.ai.kr/ari-prod-01 배포 없음.
- 수정 초안이 원본과 다르면 누적 성과 계산·JSON 백업 텍스트 생성·파일 다운로드를 시작하지 않고 현재 수정 화면에 포커스/스크롤한다. 저장 또는 취소 후 다시 실행하도록 안내한다. 변경 없는 수정 세션은 정상 실행 가능하다.
- 계산 API 요청·이전 결과 제거·CSV 초기화 전에 검사하여 기존 결과를 유지한다. 백업은 이전 텍스트/원본 기록을 유지하고 Blob/파일 생성 전에 중단한다. exportPaperBackup의 성공 여부를 다운로드 경로에서 확인하여 검증 실패에도 다운로드가 이어지던 경로도 방지한다. 직접 복사한 기존 텍스트/이미 저장한 외부 파일은 자동 변경하지 않는다.
- 신규3개: 계산 요청0/결과·초안 보존, 백업 텍스트·파일 경로 중단/원본 보존, 변경 없는 세션·취소·저장 후 정상 내보내기. UI157 PASS. 전체 회귀926 PASS/Android 계약3 PASS/FAIL0/SKIP0. master-qa-20261019171054235.json. 구문/diff check PASS.
- 실제 headless Chrome fixture:미저장 매수가 수정→계산 요청0/안내→백업 생성·다운로드 버튼 중단/기존 텍스트 동일→취소 후 정상 백업 확인. 기존 전체 흐름·4폭×2테마 회귀 PASS. data/v2/verification/paper-edit-action-gate-web-20261020.json. 임시 Chrome/HTTP 서버 종료. Galaxy/iPhone 신규 보호 동작·모든 오류 화면 폭/보조기술 QA는 이번 NOT RUN.
- 적용 범위는 누적 계산과 JSON 백업 생성이며 기존 계산에서 생성하는 CSV 동작은 기존 정책을 유지한다. 추가 저장소·권한·API 요청·외부 자료 수집·운영 배포·실거래 없음. 실제 주식수 원천 업무는 별도 유지. 기능 fixture 검증이며 전체 PARTIAL/추천 HOLD.

---

# 기록 수정 전환 시 초안 보존 — 2026-10-20 KST

- 프로젝트/origin/branch·ARI compliance 및 기존 변경 확인/보존. 운영 kstock.ai.kr/ari-prod-01 배포 없음.
- 다른 기록 수정 버튼을 눌렀을 때 현재 초안에 변경이 있으면 전환을 중단하고 현재 입력값을 보존한다. 저장 또는 수정 취소 후 전환하도록 안내하고 현재 수정 화면에 포커스/스크롤한다. 같은 기록을 다시 누르면 입력과 기존 오류를 초기화하지 않는다.
- 변경 없는 초안은 다른 기록으로 바로 전환 가능. 숫자100/100.00 등 값이 같은 표기는 변경으로 간주하지 않는다. 빈값/브라우저 badInput은 변경으로 보호한다. 이 기능은 수정 버튼 사이 전환에 적용하며 다른 기록 추가/삭제·계산 입력 변경·백업 적용·모두 비우기 시 초안을 닫는 기존 정책은 유지하고 기존 화면 고지도 유지한다. 자동 저장/새 이력 저장 없음.
- 신규3개: 다른 기록 전환 차단·값/원본 보존/취소 후 전환, 같은 기록 재선택·오류 보존, 동등 숫자/빈 입력 보호. UI 테스트 DOM 모형이 동적id를 실제 노드와 연결하도록 개선했고 기존 양쪽 초과 매도 검증은 명시적 취소 후 다음 기록을 검사하도록 보정했다. UI154 PASS. 전체 회귀923 PASS/Android 계약3 PASS/FAIL0/SKIP0. master-qa-20261019170923601.json. 구문/diff check PASS.
- 실제 headless Chrome fixture:매수가95 초안→다른 매도 수정 버튼→전환 차단/현재 입력 포커스/원본100 보존→동일 기록 재선택 유지→취소 후 매도 수정 전환 확인. 기존 전체 기능 회귀 및4폭×2테마, 수정 화면320/390px 넘침 없음. data/v2/verification/paper-edit-draft-web-20261020.json. 임시 Chrome/HTTP 서버 종료. Galaxy/iPhone 신규 전환 보호 QA는 이번 NOT RUN.
- 추가 영구 저장·권한·API 요청·외부 자료 수집·운영 배포·실거래 없음. 실제 주식수 원천 업무는 별도 유지. 기능 fixture 검증이며 전체 PARTIAL/추천 HOLD.

---

# 기록 수정 입력별 오류·포커스 — 2026-10-20 KST

- 프로젝트/origin/branch·ARI compliance·기존 변경 확인/보존. 운영 kstock.ai.kr/ari-prod-01 배포 없음.
- public/app.js: 수정 저장 시 날짜/필수값/브라우저 badInput/유한값/안전 금액 범위/양수 수량·가격/0이상 비용/0아닌 입출금을 먼저 검사한다. 잘못된 모든 입력에 aria-invalid 및 오류 안내 연결, 첫 오류로 포커스 이동. 오류 안내에 항목 이름과 수정 조건을 표시한다.
- 매수 수량 축소·매도 수량 증가의 초과 매도 및 수량×가격 범위 초과를 수량 입력에 연결한다. 원본은 저장 검증 통과 전 유지한다. 입력 수정 시 이전 오류 속성을 지우고 재검증 필요 안내, 다음 저장에서 다시 확인한다. 전체 백업 검증 계약/서버 자료 Gate는 유지하며 여기서 포착하지 못한 전체 기록 오류는 기존 안내로 보류한다.
- 신규3개: 여러 입력 오류/최초 포커스·원본 보존, 초과 매도 수량 위치/정상 재시도/오류 제거, 부호 있는 출금/0거절/곱 범위 초과. UI151 PASS. 전체 회귀920 PASS/Android 계약3 PASS/FAIL0/SKIP0. master-qa-20261019170746744.json. 구문/diff check PASS.
- 실제 headless Chrome fixture:초과 매도 수량 오류→해당 입력 포커스/속성/원본 유지→input 이벤트로 오류 속성 제거→유효 수정 저장 확인. 기존 전체 흐름 및4폭×2테마 회귀 PASS. data/v2/verification/paper-edit-errors-web-20261020.json. 임시 Chrome/HTTP 서버 종료. 신규 오류 화면 자체의 모든 폭/VoiceOver/TalkBack·Galaxy/iPhone 검증은 이번 NOT RUN.
- 추가 저장소·권한·API 요청·외부 자료 수집·운영 배포·실거래 없음. 실제 주식수 원천 확인은 별도 백엔드 업무 유지. 가상 fixture 기능 검증이며 전체 PARTIAL/추천 HOLD.

---

# Galaxy 모의 기록 모바일 회귀·검증 도구 — 2026-10-20 KST

- 프로젝트/origin/branch·ARI compliance·기존 변경 확인/보존. 운영 kstock.ai.kr/ari-prod-01 변경 없음. 최근 추가 기능의 모바일 미검증 항목 중 페이지/수정 취소/개별 삭제 복구를 실제 Galaxy A33에서 확인했다.
- 가상 입출금45건 fixture로 실제 다음 기록 터치→2/3페이지·첫 기록 mobile-20, 기록 수정 터치→편집 중, 취소→원본45건, 해당 카드 삭제→44건·복구 가능, 되돌리기→45건·사본 제거 PASS. DOM 상태를 임시 QA 화면에 표시해 접근성 XML 및 실제 화면과 대조했다. /tmp/kstock-galaxy-ledger-edit-20261020.png 및 undo 캡처. data/v2/verification/galaxy-paper-ledger-20261020.json.
- 초기 임시 검증 상태 전송은 네이티브 허용 API 경계로 차단되어 화면 상태 방식으로 바꿨다. 재연결 뒤 기존 화면 잔존과 접근성 이름/텍스트 차이로 발생한 도구 실패를 수정하고 재실행했다. 제품 API 허용 범위·네이티브 소스·앱 데이터/설정은 변경하지 않았다. 이 실패를 제품 기능 PASS로 간주하지 않았으며 최종 실제 흐름을 별도로 확인했다.
- 재현 도구 추가: scripts/serve-paper-ledger-mobile-qa.mjs(루트에서 실행하는127.0.0.1:3000 전용 가상 서버) 및 scripts/galaxy_paper_ledger_qa.py(기존 전경 보호기 사용·실제 터치/상태 대조). 현재 receipt의 실제 실행은 같은 도구의 /tmp 개발본이며 저장소 버전은 경로 일반화/초기 단계 복원 후 Node 구문·Python AST 검증을 수행했다. 저장소 버전의 처음부터 끝까지 재실행은 NOT RUN.
- 재현 순서: 기존 로컬3000 사용 여부 확인 → node scripts/serve-paper-ledger-mobile-qa.mjs → 기존 검증 앱을 새 fixture로 실행(USB tcp3103→3000) → python3 scripts/galaxy_paper_ledger_qa.py. 앱 설치/데이터 삭제/기기 설정 변경은 스크립트에 포함하지 않는다. QA 버튼/상태는 임시 fixture에만 삽입하며 운영 UI에는 추가하지 않는다.
- 이번 제품 코드 변경 없음. 마지막 전체 회귀917/Android 계약3 PASS는 이전 실행(master-qa-20261019165919118.json)이며 이번 재실행 수치로 주장하지 않는다. 신규 스크립트 구문/diff check PASS. 날짜 선택기·정렬 선택기·변경값 저장·모든 종류 필터·iPhone 및 전체 접근성 QA는 미검증으로 유지.
- 임시 서버·검증 앱 종료, 기존 USB 매핑 보존. 새 자료 수집·실제 주문·운영 배포 없음. 실제 주식수 원천 업무는 별도 유지. 모바일의 위 제한된 기능 fixture PASS이며 전체 PARTIAL/추천 HOLD.

---

# 조회 조건별 모의 기록 금액 요약 — 2026-10-20 KST

- 프로젝트/origin/branch·ARI compliance 및 기존 변경 확인/보존. 운영 kstock.ai.kr/ari-prod-01 배포 없음.
- 현재 종류/종목/날짜 조건에 맞는 모든 페이지의 입력 금액을 합산한다. 통화별 매수 원가·비용, 입금/출금/순입출금, 매도 총액/비용/순수령, 사용자 가정 배당 순수령 및 종류별 건수 표시. 서로 다른 통화 합산/종목 간 수량 합산 없음.
- 현재 페이지의 합계가 아님을 명시한다. 매도 순수령은 실현 손익이 아니며 보유 수량·현금 잔액·수익률이나 권리 검증 결과로 표현하지 않는다. 날짜 오류 시 합계를 보류하고 비유한 값/합계는 수치 범위 확인 필요로 표시. 일치 기록 없음은 별도 안내한다. 원본·백업·계산·서버 Gate는 유지한다.
- 신규3개: 입금/출금·비용 차감 매도·가정 배당 구분, 여러 페이지 합계/기간 축소/백업 보존, 통화 분리·날짜 오류·비유한 합계 보류. UI148 PASS. 전체 회귀917 PASS/Android 계약3 PASS/FAIL0/SKIP0. master-qa-20261019165919118.json. 구문/diff check PASS.
- 실제 headless Chrome fixture:500건 전체 입금125250 KRW가 마지막 페이지에서도 동일, 날짜 축소 시1건500 KRW, 백업 원본 동일 확인. 기존 전체 기능 회귀,4폭×2테마 및 요약 펼친320/390px 넘침 없음. data/v2/verification/paper-record-summary-web-20261020.json. 임시 Chrome/HTTP 서버 종료. Galaxy/iPhone 신규 합계 QA는 이번 NOT RUN.
- 추가 저장소·권한·API 요청·외부 금융 자료 수집·실거래·운영 배포 없음. 실제 주식수 원천 확인은 별도 백엔드 업무 유지. 가상 fixture 기능 검증이며 전체 PARTIAL/추천 HOLD.

---

# 모의 기록 조회 날짜 범위 — 2026-10-20 KST

- 프로젝트/origin/branch·ARI compliance·기존 변경 확인/보존. 운영 kstock.ai.kr/ari-prod-01 배포 없음.
- 기록 조회 시작일/종료일 추가. 양 끝 날짜 포함·같은 날 조회·한쪽 날짜만 지정 가능. 거래 날짜가 있는 입출금/매도/가정 배당을 필터링한다. 매수의 가격 기준일은 거래일이 아니므로 날짜 조회 중 매수를 숨기고 이를 고지한다. 계산 시작/종료일과는 별도이며 백업에도 조회 조건을 넣지 않는다.
- 실제 날짜/브라우저 badInput/역순 범위를 확인하여 잘못된 조회는 빈 목록과 안내·aria-invalid로 표시한다. 원본·성과·CSV·백업·계산버전은 유지한다. 날짜 변경 시 페이지 초기화, 표시 조건 초기화/오류 위치 이동에서 조회 날짜도 제거한다. 숨겨진 기록도 계산/백업/전체 비우기에 포함하는 기존 정책 유지.
- 신규3개: 경계/같은날·매수 제외·백업/계산기간 보존, 불가능한 날짜/역순·안내·복구, 열린 범위·페이지 초기화·API 미요청. UI145 PASS. 전체 회귀914 PASS/Android 계약3 PASS/FAIL0/SKIP0. master-qa-20261019165804261.json. 구문/diff check PASS.
- 실제 headless Chrome fixture:500건에서 같은날 조회로 p499 한 건만 표시, 역순 입력에서 빈 결과/오류 속성, 백업/계산버전 동일, 조건 초기화 확인. 기존 기능/페이지/정렬 회귀,4폭×2테마 및 추가320/390px 넘침 없음. data/v2/verification/paper-record-range-web-20261020.json. 임시 Chrome/HTTP 서버 종료. Galaxy/iPhone 날짜 선택 UI/신규 동작 QA는 이번 NOT RUN.
- 추가 저장소·권한·API 요청·실제 자료 수집·실거래·운영 배포 없음. 실제 주식수 원천 확인은 별도 백엔드 업무 유지. 가상 fixture 기능 검증이며 전체 PARTIAL/추천 HOLD.

---

# 모의 기록 날짜 정렬 — 2026-10-20 KST

- 프로젝트/origin/branch·ARI compliance·기존 변경 확인/보존. 운영 kstock.ai.kr/ari-prod-01 배포 없음.
- 기록 표시 순서에 등록 순서/날짜 최신순/과거순 추가. 입출금·매도·가정 배당은 날짜로 정렬하며 같은 날짜는 등록 순서를 유지한다. 매수의 date는 가격 기준일이므로 거래일로 오인하지 않도록 매수는 등록 순서를 유지하고 화면에 설명한다.
- 원본 배열이 아닌 필터 결과 사본을 정렬하여 계산·동일일 거래 순서·백업 원본을 보존한다. 정렬 변경은 페이지를 초기화하고 성과/CSV/계산버전은 유지한다. 조건 초기화/오류 위치 이동에서 정렬도 등록 순서로 복귀. 정렬된 카드의 삭제/복구는 원본 위치를 정확히 사용한다. 페이지 안내에 적용 순서를 표시한다.
- 신규3개: 날짜 방향/동일일 안정성·백업/계산버전 보존, 매수 가격일 정렬 제외, 정렬 후 페이지 초기화·원본 삭제/복구. UI142 PASS. 전체 회귀911 PASS/Android 계약3 PASS/FAIL0/SKIP0. master-qa-20261019165648516.json. 구문/diff check PASS.
- 실제 headless Chrome fixture:500건 중 늦은 날짜의 마지막 등록 기록이 최신순 첫 항목, 과거순은 기존 p0/p1 동일일 순서 유지, 마지막 페이지에서 정렬 변경 시0페이지, 백업/계산버전 동일 확인. 기존 전체 기능·500건 페이지 회귀,4폭×2테마 및 정렬 화면320/390px 넘침 없음. data/v2/verification/paper-record-sort-web-20261020.json. 임시 Chrome/HTTP 서버 종료. Galaxy/iPhone 신규 정렬 QA는 이번 NOT RUN.
- 추가 저장소·권한·API 요청·외부 자료 수집·운영 배포·실거래 없음. 실제 주식수 원천 확인은 별도 백엔드 업무 유지. 가상 fixture 기능 검증이며 전체 PARTIAL/추천 HOLD.

---

# 모의 기록 20건 페이지 표시 — 2026-10-20 KST

- 프로젝트/origin/branch·ARI compliance 및 기존 변경 확인/보존. 운영 kstock.ai.kr/ari-prod-01 배포 없음.
- 매수/입출금/매도/가정 배당을 종류별 페이지당 최대20건만 DOM에 표시한다. 조건 일치 건수·현재 페이지/전체 페이지·등록 순서·이전/다음 버튼 제공. 경계 버튼 비활성화, 이동 후 해당 목록에 포커스/스크롤. 전체 기록 수·조건 일치 수와 실제 현재 페이지 표시 수를 구분한다.
- 필터 변경/초기화 및 오류 위치 이동에서 페이지도 초기화한다. 삭제/교체 등으로 마지막 페이지가 없어지면 유효한 페이지로 보정한다. 페이지 전환은 원본 배열·계산버전·백업·기존 성과를 바꾸지 않는다. 계산/백업/모두 비우기는 모든 페이지를 포함한다.
- 신규3개: 입출금500건의20개 DOM/다음·마지막 페이지/백업 전체 보존, 마지막 페이지 삭제 후 보정·복구, 필터 페이지 초기화·모두 비우기. UI139 PASS. 전체 회귀908 PASS/Android 계약3 PASS/FAIL0/SKIP0. master-qa-20261019165525260.json. 구문/diff check PASS.
- 실제 headless Chrome fixture: 입출금500건의 첫/마지막 페이지 모두 카드20개, 다음 페이지 첫 ID p20/마지막 ID p499, 마지막 다음 버튼 비활성, 이동 후 목록 포커스, 백업500건 및 바이트 동일 확인. 기존 계산/매도/배당/백업/CSV/수정/삭제복구/필터 회귀,4폭×2테마와500건 페이지320/390px 넘침 없음. data/v2/verification/paper-record-paging-web-20261020.json. 임시 Chrome/HTTP 서버 종료. 모든 종류 동시 최대 부하/기기 성능 수치·Galaxy/iPhone 신규 동작 QA는 이번 NOT RUN.
- 새 저장소·권한·API 요청·실제 금융 자료 수집·운영 배포·실거래 없음. 실제 주식수 원천 확인은 별도 백엔드 업무 유지. 기능 fixture 검증이며 전체 PARTIAL/추천 HOLD.

---

# 모의 기록 종류·종목 코드 필터 — 2026-10-20 KST

- 프로젝트/origin/branch·ARI compliance·기존 변경 확인/보존. 운영 kstock.ai.kr/ari-prod-01 배포 없음.
- public/app.js/index.html: 전체/매수/매도/입출금/가정 배당 기록 종류와 종목 코드 부분 검색, 조건 초기화 및 전체/표시 건수 추가. 영문 코드는 대소문자 구분 없이 찾는다. 종목 코드 검색 중 종목이 없는 입출금은 숨겨지며 이를 화면에 고지한다. 각 종류의 조건 일치 기록 없음도 안내한다.
- 필터는 원본 배열을 변경하지 않는다. 전체 계산·백업·모두 비우기·매수 합계는 숨겨진 기록을 포함하며 이를 화면에 명시한다. 필터 변경은 성과/CSV/수정 세션/백업 미리보기를 무효화하지 않는다. 표시된 카드의 수정·삭제는 원본 객체에 연결, 삭제 복구 시 원래 순서와 현재 표시 조건을 유지한다.
- 입력 점검의 문제 위치 이동은 필터를 초기화하여 숨겨진 오류 기록을 드러낸 후 대상 영역에 포커스한다. 새로운 영구 저장·권한·API 요청 없음.
- 신규4개: 종류/종목 일치·백업/계산버전 보존, 영문 검색/입출금 제외/초기화, 필터 상태 특정 기록 삭제·복구, 오류 이동 시 표시 초기화. UI136 PASS. 전체 회귀905 PASS/Android 계약3 PASS/FAIL0/SKIP0. master-qa-20261019165349199.json. 구문/diff check PASS.
- 실제 headless Chrome fixture: 종류 변경/검색 input 이벤트→전체2건 중1건/0건 표시→백업·계산버전 동일→초기화2건 및 검색 입력 포커스. 기존 계산/매도/배당/백업/CSV/수정/삭제 복구/백업 비교 회귀, 4폭×2테마 및 추가320/390px 넘침 없음. data/v2/verification/paper-record-filter-web-20261020.json. 임시 Chrome/HTTP 서버 종료. Galaxy/iPhone 신규 동작 QA·최대 기록 부하 검증은 이번 NOT RUN.
- 실제 주식수 원천 확인은 별도 백엔드 업무 유지. 외부 자료 수집·운영 배포·실거래 없음. 모든 기능 검증은 가상 fixture 범위이며 전체 PARTIAL/추천 HOLD.

---

# 백업 교체 전후 요약·미리보기 취소 — 2026-10-20 KST

- 프로젝트/origin/branch·compliance 및 기존 변경 확인/보존. 운영 대상 kstock.ai.kr/ari-prod-01 배포 없음.
- 백업 검증 후 현재 → 불러올 백업 순서로 매수/매도/입출금/가정 배당 건수, 종목별 매수 수량·비용 포함 원가, 가상 매도 순수령·순입출금·가정 배당 합계, 시작 현금·계산 기간을 표시한다. KRW/USD와 종목을 분리하며 미설정/자동 계산도 명시한다. 합계는 입력 기록의 참고 요약이며 시세·투자 수익 검증이 아니다. 비유한 합계는 숫자로 표시하지 않는다.
- 같은 건수라도 원가 변화가 보인다. 다만 개별 날짜/가격의 완전한 차이 비교가 아니므로 합계가 같아도 기록이 다를 수 있음을 고지한다. 병합이 아닌 전체 기록/계산 조건 교체이고 개별 삭제 되돌리기로 복구 불가함을 알린다. 기존 기록을 먼저 백업하도록 안내한다.
- 미리보기 취소는 현재 기록과 붙여넣은 텍스트를 유지하며 보류 중 백업 사본·요약을 제거하고 적용을 비활성화한다. 원본 입력 변경·불량 백업·적용 완료 시 이전 요약도 제거한다. 새 영구 저장·권한·API 요청·외부 전송 없음.
- 신규4개: 동일 건수/서로 다른 원가와 통화 구분·원본 불변, 취소/텍스트 보존/적용 금지, 변경/불량/적용 후 요약 제거, 빈 백업의 삭제 예정 표시·API 미요청. UI132 PASS. 전체 회귀901 PASS/Android 계약3 PASS/FAIL0/SKIP0. master-qa-20261019165145963.json. 구문/diff check PASS.
- 실제 headless Chrome fixture: 원가450 → 270 요약·현재 원본 불변·취소 후 텍스트 유지/적용 비활성 확인. 기존 계산/백업/CSV/삭제 복구/수정 흐름 회귀 및4폭×2테마, 요약 펼친320/390px 넘침 없음. data/v2/verification/paper-backup-preview-web-20261020.json. 임시 Chrome/HTTP 서버 종료. Galaxy/iPhone 신규 동작 QA는 이번 NOT RUN.
- 실제 주식수 원천 확인은 별도 백엔드 업무 유지. 외부 자료 수집·실거래·운영 배포 없음. 모든 검증은 가상 fixture 기능 검증이며 전체 PARTIAL/추천 HOLD.

---

# 모의 기록 수정·저장·취소 — 2026-10-20 KST

- 프로젝트/origin/branch·ARI compliance 확인 및 기존 미커밋 보존. 운영 kstock.ai.kr/ari-prod-01 배포 없음.
- public/app.js/index.html: 매수·입출금·매도·가정 배당 카드에 기록 수정 버튼 추가. 공통 수정 영역으로 이동·첫 입력 포커스. 종목/통화/내부ID/기록 순서를 유지하며 날짜·수량·가격·비용·입출금/배당 금액을 수정한다. 입출금은 양수 입금/음수 출금으로 안내.
- 편집 중에는 원본 불변. 수정 취소는 계산 결과를 무효화하지 않는다. 저장 시 전체 기록 초안을 기존 백업 검증 계약으로 검사한 뒤 한 건만 교체한다. 빈 필드·실재하지 않는 날짜·0/음수 금액·비유한값/큰 수·매수 수량 축소 또는 매도 증가에 따른 초과 매도는 저장 거부, 초안과 원본 유지. 거래일·기간·현금 흐름 및 원천자료는 기존 계산 Gate로 별도 검증한다.
- 저장 성공 시 성과/CSV/입력 점검/삭제 되돌리기 사본/백업 미리보기 무효화. 다른 기록·계산 입력 변경, 백업 적용, 모두 비우기는 수정 세션과 입력 DOM을 지워 오래된 수정 내용의 덮어쓰기를 막는다. 저장 전 수정 내용은 계산/백업에 포함되지 않음을 고지. 추가 영구 저장·권한·서버 수집 없음.
- 신규5개: 네 종류 수정/식별자·순서 보존, 양쪽 초과 매도 거부, 날짜/빈 입력/범위 오류와 API 미요청, 취소 원본·계산 버전 보존, 모두 비우기 후 오래된 저장 차단. UI128 PASS, 최종 전체 회귀897 PASS/Android 계약3 PASS/FAIL0/SKIP0. master-qa-20261019164915429.json. 구문/diff check PASS.
- 실제 headless Chrome fixture: 카드 수정 버튼→첫 입력 포커스→매수 수량 축소 거절→매수가/수량 정상 저장→매도가 수정 취소. 기존 계산/매도/배당/백업/CSV/입력 점검/삭제 되돌리기 회귀, 4폭×2테마 및 수정 화면320/390px 넘침 없음. data/v2/verification/paper-edit-web-20261020.json. 임시 Chrome/HTTP 서버 종료. 모든 수정 항목의 모바일 전수 검증·Galaxy/iPhone 신규 동작 QA는 이번 NOT RUN.
- 실제 주식수 근거 확인은 별도 백엔드 업무 유지. 외부 자료 수집·운영 배포·실거래 없음. fixture 검증은 실종목 데이터 정확성 근거가 아니며 전체 PARTIAL/추천 HOLD.

---

# 모의 기록 개별 삭제 되돌리기 — 2026-10-20 KST

- 프로젝트/origin/branch·compliance 및 기존 변경 확인/보존. 운영 대상 kstock.ai.kr/ari-prod-01 배포 없음.
- 매수·입출금·매도·가정 배당의 마지막 개별 삭제 한 건을 원래 배열 위치에 복원한다. 개별 삭제 후 공통 되돌리기 버튼으로 포커스 이동, 상태 안내 제공. 두 번째 삭제는 이전 사본을 교체하며 무제한 이력을 쌓지 않는다.
- 다른 입력·기록 변경/백업 적용/모두 비우기 시 되돌리기 사본 제거. 모두 비우기 자체는 되돌리지 않는다. 마지막 활성 기록을 삭제해도 사본이 있으면 나가기 경고와 모두 비우기 버튼을 유지한다. 화면에 메모리 사본 존재와 제거 방법을 고지. 영구 저장·외부 전송·새 권한 없음.
- 복원은 이전 계산·CSV·입력 점검·백업 미리보기를 무효화한다. 매수 가격은 현재 검증 가격으로 재연결하거나 미확인 null 처리하며 삭제 당시 가격을 그대로 신뢰하지 않는다. 기존 서버 원천자료·권리 Gate 유지.
- 신규4개 테스트: 네 종류 복원/순서/계산 무효화, 마지막 사본과 모두 비우기, 입력 변경 후 복원 금지, 두 번째 삭제의 단일 사본 교체. UI123 PASS. 전체 회귀892 PASS/Android 계약3 PASS/FAIL0/SKIP0. master-qa-20261019164621787.json. 구문/diff check PASS.
- 실제 headless Chrome fixture에서 삭제 버튼 → 공통 되돌리기 버튼 포커스 → 복원 → 재삭제/모두 비우기 후 복원 불가 확인. 기존 계산/매도/배당/백업/CSV/입력 점검 흐름과 4폭×2테마 회귀, 추가320/390px 넘침 없음. data/v2/verification/paper-delete-undo-web-20261020.json. 임시 Chrome/HTTP 서버 종료. 이번 Galaxy/iPhone 실기기·시뮬레이터 신규 동작 QA는 NOT RUN.
- 실제 주식수 원천 확인은 별도 백엔드 업무 유지. 외부 자료 수집·실거래·운영 배포 없음. 전체 PARTIAL/추천 HOLD.

---

# 모의 기록 페이지 이탈 경고 — 2026-10-20 KST

- 프로젝트 경로/origin/branch 및 ARI compliance 확인, 기존 미커밋 보존. 운영 대상 kstock.ai.kr/ari-prod-01 배포 없음.
- public/app.js: 매수·입출금·매도·가정 배당 중 기록이 남아 있을 때만 beforeunload 처리기를 연결한다. 매수 없이 남은 입출금 등도 보호하며 마지막 기록 삭제·모두 비우기에서 처리기를 해제한다. 백업 텍스트 생성은 실제 파일 저장을 증명하지 않으므로 경고를 해제하지 않는다. 이벤트 처리 자체는 기록을 수정하거나 전송하지 않는다.
- public/index.html에 먼저 백업을 직접 저장하도록 안내. 브라우저 사용자 상호작용·종료 방식 및 WebView 지원에 따라 경고가 생략될 수 있으며 자동 저장/앱 강제 종료 복구를 보장하지 않는다. 새 저장소·권한·서버 보유 데이터 없음. 비우기는 기존 메모리와 백업 입력을 지우며 외부 저장 파일은 직접 삭제해야 한다는 기존 고지 유지.
- 신규3개 계약 테스트: 빈 상태/중복 연결/해제, 네 종류 기록과 이벤트 비변경, 백업 생성 후 경고 유지·모두 비우기. UI119 PASS, 최종 전체 회귀888 PASS/Android 계약3 PASS/FAIL0/SKIP0. master-qa-20261019163439434.json. 최초 제한 환경은 Java 임시 HTTP 소켓 Operation not permitted로 Android1 FAIL이었으며 해당 실패 기록을 보존했다. 로컬 소켓 허용 후 재실행에서 모두 통과. 구문/diff check PASS.
- 실제 headless Chrome에서 cancelable beforeunload 이벤트를 dispatch하여 기록 존재/백업 생성 후 preventDefault 및 비우기 후 미취소·처리기 해제를 확인했다. 기존 계산/입력 점검/백업/CSV 및 320/390/768/1440px×light/dark 회귀 PASS. data/v2/verification/paper-exit-guard-web-20261020.json. 실제 브라우저 종료 확인창·Galaxy/iPhone 종료 동작은 이번 NOT RUN이며 이벤트 검증과 구분한다. 임시 Chrome/HTTP 서버 종료.
- 실제 자료 수집·주식수 근거 검증·실거래·운영 배포 없음. 주식수 확인은 별도 백엔드 업무로 유지. 전체 PARTIAL/추천 HOLD.

---

# 모의 포트폴리오 계산 전 입력 점검 — 2026-10-20 KST

- 프로젝트/Git/compliance·기존 변경사항 확인 및 보존. 운영 배포 없음. 현재 입력 점검과 오류 위치 이동을 추가했다. 날짜·기간·매수/매도 수량·비용·가정 배당·입출금 형식 및 시작 현금을 확인한다. 삭제된 매수에 연결된 초과 매도도 차단한다.
- 장 시작 전 입출금 → 시작일 매수/비용 → 매도 → 가정 배당 순으로 알려진 현금 흐름을 점검한다. 당일 매도·배당으로 장 시작 전 출금을 충당하지 않는다. 잘못된 입력은 API 요청 전에 차단하며 기록을 자동 수정하지 않는다. 문제 위치 이동은 접힌 영역을 열고 해당 입력에 포커스한다. 입력 변경 시 이전 점검·계산·보고서를 무효화한다.
- 로컬 통과와 서버 원천자료 검증을 구분한다. 거래일·RAW 가격·기업행동·자료 최신성·요청기간 Gate는 유지한다. 서버 입력 거절(HTTP400)과 통신 오류 안내를 구분한다. 실제 주식수 미확인 사항은 별도 백엔드 업무로 유지한다.
- 회귀885 PASS / Android 운영 계약3 PASS / FAIL0 / SKIP0. 신규6개: 날짜/포커스, 매수 삭제 후 초과 매도, 현금 처리 순서, 수동 점검·오류 초기화, 서버400 안내·기록 보존, 로컬 통과 후 서버 보류. master-qa-20261019161417145.json. 구문/diff check PASS.
- Chrome fixture: 잘못된 시작 현금·날짜에서 요청0, 수정 후 정상 계산, 문제 입력 포커스, 오류 화면320/390px 가로 넘침 없음. 기존4폭×2테마×200% 및 매도/배당/백업/보고서 흐름 회귀. data/v2/verification/paper-precheck-web-20261020.json.
- Galaxy A33 실기기: 백업 복원 후 시작 현금 부족 안내 → 문제 위치 이동 → 시작 현금 입력 포커스 PASS. data/v2/verification/galaxy-paper-precheck-20261020.json. 기존 APK 재사용, 앱 데이터·설정 보존.
- iPhone17/iOS27 시뮬레이터 XCTest1 PASS/FAIL0/SKIP0: WKWebView에서 동일 오류와 입력 이동 확인. data/v2/verification/ios-paper-precheck-20261020.json. 물리 iPhone·전체 접근성 제스처 QA NOT RUN. 저장소 네이티브 소스/서명 변경 없음.
- 임시 fixture 서버·검증 앱 종료, 기존 USB 연결 보존. 모든 검증은 가상 fixture 기능 검증이며 실종목 정확성 근거가 아니다. 새 개인정보 수집·영구 서버 저장·외부 자료 수집·실거래 없음. 실제 자료/권리 등 미완료로 전체 PARTIAL/추천 HOLD 유지.

---

# 모의 성과 CSV 보고서 — 2026-10-20 KST

- 프로젝트/Git/compliance·미커밋 확인/보존, 운영 kstock.ai.kr 변경 없음. public/app.js/index.html/styles.css에 일별 잔액·손익 및 종목별 손익·기여도 CSV 생성/다운로드/텍스트 복사를 추가했다.
- 마지막 계산·대사 결과의 복사본과 현재 기록 버전을 연결. 기록·기간·시작 현금 변경, 복원, 재계산 시작 시 보고서/스냅샷/버튼을 초기화한다. 이전 결과·보류·잔액/기여도 대사 실패에서 내보내기 금지. 보고서 종류 변경 시 이전 텍스트 제거. 화면 구간/보유 상태 필터와 관계없이 전체 계산 기간을 내보낸다.
- 각 행에 실거래 성과 아님/가상 배당 시나리오 또는 배당 제외 가격수익/기간/통화 포함. 원본 수치 정밀도를 유지하며 화면 반올림과 구분. 종목 코드는 KR:005930 접두사로 앞자리0 보존. 기존 서버 Gate·공식 총수익/배당 권리 보류 유지.
- 고정 허용 필드만 CSV에 투영해 인증·추천/검증 메타데이터를 제외한다. 유한 수치·유효 날짜·검증된 KR 종목만 사용, 수식 형태 종목코드 거부. UTF-8 BOM/모든 셀 인용/파일 CRLF. 브라우저 textarea는 LF로 정규화하므로 복사 텍스트와 파일의 줄바꿈 차이를 구분해 검증했다.
- 보고서는 입력 복원용 JSON 백업과 구분. 읽기 전용 텍스트/브라우저 파일 저장, Android native wrapper는 다운로드 비활성화 후 텍스트 경로만 제공. 자동 클립보드 읽기/새 저장소 권한/파일 업로드/서버 보고서 저장/추가 시세 조회 없음. 평문 파일의 직접 삭제 및 기존 파일·OS/클라우드 복사본이 자동 변경/삭제되지 않음을 고지.
- 최종 회귀879 PASS / Android 운영 계약3 PASS / FAIL0 / SKIP0. master-qa-20261019160314671.json. 신규4개는 전체기간/정밀도/메타데이터 제외·BOM, 불량/수식형 코드 거부, 계산 후 활성화·기록 변경 무효화, 시나리오 고지/종류 전환 검증. 구문/diff check PASS, app.js 대상 제한된 private-key/AWS/GitHub secret 패턴0.
- Chrome 실제 fixture: 일별4행(헤더+3거래일)/종목별2행, 실제 파일 다운로드 바이트의 BOM/CRLF와 화면 LF 텍스트 내용 일치, KR 종목코드/가상배당 문구 확인. 기록 변경 시 텍스트 제거·버튼 비활성화, 보고서 폼 열린320/390px 가로 넘침 없음. 기존 4폭×2테마×200%·매도/배당/백업/일별/종목별 흐름도 회귀. data/v2/verification/paper-report-web-20261020.json.
- Galaxy A33 실제 복원→계산→가시 CSV 보고서 만들기 버튼→CSV 텍스트775자 및 생성 안내 가시성 PASS. data/v2/verification/galaxy-paper-report-20261020.json. /tmp/kstock-galaxy-report-20261020.png만 보관. OS 클립보드 복사 제스처/앱 파일 다운로드는 검증하지 않음. 기존 APK 재사용, 설치/데이터 삭제/기기 설정 변경 없음.
- iPhone17 시뮬레이터 임시 XCTest1 PASS/FAIL0/SKIP0: WKWebView 실제 CSV 생성 버튼/생성 안내 확인. data/v2/verification/ios-paper-report-20261020.json, /tmp/kstock-paper-ios-20261020/report-result.xcresult. 네이티브 파일 다운로드·물리 iPhone QA NOT RUN. 저장소 iOS 앱 소스/서명/계정 변경 없음.
- 임시 fixture 서버·검증 앱 종료, USB tcp3103→3000 보존. 실종목 수익/공식 배당 검증이 아닌 기능 fixture QA. 새 개인정보 수집/계좌/영구 서버 저장/운영 배포·실거래 없음. 실제 자료·권리·물리 iPhone 등 미완료로 전체 PARTIAL/추천 HOLD 유지.

---

# 종목별 모의 손익·전체 기간 수익 기여도 — 2026-10-20 KST

- 프로젝트/Git/compliance 및 기존 미커밋·데이터 확인/보존. 운영 kstock.ai.kr 변경 없음. 주식수 공식 근거 미확인 업무는 별도 보류 유지.
- src/v2/paper_performance.js에 종목별 잔여 수량/원가/평가·실현/미실현/비용/가상배당/순손익 집계. 기존 평균 매수원가 정책 유지. 전량 매도 종목도 실현 손익과 이후 사용자 가정 배당 기록을 보존한다. 실제 배당 권리나 총수익을 확정하지 않는다.
- 일별 기여도 단순 합산 대신 C(t,i)=C(t-1,i)×(1+r(t))+일별기여도(t,i)로 연결, 합계가 전체 시간가중 누적 수익률과 맞는지 검증한다. 손익 합계0에서도 이익/손실 종목의 양/음 기여도를 유지하며 전체 손익으로 나누지 않는다. 입력된 중간 입출금은 수익에서 제외하고 기존 일별 분모 정책을 사용한다.
- 포트폴리오 비중은 전체 자산(현금 포함) 기준. 종목 비중 합계+현금 비중=100%, 종목별 손익/비용/배당/기여도 합계를 전체 결과와 대사. 비유한값 또는 대사 실패는 POSITION_RECONCILIATION/PENDING, 화면에 부족한 시세와 구분한 검토 안내.
- public/app.js: 종목별 카드와 전체/현재 보유/전량 매도 필터. 기간·현금 비중·손익 합계·순수령·비용·%p 기여도 표시. 기여도는 종목 자체 수익률이 아니며 공식 추천 순위가 아님. 유효한 일별 결과와 종목 집계 대사 후 표시하고 불완전/중복/불일치 상세는 보류한다. 기록 변경 시 기존 결과 전체 무효화. 백업에는 계산된 집계를 추가하지 않는다.
- 최종 회귀875 PASS / Android 운영 계약3 PASS / FAIL0 / SKIP0. master-qa-20261019155828301.json. 신규7개: 상쇄 손익·부호, 복리/입금과 기여도 연결, 전량 매도/가정배당/비용, 다중 매수 평균원가, UI 필터/비중, 불완전·불일치 상세, 대사 실패 안내. 구문/diff check PASS.
- Chrome 실제 fixture: 부분 매도 실현5.50+미실현17.50+가상배당7=순손익30, 현금 포함 비중·필터 확인. 전량 매도로 바꾸면 현금 비중100%/주식 비중0, 현재 보유 필터 빈 상태 및 전량 매도 기록 유지. 일별 화면/백업/매도/배당 및 320/390/768/1440×light/dark×200% 넘침 없음 회귀. data/v2/verification/paper-attribution-web-20261020.json.
- Galaxy A33 기존 검증 앱 실제 복원→계산→종목별 제목/카드 가시 확인. 입금100 fixture의 잔여1주/원가102.50/평가120/비중35.82%, 실현5.50/미실현17.50/가상배당7/순손익30, 비용4+3 및 기여도8.9431%p 가시 확인. data/v2/verification/galaxy-paper-attribution-20261020.json. /tmp/kstock-galaxy-attribution-full-card-20261020.png 캡처만 보관. 모든 모바일 필터/50종목 최대 부하 전수 QA는 NOT RUN.
- iPhone17 시뮬레이터 임시 XCTest1 PASS/FAIL0/SKIP0: 복원·계산·종목별 제목 스크롤 가시성. data/v2/verification/ios-paper-attribution-20261020.json, /tmp/kstock-paper-ios-20261020/attribution-result.xcresult. 종목 모든 필드/필터·전체 VoiceOver 제스처·물리 iPhone QA NOT RUN.
- fixture 서버·검증 앱 종료, USB tcp3103→3000/앱 데이터/기기 설정 유지. 새 계좌·개인정보 수집/저장·외부 자료 수집/운영 배포·실거래 없음. 모든 검증은 가상 fixture 기능 검증. 실종목 데이터·배당 권리·물리 iPhone 등 미완료로 전체 PARTIAL/추천 HOLD 유지.

---

# 일별 모의 자산·현금·손익 표와 추이 — 2026-10-20 KST

- 프로젝트/Git/compliance 확인, 기존 미커밋·데이터 보존. 운영 kstock.ai.kr 변경 없음. src/v2/paper_performance.js의 기존 계산 point에 당일 순입출금·누적 순입출금·순손익·비용·가상배당·고점 대비 낙폭을 추가, 기존 수익률/매매/기업행동 Gate 유지.
- public/app.js: READY/KRW/가격수익 또는 사용자배당시나리오 결과에만 일별 뷰 제공. 날짜/순서/유한값/현금+주식평가=자산/입출금 제외 순손익/실현+미실현+배당/마지막 요약/MDD를 대사한 뒤 표시. 부동소수점 오차 허용을 작은 절대값+기계 정밀도로 제한, 큰 자산 규모의 1원 불일치도 거부하는 회귀 확인. 필드 누락·불일치는 숫자/차트 표시 보류. 구버전 API에 일별 필드가 없으면 재시도/배포 정합성 확인 전 보류한다.
- 추이 지표: 총자산·현금·주식평가, 순손익, 시간가중 수익률, 낙폭. 최근20/60/전체 기간 전환, 20일 초과면 최근20 기본. 선택 구간에서도 수익률/낙폭은 원 계산 시작일 기준이며 새로 기준점을 만들지 않는다. 선 종류·단위·범위를 글로 표시하고 SVG 접근성 설명 제공.
- 표: 일자/총자산/현금/주식평가/당일입출금/누적순손익/실현·미실현/가상배당/비용/수익률/낙폭. 표 내부 가로 스크롤과 키보드 포커스, caption/행·열 헤더 제공. 입금에 따른 자산 증가와 투자 손익을 구분, 배당시나리오는 공식 총수익 아님을 유지. 기록 변경·지연 응답 시 차트/표도 함께 무효화.
- 최종 회귀868 PASS / Android 운영 계약3 PASS / FAIL0 / SKIP0. master-qa-20261019155220394.json. 신규5개: 일별 회계자료/지표·구간 전환/불량·누락 대사/비동기 응답 무효화/대규모 값의 1원 불일치. 구문/diff check PASS.
- 실제 Chrome 별도 fixture: 일별3행, 최종 자산235=현금115+주식120, 순손익30=실현5.50+미실현17.50+가상배당7 대사. 지표 전환·표 내부 스크롤/키보드 포커스·작은 화면 overflow 없음. 기존 매도/배당/파일 복원도 회귀. data/v2/verification/paper-timeline-web-20261020.json. 320/390/768/1440×light/dark×200% 글자 확인.
- Galaxy A33: 기존 검증 앱에서 fixture 백업 교체→실제 계산→일별 화면 진입/추이 선택기/총자산·현금·주식평가 SVG와 선·범위 설명 가시 확인. data/v2/verification/galaxy-paper-timeline-20261020.json. /tmp/kstock-galaxy-timeline-plot-20261020.png 등 캡처는 상태표시줄 때문에 Git 제외. 모바일 표 모든 열·모든 선택 지표/구간 조작은 이번 전수검증하지 않음.
- iPhone17 시뮬레이터 임시 XCTest1 PASS/FAIL0/SKIP0: 복원·재계산 및 스크롤 후 일별 제목 가시성. data/v2/verification/ios-paper-timeline-20261020.json, /tmp/kstock-paper-ios-20261020/timeline-result.xcresult. 전체 spoken labels/표 모든 열/물리 iPhone QA NOT RUN. 네이티브 소스/앱 설치/서명/기기 설정 변경 없음.
- fixture 서버·검증 앱 종료, USB tcp3103→3000 유지. 새 개인정보·저장·외부 SDK/수집·운영 배포·실거래 없음. 실종목 자료·배당 권리·물리 iPhone 등 미완료로 전체 PARTIAL·추천 HOLD 유지.

---

# 모의 기록 로컬 백업·복원 — 2026-10-20 KST

- 프로젝트/remote/auto/kstock-development-20260930·compliance·기존 변경 확인. 운영 kstock.ai.kr 변경 없음. public/paper-backup.js 및 기존 UI에 JSON 파일 다운로드/선택, 백업 텍스트, 미리보기 후 명시적 교체를 추가했다.
- 스키마 KSTOCK_USER_PAPER_LEDGER v1: 사용자 매수/매도/입출금/가상 배당, 시작 현금, 기간만 보관한다. 시세 스냅샷·추천·검증 상태·토큰·원래 내부 ID는 내보내지 않는다. 불러오기 시 새 ID를 부여해 후속 기록과 충돌 방지. 서버 파일 업로드·백업 저장·localStorage 자동 저장 없음. 계산 버튼을 눌렀을 때만 기존 계산 API로 가상 기록을 전송한다.
- 파일 최대256KiB, 버전/허용 필드/배열 한도/유효 날짜/통화/수치 범위/종목/매도 수량을 검증한다. prototype/시세/인증/검증 필드 주입 및 불량 파일은 거부하며 기존 기록 보존. 파일 읽기 뒤 기록이 바뀌면 지연 응답 폐기, 미리보기 이후 변경은 교체 버튼 비활성화. 확인 버튼만으로 기존 기록을 변경하지 않는다.
- 복원은 현재 조회된 기준가격만 연결한다. 기준가격이 없으면 null/평가·손익 보류, 새 분석 조회 후 기준가격 연결. 백업만으로 성과/권리/추천 검증 상태를 복원하지 않는다. 기존 서버 원주가·기업행동 Gate 및 가상 배당 시나리오 구분 유지.
- 사용자 고지: 파일/텍스트는 암호화되지 않은 가상 기록이며 파일 앱/다운로드에서 직접 삭제, OS/클라우드 복사본은 기기 설정에 따름. 전체 비우기는 탭 기록과 백업 텍스트/파일 선택을 지우지만 이미 저장한 파일은 지우지 않는다. 개인정보/계좌/서버 보유기간/새 계정 기능 추가 없음.
- 파일 기능을 제공하지 않는 Android native wrapper에서는 파일 버튼을 비활성화하고 텍스트 복사·붙여넣기 경로 제공. 새 저장소 권한/네이티브 파일 브리지/클립보드 자동 읽기 없음. iOS native 파일 저장·선택은 이번 미검증이며 텍스트 경로 검증과 구분한다.
- 최종 회귀863 PASS / Android 운영 계약3 PASS / FAIL0 / SKIP0. master-qa-20261019154342001.json. 신규8개는 백업 왕복/시세·인증 제외/스키마·수치 공격/임시 기록/미리보기·원자적 교체/가격 미확인/ID 재생성/지연 파일 경쟁을 검증. 구문/diff check PASS, 새 코드5파일 대상 private-key/AWS/GitHub secret 패턴0(범위 제한 검사).
- ios/validation-relay.mjs의 정적 GET 자산 목록에 paper-backup.js만 추가, POST/계좌/임의 경로 차단 유지. 관련 별도 ios/relay.test.mjs 4 PASS. LAN relay 실제 실행/노출/허용시간 변경 없음.
- Chrome 실제 JSON 다운로드→파일 선택→미리보기(현재 기록 유지)→교체→실현5.50/미실현17.50/가상배당7/순손익30 재계산 PASS. 불량파일 보존/네 가지 기록/빈 상태 복원/4폭×2테마×200% 및 백업 폼 열린320/390px 폭 유지 확인. data/v2/verification/paper-backup-web-20261020.json. 다운로드는 /tmp/kstock-backup-downloads-20261020-* fixture에만 생성. 최초 검증 스크립트 await 문법 오류는 수정 후 실제 왕복 통과.
- Galaxy A33 실제 텍스트 백업 생성→fixture 자동 복사/붙여넣기→가시 교체 버튼→계산 버튼→순손익30 PASS. OS 클립보드 제스처/파일 다운로드는 검증하지 않았음. data/v2/verification/galaxy-paper-backup-20261020.json, 결과 bounds[111,1081,969,1579]. 캡처 /tmp/kstock-galaxy-backup-visible-20261020.png만 보관. APK 변경/새 설치/앱 데이터 삭제/기기 설정 변경 없음.
- iPhone17 시뮬레이터 WKWebView 텍스트 미리보기→실제 교체/계산 버튼 XCTest1 PASS/FAIL0/SKIP0. data/v2/verification/ios-paper-backup-20261020.json, /tmp/kstock-paper-ios-20261020/backup-result.xcresult. 저장소 iOS 앱 소스·서명·계정 변경 없음. 물리 iPhone NOT RUN.
- 임시 fixture 서버/검증 앱 종료, USB tcp3103→3000 보존. 모든 수치 검증은 가상 fixture이며 실제 종목 성과/배당 검증이 아니다. 공식 근거·물리 iPhone 등 미완료로 전체 PARTIAL·추천 HOLD 유지, 운영 배포/실거래 없음.

---

# 사용자 가상 배당 시나리오 연결 — 2026-10-20 KST

- 프로젝트/Git/compliance 및 기존 변경 확인, 운영 kstock.ai.kr 변경 없음. 공식 배당 권리/지급일 근거 부족은 보류 유지. 이번 구현은 사용자가 입력하는 가상 순수령액이며 공식 배당 수집·권리 확정·실제 총수익률 구현이 아니다.
- 기존 계산 API에 선택적 dividends:[{id,ticker,date,amount}] 추가. KRW 가상 순수령 총액을 해당 거래일의 매매 뒤에 반영한다. 세율·보유 권리·주당액·지급일 자동 추정 없음. 순수령액이므로 원천세를 다시 차감하거나 매매 taxes에 합산하지 않는다. 전량 매도 후 지급도 사용자 가정으로만 허용하며 실제 권리를 인정하지 않는다.
- 종목/금액/날짜/기간/최대500건/중복 ID 검증. 비거래일은 PENDING이며 임의 이동하지 않음. 같은 날 매수·장 시작 전 출금을 가상 배당으로 충당할 수 없음. 입출금은 순손익 제외, 가상 배당은 별도 수입으로 합산.
- API는 고객이 보낸 verificationStatus 등으로 공식 검증 상태를 만들지 않는다. 서버 시세·기업행동 Gate 유지. 가상 배당 포함 응답은 basis=USER_DIVIDEND_SCENARIO, entitlementVerified=false, dividendMode=USER_NET_CASH_SCENARIO로 분리, 가격지수/공식 총수익 초과수익 비교 보류. 기존 배당 생략 요청은 가격수익 계약 유지.
- 화면: 가상 배당 입력/삭제/전체 비우기, 기록 변경 결과 무효화, 순수령액과 시나리오/권리 미검증 고지. 탭 메모리 및 기존 인증 계산 API만 사용, 서버 파일/DB 저장 없음. 공식 공시를 자동 반영했다고 표시하지 않는다.
- 최종 회귀855 PASS / Android 운영 계약3 PASS / FAIL0 / SKIP0. master-qa-20261019153445355.json. 구문/diff check PASS. 신규7개는 현금·손익 합산, 매도·배당 대사, 같은 날 자금 사용 차단, 검증되지 않은 권리 주장/입력/비거래일/기존 Gate/화면 추가삭제를 검증.
- Chrome 실제 로컬 fixture: 실현5.50+미실현17.50+가상 배당7=순손익30, 배당 삭제 후23 복구, 가격지수 비교 보류 및 삭제 후 복구 PASS. 활성 화면320/390/768/1440×light/dark×글자200% 실제 폭 유지/넘침 없음. data/v2/verification/paper-dividend-web-20261020.json.
- Galaxy A33 기존 검증 APK 실제 가시 계산 버튼→native POST→시나리오 고지·순손익30/가상배당7 표시 PASS. 입금100을 포함한 평가335이며 입금은 순손익 제외. 고지 bounds[111,884,969,1053], 결과[111,1092,969,1593] 모두 하단 메뉴 위에 가시. data/v2/verification/galaxy-paper-dividend-20261020.json. 캡처 /tmp/kstock-galaxy-dividend-visible-20261020.png만 보관. APK 재빌드/설치/설정 변경 없음.
- iPhone17 시뮬레이터 임시 XCTest1 PASS/FAIL0/SKIP0: WKWebView 실제 계산·순수령7·순손익30·시나리오 안내. data/v2/verification/ios-paper-dividend-20261020.json, /tmp/kstock-paper-ios-20261020/dividend-result.xcresult. 저장소 iOS 소스/계정/서명 변경 없음. 물리 iPhone 신규 QA NOT RUN.
- fixture 서버·검증 앱 종료, 기존 USB tcp3103→3000 보존. 외부 공식 자료 신규 조회/운영 배포/실거래 없음. 개인정보 수집 항목·계좌·스토어 변경 없음. 공식 배당/총수익·실종목 선행 자료·물리 iPhone은 미완료로 전체 PARTIAL·추천 HOLD 유지.

---

# 모의 매도·실현 손익 연결 — 2026-10-20 KST

- 프로젝트/remote/auto/kstock-development-20260930 및 compliance 확인, 기존 미커밋·데이터 보존. 운영 kstock.ai.kr 변경 없음. 주식수 백엔드 미확인 항목은 별도 유지.
- API에 선택적 sales 배열 추가. 기존 positions 시작일 매수 계약 유지, 가상 매도는 날짜 순서로 기존 엔진에 연결. 같은 날은 시작일 매수 후 매도, 매도끼리는 등록 순서. 매수 비용 포함 평균 원가로 실현 손익 계산, 매도 수수료·세금 반영. 실제 세율·브로커·주문·자동 매도 연결 없음.
- 매도 ID/중복/수량/가격/비용/보유 종목/기간/최대 총500매매 검증. UI 매도 최대450건. 비거래일·보유량 초과는 서버 엔진이 PENDING, UI에서도 남은 수량 초과 차단. 시작 전 입출금 정책 유지: 같은 날 매도 대금으로 장 시작 전 출금을 충당하지 않음.
- 화면에 KRW 가상 매도 입력·삭제/전체 비우기 연결. 기록 변경 시 기존 성과·지연 응답 무효화. 위 참고 손익은 매수 기록 기준, 매도 반영은 아래 누적 성과임을 명시. 기존 비용 생략/매도 생략 요청 호환. 배당·환전은 미연결.
- 대상 UI/API101 PASS. 최종 전체848 PASS / Android 계약3 PASS / FAIL0 / SKIP0, master-qa-20261019152947566.json. 구문/diff check PASS.
- 실제 Chrome 별도 fixture: 2주×100+매수비용5, 1주×110−매도비용2, 종료가120 → 실현5.50+미실현17.50=순손익23.00. 초과매도 차단, 삭제 후 재계산 순손익35, 전체 비우기 확인. 활성 모의 화면320/390/768/1440 × light/dark × 글자200% 폭 유지/가로 넘침 없음. data/v2/verification/paper-sales-web-20261020.json.
- Galaxy A33 기존 검증 APK 재사용, 새 native 변경/build/install 없음. fixture 자동 입력 후 실제 가시 계산 버튼 탭→Android native POST→서버 계산→실현5.50/미실현17.50/순손익23/수수료4/세금3 표시 PASS. 입금100 포함 평가328이며 순손익에 입금 제외. 결과 bounds [111,1075,969,1494] 가시 영역 확인. data/v2/verification/galaxy-paper-sales-20261020.json. 캡처 /tmp/kstock-galaxy-sales-visible-20261020.png만 보관. 최초 자동 버튼 탐색은 로딩 시점으로 탭되지 않았으며, 실제 가시 버튼 재탭 후 검증했다.
- iPhone17 시뮬레이터 별도 /tmp 임시 XCTest 1 PASS/FAIL0/SKIP0. WKWebView의 실제 계산 버튼·POST 및 같은 실현/미실현/비용 값 확인. data/v2/verification/ios-paper-sales-20261020.json, /tmp/kstock-paper-ios-20261020/sales-result.xcresult. 물리 iPhone QA NOT RUN, 저장소 iOS 소스/서명/계정 변경 없음.
- fixture는 실제 종목 수익률/투자 성과 검증이 아니다. 서버·검증 앱 종료, USB tcp3103→3000 보존. 새 개인/계좌 정보 수집·영구 저장·운영 배포 없음. 입력은 탭 메모리/기존 인증 계산 API만 사용. 이번 기능 범위 PASS, 실종목 자료/배당/물리 iPhone 등 미완료로 Overall PARTIAL·추천 HOLD 유지.

---

# 모의 비용·입출금 모바일 경로 검증 — 2026-10-20 KST

- AGENTS/compliance/프로젝트 remote/auto/kstock-development-20260930 및 미커밋 확인. 운영 대상 kstock.ai.kr 변경 없음. 기존 데이터·앱 설정·서명키 보존.
- Galaxy A33(RFCW1178RRE)에서 기존 로컬 검증 APK의 POST 차단을 재현. android/build-local-validation.py가 api=false로 치환하여 API POST까지 일반 문서 변경 요청으로 분류한 원인. 검증용 고정 http://127.0.0.1:3103 원점 제한은 유지하고 API 분류는 보존, 로컬 복사본의 토큰 요구 부분만 제외하도록 수정. 운영 ApiClient/인증·주문 차단 코드는 변경하지 않았다.
- 동일 기존 검증 서명 지문을 확인하여 android/build/local-validation-gpcs_2c8/validation.keystore를 재사용, build/sign/verify/install -r/launch PASS. APK android/build/local-validation-te44a1zu/build/release/k-stock-ai-local-validation.apk. 앱 데이터 삭제/기기 설정 변경/새 서명키 생성 없음. APK/키는 Git 제외 확인.
- public/styles.css: 모의 입력칸 grid 최소 폭을 0/100%로 제한. 활성 모의 화면·200% 글자에서 작은 뷰포트가 약460px로 확대되던 문제 수정. 기존 Chrome 검사에서 innerWidth 비교만으로 이 현상을 놓칠 수 있어, 실제 활성 화면의 320/390/768/1440 폭 유지도 재확인했다. 4폭×light/dark, overflow 없음. public/index.html의 누적 시계열 미연결 고정 문구를 조건부 계산 안내로 갱신.
- Galaxy 실제 가시 버튼 탭→native fetch POST→서버 계산→표시 PASS. 별도 fixture: 시작105, 가상 매수100/수수료3/세금2, 입금100, 종료 종목가120 → 평가220/순입출금100/입출금 제외 순손익15. 결과 전체 bounds [111,887,969,1306]으로 하단 메뉴에 가리지 않는 가시 영역 확인. data/v2/verification/galaxy-paper-cash-20261020.json. 캡처는 상태표시줄 때문에 Git 제외 /tmp/kstock-galaxy-cash-visible-20261020.png에만 보관.
- iPhone17/iOS27 시뮬레이터: 기존 앱 소스와 Xcode 프로젝트를 /tmp/kstock-paper-ios-20261020에 복사, fixture 전용 XCTest만 추가한 임시 프로젝트로 WKWebView 실제 계산 버튼/POST 및 순입출금100·순손익15·수수료3·세금2를 검증. XCTest 1 PASS/FAIL0/SKIP0. data/v2/verification/ios-paper-cash-20261020.json, 결과 bundle /tmp/kstock-paper-ios-20261020/ledger-result.xcresult. 최초 타깃 이름 오류는 실제 KStockUITests 타깃으로 정정 후 통과. 저장소 iOS 소스/계정/프로비저닝 변경 없음. 물리 iPhone15는 paired/available이며 연결 상태가 아니어서 이번 물리 iPhone QA NOT RUN. 새 LAN relay/로컬 네트워크 권한 요청 없음.
- 최종 전체 회귀843 PASS / Android 운영 계약3 PASS / FAIL0 / SKIP0. master-qa-20261019151450759.json. git diff --check PASS. 모바일 fixture 서버만 종료하고 Galaxy 검증 앱만 종료, 기존 USB tcp3103→3000 유지. 실제 시세/성과/주문 검증이 아닌 fixture 기반 모바일 기능 검증이다.
- 맥미니 job9d6bce6c-d554-4275-8db0-47373cdf75ed는 2026-10-20 00:06:52 KST EVIDENCE_RECORDED 종료. 실행영수증상 외부 수집 NOT_RUN, 쓰기 목록은 package.json/전용 보고서이며 주식수 신규 근거 확보 증명 없음. 제출 보고서의 pipeline/9시간 cutoff 변경 주장은 이번 쓰기 영수증으로 확인되지 않아 인정하지 않는다. 전용 KSTOCK_SHARE_BACKEND_REPORT.md에 검토 기록. 주식수 위임 업무는 미완료, 추천 HOLD 유지. 무인 반복 실행은 등록하지 않음.
- 이번 모바일 범위 PASS. 물리 iPhone·실종목 데이터/기업행동·주식수 근거 등은 미완료로 전체 PARTIAL 유지.

---

# 모의 포트폴리오 비용·현금 입출금 연결 — 2026-10-20 KST

- 동일 프로젝트/remote/auto/kstock-development-20260930 및 기존 변경 보존. 운영 대상 kstock.ai.kr 변경 없음. 맥미니 주식수 job 9d6bce6c-d554-4275-8db0-47373cdf75ed는 마지막 확인 RUNNING, 결과 확보로 간주하지 않는다. 담당에서 제외한 모의 포트폴리오 범위를 현재 Codex가 구현.
- 기존 계산 엔진에 API/UI 연결: 매수 수수료·세금을 0으로 덮어쓰지 않고 반영. 시작 현금은 양수 직접 입력 또는 비워두면 매수액+비용 합계. 시작 거래일에 전체 가상 매수, 장 시작 전 KRW 입출금만 지원. 입금/출금을 손익에서 제외하고 시간가중 수익률 계산.
- API 입력에 음수/비정상 비용, 잘못된/중복 입출금 ID, 날짜·기간·시점·수량 한도 검증. 실제 거래일이 아닌 입출금과 출금 가능 현금 부족은 PENDING. 주식 자동 매도나 날짜 보간 없음. 과다 출금 사유와 거래일 오류를 화면에 구분.
- API 응답에 initialCash/netCashFlows 및 계산 실패 reason 제공. 기존 비용 생략 요청은 0 비용 계약 호환. 시세·기업행동 증빙은 서버 저장 자료만 사용하며 고객 입력으로 승인하지 않음. 실제 자료가 부족하면 기존 보류 유지.
- 화면: 입출금 추가/삭제, 시작 현금, 순입출금·입출금 제외 순손익·수수료·세금 표시. 기록/현금 변경 시 이전 결과와 지연 응답 무효화. 전체 비우기는 입출금과 시작 현금도 초기화. 탭 메모리 보관, 계산 시 기존 인증 API 전송, 서버 파일/DB 저장 경로 없음. 실제 계좌/입출금 연결 없음.
- 검증: UI fixture91 PASS, 신규 서비스5 PASS. 전체 회귀843 PASS / Android 계약3 PASS / FAIL0 / SKIP0. master-qa-20261019150626477.json. 이후 비거래일 fixture를 실제 주말 공백으로 보강한 대상5 PASS. 구문/diff check PASS.
- 실제 Chrome + 별도 로컬 fixture 서버: 매수100+수수료3+세금2, 시작105, 입금100, 종료 종목가120일 때 평가220·순손익15·수수료3·세금2를 확인. 과다 출금 보류/삭제/복구/전체 비우기 PASS. 320/390/768/1440 × light/dark × 글자200% 가로 넘침 없음. data/v2/verification/paper-cash-web-20261020.json. 실종목 수익률 검증 결과가 아닌 fixture 검증. Galaxy/iPhone 신규 화면 QA NOT RUN.
- 작업 중 package.json의 유효하지 않은 type:module 삽입을 발견하여 해당 삽입만 제거하고 기존 CommonJS/ESM 혼용 설정 복구. 백엔드 지시서에 모듈 설정 변경 금지 명시. 실행기/서비스/스케줄은 변경하지 않음.
- 변경: public/app.js/index.html, src/v2/paper_performance.js/paper_performance_service.js, test/candidate_ui.test.js/paper_cash_service.test.js, 업무지시/QA/개발 기록. 개인정보 수집 항목·계정·스토어·운영 배포 변경 없음. 가상 사용자 입력 금액만 처리하며 실제 세율 자동 산정/배당/매도/환전/실거래 연결 없음.
- 이번 연결 범위 자동·Chrome 검증 PASS. 실종목 데이터 조건·모바일 실기기·매도/배당은 미완료이며 전체 PARTIAL, 추천 HOLD 유지.

---

# 주식수 백엔드 위임 및 모의 기록 관리 — 2026-10-20 KST

- 사용자 지시에 따라 미확인 주식수 검증을 Mac mini 백엔드에 분리. 연결 기기 ARI_MAC-01의 Mac mini M4와 저장소 remote/branch를 확인하고 docs/KSTOCK_SHARE_BACKEND_DIRECTIVE.md를 전달했다.
- 기존 JINI /developer/run으로 한 사이클 실행 요청. jobId=9d6bce6c-d554-4275-8db0-47373cdf75ed, 접수 시각 2026-10-20 00:01:27 KST. 마지막 확인 RUNNING이며 완료/공식 자료 확보로 간주하지 않는다. 결과는 전용 docs/KSTOCK_SHARE_BACKEND_REPORT.md 및 data/v2/verification/jini-jobs/9d6bce6c-d554-4275-8db0-47373cdf75ed.md 경로로 요청.
- 실행기 허용 작업은 저장 자료 검증 중심이며 신규 외부 수집을 지원하지 않는다. 신규 조회가 필요한 항목은 NOT RUN/필요 실행 경로로 보고하도록 명시. HOLD/스케줄/서비스/허용목록은 변경하지 않았다. public/android/모의 포트폴리오/공통 QA 수정 금지로 담당 분리.
- 로컬 public/app.js, public/index.html: 가상 매수 수수료·세금 총액 입력, 비용 포함 참고 손익/수익률, 개별 기록 삭제와 전체 비우기 추가. 통화별 합산과 탭 메모리 보관 유지. 삭제/추가 후 이전 누적 성과와 지연 응답 무효화.
- 누적 성과 API는 비용 0 계약이므로 비용 입력 시 요청 전에 보류 안내. 비용을 누락한 누적 성과를 표시하지 않는다. 현금 입출금·매도·매도 비용·배당 연결은 이번 범위 미구현.
- UI fixture 89 PASS. 전체 회귀836 PASS / Android 계약3 PASS / FAIL0 / SKIP0. 영수증 master-qa-20261019150236282.json. 구문 검사/diff check PASS. 최종 HTML 필터 행 배치 조정 후 diff check PASS. 실제 브라우저/Galaxy/iPhone 화면 QA NOT RUN.
- 기존 데이터·미커밋 변경 보존. 새 개인정보 저장/수집 없음. 운영 대상 kstock.ai.kr 변경 없음. 실거래·주문 경로 변경 없음. 주식수 미확인 및 추천 HOLD 유지. Overall PARTIAL.

---

# 보고기간 대사 입력 검증 강화 — 2026-10-19 KST

- 다음 공식 발행·보상 자료 연결에 앞서 대사 입력 검증 보강. SEC URL의 accession 경로와 flow.documentId 일치, 시작/종료 잔액의 documentId 일치를 요구한다. accession의 제출자 번호를 발행인 CIK로 추정하지 않는다.
- 안전한 정수 입력이라도 잔차 합산이 안전 범위를 넘으면 INSUFFICIENT_DATA와 null로 차단. 원문·수치·기존 미커밋 변경 보존.
- 회귀 833 PASS / Android 계약 3 PASS. 영수증 master-qa-20261019144849119.json. 최종 accession 검사 조정 후 대상 5 PASS, git diff --check PASS. 최초 Android 실패는 샌드박스 소켓 바인딩 제한이며 권한 확보 후 통과.
- 외부 수집·운영 배포·실거래 없음. Web/Galaxy/iPhone 신규 QA NOT RUN (UI 변경 없음). 개인정보 흐름 변경 없음.
- 실제 50,703,000주 원인·효력일 공식 검증은 미완료. 추천 HOLD, Overall PARTIAL. 다음 작업은 공식 신주 발행·원천징수·주식보상 근거 확보이며 RSU 권리확정을 신주 발행으로 대체하지 않는다.

---

# 같은 보고기간 주식수 순변동 대사 — 2026-10-19 KST

- 기준 ea40685 / auto/kstock-development-20260930. AGENTS/compliance/Git 상태 확인, 기존 변경과 원문 보존. 로컬 API/USB만 사용. 운영 변경/삭제/유료/인증 변경 없음.
- `share_period_reconciliation.js` 추가. 같은 원문 URL·SHA, 보통주 발행 수량 정의, 기간 시작 직전일/종료일의 잔액과 해당 기간 매입·소각 수량을 대조. 서로 다른 기간·원문·주식 종류·중복 충돌을 합치지 않음.
- 실제 Apple 접수0000320193-26-000020: 2025-09-27 14,773,260,000주 →2026-06-27 14,608,963,000주, 보고 순변동 -164,297,000주. 2025-09-28~2026-06-27 보고 매입·소각215,000,000주와 비교 시 +50,703,000주 미설명 순변동. 이는 산술 잔차이며 신규 발행·보상주식이라고 확정하지 않음. 시작/종료 decimals=-3, flow=-6의 보고 정밀도 유지.
- 잔차가0이어도 전체 변동 전수조사·효력일 검증 없이 완료로 표시하지 않음. exactReconciliationVerified=false/bridgeEligible=false/marketCap=null. 과거 기간의 산술 대사는 가격일까지의91일 공백 해소와 별도.
- `current_candidate_detail.js`에서 원문 관측과 대사 결과를 연결, Validation v21. Web 공통 상세에 보고기간·순변동·미설명 차이·원인 미확인 안내와 공식 링크 표시. 추정 수량·거래일 생성 없음. 외부 수집0, 저장 원문/수치만 사용.
- 변경: 신규 모듈, current_candidate_detail.js, current_validation.js, public/app.js, test/share_period_reconciliation.test.js, QA/개발로그 및 검증 영수증.
- Chrome 실제 API/Web: 미설명50,703,000주와 보류 상태 일치 PASS,4폭×2테마 넘침 없음, 연결 실패복구/상세 보존 PASS. share-period-web-20261019.json. iPhone 신규 화면 NOT RUN, Galaxy 결과 별도 기록.
- 실제 BUY0/SELL0, 추천·삼성전자 성과·Apple 순위 HOLD, 실거래/브로커 OFF, 이번 주문 호출0.
- 다음: 추가 변동을 설명하는 주식 발행·주식보상·원천징수 및 실제 효력일의 공식 자료 검증. RSU 권리확정 수량을 실제 신주 발행 수량으로 대신 쓰지 않음. Overall PARTIAL.

- 최종 자동 테스트: `node scripts/run-master-qa.mjs` 회귀831 PASS / Android 계약3 PASS / FAIL0 / SKIP0. master-qa-20261019143110152.json. 구문 검사·git diff --check PASS.

- Galaxy A33 신규 대사 화면 PASS: 순변동 -164,297,000주, 미설명50,703,000주 및 신규 발행·보상으로 추정하지 않는 안내를 실제 가시 영역에서 확인. galaxy-share-period-20261019.json / docs/uiux/galaxy-share-period-20261019.png. 기기 설정·앱 데이터 보존.

---

# 공식 자사주 매입·소각 기간 합계 연결 — 2026-10-19 KST

- 기준 ea40685 / auto/kstock-development-20260930. AGENTS/compliance/Git 확인. 기존 사용자 변경·원문·Apple/SEC 증빙 보존. 로컬 서버 PID3498, 루프백/실거래 OFF 유지.
- `extractShareCapitalFlows` 추가. SEC 원문 발행인, 비분할 컨텍스트, 기간 시작/종료, shares/USD 단위, 정수·nil을 검증해 매입·소각 보고 수량과 매입 현금 지급액을 분리 추출. 원문 보고 정밀도 보존. 기간 합계를 개별 거래일/효력일로 변환하지 않음.
- 기존 hash-bound backfill 및 새 원문 Collector 경로 재사용. 저장 Apple 원문 1건 보강, 외부 요청0. 원문 해시 28f986bb243c8fdd445560d381df4b57912ca290b03b8451ecd518e63cdb5d2b, SEC 접수0000320193-26-000020. 원문 링크는 API/영수증에 보존.
- 실제 보고 기간2025-09-28~2026-06-27: 매입·소각215,000,000주(decimals=-6), 매입 현금 지급62,094,000,000USD(decimals=-6). 전년 비교기간 현금70,579,000,000USD도 별도 보존. 수량과 현금 합계를 같은 이벤트로 합산하거나 나누어 평균 체결가격을 만들지 않음.
- 세 수치 모두 REPORTED_PERIOD_TOTAL, effectiveDate/transactionDate=null, bridgeEligible=false. 현재 가격까지의 주식수 연결 구간 밖 자료이므로 91일 공백을 해결한 것으로 처리하지 않음. 추가 수집 없이 실제 보고 자본 행동 근거를 API와 공통 Web 상세에 표시.
- 변경: sec_xbrl_scope.js, sec_share_backfill.js, sec_scope_collection.js, backfill CLI, current_candidate_detail.js, current_validation.js(v20), public/app.js, test/share_capital_flows.test.js, QA/로그 및 저장 증빙. 기존 평가배수/추천 조건 완화 없음.
- `node scripts/run-master-qa.mjs`: 회귀828 PASS / Android 계약3 PASS / FAIL0 / SKIP0. master-qa-20261019142455845.json. 구문/git diff --check PASS.
- Chrome 실제 API/Web:215,000,000주·기간·원문 정밀도 및 대사 미반영 안내 PASS. 4폭×2테마 넘침 없음, 연결 실패/복구·상세 보존 PASS. capital-flow-web-20261019.json. Galaxy 결과 별도 추가, iPhone 신규 화면 NOT RUN.
- 추천·삼성전자 성과·Apple 순위 HOLD, 실제 BUY0/SELL0. 실거래/브로커 OFF, 이번 실제 주문 호출0. 운영/유료/인증/삭제 변경 없음.
- 남음: 기준일 사이 기업행동의 실제 효력일 및 모든 주식수 변동 원인 확인. 보고 기간 합계만으로 발행/유통 주식수를 복원하지 않음. Overall PARTIAL.

- Galaxy A33 신규 화면 PASS:215,000,000주·보고기간·정밀도와 ‘개별 거래일·소각 효력일이 없어 대사 미반영’ 안내를 실제 가시 영역에서 확인. galaxy-capital-flow-20261019.json 및 docs/uiux/galaxy-capital-flow-20261019.png. 기존 앱/설정/사용자 데이터 유지.

---

# 가격일·주식수 기준일 대사 및 발행주식수 원문 연결 — 2026-10-19 KST

- 기준 ea40685 / auto/kstock-development-20260930. AGENTS/compliance·remote·기존 변경 확인, 자료 보존. 루프백 로컬 서버 PID2447, 외부 접속 비활성 유지.
- `extractCapitalShareRecords` 추가: SEC 원문 발행인·비분할 컨텍스트·instant 날짜·shares 단위 검증. 발행주식수/자기주식수/outstanding을 별개 정의로 저장. 세그먼트/다른 발행인/빈 숫자/nil/잘못된 단위 차단. 보고 decimals=-3은 관측 정밀도로 보존하며 정확한 수량으로 승격하지 않음.
- 기존 hash-bound backfill에 연결, 저장 Apple 원문 재사용하여 최신 원문1건 보강(외부요청0). 신규 원문 수집 시도 기존 Collector에 같은 추출 적용. 기존 캐시에 대한 무제한 추가 외부 조회는 도입하지 않음.
- 실제 SEC 0000320193-26-000020: 2026-06-27 발행14,608,963,000주 및 outstanding14,608,963,000주; 비교일2025-09-27 14,773,260,000주. 자기주식 항목은 추출되지 않아 자료 부족 유지(0으로 추정하지 않음). 기존 표지7월17일14,594,180,000주 관측 보존. 서로 다른 날짜의 차이를 특정 거래로 해석하지 않음.
- `share_date_review.js`: 가격일 이전에 관측·수집된 가장 최근 주식수와 가격일의 간격 계산. 같은 날짜에 다른 수량이면 충돌, 미래 관측 차단. 같은 날짜라도 정의/정밀도/종류/기업행동 검증 전 verifiedShares/marketCap=null 유지.
- 현재 API: AAPL7월17일→가격10월16일91달력일, NVDA56달력일 연결 필요. MSFT 가격 부족으로 대사 보류. 관측 간격은 거래일 수익률이 아님. 이 기간 전체의 공식 기업행동 및 효력일 검증은 아직 확보되지 않음.
- 공통 Web 상세 ‘가격일과 주식수 기준일 대사’ 추가. 가격·주식수 날짜, 부족 구간, 정의별 원문 수량/정밀도/출처 표시. Validation v19로 저장 검증 갱신. 기존 global valuation 조건 완화 없음.
- 변경: sec_xbrl_scope.js, sec_share_backfill.js, sec_scope_collection.js, scripts/backfill-sec-shares.mjs, share_date_review.js, current_candidate_detail.js, current_validation.js, public/app.js, test/share_date_review.test.js 및 본 보고서/로그·로컬 결과.
- `node scripts/run-master-qa.mjs`: 회귀826 PASS / Android 계약3 PASS / FAIL0 / SKIP0. 최종 master-qa-20261019141431772.json. 구문 검사/git diff --check PASS.
- 실제 Chrome/API: 날짜 간격91/56, Apple 정의별4관측, MSFT 부족 상태 및 렌더링 PASS. 4폭×2테마 넘침 없음, 연결 실패복구/상세 보존 PASS. share-date-web-20261019.json. 이번 신규 주식수 대사 화면 Galaxy/iPhone 실기기 NOT RUN.
- 실제 BUY0/SELL0, 추천·삼성전자 성과·Apple 순위 HOLD. 실거래/브로커 OFF, 이번 실제 주문 호출0. 운영 배포/유료 사용/인증 변경/데이터 삭제 없음.
- 다음: 공시별 발행·자기주식 변경과 실제 효력일을 가격일까지 연속 대사할 공식 근거 확보. 현재 추가 관측만으로 가격일 주식수를 재현하거나 추천을 허용하지 않음.
- Overall PARTIAL: 정의별 원문 관측과 날짜 부족 구간 표시 완료, 주식수 연속 대사/시가총액 검증은 미완료.

---

# 10-Q 잔액 대사 및 공식 재수집 — 2026-10-19 KST

- 기준 ea40685 / auto/kstock-development-20260930. AGENTS/compliance 및 Git 상태 확인, 기존 변경·Apple SEC 근거 보존. 로컬 서버 재시작 PID1898, 루프백/실거래 OFF 유지.
- `sec_interim.js`: Assets/Liabilities 추가. 같은 공시 접수번호·공시일·결산일·USD instant 값만 채택. 기간 실적/누적 실적을 잔액으로 사용하지 않음. 충돌/정정은 기존 차단 유지.
- `financial_risk_screen.js`: INTERIM_INSTANT와 연간 관측을 구분. `current_candidate_detail.js`에서 세 잔액 필드의 기준일·단위·통화를 일치시킨 경우만 전달. `risk.interimFinancialScreen` 추가, 종합 검토 상태를 자동 통과시키지 않음.
- 기존 금융 Collector normalizer v5 / Validation v18로 갱신. 승인된 기존 SEC CLI로 기업별 Company Facts 각1회, 총HTTP3건. 새 수집 경로나 인증 설정 활성화 없음. 원천 URL·SHA/조회시각/공시일은 current-financials.json 저장. 기존 연간/TTM/공시 자료 유지.
- 실제 대사: AAPL 2026-06-27 자산383266/부채275746/자본107520 백만USD, 총부채/자산71.95%. MSFT 2026-03-31 694228/279861/414367 백만USD, 40.31%. NVDA 2026-07-26 320272/91288/228984 백만USD, 28.50%. 모두 정확한 잔액 일치. Microsoft는 2026-06-30 연간 자료가 더 최근이며, 기존 화면의 최신 전체 실적 대체 금지 안내 유지.
- Web 위험 근거에 최근10-Q 대사를 연간과 별도로 표시. 금액/통화/기준일/공시일/공식 출처 제공. 실제 대사는 매수 추천이나 종합 위험 검토 완료가 아님.
- `node scripts/run-master-qa.mjs`: 회귀822 PASS / Android 계약3 PASS / FAIL0 / SKIP0, master-qa-20261019141004748.json. 분기 instant와 기간 실적 혼합 차단 추가 테스트. 구문 및 git diff --check PASS.
- 실제 Chrome API/Web: 세기업 분기 대사 상태/기준일/비율 확인, 새 항목 렌더링 PASS. 4폭×2테마 넘침 없음, 실패복구·상세 보존 PASS. 영수증 interim-balance-web-20261019.json. 이번 신규 10-Q 표시 Galaxy/iPhone 실기기 NOT RUN(이전 연간 실기기 PASS와 별도).
- 변경: sec_interim.js, financial_risk_screen.js, current_candidate_detail.js, current_financials.js, current_validation.js, public/app.js, 관련2테스트와 본문/개발로그, 공식 수집/검증 저장 결과.
- 실제 BUY0/SELL0 유지. 주식수·기업행동·배수/비교표본·영역별 종합 위험 검토 자료 필요. 추천·삼성전자 성과·Apple 순위 HOLD. 실거래/브로커 OFF, 이번 주문 호출0, 데이터 삭제/운영 변경 없음.
- 다음: 가격일과 일치하는 발행주식수 및 기업행동 연결 근거 검증, 신규 분기 상세 기기 확인. Overall PARTIAL.

---

# Galaxy 재무 상세 실제 검증 완료 — 2026-10-19 KST

- 브랜치 auto/kstock-development-20260930 / 기준 ea40685. 저장소/remote/사용자 변경과 AGENTS·공통 compliance 확인. 로컬 USB 기기 및 루프백 API만 사용, 배포·삭제·인증 설정 변경 없음.
- `scripts/galaxy_financial_detail_qa.py` 추가. 고정 버튼 좌표 대신 현재 접근성 트리의 텍스트/설명을 조회. 전경 앱 일치 확인, 화면 밖/0높이/하단 메뉴 겹침 요소 거부, 제한된 스크롤 후 실패 기록. 기존 설정창이나 다른 앱 입력 금지. 기존 앱/사용자 데이터 보존.
- Galaxy A33 실제 PASS: 서버 연결→신호→공식 근거 상세→영역별 위험 검토. Apple 자산359,241,000,000 USD·부채285,508,000,000 USD·자본73,733,000,000 USD, 기준2025-09-27, 총부채/자산79.48%·총부채/자본3.87배 가시 영역 확인. 현재 API 수치와 대조 일치. 공식 원천 링크와 종합 검토 자료 부족/연간 수치 한계 안내를 스크린샷에서 확인. 링크 클릭 후 외부 브라우저 검증은 하지 않음.
- 증빙: `data/v2/verification/frontend-redesign/galaxy-financial-detail-20261019.json`, `docs/uiux/galaxy-financial-detail-20261019.png`. 이전 NOT RUN 기록은 과거 사실로 보존하고 이번 별도 검증에서 PASS 처리. 이번 iPhone·MSFT/NVDA 실기기 대조·신규 연결 실패복구 NOT RUN.
- `test/galaxy_foreground.test.js`: 전경 앱 보호 및 가시 영역 판정 회귀 검증. `node scripts/run-master-qa.mjs`: 회귀820 PASS / Android 계약3 PASS / FAIL0 / SKIP0. `master-qa-20261019140757155.json`. git diff --check PASS.
- 변경 파일: 위 QA 스크립트, 테스트, 실기기 영수증/스크린샷, 본 보고서와 AUTO_DEV_LOG. 신규 금융 데이터 외부 수집0, 실제 주문 호출0, 실거래/브로커 OFF 유지. 추천·삼성전자 성과·Apple 순위 HOLD 유지.
- 다음: 검증 완료된 모바일 표시를 바탕으로 최신 분기 재무 대사와 가격일 주식수·기업행동 근거 확장. 추천의 필수 자료 부족은 그대로 유지.
- Overall PARTIAL: 신규 Galaxy Apple 재무 상세 실기기 검증 완료, 전체 추천 검증 미완료.

---

# 연간 재무 대사·위험 비율 실제 연결 — 2026-10-19 KST

- 기준 ea40685 / auto/kstock-development-20260930. 기존 미커밋 자료 보존, 로컬 서버만 기존 OFF/루프백 설정으로 재시작(PID96007). 운영 배포 없음.
- `src/v2/financial_risk_screen.js` 추가: SEC Company Facts 발행인 URL·저장 해시, 공개일/조회일, USD 단위, 연간 기준 및 유효기간 확인. 자산−부채=자본이 정확히 일치할 때만 총부채/자산·총부채/자본 계산. 누락·불일치·미래자료·잘못된 단위·비양수 분모는 차단. 반올림 차이를 임의 허용하지 않음.
- 기존 SEC 정규화는 같은 접수번호·같은 결산일의 USD instant 항목을 선택함을 코드에서 확인. 연간 수치를 TTM과 혼합하지 않음. 관측 재무 대사는 종합 위험 검토/신용등급/매수추천이 아님.
- 저장 공식 자료 재사용, 이번 수동 외부 수집0. AAPL: 2025-09-27 자산359241/부채285508/자본73733 백만USD, 총부채/자산79.48%, 총부채/자본3.87배. MSFT: 2026-06-30 758376/315989/442387 백만USD, 41.67%/0.71배. NVDA: 2026-01-25 206803/49510/157293 백만USD, 23.94%/0.31배. 최신 분기 수치라고 표시하지 않음.
- 상세 API `risk.financialScreen` 및 Web 공통 화면 연결. 수치마다 USD·결산 기준일 표시, SEC 원천 링크 제공. 총부채와 이자부 차입금의 차이 및 판단 한계 안내. Validation 버전 v17로 저장 근거 재평가.
- 변경: 위 신규 모듈, current_candidate_detail.js, current_validation.js, public/app.js, test/financial_risk_screen.test.js 및 QA/개발 로그.
- `node scripts/run-master-qa.mjs`: 회귀819 PASS / Android 계약3 PASS / FAIL0 / SKIP0. `master-qa-20261019140122068.json`. 구문 검사와 git diff --check PASS.
- Chrome 실제 API/Web 대조: 3기업 재무 대사와 비율 응답, Apple 실제 수치 표시 PASS. 4폭×2테마 넘침 없음, 연결 실패/복구·상세 보존 PASS. `data/v2/verification/frontend-redesign/balance-screen-web-20261019.json`.
- iPhone 신규 화면 검증 NOT RUN. Galaxy 결과는 아래 별도 기록. 이전 실기기 결과를 재사용하지 않음.
- 실제 BUY0/SELL0, 종합 위험 5영역 자료 부족 유지. 주식수·기업행동·배수/비교표본 부족도 유지. 실거래/브로커 OFF, 이번 실제 주문 호출0. 기존 Apple 순위·삼성전자 추천/성과 HOLD.
- 다음: 최신 분기 재무 대사 근거 확장 및 가격일 주식수·기업행동 대사. 계산 비율만으로 추천 제한을 해제하지 않음.
- Overall PARTIAL: 실제 재무 수치 화면 연결 완료, 추천에 필요한 전체 검증은 미완료.

- Galaxy A33: 기존 앱 실행 및 USB 로컬 연결 준비는 수행했으나 현재 앱의 네이티브 버튼 위치가 기존 QA 스크립트와 달라 상세 진입 실패. 설정값은 저장/변경하지 않고 창 취소. 신규 재무 수치의 실기기 대조 NOT RUN. 영수증 `galaxy-balance-screen-20261019.json`에 TARGET_NOT_VISIBLE 기록.

---

# 위험 검토 근거 연결 및 미확인 값 처리 개선 — 2026-10-19 KST

- 기준 브랜치 `auto/kstock-development-20260930`, 커밋 `ea40685`. 기존 사용자 변경과 Apple/SEC 자료 보존. 안전한 로컬 구현만 수행.
- 기존 Risk Agent가 누락 위험 값을 0으로 처리하는 문제 수정: 누락은 available=false, severity/riskPenalty=null. 숫자 검사와 공식 근거를 갖춘 종합 위험 검토를 구분.
- `src/v2/current_risk_review.js`: 재무·규제/법적·지배구조·평가·자료 최신성 5개 영역의 검토 계약. 기업/문서/SEC URL/해시, 검토 시각, 공개 시점, 최근 관측기간을 검증. 동시 충돌과 최신 미해결 검토는 차단. 원문 존재만으로 위험 없음이나 종합 검토 완료로 처리하지 않음.
- `src/v2/sec_risk_notes.js`: SEC XBRL 부채·자본·우발채무 주석의 발행인/기간/범위 확인 및 해시·길이·출처 저장. 원문 본문이나 비밀값은 UI/로그에 출력하지 않음.
- 기존 hash-bound backfill 및 Collector에 연결. Apple은 저장 원문 재사용(수동 외부 요청0), 기존 Worker가 MSFT/NVDA 최신 원문2건 읽기. 이번 확인 시 공식 주석 AAPL3/MSFT2/NVDA3개. 이는 OBSERVED_NOT_REVIEWED이며 위험 점수로 추정하지 않음.
- 선택적 `current-risk-reviews.json` 입력을 기존 연구/Validation Worker에 연결, v16 의존성 해시로 해당 기업만 재검증. 검토 완료 자료를 임의 생성하지 않음. 기존 30분 Scheduler 유지, 새 외부 수집 경로 활성화 없음.
- 모의 판단에서 위험 점수 불일치와 알려진 중대 위험의 BUY 발행을 차단. 위험/비교 표본 변경을 판단 지문에 포함해 변경 추적.
- Web 상세에 영역별 부족 상태, 공식 주석 기간/출처 및 ‘위험이 없다는 의미는 아닙니다’ 안내. 원문 확보와 종합 검토 완료를 구분.

## 검증 결과

- `node scripts/run-master-qa.mjs`: **회귀816 PASS / Android 계약3 PASS / FAIL0 / SKIP0**. `data/v2/verification/master-qa/master-qa-20261019135402773.json`.
- `git diff --check` PASS. 고정 fixture로 미래/오래된 검토/해시 불일치/충돌/미확인 위험/주석 추출/기업별 변경 재검증/중대 위험 BUY 차단 검증. 테스트의 VERIFIED fixture는 실데이터가 아님.
- Chrome 실제 로컬 API: 320/390/768/1440px × 라이트/다크 8조합 넘침 없음. 실제 종목/API 상태 일치, 매도 빈 결과, 가상 예시 분리, 연결 실패·복구 및 상세 펼침 보존 PASS. `data/v2/verification/frontend-redesign/risk-review-web-20261019.json`.
- Web에서 실제 위험 주석 수3/2/3, 5영역 자료 부족, severity=null 대조 PASS. Galaxy A33 및 iPhone의 **이번 신규 위험 상세 실기기 확인 NOT RUN**. 기존 기기 검증 결과를 이번 검증으로 재사용하지 않음.

## 현재 상태와 다음 작업

- 실제 BUY0 / SELL0, AAPL/MSFT/NVDA 모두 INSUFFICIENT_DATA. 공식 주석 확보는 종합 검토의 대체가 아님. 현재 5개 영역의 실제 완료 검토 자료는 없음.
- 가격일 주식수·기업행동 대사, 귀속 범위가 확인된 평가배수, 비교 표본, 최신 독립 분석 근거가 계속 필요. 기존 국내 SK1014주/DB9건/PBR 문제 해결로 표시하지 않음.
- 실거래/브로커 OFF, 이번 작업 실제 주문 호출 없음. 추천·삼성전자 성과·Apple 순위 기존 HOLD 유지. 운영 배포/인증 변경/데이터 삭제 없음.
- 다음: 공식 주석의 구체적인 재무 수치와 위험 항목 검증, 가격일 주식수/기업행동 대사, 신규 위험 상세 Galaxy/iOS 화면 검증. 검증된 영역만 단계적으로 연결하고 누락을 0으로 바꾸지 않음.
- Overall: **PARTIAL** — 위험 근거 전달 및 미확인 처리 결함 수정 완료, 실제 추천의 필수 자료 부족은 유지.

---

# 실제 증빙 연결 복구 · Apple 주식수 · NVIDIA 가격 확보 — 2026-10-19 KST

## 실제 해결

- 브랜치 `auto/kstock-development-20260930` / 기준커밋 `ea40685`. 기존 미커밋 변경 보존. 추천 기능의 원천 부족을 조사하여 캐시/대기열 결함을 수정.
- Apple 기존 VERIFIED 원문 캐시는 shareRecords 필드 추가 이전 자료였으나 원문 범위 검증이 있으면 무조건 반환하여 주식수 추출이 실행되지 않았음. 기존 flow/범위 증빙을 보존하고 누락 주식수만 보강하는 경로 추가.
- 공식 SEC Apple 최신 원문1건 읽기(HTTP200), 기존 SHA-256과 정확히 일치. 저장 원문을 offline hash-bound backfill로 재사용(추가 HTTP0). 기존 Worker는 남은 Apple 원문3건만 보강(HTTP3). 총4공시에 관측 주식수 보존.
- 최신 Apple 관측값: **2026-07-17 /14,594,180,000주**, `decimals=-3`, SHARES 단위. 전체 보통주 클래스/정확한 가격일 대사는 미확인으로 유지. 보고 정밀도와 관측일을 API/상세에 표시하며 오늘 가격과 곱하지 않음.
- 원문 해시/공식 URL/발행인/주식 단위/유효일 확인, 다른 원문/잘못된 단위/미래 관측/소스 변경 차단. SEC 인증 차단 시 큐 중단과24시간 재조회 방지. 완료 후 다시 같은 보강을 실행하지 않음.
- 가격 수집은 캐시가 유효한 먼저 선택된 기업 때문에 대기 종료된 다른 기업을 조회하지 못할 수 있었음. 실제 due 기업만 선택하도록 수정. 성공은24시간 캐시 유지, 일시 통신 오류는 제한된 백오프, 공급자 제한·API 키/상태 오류는 별도 대기. 기존 공급자 cooldown/일일20요청 한도를 지우거나 우회하지 않음.
- 공급자 대기 종료 전 CLI 실행은 외부 요청0건. **2026-10-19 22:37:30 KST** 이후 due였던 NVDA를 실제 조회(가격/분할 합계HTTP2). **2026-10-16 종가214.13 USD /원주가 /READY** 확보. 분할 응답은 unavailable로 기업행동 INCOMPLETE 유지. Apple343.46 USD와 함께 현재 가격 연결2기업, MSFT 가격 부족은 유지.
- 새 가격으로 기존 Worker 실행: NVDA1기업 재평가/다른2기업 재사용. NVDA latestPrice 조건 false→true. 기존 flow/정정 근거와 HOLD 기록 보존.

## 구현/표시

- `sec_share_backfill.js`, `scripts/backfill-sec-shares.mjs`: 기존 원문 해시를 대조하는 읽기 자료 보강. 원본 재작성/삭제 없음.
- `market_collection_due.js`: 기업별 due·백오프·provider cooldown 계산. 기존 Collector/Scheduler 재사용, 새 자동 경로/타이머 활성화 없음.
- 가격 nextRetryAt을 저장/API에 전달하고 UI에서는 ‘재조회 가능 시점’으로 표시. 성공 보장 시각으로 표현하지 않음. 원문 숫자를 요약에서 바로 확인하도록 관측값/단위/정밀도 표시, 여러 원문 링크는 별도 펼침으로 정리.
- `sec_scope_collection.js`, `sec_xbrl_scope.js`, `current_market_collection.js`, `official_research_collection.js`, `current_candidate_detail.js`, `research_readiness.js`, `current_research.js`, `trade_recommendations.js`, `influence_service.js`, `current_validation.js(v15)`, `public/app.js`, 관련 CLI/테스트/iOS 검증 및 본 문서/개발로그 변경.

## 실제 검증

- 외부 수집 API HTTP6건: 수동 SEC원문1 + 기존 Worker SEC원문3 + Alpha Vantage2. 원문 조회/검증 시점·URL/해시/숫자와 가격 응답은 `data/v2/verification/current-collection/evidence-unblock-20261019.json`. 공식 API 문서 웹 검색은 별도 실시했으며 SPLITS 실패를 임의로 요금제 문제라고 단정하지 않음.
- `node scripts/run-master-qa.mjs`: 회귀805 PASS / Android 계약3 PASS / FAIL0 / SKIP0. 최종 영수증 `master-qa-20261019133855644.json`.
- Chrome 실제 4폭×2테마: 넘침 없음, Apple 관측값/기준일/정밀도 일치, 새 가격의 판단/API, 가상 예시 분리/실패복구 PASS. `evidence-unblock-web-20261019.json`.
- Galaxy A33: 실제 Apple 숫자·날짜·정밀도·‘평가 입력 검증과 별도’ 문구의 가시 영역 확인 PASS. `galaxy-apple-share-backfill-20261019.json` 및 스크린샷. 이번 NVIDIA 가격값의 Galaxy 별도 시각 대조는 NOT RUN.
- iPhone17 Simulator: 실제 WKWebView에 관측 주식수/API 대조를 추가하여14개 판정 PASS. iPhone15 실기기는 NOT RUN. 음성 활성화/데이터 삭제/재설치 없음(Galaxy 기존 앱 유지, iOS Simulator만 업데이트).
- 실제 주문 경로 호출 없음. 실거래/브로커 OFF, 외부 접속 비활성, 서버127.0.0.1:3000 PID91671. 유료서비스·인증 변경·운영 배포 없음.

## 미완료/다음

- 실제 BUY0 / SELL0. AAPL/MSFT/NVDA INSUFFICIENT_DATA 유지. 주식수 관측 복구와 가격 READY는 평가/추천 전체 통과가 아님.
- 동일 가격일 주식수 연속 대사, 전체 기업행동과 적용일, 공통 귀속 재무/배수, 비교 표본 및 종합 위험 검증이 남음. NVIDIA 매출/순이익 직접분기/누적 차이도 여전히 보류. 국내 SK1014주/DB9건/PBR 표본 이슈는 이번에 해결로 변경하지 않음.
- 다음: 현재 공급자 대기를 준수하며 MSFT 가격과 기업행동 공식 자료 확보, 가격일과 일치하는 주식수 연결 및 실제 위험 검증. 기존 Apple 순위·삼성전자 추천/성과 HOLD 유지.
- Overall PARTIAL: 실제 원천 누락·대기열 결함 해결 및 추가 가격 확보, 검증된 실제 추천은 미확보.

---

# 매수·매도 모의 판단 엔진/API/화면 — 2026-10-19 KST

## 승인과 실제 범위

- 사용자 승인: 매수·매도 추천 기능 개발. 실제 주문·계좌 변경·유료API·공개 배포 승인은 적용하지 않음.
- 브랜치 `auto/kstock-development-20260930`, 기준커밋 `ea40685`. 기존 미커밋 작업 보존. 현재 적용 대상은 기존 현재 코호트 AAPL/MSFT/NVDA.
- 새 `trade_recommendations.js`: BUY/SELL/WATCH/INSUFFICIENT_DATA 분기. 검증된 데이터 조건을 먼저 확인하고 기존 위원회 점수와 대사. 모의 판단 전용이며 SELL은 보유 종목 축소 검토, 공매도/주문 지시 아님.
- 자료 부족을 낮은 점수나 매도로 변환하지 않음. 공식 원문/D2·가격·연속 재무·가격일 정렬·배수·주식수/기업행동·배수별 동종/과거3표본·종합위험·지표 최신성/완전성·독립 검토 확인. 단순 승인/테스트 PASS를 금융 증빙으로 사용하지 않음.
- 기존위원회50 매수 경계를 재사용.35 매도 경계 등은 신규 실험 정책이며 성능 검증 없음. 새 정책은 `docs/KSTOCK_TRADE_RECOMMENDATIONS.md`에 명시. 목표가/기대수익/승률 null, 보장 수익 주장 없음.
- 유효 기한은 생성 후 최대24시간과 지표/가격 최신성 종료 중 빠른 시각. 만료되거나 생성시각이 미래면 UI에서 방향성 판단 비활성화. 활성 화면은 기존30초 갱신을 재사용.
- GET `/api/v2/recommendations`: 실제 종목 결과와 별도 RULE_SIMULATION 예시3개 제공. 가상 조건에 실제 종목명/공식근거를 꾸며 넣지 않음. 예시를 실제 추천 집계에 포함하지 않음.
- 홈/전체메뉴에 ‘매수·매도 판단’ 추가. 종목별 판단·기준일/가격·만료·근거/위험/부족 조건·후보 상세 연결·상태 필터·실패/복구 표시. 저장 검증 Worker 캐시 v13, 결과에 종목별 판단 저장. 기존 보고서의 실제 signals/위원회/검토 입력을 API로 보존하고 향후 생성 보고서에도 signals 저장. 검증된 평가배수 입력 계약 연결, 미검증 관측을 검증 완료로 승격하지 않음.

## 현재 실제 결과 — 추천 출시 완료 아님

- 실제 API AAPL/MSFT/NVDA 모두 `INSUFFICIENT_DATA`.
- 실제 BUY0 / SELL0 / WATCH0 / 자료부족3. 가상 예시 BUY1/SELL1/WATCH1은 별도 규칙 시험이며 실제 종목 추천이 아님.
- AAPL 최종조회 부족조건7개, MSFT11개, NVDA12개. 가격/재무 정렬 여부는 별개이며 MSFT의 확인된 TTM을 가격 부재 때문에 미확인으로 되돌리지 않음. 개별 체크는 실제 API 영수증 참조.
- 동일일 주식수·전체 기업행동·귀속 재무/배수·비교 표본·종합 위험·완전한 최신 지표·검토가 아직 부족함. 각 증빙을 생산하는 upstream 수집/검증은 이번 엔진이 대신 만들어내지 않음. 기존 Apple 순위·삼성전자 추천/성과 HOLD 유지.

## 실제 검증

- `node scripts/run-master-qa.mjs`: 회귀798 PASS / Android 계약3 PASS / FAIL0 / SKIP0. 영수증 `master-qa-20261019132145108.json`.
- 단위검증: 완전한 고정 fixture의 BUY/SELL/WATCH, 누락/정정/미래/오래된 자료 차단, 점수 대사, 기존 표본 기준, 실주문 비활성, 데이터/모의 예시 분리, 가격부재와 회계기간 구분, 유효기한/만료.
- Chrome 실제 4화면폭×라이트/다크8조합: 넘침 없음. 실제API3종목/예시 분리, SELL필터 빈결과, 상세 보존, 네트워크 강제차단/복구 PASS.
- iPhone17 Simulator 실제WKWebView: 신규 판단/API대조·필터·예시분리·주문차단 포함13개 판정 PASS. iPhone15 실기기 신규검증 NOT RUN.
- Galaxy A33 실제앱: 홈→판단화면, 실제 종목 자료부족, 자료부족≠매도 안내, 별도 가상규칙 펼침 PASS. 예시 위치 및 실제 종목 카드 스크린샷 확인. 신규 판단화면의 Galaxy 강제 네트워크 차단/복구는 NOT RUN(자동/UI계약 및 Web에서는 수행).
- iOS 로컬빌드, JS구문, git diff 공백검사 PASS. 실제 주문 경로 호출 없음. 기존 서버 실거래OFF/브로커OFF/외부접속차단 유지. 최종로컬 PID88662,127.0.0.1:3000. 운영 배포 없음.

## 파일과 다음 작업

- 변경: src/v2/trade_recommendations.js, current_research.js, current_candidate_detail.js, current_validation.js, research_automation.js, influence_service.js, orchestrator.js; public/index.html,app.js; test/trade_recommendations.test.js,candidate_ui.test.js; ios/App.swift,verify-result.py; 정책/체험 문서와 본 보고서/개발 로그.
- 증거: `trade-recommendations-api-20261019.json`, `trade-recommendations-web-20261019.json`, `ios-trade-recommendations-20261019.json`, `galaxy-trade-recommendations-20261019.json` 및 Galaxy 스크린샷.
- 다음: 실제 추천0개를 해소할 공식 주식수/기업행동/귀속 재무·비교 표본·종합위험의 검증 입력 확보와 독립 표본 정책 평가. 승인 없이 조건을 임의 완화하거나 예시를 실제 추천으로 바꾸지 않음.
- Overall PARTIAL: 모의 판단 엔진·화면 구현 및 검증 완료, 실제 검증된 추천 종목 확보는 미완료.

---

# 첫 체험 동선·Galaxy 인물/보고 QA 마무리 — 2026-10-19 KST

- 브랜치 `auto/kstock-development-20260930`, 커밋 `ea40685`. 기존 사용자 변경 보존. 서버 PID81986의 기존 로컬 실행을 유지, 공개 배포/재설치/설정 변경 없음.
- 홈에 ‘처음 사용하기 · 지금 볼 수 있는 기능’ 접이식 안내 추가. 종목 검색→기준일/출처, 인물→명시된 기업, 에이전트→실제 저장 보고로 연결. 첫 화면을 장문으로 채우지 않도록 기본 접힘. 터치 링크44px 이상, 기존 색상 토큰 사용.
- 로컬 체험 안내 `docs/KSTOCK_LOCAL_TRIAL.md` 추가. Mac 브라우저 `http://127.0.0.1:3000/`, 기존 Galaxy 앱/USB/서버 조건과 예시 분석 버튼의 구분 설명. 연구 화면 체험 가능과 검증된 추천 가능 시점을 구분. 추천 출시일은 미확정이며 새벽 실행 횟수만으로 충족하지 않음을 명시.
- Web 실제 4화면폭×라이트/다크 기존 묶음 검증 유지, 첫 안내의 3개 링크가 실제 화면으로 이동하고 새로고침 후 안내 펼침 유지 PASS. `trial-first-use-web-20261019.json`.
- Galaxy A33 실기기: 버핏 선택→AAPL 관련 후보 이동 PASS. 첫 안내 펼침→에이전트 보고 이동 PASS. 보고 제목·실제 완료/최근 확인 시각·단계 수를 가시 영역에서 스크린샷 확인 PASS. 검증 후 앱 홈으로 복귀. `galaxy-trial-ready-20261019.json`, `galaxy-trial-agent-report-detail-20261019.png` 등.
- iPhone17 Simulator 실제 WKWebView: 첫 안내 경로 추가 포함12개 판정 PASS. iPhone 실기기의 신규 안내 검증 NOT RUN. VoiceOver/음성 활성화 없음.
- `node scripts/run-master-qa.mjs`: 회귀789 PASS / Android 계약3 PASS / FAIL0 / SKIP0. 영수증 `master-qa-20261019130900429.json`. iOS 빌드·구문·diff 검사 PASS. 안내 문구만 반영하는 단위 테스트를 중복 추가하지 않음.
- 변경: public/index.html, public/styles.css, ios/App.swift, ios/verify-result.py, docs/KSTOCK_LOCAL_TRIAL.md, 본 보고서/AUTO_DEV_LOG. 검증 산출물 별도 저장.
- 실거래 OFF, 추천·삼성전자 성과·Apple 순위 HOLD. 이번 실제 주문 경로 호출 없음. 새 외부 수집이나 유료 사용을 활성화하지 않음.
- 전체 PARTIAL. 연구·자료 확인용 로컬 체험 가능. 동일일 주식수·기업행동·귀속 재무·비교기업·위험·충분한 사후 표본 등 추천 선행 조건은 여전히 미충족. 첫 체험 검증을 추천 출시 완료로 간주하지 않음.
- 다음: 실제 사용 피드백을 화면별로 반영하고 승인된 금융 증빙 수집/검증의 차단 원인을 개선. 단기 UI 날짜 약속을 추천 출시 약속으로 제시하지 않음.

---

# 검색·기업/인물 탐색·실제 에이전트 보고 통합 개발 — 2026-10-19 KST

## 구현 범위

- 브랜치 `auto/kstock-development-20260930` / 기준 커밋 `ea40685`. 기존 사용자 변경 보존. 새 Worker를 만들지 않고 기존 저장 상태와 Scheduler API를 재사용.
- 신호 화면: 기업/코드/신고 인물 검색, 매출 TTM 확인/부족 필터, 표시/전체 건수, 조건 초기화, 빈 결과 안내 추가. 전체 후보 수와 과거 연구 사례는 필터 결과와 구분. 검색어는 현재 화면 메모리에만 보존하며 새 서버 전송/영구 저장 없음.
- 홈: 후보 요약은 최대3개와 짧은 보류 사유로 정리. ‘근거 보기’에서 선택한 기업의 신호 카드로 이동하고 선택 표시. 과거 연구 카드 선택은 연구 상세로 이동. Microsoft 음의 초과수익 연구 보존.
- 인물: 공식 발언/행동에 명시된 기업만 관련 후보로 연결. 기업·기관 행동을 인물 개인 거래로 추정하지 않음. 실제 버핏 발언의 AAPL 연결 확인, 기업 관계가 없는 파월 자료에는 기업 버튼을 임의 생성하지 않음. 정확히 연결된 actorId/personId에 한해 후보→인물 버튼 제공.
- 에이전트: 저장 작업 영수증을 읽기 전용 `runReport`로 제공. 마지막 완료/확인·단계별 상태·최대5개 최근 완료 기록·안전한 실패 사유·재시도 시각 표시. 종료 후 남아 있는 오래된 실패 사유 숨김. 완료 단계 수·투자 신호·회귀 실행을 구분하고 단계/원인은 한국어로 표시. 테스트 결과를 자동 보고에서 조작하지 않음.
- 검색·선택 기업·연구 기간·펼침 상태를 갱신/실패/복구 동안 유지. 필터 초기화 시 검색창으로 키보드 포커스 이동. 터치 입력 최소44px.

## 실제 검증

- Chrome 320/390/768/1440px × 라이트/다크 총8조합: 넘침 없음, 검색창48.375px. NVDA검색→매출TTM필터 빈 결과→초기화→MSFT선택/펼침→강제 네트워크 실패→복구 흐름 PASS. MSFT 검색어와 자료 펼침 유지, 과거 음의 연구 보존. 버핏→AAPL 후보 연결 PASS.
- iPhone17 iOS Simulator 실제 WKWebView: 기존 TTM/출처/6화면/글자확대/연결실패·복구에 검색·상태필터·초기화·실제 작업보고를 추가한 11개 판정 PASS. iPhone15 실기기는 NOT RUN. 음성 기능 활성화 없음.
- Galaxy A33: 기존 앱 재연결과 실제 NVDA 입력, 표시1/전체3개 확인. 초기화 버튼의 실제 가시 영역 [707,1275,1020,1407]에서 입력 해제 및 표시3/전체3개 복원 PASS. 초기 QA 좌표가 하단 메뉴와 겹친 문제는 실측 후 재검증했으며 앱 결함으로 판정하지 않음. APK 재설치나 저장자료 삭제 없음. 이번 신규 인물 탐색·운영 보고·강제 네트워크 차단의 Galaxy 개별 검증은 NOT RUN.
- 최종 `node scripts/run-master-qa.mjs`: 회귀789 PASS / Android 계약3 PASS / FAIL0 / SKIP0. 영수증 `master-qa-20261019124043669.json`. 구문·diff 검사 PASS, iOS 빌드 PASS.
- 로컬 서버 PID81986 /127.0.0.1:3000. Scheduler 활성, 조회 순간 Worker idle. 최근 완료 영수증2026-10-19T09:03:47.114Z, API 조회의 다음 실행2026-10-19T13:05:58.050Z. 서버 실행을 실제 계속 실행 중인 작업으로 과장하지 않음. 기존 수집 설정 유지, 운영 배포/LAN 공개 없음.

## 기록·제한

- 증거: `workspace-bundle-20261019.json`, `workspace-report-api-20261019.json`, `ios-workspace-bundle-20261019.json`, `galaxy-workspace-bundle-20261019.json` 및 Galaxy 스크린샷.
- 수정: public/index.html, app.js, styles.css; src/v2/research_run_report.js, research_automation.js; test/research_run_report.test.js, candidate_ui.test.js; ios/App.swift, verify-result.py 및 본 보고서/AUTO_DEV_LOG.
- 추천·삼성전자 성과·Apple 순위 HOLD, 실거래 OFF. 이번 실제 주문 경로 호출 없음. 공식 금융 증빙·유효 표본 증가나 전략 예측력 검증 완료를 주장하지 않음.
- 다음: 보고/인물 탐색의 Galaxy 나머지 동작 검증, 현재 후보와 실제 시장 반응의 추가 공식 근거 확보. 전체 PARTIAL.

---

# 자료별 기준일·출처 연결 — 2026-10-19 KST

- 기준 브랜치 `auto/kstock-development-20260930`, 커밋 `ea40685`. 기존 미커밋 변경 보존. 로컬 서버만 반영(PID81123 /127.0.0.1:3000), 공개 배포 없음.
- readiness 항목에 재무 기간/관측일/통화/단위/원천 URL 배열 추가. TTM의 실제 scopeSources를 중복 제거하여 연결. 관측 가격/주식수는 OBSERVED_NOT_VALIDATED로 구분하며 투자 검증 완료로 승격하지 않음.
- HTTPS 공식 SEC·기존 가격 제공자 문서만 링크로 허용. 사용자정보·쿼리 포함 주소, 실행형 URL·외부 임의 호스트 차단. 기존 가격 문서 #daily/#splits 앵커 보존. 링크 열기나 원문 재수집은 이번 검증에서 실행하지 않음.
- Web ‘자료별 기준일·출처 보기’에 확인된 항목과 부족 항목을 모두 표시. 재무 기간과 관측 기준일을 구분하고 미확보 원천은 명시. Worker 저장 캐시 v10으로 갱신.
- 실제 API: AAPL/MSFT 매출·현금흐름 각각 원천 링크8개, NVDA 현금흐름8개, MSFT/NVDA 관측 주식수 각1개. Apple 가격 공식 제공자 문서 링크 확인. 이는 새 금융 자료 확보 수가 아니라 기존 저장 근거의 연결 수임.
- Chrome 실제 320/390/768/1440px: 넘침 없음, 재무 기간/출처 표시, 기존 TTM/배수 정보, 새로고침 후 펼침 상태 보존 PASS. 증거 `readiness-sources-ui-20261019.json`, `readiness-sources-api-20261019.json`.
- `node scripts/run-master-qa.mjs`: 회귀785 PASS, Android 계약3 PASS, FAIL0/SKIP0. 영수증 `master-qa-20261019122627697.json`. 구문·diff 검사 PASS. 추가 테스트는 출처 제한/중복 제거/공식 앵커/관측일 구분 및 UI 계약.
- Galaxy A33/iOS Simulator/iPhone 실기기의 이번 출처 펼침 변경 검증은 NOT RUN. 이전 자료 준비 요약의 PASS와 구분. 설치/데이터 변경 없음.
- 수정: src/v2/research_readiness.js, current_validation.js; public/app.js; test/research_readiness.test.js, candidate_ui.test.js 및 본 보고서/AUTO_DEV_LOG.
- 추천·삼성전자성과·Apple순위 HOLD, 실거래 OFF 유지. 실제 주문 경로 호출 없음. 자동수집 설정·인증·유료서비스 변경 없음.
- 남은 조건: 공식 동일일 주식수·전수 기업행동·귀속 자본 등 금융 증빙 미충족. 출처 연결만으로 추천이나 기업가치 검증 완료를 주장하지 않음.
- 다음: 모바일의 출처 펼침·외부 링크 전환/복귀·상세 상태 보존을 확인. Overall PARTIAL.

---

# 자료 준비 요약 · API/Worker/Web/모바일 통합 — 2026-10-19 KST

- 기준: 브랜치 `auto/kstock-development-20260930`, 커밋 `ea40685`. 기존 미커밋 변경 보존, 로컬 개발만 수행.
- `research_readiness.js`에 확인됨/검증 대기/자료 부족 체크리스트 추가. 매출·현금흐름 TTM만 확인된 범위로 인정하며 주식 종류·순이익 귀속·자본·기업행동·비교기업·위험은 별도 조건으로 유지. 분모 값이 유한하지 않거나 충돌 사유가 있으면 확인됨으로 표시하지 않음.
- API 후보 상세 readiness 연결, 저장 검증 캐시 v8. 관측값을 VERIFIED로 승격하지 않고 완료율/추천 점수/작업 실행률로 환산하지 않음. 실행·수집 보장 문구 없음.
- Web 홈·신호 카드에 짧은 준비 요약과 다음 필요 자료 표시. 상세 화면에는 전체 필요 자료를 펼쳐 확인. 기존 디자인 토큰과 라이트/다크 테마 사용.
- 실행 서버 기존 플래그로 재시작: PID79870, `127.0.0.1:3000`, 외부 접속 비활성. 기존 Scheduler/공식 읽기 수집 설정 유지, 새 수집 경로·운영 배포·유료 API·인증 변경 없음.
- 실제 API: AAPL/MSFT 매출·현금흐름 확인됨, NVDA 현금흐름만 확인됨. 나머지 조건은 검증 대기/자료 부족. 추천·삼성전자성과·Apple순위 HOLD, live trading false.
- Chrome: 320/390/768/1440px 넘침 없음, 준비 요약·기존 TTM/배수 표시 PASS. 새 전체자료 펼침과 기존 상세 펼침이 새로고침 후 유지됨. `readiness-summary-ui-20261019.json`.
- Galaxy A33: 기존 앱 다시 연결 후 신호 화면에서 Apple 자료 준비 요약·확인 항목·다음 필요 자료 실제 가시 텍스트 대조 PASS. 스크린샷 `docs/uiux/galaxy-readiness-summary-20261019.png` 시각 확인. 기존 앱/데이터 보존, 재설치 없음. 이번 새 기능의 기기 연결실패 강제 주입은 NOT RUN.
- iOS Simulator(iPhone17) 실제 WKWebView: 준비 요약/API 확인 항목·TTM/배수·6화면·연결실패/복구·펼침 보존·글자확대 포함 10개 판정 PASS. `ios-readiness-summary-20261019.json`. iPhone15 실기기는 NOT RUN.
- `node scripts/run-master-qa.mjs`: 회귀781 PASS / Android 계약3 PASS / 실패0 / 스킵0. 영수증 `master-qa-20261019121544417.json`. `node --check public/app.js`, `git diff --check` PASS. iOS 로컬 빌드 PASS.
- 변경: src/v2/research_readiness.js, current_candidate_detail.js, current_validation.js; public/app.js, styles.css; test/research_readiness.test.js, candidate_ui.test.js; ios/App.swift, verify-result.py 및 본 보고서/개발 로그.
- 실제 주문 경로 호출 없음. 실거래 OFF 유지. 신규 금융 증빙 확보나 PBR 유효 표본 증가를 이번 UI 완료로 주장하지 않음.
- 다음: 동일일 가격·주식수와 전체 기업행동 공식 근거 확보 시 항목별 검증 상태 연결. 현재 가격/주식수 항목은 관측 인벤토리이며 모든 검증 범위를 통과한 증빙 입력의 자동 승격은 미구현. 추천 조건 완화 금지.
- Overall PARTIAL.

---

# 평가배수 보류 화면 실행 반영·Web/iOS QA — 2026-10-19 KST

- 기준 브랜치 `auto/kstock-development-20260930`, 커밋 `ea40685`. 기존 변경 보존. 배포 대상은 로컬 `127.0.0.1:3000`뿐이며 공개 배포 없음.
- 로컬 서버를 기존 안전 플래그로 재시작(PID 78286). 외부 접속 비활성, broker/live trading false 유지. 기존 Scheduler 활성, 연구 Worker 조회 순간 idle이며 저장 검증 3기업 재평가·예외 0. 새 수집 경로나 주기 활성화 없음.
- 실행 API: Apple 관측 종가343.46 USD/2026-10-16, Apple·MSFT 매출 TTM READY, NVDA 매출 TTM 부족. PSR 사유는 시장 증빙 부족과 재무 부족을 구분. 관측 주식수는 검증된 동일일 주식수로 승격하지 않음.
- Chrome 실제 화면 320/390/768/1440px: 넘침 없음, 평가일·배수별 보류 표시, 새로고침 후 상세 펼침 유지 PASS. `valuation-blocker-ui-20261019.json`.
- iOS Simulator(iPhone17): 실제 WKWebView QA 9개 판정 PASS. 6화면·TTM API값·평가일/배수 보류·실패/복구·상세 보존·글자 확대 확인. `ios-valuation-blockers-20261019.json`. iPhone15 실기기 신규 검증 NOT RUN.
- Galaxy A33: 기존 앱과 저장정보 보존, USB reverse 재사용. 서버 재시작 후 다시 연결로 복구, Apple 상세 열기·스크롤 및 접근성 트리에서 API와 같은 평가일/종가/4배수 사유 확인. 실제 가시 영역에서 평가일·가격일·PER/PBR/PSR 사유를 스크린샷으로 확인 PASS. EV/EBITDA는 아래 스크롤로 이어지는 항목이며 전체 내용은 접근성 트리 대조. `docs/uiux/galaxy-valuation-blockers-visible-20261019.png`. APK 재설치 없음.
- 변경 파일: `ios/App.swift`, `ios/verify-result.py`, 본 보고서와 AUTO_DEV_LOG. 검증 자료와 스크린샷 별도 저장.
- 최종 `node scripts/run-master-qa.mjs`: 회귀 778 PASS, Android 계약 3 PASS, 실패/스킵 0. 영수증 `data/v2/verification/master-qa/master-qa-20261019120643538.json`. 구문 및 diff 공백 검사 PASS.
- 이번 수동 외부 수집 없음. 기존 승인된 자동 수집 사이클의 외부 요청 1건은 runtime 상태에서 확인됨. 실제 주문 호출을 수행하지 않음(전체 운영 감사 건수로 확대 해석하지 않음).
- 추천·삼성전자 성과·Apple 순위 HOLD, 실거래 OFF. 동일일 주식수/가격 증빙·전체 기업행동·귀속 자본 등 선행 근거 부족으로 실제 배수/추천 활성화 없음.
- 전체 PARTIAL. 다음: 자료별 검증 준비 상태를 사용자용 짧은 요약으로 표시하고 기존 공식 수집 결과에 따라 갱신. 국내 주식수 차이와 NVIDIA 보고정밀도 정책 검토는 계속 보류.

---

# 평가배수 보류 원인 분리 및 저장 근거 계약 — 2026-10-19 KST

- 기준: `auto/kstock-development-20260930` / `ea406852610c00bef0dbe469de95c42fca662c30`. 기존 미커밋 작업 보존, 로컬 개발만 수행.
- 확보된 TTM 분모와 가격·주식수·기업행동의 미검증을 독립 판정. 시장 자료 부족을 매출 TTM 부족으로 잘못 표시하던 원인 수정.
- 관측 종가/가격일/통화, 주식수 관측일/출처, 기업행동 상태를 후보 상세 API의 evidence로 제공. 관측은 VERIFIED 증빙으로 승격하지 않음. 과거 기준일 이후 checkedAt·가격 관측·주식수 기준일은 제외.
- Web 상세에 평가일·관측 종가와 PER/PBR/PSR/EV·EBITDA별 부족 근거 표시. 기존 Worker 캐시 버전 v7로 변경하여 다음 실행에서 이전 결과를 재사용하지 않음.
- 잘못된 평가일 및 배수 계산 오버플로를 차단. 추천·삼성전자 성과·Apple 순위 HOLD 유지. 이 작업에서 외부 수집·실주문 호출 없음. 실행 중 서버 설정을 변경하지 않음.
- `node scripts/run-master-qa.mjs`: 회귀 778 PASS / FAIL 0, Android 계약 3 PASS / FAIL 0. 최종 결과 경로는 아래 개발 로그 참조.
- 단위/UI DOM 계약 검증 수행. 변경 화면의 실제 Chrome·Galaxy A33·iOS 렌더링 및 실행 서버의 새 버전 적용: NOT RUN. 이전 실기기 PASS를 이번 검증으로 재사용하지 않음.
- 실제 PBR 표본 증가 없음. 동일일 보통주 주식수·전체 기업행동·귀속 자본·가격 증빙이 여전히 필요함. NVIDIA 차이·국내 금융 검증 상태는 변경하지 않음.
- 변경: src/v2/global_valuation_gate.js, src/v2/current_candidate_detail.js, src/v2/current_validation.js, public/app.js, test/global_valuation_gate.test.js, test/current_valuation_evidence.test.js 및 두 진행 문서.
- 다음 작업: 실행 서버 새 코드 반영 후 Web/모바일의 배수별 보류 문구·관측일·상세 상태 보존 확인. 공식 증빙 확보 전 평가수치 활성화 금지.
- Overall: PARTIAL.

---

# K-STOCK 원문 범위→실제 TTM→평가배수 Gate→모바일 통합 묶음 — 2026-10-19 KST

## 최종 판정

| 항목 | 이번 결과 |
| --- | --- |
| 원문 연결 범위 | Apple/MSFT 흐름 계정 검증, NVDA현금흐름 검증 |
| 실제 TTM | AAPL·MSFT 매출/순이익/영업현금흐름 READY, NVDA현금흐름만 READY |
| NVIDIA 차이 | 두 항목 각-1,000,000USD, 공식 보고정밀도와 양립. 정책검토전 TTM보류 |
| 가격·주식수·기업행동·평가배수 | 입력검증/주식수 관측/독립배수 Gate 연결. 실제값·비교표본 미충족으로보류 |
| Web/모바일 | Web 반응형·Galaxy A33 실기기·iOS Simulator WebKit 실제값대조PASS |
| 전체 | PARTIAL — 추천/삼성전자성과/Apple순위HOLD, 실거래OFF |

## 근거와 실제 계산

- Preflight AGENTS.md/ARI기준·cwd/remote/branch/commit/미커밋변경 확인. auto/kstock-development-20260930 / ea406852610c00bef0dbe469de95c42fca662c30, package1.0.0. 사용자작업·Apple/SEC·음의MSFT시장반응 보존. 로컬127.0.0.1:3000만 재시작, 다른프로젝트변경없음.
- 이번 공식SEC 실제GET 총43회: 파일목록13, XBRL인스턴스16(정책추가대조 포함), FilingSummary13, NVDA companyfacts1. 문서12건의 대사이며 새사건43건이아님. 각조사CLI 최대12회·호출간격1100ms·timeout/크기상한·인증우회/무한재시도없음. 기존승인읽기경로만 사용. 최신시세를얻으려고쿼터/캐시우회하거나유료전환하지않음.
- Apple4개공시 XBRL값/기간/USD/발행사/차원없는문맥과연결손익·현금흐름표제대조. MSFT4개공시는제표표제가일반이름이라이를연결로추정하지않고, 회사와종속기업포함·내부거래제거를명시한 us-gaap:ConsolidationPolicyTextBlock 원문추가대조. 원문해시동일성확인후별도정책증거저장. 숫자/문맥일치와명시적범위근거가모두있을때만scope검증적용.
- 저장: data/v2/influence/sec-scope-reviews.json. 회사/접수/링크/SHA256/문맥/일치사실/정밀도/표제또는정책검증시각보존. 이전receipt의표제확인시각누락은배치최종관측시각으로보수적보완. 검증시점보다과거asOf에는적용하지않음. 원문전문·주소는정규화결과에저장하지않음.
- AAPL TTM2025-06-29~2026-06-27: 매출466,823,000,000USD / 순이익128,930,000,000USD / 영업현금흐름146,724,000,000USD. MSFT2025-07-01~2026-06-30: 매출331,839,000,000USD / 순이익133,749,000,000USD / 영업현금흐름182,935,000,000USD. 실제원문보고값과4분기근거에따른합계, 예측값아님.
- NVDA현금흐름2025-07-28~2026-07-26=134,360,000,000USD. 매출/순이익은실제TTM null유지. 직접분기매출96,221,000,000 vs 누적차감96,222,000,000; 순이익59,688,000,000 vs59,689,000,000USD. 각입력원문에서decimals=-6확인. 세입력정밀도허용폭합1,500,000USD와차이1,000,000USD가양립한다는 ROUNDING_COMPATIBLE_REQUIRES_POLICY_REVIEW 판정만저장. 원인이확정된ROUNDING_ERROR/RESOLVED로표시하지않고수정보정/값선택/평균없음.

## 자동화·기업행동/평가배수

- 기존 Worker에 collectSecScope 통합, 새Worker/타이머없음. 주기별최대3HTTP/기존전체12HTTP 예산공유. 확보원문재사용, 새입력/문서만대사, 실패·부분검증24시간대기, 401/403 SEC_AUTH_BLOCKED기록. 정규화·근거저장·증분검증·기존새벽보고연결. 실제재시작scope 외부0/cached근거활용, 전체주기HTTP0확인.
- 글로벌USD용동일기준일가격/보통주유통주식수/전체주식종류/기업행동범위/통화·보통주귀속이익·장부가치 Gate 추가. KRW전용기존모듈에USD를강제대입하지않음. 원문cover의관측유통주식수는날짜·정의·종류검증대기로표시(발행주식수아님). MSFT/NVDA의각4관측기록은현재가격일확정수량으로쓰지않음. Apple원문관측목록미확보를0주로채우지않음.
- PER/PBR/PSR/EV/EBITDA독립조건/0·음수분모/원주가·수정주가/가격·주식수날짜/기업행동전수검사. 실제시장가치·배수는현재모두보류. verifiedTTM이있어도보통주귀속이익·주식수·기업행동근거없으면PER/PBR을켜지않음. 최소동종표본3정책유지. 기존국내PBR0/SK1,014주/DB9건문제해결로보고하지않음.

## Web·Android·iOS 검증

- 실제API AAPL/MSFT TTM READY, NVIDIA일부보류, 추천통과0. Chrome320/390/768/1440px 가로넘침없음, 검증된TTM수치/범위·원문전환근거·평가배수필요입력·정밀도보류·펼침갱신유지. data/v2/verification/frontend-redesign/integrated-valuation-20261019.json 및 integrated-complete-api-20261019.json.
- Galaxy A33 기존앱재실행/서버연결/신호메뉴·상세실제터치/스크롤. Apple TTM3개숫자API와일치. 캡처 docs/uiux/galaxy-integrated-ttm-20261019.png 직접확인, 기록 data/v2/verification/frontend-redesign/galaxy-integrated-ttm-20261019.json. 다른기업모든상세/모든글자확대전수재검증은NOT RUN. 기존데이터보존/재설치없음.
- iOS App.swift --qa에currentTTM API↔실제WebKit숫자및펼침상태대조추가. 기존 iPhone17 Simulator 빌드·설치·실행, ios/verify-result.py 실제receipt8항목PASS(6화면/삼성전자/연결실패·복구/큰글자/TTM대조포함). data/v2/verification/frontend-redesign/ios-integrated-ttm-20261019.json. XCTest8개가아니라nativeQA의8검사항목이며회귀집계와별도. 물리iPhone미설치/미검증, LAN노출/서명계정변경/VoiceOver음성테스트없음.

## 최종 테스트·안전·남은 조건

- node scripts/run-master-qa.mjs 최종 회귀774 PASS/0 FAIL/0 SKIP, Android계약3 PASS/0 FAIL. data/v2/verification/master-qa/master-qa-20261019112905978.json. 명령 node scripts/test-offline.js / node --test test/android_external.test.js. 추가12개: XBRL문맥/표제·정책/공식경로/미래근거, 독립배수/날짜/주식정의/분모, 정밀도·미래, Scope collector상한/캐시/비활성/인증차단. 오프라인fixture, 실제43조회와분리. node/Python문법/git diff --check·신규수집코드제한secret-pattern검사PASS(전체저장소감사아님).
- broker/live false, 추천/삼성전자성과/Apple순위HOLD. 이번실제주문호출0(수행작업범위), 과거전체계좌감사NOT RUN. 새유료/API인증/외부공개/운영서버/다른프로젝트변경없음. JINI개발HOLD해제없음.
- 남음: NVIDIA정밀도처리정책·최신가격·동일날짜주식수/기업행동전수/보통주귀속분모·유효비교표본·종합Risk/예측전략검증. 신규사건1/5/20일실관측표본은여전히0. 실제새벽무인운전/재부팅/절전깨우기/물리iPhone신규UI NOT RUN.
- 다음자동동작: 기존30분수집/범위대사/저장검증과새벽02~06/07:30이후보고. Mac이깨어있고로컬서버가유지돼야함. 새근거없이는추천Gate자동해제하지않음. 이번묶음에서독립가능한원문대사·TTM·입력Gate·Web/모바일검증·회귀/QA까지진행했고자료선행조건만보류.
- 변경: 신규 sec_xbrl_scope.js/sec_scope_collection.js/quarter_rounding_review.js/global_valuation_gate.js 및대응4개test파일, scripts/collect-sec-scope.mjs/audit-sec-quarter-conflicts.mjs/review-sec-consolidation-policy.mjs; 수정 sec_quarter_history.js/sec_quarter_ttm.js/current_candidate_detail.js/current_validation.js/influence_service.js/official_research_collection.js, public/app.js, ios/App.swift/verify-result.py, 본QA/AUTO_DEV_LOG. 운영계약 docs/KSTOCK_SEC_SCOPE_AND_TTM.md. 로컬증거와정규화결과별도저장.
- Overall PARTIAL — 실제TTM2기업연결및통합검증완료, 추천·평가배수의실자료선행조건은미완료.

---

# K-STOCK 과거 분기 확보·누적 전환 근거 — 2026-10-19 KST

- Preflight AGENTS/ARI·경로/remote/branch/commit/기존 작업 확인. auto/kstock-development-20260930 / ea406852610c00bef0dbe469de95c42fca662c30. 기존 미커밋 변경과 자료 보존. 로컬127.0.0.1:3000만 재시작, 기존30분/새벽보고 유지.
- SEC companyfacts 기존승인경로 총3GET/HTTP200(AAPL/MSFT/NVDA 각1). 정규화버전quarter-history-provenance-v4로최근800일 범위 근거를 수집, 항목별최근8개분기까지저장. 새 API권한·비밀값·유료서비스변경 없음. 이후재시작캐시재사용.
- sec_quarter_history.js: 같은매출/이익/현금흐름 태그·같은누적시작일·80~100일 차이인 앞뒤누적만 차감해단일분기후보생성. 연간-9개월 차감도 같은규칙으로검사. 수량·태그·기간·공시일·접수번호·sourceHash·계산입력2개·직접/누적차감방법을보존. 통화USD고정/미래공시배제/정정검토/직접분기와차감결과불일치차단. 재무범위는UNKNOWN/scopeVerified=false로유지.
- 실제AAPL 매출/순이익/현금흐름 각7개 분기후보 확보, 최근4개연속성과12개월기간검사통과. MSFT 각8개후보/최근4개연속연결. NVDA현금흐름7개후보/최근4개연속연결. 모든TTM합계는연결범위미검증으로null/INSUFFICIENT_DATA. 단순히자료4개가모였다고추천을활성화하지않음.
- NVDA매출·순이익은 직접분기값과누적차감값 불일치 DIRECT_DERIVED_QUARTER_CONFLICT로항목차단/분기반영0. 반올림·정정·원천오류 중 어느원인인지 이번에판정하지않음. 값을고르거나충돌항목만제외해TTM을만들지않음. 충돌상세 원문수치대조는다음작업.
- currentCandidateDetail의TTM준비상태가과거자료를사용하도록연결. 저장검증정책v5로갱신. Web분기전환근거에직접공시/누적차감,입력기간·금액USD·공시일·접수번호표시. 실제Chrome320/390/768/1440px에서4/4·근거·보류표시/가로넘침없음/상세펼침갱신유지확인. data/v2/verification/frontend-redesign/quarter-history-20261019.json. Galaxy/iOS새분기전환근거실기기확인NOT RUN.
- 최종 node scripts/run-master-qa.mjs 회귀762 PASS/0 FAIL/0 SKIP, Android계약3 PASS/0 FAIL. data/v2/verification/master-qa/master-qa-20261019103900747.json. 추가4개: 누적차감근거·누락/회계시작불일치·충돌/정정·미래/직접차감불일치. 초기테스트에서1USD차이허용 문제를발견해금액일치조건을엄격히수정한후최종PASS. 외부요청은별도실자료3회, 테스트는오프라인fixture. 문법/git diff --check PASS.
- 실거래OFF/brokerfalse, 추천/삼성전자성과/Apple순위HOLD, 이번 실제주문호출0(수행범위). 다른프로젝트/인증/유료/운영배포/외부공개변경없음. 최신가격/기업행동/비교기업/종합Risk·실제수익표본 해결로보고하지않음. 실제새벽무인운전·모바일새화면NOT RUN.
- 변경: 신규 src/v2/sec_quarter_history.js 및 test/sec_quarter_history.test.js; current_financials.js/sec_quarter_ttm.js/current_candidate_detail.js/current_validation.js, public/app.js, QA/AUTO_DEV_LOG. 데이터와API/UI근거는로컬보존. 다음: 공식원문XBRL 연결범위 대사, NVDA직접/차감충돌원인검증. Overall PARTIAL(과거근거확보/전환검증연결완료, 실제TTM·추천은보류).

---

# K-STOCK USD TTM 연속성·준비 상태 — 2026-10-19 KST

- Preflight AGENTS/ARI·경로/remote/branch/commit/기존 변경 확인. auto/kstock-development-20260930 / ea406852610c00bef0dbe469de95c42fca662c30. 기존 데이터/미커밋 작업 보존, 로컬 서버만 재시작. 이번 외부 금융 요청0.
- 기존 accounting_periods.js는 KRW/달력연도/DART 전용이므로 통화·연도를 변환해 재사용하지 않음. validDay와 공통D2 정책만 재사용하고 SEC/USD용검증을 sec_quarter_ttm.js에 추가. 단일분기80~100일, 연속4개·합계범위350~380일(52/53주포함), USD/단위, 연결범위검증, 접수번호/SHA256, 공개가능시점, 중복/수치충돌 검사. 누적값이나연간값을직접더하지 않음. 근거가검증된4개단일분기 fixture에서만합계계산 확인.
- 실제연결은 최근저장10-Q 항목의단일분기자료만 사용하는 준비상태 어댑터. 과거분기4개 수집/누적→단일분기전환/연결범위검증을 완료한것이아님. TTM 값은모두null/INSUFFICIENT_DATA 유지. AAPL/NVDA 매출·순이익각1개, 현금흐름0개(누적전환근거필요). MSFT는3항목각1개이며 더최근연간공시와4분기대사필요. 분기자료수는연결범위까지최종승인한표본수가아님.
- 후보상세에 TTM준비상태/분기자료수/부족근거 추가. 저장검증정책v4로이전보고서재사용을무효화하여새상태반영. 기존30분/새벽보고유지. Web 실제API·Chrome320/390/768/1440px 가로넘침없음/펼침갱신유지. 증거 data/v2/verification/frontend-redesign/ttm-readiness-20261019.json. Galaxy/iOS신규TTM 실기기항목NOT RUN.
- 최종 node scripts/run-master-qa.mjs 회귀758 PASS/0 FAIL/0 SKIP, Android계약3 PASS/0 FAIL. data/v2/verification/master-qa/master-qa-20261019103346082.json. 신규6개: 정상4분기·누락/중복/연결범위·충돌·미래/통화/누적/연간기간·저장누적전환/연간대사·12개월범위. 오프라인fixture이며실제TTM확보로보고하지않음. node문법/git diff --check PASS.
- 실거래OFF/brokerfalse, 추천/삼성전자성과/Apple순위HOLD, 이번 주문호출0(수행범위). 다른프로젝트/인증정보/유료/운영배포/외부공개 변경없음. 최신가격·기업행동·비교표본·종합Risk/실관측선행조건미완료.
- 변경: src/v2/sec_quarter_ttm.js 신규, current_candidate_detail.js/current_validation.js, public/app.js, test/sec_quarter_ttm.test.js 신규, QA/AUTO_DEV_LOG. 다음: 과거분기공식근거확보·누적차감검증·연결범위대사 후 실제TTM 재평가. Overall PARTIAL.

---

# K-STOCK 최근 10-Q·단일 분기/누적 기간 연결 — 2026-10-19 KST

- Preflight AGENTS/ARI기준·경로/remote/branch/commit/사용자변경 확인. auto/kstock-development-20260930 / ea406852610c00bef0dbe469de95c42fca662c30. 기존 미커밋 작업·자료 보존. 로컬127.0.0.1:3000만 재시작, 기존새벽보고/30분주기 유지.
- 기존 승인SEC companyfacts 총3GET/HTTP200, 기업별1회. 새정규화버전annual-and-interim-period-v3으로 저장. 추가API·비밀값변경·유료서비스·원문반복조회 없음. 이후재시작은캐시재사용.
- 실제 최근10-Q: AAPL 기준2026-06-27/공시07-31/매출109,417,000,000USD(03-29~06-27 단일분기), 영업현금흐름116,996,000,000USD(2025-09-28~2026-06-27 누적). NVDA 기준07-26/공시08-26/매출96,221,000,000USD(04-27~07-26 단일분기), 영업현금흐름74,421,000,000USD(01-26~07-26 누적). 각 항목 기간·통화·태그·공시근거 별도보존.
- MSFT 최근10-Q 기준03-31/공시04-29/매출82,886,000,000USD(01-01~03-31), 이미 연결된06-30 연간공시보다 오래됨. 따라서 최신 전체실적으로대체하지않으며 화면에연간공시기준일이더최근이라는 안내. 4분기실적을연간차감으로추정하지 않음.
- sec_interim.js: 이용가능한10-Q/10-QA·USD·공시D2·발행사·접수번호·기준일 검증, 같은접수/공시일/종료일만 결합. 항목별80~100일 단일분기/100일초과300일이하 누적/자본시점잔액 구분. 기간길이만으로회계연도시작은확정하지않아 CUMULATIVE_PERIOD 및 회계연도시작검증대기 표시. 기존저장 YEAR_TO_DATE표현은API상세에서보수적누적표현으로호환. 누적값중복합산/연간+분기혼합 없음.
- 동일기간수치충돌·정정공시는BLOCKED, 미래공시/잘못된통화 배제. source상연결범위 완전검증은scopeVerified=false, TTM연속4분기검증은INSUFFICIENT_DATA. currentCandidateDetail에interim별도추가, 기존연간값/평가배수보류/위험HOLD 유지. latestInterimVerified를무조건true로바꾸지 않음.
- Web 실제API/Chrome320/390/768/1440px: MSFT분기03-31와더최근연간안내, 항목별USD·기간·누적/잔액 표시, 가로넘침없음/펼침새로고침유지 확인. data/v2/verification/frontend-redesign/interim-detail-20261019.json. Galaxy/iOS 신규분기화면실기기검증 NOT RUN(이전연간화면확인과구분).
- 최종 node scripts/run-master-qa.mjs 회귀752 PASS/0 FAIL/0 SKIP, Android계약3 PASS/0 FAIL. data/v2/verification/master-qa/master-qa-20261019101403862.json. 추가5개: 단일/누적/잔액 분리, 미래/통화, 충돌/정정, 접수동일성, 연간보다오래된10-Q안내. 오프라인fixture/실제주문·외부요청없음. 문법/git diff --check PASS.
- 안전: broker/live false, 추천/삼성전자성과/Apple순위HOLD. 이번주문호출0(수행범위). 신규수익률표본/기업행동전수/동종기업/종합위험해결 아님. 새벽실제무인운전/OS깨우기/재부팅 및 모바일신규화면 NOT RUN. 다른프로젝트·인증정보·운영배포·외부공개 변경 없음.
- 변경: 신규src/v2/sec_interim.js/test/sec_interim.test.js; current_financials.js/current_candidate_detail.js, public/app.js, test/current_observation.test.js, QA/AUTO_DEV_LOG. 정규화자료·API/UI증거는로컬저장. 다음: 연결범위·연속분기/TTM 검증, 실제기업행동·비교표본 연결. Overall PARTIAL(분기연결/자동검증기반 완료, 추천선행조건은보류).

---

# K-STOCK 새벽 확인·아침 보고 운영 연결 — 2026-10-19 KST

- Preflight AGENTS/ARI 기준, cwd/remote/branch/commit/기존 변경 확인. auto/kstock-development-20260930 / ea406852610c00bef0dbe469de95c42fca662c30. 기존 미커밋 작업과 자료 보존. 로컬127.0.0.1:3000만 재시작.
- 기존 Scheduler 순서 OFFICIAL_COLLECTION→INFLUENCE_VALIDATION→OVERNIGHT_REPORT 연결. 새 Worker/타이머·OS스케줄·외부공개 없음. Asia/Seoul 새벽02:00~06:00 실제 주기 기록, 오전07:30 이후 첫 주기에서 하루1회 보고. 정확히07:30 실행 보장은 아니며 기존30분 기준점/앞선 작업 소요시간에 따름.
- 실제 수집은 기존 활성 승인경로·전체12HTTP·기업별캐시·공급자cooldown 유지. 새벽 집중 확인을 이유로 호출/캐시 강제우회하지 않음. 새 보고 단계는 외부 요청0.
- 밤 실행의 source receipt가 실제현재5분 이내 확인된 경우에만 수집주기 관측으로 기록. 슬롯당1회·날짜별보고1회, 재시작후 중복방지/파일잠금. 현재후보·추천통과·검증된수익기간·기업별보류사유 저장. 첫보고 신규증가null, 확인된슬롯만 보고. 입력 실패는 BLOCKED보고/후보null로 남기고 당일반복재생성하지 않음.
- 실제 로컬 서버 활성 확인: API overnight.enabled=true, Scheduler OVErNIGHT_REPORT 작업 결과 MORNING_REPORT_SAVED/외부0. 실제 생성2026-10-19T10:03:55.696Z(한국19:03), 예정07:30보다늦은 AFTER_SCHEDULE. 오늘 새벽실행을 주장하지 않으며 NO_NIGHT_EXECUTION_RECORDED/관측슬롯0/현재후보3/추천0/검증수익기간0. 다음새벽은10/20이며 실제 야간 실행은 아직 NOT RUN.
- 홈 Mac mini 영역에 새벽 시간/서버실행조건/아침보고 표시. 실제Chrome320/390/768/1440px 가로넘침없음, 보고서펼침 새로고침후유지, 새벽기록없음/첫보고기준없음 표시 확인. data/v2/verification/frontend-redesign/overnight-report-20261019.json. 이번 Galaxy/iOS 새보고서 실기기확인은 NOT RUN.
- node scripts/run-master-qa.mjs: 회귀747 PASS/0 FAIL/0 SKIP, Android계약3 PASS/0 FAIL. data/v2/verification/master-qa/master-qa-20261019100328260.json. 추가6개: KST날짜경계, 야간슬롯/재시작중복,07:30기준과일별보고,늦은시작/새벽미관측,오래된수집/비활성/실거래차단/시계역행,실패보고. node문법 및git diff --check PASS. 테스트는고정시간/fixture이며 실제밤을기다려확인한결과아님.
- 실제야간/아침무인운전·재부팅·절전복귀 NOT RUN. Mac깨우기/절전방지/로그인자동시작 미설정. Mac이깨어있고로컬서버가유지되어야실행. 운영 안내 docs/KSTOCK_OVERNIGHT_RESEARCH.md에 재실행명령/중복서버금지/실패보고한계 기록. 외부메일·푸시등전송 없음.
- 실거래OFF/brokerfalse, 추천/삼성전자성과/Apple순위HOLD, 이번 실제주문호출0(수행범위). JINI개발HOLD/원천권한/인증정보/다른프로젝트/유료서비스 변경없음. 투자검증선행조건은시간경과만으로해제하지 않음.
- 변경: src/v2/overnight_research.js 신규, src/server.js/research_automation.js, public/app.js, test/overnight_research.test.js 신규, docs/KSTOCK_OVERNIGHT_RESEARCH.md 및QA/AUTO_DEV_LOG. 저장보고/증거는로컬data/v2.
- 다음 자동작업: 서버유지시10/20 02~06시 기존주기확인→07:30이후첫주기보고. 다음 QA에서 실제슬롯/수집실패/보고생성시각 대조. Overall PARTIAL: 로컬일정·보고구현/실제API검증 완료, 실제무인야간운전은아직미검증.

---

# K-STOCK 가격·금융 검증·상세 UI·1/5/20일 연구 연결 — 2026-10-19 KST

## 요청한 4개 작업의 판정

| 작업 | 실제 결과 | 판정 |
| --- | --- | --- |
| MSFT/NVDA 최신 가격 | 해당 기업24시간 캐시·공급자 cooldown 유지, 두 조회시도 외부0회. 기존 AAPL10/16가격 보존 | BLOCKED(자료 확보 미완료) |
| 금융·위험 검증 | 공식 SEC 연간재무3기업 연결, 기간/공시/통화/태그 검증 및 재무 위험·부족항목 화면 반영. 최신분기/기업행동 전수/동종기업·종합위험 미완료 | PARTIAL |
| 후보 상세 | 이유→재무·평가배수보류→위험→공개후관측 표시. Web/Galaxy 실제 확인 | 구현·제한된 화면검증 PASS |
| 1/5/20거래일 연구 | 보수적 관측 계산/저장/Worker/API/UI 연결. 현재4공시 사건의3기간 모두대기, 신규 검증수익률0 | 구현 PASS / 실데이터 관측 PENDING |

## 실제 금융 자료와 정합성 수정

- Preflight AGENTS/ARI 기준, 프로젝트·remote·branch·commit·기존 변경 확인. auto/kstock-development-20260930 / ea406852610c00bef0dbe469de95c42fca662c30, package1.0.0. 로컬127.0.0.1:3000만 재시작, 사용자 작업·기존Apple/SEC/MSFT음수연구 보존.
- 기존 승인·활성 SEC companyfacts GET 총5회: MSFT1/NVDA초기1/태그선택수정후NVDA1/AAPL1/재시작Worker의새정규화버전MSFT1. 모두 HTTP200. 기존flag true 확인, 인증·유료서비스 변경 없음. scripts/collect-current-financials.mjs는 기존SEC승인정책 확인. 기존30분 Worker에1기업/최대1요청·기업별24시간캐시·고정3기업 순환 연결, 주기전체12요청 상한 공유.
- 재무 결과: MSFT 연간2026-06-30/공시2026-07-29 READY; NVDA 연간2026-01-25/공시2026-02-25 INCOMPLETE; AAPL 연간2025-09-27/공시2025-10-31 READY. READY는 기존 연간 재무항목 충족을 뜻하며 기업 전체/최신분기/추천 검증완료가 아님.
- NVDA 최초 정규화에서 첫 매출태그의 과거2022년을 선택하는 문제 발견. sec_financials.js를 모든 지원 매출태그의 이용 가능한 연간기간을 먼저 비교하도록 수정. 공식응답1회 재검증으로2026년 결산 선택 확인. 선택 버전 변경 시 기업별 캐시만 갱신, 2022년을 최신실적으로 게시하지 않음. Apple2025년 연간자료는 실제 선택된 공시이며 최신분기나2026년 연간자료로 위장하지 않음.
- 동일 accession·기간·통화의 연간매출/이익/현금흐름/자본만 연결. 최신 분기·TTM 미검증 명시. 주식수·기업행동·비교표본 부족으로 PER/PBR/PSR/EV/EBITDA null/HOLD, 연간 EPS를 임의TTM 배수로 바꾸지 않음.
- 위험 검토는 FINANCIAL_SCREEN_ONLY: 확인된 자본0이하/영업현금흐름음수·부족항목과 미검토 규제/지배구조를 구분. 종합위험 낮음/LLM 검증완료/추천 허용을 생성하지 않음. 새 LLM 또는 외부AI 요청 없음.

## 시장 반응 연구 구조

- current_observation.js는 기존 measureMarketReaction 계산기를 재사용. 원문 검증·관측시각·D2 이용조건 검사, 직접 공개를 확인한 시각 이후 첫 전체 거래세션 종가를 보수적 기준으로 사용. EXACT 최초 공개 분석으로 표시하지 않음. 단위는 FRACTION(API)→%p(UI), 가격수익률/배당·비용미포함/비연율화/실제체결아님 명시.
- 동일 공시의 거래3개를 독립 연구3건으로 세지 않음. 현재 AAPL2공시/MSFT1공시/NVDA1공시=4사건, 각각1/5/20기간. 신규 검증기간0, 현재실자료는D2_AVAILABILITY_WAIT. 미래기간이나가짜가격으로0%를 채우지 않음.
- 계산하려면 verified calendar/security/benchmark/actions 입력의 공식HTTPS출처·SHA256·확인시각·종목·통화·RAW_CLOSE/SP500 PRICE_INDEX·기업행동 범위가 필요. 공개 이후 동일거래일 시계열 사용, 결측/중복일자 차단, 이미조정된가격 중복조정 방지. 미래확인시각·확인전가격·기업행동 미래범위 차단.
- 검증된 과거입력 계약은 선택파일 data/v2/influence/current-observation-inputs.json(schemaVersion1/checkedAt/companies[{companyId,inputs:{calendar,security,benchmark,actions}}])으로 받음. 현2025년 이력을2026년 연구에 재사용하지 않음. 현재 이 파일에 새실자료를 만들어 넣지 않았으며 새기간의 가격이력·거래일·지수·기업행동 전체수집은 미완료. 따라서 관측 구조 연결과 실제수익률 표본 확보를 구분.
- 금융 자료와 관측입력을 기존 증분 저장 검증의 회사별fingerprint에 추가(정책v3). 변경 기업만 재검증하며 실제Worker 재시작 결과 evaluated1/reused2, 금융요청1/기타0 확인. source financial/raw normalized 결과는 current-financials.json, 후보별 관측 상태는 current-validation.json에 저장.

## 화면·검증 결과

- Web 상세에 기준기간/공시일/USD/TTM아님, 매출·순이익·자본·영업현금흐름, 공식링크·평가배수보류·위험·시장관측 대기 표시. 실제Chrome320/390/768/1440px 가로넘침없음, MSFT재무2026-06-30·3기간대기·상세펼침 갱신후유지 확인. data/v2/verification/frontend-redesign/financial-reaction-detail-20261019.json.
- Galaxy A33 기존앱 재실행·서버연결·신호메뉴 실제터치·후보상세 실제터치/스크롤. Apple연간2024-09-29~2025-09-27/공시2025-10-31, USD숫자, 위험·배수보류·1/5/20대기 확인. docs/uiux/galaxy-financial-reaction-detail-20261019.png, galaxy-financial-values-20261019.png 직접확인. 기록 data/v2/verification/frontend-redesign/galaxy-financial-reaction-detail-20261019.json. 모든기업/장애복구/확대폰트 전수실기기 재검증은 NOT RUN. iOS 새상세 NOT RUN.
- node scripts/run-master-qa.mjs 최종 회귀741 PASS/0 FAIL/0 SKIP, Android계약3 PASS/0 FAIL. 명령 node scripts/test-offline.js / node --test test/android_external.test.js. 증거 data/v2/verification/master-qa/master-qa-20261019095103124.json. 테스트외부요청차단, 실제공식조회는위별도5회. 추가14개: 금융승인/캐시/실패/발행사, 매출태그전환, 보수시작·결측·1/5/20·기업행동/유형·미래유출·공시단위중복방지, UI연간/대기 계약. 문법/git diff --check PASS.

## 남은 조건·안전

- MSFT/NVDA가격은여전히미확보: 캐시만료 전재시도/공급자우회 없음. data/v2/verification/frontend-redesign/current-price-attempt-20261019.json에 두 요청시도 cached=true/외부0 기록.
- 최신분기/TTM/주식수·기업행동/동종기업최소표본/종합Risk·통계적예측력 미충족. 신규1D/5D/20D수익률0건. iOS와전기기전수QA/OS재부팅복구 NOT RUN. 국내기존미해결항목 해결로보고하지 않음.
- broker/live false, 추천/삼성전자성과/Apple순위HOLD. 이번 실제 주문호출0(수행작업 범위), 과거전체계좌감사는미실행. 데이터삭제·인증/권한변경·유료신규·운영서버·외부공개·다른프로젝트 변경 없음. JINI개발HOLD 해제 없음.
- 다음 자동동작: 기존30분 저장검증, 기업별캐시기한 후허용된 가격/재무확인. 다음개발은최신분기·기업행동·동일기간이력/벤치마크근거수집. 시간경과만으로추천을켜지 않음.
- 변경파일: 신규 src/v2/current_financials.js/current_candidate_detail.js/current_observation.js, scripts/collect-current-financials.mjs, test/current_financials.test.js/current_observation.test.js; 수정 sec_financials.js/current_research.js/current_validation.js/influence_service.js/official_research_collection.js, public/app.js, test/sec_financials.test.js/candidate_ui.test.js, QA/AUTO_DEV_LOG. 로컬실자료·검증증거별도저장.
- Overall PARTIAL: 4영역의 처리/표시 연결, 공급자제한·금융검증·실관측 선행조건은 남아 있음.

---

# K-STOCK NVIDIA 정정 원문 연결·현재 후보 반영 — 2026-10-19 KST

## 실제 공식 검증 결과

- Preflight 프로젝트/remote/branch/commit/기존 변경, AGENTS.md·ARI 기준·직전 QA 확인. auto/kstock-development-20260930 / ea406852610c00bef0dbe469de95c42fca662c30. package1.0.0. 로컬127.0.0.1:3000만 변경, 사용자 데이터/미커밋 작업 보존.
- SEC 공식 읽기 총6회: NVDA submissions1, 정정 원문1, 최초 원문1, 새 정정 근거 적용 후 submissions1+최근 Form4 원문2. 모두 읽기 전용/HTTP200. 새 인증·서비스·유료사용·API키 변경 없음.
- 정정0002152188-26-000007(2026-10-13) ↔ 최초0002152188-26-000005(2026-09-11). 정정 원문 dateOfOriginalSubmission=09/11, 같은 발행사CIK1045810/tickerNVDA·같은 신고인·보고/거래일09/09 확인. 공시기간 밖09/11 원문까지 확장해 연결했으며 이를 최근 매매 사건으로 바꾸지 않음.
- RSU 보상(A코드, 대가0, 직접보유) 수량172,507→160,418주, 차이-12,089주. 사후 보유수량도 같은 수량으로 정정. 원문 remarks의 명시적 행정상 취득수량 오류 정정과 각주 동일성 확인. 최초/정정 원문 링크·SHA256·관측시각·변경 전후 수량을 data/v2/influence/current-corrections.json에 저장. 주소·서명·원문 전문은 해당 검증 결과에 저장하지 않음.
- 이 정정은 실제 매수/매도 신호0건. 최초 공개 시각을 추정하지 않으며 실제 원문 읽기 이후 확인시각 OBSERVED_BY만 보존. 정정 수치를 과거 분석에 소급 반영하지 않음. 현재 후보에서는 이 특정 보상수량 정정의 관계 대기만 해소, 추천 승인 아님.
- 나머지 최근 Form4 0001197647-26-000011(10/09), 0001696841-26-000014(09/23) 원문 검증. 후자09/21 신고 매도12,483·13,478·4,499주3건 확인. 전자는 기존 P/S 일반주식 범위로 생성되는 사건0건이며 임의 신호 생성 없음.
- 현재 후보 AAPL/MSFT/NVDA3개, 공식 원문 검증 거래 합계8건(AAPL2/MSFT3/NVDA3). NVDA 지원 매매 사건 최신 공시일09/23과 정정10/13·전체 최신 공시10/09는 별도. 최신 후보 수 증가를 3개 추천 활성화로 표시하지 않음.

## 구현·자동화 경계

- current_correction.js 신규: 단일 RSU 보상 수량 정정 전용 보수적 비교기. 발행사·문서 유형·최초 제출일·신고인·보고기간·거래일·종류·A코드/대가0·직접보유·각주·계획표시·순서/공식경로 검사. 수량/보상후 잔고와 정정/서명 메타데이터를 제외한 XML 구조가 달라도 차단. 다중 거래·파생/다른 보유·변경 각주·알 수 없는 정정은 자동 해결하지 않음.
- scripts/review-current-correction.mjs: 이미 확보한 원문 두 개를 비교해 결과 저장하는 재현 CLI. 외부 호출 없음, 안전환경 검사, 문서해시 충돌 시 기존 결과 덮어쓰기 금지. 원문 자동 발견/다운로드 전체 파이프라인 완성을 의미하지 않음. 이번 원문 조회·최초 문서 선택은 제한된 조사 실행으로 수행.
- 현재 수집기는 회사/문서ID/공시일/링크/해시/시점이 일치하는 검증된 보상수량 정정만 매매 신호에서 제외하고 나머지 원문 검증을 계속함. 새 미검증 정정은 계속차단. 정정 근거 변경 시 해당 기업 캐시만 재검증, 동일 근거 재실행은 캐시. 최대3회/기업 및 기존 Worker 전체12회 제한 유지. 새 Worker/타이머 없음.
- 저장 검증 정책v2에 정정 근거 포함: 변경 기업 재검증 및 보고서에 정정 전후 수량·공식 출처 제공. 자동 보고서의 예외는1→0이나 기업별 상태는 모두PARTIAL, 추천HOLD 유지. 이후 가격/기업행동·재무·Risk 검증이 남음.

## 화면·테스트·안전

- 실제 Web API 후보3/추천0, 자동보고 정정09/11→10/13·172,507→160,418주·매수/매도신호 아님 표시. Chrome320/390/768/1440px 가로 넘침없음·펼침 상태 새로고침후 유지. 증거 data/v2/verification/frontend-redesign/correction-review-20261019.json.
- Galaxy A33 기존 앱 재실행/서버연결·후보3·NVDA·공시09/23·원문3/3 확인. data/v2/verification/frontend-redesign/galaxy-correction-candidates-20261019.json, docs/uiux/galaxy-correction-candidates-20261019.png. 기기에서 정정 상세 수량 전수 대조·원문 링크 터치는 NOT RUN; Web 상세 확인과 구분. 앱 데이터 보존/재설치 없음. iOS 신규화면 NOT RUN.
- 최종 node scripts/run-master-qa.mjs: 회귀727 PASS/0 FAIL/0 SKIP, Android계약3 PASS/0 FAIL. data/v2/verification/master-qa/master-qa-20261019090513228.json. 실제 명령 node scripts/test-offline.js 및 node --test test/android_external.test.js. 오프라인 fixture로 실행, 테스트 외부/주문 호출 없음. 새9개 테스트: 정정관계·수량·발행사/신고인/기간 충돌·미래/경로·지원외유형·각주/정정사유·문서별검토/새정정차단·추가XML변경·기업별캐시 무효화. node문법/git diff --check PASS.
- 로컬서버 재시작 후 Worker capital cached/external0, validation 재사용3/예외0/external0, market 기존 PRICE_PROVIDER_COOLDOWN/cached 유지. 실제공식조회6회는 별도 위 조사이며 테스트/캐시 실행과 구분.
- 실거래OFF/brokerfalse·추천/삼성전자성과/Apple순위HOLD. 이번 실제 주문호출0(수행작업 범위), 과거계좌 전체감사NOT RUN. JINI개발HOLD·운영환경·외부공개·다른프로젝트 변경 없음.

## 다음과 한계

- Microsoft/NVIDIA 최신가격은 공급자 제한·기업 캐시 만료 후 확보 필요. 기업행동 전수·재무·비교기업/Risk·공개 후1/5/20일 연구·예측력 통계검증은 미완료. 국내SK1,014주/DB9건/PBR0 문제도 이번 해결 아님.
- 다음은 후보별 실제 금융 검증 입력 연결과 가격 재검증, 정정 유형 확장 시에도 원문/버전별 공개시점 보존. 지원하지 않는 정정을 통과시키거나 조건을 낮춰 추천하지 않음.
- 변경: src/v2/current_correction.js 신규; current_capital.js/current_capital_collection.js/current_validation.js, public/app.js; scripts/review-current-correction.mjs 신규; test/current_correction.test.js 신규/current_collection.test.js; QA/AUTO_DEV_LOG. 로컬 수집·검증 JSON/화면증거 별도 보존.
- Overall PARTIAL: NVIDIA 특정 정정관계 검증과 매매 사건3건/화면 연결 완료, 금융 검증·추천은 계속 보류.

---

# K-STOCK 공통 자동 검증·결과 재사용·예외 보고 — 2026-10-19 KST

## 이번 범위와 결과

- Preflight: AGENTS.md/ARI_COMPLIANCE_STANDARD, 프로젝트/remote/branch/commit/기존 변경 확인. auto/kstock-development-20260930 / ea406852610c00bef0dbe469de95c42fca662c30. 로컬 개발 대상127.0.0.1:3000. 기존 사용자 미커밋 변경·자료 보존, 다른 프로젝트 변경 없음.
- src/v2/current_validation.js: 기존 AAPL/MSFT/NVDA에 공통 저장 근거 검증 함수 적용. 입력 증분 fingerprint는 정책 버전·한국 날짜·해당 기업 이벤트·수집 상태·가격·보고서 재무/위험 근거를 포함. 변경된 기업만 재검증하고 나머지는 저장 결과 재사용. 날짜 변경 및 같은 한국 날짜 안의 가격 최신성 만료도 재검증 조건에 포함.
- 실제 저장 자료로 첫 실행 evaluated3/reused0, 두 번째 evaluated0/reused3, 외부요청 각각0 확인. NVDA 정정 관계 미확인 예외1 및 nextAction VERIFY_CORRECTION_CHAIN 유지. Apple/MSFT는 PARTIAL. 추천검증 완료 기업0. 결과는 data/v2/influence/current-validation.json에 원자 저장, PID 잠금·죽은 잠금 복구는 기존 공통 유틸 재사용. 재시작 후 결과 유지. 최근 실행 요약 history 최대30회.
- 기존30분 Worker 끝에 저장 검증/보고 단계 연결. 별도 Worker·타이머 생성 없음, 외부수집 비활성일 때도 저장 검증만 수행 가능. 입력이 잘못되면 기존 보고서는 보존하고 currentTasks.validation을 BLOCKED로 기록. 오류를 성공으로 바꾸지 않음. 변경 없음도 정상 실행 결과로 evaluated0/reused3 보고.
- 추가 안전 수정: 새로운 정정 공시/수집 차단이 발견되면 기존 원문 검증 이벤트가 남아 있어도 현재 후보 blockers에 정정 검토/수집 차단을 반영. 과거 사건·원문 검증 사실을 삭제하거나 정정값을 소급 적용하지 않음. 정정 원문 자체 해결은 이번 범위 밖이며 보류 유지.

## API·화면·실행 확인

- influence_service→currentResearch.automationValidation에 저장 보고서 제공. API는 기업별 validatedAt·재사용 여부·검증 상태·부족 자료·다음 작업 및 예외를 노출. 보고서는 저장 근거 검증이며 실제 외부 원문 재수집·기업행동/재무/PBR 검증 완료를 의미하지 않음.
- Web 신호 화면: 마지막 검증시각, 재검증/재사용/예외 수, 기업별 다음 작업을 펼쳐 확인. 색상 외 한국어 상태 표시. Chrome320/390/768/1440px 가로 넘침없음, 보고서 펼침 상태 새로고침후 유지. 증거 data/v2/verification/frontend-redesign/incremental-validation-20261019.json.
- 로컬 서버만 기존 안전 설정으로 재시작. 실제 Worker currentTasks.validation COMPLETED_WITH_HOLDS / evaluated0 / reused3 / exceptions1 / externalRequests0 / checkedAt2026-10-19T08:41:22.029Z 확인. 실행 완료 표시는 추천 완료를 뜻하지 않음. JINI 개발HOLD/운영 서버/인증 설정 변경 없음.
- Galaxy A33 기존 앱 재실행 후 서버연결·신호 화면 이동, 저장근거 자동검증/재검증0/재사용3/예외1/추천보류 및 기업별 보고서 요약 표시 확인. 처음 재실행 직후 로딩 중에는 메뉴가 없어 결과로 인정하지 않고 로딩 완료 후 재확인. 증거 data/v2/verification/frontend-redesign/galaxy-incremental-validation-20261019.json. 상세 모든 항목 터치/스크롤/연결장애 전수 재검증은 NOT RUN.

## 테스트·안전·다음

- node scripts/run-master-qa.mjs 최종 회귀718 PASS/0 FAIL/0 SKIP, Android계약3 PASS/0 FAIL. 최종 증거 data/v2/verification/master-qa/master-qa-20261019084111392.json. 명령: node scripts/test-offline.js 및 node --test test/android_external.test.js. 자동 테스트는 고정 fixture/오프라인, 실제 금융/주문 요청 없음.
- 추가7개: 예외/자료부족 판정, 변경기업만 무효화/재시작재사용, 날짜·정책 변경, 미래입력차단, 손상입력시 이전보고서 보존/실거래차단, 당일가격만료 경계, 정정발견시 현재후보 보류. 기존 Worker 통합 테스트에 저장 검증 실제 수행 assertion 추가. 초기 보고서 버전 필드 참조 오류로4개 실패한 실행은 수정 후 재실행했으며 최종 결과와 구분. node --check public/app.js/모듈 및 git diff --check PASS.
- 이번 신규 외부 금융 조회0. 기존 Apple/MSFT 사건과 가격, 음의 과거 연구 보존. Microsoft 최신가격·NVDA정정/PBR·기업행동·재무/Risk·예측전략 검증은 미완료. 추천·삼성전자 성과·Apple순위 HOLD, broker/live false, 이번 작업 실제 주문호출0(수행 작업 범위), 과거 전체 계좌 감사는 NOT RUN.
- NOT RUN: iOS 새 보고서 실기기, NVDA정정 원문관계 해결, 새로운 1/5/20일 시장반응, 실제 프로세스 강제종료/OS 재부팅복구. 재시작 결과 재사용과 fixture 잠금 검증을 OS복구 검증으로 대체하지 않음.
- 다음: 예외 목록의 공식 정정 원문 연결 검증 → 공급자/기업 캐시 만료 이후 가격 확보 → 실제 기업행동/재무/위험 모듈 결합 → iOS 동일화면 검증. 적용 대상은 사전고정3기업으로, 전체시장 자동검증 완료나 코드 자동개발 시스템 완성을 뜻하지 않음.
- 변경파일: src/v2/current_validation.js 신규, current_research.js/official_research_collection.js/influence_service.js, public/app.js, test/current_validation.test.js 신규 및 current_research.test.js/current_collection.test.js, 본 QA 및 AUTO_DEV_LOG.md. 비밀값 출력/데이터 삭제/유료 서비스/배포 없음.
- Overall PARTIAL: 증분 저장 검증·보고/화면 연결 완료, 투자 추천의 필수 금융·시장 검증은 계속 보류.

---

# K-STOCK 다종목 최신 연구·검증 상태 연결 — 2026-10-19 KST

## 구현 및 실제 결과

- 기준 auto/kstock-development-20260930 / ea406852610c00bef0dbe469de95c42fca662c30, package1.0.0. AGENTS·ARI 준수 기준/remote/기존 변경 확인. 기존 미커밋 변경과 자료 보존. 대상은 로컬127.0.0.1:3000, 공개 배포 없음.
- 사전 고정 연구 대상 AAPL/MSFT/NVDA. 수익률을 조회한 뒤 선정하지 않음. SEC 메타데이터 CIK·회사명 및 Form4 XML CIK·ticker 이중 검사. 원문 Common Stock/P·S 거래만 기존 정규화 규칙으로 처리. 13F를 실제 거래로 바꾸지 않음.
- 현재 공시 수집을 기업별24시간 캐시/가장 오래 미조회한 기업 우선으로 확장. 1회1기업·메타데이터1+원문최대2·최대3요청. 기존 Worker 전체 최대12요청 유지. Apple 단일기업 저장 파일은 기존 시각/문서/이벤트를 보존해 마이그레이션. 실패도 해당 기업 캐시에 남기며 다른 기업 조회를 막지 않음. 새 Worker/타이머·인증 변경 없음.
- 실제 SEC GET 총4회: MSFT metadata+원문2(3회), NVDA metadata1회. MSFT CIK0000789019 / MICROSOFT CORP, NVDA CIK0001045810 / NVIDIA CORP 응답 신원 검증. MSFT 접수0000789019-26-000228(10/15), 0000789019-26-000226(10/14) 원문 확보. 후자에서10/13 신고 매도3,387·2,927·991주 총3건 검증. 전자는 지원하는 P/S 일반주식 거래 결과0건으로, 거래 신호를 만들지 않음. 원문 해시·제외 수·공식 링크 보존.
- NVDA 최근 Form4/4A 대상4건에 정정 공시 존재: CURRENT_AMENDMENT_REVIEW_REQUIRED. 제목/접수 목록만으로 정정 전후 관계를 해결하지 않으며 원문 이벤트 반영0. 자료 부족을 정상 완료로 표시하지 않음.
- 최신 후보 AAPL1→AAPL/MSFT2, 공식 원문 검증 거래 합계2→5. MSFT 최신 지원 거래 공시일10/14, 거래일10/13. 전체 발행사 최신 공시일10/15와 후보 거래 공시일10/14를 혼동하지 않음. 정정 대기NVDA는 수집 상태에는 보이나 가짜 사건 후보를 만들지 않음.
- 공개 가능 시점은 실제 읽기 확인 OBSERVED_BY. 최초 공개 시각 확정 아님. D2·기업행동·재무/비교기업/Risk·예측력 Gate 미충족. 추천0/HOLD, 과거Apple2/MSFT음수1 연구 보존.

## 가격·UI·운영

- 가격 수집도 같은 고정 대상과 기업별 캐시·결과 병합으로 확장. 보고서에 재무가 없는 기업은 재무 수치를 생성하지 않고 기업행동 범위 INCOMPLETE 유지. 기존 AAPL 가격을 새 기업 처리로 덮어쓰지 않음.
- 실제 MSFT 가격 시도 및 재시작 시NVDA 가격 시도는 기존 AlphaVantage PROVIDER_COOLDOWN에 의해 외부요청0으로 차단. 저장 공급자 제한 시각2026-10-19T13:37:07.340Z. 캐시를 삭제하거나 우회/유료 전환하지 않음. 기업별24시간 실패 캐시도 유지하므로 공급자 제한 만료 즉시 재시도를 보장하지 않음. AAPL10/16 원주가343.46USD 유지; MSFT 최신 가격 미확보를 화면에 명시.
- API currentResearch.collectionQueue에3기업별 실제 확인시각/상태/정정 보류 사유, 각 후보 validationChecks에 원문·공개 후 이용시점·최신가격·기업행동·재무/비교기업/위험·예측력 상태 제공. D2기간 통과는 최초공개시각 검증 완료와 별개로 표시. 실제 검증기가 새로 모든 조건을 완료했다고 주장하지 않음.
- Web 상세에6개 상태와 부족 사유, 기업별 공식 자료 수집 상태 추가. Chrome 실제API: 후보2/추천0, 320/390/768/1440px 가로 넘침없음, 상세 펼침 새로고침후 유지. data/v2/verification/frontend-redesign/current-multicompany-20261019.json.
- Galaxy A33 기존 앱 재실행/서버연결/스크롤, 후보2·추천0·검증대기2, Apple 공시10/15·가격10/16, MSFT 공시10/14·원문3/3·가격확인중 표시 확인. 실제UI 텍스트 data/v2/verification/frontend-redesign/galaxy-multicompany-20261019.json, 캡처 docs/uiux/galaxy-multicompany-20261019.png. 앱 데이터/설치 보존.
- 기존 서버만 안전설정으로 재시작. 기존30분 Worker에서 capital cached=true/external0, market NVDA PRICE_PROVIDER_COOLDOWN/external0 기록. 개발용 JINI HOLD 표식 해제/운영 변경 없음.

## 검증·한계·다음

- node scripts/run-master-qa.mjs 최종 회귀711 PASS/0 FAIL/0 SKIP, Android계약3 PASS/0 FAIL. 증거 data/v2/verification/master-qa/master-qa-20261019083433920.json. 초기 제한 샌드박스에서는 Android Java fixture 포트 바인딩1건 실행 실패; 허용된 로컬 검증 환경에서 동일 테스트 재실행하여 최종PASS. 테스트 삭제/완화 없음.
- 추가 회귀4개: 고정MSFT/NVDA신원/XML교차차단, 기업별캐시마이그레이션·인증실패격리·순환, 후보별부족상태, 다종목가격병합/재무없음/캐시. 전체 테스트 오프라인fixtures, 위 실SEC조회와 분리. node --check 및 git diff --check PASS.
- NOT RUN: 이번 iOS 신규UI/실기기, 새후보1/5/20거래일 관측, NVDA정정원문관계검증, MSFT/NVDA가격확보, 국내미해결금융/PBR해결, 예측전략통계검증. 추천·삼성전자성과·Apple순위HOLD, 실거래OFF, 이번 작업 실제 주문호출0(수행한 작업 범위). 전체 계좌/과거 주문 감사는 수행하지 않음.
- 다음 작업: NVDA정정원문관계 검증기와 문서버전 연결 → 공급자 제한/기업캐시 만료 후 가격검증 → 후보 재무·기업행동/Risk 실제 검증 연결 → 공개후 관측축적과 추천정책 검증 → iOS동일화면QA. UI 상태표시 구현과 추천 검증완료를 구분. 외부 공개/상시운영 완성 아님.
- 변경: src/v2/current_universe.js 신규; current_capital.js/current_capital_collection.js/current_market_collection.js/current_research.js/influence_service.js, public/app.js, test/current_collection.test.js/current_research.test.js, QA보고서/개발로그. 로컬 공식수집자료·QA증거 별도보존. 다른 프로젝트/인증정보 변경 없음.
- Overall: PARTIAL — 다종목 공식수집과 실제 후보2/화면 연결 완료, 추천과 연구 성과 검증은 보류.

---

# K-STOCK 최근 공식 자료 → 현재 분석 후보 — 2026-10-19 KST

## 결과와 실제 확보 자료

- 기준 브랜치 auto/kstock-development-20260930, 커밋 ea406852610c00bef0dbe469de95c42fca662c30. 기존 사용자 변경·Apple/SEC 원본 근거 보존. 이번 상태 PARTIAL.
- 최근 30일(2026-09-20~10-19) 공시를 현재 후보로 분리. 과거 Apple 2건과 음의 초과수익 Microsoft 1건은 과거 연구 영역에 보존. 과거 원문을 오늘 조회했다고 현재 사건으로 계산하지 않음.
- 실제 SEC 읽기 3회 HTTP200: Apple submissions 1회, Form4 원문 2회. 접수번호 0001140361-26-039785(10/15 공시, 10/13 거래)와 0001140361-26-039158(10/08 공시, 10/06 거래). 각각 보고된 매도 2,399주, 10b5-1 계획 표시 확인. 매도 의도나 매도 추천으로 해석하지 않음.
- 최초 공개 시각 미확인. 실제 원문 확인 시각 2026-10-19T07:35:20/21Z를 OBSERVED_BY로 기록하며 최초 공개 시각으로 대체하지 않음. 기존 D2 이용 가능 정책 대기 유지.
- 기존 승인 AlphaVantage 경로 읽기 2회. AAPL 원주가 종가 343.46 USD, 가격 기준일 2026-10-16. 가격 상태 READY이나 기업행동 범위 INCOMPLETE이므로 총수익률·검증 완료 성과로 사용하지 않음. API 비밀값·인증 변경 없음.
- 현재 분석 후보 AAPL 1개, 후보 내 관측 5건 중 원문 검증 2건. 미검증 기존 관측 3건은 부족 상태로 보존. 최근 Form4 대상 14문서 중 2문서 처리, 12문서 대기. 검증된 추천 0개, 순위·점수 null. 전체 시장 수집 완료가 아님.

## 자동화와 화면

- 기존 Scheduler/30분 Worker에 연결. 새로운 Worker·타이머 생성 없음. 현재 신규 원문·가격 경로는 AAPL 한정. 24시간 캐시, 원문 최대2건/수집, 새 자료만 진행, 전체 주기 공유 최대12 HTTP 요청. PID 파일 잠금·재시작 결과 보존·죽은 잠금 복구. 인증 실패는 차단하고 실패 결과도 24시간 보존하며 무한 재시도 없음. 지수 백오프를 새 경로에서 구현했다고 주장하지 않음.
- 재시작 후 실제 registry currentTasks: capital/market cached=true, 신규 요청0, 신규 문서0. 이전 확보 자료 재사용 확인. 로컬127.0.0.1:3000만 재시작; 외부 공개/LAN listener 추가 없음. 기존 개발 HOLD 표식은 해제하지 않음.
- Web 홈·신호 화면에 현재 후보, 가격 기준일, 공시일, 원문 확인 수, HOLD 사유 표시. 공시일·거래일·공개 확인일 분리. 과거 연구는 별도 영역. 이전 API에 currentResearch가 없으면 자료 대기 표시하며 과거 사건을 현재 후보로 대체하지 않음.
- Chrome 실제 API 확인: 320/390/768/1440px 모두 가로 넘침 없음, 상세 펼침 새로고침 후 유지. 증거 data/v2/verification/frontend-redesign/current-research-20261019.json.
- Galaxy A33 기존 앱 재실행·서버 연결·스크롤·홈 수치1/0/1·Apple 가격/공시 기준일 Web 일치 확인. 캡처 docs/uiux/galaxy-current-research-20261019.png 및 galaxy-current-candidate-20261019.png. 기존 앱 데이터 보존, 재설치 없음. iPhone/iPad 신규 화면 실기기 검증 NOT RUN. VoiceOver/음성 테스트 실행하지 않음.

## 테스트와 실행 경계

- node scripts/run-master-qa.mjs → 회귀707 PASS/0 FAIL/0 SKIP, Android 계약3 PASS/0 FAIL. 실제 명령 node scripts/test-offline.js 및 node --test test/android_external.test.js. 증거 data/v2/verification/master-qa/master-qa-20261019074946585.json. 테스트 외부 요청 차단, 위 실자료 수집은 별도 실행.
- 기간/미래 자료 제외, 발행사·경로·정정 검증, 원문 거래 검증, D2, 가격 유형/날짜, 중복, 현재/과거 UI 분리, Worker 공유 호출 상한·캐시·실패·재시작 잠금 검증 추가. node 문법 및 git diff --check PASS.
- 추천·삼성전자 성과·Apple 순위 HOLD. KSTOCK_BROKER_ENABLED=false / KSTOCK_LIVE_TRADING_ENABLED=false 유지. 이번 작업에서 주문 API 호출0(수행 명령과 GET 수집 범위); 전체 과거 계좌 감사나 테스트 파서의 null을 0으로 바꾼 주장이 아님.
- NOT RUN/차단: 최초 공개 시각 입증, 최신 후보 기업행동 전수·재무/동종기업/Risk 재검증·예측력 검증, 신규 사건 이후1/5/20일 반응(관측 대기), iOS 신규 UI 검증. 기존 국내 PBR 표본0/SK1,014주/DB9건 문제 해결로 보고하지 않음.
- 다음 자동 작업: 일일 캐시 만료 시 처리하지 않은 Apple 공식 원문을 제한적으로 검증. 추천 활성화는 D2 대기 해소만으로 허용하지 않으며 기업행동·재무·Risk·통계 검증이 필요. 다른 종목 확대는 현재 AAPL 제한 수집기를 범용화하고 동일 검증 계약을 적용할 후속 개발.

## 이번 변경 파일

src/v2/current_capital.js, current_research.js, current_collection_io.js, current_capital_collection.js, current_market_collection.js, official_research_collection.js, influence_service.js, research_dashboard.js; scripts/collect-current-capital.mjs, refresh-current-market.mjs; public/index.html, public/app.js; test/current_research.test.js, current_collection.test.js, candidate_ui.test.js; 본 QA 및 AUTO_DEV_LOG.md. 실제 수집 JSON과 UI 증거는 로컬 data/v2·docs/uiux에 보존. 원문 전문 대신 검증에 필요한 필드·문서 식별자·링크·해시 저장, secrets 출력 없음.

---

# K-STOCK XCODE UI & VOICEOVER AUTOMATION — 2026-10-19 KST

## 이번 변경과 범위

- AGENTS·공통 준수 기준, pwd/remote/branch/commit/기존 변경 확인. auto/kstock-development-20260930 / ea406852610c00bef0dbe469de95c42fca662c30. 기존 미커밋 변경/데이터 보존. 로컬 localhost:3000 및 기존 iPhone17 시뮬레이터만 UI 테스트 대상.
- ios/KStockLocal.xcodeproj 및 공유 KStockLocal/KStockVoiceOver 스킴 추가. UIKit 앱과 XCTest UI 타깃, iOS Simulator 전용/CODE_SIGNING_ALLOWED=NO. 물리 기기 서명·설치·프로필 변경 없음. 기존 build-device.py와 별도이며 Xcode 제품 릴리스/상시 서버 완성을 뜻하지 않음.
- ios/UITests.swift: 실제 재연결 버튼 터치·최소44pt, 가로 프레임 확인 후 메뉴→종목 상세 이동, Apple sufficientElementDescription 접근성 감사. VoiceOver 전용 테스트는 앱 내부에서 실제 활성 상태를 확인하고 메뉴/종목 링크 터치·필요 시 이중 탭으로 화면 이동 확인.
- ios/App.swift: 상태/재연결 버튼 접근성 identifier, 재연결 힌트 추가. --voiceover-ui-test일 때만 상태 진단 value 노출, 일반 사용 화면에 진단값 표시 없음. 실제 iPhone 설치 앱은 이번 업데이트하지 않음.
- ios/run-ui-tests.py: 기존 VoiceOver 상태 기록→선택 모드 실행→finally 원상복원/재조회. xcodebuild 종료코드와 xcresult 실제 통과/실패/스킵 수 검사; 0개 실행·예상 수 불일치도 PASS 금지. 기본3개와 VoiceOver1개를 별도 스킴으로 실행. 빌드/로그/xcresult/장치 상태는 ignored ios/build에 보존.
- public/app.js: 앱 버전 안내의 Android 전용 문구를 플랫폼 공통 문구로 변경. 기존 UI/데이터 계산은 유지. .gitignore는 Xcode 사용자별 상태 제외 추가. README에 실제 재현 명령·범위 기록.

## 실제 실행 결과

- `python3 ios/run-ui-tests.py 5523F72B-5CB2-4413-9CA1-F3FCCB400E42`: 최종 일반 **3 PASS/0 FAIL/0 SKIP**, VoiceOver 원상복원 확인. build/ui-20261019T065635669796Z/receipt.json → data/v2/verification/frontend-redesign/ios-xcui-standard-20261019.json.
- 같은 명령 `--voiceover`: **1 PASS/0 FAIL/0 SKIP**, 실제 UIAccessibility.isVoiceOverRunning 확인 및 메뉴→종목 이동 성공, 종료 후 비활성 원상복원. build/ui-20261019T065511956234Z/receipt.json → data/v2/verification/frontend-redesign/ios-xcui-voiceover-20261019.json.
- 최초 일반 테스트가 기존 VoiceOver 제스처 튜토리얼을 정확한 제목·확인 버튼으로 닫았음. 인증/네트워크 권한 팝업 자동 허용은 구현하지 않음.
- 초기 가로 테스트는 UI 이동에 통과했지만 app.screenshot 영역 캡처에 회전/잘림 흔적 발견. 프레임 width>height 대기 추가 및 XCUIScreen 전체 캡처로 수정한 뒤3개 재실행 PASS. 초기 결과를 완전한 시각 검증으로 삼지 않음. 최종 캡처 docs/uiux/ios-xcui-landscape-20261019.png, ios-xcui-voiceover-20261019.png 직접 확인.
- `node scripts/run-master-qa.mjs`: 회귀 **689 PASS/0 FAIL/0 SKIP**, Android 계약 **3 PASS/0 FAIL**. data/v2/verification/master-qa/master-qa-20261019065429547.json. 이 결과와 iOS4개/relay4개는 별도 집계.
- `node --test ios/relay.test.mjs` **4 PASS/0 FAIL**. Python 문법, node --check public/app.js, git diff --check PASS.

## 한계·안전·다음

- 이번4개는 iOS27 시뮬레이터의 실제 UI 자동화 결과이며 물리 iPhone 결과로 표시하지 않음. 기존 iPhone15 실데이터 QA PASS는 앞선 별도 실행 기록으로 보존. 물리 기기 가로 터치/VoiceOver 전체 제스처/모든 읽기 순서·라벨/재무 필드 전수 대조 **NOT RUN**.
- 시뮬레이터 VoiceOver는 비활성 원상복원, UI 테스트 종료 시 portrait 복원. 물리 iPhone 잠금 해제 여부는 읽기 확인만 수행. LAN 릴레이 재실행 없음/전용LAN listener 없음. 기존 승인 노출 예산도 추가 사용 없음. 외부 수집·Apple 계정/서명·인증정보·운영환경·다른 프로젝트 변경 없음.
- 추천·삼성전자 성과·Apple 순위 HOLD/실거래 OFF 유지. 이번 실제 주문 호출0건. 백엔드 개발 HOLD/금융 선행 조건은 변경 없음.
- 다음: 실제 기기 VoiceOver·가로 조작 및 전체 데이터 필드 대조, 상시 HTTPS/기기 인증 연결과 릴리스 구성, 백엔드 인수인계/공식 금융 근거 확보. 이번 반복 UI/VoiceOver 검증 체계 PASS, 전체 프로젝트 Overall PARTIAL.

# K-STOCK PHYSICAL iPHONE QA SUCCESS — 2026-10-19 KST

- 사용자가 iPhone 잠금 해제를 확인한 후 실제 lockState passcodeRequired=false 확인. AGENTS·공통 준수 기준/Git 식별/기존 변경 보존. branch auto/kstock-development-20260930, commit ea406852610c00bef0dbe469de95c42fca662c30. 실거래/추천·성과 보류 유지.
- 승인된 같은 LAN endpoint192.168.0.16:3104와 공개 GET 범위로 재개. 이전221초를 차감한 잔여679초보다 짧은660초 상한 적용. 사용자 승인 범위/프로필/권한/기존 localhost 서버 변경 없음.
- **실제 iPhone15 설치 앱 실행 및 API 연결 PASS**: devicectl이 ai.kstock.ios.localvalidation 실행 성공. 앱 전용 Documents/qa-result.json 수신; physicalDevice=true, checkedAt2026-10-19T06:45:48Z, EXECUTED 확인. 잠금 해제/네트워크 허용 우회 없음.
- 실기기 WebKit QA: 홈/투자신호/글로벌인물/시장/연구/종목6개 화면 active 및 가로 넘침 없음. 삼성전자005930 상세/TTM/펼침26개 실제 표시. WebKit 임시 규칙으로 해당 후보 API만 차단→짧은 오류+이전 자료/펼침 유지; 차단 규칙 제거→실제 재조회/펼침 유지/STALE 경고 복구. 이는 물리 Wi-Fi 단절 시험을 뜻하지 않음.
- Web글자200%에서 가로 넘침 없음, 재시도 버튼44px. 실제 홈 화면에서 서버 연결됨, 연구13/검증예측0/주의14 및 추천보류 확인. docs/uiux/ios-physical-home-20261019.png. 모든 재무수치·원천필드 전수 대조/실기기VoiceOver·가로터치·앱 전체 시나리오 완료 주장 아님.
- ios/verify-result.py에 --receipt 추가. 복사한 물리기기 영수증은 physicalDevice=true 및 원래 checkedAt 최근10분 조건까지 검사. 실제9개 검증 묶음 PASS, data/v2/verification/frontend-redesign/ios-physical-20261019.json. 회귀689개에 중복 합산하지 않음.
- 임시 릴레이 옵션은1~900초 범위만 허용. 승인시간 단축/초과 차단 테스트 추가, 타이머·종료 시 활성 연결도 닫도록 보완. node --test ios/relay.test.mjs **4 PASS/0 FAIL**.
- node scripts/run-master-qa.mjs 실제 실행: 회귀 **689 PASS/0 FAIL/0 SKIP**, Android 계약 **3 PASS/0 FAIL**. data/v2/verification/master-qa/master-qa-20261019064634912.json. Python 문법/git diff --check PASS.
- 검증 직후 이번 LAN relay 프로세스만 신원 확인 후 종료, 전용 LAN listener 종료 확인. 누적 노출325초<900초. 이전 localhost:3104 프로세스는 변경하지 않음. data/v2/verification/frontend-redesign/ios-lan-20261019.json에 재개/종료/승인 잔여 기록. 기기에 앱은 유지되지만 임시 서버는 종료됐으므로 상시 연결을 제공하지 않음.
- 변경: ios/validation-relay.mjs, relay.test.mjs, verify-result.py, README.md, QA/개발 로그 및 근거. 실거래 OFF, 추천·삼성전자 성과·Apple 순위 HOLD, 이번 실제 주문 호출0건. 다른 프로젝트/계정·인증정보/운영배포/JINI HOLD 변경 없음.
- 남음: 실제 VoiceOver 읽기순서·제스처, 실기기 가로 터치와 전체 필드 대조, 상시 HTTPS/기기 인증·출시 설계, 백엔드 인수인계 및 금융 선행 조건. 이번 실기기 연결/기본 복구 범위 PASS, 전체 프로젝트 Overall PARTIAL.

# K-STOCK APPROVED LAN VALIDATION — 2026-10-19 KST

- 사용자가 192.168.0.16:3104의15분 LAN 범위를 명시 승인한 후 실행. 기존 AGENTS·공통 준수 기준, 저장소/브랜치/커밋·기존 변경 확인. auto/kstock-development-20260930 / ea406852610c00bef0dbe469de95c42fca662c30. 인증정보·운영 서버·다른 프로젝트 변경 없음.
- 직전 자동 승인 검토 거절은 구체 사용자 동의로 해소됨. 승인된 공개 연구 GET/화면 파일 범위의 기존 임시 릴레이 실행 성공. 주소·범위·쓰기 차단을 확장하지 않음.
- 실제 LAN 검증: 화면200, POST 후보403. 로컬 원본과 health/연구 dashboard의 summary·eventCards/삼성전자 candidate·analysisDate·status/benchmarks 비교 모두 일치. GET /.env, /api/account, /api/watchlist 및 POST 후보 경로403. 주문 경로 호출 없음. 근거 data/v2/verification/frontend-redesign/ios-lan-20261019.json.
- 실기기 iPhone15 앱 실행 시 Locked 오류: iOS가 기기 잠금 때문에 ai.kstock.ios.localvalidation 실행 거부. 두 차례 lockState 확인에서 passcodeRequired=true. 앱 전용 QA 파일도 미생성. **실기기 앱 실행·데이터 표시·실기기 실패/복구 NOT RUN**. 이전 설치 성공/시뮬레이터 PASS와 구분.
- 잠금 해제/Local Network 본인 허용은 기기에서 직접 해야 하므로 사용자에게 비밀번호를 보내지 말고 잠금을 해제하도록 요청. 암호 입력/생체인증·보안 우회 없음. 잠금 화면 캡처는 /tmp에만 있으며 보고서/Git에 포함하지 않음.
- 잠금 해제가 확인되지 않아 이 작업에서 시작한 node ios/validation-relay.mjs 프로세스만 확인 후 SIGTERM 종료, LAN listener 종료 확인. 별도 기존 localhost:3104 리스너/프로세스는 변경하지 않음. 노출 경과 시간·900초 승인 상한·잔여 노출 예산은 JSON에 기록.
- node --test ios/relay.test.mjs 이번3 PASS/0 FAIL. 기능 변경 없음: 전체 회귀/Android 계약 이번 재실행 NOT RUN(직전689/3 PASS와 별도). git diff --check PASS.
- 수정: ios/README.md의 승인 이력, QA/개발 로그·LAN 영수증. 추천·삼성전자 성과·Apple 순위 HOLD/실거래 OFF 유지, 이번 실제 주문 호출0건. 백엔드 반복 개발 HOLD 변경 없음.
- 다음: 기기 소유자의 잠금 해제 확인 후 승인 노출 예산을 지키며 실기기 실행/로컬 네트워크 허용·QA 결과/수치 대조·연결 복구 검증. 기기 잠금이 외부 선행 조건이므로 성공으로 표시하지 않음. Overall PARTIAL.

# K-STOCK iPHONE DEVICE INSTALL & ACCESSIBILITY FOLLOWUP — 2026-10-19 KST

- 사용자 “모두 승인할테니 진행해줘” 범위에서 실제 설치 준비/검증 수행. AGENTS·공통 준수 기준, Git remote/branch/commit/기존 변경 확인. 기준 auto/kstock-development-20260930 / ea406852610c00bef0dbe469de95c42fca662c30. 다른 프로젝트/기존 데이터 보존.
- **실기기 설치 PASS**: 연결 iPhone15, iOS26.6.1, 기존 개발 모드/페어링 상태 확인. 기존 와일드카드 프로필이 해당 기기를 포함하고, 유효기간/일치하는 개발 인증서가 확인되어 새 계정·프로필·인증서 생성 없이 서명. `python3 ios/build-device.py --device <연결기기> --url http://192.168.0.16:3104/` 성공, codesign --verify --strict 성공. `devicectl device install app`이 ai.kstock.ios.localvalidation 설치 성공 반환. 다른 앱 재서명/데이터 삭제 없음. **실기기 실행·실데이터 연결은 NOT RUN**; 설치 성공과 별개.
- ios/build-device.py: 명시적 사설IPv4/포트3104·기기·기존 일치 프로필 검증. ios/App.swift는 LOCAL_DEVICE_VALIDATION 명시 빌드만 물리 기기 허용, Info.plist의 검증 endpoint 사용. 시뮬레이터 기본 localhost:3000 유지. 서명·프로필·entitlements 산출물은 기존 ignored ios/build에만 저장.
- 준비한 ios/validation-relay.mjs: 사설IP 하나에만 바인드, 15분 한정, 정적파일3개 및 공개 연구/후보/벤치마크/상태 일부 GET 경로만 허용. 주문/계좌/watchlist/모든 쓰기 차단, 고정 localhost upstream, 인증·쿠키 헤더 전달 없음. ios/relay.test.mjs의 경계3개 PASS.
- **릴레이 실행은 자동 승인 검토에서 거절됨**. 이유: 연구 대시보드·후보·성과 API 응답이 같은 LAN의 다른 주체에 노출될 수 있고 구체 payload 및192.168.0.16 대상 명시 승인이 없음. 실행되지 않았으며 우회/터널/다른 도구를 통한 실행 없음. 구체 endpoint·자료 범위·15분 노출 위험을 설명한 사용자 선택 질문을 제출, 답변 대기. 광범위 사전 승인을 이 거절의 구체 동의로 임의 해석하지 않음.
- iPhone17 시뮬레이터 가로/VoiceOver 활성 상태에서 실제 WebKit QA: 6화면 진입·가로 넘침 없음, 삼성전자TTM, 오류 시 자료/펼침 유지, 복구 후 STALE/펼침 유지, Web200%/44px 검증 PASS. viewport750×306, voiceOverEnabled=true, 보이는 홈 컨트롤 빈 이름0. data/v2/verification/frontend-redesign/ios-landscape-voiceover-20261019.json.
- **VoiceOver 전체 조작 NOT RUN**: OS 최초 사용 제스처 안내 팝업이 있어 실제 읽기 순서/제스처/터치 검증 완료로 표시하지 않음. DOM 자동 검증 PASS와 구분. VoiceOver 비활성/portrait 복원 확인. ios-landscape-voiceover 및 ios-landscape 캡처는 시스템 팝업/회전 중 화면이므로 완전한 가로 시각 QA 근거로 사용하지 않음.
- iPad 시뮬레이터 가로 화면 로딩 완료 후 재캡처/직접 확인: 홈 사이드바·연구카드·운영상태 배치 확인. docs/uiux/ios-ipad-landscape-20261019.png. 초기 로딩/회전 중 캡처는 재캡처로 교체. 원래 방향 복원.
- `node scripts/run-master-qa.mjs`: 회귀689 PASS/0 FAIL/0 SKIP, Android 계약3 PASS/0 FAIL. 근거 data/v2/verification/master-qa/master-qa-20261019055654466.json. `node --test ios/relay.test.mjs` 별도3 PASS. Swift simulator/device build, Python 문법·node --check·git diff --check PASS.
- 변경: ios/App.swift, build-device.py, validation-relay.mjs, relay.test.mjs, README.md, QA/개발 로그/검증근거. backend JINI HOLD/인수인계 조건 미충족 상태 유지, 운영서비스·외부수집·인증정보 변경 없음. 추천·삼성전자 성과·Apple 순위 HOLD, 실거래 OFF, 이번 실제 주문 호출0건.
- 남은 조건: 구체 LAN 노출 동의 후 실기기 실행/Local Network 본인 허용 및 API값 대조, VoiceOver 실제 조작, iPhone 가로 터치 검증, 백엔드 인수인계 근거. Overall PARTIAL — 실제 iPhone 설치 완료, 실데이터 연결은 명시적 승인 대기.

# K-STOCK iOS NATIVE FOUNDATION & WEBKIT QA — 2026-10-19 KST

사용자 지시 “모두 승인 할테니 진행해줘”에 따라 iOS 검증과 설치형 로컬 앱 기반을 진행했다. 실거래/추천 활성화를 뜻하지 않는다. AGENTS·공통 준수 기준 및 Git remote/branch/commit/기존 변경 확인. 기준 auto/kstock-development-20260930 / ea406852610c00bef0dbe469de95c42fca662c30. 기존 변경·사용자 데이터 보존.

## 구현

- 새 ios/App.swift: UIKit UIScene + WKWebView, 공통 Web/API 사용. 화면 로드 상태와 API 상태 구분, 재연결44pt 이상, Dynamic Type 네이티브 라벨/버튼, safe-area 제약, 명시적 사용자 HTTPS 근거 링크만 외부 열기. 다른 top-level origin/scheme 차단. 비밀값·주문 브리지 없음.
- ios/build-simulator.py: 기존 Xcode SDK만 사용한 arm64 iOS Simulator 전용 빌드, ad-hoc 서명. Apple 계정/프로비저닝/유료 서비스/인증서 변경 없음. localhost 전용 ATS local networking. 물리 기기/운영 배포용 빌드 아님. Swift 소스에도 simulator-only 컴파일 경계 추가.
- ios/verify-result.py: 실제 WKWebView 영수증과 7개 검증 묶음 확인, 10분 이내 결과만 수용. ios/README.md에 빌드·설치·QA 재현 절차와 미완료 항목 기록. .gitignore에 ios/build 및 Python 캐시 제외.
- 첫 Swift 빌드 optional 반환 처리 오류 수정. 첫 설치 앱은 최신 SDK의 UIScene 요구로 시작 실패; 프로세스 한정 로그로 확인 후 SceneDelegate/manifest 추가해 재빌드·실행 성공. 초기 실패를 PASS로 보고하지 않음.

## 실제 iOS 검증

- iPhone17 및 iPadPro13 M5, iOS27 시뮬레이터에 ai.kstock.ios.localvalidation 설치·실행. 기존 다른 앱/프로젝트 수정/삭제 없음.
- 양쪽 실제 WebKit에서 홈/투자신호/글로벌인물/시장/연구/종목 6개 화면 진입·가로 넘침 없음. 삼성전자005930 실제 상세/TTM/펼침26개 확인.
- QA용 임시 WKContentRuleList로 후보005930 API만 차단: 짧은 연결 실패 문구, 이전 상세 및 펼침 유지 확인. 규칙 제거 후 실제 재조회, 펼침 유지 및 STALE 경고 회복 확인. 오래된 자료를 최신으로 표시하지 않음. 성공/오류 모두 임시 규칙 정리.
- Web 글자200%에서 가로 넘침 없음/재시도44px 이상. 네이티브 iPhone 시스템 content_size accessibility-extra-extra-extra-large에서 라벨/버튼 확대 및 Web 표시 확인, finally 기존 large로 복원. 이 확인은 VoiceOver나 Web 본문의 OS 배율 자동 연동 인증을 대체하지 않음.
- 영수증: data/v2/verification/frontend-redesign/ios-native-{iphone,ipad}-20261019.json. 각7개 검증 묶음 PASS(프로젝트689 테스트에 합산하지 않음). 캡처 docs/uiux/ios-native-{iphone,ipad,large-text}-20261019.png.
- 물리 iPhone15 연결은 devicectl로 확인했으나 서명·HTTPS/기기 서버 연결 구성 없이 설치하지 않음. 시뮬레이터 설치를 실기기 설치로 표시하지 않음.

## 회귀·안전·남은 조건

- node scripts/run-master-qa.mjs: 회귀689 PASS/0 FAIL/0 SKIP, Android 계약3 PASS/0 FAIL. 근거 data/v2/verification/master-qa/master-qa-20261019054517083.json.
- 최종 simulator build PASS, Python 문법/git diff --check PASS. 추가 simulator-only 컴파일 guard는 런타임 화면 변경 없음.
- NOT RUN: 물리 iPhone 설치/검증, VoiceOver, 가로 방향 터치/스크롤, Safari 자체 전체 오류 사이클(실제 WKWebView에서 검증), Web/Android/iOS 모든 수치·출처 필드 전수 대조, 운영 서명/출시. Xcode 제품 프로젝트/앱 아이콘/운영 인증은 미구현.
- JINI 보호 HOLD 및 백엔드 지시 대조: 반복 무인 개발 금지/기획·CODEX_HANDOFF 확인 조건이 여전히 존재. 사용자 승인은 기록했으나 인수인계 충족 근거를 확인하지 못했으므로 마커 제거/운영 서비스 변경하지 않음. 자동 개발 재개로 보고하지 않는다. 새 공식 금융 자료 확보 없음.
- 추천·삼성전자 성과·Apple 순위 HOLD, 실거래 OFF 유지. 이번 실제 주문 호출0건(계좌 감사 아님). 인증정보/외부 공개 배포/유료 사용/데이터 삭제 없음.
- 변경: ios/App.swift, build-simulator.py, verify-result.py, README.md, .gitignore, QA/개발 로그 및 검증 근거.
- 다음: VoiceOver·가로 방향 및 실기기 연결/서명 기반 완성, 최종 API 필드 대조; 백엔드는 기획·인수인계 근거 확인 후 별도 재개. Overall PARTIAL — iOS 설치형 시뮬레이터 기반과 실제 WebKit 검증 완료, 실기기/출시/연구 선행 조건 미완료.

# K-STOCK iOS SAFARI APPLICATION — 2026-10-19 KST

- AGENTS/공통 준수 기준, 저장소/remote/브랜치/커밋/기존 변경 확인. 기준 auto/kstock-development-20260930 / ea406852610c00bef0dbe469de95c42fca662c30. ios 디렉터리·Xcode 앱 프로젝트는 저장소에 없음. 이번 적용 대상은 공통 Web의 iOS Safari이며 네이티브 앱 생성/설치가 아님.
- 기존 짧은 오류/상세 재시도/상태 보존은 공통 public/app.js로 iOS에도 적용됨. public/index.html viewport-fit=cover, public/styles.css 모바일 safe-area 좌우/상단 여백, 기존 하단 safe-area 활용, 입력 최소16px, reduced-motion 시 부드러운 스크롤 해제 추가. 사용자 확대 제한 없음.
- 실제 iOS27 시뮬레이터: iPhone17(5523F72B-5CB2-4413-9CA1-F3FCCB400E42), iPadPro13 M5(983602C9-0139-42EC-A28C-5B3508E79D27). Safari localhost:3000 홈 로드 후 서버 연결됨, 실제13사건/예측신호0/주의14, iPhone 하단 메뉴/iPad 사이드바·연구 카드 표시 확인. 최초 캡처는 Safari 시작 화면이었으므로 PASS 근거로 사용하지 않고 로드 후 재캡처로 교체함. Safari 시스템 'ONARIA로 돌아가기' 표시는 기존 OS 기록이며 다른 프로젝트 파일/앱 수정 없음.
- 근거: docs/uiux/ios-iphone-home-20261019.png, ios-ipad-home-20261019.png.
- node scripts/run-master-qa.mjs 실제 실행: 회귀689 PASS/0 FAIL/0 SKIP, Android 계약3 PASS/0 FAIL. data/v2/verification/master-qa/master-qa-20261019053648779.json. git diff --check PASS.
- NOT RUN: iOS 실기기, VoiceOver/Dynamic Type, 가로 방향, Safari 오류·복구/상세 선택 전환 실조작, 네이티브 iOS 빌드/서명/설치. 홈 화면 검증을 이 항목의 대체 근거로 사용하지 않음.
- 변경: public/index.html, public/styles.css, QA/개발 로그 및 iOS 캡처. 인증정보/권한/외부 배포/자동개발 HOLD 변경 없음. 추천·삼성전자 성과·Apple 순위 HOLD, 실거래 OFF, 이번 실제 주문 호출0건.
- Overall: PARTIAL — iOS Web 적용 및 시뮬레이터 홈 확인 완료, iOS 네이티브 앱과 전체 상호작용/실기기 QA는 별도 미완료.

# K-STOCK 1–7 EXECUTION REVIEW — 2026-10-19 KST

기준: `/Users/ari/ARI/projects/k-stock-ai`, origin Naharuya/k-stock-ai, branch `auto/kstock-development-20260930`, commit `ea406852610c00bef0dbe469de95c42fca662c30`. AGENTS와 공통 준수 기준 확인. 기존 미커밋 변경 보존. 공개 배포 없음.

| 단계 | 이번 실행 | 남은 조건 |
| --- | --- | --- |
| 1 모바일 오류 안내 | 긴 일반 오류를 짧은 상태/재시도 안내로 변경. 이전 자료임을 표시. 모바일 안내 position:static으로 본문 가림 방지 | Galaxy의 새 오류 UI 실패 화면 직접 재확인 |
| 2 접근성 | 버튼 최소44px, 키보드 focus-visible 외곽선. 실제 Chrome320/390/768/1440px·글자200% 가로 넘침 없음 | Galaxy OS 글자 확대·TalkBack NOT RUN |
| 3 통합 QA/재실행 | Web 홈/투자신호/글로벌인물/시장/연구/종목 6화면×390/1440px 진입 및 가로 넘침 없음. Galaxy 기존 데이터 보존 force-stop/start 후 네이티브·Web 연결됨/실제 홈13사건·예측신호0·주의14 확인 | Galaxy 여섯 화면 전체 조작과 선택 상태 영속 보존 NOT RUN |
| 4 HOLD 조건 | 기존 마커 및 backend directive 대조. 반복 JINI 개발 금지, 기획 승인/CODEX_HANDOFF 확인 조건 존재 | 충족 증거 없음. 마커 제거·새 서비스 활성화 없음 |
| 5 연구 확대 | 기존 승인·활성화 정책을 그대로 사용한 공식 Collection Worker 한 사이클 실행: PARTIAL, 외부 요청0, 중복7, 변경원문0, 신규발언0/자본행동0/연구사건0. 저장 연구 Worker UNCHANGED_SOURCE | 신규 검증 표본 확보 미완료. 기존 Apple/MSFT 자료 삭제·대체 없음 |
| 6 금융 검증 | 기존 Peer Worker 실행: 총6, PARTIAL3/BLOCKED3, VERIFIED0/FAILED0. PER/PBR/PSR/EV_EBITDA 각 유효표본0, 외부요청0 | SK1014주/DB9건을 해결할 신규 공식 원문 없음. 기존 차단 해제 근거 없음 |
| 7 추천 판단 | 유효표본·연구 조건 미충족으로 추천/삼성전자 성과/Apple 순위 HOLD 유지 | 추천 활성화 불가 |

## 실제 테스트

- `node scripts/run-master-qa.mjs`: 제한 환경 최초 실행 회귀689 PASS, Android2 PASS/1 FAIL. 실패 기록 `data/v2/verification/master-qa/master-qa-20261019053240774.json` 보존.
- 로컬 모의 서버 포트 허용 후 같은 명령 재실행: 회귀 **689 PASS /0 FAIL/0 SKIP**, Android 계약 **3 PASS/0 FAIL**. `data/v2/verification/master-qa/master-qa-20261019053259570.json`.
- Web 실제 API/CDP: 200% 글자·반응형, 실제 후보 API 차단 시 짧은 오류 및 이전 상세 유지 확인. `data/v2/verification/frontend-redesign/error-accessibility-20261019.json`.
- 화면 매트릭스: `data/v2/verification/frontend-redesign/screen-matrix-20261019.json`. 초기 검사에 잘못 입력한 두 화면 ID는 실제 investment-signals/global-influence로 고쳐 재실행한 결과임. 전체 기능/원천 수치 재인증을 의미하지 않음.
- Galaxy RFCW1178RRE 앱 재실행 근거 `docs/uiux/relaunch-20261019-galaxy.png`. 데이터 삭제/재설치/권한 변경 없음. OS가 띄운 일시 경보 토스트는 앱 기능 검증 대상 아님.
- 공식 Worker 실행 영수증 `data/v2/verification/official-cycle-20261019.json`. 신규 자료0을 연구 확대 완료로 세지 않음. 외부 자동 수집 설정·주기·인증정보 변경 없음.
- `node --check public/app.js`, `git diff --check` PASS.

변경 파일: `public/app.js`, `public/styles.css`, 이 QA 보고서, `docs/AUTO_DEV_LOG.md`, 검증 JSON/스크린샷. Worker는 기존 결과/큐를 정상 저장했으며 과거 원문 삭제 없음.

안전: .env의 KSTOCK_BROKER_ENABLED=false / KSTOCK_LIVE_TRADING_ENABLED=false 직접 확인. 이번 작업 실제 주문 호출0건(계좌 감사 아님). 다른 프로젝트·운영 서버·API 인증정보 변경 없음.

다음 순서: Galaxy 새 오류 안내/접근성 및 전체 화면 QA → 기획 승인·인수인계 증거 확인 → 기존 승인 소스에서 실제 신규 원문 확보 → 날짜·주식수·배수와 시장 반응 검증 → 추천 조건 재판정. OS 접근성과 신규 금융·연구 자료 부족은 미완료로 유지한다.

Overall: **PARTIAL**. 1–7 전 영역을 실행 또는 조건 검토했으며, 신규 연구/금융 표본과 반복 자동 개발을 완료했다고 주장하지 않는다.

# K-STOCK GALAXY EXPANDED DETAIL RECOVERY — 2026-10-13 KST

- 프로젝트/remote/브랜치/커밋 및 AGENTS·공통 준수 기준 확인. `auto/kstock-development-20260930` / `ea406852610c00bef0dbe469de95c42fca662c30`, localhost·Galaxy 검증 앱만 대상. 기존 변경 보존, 기능 코드 수정 없음.
- Galaxy A33 RFCW1178RRE / 검증 앱2.6.5(265): 삼성전자 성과 근거를 펼친 상태에서 전용 USB reverse3103 제거→상세 다시 확인 실행. 실제 네이티브 “서버 연결 실패” 및 Web 오류/이전 자료 유지 문구 확인. 펼친 성과 설명과 OpenDART 출처 유지 PASS.
- finally에서 reverse3103→3000 복원 후 오류 화면의 실제 버튼 위치로 재조회. 네이티브 “서버 연결됨”과 Web 성공 문구 회복, 성과 근거 펼침 유지 PASS. 스크롤은 같은 근거 구간 유지가 시각적으로 확인됐으며 픽셀 좌표 자동 계측은 NOT RUN.
- 직전 실패 유도 미재현 기록은 그대로 보존한다. 이번 별도 실행에서 미완료 항목을 확인했다. 근거 `docs/uiux/mobile-expanded-failure-20261013.png`, `mobile-expanded-restored-20261013.png`, `data/v2/verification/frontend-redesign/mobile-expanded-recovery-20261013.json`.
- 기능 코드 변경이 없어 전체 회귀/Android 계약은 이번 재실행 NOT RUN. 직전 실제 회귀689 PASS/0 FAIL/0 SKIP, Android 계약 마지막3 PASS와 구분. 이번 문서 diff 점검 수행.
- 남은 NOT RUN: Galaxy 복수 가격 기간 선택(실제 자료는1개월만 지원), OS 글자 확대/TalkBack, 앱 재시작 상태 영속 보존, 픽셀 단위 스크롤 계측.
- JINI 자동 개발 보호 HOLD 여전히 존재. 이번 제거/자동 수집 활성화 없음. 기획 승인·인수인계 조건 확인을 거치기 전 실행 중으로 표시하지 않는다.
- 추천·삼성전자 성과·Apple 순위 HOLD, 실거래 활성화 없음, 이번 실제 주문 호출0건. 인증정보/다른 프로젝트/운영환경 변경 없음.
- 다음 프론트엔드 작업: 모바일 오류 안내 높이와 접근성, 앱 재실행 시 화면/상태 정책 검증. Overall: PARTIAL.

# K-STOCK MOBILE STATE & AUTOMATION STATUS — 2026-10-13 KST

- 기준 브랜치 `auto/kstock-development-20260930`, 커밋 `ea406852610c00bef0dbe469de95c42fca662c30`. 기존 사용자 변경과 앱 데이터를 보존했다. 이번 작업은 화면 검증·기록이며 기능 코드 수정은 없다.
- 자동 개발 상태: `/Users/ari/ARI/jini-agent/automation/KSTOCK_AUTO_HOLD`가 다시 존재하고 launchd 자동 개발 작업은 실행 중이 아니다. 마커에는 기획 승인·CODEX_HANDOFF 미확인 및 “Do not remove automatically”가 명시되어 있다. 이번 작업에서 HOLD를 제거하지 않았다. 30분 스케줄 설정과 실제 실행 상태를 구분한다.
- 마지막 확인 Job `222b700f-555f-4cbf-a4d8-306c9045563e`는 실행·보고 경로 검증(EVIDENCE_RECORDED, 보고 write1, 회귀689 두 차례, codeWrites0)이다. 새 일반 자동 개발/공식 수집 완료 보고는 확인되지 않았다.
- Galaxy A33 RFCW1178RRE, 기존 검증 앱2.6.5(265): 삼성전자 상세→TTM→성과 근거 펼침 및 스크롤 확인. 재조회 버튼 조작 뒤 펼친 성과 근거와 자료 부족 설명이 계속 표시됨을 관찰했다. 새 네트워크 요청 성공을 별도 계측한 결과는 아니다.
- USB reverse3103 제거 후 재조회 조작으로 실패를 유도했으나 이번 화면은 연결됨을 유지했다. 실패 상황 재현은 NOT REPRODUCED이며 실패 중 펼침 보존 PASS로 집계하지 않는다. reverse는 finally 복원했다. 이전 사이클의 실패/복구 PASS와 별도 기록한다.
- 실제 삼성전자 가격 자료는 한 달 범위만 지원한다. 복수 가격 기간 선택의 Galaxy 보존 검증은 NOT RUN이며 자료 없는 선택지를 활성화하지 않았다. OS 확대/TalkBack/앱 재시작 상태 영속 보존도 이번 작업 NOT RUN.
- `node scripts/test-offline.js`: 이번 실행 **689 PASS / 0 FAIL / 0 SKIP**. 로그 `/tmp/kstock-mobile-state-regression.log`. Android 계약은 이번 재실행 NOT RUN(직전3 PASS와 구분). 테스트 수 증가 없음.
- 근거: `docs/uiux/mobile-state-before-refresh.png`, `mobile-state-failed-refresh.png`, `mobile-state-after-refresh.png`. failed-refresh 파일명은 실패 유도 시도를 뜻하며 실제 실패 확인을 뜻하지 않는다. 검증 범위는 `data/v2/verification/frontend-redesign/mobile-state-20261013.json` 참조.
- 안전: 추천·삼성전자 성과·Apple 순위 HOLD 유지. 실거래 활성화/주문 호출/외부 수집/인증정보 변경 없음. 이번 작업 실제 주문 호출0건(계좌 감사 아님).
- 다음: 보호 HOLD의 기획 승인·인수인계 조건 확인 후 자동 개발 재개 여부 결정. 프론트엔드는 실패 유도의 실제 요청 여부를 계측하고 Galaxy 실패 중 펼침 보존 및 접근성 검증을 계속한다.
- Overall: PARTIAL.

# K-STOCK AGENT TASK RECOVERY & DETAIL RESILIENCE — 2026-10-13 KST

## 에이전트 실행·보고 경로

- 기준: 프로젝트 `/Users/ari/ARI/projects/k-stock-ai`, 브랜치 `auto/kstock-development-20260930`, 커밋 `ea406852610c00bef0dbe469de95c42fca662c30`; 기존 사용자 변경 보존.
- 원인: JINI 실행기는 npm-test를 금지했지만 시스템 지시의 일반 허용 목록에는 npm-test가 포함되어 있었다. `task_policy.mjs`로 K-Stock 전용 지시/실행 목록 통일. 모델의 `git status`/`git diff` 및 npm-test 표기는 지정된 git-status/git-diff/kstock-offline-test ID로만 정규화한다. 실제 npm 명령이나 임의 셸 실행을 허용하지 않는다. 다른 프로젝트 정책은 유지.
- 완료 근거 누락 시 최대 2회만 실행 교정; 기준 미충족은 계속 BLOCKED. 권한 검사 전 다른 프로젝트 E2E 정리 함수가 실행되지 않도록 순서 수정.
- 테스트 경로 점검용 `KSTOCK_VERIFY_EXECUTION_REPORT`는 모델 추론을 거치지 않고 기존 실행기로 테스트→기존 전용 보고서 보존/추가 저장→테스트→diff를 실행한다. 실제 PASS 집계 없거나 보고/테스트 실패 시 차단. 신규 Worker/스케줄/외부 수집을 만들지 않았다.
- 실제 성공 Job `222b700f-555f-4cbf-a4d8-306c9045563e`: EVIDENCE_RECORDED, 전용 보고서 실제 write 1건, kstock-offline-test 689 PASS 두 번, git-diff 실행. codeWrites 0, 신규 공식 수집 NOT RUN. 이 결과는 실행·보고 경로 복구이며 일반 무인 개발의 새 코드 완료나 신규 연구 성과를 증명하지 않는다.
- 중간 실패 보존: `7449d446...` 테스트686 PASS 후 report write 없음; `d1d65b39...` 테스트689 PASS 후 write 없음; `b6121252...` 보고 write 및 테스트689 PASS 이후 잘못된 git status ID 반복 실패. 이를 성공으로 재분류하지 않음.
- 기존 30분 자동 개발 스케줄 주기/외부 수집 활성 상태 변경 없음. 다음 일반 자동 개발 사이클은 실제 codeWrites/테스트/최종 상태로 별도 확인해야 한다.

## 연결 실패·복구와 상세 상태

- `public/index.html/app.js/styles.css`: 상세 다시 확인 버튼과 상세 화면 내부 상태 메시지 추가. 동일 기업 조회 실패 시 이전 자료를 유지하며 최신성 미확인 표시. 재조회 후 기업별 펼침/표 스크롤/가격 차트 선택 기간 및 페이지 스크롤 복원. 기업별 상태는 탭 메모리에 최대20개 보존하며 브라우저 재로드·앱 재시작 영속 보존을 의미하지 않는다.
- 다른 기업 실패 시 이전 기업 내용을 새 결과로 표시하지 않음. 인증 실패 시 상세·차트·캐시 비움. 오래된 보고서 경고와 기존 HOLD 유지.
- Web 실제 API: 삼성전자 조회만 CDP로 차단/복구. 동일 제목, 펼침 true, 실패/복구 scroll3133 일치; Apple(GLOBAL) 전환 후 삼성전자 펼침 복원. 320/390/768/1440px 가로 넘침 없음. 초기 메시지 높이로39px 이동 발견/수정 후 통과.
- Galaxy A33: USB reverse3103만 일시 제거하고 finally 복구. 실제 상세 실패 시 삼성전자 이전 내용+최신성 경고 유지, 상세 다시 확인으로 복구 PASS.
- 실기기 추가 결함: API 성공 후 Android 상단 연결 실패 표시가 남음. `MainActivity.java`에서 실제 API 성공 상태도 표시하도록 수정. 기존 인증 정책/권한 유지.
- APK 실제 빌드/설치: 기존 설치 APK와 인증서 SHA256 일치 확인 후 동일 검증 키 재사용. `android/build/local-validation-n6fxn688/build/release/k-stock-ai-local-validation.apk`, 버전2.6.5(265), adb install -r Success. uninstall/clear 없음. 앱 실제 실행 및 새 API 실패/복구 사이클에서 네이티브 상단 실패→연결됨 PASS.

## 검증·경계

- `node scripts/test-offline.js`: **689 PASS / 0 FAIL / 0 SKIP**. 기존686 유지 + 상세 실패/인증/기간 복원 fixture3건.
- `node --test test/android_external.test.js`: **3 PASS / 0 FAIL** (로컬 모의 포트 허용).
- JINI evidence/reporting/task-policy/verification-cycle fixture: **15 PASS / 0 FAIL**, 프로젝트 회귀689와 별도 집계.
- JS 문법 및 git diff --check PASS. Android 검증 APK 빌드/서명 검증/데이터 보존 설치 PASS.
- NOT RUN: Galaxy 실패 전후 펼침/차트기간 세부 조작(이는Web에서 확인), OS 글자 확대/TalkBack, 운영 인증/페어링, 외부 원문 열기, 새 일반 무인 코드 개발 사이클 완료.
- 신규 공식 금융 수집 없음. 기존 금융 차단/추천·삼성전자 성과·Apple 순위 HOLD. 실거래 OFF 유지, 이번 작업 실제 주문 호출0건(계좌 감사 아님). .env/인증정보/운영서버/외부 배포 변경 없음.
- 변경 파일: public/app.js, public/index.html, public/styles.css, test/candidate_ui.test.js, android/src/ai/kstock/mobile/MainActivity.java, 전용 백엔드 보고서(에이전트 실행), QA/개발 로그/검증근거. 사용자 승인된 에이전트 수정: JINI agent/developer.mjs, task_policy.mjs, verification_cycle.mjs.
- 근거: data/v2/verification/jini-repair/task-policy-recovery-20261013.json; data/v2/verification/frontend-redesign/stock-recovery-20261013.json; docs/uiux/stock-recovery-{failed,restored}-galaxy.png, native-recovery-{failed,restored}-galaxy.png.
- 다음: 실제 일반 자동 개발 사이클의 코드 변경·보고 확인, 모바일 펼침/기간 복원과 접근성 보완. 금융 조건은 별도 백엔드 검증을 계속한다.
- **Overall: PARTIAL** — 요청된 테스트 실행 경로/상세 복구 구현·검증 완료, 일반 자율 개발 완료 및 금융 선행 조건은 별도 미검증/보류.

# K-STOCK STOCK DETAIL DEVICE QA — 2026-10-13 KST

- 기준 브랜치 `auto/kstock-development-20260930`, 커밋 `ea406852610c00bef0dbe469de95c42fca662c30`; 기존 변경 보존. 배포 대상은 localhost 및 기존 USB 연결 Galaxy A33 검증 앱, 공개 배포 없음.
- 실기기 발견/수정: 삼성전자 근거 조회 후 hashchange가 가격 차트 위로 되돌아가던 문제. 상세 앵커 `#candidate-detail`로 이동하고 제목 초점을 유지하도록 `public/app.js` 수정. 요약 가격에 원주가·기업행동 검증 대기 표시 추가.
- Galaxy A33(SM-A336N): 기존 앱/데이터 보존. 전체 메뉴→종목 분석→후보 목록→삼성전자 근거 진입, 요약 직접 이동, TTM 바로가기, 긴 설명/4개 분기 스크롤, 성과 근거 터치 펼침 PASS. 가격 기준일 및 추천/성과 보류 표시 확인.
- 화면 일치: Web/A33 TTM 기간 2025-07-01~2026-06-30, 매출 485,272,032,000,000 KRW, 영업이익 178,964,931,000,000 KRW, 순이익 150,717,225,000,000 KRW, 연결/CFS, 이용 가능 시점 2026-08-14T23:59:59+09:00, 접수번호 20260310002820/20260814003699/20250814003156 표시 일치. 이는 저장된 실제 API 응답의 표시 대조이며 원문 금융 수치의 독립 재인증은 아님.
- Web: 실제 삼성전자 응답으로 320/390/768/1440px에서 상세 본문 계산 글자 크기 200% 적용 시 페이지 가로 넘침 없음. TTM 바로가기와 네이티브 summary Enter 펼침 PASS. 초기 CDP Enter 테스트는 문자 없는 키 이벤트로 실패; Enter 문자 포함한 입력으로 정상 확인. OS 글자 확대 검증으로 대체하지 않음.
- 실제 테스트: `node scripts/test-offline.js` 686 PASS / 0 FAIL / 0 SKIP. `node --test test/android_external.test.js` 3 PASS / 0 FAIL. `node --check public/app.js`, `git diff --check` PASS.
- NOT RUN: Galaxy OS 글자 크기 변경, TalkBack, 외부 원문 링크 열기, 이번 사이클 연결 실패/복구·앱 재실행. 이전 검증 결과를 이번 실행으로 합산하지 않음.
- 안전: .env broker/live false 확인. 추천·삼성전자 성과·Apple 순위 HOLD 유지. 이번 작업 실제 주문 호출 0건(계좌 거래내역 감사 아님). 외부 데이터 수집/인증/자동 실행 설정 변경 없음.
- 변경: `public/app.js`, QA/개발 로그, 실기기 스크린샷 3개 및 `data/v2/verification/frontend-redesign/stock-detail-accessibility-20261013.json`.
- 다음: 종목 상세 연결 실패·복구와 다시 진입할 때 선택/펼침 상태 보존, 모바일 접근성 확인. 금융 선행 조건 보류 유지.
- Overall: PARTIAL — 이번 상세 화면 실기기 검증 완료, 전체 접근성·금융 검증 미완료.

# K-STOCK STOCK DETAIL HIERARCHY — 2026-10-13 KST

- 기준: `auto/kstock-development-20260930`, `ea406852610c00bef0dbe469de95c42fca662c30`; 기존 미커밋 변경 보존.
- 구현: 실제 수집 종가·가격 기준일, 추천 보류, 종목 성과 상태를 최상단 카드로 배치. 기존 TTM·비교·위험 정보는 열린 구획으로, 긴 공시·주식수 근거는 펼침 구획으로 구성. TTM/비교 바로가기와 원문 링크 보존. 백엔드 계산/API 변경 없음.
- Web: 실제 로컬 삼성전자 응답으로 320/390/768/1440px 확인. 요약 3개, 상세 구획 19개, TTM 기간 합산 상태 표시, 페이지 가로 넘침 없음. 수치 원천 정확성을 이번 UI 검증으로 새로 인증하지 않음.
- 회귀: `node scripts/test-offline.js` — 686 PASS, 0 FAIL, 0 SKIP.
- Android 계약: 초기 제한 환경에서 모의 서버 바인딩 차단으로 2 PASS/1 FAIL; 로컬 포트 허용 후 `node --test test/android_external.test.js` 재실행 3 PASS / 0 FAIL.
- Galaxy A33: 이번 종목 상세 개편 실기기 검증 NOT RUN. 이전 비교기업 카드 실기기 확인을 이번 상세 검증으로 대체하지 않음.
- 안전: 추천·삼성전자 성과·Apple 순위 HOLD 유지. 이번 프론트엔드 작업 실제 주문 호출 0건, 실거래 활성화 변경 없음.
- 변경 파일: `public/app.js`, `public/styles.css`; 화면 근거 `docs/uiux/stock-detail-summary-web.png`, `data/v2/verification/frontend-redesign/stock-detail-20261013.json`.
- 다음: Galaxy A33 종목 상세 펼침·TTM 이동 검증, 글자 확대·접근성 확인. 금융 검증 선행 조건은 기존 보류 유지.
- Overall: PARTIAL.

# K-STOCK UI PEER MOBILE & STOCK NAVIGATION — 2026-10-13 KST

현재 기존 미커밋 및 백엔드 자동 개발 변경을 보존하고 public/app.js/index.html/styles.css만 수정했다. 모바일 비교기업6개를 기업별 카드로 표시하며 가격·통화·가격 기준일·주식수 기준일·배수별 판정·공식 상세 근거 버튼을 연결했다. 데스크톱은 기존 표 유지. 자료 부족 배수를 추정하지 않는다.

종목 근거를 실제 API로 불러오면 종목 상세 화면으로 이동하고 제목에 초점을 둔다. 중첩 candidate-detail을 직접 접근할 때 최상위 화면이 선택되지 않던 routing 오류를 수정했다. 작은 화면에서 scrollbar 공간과 body min-width가 합쳐져320px가336px로 늘어나던 문제도 수정했다.

실제 회귀 node scripts/test-offline.js 686 PASS/FAIL0/SKIP0; Android 계약3 PASS/FAIL0. node --check public/app.js/git diff --check PASS. Chrome 실제API: 기업카드6, 320/390 모바일카드·768/1440 표, 최종 실제320px→innerWidth320/scrollWidth320 확인. 중첩종목route 및 실제 삼성전자005930 상세조회 표시 확인(visible true/screen true/title 삼성전자). 전체 TTM·단위·원천 수치 대사로 확대해 주장하지 않는다. Galaxy A33 전체메뉴→동종기업→스크롤로 SK 카드의 가격·기준일·차단 상태 실제 표시 확인. 전체 상세 근거/표 항목의 실기기 조작은 이번 NOT RUN.

근거 data/v2/verification/frontend-redesign/peer-mobile-20261013.json, docs/uiux/peer-mobile-cards-web.png/peer-mobile-cards-galaxy.png. 이번 새 금융수집0/추천·성과HOLD/liveOFF/이번주문0. 백엔드 자동개발 설정은 이 작업에서 변경하지 않았다. Overall PARTIAL: 모바일 비교·상세 이동 개선 확인, 종목 상세 전체 정보 재배치와 접근성 전수 검증은 후속.

---

# JINI AUTO DEVELOPMENT RELEASE — 2026-10-13 KST

사용자가 승인한 순서(자동 지시 정리→작은 실제 개발→검증 후 HOLD 해제)를 수행했다. 기존 자동 지시문을 kstock-offline-test/저장 근거 Worker/Git 조회 및 전용 보고 체계에 맞췄고 HTTP200이라도 result.ok=false면 실패 exit를 반환한다. 원문 응답 전체 대신 job/status/reportPath만 자동 로그에 기록한다.

실제 JINI 개발 Job 0df76235-2137-4df7-a4c0-9892f409e84a: src/v2/saved_worker_outcome.js, test/saved_worker_outcome.test.js, docs/KSTOCK_BACKEND_AGENT_REPORT.md 실제 write3건, 코드 파일2건. 수정 이후 회귀686 PASS/FAIL0/SKIP0 및 diff 실제 실행. 순수 Worker 상태 분류 함수이며 생산 Worker에 연결된 기능 또는 신규 수집으로 주장하지 않는다. 리뷰에서 RETRY_PENDING/undefined 조건을 기존 3번째 테스트에 추가해 회귀686 재확인했다. 모델 보고 prose와 실제 자동 집계는 구분한다.

기존 KSTOCK_AUTO_HOLD를 KSTOCK_AUTO_HOLD.released-20261013로 보존 이동했다. 삭제한 사용자 데이터 없음. 기존 com.ari.jini-kstock-auto launchd StartInterval1800/RunAtLoadtrue를 재사용, plist 수정·새 에이전트/스케줄 생성 없음. 첫 기존 자동 사이클 kickstart: 실제 PID30550 및 Job 797b89db-2116-4048-82eb-203d137a5f77, startedAt 2026-10-12T19:26:48.069Z (2026-10-13 04:26:48 KST), 상태 RUNNING 확인. 완료 전 성공으로 표시하지 않는다.

진행·종료 보고: data/v2/verification/jini-jobs/797b89db-2116-4048-82eb-203d137a5f77.md 및 동일 JSON. 상태 API latestJob에서 조회. 이전 개발 검증 완료 보고: data/v2/verification/jini-jobs/0df76235-2137-4df7-a4c0-9892f409e84a.md. 상세 release 근거 data/v2/verification/jini-repair/autodev-release-20261013.json.

안전: 제한된 로컬 백엔드 개발만 자동화. public/android/.env/공통 QA·로그 수정 agent 차단, 주문/유료/API 인증/권한/운영/공개 배포 변경 금지. 기존 공식 수집 Worker 정책은 그대로이며 이번에 새 외부 수집 경로를 활성화하지 않았다. 추천/삼성성과/Apple순위 HOLD, liveOFF. 검증 작업 실제 주문호출0이며 실행 중 새 사이클 전체 결과는 아직 미집계.

Overall PARTIAL: 작은 자연어 개발/테스트/보고 사례 VERIFIED 및 자동 개발 ENABLED. 첫 일반 자동 사이클 완료·장기 반복 안정성·신규 공식 수집·금융 연구 미해결은 NOT YET VERIFIED. 이번 Android/실기기 NOT RUN. 다음은 자동 사이클 실제 종료 보고·수정 범위 검토 및 차단 자료 확인.

---

# JINI WORKER EXECUTION & AUTOMATIC REPORT — 2026-10-13 KST

사용자 승인: 기존 Mac mini 에이전트의 제한된 실행과 반드시 보고되는 체계 구축. 기준HEAD ea406852610c00bef0dbe469de95c42fca662c30/auto/kstock-development-20260930 보존.

## 실제 구현

기존 JINI developer/run을 K-STOCK에 한해 자동 보고 실행기로 감쌌다. 시작 시 작업ID/PID/RUNNING JSON·Markdown을 생성하고 종료 시 성공·실패·근거 부족 상태 및 실제 실행 집계를 원자적으로 갱신한다. 코드/모델 오류도 보고서에 남기며 응답에 jobId/reportPath/statePath를 돌려준다. 모델의 근거 없는 완료 prose 및 원문 tool 로그는 응답·보고서에 포함하지 않는다. 수정 파일·실행 task·실제 테스트 집계만 요약한다. 에이전트 종료 때 미완료 작업은 상태 조회에서 INTERRUPTED로 표시하고 종료 시각을 만들지 않는다. 저장소 쓰기가 불가능한 장애까지 완료 저장을 보장한다고 주장하지 않는다.

최근 보고는 GET /developer/status?project=K-STOCK의 latestJob에서 실제 저장 결과로 확인된다. 진행 중 중복 K-STOCK 요청은 실행하지 않고 별도 차단 보고한다. 자동 개발 HOLD 파일 및 30분 설정은 변경하지 않았다.

제한된 실행 지시 KSTOCK_EXECUTE_SAVED_RESEARCH는 기존 createResearchAutomation Worker → node scripts/test-offline.js → git diff를 실행한다. 임의 shell 추가 없음. 저장 원천만 재검증하고 외부 수집·AI 외부 호출·주문 활성화 없음. 부모 secret 환경변수 전달 제외, broker/live/외부수집 false 강제. 비밀 .env 읽기, public/android 및 공통 QA/개발로그 write 차단. 다른 프로젝트의 실행 흐름 변경 없음.

## 실제 실행 증거

Job: 730f7d8e-0fd2-426b-be12-04fbc0640a03
Worker: UNCHANGED_SOURCE (기존 자료 변경 없음)
External Calls: 0 / New Official Documents: 0
Regression: 683 PASS / FAIL0 / SKIP0 (이번 JINI가 실제 실행)
Diff: EXECUTED (기존 전체 diff를 자신의 수정으로 합산하지 않음)
Report: data/v2/verification/jini-jobs/730f7d8e-0fd2-426b-be12-04fbc0640a03.md
State: data/v2/verification/jini-jobs/730f7d8e-0fd2-426b-be12-04fbc0640a03.json
Live Status API: 동일 작업ID·EVIDENCE_RECORDED·실제 보고서 경로 조회 확인.
Unit Tests: 완료검증4+자동보고/예외/중단4 =8 PASS / FAIL0. K-STOCK 회귀683과 별도 집계. node --check 및 git diff --check PASS.

이전 모델 경로 보고서 작성 실패는 BLOCKED 보고 대상이다. 이번 실행 성공은 제한된 저장 근거 사이클·테스트·보고 연결의 성공이며 신규 공식 수집이나 투자 연구 완료가 아니다.

## 파일과 경계

K-STOCK: scripts/run-saved-research.mjs, data/v2/verification/jini-repair/* 및 jini-jobs/*, QA·개발로그.
사용자 승인된 JINI 수정: /Users/ari/ARI/jini-agent/agent/developer.mjs, task_reporting.mjs, completion_evidence.mjs. 로컬 에이전트 재시작. 부팅 설정·유료서비스·인증정보·배포 변경 없음.
추천/삼성성과/Apple순위 HOLD, liveOFF, 이번 실제 주문 호출0. 보고 집계 모듈 자체는 주문감사 미수행이므로 realOrderCalls=null을 유지한다.

전체 PARTIAL. 제한된 지시→실행→보고 체계 VERIFIED. 자연어 다단계 개발 성공, 새 외부 데이터 자동 수집, 장기중단/부팅복구, Android/실기기 이번 NOT RUN. 다음: 승인된 기존 공식 수집 경로의 제한 실행을 같은 보고 체계에 연결하고 원문·호출 근거 검증. 이번 HOLD 해제 또는 신규 자동스케줄 활성화는 수행하지 않았다.

---

# JINI EXECUTION EVIDENCE REPAIR — 2026-10-13 KST

사용자가 기존 JINI 실행/보고 연결 수정을 승인해 /Users/ari/ARI/jini-agent/agent/developer.mjs 및 completion_evidence.mjs만 수정했다. K-STOCK 완료 판정에만 적용하며 다른 프로젝트 코드·자동화 설정·HOLD·인증정보·운영 서버 변경 없음. 로컬 com.ari.jini-agent만 재시작했다.

원인: model done=true와 빈 actions를 그대로 ok=true 처리했다. 기존 변경 git-diff를 자신의 수정 근거로 오인하고 실제 테스트 없이 완료 문구를 반환했다.

수정: 성공한 실제 write/replace 및 수정 이후 테스트 결과·diff를 검증한다. K-STOCK 전용 보고서 write가 필수다. 보고서 인계만 수행한 경우 테스트 PASS를 주장하지 않는다. 실행 근거 부족은 ok=false/BLOCKED. 모델의 자유 완료 주장을 최종 message로 전달하지 않고 검증 요약을 제공한다. 원문·secret 없는 집계 JSON을 0600/wx로 저장한다. 수집·연구 유효성은 별도 UNVERIFIED/NOT_ESTABLISHED다.

실제 검증: 완료 판정 단위4 PASS, K-STOCK 오프라인 회귀683 PASS/FAIL0, 모듈 syntax PASS. 실제 JINI 요청 HTTP200이나 ok=false로 정확히 차단: NO_EXECUTED_WRITE/BACKEND_REPORT_MISSING. 보고서가 없는 경로에 replace 시도해 실패한 기록이며 성공 write0/test0이다. 근거 data/v2/verification/jini-runs/completion-20261012191118631.json 및 jini-repair/repair.json. 허위 성공 차단의 실제 동작을 확인했고 백엔드 수집·개발 완료로 보고하지 않는다.

상태 PARTIAL: 보고 안전장치는 수정/검증됐지만 JINI 모델이 스스로 올바른 write를 수행해 보고서를 작성하는 작업은 미완료. 기존 도구 목록에 임의 공식 조회/Worker 실행이 없으므로 자료 수집 자율 실행도 검증되지 않았다. 자동 개발 HOLD 유지; 이를 해제해도 미지원 수집/모델 수행 능력이 해결되지 않는다. 다음은 기존 Worker를 호출하는 제한된 읽기 전용 실행 도구와 구조화된 작업별 보고를 연결하고 실제 성공 사례를 확보하는 것이다. 무제한 shell·비밀 읽기·주문 기능은 추가하지 않는다.

추천/성과/Apple순위 HOLD, 실거래 OFF, 이번 실제 주문 호출0. 코드 백업 /tmp/kstock-jini-fix/developer.before.mjs. 기존 프로젝트 미커밋 변경 보존. Android/프론트 변경 없음; 이번 Android/실기기 NOT RUN.

---

# K-STOCK AI PERSON TIMELINE QA — 2026-10-13 KST

기준 HEAD: ea406852610c00bef0dbe469de95c42fca662c30 / auto/kstock-development-20260930. 기존 변경·자료 보존.

인물 상세에 공식 발언 및 인물에 직접 연결된 공시만 날짜순 타임라인으로 추가했다. 발언일/공시일 표기, 실제 거래일 미확인 유지, AI 해석은 기존 상세에서 공식 자료와 구분한다. 기관·기업 행동은 별도 근거로 유지하며 유명 인물의 개인 거래로 연결하지 않는다. 동일 근거 펼침 식별자를 추가했다.

실제 테스트: node scripts/test-offline.js 683 PASS/FAIL0/SKIP0(이전681+회귀2); node --test test/android_external.test.js 3 PASS/FAIL0; node --check public/app.js 및 git diff --check PASS. Chrome 실제 API 인물3 × 폭4 =12조합 넘침 없음, 선택·스크롤·펼침 보존 확인. 파월3/버핏1/월러1 타임라인 항목은 기존 발언이며 신규 자료로 합산하지 않는다. Galaxy A33 기존 앱에서 인물 선택/스크롤 화면 확인; 증거 docs/uiux/person-timeline-galaxy.png. 전용 실행 근거 data/v2/verification/frontend-redesign/person-timeline-20261013.json.

변경: public/app.js, public/styles.css, test/candidate_ui.test.js, QA/개발 로그 및 근거. API/Worker/네이티브 코드/인증정보 수정 없음. 실제 외부 링크 열기/전체 TalkBack/OS 글자 확대 NOT RUN. 신규 연구 자료0, 추천·성과·Apple순위 HOLD/liveOFF/이번 실제 주문호출0. 전체 PARTIAL. 다음은 인물 선택 이동 편의와 상태/자료 부족 안내, 상세 접근성 검증.

---

# K-STOCK AI FRONTEND DETAIL FLOW — 2026-10-13 KST

기준 HEAD ea406852610c00bef0dbe469de95c42fca662c30 / auto/kstock-development-20260930. 기존 미커밋/자료 보존, 새 배포·커밋 없음.

홈의 최근 연구 카드 → 선택한 사건 상세 → 수익률/기간/공식 근거 흐름 구현. 선택 상세 자동 펼침, 키보드 포커스 및 연구 메뉴 활성 상태 연결. 전체 메뉴 Escape/바깥 클릭 닫기 지원. 동적 패널 삽입 시 순서로 복원하던 펼침 상태 충돌 수정: 화면 컨테이너와 근거 식별자로 복원한다.

검증: `node scripts/test-offline.js` 681 PASS / FAIL0 / SKIP0 (기존679+상태 복원 회귀2). `node --test test/android_external.test.js` 3 PASS / FAIL0. `node --check public/app.js`, `git diff --check` PASS. 실제 Chrome: 상세 이동/자동 펼침/포커스/메뉴 선택/새로고침 유지, 라이트·다크 × 4폭 상세 넘침 없음, Escape/바깥 클릭 PASS. 기존24폭 화면·기간/선택/펼침/스크롤 보존·실패복구 재검증 PASS. 최초 브라우저 상세 자동 펼침 검증은 순서 복원 버그로 실패했으며 수정 후 최종 통과.

Galaxy A33 기존 앱: 홈 링크 스크롤·터치 → Apple 선택 상세, 연구 하단 메뉴 활성, 펼쳐진 공식 근거/관측 수치 실제 확인. 증거 docs/uiux/detail-selected-galaxy.png, detail-evidence-galaxy.png, research-selected-detail-web.png. 새 APK 설치 없음. 외부 링크 열기·TalkBack·OS 글자 확대·실기기 자동갱신 후 포커스는 이번 NOT RUN.

변경: public/index.html, public/app.js, public/styles.css, test/candidate_ui.test.js, QA/개발 로그 및 검증 근거. 실행 결과 data/v2/verification/frontend-redesign/detail-flow-20261013.json.

신규 금융 자료/연구 표본0; 추천/삼성 성과/Apple 순위 HOLD, liveOFF, 이번 실제 주문 호출0. 백엔드 증거 인계 응답은 도착했으나 전용 보고서가 없고 실행 기록은 읽기/Git만으로 여전히 실제 수집·수정·테스트 완료 미검증. 전체 PARTIAL. 다음: 인물 상세 시간순 표현과 상태/자료 부족 안내 개선, 상세 접근성 검증.

---

# K-STOCK AI FRONTEND REDESIGN REPORT — 2026-10-13 KST

PROJECT: /Users/ari/ARI/projects/k-stock-ai
BRANCH: auto/kstock-development-20260930
COMMIT: ea406852610c00bef0dbe469de95c42fca662c30 (기준 HEAD 유지)
OVERALL: PARTIAL — 공통 프론트엔드 개편과 아래 검증 완료, 금융·독립 전략 검증은 기존 보류.

## 구현

사용자 제공 시안을 참고해 라이트 사용자 화면·다크 운영 패널·블루 강조색을 적용했다. 홈은 실제 API 현황, 최근 관측 결과, Mac mini 상태를 표시한다. 연구 절차 안내는 운영 진행률과 구분한다. 홈/신호/인물/연구/시장/종목/동종기업/후보/포트폴리오/성과/설정/공시/출처 화면에 공통 카드·제목·여백·색상을 적용했다. 모바일 전체 메뉴 13개로 하단 내비게이션 외의 화면도 접근 가능하다. 선택 신호 강조와 음/양 초과수익 표시, reduced-motion 지원. 기존 API 및 Android 네이티브 연결·인증 흐름은 보존했다.

## 실제 검증

- `node scripts/test-offline.js`: 679 PASS / FAIL 0 / SKIP 0. 최초 실행은 기존 DOM fixture의 classList.toggle 미지원으로 실패했고 add 방식으로 수정 후 최종 전체 통과.
- `node --test test/android_external.test.js`: 3 PASS / FAIL 0. 샌드박스 최초 bind 실패 후 로컬 서버 허용 환경에서 재실행 통과.
- `node --check public/app.js`, `git diff --check`: PASS.
- Chrome 실제 localhost API: 15개 화면 × 320/390/768/1440px = 60개 레이아웃 조합, 페이지 넘침 없음/한 화면 활성 확인. 종목 상세는 현재 선택·빈 상태 레이아웃 검증이며 전체 TTM 값 검증이 아니다.
- 라이트·다크 × 4개 폭: 전체 메뉴 13개, 동종기업 이동, 메뉴 닫힘 검증 PASS.
- 기간·선택 사건·펼침·스크롤 보존, 연결 실패 후 복구 PASS. 390px 폰트 확대 점검 PASS(브라우저 CSS 확대이며 Android OS 글자 확대와 구분).
- Galaxy A33 SM-A336N/RFCW1178RRE: 기존 앱으로 실제 홈/신호/인물/시장/연구 화면, 전체 메뉴·스크롤 확인. API 값 연구13/예측0/주의14, 보수적 사건3을 Web과 확인. APK 재설치·데이터 초기화 없음.
- Galaxy A33: USB 역방향 연결 제거 후 32초 동안 기존 관측 카드 유지·네이티브 연결 실패 표시 확인, 연결 복구 및 앱 force-stop/재실행 확인. 스크롤로 가려진 Web 오류 문구 자체는 이 실기기 스크린샷으로 확인하지 않았으며 Web 브라우저에서 별도 검증했다.
- 근거: data/v2/verification/frontend-redesign/result-20261013.json; docs/uiux/redesign-*.png 및 simple-*.png.

## 데이터와 역할 분리

이번 신규 공식 연구 자료 0. 기존 Apple2/MSFT1과 손실 사례 보존. 회계·PBR 미해결 수치를 UI 개편으로 유효 처리하지 않는다. 추천/삼성전자 성과/Apple 순위 HOLD, 실거래 OFF, 이번 작업 실제 주문 호출0.

JINI 수신·실행 응답은 받았으나 실제 transcript는 AGENTS/CLAUDE 읽기와 git-status/git-diff만 수행했다. 코드 수정·테스트 완료라는 응답을 완료 근거로 인정하지 않는다. 전용 백엔드 보고서 미생성. 근거: data/v2/verification/frontend-redesign/backend-handoff-audit.json. 전달됨과 구현 완료를 구분한다.

## 남은 검증

Android 전체 상세 표·TTM·DB 정정 수치, OS 글자 확대, TalkBack/전체 대비 감사, 외부 공식 링크 실제 열기는 NOT RUN. 사용자 제공 이미지의 숫자를 운영 데이터로 사용하지 않음. 네이티브 검증용 연결 패널을 제품 출시 디자인 완료로 판정하지 않음. 새 APK 배포·운영 변경·부팅 서비스 변경 없음.

수정 파일: public/index.html, public/app.js, public/styles.css, 본 QA/개발 로그 및 화면·검증 근거. 기존 사용자 미커밋 변경 보존.

다음 작업: 백엔드의 실제 검증 보고서 확보, 기존 상세 화면의 수치별 실기기 검증, 네이티브 출시 UI와 접근성 점검. 전체 연구 시스템 완료 또는 전략 예측력 입증을 주장하지 않는다.

---

# K-STOCK AI MASTER DEVELOPMENT REPORT — 2026-10-13 KST

PROJECT: /Users/ari/ARI/projects/k-stock-ai
BRANCH: auto/kstock-development-20260930
COMMIT: ea406852610c00bef0dbe469de95c42fca662c30 (기준 HEAD; 새커밋/배포 없음)
VERSION: package1.0.0 / server0.1.0 / Android기존2.6.5(265) / ResearchAPI schema1
OVERALL: PARTIAL / RESEARCH_PARTIAL

## CYCLE RECORD

Cycle ID: master-qa-20261012181646486
Started At: 2026-10-12T17:49:11.396946+00:00 (기준 회귀 실행 기록 생성시각)
Finished At: 2026-10-13T03:18:16.756315+09:00
Executed QA Started/Finished: 2026-10-12T18:16:46.486Z / 2026-10-12T18:16:51.088Z
Baseline: 지시서655PASS 기준 유지; 이번 현재코드 시작663PASS/FAIL0/SKIP0 실제 확인.
Final: Regression679PASS/FAIL0/SKIP0; AndroidContract3PASS/FAIL0. 신규16테스트(백테스트10/QA결과파서4/캐시시각1/최초오류UI1). 테스트 삭제·완화 없음.
Actual test evidence: data/v2/verification/master-qa/master-qa-20261012181646486.json

New Features: 백테스트 입력 안전 검증 / 실제 종료코드·집계 기반 QA 실행/기록 / 현재 입력 차단 API·UI.
Fixed Issues: 캐시 archive시각이 HTTP성공처럼 보이는 표시 분리; 첫 조회 실패 때 로딩 잔류·좁은 줄바꿈·이전자료로 오해하는 문구 수정.
New Sources/Documents/Statements/Capital Actions: 모두0. 테스트·문서·화면 개선을 실제 금융 원문 확보 성과로 합산하지 않음.

## DEVELOPMENT PROGRESS

Previous Estimate:75% (인수인계 추정)
Current Estimate:NOT_ASSESSED — 전체 PART1~18/79~81 본문 미확보 및 전체 영역 가중치/완료 기준 불명확. 제목뿐인 추가 답변을 실제 본문으로 간주하지 않음.
Evidence: docs/KSTOCK_MASTER_QA_MATRIX.md의9영역·82~112 대응표. 기능·실자료·실기기·운영·전략 실증을 별도로 판정; 투자 전략 성공확률과 혼동하지 않음.

## BACKEND

Collection Worker: 기존 재사용, PARTIAL. 원문/캐시·중복·소스별 주기 유지. 이번수동실데이터외부조회0; 실제scheduler 자연주기·재시작tick에서 외부0/중복7 확인.
Validation Worker: 기존 금융6회사 PARTIAL3/BLOCKED3/FAILED0; 연구와 별도 큐.
Scheduler: 현재PID21227, interval1800000ms, APPROVED_READ_ONLY_AND_SAVED_EVIDENCE.
Last Run:2026-10-12T17:58:55.247Z
Next Run:2026-10-12T18:28:55.373Z (KST03:28:55; 재시작하면 변경)
Recovery: 기존 fixture중단/잠금/일시오류/인증차단/백오프/저장무결성 회귀 PASS. 현재서버재시작 후 원문/결과보존. 실제재시작 없는30분주기 2026-10-13 02:26:18KST 관측, 외부0/중복7/연구UNCHANGED_SOURCE.
Natural-cycle evidence:data/v2/verification/master-qa/natural-cycle-2026-10-12T172617974Z.json
장기soak/실제OS재부팅복구 NOT RUN. 기존등록서비스5개 및경로·peer설정 불일치는 매트릭스에 기록, 변경없음.

## OFFICIAL SOURCES

|소스|승인자동설정|집계시작이후실제HTTP성공|최근저장응답|인증관측|
|---|---|---|---|---|
|SEC|True|NOT_OBSERVED|2026-10-12T16:15:46.313Z|NOT_OBSERVED|
|OpenDART|True|2026-10-12T16:53:35.737Z|2026-10-12T16:53:35.741Z|ACCESS_CONFIRMED|
|KIS|True|NOT_OBSERVED|2026-10-12T16:13:44.481Z|NOT_OBSERVED|
|IR|True|NOT_OBSERVED|2026-10-12T16:15:46.614Z|NOT_OBSERVED|
|CentralBank|True|NOT_OBSERVED|2026-10-12T16:15:47.541Z|NOT_OBSERVED|

위 5개는 기존 승인·캐시 경로 유지이며 이번새 원문조회/검증5성공을 의미하지 않는다. HTTP성공은 source-health ledger의 실제 fetch만 사용. 이전 Worker cache archive시각은 lastArchivedAt으로 분리해 lastSuccessAt에 승격하지 않음. KRX AUTH_BLOCKED; KIND/Government미연결 유지. source slot·캐시·백오프·호출상한 준수. 과거SEC metadata/IR hash확보를 새 실제 거래로 표시 안 함.

## RESEARCH AND MARKET REACTION

Verified Statements:5 / Local AI Generated:3 (이번신규0)
Verified Capital Actions:8 (확정거래/기관보유/의향/기업기간합계 구분 유지)
Verified Combined Signals:0
Exact Public Time Samples:0
Conservative Start Samples:독립3 (Apple2/MSFT1)
1D:3 / 5D:3 / 20D:3
Excess Return:기존9관측행, 신규0. Microsoft -0.1608674818423972 / -2.382630811780495 / -7.035217271199545%p 보존.
Benchmark:S&P500 가격지수, 동일 관측기간; 배당·비용 미포함 가격수익률. exact/cons별도,13F거래일추정 없음.
Apple 재현:node scripts/reproduce-apple-market.mjs PASS,6행2독립사건,FebruaryHOLD,외부0/주문0.
New Samples:0; 연구 확대·전략 예측력 입증 완료로 보고 안 함.

## BACKTEST

Status:BACKTEST_BLOCKED
Sample Count:기존보수적사건3, 체결·독립평가 입력유효0
Out-of-Sample:NOT_ESTABLISHED (training/validation/finalEvaluation 실제구간 미확보)
Implemented/Tested:명시적 사전정책·최소독립표본, 구간중복·경계누출, 공개/거래가능시점·미래가격, 비용·세금·슬리피지 근거/공개시점, 유동성용량·수량, 사건/포지션중복, 원주가/수정주가·배당·벤치마크·통화·단위 차단.
통계최소 기준은 자료 없이 임의설정 안 함. 충분조건fixture결과 INPUTS_VERIFIED_ONLY도 예측검증·매수추천·주문을 켜지 않는다. 현 연구카드에는 실제 체결시각/구간/비용 등 계약미확보가 있어 blocker반환; 연구용 가격관측 검증과 체결백테스트 입력 검증은 다름.
Limitations:정확최초공개·사전코호트·비용·독립평가·기대자료·다양성 부족. 손실/무반응표본 제외 금지 유지.

## FINANCIAL VALIDATION

SK Treasury Difference:1,014주 미해결
DB Financial Differences:9건 미해결
PBR Eligible Samples:0 (후보6)
이번새 공식 근거 해결0. 보류 조건을 완화하지 않고 기존 자료·Worker 유지.

## UI/UX

Web:TESTED/VERIFIED 명시 범위. 공유API에서13사건/예측0/주의14/정확0/보수3 및 BACKTEST_BLOCKED 확인. 상세보류이유를 쉬운한국어로 제공, 선택/펼침/스크롤보존, 첫실패/이전자료있는실패/복구 분리. 첫로딩·오류는 summary전체폭 사용.
Responsive:홈/신호/인물/연구/시장/운영24조합 + 종목/설정/비교/후보16조합=40조합(320/390/768/1440px),390px200%확대와오류화면넘침없음. 종목페이지검사는레이아웃/빈또는선택상태범위이며 삼성TTM실자료전수완료 아님.
Accessibility:Web실제Enter로백테스트상세열기·갱신상태보존,목록/기간label·색상+문구. 초기CDP포커스/Enter이벤트형식 실패 후 nativeEnter/페이지포커스로재시험 PASS;제품키보드장애로확정한것아님. 스크린리더/색대비전체audit NOT RUN.
Galaxy A33:기존SM-A336N/RFCW1178RRE 앱보존/재설치없음. 홈/신호/인물(3명)/시장(KOSPI6625.93,KOSDAQ892.27,2026-10-08가격지수)/연구(정확0/보수3)/새백테스트보류상세실제표시 확인.32초상세·스크롤보존,USB실패→복구,앱재실행 확인. 최종실패32초후Web오류+기존13/0/14유지 확인;새로수집값/가짜수치아님.
Web/Android data agreement:같은읽기API/기업·기간·단위·보수상태/출처응답계약,표시일치명시범위 확인.
Evidence:docs/uiux/master-*.png, simple-*-web.png;실제앱화면이며디자인fixture아님.
NOT RUN:이번A33삼성TTM·종목상세·긴비교표가로스크롤/OS200%/공식외부링크실제열기/운영페어링;Web종목세부실자료전체/접근성전체. 구현·화면일부확인으로전체완료안함.

## TESTS AND SAFETY

Regression PASS:679 / FAIL:0 / SKIP:0
Android Contract:3 PASS / FAIL:0
Command:node scripts/run-master-qa.mjs (내부node scripts/test-offline.js / node --test test/android_external.test.js)
Executed result:TESTED_PASS, 두프로세스exit0/실제totals확인. exit0만으로PASS처리 금지. 취소/불완전집계/무결과는 TESTED_FAIL. 건너뛴 테스트가 있으면 TESTED_PARTIAL과 NOT RUN으로 남김. 상위환경secret변수를자식에서제외하고broker/live/외부수집false강제. 소스·기기·출시검증은자동테스트성공과분리해NOT_RUN목록저장.
자동QA health와실제테스트실행파일분리:기존30분Worker근거QA는유지하되CLI가주기마다자동회귀실행중이라고보고안함. 새daemon/timer설치없음.
PASS:Apple재현/실제Web체크/명시A33범위/git diff --check/syntax check.
Credential value scan:최종문서·변경코드·테스트16파일PASS/일치0. .env/기존latest.json/DB원문ZIP2 SHA256 보존4/4. 전체저장소보안감사아님.
Recommendation:HOLD / Samsung Performance:HOLD / Apple Ranking:HOLD
Live Trading:OFF(.envbroker/livefalse)
Real Order Calls:이번작업0.실제명령·UI행동은읽기/로컬테스트만,실주문API호출없음. QA결과파서단독은주문0을주장하지않고null로저장하며,과거전체계좌주문조회수치가아님.
다른프로젝트코드/데이터/서비스변경0. startup설정은읽기만,인증·유료·삭제·운영·공개배포변경0.

## RELEASE DECISIONS

A.Research-only app:LOCAL_RESEARCH_ONLY / RELEASE_PARTIAL (로컬범위검증,외부출시·권리·고지·운영QA NOT RUN)
B.Recommendation activation:BLOCKED / HOLD (독립전략및관련검토미확보)
C.Real trading activation:BLOCKED / OFF (별도승인없음,실주문금지)
A의로컬연구검증이B/C활성허가를뜻하지않음.

MODIFIED FILES:
- src/v2/backtest_input_validation.js,qa_test_result.js; scripts/run-master-qa.mjs (신규)
- src/v2/research_dashboard.js,research_automation.js,research_source_health.js
- public/app.js,public/styles.css
- test/backtest_input_validation.test.js,qa_test_result.test.js (신규),research_source_health.test.js,candidate_ui.test.js
- docs/KSTOCK_QA_FOLLOWUP_REPORT.md,AUTO_DEV_LOG.md,KSTOCK_MASTER_QA_MATRIX.md,KSTOCK_INFLUENCE_API.md
- 별도master-qa 실행JSON/자연주기증거/위화면증거/기존파생연구QA·Apple재현QA. 원천Apple/SEC·사용자데이터보존.

BLOCKERS:정확0/결합0/신규사건0/독립평가·비용부족/SK1014·DB9·PBR0/기존부팅경로peer설정과checkout정합성/전체MASTER본문미확보.
NEXT AUTOMATIC ACTION:현재살아있는기존Scheduler가2026-10-12T18:28:55.373Z부터소스slot·캐시·backoff확인→새원문만검증한다. 저장근거불변은skip. 다음개발은공식자본원문연계·검증가격확대·사전독립코호트확보. 현재프로세스종료시동일연구자동복구보장안됨;기존시작서비스변경/다른체크아웃영향은승인목록으로남김.
OVERALL:PARTIAL / RESEARCH_PARTIAL — 이번안전입력/QA/화면범위통과와전략실증·출시완료를분리.

---

# K-STOCK AI AUTONOMOUS RESEARCH REPORT — 2026-10-13 안정화 후속

PROJECT: /Users/ari/ARI/projects/k-stock-ai
BRANCH: auto/kstock-development-20260930
COMMIT: ea406852610c00bef0dbe469de95c42fca662c30 (기준 HEAD; 기존 dirty 보존, 새 커밋/배포 없음)
VERSION: package1.0.0 / server0.1.0 / Android 기존2.6.5(265) / Research API schema1
OVERALL: PARTIAL

BASELINE: 이번 시작 코드에서 Regression655 PASS / FAIL0 / SKIP0 실제 재확인.
CURRENT: Regression663 PASS / FAIL0 / SKIP0; Android Contract3 PASS / FAIL0.

## AUTO COLLECTION

기존 Collection Worker·30분 Peer Scheduler와 승인된 정책을 재사용했다. 비활성 경로 활성화·새 Worker·daemon·인증 변경 없음. SEC/OpenDART/KIS/IR 일별, 연준6시간 slot 확인을 유지한다. 새 source-health.json은 네트워크 요청을 실제 관측할 때 원자적으로 저장하고 재시작 후 복구한다. 과거 누적 성공을 역산하지 않는다. statisticsSince=2026-10-12T16:51:38.202Z. HTTP 연결 성공은 원문 내용·재무·투자 신호 검증 완료가 아니다. 캐시 사용은 성공 횟수에 추가하지 않는다.

|소스|최근 시도|최근 연결 성공|최근 신규 검증 발언|다음 source slot 확인|HTTP 성공/실패/연속 실패|인증 관측|
|---|---|---|---|---|---|---|
|SEC|NOT_OBSERVED|2026-10-12T16:15:46.313Z|NOT_OBSERVED|2026-10-13T00:00:00.000Z|0/0/0|NOT_OBSERVED|
|OpenDART|2026-10-12T16:53:35.737Z|2026-10-12T16:53:35.737Z|NOT_OBSERVED|2026-10-13T00:00:00.000Z|2/0/0|ACCESS_CONFIRMED|
|KIS|NOT_OBSERVED|2026-10-12T16:13:44.481Z|NOT_OBSERVED|2026-10-13T00:00:00.000Z|0/0/0|NOT_OBSERVED|
|IR|NOT_OBSERVED|2026-10-12T16:15:46.614Z|NOT_OBSERVED|2026-10-13T00:00:00.000Z|0/0/0|NOT_OBSERVED|
|CentralBank|NOT_OBSERVED|2026-10-12T16:15:47.541Z|2026-10-12T16:13:42.908Z|2026-10-12T18:00:00.000Z|0/0/0|NOT_OBSERVED|

- sourceName/enabled/lastAttemptAt/lastSuccessAt/lastNewDocumentAt/nextRunAt/successCount/failureCount/consecutiveFailures/rateLimitStatus/authenticationStatus 제공. lastSuccessAt에는 기존 Worker의 공식 응답 확보 시각을 보존하되, 새 누적 횟수는 statisticsSince 이후만 집계. 다음 시각은 source slot 정책이며 실제 호출은 Scheduler·캐시·백오프·인증 차단에 종속된다.
- 이번 실제 외부 읽기 요청2건: 재시작1/1/0, 모두 OpenDART의 서로 다른 미완료 국내 기업 공시 조회. 최종7개 작업 archive 재사용; 중복 사건 추가0. 다른 소스는 주기/캐시를 준수해 이번 새 네트워크 조회0. 5개 소스 모두 이번에 새로 성공했다고 보고하지 않는다.
- KRX AUTH_BLOCKED 유지; KIND/Government 비활성. 정확 원문 불일치 연준 사건 차단과 SEC metadata-only/IR hash-only 제한 유지. 새 자본 원문을 검증하지 않았으므로 자본 행동 자동 정규화는 PARTIAL.
- 오늘 공식 발언1건은 직전 작업 Powell2025-09-23 원문의 실제 first checkedAt 기록으로 복구했다. KST civil date 기준, 검증된 정규화 발언 원문만 센다. SEC 목록·가격 응답·재조회·정정 버전은 신규 발언 수에 포함하지 않는다. 이번 신규 발언0 / 신규 AI0 / 신규 자본0 / 신규 초과수익 사건0.

## SCHEDULER

Running: 로컬 개발 프로세스 PID16358 실행, interval1800000ms, mode APPROVED_READ_ONLY_AND_SAVED_EVIDENCE.
Last Run: 2026-10-12T16:56:17.989Z
Next Run: 2026-10-12T17:26:18.147Z (KST02:26:18, 재시작 시 변경 가능)
Recovery: 실제 로컬 서버 재시작3회에서 기존 원문·결과·소스 누적 기록 보존. 최종 외부 요청0/중복7. 격리 fixture에서 중단 작업·stale PID lock·네트워크 실패·제한 재시도·HTTP401/429·연결 복구·원문 캐시 보존 PASS.
Duplicate Prevention: Collector 중복 실행·SHA archive·unchanged source fingerprint 유지. 기존 금융 Worker와 OFFICIAL_COLLECTION/INFLUENCE_VALIDATION 작업 구분.

실제 Mac 재부팅은 하지 않았다. 격리된 Worker/상태 재시작 시험은 OS 로그인 자동 시작 서비스 검증과 다르다. 서버 프로세스가 종료되면 Scheduler도 중지되며 자동 부팅 서비스는 설치하지 않았다. 자연30분 주기/장기 soak NOT RUN; 재시작 start tick만 확인했다.

## RESEARCH

New Statements: 0 (전체 검증 발언5)
New AI Analysis: 0 (기존 생성3 보존)
New Capital Actions: 0 (전체 검증 자료8 보존)
Verified Combined Signals: 0
Exact Public Time Samples: 0
Conservative Samples: 독립3 (Apple2 / Microsoft1)
1D: 3 / 5D: 3 / 20D: 3, 기존9기간 관측행. 신규 기간 표본0.
Backtest Status: BACKTEST_BLOCKED / predictiveValidity NOT_ESTABLISHED

- 문서별 NEW_SOURCE→SOURCE_VERIFIED→AI_ANALYZED→ENTITY_LINKED→PUBLIC_TIME_CHECKED→SIGNAL_EVALUATED→MARKET_REACTION_CHECKED→QA_RECORDED 상태를 공유 API와 저장 QA에 연결. 현재5개 발언 대상; capital 원문 전체의 동일 문서 파이프라인은 미완료. 각 단계는 독립 판정이며 마지막 QA 기록이 선행 단계의 성공을 뜻하지 않는다.
- 공식 actor·당시 직책 검증, AI 해석, 회사 연결 부족, 보수적 공개 경계, 결합 근거 부족, 공통 가격 부족을 분리. AI GENERATED는 ANALYZED이며 공식 사실 검증으로 승격하지 않는다. 미래 공개 가능 시점은 차단.
- 기업별·기간별 기술통계에 중앙값 초과수익/양의 초과수익 비율/최저 초과수익을 추가했다. 초과수익은 %p, 양의 비율은 DECIMAL; 실제 순손익·MDD와 다르다. 손실 표본을 보존하고 종목 간 임의 합산하지 않는다.
- 학습/검증/최종 평가 구간은 NOT_ESTABLISHED로 명시. 비용·공개 지연·사전 고정 코호트·독립 holdout 부족을 테스트로 차단. 소수 과거 사건을 전략 우월성으로 해석하지 않는다.
- node scripts/reproduce-apple-market.mjs: PASS, 기존6행/독립2 재현, February HOLD, 외부0/주문0.
- MSFT 기존1/5/20 초과수익 -0.1608674818423972 / -2.382630811780495 / -7.035217271199545%p 보존. 새 API·Web 회귀에서 동일 카드/기간 확인, 음의 사례 제외 없음.
- 새로운 원문·자본 행동·시장 반응 표본 확대는 이번 완료로 보고하지 않는다. 기존 가격/기업행동 범위를 넘어서는 값을 만들지 않았다.

## FINANCIAL VALIDATION

SK Treasury Difference: 1,014주 미해결
DB Financial Differences: 9건 미해결
PBR Eligible Samples: 0 / 후보6
기존 금융 Worker 상태 PARTIAL3/BLOCKED3/FAILED0, 별도 저장 근거 큐 유지. 이번 공식 차이 원인·효력일·장부가치 해결0. 인증 우회·과거 기준일에 미래 공시 합산 없음.

## UI/UX

Web: PASS — 실제 API, 6화면×320/390/768/1440px 24조합, 390px200% 확대, 회사/기간/펼침/스크롤 보존, 요청 실패·복구. 오늘 공식 발언 수를 핵심 수치 앞에 표시; 복잡한 소스 상태는 닫힌 상세에 제공. 연결 성공 횟수·집계 시작일·다음 조회 확인과 인증 차단을 텍스트로 구분.
Galaxy A33: PASS (아래 수행 범위) — 기존 SM-A336N/RFCW1178RRE 앱·데이터 보존, 재설치 없음. 홈1/13/0/14, 소스 상태와 카운터, 신호·연구 결과/정확0·보수3, 32초 자동 새로고침 전후 펼침·스크롤 보존, USB 연결 실패→복구, force-stop 후 앱 재실행 확인. Web/Android 같은 응답 사용.
증거: docs/uiux/stability-home-galaxy.png / stability-sources-before-galaxy.png / stability-sources-after-galaxy.png / stability-signals-galaxy.png / stability-research-galaxy.png / stability-failure-galaxy.png / stability-recovery-galaxy.png / stability-relaunch-galaxy.png 및 simple-*-web.png.
NOT RUN: 이번 Galaxy 인물 상세·시장 지수 페이지 재검증/기존 긴 비교표 가로 스크롤/OS 글자200%/운영 인증·페어링. 과거 수행 결과를 이번 결과로 사용하지 않는다.

## TESTS

PASS: node scripts/test-offline.js —663 PASS / FAIL0 / SKIP0
PASS: node --test test/android_external.test.js —3 PASS / FAIL0
PASS: node scripts/reproduce-apple-market.mjs —6행2사건 재현
PASS: node /tmp/kstock-simple-browser.mjs —24조합/상태 보존/오류 복구
PASS: git diff --check; 신규 모듈·Web syntax check
추가8: source health3 / document pipeline4 / collector restart1. 기존 테스트 삭제·완화 없음. 자동 테스트는 고정 응답과 임시 fixture로 외부 요청/주문을 차단.
중간 UI 회귀2실패: DOM mock에 없는 before 메서드 사용. 고정 HTML 안내 영역으로 수정 후 전체663 재실행 PASS. 실패 상태를 완료로 기록하지 않았다.
credentialValueScan: 변경 코드·테스트10파일 PASS/일치0, secrets 출력 없음. .env/기존latest.json/DB원문ZIP2 hash 보존4/4. 전체 저장소 보안감사 완료를 의미하지 않음.

Recommendation: HOLD
Samsung Performance: HOLD
Apple Ranking: HOLD
Live Trading: OFF (.env broker/live false 보존)
Real Order Calls: 이번 작업0; 주문 API 호출 안 함. 과거 전체 계좌 주문 조회 수치 아님.

MODIFIED FILES:
- src/v2/research_source_health.js / research_document_pipeline.js (신규)
- src/v2/official_research_collection.js / research_automation.js / research_dashboard.js
- public/app.js / public/index.html
- test/research_source_health.test.js / research_document_pipeline.test.js (신규) / official_research_collection.test.js
- docs/KSTOCK_QA_FOLLOWUP_REPORT.md / AUTO_DEV_LOG.md / KSTOCK_INFLUENCE_API.md
- 별도 파생 source-health.json / 연구 state·latest-qa / Apple 재현 QA / 위 UI 증거. 기존 Apple/SEC 원천·인증값·다른 프로젝트 수정 없음.

BLOCKERS: 정확 공개 시각0·검증 결합0·신규 자본 원문과 공통 가격 부족·비용/독립 코호트 미확보·PBR0·SK1014·DB9·장기 운영/OS 자동 복구 미확인.
NEXT AUTOMATIC ACTION: 살아 있는 기존30분 Scheduler가 source slot·캐시·백오프를 확인하고 새 원문만 수집/저장 검증한다. 다음 개발은 metadata→공식 capital 원문 연계와 검증 가격 범위 확대, 사전 고정 독립 평가 자료 확보. 자료 없음/인증 차단 시 다른 소스 큐 유지. 실행 중이라는 표시와 OS 재부팅 후 자동 실행 보장은 구분한다.
OVERALL: PARTIAL — 이번 안정화·API/UI·회귀 범위 PASS; 연구 확대·전략 실증·장기 운영은 미완료.

---

# K-STOCK AI AUTONOMOUS RESEARCH REPORT — 2026-10-13 KST

PROJECT: /Users/ari/ARI/projects/k-stock-ai
BRANCH: auto/kstock-development-20260930
COMMIT: ea406852610c00bef0dbe469de95c42fca662c30 (기준 HEAD; 커밋/배포 없음)
VERSION: package1.0.0 / server0.1.0 / 기존 Android2.6.5(265) / Research API schema1
OVERALL: PARTIAL

BASELINE: 이번 작업 시작 코드에서 Regression645 PASS / FAIL0 / SKIP0 확인. Android 인수인계3은 아래 현재 실행으로 재확인.
CURRENT: Regression655 PASS / FAIL0 / SKIP0; Android Contract3 PASS / FAIL0.

## AUTO COLLECTION

이번 사용자 첨부651f08a7-de37-47bd-9284-43a9d520f746의 기존 승인 읽기 전용 자동 수집 요청을 근거로 로컬 정책을 연결했다. 매번 추가 승인을 요청하지 않았으며 운영 서버·인증·유료 서비스·외부 배포는 변경하지 않았다. 새 Worker/daemon/timer 없이 기존 Collection Worker와 Peer Scheduler를 재사용한다. 로컬 정책 research-policy.json은 비밀값 없이 재시작 후에도 유지하며 명시적 KSTOCK_RESEARCH_COLLECTION_ENABLED=false가 우선한다. Mac 로그인 자동 시작 서비스 설치는 미수행.

|소스|자동 상태|실제 확보|주기·제한|
|---|---|---|---|
|SEC|APPROVED_READ_ONLY|Berkshire1067983 공식 submissions / recent1000건 메타데이터|일별 slot. 신규 보유·거래 원문 검증 별도|
|OpenDART|APPROVED_READ_ONLY|기존 국내3기업 공시 목록 원천 저장|일별. 최근 성공 시점 기준3일 겹침·최대7일 범위, 실패 기업은 다음 tick|
|KIS|APPROVED_READ_ONLY|공식 KOSPI index-daily 이력 응답 저장|일별. 완료 거래일·기준·정합성 검사 전 신규 성과 연결 금지|
|KRX|AUTH_BLOCKED|새 조회0|기존LOGOUT 유지, 인증 우회 없음|
|KIND|NOT_CONFIGURED/비활성|새 조회0|구체적 자동 adapter 범위 미연결|
|Corporate IR|APPROVED_READ_ONLY|기존 Microsoft FY25Q4 release 해시·출처|일별. 바뀐 본문을 기존 검증 사건에 자동 적용하지 않음|
|Central Bank|APPROVED_READ_ONLY|공식 연준 RSS 및 신규 Powell2025-09-23 원문 식별·날짜·직책|6시간 slot. 최신 Powell/Waller2건과 고정 연구 시작점, 모든 발언 전수 아님|
|Government|NOT_CONFIGURED/비활성|새 조회0|구체적 자동 adapter 범위 미연결|

sourceName/readOnly/credentialsAvailable(boolean)/permissionVerified/rateLimit/lastSuccessAt/lastError/autoCollectionEnabled를 API·UI에 연결했다. 자격정보를 노출하지 않았다. KSTOCK_EXTERNAL_ACCESS_ENABLED=false는 외부에서 서버에 접속하는 설정이며 위 외향 공식 수집 활성과 별도다.

## COLLECTION RESULTS

- 수집 Worker 실행 실제 외부 요청: 초기 제한된 bootstrap9 + 검증 수정 후7 + 첫 서버 Scheduler 실행1 + 증분 범위 최종 적용 Scheduler1 =18. 중간 재시작 시0/0 건 확인. 진단용 별도 공식 조회5(첫 연준 점검2, SEC/Waller원문2, 원문 해시 재확인1)와 합계23. 계획 조사 웹 검색은 별도1회이며 수집 성공 사건 수에 포함하지 않음. 사이클 실제 fetch 최대12, 원문 최대2MB, 출처 host별1100ms 간격. 수치 기준은 이번 작업, 과거 전체 API 호출량 아님.
- 실제 수집 성공 출처5개(SEC/OpenDART/KIS/IR/연준). 메타데이터·가격 확보와 신규 투자 사건 원문 검증을 구분.
- New Statements: 1, 제롬 파월2025-09-23 Economic Outlook. 공식 날짜·직책·원문 hash 검증 후 저장. 신규 인물/기관0. 공식 발언 전체5, 검증 자본 자료 전체8 유지.
- New Capital Actions: 0. SEC recent 목록만 읽은 것을 신규 실제 거래/기관 보유 변화로 승격하지 않음. 정정 공시 metadata는 원천 archive에 보존, 새 정정 원문 전후 수치 검증 미완료.
- New Research Events: 공식 발언 연구 대상1; 신규 검증 종목 초과수익 사건0. 신규 로컬 AI 해석1, 전체 생성3. 새 발언은 시장 반응 자료 부족으로 HOLD.
- Duplicates Skipped: 최종 서버 시작 시4개 수집 작업 key 재사용; 직전 변경 없는 시작은 각각7개 건너뜀. 기존 연구 결과는 UNCHANGED_SOURCE, 중복 사건 추가0.
- Blocked Sources: KRX AUTH_BLOCKED; KIND/Government 미연결. 연준 feed Waller20261008a/20261001a는 원문 날짜·직책 marker와 일치하지 않아 제외. source 전체 중단 없이 정상 Powell원문 처리. 불일치 문서는 RSS revision이 달라지기 전 반복 원문 조회를 막는 document-checks 상태 구현. 이를 정확한 공개·수익 표본으로 사용하지 않음.
- 첫 SEC 조회의 CIK0001067983 문자열 비교 실패는 숫자 식별 검증으로 수정 후 공식 응답 확보. 첫 자동 AI 근거 검사에서 날짜별 직책 documentId 누락을 수정했으며 미검증 상태를 성공으로 보고하지 않음. 원문 hash 변경은 이전 소스 버전을 history에 보존하고 새 hash와 일시적인 원문 맥락을 같은 요청에서 AI에 전달함.
- 원천 archive·출처·SHA256·작업 이력/캐시·정정 원문 버전 보존, 재시작 파일 잠금·진행 작업 복구, 일시 오류3회 제한 백오프 유지. 인증 차단은 출처별로 격리. 새로운 외부 서비스·유료 AI·모델 다운로드 없음.

## RESEARCH

Exact Public Time Samples: 0
Conservative Samples: 독립 시장 반응3 (기존Apple2/MSFT1)
Verified Combined Signals: 0
Verified Predictive Signals: 0
1D / 5D / 20D: 각3건, 초과수익 관측9행. 신규 발언은 각 기간HOLD/null.
Excess Return Samples: 독립 사건3 유지, 새 종목 표본0. 공식 발언·지수 단독 관측과 종목 초과수익 표본을 합산하지 않음.
Backtest Status: 기술적 오프라인 사건 연구 재계산 PASS; 전략 백테스트 BLOCKED (사전 고정 코호트/holdout/비용/공개 지연/컨센서스 부족).

- [신규 공식 연설](https://www.federalreserve.gov/newsevents/speech/powell20250923a.htm): 과거 직책·발언일은 공식 페이지 기준. 공개 시각은 날짜 종료 보수값2025-09-23T23:59:59-04:00, 정확한 최초 공개는 null. RSS pubDate도 최초 공개 시각으로 간주하지 않음.
- 새 정책 발언을 특정 기업 실제 거래·결합 방향·미래 수익으로 연결하지 않음. 원문은 검증 후 설치된 localhost qwen3:8b에 일시 입력, 외부 AI 호출0. AI_INFERENCE / UNVERIFIED_INTERPRETATION과 source/model/prompt/hash/생성일을 표시. 원문 전체를 저장하거나 UI에 제공하지 않음. 모델 최대2회/30분, 생성120초, 저장된 실패 결과에 백오프·상한 적용.
- 신규 발언2025-09-23은 현재 저장 S&P500 범위의 시작 가격을 확보하지 못해 INDEX_BASELINE_MISSING. 시장 기대·기업 가격·기업행동·배당·거래비용도 부족하며 수치를 추정하지 않음.
- 기존 Apple 재현: node scripts/reproduce-apple-market.mjs — PASS / 6행2회 재계산 일치 / 독립2 / February HOLD. 원천8개 파일 hash와 결과 기록, 외부 요청0/주문0.
- 기존 Microsoft 초과수익1/5/20: -0.1608674818423972 / -2.382630811780495 / -7.035217271199545 %p, 모두 VERIFIED_CONSERVATIVE 유지. 화면 -0.16/-2.38/-7.04%p, 원주가 가격수익률·배당/비용 미포함. 손실 사례를 삭제하지 않음.
- 거래 유형/기관 보유 변화/의향/기업 기간 합계/AI 해석 분리 유지. CORP 기간 합계는 기존 REPORTED_EXECUTION_AGGREGATE 별도 subtype이며 확정 개인 거래로 변환하지 않음. 전반적인 기업 자본 행동 원문 자동 정규화는 아직 PARTIAL.

## FINANCIAL VALIDATION

SK Treasury Difference: 1,014주 미해결
DB Financial Differences: 9건 미해결
PBR Eligible Samples: 0 (후보6)

기존 Financial Validation 큐를 유지하고 수집 연구4개 작업과 기업6개 작업을 counts.researchTotal/companyTotal로 구분. 새 공시의 평가 이용 시점이2026-10-08 이후이면 과거 PBR에 합치지 않는다. 원문/주식수 효력일/잔고/시가총액 자료 부족은 그대로 차단. 이번 신규 공식 원문 차이 해결0.

## UI/UX

- Web: PASS, 실제 공유 API에서 사건13/예측검증0/주의14, 공식 발언5·AI3. 소스별 자동 연결·인증 차단·미연결·최근 확보 시각 표시. 홈 수치는 디자인 fixture가 아님.
- 신규 Powell발언과 AI 해석·공식 원천 링크 표시 확인. 정확공개0/보수적3와 기존시장반응은 분리 유지. 6화면 ×320/390/768/1440폭24조합, 390px200% 확대 넘침 없음. 기간/기업 선택·상세 펼침·스크롤 유지, API실패 복구 PASS.
- Galaxy A33: 기존 SM-A336N/RFCW1178RRE 앱2.6.5(265) 재사용. 홈13/0/14, 투자신호·인물·시장·연구, 출처별 자동 연결/인증차단, 신규2025-09-23 원문·AI구분/공개값 실제 표시 확인. Web/Android 같은 API·값·기간·단위·출처.
- 실기기32초 자동 새로고침 전후 새 발언 상세 펼침·스크롤 위치 보존 확인. USB로컬 연결 실패→복구 및 앱 재실행 PASS. 새 카드 화면은 가로 스크롤 불필요; 기존 긴 비교표 가로 스크롤 이번 작업 NOT RUN.
- 스크린샷 docs/uiux/autonomous-*.png, 최신 Web반응형 증거 simple-*.png. native 재빌드/재설치/앱 데이터 삭제 없음. OS200% 배율과 운영 페어링은 NOT RUN.

## WORKERS

Collection: 기존 Worker, enabled=true / APPROVED_READ_ONLY / 실행 후IDLE. 출처별 주기로 증분·캐시 작업, max12.
Influence: 자동 공식 원천→검증→저장, 새 로컬 해석1 성공. 기존 해석2 보존. 두 이전 발언 분석 미완료.
Capital: SEC metadata/원천 수집 연결, 새 공시 원문 거래 검증 PARTIAL, 새 자본 행동0.
Market Reaction: 자동 저장 근거 재검증, 기존3 독립사건 유지; 새 정책 발언HOLD.
Validation: 10단계 상태/위험/근거 QA 자동 저장. 근거 QA는 테스트 자동 실행과 별도.
Scheduler: 기존30분, mode APPROVED_READ_ONLY_AND_SAVED_EVIDENCE; PID13595 실행 확인. OFFICIAL_COLLECTION→INFLUENCE_VALIDATION 별도 작업. 금융 검증 큐 보존. 이번 시작에서 수집1/재검증0 외부 요청, 연구 UNCHANGED_SOURCE. 다음 예정2026-10-13 01:58:29 KST (프로세스 재시작 시 변경 가능).
Resource Check: 최종PID13595 CPU0.0%, RSS734896KB(약718MiB), 단일 시점 확인·장기 부하검증 아님.
Natural30minute elapsed cycle: NOT RUN; 서버 시작 tick/연속 재시작·캐시/오프라인 시간 이동 시험은 실제 수행. 장기 운영·로그인 자동 시작·운영 변경을 완료했다고 주장하지 않음.

## TESTS AND SAFETY

PASS: node scripts/test-offline.js —655 PASS / FAIL0 / SKIP0
PASS: node --test test/android_external.test.js —3 PASS / FAIL0
PASS: Apple 재현6행/2사건 및 Microsoft3기간 실제 저장 결과 대조
추가10테스트: official_research_collection8 / automatic_statement_analysis2. 승인·자격 유무·출처 차단 격리, 미래 날짜/원문 일치, 증분/중복/미확인 거래 차단, zero-padded SEC CIK, 불일치 원문 반복 차단, AI 근거/모델 캐시 검증. 외부 데이터 검증은 테스트와 별도이며 고정 fixture/stub 테스트에서 외부 요청/실주문 없음. 기존 테스트 삭제·완화 없음. 실제 .env 자격정보 값을 출력하지 않고 변경 코드·정책·QA9개 파일에 포함 여부를 검사해 credentialValueScan PASS / 일치0 확인. 범위 제한 검사이며 전체 저장소 보안감사를 완료했다는 뜻은 아님.

Recommendation: HOLD
Samsung Performance: HOLD
Apple Ranking: HOLD
Live Trading: OFF; 실제 .env KSTOCK_BROKER_ENABLED=false / KSTOCK_LIVE_TRADING_ENABLED=false 유지
Real Order Calls: 이번 작업0, 주문 API 실행 없음. 전체 과거 계좌 주문 이력 조회·검증 수치가 아님.
Preservation: .env / 기존 latest.json / DB원문ZIP2 SHA256이 기존 보존 manifest와 일치. 기존 Apple/SEC/IR/가격 원천 파일은 수정하지 않았고 별도 autonomous 파일만 추가. Apple 재현 파생 QA는 새 확인 시각으로 갱신. 기존 대규모 dirty 작업 보존, 다른 프로젝트 수정 없음.

MODIFIED FILES (이번 작업):
- src/v2/official_research_collection.js, src/v2/automatic_statement_analysis.js (신규)
- src/v2/data_collection_worker.js, src/v2/peer_validation_worker.js, src/v2/influence_service.js, src/v2/research_automation.js, src/server.js
- public/app.js
- test/official_research_collection.test.js, test/automatic_statement_analysis.test.js (신규)
- docs/KSTOCK_AUTONOMOUS_SOURCE_POLICY.md, docs/KSTOCK_INFLUENCE_API.md, README.md, 본 QA, docs/AUTO_DEV_LOG.md
- data/v2/data-collection/research-policy.json/registry/gates/runs/원천 archive, data/v2/influence/autonomous-sources.json/autonomous-analyses.json, Worker 상태와 파생 Apple 재현 QA, docs/uiux/autonomous-* 증거

NOT RUN: 실제30분 자연 주기·장기 부하·로그인 자동시작, 신규 SEC 거래/기관보유 원문 체인 완성, 기업행동/가격/기대/비용 검증을 포함한 신규 시장 반응, 정확한 최초 공개·결합 신호·전략 holdout, 국내 미해결 원문 재검증, KIND/Government자동adapter, Android native재빌드/재설치/시스템 글자배율/긴표 가로스크롤, 운영 배포.
BLOCKERS: 최신 연준 RSS/원문 식별 상충2; 신규 발언 가격/벤치마크 구간·관련 기업/실행행동 부족; SECmetadata→자본원문검증 연결 미완료; 기대·비용·holdout부족; KRX 인증; 국내 주식수/재무차이.
NEXT AUTOMATIC ACTION: 다음30분 tick에서 기한이 된 승인 소스만 조회하며 겹침 공시 범위·중복 작업key/원천hash로 증분 처리. 새 정상 원문만 검증·로컬 분석·API/UI·자동 근거QA에 반영한다. 새 자료 없는 연구는 UNCHANGED_SOURCE. 이후 우선 개발은 SEC 원문 체인·정정 검증과 신규 발언의 검증 가격 범위 확보, 기존 미해결 금융 근거다. 추천 승격·실주문 없음.

---

# K-STOCK AI DEVELOPMENT REPORT — 2026-10-13 KST

PROJECT: /Users/ari/ARI/projects/k-stock-ai
BRANCH: auto/kstock-development-20260930
COMMIT: ea406852610c00bef0dbe469de95c42fca662c30 (기준 HEAD; 이번 작업 커밋 없음)
VERSION: package1.0.0 / server0.1.0 / 기존 Android2.6.5(265) / Research Dashboard schema1
OVERALL: PARTIAL

## Backend Automation

- 기존 Peer Scheduler의 INFLUENCE_VALIDATION 작업을 재사용해 공식 자료→발언 AI→자본 행동→공개 시점→시장 기대→결합→시장 반응→백테스트·위험→API/UI→자동 QA 10단계 저장 근거 검증을 연결했다. 새 daemon·Scheduler·외부 수집 타이머는 만들지 않았다.
- Worker Running: 로컬 서버 PID9683에서 초기 실행 완료, 연구 Worker IDLE. Scheduler: enabled=true / 1,800,000ms. API에서 실행 중과 자동 검증 대기를 구분한다. 최초 실행 이후 예정 시각은 2026-10-13 01:29:05 KST. 프로세스 재시작으로 예정 시각은 달라질 수 있다.
- Automatic Research: 저장 근거 검증 자동 실행 확인. 실제 10개 작업 상태와 근거 건강 보고서가 data/v2/research-automation/state.json 및 latest-qa.json에 저장됨. 변경 없는 입력의 별도 로컬 재실행은 UNCHANGED_SOURCE, lastRunAt·history 유지 확인.
- 입력 파일 변경 감지, 결과 fingerprint, 캐시, 프로세스 간 잠금·중복 방지, 중단 상태 복구, 일시 오류에 한정한 지수 백오프·동일 입력 3회 상한을 구현했다. 새 입력일 때 재검증 가능. 원래 원천자료를 쓰거나 삭제하지 않는다.
- External Collection Enabled: false. 비활성 공식 수집 경로를 활성화하지 않았다. 이번 작업 외부 금융/API 수집 호출0; localhost·USB QA는 별도. API별 외부 호출 제한·캐시는 기존 Collection Worker가 계속 담당한다.
- AI: 기존 로컬 해석2건을 유지. 새 발언2건은 검증된 전체 원문 맥락 부족으로 PARTIAL. 이번 Worker에서 신규 모델 생성 호출0.
- Market Expectation Research: BLOCKED / CONSENSUS_DATA_UNAVAILABLE; 기대·놀라움 수치는 null.
- Backtesting: 오프라인 사건 연구·종목별 음의 초과수익/손실/평균 검증 연결. 전략 백테스트는 사전 고정 코호트·독립 holdout·거래비용·공개 지연 통제가 없어 BLOCKED. 과거 기준 표본을 사전 등록한 것처럼 주장하지 않는다.
- Automated QA Report는 근거 상태 보고이며 testExecution=NOT_RUN_BY_WORKER. 아래 회귀 테스트는 이번 개발 작업에서 별도로 실제 실행한 결과다.
- 자원 확인: 서버 CPU0.0%, RSS819360KB, 약800MiB (한 시점 측정; 지속 부하 검증 아님). 실험적 외부 자동 수집·운영 환경 변경 없음.

## Research

Verified Statements: 4 (인물3)
Verified Capital Actions: 8 (기관 보유3 / 확인된 회사 거래1 / 의향2 / 보고기간 실제 실행 합계2)
Combined Signals: 0
Exact-Time Samples: 0
Conservative Samples: 독립 사건3, Apple2 / Microsoft1
1D / 5D / 20D Results: 기간별3건, 총9개 관측값. 동일 사건의 세 기간을 독립 사건3개로 세지 않음.
Verified Predictive Signals: 0; 주의·보류 신호13. 홈 연구 사건12는 검증된 발언4+자본 자료8이며 독립 시장 반응 사례3과 정의가 다르다.

- 기존 SEC/Berkshire/Apple/Microsoft/FRED/KIS 저장 원천을 재사용했다. 이번 신규 공식 사건 수0; 연구 확대 완료를 주장하지 않는다.
- Apple 가격200, S&P500155, Microsoft 가격100건과 기존 계산을 보존했다. 정확한 공개 시각0 / 보수적 연구3 구분 유지. SEC13F 거래일은 추정하지 않는다.
- Microsoft 초과수익(1/5/20): -0.1608674818423972 / -2.382630811780495 / -7.035217271199545 %p. Web·A33 표시 -0.16 / -2.38 / -7.04%p와 동일.
- Apple 종목별 평균 초과수익(1/5/20): -0.7768485511378931 / -3.4385799869677216 / -3.845597059879108 %p. 기존 May/August 각각 재현; February HOLD 유지.
- 원주가 가격수익률과 동일 기간 S&P500 가격지수 비교. 배당·비용 미포함, 실제 체결 성과 아님. 미래정보·부족 가격·검증 안 된 가격 유형의 수치를 표시하지 않는다. 기업행동 검증 범위는 직전 원천 검증의 제한된 구간을 유지하며 전수 확인·총수익 검증으로 승격하지 않음.
- 금융 검증: 기존 독립 Peer Worker 유지, 후보6 / 배수별 유효 표본0. SK 자기주식1,014주·DB 재무9건 차이 미해결. 신규 공식 근거 없이 해결 처리하지 않음.

## UI/UX

- Web Dashboard: PASS. 처음 화면은 사건12 / 검증된 예측 신호0 / 주의13 / 최근 연구3 / 실제 Mac mini 상태 중심. 숫자는 실 API에서 읽고 기술적 근거는 상세에 배치.
- Signal Screen: PASS. Apple·Microsoft 카드, 배우·기관/행동 유형, 1/5/20 관측 초과수익, 기간과 공식 근거. 공시·계산 상세는 펼침 영역. Microsoft 손실 사례 보존.
- People Screen: PASS, 인물3 및 공식 발언 날짜 순서·AI와 사실 구분. 자본 행동·기관 공시는 별도 상세이며 기업 행동을 인물 개인 거래로 결합하지 않음.
- Research Screen: PASS. 정확한 공개0/보수적3 구분, 벤치마크·표본 정의·연구 한계. 시장 분석과 기존 기업·포트폴리오·검증 운영 화면 접근 유지.
- 같은 GET /api/v2/research/dashboard와 기존 native 인증 transport를 Web/Android가 사용. Cache-Control:no-store, 안전한503, 운영 수치 fixture 없음.
- Chrome 실제 검증: 6개 경로 × 폭320/390/768/1440=24개 조합에서 화면 전체 가로 넘침 없음. 390px 본문200% 확대 넘침 없음. 기업/기간 선택·펼침·스크롤 수동 새로고침 유지 PASS. 차단된 API 연결 실패→복구 PASS. 로딩·자료 없음 상태는 fixture 계약 테스트 PASS.
- Galaxy A33 (SM-A336N, RFCW1178RRE): 기존 설치 앱 재사용, USB reverse3103→3000. 홈/신호/인물/연구/시장 화면 실제 탐색, Microsoft 수치·기간 일치, 연결 실패·복구 및 앱 재실행 PASS. 앱 재설치·기기 시스템 글자 배율 변경은 NOT RUN. 원래 사용자 앱 데이터 삭제 없음.
- Galaxy 자동 새로고침: 신호 화면에서32초 경과 전후 Microsoft 카드 위치·수치 보존을 실제 스크린샷으로 확인. Android에서 기간 선택·상세 펼침을 포함한 모든 조합 검증은 NOT RUN (Web 자동 검증은 PASS). 시장 화면 진입 시 기존 저장 지수 API를 자동 조회하도록 연결; A33에서 기준일2026-10-08 KOSPI6625.93/KOSDAQ892.27 표시 확인.
- Android 변경은 공유 WebView UI에 적용했다. native 소스·APK 변경 없음. 공식 근거 링크의 외부 브라우저 열기 검증은 NOT RUN; 원천 링크는 화면 상세와 API에 보존.
- 스크린샷: docs/uiux/simple-*-web.png, simple-*-galaxy.png. UI 시안 수치를 운영값으로 사용하지 않음.

## Tests and Safety

User Baseline: Regression613 / Android Contract3 (인수인계)
Actual Start: Regression637 PASS / FAIL0 / SKIP0
Current Regression: node scripts/test-offline.js — 645 PASS / FAIL0 / SKIP0
Current Android Contract: node --test test/android_external.test.js — 3 PASS / FAIL0
New Tests: test/research_automation.test.js 6개 + test/candidate_ui.test.js 2개. 기존 테스트 삭제 없음. Worker 잠금·재시작·bounded backoff·live 차단, 미래/가격/수익률 검증, 실제 상태 계약, UI 선택·보류·empty·실패 복구 검증. 고정 fixture/로컬 stub, 통제되지 않은 외부 요청 없음.
최초 회귀에서 새 UI 테스트 fixture의 success:true 누락으로1건 실패했으며 fixture 수정 후 전체645PASS를 재확인했다.

Recommendation: HOLD
Samsung Performance: HOLD
Apple Ranking: HOLD
Live Trading: OFF (실 .env 두 안전 플래그 false 확인, 자격정보 내용 출력 없음)
Real Order Calls: 이번 연구 Worker·UI QA·오프라인 테스트 경로0. 주문 API 호출을 수행하지 않았고 연구 경로에 주문 클라이언트 없음. 전체 과거 브로커 주문 이력을 검증한 수치가 아님.
Preservation: .env / 기존 latest.json / DB 원문 ZIP2개가 직전 보존 manifest와 SHA256 일치. Apple/SEC/MSFT 자료 변경 없음. 다른 프로젝트 수정·운영 배포·인증 변경 없음.

Modified Files (이번 작업):
- src/v2/research_dashboard.js, src/v2/research_automation.js (신규)
- src/server.js, src/v2/peer_validation_worker.js
- public/index.html, public/app.js, public/styles.css
- test/research_automation.test.js, test/candidate_ui.test.js
- docs/KSTOCK_INFLUENCE_API.md, README.md, 본 보고서, docs/AUTO_DEV_LOG.md
- docs/uiux/simple-* 스크린샷, data/v2/research-automation/* 런타임 상태/QA
기존 대규모 미커밋 변경은 보존하며 위 목록을 전체 dirty 파일 목록으로 간주하지 않음.

NOT RUN: 실제30분 경과 Scheduler 주기·장기 부하, 새로운 외부 자동 수집, 새 AI 원문 생성, 기대 컨센서스 분석, 순비용 전략 백테스트·holdout, 정확한 최초 공개 기반 성과, Android native 재빌드·재설치, 기기 시스템200% 글자 설정, 외부 공개 배포.
Blockers: 외부 수집 비활성; 신규 원문 맥락·컨센서스·정확한 공개 시각·행위 관계/방향·전략 검증 자료 부족; 국내 주식수·재무 차이 미해결.
Next Automatic Action: 기존30분 Scheduler가 저장 근거를 확인하고 새 공식 파일 확보 시 연구 단계를 재검증하며 공유 API/UI와 자동 근거 QA를 갱신한다. 새 수집 경로 활성화나 추천 승격은 수행하지 않는다. 공식 원문/정확 공개/독립 검증 코호트 확보가 후속 우선순위다.

---

# K-STOCK AI SIGNAL RESEARCH EXPANSION REPORT — 2026-10-13 KST

PROJECT: /Users/ari/ARI/projects/k-stock-ai
BRANCH: auto/kstock-development-20260930
COMMIT: ea406852610c00bef0dbe469de95c42fca662c30 (기준 HEAD, 이번 작업 커밋 없음)
VERSION: package1.0.0 / server0.1.0 / Android2.6.5(265) / Influence API schema1 확장
OVERALL: PARTIAL

BASELINE: 이번 작업 시작 시 Regression613 PASS / Android Contract3 PASS 확인. 인수인계 수치를 현재 결과로 대신 사용하지 않음.
CURRENT: Regression637 PASS / FAIL0 / SKIP0; Android Contract3 PASS / FAIL0.

NEW RESEARCH:
- New People: 1, 크리스토퍼 월러. 기존 파월·버핏 보존, 전체3명. 직책은 공식 발언 당시 기준.
- New Institutions: 0. 신규 회사 actor Microsoft1개를 기관 투자자나 CEO 개인으로 세지 않음.
- New Statements: 2, 파월2025-05-15 / 월러2025-07-17. 전체 공식 발언4건. 정책 발언을 특정 기업의 거래 방향으로 바꾸지 않음.
- New Capital Actions: 3, Apple 보고기간 실제 재매입 현금지출 합계1 / Apple 승인 계획1 / Microsoft 배당·재매입 완료 합계1.
- Non-Apple Events: 신규 회사 사건1, Microsoft FY25Q4. 신규 비Apple 정책 발언2건은 별도 지수 관측이며 종목 초과수익 표본에 포함하지 않음.
- 신규 CONFIRMED_TRANSACTION0 / REPORTED_HOLDING_CHANGE0 / ANNOUNCED_INTENTION1 / REPORTED_EXECUTION_AGGREGATE2. 기존 세 유형을 유지하고 기간 합계는 별도 유형으로 구분. 현재 전체 검증 자본 자료8건: 기관보유3 / 확인된 SK회사 거래1 / 의향2 / 기간 합계2. 원문 미검증 기존SEC5건은 승격하지 않음.

PUBLIC AVAILABILITY:
Exact Time Samples: 0; 접수 시각을 최초 공개 시각으로 대체하지 않음.
Conservative Start Samples: 기존Apple2 + 신규Microsoft1 = 독립 사건3. 같은 사건의1/5/20을3개 독립 사건으로 세지 않음.
Blocked: Apple2월 사례는 SEC daily index Last-Modified가 접수보다 늦게 변경된 이유를 확보하지 못해 HOLD. 정확한 공개 시각 분석 전부HOLD. 정책 발언은 종목 연결·실제 행동·대조군 미확보.
Microsoft 원본 publicAvailableAt=2026-10-12T15:24:01.658Z는 이번 실제 페이지 관측 시점으로 보존. 연구용 별도 경계2025-07-30T23:59:59-04:00은 공식 날짜 종료 가정이며 최초 공개 실측이 아님. researchOnly/actualPublicAvailableAt:null/CONSERVATIVE_START를 명시. 원본 객체를 소급 수정하지 않음.

MARKET REACTION:
1D Verified: 독립 사건3 (Apple2/MSFT1), 신규MSFT1.
5D Verified: 독립 사건3 (Apple2/MSFT1), 신규MSFT1.
20D Verified: 독립 사건3 (Apple2/MSFT1), 신규MSFT1.
Benchmark: 기존 FRED SP500:PRICE_INDEX155건 재사용. Apple가격200건 보존, MSFT 실제KIS원주가100건(2025-04-23~09-15), MSFT·SP500 공통100거래일. 보간·임의 연율화 없음.
Excess Return Samples: 독립 사건3 / 기간별 관측9행. 신규MSFT 독립1 / 관측3행.

| 기간 | 공통 관측 구간 | MSFT 종가 USD | MSFT 가격수익률 | SP500 가격지수 수익률 | 초과수익 |
| --- | --- | --- | --- | --- | --- |
| 1D | 2025-07-31 → 2025-08-01 | 533.50 → 524.11 | -1.7601% | -1.5992% | -0.1609 pp |
| 5D | 2025-07-31 → 2025-08-07 | 533.50 → 520.84 | -2.3730% | 0.0096% | -2.3826 pp |
| 20D | 2025-07-31 → 2025-08-28 | 533.50 → 509.64 | -4.4724% | 2.5629% | -7.0352 pp |

첫 기준 종가533.50USD는 공개 날짜 종료 뒤 다음 세션 종가이며 실제 체결 가격이 아님. 거래 가능 경계2025-07-31 09:30 America/New_York, 연구 기준 첫종가16:00. 전체 창에2/6/21개 공통 관측 존재. 세 기간 모두 MSFT 가격 손실·음의 초과수익 사례로 보존.

공식 출처:
- [Microsoft FY25Q4 IR](https://www.microsoft.com/en-us/Investor/earnings/FY-2025-Q4/press-release-webcast): 2025-04-01~06-30 배당·자사주 매입 완료 합계USD9.4bn. 공식 소수1자리 반올림 금액이며 각각에 전액을 배정하지 않음. 개별 거래일·수량·가격·CEO개인 귀속null/미확인.
- [SEC 8-K 0000950170-25-100226](https://www.sec.gov/Archives/edgar/data/789019/000095017025100226/msft-20250730.htm): July30에 보도자료를 발행했다는 Item2.02로 IR날짜 교차 확인. acceptedAt/정확publicAt 미확보.
- [공식 Microsoft 배당 발표](https://news.microsoft.com/source/2025/06/10/microsoft-announces-quarterly-dividend-26/) / [공식 분할 이력](https://www.microsoft.com/en-us/investor/dividends-and-stock-history): 2025-08-21 배당락0.83USD, 마지막 보통주 분할2003-02-18. 제한된7/31~8/28 원주가 가격수익률 범위 검토. 이미 조정된 가격에 배당·분할을 중복 적용하지 않음.
- [KIS 공식 dailyprice 계약](https://github.com/koreainvestment/open-trading-api/blob/main/examples_llm/overseas_stock/dailyprice/chk_dailyprice.py): NAS/MSFT/GUBN0/MODP0. AAPL-only 기존 operation은 그대로, 신규 MSFT-only 별도 operation 사용.
- FRED SP500와 NYSE2025 달력은 기존 저장SHA 증거 재사용, 새 외부 조회0.

기업행동 검증은 가격수익률의 지정 범위에 한정. 배당을 포함한 총수익·기타 이벤트 전수 완전성·체결 가능성은 미검증. 공식 기업행동 해시는 브라우저 추출문 해시이며 HTTP원문 body SHA라고 표시하지 않음. 실적 발표에 여러 정보가 함께 있어 자본 행동만의 인과 효과를 분리하지 못함.

SIGNAL CORRELATION:
Statement Only: 공식4건, 검증 종목 초과수익 사건0.
Capital Only: 공식8건, 보수적 시장 반응Apple2/MSFT1; 회사·벤치마크별 별도 집계.
Aligned: 0 / Divergent: 0 / Verified Combined: 0.
Apple 자본단독 평균·중앙 초과수익1/5/20D=-0.7768/-3.4386/-3.8456pp, 양의 초과수익0%, 가격손실2/2/1건. MSFT 자본단독 평균·중앙은 각 단일 사건값, 양의초과0%, 손실 각1건. 발언·결합·정확시각 그룹은 빈 표본이며 숫자/차트 조작 없음.
범위별18개 그룹 API, company/security/benchmark/currency/source/action/calendar검증 없으면 차단. 원래 Apple groups를 유지하고 비Apple scopeGroups와 별도 comparisonReview 제공. crossSecurityPooling:false. 상승 사례 선별 없음. 선정 문서가 가격·수익조회 전에 작성됨. 이번 연구는 사후 조사이며 preregistered:false/holdout:NOT_ESTABLISHED; 거래비용·시장/산업 교란·선택 편향은 미통제. 전략 우위·예측력·인과관계 미입증.

APPLE BASELINE:
May Reproduced: PASS (1/5/20일3행 동일)
August Reproduced: PASS (1/5/20일3행 동일)
February Status: HOLD / 수정 원인UNRESOLVED
저장8개 파일 SHA와 고정6개 이전 수치1e-10허용오차로 두 번 계산 일치. 재수집0, data/v2/verification/apple-market-reproducibility.json 저장. Apple300m→300m→280m 보유·SEC정정 근거·기존AI2건 보존.

FINANCIAL VALIDATION:
SK Treasury Difference: 1,014주 미해결, 추정 대사 없음.
DB Financial Differences: 9미해결/0해결, 저장 원문400개셀 재대조, 단위/합계 차이 원인 확정 근거 부족.
PBR Eligible Samples: 0; PER/PBR/PSR/EV_EBITDA 모두0. 기존6회사PARTIAL3/BLOCKED3. KRX AUTH_BLOCKED 우회 없음.
신호 연구와 기존 금융 큐 분리 유지, 금융 관련 오프라인80개PASS(전체637개에 포함, 합산 중복 금지). 별도 금융 검토문서의 API NOT RUN은 담당 하위작업 범위이며 루트의 실제 로컬 API 확인은 PASS.

WEB UI: PASS. 실제127.0.0.1:3000 API, ChromeCDP로 신규인물/공식발언/자본합계/원천자료/Apple6행/MSFT3행/별도 그룹/초과수익pp/빈표본/HOLD 확인. 320/360/390/768/1024/1440px light/dark 및390px200%글자에서 전체 페이지 가로overflow 없음. 인물선택·상세열림·유형필터·세로/표 가로위치 보존, API실패·복구 PASS. 최종 UI스크린샷 docs/uiux/nonapple-msft-market-web.png.
GALAXY A33: PASS(수행 범위). SM-A336N/RFCW1178RRE 기존2.6.5(265), 설치 변경/사용자데이터 삭제 없음. 월러 공식발언/당시역할/날짜 단위 구분·3인목록·결합0·신규사건1·MSFT94억USD/기간/원천자료·1/5/20초과수익 Web일치·가로스크롤·32초자동새로고침 위치보존·USBreverse연결실패/복구·자체앱 재실행 확인. foregroundguard가 순간 앱 전환을 감지했을 때 입력을 차단했고 K-Stock만 다시 열어 복구 검증 완료. 다른 앱에 입력/캡처 없음.
설치: 이번 재설치NOT RUN(기존앱 재사용); 화면 검증과 구분. Android OS글자200%/운영 인증·페어링/외부 접속NOT RUN. Web200%는 PASS.

WORKERS:
Influence/Capital/Public Time/Historical Price/Signal/Market Reaction/Financial/QA Reporting: 기존 저장근거Scheduler8영역, 새로운Worker중복생성0.
Scheduler: enabled=true, SAVED_EVIDENCE_ONLY, interval1800000ms, ownerPID8092, heartbeat2026-10-12T15:43:03.652Z, nextRun2026-10-12T16:13:03.652Z (KST+09:00).
Validation: 초기 실제tick PASS, 중복tick 차단·실패 격리·8영역 보존 테스트PASS. 내용fingerprint변경 감지와 변경없을 때lastValidatedAt보존. 현재 전체 저장 입력을 읽는 기존경로이며 사건별 독립 증분 캐시는 미구현.
External Auto Collection: OFF. 공식 수집은 수동 bounded read-only; 서버/30분Worker 외부 수집0. 전체30분 주기 자연발화 장시간관측NOT RUN, timer등록/초기tick/동시실행 테스트와 실제 API를 구분.

TESTS:
- node scripts/test-offline.js: 637PASS / 0FAIL / 0SKIP (기준613개 유지)
- node --test test/android_external.test.js: 3PASS / 0FAIL (로컬 fixture HTTP만, sandbox바인딩제약 후 허용된 로컬실행 재검증)
- node scripts/reproduce-apple-market.mjs: PASS,6행/독립2사건, 외부0
- node /tmp/kstock-final-browser.mjs: PASS (실제 로컬UI/API)
- Galaxy guarded manual capture: PASS 위 수행 범위; screenshot artifacts docs/uiux/nonapple-*.png / signal-expanded-statement-a33.png
자동테스트는 고정fixture/mock, 수집script는 등록하지 않음. PIL미설치로 픽셀차이 자동검사는 NOT RUN, 32초 전후 실제 캡처의 표시 위치를 눈으로 대조함. 초기 테스트 인프라 제약을 앱PASS로 대체하지 않음.

COLLECTION AUDIT:
확인일2026-10-13KST, 저장checkedAtUTC2026-10-12T15시대. 원문URL/SHA/정규화시점/해시방식 저장, 전체공시 원문을API에 배포하지 않음.
Apple·연준 확장 소스직접HTTP10회(초기탐색3+용량제한실패3+최종성공4), 캐시재실행0. 비AppleIR/SEC GET4회. KIS 성공2호출(토큰1+조회1), sandbox토큰실패시도1. Microsoft기업행동 directHTTP실패2회, 웹검색1회/공식페이지open4회. 기존SP500/NYSE 재수집0. 원본 가격·SEC 반복조회 없음. 금융저장검증외부0. 로컬 API·화면검증과 인터넷수집호출은 별도.

RECOMMENDATION: HOLD
SAMSUNG PERFORMANCE: HOLD
APPLE RANKING: HOLD
LIVE TRADING: OFF (두.env 설정false 및 로컬 프로세스false 확인)
REAL ORDER CALLS: 0 (이번 작성/실행 경로: 고정공식GET, KIS토큰+시세조회만. 기존전체운영기간 주문0이라고 소급 단정하지 않음)
보존 검사: .env / 최신batch보고서 / DB최초·정정ZIP2개 SHA 모두 동일. 기존미커밋변경·Apple/SEC 보존, 다른프로젝트·운영·유료서비스·외부배포 변경0.

MODIFIED FILES:
이번 작업: src/v2/influence_engine.js, src/v2/influence_service.js, src/v2/signal_comparison.js, src/v2/nonapple_market_evidence.js, src/v2/peer_validation_worker.js, src/services/kis_request.js, public/app.js; test/influence_engine.test.js, test/influence_service.test.js, test/signal_comparison.test.js, test/nonapple_market_evidence.test.js, test/peer_validation_worker.test.js, test/candidate_ui.test.js; scripts/collect-influence-expansion.mjs, scripts/collect-nonapple-prices.mjs, scripts/reproduce-apple-market.mjs; docs/KSTOCK_NONAPPLE_SOURCE_SELECTION.md, docs/KSTOCK_SIGNAL_EXPANSION_SOURCES_REVIEW.md, docs/KSTOCK_SIGNAL_EXPANSION_FINANCIAL_REVIEW.md, docs/KSTOCK_INFLUENCE_API.md, docs/KSTOCK_QA_FOLLOWUP_REPORT.md, docs/AUTO_DEV_LOG.md, docs/uiux/신규캡처. private data/v2/influence/새근거 및 재현성보고서는Git제외.
기존dirty목록 전체를 이번 수정으로 주장하지 않음; commit/push/deploy 없음.

NOT RUN: 정확한 최초공개 기반 연구/총수익/독립holdout/운영인증/외부접속/새APK설치/OS200%/전체30분 자연주기/자동픽셀diff.
BLOCKERS: 결합신호 방향·주체·기업관계 부족, 정확공개 시각0, 정책발언종목자료 부족, 새 개인실거래원문0, 기업행동전수·총수익미확인, 국내3금융문제 지속.
NEXT ACTION: 수익률을보기전에 고정한 추가 비Apple 기관/개인 사건코호트와 공개근거 확보 → 동일가격/기업행동/벤치마크검증 → 상승·손실·무반응 전부 포함 → 관계/방향/반대근거 검증 → 별도 기간 재검증. 기존국내금융공식원문 큐 병행. 사건별증분캐시와보수경계 근거확대는 후속개발. 추천·성과HOLD 유지.

신규 비Apple 보수적 연구 사례1건을 실제 확보했으나 다양성·결합신호·예측력 검증은 완료하지 못해 전체PARTIAL이다. 테스트 증가만으로 완료 선언하지 않음.

---

# K-STOCK AI CONSERVATIVE MARKET REACTION REPORT — 2026-10-12

PROJECT: /Users/ari/ARI/projects/k-stock-ai
BRANCH: auto/kstock-development-20260930
COMMIT: ea406852610c00bef0dbe469de95c42fca662c30 (기준 HEAD, 신규 commit/push 없음)
VERSION: package1.0.0 / Android2.6.5(265) / 기존 Influence API v1 확장
BASELINE: 이번 작업에서 회귀606 PASS 재실행
CURRENT: Regression613 PASS / Android Contract3 PASS / Failures0 / Skip0
OVERALL: PARTIAL

## 공개 시점과 보수적 연구 정책

SEC Public Availability: 원래3건 acceptedAt·보고기간·보유량·공시 원문 보존. 실제 최초 공개 시각 publicAvailableAt=null, 정확한 공개 시각 기반 표본0. 접수 시각에 가정한 지연을 더하지 않음.
Conservative Start: 5월/8월2건, CONSERVATIVE_START / VERIFIED_CONSERVATIVE. 최초 웹 공개 시각 검증이나 당시 수신 로그를 확보했다는 뜻이 아니다.

[SEC 공식 데이터 접근 안내](https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data)는 공개 공시 색인을 당일 밤부터 갱신한다고 설명한다. 실제 공식 일별 색인의 기업CIK·13F-HR·접수번호·공시일을 확인하고, 원본 HTTP Last-Modified가 접수 이후24시간 안에 있는 경우만 별도 보수적 연구 경계로 사용했다. 이는 원본 메타데이터와 공개 색인 운영 방식에 근거한 연구 정책이며, 파일 수정 시각과 최초 웹 공개 시각을 동일시하지 않는다. 역사적 수신 로그로 입증된 정확한 공개 분석은 계속 보류한다. 장중 체결·실거래 성과를 계산하지 않고 이 경계 이후 첫 거래일 종가를 연구 시작 가격으로 사용한다.

| 공시 | 공식 색인 Last-Modified | 보수적 판정 |
| --- | --- | --- |
| 0000950123-25-002701 / 2025-02-14 | 2025-05-18T18:17:08Z | INDEX_REVISED_OR_TIME_UNVERIFIED / 보류 |
| 0000950123-25-005701 / 2025-05-15 | 2025-05-16T02:08:49Z | 5/16 정규장 이후 종가 기준 연구 |
| 0000950123-25-008343 / 2025-08-14 | 2025-08-15T02:08:48Z | 8/15 정규장 이후 종가 기준 연구 |

각 공식 색인 URL과 SHA는 별도 저장하고 API에 연구 근거를 제공한다. 원본 색인3회 GET200. 현재 존재하는 색인을 과거 최초 공개의 정확한 시각 증거로 쓰지 않으며, 2월 색인의 뒤늦은 수정 시각을2월의 공개 근거로 소급하지 않았다. 보수적 세션 tradeableFrom은 거래 가능한 정규장 시작을 뜻하며 실제 체결을 뜻하지 않는다. 첫날 종가까지의 반응은 제외되고, 공시→보고기업의 실제 매매일/개인 거래일은 여전히 알 수 없다.

## Apple 기업행동과 가격 정렬

Apple Corporate Actions: 원주가 가격수익률 범위 검증 / 전체 기업행동 전수검증 또는 총수익률 완료는 아님.
[Nasdaq 공개 배당 API](https://api.nasdaq.com/api/quote/AAPL/dividends?assetclass=stocks) GET200 원문SHA·응답 보존. [Apple 공식 배당 이력](https://investor.apple.com/dividend-history/default.aspx)과 [공식 FAQ](https://investor.apple.com/faq/default.aspx)를 Web 도구로 확인했다. 해당2개 Apple URL의 직접 HTTP는403으로 기록하고 우회·반복조회하지 않았다.

| 배당락일 | 기준일 | 지급일 | 보통주 현금배당 |
| --- | --- | --- | --- |
| 2025-02-10 | 2025-02-10 | 2025-02-13 | 0.25 USD |
| 2025-05-12 | 2025-05-12 | 2025-05-15 | 0.26 USD |
| 2025-08-11 | 2025-08-11 | 2025-08-14 | 0.26 USD |

Apple FAQ는5회 분할 이력과 마지막2020-08-28 분할을 제시한다. 조사 범위2025-02-01~09-15에 분할을 추가 적용하지 않았으며 조사된 배당 이력은 현금배당이다. 기타 미등재 가격 조정 이벤트의 부재를 전수 입증했다고 주장하지 않는다. 새 조정·주식배당·분할 이벤트가 입력되면 현재 가격수익률 범위 검증으로 처리하지 않고 차단한다.

Apple Price Coverage: 기존KIS200건 재사용, 2024-10-24~2025-03-20 및2025-04-23~09-15. MODP0 RAW_CLOSE / USD, 추가 조정 없음.
S&P 500 Coverage: 기존FRED155건,2025-02-03~09-15. PRICE_INDEX / 배당 미포함. 원시 지수 시계열은 API/UI/Git에 노출하지 않음.
Aligned Trading Days: 실제 공통 날짜133개. 중간 공백은 보간하지 않고 연속 거래 달력과 각 사건별2/6/21개 관측을 별도로 검사한다. 휴장6개·중복·충돌·미래 종료일 차단. 모든6개 통과 연구 구간에는 위 현금배당락이 포함되지 않는다.

## 실제 보수적 가격수익률 결과

1D Verified Samples: 보수적2 / 정확한 공개 기반0
5D Verified Samples: 보수적2 / 정확한 공개 기반0
20D Verified Samples: 보수적2 / 정확한 공개 기반0
Excess Return Samples: 보수적6기간 행 / 독립 공시2건 / 정확한 공개 기반0

| 공시 | 기간 | 종가 기준 관측 구간 | Apple 원주가 | Apple 가격수익률 | S&P500 가격지수 수익률 | 초과수익률 |
| --- | --- | --- | --- | --- | --- | --- |
| 0000950123-25-005701 | 1D | 2025-05-16 → 2025-05-19 | 211.26 → 208.78 USD | -1.1739% | 0.0876% | -1.2615 pp |
| 0000950123-25-005701 | 5D | 2025-05-16 → 2025-05-23 | 211.26 → 195.27 USD | -7.5689% | -2.6108% | -4.9581 pp |
| 0000950123-25-005701 | 20D | 2025-05-16 → 2025-06-16 | 211.26 → 198.42 USD | -6.0778% | 1.2542% | -7.3320 pp |
| 0000950123-25-008343 | 1D | 2025-08-15 → 2025-08-18 | 231.59 → 230.89 USD | -0.3023% | -0.0101% | -0.2922 pp |
| 0000950123-25-008343 | 5D | 2025-08-15 → 2025-08-22 | 231.59 → 227.76 USD | -1.6538% | 0.2653% | -1.9191 pp |
| 0000950123-25-008343 | 20D | 2025-08-15 → 2025-09-15 | 231.59 → 236.70 USD | 2.2065% | 2.5657% | -0.3592 pp |

초과수익률은 동일 시작일·종료일의 퍼센트 수익률 차이(percentage points)다. 배당·거래비용·세금·실제 체결·연율화 미포함. 시작 가격은 공개 경계 이후 첫 종가이며 개장 진입 성과가 아니다. 표본2건으로 예측력·인과관계·K-Stock 투자 전략 성공을 주장하지 않는다. 기존 투자 가설/신호 그룹의 검증 상태는 자동 승격하지 않았다.

## 구현·자동화·검증

기존 Collection/Validation Worker와 API를 재사용했다. 저장된 일별 색인·기업행동 리뷰가 변경되면 기존 sourceFingerprint가 바뀌고 재검증한다. 신규 외부 자동 수집·유료 서비스·계정 변경 없음. 기존30분 SAVED_EVIDENCE_ONLY Scheduler 유지. 이번 작업 전체 주기 경과 확인 NOT RUN; 실제 운영 자동 수집 활성화 없음.

Web: PASS — 실제API의2/2/2 표본,6개 수익률,배당락일,공식출처,2월 차단,정확한공개0 표시. 기존 인물/필터/상세 선택 보존,새 표 가로·세로 스크롤 자동갱신 보존. 라이트/다크·320~1440px·390px200% 레이아웃,연결실패/복구 검증.
Galaxy A33: 새 보수적2/2/2 표본·정확한공개0·배당락·보수적 정책·실제 표 표시 확인. 기존 앱/데이터 보존,앱재실행/서버연결 확인. 가로스크롤로 실제 초과수익 -1.26/-4.96/-7.33/-0.29/-1.92/-0.36 표시 확인 PASS. 32초 자동갱신 뒤 표의 가로 위치·차단/유효 행 유지 확인. 세로 위치는 시각 확인이며 픽셀 단위 동일성 실기기 자동검증 NOT RUN. APK 재설치 없음. Artifacts: docs/uiux/conservative-market-web.png, conservative-market-a33.png, conservative-returns-a33.png.

Regression: npm run test:offline → 613 PASS /0 FAIL/0 SKIP (기준606 포함)
Android Contract: node --test test/android_external.test.js → 3 PASS /0 FAIL
추가7개: 보수적 공개경계,잘못된/정정색인 차단,독립1/5/20 퍼센트 계산,결측,기업행동/원주가/범위,미래정보·충돌,Web 미검증 숫자 비노출. 오프라인fixture로만 실행,주문·외부 요청 없음.
직접 외부 요청: SEC3 + Nasdaq1 + Apple2(403) =6회. 기존가격/지수/접수헤더 재수집0. 브라우징 공식 문서 검토는 별도이며 인증우회 없음.

Recommendation: HOLD
Samsung Performance: HOLD
Apple Ranking: HOLD
Live Trading: OFF (KSTOCK_BROKER_ENABLED=false / KSTOCK_LIVE_TRADING_ENABLED=false)
Real Order Calls: 0 (이번 작업은 공개자료GET·로컬API·mock시험만 실행; 과거 전체계좌 이력 감사 의미 아님)

Modified Files: src/v2/us_market_evidence.js, src/v2/influence_service.js, public/app.js, test/us_market_evidence.test.js, test/candidate_ui.test.js, docs/KSTOCK_QA_FOLLOWUP_REPORT.md, docs/AUTO_DEV_LOG.md, docs/KSTOCK_INFLUENCE_API.md, docs/uiux/conservative-*.png.
비공개Gitignored0600 자료: sec-daily-index-review.json, apple-actions-source-review.json, apple-corporate-actions-review.json. 기존.env/원문/Apple/SEC 보존.
NOT RUN: 정확한 역사적 공개 수신 로그,배당포함 총수익률,기타기업행동 전수확인,실제체결/거래비용 모델,운영인증·공개배포·실거래,Galaxy OS200%확대,새 APK 설치.
Blockers: 정확한 최초 공개 시각3건;2월색인 뒤늦은 수정;기타 기업행동 전수증거. 기존 PBR0/SK1014주/DB9건은 이번 범위에서 해결했다고 보고하지 않음.
Next Action: 역사적 공개 수신 증거 또는 더 강한 공식 날짜별 배포 기록 확보,2월색인 원본 연속성 확인,기업행동 전수범위 확대. 보수적2개 사건과 정확한공개 기반 표본은 계속 구분한다.

---

# K-STOCK AI MARKET REACTION REPORT — 2026-10-12

PROJECT: /Users/ari/ARI/projects/k-stock-ai
BRANCH: auto/kstock-development-20260930
COMMIT: ea406852610c00bef0dbe469de95c42fca662c30 (기준 HEAD; commit/push 없음)
VERSION: package1.0.0 / server0.1.0 / Android2.6.5(265) / Influence API v1 확장
BASELINE: Regression594 PASS 현재 코드 재실행 / Android Contract3
CURRENT: Regression606 PASS / Android Contract3 PASS / FAIL0 / SKIP0
OVERALL: PARTIAL

## 실제 확보 결과

APPLE PRICE: 기존 승인 KIS 조회환경·인증정보를 그대로 사용해 해외 기간별 AAPL/NAS 일별 시세2회 성공. 토큰 포함 직접4회. 신규 유료 서비스·계좌·주문 호출 없음.
Source: [한국투자증권 공식 dailyprice/검증 예제](https://github.com/koreainvestment/open-trading-api/blob/main/examples_llm/overseas_stock/dailyprice/chk_dailyprice.py), HHDFS76240000, MODP0(수정주가 미반영).
Coverage: 2024-10-24~2025-03-20 100건 / 2025-04-23~09-15 100건 / 고유200건. 두 구간 사이 자료를 보간·연속 이력으로 표현하지 않음.
Price Type: RAW_CLOSE / Nasdaq / USD / open-high-low-close 검증 / adjustedClose=null. 원주가에 추가 조정 적용 없음. provider JSON 직렬화 SHA·조회기준일·종목·중복·OHLC·미래 날짜 검사.

BENCHMARK:
Source: [FRED S&P 500](https://fred.stlouisfed.org/series/SP500) / S&P Dow Jones Indices
Coverage: 실제 종가155건,2025-02-03~09-15 / 휴장 blank6개 유지·보간 없음
Return Type: PRICE_INDEX, 배당 미포함. Apple 원주가 가격수익률과 비교하는 정의이며 총수익률 아님.
S&P 원시 지수값은 비공개 연구 자료로 보관하고 API/UI/Git에 시계열을 제공하지 않음. API는 기간·건수·원천 및 파생 자료 확보 상태만 제공.

SEC:
Institution: Berkshire Hathaway / CIK0001067983 / Apple CUSIP037833100 / COM
Accession Numbers: 0000950123-25-002701 / 0000950123-25-005701 / 0000950123-25-008343
Reporting Periods: 2024-12-31 / 2025-03-31 / 2025-06-30
Holdings: 300,000,000 / 300,000,000 / 280,000,000주. 실제 매수·매도일로 표시하지 않음.
Accepted At: 아래 원문 헤더3건과 기존 index의 날짜/시각 대조 PASS, America/New_York 정규화.
Public Available At: 실제 최초 공개 시각3건 모두 null / PUBLICATION_TIME_UNVERIFIED
Transaction Date: 3건 모두 null
Tradeable From: 3건 모두 null / TRADEABLE_FROM_UNVERIFIED
Correction: 기존 NEW HOLDINGS 정정0000950123-25-008361/Apple미포함 보존; 기존 보유량을0 또는 추가분으로 대체하지 않음.

| 보고기간 | 접수일·시각 (미국 동부) | 원문 헤더 근거 | 시각 판정 |
| --- | --- | --- | --- |
| 2024-12-31 | 2025-02-14T16:00:02-05:00 | [002701 header](https://www.sec.gov/Archives/edgar/data/1067983/000095012325002701/0000950123-25-002701-index-headers.html) | 접수 VERIFIED / 공개 미확인 |
| 2025-03-31 | 2025-05-15T16:06:43-04:00 | [005701 header](https://www.sec.gov/Archives/edgar/data/1067983/000095012325005701/0000950123-25-005701-index-headers.html) | 접수 VERIFIED / 공개 미확인 |
| 2025-06-30 | 2025-08-14T16:05:02-04:00 | [008343 header](https://www.sec.gov/Archives/edgar/data/1067983/000095012325008343/0000950123-25-008343-index-headers.html) | 접수 VERIFIED / 공개 미확인 |

[SEC 공식 FAQ](https://www.sec.gov/files/about/webmaster-faq.htm)는 접수와 웹 제공 사이 지연을 보장·예측하지 않는다. 흔한 지연 시간을 실제 접수 시각에 더해 공개 시각을 만들지 않았다. [PDS 공식 규격](https://www.sec.gov/info/edgar/specifications/pds-dissemination-spec022315.pdf)의 TIMESTAMP는 post-acceptance correction용이며 일반13F 최초 웹 공개 증거로 대체하지 않는다. 기존 DAY/23:59:59 값은 보수적 가정으로 유지하고 신규 실제 공개 필드는 null로 분리했다. historical first-public/PDS 수신 로그는 미확보이며 유료 가입 없음.

CALENDAR: [NYSE2025 공식 달력](https://www.nyse.com/publicdocs/ICE_NYSE_2025_Yearly_Trading_Calendar.pdf) PDF형식/SHA 확인, [Nasdaq 정규장 안내](https://www.nasdaq.com/market-activity/stock-market-holiday-schedule)09:30~16:00 미국동부 기준. 범위2025-02-01~09-15만 적용,2/17·4/18·5/26·6/19·7/4·9/1 휴장, DST·7/3 조기종료 처리. DST모호/존재하지 않는 시각과 지원 밖 기간 차단.

## 시장 반응·발언 관계

MARKET REACTION:
1D: 3개 사건 모두 공통 가격 후보 구간 확보 / 수익률 null·계산 보류
5D: 동일 / 수익률 null·계산 보류
20D: 동일 / 수익률 null·계산 보류
Excess Return: 신규9행 모두 null / MARKET_REACTION_BLOCKED
Verified Samples: 0 (기존 신호 연구24행·그룹N0도 유지)

| 사건 접수일 | 접수 뒤 관측 후보 시작 | 1D 후보 끝 | 5D 후보 끝 | 20D 후보 끝 | 공통 가격 |
| --- | --- | --- | --- | --- | --- |
| 2025-02-14 | 2025-02-18 | 02-19 | 02-25 | 03-18 | 2/6/21개 모두 확보 |
| 2025-05-15 | 2025-05-16 | 05-19 | 05-23 | 06-16 | 2/6/21개 모두 확보 |
| 2025-08-14 | 2025-08-15 | 08-18 | 08-22 | 09-15 | 2/6/21개 모두 확보 |

이 날짜는 ACCEPTANCE_BASED_CANDIDATE_NOT_PUBLICATION이다. 공개 뒤 실제 실행 가능한 시작일·가격이 검증된 결과가 아니다. startDate/endDate/publicAvailableAt/tradeableFrom/수익률은 null이고 후보 날짜와 참고 종가만 별도 표시한다. Apple8/15 참고 종가231.59USD는 실제 일별 관측이며 확정 체결 가격으로 사용하지 않는다. 1/5/20은 후보 기준 종가와1/5/20세션 뒤 종가의 공통 자료 확보 검사로, 시작까지 포함해2/6/21개가 필요하다.

장중 공개 사건은 일별 종가만으로 거래가능시점을 정하지 않도록 기존 measureMarketReaction을 강화했다. 실제 시각·양수가격·독립 source SHA/공식 근거를 갖춘 executionObservation이 없으면 TRADEABLE_FROM_UNVERIFIED로 차단한다. fixture의 가상 실제관측을 명시해 기존 계산 회귀를 보존했고, 실데이터 사건을 이런 fixture로 대체하지 않았다. 종가 기준 관측 baseline은 FIRST_OBSERVED_CLOSE로 표시하고 실제 진입 체결과 구분한다.

[Apple 공식 FAQ](https://investor.apple.com/faq/default.aspx)의 분할 이력과 배당 자료를 확인했지만 사건 구간 기업행동 전수·배당락일·실행 가격 검증은 완료하지 않았다. 가격 정의는 공식MODP0로 검증됐고 기업행동 커버리지는 CORPORATE_ACTION_COVERAGE_INCOMPLETE다. 수정계수/배당 포함 총수익률을 추정하지 않았다.

BUFFETT RELATION:
Statement: [2024 주주서한 PDFpage6](https://www.berkshirehathaway.com/letters/2024ltr.pdf#page=6) Apple 직접 언급 확인. 여러 소수지분 투자기업의 일반 설명이며 특정 날짜의 매수·매도 지시가 아님.
Holding Change: 기관 보고0주/−20,000,000주 비교 유지. 서한은2월접수 뒤·3월/6월 보고 전이지만 실제 개인 거래와 구분.
Combined Signal: VERIFIED0 / 기존 공식 직책 연관 후보1 INSUFFICIENT_EVIDENCE 유지
Verification: DIRECT_MENTION_ONLY; 방향·인과관계·개인 거래·투자 가설 성공 미검증. 기존 bounded직책 근거를 이후기간에 임의 연장하지 않음. 신규 AI추론0/저장AI2·이력 보존.

## UI·자동화·기존 금융 검증

WEB UI: PASS. Chrome 실제 API Apple200/S&P155·휴장6/접수3·공개null/후보9·가격확보VERIFIED·수익null/Apple 직접언급 확인. 라이트·다크320/360/390/768/1024/1440px 및390px200% 글자 확대 전체overflow 없음. 인물/필터/기존상세 보존, 새 SEC마지막 상세 펼침 및 window.scrollY 재검증·유지. 연결실패/복구 PASS. price coverage VERIFIED와 market BLOCKED를 분리하고 색상 없이 문구로 표시.
GALAXY A33: PASS, SM-A336N/RFCW1178RRE 기존 앱2.6.5(265)·데이터 보존, 재설치 없음. 실제 가격 확보기간·200건·SP500·버핏 관계/SEC접수16:05:02-04:00·공개/거래시각 미확인/1·5·20 후보·공통가격2/6/21·가로스크롤/31초상세·위치보존 확인. K-Stock 전용reverse 연결실패·복구/앱재실행 PASS. 다른 앱 입력·캡처 없음. OS200% 및 운영인증 NOT RUN.
Artifacts: docs/uiux/market-people-web.png, market-research-web.png, market-evidence-web.png, market-coverage-a33.png, market-window-a33.png, market-prices-a33.png; 상세/갱신전후/오류/복구/재실행 /tmp/kstock-market-a33-*.png.

FINANCIAL VALIDATION:
SK Treasury Difference: 1,014주 미해결
DB Financial Differences: 최초/정정400셀 재감사,차이9/해결0/미해결9 / 외부0
PBR Eligible Samples: 0 (6기업3 PARTIAL/3 BLOCKED; PER/PBR/PSR/EV_EBITDA 모두0)
DB기준점에 소각894,000주 포함/중복 차감 금지 유지. 금융 관련80테스트PASS는 전체606의 부분집합이다. 상세 [금융 병렬 검토](KSTOCK_MARKET_FINANCIAL_REVIEW.md).

WORKERS:
SEC: 기존 SEC client 재사용/명시적수집/24h캐시·원문 헤더 대조
Market Reaction: 기존 서비스의 실제 저장 가격 정규화·후보구간 검증, 새 Worker/daemon 없음
Validation: 동일 INFLUENCE_VALIDATION·금융 별도 큐; fingerprint에 새 자료 포함·변경 자료 재검증
Scheduler: 실제 ownerPID99118,30분 SAVED_EVIDENCE_ONLY,heartbeat2026-10-12T14:23:29.201Z,다음14:53:29.201Z(23:53:29KST). 현재RUNNINGfalse/금융보관lastRun11:47:27.446Z와 구분. 이번30분경과tick 실제관측NOT RUN.
Domains: SEC Filing Validation(PARTIAL),Historical Price Collection(VERIFIED),Market Reaction Research(PARTIAL),Statement Capital Correlation(PARTIAL),Financial Validation(SEPARATE_EXISTING_QUEUE),QA Reporting(SAVED_EVIDENCE_ONLY)
External Auto Collection: false / 모델 자동실행 false / 로컬 API/Worker 외부0

CALL AUDIT: 이번 제한 직접 읽기12회 = KIS시세2+토큰2,SEC헤더3,FRED2,NYSE달력1,AppleIR1(403),Nasdaq1(200/0행). 공식 웹 문서 탐색은별도. 기존 실패 경로를 반복하지 않고 승인된 KIS 공식 해외 조회로 전환. 새 collector 캐시2회 외부0. collector미캐시최대8요청/단일토큰/timeout/24hcache/무한재시도 없음. source별 checkedAt·SHA 기록; 성공한 기존 자료는 실패 시 보존.

TESTS:
PASS: `npm run test:offline`606, `node --test test/android_external.test.js`3
FAIL: 0 / SKIP: 0
Added:12개 의미있는검증(US evidence9,장중실행차단1,Web상태표시1,API/fingerprint/privatefield1)
NOT RUN: 정확 최초공개·실행가격·기업행동 완료에 따른 실제1/5/20수익·초과수익 표본,통계/전략유효성/train-test,운영인증·배포·OS200%,30분tick 관측.
Logs: /tmp/kstock-market-baseline.log, market-regression.log, market-new-tests.log, market-ui-tests.log, market-web.log, market-android.log, market-cache.log, market-server.log. 전체오프라인테스트는fixture/mock만 사용해 외부·실주문 없음.

RECOMMENDATION: HOLD (Apple순위 포함)
SAMSUNG PERFORMANCE: HOLD
LIVE TRADING: OFF / KSTOCK_BROKER_ENABLED=false / KSTOCK_LIVE_TRADING_ENABLED=false / 외부접속disabled
REAL ORDER CALLS: 이번작업0. 읽기전용요청과로컬검증만 실행,계좌 과거전체감사 주장 아님.
SECURITY: .env/latest보고/DB최초·정정ZIP SHA 불변/비밀literal0. 신규자료Git제외0600. 다른프로젝트·운영서버·유료서비스·키변경·데이터삭제 없음.

MODIFIED FILES: src/services/kis_request.js; src/v2/us_market_evidence.js, influence_engine.js, influence_service.js; scripts/collect-us-market-evidence.mjs; public/app.js; test/us_market_evidence.test.js, influence_engine.test.js, influence_service.test.js, candidate_ui.test.js; README.md; docs/KSTOCK_INFLUENCE_API.md, KSTOCK_MARKET_FINANCIAL_REVIEW.md, KSTOCK_QA_FOLLOWUP_REPORT.md, AUTO_DEV_LOG.md; 위 UI artifacts.
Private data: aapl-kis-history/prior,sp500-market-history/full,sec-publication-review,market-calendar-proof,buffett-apple-review 및 새 DB감사 artifact. 기존자료보존.
BLOCKERS: historical first-public 기록 미확보·실행가능시점/가격 미확인·기업행동 범위 미완료; 기존SK1014/DB9/10월8일시총·PBR0.
NEXT ACTION: 확보된가격은 재사용하고,무료공식근거로 최초공개/PDS실제공개기록 및기업행동커버리지를 우선검증. 필요한자료확보전수익값·검증샘플생성없음. 유료기록서비스가필요한경우구체범위·비용을분리해승인받기전활성화하지않음.
OVERALL: PARTIAL. Apple실제과거가격과벤치마크부족은해소했고,접수시각·기간자료·API/UI/회귀는검증했다. 최초실증표본은0이며투자전략유효성을입증하지않았다.

---

# K-STOCK AI SIGNAL VALIDATION REPORT — 2026-10-12 공식 자본 행동 연결

PROJECT: /Users/ari/ARI/projects/k-stock-ai
BRANCH: auto/kstock-development-20260930
COMMIT: ea406852610c00bef0dbe469de95c42fca662c30 (기준 HEAD; commit/push 없음)
VERSION: package1.0.0 / server0.1.0 / Android2.6.5(265) / Influence API v1 확장 / Financial Validator v18
BASELINE: Regression581 PASS 현재 코드 재실행 / Android Contract3
CURRENT TESTS: Regression594 PASS / 별도 Android Contract3 PASS / FAIL0 / SKIP0
OVERALL: PARTIAL

## 공식 자료 확보와 판정

CAPITAL BEHAVIOR:
Confirmed Transactions: 기존 SK회사 자기주식처분82주1건 재검증·유지. 신규 미국 확정 거래0건.
Holding Changes: 실제 SEC 기관 보유 보고3건, 보유 감소1건, 변화 없음1건. 최초 잔고1건은 변화로 세지 않는다.
Announced Intentions: 기존 SK자기주식취득계획1건 유지; 실제 취득으로 승격하지 않음.
Official Sources: Berkshire13F4개 문서 버전 + 공식2025proxy 직책 근거1건. 기존 Powell/Buffett 발언2건 및 Apple/SEC 검증대기5건 보존.

| 보고기간 | 공시 접수일 | 공식 접수 시각(미국 동부) | AAPL 보통주 보유 | 판정 | SEC 문서 |
| --- | --- | --- | --- | --- | --- |
| 2024-12-31 | 2025-02-14 | 16:00:02 -05:00 | 300,000,000주 | 최초 잔고·변화 미산출 | [002701](https://www.sec.gov/Archives/edgar/data/1067983/000095012325002701/0000950123-25-002701-index.htm) |
| 2025-03-31 | 2025-05-15 | 16:06:43 -04:00 | 300,000,000주 | 동일 CUSIP/보통주 수량 변화0주 | [005701](https://www.sec.gov/Archives/edgar/data/1067983/000095012325005701/0000950123-25-005701-index.htm) |
| 2025-06-30 | 2025-08-14 | 16:05:02 -04:00 | 280,000,000주 | 보고 보유량 감소20,000,000주 | [008343](https://www.sec.gov/Archives/edgar/data/1067983/000095012325008343/0000950123-25-008343-index.htm) |
| 2025-03-31 정정 | 2025-08-14 | 16:10:02 -04:00 | null·정정표에 AAPL 없음 | NEW HOLDINGS·신규 보유 추가, 기존 AAPL을0주로 대체하지 않음 | [008361](https://www.sec.gov/Archives/edgar/data/1067983/000095012325008361/0000950123-25-008361-index.htm) |

접수 시각은 실제 최초 공개 시각을 증명하지 않는다. publicAvailableAt는 접수일 미국 동부23:59:59의 보수적 DAY 값, firstPublicAvailabilityVerified=false다. 실제 거래일/체결가격/tradeableFrom은 null이며 버핏 개인의 매도로 표시하지 않는다. 분기 보고 잔고 감소와 실제 거래는 별도다.

CUSIP037833100/COM/SH만 집계하고 옵션 제외, 서로 다른 manager 행 집계, 완전히 중복된 행·음수·분수·안전정수 초과 차단. 고정 공시 창2025-01-01~08-15의4개 버전을 모두 대조했고 성과를 보고 표본을 고르지 않았다. 전체 SEC 역사 전수검증은 아니다. 원문 전체/개인 주소를 저장하지 않고 최소 기관 수량·문서ID·SHA·기간을 Git제외0600으로 저장했다.

[2025proxy](https://www.sec.gov/Archives/edgar/data/1067983/000119312525054877/d812428ddef14a.htm)는 문서 기준2025-03-14 당시 Buffett의 Berkshire 회장/CEO 관계를 확인한다. 연 단위1970 시작은 보수적으로1970년말 이후, 관계 유효 끝은 문서 기준일까지만 사용한다. 현재 직책·개별 투자 결정권·이후 기간을 추정하지 않는다. 관계 근거 이용 가능일도 결합 신호 공개일에 포함해 미래정보 누출을 차단한다.

DATA COLLECTION: 이번 직접 공식 읽기17회 = SEC XML 초기 확인1 + collector13 + proxy2 + Nasdaq가격1. 이후 두 collector24시간 캐시 재실행은 모두 외부0회. 공식 웹 문서 탐색은 별도로 수행했고 앱 자동 수집 호출과 합산하지 않는다. 새 유료 서비스·키 변경·AI 호출0. API·30분 Worker 외부 요청0.
COLLECTION TIMING: capital2026-10-12T13:26:10.301Z; 그 외 실제 확인 시각은 각 private checkedAt 및 수집 로그에 보존.

## 결합 신호와 시장 연구

SIGNAL RESEARCH:
Statement Only: 2
Capital Only: 5 (기관 보고3 + 기존 SK거래/의향2)
Aligned: 0
Divergent: 0
Verified Combined Signals: 0
Insufficient Evidence: 공식 기관 직책 연관 후보1; 총8신호.

기관 보고와 인물 발언은 검증된 기간 내 공식 직책 관계 및 동일 기업이 있을 때만 연관 후보로 연결한다. 개인 거래로 귀속하지 않는다. 공식 발언의 방향 근거가 없어 ALIGNED/DIVERGENT로 승격하지 않는다. AI sentiment는 방향 증거가 아니다. 2025-03-01 cutoff fixture에서 후속 보유 수량·관계·정정·후속공시 metadata를 노출하지 않는 것을 검증했다.

MARKET REACTION:
1D Samples: 0
5D Samples: 0
20D Samples: 0
Benchmark: AAPL에 SP500:PRICE_INDEX 식별자 연결; 사건별 실제 공통 가격 구간은 미확보. 기존 Powell 지수 관측은 DESCRIPTIVE_ONLY로 별도 유지.
Excess Return: 24행 전부 null / MARKET_REACTION_BLOCKED; 0%로 표시하지 않음.
Limitations: 정확한 최초 공개 시각·실제 거래 가능 시점·2025종목 가격·기업행동 범위·같은 세션 벤치마크가 부족하다.

Nasdaq 공식 AAPL historical endpoint를2025-02-14~09-15 구간으로1회 제한 조회: HTTP200, 이번 응답에서 가격0행. 이를 전체 Nasdaq 역사자료 부재로 일반화하지 않는다. 현재 저장 Alpha Vantage100일은2026-05-19~10-09이므로2025 사건에 사용하지 않았다. full/adjusted 유료 범위를 임의 활성화하지 않았다. Apple 공식 배당표의 record/payable 날짜를 배당락일로 추정하지 않았다. 상세 금융 경로 검토는 [KSTOCK_CAPITAL_FINANCIAL_REVIEW.md](KSTOCK_CAPITAL_FINANCIAL_REVIEW.md) 참조.

검증된 경우만 securityReturn−benchmarkReturn을 계산하는 계약을 구현했다. 실제 결과의 tradeableFrom/securityId/benchmarkId/securityReturn/benchmarkReturn/excessReturn/dataQuality와 구간 검증을 동일 API로 제공한다. tradable>=publication, tradable<=baselineClose, 양쪽 동일 세션·기준·기업행동 조건을 검사한다. 배당/비용 제외 가격수익률이며 연율화/보간하지 않는다.

발언/자본/결합 ×1/5/20 그룹9행 구현: sampleSize=0, 평균/중앙값/양의 초과수익 비율/손실 건수 모두 null, statisticalSuperiority=false. 실제 종목 손실과 음의 초과수익 건수는 구분한다. 중복 signalId 표본 증가를 차단한다. 시장/산업 편향·공시 지연·거래비용·선택편향·train/test 미분리 한계를 표시한다. 투자 가설의 시장 유효성은 검증되지 않았다.

AI ANALYSIS:
Model: 기존 로컬 qwen3:8b / 저장 digest·prompt influence-analysis-v3-ko 유지
Executed: 이번 신규 추론0; 실제 저장 생성2건 재사용, 이전 생성/실패4건 이력 보존
Verified Statements: 공식 원천2건; AI 해석은 UNVERIFIED_INTERPRETATION이며 방향·예측 검증과 다름

FINANCIAL VALIDATION:
SK Treasury Difference: 1,014주 미해결
DB Financial Differences: 9건 / 해결0 / 미해결9; 기존 ZIP·400셀 대사 재실행 외부0
PBR Eligible Samples: 0 / 국내 포함 후보6; PER/PBR/PSR/EV_EBITDA 모두0
DB 소각894,000주 baseline 포함 차단 유지. 10월8일 주식수·시총 추정 없음. 영향력 신호를 이 차이의 해결 근거로 사용하지 않는다.

## 실제 화면과 Worker

WEB UI: PASS. Chrome 실제 로컬 API 확인(공시4/보유보고3/변화1/동일1/관계1/정정 AAPL미포함/신호8/24행null/그룹9×N0). 잔고/변화없음/감소를 다른 문구로 표시. 라이트·다크320/360/390/768/1024/1440px,390px200% 글자 확대 전체 가로 overflow 없음. 인물 선택·근거 펼침·필터 새로고침 보존 및 연결 실패/복구 확인. 긴 연구 표로 바로 이동하는 링크 추가.
GALAXY A33: PASS. SM-A336N/RFCW1178RRE 기존 설치·앱데이터 보존, 재설치 없음. 공식 집계/인물목록/기관 수량·이전현재수량·공시기간·원천/정정 범위/시장 보류/그룹N0/가로 스크롤 확인. 상세 펼침과 위치가31초 자동 갱신 전후 유지됨. K-Stock 전용 USBreverse만 일시 제거해 연결 실패 표시·복구 확인, 앱 force-stop/relaunch 정상. 다른 앱 조작·촬영 없음. 운영 인증·실기기OS글자200%는 NOT RUN.
SCREENSHOTS: docs/uiux/capital-people-web.png, capital-research-web.png, capital-holding-a33.png, capital-decrease-a33.png, capital-research-a33.png, capital-groups-a33.png. 실제 폰 상세/갱신/실패/복구/재실행 캡처는 /tmp/kstock-capital-a33-*.png.

WORKERS:
Influence: 기존 서비스 저장 근거 재검증 유지, sourceFingerprint에 자본/관계/정정/시장검토 포함
Capital: 기존 수집 경로 재사용 + 명시적 제한 collector; 새 daemon/Worker 없음
Validation: 동일 기존 Scheduler의 INFLUENCE_VALIDATION, 금융6개 큐 분리 유지
Scheduler: 실제 local ownerPID94530, interval1800000ms, SAVED_EVIDENCE_ONLY, 다음2026-10-12T14:08:51.388Z(23:08:51 KST). 실행중false; 예약 유지와 이번30분 경과 관측을 구분한다.
External Auto Collection: false / model auto execution false

TESTS:
PASS: `npm run test:offline` 594 / `node --test test/android_external.test.js` 3 / 실제 Web QA 및 A33 위 범위
FAIL: 0 / SKIP: 0
NOT RUN: 실제 최초 공개시각·종목/벤치마크 유효 가격 기반 초과수익, train/test 및 통계적 우위, 신규AI추론,30분 경과 Scheduler tick 관측, 실기기OS200%, 운영 인증·공개 배포·스토어 검증.
새 의미 있는 자동 검증13개: engine5/UI4/parser3/service1. 기준 테스트 삭제·안전조건 완화 없음. 오프라인 테스트 고정 fixture 사용/외부·주문 호출 없음.
LOGS: /tmp/kstock-capital-baseline.log, capital-regression.log, capital-android.log, capital-web.log, capital-collection.log, capital-relation.log, capital-cache.log, capital-relation-cache.log, capital-server.log.

RECOMMENDATION: HOLD (삼성전자·Apple 순위 포함)
SAMSUNG PERFORMANCE: HOLD
LIVE TRADING: OFF / KSTOCK_BROKER_ENABLED=false / KSTOCK_LIVE_TRADING_ENABLED=false / 외부접속 disabled
REAL ORDER CALLS: 이번 작업0. 읽기전용 수집·로컬 API·fixture 테스트만 실행. 계좌 전체 과거 주문 감사 주장은 아님.
SECURITY: .env/latest보고서/DB최초·정정ZIP SHA 불변. 새 수집자료0600/Git제외. 비밀값 literal scan0. 운영 서버·다른 프로젝트 변경 없음.

MODIFIED FILES:
src/v2/influence_engine.js, src/v2/influence_service.js, src/v2/sec_capital_evidence.js, src/v2/index_event_observation.js;
scripts/collect-influence-capital.mjs, scripts/collect-influence-actor-relation.mjs;
public/index.html, public/app.js, public/styles.css;
test/influence_engine.test.js, test/influence_service.test.js, test/sec_capital_evidence.test.js, test/candidate_ui.test.js;
README.md, docs/KSTOCK_INFLUENCE_API.md, docs/KSTOCK_CAPITAL_FINANCIAL_REVIEW.md, docs/KSTOCK_QA_FOLLOWUP_REPORT.md, docs/AUTO_DEV_LOG.md, 위 UI 캡처.
Git제외 실제 자료3개(capital-sec/actor-relations/market-read-review) 및 새 DB감사 artifact. 기존 미커밋 변경과 이전 보고는 보존한다.

BLOCKERS: 공식 방향 근거; 사건 공개·거래 가능시각;2025종목/기업행동/공통 벤치마크; SK1,014주; DB9건;10월8일 기준일 주식수/시총.
NEXT ACTION: 승인된 무료 공식 경로의2025사건 가격·기업행동 커버리지와 실제 공개시각 근거를 우선 확보하고, 별도 국내 주식수·DB원문 큐 계속 검증. 확보 자료만 재평가하며 조건 완화/유료 자동 활성화 없음.
OVERALL: PARTIAL. 실제 기관 보유 변화와 관계·연구 계약 및 화면은 연결했고, 결합 방향·초과수익·PBR 유효성은 미완료다.

---

# K-STOCK AI SIGNAL RESEARCH REPORT — 2026-10-12

PROJECT: /Users/ari/ARI/projects/k-stock-ai
BRANCH: auto/kstock-development-20260930
COMMIT: ea406852610c00bef0dbe469de95c42fca662c30 (기준 HEAD, 이번 commit/push 없음)
VERSION: package1.0.0 / server0.1.0 / Android2.6.5(265) / Influence API v1 확장 / Financial Validator v18
BASELINE: Regression570 PASS 현재 코드 재실행 / Android Contract3
TESTS PASS: Regression581 / 별도 Android Contract3
FAIL: 0 / SKIP: 0
OVERALL: PARTIAL

## 실제 AI·공식 근거

AI ANALYSIS:
Model: 기존 설치 qwen3:8b, digest500a1f067a9f782620b40bee6f7b0c89e17ae61f686b92c24933e4ca4b2b8b41
Executed: 실제 로컬 추론6회. 초기 영문2건 생성, 한국어 시도2건 schema검증 실패·반영 차단, 명시적 JSON schema 재실행2건 생성. 최종 저장2건, 이전 생성/실패4건 이력 보존. 재실행 캐시 공식 요청0/모델 요청0.
Prompt: influence-analysis-v3-ko. 한국어 지시에도 주요 해석 영어 출력이 남아 한국어 변환 품질은 미검증. 공식 한국어 편집 요약과 실제 AI 해석을 별도로 표시.
Verified Statements: 원천자료2건. AI는 AI_INFERENCE / UNVERIFIED_INTERPRETATION이며 원문 사실·예측 성공 판정과 다름.
Unverified Statements: 현재 등록 원천2건 중0. AI 의미·방향·예측력 독립 검증 미완료.

공식 대상 [파월2025-08-22 연설](https://www.federalreserve.gov/newsevents/speech/powell20250822a.htm), [버핏2024 주주서한](https://www.berkshirehathaway.com/letters/2024ltr.pdf). 당시 직책/날짜/원문SHA/원문근거ID/모델digest/프롬프트/생성·완료시각 저장. 공식 원문은 메모리에서 HTML/PDFKit으로 추출하여 첫30,000자만 로컬 모델 입력; 전체 문서 감사가 아님. 실제AI 원문컨텍스트hash와 문자수·잘림 상태 보존. 원문 전체 파일·텍스트는 저장/화면/API에 노출하지 않았다. 외부 유료AI0, model localhost11434만 사용. 새로운 모델 다운로드·비밀값변경·운영변경 없음.

첫 공식 HTML 재읽기 시 원문 전체hash 변경을 감지해 실행 중단1회. 이후 제목·발언자·날짜 공식 identity를 재검토하고 이전hash를 보존한 새hash에만 모델 근거를 결합했다. 오래된hash의 AI를 새원문으로 자동 승인하지 않음. data/v2/influence/{sources,analyses}.json Git제외0600. AI 저장자료가 원문hash/문서/출처/기업허용범위/프롬프트/공개·생성·완료cutoff를 통과해야 API 반영. 현재 시점의 생성물을2025년 당시 예측으로 소급하지 않는다.

직접 공식 읽기 총9회(첫 hash차단1+분석 세대별2회씩3=7, 별도 FRED1+FedPDF1). 로컬 모델 실제6회, 모델목록 조회 별도; 자동 API/Worker조회는 외부 요청0. 추가 공식Web 조사·조회는 문서/근거 확인용이며 자동큐/검증완료표본에 미등록. 원천 확인2026-10-12 21:56~22:10 KST. 기존 삼성/Apple금융 외부API 신규 호출0.

## 자본 행동·신호

CAPITAL BEHAVIOR:
Confirmed Transactions: 검증1 — SK회사 보통주 자기주식처분82주2026-08-19, 공시8월21일. 사람 개인거래 아님.
Holding Changes: 검증0 — 기존 Berkshire13F1건은 보고 보유량/기간이며 원문검증대기, 실제매수일null.
Announced Intentions: 검증1 — SK자기주식취득계획24,070,000주. 실행된취득으로 승격하지 않음.
기존 SEC Form4신고4건도 원문검증대기. 확정transactionDate=null, reportedTransactionDate 별도, 금액·가격·불명확정정관계null. Apple/SEC원천과근거 보존.

SIGNAL CORRELATION:
Statement Only: 2
Capital Only: 2
Aligned: 0
Divergent: 0
Insufficient Evidence: 결합 후보0; 미검증 SEC공시5건은 신호에서 제외.

동일 개인행동주체·기업·실제거래·독립 검증된 방향근거가 충족되어야 일치/불일치 판정. AI 감성이나 회사/기관 행동을 개인발언의 실제투자와 결합하지 않음. 공개시점·주체·근거를 재검사, legacySignalType 호환필드 유지. 4사건×3기간=12 연구결과행, 현재 모두 INSUFFICIENT_DATA/sampleSize0/수익률null. 종목·벤치마크·초과수익률을 만들지 않는다.

## 시장 관측과 예측력의 구분

MARKET REACTION:
1D: 지수 관측 +0.41339768795% (2025-08-25→08-26)
5D: 지수 관측 -0.36929365212% (08-25→09-02)
20D: 지수 관측 +3.37923880161% (08-25→09-23)
Benchmark: FRED공식 S&P500 PRICE_INDEX 자체 관측. 개별종목과 비교하는 벤치마크 쌍 미연결, 초과수익률null.
Verified Samples: 신호성과 검증0 / 보수적 지수 관측사건1
Limitations: 최초 실제공개시각·종목기업행동·비교종목 부족, 표본1, 선택/생존자편향 미검증, 데이터공개지연, 반사실·사건전추세/통계검정 미실행.

[FRED SP500](https://fred.stlouisfed.org/series/SP500) 공식2025-08-21~09-23 자료24행/23유효종가. [NYSE운영사 공식 휴장발표](https://ir.theice.com/press/news-details/2024/NYSE-Group-Announces-2025-2026-and-2027-Holiday-and-Early-Closings-Calendar/default.aspx)로9월1일휴장확인, null을거래일/보간가격으로 만들지 않음. America/New_York, 배당미포함가격지수, 비연율화, 원시시계열공유권리미확인→0600비공개연구입력만 저장. 로컬UI에는 파생관측수치·출처·한계만 표시, 원시지수시계열/차트/공개배포 없음.

[파월 공식PDF](https://www.federalreserve.gov/newsevents/speech/files/powell20250822.pdf) 첫면 release-on-delivery2025-08-22 10amEDT 확인. 이는 공식예정시각이며 실제최초웹게시·전달시각을 독립관측한것은 아님. 기존DAY/보수적일말기준 유지, 다음관측종가8월25일을공통시작으로 사용. DESCRIPTIVE_ONLY표시이며 관측 상승을 예측성공/인과로 판정하지 않는다. 별도금융조사문서8월22일close기준예정시각시나리오는 미검증 참고계산, 실제UI보수적시나리오와구분.

Phase6 소규모분산후보: ECB라가르드2025-08-23공식연설(당시President) 원문후보확인. TSMC2025-06-03주총은CCWeiChairman/발언예정만확인, 실제발언원문없어차단. 신규AI실행·신호표본·자동수집으로승격하지않음. 상세 docs/KSTOCK_SIGNAL_FINANCIAL_REVIEW.md.

## 금융·실행 상태

FINANCIAL VALIDATION:
SK Treasury Difference: 1,014주 미해결. 확인82주처분 유지, 분해잔차를 가상거래로 생성하지 않음.
DB Financial Differences: 9 /Resolved0 /Unresolved9. 이번저장원문400셀재감사/API읽기0, 개별공식원인미확보.
PBR Eligible Samples: 0 (6기업3PARTIAL/3BLOCKED). DB894,000주소각기준점포함·중복차감차단 유지. 국내3기업10월8일 확정주식수/시총/PBRnull. 최소표본3정책 유지.

WORKERS:
Influence: 저장된 로컬AI와 공식자료 재검증, API조회시 실제모델/외부호출 없음.
Capital: 같은자료내 독립판정, 미검증SEC를인물신호와분리.
Validation: 기존Financialqueue 분리보존. 기존Scheduler의 saved task1개로6논리영역상태노출.
Scheduler: 현재 ownerPID91754, heartbeat2026-10-12 22:10:45 KST / 다음예정22:40:45 KST. 기존30분SAVED_EVIDENCE_ONLY, 동시중복차단/실패격리 유지. 새Worker/외부자동수집/유료AI스케줄 OFF. 로컬서버변경만, 운영 ari-prod-01/공개배포 변경없음.

## 실제 화면·테스트

WEB UI: 실제API2인물/2공식발언/2현재AI/4신호/12결과행/지수3수치/검증표본0 확인. 두테마6화면폭320~1440·200%글자확대 가로넘침0. 인물선택·펼친근거·스크롤·선택신호유형 유지, 연결차단/복구 통과. 표첫열 내부ID대신짧은한국어근거명. screenshots docs/uiux/signal-people-web.png,signal-research-web.png.
GALAXY A33: 기존SM-A336N/RFCW1178RRE 앱2.6.5(265)·사용자데이터보존, 재설치안함. 실제목록/파월·버핏상세/AI해석/공시·자본행동/신호연구·자료부족/지수관측1·5·20·출처/가로스크롤 확인. 최종 31초 대기 전후 선택·펼침·스크롤 위치 유지 확인. 자체 tcp3103 reverse 제거로 연결 실패를 확인하고 반드시 복구한 뒤 정상 재연결 확인. 자체 앱 force-stop/재실행 후 정상 목록·버핏 모델/프롬프트/시각 확인. 원천 링크 URL 표시만 확인했으며 다른 앱으로 여는 외부 클릭은 NOT RUN. A33 시스템 글자 확대 변경 NOT RUN(브라우저200% 검증은 PASS).

TESTS:
Commands: npm run test:offline; node --test test/android_external.test.js; node --test test/candidate_ui.test.js; node /tmp/kstock-signal-browser.mjs; explicit local AI script; guarded Galaxy A33 QA.
PASS: Regression581 / AndroidContract3 별도
FAIL: 0
NOT RUN: 실제최초공개시각 독립관측, 개별종목기업행동+해외벤치마크쌍신호수익률, 사건전추세·매칭사례/통계예측검정, 추가후보AI/원문큐수집, 새APK설치(기존앱재사용), 실제30분경과tick관측, 운영배포/유료AI/외부자동수집.

RECOMMENDATION: HOLD
SAMSUNG PERFORMANCE: HOLD
APPLE RANKING: HOLD
LIVE TRADING: OFF (broker/live false)
REAL ORDER CALLS: 이번작업0. 주문·취소·계좌변경 호출 없음, 로컬프로세스주문경로미사용/차단. 과거계좌주문내역 감사주장이아님.

MODIFIED FILES: src/v2/influence_engine.js;src/v2/influence_service.js;src/v2/index_event_observation.js;src/v2/peer_validation_worker.js;scripts/analyze-influence-local.mjs;scripts/extract-official-pdf.swift;public/app.js;public/index.html;public/styles.css;test/influence_engine.test.js;test/influence_service.test.js;test/index_event_observation.test.js;test/candidate_ui.test.js;README.md;docs/KSTOCK_INFLUENCE_API.md;docs/KSTOCK_SIGNAL_FINANCIAL_REVIEW.md;docs/KSTOCK_QA_FOLLOWUP_REPORT.md;docs/AUTO_DEV_LOG.md;docs/uiux/signal-*.png. Git제외AI이력/근거/비공개FRED/공개예정시각·DB재감사자료추가. 다른기존미커밋변경보존.
BLOCKERS: 실제공개clock/종목·벤치마크쌍/회사주식수대사/DB9공식원인·원문보유변화 검증; AI해석내용/한국어품질 미검증. 테스트증가로 연구완료선언안함.
NEXT ACTION: 공식최초공개시각과사건별종목·벤치마크·기업행동 확보, 추가공식원문소규모분산검증, 금융SK1014/DB9해결 후10월8일PBR재평가. 모델한국어요약품질 보강·사건전추세/선택편향 평가.

이전 QA 기록은 아래 보존한다.

---

# K-STOCK AI INFLUENCE DEVELOPMENT REPORT — 2026-10-12

PROJECT: /Users/ari/ARI/projects/k-stock-ai
BRANCH: auto/kstock-development-20260930
COMMIT: ea406852610c00bef0dbe469de95c42fca662c30 (기준HEAD, commit/push 없음)
VERSION: package1.0.0 / server0.1.0 / Android2.6.5(265) / Influence API v1 / Financial Validator v18
BASELINE: Regression548 PASS 이번 재실행 확인 / Android기준3
TESTS PASS: 최종 Regression570 / 별도 Android Contract3
FAIL: 0 / SKIP: 0
OVERALL: PARTIAL

## 구현 및 실제 자료

AGENTS·공통 compliance·README·기존QA/로그·Agent 계약·Collection/Validation Worker·Scheduler·SEC/OpenDART/KIS 및 Web/Android 경로를 확인했다. 기존 브랜치/원격github.com/Naharuya/k-stock-ai.git/대규모 미커밋 변경을 보존했다. 운영 ari-prod-01 /srv/k-stock-ai/current /kstock.ai.kr, 다른 프로젝트는 변경하지 않았다. 사용자가 요청한4개 영역을 병렬 개발한 뒤 로컬에서 통합 검증했다.

INFLUENCE ENGINE:
People: 2명, 해당 발언일 기준 직책만 검증. 현재 직책/소속으로 확대하지 않음.
Verified Statements: 2건
Sources:
- [연준 파월 연설 2025-08-22](https://www.federalreserve.gov/newsevents/speech/powell20250822a.htm): 원문의 Chair Jerome H. Powell, 날짜와 주제 확인. 통화정책·정책체계 검토에 관한 역사적 연설.
- [버크셔 2024 주주서한](https://www.berkshirehathaway.com/letters/2024ltr.pdf#page=13): 원문의2025-02-22/워런버핏/Chairman of the Board 서명 확인. 기업 소유·자본 배분의 역사적 서한.

수집스크립트 직접 HTTP2회, 이후24시간 캐시 재실행0회. 별도 공식 원문 탐색 web 도구3호출(search2queries/open2/find3operations); 검색결과 전체를 데이터로 등록하지 않았다. 새로운 SEC/KIS/OpenDART/KRX/KIND 금융외부요청0회. 수집 시점2026-10-12 21:05:28 KST, Git제외 data/v2/influence/sources.json 0600. URL·본문SHA256·공식 원문 검토 방법·당시 역할·최소 요약/출처만 저장. 저작권 원문 전체나 무관한 개인 정보를 저장/노출하지 않았다. 현재 자료는 최신 신호 전체집합이 아닌 소규모 역사적 검증 대상군이다.

정확한 발언/공개 시각 미확인: spokenAt=null, spokenDate/statementDate는 확인된 날짜. 공개 이용 기준은 원문 날짜의 보수적 일말(Eastern offset)이며 실제 공개시각으로 단정하지 않는다. 버핏의 서한을 구두 발언으로 만들지 않는다. sourceIdentity/직책 기간/공개 cutoff/근거무결성이 맞아야 VERIFIED다.

AI 발언 분석: 어댑터 구현·고정 provider fixture 검증 완료. 실제 AI 생성0/NOT_RUN/modelVersion=null. 공급자 기본 미설정이면 호출0이며 외부 유료 AI를 실행하지 않았다. 향후 승인된 호출자는 구조화된 sentiment/산업/기업/정책/투자관련성/불확실성/반대근거/근거ID 및 모델버전·생성시각을 제공해야 한다. 출력은 AI_INFERENCE/UNVERIFIED_INTERPRETATION, 숨겨진의도NOT_ASSERTED, 인과주장false/HOLD다. 편집 요약을 AI 분석이나 원문으로 표시하지 않는다.

CAPITAL ENGINE:
Confirmed Transactions: 검증완료1건, SK하이닉스 회사의2026-08-19 보통주 자기주식처분82주(공시8월21일). 인물의 개인 거래가 아니다.
Holding Changes: 검증완료0건. 기존 Berkshire13F의2026-06-30 보유227,917,808주/공시8월14일을 검증대기 보고1건으로 표시. 증감·실제매수일 미산출, transactionDate=null.
Announced Intentions: 검증완료1건, SK2026-08-19 자기주식취득계획24,070,000주. 실제취득·처분날짜로 변환하지 않음.

추가 SEC Form4 기존 신고4건을 원문 재검증대기로 표시한다(기존Apple자료의초기5건표시상한:13F1+Form4 4). 원문SHA·실제거래검증이 이엔진에 연결되지 않았으므로 VERIFIED/신호로 승격하지 않는다. 신고자료 날짜 reportedTransactionDate와 확정거래일transactionDate=null를 구분한다. 회사/기관/내부자와 인물personId는 별도다. 13F는 INSTITUTION만 허용, 음수/비정상 보유수량·기관ID충돌/개인귀속을 차단한다. 기관/기업 행동을 개인발언과 결합하지 않는다. 기존 Apple/SEC원천·후보·추천보류를 보존했다.

SIGNAL ENGINE:
Statement Signals: 2
Capital Signals: 2(확인된회사처분1+발표된취득계획1, 유형 구분)
Combined Signals: 0, 연결 근거 없음

각신호는 공개이용가능시각·원천근거·actor·기업·위험상태·researchOnly/HOLD를 보존한다. 발언과자본관계가없으면 가짜결합을 만들지 않는다. 신호의 VERIFIED는 원천 입력 검증이며 예측력·인과관계·매수타당성 검증이 아니다. 표본선택/생존자편향은 NOT_ASSESSED로 남긴다.

MARKET REACTION:
Verified Periods: 0
Benchmark: 미연결, 해당 발언 기간의 적절한 해외/산업 지수와 가격 필요
Status: HOLD; 실제1/5/20거래일수익률 모두null

연구계산구조는 공식공개이후 공통 거래세션·확인된open/close·기업행동검증·날짜연속성과 결측을 검사한다. 첫관측종가를 기준으로 이후1/5/20세션을 비교하며 장마감후 공개는 다음세션을 사용한다. 미도래는PENDING, 미확인기업행동/날짜만공개/중간결측/중복은HOLD. 가격수익률/배당·비용미포함/비연율화/인과미확정을 명시한다. 현재원문의 정확한공개시각·역사가격·벤치마크·조정검증이 부족하여 수치와차트를 만들지 않았다.

## 금융 검증 병렬 결과

FINANCIAL VALIDATION:
SK Treasury Difference: 1,014주 미해결. 회사8월7일/8월21일 정확한본문·보관SHA 재확인. 확인된82주는자기주식처분이다.556/458 산술분해를가상거래로생성하지 않음. 개인주주 장내매수로회사자기주식차이를상쇄하지 않음.
DB Financial Differences: 9 /Resolved0 /Unresolved9. 원문400셀 재감사, source-discrepancy-audit-20261012T120008Z.json/apiReads0. 공식 개별원인 없음.
PBR Eligible Samples: 0. 6기업 PARTIAL3/BLOCKED3/FAILED0, PER/PBR/PSR/EV_EBITDA 모두0/기존최소3유지.

DB894,000주소각의6월30일기준점포함·중복차감차단과 법정자기736,215/전체보유1,054,464/교환미행사318,249 범위 구분은 유지. 국내3기업10월8일확정주식수·시총/PBRnull. 인물엔진을금융조건완화에사용하지않음. 상세 docs/KSTOCK_INFLUENCE_FINANCIAL_REVIEW.md, 전회 기준점QA 아래 보존.

## 실제 API·Worker·화면 확인

WORKERS:
Scheduler: 기존30분SAVED_EVIDENCE_ONLY 재사용, 새로운Worker/외부timer/daemon 없음. 현재실제ownerPID86274/활성, 다음예정2026-10-12 21:43:17 KST. 30분경과실행관측NOT RUN.
Collection: 명시적2공식URL 읽기·24시간캐시·timeout/크기제한/redirect차단. 새외부자동수집OFF, 인증변경없음. 기존Collection큐를중복생성하지 않음.
Validation: 같은tick의INFLUENCE_VALIDATION 논리작업 추가. 원천변경해시/검증시각·PARTIAL를기록, 실패원인은 sanitized상태로분리하고 금융작업정상동작유지. 동시tick중복실행차단. API조회도 저장자료만 재검증,동일자료changed=false/externalRequests0확인. 금융Worker UNCHANGED_SOURCE. KRX AUTH_BLOCKED/우회금지 유지.

UI/UX:
Web: PASS, 실제 GET /api/v2/influence/research. 인물2/발언2/확인거래1/계획1/SEC대기5/발언신호2/자본신호2/결합0/시장HOLD를확인. 인물선택·펼친근거·스크롤보존,연결실패/복구. 320/360/390/768/1024/1440×light/dark 12조합 및 글자200% 문서가로넘침없음. 이름·자연어제목과당시직책/선택됨표시,원천링크,신고자료와실제거래일 구분. 신규화면은카드형이라가로표가없다. 기존6기업/0PBR및금융API계약회귀유지.
Galaxy A33: PASS, SM-A336N/RFCW1178RRE 기존로컬검증앱/설치·사용자데이터보존,재설치없음. 새인물·신호메뉴,인물목록/버핏상세/서한·AI미실행/회사자본행동/기관13F보고기간·공시일·거래일null/원천/신호카드/1·5·20시장반응보류/연결실패·복구/앱재실행 직접확인.31초자동갱신전후동일선택문서·스크롤위치관측. 다른앱조작·캡처없음. 실기기OS200%와운영인증은NOT RUN.

캡처 Web docs/uiux/influence-{people,signals}-web.png. 실기기 /tmp/kstock-influence-a33-{people-final,buffett-detail,statement,capital,sec,signal-final,market-four,market-final,auto-before,auto-after,failure,restored,relaunch,shortcut}.png. 초기캡처의null문구/내부ID표시를발견해미확인·실제이름/제목으로수정했고 최종Web/실기기바로가기확인했다. 가로넘침없는카드구조로표시하며현재회차기존동종기업표의실기기가로스크롤 재검사는NOT RUN(전회확인과구분).

## 테스트·보존

TESTS:
- npm run test:offline: 시작548 /최종570 PASS /0 FAIL /0 SKIP
- node --test test/android_external.test.js: 3 PASS, 새인물API의인증조회허용·주문경로차단계약 포함
- 엔진15개,서비스3개,신규UI3개,공유Scheduler1개가추가22개. UI52개는전체570에포함되며별도합산하지않음
- node --check src/v2/influence_engine.js,src/v2/influence_service.js,src/server.js,src/v2/peer_validation_worker.js,public/app.js,scripts/collect-influence-official.mjs 및 git diff --check PASS
- test-offline은fixture/mock만, 실제 금융/모델 요청0. 원문확인은별도수동읽기. UI문구를공개이용기준으로명확화한중간계약1건불일치는expected의의미를유지해수정,최종전체0FAIL

로그 /tmp/kstock-influence-baseline.log, /tmp/kstock-influence-regression-final.log, /tmp/kstock-influence-android-final.log, /tmp/kstock-influence-web-final.log, /tmp/kstock-influence-server-final.log.
보존SHA: .env / latest보고서 /DB원문ZIP2 일치. 신규코드·UI·문서secretLiteralMatches0,개인연락처미수집,외부AI전송없음. 소스파일0600/Git제외. 계정·결제·운영개인정보·정책보유기간약속 변경없음. 운영/유료서비스/공개배포/인증변경 미수행.

RECOMMENDATION: HOLD, Apple순위포함
SAMSUNG PERFORMANCE: HOLD
LIVE TRADING: OFF,broker=false/live=false
REAL ORDER CALLS: 이번작업0 (읽기전용·오프라인/로컬화면검증만;과거계좌전체감사NOT RUN)

MODIFIED FILES: src/v2/influence_engine.js;src/v2/influence_service.js;scripts/collect-influence-official.mjs;src/server.js;src/v2/peer_validation_worker.js;public/app.js;public/index.html;public/styles.css;test/influence_engine.test.js;test/influence_service.test.js;test/candidate_ui.test.js;test/peer_validation_worker.test.js;android/test/NetworkContractTest.java;README.md;docs/KSTOCK_INFLUENCE_API.md;docs/KSTOCK_INFLUENCE_FINANCIAL_REVIEW.md;docs/KSTOCK_QA_FOLLOWUP_REPORT.md;docs/AUTO_DEV_LOG.md;docs/uiux/influence-*.png. Git제외 sources.json/최소금융검토/DB재감사 추가. 다른 기존미커밋변경은보존.
NOT RUN: 실제AI모델/생성내용검증,신규SEC원문재수집/13F차이및전체Form4검증,적절한과거시장가격/벤치마크·실제수익률,기관mandate-개인관계검증,전체기업행동·SK차이원인,DB9원인,30분경과스케줄실행,실기기OS200%,이번기존동종기업표실기기가로스크롤,운영인증·외부접속·배포.
BLOCKERS: 정확한공개시각/사건기간의가격과벤치마크·기업행동,SEC원문무결성연결,실제AI모델미실행,금융SK1014/DB9/전체효력·정정/주식수·PBR.
NEXT ACTION: SEC원문무결성·issuer/actor대사→기관보고/개인거래독립검증→공식공개시각·동일역사기간의벤치마크/기업행동→모델분석실행조건확인·반대근거검증→유효신호사후연구. 금융회사실제집행/정정근거검증은병렬유지.
OVERALL: PARTIAL — 구현/오프라인검증/공식자료/실기기확인을구분하며 테스트수만으로 투자연구완료를선언하지않음.

---

# K-STOCK AI VALIDATION REPORT — 2026-10-12 DB 기준점 포함 검증

PROJECT: /Users/ari/ARI/projects/k-stock-ai
BRANCH: auto/kstock-development-20260930
COMMIT: ea406852610c00bef0dbe469de95c42fca662c30 (기준 HEAD, commit/push 없음)
VERSION: package 1.0.0 / server 0.1.0 / Android 2.6.5(265) / Validation v18
BASELINE: 이번 시작 Regression 545 PASS 직접 재실행 확인 / Android 기준 3
CURRENT TESTS: Regression 548 PASS / Android Contract 3 PASS
PASS: 548 + 별도 Android 3
FAIL: 0, SKIP: 0
OVERALL: PARTIAL

## 이번 검증 결과

AGENTS.md·ARI_COMPLIANCE_STANDARD·기존 QA/개발 로그·Worker·주식수/PBR·API를 확인하고 기존 대규모 미커밋 변경을 보존했다. Git 원격은 github.com/Naharuya/k-stock-ai.git. 운영 ari-prod-01 /srv/k-stock-ai/current 및 kstock.ai.kr은 변경하지 않았다. 이번에는 기존 공식 원문만 재사용했으며 금융 외부 요청은 0회다. 이전 회차의 신규 수집 3회를 이번 수집으로 집계하지 않는다. KIS 가격·OpenDART 원문·KIND 증자 근거·Apple/SEC 보존. KRX AUTH_BLOCKED 유지, 인증 우회 없음.

DB CANCELLATION:
Quantity: 보통주 894,000주
Effective Date: 2025-09-30, 보고서 실제 이익소각 기록
Included in June Baseline: VERIFIED, true
Verification: 2026-06-30 반기 원문의 자기주식 소각현황에 2025.09.30 / 이익소각 / 보통주 / 894,000 명시. 발행주식 44,398,588 − 894,000 = 43,504,588주 일치. 기준점 이전 소각을 7월1일~10월8일에 다시 차감하지 않는다. 변경등기일/별도 법적 효력일은 NOT VERIFIED이며 생성하지 않았다.
Evidence: [2026 반기보고서 20260814003091](https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260814003091), [최초 사업보고서 20260316001250](https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260316001250), [정정 20260601001661](https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260601001661), [소각 결정 20250915800392](https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20250915800392). 보관 ZIP SHA 확인, 정확한 접수번호 본문 XML 사용. 반기 근거 availableAt은 2026-08-14 일말 KST로 보수적으로 처리하며 그 이전 분석에 소급 적용하지 않는다.

새로 확인한 자기주식 범위: 반기 전체 보유량 1,054,464주에는 교환청구 미행사 318,249주가 포함된다. 1,054,464 − 318,249 = 법정 공시 자기주식 736,215주이며 기존 API 수치와 일치한다. 직접 736,175 + 기타 40 = 736,215주. 반기 보유량 표의 기초 1,036,991 + 취득 318,289 − 처분 300,816 = 1,054,464도 일치한다. 미행사 교환 물량을 신규 발행 또는 기간 내 실제 취득으로 만들어 적용하지 않는다. 전체 보유·법정 공시 범위를 화면과 API에서 구분했다. 우선주 112,579/자기 10,621주는 별도 유지한다.

## SK 자기주식 및 국내 3기업

SK HYNIX:
Treasury Difference: 1,014주 미해결
Cause: 회사 자기주식 실제 집행·기간 귀속·보유 범위·정정 관계를 설명하는 공식 원인 미확정
Reconciliation: PARTIAL, 10월8일 발행/자기/유통 주식수 null

기존 공식 회사 자료를 다시 연결하여 6월30일 자기 1,626,865주, 8월7일 직접 1,626,236 + 기타 73 = 1,626,309주, 8월21일 법정 보유 1,625,769주를 대조했다. 확정된 8월19일 처분 82주만 반영하면 1,626,783주로 잔여 1,014주가 남는다. 556/458 산술 분해는 거래 증거가 아니며 가상 처분으로 생성하지 않는다. 이전 개인 장내매수 보고서는 회사 자기주식 처분 증거로 적용하지 않는다. 5월13일 옵션 지급 처분 계획 114,209주와 8월19일 취득 계획 24,070,000주의 실제 집행일별 누계가 여전히 필요하다. 계획 종료일·결정일을 실제 효력일로 사용하지 않는다.

7월15일 발행 17,790,000주는 기존 검증된 증자 체인을 유지한다. 납입 7월14일·실제 발행 7월15일·상장 7월29일을 구분하고 중복 가산하지 않는다. 2월9일 소각 15,300,000주도 기준점 이전이므로 재차 차감하지 않는다. 730,492,365주 중간 참고치는 10월8일 확정 수량이 아니다.

DOMESTIC PEERS / OCTOBER 8 SHARE COUNT:

| 기업 | 6월30일 보통주 발행 관측 | 법정 자기주식 관측 | 10월8일 확정 발행수 | 상태 |
| --- | ---: | ---: | --- | --- |
| SK하이닉스 | 712,702,365 | 1,626,865 | null | PARTIAL, 1,014주·전수 행위·정정 관계 대기 |
| DB하이텍 | 43,504,588 | 736,215 | null | INSUFFICIENT_DATA, 소각 기준점 포함만 개별 VERIFIED |
| 한미반도체 | 95,312,200 | 459,198 | null | INSUFFICIENT_DATA, 전체 효력/정정 관계 대기 |

6월30일 이전 공시 목록 1,031건(SK737/DB174/한미120), 기간 내 목록 90건(SK57/DB14/한미19)을 보존했다. 실제 API의 disclosureReview.total은 기간 내 목록 수이며, 원문 검증 필요 후보 115개(SK77/DB25/한미13)는 기간 내 관련 후보와 기준점 이전 후보를 합한 수다. 두 수를 혼동하지 않는다. 제목 분류·ZIP 보관·개별 원문 판정·전체 기업행동 커버리지를 따로 유지한다. 이번 기준점 포함 확인이 전수 완료를 의미하지 않는다.

## 시가총액·PBR·DB 재무 차이

MARKET CAP:
October 8 Prices: 기존 실제 KIS 종가 SK 1,681,000원 / DB 138,800원 / 한미 267,000원
Calculated: null
Official: null
Verification: MARKET_CAP_UNVERIFIED

평가일 주식수·종류별 가격과 효력 커버리지가 부족하다. 이전 기준점 발행수, 자기주식 차감 유통수, 의결권수를 임의로 종가와 곱하지 않는다. DB 우선주 가격도 별도 필요하다.

PBR:
Book Value: 기존 2026-06-30 연결 지배기업 소유주지분 관측 SK 262,380,610,000,000원 / DB 2,393,709,284,799원 / 한미 746,888,948,978원. 공시 8월14일, 정정·범위·사업 적합성 검증 대기. 증자 이후 장부가치 추정 없음.
Eligible Samples: 6기업 재판정 PER 0 / PBR 0 / PSR 0 / EV/EBITDA 0
최소 비교 표본 3기업 정책 유지. 단일 소각 확인으로 PBR을 활성화하지 않았다.

DB FINANCIAL:
Differences: 9
Resolved: 0
Unresolved: 9
Evidence: 기존 8표·200항목의 최초/정정 원문 400셀, 좌표·값·SHA 재감사. 이번 생성 source-discrepancy-audit-20261012T114833Z.json, apiReads=0, causeStatus=BLOCKED_NO_OFFICIAL_EXPLANATION. 단위·기간·연결/별도·합계 잔차·정정 전후 항목은 기존 API 표로 표시한다. 일반적인 통화단위 정정 문구는 잔차 9건의 공식 설명으로 승격하지 않았다. 소각 기준점 해결과 재무 차이 해결은 별개다.

## Worker·Web·Galaxy A33

WORKERS:
Collection: 기존 MANUAL_READ_ONLY_COMPLETED, 이번 신규 금융 외부 요청 0
Validation: v18, 변경 근거 재검증 6기업 PARTIAL3/BLOCKED3/FAILED0. 추가 동일 입력 실행 UNCHANGED_SOURCE, 외부 요청 0
Scheduler: 기존 30분 SAVED_EVIDENCE_ONLY 유지, 로컬 ownerPID 83101. API 관측 다음 실행 2026-10-12 21:17:39 KST; worker.running=false는 대기 상태다. 실제 30분 경과 실행 관측은 NOT RUN
External Auto Collection: OFF, KRX AUTH_BLOCKED 유지

원문 무결성·공개 시점·종류·수량·기준점 수량·자기주식 범위를 검사하는 baselineInclusion 계약 추가. 완전 검증된 기준점 포함 소각에만 ALREADY_INCLUDED_IN_BASELINE / applied=false를 적용한다. 미래/범위/종류 충돌은 차단하고, 개별 포함 확인은 valuationShareCountEligible=false로 유지한다. 기존 Collection Worker를 중복 생성하지 않았다.

WEB UI: PASS, 실제 로컬 API. DB 실제 소각일·기준점 포함·1,054,464/318,249/736,215 범위·공식 링크4개·평가 HOLD 일치. SK1,014주·국내3기업·DB9건·6기업0표본·삼성 TTM/HOLD 확인. 자동 갱신 선택 기업/평가배수/접힌 근거/가로 스크롤 보존. 320/360/390/768/1024/1440 폭 light/dark 12조합 및 글자200% 문서 오버플로 없음. Web 캡처 docs/uiux/baseline-inclusion-*.png.
GALAXY A33: PASS, SM-A336N/RFCW1178RRE, 기존 ai.kstock.mobile.localvalidation 앱/사용자 데이터 보존, 재설치 없음. DB 소각 기준점 및 자기주식 범위의 실제 텍스트·원천 링크, SK1,014주, 한미 기준점/HOLD, DB-FX01~09 표, 가로 스크롤, USB 로컬 연결 실패/복구, 앱 재실행을 이번 직접 확인. 캡처 /tmp/kstock-inclusion-a33-{db,scope,sk,hanmi,db-nine,horizontal,failure,restored,relaunch}.png. 다른 앱 조작/캡처 없음. 운영 인증·페어링 검증과는 구분한다.

TEST COMMANDS:
- npm run test:offline: 기준 545 → 최종 548 PASS / 0 FAIL / 0 SKIP
- node --test test/android_external.test.js: 3 PASS / 0 FAIL
- python3 scripts/audit-db-correction-source.py: 원문400셀/차이9, apiReads0
- node scripts/run-peer-validation-worker.mjs: 변경근거 재검증 및 동일근거 스킵 확인
- node --check src/v2/cancellation_evidence.js; node --check src/v2/peer_share_bridge.js; git diff --check: PASS

추가 회귀3개는 기준점 포함/자기범위, 범위·종류·미래자료 차단, 기준점 이전 검증 소각의 재차 차감 방지다. 기존 Web 계약에 범위 표시·HOLD 확인을 추가했다. 테스트는 fixture/mock/offline, Java 계약은 로컬 HTTP fixture만 사용한다. 로그 /tmp/kstock-baseline-inclusion-start.log, /tmp/kstock-inclusion-regression-final.log, /tmp/kstock-inclusion-android-contract.log, /tmp/kstock-inclusion-web.log, /tmp/kstock-inclusion-idempotency.log.

RECOMMENDATION: HOLD, Apple 순위 포함
SAMSUNG PERFORMANCE: HOLD
LIVE TRADING: OFF, broker=false / live=false
REAL ORDER CALLS: 이번 작업 0 (오프라인·로컬 읽기/화면 검증만; 과거 계좌 전체 주문 감사 NOT RUN)
보존: .env / latest 분석 보고서 / DB 공식 원문2ZIP SHA 일치. 비밀값 출력·인증정보 변경 없음. 다른 프로젝트·운영·유료서비스·공개 배포 변경 없음.

MODIFIED FILES: src/v2/cancellation_evidence.js; src/v2/peer_share_bridge.js; src/v2/peer_validation_worker.js; scripts/build-db-cancellation.py; scripts/build-db-cancellation-review.mjs; scripts/build-peer-share-bridge.py; public/app.js; test/cancellation_evidence.test.js; test/candidate_ui.test.js; docs/KSTOCK_PEER_WORKER_API.md; docs/KSTOCK_QA_FOLLOWUP_REPORT.md; docs/AUTO_DEV_LOG.md; docs/uiux/baseline-inclusion-*.png. Git 제외 data/v2/verification/ 에 원문 입력·포함 판정·bridge·새 재감사 저장, 0600 유지.
NOT RUN: 변경등기일/법적효력, 전체115 후보 효력·정정 전수 검증, 공식10월8일주식수/시총, 새 금융외부수집, 30분 경과 자동실행 관측, 실기기 OS200%, 운영인증/외부접속, 과거계좌주문 감사.
BLOCKERS: SK1,014주 회사 실제집행/범위 근거, 반기 정정 관계와 전수 효력, DB교환/우선주 가격·범위, 사업 적합성, DB재무9 공식 원인, KRX인증.
NEXT ACTION: SK옵션 지급·자기주식 실제 집행 누계의 회사 공시 원문 우선 → 잔여 원문 정정/효력 검증 → 국내3 평가일 주식수 확정 → 종류별 시총 → PBR 독립 재판정. DB 소각 포함 판정과 법정/전체 보유 범위 구분은 유지한다.
OVERALL: PARTIAL

---

# K-STOCK AI CORPORATE ACTION REPORT — 2026-10-12

PROJECT: /Users/ari/ARI/projects/k-stock-ai
BRANCH: auto/kstock-development-20260930
COMMIT: ea406852610c00bef0dbe469de95c42fca662c30 (기준HEAD, commit/push없음)
VERSION: package1.0.0 / Android2.6.5(265) / Validation v17
BASELINE: 이번 시작539 PASS 재실행 확인, Android기준3.
CURRENT TESTS: Regression545 PASS /0 FAIL /0 SKIP; Android Contract3 PASS /0 FAIL.
OVERALL: PARTIAL

## 실제 이번 확보·검증

AGENTS/compliance/Git원격·브랜치·커밋·기존변경/QA·로그·원문·Worker·PBR·API 확인. 운영 ari-prod-01 /srv/k-stock-ai/current 및kstock.ai.kr 미변경. 현재 로컬127.0.0.1:3000만재시작. 다른프로젝트/사용자데이터 보존.
기존1031목록·기간내90·반기3·SK증자6공식문서·DB재무원문2ZIP 재사용. 신규 외부 읽기는 OpenDART document.xml3회(SK소유보고서20260716000582/20260731000082/20260821000615)만 수행. 보관 data/v2/verification/peer-share-originals-1791804710054/manifest.json. KIS/KRX/KIND/SEC신규외부0. 개인식별정보를 검증API/화면에 포함하지 않음.

SK HYNIX:
Treasury Difference: 1,014주, 미해결.
Cause: 실제 거래 누락/보유범위/정정의 공식 원인 미확정.6월30일 COMMON발행712,702,365/Treasury1,626,865 유지. 기존2월9일15,300,000주소각을중복차감하지않음.
Verified Transactions: 기존7월15일신주17,790,000주·8월19일자기처분82주만 적용.7월29일상장중복반영안함.
8월7일 공시 직접1,626,236+기타73=1,626,309주는 원문관측.6월30일대비raw556 및 이후82주를뺀8월21일대비잔여458은 산술분해만 저장(arithmeticOnly=true), 거래일/실제집행/동일법정보유범위 검증과별도.556/458을가짜거래로만들지않음.
소유변동3원문에 개인장내매수 기록 확인; 회사자기주식처분/이전근거로 적용안함. 제목상 임원소유보고서를NOT_RELEVANT로 제외하던 정책을POTENTIAL_IMPACT/원문검증대상으로 수정, 제목분류는효력검증아님.
Reconciliation: PARTIAL;10월8일발행/자기/유통null.

DB HITEK:
Cancellation: COMMON894,000주.
Effective Date: **2025-09-30, 사업보고서가 명시한 실제 이익소각일 VERIFIED**. 변경등기일/등기법적효력은NOT_VERIFIED, 추정안함.
Evidence: 결정20250915800392 예정9월30일 →최초사업보고서20260316001250 →정정20260601001661. 원문 본문 두곳에서 '(2025.09.30, 894,000주 이익소각)' 일치. 최초연결주석EPS에서도 '2025년9월30일에 보통주894,000주를 이익소각하였습니다' 확인. ZIP는기존numeric-audit.sourceArchiveHashes와SHA일치. 정정본문최초제출2026-03-16일관계확인.
Verification: 개별소각실제일/종류/수량/감소후발행43,504,588주 일치. 44,398,588−894,000=43,504,588. 기준점이전사건으로6월30일이후다시차감안함. 최초/정정전체근거이용가능일2026-06-01일말;2025년분석에소급반영금지. 소각일확인이10월8일전체주식수승격을의미하지않음.
교환사채납입125,567,640,000원은신규주식발행아님;개별교환/자기이전의실제일·수량은별도필요.

DOMESTIC PEERS:
기업행동원문큐115개(SK77/DB25/한미13); 기존98에서소유보고서를원문대상에추가. 이전공시1031목록·현재90코호트 숫자는증가시키지않음. 원문ZIP무결성과개별행동/전수커버리지구분.
June30원문관측: SK위수량;DB보통43,504,588/자기736,215·우선112,579/자기10,621;한미보통95,312,200/자기459,198.
October8 Share Count: 국내3모두null. SK PARTIAL/DB·한미INSUFFICIENT_DATA. 반기정정관계/기간이전후실제변동전수는미검증. 자기주식취득·처분을발행주식증감으로처리안함.

MARKET CAP:
October8 Price: 기존실제KIS종가SK1,681,000원/DB138,800원/한미267,000원재사용.
Calculated: null. Official: null. Verification: MARKET_CAP_UNVERIFIED.
검증된평가일발행주식수·종류별가격부족. 의결권수/자기차감유통수/이전기준잔고를평가일발행수로결합안함.
PBR Book Value: 기존June30CFS소유주지분관측SK262,380,610,000,000원/DB2,393,709,284,799원/한미746,888,948,978원보존. 정정/범위/사업적합성미검증. 임의증자후장부가치추정없음.
Eligible Samples: PER0/PBR0/PSR0/EV_EBITDA0, 최소3기업정책유지.

DB FINANCIAL:
Differences9 /Resolved0 /Unresolved9.
기존8표200항목의최초·정정원문400셀을이번오프라인재감사. source-discrepancy-audit-20261012T113209Z.json, apiReads0,좌표/원문값/SHA일치·차이9재확인. 원인BLOCKED_NO_OFFICIAL_EXPLANATION. 소각일해결은금융표9개차이의해결과별도이며generic통화단위정정으로합계잔차를해결처리하지않음.

## 구현·화면·회귀

WORKERS Collection: 기존MANUAL_READ_ONLY_COMPLETED/외부자동OFF.
Validation: v17,6기업PARTIAL3/BLOCKED3/FAILED0,30분SAVED_EVIDENCE_ONLY실제활성ownerPID81397. 관측다음실행2026-10-12 21:03:37 KST. 동일자료UNCHANGED_SOURCE재실행/외부0. KRXLOGOUT→AUTH_BLOCKED정책·무한재시도/인증우회금지유지.
새소각검증기는실제완료기록의날짜/수량/주식종류/정정관계·원문무결성·공시순서·cutoff를확인. 예정/계획기록은통과불가, 등기일생성안함. 큐메타데이터가미래반기/정정의이용가능일을통해과거결정에유출되지않도록보완.
WEB UI: 실제API에서DB894,000주소각일2025-09-30·3공식링크·변경등기일미확인·10월8일/PBR보류확인. SK1,014주/원문추가검토·기존발행/상장3날짜·DB9표·3기업·선택/접힘/스크롤보존·320~1440/light-dark/200%글자확인.
GALAXY A33: 기존SM-A336N/RFCW1178RRE ai.kstock.mobile.localvalidation 보존,설치변경없음. DB실제소각일·등기미확인·보류와SK1,014주·개인장내매수미적용실기기확인.국내3기업·DB-FX01~09표·가로스크롤·USB연결실패/복구·앱재실행도이번직접확인. /tmp/kstock-action-a33-*.png, Web docs/uiux/action-review-*.png. 원문및화면에가짜fixture를실제자료로사용하지않음.
테스트: npm run test:offline539기준→최종545 PASS; node --test test/android_external.test.js3 PASS; node --check public/app.js,src/v2/cancellation_evidence.js,src/v2/peer_disclosure_queue.js 각실행; python3 -m py_compile scripts/build-db-cancellation.py scripts/build-peer-share-bridge.py; git diff --check PASS.
새6:소각실제기록/등록미추정,예정·수량·실제일충돌,미래정정/관계/issuer/무결성,소유보고서큐보존,검토근거availableAt미래유출차단,Web소각일·등록·평가보류계약. 자동검증은fixture/mock오프라인,실제주문/금융외부요청없음.
로그: /tmp/kstock-action-baseline.log; /tmp/kstock-action-regression-final.log; /tmp/kstock-action-android.log; /tmp/kstock-action-browser.log; /tmp/kstock-action-server.log.

RECOMMENDATION: HOLD, Apple순위포함.
SAMSUNG PERFORMANCE: HOLD.
LIVE TRADING: OFF, broker=false/live=false.
REAL ORDER CALLS: 이번작업0 (읽기3회·오프라인/로컬검증만,계좌전체과거주문조회NOT RUN).
.env/latest보고서/DB공식원문2ZIP보존SHA모두일치, Apple/SEC근거미변경. 다른프로젝트·운영·유료서비스·공개배포·인증변경없음.

MODIFIED FILES: src/v2/cancellation_evidence.js; test/cancellation_evidence.test.js; scripts/build-db-cancellation.py; scripts/build-db-cancellation-review.mjs; scripts/retrieve-peer-share-originals.mjs; scripts/build-peer-share-bridge.py; src/v2/peer_disclosure_queue.js; src/v2/peer_validation_worker.js; public/app.js; test/peer_disclosure_queue.test.js; test/candidate_ui.test.js; docs/uiux/action-review-*.png; 이보고서; docs/AUTO_DEV_LOG.md; docs/KSTOCK_PEER_WORKER_API.md.
NOT RUN: DB변경등기일/법적효력일,전체115원문전수효력·정정검증,2025이전장기계획범위,공식10월8일주식수·시가총액,30분경과자동실행관측,실기기OS200%,운영인증/외부접속.
BLOCKERS: SK1,014주누락집행/보유범위원인,전수행동·반기정정관계,DB우선가격·장부범위,사업적합성,DB재무9공식원인,KRX인증.
NEXT ACTION: SK옵션지급/교환/취득의회사실제일별내역→남은소유·정정원문과회사자기주식대사→국내3기간내발행/소각/전환원문→평가일주식수/시총/PBR재평가. DB소각완료기록확인은기준점이전사건으로유지.
OVERALL: PARTIAL

---

# K-STOCK AI SHARE RECONCILIATION REPORT — 후속 원문 검증 / 2026-10-12

PROJECT: /Users/ari/ARI/projects/k-stock-ai
BRANCH: auto/kstock-development-20260930
COMMIT: ea406852610c00bef0dbe469de95c42fca662c30 (기준 HEAD, commit/push 없음)
VERSION: package1.0.0 / Android2.6.5(265) / Validation v15
BASELINE: 지시서532 PASS; 실제 시작 코드537 PASS 재확인.
CURRENT TESTS: Regression539 PASS /0 FAIL /0 SKIP; Android Contract3 PASS /0 FAIL.
OVERALL: PARTIAL

## 이번 확보 자료와 판정

기존1031개 공시 목록·기간 내90개·SK 증자 원문6개·국내3기업 반기/API 자료 재사용. 전체 원문 재수집 없음. 신규 읽기 요청은 OpenDART document.xml 3회만 실행, 캐시/SHA 대조 및1150ms 간격·타임아웃·재시도 제한 유지. KIS/KRX/KIND/SEC 신규 외부 호출0.
보존 위치: data/v2/verification/peer-share-originals-1791802735408/manifest.json 및3ZIP(mode0600). sourceDocumentId와SHA로 원문 검증 메타데이터를 큐에 연결; 제목 분류와 효력/기간 검증은 별도.

- SK20260128800616: COMMON15,300,000주 소각 결정, 예정2026-02-09, 소각 전728,002,365주. 기존20260814003509 반기 원문에 실제2026.02.09 소각 기록 및 소각 후712,702,365주가 있어 수량/날짜 연결 확인. 기준점 이전 사건으로7~10월에 다시 차감하지 않음. 향후 전체 정정·기간 커버리지 검증과는 구분.
- DB20250915800392: COMMON894,000주 소각 결정, 예정2025-09-30, 소각 전44,398,588주. 반기 원문 누적 감소894,000주 및43,504,588주와 수량식 일치. 실제 날짜 증거는 미완료이므로 effectiveDate=null; 예정일을 실제일로 승격하지 않음. 기준점 후 다시 차감하지 않음.
- DB20250923800355: 교환사채125,567,640,000원 납입2025-09-23. 원문 실제발행주식수 '-'는 수량미확인이며0이라고 확정하지 않음. 채권 납입을 모회사 신규 주식 발행으로 더하지 않음.
- 한미 기존20250519800046 소각계획과 반기20260814003665 재사용. 새 실제효력 근거 미확보;10월8일 확정 잔고 생성 안 함.

SK HYNIX:
June30 Shares: COMMON712,702,365주 /Treasury1,626,865주 (반기 원문과 API 일치, 정정 관계 대기).
New Shares: +17,790,000 COMMON, 실제 Issue2026-07-15 /Listing2026-07-29 /Payment2026-07-14. 기존 KIND공식근거20260724000273 공개7월24일 유지. 상장일에 다시 더하지 않음.
Other Events: 실제8월19일 자기82주 처분만 기존대로 반영. 소각·취득/장기처분 계획을 실제수량으로 합산하지 않음.
기존8월7일 원문20260807000537을 추가 분석: 처분 전 직접1,626,236주 +기타73주=보고된 구성 합1,626,309주.6월30일/8월21일과 보유 범위·집행기간 동질성 미검증. 차이556/458을 실제 거래 수량이나 날짜로 생성하지 않음.
기존 부분 대사 후 자기1,626,783주와8월21일 법정잔고1,625,769주 차이1,014주 유지. 공식 범위/누락거래/정정의 원인 미해결.
October8 Shares: null.
Reconciliation: PARTIAL. 기준점 정정·전체 이벤트 커버리지 미확인.

DOMESTIC PEERS:
DB000990 June30COMMON43,504,588/Treasury736,215;PREFERRED112,579/Treasury10,621. October8null/INSUFFICIENT_DATA.
한미042700 June30COMMON95,312,200/Treasury459,198. October8null/INSUFFICIENT_DATA.
SK/한미 우선주 API 결측은 임의0 또는 원문 숫자대조완료로 표시하지 않음. DB10월1일 의결권 주식수는10월8일 모든 종류 발행수로 이월하지 않음.

MARKET CAP:
October8 Price: 기존 KIS 관측 SK1,681,000원/DB138,800원/한미267,000원 재사용.
Calculated: null. Official: null. Verification: MARKET_CAP_UNVERIFIED.
PBR Book Value: 기존June30CFS 소유주지분 SK262,380,610,000,000원 /DB2,393,709,284,799원 /한미746,888,948,978원 관측 보존. 정정/사업성격/클래스·증자 후 기준 미검증, 임의pro forma 계산 없음.
Eligible Samples: PER0/PBR0/PSR0/EV_EBITDA0, 최소3기업 기준 유지.
DB HITEK: Differences9 /Resolved0 /Unresolved9. 기존 원문8표200항목과SHA 보존; 이번 소각/채권 원문은9개 재무 차이 공식 원인 설명이 아니므로 해결로 처리하지 않음.

## API·Worker·UI 및 테스트

WORKERS: 기존Collection MANUAL_READ_ONLY_COMPLETED/외부 자동수집OFF. Validation v15·6기업 PARTIAL3/BLOCKED3/FAILED0. Scheduler SAVED_EVIDENCE_ONLY30분 실제 활성 ownerPID78535, 관측 다음 실행2026-10-12T11:31:30.496Z. 동일 입력 재실행UNCHANGED_SOURCE/외부요청0. 새Worker/운영설정 생성 없음.
큐 원문 metadata: companyCode/documentId/eventType/announcementDate/effectiveDate/shareClass/quantity/correctionStatus/originalReviewStatus. source SHA가 맞아야 검토 메타데이터 연결. 정정 공시 접수일을 최초 announcementDate로 오인하지 않아 미확인일null. 메타데이터 일치만으로 stateVERIFIED/eligibleForValuation로 승격하지 않음. KRXLOGOUT 인증 차단·우회 금지 유지.
WEB UI: 실제 API로 SK소각/8월7일잔고·DB소각/교환사채·PBR보류 표시 확인. 기존3날짜/6공식링크·DB9표/국내3기업·반응형320~1440/light-dark/200%글자·선택/접힘/스크롤 보존 확인.
GALAXY A33: 기존 SM-A336N/RFCW1178RRE ai.kstock.mobile.localvalidation, 재설치/데이터삭제 없음. 실제 SK소각15,300,000·8월7일합1,626,309·차이1,014·DB894,000/채권입금과보류 확인. 한미 비교 목록·자료 부족, DB-FX01~09 정정 표, 표 가로 스크롤, 연결 실패/복구 및 앱 재실행도 이번에 직접 확인. /tmp/kstock-prior-a33-*.png는 개인상태표시줄 때문에Git에 넣지 않음.
테스트 명령: npm run test:offline; node --test test/android_external.test.js; node --check public/app.js src/v2/peer_disclosure_queue.js (각각 실행); python3 -m py_compile scripts/build-peer-share-bridge.py; git diff --check.
새 단위2개: 원문검토 metadata SHA결합/불일치 차단/평가미승격, 최초발표일과정정관계 분리. 전체539/Android3 실제PASS. 모두fixture/mock/offline, 실제 외부 호출은 별도3회 수집만.
로그: /tmp/kstock-followup-baseline.log; /tmp/kstock-prior-regression-final.log; /tmp/kstock-prior-android.log; /tmp/kstock-prior-browser.log; /tmp/kstock-prior-server.log.

RECOMMENDATION: HOLD (Apple 순위 포함).
SAMSUNG PERFORMANCE: HOLD.
LIVE TRADING: OFF, broker=false/live=false 유지.
REAL ORDER CALLS: 이번 작업0, 실제주문/취소/계좌조작 수행 안 함; 전체 과거계좌 주문조회NOT RUN.
기존 .env/latest report/DB원문2ZIP 보존SHA일치. Apple/SEC 및 다른 프로젝트/운영서버/유료서비스/인증정보 변경 없음.

MODIFIED FILES: scripts/retrieve-peer-share-originals.mjs; scripts/build-peer-share-bridge.py; src/v2/peer_disclosure_queue.js; src/v2/peer_validation_worker.js; public/app.js; test/peer_disclosure_queue.test.js; docs/uiux/prior-review-*.png; 이 보고서; docs/AUTO_DEV_LOG.md; docs/KSTOCK_PEER_WORKER_API.md.
NOT RUN: 전체98큐 실제효력 전수검증/반기 정정연결 전수/2025년이전 장기계획/공식10월8일 주식수·시가총액/DB9개 공식 원인/30분 경과후 자동실행/기기OS200%/운영 인증·외부접속.
BLOCKERS: 전체 이벤트 누락 여부, SK잔고 범위 및1,014주 실제변동 설명, 기준점 정정 관계, DB우선주 가격·장부가치 범위, 사업 적합성, KRX인증.
NEXT ACTION: SK주식매수선택권 지급/교환/취득의 실제수량·날짜 원문 확인 → 국내3반기 정정관계 대조 → 기간내 발행·소각·전환 큐 → 검증된10월8일 클래스별시총/PBR 재평가. 불완전자료로값 생성 금지.
OVERALL: PARTIAL

---

# K-STOCK AI SHARE RECONCILIATION REPORT — 2026-10-12

PROJECT: /Users/ari/ARI/projects/k-stock-ai
BRANCH: auto/kstock-development-20260930
COMMIT: ea406852610c00bef0dbe469de95c42fca662c30 (기준 HEAD, commit/push 없음)
VERSION: package1.0.0 / Android2.6.5(265) / Validation v13
OVERALL: PARTIAL

## 이번 작업 실제 검증

BASELINE: 현재 시작 코드로 Regression532 PASS 재확인.
CURRENT TESTS: Regression537 PASS /0 FAIL /0 SKIP; Android Contract3 PASS /0 FAIL.
명령: npm run test:offline; node --test test/android_external.test.js; node --check public/app.js; node --check src/v2/peer_share_bridge.js; python3 -m py_compile scripts/build-peer-share-bridge.py; git diff --check.
새 검증5: 중간일 체크포인트 대사, 발행주식만 보고한 자료의 범위, 미래/타 주식종류 차단, 미검증 관측 차이의 확정값 승격 방지, 화면의 원문 일치/우선주 결측/잔고 차이/평가일 보류 구분.
Android 최초 제한 환경 실행은 로컬 fixture HTTP 서버 bind 권한으로 실패. 로컬 네트워크 권한으로 재실행하여 최종3 PASS; 금융 외부 요청 없음.
로그: /tmp/kstock-share-baseline.log, /tmp/kstock-share-regression-final.log, /tmp/kstock-share-android-final.log, /tmp/kstock-share-browser-final.log, /tmp/kstock-share-server-final.log.

## 공식 자료 수집과 원문 대조

기존 공시 목록1031건 및 기간 내90건·SK 증자체인6개 공식 문서를 재사용. 목록 전수 원문 재수집 없음.
이번 직접 외부 읽기: OpenDART document.xml 정확히2회, SK20260814003509와 DB20260814003091 반기 원문 ZIP 확보. 한미20260814003665 원문 재사용. KIS/KRX/KIND/SEC 신규 외부 호출0. 비밀값·원문 개인정보 출력 없음.
보관: data/v2/verification/peer-share-originals-1791802194610/manifest.json, ZIP0600·SHA 확인. 원문/API 주식 종류별 수치 및6월30일 기준일 일치. 반기 원문 대조는 정정 관계/전체 기업행동 완료와 별도.

| 기업 | 6월30일 보통주 발행 | 보통주 자기 | 우선주 발행/자기 | 10월8일 |
| --- | ---: | ---: | --- | --- |
| SK하이닉스000660 | 712,702,365 | 1,626,865 | API 숫자 결측, 임의0 처리 안 함 | PARTIAL, 확정값null |
| DB하이텍000990 | 43,504,588 | 736,215 | 112,579 /10,621 | INSUFFICIENT_DATA, null |
| 한미반도체042700 | 95,312,200 | 459,198 | API 숫자 결측, 임의0 처리 안 함 | INSUFFICIENT_DATA, null |

발행주식 기준은 누적 발행 Ⅱ가 아닌 감소 후 발행주식 Ⅳ=Ⅱ−Ⅲ. 자기주식은 별도, 유통주식으로 시가총액 계산 안 함. SK 반기 원문의2026.02.09 소각은 이미 기준점에 포함되므로7~10월 다시 차감하지 않음. DB 반기 원문의2025.09.23 자기주식2,220,000주 교환사채 처분 간주도 신규 발행으로 처리하지 않음. 원문 수치 확인은 주식수/장부가치 정정 관계 확인을 대신하지 않음.

SK HYNIX:
June30 Shares: COMMON712,702,365, Treasury1,626,865, 원문과 API 일치·정정 관계 대기.
New Shares: +17,790,000 COMMON.
Issue Date: 2026-07-15.
Listing Date: 2026-07-29 (추가 발행으로 중복 반영 안 함).
Payment: 2026-07-14; KIND 근거 공개2026-07-24, 당일 시각 미확인 일말 정책 유지.
Official source: https://kind.krx.co.kr/external/2026/07/24/000133/20260724000273/68154.htm
Other Events: 실제8월19일 자기주식 처분82주; 취득·소각·장기처분 계획은 실제효력 미확인으로 미반영.
반영된 개별 이벤트만의 중간 대조: 발행730,492,365주, 자기1,626,783주. 8월21일 원문 자기1,625,769주와 차이1,014주. 이는 불완전 입력의 참고 차이이며 전체 원천자료 오류나 최종 잔고로 확정하지 않음.
October8 Shares: null.
Reconciliation: PARTIAL. 실제효력 전수 범위·정정 관계 미확인.

## 시가총액·PBR·DB 차이

MARKET CAP: 기존10월8일 실제 종가 재사용 SK1,681,000원 / DB138,800원 / 한미267,000원. 신규 가격 수집 없음. 검증된10월8일 주식수 및 클래스별 가격 부족이므로 Calculated/Official 모두null, MARKET_CAP_UNVERIFIED. 과거 자기주식 체크포인트·의결권 주식수를 평가일 전체 발행주식으로 이월 안 함.
PBR: 기존6기업 PER/PBR/PSR/EV_EBITDA 유효 표본 모두0. 최소3기업 정책 유지.
기존6월30일 CFS 지배기업 소유주지분 관측: SK262,380,610,000,000원 / DB2,393,709,284,799원 / 한미746,888,948,978원. 정정/주식종류/사업성격/증자 후 비교 정합성 미검증. 증자대금을 임의로 더한 장부가치 생성 안 함.
DB HITEK Differences9 /Resolved0 /Unresolved9. 기존8표200항목 원문 감사와 정정 원문 SHA 보존. 공식 차이 원인 새 근거 미확보, generic 단위 정정으로9개를 해결 처리 안 함. 과거 분석 시점에 소급 적용 안 함.

## Worker·API·화면

Collection: 기존 Worker 재사용, MANUAL_READ_ONLY_COMPLETED, 외부 자동 수집OFF.
Validation: v13,6기업 PARTIAL3/BLOCKED3/FAILED0. 30분 SAVED_EVIDENCE_ONLY Scheduler 실제 ownerPID77467. 다음 예정2026-10-12T11:24:05.756Z (관측 당시). 동일 자료2회 실행 UNCHANGED_SOURCE, 외부 요청0. 새 Worker 중복 생성 없음.
주식 종류와 공개일을 검사하는 중간 체크포인트 대사 추가. 확정 검증과 원문 관측을 구분, 관측 차이는 참고 표시만 하고 PBR 승격 금지. KRX 인증 차단·기존 API 제한/백오프 정책 유지.
Web: 실제 API 기반 국내3기업 원문 일치, SK 납입/발행/상장3날짜·공식 링크6개, 보류 값, DB 차이9개 확인.6폭320~1440·light/dark·200%글자 문서 넘침 없음. 기업/배수/상세 펼침/가로 스크롤 선택 보존 확인.
긴 원문 큐 앞에 주식수 요약을 배치해 기준점→미확인 변동→최종 보류→공식 원문 순서로 표시. 미확인 우선주를 원문 수치 대조 완료로 표시하지 않음.
Galaxy A33: SM-A336N/RFCW1178RRE, 기존 ai.kstock.mobile.localvalidation 유지. Web 동일 API로 SK발행 날짜, SK/DB 주식수·PBR보류, DB-FX01~09 표, 국내3기업, 가로 스크롤, USB 연결 실패/복구와 own-app 재실행 확인. 설치 변경 없음, 앱 데이터 보존.
실기기 근거 /tmp/kstock-share-a33-*.png (상태 표시줄 때문에 Git에 넣지 않음). Web 캡처 docs/uiux/reconciliation-*.png. 실제 앱 확인과 fixture 계약 테스트 구분.

## 안전·미완료

RECOMMENDATION: HOLD (Apple 순위 포함).
SAMSUNG PERFORMANCE: HOLD.
LIVE TRADING: OFF. KSTOCK_BROKER_ENABLED=false, KSTOCK_LIVE_TRADING_ENABLED=false 유지.
REAL ORDER CALLS: 이번 작업0 (금융 읽기 document.xml 2회·로컬 검증만 수행; 계좌 전체 과거 주문조회는 미실행).
.env/기존 latest report/DB원문2ZIP 보존 snapshot SHA 모두일치. Apple/SEC 근거 미변경. 운영서버/외부공개/결제/다른프로젝트/인증정보 변경 없음.

MODIFIED FILES: src/v2/peer_share_bridge.js; src/v2/peer_validation_worker.js; scripts/build-peer-share-bridge.py; scripts/retrieve-peer-share-originals.mjs; public/app.js; test/peer_share_bridge.test.js; test/candidate_ui.test.js; docs/uiux/reconciliation-*.png; 이 보고서; docs/AUTO_DEV_LOG.md. 기존 미커밋 변경 보존.
NOT RUN: 원문 큐98건 전체 실제효력 검증,6월30일 반기 정정 관계 전수확인,2025년 이전 장기계획 범위,공식10월8일 주식수/시가총액 실확정, DB9개 공식 원인 해결, 30분 전체 경과 후 자동 실행 관측, 실기기 OS 글자200%, 운영 인증/외부 접속.
BLOCKERS: 전체 기업행동 누락 여부·반기 정정 관계 미검증; SK 자기주식 차이1,014주 미설명; DB 우선주 가격/장부가치 범위; 사업 적합성; DB9 차이 원인; KRX 인증.
NEXT ACTION: SK 잔여 자기주식 처분/교환/실제취득 원문으로1,014주 대사 → 기업별 반기 정정 연결 확인 → 기간 내 실제 발행·소각·전환 원문 우선 큐 처리 → 검증된 클래스별10월8일 주식수·시가총액·PBR 재평가. 저장근거 자동 재검증만 활성 상태, 외부 수집 자동 실행 약속 안 함.
OVERALL: PARTIAL. 테스트 증가와 원문 수치 일치만으로 전체 완료 표시 안 함.

---

# K-STOCK AI ACTUAL ISSUANCE & PBR REPORT — 2026-10-12

PROJECT: /Users/ari/ARI/projects/k-stock-ai
BRANCH: auto/kstock-development-20260930
COMMIT: ea406852610c00bef0dbe469de95c42fca662c30 (기준 HEAD; commit/push 없음)
VERSION: package1.0.0 / server0.1.0 / Android2.6.5(265) / Validation v12
CHECKED AT: 2026-10-12T10:28:02.105389+00:00
PRE-FLIGHT: AGENTS/ARI compliance/Git remote·branch·commit·기존 변경/QA·로그·Collector·Validator·PBR·Web/Android 계약 확인. 기존 미커밋 변경 및 사용자 데이터 보존, 운영환경·다른 프로젝트 미변경.

BASELINE: 이번 시작 코드 Regression524 PASS, 현재 코드로 다시 실행.
CURRENT TESTS: Regression532 PASS /0 FAIL /0 SKIP; Android Contract3 PASS /0 FAIL.
명령: npm run test:offline; node --test test/android_external.test.js; node --check public/app.js; node --check src/v2/peer_issuance_chain.js; node --check scripts/complete-peer-prior-pages.mjs; python3 -m py_compile scripts/build-sk-issuance-chain.py scripts/build-peer-share-bridge.py; git diff --check.
신규8: 실제발행체인5(실제일/예정일·단위/관계·미래공시·중복 상장·누락커버리지), 국내KIND 범위1, Web발행일/공식링크1, 최신체인검증실패시캐시VERIFIED철회1. Android native contract에 세 날짜/원문 chain 응답 추가. 테스트는 fixture/mock/tempdir로만 실행, 외부 금융 요청·주문 없음.
로그: /tmp/kstock-effective-baseline.log, /tmp/kstock-effective-regression-final.log, /tmp/kstock-effective-android-final.log, /tmp/kstock-effective-browser-final.log, /tmp/kstock-effective-server-final.log.

SK HYNIX ISSUANCE CHAIN: VERIFIED (단일 증자의 실제 발행 효력 검증)
Stock: 000660 / COMMON / 17,790,000주 / 발행+17,790,000 / 자기 변동0
- INITIAL: 20260624000420 / 2026-06-24 최초 유상증자 결정
- CORRECTION: 20260706000403 / 2026-07-06, 20260710000008 / 2026-07-10. 두 원문 최초제출일2026-06-24와 최초 공식 공시를 대조해 연결.
- PAYMENT RESULT: 20260715000004 / 2026-07-15 증권발행 실적. 납입기일2026-07-14.
- ISSUANCE RESULT: 20260715800045 / 2026-07-15. 실제 보통주17,790,000주, 실제납입2026-07-14.
- KRX LISTING: 공식 공지 접수20260724000133 / 원문문서20260724000273 / 공개2026-07-24. 본문③발행일2026년07월15일 / ⑥상장일2026년07월29일 / ①기명식보통주17,790,000주 / 단축코드A000660.
공식원문: https://kind.krx.co.kr/external/2026/07/24/000133/20260724000273/68154.htm

PAYMENT DATE: 2026-07-14
ACTUAL SHARE EFFECTIVE DATE: 2026-07-15 (법률/예정일 추정이 아닌 거래소 원문 발행일)
DOMESTIC LISTING DATE: 2026-07-29 (거래소 추가상장 공지)
ANNOUNCEMENT DATE: 2026-06-24
CHAIN AVAILABLE AT: 2026-07-24T23:59:59+09:00 (당일 공개시각 미확인, 보수적 일말 정책). 7월24일 원문을 7월16일 분석에 소급 적용하지 않음.
단일 eventId=000660:20260624000420:COMMON으로 7월15일만 증분 반영. 7월29일 상장이나 두 실적공시를 별도 증자로 더하지 않음. 예정 취득·소각·처분은 미반영.
증자대금의 장부가치 영향을 임의 pro forma로 보정하지 않음.

EXPANDED PRIOR DISCLOSURES:
기존 2026-07-01~10-08 목록90건 재수집0, 기존4월2일~6월30일 목록100건 재사용.
국내3기업 모두 조회 시작을 2025-01-01로 확장. 90일 이하의6구간+기존구간 사이4월1일 공백 보완. SK총189/293건의 누락2·3페이지를 보완, 회사코드/종목코드/날짜/페이지총수/원문SHA 대조.
2025-01-01~2026-06-30 고유 공시목록1031건(SK737/DB174/한미120), 모든조회구간 목록페이지 확인. OpenDART013은 공식 '조회자료없음'으로 빈 페이지만 인정하며 기업행동 부재/경제적 커버리지 완료로 처리하지 않음.
기간이전 기업행동 후보 원문큐40건(SK23/DB13/한미4); 기존기간58건을 합해 검증큐98건(SK64/DB23/한미11). 제목상 후보/미분류는 실제효력 검증과 분리. 2025년 이전 장기계획 및 모든후속정정·집행의 전수조사는 미완료이므로 coverage.verified=false 유지.

| 기업 | 이전 목록 | 이전 후보 큐 | ZIP무결성 | 증자체인 역할 원문 대조 | 10월8일 대사 |
|---|---:|---:|---:|---:|---|
| 000660 에스케이하이닉스(주) | 737 | 23 | 13 | 5 | PARTIAL |
| 000990 주식회사 DB하이텍 | 174 | 13 | 3 | 0 | INSUFFICIENT_DATA |
| 042700 한미반도체(주) | 120 | 4 | 3 | 0 | INSUFFICIENT_DATA |

원문 대조5는 동일 SK증자 체인의 DART역할5개(최초·정정2·결과2)에 대한 상호 대조 수이며, 목록1031건 전수 검증이나 서로 다른 기업행동5건을 의미하지 않음. KIND상장 원문1개를 합쳐 공식 연결6개. ZIP원문19건+KIND HTML1건 보존. 기존 Apple/SEC 원천 미변경.

NEW PRIOR ORIGINAL REVIEW:
- SK20260330001812: 보통주9,007주 자기주식처분 계획, 예정기간3월30일 하루. 계획 검토 완료, 실제 집행·정정은 별도 확인; 이후 기간에 적용하지 않음.
- DB20260120000357: 보통주300,816주 처분 계획, 예정1월21일~30일. 실제수량/효력으로 승격하지 않음.
- 한미20250519800046: 보통주1,302,059주 소각결정, 예정2025-05-29. 실제효력·변경여부 미확인; 2026년기간에 중복소각 적용하지 않음.
각 기업의 priorOriginalReviews에 계획종료·수량·실제효력null·applied=false·공식출처를 저장. SK기존20260513000549 계획이2027년까지 이어지는 사실도 유지, 실제집행자료 필요.

OFFICIAL READ OPERATIONS:
정상 직접금융/API읽기31회 = OpenDART확장목록18+4월1일3+누락페이지3+기업별원문3=27, KIND공개목록1+viewer/원문3=4. 기존90건/기존원문 재수집0.
보조 공식 웹자료 조회6회(tool호출 기준, 내부 HTTP수 미측정): 공식IR·법령·KIND·OpenDART가이드 참고. 법률로 실제발행일을 추정하지 않음. SEC/KIS 직접 API신규0. KRX data AUTH_BLOCKED 유지, 공개KIND 경로만 사용하며 인증우회/세션재사용 없음. 조회만하는 KIND POST 검색은 주문과 무관.
API 호출마다 private manifest에 checkedAt/범위/sourceUrl/SHA 보존, 비밀값 미출력.
주요 보존자료:
- peer-expanded-prior-1791799736858.json: 확장6구간/18호출
- peer-expanded-prior-1791799808035.json: 4월1일/3호출
- peer-prior-pages-1791799893379.json: 누락3페이지/3호출
- sk-listing-search-1791799807387.json/html: 공식 추가상장 목록/1호출
- sk-issuance-listing-1791799827787/manifest.json: 원문문서20260724000273/SHA/3호출
- sk-issuance-chain-input.json, sk-issuance-chain-review.json: offline6개 공식체인 검증
- peer-share-originals-1791800058817/manifest.json: 국내3기업 신규원문3
- peer-share-bridge-review.json: 모든기간/계획/실제행동/chain 저장
개인정보·담당자 정보가 포함된 원문은 private 아카이브에만 보존; Web/Android 응답에는 코드·제목·수량·기간·공식출처만 전달, 원문HTML/연락처 미전달.

OCTOBER8 SHARE REEVALUATION:
실제 SK증자7월15일 +17,790,000주와 자기처분8월19일 -82주만 반영한 부분 대사:
- 보통주 발행712702365+17790000=730492365 (8월19일 공식중간관측과일치)
- 자기1626865-82=1626783 (전체잔고아님; 8월21일 공식중간관측1625769와1014주 차이, 누락 실제거래 자료 필요)
이 중간 산술값을 10월8일의 확정값으로 제공하지 않음. 최종 issuedShares/treasuryShares/outstandingShares/difference 모두null 유지. SK PARTIAL / DB·한미 INSUFFICIENT_DATA. 기준점 자체·전체행동커버리지·종류별범위·정정·최종잔고 검증 대기.
기존 DB10월1일 의결권43504588(공개10월7일)도 전체 발행수/평가일잔고로 사용하지 않음. DB 자기주식 교환441990주는 새발행으로 더하지 않음.

MARKET CAP / PBR:
Oct8 기존KIS종가 SK1681000 / DB138800 / 한미267000 KRW 재사용.
검증된 평가일 발행주식수·우선주범위·전체기업행동 부족으로 자체시총null, 공식 동일일시총미확보, MARKET_CAP_UNVERIFIED.
장부가치 기존6월30일CFS소유주지분 SK262380610000000 / DB2393709284799 / 한미746888948978 KRW, 공개8월14일. 증자후시총과증자전장부가치의 정의·기간·정정·사업적합성 검증을 임의로 생략하지 않음.
PER Eligible0 / PBR Eligible0 / PSR Eligible0 / EV/EBITDA Eligible0. 최초표본 미확보, 최소3 정책 유지. 허용조건을 완화하거나추정시총/PBR 생성하지 않음.
DB CORRECTION: 기존9차이 재평가 Resolved0 / Unresolved9, 공식개별원인미확보. 원본20260316001250/정정20260601001661 ZIP SHA 보존, 이번원문은 차이9건 원인을해결하지않음.

WORKERS:
기존Collection/Validation 재사용. 분류v12·chain·변경된회사입력hash로 처리, 대상6/PARTIAL3/BLOCKED3/FAILED0. 불변 근거 재실행 외부0. 기존30분 SAVED_EVIDENCE_ONLY 스케줄 활성, 실제프로세스 기반 nextRunAt 표시. 새Worker/운영스케줄 없음. 외부자동수집OFF.
큐 VERIFIED는 현재 공식체인·아카이브hash·공개시점에 의해 판정; 최신체인이PARTIAL로 바뀌면 과거VERIFIED 캐시를 철회. 원문보존만으로VERIFIED하지 않음. 기간이전목록 페이지확인과효력확인을 별도상태로표시.

WEB UI: PASS
실제API로 SK납입7/14·발행7/15·상장7/29·공식6링크·이전737목록·실제기업행동2·평가일최종수량null 확인. 기간/단위/공개시각미확인표시. 선택기업/배수/PBR필터/스크롤150→150/상세접힘유지,6폭320~1440×라이트/다크 및200%폰트, 삼성실제TTM/보류회귀 PASS. 원문HTML미전달.
증거 docs/uiux/effective-issuance-chain-web.png 및 effective-*-web.png.

GALAXY A33: 실제 화면 PASS (확인 범위 한정)
RFCW1178RRE 기존Android2.6.5앱/사용자데이터 보존, 재설치없음. 첫입력은다른전경상태라guard로차단됨; 승인된K-Stock 자체앱실행후 전경확인으로안전하게계속함. 다른앱화면수집/조작없음.
SK보통주수량·세날짜·공개시점·공식6개연결스크롤확인. DB174/한미120목록·2025-01-01조회시작·완료와경제적효력별도·시총/PBR자료부족표시확인. Web과동일API계약. 증거 effective-galaxy-sk-chain.png, -sk-sources.png, -db-prior.png, -hanmi-prior.png.
이번버전모바일자동새로고침선택/스크롤보존, 모든98큐행·원문링크전수·기기OS글자확대·30분실시간대기·연결장애반복검증은NOT RUN. 직전작업실기기결과를이번PASS로재사용하지않음.

RECOMMENDATION: HOLD (삼성·Apple순위)
SAMSUNG PERFORMANCE: HOLD
LIVE TRADING: OFF (broker/live=false)
REAL ORDER CALLS: 이번작업0건(목록/원문읽기, 로컬mock/CDP/ADB/저장근거평가 경로만). 실제계좌전체이력 조회/주장없음.
SECURITY: .env/기존latest report/DB원본ZIP2개 SHA 보존 확인, 비밀값미출력. Git추가/commit/push/외부공개배포없음. 운영서버·API인증·타프로젝트미변경.

MODIFIED FILES (이번작업): src/v2/peer_issuance_chain.js; src/v2/kind_rights.js; src/v2/peer_disclosure_queue.js; src/v2/peer_validation_worker.js; scripts/collect-peer-expanded-prior.mjs; scripts/complete-peer-prior-pages.mjs; scripts/build-sk-issuance-chain.py; scripts/build-peer-share-bridge.py; scripts/retrieve-peer-share-originals.mjs; public/app.js; test/peer_issuance_chain.test.js; test/kind_rights.test.js; test/peer_disclosure_queue.test.js; test/candidate_ui.test.js; test/peer_worker_android_contract.test.js; docs/KSTOCK_PEER_WORKER_API.md; docs/KSTOCK_QA_FOLLOWUP_REPORT.md; docs/AUTO_DEV_LOG.md; docs/uiux/effective-*.
기존그외미커밋변경보존. Private data/v2원천·상태는기존Git제외정책유지.
NOT RUN: 운영/외부공개/유료/API변경/실주문, 실제계좌이력, 2025년이전전체장기계획, 나머지98큐의전체원문·정정·집행연속성, 모바일위상세범위.
BLOCKERS: SK전체자기거래연속성과10월8일최종잔고·발행/자기/종류별정합성, DB/한미기간이전후속실효·정정, 공식동일일시총·우선주범위, 장부가치정의/기준기간/사업적합성, DB개별차이9건, KRX AUTH_BLOCKED.
NEXT ACTION: SK기간이전 장기처분계획114209주의집행및8월취득진행분과1014주미대사이유를공식거래/잔고로확인; DB·한미과거소각/처분/교환의결과·정정연결. 검증후10월8일최종대사→시총→PBR 재평가, 추천/성과HOLD유지.
OVERALL: PARTIAL

---

# K-STOCK AI DISCLOSURE & PBR REPORT — 2026-10-12

PROJECT: /Users/ari/ARI/projects/k-stock-ai
BRANCH: auto/kstock-development-20260930
COMMIT: ea406852610c00bef0dbe469de95c42fca662c30 (기준 HEAD; commit/push 없음)
VERSION: package1.0.0 / server0.1.0 / Android2.6.5(265) / saved validation schema1, classifier v10
CHECKED AT: 2026-10-12T10:05:37.606133+00:00
PRE-FLIGHT: AGENTS/ARI compliance/기존 QA·개발로그·Collection/Validation/PBR/API/앱 구조 확인. 기존 사용자 미커밋 변경 보존. 운영환경·다른 프로젝트 미변경.

BASELINE: 현재 시작 코드 Regression515 PASS, 인수인계 수치와 별도로 실제 재실행.
CURRENT TESTS: Regression524 PASS /0 FAIL /0 SKIP; Android Contract3 PASS /0 FAIL.
명령: npm run test:offline; node --test test/android_external.test.js; node --check public/app.js; node --check src/v2/peer_validation_worker.js; node --check scripts/retrieve-peer-share-originals.mjs; python3 -m py_compile scripts/build-peer-share-bridge.py; git diff --check.
신규9: 분류/관계/미래/중복/원문·효력 구분/재시작/기간이전 큐7, Worker 저장·API1, UI 단계1. Native 계약에 disclosureReview payload 추가. 모든 자동 테스트 mock/fixture/tempdir, 주문·외부 금융 요청 없음.
로그: /tmp/kstock-disclosure-baseline.log, /tmp/kstock-disclosure-regression-final.log, /tmp/kstock-disclosure-android-current.log, /tmp/kstock-disclosure-browser-final.log.

DISCLOSURES:
Total: 기존 기간 2026-07-01~10-08 목록90건 보존, 재수집0.
Classified: 90건 모두 여섯 상태로 자동 분류; 제목으로 유형 식별61건 / UNCLASSIFIED29건. 미분류도 원문 큐에 포함. 제목상 NOT_RELEVANT32건은 기업행동 부재 증명이 아님.
Relevant: 기존90건 중 원문 검증 대상58건(미분류29건 포함).
Prior Announcements: 별도 2026-04-02~06-30 목록100건(SK57/DB24/한미19), 영향가능 원문 큐5건 추가. 이전100건을 기존90건 수치에 합산하지 않음. 4월 이전 결정의 기간내 효과는 아직 조사 미완료.
Original Documents Verified: 공식 ZIP16건 SHA 무결성 재검증(기존8+신규8). 전체 정정관계·효력 원문 검증 완료0건. 파일 확보를 효력 검증 완료로 표시하지 않음.
Corporate Actions Verified: 실제 SK 자기주식 처분1건(8월19일 보통주82주); 전체기간 연속성·10월8일 잔고 검증 완료 아님. 타임라인 관측/계획7건 중 나머지 효력·기간·종류 확인 보류.

| 기업 | 기존 목록 | 유형 식별 | 원문 대상 | 기간이전 목록 | 원문 무결성 | 실제행동 검증 |
|---|---:|---:|---:|---:|---:|---:|
| 000660 에스케이하이닉스(주) | 57 | 34 | 41 | 57 | 12 | 1 |
| 000990 주식회사 DB하이텍 | 14 | 12 | 10 | 24 | 2 | 0 |
| 042700 한미반도체(주) | 19 | 15 | 7 | 19 | 2 | 0 |

OFFICIAL DATA:
OpenDART 신규 정상 읽기11회 = 이전기간 목록3 + 원문8. 최초 sandbox에서 원문3회 네트워크 시도 실패, 승인된 네트워크 실행으로 정상 확보; 실패 manifest도 보존. KIS/KRX/KIND/SEC/IR 신규 요청0. KRX AUTH_BLOCKED 유지. API key 변경·비공식 세션·인증 우회 없음.
목록 출처: OpenDART list.json, 원문 document.xml. 각 manifest에 collectedAt/sourceUrl/SHA 기록. 공개 가이드 https://opendart.fss.or.kr/guide/main.do?apiGrpCd=DS001.
추가 원문:
- 20260706000403 정정증자: 최초제출2026-06-24. 기존20260710000008과 최초20260624000420 연결; 제목 유사도로 추정하지 않고 정정원문 최초제출일과 공식 이전목록/최초원문 대조.
- 20260715800045 결과: 보통주 실제17,790,000주 / 납입7월14일 / 결정6월24일. 예정 상장7월29일을 실제 효력일로 승격하지 않음.
- 20260819000254 취득계획24,070,000주 / 8월20일~11월19일. 실제 취득으로 차감하지 않음.
- 20260624000420 최초증자 보통주17,790,000주 / 이전발행712,702,365주.
- 20260422000633 계획12,536주 / 결과20260507000542 실제5월4일12,536주: 6월30일 이전 효과이므로 이후 대사에 중복 적용하지 않음.
- 20260513000549 자기주식처분 예정114,209주 / 5월20일~2027년3월30일: 기간 이전 결정의 이후 효과 조사 필요 확인.
- 20260511800809 DB 자기주식 교환사채 행사 누계441,990주: 발행 증가로 처리하지 않음. 세부 거래일/누계 기간은 미확인.
새 manifest 폴더: peer-share-originals-1791798833791, -1791798920767, -1791798952627, -1791799012357. 실패 시도 -1791798807206, 호출0 재실행 -1791799286384. 이전 목록 기록 peer-share-bridge-collection-1791798841313.json. 기존8개 원문 폴더·Apple/SEC 원천 보존.

SHARE COUNT:
June30 공식 원천(발행/자기, 주): SK COMMON712702365/1626865; DB COMMON43504588/736215, PREFERRED112579/10621, TOTAL43617167/746836; 한미 COMMON95312200/459198.
October8: 국내3기업 모두 null. reconciliationStatus는 SK PARTIAL(단일 실제 처분 확인), DB/한미 INSUFFICIENT_DATA. 중간 관측730492365(SK8월19일), 자기1625769(SK8월21일), DB의결권43504588(10월1일·공개10월7일)을 평가일 값으로 이월하지 않음.
Verified Movement: SK8월19일 자기-82주, 발행 변화0. 정정/중복/효력/전체 유형 커버리지 부족으로 최종 수량 미생성. 예정 취득·소각·처분은 실제 수량으로 적용하지 않음.

MARKET CAP:
Price Date: 2026-10-08, 기존 KIS 원천 재사용. SK1681000 / DB138800 / 한미267000 KRW.
Calculated: null. Official: 동일 기준일 공식 시총 미확보. Verification: MARKET_CAP_UNVERIFIED.
보통주 가격×전체 주식수 또는 유통수량을 시총으로 대체하지 않음. DB우선주 가격/범위 추가 확인 필요.

PBR:
Book Value: 기존 CFS 지배기업 소유주지분6월30일 원천, 공개8월14일; SK262380610000000 / DB2393709284799 / 한미746888948978 KRW. 금액 관측과 정의·정정·자본범위 검증 구분 유지.
PBR: null. Eligible Samples: 0. PER0 / PSR0 / EV/EBITDA0. 표본 최소3 정책 유지, 1개라도 중앙값·추천 자동 활성화하지 않음.

DB HITEK:
Differences: 9 / Resolved: 0 / Unresolved: 9.
기존8표200항목의 변경 전후 값·단위·연결/별도·기간·합계 잔차를 Worker reviewCorrectionDifferences로 재평가. 원본20260316001250 / 정정20260601001661 ZIP SHA 일치. 일반 정정사유만으로 개별 잔차 원인을 확정하지 않음. 이번 신규교환권 원문은 9개 차이의 공식 원인 설명을 제공하지 않음. 과거 시점에 미래 정정값 소급 적용 없음.

WORKERS:
Collection: 기존 Worker 재사용, 수동 읽기 종료 MANUAL_READ_ONLY_COMPLETED, 외부자동 enabled=false.
Validation: 국내3+글로벌3 처리, PARTIAL3/BLOCKED3/FAILED0, 변경 기업별 hash 재평가. 불변 입력 재실행 UNCHANGED_SOURCE, 외부 요청0.
Scheduler: 기존30분 SAVED_EVIDENCE_ONLY 활성, 실제 PID 기반 상태와 nextRunAt 제공. 새 에이전트·운영 스케줄 생성 없음.
Queue: 우선순위·공식 정정관계·미래 차단·중복/충돌·SHA 보존·기간이전 공시 포함. 각 tasks는 읽기 검증 대기이며 실행 중인 것처럼 표시하지 않음.
Original reader: --queue/--prior 수동 최대3건, 보존 manifest SHA 캐시, 실패 백오프·최대3회 제한; 인증 오류 무한 재시도 없음. 기존 API gate/cache/rate/backoff 유지.
External Auto Collection: OFF. 다음 자동 작업은 저장된 근거 재검증.

WEB UI:
실제 로컬 API와 공시5단계·원문 큐·주식수/시총/PBR HOLD 연결 PASS. 실제DB14건/기간이전교환권 큐 확인. 자동 갱신에서 기업/배수/PBR 선택/가로 스크롤150→150/상세 접힘 유지 PASS. 320~1440px 6폭×light/dark, 200%글자 확대 PASS. 삼성 실제 상세 TTM/보류 회귀 확인. 증거 docs/uiux/disclosure-*-web.png.

GALAXY A33:
RFCW1178RRE 기존2.6.5앱·데이터 보존, 재설치 없음. USB 로컬API 연결, 국내3기업의 공시 수/기간이전 수/원문 상태/주식수·시총·PBR 보류 표시 PASS. 한미 원문 큐의 실제 가로 스크롤 전후 확인 PASS. 연결 실패/복구/자기 앱 재실행 PASS. 조작·스크린샷 전 K-Stock 전경 확인. 증거 docs/uiux/disclosure-galaxy-*.png.
실기기 전체 긴 타임라인·모든 원문 링크·DB9건 테이블의 이번 버전 전수 대조, OS글자확대, 실제30분 자동갱신 상태보존은 NOT RUN. 이전 실기기 검증을 이번 PASS로 재사용하지 않음.

RECOMMENDATION: HOLD (삼성전자 및 Apple 순위 유지)
SAMSUNG PERFORMANCE: HOLD
LIVE TRADING: OFF; KSTOCK_BROKER_ENABLED=false, KSTOCK_LIVE_TRADING_ENABLED=false, 로컬 /health false 확인.
REAL ORDER CALLS: 이번 실행 경로0건(작업은 목록/원문GET·로컬 mock/CDP/ADB·저장파일 평가만). 계좌의 전체 주문 이력은 조회하지 않았으며 주장하지 않음.
SECURITY: .env/latest report/DB원본2ZIP 기존 SHA 보존 확인. 비밀값 로그/화면 출력 없음, 원문 개인정보는 API에 전달하지 않음.

MODIFIED FILES (이번 작업): src/v2/peer_disclosure_queue.js; src/v2/peer_validation_worker.js; src/v2/peer_share_bridge.js; scripts/build-peer-share-bridge.py; scripts/retrieve-peer-share-originals.mjs; scripts/collect-peer-prior-announcements.mjs; public/app.js; test/peer_disclosure_queue.test.js; test/peer_validation_worker.test.js; test/candidate_ui.test.js; test/peer_worker_android_contract.test.js; docs/KSTOCK_PEER_WORKER_API.md; docs/KSTOCK_QA_FOLLOWUP_REPORT.md; docs/AUTO_DEV_LOG.md; docs/uiux/disclosure-*.
데이터/Worker 상태는 기존 Git 제외 private data/v2 아래 저장. 나머지 기존 미커밋 변경은 사용자/이전 작업이며 이번 수정으로 간주하지 않음.

NOT RUN: 운영배포/외부공개/유료/API인증변경/실주문, 실제 계좌이력, KRX재인증, 외부 자동 원문 수집, 4월 이전 전체공시, 나머지 원문 전수검증, 모바일 상세 전수/30분 자동새로고침.
BLOCKERS: 실제취득·처분 연속거래/10월8일 잔고·발행/자기/종류별 coverage 부족, 실제발행 효력일·정정체인 전체 확인 필요, 공식 동일일 시총/우선주 범위 부족, 자본정의·기업행동 및 사업 적합성 미완료, DB9건 개별원인 미확보, KRX AUTH_BLOCKED.
NEXT ACTION: SK5월~다음해 처분계획의 실제이행과8월 취득 진행분 원천, DB교환권 세부일자·주식종류, 한미 반기 이후 본사주식수 영향 원문을 우선검토; 별도 원문큐의 미분류29건을 공식 원문으로 판정. 새 공식 자료 확보 후 해당 기업만 대사→시총→PBR 재검증, 조건 완화 금지.
OVERALL: PARTIAL

---

# K-STOCK AI SHARE COUNT & PBR REPORT — 2026-10-12

PROJECT: /Users/ari/ARI/projects/k-stock-ai
BRANCH: auto/kstock-development-20260930
COMMIT: ea406852610c00bef0dbe469de95c42fca662c30 (기준 HEAD; 새 commit/push 없음)
VERSION: package1.0.0 / server0.1.0 / Android2.6.5(265), 기존 앱 보존
PRE-FLIGHT: AGENTS/ARI compliance/README/QA/개발로그/Worker/PBR/API 확인. 기존 미커밋 변경 보존. 운영 ari-prod-01 /srv/k-stock-ai/current /kstock.ai.kr 미변경. 다른 프로젝트 미변경.

BASELINE: 이번 시작 코드에서 Regression507 PASS. Android3은 로컬 mock 바인딩 권한이 필요해 별도 재실행.
CURRENT TESTS: Regression515 PASS /0 FAIL /0 SKIP; Android Contract3 PASS /0 FAIL
명령: npm run test:offline; node --test test/android_external.test.js; node --check public/app.js; node --check src/v2/peer_validation_worker.js; git diff --check.
추가8: 주식수 대사6 + Worker 날짜/보류 API1 + Web 기준일/의결권범위1. 기존 native bridge 계약을 shareBridge payload로 확대. 자동 테스트는 fixture/mock/tempdir, 외부 조회·주문 없음.
로그: /tmp/kstock-share-baseline.log, /tmp/kstock-share-regression-final.log, /tmp/kstock-share-android.log, /tmp/kstock-share-browser.log.

OFFICIAL DATA COLLECTION:
기존 승인된 OpenDART 읽기만 수동 총11회(목록3 + 최초원문6 + 추가원문2), 2026-10-12 확인. SEC/KIS/KRX 신규 요청0. KRX AUTH_BLOCKED 유지, 인증 우회 없음. 검색1회(공식 개발가이드), 기존 원문과 금융/가격 아카이브 보존.
공시 원문 API 사용 근거: https://opendart.fss.or.kr/guide/main.do?apiGrpCd=DS001
- 누락 Jul1~Aug13 목록: peer-share-bridge-collection-1791795773200.json
- 신규 원문6건: peer-share-originals-1791795830709/manifest.json, 모두 ZIP/SHA 확인
- 추가 원문2건: peer-share-originals-1791796141339/manifest.json, 모두 ZIP/SHA 확인
- 기존 Aug14~Oct8 목록과 결합한 검토: data/v2/verification/peer-share-bridge-review.json
원천 collectedAt과 SHA를 각 manifest에 기록. 제목과 특정 원문 검토는 전체 기업행동 적용효력 검증 완료를 의미하지 않는다. 개인정보/담당자 연락처는 API/화면의 대사 payload에 포함하지 않음.

DOMESTIC PEERS:

Company: SK하이닉스 / Stock Code: 000660
June30 Share Count (공식 보고 원천, 단위주):
- COMMON: 발행 712702365 / 자기 1626865 / 기준일 2026-06-30 / 공시 20260814003509
- PREFERRED: 발행 None / 자기 None / 기준일 2026-06-30 / 공시 20260814003509
- TOTAL: 발행 712702365 / 자기 1626865 / 기준일 2026-06-30 / 공시 20260814003509
Corporate Actions: Jul1~Oct8 공시목록 57건, 두 구간 total_page/total_count/행수 대조 완료. 효과·종류·발행/자기주식 대사 별도.
October8 Share Count: null / SHARE_COUNT_UNVERIFIED
Verification: SHARE_COUNT_UNVERIFIED
October8 Price: 1,681,000 KRW (기존 KIS 동일일 원천 재사용)
Book Value: 262,380,610,000,000 KRW / CFS / ifrs-full_EquityAttributableToOwnersOfParent / 2026-06-30 / availableAt 2026-08-14T23:59:59+09:00 / 원천계정 관측, 정의 검증 별도

Company: DB하이텍 / Stock Code: 000990
June30 Share Count (공식 보고 원천, 단위주):
- COMMON: 발행 43504588 / 자기 736215 / 기준일 2026-06-30 / 공시 20260814003091
- PREFERRED: 발행 112579 / 자기 10621 / 기준일 2026-06-30 / 공시 20260814003091
- TOTAL: 발행 43617167 / 자기 746836 / 기준일 2026-06-30 / 공시 20260814003091
Corporate Actions: Jul1~Oct8 공시목록 14건, 두 구간 total_page/total_count/행수 대조 완료. 효과·종류·발행/자기주식 대사 별도.
October8 Share Count: null / SHARE_COUNT_UNVERIFIED
Verification: SHARE_COUNT_UNVERIFIED
October8 Price: 138,800 KRW (기존 KIS 동일일 원천 재사용)
Book Value: 2,393,709,284,799 KRW / CFS / ifrs-full_EquityAttributableToOwnersOfParent / 2026-06-30 / availableAt 2026-08-14T23:59:59+09:00 / 원천계정 관측, 정의 검증 별도

Company: 한미반도체 / Stock Code: 042700
June30 Share Count (공식 보고 원천, 단위주):
- COMMON: 발행 95312200 / 자기 459198 / 기준일 2026-06-30 / 공시 20260814003665
- TOTAL: 발행 95312200 / 자기 459198 / 기준일 2026-06-30 / 공시 20260814003665
Corporate Actions: Jul1~Oct8 공시목록 19건, 두 구간 total_page/total_count/행수 대조 완료. 효과·종류·발행/자기주식 대사 별도.
October8 Share Count: null / SHARE_COUNT_UNVERIFIED
Verification: SHARE_COUNT_UNVERIFIED
October8 Price: 267,000 KRW (기존 KIS 동일일 원천 재사용)
Book Value: 746,888,948,978 KRW / CFS / ifrs-full_EquityAttributableToOwnersOfParent / 2026-06-30 / availableAt 2026-08-14T23:59:59+09:00 / 원천계정 관측, 정의 검증 별도

주요 추가 공식 근거:
- SK: 증권발행실적20260715000004에서 원주17,790,000주·납입7월14일 확인. 반기712,702,365+17,790,000=730,492,365이며 8월19일 소각결정20260819800340의 소각 전 총수730,492,365와 대사. 납입일을 모든 권리/상장 효력일로 단정하지 않음.
- SK 소각: 취득 예정8월20일~11월19일, 소각일 '-'이며 취득 완료 후 일괄 소각 예정. 결정일에 예정수량 차감 금지. 정정·완료·적용일 확인 필요.
- SK 처분: 결정20260807000537→결과20260821000495. 실제8월19일82주 처분, 8월21일 자기주식1,625,769주 원천 관측. June30→August21 다른 자기주식 거래까지 대사 미완료, Oct8 잔고로 사용 금지.
- DB: 20261007000288 문서 공개10월7일 / 작성기준10월1일 / 의결권 있는 발행주식43,504,588. 전체 보통·우선주/자기주식 및 Oct8 총수로 승격하지 않음.
- 한미: 20260814003665 공식 반기 원문에서95,312,200/자기459,198 확인. 20260810800065 기타경영사항은 HANMI USA 종속기업 설립으로 모회사 주식수 변화 적용에서 제외. 종류주식 '-'를 임의0으로 확정하지 않음.

MARKET CAP:
Share Classes: DB COMMON/PREFERRED 각각 존재. SK/Hanmi 종류 커버리지 최종 검증 필요.
Calculated Market Cap: null / 기준일·주식종류·자기주식 대사 부족으로 계산 보류
Official Market Cap: 미확보
Difference: 비교 불가
Verification: MARKET_CAP_UNVERIFIED
직전 QA의 SK 종가258,500 표기는 잘못됐으며 이번 저장 원천/API 재대조로 Oct8 종가1,681,000 KRW를 확인했다. 이번 보고서에 바로잡았으며 원천·과거 분석 기록은 수정하지 않았다.

PBR:
Financial Period: 국내3기업2026-06-30 CFS 소유주지분, 공개2026-08-14. 기존 계정·단위·원문 보존.
PBR Value: null / HOLD
Eligible Samples: PER0 / PBR0 / PSR0 / EV/EBITDA0 (6기업 재평가)
주식수·시총·장부가치 귀속범위·정정·사업 적합성 조건 완화 없음. 최소표본3 유지, 단일 PBR로 중앙값/추천 활성화 금지.

DB HITEK:
Differences:9 / Resolved:0 / Unresolved:9
원문2ZIP SHA 일치. 8표200항목/9잔차 재검토. CFS/OFS 본 재무상태표/손익계산서4개 unchanged=true; 외화주석9잔차를 장부가치 오류와 동일시하지 않음. 개별 공식 원인 설명 미확보. 상세 docs/KSTOCK_DB_MU_FOLLOWUP.md. 이번 새 difference-review-1791795736964.json, 관련7테스트 PASS(전체515에 포함).

MU SEC:
Verification: PARTIAL / PBR 입력 보류
FY2026 Q3 10-Q / 자본100,724,000,000 USD 기준5월28일 / 접수6월25일.
6월17일1,129,393,151주는 EntityCommonStockSharesOutstanding(유통주식수)이므로 issued로 대체 금지.
9월3일 자본·10월2일 주식수는10월9일 접수이므로10월8일 평가 차단. 2021년 비지배포함 자본을2026자본과 결합 금지. 검증되지 않은 환율 적용 없음. SEC 신규요청0.

WORKERS:
Collection: 기존 Worker로 수동목록3회 완료, MANUAL_READ_ONLY_COMPLETED / enabled=false / 외부 Scheduler=false. 원문 다운로드는 범위 제한 수동 스크립트; 중복 Worker 없음.
Validation: SAVED_EVIDENCE_ONLY /30분 유지;6기업PARTIAL3/BLOCKED3/FAILED0 / 신규 외부요청0. shareBridge를 기업별 inputHash와 API에 연결, 미변경 기업 재검증 생략. 같은 보고서 재실행·원천변경 감지 검증. 실 Worker에서 종류별 reconcilePeerShares 계산기를 호출하며 검증 조건 부족 시 수량null을 유지한다.
로컬 개발 서버만 재시작. 운영·외부 자동수집 활성화 없음.

WEB UI:
실제 API 국내3 shareBridge 연결, Jun30/중간관측/Oct8 보류·주식종류·공식 근거 구분. 선택기업/배수/상세 접힘 상태·가로스크롤 유지 실브라우저 PASS. 320~1440px6너비×라이트/다크12조건, 390px글자200% 가로 페이지 넘침 없음. DB정정9건 바로가기 추가. 기존 삼성전자 상세 TTM·보류 표시 Web 회귀 PASS. docs/uiux/share-*-web.png.
GALAXY A33:
기존2.6.5 앱 유지, 신규 설치 없음. SK/DB/한미 대사화면, 과거주식수/보류/공시목록57·14·19건, DB9행 표·가로스크롤 실제확인 PASS. USB 서버 연결 실패·복구·앱재실행 PASS. 전경 앱 guard 사용. 삼성전자 상세 TTM(2025-07-01~2026-06-30/CFS/KRW/매출485,272,032,000,000) Web·실기기 일치 확인 및 실제1개월 가격차트(KIS/9월8일~10월8일/원주가·배당제외·기업행동검증중)도 확인. 종목 상세→목록 바로가기 추가. 세부 모든 금액/단위/출처 전수검증은 아래 NOT RUN과 분리. 화면 docs/uiux/share-galaxy-*.png.

RECOMMENDATION: HOLD (삼성전자/Apple 추천순위)
SAMSUNG PERFORMANCE: HOLD
LIVE TRADING: OFF / KSTOCK_BROKER_ENABLED=false / KSTOCK_LIVE_TRADING_ENABLED=false
REAL ORDER CALLS: 이번 작업0; 과거 계좌 전체 주문 수 조회는 하지 않음
MODIFIED FILES:
src/v2/peer_share_bridge.js; src/v2/peer_validation_worker.js; scripts/collect-peer-share-bridge.mjs; scripts/retrieve-peer-share-originals.mjs; scripts/build-peer-share-bridge.py; public/app.js; public/index.html; public/styles.css; test/peer_share_bridge.test.js; test/peer_validation_worker.test.js; test/candidate_ui.test.js; test/peer_worker_android_contract.test.js; docs/KSTOCK_DB_MU_FOLLOWUP.md; docs/KSTOCK_PEER_WORKER_API.md; docs/KSTOCK_QA_FOLLOWUP_REPORT.md; docs/AUTO_DEV_LOG.md; docs/uiux/share-*.png. 이전 미커밋 작업 포함 전체 diff를 이번 변경으로 주장하지 않음.
SEC/.env/기존분석보고서/DB원문 해시 보존 확인.
NOT RUN: 신규 KIS/KRX/SEC 조회, 운영·공개 배포, 주문/계좌조회, 실제30분 대기, A33 모바일 자동 새로고침 상태 유지 실측, 모든 기업 금액·단위·출처 전수대조.
BLOCKERS: 공식 Oct8 전체 주식수·자기주식·기업행동 효과/완료 대사 미완료; SK 증자 후 자본변동과 과거 장부가치의 비교 기준 검증; DB우선주 가격·장부가치범위; 종류주식 부재 확정; 개별 정정원인9건 및 사업적합성 미검증.
NEXT ACTION: SK 증자 효력/상장·이후 자기주식 거래와 소각 실제 완료 여부 대사 → DB/Hanmi Oct8 종류별수량 최신확인 → 시총 구성·장부가치 귀속·증자후 기간정합성 → PBR 독립판정. 날짜가 불명확한 수치 결합/추정 금지.
OVERALL: PARTIAL

---

# K-STOCK AI DATA VALIDATION REPORT — 2026-10-12 공식 자료 수집 후속

PROJECT: /Users/ari/ARI/projects/k-stock-ai
BRANCH: auto/kstock-development-20260930
COMMIT: ea406852610c00bef0dbe469de95c42fca662c30 (기준 HEAD; 기존 미커밋 작업 보존)
VERSION: package1.0.0 / Android2.6.5(265), 기존 설치 재사용
BASELINE: 직전 Regression502 PASS / Android Contract3 PASS
CURRENT TESTS: Regression507 PASS /0 FAIL; Android Contract3 PASS /0 FAIL
COMMANDS: npm run test:offline; node --test test/android_external.test.js; node --check public/app.js; git diff --check. Android mock 서버는 로컬 바인딩 권한으로 재실행해 통과. 자동 테스트에서 외부 수집·주문 없음.

DATA COLLECTION:
- KIS: 2026-10-08 기존 공식 종가 원천 보존·재사용. 이번 신규 KIS 요청0. 해당 가격만으로 기준일 없는 시가총액을 만들지 않음.
- OpenDART: 수동 읽기12회. 국내3개 기업의 2026H1 주식수·증감·자기주식 및 2026-08-14~10-08 공시 목록 확보. 원문 SHA256 저장. 재실행은 캐시 사용.
- SEC: MU/TSM/UMC companyfacts 각1회, 총3회. MU 원문 확보, TSM/UMC SOURCE_REQUEST_FAILED로 차단. 최초 SEC 호출1회는 fetch 주입 인자 오류로 호출 카운터에서 누락되었으므로 실제 총 호출은 OpenDART12+SEC3=15회로 보정 기록. 오류 수정 후 수집2회는 카운터 정상 기록. 반복 조회 없음.
- KRX: AUTH_BLOCKED 유지; 이번 요청0, 인증 우회 없음.
- KIND / Corporate IR: 이번 신규 조회 NOT RUN. 기존 근거 보존.
- 확인 시점: 2026-10-12; 정확한 원천별 collectedAt은 data/v2/data-collection/state.json와 SHA 아카이브에 기록. 증거: official-peer-inputs-1791793879823.json / official-peer-inputs-1791794713966.json (data/v2/verification).

PBR VALIDATION:
Priority Company: SK하이닉스 (원천 확보율 우선순위1; 투자 순위 아님)
Valuation Date: 2026-10-08
Price: 국내3개 기존 Oct8 종가 확인; SK258,500 KRW / DB138,800 KRW / 한미 기존 원천 참조
Market Cap: MARKET_CAP_UNVERIFIED; 동일일 공식 시가총액 미확보
Share Count: 아래 모두 2026-06-30 원천이며 Oct8로 승격하지 않음.
- SK000660: 보통주 발행712,702,365 / 자기1,626,865주. 8월19일 소각결정·자기주식취득결정, 8월21일 처분결과 공시 확인. 이후 주식수 대사 필요.
- DB000990: 보통주43,504,588 / 자기736,215; 우선주112,579 / 자기10,621; 합계43,617,167 / 자기746,836주. 보통주 가격에 합계 주식수 곱하지 않음.
- 한미042700: 보통주95,312,200 / 자기459,198주. 보통주식 명칭 정규화 수정. 종류주식 '-'는 0으로 추정하지 않음.
Book Value: 기존 연결 지배기업 소유주지분 원천 보존. SK262,380,610,000,000 KRW / DB2,393,709,284,799 KRW, 기간2026-06-30, 공개2026-08-14. 정의·정정·주식범위 검증 별도.
MU: SEC 주식수1129393151 shares(2026-06-17), StockholdersEquity100724000000 USD(2026-05-28) 원천 관측. 다른 지분계정2021-09-02도 날짜 그대로 저장; 최신 평가자료로 대체하지 않음. ADR·통화·기간·기업행동 검증 전 사용 차단.
PBR: 계산 보류
Eligible Samples: PER0 / PBR0 / PSR0 / EV/EBITDA0. 최소 표본3 정책 유지. 1개로 중앙값·추천 활성화 금지.

DB HITEK:
Differences: 9 / Resolved:0 / Unresolved:9
Evidence: 보존된 최초·정정 ZIP SHA 대조 및 numeric-audit 재검증. difference-review-1791794790700.json. 8개 표200항목의 기존 원문 검토 재사용. 공식 '통화 단위 기재오류' 설명만으로 개별9건 원인을 확정하지 않음. Aug14~Oct8 공시 목록7건 확보; 신규 개별 합계 원인 설명 미확보. 미래 정정값 소급 사용 차단 유지.

WORKERS:
Collection: 기존 Worker 재사용. MANUAL_READ_ONLY_COMPLETED, enabled=false, scheduler=false. 원천 아카이브·캐시 보존; SEC source 기존 state 마이그레이션 오류 수정.
Validation: 실제 실행6기업 / PARTIAL3 / BLOCKED3 / FAILED0; 외부 요청0. 기업별 입력 hash로 변경 기업만 재검증하고 미변경 checkedAt·결과 hash 보존. 중복 방지·백오프·호출 제한 유지.
External Auto Collection: OFF
Scheduler: 기존 저장 근거 재검증30분, 로컬 서버만 재시작. 운영환경 변경 없음.

WEB UI:
실제 API 6기업·배수별0표본·DB9미해결·공식 관측값 날짜 표시 확인. 변경 응답에서 선택기업000990·선택배수PBR·가로 스크롤150px 보존 실브라우저 검증. 320/360/390/768/1024/1440 라이트·다크12경우, 390px 글자200% 가로 페이지 넘침 없음. docs/uiux/official-*-web.png 캡처.
GALAXY A33:
기존 앱·사용자 데이터 보존. own foreground guard로 서버 연결·비교6개/0표본·DB장부가치 기준기간·출처·보류 화면 확인. 공식 관측값의 June30 기준일·출처 및 연결 중단/복구·재실행 화면 확인. 가로 스크롤 입력은 실행했으나 최종 캡처가 표 영역이 아니어서 모바일 DB9행 표의 가로 스크롤 PASS 판정은 NOT RUN. 캡처는 official-galaxy-*.png. 모든 기업·모든 배수 화면 전수대조 및 실제30분 주기 대기 확인은 NOT RUN. 설치 재실행 없음(기존2.6.5 유지).

RECOMMENDATION: HOLD (삼성전자 및 Apple 순위 보류)
SAMSUNG PERFORMANCE: HOLD
LIVE TRADING: OFF; KSTOCK_BROKER_ENABLED=false / KSTOCK_LIVE_TRADING_ENABLED=false 유지
REAL ORDER CALLS: 이번 작업0 (계좌 전체 과거 주문 건수 조회 아님)
SECURITY: .env / 기존 latest 분석 report / DB 원문 ZIP 해시 보존 확인; 인증정보 출력·변경 없음; 다른 프로젝트·운영·공개 배포 변경 없음.

MODIFIED FILES:
src/v2/data_collection_worker.js; src/v2/peer_validation_worker.js; src/v2/collection_normalization.js; src/v2/share_count.js; scripts/collect-peer-official-inputs.mjs; public/app.js; test/data_collection_worker.test.js; test/peer_validation_worker.test.js; test/collection_normalization.test.js; docs/KSTOCK_PEER_WORKER_API.md; docs/KSTOCK_QA_FOLLOWUP_REPORT.md; docs/AUTO_DEV_LOG.md; docs/uiux/official-*.png. 이전 작업의 미커밋 파일은 이번 수정으로 주장하지 않음.
NOT RUN: 신규 KIS/KRX/KIND/IR 조회, 외부 자동 수집, 운영 배포, 모든 기업 모바일 상세 전수검증, 모바일 DB9행 표 가로 스크롤 최종 확인, 모바일 자동 새로고침 상태 보존 실측, 실거래/계좌 조회.
BLOCKERS: 동일 Oct8 시가총액·주식수와 June30 이후 기업행동 연결 미완료; DB9개 공식 원인 미확보; 사업 적합성·ADR·배수 정의 검증 미완료; SEC TSM/UMC 요청 실패; KRX 인증 차단.
NEXT ACTION: 국내3기업 June30→Oct8 공시/주식소각·처분 대사와 한미 종류주식 확인 → 동일일 주식종류별 가격·수량·자본 정의 확인 → 개별 PBR 재판정. DB 공식 설명 확보와 모바일 전수대조는 독립 진행. 인증 우회·추정·기준 완화 금지.
OVERALL: PARTIAL

---

K-STOCK AI PBR VALIDATION REPORT — 2026-10-12

PROJECT: /Users/ari/ARI/projects/k-stock-ai
BRANCH: auto/kstock-development-20260930
COMMIT: ea406852610c00bef0dbe469de95c42fca662c30 (현재 HEAD 및 기준, 새 커밋·push 없음)
VERSION: package1.0.0 / server0.1.0 / Android2.6.5(265), 기존 설치 재사용
PRE-FLIGHT: AGENTS/ARI compliance/QA/로그/README/기획·아키텍처/UI/Worker/API 확인. origin Naharuya/k-stock-ai. 기존 미커밋 변경과 사용자 데이터 보존. 운영 ari-prod-01 /srv/k-stock-ai/current /kstock.ai.kr 및 다른 프로젝트 미변경.

BASELINE:
Regression 470 PASS (이번 시작 코드에서 재실행)
Android Contract 3 PASS (이번 실제 재실행)

CURRENT TESTS: Offline502 / Android Contract3
PASS: 502 + 별도3
FAIL: 0 / skipped0
COMMANDS: npm run test:offline; node --test test/android_external.test.js; node --test test/peer_worker_android_contract.test.js; node --check public/app.js; node --check src/v2/pbr_validation.js; node --check src/v2/collection_normalization.js; git diff --check.
추가32 = PBR15 + 정규화10 + DB 원인검토3 + UI4. 기존 Android native GET 계약을 PBR 값·기간·통화·출처 payload로 확대(총수 변화 없음). 오프라인 fixture/mock/tempdir 사용, 주문·통제되지 않은 외부 요청 없음.
로그: /tmp/kstock-pbr-baseline.log, /tmp/kstock-pbr-final.log, /tmp/kstock-pbr-android.log, /tmp/kstock-pbr-native.log, /tmp/kstock-pbr-browser-final.log, /tmp/kstock-pbr-existing-ui.log.

PBR VALIDATION:
Priority Company: SK하이닉스000660. 데이터 확보 순위 SK1 → DB하이텍2 → 한미반도체3 → MU4 → TSM5 → UMC6.
완성도: 원천 필드7/10,7/10,6/10,0/10,0/10,0/10. 원천 자료 확보량이며 현재 기준일의 입력 검증 완료율이 아님. 과거 주식수 관측은 현재 주식수로 승격하지 않음.
Market Cap: null / 동일 기준일 공식 근거 미확보. 기준일 없는 KIS 요약 값을 결합하지 않음.
Market Cap Date: 미확인
Book Value: SK262,380,610,000,000 KRW, 계정 ifrs-full_EquityAttributableToOwnersOfParent(지배기업 소유주지분) 식별. SOURCE_ACCOUNT_IDENTIFIED / 금액·귀속 범위 미검증 / PBR 계산 제외.
Book Value Period: 2026-06-30, CFS 연결 / 공시2026-08-14(보수적 일말 이용 시점)
Book Value Evidence: https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260814003509
Share Count Date: 2026-10-08 주식수 미검증. 기존 반기·과거 주식수 관측 보존.
Price Date: 2026-10-08 / SK1,681,000 KRW(기존 검증 종가 재사용)
PBR: null / INSUFFICIENT_DATA
Verification: 시가총액·주식수·종류별 귀속·기업행동 영향·정정·사업 적합성 선행 조건 차단. 계산 가능 여부와 동종기업 적합성을 별도 판정.
Eligible Samples: PBR0 / PER0 / PSR0 / EV/EBITDA0. 최소 표본3 유지. 1개만 확보되어도 중앙값·추천을 활성화하지 않음.
국내 비교 근거:
- DB하이텍: 2,393,709,284,799 KRW / 2026-06-30 CFS 소유주지분 계정 식별 / https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260814003091 / 종가138,800 KRW(10월8일). 시총·현재주식수·종류별 귀속 미확인.
- 한미반도체: 746,888,948,978 KRW / 2026-06-30 CFS 소유주지분 계정 식별 / https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260814003665 / 종가267,000 KRW(10월8일). 같은 선행 조건 미확인.
새 검토: data/v2/verification/pbr-input-review-1791790830057.json (0600/Git 제외/기존 보고서 SHA 포함).
공식 자료 확보 작업: 이번 신규 금융 API0회. 공식 Web 검색1회(쿼리2개), SK 공식IR https://www.skhynix.com/ir/UI-FR-IR12_T1/ 및 OpenDART 확인. 해당 IR은 KRX 공시 검색 안내이며 10월8일 시가총액 증거로 사용하지 않음. 새 시가총액·주식수 근거 확보0.
입력 정책: 단일 종류는 해당 종류 장부가치 배분 검증 필요. 전체 종류는 종류별 가격·주식수 구성과 전체 종류 포함 검증 및 합계 대사 필요. 단일 종가×전체 종류 주식수 차단. CFS 자본총계와 소유주지분 혼용 금지. 통화·정규화 단위·공개 시점·기업행동 공시 cutoff 검증.

DB HITEK:
Differences: 9
Resolved: 0
Unresolved: 9 (모두 UNRESOLVED / 평가 입력 금지)
Evidence: 최초20260316001250 / 정정20260601001661 ZIP hash 재확인, 8표·200항목·400 전후 셀 보존. 공식 정정표 사유는 ‘통화 단위 기재오류’; 이 문구가 개별9건 합계 차이의 원인을 증명하지 않음.
원인 후보 CORRECTION/UNIT_DIFFERENCE/PERIOD_DIFFERENCE/SCOPE_DIFFERENCE/ROUNDING/SUMMATION_ERROR/SOURCE_CONFLICT 각각 NOT_ESTABLISHED와 관측·판정 사유 저장. 단위 변경·같은 기간/범위·숫자 변경과 잔차의 인과를 분리. 1·2천JPY / -1백만원도 공식 반올림 근거 없이 해결 처리하지 않음. 정정 전 단계 잔차는 정정 후 단위로 재계산하지 않음.
새 근거: data/v2/verification/db-correction-1791783200385/difference-review-1791790652091.json (0600). docs/KSTOCK_DB_CORRECTION_CAUSE_REVIEW.md 개별 관측 참조. 추가 외부 원문 요청0. 미래 정정자료 차단 PASS.

NORMALIZATION:
Financial: 표준 companyCode/year/quarter/periodType/CFS·OFS/currency/unit/reportedAt/availableAt/source/correctionStatus + accountId/accountDetail/value/기간 저장. INSTANT와 ANNUAL/CUMULATIVE_YTD 구분. 원천 flow value와 singlePeriodValue 분리. 중복 계정기간·단위 미확인·정정 계보·미래 공시 차단. 동일 ID의 서로 다른 accountDetail을 합치지 않음. 기존 TTM 연속4분기·누락·중복·누적 변환 회귀 PASS, 전체계정 정규화만으로 TTM을 승인하지 않음.
실제 저장 응답 재검증: 국내3 financials717행 + financial-periods90행 =807행 구조화, 모두 PENDING_VERIFICATION / valuationInputEligible=false. 원본 SHA와 원래 checkedAt 보존, 신규 API0. 결과 data/v2/verification/peer-normalization-review-1791791520239.json.
실제 응답 한계: full-account에는 fs_div/thstrm_dt가 없고 major-account에는 account_id가 없음. major-account의 CFS/OFS를 섞거나 full-account의 빈 기준을 임의 채우지 않음. 요청 계약·동일 접수번호의 기간/계정 대응·명시 단위·공시·정정 lineage 검증이 다음 단계. missing fs_div는 기준 미확인으로 기록하며 실제 OFS/CFS 불일치와 구분.
Share Count: 발행/자기/유통·종류·기준일·출처·검증상태 표준화. issued-treasury=outstanding 대사. 자기 취득/처분을 발행수 변화로 처리하지 않음. 과거 신고 수량은 현재10월8일로 연결하지 않음. fixture PASS, 현재일 실데이터 검증 NOT RUN/자료 미확보.
Corporate Actions: 발표/기준/권리락/효력일·종류·출처·문서·검증상태 표준화. reportedQuantity와 실제 적용 quantity 분리. exDate/effectiveDate/quantity 미확정은 null 유지. 소각 보고만으로 실제 소각 효력을 추정하지 않음. 전수 범위 미확인/평가 입력 금지 유지.
Collector의 원천 보관 observed에 정규화 결과 연결. 새 외부 수집 운영·전체종류 완전 정규화 완료를 의미하지 않음.

WORKERS:
Collection: 구현·저장 원천 재사용 유지. 대상6/PARTIAL6/근거 보유3/외부 실행 false/SAVED_SOURCE_REPLAY. 이번 새 수집 cycle 실행0. KRX AUTH_BLOCKED 보존.
Validation: 기존30분 SAVED_EVIDENCE_ONLY enabled=true, 마지막 2026-10-12T07:41:40.985Z, 다음 2026-10-12T08:23:04.756Z (UTC 확인 시점; API 갱신). 로컬 PID59095, Worker running=false. 입력 보고서·수집·원인 검토 해시가 같으면 재계산 생략. pbrPriority/job.pbrValidation 및 독립 배수 집계 API 연결. 검증큐 PARTIAL3/BLOCKED3/VERIFIED0/FAILED0.
External Auto Collection: DISABLED. 인증 우회·새 launchd·비밀값 변경 없음. 기존 운영/수집 일정 유지.

WEB UI: PASS (이번 실제 범위)
- PBR 우선순위/보류/7종 입력 카드/종가·장부가치 원천값/서로 다른 기준일·단위·CFS·정정상태·원천URL·다음 재검증 시각/쉬운 보류 사유 표시.
- 미검증 장부가치는 ‘미검증 원천값(계산 제외)’ 명시. 0표본 가짜 배수·차트 없음.
- 기업별 상세 근거 바로가기6개: 작은 화면에서도 넓은 표 끝 버튼에 의존하지 않음.
- 실제 동일API Web/Android native bridge 계약 PASS. light/dark 6폭×2=12조건, 글자200%, 문서 넘침/스크롤 PASS. 기존 삼성전자TTM/기업행동/벤치마크 회귀 PASS.
- 실기기 발견: 자동 새로고침 시 동일 상세 DOM 재생성으로 스크롤 초기화. 동일 job fingerprint면 재생성하지 않는 수정·회귀 PASS. 값이 바뀐 경우 최신 결과 갱신 유지.

GALAXY A33: PASS (SM-A336N/RFCW1178RRE, 기존 ai.kstock.mobile.localvalidation 앱)
DETAIL EVIDENCE SCREEN: PASS — 직전 NOT RUN이던 새 상세 확인.
SK하이닉스·DB PBR 상세 바로가기 터치/가격기준10월8일/장부기준6월30일/CFS/통화KRW/계정·원천 링크·계산 제외·부족자료 확인. Web와 같은 SK262,380,610,000,000 / DB2,393,709,284,799 KRW 확인. DB9개 ID/2024·2025기간/연결·별도/정정 접수20260601001661/전후 단위(천USD·십만JPY·천JPY·백만원)/0해결9미해결/가로 스크롤 확인. 긴 문구 줄바꿈과 세로 스크롤 확인. 실패 시 native ‘서버 연결 실패’, USB 복원 후 연결 성공, 앱 종료·재실행 후 DB 상세 재접근 확인. 다른 앱 전경 입력 금지 가드 적용, 사용자 데이터 보존/USB reverse 복원.
증거: docs/uiux/pbr-*-web.png 및 pbr-galaxy-shortcuts.png, pbr-galaxy-db-detail.png, pbr-galaxy-db-book.png, pbr-galaxy-db-nine.png, pbr-galaxy-db-documents.png, pbr-galaxy-db-values.png, pbr-galaxy-db-receipts.png, pbr-galaxy-sk-detail.png, pbr-galaxy-sk-book.png, pbr-galaxy-failure.png, pbr-galaxy-restored.png, pbr-galaxy-relaunch-detail.png.
앱 설치/업데이트: 이번 NOT RUN(기존 설치 재사용). Android OS 글자 크기 설정 변경/전체6기업 모든 행·모든오류 상태 실기기 전수 검증 NOT RUN. 브라우저200%와 실제 기본 기기 글자 상태 확인을 구분.

RECOMMENDATION: HOLD (삼성전자/Apple 추천 순위 포함)
SAMSUNG PERFORMANCE: HOLD
LIVE TRADING: OFF (/health liveTrading=false, brokerEnabled=false, externalAccess=false)
REAL ORDERS: 이번 주문·취소 API 호출0건. 계좌 전체 과거 주문 기록은 조회하지 않음.
최종 코드 문법/ git diff --check PASS. 이번 변경18개 텍스트 파일의 환경 비밀값 literal scan PASS(발견0, 값 출력 없음).
PRESERVATION: .env / 기존 latest보고서(Apple·SEC 포함) / DB ZIP2개 SHA 보존 확인 PASS. 원천·신규 검토0600/Git제외. 비밀값·계좌 정보 출력 없음. 신규 개인정보 수집/외부AI전송 없음.

MODIFIED FILES (이번 작업):
src/v2/pbr_validation.js; src/v2/collection_normalization.js; src/v2/data_collection_worker.js; src/v2/peer_validation_worker.js; src/v2/correction_difference_review.js; scripts/normalize-saved-peer-evidence.mjs; public/app.js; public/index.html; public/styles.css; test/pbr_validation.test.js; test/collection_normalization.test.js; test/correction_difference_review.test.js; test/candidate_ui.test.js; test/peer_worker_android_contract.test.js; docs/KSTOCK_DB_CORRECTION_CAUSE_REVIEW.md; docs/KSTOCK_PEER_WORKER_API.md; docs/KSTOCK_QA_FOLLOWUP_REPORT.md; docs/AUTO_DEV_LOG.md; docs/uiux/pbr-*.png. 기존capital 화면 증거 일부 재검증 캡처 갱신. 이전 미커밋 변경 포함 전체diff를 이번 작업으로 주장하지 않음.
NOT RUN:
공식10월8일 전체종류 시총/현재주식수/장부귀속의 실데이터 완전검증, KRX 인증 복구, 새 외부 자동수집 cycle, 실제주식수·기업행동 전수 범위 검증, 새APK 설치·OS확대·전체6기업 전수 실기기. 운영/공개배포/유료/주문/계좌변경 수행 안 함.
BLOCKERS:
동일일 공식 자본 자료·종류별 귀속·기업행동 범위 / KRX AUTH_BLOCKED / DB 개별 잔차 공식 설명 미확보 / 실제API 계정·기간·연결기준 대응 근거 미완전. 신규PBR 완전 검증기업0.
NEXT ACTION:
1. 저장 full/major-account의 동일 접수번호·CFS 요청 계약·계정·기간 대응 및 공식 단위·정정 lineage를 검증해 실제 재무 정규화 보강.
2. 인증된 공식 읽기 자료 또는 공식 동일일 자료 확보 후 SK 우선 시총·주식수·주식종류·자본귀속 대사. 부족 상태 유지.
3. 공식 DB 잔차 설명 확보 시 개별원인 갱신; 6기업4배수 재검증 및 Web/A33 동일계약 회귀. 선행조건 통과 전 추천/성과 HOLD.

OVERALL: PARTIAL

--- 이전 실행 기록(보존) ---

K-STOCK AI BACKEND & UI DEVELOPMENT REPORT — 2026-10-12 / 수집·검증·UI 연결

PROJECT: /Users/ari/ARI/projects/k-stock-ai
BRANCH: auto/kstock-development-20260930
COMMIT: ea406852610c00bef0dbe469de95c42fca662c30 (기준 및 현재 HEAD, 새 커밋 없음)
VERSION: package1.0.0 / server0.1.0 / Android2.6.5(265), 기존 설치 앱 재사용
PRE-FLIGHT: AGENTS·ARI_COMPLIANCE_STANDARD·README·기획/아키텍처/UI/계약·QA/로그 및 실제 Git/launchd 확인. 기존 미커밋 변경 보존. 운영 ari-prod-01 /srv/k-stock-ai/current /kstock.ai.kr 및 다른 프로젝트 미변경.
BASELINE: 현재 코드에서 offline441 PASS 재확인 후 개발. 인수인계 수치와 실제 결과를 구분함.

COLLECTION WORKER:
Implemented: 큐/출처별 수집 계획/기존 읽기 전용 어댑터/캐시/중복 잠금/재시작 복구/일시 오류만 제한 재시도/인증 차단/0600 SHA 원천 보관/상태 API/Validation 해시 연동 구현. 실제 저장 가격3개 재사용 확인. 전체 재무·주식수·기업행동·지수 정규화는 PARTIAL.
Enabled: false. SAVED_SOURCE_REPLAY. 새 외부 자동 수집 활성화 없음.
Scheduler: 외부 수집 disabled / nextRun=null. 기존 저장 근거 재검증은 서버 내부1800000ms enabled=true. 신규 launchd 등록 없음.
기존 일정: 후보06:30 --collect, JINI1800초 HOLD, 이전 체크아웃17:30 및 API3002 기록 확인·미변경. 서버 PID55419 / 127.0.0.1:3000 최종 코드 재시작. Worker는 완료 후 running=false.
Last Run: 수집 재사용2026-10-12 16:09:23 KST. 원래 가격 수집 확인14:48:31 KST를 그대로 보존(새 수집 시각으로 변경하지 않음).
Next Run: 외부 수집 없음. 저장 근거 재검증 다음16:54:18 KST (확인 시점 상태; API에서 이후 갱신).
Queue: 수집 total6 / PARTIAL6 / VERIFIED0 / BLOCKED0 / FAILED0 / 근거 보유 기업3. gateAttempts3 / 실제 외부 API 요청0. 수집 큐의 PARTIAL과 검증 큐의 BLOCKED는 별도 상태.

DATA SOURCES:
KIS: 저장된 공식 API 응답 재사용. SK하이닉스1681000원, DB하이텍138800원, 한미반도체267000원, 모두2026-10-08 종가. 원래 요청 계약의 RAW 근거 보존. 이번 신규 KIS 요청0. 기준일 없는 output1 시가총액·주식수는 결합하지 않음.
OpenDART: 기존 원문 ZIP 및 감사 근거 보존. 새 자동 수집 DISABLED. 기존 .env DART_ENABLED=false를 변경하지 않음.
KRX: AUTH_BLOCKED, 기존 LOGOUT 근거. 신규 인증 시도0. 공식 OpenAPI 문서 검색1회 / 금융 데이터 API0회. 로그인·인증키·서비스별 이용 신청 안내는 확인했으나 기존 웹 LOGOUT의 정확한 원인을 키 만료로 추정하지 않음.
공식 문서: https://openapi.krx.co.kr/contents/OPP/INFO/OPPINFO003.jsp 및 https://openapi.krx.co.kr/contents/OPP/USES/service/OPPUSES002_S2.cmd?BO_ID=PiwgMdTwmsenXhmqqxuj
KIND: 새 외부 수집 DISABLED, 기존 저장 근거 유지.
Corporate IR: 새 외부 수집 DISABLED, Apple/SEC 근거 및 기존 보고서 보존.
출처별 수집 정책: 확인된 거래일 마감 후 가격/일별·새 공시/명시적 회계기간. 24h 캐시, 최소1100ms 간격, 일시 오류 최대3회, 사이클40 gateAttempts. KRX 차단 우회·무한 재시도 없음.

PEER VALIDATION:
Candidates: 6 (SK하이닉스000660, DB하이텍000990, 한미반도체042700, MU, TSM, UMC)
Verified: 0
Partial: 3 (해외 기업; 기존 사업·기간·자료 부족 보류 유지)
Blocked: 3 (국내 기업; KRX_AUTH_REQUIRED 및 동일 기준일 자본 근거 미확보)
Failed: 0
PER Eligible: 0
PBR Eligible: 0
PSR Eligible: 0
EV/EBITDA Eligible: 0
최소 표본3 유지. 양수 가격을 확보한 사실만으로 배수 유효 판정하지 않음. 배수별 검증과 사업·기간·통화·기준일 적합성을 각각 검사. 기존 추천·삼성전자 성과·Apple 순위 보류 유지.

DB HITEK:
Differences: 9
Resolved: 0
Unresolved: 9 (개별 cause=UNRESOLVED, valuationInputEligible=false)
Evidence: 원문20260316001250 / 정정20260601001661 ZIP SHA 확인. 8개 표·200개 행·정정 전후400개 원문 셀 보존. 각9건에 회계기간/CFS·OFS/통화/단위/표·행/접수번호/전후 값/구성합계와 차이/출처/공시 이용 가능 시점 연결.
새 검토: data/v2/verification/db-correction-1791783200385/difference-review-1791788504858.json (0600/Git 제외). docs/KSTOCK_DB_CORRECTION_CAUSE_REVIEW.md 참조.
수치 대조는 완료했으나 차이 원인은 공식 설명 미확보. 반올림·오류·정정 원인을 임의 확정하지 않음. 미래 정정 자료 평가 입력 차단 테스트 PASS.

UI/UX:
Web Dashboard: PASS 실제 collection/status 및 peer-validation/status API 연결, 수집 비활성/저장 재사용·수집 근거 보유 기업3·KRX 차단 표시. 실행 중으로 임의 표시하지 않음.
Peer Comparison: PASS 6기업×4배수24칸 실제 보류 표시, 표본0일 때 가짜 중앙값·비교 차트 없음.
Data Quality: PASS 수집/검증 시각·실제 데이터 기준일·다음 작업·배수별 제외 사유·DB 차이9건 근거 표시. 기준일을 평가일로 대체하지 않음. 원천 보관과 계산 가능 상태 분리.
Web: Chrome 실제12레이아웃(320/360/390/768/1024/1440×light/dark), 글자200%, 스크롤/문서 가로 넘침 검사 PASS. 기존 삼성전자/TTM/기업행동/벤치마크 화면 회귀 확인 PASS.
Galaxy A33: 기존2.6.5(265) 앱 재사용, 설치/업데이트 이번 NOT RUN(필요 없음). 실제 비교 목록·4개 표본0·배수 보류·가로 스크롤·긴 제외 설명 확인 PASS. USB 연결 차단 시 서버 연결 실패 표시, 복원 후 연결 성공, 앱 종료/재실행 후 비교 표본0 유지 PASS. 운영 패널의 검증 큐와 보류 상태 화면 확인. 새 DB9건 상세·수집 소스별 패널의 실기기 세부 확인은 NOT RUN(Web 실제 화면·자동 계약 검증은 PASS).
증거: docs/uiux/collection-dashboard-web.png, collection-comparison-web.png, collection-db-evidence-web.png, collection-galaxy-comparison.png, collection-galaxy-list.png, collection-galaxy-metrics.png, collection-galaxy-failure.png, collection-galaxy-restored.png, collection-galaxy-relaunch.png.

TESTS:
Regression: npm run test:offline →470 PASS /0 FAIL /0 skipped (기준441 +29). 테스트는 fixture/mock/tempdir, 외부 자동 요청 없음.
Android Contract: node --test test/android_external.test.js →3 PASS /0 FAIL. 추가 수집 native GET 계약은 offline470에 포함.
Failures: 0 (최종 회귀). 검증 중 잘못 지정한 /api/health 경로는 HTML404였으며 실제 /health 재확인200/OFF. 제품 API 실패로 오인하지 않음.
추가 검증: 수집 중복/재시작/기간·공시 미래정보/장애 백오프/LOGOUT 지속/비밀 필드 캐시 차단/원문재사용 호출0/기준일 없는 자본 제외/수집→검증 해시 변경/배수별 독립 표본/UI·Android 계약.
명령: npm run test:offline; node --test test/android_external.test.js; node --check src/v2/data_collection_worker.js; node --check src/v2/peer_validation_worker.js; node --check src/server.js; node --check public/app.js; git diff --check.
실제 브라우저 로그: /tmp/kstock-collection-browser-final.log 및 /tmp/kstock-collection-existing-ui.log. 회귀 /tmp/kstock-collection-final.log, Android /tmp/kstock-collection-android.log.

SECURITY:
Live Trading: OFF (/health liveTrading=false / brokerEnabled=false / externalAccess=false)
Real Orders: 이번 작업 실제 주문·취소 API 호출0건. 계좌 전체 과거 주문 건수는 조회하지 않음.
.env·기존 보고서·DB 원문ZIP2개 SHA 보존 확인 PASS. 원천/큐0600, Git 제외. 인증값·계좌정보를 UI/로그/문서에 기록하지 않음.

MODIFIED FILES (이번 작업 범위, 이전 미커밋 변경과 구분):
src/v2/data_collection_worker.js; src/v2/correction_difference_review.js; src/v2/peer_validation_worker.js; src/server.js; scripts/run-data-collection-worker.mjs; scripts/review-db-correction-differences.mjs; public/app.js; public/index.html; public/styles.css; test/data_collection_worker.test.js; test/correction_difference_review.test.js; test/peer_validation_worker.test.js; test/peer_worker_android_contract.test.js; test/candidate_ui.test.js; docs/KSTOCK_DB_CORRECTION_CAUSE_REVIEW.md; docs/KSTOCK_PEER_WORKER_API.md; docs/KSTOCK_QA_FOLLOWUP_REPORT.md; docs/AUTO_DEV_LOG.md; docs/uiux/collection-*.png. 기존 화면 재검증으로 capital-*.png 일부 갱신.

NOT RUN:
새 외부 자동 수집 사이클·외부 수집 Scheduler 운영, KRX 인증복구/최신 전체 데이터, 글로벌 신규 원천 수집, 재무·주식수·기업행동·지수 전체 정규화 후 실데이터 종단 검증, 신규 APK 빌드·설치, A33 새 DB9건 상세와 수집 소스별 패널 세부 확인. 운영/공개배포·유료 서비스·주문/취소·계좌변경 수행 안 함.
BLOCKERS:
공식 동일 기준일 시가총액·주식수 근거 부족 / KRX 인증 차단 / DB9건 원인 미확인 / 사업·회계기간 적합성 및 기업행동 전수 검증 부족. 수집기 구현 PASS가 외부 수집 운영 PASS나 추천 허용을 뜻하지 않음.
NEXT ACTION:
1. 원천별 날짜·회계기간·단위가 확인된 재무/주식수/기업행동/지수 정규화 완성.
2. 기존 승인된 원천 설정과 인증 상태를 충족한 경우에만 제한된 읽기 수집 운영 검증(설정·비밀 변경 없이).
3. 공식 DB 정정 원인/10월8일 자본 근거 확보 →6기업4배수 독립 재검증 →동일 계약 Web/A33 재검증. 자료 부족 동안 추천·성과 보류.

OVERALL: PARTIAL

--- 이전 실행 기록(보존) ---

K-STOCK DEVELOPMENT REPORT — 2026-10-12 / Mac mini Peer Validation Worker · UI/UX

PROJECT: /Users/ari/ARI/projects/k-stock-ai
BRANCH: auto/kstock-development-20260930
BASE COMMIT: ea406852610c00bef0dbe469de95c42fca662c30
VERSION: package1.0.0 / server0.1.0 / Android2.6.5(265), 기존 앱 재사용
기존 미커밋/사용자 자료 보존. 새 Git 커밋·push·운영 배포 없음. AGENTS·ARI compliance·README·기획/아키텍처·UI/계약·QA/로그와 실제 launchd 확인.

Backend Worker: PASS(저장 근거 재검증) / PARTIAL(외부 자동 수집)
Agent Running: 로컬 서버 PID49558 실행, 완료 후 Worker IDLE / running=false. 작업 실행 중이라고 임의 표시하지 않음.
Scheduler: 서버 내부 30분, SAVED_EVIDENCE_ONLY, enabled=true. 실제 마지막 실행 2026-10-12 15:27:20 KST / 다음 예정 15:57:20 KST. 시점별 상태는 API로 갱신.
Queue: 대상6 / QUEUED0 / RUNNING0 / VERIFIED0 / PARTIAL3 / BLOCKED3 / FAILED0
Companies Processed: 6 (SK하이닉스000660, DB하이텍000990, 한미반도체042700, MU, TSM, UMC)
Companies Verified: 0
Blocked: 국내3 KRX_AUTH_REQUIRED, 기존 실제 LOGOUT 근거. 이번 신규 KRX 호출 없음.
Failed: 0
PER Eligible: 0
PBR Eligible: 0
PSR Eligible: 0
EV/EBITDA Eligible: 0
최소표본 각3 유지. 배수 자체 VERIFIED와 비교 ELIGIBLE을 모두 요구. 회사 상태 VERIFIED도 네 배수의 비교 적합성 통과 필요. 추천 승인은 별개이며 항상 false.

SCHEDULER INSPECTION:
- 기존 현재 프로젝트 candidate launchd 매일06:30 --collect, loaded/idle, 직전 exit0.
- JINI 개발 지시 dispatcher 1800초, KSTOCK_AUTO_HOLD 존재. 기업 검증 Worker와 다른 역할. 기존 자동화/hold 수정 없음.
- watchlist 평일17:30 및 API3002는 이전 checkout 경로, loaded/idle/exit1. 다른 경로·프로젝트 수정 안 함.
- read-only 확인 순간 Node CPU 최대0.0%, memory 최대0.3%. 장기간 부하 검증이 아님.
- 중복 launchd 등록 없이 현재 로컬 서버에 저장 근거 검증 통합. 기존 외부 수집 주기는 변경하지 않음. 이번 로컬 서버는 재부팅 자동기동을 새로 설치하지 않았음.
근거 data/v2/verification/mac-mini-scheduler-inspection-20261012T0622.json.

WORKER IMPLEMENTATION:
기업별 순차 큐와 wx/PID 잠금, 종료된 PID 잠금 복구, 중단된 RUNNING 복구, 원천 해시 변경 재검증, 0600 상태/원천 식별자/실행 결과 스냅샷, 이전 결과 보존. 변경 없는 원천은 외부 요청 없이 skip. 상태 API GET /api/v2/peer-validation/status는 기존 API 인증과 no-store 적용, 오류503에서는 내부 경로/자료를 노출하지 않음.
캐시·소스별 제한·지수 백오프(최대3회)·재시작 후 대기/인증 차단 유지. LOGOUT/401/403은 자동재시도 금지. 실제 KIS/OpenDART의 허용된 읽기 전용 client 및 KRX/KIND/IR 공식 HTTPS host 제한 adapter 구성. 주문 operation 거부, redirect 우회 금지.
실행 중 자동 외부 수집은 비활성: 연결기를 구현한 것과 실제 자료 수집 완료를 구분. Scheduler는 최신 저장 보고서와 지정 DB 원문 감사 파일을 확인한다. 다른 raw 자료는 기존 정규화 파이프라인이 보고서에 반영해야 배수 재검증에 사용된다. 외부 자동 수집 end-to-end는 NOT RUN. 원천 요청 실패는 값을 만들지 않음.
저장 data/v2/peer-validation/state.json 및 runs/1791786440843-49558-23e32677b71e.json (Git 제외,600). 기존 원문/과거 보고서 변경 없음.

DB HITEK CORRECTION:
최초20260316001250 → 정정20260601001661 공식 ZIP SHA 재검사. 기존200항목/변경26/단위60 대조에 더해 변경 전후400숫자 셀을 TR/TD/TH/TE, rowspan/colspan 실제 좌표로 재추출·대조. 9개 합계 차이는 실제 원문 셀에도 존재하며 해당 셀의 파싱 오정렬은 배제.
Cause: BLOCKED_NO_OFFICIAL_EXPLANATION. 원인 설명 원문 미확보. 반올림·단위 오류라고 단정하지 않음, correctedValue=null / valuationInputEligible=false. 원문 비교 VERIFIED와 원인 검증 완료를 구분. Worker는 실제 ZIP과 numeric-audit 및 source-discrepancy-audit의 해시를 확인한 DB행에만 원인 상태 연결.
자료 data/v2/verification/db-correction-1791783200385/source-discrepancy-audit-20261012T062130Z.json.

ACTUAL SOURCES:
이번 외부 API/웹 원문 요청0회. 기존 공식 DART ZIP2, domestic H1 CFS/6월30일 주식수, KIS10/8 종가3, KRX HTTP400 LOGOUT, 공식 IR·SEC 기존 원천 재사용. 새로 확보한 것은 기존 원문400셀 재검증과 실제 Scheduler/Worker 상태 증거이며 새로운 시가총액 자료가 아님.
10/8 RAW 종가 SK1,681,000 / DB138,800 / 한미267,000 KRW. 날짜 미확인 KIS요약 자본은 결합하지 않음. 동일일 시가총액·주식수·전체 종류·기업행동 및 연결 사업 비교성 미검증. 글로벌3 기간·통화·20F/ADR·가격 근거 부족, MU10/9 미래 공시는10/8 평가에 사용 금지. 기존 Apple/SEC 자료 보존.

UI/UX: PASS(구현/아래 확인 범위)
Design System: 기존 HTML/CSS/JS, 사용자 light 기본+dark/system 유지, 운영 영역 dark, blue 강조, 상태 텍스트+배지, 로딩/오류/자료없음 상태. 실제 0표본이면 가짜 중앙값/차트 없음.
Web Dashboard: 실제 큐6·상태·소스·최근/다음 실행 시분초(KST)·로그 표시, 탭 visible 중30초 자동 조회/중복 요청 방지. 선택된 기업의 상세도 최신 상태로 함께 갱신.
Peer Comparison: 평가일·회사/코드·실제 종가와 날짜·미확인 시총/주식수·회계기간·사업 대기/제외·배수별 표본과 근거 버튼. 기준일 불명확한 항목은 자료 부족.
Company Detail: 배수별 쉬운 한국어 제외 사유, DB차이9건과 공식 설명 미확보, 공식 원천 링크. 긴 설명과 가로 표, 버튼 선택 시 상세로 이동.
기존 홈/종목 상세/모의 포트폴리오/지수/성과/설정 보존. 삼성전자 성과와 추천, Apple 추천 순위 HOLD. 기존 삼성TTM·공시/잔고·지수화면 실제 브라우저 회귀 확인.
Android: 기존 WebView와 native GET bridge로 동일 API 사용. native 수정/새APK 설치 없음.
Galaxy A33 Verification: PASS(이번 실제 확인 범위). SM-A336N / RFCW1178RRE만 입력. 비교6개/네 배수0/국내종가/가로스크롤 오른쪽 상태·버튼/DB 배수 보류 사유·9차이 미해결 문구/운영 dark상태/연결 실패·복구/force-stop 후 기존 앱 재실행·비교 복원 실제 캡처를 열어 확인. 매 입력/캡처 전 K-Stock 전면 앱 guard. 사용자 데이터 삭제 없음.
Web 실제12조건(320/360/390/768/1024/1440 × light/dark), 200% 글자, 문서 가로 넘침 없음. 별도 표 내부 가로 스크롤 사용.
증거 docs/uiux/peer-worker-{dashboard,comparison}-web.png / peer-worker-galaxy-{home,comparison,list,list-right,evidence,source,dashboard,failure,restored,relaunch}.png. 마지막 원인 미확보 문구는 이번 A33 source 캡처로 확인해 이전 NOT RUN 항목 일부 해소.

Regression Tests: 441 PASS / FAIL0 / skipped0 (baseline415 직접 재실행 PASS)
Android Contract Tests: 기존3 PASS / FAIL0, 추가 Worker native GET 계약1은 offline441에 포함
추가26: Worker18, 원문 파싱3, Web계약4, native Worker조회1.
COMMANDS: npm run test:offline; node --test test/android_external.test.js; node --check src/server.js; node --check src/v2/peer_validation_worker.js; node --check public/app.js; git diff --check.
실행 로그 /tmp/kstock-worker-{baseline,final,android,browser,existing-ui,status}.log. Android 첫 sandbox 시도 localhostbind 제한1FAIL은 로컬 소켓 허용 실행으로3PASS 확인. 최초 실제 Web상태조회는 API success 필드 누락으로 실패, 수정 후 전체 화면 재실행 PASS. 실패를 완료로 기록하지 않았음.
테스트 고정fixture/임시파일/localhost만 사용. 실제 외부 수집0. 설정된 비밀값의 src/scripts/public/test/docs 검색 결과0, 값 출력 없음.

Live Trading: OFF / brokerEnabled=false / externalAccess=false, 실제 /health 재확인
Real Orders: 0 (이번 주문/취소/계좌 API 호출0; 과거 외부 주문 원장 조회는 수행 안 함)
.env/인증정보/운영서버/공개배포/유료서비스/타프로젝트/기존launchd 변경 없음.

Modified Files:
src/v2/peer_validation_worker.js; src/server.js; scripts/run-peer-validation-worker.mjs; scripts/audit-db-correction-source.py; public/index.html; public/app.js; public/styles.css; test/peer_validation_worker.test.js; test/correction_source_parser.test.js; test/peer_worker_android_contract.test.js; test/candidate_ui.test.js; docs/KSTOCK_PEER_WORKER_API.md; docs/KSTOCK_QA_FOLLOWUP_REPORT.md; docs/AUTO_DEV_LOG.md; docs/uiux/peer-worker-*.png.
NOT RUN: 실제 외부 자동 수집 전체 사이클·인증된KRX 조회·새APK설치·Android OS200% 글자·전체6행의 모든원천 링크 탐색·Mac재부팅 자동기동·30분 실시간 장기운영/장기부하·운영인증/페어링·운영배포.
Blockers: 공식 DB9차이 원인 설명, 인증된KRX10/8 자본 자료/공식 CSV와 주식수 효력/전체종류 근거, 동기간 재무·사업 비교성 및 글로벌정규화. 기준 완화 없음.
Next Action: 인증된 KRX 세션 또는10/8 공식 내보내기 자료 확보 → 날짜/종류 자본 대사 및 기존 수집기 정규화 연결 → 실제 외부 자동 수집의 제한된 단일 사이클 검증 → 기업행동/사업 비교성과 기간 검증. DB 공식 설명 확보 전 차이9건 수치 보정 보류. 기존 launchd 이전checkout 경로 정리는 별도 경로 변경 범위를 확인 후 진행.
Overall: PARTIAL — 저장 근거 자동 검증과 상태 API·Web/A33 연결 완료, 외부 최신자료 자동 수집 및 실제 비교 표본 검증 미완료.

--- 이전 기록 (보존) ---

K-STOCK AI PEER DATA VALIDATION REPORT — 2026-10-12 / 변경 전후 수치 대사·동일일 자본 조회

PROJECT: /Users/ari/ARI/projects/k-stock-ai
BRANCH: auto/kstock-development-20260930
COMMIT: ea406852610c00bef0dbe469de95c42fca662c30 (기존 HEAD / 사용자 미커밋 작업 보존)
VERSION: package1.0.0 / server0.1.0 / Android2.6.5(265) 기존 앱
BASELINE: 이번 시작 시 Offline399 PASS 재실행 / Android3은 현재 실행 결과 별도
CURRENT TESTS: Offline415 / Android Contract3
PASS: 415 + 3 / FAIL: 0 / 자동 테스트 skipped0
COMMANDS: npm run test:offline; node --test test/android_external.test.js; node --check public/app.js; node --check scripts/probe-peer-historical-capital.mjs; git diff --check
최종 로그: /tmp/kstock-capital-final.log /tmp/kstock-capital-android.log /tmp/kstock-capital-browser.log
새 테스트16개: 날짜·종류·시총곱·원천·범위8, 원문 숫자/셀/대사완전성/합계한계6, Web 표시2. 고정fixture/로컬 계약만 사용, 테스트 중 외부 시세 수집 없음.
ANALYSIS TIME: 2026-10-12T06:04:01.028Z
GENERATED: 2026-10-12T06:04:01.048Z
새 입력의 분석 시각과 현재 진단 검토 시각 일치. 평가일10/8·원문 공시일·수집시각 구분. 과거 입력/분석 파일 수정 없음.

DB HITEK CORRECTION:
Original Document: 20260316001250 / 2026-03-16
Correction Document: 20260601001661 / 2026-06-01
공식 원문: https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260316001250 / https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260601001661
Corrected Fields: CFS/OFS 주석35, 2025·2024 외화금융자산/부채 8개 표. 계정×통화×측정종류 200개 항목을 정정 전후 셀 좌표로 연결.
숫자 변경26개 / 단위 필드 변경60개. 원화 환산100개 항목의 숫자·백만원 단위 모두 동일. CFS/OFS BS/IS 주요 재무표4개 원문 SHA 다시 대조 동일.
예시: CFS2025 현금 JPY 6 십만JPY → 554 천JPY. 600으로 추정하지 않음. CFS2025 기타지급채무 USD8,156 → 8,516 천USD; OFS2024 현금 USD30,611 →30,661 천USD. 값·단위 실제 셀 기록 사용.
단위 필드 변경60개에는 최초 EUR 단위 미명시20개가 포함. 원문에 없는 단위를 역산하지 않으며, 통화 단위 정규화 완료나 FX 환산 확인으로 보고하지 않음.
Effective As-of: 2026-10-08까지 조사된 정정 관계. 정정 이전일에는 최초 원문만 선택, 조사 종료 이후엔 CORRECTION_UNVERIFIED 유지.
Verification: VERIFIED_DIRECT_CELL_COMPARISON / sourceArchiveHashes ZIP2개 재검증 / 셀 값·좌표·중복 계정 차단 / 외화·원화 환산 쌍 누락 차단 / 주요4표 종류별 대조 확인. 전체 FX 산술 검증 완료는 아님.

추가 산술 검증: 동일 단위 합계76개 점검, 구성 항목 단순합과 차이9건. DIRECT_CELL_COMPARISON의 VERIFIED는 원문 전후 추적 판정이며, arithmeticStatus REVIEW_REQUIRED와 구분한다. valuationInputEligible=false. 반올림/단위/원문 기재의 원인을 단정하거나 수치를 수정하지 않음.
- CFS 2025 외화금융부채 / USD FOREIGN_CURRENCY / before / 합계554556 구성합54196 차이500360 천USD / 원인미확인
- CFS 2025 외화금융부채 / USD FOREIGN_CURRENCY / after / 합계554556 구성합54556 차이500000 천USD / 원인미확인
- CFS 2025 외화금융부채 / JPY FOREIGN_CURRENCY / after / 합계366952 구성합366950 차이2 천JPY / 원인미확인
- CFS 2024 외화금융부채 / USD KRW_TRANSLATED / before / 합계40026 구성합43889 차이-3863 백만원 / 원인미확인
- CFS 2024 외화금융부채 / USD KRW_TRANSLATED / after / 합계40026 구성합43889 차이-3863 백만원 / 원인미확인
- OFS 2024 외화금융자산 / USD FOREIGN_CURRENCY / after / 합계88974 구성합89024 차이-50 천USD / 원인미확인
- OFS 2025 외화금융부채 / USD KRW_TRANSLATED / before / 합계42431 구성합42432 차이-1 백만원 / 원인미확인
- OFS 2025 외화금융부채 / USD KRW_TRANSLATED / after / 합계42431 구성합42432 차이-1 백만원 / 원인미확인
- OFS 2025 외화금융부채 / JPY FOREIGN_CURRENCY / after / 합계361121 구성합361120 차이1 천JPY / 원인미확인

실제 근거: data/v2/verification/db-correction-1791783200385/numeric-audit.json (새로 추가, ignored0600); 기존 review.json·ZIP 원본 보존. 이번 DB 외부 읽기0회.

VALUATION DATE:
Date: 2026-10-08
Market Data Source: 기존 KIS 날짜별 종가 + 이번 KIS 기간별 시세 FHKST03010100 output2 재확인.
공식 기간별 API 정의: https://github.com/koreainvestment/open-trading-api/blob/main/examples_llm/domestic_stock/inquire_daily_itemchartprice/inquire_daily_itemchartprice.py
기간별 endpoint의 원주가 옵션은1; 기존 다른 daily-price endpoint 원주가 옵션0과 혼용 안 함. 이번 data basis RAW, 주문 API 호출 없음.
KIS production 시세 읽기만 실행. production 시세 API 사용과 운영 서버 변경/실거래 활성화는 별개이며 후자는 수행 안 함.

SAME-DATE CAPITAL INVESTIGATION:
국내3 모두 output2의 stck_bsop_date=20261008과 기존 종가 일치. 해당 날짜 행에는 시가총액·상장주식수 항목 없음.
output1 요약에는 lstn_stcn/hts_avls가 있지만 유효 기준일 없음. 현재 요약 가격도 종가와 다름:
- SK000660: 10/8 종가1,681,000 KRW / 날짜 미확인 요약가격1,609,000 KRW
- DB000990: 10/8 종가138,800 KRW / 날짜 미확인 요약가격131,000 KRW
- 한미042700: 10/8 종가267,000 KRW / 날짜 미확인 요약가격247,500 KRW
요청 날짜를 요약 자본에 붙이지 않음. 날짜 미확인 관측 주식수·시총은 그대로 별도 관측값이며 이번 평가 계산에 미사용.
KRX 날짜별 공식 조회: POST_READ_ONLY / trdDd20261008 / https://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd / 실제 HTTP400 text/html 본문LOGOUT. 검증 가능한 자료 없음. 실패 응답을 데이터0 또는 기업행동 부재로 해석 안 함.
인증된 KRX 조회 세션 또는 해당일 공식 내보내기 자료 필요. 로그인 우회·타인 계정·인증정보 변경 없음.
실제 저장: peer-historical-capital-probe-1791784112132.json / peer-krx-capital-probe-1791784132572.json (data/v2/verification).

PEER COMPANIES:
Candidates: 6
Price Verified: 국내3 날짜·종가 재확인 / 글로벌3 이번 신규 수집 없음
Market Cap Verified: 동일10/8 전체 자본0/6
Share Count Verified: 동일10/8 현재 주식수0/6; 기존 국내3의6/30 보고서 값·8/14 공시 근거 보존
Financial Data Verified: 기존 국내3 H1 CFS 자본 및 연간 자료 보존, DB 원문 숫자 추가대사. 기간/TTM/자본총계 vs 지배지분 정의는 별도 검증.
Business Fit Verified: 삼성 연결 전체 비교0/6. 사업 원천 정체성 확인과 비교 가능 판정 구분, 기준 완화 없음.
PER Eligible: 0
PBR Eligible: 0
PSR Eligible: 0
EV/EBITDA Eligible: 0
최소 표본 각3. 중앙값/차이 null. 6개 대상 독립 검증 모듈 실제 재실행, 표본 부족을 임의 계산으로 해소 안 함.

COMPANY EXCLUSIONS:

Company: 에스케이하이닉스(주) (000660)
Missing Data: MISSING_MARKET_CAP, SHARE_COUNT_DATE_OR_PUBLICATION_UNVERIFIED, CURRENT_CAPITAL_SOURCE_UNVERIFIED, MISSING_FINANCIAL_DATA, VERIFIED_EV_INPUTS_REQUIRED, VERIFIED_EBITDA_INPUTS_REQUIRED
Reason: MISSING_MARKET_CAP, SHARE_COUNT_DATE_OR_PUBLICATION_UNVERIFIED, CURRENT_CAPITAL_SOURCE_UNVERIFIED, CORPORATE_ACTION_UNVERIFIED, BUSINESS_COMPARABILITY_UNVERIFIED, BUSINESS_MODEL_MISMATCH, FINANCIAL_PERIOD_MISMATCH, MISSING_FINANCIAL_DATA, VERIFIED_EV_INPUTS_REQUIRED, VERIFIED_EBITDA_INPUTS_REQUIRED
Next Action: 10/8에 유효한 주식 종류별 시총·상장수와 현재 자기주식/실제 효력 근거, 보고서 이후 연속성, 동기간 재무·사업 비교성 확보.

Company: 주식회사 DB하이텍 (000990)
Missing Data: MISSING_MARKET_CAP, SHARE_COUNT_DATE_OR_PUBLICATION_UNVERIFIED, CURRENT_CAPITAL_SOURCE_UNVERIFIED, MISSING_FINANCIAL_DATA, VERIFIED_EV_INPUTS_REQUIRED, VERIFIED_EBITDA_INPUTS_REQUIRED
Reason: MISSING_MARKET_CAP, SHARE_COUNT_DATE_OR_PUBLICATION_UNVERIFIED, CURRENT_CAPITAL_SOURCE_UNVERIFIED, CORPORATE_ACTION_UNVERIFIED, BUSINESS_SOURCE_UNVERIFIED, BUSINESS_COMPARABILITY_UNVERIFIED, BUSINESS_MODEL_MISMATCH, FINANCIAL_PERIOD_MISMATCH, MISSING_FINANCIAL_DATA, VERIFIED_EV_INPUTS_REQUIRED, VERIFIED_EBITDA_INPUTS_REQUIRED
Next Action: 10/8에 유효한 주식 종류별 시총·상장수와 현재 자기주식/실제 효력 근거, 보고서 이후 연속성, 동기간 재무·사업 비교성 확보.

Company: 한미반도체(주) (042700)
Missing Data: MISSING_MARKET_CAP, SHARE_COUNT_DATE_OR_PUBLICATION_UNVERIFIED, CURRENT_CAPITAL_SOURCE_UNVERIFIED, MISSING_FINANCIAL_DATA, VERIFIED_EV_INPUTS_REQUIRED, VERIFIED_EBITDA_INPUTS_REQUIRED
Reason: MISSING_MARKET_CAP, SHARE_COUNT_DATE_OR_PUBLICATION_UNVERIFIED, CURRENT_CAPITAL_SOURCE_UNVERIFIED, CORPORATE_ACTION_UNVERIFIED, BUSINESS_COMPARABILITY_UNVERIFIED, BUSINESS_MODEL_MISMATCH, FINANCIAL_PERIOD_MISMATCH, MISSING_FINANCIAL_DATA, VERIFIED_EV_INPUTS_REQUIRED, VERIFIED_EBITDA_INPUTS_REQUIRED
Next Action: 10/8에 유효한 주식 종류별 시총·상장수와 현재 자기주식/실제 효력 근거, 보고서 이후 연속성, 동기간 재무·사업 비교성 확보.

Company: Micron Technology (MU)
Missing Data: MISSING_MARKET_CAP, MISSING_PRICE, PRICE_DATE_UNVERIFIED, MISSING_FINANCIAL_DATA, FINANCIAL_PUBLICATION_UNVERIFIED, MISSING_SHARE_COUNT, CURRENT_CAPITAL_SOURCE_UNVERIFIED, VERIFIED_EV_INPUTS_REQUIRED, VERIFIED_EBITDA_INPUTS_REQUIRED
Reason: MISSING_MARKET_CAP, MISSING_PRICE, PRICE_DATE_UNVERIFIED, MISSING_FINANCIAL_DATA, CURRENCY_MISMATCH, AMOUNT_UNIT_MISMATCH, FINANCIAL_PERIOD_MISMATCH, FINANCIAL_PUBLICATION_UNVERIFIED, MISSING_SHARE_COUNT, CURRENT_CAPITAL_SOURCE_UNVERIFIED, CORPORATE_ACTION_UNVERIFIED, BUSINESS_SOURCE_UNVERIFIED, BUSINESS_COMPARABILITY_UNVERIFIED, BUSINESS_MODEL_MISMATCH, VERIFIED_EV_INPUTS_REQUIRED, VERIFIED_EBITDA_INPUTS_REQUIRED
Next Action: 기존 provider 제한을 준수한 날짜별 미국가격, SEC 회계/IFRS/20F·ADR·원통화 정의, 비교 정책 검증. MU 평가일 이후10/9 공시 사용 금지.

Company: TSMC (TSM)
Missing Data: MISSING_MARKET_CAP, MISSING_PRICE, PRICE_DATE_UNVERIFIED, MISSING_FINANCIAL_DATA, FINANCIAL_PUBLICATION_UNVERIFIED, MISSING_SHARE_COUNT, CURRENT_CAPITAL_SOURCE_UNVERIFIED, VERIFIED_EV_INPUTS_REQUIRED, VERIFIED_EBITDA_INPUTS_REQUIRED
Reason: MISSING_MARKET_CAP, MISSING_PRICE, PRICE_DATE_UNVERIFIED, MISSING_FINANCIAL_DATA, CURRENCY_MISMATCH, AMOUNT_UNIT_MISMATCH, FINANCIAL_PERIOD_MISMATCH, FINANCIAL_PUBLICATION_UNVERIFIED, MISSING_SHARE_COUNT, CURRENT_CAPITAL_SOURCE_UNVERIFIED, CORPORATE_ACTION_UNVERIFIED, BUSINESS_SOURCE_UNVERIFIED, BUSINESS_COMPARABILITY_UNVERIFIED, BUSINESS_MODEL_MISMATCH, VERIFIED_EV_INPUTS_REQUIRED, VERIFIED_EBITDA_INPUTS_REQUIRED
Next Action: 기존 provider 제한을 준수한 날짜별 미국가격, SEC 회계/IFRS/20F·ADR·원통화 정의, 비교 정책 검증. MU 평가일 이후10/9 공시 사용 금지.

Company: United Microelectronics (UMC)
Missing Data: MISSING_MARKET_CAP, MISSING_PRICE, PRICE_DATE_UNVERIFIED, MISSING_FINANCIAL_DATA, FINANCIAL_PUBLICATION_UNVERIFIED, MISSING_SHARE_COUNT, CURRENT_CAPITAL_SOURCE_UNVERIFIED, VERIFIED_EV_INPUTS_REQUIRED, VERIFIED_EBITDA_INPUTS_REQUIRED
Reason: MISSING_MARKET_CAP, MISSING_PRICE, PRICE_DATE_UNVERIFIED, MISSING_FINANCIAL_DATA, CURRENCY_MISMATCH, AMOUNT_UNIT_MISMATCH, FINANCIAL_PERIOD_MISMATCH, FINANCIAL_PUBLICATION_UNVERIFIED, MISSING_SHARE_COUNT, CURRENT_CAPITAL_SOURCE_UNVERIFIED, CORPORATE_ACTION_UNVERIFIED, BUSINESS_SOURCE_UNVERIFIED, BUSINESS_COMPARABILITY_UNVERIFIED, BUSINESS_MODEL_MISMATCH, VERIFIED_EV_INPUTS_REQUIRED, VERIFIED_EBITDA_INPUTS_REQUIRED
Next Action: 기존 provider 제한을 준수한 날짜별 미국가격, SEC 회계/IFRS/20F·ADR·원통화 정의, 비교 정책 검증. MU 평가일 이후10/9 공시 사용 금지.

IMPLEMENTATION:
- correction_numeric_audit.js: 원문 숫자·단위·셀 직접 대사. 외화/원화 쌍·중복 항목·4종류 primary 표 완전성 검증.
- dated_capital_observation.js: 응답 기준일·종목·COMMON/PREFERRED·LISTED_ISSUED·통화·시총=종가×상장수 확인, 안전정수 범위 초과 차단. 클래스 하나 확인이 전체 자본/자기주식 확인을 뜻하지 않음. 이번 입력은 자료 미확보라 PENDING.
- apply-peer-data-validation.mjs: 기존 원천 해시 검증 후 수치 감사/실패 응답 근거 연결, 같은 기준일로6기업 재평가, 새 분석 시각 기록. 기존 peers/Apple·SEC/evidence/삼성 price·financial·shareCount/RAW/rightsInvestigation deepEqual 보존.
- Web: 변경 전후200개 표, 정확한 단위, 미명시 제한, 동일일 자본 부족/응답실패 이유 표시. 가로 스크롤·접근성 role 유지.

CORPORATE ACTIONS:
Coverage: 기존21개 원문·공식8/21 보통주79,870,794주 대사 보존. 새 전수 원천 수집0.
Pending: 6/30 이후 현재 발행수·자기주식·소각 효력·전체 종류 포함 범위. 이번 실패를 무사건으로 추정 안 함.
SAMSUNG PERFORMANCE: HOLD
BENCHMARK: 삼성전자 동일기간 수익률 비교 HOLD, 기존 지수 자체 자료 보존
RECOMMENDATION: HOLD (삼성전자 및 Apple 유지; 전체 candidate.approved=false 확인)
LIVE TRADING: OFF / .env broker/live disabled true / health brokerEnabled=false,liveTrading=false,externalAccess=false,mode=mock
REAL ORDERS: 이번0 / 실제 주문·취소·계좌 API0회. 외부 계좌 전체 과거 거래내역 조회 NOT RUN.

WEB UI: PASS 확인 범위. 6기업/4배수 표본0, DB원문2/8표·200항목, 직접 변경6→554와단위, KIS 과거종가/undated요약 분리, KRX400/LOGOUT, 기존TTM/잔고/기업행동 회귀. 320/360/390/768/1024/1440 ×2테마12조건, 긴 대사표 열린 상태 글자200% 페이지 넘침 없음. 수치표 가로스크롤 이동300px/영역305px/전체605px 확인.
증거: docs/uiux/capital-audit-{web,numeric-web,numeric-right-web}.png.
GALAXY A33: PASS 확인 범위. RFCW1178RRE ai.kstock.mobile.localvalidation 기존 앱, 기준일/표본0/DB138800·요약131000·KRX실패사유·대사200 요약·새표 펼침·스크롤·변경전6 십만JPY와변경후554 천JPY 직접 확인. 연결 실패·USB복구 확인. 캡처를 실제 열어 대조함.
증거: capital-audit-galaxy-{date,source,numeric,numeric-right,failure,restored}.png.
실기기 제한: 마지막 추가 산술 차이9건 문구의 재확인은 NOT RUN. KSTOCK_NOT_FOREGROUND_INPUT_BLOCKED로 다른 앱 전경에서 입력을 보내지 않았다. 앞서 같은 작업에서 기준일·자료부족·수치표·가로스크롤·네트워크 실패복구는 실제 확인했다.
INSTALL: NOT RUN (Web 데이터/화면 갱신, APK 변경 없음).

EXTERNAL AUDIT:
2026-10-12 UTC05:48 확인: 공식KIS 문서GET1 + token1 + 시장3 + KRX조회1 = 실제6회. KIS API3성공, KRX1실패HTTP400/LOGOUT. DB숫자 대사 외부0회. 대량 호출/유료 사용/쿨다운 우회 없음.
스크립트: scripts/probe-peer-historical-capital.mjs. 향후 재실행의 공식문서 읽기 계수도 실제 fetch로 맞춤; 이번 근거는 별도 공식문서 수집해시 포함 기존 probe.
SECRETS: configured secret scan src/scripts/public/test/docs 원문일치0; .env 변경 없음. 저장 증거 ignored/0600.
MODIFIED FILES: src/v2/correction_numeric_audit.js; src/v2/dated_capital_observation.js; test/correction_numeric_audit.test.js; test/dated_capital_observation.test.js; test/candidate_ui.test.js; scripts/probe-peer-historical-capital.mjs; scripts/apply-peer-data-validation.mjs; public/app.js; docs/KSTOCK_QA_FOLLOWUP_REPORT.md; docs/AUTO_DEV_LOG.md; docs/uiux/capital-audit*.png; ignored 새 증거/입력/보고서latest.
NOT RUN: 마지막 산술 제한 문구의 A33 표시 재확인, 인증된 KRX자료 확보, 같은날 전체 자본/자기주식 확정, 실제 배수·추천·성과 활성화, OS200%글자, 실기기 전200행·6기업 상세 전수 대조, APK재설치, 운영/외부공개/실주문.
BLOCKERS: 주석 합계·구성합 차이9건 원인/최초단위미명시20건, KRX 인증 세션/공식 날짜별 내보내기 부재, KIS dated행 자본 필드 미제공, 보고서 이후 주식수·기업행동 bridge 및 전체 주식 종류, 연결 사업 적합성, TTM/EV·EBITDA 입력, 글로벌 회계/ADR·환산.
NEXT ACTION: 인증된 날짜별 KRX 자료 또는 동일10/8 공식CSV 확보 → 주식 종류별 시가총액·발행/자기주식·실효 사건 대사 → 최신 자본 증거 연결 → 6기업 배수별 표본 재평가. 추천/성과 gate 유지.
OVERALL: PARTIAL. DB 변경 전후 직접 수치 대사 완료. 동일일 자본 원천 조사·차단 구현·6기업 재평가·Web/A33·회귀 검증 완료. 동일일 시가총액/현재주식수 자료 확보 및 기업가치 비교 자체는 미완료.


--- 이전 기록 (보존) ---

K-STOCK AI PEER DATA VALIDATION REPORT — 2026-10-12

PROJECT: /Users/ari/ARI/projects/k-stock-ai
BRANCH: auto/kstock-development-20260930
COMMIT: ea406852610c00bef0dbe469de95c42fca662c30 (기존 HEAD / 미커밋 변경 보존)
VERSION: package 1.0.0 / server 0.1.0 / 기존 Android 2.6.5(265)
BASELINE: 이번 시작 시 Offline376 PASS 재실행. Android3 현재 결과는 아래 별도 실행.
CURRENT TESTS: Offline399 / Android Contract3
PASS: 399 + 3 / FAIL: 0
COMMANDS: npm run test:offline; node --test test/android_external.test.js; node --check public/app.js; git diff --check.
실제 최종 로그: /tmp/kstock-peerdata-final.log /tmp/kstock-peerdata-android.log /tmp/kstock-peerdata-browser.log.
자동 테스트는 고정 fixture, 통제되지 않은 외부 수집 없음. 신규 정정8+날짜1, 기준일/자본10, 배수선택2, UI2=23개.

DB HITEK CORRECTION:
Original Document: 20260316001250 / 2026-03-16 / https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260316001250
Correction Document: 20260601001661 / 2026-06-01 / https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260601001661
Corrected Fields: 연결·별도 주석35 외화금융자산/부채, 2025·2024, 총8개 전후 원문표 추적. 통화 단위 기재오류이며 숫자 자체 변경도 포함.
전후 예시: CFS2025 외화자산 JPY 기초통화금액6 → JPY[천]554. CFS2025 외화부채 JPY 합계3,669 → JPY[천]366,952. OFS2024 USD 현금30,611 → 30,661. 단순100배/환율로 재계산하지 않음.
연결·별도 재무상태표/손익계산서 4개 원문표는 공백 정규화 대조 동일. 공시 접수일·회계기간 확인 후 DB 연간 정정 차단만 해제; 현재 자본/사업/기간 gate 유지.
Effective As-of: 2026-10-08까지 공개된 정정 원문 사용. 5/31 분석에는 최초 원문만 선택, 정정 값 없음. 3/16 이전 NOT_AVAILABLE. 목록 조사 종료10/8을 넘으면 CORRECTION_UNVERIFIED.
Verification: VERIFIED (원문 ZIP2개 SHA256 검증, 최초 제출일과 정정 본문 관계, A유형 공시 목록3/16~10/8 전체4건/1페이지, 후속 사업보고서 정정 없음).
근거/8개 전후/4표 해시: data/v2/verification/db-correction-1791783200385/review.json 및 ZIP2개. Git 제외, 0600. 과거 기록 수정 없음.

VALUATION DATE:
Date: 2026-10-08 (삼성 저장 RAW 종가와 국내3 공식 응답 stck_bsop_date 실제 일치)
Market Data Source: KIS inquire-daily-price / adjustment0 RAW. 요청일이 아니라 응답 거래일 행을 선택하고 중복/수치 대조.
평가 날짜와 분석/수집 시각은 별도. 당일 정확한 최초 공개시각 availableAt은 응답에 없어 null 유지. 그 값을 검증되었다고 만들지 않음.
국내3 날짜별 종가: SK하이닉스1,681,000 / DB하이텍138,800 / 한미반도체267,000 KRW 보통주.
가격 API에는 기준일 시가총액·주식수 없음. 기존 undated quote시총과 결합하지 않음. 글로벌3 종가 미확보.

PEER COMPANIES:
Candidates: 6
Price Verified: 3/6 거래일·종가 원천 확인. 정확한 당시 공개시각은 별도 미확인.
Market Cap Verified: 0/6 (이번 기준일 전체 주식 종류의 시가총액 없음)
Share Count Verified: 0/6 현재 기준일. 국내3 보고서6/30 주식수 관측 보존, 공시 이용 가능시점8/14 근거 연결; 이후 전체 자본 변동 범위 미검증.
Financial Data Verified: 국내3 반기 CFS 원천 기간/6개 주요 계정 확인. 연간/TTM·배수별 최종 적합성은 별도. PBR은 최신 반기 자본을 독립 선택; 연간 손익과 혼합 없음.
Business Fit Verified: 0/6 삼성 연결기업 전체 적합성. 공식 사업 정체성6개 확인과 구분.
PER Eligible: 0 / PBR Eligible: 0 / PSR Eligible: 0 / EV/EBITDA Eligible: 0 / 최소 각3 유지.
중앙값·상대차이 null, 추천 승인 없음.

COMPANY EXCLUSIONS:

Company: 에스케이하이닉스(주) (000660)
Missing Data: MISSING_MARKET_CAP, SHARE_COUNT_DATE_OR_PUBLICATION_UNVERIFIED, CURRENT_CAPITAL_SOURCE_UNVERIFIED, MISSING_FINANCIAL_DATA, VERIFIED_EV_INPUTS_REQUIRED, VERIFIED_EBITDA_INPUTS_REQUIRED
Reason: MISSING_MARKET_CAP, SHARE_COUNT_DATE_OR_PUBLICATION_UNVERIFIED, CURRENT_CAPITAL_SOURCE_UNVERIFIED, CORPORATE_ACTION_UNVERIFIED, BUSINESS_COMPARABILITY_UNVERIFIED, BUSINESS_MODEL_MISMATCH, FINANCIAL_PERIOD_MISMATCH, MISSING_FINANCIAL_DATA, VERIFIED_EV_INPUTS_REQUIRED, VERIFIED_EBITDA_INPUTS_REQUIRED
Price: 1,681,000 KRW / 2026-10-08 / 보통주 RAW. 기준일 시총 null.
Financial: CFS / KRW / 2026-06-30 / 공시2026-08-14 / 자본총계 262,693,228,000,000 / 지배소유주지분 262,380,610,000,000 (동일 정의로 치환 안 함).
Shares: COMMON / 2026-06-30 / 발행712702365 / 자기1626865 / 유통711075500 / 평가일까지 효력 연속성 미검증.
Shares: PREFERRED / 2026-06-30 / 발행None / 자기None / 유통None / 평가일까지 효력 연속성 미검증.
Shares: TOTAL / 2026-06-30 / 발행712702365 / 자기1626865 / 유통711075500 / 평가일까지 효력 연속성 미검증.
Business: COMPARABILITY_UNVERIFIED / 메모리 분야 제품 중첩. 삼성 연결기업의 DX·SDC·HARMAN과 파운드리·시스템LSI까지 동일 사업 범위인지는 증명되지 않음. / 검토2026-10-12 / 반도체 비중 추정 없음.
Next Action: 공식 기준일 전체 주식 종류·가격·시총 정의와 6/30 이후 자본 효력 구간 확보, 같은 기간 비교 검증.

Company: 주식회사 DB하이텍 (000990)
Missing Data: MISSING_MARKET_CAP, SHARE_COUNT_DATE_OR_PUBLICATION_UNVERIFIED, CURRENT_CAPITAL_SOURCE_UNVERIFIED, MISSING_FINANCIAL_DATA, VERIFIED_EV_INPUTS_REQUIRED, VERIFIED_EBITDA_INPUTS_REQUIRED
Reason: MISSING_MARKET_CAP, SHARE_COUNT_DATE_OR_PUBLICATION_UNVERIFIED, CURRENT_CAPITAL_SOURCE_UNVERIFIED, CORPORATE_ACTION_UNVERIFIED, BUSINESS_SOURCE_UNVERIFIED, BUSINESS_COMPARABILITY_UNVERIFIED, BUSINESS_MODEL_MISMATCH, FINANCIAL_PERIOD_MISMATCH, MISSING_FINANCIAL_DATA, VERIFIED_EV_INPUTS_REQUIRED, VERIFIED_EBITDA_INPUTS_REQUIRED
Price: 138,800 KRW / 2026-10-08 / 보통주 RAW. 기준일 시총 null.
Financial: CFS / KRW / 2026-06-30 / 공시2026-08-14 / 자본총계 2,561,198,976,740 / 지배소유주지분 2,393,709,284,799 (동일 정의로 치환 안 함).
Shares: COMMON / 2026-06-30 / 발행43504588 / 자기736215 / 유통42768373 / 평가일까지 효력 연속성 미검증.
Shares: PREFERRED / 2026-06-30 / 발행112579 / 자기10621 / 유통101958 / 평가일까지 효력 연속성 미검증.
Shares: TOTAL / 2026-06-30 / 발행43617167 / 자기746836 / 유통42870331 / 평가일까지 효력 연속성 미검증.
Business: COMPARABILITY_UNVERIFIED / 삼성 DS 파운드리 일부와 사업모델 중첩. 메모리·기기·디스플레이를 포함하는 삼성 연결전체와 비교 적합성 미확인. / 검토2026-10-12 / 반도체 비중 추정 없음.
Next Action: 공식 기준일 전체 주식 종류·가격·시총 정의와 6/30 이후 자본 효력 구간 확보, 같은 기간 비교 검증.

Company: 한미반도체(주) (042700)
Missing Data: MISSING_MARKET_CAP, SHARE_COUNT_DATE_OR_PUBLICATION_UNVERIFIED, CURRENT_CAPITAL_SOURCE_UNVERIFIED, MISSING_FINANCIAL_DATA, VERIFIED_EV_INPUTS_REQUIRED, VERIFIED_EBITDA_INPUTS_REQUIRED
Reason: MISSING_MARKET_CAP, SHARE_COUNT_DATE_OR_PUBLICATION_UNVERIFIED, CURRENT_CAPITAL_SOURCE_UNVERIFIED, CORPORATE_ACTION_UNVERIFIED, BUSINESS_COMPARABILITY_UNVERIFIED, BUSINESS_MODEL_MISMATCH, FINANCIAL_PERIOD_MISMATCH, MISSING_FINANCIAL_DATA, VERIFIED_EV_INPUTS_REQUIRED, VERIFIED_EBITDA_INPUTS_REQUIRED
Price: 267,000 KRW / 2026-10-08 / 보통주 RAW. 기준일 시총 null.
Financial: CFS / KRW / 2026-06-30 / 공시2026-08-14 / 자본총계 746,888,948,978 / 지배소유주지분 746,888,948,978 (동일 정의로 치환 안 함).
Shares: TOTAL / 2026-06-30 / 발행95312200 / 자기459198 / 유통94853002 / 평가일까지 효력 연속성 미검증.
Business: MISMATCH / 고객사의 설비투자를 바탕으로 하는 장비업체이며 반도체 소자 제조사와 수익모델 차이 확인. 삼성 연결전체의 비교군에는 부적합. / 검토2026-10-12 / 반도체 비중 추정 없음.
Next Action: 공식 기준일 전체 주식 종류·가격·시총 정의와 6/30 이후 자본 효력 구간 확보, 같은 기간 비교 검증.

Company: Micron Technology (MU)
Missing Data: MISSING_MARKET_CAP, MISSING_PRICE, PRICE_DATE_UNVERIFIED, MISSING_FINANCIAL_DATA, FINANCIAL_PUBLICATION_UNVERIFIED, MISSING_SHARE_COUNT, CURRENT_CAPITAL_SOURCE_UNVERIFIED, VERIFIED_EV_INPUTS_REQUIRED, VERIFIED_EBITDA_INPUTS_REQUIRED
Reason: MISSING_MARKET_CAP, MISSING_PRICE, PRICE_DATE_UNVERIFIED, MISSING_FINANCIAL_DATA, CURRENCY_MISMATCH, AMOUNT_UNIT_MISMATCH, FINANCIAL_PERIOD_MISMATCH, FINANCIAL_PUBLICATION_UNVERIFIED, MISSING_SHARE_COUNT, CURRENT_CAPITAL_SOURCE_UNVERIFIED, CORPORATE_ACTION_UNVERIFIED, BUSINESS_SOURCE_UNVERIFIED, BUSINESS_COMPARABILITY_UNVERIFIED, BUSINESS_MODEL_MISMATCH, VERIFIED_EV_INPUTS_REQUIRED, VERIFIED_EBITDA_INPUTS_REQUIRED
Business: COMPARABILITY_UNVERIFIED / 삼성 메모리 제품과 중첩하나 삼성 연결전체의 다각화 사업과 동일성 미확인. 미국 기반 글로벌 생산 구조. / 검토2026-10-12 / 반도체 비중 추정 없음.
Next Action: 무료 가격 제공자 쿨다운 정상 종료 후 제한 수집, SEC 회계·ADR·원통화·환산 기준 독립 검증.

Company: TSMC (TSM)
Missing Data: MISSING_MARKET_CAP, MISSING_PRICE, PRICE_DATE_UNVERIFIED, MISSING_FINANCIAL_DATA, FINANCIAL_PUBLICATION_UNVERIFIED, MISSING_SHARE_COUNT, CURRENT_CAPITAL_SOURCE_UNVERIFIED, VERIFIED_EV_INPUTS_REQUIRED, VERIFIED_EBITDA_INPUTS_REQUIRED
Reason: MISSING_MARKET_CAP, MISSING_PRICE, PRICE_DATE_UNVERIFIED, MISSING_FINANCIAL_DATA, CURRENCY_MISMATCH, AMOUNT_UNIT_MISMATCH, FINANCIAL_PERIOD_MISMATCH, FINANCIAL_PUBLICATION_UNVERIFIED, MISSING_SHARE_COUNT, CURRENT_CAPITAL_SOURCE_UNVERIFIED, CORPORATE_ACTION_UNVERIFIED, BUSINESS_SOURCE_UNVERIFIED, BUSINESS_COMPARABILITY_UNVERIFIED, BUSINESS_MODEL_MISMATCH, VERIFIED_EV_INPUTS_REQUIRED, VERIFIED_EBITDA_INPUTS_REQUIRED
Business: COMPARABILITY_UNVERIFIED / 삼성 파운드리와 일부 중첩하나 전업 파운드리와 삼성 연결기업 전체는 사업구조 차이. 대만 중심 글로벌 생산 구조. / 검토2026-10-12 / 반도체 비중 추정 없음.
Next Action: 무료 가격 제공자 쿨다운 정상 종료 후 제한 수집, SEC 회계·ADR·원통화·환산 기준 독립 검증.

Company: United Microelectronics (UMC)
Missing Data: MISSING_MARKET_CAP, MISSING_PRICE, PRICE_DATE_UNVERIFIED, MISSING_FINANCIAL_DATA, FINANCIAL_PUBLICATION_UNVERIFIED, MISSING_SHARE_COUNT, CURRENT_CAPITAL_SOURCE_UNVERIFIED, VERIFIED_EV_INPUTS_REQUIRED, VERIFIED_EBITDA_INPUTS_REQUIRED
Reason: MISSING_MARKET_CAP, MISSING_PRICE, PRICE_DATE_UNVERIFIED, MISSING_FINANCIAL_DATA, CURRENCY_MISMATCH, AMOUNT_UNIT_MISMATCH, FINANCIAL_PERIOD_MISMATCH, FINANCIAL_PUBLICATION_UNVERIFIED, MISSING_SHARE_COUNT, CURRENT_CAPITAL_SOURCE_UNVERIFIED, CORPORATE_ACTION_UNVERIFIED, BUSINESS_SOURCE_UNVERIFIED, BUSINESS_COMPARABILITY_UNVERIFIED, BUSINESS_MODEL_MISMATCH, VERIFIED_EV_INPUTS_REQUIRED, VERIFIED_EBITDA_INPUTS_REQUIRED
Business: COMPARABILITY_UNVERIFIED / 삼성 파운드리와 일부 중첩하나 삼성 연결전체와 동질성 미확인. 대만 및 아시아 생산 구조. / 검토2026-10-12 / 반도체 비중 추정 없음.
Next Action: 무료 가격 제공자 쿨다운 정상 종료 후 제한 수집, SEC 회계·ADR·원통화·환산 기준 독립 검증.

GLOBAL SOURCE LIMITS:
SEC3 reads로 CIK 확인: MU0000723125 / TSM0001046179 / UMC0001033767. 발행인/종목 일치 확인. companyfacts 재무 수집 없음.
MU 최근 목록10-K 2026-10-09 / 회계2026-09-03: 평가일 이후여서 사용 차단. 이전 공개10-K·분기 자료는 추가 수집/정규화 필요.
TSM20-F 공시2026-04-16 / UMC20-F4/30 / 회계2025-12-31: 목록만 확인, IFRS·원통화·ADR 정의 필요. Apple 10-K/us-gaap 파서로 억지 정규화하지 않음.
Alpha Vantage 설정은 존재, 기존 cooldown 유지(blockedUntil1791786456078), 가격 읽기0회/우회0. 무료 SEC 불가능이 아님. 데이터 미확보와 통화·사업 제외 정책을 구분.

VALIDATION CHANGES:
신규 valuation_asof: 가격/시가총액 증거 분리, 보통·우선 종류별 가격×발행수 합계, 자기주식은 발행수에서 빼지 않음. 과거 보고서 이후 기업행동 bridge·공개시점·미래 이벤트 차단, 공식 시총 차이 보류. 아직 실제 현재 자본 VERIFIED 객체 생성 안 함.
peer_metric_diagnosis: PBR 반기 자본과 연간/TTM 손익 독립 선택. 공식 사업 source host 누락3곳 보완; 출처 공개근거/비교 적합성/업종 분류 차이 별도 사유. 단순 호스트 승인으로 표본 증가 안 함.
기존 추천·annualMultiples·가격수익률 gate 불변. 기존 peers/Apple·SEC/evidence/RAW/삼성 price·financial·shareCount·rightsInvestigation deepEqual 보존.

CORPORATE ACTIONS:
Coverage: 기존21개 원문 조사·공식8/21 보통주79,870,794주 대사 보존; 새 기업행동 범위 수집0회.
Pending: 보고서 기준일 이후 발행수·자기주식·소각 등 전체 영향/범위. 자기주식 취득·처분을 발행수 변화로 자동 적용 안 함. 소각 확정 효력 미확인.
SAMSUNG PERFORMANCE: HOLD / RAW29 8/26~10/8 보존, 전체 기업행동 coverage 부족.
BENCHMARK: 삼성전자 동일기간 비교 HOLD / 기존 KOSPI·KOSDAQ 지수 자체50거래일 보존.

WEB UI: PASS (현재값→비교·근거·한계). 기준일, 국내3 종가/옛시총 분리, 자본총계/지배지분, 사업 한계, DB2원문/8전후, SEC 미래공시 제외, 배수0/최소3. Chrome 12폭/테마 조건 및200% 글자, 펼친 긴 정정 텍스트 페이지 넘침 없음. docs/uiux/peer-data-web.png.
GALAXY A33: PASS 확인 범위. RFCW1178RRE 기존 localvalidation 앱: 삼성 상세·10/8 평가일·DB138800 KRW·옛시총 별도·정정 관계/공시6/1·8전후 펼침·스크롤·유효0/최소3 표·가로스크롤·연결실패/USB복구 스크린샷 직접 검토. docs/uiux/peer-data-galaxy-{date,price,correction,changes,failure,restored}.png.
로컬 서버 이전 입력 경로 발견 → 최신 저장 보고서(data/v2/reports/latest.json) 읽도록 해당 localhost3000 서버만 재시작. 운영·.env 미변경. 이전 사업근거 형식의 reviewedAt 누락 렌더 오류 수정, 회귀 테스트 추가.
RECOMMENDATION: HOLD (삼성·Apple 유지)
LIVE TRADING: OFF / health mode mock, brokerEnabled false, liveTrading false, externalAccess false. 주문 기능 활성화 없음.
REAL ORDERS: 이번0 (주문·취소·계좌 API 호출 없음). 외부 계좌 과거 거래내역 전체 조회 NOT RUN.

EXTERNAL READ AUDIT:
2026-10-12 UTC05:33~05:42: KIS 시장3+토큰1 / OpenDART3 / SEC3 = 직접10 요청, 실패0. 사업 공식 web open2호출/7페이지, find2호출/5작업, 검색0. 신규 유료·계정·인증값 변경 없음.
기존 H1 raw 재사용으로 자본·지배지분·현금·부채 추출 외부0회. 원천 hash 검증, ignored0600 저장. 새 collected files peer-dated-prices-1791783223569, peer-balance-evidence-1791783285689, peer-business-fit-review-1791783275162, global-peer-identity-1791783714687 및 db-correction-1791783200385. 설정 secret 원문 scan src/scripts/public/test/docs 일치0.

MODIFIED FILES:
src/v2/disclosure_correction.js; src/v2/valuation_asof.js; src/v2/peer_metric_diagnosis.js; test/disclosure_correction.test.js; test/valuation_asof.test.js; test/peer_metric_diagnosis.test.js; test/candidate_ui.test.js; scripts/collect-peer-dated-prices.mjs; scripts/extract-peer-balance-evidence.mjs; scripts/collect-global-peer-identity.mjs; scripts/apply-peer-data-validation.mjs; public/app.js; docs/KSTOCK_QA_FOLLOWUP_REPORT.md; docs/AUTO_DEV_LOG.md; docs/uiux/peer-data*.png. ignored 새 입력/보고서 latest 추가.
NOT RUN: 새 APK 설치/OS200%; 전 기업6개 각 상세 전 항목 실기기 대조; 글로벌 companyfacts·20F 원문 숫자 수집; 미국가격 재시도; 현재 자본 전수 기업행동 증명; 실제 비교·추천 활성화; 운영·외부 공개·실주문.
BLOCKERS: 국내 기준일 전체 주식 종류 가격·시총과 현재 수량/자기주식 효력 bridge, 연결사업 비교성, 동기간TTM·EV/EBITDA 정의; 글로벌 가격 쿨다운과 회계·ADR·통화.
NEXT ACTION: 국내 우선주 포함 날짜별 가격·공식 자본 효력 연속성 수집 → 현재 자본 증거 확정 → 글로벌 쿨다운 정상 종료 후 제한된 가격 조회 및 SEC 정규화 → 사업 범위 비교 정책 근거 확보 → 배수별 표본 재평가. 기준 완화 없음.
OVERALL: PARTIAL. 정정 원문 관계·기준일·국내 종가·반기 자본 계정 및 독립 검증/UI 완료, 현재 자본과 비교 표본 최종 검증 미완료. 테스트 증가만으로 전체 완료 아님.

--- 이전 기록 (보존) ---

K-STOCK AI PEER VALIDATION REPORT — 2026-10-12 / 배수별 독립 검증

PROJECT: /Users/ari/ARI/projects/k-stock-ai
BRANCH: auto/kstock-development-20260930
COMMIT: ea406852610c00bef0dbe469de95c42fca662c30 (기존 HEAD, 미커밋 작업 보존)
VERSION: package 1.0.0 / server 0.1.0 / Android 2.6.5(265)
BASELINE: 이번 작업 시작 시 Offline 358 PASS 재실행. Android Contract 3은 아래 현재 실행 결과.
CURRENT TESTS: Offline 376 / Android Contract 3
PASS: 376 + 3 / FAIL: 0
COMMANDS: npm run test:offline; node --test test/android_external.test.js; node --check public/app.js; git diff --check
Offline 고정 fixture만 사용. Android 계약 테스트의 로컬 소켓 외 외부 요청 없음.

PEER COMPANIES:
Candidates: 6 / Eligible: 0 / Excluded: 6
PER Eligible: 0 / PBR Eligible: 0 / PSR Eligible: 0 / EV/EBITDA Eligible: 0
최소 표본: 각 배수 3개 유지. 중앙값 및 삼성전자와 차이: 자료 부족, 산출 안 함.

COMPANY DIAGNOSIS:

Company: 에스케이하이닉스(주) (000660)
Missing Data: PRICE_DATE_UNVERIFIED, FINANCIAL_PUBLICATION_UNVERIFIED, SHARE_COUNT_DATE_OR_PUBLICATION_UNVERIFIED, CURRENT_CAPITAL_SOURCE_UNVERIFIED, MISSING_FINANCIAL_DATA, VERIFIED_EV_INPUTS_REQUIRED, VERIFIED_EBITDA_INPUTS_REQUIRED
Exclusion Reasons: PRICE_DATE_UNVERIFIED, FINANCIAL_PUBLICATION_UNVERIFIED, SHARE_COUNT_DATE_OR_PUBLICATION_UNVERIFIED, CURRENT_CAPITAL_SOURCE_UNVERIFIED, CORPORATE_ACTION_UNVERIFIED, FINANCIAL_PERIOD_MISMATCH, BUSINESS_MODEL_MISMATCH, MISSING_FINANCIAL_DATA, VERIFIED_EV_INPUTS_REQUIRED, VERIFIED_EBITDA_INPUTS_REQUIRED
Fix Applied: 반기 CFS 기간·공시일 및 보고서 주식수 공개일 근거 추가 / 4분기 TTM 자료 부족
Verification: 4개 배수 독립 재평가 / 비교 표본 제외. 가격 미확인을 SOURCE_CONFLICT로 바꾸지 않음.

Company: 주식회사 DB하이텍 (000990)
Missing Data: PRICE_DATE_UNVERIFIED, FINANCIAL_PUBLICATION_UNVERIFIED, CORRECTION_REVIEW_REQUIRED, SHARE_COUNT_DATE_OR_PUBLICATION_UNVERIFIED, CURRENT_CAPITAL_SOURCE_UNVERIFIED, MISSING_FINANCIAL_DATA, VERIFIED_EV_INPUTS_REQUIRED, VERIFIED_EBITDA_INPUTS_REQUIRED
Exclusion Reasons: PRICE_DATE_UNVERIFIED, FINANCIAL_PUBLICATION_UNVERIFIED, CORRECTION_REVIEW_REQUIRED, SHARE_COUNT_DATE_OR_PUBLICATION_UNVERIFIED, CURRENT_CAPITAL_SOURCE_UNVERIFIED, CORPORATE_ACTION_UNVERIFIED, FINANCIAL_PERIOD_MISMATCH, BUSINESS_MODEL_MISMATCH, MISSING_FINANCIAL_DATA, VERIFIED_EV_INPUTS_REQUIRED, VERIFIED_EBITDA_INPUTS_REQUIRED
Fix Applied: 반기 CFS 기간·공시일 및 보고서 주식수 공개일 근거 추가 / 4분기 TTM 자료 부족 / 2025 정정 공시일 2026-06-01 확인, 최종 정정 내용 검증 대기
Verification: 4개 배수 독립 재평가 / 비교 표본 제외. 가격 미확인을 SOURCE_CONFLICT로 바꾸지 않음.

Company: 한미반도체(주) (042700)
Missing Data: PRICE_DATE_UNVERIFIED, FINANCIAL_PUBLICATION_UNVERIFIED, SHARE_COUNT_DATE_OR_PUBLICATION_UNVERIFIED, CURRENT_CAPITAL_SOURCE_UNVERIFIED, MISSING_FINANCIAL_DATA, VERIFIED_EV_INPUTS_REQUIRED, VERIFIED_EBITDA_INPUTS_REQUIRED
Exclusion Reasons: PRICE_DATE_UNVERIFIED, FINANCIAL_PUBLICATION_UNVERIFIED, SHARE_COUNT_DATE_OR_PUBLICATION_UNVERIFIED, CURRENT_CAPITAL_SOURCE_UNVERIFIED, CORPORATE_ACTION_UNVERIFIED, FINANCIAL_PERIOD_MISMATCH, BUSINESS_MODEL_MISMATCH, MISSING_FINANCIAL_DATA, VERIFIED_EV_INPUTS_REQUIRED, VERIFIED_EBITDA_INPUTS_REQUIRED
Fix Applied: 반기 CFS 기간·공시일 및 보고서 주식수 공개일 근거 추가 / 4분기 TTM 자료 부족
Verification: 4개 배수 독립 재평가 / 비교 표본 제외. 가격 미확인을 SOURCE_CONFLICT로 바꾸지 않음.

Company: Micron Technology (MU)
Missing Data: MISSING_MARKET_CAP, MISSING_PRICE, PRICE_DATE_UNVERIFIED, MISSING_FINANCIAL_DATA, FINANCIAL_PUBLICATION_UNVERIFIED, MISSING_SHARE_COUNT, CURRENT_CAPITAL_SOURCE_UNVERIFIED, VERIFIED_EV_INPUTS_REQUIRED, VERIFIED_EBITDA_INPUTS_REQUIRED
Exclusion Reasons: MISSING_MARKET_CAP, MISSING_PRICE, PRICE_DATE_UNVERIFIED, MISSING_FINANCIAL_DATA, CURRENCY_MISMATCH, AMOUNT_UNIT_MISMATCH, FINANCIAL_PERIOD_MISMATCH, FINANCIAL_PUBLICATION_UNVERIFIED, MISSING_SHARE_COUNT, CURRENT_CAPITAL_SOURCE_UNVERIFIED, CORPORATE_ACTION_UNVERIFIED, BUSINESS_MODEL_MISMATCH, VERIFIED_EV_INPUTS_REQUIRED, VERIFIED_EBITDA_INPUTS_REQUIRED
Fix Applied: 기존 공식 사업 근거 유지 / 동일 통화·기간 재무와 주식수 자료 필요
Verification: 4개 배수 독립 재평가 / 비교 표본 제외. 가격 미확인을 SOURCE_CONFLICT로 바꾸지 않음.

Company: TSMC (TSM)
Missing Data: MISSING_MARKET_CAP, MISSING_PRICE, PRICE_DATE_UNVERIFIED, MISSING_FINANCIAL_DATA, FINANCIAL_PUBLICATION_UNVERIFIED, MISSING_SHARE_COUNT, CURRENT_CAPITAL_SOURCE_UNVERIFIED, VERIFIED_EV_INPUTS_REQUIRED, VERIFIED_EBITDA_INPUTS_REQUIRED
Exclusion Reasons: MISSING_MARKET_CAP, MISSING_PRICE, PRICE_DATE_UNVERIFIED, MISSING_FINANCIAL_DATA, CURRENCY_MISMATCH, AMOUNT_UNIT_MISMATCH, FINANCIAL_PERIOD_MISMATCH, FINANCIAL_PUBLICATION_UNVERIFIED, MISSING_SHARE_COUNT, CURRENT_CAPITAL_SOURCE_UNVERIFIED, CORPORATE_ACTION_UNVERIFIED, BUSINESS_MODEL_MISMATCH, VERIFIED_EV_INPUTS_REQUIRED, VERIFIED_EBITDA_INPUTS_REQUIRED
Fix Applied: 기존 공식 사업 근거 유지 / 동일 통화·기간 재무와 주식수 자료 필요
Verification: 4개 배수 독립 재평가 / 비교 표본 제외. 가격 미확인을 SOURCE_CONFLICT로 바꾸지 않음.

Company: United Microelectronics (UMC)
Missing Data: MISSING_MARKET_CAP, MISSING_PRICE, PRICE_DATE_UNVERIFIED, MISSING_FINANCIAL_DATA, FINANCIAL_PUBLICATION_UNVERIFIED, MISSING_SHARE_COUNT, CURRENT_CAPITAL_SOURCE_UNVERIFIED, VERIFIED_EV_INPUTS_REQUIRED, VERIFIED_EBITDA_INPUTS_REQUIRED
Exclusion Reasons: MISSING_MARKET_CAP, MISSING_PRICE, PRICE_DATE_UNVERIFIED, MISSING_FINANCIAL_DATA, CURRENCY_MISMATCH, AMOUNT_UNIT_MISMATCH, FINANCIAL_PERIOD_MISMATCH, FINANCIAL_PUBLICATION_UNVERIFIED, MISSING_SHARE_COUNT, CURRENT_CAPITAL_SOURCE_UNVERIFIED, CORPORATE_ACTION_UNVERIFIED, BUSINESS_MODEL_MISMATCH, VERIFIED_EV_INPUTS_REQUIRED, VERIFIED_EBITDA_INPUTS_REQUIRED
Fix Applied: 기존 공식 사업 근거 유지 / 동일 통화·기간 재무와 주식수 자료 필요
Verification: 4개 배수 독립 재평가 / 비교 표본 제외. 가격 미확인을 SOURCE_CONFLICT로 바꾸지 않음.

원인별 실데이터 확인:
- 국내 3개: 연간 재무 관측 자료와 보고서 주식수는 존재하나, 관측 가격의 기준일과 같은 날짜의 전체 자본·주식수 정의 및 자본 변동 검증이 부족하다. SK하이닉스의 KIS 관측 주식수와 6/30 보고서 차이는 기준일이 달라 원천자료 상충으로 확정하지 않았다.
- 국내 3개 반기 자료: 2026-01-01~2026-06-30, CFS, KRW/KRW, 누적 실적. 공시일 2026-08-14. SK000660 접수20260814003509 / DB000990 20260814003091 / 한미042700 20260814003665. 단일 반기만으로 4분기 TTM을 만들지 않았다.
- DB 연간 정정: 접수20260601001661의 공시일 2026-06-01 확인. 정정 내용·최종 원문 관계 미검증이므로 UNRESOLVED 유지. 화면의 공시 이용 가능 시점 차단은 가격 기준일 부재도 포함하며, 공시일을 못 찾았다는 뜻으로 단정하지 않는다.
- SK 메모리, DB 특화 파운드리, 한미 장비 사업은 공식 사업 근거 확인. 삼성전자 연결 DX/DS 전체 사업에 대한 동질성을 증명하지 못했다. 사업 비중 추정 없음.
- MU/TSM/UMC: 기존 공식 사업 근거 보존. 국내 동일 통화·기간 비교에 필요한 재무·현재 자본 자료 미연결. 신규 환율·부문 수치 추정 없음.

VALIDATION POLICY:
Before: 기존 비교 모듈은 공통 검증과 전체 기업행동 검증의 제한을 함께 적용.
After: 별도 진단 모듈에서 현재 기업가치와 과거 가격수익률 검증 목적을 분리. 검증된 현재 전체 자본 증거가 있으면 과거 성과 미검증만으로 진단 배수를 막지 않는다. PER/PSR 연간 또는 검증된 TTM, PBR 해당 시점 자본, EV/EBITDA 별도 정의·입력 검증. 음수·0 분모 및 결측치는 배수별 차단.
Safety Conditions Preserved: 기존 실제 비교·추천·성과 gate는 그대로 보존. 기준일·공개시점·통화·연결 기준·현재 자본 영향 검증 필수. 진단 비교값도 추천 승인이 아님.

OFFICIAL SOURCE AUDIT:
OpenDART 허용 읽기 API 10회, 성공10 / 실패0. 웹 사업 근거 검색1회, open1회(공식3페이지). 확인일 2026-10-12.
새 파일: peer-diagnostic-source-1791781714879.json / peer-diagnostic-source-db-publication-1791781744399.json / peer-diagnostic-source-review-1791781782942.json (data/v2/verification, Git 제외, 0600).
원천 해시 확인 후 saved-source 재사용. 불필요한 제출인 이름은 새 저장 응답에서 제외; 수치·공시명·접수번호·날짜 보존. 인증정보 변경·공개 없음.
공식 근거: https://opendart.fss.or.kr / https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260601001661
사업 근거: https://news.skhynix.com/en/q2-2026-business-results/ / https://www.dbhitek.com/en/company/about / https://kind.krx.co.kr/external/2026/03/05/001299/20260305002994/00591.htm

CORPORATE ACTIONS:
Coverage: 기존 21건 공시 원문, saved evidence 재사용; 이번 추가 기업행동 수집 0회.
Verified: 원문 확보와 기존 근거 표시 회귀 PASS. 전수검증 완료 판정 아님.
Pending: 완전한 전체 이벤트 범위·현재 자본 영향·권리 적용 검증. 새 부재 증명이나 자동 가격 조정 없음.
OFFICIAL BALANCE:
Latest Verified Date: 2026-08-21
Latest Verified Balance: 보통주 79,870,794주
Next Official Date: 미확인 / 2026-10-08 잔고는 미확인 유지.
기존 6/30→8/21 산술 대사 차이0과 처분 자료 보존, 전체 연속성은 INSUFFICIENT_DATA.

SAMSUNG PERFORMANCE: HOLD
RAW 가격29개 2026-08-26~2026-10-08 보존. 기업행동 전체 범위 부족으로 수익률·MDD 생성 안 함.
BENCHMARK: 삼성전자 동일 기간 비교 HOLD. 기존 지수 자체 50거래일 자료 보존; 서로 다른 기간 직접 비교 안 함.
WEB UI: PASS. 새 진단6개, 반기 공시와 정정 날짜, TTM 및 기존 잔고/기업행동 표시 확인. 320/360/390/768/1024/1440 × 밝은/어두운 테마 12조건, 글자200% 페이지 넘침 없음. 증거 docs/uiux/peer-diagnosis-web.png.
GALAXY A33: PASS (RFCW1178RRE, 로컬 검증 앱). 새 진단 표, 표 가로 스크롤, DB 상세 펼침·긴 설명 스크롤, 자료 부족/추천 보류 확인. USB 연결 실패 표시·복구 확인. 스크린샷 peer-diagnosis-galaxy*.png 직접 검토. 기존 앱 사용, 재설치 NOT RUN.
RECOMMENDATION: HOLD (Apple 포함 기존 gate 보존)
LIVE TRADING: OFF / localhost health brokerEnabled=false, liveTrading=false, externalAccess=false, mode=mock.
REAL ORDERS: 이번 작업 0건 (주문·취소·계좌 API 호출 없음; 외부 계좌 전체 과거 내역 조회는 NOT RUN).
MODIFIED FILES: src/v2/peer_metric_diagnosis.js; test/peer_metric_diagnosis.test.js; test/candidate_ui.test.js; scripts/apply-peer-diagnosis.mjs; public/app.js; docs/KSTOCK_QA_FOLLOWUP_REPORT.md; docs/AUTO_DEV_LOG.md; docs/uiux/peer-diagnosis*.png. 로컬 ignored 입력/보고서 latest 갱신. 기존 peers·Apple/SEC·RAW·rightsInvestigation deepEqual 검증 보존.
NOT RUN: 새 APK 설치, Android OS 글자200%, 6개 개별 상세 전부 실기기 대조, 새로운 전체 기업행동 원문 수집, DB 정정 원문 내용 확정, 신규 현재 자본 증명, 운영·외부 공개·실주문.
BLOCKERS: 현재 가격 기준일/전체 주식수·시가총액 정의·기업행동 영향 증명; DB 정정 내용; 비교 가능한 연결 사업 표본; 4분기 연속 자료; EV/EBITDA 근거.
NEXT ACTION: 국내3개 날짜가 명시된 가격·전체 자본 증거 확보 → DB 정정 원문 관계 검토 → 동질 사업 기준 표본 확보 → 기업행동 전체 범위 및 공식 잔고 연속성 검증 → 실제 비교·성과 gate 재평가.
OVERALL: PARTIAL. 6개 원인 진단·배수별 정책·공식 자료 보강·UI 연결 완료. 동종기업 비교 및 종목 성과 완료 아님.

--- 이전 기록 (보존) ---

K-STOCK AI DEVELOPMENT REPORT — 2026-10-12 / A·B·C 병렬 개발

PROJECT: /Users/ari/ARI/projects/k-stock-ai
BRANCH: auto/kstock-development-20260930
COMMIT: ea406852610c00bef0dbe469de95c42fca662c30 / 기존 HEAD, 미커밋 변경 보존
VERSION: package 1.0.0 / server 0.1.0 / 기존 Android 2.6.5(265)
BASELINE: 이번 코드에서 Offline336 PASS 재실행, Android3은 아래 별도 재실행 결과
CURRENT TESTS: Offline358 / Android Contract3
PASS: 358 + 3 / FAIL: 0

WORKSTREAM A:
Official Balance Date: 확보한 공식 기준점 2026-08-21 / COMMON / KIND 20260821000785 및 Samsung IR84756
Official Balance: 79,870,794주 보존. 다음 공식 기준점 SOURCE_NOT_CONFIRMED, 존재 여부 UNKNOWN.
Actual Acquisition: 기존 실제56,856,305주 / 2026-08-24~10-06 29일 재사용, 예정53,285,968과 구분. 신규 실제 거래 추가0, 중복 합산0.
Actual Disposal: 6/30~8/21 기존 실제 7/8 1,083,434 및7/13 1,132,477 =2,215,911주. 8/21 이후 처분 미확인null.
Actual Cancellation: 기간별 미확인null, 연간 누계를 날짜별 소각으로 분배하지 않음.
Reconciliation: 6/30~8/21 확인 항목 산술 차이0/MATCH, 전체 변동 범위 부족으로 INSUFFICIENT_DATA. 이후 기말/계산 잔고/차이null.
새 조사: 공식 IR 공개 검색 API /aemapi/v6/ir/disclosureList에서 기간20260822~20261012, keyword빈값, siteCodeglobal, page1/30, totalCount3/toRecord3 확인. 목록: 84776(10/8 실적발표일정),84775(10/8 잠정실적),84765(9/1 2026반기보고서). 9/1공시 원문은 반기보고서PDF 연결이며 후속 잔고 관측값으로 변환하지 않음. 공시일/잔고일/거래일 분리 유지.
목록 전체3 확인은 해당IR검색 범위에 한정. 회사의 모든 원천 공시 또는 기업행동 부재를 증명하지 않음.
공시 영문 날짜를 명시적으로 YYYY-MM-DD로 변환해 시간대에 따른 하루 전 날짜 오류 수정. 개별 날짜·기간·페이지·중복 검증 fixture 추가.

WORKSTREAM B:
Corporate Action Coverage: 관측2026-08-26~10-08 / 가격29개. 기존 공시21·KIND22/선행844 원문 근거 재사용.
Verified Events: 기존9/29보통주 배당락·기준가격270,000원, 취득29일/과거처분2개 유지. 새로운 실제 이벤트 추가0.
Pending Events: 전수 범위, 정정 관계, Q3금액·지급일, 소각·발행 변화. 기존11유형 조사항목에 액면변경(PAR_VALUE_CHANGE) 범위 누락 추가 표시.
Price Adjustment: KIS daily-prices adjustmentParameter=0 / RAW 계약 근거 재사용·확인됨. 수정주가·배당재투자·전수조정 검증으로 확대 해석하지 않음.
구간별 원천·정정FINAL_VALID·전체범위12유형·적용일·종류·가격을 검증하는 buildActionCoverageRanges 구현. 검증된 기업행동 구간 후보0. 21건 공시결의0을 이벤트 부재로 판정하지 않음. 부분 구간 후보가 생겨도 잔고·주식수 선행조건과 전체성과·추천 승인 별도.

WORKSTREAM C:
Peer Candidates: 조사3→6 / 기존 SK하이닉스000660·DB하이텍000990·한미반도체042700 + Micron(MU)·TSMC(TSM)·UMC 조사 후보.
Eligible: 0 / Excluded: 6 / PENDING_VERIFICATION0 / INSUFFICIENT_DATA0 (현재 엄격한 제외 정책 기준)
Exclusion Reasons: 기존KR3은 업종불일치 및 연결사업·날짜 근거 미충족; 해외3은 현재 KR동일통화 비교 범위 밖, 삼성 연결사업 전체 동질성·동일기간 재무 및 주식수 근거 미확보. 최소3 유지.
공식 사업 제품 근거는 SK하이닉스/Micron DRAM·NAND, TSMC·UMC파운드리, 삼성 DX·DS 구조 확인에 한정. 정량 반도체 비중null, 동일사업전체 비교 미검증. 새로운 실제 평가배수 표본은0, 조사 후보 확대를 유효표본 확대 완료로 보고하지 않음.
PER/PBR/PSR 계산은 기존 annualMultiples 재사용, 기간/통화/단위/종류/분모/배수이상치 검사. EV/EBITDA는 검증 입력 부족null. 비교값과추천승인 별도, rankingEligiblefalse. 신규후보는 추천universe에 삽입하지 않고 별도조사상태로 표시.
공식 근거: https://www.samsung.com/global/ir/ir-resources/our-business/ ; https://www.skhynix.com/ ; https://www.micron.com/about/company/corporate-profile ; https://www.tsmc.com/english/aboutTSMC ; https://www.umc.com/en/About/about_overview

WORKSTREAM D:
Samsung Verified Period: 없음 / Price Return:null / Total Return:null
PERFORMANCE_BLOCKED 유지. 실제 localhost stock-performance API statusPENDING/reasonCORPORATE_ACTION_COVERAGE_REQUIRED 확인.
KOSPI / KOSDAQ: 기존50개 가격지수·독립차트 자료 유지. 공통관측8/26~10/8 29개, 주식수가격기준6/30 vs10/8 불일치 및기업행동미완료.
Benchmark Status: BENCHMARK_BLOCKED, 두 API statusPENDING/reason동일. 수익률/MDD·초과수익을 임의 산출하지 않음, 보간·연율화 없음.

WEB UI: PASS — 실제 최신 저장 보고서로 공식3공시조사/기준점, RAW·기업행동후보0·액면변경/전체성과보류, 조사6/유효0/최소3·회사별제외사유 및공식근거 표시. 기존TTM/가격/배당락/실제취득/주식수 검증 회귀PASS. 6폭×2테마·200%확대 가로넘침없음.
GALAXY A33: 이번 선택기기 RFCW1178RRE 기존앱 접속·삼성전자상세·조사6/유효0·제외사유·EV/EBITDA보류 및기업행동후보0/액면변경/RAW·실제취득합계·긴설명/세로스크롤 실제화면PASS. 공식후속3공시/SOURCE_NOT_CONFIRMED·연결실패/복구·비교표 좌→우 가로스크롤 및 오른쪽 기준일 미확인 칸도 이번 캡처를 실제 열어PASS 확인. 복구 직후 홈지수는 새로고침 전 초기미연결이며 지수검증으로 승격하지 않음.
CAPTURES: docs/uiux/galaxy-a33-streams-{peers,actions,continuity,failure,restored,comparison,comparison-right}.png
APP INSTALL: 기존설치유지 / 신규설치NOT RUN(native변경없음).

RECOMMENDATION: HOLD (Samsung·Apple 포함, 모든 저장후보approvedfalse 확인)
LIVE TRADING: OFF / health brokerEnabledfalse/liveTradingfalse/externalAccessfalse
REAL ORDERS: 이번0 / 주문·취소·계좌API 호출없음, 외부계좌전체이력조회NOT RUN
APPLE/SEC/RAW: 저장입력 삼성외기업·root evidence·기존krPeers·삼성RAW priceHistory deepEqual PASS. .env 변경/출력없음, secret scan matches0. 운영 ari-prod-01 /srv/k-stock-ai/current, kstock.ai.kr 및 다른프로젝트변경없음.

SOURCES / AUDIT:
A 공식직접HTTP5회(실패404 1포함): 잘못된 복수형목록URL404, 올바른목록HTML, 공식공개JS, 제한조회JSON, 반기원문HTML. web검색2회(5query), open1페이지. 다음잔고원천미확보로 요청반복중단.
B 외부HTTP0 / 기존원천재사용. C 직접HTTP0 / web검색2회·open5페이지·find4작업. 총directHTTP5, web검색4호출; 자동테스트와분리.
A SHA256·범위·조회시각·목록결과 data/v2/verification/streams-source-audit-*.json 및streams-source-*; C검토시각·URL/횟수peer-business-source-audit.json. 모두Git제외자료. 기업별사업근거는확인시점현재, 과거평가에소급사용하지않음.

TEST COMMANDS: npm run test:offline; node --test test/android_external.test.js; node --test test/candidate_ui.test.js; node /tmp/kstock-streams-browser.mjs; node --check public/app.js; node --check scripts/apply-workstreams.mjs; git diff --check
LOGS: /tmp/kstock-streams-{baseline,final,android,ui,web}.log
신규22개 fixture: IR목록3·기업행동구간9·비교기업9·UI계약1. 기존336 보존, 외부/주문없는자동검증. 중간IR날짜2실패발견→명시적달력날짜변환수정→전체358PASS 확인.
MODIFIED FILES: src/v2/official_ir_listing.js; src/v2/action_coverage_ranges.js; src/v2/peer_expansion.js; scripts/apply-workstreams.mjs; scripts/build-peer-expansion-review.mjs; test/official_ir_listing.test.js; test/action_coverage_ranges.test.js; test/peer_expansion.test.js; test/candidate_ui.test.js; public/app.js; QA보고서·AUTO_DEV_LOG; 위캡처. 기존미커밋변경보존.
NOT RUN: 다음공식잔고실원문·실제소각/처분전수·신규유효비교배수·검증가격성과(자료부족). 신규설치/운영페어링/OS200%/전체일별행/이번지수차트실기기전체회귀는NOT RUN, 이전PASS와구분.
BLOCKERS: 다음공식잔고·정정최종관계, 완전한기업행동범위12유형, 날짜맞는주식수, 삼성연결사업동질성/동일통화·기간·단위·주식수와배수검증된peer최소3.
NEXT ACTION: 공식추가잔고원문또는후속결과보고서 확보/기타변동전수 → 기업행동누락유형과정정근거 → 연결기업또는사업부비교정의 근거 확보(정책완화없이) → 검증구간성과·동일기간지수비교 → 남은실기기QA.
OVERALL: PARTIAL

--- 이전 기록 보존 ---

K-STOCK AI DEVELOPMENT REPORT — 2026-10-12 / 공식 기준일 재설정

PROJECT: /Users/ari/ARI/projects/k-stock-ai
BRANCH: auto/kstock-development-20260930
COMMIT: ea406852610c00bef0dbe469de95c42fca662c30 / 기존 HEAD, 미커밋 변경 보존
VERSION: package 1.0.0 / server 0.1.0 / 기존 Android 2.6.5 (265)
BASELINE: 이번 코드에서 Offline 326 PASS 재확인 / Android Contract 3은 아래 이번 실행 결과로 구분
CURRENT TESTS: Offline 336 / Android Contract 3
PASS: 336 + 3 / FAIL: 0

OFFICIAL BALANCE:
October 8 Source: SOURCE_NOT_CONFIRMED / 존재 여부 UNKNOWN. 조회 미확보는 부존재 증명 아님. 기존 KIND 10/8 공시는 잠정 실적이며 잔고 원문으로 승격하지 않음.
Actual As-of Date: 확보한 공식 잔고 중 2026-08-21
Official Balance: 보통주 79,870,794주
Document ID: KIND 접수 20260821000785 / KIND 원문 ID는 기존 balanceReview.closing.sourceDocumentId 유지 / 공식 IR 84756
Verification Status: 잔고 기준일 및 수량 교차 확인. 정정 관계 전수 확인은 대기.
신규 공식 근거: https://www.samsung.com/global/ir/reports-disclosures/public-disclosure-view.84756/
IR 원문은 End quantity를 2026-08-21 보유 수량이라고 명시. 이사회 결의일/공시일과 거래 예정 기간을 분리. 기존 KIND 원문 수량과 일치.
직접 공식 HTTP 1회 + web 검색 1회(3개 query) + web open 1회. 원문 SHA256/확인 시각/문서 식별자는 Git 제외 data/v2/verification/official-period-audit-*.json 및 official-ir-balance-*.html 보존. 자동 테스트와 공식 요청 분리.

TREASURY SHARES:
Opening Balance: 2026-06-30 보통주 82,086,705주 (OpenDART 기존 근거)
Actual Acquisition: 공식 잔고 사이 6/30~8/21 확인된 항목에는 취득 없음; 전수 확인된 0주로 단정하지 않음. 8/21 이후 실제 56,856,305주 / 8/24~10/6 / 29일 기존 체결 재사용.
Actual Disposal: 공식 구간 7/8 1,083,434 + 7/13 1,132,477 = 2,215,911주 / 기존 실제 결과 공시 재사용.
Actual Cancellation: 기간별 실제 소각 미확인. 연간 누계 소각을 임의의 개별 거래일에 배정하지 않음.
Calculated Closing: 6/30~8/21 확인 항목 산술 79,870,794주
Official Closing: 8/21 79,870,794주
Difference: 0주
Reconciliation: 산술 MATCH / 전체 검증 INSUFFICIENT_DATA, FULL_COVERAGE_REQUIRED.
8/21 이후: 다음 공식 잔고 기준일 미확보. 처분·소각·기타 null, 계산 잔고·차이 null. 56,856,305주를 중복 합산하거나 공식 잔고로 대체하지 않음.

IMPLEMENTATION:
공식 잔고 관측일로 대사 구간 자동 구성. 10/8 가격일을 필수 잔고일로 고정하지 않음. 다음 공식 자료가 입력되면 그 날짜까지 실제 거래만 반영. disclosureDate / balanceAsOfDate / transactionDate 분리(잔고 관측값 transactionDate=null).
서로 다른 주식 종류, 미래 공개/기준일, 중복 체결, 거래일 누락, 같은 날짜 상충 잔고, 미해결 정정 차단. 상충 최신 잔고는 latestOfficial=null. 정정 원문 체계의 실제 완전성은 미확인이라 보류 유지.
RECONCILED 판정은 원천·기간·종류 및 전체 변동 범위 근거가 있는 경우에만 허용. 공시 수집 건수/산술 일치만으로 완전성을 승인하지 않음.

SHARE COUNT:
Common: 6/30 발행 5,846,278,608 / 자기주식 82,086,705 / 유통 5,764,191,903주
Preferred: 6/30 발행 802,371,203주 / 자기주식 미확인, 대시를 0으로 처리하지 않음
Issued / Treasury / Outstanding: 위 보고서 기준값 보존, 10/8 현재 확정값 없음
As-of Date: 주식수 2026-06-30 / 확인 잔고 2026-08-21 / 가격 2026-10-08. shareAlignment BLOCKED, 배수 null.
취득·처분은 발행주식수 변경이 아님. 소각 법적 효력·issuedDelta 별도 검증 유지.

CORPORATE ACTIONS:
Coverage: 가격 2026-08-26~10-08 29개; 기존 원문21, 관측 KIND22/선행844 조회 근거 재사용. 조회 완료와 전수 검증 구분 유지.
Verified: 기존 보통주 배당락 9/29 및 기준가격 270,000원, 실제 과거 처분2개·취득29일, 잔고 6/30·8/21 근거 + 신규 공식 IR 기준일 교차 확인
Pending: 유형별 전수 범위, 정정 관계, 실제 소각·기타 발행 변화, Q3 배당 금액·지급일. 기업행동 새 실제 이벤트 추가 없음.

SAMSUNG 005930:
Verified Return Period: 없음
Price Return: 보류 / Total Return: 보류
Performance Status: PERFORMANCE_BLOCKED. RAW 가격 유지, 중복 조정/추정 성과 없음. 잔고 확인이 곧 가격 기업행동 전수 검증을 의미하지 않음.

BENCHMARK:
KOSPI / KOSDAQ: 기존 50개 가격지수 자료와 독립 차트 유지
Aligned Period: 종목과 공통 관측 2026-08-26~10-08 29개. 종목 기업행동 조건 미충족으로 두 비교 BENCHMARK_BLOCKED. 거래일 독립 완전성은 대기, 보간·연율화 없음.

PEER COMPARISON:
Connected: 기존 국내 3개 / Eligible: 0 / Excluded: 국내3개 (Apple·자기기업 기존 제외 별도 유지)
최소 표본3 유지, 사업 특성·동일 기준일 근거 부족. PER/PBR/PSR 현재·중앙값·차이 null.

WEB UI: PASS — 새로운 공식 기준일/구간/SOURCE_NOT_CONFIRMED/IR 링크 및 기존 TTM/배당락/취득/주식수/성과 보류를 실제 저장 데이터로 확인. 6폭×2테마 및 200% 확대 가로 넘침 없음.
GALAXY A33: PASS(이번 실행 범위) — 기존 앱 접속, 삼성전자 상세, 공식 날짜/79,870,794주, 산술 대사0주·자료 부족, 실제56,856,305/예정53,285,968 구분, 일별 타임라인 펼침(앞부분 확인), 긴 설명·세로 스크롤, 비교표 실제 가로 스크롤 좌/우, 연결 실패·복구. 복구 후 새로고침으로 KOSPI 6625.93 / KOSDAQ 892.27 / 10/8 가격지수 표시 확인.
CAPTURES: docs/uiux/galaxy-a33-official-{periods,period-result,transactions,timeline,failure,restored,indices,detail-navigation,comparison-left,comparison-right}.png. 실제 이미지를 열어 판정.
설치 여부: 기존 앱 유지, 신규 APK 설치 NOT RUN (native 변경 없음).

RECOMMENDATION: HOLD (삼성전자·Apple 포함)
LIVE TRADING: OFF / localhost health brokerEnabled=false, liveTrading=false, externalAccess=false 확인
REAL ORDERS: 이번 작업 0 (주문·취소·계좌 API 호출 없음; 외부 계좌 전체 이력 조회 NOT RUN)
APPLE/SEC/RAW: 삼성전자 외 입력 기업, root evidence, 삼성전자 priceHistory 변경 전후 deepEqual PASS. 비밀값 검색 결과0, .env 값 미출력·변경 없음.

TEST COMMANDS: npm run test:offline; node --test test/android_external.test.js; node /tmp/kstock-reset-browser.mjs; node --check src/v2/treasury_balance_periods.js; node --check scripts/apply-official-balance-periods.mjs; node --check public/app.js; git diff --check
LOGS: /tmp/kstock-reset-{baseline,final,android,web}.log
추가10개 fixture 검사: 공식 날짜 재설정/새 구간 거래 배정/공시일 구분/미래·종류/상충 잔고/누락 거래일/전수범위/최신 상충값 차단/중복/화면 계약. 기존326 보존, 자동 테스트 외부 요청 없음.
MODIFIED FILES: src/v2/treasury_balance_periods.js; test/treasury_balance_periods.test.js; test/candidate_ui.test.js; scripts/apply-official-balance-periods.mjs; public/app.js; docs/KSTOCK_QA_FOLLOWUP_REPORT.md; docs/AUTO_DEV_LOG.md; 위 캡처. 기존 다른 미커밋 변경 보존.
NOT RUN: 신규 설치·운영 인증/페어링·OS 200% 확대·일별29행 전체 실기기 확인·이번 지수 시계열 차트 실기기 전체 QA. 화면 지수 수치 확인과 차트 검증을 구분. 운영 ari-prod-01 /srv/k-stock-ai/current 및 kstock.ai.kr 변경 없음.
BLOCKERS: 8/21 이후 다음 공식 잔고 근거, 실제 처분·소각·기타 변화와 정정 관계 전수 근거, 현재 발행/자기/유통 기준일, 가격 기업행동 전수 범위, 비교 표본.
NEXT ACTION: 날짜를 미리 고정하지 않고 다음 명시적 공식 잔고 자료 확보 → 해당 공식 구간 실제 변동 전수 대사 → 주식수 정렬·기업행동 → 검증 가격 성과·동일 지수 비교 → 미실행 실기기 QA.
OVERALL: PARTIAL

--- 이전 기록 보존 ---

K-STOCK AI DEVELOPMENT REPORT — 2026-10-12 / 10월 8일 잔고 후속 검증

PROJECT: /Users/ari/ARI/projects/k-stock-ai
BRANCH: auto/kstock-development-20260930
COMMIT: ea406852610c00bef0dbe469de95c42fca662c30 (기존 HEAD, 변경 미커밋)
VERSION: package 1.0.0 / server 0.1.0 / 기존 Android 2.6.5 (265)
BASELINE: 이번 코드에서 Offline 322 PASS 확인. 이전 Android 3 PASS는 인수인계이며 아래 별도 재실행.
CURRENT TESTS: Offline 326 PASS / Android Contract 3 PASS / FAIL 0
COMMANDS: npm run test:offline; node --test test/android_external.test.js; node /tmp/kstock-oct8-browser.mjs; node --check scripts/apply-oct8-balance-review.mjs; node --check public/app.js; git diff --check
증거 로그: /tmp/kstock-oct8-{baseline,final,android,web}.log

TREASURY SHARES:
Opening Balance 8/21: 보통주 79,870,794주, KIND 취득 결정 보유현황의 기존 원문 재사용.
Actual Acquisition: 56,856,305주 / 2026-08-24~10-06 / 기존 29개 실제 체결 재사용, 예정 53,285,968주와 구분. 가격 관측구간 내 취득 53,056,305주. 중복 합산 없음.
Actual Disposal: 미확인(null), 해당 기간 0주로 단정하지 않음.
Actual Cancellation: 미확인(null); 기타 조정도 미확인.
Official Balance 10/8: 미확인. 이번 제한된 공식 조회에서 해당 기준일 잔고 근거 미확보. 공식 자료가 없다는 전면적 결론은 아님.
Calculated Balance: null / Difference: null
Reconciliation Status: INSUFFICIENT_DATA / 원천 검증 상태 PENDING_VERIFICATION / TARGET_DATE_BALANCE_UNVERIFIED
기존 6/30~8/21 산술 대사 차이 0주 유지, 전수 변동 검증은 대기. 현재 대사의 기초는 8/21이며 6/30 잔고를 재사용해 이중 반영하지 않음.
추가 구현: 명시적 잔고 기준일 일치 검사. 공시일을 기준일로 대체 금지. RECONCILED/MISMATCH/INSUFFICIENT_DATA/PENDING_CORRECTION 판정 분리. 정정 미해결 시 계산 차단; 최종 정정 관계 자체의 실자료 확인은 대기.

SHARE COUNT:
Common: 6/30 발행 5,846,278,608 / 자기주식 82,086,705 / 유통 5,764,191,903주, 기존 원천 보존.
Preferred: 6/30 발행 802,371,203주 / 자기주식 미확인, 원문 대시를 0으로 변환하지 않음.
As-of Date: 2026-06-30. 10/8 가격과 날짜 불일치; 현재 주식수·배수 확정 보류.
자기주식 취득·처분을 발행주식수 변동으로 처리하지 않음. 소각 영향은 별도 근거 필요.

CORPORATE ACTIONS:
Coverage: 2026-08-26~10-08 가격 29개, 기존 원문 21개 재사용. KIND 관측기간 22건 및 이전 구간 844건 조회 기록 보존, 조회 완료는 전수검증 완료 아님.
Verified: 보통주 9/29 배당락 적용일과 기준가격 270,000원 원문, 과거 실제 처분 2건, 취득 체결 29개 근거 유지.
Pending: 모든 관련 유형의 독립적인 완전성, 정정 관계, 실제 소각·발행 변동, Q3 배당 금액·지급 근거.

SAMSUNG 005930:
Verified Return Period: 없음 / Price Return: 보류 / Total Return: 보류
Performance Status: PERFORMANCE_BLOCKED. RAW 원주가 유지, 중복 조정 없음. 미확인 구간에서 부분 성과도 임의 활성화하지 않음.
BENCHMARK: 기존 KOSPI/KOSDAQ 50개 가격지수 자료 재사용, 독립 차트 유지. 종목 공통 관측구간 2026-08-26~10-08 29개이나 종목 비교는 BENCHMARK_BLOCKED. 거래일 독립 완전성 추가 근거 필요.
PEER COMPARISON: 기존 국내 3개 연결 / Eligible 0 / Excluded 국내 3개 / 최소 3 유지. 업종·사업 특성 및 기준일 검증 부족. Apple·자기기업 제외도 기존 API 유지.

WEB UI: PASS — 실제 저장 보고서의 기초·공시 잔고·차이0·10/8 미확인·신규 INSUFFICIENT_DATA, 취득 합계·기간·TTM·근거·성과 보류 검사. 320/360/390/768/1024/1440, light/dark 12조건 및 200% 확대 가로 넘침 없음.
GALAXY A33: 이번 기존 앱 연결·삼성전자 상세·잔고 기준일·자료부족·예정/실제 합계·스크롤·연결 실패/복구 PASS. 캡처를 실제 열어 확인. 복구 후 홈 지수는 새로고침 전 미연결 초기 상태로 확인; 이를 지수 실데이터 표시 완료로 보고하지 않음.
DEVICE EVIDENCE: docs/uiux/galaxy-a33-oct8-{balance,execution,failure,restored}.png
INSTALL: NOT RUN — 네이티브 변경 없음, 기존 설치 유지. 이번 가로 비교표 재검증·전체 일별 타임라인 펼침·벤치마크 실기기·OS 200% 확대 NOT RUN, 이전 검증을 이번 결과로 승격하지 않음.

SOURCES / READ AUDIT:
2026-10-12 공식 KIND 직접 HTTP 3회: JCommon.js; 삼성전자 기업 요약 shell; 회사개요 detail. 기업코드 00593 확인, 해당 응답에 10/8 잔고 근거 없음. web search 2회(4 queries), KIND/공식 Samsung IR 탐색, 정확한 기준일 잔고 미확보. 기존 원문 및 체결 근거는 재다운로드하지 않음.
원문·SHA256·시각·고정 파라미터는 Git 제외 data/v2/verification/oct8-source-audit-*.json 및 HTML 보존. 자동 테스트는 fixture만 사용, 공식 HTTP는 별도 수동 읽기.
KIND 실제 체결 출처: https://kind.krx.co.kr/corpgeneral/treasurystk.do?method=loadInitPage
KIND 기업 요약: https://kind.krx.co.kr/common/companysummary.do?method=searchCompanySummary

RECOMMENDATION: HOLD (Apple 포함)
LIVE TRADING: OFF — 로컬 /health brokerEnabled=false, liveTrading=false, externalAccess=false 재확인.
REAL ORDERS: 이번 작업 0 — 주문/취소/계좌 API 호출 없음. 외부 계좌 전체 주문 이력 조회는 NOT RUN.
APPLE/SEC: 저장 입력의 삼성전자 외 기업과 root evidence 깊은 비교 일치. 삼성전자 RAW priceHistory 깊은 비교 일치.
MODIFIED FILES: src/v2/treasury_ledger.js; test/treasury_balance.test.js; public/app.js; scripts/apply-oct8-balance-review.mjs; docs/KSTOCK_QA_FOLLOWUP_REPORT.md; docs/AUTO_DEV_LOG.md; 위 Galaxy 캡처. 기존 기타 미커밋 변경 보존.
BLOCKERS: 10/8 공식 잔고, Aug21 이후 처분·소각·기타 변화 전수 근거 및 정정 관계, 현재 주식수 기준일, 비교 표본.
NEXT ACTION: 10/8 잔고를 명시한 최종 유효 공시/공식 주식현황 근거 확보 → 실제 변동 전체 기간 대사 → 주식수·기업행동 검증 → 검증 구간 성과 및 동일 기간 벤치마크 → 남은 실기기 QA.
OVERALL: PARTIAL — 기준일 검증·대사 상태 및 화면 개선 완료, 원천 부족 선행 조건 미완료.

--- 이전 기록 보존 ---

# K-STOCK AI DEVELOPMENT REPORT

2026-10-12 KST · 잔고 대사 후속 실행. 전체 **PARTIAL**. 이번 결과와 아래 과거 기록을 구분한다.

```text
PROJECT: /Users/ari/ARI/projects/k-stock-ai
BRANCH: auto/kstock-development-20260930
COMMIT: ea406852610c00bef0dbe469de95c42fca662c30 / 미커밋 변경 보존
VERSION: package 1.0.0 / server 0.1.0 / Android 2.6.5 (265)
BASELINE: Offline 313 PASS 이번 재실행 / Android Contract 3 PASS 이번 실행
CURRENT TESTS: Offline 322 / Android Contract 3
PASS: 322 + 3
FAIL: 0
TREASURY SHARES:
Opening Balance: 보통주 82,086,705주 / 2026-06-30
Actual Acquisition: 기존 56,856,305주 / 8/24~10/6 29체결일 재사용 / 새 거래 추가 0
Actual Disposal: 기존 2,215,911주 / 7/8·7/13 재사용
Actual Cancellation: 미확인 / 0으로 확정하지 않음
Closing Balance: 공시 79,870,794주 / 2026-08-21 / 10/8 잔고 미확인
Reconciliation: 6/30~8/21 확인 항목 산술 MATCH, 차이0주 / 전체 coverage PENDING
SHARE COUNT:
Common: 6/30 보고서 산술 확인 / 가격 기준일 정렬 보류
Preferred: 6/30 자기주식수 null / 별도 PENDING_VERIFICATION
Issued: 보통주 5,846,278,608주 / 우선주 보고값 802,371,203주
Treasury: 보통주 82,086,705주 / 우선주 미확인
Outstanding: 보통주 5,764,191,903주 / 우선주 보고값은 정의 검증 미완료
As-of Date: 주식수 2026-06-30 / 가격 2026-10-08 / 현재 수량 확정 금지
CORPORATE ACTIONS:
Coverage: 관측8/26~10/8, 선행 공시6/30~8/25 기존 조사 보존 / 11유형 전체 검증 미완료
Verified: 기존 실제 취득29일·처분2건·배당락 날짜1건 유지 + 역사 잔고2기준일 대조
Pending: 유형별 coverage11, 소각·기타 변동, 현재 기말잔고, 정정 관계, 배당 필수조건
SAMSUNG 005930:
Verified Return Period: 없음
Price Return: null
Total Return: null
Performance Status: PERFORMANCE_BLOCKED
BENCHMARK:
KOSPI: 기존50일 PRICE_INDEX / BENCHMARK_BLOCKED
KOSDAQ: 기존50일 PRICE_INDEX / BENCHMARK_BLOCKED
Aligned Period: 관측8/26~10/8 공통29일 / 계산 허용 구간 없음
PEER COMPARISON:
Connected: 기존한국3종
Eligible: 0 / 최소3 유지
Excluded: SK하이닉스·DB하이텍·한미반도체 업종/사업 검증 미충족
WEB UI: 잔고·대사 차이·현재 미확인 PASS / 6폭×2테마·200% PASS
GALAXY A33: 기존 앱 실행·연결·삼성전자 상세·새 잔고 값/기간/단위/출처·보류·가로 스크롤·연결 실패/복구 PASS
RECOMMENDATION: HOLD / Apple 포함
LIVE TRADING: OFF / brokerEnabled false, liveTrading false, externalAccess false
REAL ORDERS: 이번 실행0 / 주문·취소·계좌 API 미실행
NOT RUN: 신규 APK 설치(네이티브 변경 없음), OS200% 실기기 확대, 운영 인증/페어링
BLOCKERS: 동일 기준일 기말잔고/소각/기타 변동과 모든 유형 coverage, 우선주 정의, 평가배수/성과 선행조건
NEXT ACTION: 공식 동일 기준일 잔고·소각/기타 변동·정정 연결 확인 → 기준일 정렬 → 검증 구간 성과/지수 비교
OVERALL: PARTIAL
```

## 원천과 이번 대사

이번 공식 데이터 재요청 **0회**. 저장된 공식 자료의 식별자·기간·주식 종류·SHA256을 대조했다. KIND 실제56,856,305주는 신규 취득으로 추가하지 않았다. 기존 `treasuryExecutionReview`의 일별29개·신고 누계·공식 회사식별 자료를 유지했고 새로운 계산에는 합계와 일별 기록을 동시에 넣지 않았다. 취득 결정 접수20260821000785와 본문 문서번호는 관련 계획 식별자이며 일별 접수번호가 아니다. 일별 실제 공개시각은 미확인으로 유지한다.

기초는 OpenDART 주식총수 공시20260814003699의 보통주6/30 자기주식82,086,705주. 기말은 보관된 KIND 취득 결정20260821000785 본문의8/21 보통주 보유현황79,870,794주이며 사본 SHA256 일치를 확인했다. 처분 결과 공시20260710000843의 실제7/8 1,083,434주와20260716000982의 실제7/13 1,132,477주를 사용했다. 따라서 **82,086,705 − 1,083,434 − 1,132,477 = 79,870,794**, 차이0주다. 취득8/24~10/6은 이 대사 종료8/21 이후이므로 이 식에 넣지 않았다.

산술 MATCH와 해당 기간 전체 변동 VERIFIED를 분리한다. 소각·재분류·기타 변동/정정 관계의 전체 조사 완료 근거가 없으므로 coverage false, historical status PENDING_VERIFICATION이다. 기초·기말을 `OPENING_BALANCE`/`CLOSING_BALANCE`로 구분했다. 현재10/8 기말 원천값이 없어 currentClosingBalance null, CLOSING_BALANCE_UNVERIFIED를 반환한다. 확인된 취득을 더해 만든 수량을 현재 공시 잔고로 표시하지 않는다. 원천과 입력은 Git 제외 `data/v2/verification/balance-input-*.json` 및 기존 kind-actions/treasury 자료에 보존했다.

## 구현·회귀

`reconcileTreasuryBalance`를 기존 ledger에 추가했다. 동일 회사·종류·기간·출처·공개시점·미래 기준일을 검사하고, 예정 취득은 제외하며, 중복 체결과 미해결 정정은 차단한다. 실제 취득/처분/소각과 별도 기타 조정의 부호를 구분한다. 기타 조정은 확인된 signed delta만 허용한다. 기초나 기말이 없으면 계산 잔고를 확정하지 않으며 실제 공시 잔고와 다른 경우 RECONCILIATION_MISMATCH와 정확한 차이를 반환한다. 기존 발행주식수 정렬/소각 효력 검증 Gate는 유지했다.

보통주/우선주를 합산하거나 우선주의 '-'를 0으로 바꾸지 않았다. 우선주 자기주식수 null·정의 미검증 상태를 유지했다. 가격 RAW29일, 두지수50일, 배당락 **2026-09-29** 공식 근거, DART원문21건, 모든 유형coverage와 peer최소3 정책을 보존했다. 유효 한국비교표본0, 현재 평가배수null. 현재 API에서 종목 PERFORMANCE_BLOCKED와 KOSPI/KOSDAQ BENCHMARK_BLOCKED를 직접 확인했다. 현재 가격/주식수 정렬 또는 기업행동 coverage를 완료로 올리지 않았다.

Web 새 기초잔고82,086,705·공시기말79,870,794·처분2,215,911·차이0·10/8미확인과 원천 링크를 실제 저장 데이터로 확인했다. 기존 실제취득/타임라인/TTM/주식수/peer/배당·보류 회귀, 320/360/390/768/1024/1440폭×라이트/다크·200% 확대 PASS. Galaxy A33 RFCW1178RRE 기존2.6.5 앱에서 새 대사 화면의 값·기간·단위·출처와 current보류가 일치했고 긴 설명 스크롤 및 비교표 가로 스크롤 PASS. 서버 연결 실패 안내 후 finally USB reverse 복구·정상 연결 PASS. 매 입력 전 전면 K-Stock 검사, 다른 기기·사용자 데이터·OS 설정 변경 없음. 이전 체결 타임라인 펼침 검증 기록은 유지하며 이번 신규 확인은 대사/비교표/연결 상태 중심이다.

`npm run test:offline`: **322/322 PASS**(기준313 포함). `node --test test/android_external.test.js`: **3/3 PASS**. 신규8개 잔고 테스트 + UI1개: 잔고 식·불일치·기초/기말 누락·계획 제외·중복·주식종류·미해결정정·미래 공개/기준일·기타 조정·현재값 확정 금지. 테스트는 fixture이며 외부 요청 없음. 로그 `/tmp/kstock-balance-{baseline,final,android,web}.log`. git diff check PASS. 미국 기업/SEC근거와 삼성전자 RAW 변경 전후 동등성 PASS, 전체 승인false 확인. health 실거래/브로커/외부접속false, 이번 실제 주문0. .env·운영 ari-prod-01/kstock.ai.kr·다른 프로젝트 변경 없음.

변경 파일: `src/v2/treasury_ledger.js`, `scripts/apply-treasury-balance.mjs`, `test/treasury_balance.test.js`, `test/candidate_ui.test.js`, `public/app.js`, 본 QA 보고서, AUTO_DEV_LOG, `docs/uiux/galaxy-a33-balance-*.png`. 현재 부족한 실제 잔고·소각/기타 변화·유형별 coverage를 확보해야 성과와 추천 차단을 재검토할 수 있다. 과거 자료의 산술 일치로 전체 완료를 선언하지 않는다.

---

## 이전 실행 기록

# K-STOCK AI DEVELOPMENT REPORT

2026-10-12 KST · 자기주식 실제 체결 후속 검증. 전체 **PARTIAL**. 아래 이전 결과와 이번 실행을 구분한다.

```text
PROJECT: /Users/ari/ARI/projects/k-stock-ai
BRANCH: auto/kstock-development-20260930
COMMIT: ea406852610c00bef0dbe469de95c42fca662c30 / 기존 미커밋 변경 보존
VERSION: package 1.0.0 / server 0.1.0 / Android 2.6.5 (265)
BASELINE: Offline 302 PASS 이번 재실행 / Android Contract 3 PASS 이번 실행
CORPORATE ACTIONS:
Coverage: 가격 관측 2026-08-26~2026-10-08 / 선행 공시 6/30~8/25 재사용 / 체결 조회 8/24~10/8
Verified Events: 실제 취득 29개 일별 기록 + 실제 처분 2개 기록 + 별도 배당락일 근거 1개
Pending Events: 취득 계획 1개(실행 기록과 구분), 배당 이벤트 2개(필수조건 미완료), 유형별 coverage 11개 대기
TREASURY SHARES:
Planned Acquisition: 53,285,968주 / 예정 2026-08-24~2026-11-21
Actual Acquisition: 56,856,305주 / 2026-08-24~2026-10-06, 29일 / 관측기간 내 53,056,305주
Actual Disposal: 1,083,434주 7/8 + 1,132,477주 7/13 = 2,215,911주 / 관측 이전
Actual Cancellation: 미확인 / 0주로 취급하지 않음
SHARE COUNT:
Issued: 5,846,278,608주
Treasury: 82,086,705주
Outstanding: 5,764,191,903주
As-of Date: 2026-06-30 / 보통주 정기보고서 / 현재 가격 10/8과 정렬 미완료
SAMSUNG 005930:
Verified Return Period: 없음 / 실제 가격 29거래일 유지
Price Return: null
Total Return: null
Performance Status: PERFORMANCE_BLOCKED
BENCHMARK:
KOSPI: 기존 50거래일 PRICE_INDEX 유지 / BENCHMARK_BLOCKED
KOSDAQ: 기존 50거래일 PRICE_INDEX 유지 / BENCHMARK_BLOCKED
Aligned Period: 관측 날짜 배열은 8/26~10/8 공통29일 / 계산 허용 구간 없음
PEER COMPARISON:
Connected: 기존 한국 3개 수집 표본 재검증
Eligible: 0 / 최소3 유지
Excluded: SK하이닉스·DB하이텍·한미반도체 업종 불일치, 사업 동질성 등 미완료
WEB UI: 실제 체결·타임라인·보류 안내 PASS / 6폭×2테마·200% PASS
GALAXY A33: 실행·연결·삼성전자 상세·취득 합계·일별 펼침·주식수 기준일·성과/지수 비교 보류·추천 보류·가로 스크롤·연결 실패/복구 PASS
CURRENT TESTS: Offline 313 / Android Contract 3
PASS: 313 + 3
FAIL: 0
RECOMMENDATION: HOLD / Apple 포함
LIVE TRADING: OFF / health brokerEnabled false, liveTrading false, externalAccess false
REAL ORDERS: 이번 실행 0 / 주문·취소·계좌 API 미실행
NOT RUN: 신규 APK 설치(네이티브 변경 없음), 실기기 OS 200% 확대, 운영 인증/페어링
BLOCKERS: 유형별 전체 기업행동 coverage, 실제 소각/발행 변화 근거, 주식수 기준일 정렬, Q3 배당금·지급조건, 유효 동종 표본
NEXT ACTION: 발행주식수·소각 적용 근거/공개시각 및 유형별 coverage 대조 → 검증 기간 확정 → 종목/동일 지수 성과
OVERALL: PARTIAL
```

## 공식 자료·조사 범위

[KRX KIND 자사주취득/처분](https://kind.krx.co.kr/corpgeneral/treasurystk.do?method=loadInitPage)의 **체결내역**을 직접 확인했다. 공식 회사 식별 조회에서 `005930 / KR7005930003 / 00126380 / isurCd 00593`를 대조했다. 최초 대표종목 코드만 보낸 응답은 다른 회사가 포함된 전체 시장 1,447건이라 **REJECTED_SCOPE_MISMATCH**로 버리고 계산에 사용하지 않았다. 발행기관 식별자를 적용한 삼성전자 결과는 29건·1/1페이지, 거래일 8/24~10/6이다. 신청수량 대신 당일체결수량을 합산했다. 기존 보통주 취득 결정 문서·주식 종류·계획 기간·예정 수량과 동일한 신고내역 1건을 대조했으며 일별 합계 56,856,305주가 신고 체결 누계와 일치했다.

예정 수량보다 실제 체결 수량이 크다는 사실을 숨기거나 계획량으로 잘라내지 않았다. 계획 공시에는 가격에 따른 실제 수량 변동 가능성이 명시되어 있고 공식 신고 누계와 체결 합계가 독립적으로 일치했다. 실제 취득 합계가 관측기간 내 합계와도 다르다는 점을 표시한다: 8/24 1,800,000주 + 8/25 2,000,000주는 가격 관측 시작 전이므로 관측 8/26~10/8 합계는 53,056,305주다. 조회 결과가 10/6에 끝난다는 사실을 취득계획 최종 완료·취소의 근거로 확대하지 않았다. 결과보고서와 정정 관계는 별도 미확인이다.

이번 직접 KIND 읽기 **7회**: 화면 1, 필터 미적용 조회 1, 회사 스크립트 경로 시도 1(사용 불가), 실제 포함 스크립트 1, 회사 식별 1, 한정 체결 1, 한정 신고 누계 1. Web 검색/공식 페이지 open은 별도 탐색이다. OpenDART 원문21건·기존 IR·KIS가격·두 지수 재요청 0. `data/v2/verification/treasury-source-audit.json`에 요청별 출처·확인시각·SHA256·성공/실패 분류를 보존했다. 실제 자료는 `treasury-executions-*.json/.html`, `treasury-source-company.json`, `treasury-source-samsung-decl.html`에 Git 제외·0600으로 보존한다. 공개 화면에는 기업 수량·날짜·공식 링크만 연결하고 개인 원문이나 비밀값을 포함하지 않는다.

거래일은 확인됐지만 과거 공개 시각은 확인되지 않았다. 일별 기록의 `availableAt`은 현재 자료 확인 시각이며 과거 거래일로 소급하지 않는다. `sourceDocumentId`는 연결된 취득 결정 문서 식별자이고 `executionId`는 해당 계획과 거래일의 내부 구분 값이다. 일별 공시 접수번호가 확인된 것처럼 표현하지 않는다. 과거 평가·후보를 재작성하거나 D-2 점수에 반영하지 않았다.

## 기업행동·주식수·성과

전체 11유형 coverage는 모두 PENDING_VERIFICATION이다. 개별 체결29건의 검증과 전체 기간 모든 사건의 확인은 서로 다른 판정이다. 기존 관측공시22건·선행844건·DART원문21건의 목록과 본문 근거를 재사용했다. 다른 유형의 제목이 없다는 이유로 사건 부재를 확정하지 않았다. 배당락일은 **2026년** 9/29, 보통주 KIND 접수 20260928000389/문서20260928001095 기존 공식 근거를 유지한다. 권리락일은 미확인. Q3 배당액·지급조건은 미확인이고 Q2 금액을 복사하지 않았다.

자기주식 취득/처분은 issued를 유지하고 treasury와 outstanding에 반대 방향으로 반영한다. 소각은 수량 외에 실제 발행 감소와 적용일의 독립 근거가 없으면 shareImpact를 만들지 않는다. 새 ledger는 주식 종류·원천·공개 시점·중복·예정 여부·음수 재고·모든 주식수 변동 유형 coverage를 검사한다. 실제 자료에서 현재 주식수 정렬은 `FULL_SHARE_CHANGE_COVERAGE_REQUIRED`로 차단됐다. 6/30 보고서의 보통주 산술 관계는 유지하지만 확인된 취득/처분만 더해 현재 주식수나 시가총액을 만들지 않는다. 소각·증자 등 미확인 변화의 누락을 막는다.

가격은 기존 RAW29일이며 추가 조정 없음. 전체 coverage가 충족되지 않아 검증된 일부 성과 구간도 아직 없다. 가격수익·총수익·MDD·초과수익을 생성하지 않았다. 기존 지수50일과 공통29일 배열을 유지하고 종목 비교 API의 PERFORMANCE_BLOCKED / 두 BENCHMARK_BLOCKED를 직접 확인했다. 지수 자체 표시와 종목 비교를 구분한다.

기존 비교기업 3개의 업종/기간/CFS/원천과 제외 사유를 현재 계산에서 다시 확인했다. 삼성전자264와 SK하이닉스2612·DB하이텍2611·한미반도체29271이 다르며 사업 동질성 자료도 미완료다. 유효 표본0, 최소3, 중앙값/차이는 null. 자기 자신과 Apple도 비교 표본에서 제외됐다. 새로운 유료 수집이나 기준 완화 없음.

## 구현·QA

- `src/v2/treasury_ledger.js`: 공식 체결 표의 회사/종류/기간/수량/전페이지 검증, 신청·실제 분리, 공개시점 보수 처리 및 기준일별 ledger 구현.
- `src/v2/entitlement_events.js`: 소각의 발행주식수 감소 근거 미확인 시 차단.
- `scripts/apply-treasury-executions.mjs`: 저장된 공식 체결·신고 누계와 기존 보통주 계획을 대조하고 삼성전자 evidence에 연결. 외부 요청 없이 로컬 입력만 갱신.
- `public/app.js`: 실제 취득·계획량·관측기간량·소각 미확인·주식수 보류와 접을 수 있는 일별 타임라인, 공식 출처·자료 확인일 표시. 기존 디자인 유지.
- 테스트: `test/treasury_ledger.test.js` 신규, `test/entitlement_dates.test.js`, `test/candidate_ui.test.js` 확대. 거래 목록 불완전/회사·주식종류 오류/계획 범위/실제수량/중복/미래 공개/소각 근거/전체 coverage 누락/성과 보류 계약 검증. 자동 테스트는 fixture만 사용.
- 명령: `npm run test:offline` 최종313/313 PASS(기준302 포함), `node --test test/android_external.test.js` 3/3 PASS, `git diff --check` PASS. 로그 `/tmp/kstock-treasury-{final,android,web}.log`. 초기 신규 fixture의 title 파싱 실패는 수정 후 전체 회귀 통과했으며 실패 상태를 완료로 보고하지 않았다.
- Web 실제 체결 합계·관측 수량·보류·타임라인·공식 링크 및 기존 TTM/주식수/동종 표본/배당 근거 PASS. 320/360/390/768/1024/1440폭×라이트/다크·글자200% 넘침 없음.
- Galaxy A33 RFCW1178RRE 기존2.6.5 앱: 실제 취득56,856,305주·관측53,056,305주·예정53,285,968주·29일·8/24~10/6 Web 일치. 타임라인 펼침/스크롤, 6/30 보고서 주식수와 10/8 가격 기준일 보류, 두 지수 비교 보류, 추천 보류, 비교 표 가로 스크롤 PASS. 연결 실패 안내 후 finally USB 복구와 정상 연결 PASS. 모든 입력 직전 전면 앱 검사, 다른 기기/OS 설정/사용자 데이터 변경 없음. 캡처 `docs/uiux/galaxy-a33-treasury-*.png`. 앱 설치 여부는 기존 설치 유지이며 이번 신규 설치 NOT RUN.
- Apple 입력/SEC evidence 변경 전후 동등성 확인, 후보 승인false 유지. health 실거래/브로커/외부 접속 false. 실제 주문 관련 요청0. 운영 ari-prod-01 /srv/k-stock-ai/current 및 kstock.ai.kr 변경 없음. .env·다른 프로젝트 변경 없음.

추가 변경 문서: 본 보고서·`docs/AUTO_DEV_LOG.md`. 남은 source Gate는 자동 승인 요청이 아니라 확인 자료 부족이다. 실제 소각/발행 변화, 전체 유형 coverage와 공개시각을 확인한 후에만 기준일 정렬·성과·동일 기간 지수 비교를 연결한다.

---

## 이전 실행 기록

# K-STOCK AI NEXT QA REPORT

2026-10-12 KST. 이번 실행 결과는 PARTIAL. 아래의 이전 기록은 당시 결과로 보존한다.

```text
PROJECT: /Users/ari/ARI/projects/k-stock-ai
BRANCH: auto/kstock-development-20260930
COMMIT: ea406852610c00bef0dbe469de95c42fca662c30 / 미커밋 변경 보존
VERSION: package 1.0.0 / server 0.1.0 / Android 2.6.5 (265)
BASELINE: Offline 292 PASS (이번 재실행) / Android Contract 3 PASS (이번 최종 실행)
KRX:
Source: KRX KIND 삼성전자 대상 목록·viewer·문서 본문
Coverage Period: 관측 2026-08-26~2026-10-08 22건 / 선행 2026-06-30~2026-08-25 844건, 9페이지
Ex-Date: 보통주 2026-09-29 VERIFIED
Rights Date: 미확인 / 배당락일과 혼용 금지
Verification: 날짜 근거 확인 / 전체 경제적 기업행동 coverage false
CORPORATE ACTIONS:
Coverage: 조회 목록 전 페이지 확보 / 유형별 전수 적용 검증 미완료
Verified: 실제 자기주식 처분 2건(관측 이전) + 배당락 날짜 근거 1건
Pending: Q3 배당액·지급일, Q2 배당락일, 관측기간 자기주식 취득 실적 및 기타 유형 검증
Conflicts: 실제 발견 0 / fixture 날짜 충돌 차단 PASS
PRICE DATA:
RAW: 기존 29거래일 원주가 보존
ADJUSTED: 검증된 수정주가 없음
Adjustment Verification: 9/28 RAW 종가 270,000 KRW와 KRX 기준가격 일치 / 조정 추가 적용 0
SAMSUNG 005930:
Verified Period: 없음
Price Return: null
Total Return: null
Status: PERFORMANCE_BLOCKED
BENCHMARK:
KOSPI: 기존 50거래일 PRICE_INDEX 유지 / BENCHMARK_BLOCKED
KOSDAQ: 기존 50거래일 PRICE_INDEX 유지 / BENCHMARK_BLOCKED
Aligned Period: 날짜 배열은 2026-08-26~2026-10-08 29일 일치 / 성과 비교 허용 구간 없음
WEB: 실제 Q3·기업행동·보류 표시 PASS / 6폭×2테마·200% PASS
GALAXY A33: 기존 설치 앱·긴 설명 스크롤·연결 실패/복구 PASS
Q3 SCREEN: 기준일 9/30, 배당락일 9/29, 금액·지급일 미확인 Web 일치 PASS
CURRENT TESTS: Offline 302 / Android Contract 3
PASS: 302 + 3
FAIL: 0
RECOMMENDATION: HOLD / Apple 포함 / 유효 동종 표본 0, 최소 기준 3 유지
LIVE TRADING: OFF / health brokerEnabled false, liveTrading false, externalAccess false
REAL ORDERS: 이번 실행 0 / 주문·취소·계좌 API 호출 없음
NOT RUN: 신규 APK 설치(네이티브 변경 없음), 실기기 OS 200% 확대, 운영 인증/페어링
BLOCKERS: 관측기간 기업행동 전체 적용 검증, 취득 실제 수량·날짜, 주식수 기준일 정렬, 동종 표본 부족
NEXT ACTION: 진행 중 취득의 실제 실행 공시·유형별 적용 근거 확인 → 검증 구간 확정 → 가격 성과/동일 기간 지수 비교
OVERALL: PARTIAL
```

## 실제 원천과 조사 범위

[KIND 보통주 배당락 공시 원문](https://kind.krx.co.kr/external/2026/09/28/000389/20260928001095/99335.htm)의 접수번호는 20260928000389, 문서번호는 20260928001095다. 회사명 삼성전자·보통주식·적용일 2026-09-29·기준가격 270,000 KRW·기준가격 변동없음을 직접 대조했다. 같은 날 우선주 공시 20260928000391은 보통주에 적용하지 않았다. 기준가격 변동없음은 수정주가나 배당 포함 총수익률 검증을 의미하지 않는다. 기존 IR의 Q3 기준일 9/30과 날짜 충돌은 없고, 배당액·지급일은 추정하지 않았다.

이번 제한된 읽기 요청은 **KIND 37회**: 검색 화면 1 + 관측 목록 1 + 배당락 viewer/문서 경로/본문 3 + 선행 목록 9 + 선행 후보 6건의 viewer/문서 경로/루트 18 + 실제 본문 링크 5. 루트 목차만으로 원문 검증을 완료하지 않고 연결된 본문까지 확보했다. Web 검색 도구의 KIND 화면 확인과 원문 open 실패는 별도이며, 후자는 실제 HTTP 원문 확보 성공과 구분한다. OpenDART 원문 21건·IR·KIS·지수 재수집은 이번 실행 0회. 출처별 수집 시각·SHA256·페이지 수와 자료는 Git 제외 `data/v2/verification/kind-scope-*`, `kind-prior-*`, `kind-actions-1791775652448/{manifest,body-manifest}.json`에 남겼다. 확인일 2026-10-12 KST. 원문 개인정보는 화면/API·Git으로 전달하지 않았다.

선행 844건의 9페이지를 모두 조회하고 기업행동 후보 6건 본문을 확인했다. 7/10 처분결과 공시의 실제 7/8 처분은 보통주 1,083,434주, 7/16 처분결과 공시의 실제 7/13 처분은 1,132,477주다. 82,086,705 − 1,083,434 − 1,132,477 = 79,870,794주를 대조했다. 결과보고서 공개일 이전에는 실행 근거를 이용할 수 없도록 차단했다. 두 처분은 가격 관측 시작 이전이다.

8/21 취득 결정은 8/24~11/21 **예정** 53,285,968주다. 실제 취득 수량·일별 실행일은 확인되지 않았으며 예정 시작일을 실행일로 처리하지 않았다. 자기주식 취득을 소각·발행주식수 감소로 처리하지 않았다. 연간 소각 합계도 발생일 근거 없이 관측기간 이벤트로 적용하지 않았다. 다른 유형의 관련 제목이 조회되지 않았다는 사실은 해당 사건 부재나 전체 coverage VERIFIED의 근거가 아니다. 권리락·분할·병합·증자·주식배당·소각·액면변경은 유형별 적용 검증 대기다.

## 계산·화면·검증

- 기존 RAW 29일 및 두 지수 50일을 재사용했다. 날짜 배열의 공통 29일 일치만 확인했으며 독립적인 휴장일 달력 검증은 미완료다. 결측 보간·임의 연율화·배당 중복 조정 없음. 검증된 성과 구간이 없어 종목 수익률·MDD·초과수익 수치를 생성하지 않았다.
- Web은 Q3 날짜, 실제 처분과 예정 취득 수량, 공식 원문 링크, 기업행동 보류 사유를 실제 저장 데이터로 확인했다. TTM·회계기간·주식수·동종 표본·기존 원문 분류 회귀와 320/360/390/768/1024/1440폭×라이트/다크, 200% 글자 확대 검사 PASS. `/tmp/kstock-krx-web.log`에 결과를 남겼다.
- Galaxy A33 RFCW1178RRE만 검증했다. 모든 터치/스크롤/캡처 직전에 K-Stock 전면 패키지를 검사하는 가드를 추가했고 다른 앱이면 입력을 차단하는 fixture도 PASS. 실제 Q3 전체 문단의 기준일·배당락일·미확인 금액/지급일·추천/성과 보류가 Web과 일치했다. 긴 링크/설명 스크롤과 현재 글자 크기의 줄바꿈 확인 PASS. USB reverse 제거 후 연결 실패 안내를 확인하고 finally 복구 뒤 연결 정상 확인. OS 설정·사용자 데이터·다른 기기 변경 없음. 신규 설치는 수행하지 않았다.
- `npm run test:offline`: 302/302 PASS. `node --test test/android_external.test.js`: 3/3 PASS. KIND 회사/기간/중복/페이지 불완전/우선주/잘못된 날짜/미래 공개/날짜 충돌, 예정 취득 실행 차단, 결과보고 공개시점, UI 및 전면 앱 가드 검증을 추가했다. 자동 테스트는 fixture/stub이며 외부 수집과 분리했다. `git diff --check` PASS. 미국 기업 입력과 SEC 근거의 변경 전후 동등성 PASS, 전체 후보 승인 false 확인.

## 변경 파일

추가: `src/v2/kind_rights.js`, `scripts/verify-kind-saved-scope.mjs`, `verify-kind-prior-read-only.mjs`, `retrieve-kind-action-documents.mjs`, `retrieve-kind-action-bodies.mjs`, `apply-kind-investigation.mjs`, `galaxy_qa_guard.py`, `test/kind_rights.test.js`, `test/galaxy_foreground.test.js`.
수정: `src/v2/entitlement_events.js`, `public/app.js`, `test/entitlement_dates.test.js`, `test/candidate_ui.test.js`, 본 보고서, `docs/AUTO_DEV_LOG.md`. 캡처: `docs/uiux/galaxy-a33-krx-{rights,q3-final,error,restored}.png` 및 Web 회귀 캡처. 기존 미커밋 변경 보존, .env 변경 없음. 다른 프로젝트·운영 배포·유료 서비스·실거래 작업 없음.

---

## 이전 실행 기록

# K-STOCK AI SOURCE VERIFICATION REPORT

2026-10-12 KST. 전체 **PARTIAL**. 이번 검증과 이전 사이클 기록을 구분한다.

```text
PROJECT: /Users/ari/ARI/projects/k-stock-ai
BRANCH: auto/kstock-development-20260930
COMMIT: ea406852610c00bef0dbe469de95c42fca662c30 / 변경 미커밋
VERSION: package 1.0.0 / server 0.1.0 / Android 2.6.5 (265)
BASELINE: Offline 286 PASS (현재 재실행) / Android 3 (직전 기준)
DISCLOSURES:
Collected: 기존 21 재사용 / 목록 재조회 0
Original Documents Retrieved: 21 / XML 원문 확보 21
Relevant: 0 (삼성전자 발행회사 기업행동 결의 기준)
Not Relevant: 21
Unavailable: 0
CORPORATE ACTIONS:
Verified: 0
Partial/Pending: 공식 IR 배당 2건, 필수 적용일 조건 미충족
Conflicts: 실제 발견 0 / fixture 차단 PASS
DIVIDEND:
Record Date: Q2 2026-06-30 / Q3 2026-09-30
Ex-Date: 공식 원문 미확보 / 미확인
Official Source: Samsung IR Q2 84746 / Q3 notice 20260921
Status: PENDING_VERIFICATION
SAMSUNG PERFORMANCE:
Verified Period: 없음 / 가격 관측 2026-08-26~2026-10-08, 29거래일
Price Return: null
Total Return: null
Status: PERFORMANCE_BLOCKED (기존 PENDING 호환 + calculationStatus)
BENCHMARK:
KOSPI: 기존 50일 PRICE_INDEX 보존
KOSDAQ: 기존 50일 PRICE_INDEX 보존
Aligned Period: 검증된 비교 구간 없음
Status: BENCHMARK_BLOCKED (각 지수 calculationStatus)
WEB: 실제 원문 확보 21/21·배당·보류 표시 / 6폭×2테마·200% PASS
GALAXY A33: 기존 앱 실행·USB 연결·삼성전자 상세·원문 분류 펼침·배당·추천 보류·비교표 가로 스크롤·네트워크 실패/복구 PASS
ANDROID CONTRACT: 최종 3 PASS
RECOMMENDATION: HOLD / Apple 포함
LIVE TRADING: OFF / brokerEnabled false, liveTrading false health 확인
REAL ORDERS: 이번 작업 0 / 조회·로컬 검증만 실행
CURRENT TESTS: Offline 292 / Android Contract 3
PASS: 292 + 3
FAIL: 0
OVERALL: PARTIAL
```

## 실제 원천 확인

[OpenDART 공시서류 원본 API](https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS001&apiId=2019003)의 `document.xml` 계약을 확인하고 기존 접수번호만 각각 1회 읽었다. 실제 호출 21회, 정상 ZIP 21건. 고정 endpoint·접수번호 형식·타임아웃·호출 건수 제한, 비밀값 출력 없음. `data/v2/verification/originals-1791773982534/manifest.json`에 수집 시각·SHA256·원문 확보 상태, `review-work.json`에 XML 확인·개별 분류 사유가 있다. 원문 ZIP은 개인정보가 포함될 수 있는 비공개 감사 자료로 0600/폴더 0700, Git 제외. UI/API는 원문 본문·인명·생년월일·개인 거래내역·로컬 경로를 전달하지 않고 공시 메타데이터와 분류 근거만 사용한다.

기업집단 공시 20260831000250의 현금배당 문맥은 삼성에프엔위탁관리부동산투자회사 2026-04-17 주총 안건이었다. 대량보유 공시의 자기주식 문구는 보유 비율 계산 안내였다. 소유상황/거래 계획의 발행주식수는 시점 참고 기재이며 발행회사 증자/소각 이벤트가 아니다. 키워드 일치로 이벤트를 만들지 않았다. 정정 공시 20260826000434는 원문 확보했으나 선행 접수번호 관계가 확인되지 않아 특정 다른 공시를 자동 대체하지 않았다. 정정 관계 명시/원문 확보/다중 정정 충돌 fixture 검증 추가.

| 접수번호 | 제목 | 원문 | 분류 |
|---|---|---|---|
| 20260831000250 | 대규모기업집단현황공시[분기별공시(대표회사용)] | 확보 | NOT_RELEVANT |
| 20260831000066 | 임원ㆍ주요주주특정증권등소유상황보고서 | 확보 | NOT_RELEVANT |
| 20260828001916 | 주식등의대량보유상황보고서(일반) | 확보 | NOT_RELEVANT |
| 20260828001836 | 임원ㆍ주요주주특정증권등소유상황보고서 | 확보 | NOT_RELEVANT |
| 20260826000445 | 임원ㆍ주요주주특정증권등소유상황보고서 | 확보 | NOT_RELEVANT |
| 20260826000434 | [기재정정]임원ㆍ주요주주특정증권등소유상황보고서 | 확보 | NOT_RELEVANT |
| 20260922000524 | 임원ㆍ주요주주특정증권등소유상황보고서 | 확보 | NOT_RELEVANT |
| 20260918800754 | 최대주주등소유주식변동신고서 | 확보 | NOT_RELEVANT |
| 20260918000212 | 임원ㆍ주요주주특정증권등소유상황보고서 | 확보 | NOT_RELEVANT |
| 20260918000191 | 임원ㆍ주요주주특정증권등소유상황보고서 | 확보 | NOT_RELEVANT |
| 20260917000097 | 임원ㆍ주요주주특정증권등소유상황보고서 | 확보 | NOT_RELEVANT |
| 20260914000248 | 임원ㆍ주요주주특정증권등소유상황보고서 | 확보 | NOT_RELEVANT |
| 20260909000516 | 임원ㆍ주요주주특정증권등거래계획보고서 | 확보 | NOT_RELEVANT |
| 20260909000113 | 임원ㆍ주요주주특정증권등소유상황보고서 | 확보 | NOT_RELEVANT |
| 20260908800624 | 최대주주등소유주식변동신고서 | 확보 | NOT_RELEVANT |
| 20261008000706 | 주식등의대량보유상황보고서(일반) | 확보 | NOT_RELEVANT |
| 20261008800028 | 기업설명회(IR)개최(안내공시) | 확보 | NOT_RELEVANT |
| 20261008800004 | 연결재무제표기준영업(잠정)실적(공정공시) | 확보 | NOT_RELEVANT |
| 20261002800981 | 최대주주등소유주식변동신고서 | 확보 | NOT_RELEVANT |
| 20261001000251 | 임원ㆍ주요주주특정증권등소유상황보고서 | 확보 | NOT_RELEVANT |
| 20261001000203 | 임원ㆍ주요주주특정증권등소유상황보고서 | 확보 | NOT_RELEVANT |

분류는 **해당 원문의 발행회사 기업행동 결의 여부**이다. 21건 NOT_RELEVANT는 관측 구간 기업행동 부재를 증명하지 않는다. 관측 이전 발표·관측 중 적용 및 KRX/KIND 자체 공시가 이 목록 밖에 있을 수 있다. 전수 coverage는 false 유지.

[삼성전자 공식 IR 공지](https://www.samsung.com/global/ir/reports-disclosures/notices/)는 9/21 공지에서 9/30 배당 기준일과 이사회 이후 세부사항 공시를 명시한다. 이번 HTML 읽기 1회, 비공개 사본/SHA 보존, Q3 이벤트 추가. 배당락일·주당액·지급일은 null, confirmed false. Q2 374 KRW를 Q3에 복사하지 않았다. KRX/KIND 대상 검색은 해당 삼성전자 보통주 공식 적용일 원문을 확보하지 못했다. 검색 결과 부재를 접근 거부나 사건 부재로 보고하지 않는다. 우선주/다른 회사 공시·보도·T+2 역산을 공식 날짜로 채택하지 않았다. 이번 별도 실제 읽기는 OpenDART 21 + IR 1 = 22회이며 검색/문서 가이드 확인은 별도이다.

## 구현·검증

- `disclosure_review.js`: 원문 확보 상태/분류/정정 관계를 추적, 제목 단독 분류 금지. 출처 간 recordDate/exDate/effectiveDate/paymentDate 충돌을 분리 비교하여 CONFLICT·계산 차단. 실제 날짜 충돌은 발견 0, fixture 테스트 완료.
- 상세 UI/API에 21건 원문 메타데이터와 제외 이유 연결, 확보한 원문 링크만 표시. 실제 원문 ZIP은 서버 정적 경로에 공개하지 않는다.
- 실제 종목/두 지수 API `PERFORMANCE_BLOCKED`/`BENCHMARK_BLOCKED` 확인. 기존 소비자 호환을 위해 status PENDING 유지, calculationStatus 명시. 검증된 일부 구간도 0이므로 수치를 만들지 않았다. 지수 50일 재수집 0·원주가 29일 보존·공통 기간 함수 fixture 회귀 PASS.
- Web 실제 데이터 새 요약 확인과 기존 TTM·주식수·배당 값/날짜/보류 확인. 320/360/390/768/1024/1440 × 라이트/다크, 글자 200% 가로 넘침 없음.
- Galaxy A33 RFCW1178RRE만 사용, 기존 ai.kstock.mobile.localvalidation 2.6.5 실행. 설치 상태/전경 앱/서버 연결 확인. 원문 21/21·관련 0·검증 구간 없음, 원문 분류 펼침/접힘·긴 설명/링크 표시, Q2 기준일/미확인 배당락일/예정 지급일/374 KRW Web 일치. 비교표 헤더에서 가로 드래그 후 과거 표본·차이·동종 중앙값 표시를 캡처하여 직전 NOT RUN 해소. 네트워크 실패 문구 확인 후 finally에서 USB reverse 복원·연결 정상 확인. 새 APK 재설치 불필요하여 NOT RUN. 이후 추가한 Q3 날짜의 최종 실기기 표시 재확인은 NOT RUN이며 Web/API 자료 연결과 구분한다. 마지막 재확인에서 다른 앱이 전경임을 발견해 추가 터치를 중단했다. 향후 자동 터치 직전에 전경 패키지를 다시 검사하고 불일치하면 중단해야 한다.
- `npm run test:offline`: 292/292 PASS (기존 286 포함). `node --test test/android_external.test.js`: 3/3 PASS. 원문 미확보·분류·정정 관계·날짜 충돌·성과/벤치마크 차단·UI 계약 추가. fixture/stub 사용, 실제 요청은 수집 도구에서 분리. 문법/diff check PASS. Apple 기존 5 snapshot과 SEC 15근거 동등성 확인, 추천 승인 false. 소스/스크립트/Web/테스트/문서 161파일 비밀값 검사 0.

## 변경 파일·남은 작업

수정/추가: `scripts/retrieve-disclosure-originals.mjs`, `scripts/apply-disclosure-review.mjs`, `src/v2/disclosure_review.js`, `src/v2/stock_performance.js`, `public/app.js`, `test/disclosure_review.test.js`, `test/stock_common_period.test.js`, `test/candidate_ui.test.js`, 본 보고서, AUTO_DEV_LOG, UI 캡처. 기존 사용자 변경 보존. .env·운영·다른 프로젝트 변경 없음. 로컬 서버 프로세스만 재시작하고 외부 접속/브로커/실거래 false 확인.

NOT RUN: 신규 APK 설치(불필요), Q3 이벤트 추가 후 최종 Galaxy 표시, 200% OS 실기기 확대, 운영 인증·페어링. BLOCKERS: KRX/KIND 보통주 배당락 원문/전체 기업행동 coverage, 주식수 기준일 정렬, 유효 동종 표본 0. 다음: 공식 거래소 대상 공시와 관측 이전 권리 결의 확보 → 정정 관계/적용일 대조 → 검증된 구간만 성과·동일 지수 비교 → 최종 Galaxy Q3/새 성과 화면 확인. 전체 완료 선언하지 않는다.

---

# K-STOCK AI — 공시 조사 범위 검증 후속 보고

2026-10-12 KST. 전체 **PARTIAL**. 아래 이전 사이클 결과는 인수인계 기록이며 이번 실기기 검증 결과로 재사용하지 않았다.

- 기준 커밋: `ea406852610c00bef0dbe469de95c42fca662c30`, 브랜치 `auto/kstock-development-20260930`. 버전 package 1.0.0 / server 0.1.0 / Android 2.6.5 (265), 변경 미커밋. 기존 변경·RAW 가격·분석 스냅샷·Apple/SEC 자료·.env 보존.
- 현재 코드 기준선 offline 283 PASS. 추가 검증 후 `npm run test:offline`: 286 PASS / FAIL 0. `node --test test/android_external.test.js`: 3 PASS / FAIL 0. 페이지 메타데이터 변경 후 표적 테스트도 PASS. `git diff --check` PASS. 자동 검증은 fixture/stub 사용.
- 실제 OpenDART `list.json` 읽기 **3회**, 삼성전자 corpCode 00126380, 2026-08-26~2026-10-08. 월별 8/26~8/31, 9/1~9/30, 10/1~10/8 각각 총 1페이지/조회 1페이지. 중복 접수번호 제거 후 21건. 개인정보인 제출인 필드는 저장하지 않았다. 비공개 `data/v2/verification/disclosure-audit-*.json`에 수집 시각·범위·접수번호·원문 링크·NOT_REVIEWED 상태 저장. 최대 호출 9회 제한, 고정 읽기 endpoint, 자격증명 미기록.
- 구현: 조회 결과에 월별 범위·페이지 수·잘림 상태 추가. 페이지 수 누락/오류는 조회 불완전으로 처리하며 기존 자료 읽기는 보존한다. 페이지 완료와 기업행동 검증을 분리하여 `corporateActionCoverageVerified: false` 유지. 총 페이지 수가 불명확하면 null을 반환한다.
- 공시 21건은 **검증된 기업행동 21건이 아니다**. 제목에는 소유상황/대량보유/잠정실적/IR 등이 포함된다. 공시 목록 조회 완료만으로 이벤트 부재, 적용일, 발행주식수 변동 여부를 확정하지 않았다. 관측 이전 발표·관측 중 적용 사건과 DART 외 거래소 사건도 별도 조사 필요.
- [삼성전자 공식 IR 공지](https://www.samsung.com/global/ir/reports-disclosures/notices/)의 2026-09-21 공지는 배당 기준일 2026-09-30을 명시한다. 배당 세부 조건은 이사회 후 공개한다고 명시한다. 이 확인은 배당락일·금액·지급일 증명이 아니다. 다른 회사 배당락 공시나 2025년 자료를 삼성전자 2026년 사건으로 대체하지 않았다.
- 기존 관측 RAW 가격 29일(8/26~10/8), KOSPI/KOSDAQ 가격지수 각 50일(7/27~10/8) 보존. 기업행동 전수 검증 기간 0, 실제 가격/총수익/MDD/초과수익 산출 보류. 비교기업 3개 연결/유효 0, 최소 3 유지. Apple 포함 추천 HOLD.
- 이번 Web 화면 확인 **NOT RUN**, Galaxy A33 화면·가로 스크롤·설치 **NOT RUN**. 이번 변경은 서버 공시 조사 메타데이터와 조사 도구이며 화면 변경 없음. 이전 실제 화면 확인과 구분한다.
- 수정 파일: `src/services/opendart_client.js`, `scripts/verify-samsung-disclosures-read-only.mjs`, `test/disclosure_coverage.test.js`, `test/data_paths.test.js`, 본 보고서, AUTO_DEV_LOG.
- 실거래/브로커 OFF 유지, 이번 실제 주문 0. 인증정보·운영 환경·외부 배포·다른 프로젝트 변경 없음.
- 다음 순서: 21개 공시 원문 및 관측 이전 권리 발표 조사 → KRX/KIND 삼성전자 2026년 배당락 적용일 원문 확보 → 전체 사건 coverage 대조 → 검증된 구간만 성과/동일 기간 지수 비교 → 유효 사업 동종 표본 확보 → Web/Galaxy 새 결과 검증. 출처 부족은 계속 차단하며 기준을 낮추지 않는다.

---

# K-STOCK AI NEXT DEVELOPMENT REPORT — 권리 적용일·구간 성과

2026-10-12 KST 최신 사이클. 이전 보고서는 아래에 그대로 보존한다. 기존 사용자 변경·스냅샷·원주가·Apple 자료를 보존했다.

```text
PROJECT: /Users/ari/ARI/projects/k-stock-ai
BRANCH: auto/kstock-development-20260930
COMMIT: ea406852610c00bef0dbe469de95c42fca662c30 / 변경 미커밋
VERSION: package 1.0.0 / server 0.1.0 / Android 2.6.5 (265)
BASELINE: Offline 266 PASS / Android Contract 3 PASS
CURRENT TESTS: Offline 283 / Android Contract 3
PASS: 283 + 3
FAIL: 0
CORPORATE ACTIONS: PARTIAL
Verified Events: 0 (계산에 필요한 권리 적용일 포함 기준)
Pending Events: 삼성전자 공식 배당 1건 + 기존 132행 요약 근거(이벤트 수가 아님)
Effective Dates: 확인 0 / 공시일·주주 기준일·예정 지급일 각각 1개 확인
SHARE COUNT: 기존 보고서 수량 대조 보존 / 실제 가격 기준일 정렬 BLOCKED
SAMSUNG 005930:
Verified Period: 없음 / 실제 가격 관측 2026-08-26 ~ 2026-10-08, 29거래일
Price Return: null / 기업행동 전체 구간 조사 부족
Total Return: null / 배당락·권리 자료 부족
Performance Status: PENDING / 일부 검증 구간 함수 구현·fixture 확인
PEER COMPARISON: Connected 3 / Eligible 0 / 기존 3기업 EXCLUDED
Remaining Issues: 업종·사업 구조·가격/주식수 기준·기업행동 검증 부족
BENCHMARK:
KOSPI: 실제 새 수집 50거래일 가격지수 / 2026-07-27 ~ 2026-10-08
KOSDAQ: 동일 / 50거래일
Date Alignment: 양 지수 날짜 배열 일치 / 삼성전자 비교는 보류
WEB UI: VERIFIED (실제 날짜·금액·보류 / 6폭×2테마 / 200% 글자)
GALAXY A33: VERIFIED 범위 제한 (TTM·공식 배당 날짜/금액·보류·비교표·연결 실패)
ANDROID CONTRACT: 3 PASS / APK 변경·재설치 이번 NOT RUN
RECOMMENDATION: HOLD / 삼성전자·Apple
LIVE TRADING: OFF / BROKER OFF
REAL ORDERS THIS TASK: 0
OVERALL: PARTIAL
```

## 원천자료 확인과 실제 실행

기존 4기업 OpenDART 요약 자료 132행을 재사용했다. 삼성전자 공식 IR 배당 공시를 추가 확인했고 KIS 지수 2개를 새로 읽었다. 이번 제한된 실제 HTTP 조회는 **공식 IR 1회 + KIS 3회(토큰 발급 포함)**이며 검색/공식 문서 열람은 별도다. OpenDART·미국 API 신규 호출 없음. 운영 변경·유료 서비스·키 변경·주문 없음.

[삼성전자 공식 2026년 2분기 배당 공시](https://www.samsung.com/global/ir/reports-disclosures/public-disclosure-view.84746/)에서 공시일 2026-07-30, 주주 기준일 2026-06-30, 보통주 주당 374 KRW, 예정 지급일 2026-08-28을 확인했다. 실제 지급 완료는 이 자료로 확인하지 않았으며 배당락일은 제공되지 않아 null/PENDING_VERIFICATION을 유지한다. 기준일에서 영업일을 빼 배당락일을 생성하지 않는다. 이 배당의 지급일이 8월 가격 구간에 있다고 해당 구간의 총수익에 자동 반영하지 않는다.

공식 HTML은 `data/v2/verification/samsung-ir-84746-source.html`에 0600으로 비공개 보존하고 이벤트에 원문 URL/ID/SHA-256/확인 시각을 연결했다. `verify-samsung-entitlements.mjs --saved-source`는 받은 공식 원문의 회사/기간/날짜/금액 문구를 확인한 다음 입력을 저장한다. 기대 내용이 달라지면 중단한다. 기존 latest는 정상 갱신하며 과거 스냅샷은 수정하지 않았다.

`verify-benchmarks-read-only.mjs --read-only`는 기존 읽기 API `inquire-daily-indexchartprice`, 0001/1001, 2026-07-01~10-08 범위를 사용했다. 응답은 각각 50개, 정규화 후 관측 범위는 7월 27일~10월 8일이다. 요청 시작일부터 모든 날짜를 확보했다고 해석하지 않는다. 원천 중복·가격·날짜·D-2를 검증하고 두 지수 날짜 배열이 일치함을 확인한다. 이전 49일 파일은 비공개 사본으로 보존했으며 audit에 호출 경로·시각을 남겼다. 독립적인 공식 휴장일 전체 달력 대조는 NOT RUN이며 관측 누락을 보간하지 않는다.

## 코드 구현

- `entitlement_events.js`: 공시 이용 가능 시점·날짜 정의·주식 종류·금액/비율·확정 여부·출처를 검증한다. 배당은 exDate를 계산 적용일로 사용하며 없는 값을 recordDate/paymentDate로 대체하지 않는다.
- 유상증자는 권리락/배정/상장일과 발행 조건이 있어도 권리 가치·참여 가정 정책을 검증하지 않으면 PENDING이다. 분할처럼 단순 ratio를 적용하지 않는다.
- 자기주식 취득: 발행 0/자기주식 +수량/유통 −수량. 처분: 발행 0/자기주식 −수량/유통 +수량. 자기주식 소각: 발행 −수량/자기주식 −수량/유통 0. 이 순수 계산 규칙의 fixture 확인과 실제 사건 검증은 구분한다.
- `corporate_actions.js`: 호출자가 VERIFIED 상태를 제공했더라도 유상증자/주식수 변경/액면변경, 중복 이벤트, 미확인 비율·배당 정보를 계산 지점에서 다시 차단한다. 원주가를 덮어쓰지 않는다.
- `measureVerifiedStockPeriod`: 사용자가 명시한 관측 시작/종료 가격이 실제로 있고 검증 범위 안에 있을 때만 해당 구간의 가격 수익률을 별도로 산출한다. 시작/종료가격·가격 유형·출처·산식·추천 독립성을 결과에 포함한다. 실제 삼성전자에서 이 조건을 통과한 구간은 아직 없다. 미검증 구간 제외를 핑계로 결측을 숨기거나 구간을 자동 선정하지 않는다.
- 기존 공통 기간/MDD/median 엔진 재사용. 종목 성과 API는 KOSPI와 KOSDAQ 비교 상태를 모두 제공한다. 두 지수 가격수익과 총수익의 정의를 혼용하지 않는다.
- Web: 공식 공시일/기준일/배당락일/지급 예정일·금액·출처를 구분해 표시한다. 가격 관측 기간·시작/종료가격과 ‘검증된 성과 구간 없음’을 표시한다. 없는 수익률을 차트로 생성하지 않는다.

## 검증 결과와 실기기 범위

`npm run test:offline` 기준선 266 PASS, 최종 **283 PASS / 0 FAIL / 0 SKIP**. 추가 17개는 배당 날짜/누락/통화/확정/미래 공시/출처, 유상증자 정책, 무상·분할 비율, 자기주식 유형, 계산 시점의 중복/자본 이벤트 차단, 원주가 보존, 가격/총수익 구분, 검증 부분 구간/끝점, 공식 날짜 UI, 두 벤치마크 계약을 검증했다. 자동 테스트는 fixture만 사용하고 실제 소스 조회와 분리했다.

`node --test test/android_external.test.js`: **3 PASS / 0 FAIL**. `git diff --check`, 새 파일 문법 검증 PASS. 실거래/브로커 false, 이번 작업 주문 함수 호출 0. 기존 Apple 원천 snapshot/evidence와 추천 HOLD를 보존했다.

실제 Chrome: TTM/주식수/공시 근거/배당 날짜와 374 KRW/두 벤치마크 보류 상태 확인. 320/360/390/768/1024/1440 × light/dark, 글자 200%에서 문서 가로 넘침 없음. `docs/uiux/entitlement-verified-mobile.png`는 실제 Web 캡처다.

Galaxy A33 RFCW1178RRE/SM-A336N: 기존 검증 앱만 명시적으로 재실행, 앱 데이터·기기 설정 보존. TTM 3개 값·2025-07-01~2026-06-30·CFS/원 단위/OpenDART 출처 재확인. 새 공식 배당의 7/30 공시·6/30 기준·배당락일 미확인·8/28 지급 예정·374 KRW 및 실제 가격 관측 구간/성과 없음이 Web과 일치함을 확인했다. 비교표 자료 부족·표본 0과 연결 실패를 확인하고 USB 연결을 복원했다. 실기기 캡처는 `/tmp/kstock-rights-a33-*`에만 보관한다. 이번 가로 스크롤 성공은 캡처로 확정하지 않아 NOT RUN이며 이전 사이클의 성공 확인과 구분한다. native 변경 없음, APK 빌드/재설치 이번 NOT RUN.

NOT RUN/미완료: 실제 검증 이벤트/성과 구간 차트(선행 자료 부족), 네 기업 전체 권리 적용일·거래 정지/재개·변경 상장일, 독립 휴장일 달력, 실기기 OS 200%·모든 오류 상태·외부 접속/운영 인증.

## 변경 파일·다음 조건

이번 변경: `src/v2/entitlement_events.js`, `corporate_actions.js`, `stock_performance.js`, `public/app.js`, `scripts/verify-samsung-entitlements.mjs`, `verify-benchmarks-read-only.mjs`, `test/entitlement_dates.test.js`, `stock_common_period.test.js`, `candidate_ui.test.js`, Web 캡처와 QA/개발 기록. 로컬 3000 서버만 재시작, .env·운영 서버·다른 프로젝트 변경 없음.

다음은 실제 배당락일/권리 적용일과 2026-08-26~10-08 전체 이벤트 조사 범위를 입증하는 원천, 주식수 기준일 정렬 근거, 사업 구조가 맞는 동일 기간 비교 표본 확보다. 기존 연결 3기업은 업종 불일치 등으로 유효 0이며 최소 기준 3을 낮추지 않았다. 해당 근거를 확보해야 일부 구간 성과·동일 기간 벤치마크·평가배수를 실제 값으로 활성화할 수 있다. 현재 PARTIAL/HOLD를 유지한다.

---

## 이전 사이클 기록

# K-STOCK AI FOLLOW-UP REPORT — 기업행동·주식수 후속 개발

검증일: 2026-10-12 KST. 아래가 이번 작업의 최신 결과이며 이전 QA 기록은 뒤에 보존했다. 기존 미커밋 변경·원천 자료·스냅샷·다른 프로젝트를 보존했다.

```text
PROJECT: /Users/ari/ARI/projects/k-stock-ai
BRANCH: auto/kstock-development-20260930
COMMIT: ea406852610c00bef0dbe469de95c42fca662c30 (변경 미커밋)
VERSION: package 1.0.0 / server 0.1.0 / Android 2.6.5 (265)
BASELINE: Offline 250 PASS / Android Contract 3 PASS (이번 재실행)
CURRENT TESTS: Offline 266 + Android Contract 3
PASS: 266 + 3
FAIL: 0 (최종)
CORPORATE ACTIONS: PARTIAL
Source: OpenDART 2026 반기 주식 총수·증자/감자·배당·자기주식 API
Verified Events: 0 (권리 적용일과 완전한 커버리지 기준)
Unverified Events: 요약 근거 132행 / 확정 이벤트 132건을 의미하지 않음
SHARE COUNT: PARTIAL / 보통주 수량 산식 확인, 우선주 결측 보존
Share Class: COMMON / PREFERRED / TOTAL 분리
As-of Date: 2026-06-30 / 삼성전자 가격 기준일 2026-10-08
Validation: BLOCKED / 사이 기간의 기업행동 정렬 근거 부족
PEER COMPARISON: PARTIAL
Connected Companies: SK하이닉스 000660 / DB하이텍 000990 / 한미반도체 042700
Eligible Companies: 0
Excluded Companies: 연결된 3기업 / 기존 Apple·자기 자신 제외도 보존
Exclusion Reasons: 공식 업종 불일치 / 사업 동질성·기간·가격·권리 검증 미완료
VALUATION: BLOCKED
PER: null / 가격·주식수·기업행동·표본 검증 부족
PBR: null / 동일
PSR: null / 동일
EV/EBITDA: null / 검증된 EV·EBITDA 입력 부족
PERFORMANCE: BLOCKED / 공개 API는 기존 PENDING 계약 유지
Price Return: 보류
Total Return: 보류 / 배당락·권리 정보 미검증
MDD: 실제 삼성전자 보류 / 계산 엔진 회귀 PASS
KOSPI: 기존 49거래일 가격지수 보존 / 종목 초과수익 보류
KOSDAQ: 기존 49거래일 가격지수 보존 / 종목 초과수익 보류
WEB UI: VERIFIED (실제 표시·6폭·2테마·200% 글자 확대)
GALAXY A33: VERIFIED (주식수·근거 펼침·스크롤·보류·연결 실패/복구)
ANDROID CONTRACT TESTS: 3 PASS / 실제 앱 업데이트 설치는 이번 NOT RUN
RECOMMENDATION: HOLD (삼성전자·Apple)
LIVE TRADING: OFF
REAL ORDERS THIS TASK: 0
OVERALL: PARTIAL
```

## 실제 출처·범위

API 읽기 **16회**, 삼성전자와 기존 비교기업 3곳에 각각 4종 API를 1회 조회했다. 수집 시각 **2026-10-12T02:16:41.580Z**, 범위 **2026년 반기 11012**. 최종 스크립트 실행·수집·입력 연결 성공. 처음에는 전 단계 임시 입력 파일이 없어 외부 호출 없이 중단됐으며, 기존 입력과 최신 보고서·peer collection에서 복원해 재실행했다. 인증정보 변경·새 서비스 가입·주문 API 호출 없음.

공식 계약은 [주식의 총수](https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS002&apiId=2020002), [증자·감자](https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS002&apiId=2019004), [배당](https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS002&apiId=2019005), [자기주식](https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS002&apiId=2019006)을 확인했다. 증자 가이드의 웹 조회 timeout은 공식 HTML을 제한된 읽기로 받아 확인했다. 문서 조회와 16회 API 호출은 구분한다.

| 기업 | 공시 접수번호 | 반기 수량 확인 | 요약 근거 행 |
| --- | --- | --- | ---: |
| 삼성전자 005930 | 20260814003699 | 보통주 산식 확인, 우선주 자기주식 결측 | 33 |
| SK하이닉스 000660 | 20260814003509 | 보통주 산식 확인, 우선주 결측 | 33 |
| DB하이텍 000990 | 20260814003091 | 보통주·우선주·합계 산식 확인 | 35 |
| 한미반도체 042700 | 20260814003665 | 합계 산식 확인, 보통주 종류 행 미확보 | 31 |

삼성전자 보통주 **총발행 5,846,278,608주 − 자기주식 82,086,705주 = 유통 5,764,191,903주**. 모두 2026-06-30 보고서 기준이며 10월 가격에 바로 곱하지 않는다. 여기서 유통주식수는 공시의 발행−자기주식 정의이며, 대주주 지분을 제외한 free float로 해석하지 않는다. 우선주 자기주식 `-`는 0으로 추정하지 않고 null을 유지한다. 합계는 보통주 가격의 시가총액 계산에 사용하지 않는다.

요약 자료는 stockCode/eventType/announcementDate/effectiveDate/recordDate/source/sourceDocumentId/collectedAt/verificationStatus를 제공한다. 출처에 없는 날짜는 null이다. 증자 자료의 보고된 날짜도 별도 reportedDate로 보존하며 권리 적용일로 승격하지 않는다. 배당 표의 주당액면가·배당성향 등은 DIVIDEND_REPORT 요약 근거로 구분한다. 단순히 이 표가 있다고 배당 이벤트나 배당락일을 확정하지 않는다. 동일 요약 행 중복을 제거하고 실제 이벤트 적용에는 별도의 VERIFIED 조건을 요구한다. 분할·병합·권리락을 전 기간 조사한 자료가 아니므로 ‘기업행동 없음’ 판정에 사용하지 않는다.

비공개 근거와 입력은 Git 제외 `data/v2/verification/action-evidence-*.json` 파일과 `action-input-*`, `action-final-input-*`에 저장한다(정확한 파일명은 실제 디렉터리 참조). 키·인증 헤더·개인정보 원문은 저장하지 않는다. 기존 latest 보고서는 정상 갱신하고 기존 스냅샷은 수정하지 않았다. Apple 5개 원천 snapshot 필드와 evidence는 작업 전후 일치하며 추천 approved=false도 유지했다.

## 구현과 검증 범위

| 영역 | 상태 | 확인한 것 / 남은 조건 |
| --- | --- | --- |
| 기업행동 수집 계층 | PARTIAL | 4회사 실제 응답 연결, 근거 추적·중복 제거 / 적용일·전체 커버리지 부족 |
| 주식수 정의·산식 | VERIFIED 범위 제한 | 공시 회사/접수번호/기준일/발행−자기주식/합계 대조 / 결측 종류는 미검증 |
| 가격과 주식수 정렬 | BLOCKED 실데이터 | 분할·병합·증자·자기주식 변동의 검증된 정렬 로직 구현 / 실제 구간 근거 부족 |
| 미래정보 차단 | VERIFIED 자동 테스트 | 주식수 공시 이용 가능 시점이 가격 날짜 이후이거나 미검증이면 차단 |
| 동종기업 | PARTIAL | 기존 3기업 유지, ELIGIBLE/EXCLUDED/PENDING_VERIFICATION 계약 추가 / 유효 0 |
| 배수·성과 | BLOCKED 실데이터 | 새 주식수 자료가 있어도 정렬 BLOCKED이면 배수 null / 기존 성과 차단 유지 |
| Web/Android 표시 | VERIFIED 범위 제한 | 같은 상세 응답에 주식 종류·수량·기준일·근거와 보류 이유 표시 |

주식수 정렬은 RAW 가격, KRW, 종류·발행/유통 정의, 공개 시점이 확인돼야 한다. 다른 날짜를 연결하려면 사이 기간의 유형별 coverage와 출처가 필요하며, 유상증자는 검증된 수량 변화가 없으면 차단한다. 변동은 적용일 순서로 처리하고 동일 경제 이벤트 중복·미확인 적용일·조정가격 혼용·무한값을 차단한다. 자기주식 취득은 유통 수량에는 반영하지만 총발행 수량을 자동 감소시키지 않는다. 순수 계산 fixture 통과를 실제 정렬 완료로 간주하지 않는다.

기존 KIS RAW 계약을 유지하며 새 정규화 결과에 RAW_PRICE / 조정 방식 NONE 메타데이터를 추가했다. 계약이 없는 가격은 UNKNOWN이다. ADJUSTED_PRICE와 TOTAL_RETURN을 RAW로 취급하지 않는다. 배당 포함 수익률·분할 중복 적용·공통 기간/결측 거래일 검증은 기존 테스트로 회귀 확인했다. 실제 기업행동 coverage=false이므로 삼성전자 수익률·MDD·초과수익은 계속 PENDING이다. 역사/peer 중앙값은 기존 median 모듈을 재사용했고 최소 3기업 정책을 낮추지 않았다.

## 화면 QA

실제 Chrome에서 삼성전자 주식수·자기주식·기준일과 계산 보류, TTM·공시 근거·비교기업 제외·원주가·성과 보류를 확인했다. 320/360/390/768/1024/1440 폭 × light/dark, 글자 200% 확대에서 문서 가로 넘침 없음. `docs/uiux/share-count-verified-mobile.png`는 실제 Chrome 주식수 섹션 캡처다.

Galaxy A33 SM-A336N / RFCW1178RRE의 기존 검증 앱을 재실행했다. native 코드는 이번에 변경하지 않아 APK 재빌드/설치는 NOT RUN이다. 앱 데이터/기기 설정을 삭제·변경하지 않았다. 실제 화면에서 보통주·우선주·합계, 자기주식 결측, 가격/주식수 기준일 불일치, 기업행동 자료 33행 요약과 확정 이벤트 구분, 펼침/스크롤을 확인했다. USB 연결을 잠시 끊어 ‘서버 연결 실패’를 확인하고 반드시 복원했다. 다른 연결 기기는 조작하지 않았다. 실기기 캡처는 `/tmp/kstock-actions-a33-*`에만 보관한다.

기업행동 확정 타임라인·과거 배수 차트·삼성전자 누적 성과 차트는 실제 선행 자료가 부족해 표시 보류한다. 실기기 TTM 세 값 전체와 비교표 전체의 이번 재확인, 200% OS 배율·모든 합성 오류 상태·운영 인증/페어링·외부 공개 접근은 NOT RUN이다. TTM·비교표의 이전 실기기 확인 결과와 이번 Web 회귀 PASS는 구분한다.

## 테스트와 변경 파일

- `npm run test:offline`: 기준선 250 PASS, 최종 **266 PASS / 0 FAIL / 0 SKIP**.
- `node --test test/android_external.test.js`: **3 PASS / 0 FAIL**. fixture 로컬 서버이며 외부 API 호출 없음.
- `git diff --check`: PASS. 새 스크립트 문법과 실제 읽기 실행 확인.
- 최초 회귀 중 입력 검증 강화로 HTTP 오류 테스트 fixture 두 곳이 실패했다. 유효한 corpCode/year를 fixture에 제공해 원래 RATE_LIMIT/TIMEOUT 검증을 유지했으며 테스트를 삭제하거나 안전 조건을 완화하지 않았다.
- 추가 16개 테스트: 발행/자기주식/유통 산식, 결측/중복/회사/합계/미래 날짜, 종류/정의/기준일 정렬, split/rights 순서, reverse split/treasury 정의, 중복/미확인 이벤트, RAW/숫자 차단, 배당 요약 날짜/중복, 자료 없음/회사 범위, API scope, 배수 정렬 차단, UI 상태, 주식수 공시 미래정보 차단.

이번 변경: `src/services/opendart_request.js`, `src/v2/share_count.js`, `kr_actions.js`, `kr_valuation.js`, `scripts/verify-kr-actions-read-only.mjs`, `public/app.js`, `test/share_action_evidence.test.js`, `candidate_ui.test.js`, `data_paths.test.js`, Web 캡처와 QA/개발 기록. .env 변경 없음. 로컬 127.0.0.1:3000 서버만 재시작했다. 운영 서버·서명키·유료서비스·다른 프로젝트 변경 없음.

## 차단 사유와 다음 순서

1. 2026-06-30 이후 가격 관측 종료일까지 유형별 기업행동 발생/권리 적용일, 주식 종류, 조정 방식의 검증 가능한 원천 자료 확보.
2. 삼성전자 우선주 자기주식 결측과 한미반도체 종류 행, 비교기업 반기 공시 공개 시점 검증. 공시의 결측은 수량 0이나 보통주로 추정하지 않는다.
3. 사업 구조와 같은 기간·가격 기준에 부합하는 peer 자료 검토. 현재 3기업을 억지로 통과시키지 않는다.
4. 정렬과 비교 조건 통과 구간만 실제 배수·가격 수익률·MDD·벤치마크 비교 활성화 후 Web/Galaxy 재검증. 배당 총수익은 별도 권리 정보 확보 후 진행.

실거래/브로커 false 유지, 이번 작업은 읽기 조회와 로컬 개발뿐이며 실제 주문 0건이다. 현재 **PARTIAL**, 추천은 **HOLD**이다.

---

## 이전 작업 기록 (그 시점의 결과)

# K-STOCK AI DEVELOPMENT REPORT — PARTIAL 후속 QA

검증일: 2026-10-12 KST. 인수인계 수치는 현재 코드에서 다시 실행한 결과와 구분했다. 기존 사용자 데이터·미커밋 변경·Apple/SEC 근거를 보존했다.

```text
PROJECT: /Users/ari/ARI/projects/k-stock-ai
REMOTE: https://github.com/Naharuya/k-stock-ai.git
BRANCH: auto/kstock-development-20260930
BASE COMMIT: ea406852610c00bef0dbe469de95c42fca662c30
CURRENT VERSION: package 1.0.0 / server 0.1.0 / Android 2.6.5 (265)
COMMIT: 새 커밋 없음 / 개발 변경 미커밋
BASELINE TESTS: 현재 코드 재실행 225 PASS + Android 3 PASS (기존 199 포함)
CURRENT TESTS: 250 offline + 3 Android contracts
PASS: 250 + 3
FAIL: 0
ACCOUNTING PERIOD: 삼성전자 5개 CFS 공시 기간 검증
TTM: READY / 연속 4분기 차감·합계 대조 확인
CORPORATE ACTIONS: UNDER_REVIEW / KIS 원주가 확인, 전체 기업행동 커버리지 미확보
PEER COMPARISON: INSUFFICIENT_DATA / 실제 3개 기업 수집 / 유효 표본 0
PERFORMANCE: 공통 관측기간 계산·읽기 API·UI 구현 / 실제 삼성전자 PENDING
CUMULATIVE RETURN: 삼성전자 보류 / 모의 포트폴리오 전체 실데이터 시계열 미완료
MDD: 공통기간 엔진 검증 PASS / 삼성전자 실제 값 보류
KOSPI BENCHMARK: 기존 49거래일 가격지수 보존·표시 재확인
KOSDAQ BENCHMARK: 기존 49거래일 가격지수 보존·표시 재확인
WEB UI: 실제 TTM·근거·동종기업 제외·가격 기준·성과 보류 표시 PASS
ANDROID UI: 검증 APK 업데이트 설치 및 실행 PASS
GALAXY A33 TEST: 삼성전자 TTM 값·기간·단위·출처, 비교표·스크롤·연결 실패/복구 PASS
DATA QUALITY: 기간 확인됨 / 기업행동·주식수 기준일·실제 비교 표본 부족
RECOMMENDATION STATUS: 삼성전자·Apple 보류 / approved false
LIVE TRADING: OFF
REAL ORDERS THIS TASK: 0
OVERALL: PARTIAL
```

## 실제 수집과 원천 검증

이번 작업 외부 요청은 **38회**로 제한했다. 1차 수집 36회와 가격 계약 재확인 2회이며, 토큰 발급·회사 master 조회도 포함한다. OpenDART와 KIS 기존 무료 읽기 API만 사용했다. 비밀값 변경·주문·계좌 변경·운영 배포 없음. 미국 API 신규 조회 없음. 기본 분석 기준은 2026-10-12T01:37:11.918Z이며 개별 응답 확인 시각과 요청 경로는 Git 제외 `data/v2/verification/read-audit.json`, `price-request-audit.json`에 보존한다. 인증 헤더·키는 기록하지 않았다.

삼성전자 CFS, KRW, 원 단위: 2025 반기·3분기·연간, 2026 1분기·반기 자료를 연결했다. 누적 실적을 차감해 2025 Q3, Q4, 2026 Q1, Q2의 연속성을 확인했고 연간+현재 반기−전년 반기 TTM과 합계를 대조했다. 회계기간은 **2025-07-01~2026-06-30**, 마지막 공시 이용 가능 시점은 **2026-08-14T23:59:59+09:00**이다. 최신 분기를 추정하지 않았다.

| TTM 항목 | 실제 수집 값 (KRW, 원) |
| --- | ---: |
| 매출 | 485,272,032,000,000 |
| 영업이익 | 178,964,931,000,000 |
| 순이익 | 150,717,225,000,000 |

공시 접수번호와 원문 링크, 단일 분기 변환 결과는 Web/Android에 표시한다. 기간 근거는 [OpenDART 공시 원문 API](https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS003&apiId=2019016), 계정 근거는 [단일회사 전체 재무제표 API](https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS003&apiId=2019020) 계약과 실제 응답을 함께 확인했다.

### 가격과 기업행동

실제 `/quotations/inquire-daily-price` 요청은 `FHKST01010400`, `FID_ORG_ADJ_PRC=0`이다. **이 API의 0은 원주가**다. 다른 `inquire-daily-itemchartprice`의 0=수정주가 계약과 혼용하면 안 된다. 기존 수정주가 표기를 새 수집 자료에서 원주가로 바로잡았으며 계약 근거 없는 자료는 UNKNOWN으로 둔다. [KIS 공식 daily-price 예제](https://github.com/koreainvestment/open-trading-api/blob/main/examples_llm/domestic_stock/inquire_daily_price/inquire_daily_price.py), [공식 MCP 동일 API 계약](https://raw.githubusercontent.com/koreainvestment/open-trading-api/main/MCP/Kis%20Trading%20MCP/configs/domestic_stock.json), [다른 itemchartprice API 예제](https://github.com/koreainvestment/open-trading-api/blob/main/examples_llm/domestic_stock/inquire_daily_itemchartprice/inquire_daily_itemchartprice.py)를 대조했다.

D-2 필터 통과 29거래일, **2026-08-26~2026-10-08**, 마지막 종가 262,000원. 응답의 `flng_cls_code=00`, `acml_prtt_rate=1.00`은 전체 기업행동 검증 근거로 사용하지 않는다. 분할·병합·무상/유상증자·배당·액면변경·주식수 변경의 발생일과 완전한 커버리지 미확보 상태다. 가격 수익률과 배당 포함 총수익률을 분리하고 미확인 구간은 계산 보류한다. 이미 조정된 가격에는 이벤트를 다시 적용하지 않으며, 서로 다른 ID의 동일 경제 이벤트도 중복 차단한다.

### 실제 동종기업

[OpenDART 기업개황](https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS001&apiId=2019002) 업종 코드와 회사 master의 ticker/corpCode를 검증했다. 기업개황의 대표자·주소·전화번호·등록번호는 저장하지 않는다.

| 대상 | 공식 업종 코드 | 수집 결과·제외 사유 |
| --- | --- | --- |
| 삼성전자 005930 | 264 | 자기 자신은 비교 표본 제외 |
| SK하이닉스 000660 | 2612 | 2025 연간 재무·공시 수집, 업종 불일치 |
| DB하이텍 000990 | 2611 | 업종 불일치, 재무/공시 이용 가능 시점 추가 검증 필요 |
| 한미반도체 042700 | 29271 | 2025 연간 재무·공시 수집, 업종 불일치 |

동일 업종 코드는 사업의 동질성을 보장하지 않아 실제 기업에는 별도 사업 성격 검증도 요구한다. 기존 최소 **지표별 3기업**, 과거 **3개 연도·700일** 정책을 유지했다. 현재가격/발행주식수 기준일도 미검증이므로 유효 표본 0, 현재 배수·중앙값·차이는 null이며 자료 부족으로 표시한다. 수집한 기업은 비교 입력으로만 사용하며 추천 후보를 추가하지 않는다. Apple 기존 입력·6개 원천 필드와 SEC 근거 15개를 보존했다.

## 성과와 UI

`GET /api/v2/stock-performance/:ticker`와 Web 상세 화면을 연결했다. 검증된 원주가와 기업행동 커버리지가 모두 있을 때만 종목·가격지수의 공통 시작/종료일을 맞춘다. 구간 내부 거래일 불일치·누락은 보간하거나 숨기지 않고 차단한다. 누적 가격 수익률·MDD·초과수익을 계산하고 연율화하지 않는다. 총수익과 가격지수 비교는 보류한다. 실제 삼성전자 API는 `PENDING / CORPORATE_ACTION_COVERAGE_REQUIRED`이며 숫자를 만들지 않았다. 검증된 관측 성과와 추천 승인은 별개다.

기존 KOSPI/KOSDAQ 49거래일 **2026-07-28~2026-10-08** 자료를 보존하고 실제 화면에서 재확인했다. 이번에는 지수를 새로 외부 수집하지 않았다. 삼성전자와 공통 구간을 계산할 기반은 구현했지만 기업행동 선행 조건이 충족되지 않아 실제 비교값을 표시하지 않는다. 1/5/20거래일 후보 사후 검증 보고서는 갱신했으며 READY 0/PENDING이다. 기존 스냅샷은 수정하지 않았다.

Web은 320/360/390/768/1024/1440 폭과 light/dark, 글자 200% 확대에서 문서 가로 넘침 없음. TTM 수치·기간·출처·4분기 확인, 실제 비교기업 이름/제외 사유, 원주가 표기와 성과 보류를 확인했다. 근거: `docs/uiux/ttm-verified-mobile.png`는 실제 Chrome 캡처이며 휴대폰 캡처가 아니다.

Galaxy A33 **SM-A336N / RFCW1178RRE**에 `ai.kstock.mobile.localvalidation` APK를 `install -r`로 업데이트했다. 기존 앱 데이터와 운영 앱을 유지했고 다른 연결 기기는 건드리지 않았다. APK: `android/build/local-validation-mnnb9faf/build/release/k-stock-ai-local-validation.apk`. USB 3103→로컬 3000 사용. 최신 앱에서 TTM 세 값·기간·CFS·원 단위·OpenDART 근거가 Web과 일치함을 직접 확인했다. 상세 이동 버튼, 비교표 가로 스크롤, 긴 설명, 제외기업 표시, 실제 연결 실패 알림과 복구를 확인했다. OS 기존 글자 배율 115%를 변경하지 않고 WebView에 반영했다.

실기기 200% OS 글자 배율, 합성 TTM 누락/오류의 실기기 화면, 모든 로딩 애니메이션, 운영 인증/페어링·외부 접속: **NOT RUN**. 누락·중복·연결/별도 혼용·미래 공시·자료 부족 렌더링은 고정 fixture 자동 테스트로 확인했다. 실기기 화면은 상태 표시줄 개인정보 때문에 Git에 넣지 않고 `/tmp/kstock-resume-a33-*`로 확인용 보관했다.

## 검증 명령과 결과

| 명령·검증 | 이번 실제 결과 |
| --- | --- |
| `npm run test:offline` 시작 시 기준선 | 225 PASS / 0 FAIL |
| `npm run test:offline` 최종 | 250 PASS / 0 FAIL / 0 SKIP |
| `node --test test/android_external.test.js` | 3 PASS / 0 FAIL |
| `git diff --check` | PASS |
| 검증 APK build/sign/install -r/launch | PASS |
| Chrome 실제 데이터·반응형·200% 글자 | PASS |
| Galaxy A33 실제 TTM·비교표·연결 실패/복구 | PASS (상기 범위) |

추가 25개 검증은 단일 분기 누적 차감·4분기 연속성/부족·중복·정정·미래정보/재무 기준, API별 가격 계약, 조정 중복/동일 경제 이벤트, 회사 식별/사업 기준/개인정보 최소화, 공통 관측기간/누락/MDD/총수익 불일치, 서비스 오류 계약과 Web 자료 부족/기간 비활성화를 다룬다. 자동 테스트는 fixture/stub을 사용하며 실제 수집과 분리했다. 실제 읽기 재실행용 `node scripts/verify-kr-h1-read-only.mjs --read-only`는 2026 반기 전용·최대 45회 제한·3기업 제한이다. 최종 저장 스크립트는 문법 검증했고 추가 외부 재실행은 하지 않았다. 이번 실제 수집은 동일 경로의 임시 검증 스크립트로 수행했다.

## 이번 수정 파일

- 회계기간/수집/추천: `src/v2/accounting_periods.js`, `kr_collect.js`, `recommendation_gate.js`.
- 원천/비교 연결: `src/services/kis_market_client.js`, `opendart_request.js`, `src/v2/kr_valuation.js`, `kr_peers.js`, `orchestrator.js`, `candidate_service.js`, `scripts/verify-kr-h1-read-only.mjs`.
- 기업행동/성과: `src/v2/corporate_actions.js`, `stock_performance.js`, `src/server.js`.
- UI: `public/app.js`, `public/styles.css`, `android/src/ai/kstock/mobile/MainActivity.java`.
- 검증: `test/quarter_continuity.test.js`, `stock_common_period.test.js`, `candidate_ui.test.js`, `docs/uiux/ttm-verified-mobile.png`.
- 기록: 이 보고서, `AUTO_DEV_LOG.md`, `KSTOCK_DATA_INTEGRITY_REPORT.md`, `KSTOCK_KR_INTEGRATION.md`.

## 남은 조건과 다음 개발 순서

1. 날짜·출처·지원 범위가 확인된 기업행동 자료와 가격/발행주식수 기준일 확보. 무료 읽기 소스 범위에서 수집 어댑터를 검증한다. 이번 자료만으로 VERIFIED 처리할 수 없다.
2. 삼성전자 사업 구조에 맞는 비교군과 동일 회계/가격 기준 자료 확보. 현재 업종 불일치를 임의 허용하거나 최소 표본을 낮추지 않는다.
3. 선행 조건 통과 구간만 실제 종목 누적 가격 수익률·벤치마크 비교 활성화하고 Web/Galaxy 재검증한다.
4. 모의 포트폴리오 전체 현금 흐름/비용/배당 시계열, 검증된 총수익 지수 연결 및 나머지 실기기 확대·오류 시나리오를 마무리한다.

새 개인정보 수집·계정 삭제 흐름 변경·스토어 공개 없음. 실제 주문 경로를 호출하지 않았다. 테스트 증가만으로 전체 완료를 선언하지 않으며 현재 **PARTIAL**이다.
