# K-Stock AI

This file is the short agent entrypoint. Detailed operating rules remain in `AGENTS.md`.

## Identity
- Repository: K-Stock AI
- Default branch: `master`
- Local path: `~/ARI/projects/k-stock-ai`
- Production host: `ari-prod-01`
- Production path: `/srv/k-stock-ai/current`

## Required startup
1. Read `AGENTS.md`.
2. Read `.ari/memory/PROJECT_MEMORY.md`.
3. Run `.ari/hooks/preflight.sh`.
4. Open only the skills needed for the current task.

## Hard rules
- KSTOCK_LIVE_TRADING_ENABLED must remain false.
- KSTOCK_BROKER_ENABLED must remain false unless the user explicitly changes product scope.
- No order generation or broker execution in K-Stock AI 2.0.
- D-2 evidence/freshness and source traceability are required for ranked candidates.
- No guaranteed-return language; Bear/Risk/Compliance gates must remain active.

## Verification
Run `.ari/hooks/verify.sh` after implementation.
Run `.ari/hooks/release-gate.sh` before any release/deployment preparation.

## Memory discipline
Do not store temporary CI failures, one-off blockers, or current progress in long-term memory.
Put changing status in PRs/issues/logs instead.

## Completion
Report changed files, tests, risks, unresolved approval gates, and next action.
