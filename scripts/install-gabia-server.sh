#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/srv/k-stock-ai
REPO_DIR="$APP_DIR/current"

sudo mkdir -p "$APP_DIR" /etc/k-stock-ai /var/log/k-stock-ai
sudo chown -R ubuntu:www-data "$APP_DIR" /var/log/k-stock-ai

if [ ! -d "$REPO_DIR/.git" ]; then
  git clone https://github.com/Naharuya/k-stock-ai.git "$REPO_DIR"
fi

cd "$REPO_DIR"
git fetch --all --prune
git checkout master
git pull --ff-only
npm ci --omit=dev

sudo cp ops/systemd/k-stock-ai.service /etc/systemd/system/k-stock-ai.service
if [ ! -f /etc/k-stock-ai/k-stock-ai.env ]; then
  sudo cp ops/env/k-stock-ai.env.example /etc/k-stock-ai/k-stock-ai.env
  sudo chmod 640 /etc/k-stock-ai/k-stock-ai.env
  echo "Created /etc/k-stock-ai/k-stock-ai.env"
  echo "Set KSTOCK_EXTERNAL_ACCESS_TOKEN before starting the service."
  exit 4
fi

sudo systemctl daemon-reload
sudo systemctl enable k-stock-ai
sudo systemctl restart k-stock-ai
sudo systemctl --no-pager --full status k-stock-ai
