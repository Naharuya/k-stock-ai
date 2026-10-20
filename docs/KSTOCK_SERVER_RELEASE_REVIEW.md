# 운영 웹 미제공 원인과 통합 후보 검증

2026-10-20 KST. 실제 운영 전환은 수행하지 않았다.

## 확인된 원인

운영 `kstock.ai.kr`의 신뢰된 SSH 대상에 읽기 전용 접속하여 확인했다. systemd는 `/srv/k-stock-ai/current/src/server.js`를 실행하고 있다. 운영 Git은 clean master/fe81e6a1b1581d7f0e94d07b3b7d5056359ceb50, Node22.23.2/package0.1.0이다. public/index.html·app.js·paper-backup.js·styles.css가 없고 실행 소스에는 express.static과 paper 경로가 없다. nginx가 잘못된 외부 호스트로 보내는 문제라고 가정할 필요 없이, 실제 loopback 서버도 JSON 루트/정적404를 반환함을 확인했다. 과거 로컬 개발 결과가 운영에 반영되지 않은 구버전 API 배포 상태다.

개인키·환경변수 값은 출력하지 않았다. 사용자 데이터는 복사하거나 삭제하지 않았다. 현재 프로세스의 소스 SHA256은 88da0c2438232a9179cb1e6303b626a81defedbb30f01400f69bcf200478f25f이며 후보 점검 뒤에도 같다.

## 준비된 후보

- 소스 스냅샷: review-acfaa246ece5fad5, src/public/package/lock163개 파일. Git의 moving branch가 아니라 현재 검토용 작업본을 파일별 SHA256 manifest로 묶었다.
- 아카이브: artifacts/release-prep/review-acfaa246ece5fad5/review-acfaa246ece5fad5.tar.gz.
- SHA256: 04fa5bc63193e1168a9687a7402acdd3bf97782e2905d70b3db9b7a7b164b625.
- 운영 후보 경로: `/srv/k-stock-ai/releases/review-acfaa246ece5fad5`.
- 상태: STAGED_VERIFIED_NOT_ACTIVE. 운영 current와 systemd/nginx/env는 바꾸지 않았다.

`package-server-review.py`는 키/사용자data/환경파일/node_modules를 제외한다. `stage-server-review.py`는 경로 탈출·개인 파일·심볼릭 링크·중복 엔트리·소스 해시 불일치를 추출 전에 거부한다. 기존 후보를 덮어쓰지 않으며 npm ci --ignore-scripts 후 임시 loopback 포트에서만 기동한다. 실제 서비스 환경 대신 임시 랜덤 테스트 토큰과 실거래/외부 수집 OFF를 사용하고 토큰은 출력하지 않는다. 프로세스는 검증 후 종료한다.

로컬 격리 리허설과 실제 운영 호스트 Node22 모두에서 HTML/JS/백업JS/CSS 제공, 비인증 API401, 토큰이 있는 잘못된 모의 계산 요청400(등록 경로 확인), broker/live false PASS. 원격 아카이브 SHA가 로컬과 같고 운영 소스 해시/active 상태가 유지됨을 최종 대조했다. 외부 시세 수집·실거래 요청 없음. 금융 원천이 없는 상태를 READY로 바꾸지 않았다.

영수증: server-review-package-20261020.json, server-staged-review-20261020.json. 전체935 PASS/Android계약4 PASS, master-qa-20261019181626946.json. 아카이브 보안검증 Python3 PASS. 기존 설치 스크립트는 인자 없이 실행 시 변경 없이 exit64, existing current면 거부, 새 설치만 검토된40자리 커밋으로 허용한다. 더 이상 master를 무조건 checkout/pull하지 않는다. 실제 운영에서 설치 스크립트는 실행하지 않았다.

## 실제 운영 전환 시 검토할 절차

1. 현재 unit/drop-in 및 영구 데이터 경로·기존 env의 모드/인증/데이터 경로를 값 노출 없이 대조하고, rollback 대상과 복원 명령을 먼저 확정한다. 실제 토큰·개인정보는 후보 manifest에 넣지 않는다.
2. 현재 current는 디렉터리다. 이를 바로 덮거나 지우거나 심볼릭 링크라고 가정하지 않는다. 후보를 별도 실행 경로로 사용하는 unit override를 검토하여 기존 디렉터리를 rollback 대상으로 보존할 수 있다. 기존 drop-in이 있으면 먼저 보존·충돌 검토한다.
3. 사용자 승인된 운영 전환에서만 서비스 경로/필요 데이터 경로를 전환하고 재시작한다. `.env` 교체·신규 서명키·데이터 초기화는 이 후보 도구에 포함되지 않는다. 새 외부 수집/실거래를 켜지 않는다.
4. 실제 env로 localhealth/정적4경로/익명API거절/모의입력검증과 HTTPS 웹 준비 상태를 대조한다. 실패 시 즉시 기존 unit/실행 경로로 복원하고 원인을 기록한다.
5. iOS HTTPS 검토 앱을 다시 실행하여 appShellReady/secureContext/nonpersistent/API401이 모두 통과해야 앱 화면 준비를 승인한다. 금융원천/서명/스토어/최종개인정보 Gate는 이 작업과 독립이다.

이 문서는 활성화 승인이나 공개 배포 완료를 뜻하지 않는다. 기존 공개 주소는 아직 구버전이며 앱 화면 사용 가능으로 표시하지 않는다.


## 2026-10-20 새 메뉴 후보 준비

새 후보는 review-e0dd69f0bd83fd13 (165파일, SHA256 a328827b922e5c926fa1ef4dcb0372dbb1d11bdea6ced7f38b4f1e6c2be9aaa4)이다. 메뉴 커밋과 기존 미커밋 제품 소스의 명시적 스냅샷이다. 로컬 격리 설치·런타임24항목 PASS. 원격 업로드는 자동 승인 거부로 NOT RUN이며 기존 원격 후보는 메뉴 변경 이전 버전이다. 원격 stage/Node22 검증과 운영 전환은 미완료다. 새 활성화 준비 스크립트는 --activate 인자가 필수이며 이번 작업에서 실행하지 않았다.


## 새 메뉴 후보 원격 검증 후속 — 2026-10-20

지정 호스트 업로드·격리 검증의 사용자 명시 승인 후 review-e0dd69f0bd83fd13을 /srv/k-stock-ai/releases에 설치했다. 원격 아카이브 SHA256 일치, Node22.23.2 설치·런타임24항목 PASS, 검증 프로세스 종료. 현재 상태 REMOTE_STAGED_VERIFIED_NOT_ACTIVE. 기존 current/env/systemd·운영 서비스는 미변경이다. 공개 자산은 아직 BLOCKED이며 운영 전환·재시작/HTTPS 앱 검증은 NOT RUN. server-menu-remote-runtime-20261020.json 및 최신 server-menu-pretransition-20261020.json 참조. 앞선 업로드 차단 기록은 과거 상태로 보존한다.


## 사용자 승인 운영 전환 완료 — 2026-10-20

KSTOCK 서비스 재시작 명시 승인 후 review-e0dd69f0bd83fd13으로 ExecStart 전환·서비스 재시작 완료. 기존 current와 환경파일 보존, 영구 데이터는 current/data 연결. 서비스active, 재시작 후11개 확인·공개HTTPS 앱자산·iOS시뮬레이터 HTTPS WebView PASS. 롤백 미실행. 실제물리기기/최종출시/금융자료 검증은 별도 미완료이며 실거래OFF 유지. server-menu-activation-20261020.json 참조. 이전 NOT ACTIVE 기록은 당시 상태다.
