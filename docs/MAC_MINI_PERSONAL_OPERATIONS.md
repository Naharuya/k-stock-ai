# K-Stock AI — Mac mini Operations

## Scope

K-Stock AI is a private research and decision-support service operated from the Mac mini. Windows and mobile clients are not required for the primary workflow.

## Safety invariants

- KSTOCK_LIVE_TRADING_ENABLED=false
- KSTOCK_BROKER_ENABLED=false by default
- No automated order placement
- No real-account order scheduler
- Secrets remain in the Mac mini environment and are never committed
- Any future broker integration is read-only/data-first unless separately reviewed and explicitly approved

## Mac mini responsibility

1. Fetch approved market, OpenDART and news inputs when enabled.
2. Run market/company/flow/technical/news/risk/bear agents.
3. Produce research reports and candidate lists.
4. Run offline tests and validation before code changes are accepted.
5. Keep logs and scheduled research jobs local to the operating node.
6. Push code changes through Git branches/PRs; do not use the production research process to modify trading safety gates.

## Startup target

```bash
cd <K_STOCK_AI_REPO>
npm ci
npm test
KSTOCK_LIVE_TRADING_ENABLED=false KSTOCK_BROKER_ENABLED=false npm start
```

Health target: http://127.0.0.1:3000/health

## Agent queue

Research queue:
Market -> Company/OpenDART -> Flow -> Technical -> News -> Bear/Risk -> Investment Committee -> Report

Engineering queue:
Change -> Offline tests -> Verification -> Branch/PR -> Human review

Real trading remains outside both queues.
