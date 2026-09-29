#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
bash .ari/hooks/preflight.sh
bash .ari/hooks/verify.sh
if grep -R --exclude-dir=.git -nE 'KSTOCK_(LIVE_TRADING_ENABLED|BROKER_ENABLED)=true' . >/tmp/kstock-unsafe.$$ 2>/dev/null; then
  cat /tmp/kstock-unsafe.$$
  rm -f /tmp/kstock-unsafe.$$
  echo "RELEASE GATE FAIL: unsafe K-Stock flags found" >&2
  exit 10
fi
rm -f /tmp/kstock-unsafe.$$ 2>/dev/null || true
if git grep -nE '(BEGIN (RSA|OPENSSH|EC) PRIVATE KEY|sk-[A-Za-z0-9_-]{20,})' -- ':!package-lock.json' ':!*.md' >/tmp/ari-secret-scan.$$ 2>/dev/null; then
  cat /tmp/ari-secret-scan.$$
  rm -f /tmp/ari-secret-scan.$$
  echo "RELEASE GATE FAIL: potential secret detected" >&2
  exit 11
fi
rm -f /tmp/ari-secret-scan.$$ 2>/dev/null || true
echo "RELEASE GATE PASS"
