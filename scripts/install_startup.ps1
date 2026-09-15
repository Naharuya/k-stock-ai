$ErrorActionPreference='Stop'
$projectRoot=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$nodePath=(Get-Command node.exe).Source
$account=[System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$runner=Join-Path $PSScriptRoot 'run_supervisor.ps1'
$action=New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -WindowStyle Hidden -File "'+$runner+'"') -WorkingDirectory $projectRoot
$triggers=@((New-ScheduledTaskTrigger -AtLogOn -User $account),(New-ScheduledTaskTrigger -Daily -At '06:55'))
$principal=New-ScheduledTaskPrincipal -UserId $account -LogonType Interactive -RunLevel Limited
$settings=New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -WakeToRun
Register-ScheduledTask -TaskName 'K-Stock AI Research Server' -Action $action -Trigger $triggers -Principal $principal -Settings $settings -Description 'Personal K-Stock AI research server; no order execution.' -Force | Select-Object TaskName,State
Start-ScheduledTask -TaskName 'K-Stock AI Research Server'
