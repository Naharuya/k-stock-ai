# K-Stock external mobile access

K-Stock remains bound to `127.0.0.1:3000`. External phones connect through HTTPS via Cloudflare Tunnel.

## Temporary external test

On the Mac mini:

```bash
brew install cloudflared
cd <k-stock-ai-repository>
chmod +x scripts/start-external-test-tunnel.sh
./scripts/start-external-test-tunnel.sh
```

Cloudflare prints a temporary `https://*.trycloudflare.com` URL. Use that URL from a phone on LTE/5G or another Wi-Fi network to verify external reachability.

Quick Tunnel is for testing only and its URL changes when restarted.

## Stable external access

For a stable production-style hostname, create a named Cloudflare Tunnel in the Cloudflare dashboard and map a hostname to:

```text
http://127.0.0.1:3000
```

Keep the tunnel token outside Git and run:

```bash
export KSTOCK_TUNNEL_TOKEN='...'
./scripts/run-named-tunnel.sh
```

For long-running operation on macOS, install cloudflared as a service after the named tunnel is configured.

## Required K-Stock environment

```env
HOST=127.0.0.1
PORT=3000
KSTOCK_EXTERNAL_ACCESS_ENABLED=true
KSTOCK_EXTERNAL_ACCESS_TOKEN=<32+ character secret>
KSTOCK_BROKER_ENABLED=false
KSTOCK_LIVE_TRADING_ENABLED=false
```

Do not expose port 3000 through router port-forwarding.

The Android client must use the HTTPS tunnel hostname and send:

```http
Authorization: Bearer <KSTOCK_EXTERNAL_ACCESS_TOKEN>
```

The external access token and tunnel token must never be committed to GitHub or embedded in a public client build.
