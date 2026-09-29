# Preflight Skill
1. Confirm current directory and repository identity.
2. Read CLAUDE.md and AGENTS.md.
3. Run `.ari/hooks/preflight.sh`.
4. Preserve existing dirty work.
5. Confirm target branch, remote, and deployment target.
6. Stop if repo/path/remote do not match.
7. Never use destructive reset/stash automatically.
