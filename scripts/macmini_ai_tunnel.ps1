param(
  [Parameter(Mandatory = $true)][string]$IdentityFile,
  [string]$MacHost = '192.168.0.16',
  [string]$MacUser = 'server'
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$knownHosts = Join-Path $projectRoot '.cache\macmini_known_hosts'
if (!(Test-Path -LiteralPath $IdentityFile -PathType Leaf)) { throw 'SSH identity file not found.' }
if (!(Test-Path -LiteralPath $knownHosts -PathType Leaf)) { throw 'Verify the Mac mini host key before starting the tunnel.' }
Write-Host 'Mac mini AI tunnel: 127.0.0.1:11435 -> Mac mini 127.0.0.1:11434. Keep this terminal open.'
& ssh -N -i $IdentityFile -o IdentitiesOnly=yes -o BatchMode=yes -o ExitOnForwardFailure=yes -o ConnectTimeout=8 -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$knownHosts" -L '127.0.0.1:11435:127.0.0.1:11434' "${MacUser}@${MacHost}"
exit $LASTEXITCODE
