$ErrorActionPreference='Stop'
Set-Location -LiteralPath (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
& node.exe src/server_supervisor.js

exit $LASTEXITCODE
