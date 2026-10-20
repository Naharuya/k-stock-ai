#!/usr/bin/env bash
set -euo pipefail

# Existing deployments must use an independently verified staged candidate.
# Never silently pull a moving branch into the live working directory.
if [ "${1:-}" != "--bootstrap" ] || ! [[ "${2:-}" =~ ^[a-f0-9]{40}$ ]]; then
  echo "Fresh install only: $0 --bootstrap <reviewed-40-character-commit>" >&2
  echo "Existing service: stage and verify the complete Web/API candidate first." >&2
  exit 64
fi
REVIEWED_COMMIT="$2"
APP_DIR=/srv/k-stock-ai
REPO_DIR="$APP_DIR/current"
if [ -e "$REPO_DIR" ] || [ -L "$REPO_DIR" ]; then
  echo "Refusing to overwrite an existing current deployment. Use the reviewed staging workflow." >&2
  exit 65
fi

sudo mkdir -p "$APP_DIR" /etc/k-stock-ai /var/log/k-stock-ai
sudo chown -R ubuntu:www-data "$APP_DIR" /var/log/k-stock-ai

git clone --no-checkout https://github.com/Naharuya/k-stock-ai.git "$REPO_DIR"

cd "$REPO_DIR"
git fetch origin "$REVIEWED_COMMIT"
git checkout --detach "$REVIEWED_COMMIT"
npm ci --omit=dev --ignore-scripts
# Refuse API-only revisions before service installation/start.
node --input-type=module - <<'JS'
import fs from 'node:fs';
import {inspectWebReleaseShell} from './src/v2/web_release_shell.js';
const files={'/':['public/index.html','text/html'],'/app.js':['public/app.js','text/javascript'],'/paper-backup.js':['public/paper-backup.js','text/javascript'],'/styles.css':['public/styles.css','text/css']};
const assets=Object.fromEntries(Object.entries(files).map(([key,[file,contentType]])=>[key,{status:200,contentType,body:fs.readFileSync(file,'utf8')}]));
if(inspectWebReleaseShell(assets).status!=='PASS')throw Error('COMPLETE_WEB_AND_API_REVISION_REQUIRED');
JS

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
