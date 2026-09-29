#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-kstock.ai.kr}"

echo "[1/6] systemd"
systemctl is-active --quiet k-stock-ai
systemctl is-enabled --quiet k-stock-ai

echo "[2/6] local health"
curl -fsS http://127.0.0.1:3000/health

echo
echo "[3/6] nginx syntax"
sudo nginx -t

echo "[4/6] HTTPS health"
curl -fsS "https://${DOMAIN}/health"

echo
echo "[5/6] public API auth must reject anonymous request"
status="$(curl -sS -o /dev/null -w '%{http_code}' -X POST "https://${DOMAIN}/api/test-analysis" -H 'content-type: application/json' -d '{}')"
test "$status" = "401"

echo "[6/6] trading flags"
health="$(curl -fsS "https://${DOMAIN}/health")"
echo "$health" | grep -q '"brokerEnabled":false'
echo "$health" | grep -q '"liveTrading":false'

echo "K-STOCK DEPLOY VERIFY PASS"
