#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-3000}"
HEALTH="http://127.0.0.1:${PORT}/health"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared is not installed."
  echo "Install on macOS with: brew install cloudflared"
  exit 2
fi

if ! curl -fsS "${HEALTH}" >/dev/null; then
  echo "K-Stock health check failed at ${HEALTH}"
  echo "Start K-Stock first and keep HOST=127.0.0.1."
  exit 3
fi

echo "Starting temporary Cloudflare Quick Tunnel for K-Stock..."
echo "This is for external connectivity testing only."
exec cloudflared tunnel --url "http://127.0.0.1:${PORT}"
