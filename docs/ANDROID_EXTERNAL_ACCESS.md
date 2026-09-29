# Android 외부접속 전환 — 2026-09-29

## 소스와 작업 범위

- 기준 저장소: `Naharuya/k-stock-ai`, 운영 backend 기준 `fe81e6a`.
- Android 소스는 master에 없으므로 같은 저장소의
  `origin/recovery/windows-k-stock-ai-20260919:android/`에서 복원했다.
- 패키지 `ai.kstock.mobile`, 기존 Activity preferences 및 notification preferences 키 유지.
- 버전 `2.6.5 (265)`, min SDK 26 / target SDK 35.
- 원본 작업 폴더의 기존 미커밋 backend/터널/공시 작업을 보존하고 별도 worktree에서 작업.
- 운영 서버·서비스·포트·브로커·실거래 설정은 변경하지 않았다.

## 운영 주소와 인증

기본값은 `https://kstock.ai.kr`. Release는 HTTPS DNS 주소만 허용한다.
HTTP, raw IP, localhost, 로컬 전용 이름, URL 사용자정보·쿼리·fragment·경로를
서버 설정으로 거부한다. HTTPS 인증서 검증은 OS 기본값을 사용한다.
앱 빌드는 모두 Release 정책을 적용하며 LAN 허용 리소스를 생성하지 않는다.
순수 주소 검증 함수의 debug 옵션은 앱에서 사용하지 않는다.

연결 설정의 비밀번호 입력란에 사용자가 직접 외부접속 토큰을 입력한다.
Android Keystore의 AES-256-GCM 키로 암호화하고 ciphertext만 전용 preferences에 저장한다.
서버 origin을 AAD로 사용하며 다른 주소로 변경하면 이전 주소의 토큰은 사용하지 않는다.
저장된 토큰을 입력란에 다시 표시하거나 JS·로그·문서·앱 소스에 넣지 않는다.
설정 창은 스크린샷 및 autofill/form state 저장을 제한한다. 백업은 기존처럼 비활성이다.

`/health`는 토큰 저장소를 읽지 않고 호출한다. `/api/*`는 native ApiClient에서
Bearer를 추가하며, 토큰이 없거나 암호화 저장소를 읽을 수 없으면 전송 전에 인증 필요를
반환한다. 리다이렉트는 따라가지 않는다. 인증 오류, 권한 오류, 서버 오류, timeout,
인터넷/DNS 오류, TLS 오류를 구분한다. 응답에 토큰이 반사되어도 표시 전에 가린다.

WebView는 같은 origin만 로드하고 파일·콘텐츠·혼합 콘텐츠 접근을 차단한다.
GET API 및 알림 Job은 native client를 사용한다. 기존 화면의 fetch POST/PUT/PATCH/DELETE는
앱의 fetch bridge가 body를 native로 보내므로 토큰은 JavaScript에 노출되지 않는다.
POST body를 읽을 수 없는 WebView interceptor에만 의존하지 않는다.
XHR/form POST는 현재 지원하지 않으며 인증 없는 요청을 전송하는 대신 차단한다.
서버 CSP 등 보안 헤더를 보존하며 CSP를 우회하기 위해 완화하지 않는다.
이 브리지는 지정한 서버의 콘텐츠를 신뢰한다는 전제하에 동작한다.

## 마이그레이션과 데이터 보존

- 미설정 → 운영 기본 주소.
- 기존 알려진 기본값 `http://192.168.0.9:3000` → 운영 기본 주소.
- 명시적 custom 표시가 있거나 다른 LAN/HTTPS 값이면 덮어쓰지 않는다.
  Release에서 사용할 수 없는 값은 보존하고 설정 화면에서 HTTPS 주소 선택을 요청한다.
- 이전 버전은 custom 여부를 별도로 저장하지 않아, 알려진 기본값과 동일한 수동 설정을
  구별할 수 없다. 그 값만 기본값으로 취급하고 이전 주소도 별도 보존한다.
- 알림의 별도 서버 설정도 같은 규칙으로 처리한다.
- 앱 삭제, preferences 초기화, WebView 데이터/기록 삭제를 하지 않는다.
- WebView localStorage는 origin별이므로 기존 LAN origin에 저장된 기록을 새 HTTPS 화면에서
  자동으로 표시하지는 않는다. 기존 저장 데이터 자체는 삭제하지 않는다.

## 현재 운영 기능의 한계

