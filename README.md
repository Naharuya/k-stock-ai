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

## 5. 실제 OpenAI 연결

`.env`:

```env
KSTOCK_AI_MODE=openai
OPENAI_API_KEY=여기에_API_KEY
KSTOCK_DEFAULT_MODEL=gpt-5.5
```

API 키는 앱/브라우저 코드에 넣지 말고 서버의 `.env`에서만 관리하세요.

## 다음 단계

v0.2:
1. OpenDART API 연결
2. 종목코드 ↔ DART corp_code 매핑
3. 삼성전자(005930) 실제 공시/재무 데이터 조회
4. DART Agent + Company Agent + Risk Agent 실제 데이터 연결
