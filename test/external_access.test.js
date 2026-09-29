import assert from "node:assert/strict";
import test from "node:test";
import { spawn } from "node:child_process";

function startServer(env = {}) {
  const child = spawn(process.execPath, ["src/server.js"], {
    env: { ...process.env, PORT: "3311", KSTOCK_AI_MODE: "mock", KSTOCK_BROKER_ENABLED: "false", KSTOCK_LIVE_TRADING_ENABLED: "false", ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  return child;
}

async function waitForHealth() {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      const r = await fetch("http://127.0.0.1:3311/health");
      if (r.ok) return r;
    } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error("server did not start");
}

test("external mode requires bearer token for API routes", async t => {
  const token = "x".repeat(48);
  const child = startServer({ KSTOCK_EXTERNAL_ACCESS_ENABLED: "true", KSTOCK_EXTERNAL_ACCESS_TOKEN: token });
  t.after(() => child.kill("SIGTERM"));
  await waitForHealth();

  const home = await fetch("http://127.0.0.1:3311/");
  assert.equal(home.status, 200);
  assert.match(home.headers.get("content-type"), /text\/html/);
  assert.match(await home.text(), /공시로 읽는/);

  const styles = await fetch("http://127.0.0.1:3311/styles.css");
  const css = await styles.text();
  assert.match(css, /h1 \{ margin-bottom: 15px;[^}]*font-size: 72px/);
  assert.match(css, /h1 \{ font-size: 68px/);

  let r = await fetch("http://127.0.0.1:3311/api/test-analysis", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  assert.equal(r.status, 401);

  r = await fetch("http://127.0.0.1:3311/api/test-analysis", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: "{}",
  });
  assert.equal(r.status, 200);
});

test("unsafe trading flags prevent service startup", async () => {
  const child = startServer({ KSTOCK_LIVE_TRADING_ENABLED: "true" });
  let stderr = "";
  child.stderr.on("data", d => { stderr += d.toString(); });
  const code = await new Promise(resolve => child.on("exit", resolve));
  assert.notEqual(code, 0);
  assert.match(stderr, /refuses to start/);
});

test("broker flag also prevents service startup", async () => {
  const child = startServer({ KSTOCK_BROKER_ENABLED: "true" });
  let stderr = "";
  child.stderr.on("data", d => { stderr += d.toString(); });
  const code = await new Promise(resolve => child.on("exit", resolve));
  assert.notEqual(code, 0);
  assert.match(stderr, /refuses to start/);
});
