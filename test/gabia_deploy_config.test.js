import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("gabia deployment artifacts keep k-stock private behind nginx", () => {
  const service = fs.readFileSync("ops/systemd/k-stock-ai.service", "utf8");
  const nginx = fs.readFileSync("ops/nginx/kstock.ai.kr.conf", "utf8");
  const env = fs.readFileSync("ops/env/k-stock-ai.env.example", "utf8");

  assert.match(service, /WorkingDirectory=\/srv\/k-stock-ai\/current/);
  assert.match(service, /EnvironmentFile=\/etc\/k-stock-ai\/k-stock-ai\.env/);

  assert.match(nginx, /server_name kstock\.ai\.kr/);
  assert.match(nginx, /proxy_pass http:\/\/127\.0\.0\.1:3000/);

  assert.match(env, /HOST=127\.0\.0\.1/);
  assert.match(env, /KSTOCK_EXTERNAL_ACCESS_ENABLED=true/);
  assert.match(env, /KSTOCK_BROKER_ENABLED=false/);
  assert.match(env, /KSTOCK_LIVE_TRADING_ENABLED=false/);
  assert.match(env, /KSTOCK_EXTERNAL_ACCESS_TOKEN=\s*$/m);
});
