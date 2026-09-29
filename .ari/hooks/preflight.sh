#!/usr/bin/env bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[[ -n "$ROOT" ]] || { echo "PRECHECK FAIL: not in git repo" >&2; exit 2; }
cd "$ROOT"
echo "PROJECT=K-Stock AI"
echo "ROOT=$ROOT"
echo "BRANCH=$(git branch --show-current)"
echo "HEAD=$(git rev-parse --short HEAD)"
echo "REMOTE=$(git remote get-url origin 2>/dev/null | sed -E 's#(https?://)[^/@]+@#\1***@#')"
echo "DIRTY_COUNT=$(git status --porcelain | wc -l | tr -d ' ')"
test -f CLAUDE.md
test -f AGENTS.md
echo "PRECHECK PASS"
