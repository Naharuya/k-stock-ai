# Mac mini AI connection

The LLM agent adapter uses Ollama through an SSH tunnel. The discovered Mac mini model is `qwen3.5:4b-mlx`. The Mac mini serves Ollama on `127.0.0.1:11434`; it does not expose that API on the LAN.

## Windows connection

Use the existing SSH private key whose public key is registered for the Mac mini account. Keep the key outside Git. The verified server host key is stored in `.cache/macmini_known_hosts`.

```powershell
powershell -NoProfile -File scripts/macmini_ai_tunnel.ps1 -IdentityFile "$env:USERPROFILE\.ssh\beavers_macmini_ed25519"
```

This command holds a foreground tunnel at `127.0.0.1:11435`. It exits if the port is already occupied. Keep the terminal open; after a reboot or lost tunnel, run it again. No scheduler or automatic server restart is installed.

Application settings:

```dotenv
KSTOCK_AI_MODE=ollama
KSTOCK_OLLAMA_BASE_URL=http://127.0.0.1:11435
KSTOCK_DEFAULT_MODEL=qwen3.5:4b-mlx
KSTOCK_AI_TIMEOUT_MS=120000
KSTOCK_LIVE_TRADING_ENABLED=false
```

For a separately reviewed deployment directly on the Mac mini, use `http://127.0.0.1:11434`. Changing the local source does not deploy or restart the Mac mini application.

## Behavior

- `mock` returns fixtures without network access. The example configuration keeps this mode for safe tests.
- `ollama` calls the explicitly configured loopback endpoint and model. `openai` mode is rejected; there is no cloud fallback or automatic retry.
- Inference is serialized. Timeout includes queue waiting. Each JSON result must contain the existing agent fields with matching top-level types.
- Invalid/incomplete output and connection failures raise safe errors; prompts and provider error bodies are not logged.
- KIS/OpenDART data retrieval and the existing deterministic analysis services retain their behavior. This change replaces the LLM agent adapter, not data providers.

## Validation

`npm run ai:check` runs only offline fixtures, including timeout, cancellation, serialization and error handling.

Live verification uses the repository's synthetic sample data, not investment advice or real orders. The model's JSON compatibility does not establish financial accuracy.

API reference: https://docs.ollama.com/api/chat
