#!/usr/bin/env bash
set -euo pipefail

: "${KSTOCK_TUNNEL_TOKEN:?Set KSTOCK_TUNNEL_TOKEN in the local shell or secret store.}"
PORT="${PORT:-3000}"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared is not installed."
  echo "Install on macOS with: brew install cloudflared"
  exit 2
fi

if ! curl -fsS "http://127.0.0.1:${PORT}/health" >/dev/null; then
  echo "K-Stock health check failed on localhost:${PORT}"
  exit 3
fi

exec cloudflared tunnel run --token "${KSTOCK_TUNNEL_TOKEN}"
