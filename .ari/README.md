# ARI / JINI Agent Standard

This directory separates long-lived memory, repeatable skills, and executable hooks.

## Source of truth
- `CLAUDE.md`: short project entrypoint for Claude/Codex/agents.
- `AGENTS.md`: detailed project operating rules.
- `.ari/memory/PROJECT_MEMORY.md`: stable facts only; no temporary status.
- `.ari/skills/*/SKILL.md`: repeatable procedures.
- `.ari/hooks/*.sh`: executable checks.
- Dynamic status belongs in issues/PRs/logs, not memory.

## Rule against duplication
A rule should have one primary home:
- policy/context -> AGENTS.md
- stable fact -> memory
- procedure -> skill
- enforceable invariant -> hook
- CLAUDE.md should reference, not duplicate, the full text.

## Recommended workflow
1. Read CLAUDE.md.
2. Run .ari/hooks/preflight.sh.
3. Read AGENTS.md and relevant skill.
4. Work only in the identified repo/branch.
5. Run .ari/hooks/verify.sh.
6. Run .ari/hooks/release-gate.sh before release/deploy.