2026-09-29 공개 read-only 확인에서 `/health`는 성공했고,
`externalAccess=true`, `brokerEnabled=false`, `liveTrading=false`, `mode=mock`였다.
인증 없는 API 요청은 401이었다. `/`는 HTML 앱 화면 대신 API 안내 JSON을 반환한다.

따라서 기존 전체 종목 조회/분석 웹 화면은 주소 변경만으로 복구되지 않는다.
앱은 이를 명확히 안내하고, 안전 flag 및 mock mode가 확인된 경우에만 사용자가
`샘플 분석 확인 (실제 종목 아님)`을 눌러 기존 `/api/test-analysis`로 인증을 확인할 수 있다.
이는 가상 데이터 연결 검사이며 실제 종목 분석 완료를 의미하지 않는다.
`/api/operations/health` 기반의 기존 알림도 서버가 해당 경로를 제공해야 작동한다.
새로운 웹 UI나 production backend 배포는 이번 변경에 포함하지 않았다.

## 빌드·검증

```sh
npm ci
KSTOCK_AI_MODE=mock KSTOCK_BROKER_ENABLED=false KSTOCK_LIVE_TRADING_ENABLED=false DOTENV_CONFIG_PATH=/dev/null npm test
# Android SDK 플랫폼 35, build-tools 36.0.0, JDK 17 필요
node android/build.mjs
```

SDK 경로는 `ANDROID_SDK_ROOT` 또는 `ANDROID_HOME`, JDK 경로는 `JAVA_HOME`으로 설정한다.
PowerShell에서는 `android/build.ps1`이 동일 빌더를 호출한다.
CI는 Node/JVM 계약 테스트와 별도 unsigned Release APK compile을 실행한다.
테스트는 mock/loopback fixture만 사용하며 유료 AI, KIS 주문, 실제 인증 토큰을 사용하지 않는다.

로컬: 자동 테스트 52 PASS, Release compile 및 APK 메타데이터 확인 PASS.
기기 연결이 없어 Android Keystore 실제 동작·UI·서명 업데이트·LTE/5G는 NOT RUN.
호스트 JVM 테스트는 Android 플랫폼 실행 검증을 대체하지 않는다.

## 기존 앱 업데이트 절차

1. `adb devices -l`로 승인된 기기를 확인한다. unauthorized이면 휴대폰에서 허용 후 재확인.
2. 설치된 패키지 `ai.kstock.mobile`, versionCode, 기존 APK 서명 인증서를 확인한다.
3. **기존 서명키만** 사용한다. 복구 브랜치의 예전 빌더는 로컬 키를 만들었으므로
   그 기기에 설치한 APK와 같은 키인지 확인해야 한다. 새 키를 생성해 우회하지 않는다.
4. 기존 키를 안전한 로컬 환경에 설정한다. 빌더 입력 이름은
   `KSTOCK_ANDROID_KEYSTORE`, `KSTOCK_ANDROID_KEY_ALIAS`,
   `KSTOCK_ANDROID_STORE_PASSWORD`, `KSTOCK_ANDROID_KEY_PASSWORD`이다.
   비밀값을 문서·명령 기록·채팅·GitHub artifact에 넣지 않는다.
5. `node android/build.mjs`로 서명한 APK를 만들고 `apksigner verify --print-certs`로
   기존 설치본과 인증서가 일치하며 versionCode가 다운그레이드되지 않는지 확인한다.
6. 확인된 signed APK만 `adb install -r <signed-apk>`로 업데이트한다.
   unsigned CI APK는 직접 설치할 수 없다. `uninstall`, `pm clear`, 강제 downgrade는 금지한다.
7. 앱에서 기본 주소, 인증 없는 health, 토큰 미설정 상태 → 사용자 직접 토큰 입력 →
   API 인증 확인을 점검한다. 토큰을 출력하는 UI dump/네트워크 로그를 수집하지 않는다.
8. Wi-Fi 상태와 Wi-Fi OFF의 LTE/5G에서 각각 확인한다. 기존 데이터와 알림 설정 보존도 확인한다.

실기기 연결, 기존 서명키, 사용자 직접 토큰 입력, 전체 웹 화면/최신 Android 소스 위치가
남아 있다. master merge 및 운영 배포는 수행하지 않았다.

참고: [Android Keystore](https://developer.android.com/privacy-and-security/keystore),
[WebView native bridge 보안](https://developer.android.com/privacy-and-security/risks/insecure-webview-native-bridges).
