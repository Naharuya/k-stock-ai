# K-Stock 모바일 검증·배포 준비 결과

2026-10-20 KST. 사용자 승인 범위: 모바일 통합 검증 → 백엔드 결과 연결 확인 → 배포 준비. 공개 배포나 스토어 제출을 완료했다는 문서가 아니다.

## 1. 모바일 통합

Galaxy A33 실기기, iPhone 15 실기기, iPhone 17 시뮬레이터에서 각각 25개 항목 PASS. 실제 Android WebView/WKWebView에서 DOM 조작·API·파일 생성 전 단계까지 프로그램 방식으로 검증했다. 이는 모든 터치·OS 날짜 선택기·보조기술·파일 앱의 전수 감사가 아니다. 앞선 Galaxy 실제 터치 검증(페이지·수정 진입/취소·삭제/복구)은 별도 영수증으로 유지한다.

범위: 네 종류 입력, 비용·입금·매도·배당 계산, CSV, 초과매도 오류, 수정 초안 보호·저장, 재계산, 백업 전후 비교·취소·복원, 종류/날짜 조회,20건 페이지,정렬,전체페이지합계,삭제/되돌리기,가로넘침,모두비우기.

- galaxy-paper-full-integration-20261020.json
- ios-paper-full-integration-physical-20261020.json
- ios-paper-full-integration-simulator-20261020.json

가상 통합 데이터의 순손익30 → 매수가 수정 후50 → 원본 복원 후30을 대조했다. 실제 종목 투자성과나 금융 원천의 정확성을 검증한 결과가 아니다. 전용 서버는 loopback/한시적 private LAN에만 가상 데이터를 제공했고 테스트 종료 후 모두 종료했다. 검증 앱만 종료, 앱 데이터·프로파일·기기 설정·기존 USB 매핑 보존.

## 2. 백엔드

저장 서비스 출력을 재생성하여 실제 AAPL/MSFT/NVDA 후보와 연결했다. 외부 요청0/신규 공식 문서0. Apple 동일 원천 기간 경계 수량 부족, bridgeEligible=false/marketCap=null/가치평가 HOLD 유지. 기존 업무 실행기의 완료 표시는 금융 검증 완료가 아니다. 상세 KSTOCK_SHARE_BACKEND_REPORT.md와 mobile-release-backend-review-20261020.json.

## 3. 검토용 산출물과 설치 재현

- Android 기본 운영 URL/기존 app ID/version을 사용하는 **unsigned**2.6.5 APK를 별도 디렉터리에서 빌드했다. 기존 서명키/설정은 발견되지 않았고 신규 운영 키를 만들지 않았다. 서명 없는 APK는 사용자 설치·기존 앱 업데이트용이 아니다. 현재 versionCode265의 실제 배포 버전과 단조 증가 여부도 배포 전 확인해야 한다.
- iOS는 기존 프로파일·Apple Development 인증서로 로컬 검증 앱을 업데이트해 iPhone15에서 실행했다. App Store용 archive/배포 서명/운영 HTTPS 인증 경로는 아니다. 프로비저닝/서명 자료는 review zip에서 제외했다.
- 누락된3개 서버 의존성 선언과 존재하지 않는 swagger-jsdoc 버전을 고치고 package-lock을 일치시켰다. 중복 dependency 키는 의미를 보존해 정리, 존재하지 않는 main을 실제 서버로 수정, start/Node>=22 명시. 별도 디렉터리 npm ci(--ignore-scripts)와 실제 로컬 health/privacy 제공 PASS. 기존 node_modules 보존. 새 lockfile로 설치한 환경에서 UI/백업/현금 서비스/기여도/배포준비 핵심 테스트184 PASS도 별도 확인했다. 미사용 native dependency의 postinstall은 실행하지 않았으므로 이 결과를 전체 native module 검증으로 해석하지 않는다.
- Android origin별 저장 토큰 삭제 경로 추가. commit 실패 처리·다른 origin 보존 소스 계약/빌드 PASS. 실제 사용자 토큰을 삭제하지 않았으므로 런타임 삭제 QA는 남아 있다.
- public/privacy.html은 사용자 제공 운영 주체 조세진/문의 vjsjv7003@gmail.com/사업자 미등록 사실을 반영한 **출시 전 검토본**이다. 서버 로그/처리업체·리전·보관/파기와 스토어 고지 확인 전 최종 정책으로 배포하지 않는다.

검토 압축파일은 artifacts/release-prep/20261019172436789/kstock-mobile-review.zip. manifest.json에165파일 SHA256·검증 결과·차단 조건 포함. 사용자 데이터(data/),node_modules,.env,키스토어,프로파일,서명된 iOS 산출물 제외. src/data/sample_stock.js는 공개 소스 fixture이며 사용자 data/와 구분한다. 압축 후 파일별 해시 재검증 PASS. 최종 SHA는 data/v2/verification/mobile-release-review-bundle-20261020.json 참고.

재생성: `node scripts/prepare-mobile-release.mjs <현재 master QA JSON> <unsigned APK>`.

## 출시 차단 조건

- Android 기존 운영 서명키·alias·암호의 안전한 제공, 기존 사용자 설치본과 서명/버전 일치 및 업데이트 실검증.
- iOS 운영용 HTTPS·인증·배포 타깃, 아이콘/릴리스 메타데이터와 스토어 계정·배포 서명 구성 및 실검증. 현재 개발용 앱을 배포본으로 이름만 바꾸지 않는다.
- 운영 서버/프록시 로그의 실제 항목·보관·파기, 처리 인프라와 외부 전송, 최종 개인정보/약관·Play Data Safety/Apple App Privacy 확인. 확정되지 않은 보관기간/국외이전 사실을 임의로 만들지 않는다.
- 금융 기능 활성화는 실제 공식 원천 검증이 선행되어야 한다. 위 모바일 PASS만으로 추천·실거래를 활성화하지 않는다.

전체 회귀931 PASS/Android계약4 PASS/iOS 임시연결 경계4 PASS. master-qa-20261019172327707.json. 리뷰 번들 REVIEW_BUNDLE_READY, 공개 배포 BLOCKED, 전체 프로젝트 PARTIAL/추천 HOLD/실거래 OFF. 운영 HTTPS health200/mock/broker=false/liveTrading=false를 읽기 전용으로 확인했으며 운영 배포/설정 변경/주문은 수행하지 않았다.


## 후속 iOS HTTPS 검토 구성

2026-10-20: 별도 HTTPS preview 모드·URL 정책·ephemeral WebView·unsigned 기기/시뮬레이터 빌드를 추가했다. 빌드/정책 검증 PASS이나 CoreSimulator 무응답으로 실제 연결/인증 QA는 NOT RUN. 배포 타깃/인증을 검증 완료로 승격하지 않는다. 상세 QA 보고서 최신 항목과 ios/README.md 참고. 기존 압축파일은 변경 전 검토본으로 보존했다.


## 운영 웹 제공 상태 재확인

2026-10-20: HTTPS 연결 자체는 복구 후 확인했지만 운영 루트가 JSON200이고 app.js/paper-backup.js/styles.css는404였다. 실제 앱 화면은 제공되지 않으므로 공개배포 차단 상태를 유지한다. iOS native 안내와 검증기는 비HTML 응답 및 실제 앱 요소 누락을 차단하며, 배포 점검에도 정적 파일 확인을 추가했다. 이는 운영 파일을 배포한 작업이 아니다. production-web-app-readiness-20261020.json과 최신 QA 항목 참고.
