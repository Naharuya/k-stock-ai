# K-Stock AI production deployment on ari-prod-01

Target:
- host: ari-prod-01
- app path: `/srv/k-stock-ai/current`
- service: `k-stock-ai.service`
- local bind: `127.0.0.1:3000`
- public host: `https://kstock.ai.kr`

## DNS
Create/update the Gabia DNS record:

```text
Type: A
Host: kstock
Value: <ari-prod-01 public IPv4>
```

Wait until:

```bash
dig +short kstock.ai.kr
```

returns the server public IP.

## Install

SSH to ari-prod-01 and run:

```bash
git clone https://github.com/Naharuya/k-stock-ai.git /srv/k-stock-ai/current
cd /srv/k-stock-ai/current
sudo bash scripts/install-gabia-server.sh
```

If the installer creates `/etc/k-stock-ai/k-stock-ai.env` and stops, edit that file and set a 32+ character random value for:

```env
KSTOCK_EXTERNAL_ACCESS_TOKEN=
```

Keep:

```env
HOST=127.0.0.1
KSTOCK_BROKER_ENABLED=false
KSTOCK_LIVE_TRADING_ENABLED=false
```

Then:

```bash
sudo systemctl restart k-stock-ai
curl -fsS http://127.0.0.1:3000/health
```

## nginx + TLS

Before certificate issuance, install the HTTP vhost or create a temporary HTTP-only server block for `kstock.ai.kr`, then:

```bash
sudo certbot --nginx -d kstock.ai.kr
```

After the certificate exists, copy:

```bash
sudo cp ops/nginx/kstock.ai.kr.conf /etc/nginx/sites-available/kstock.ai.kr.conf
sudo ln -sf /etc/nginx/sites-available/kstock.ai.kr.conf /etc/nginx/sites-enabled/kstock.ai.kr.conf
sudo nginx -t
sudo systemctl reload nginx
```

## Verify

```bash
cd /srv/k-stock-ai/current
chmod +x scripts/verify-gabia-deploy.sh
./scripts/verify-gabia-deploy.sh
```

Expected final URL:

```text
https://kstock.ai.kr/health
```
