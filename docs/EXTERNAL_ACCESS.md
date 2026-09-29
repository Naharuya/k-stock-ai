# K-Stock AI 외부 HTTPS 접속 배포

목표: Android 등 외부 기기에서 K-Stock AI 분석 API를 안전하게 사용합니다.

## 원칙
- 3000 포트를 인터넷에 직접 공개하지 않습니다.
- 외부 접속은 HTTPS reverse proxy 뒤에서만 허용합니다.
- API는 Bearer token으로 보호합니다.
- 브로커/실거래 플래그가 켜지면 서버가 시작되지 않습니다.

## 서버 환경변수
```env
HOST=127.0.0.1
PORT=3000
KSTOCK_EXTERNAL_ACCESS_ENABLED=true
KSTOCK_EXTERNAL_ACCESS_TOKEN=<32자 이상 랜덤 비밀값>
KSTOCK_AI_MODE=mock
KSTOCK_BROKER_ENABLED=false
KSTOCK_LIVE_TRADING_ENABLED=false
```

## nginx 예시
```nginx
server {
  listen 443 ssl http2;
  server_name kstock.example.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

Android 앱은 `https://kstock.example.com` 을 서버 주소로 사용하고 API 요청에는
`Authorization: Bearer <token>` 헤더를 보냅니다.

비밀값은 GitHub 저장소나 앱 소스에 커밋하지 않습니다.
