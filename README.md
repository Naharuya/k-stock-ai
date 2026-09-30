# K-Stock AI v0.1.0

한국 주식시장(KOSPI/KOSDAQ) 전용 멀티에이전트 투자 리서치 MVP입니다.

## 현재 범위

- K-Stock Router
- Market Agent
- Company Agent
- DART Agent
- Flow Agent
- Technical Agent
- News Agent
- Risk Agent
- Bear Agent
- Investment Committee
- Risk Hard Stop
- Mock 모드
- OpenAI 모드
- 실제 주문 기능 비활성화

> 이 버전은 투자 리서치/의사결정 보조용입니다. 실제 주문 기능은 포함하지 않습니다.

## 권장 환경

- Mac mini 상시 운영 노드
- Node.js 22 이상
- Git / GitHub CLI

## 개인용 Mac mini 운영 원칙

K-Stock AI는 당분간 개인용 리서치 시스템으로만 운영합니다. Windows/모바일을 주 실행 노드로 사용하지 않고 Mac mini의 AI/에이전트가 분석·스케줄·검증 업무를 담당합니다.

안전 기본값은 고정합니다.

```env
KSTOCK_LIVE_TRADING_ENABLED=false
KSTOCK_BROKER_ENABLED=false
```

브로커 API가 데이터 조회 목적으로 향후 사용되더라도 주문 실행 경로는 별도 승인 없이 활성화하지 않습니다. 자동 주문, 실계좌 주문, 주문 스케줄러는 운영 범위에 포함하지 않습니다.

## 1. 설치

```bash
npm install
```

## 2. 환경변수

`.env.example`을 복사하여 `.env` 파일을 만듭니다.

Mac mini:

```bash
cp .env.example .env
```

초기에는 다음 값을 유지하세요.

```env
KSTOCK_AI_MODE=mock
KSTOCK_LIVE_TRADING_ENABLED=false
```

OpenDART 실데이터를 사용하는 경우에만 API 키를 설정하고 `KSTOCK_DART_ENABLED=true`로 변경하세요. 기본값은 외부 데이터 요청을 하지 않도록 비활성화되어 있습니다.
실시간 시세 조회도 사용하려면 KIS 읽기 전용 API 키를 설정하고 `KSTOCK_KIS_ENABLED=true`로 변경하세요. `KIS_ENV`는 기본적으로 모의투자 서버(`paper`)를 선택합니다.
`/api/analyze`에서 실제 데이터를 쓰려면 두 설정을 모두 활성화해야 합니다. 둘 다 꺼져 있으면 요청 본문의 데이터를 사용하고, 하나만 켜져 있으면 안전을 위해 분석을 거부합니다. 로컬 AI 분석에는 Ollama를 실행하고 `KSTOCK_AI_MODE=local`을 설정하세요.

```env
KSTOCK_DART_ENABLED=true
OPENDART_API_KEY=발급받은_API_KEY
KSTOCK_KIS_ENABLED=true
KIS_ENV=paper
KIS_APP_KEY=발급받은_APP_KEY
KIS_APP_SECRET=발급받은_APP_SECRET
```

Mac 로컬 AI 기본 모델은 `qwen3:8b`입니다. Ollama가 `127.0.0.1:11434`에서 실행 중인지 확인하고 다음 설정을 사용하세요. 로컬 추론 요청은 메모리 사용을 위해 한 번에 하나씩 처리합니다.

```env
KSTOCK_AI_MODE=local
KSTOCK_LOCAL_BASE_URL=http://127.0.0.1:11434
KSTOCK_LOCAL_MODEL=qwen3:8b
KSTOCK_LOCAL_TIMEOUT_MS=120000
KSTOCK_LOCAL_LONG_TIMEOUT_MS=300000
KSTOCK_LOCAL_MAX_OUTPUT_TOKENS=512
KSTOCK_LOCAL_LONG_OUTPUT_TOKENS=2048
```

## 3. 실행

```bash
npm run dev
```

브라우저:

```text
http://localhost:3000/health
```

정상 응답:

```json
{
  "ok": true,
  "service": "k-stock-ai",
  "version": "0.1.0",
  "mode": "mock",
  "liveTrading": false
}
```

## 4. 샘플 분석

Mac mini:

```bash
curl -sS -X POST http://127.0.0.1:3000/api/test-analysis -H 'content-type: application/json' -d '{}'
```

또는 smoke test:

```bash
npm run smoke
```

## 5. OpenAI 사용 (선택)

`.env`:

```env
KSTOCK_AI_MODE=openai
OPENAI_API_KEY=여기에_API_KEY
KSTOCK_DEFAULT_MODEL=gpt-5.5
```

API 키는 앱/브라우저 코드에 넣지 말고 서버의 `.env`에서만 관리하세요.

## 6. Android companion

네이티브 Android 앱은 `android/`에 있습니다. Mac의 API는 loopback에만 바인딩되므로 USB 연결 후 ADB reverse를 사용합니다.

```bash
adb reverse tcp:3002 tcp:3002
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

앱은 실데이터 종목 분석과 최근 예약 분석 리포트 조회를 제공합니다. APK 재빌드는 `cd android && ./gradlew assembleDebug`로 합니다. 비공개 보고서는 `data/reports/`에 저장되며 Git에서 제외됩니다.

## 진행 현황

v0.2:
- [x] OpenDART 재무제표·공시 HTTP 어댑터
- [x] 종목코드 ↔ DART corp_code 매핑 및 프로세스 내 캐시
- [x] 명시적 활성화, 응답 검증, 최신성 확인, 제한 재시도
- [x] KIS 읽기 전용 시세 어댑터 및 토큰 캐시
- [x] 안전 데이터 파이프라인을 `/api/analyze`에 연결
- [x] 삼성전자(005930) 실제 공시·재무·시세 조회 및 `/api/analyze` 응답 검증
- [x] 실데이터를 Market, Company, DART Agent 입력에 전달
- [x] Ollama Qwen 로컬 AI 모드, 직렬 추론, 출력 길이 제한
- [x] Qwen 로컬 AI의 삼성전자 실데이터 분석 응답 검증
- [x] 에이전트 필수 필드·타입·점수 범위 검증
- [x] 치명 공시 제목의 결정론적 Risk Hard Stop 및 일반 공시 반례 테스트
- [x] 실제 삼성전자 최근 공시 제목 표본 대조 및 거짓 양성 회귀 테스트
- [x] OpenDART 공시 월별 조회(월 최대 20페이지)·중복 제거·잘림 메타데이터
- [x] 전체 조회 공시를 위험 검사하고 모델에는 최대 50건만 전달
- [x] 4개 종목의 3년 공시 이력 점검 및 실제 부도·회생·상장폐지 제목 회귀 테스트
- [x] 해외증권시장 상장폐지와 진행 중 이의·우려 보고서의 거짓 양성 제거
- [x] 종속회사 부도·회생 공시는 모회사 Hard Stop 대신 영향 검토 신호로 전달
- [ ] 로컬 AI의 중요 공시·위험 판단을 사례별로 검토하고 품질 기준 보강
