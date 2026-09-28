# ARI / Claude Code Entry Point

Read this file first, then follow the repository-specific instructions.

## Required preflight
1. Read `AGENTS.md` if present. Repository/project-specific rules override this file.
2. Read `docs/ARI_COMPLIANCE_STANDARD.md` if present.
3. Confirm repository, working directory, branch, HEAD, remote, and working-tree status before changing files.
4. Preserve existing uncommitted work. Never force-reset, force-checkout, force-push, delete, or overwrite unrelated work.
5. Do not modify another ARI project while working in this repository.

## Default execution loop
Analyze → plan → implement → targeted tests → regression tests → review diff → secret scan → fix → retest.

Continue ordinary safe local development without repeatedly asking for approval. Do not claim PASS without current evidence.

## Approval boundary
Stop before production deployment/restart, production DB migration or destructive data changes, DNS/SSL/account/credential changes, store submission, paid external-service activation, real trading/payment/dispatch, or any action with external or irreversible effects.

## Security
Never print or commit API keys, passwords, tokens, private keys, keystore passwords, or real secrets. Use placeholders in examples.

## Project memory
Keep durable project-specific discoveries in the repository's existing documentation/log structure rather than duplicating long global instructions here. Correct stale project documentation when verified evidence proves it wrong.

## Precedence
Repository-specific `AGENTS.md`, handoff documents explicitly named by it, and project compliance rules take precedence over this file when they are more specific.
