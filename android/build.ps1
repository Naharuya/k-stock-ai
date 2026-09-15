param(
 [string]$SdkRoot = "C:\Users\vjsjv\AppData\Local\Android\Sdk",
 [string]$JavaRoot = "C:\Program Files\Android\Android Studio\jbr",
 [string[]]$LanHosts = @()
)
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$buildRoot=Join-Path $PSScriptRoot 'build'
$toolsRoot=Join-Path $SdkRoot 'build-tools\36.0.0'
$androidJar=Join-Path $SdkRoot 'platforms\android-35\android.jar'
$packageMetadata=Get-Content -LiteralPath (Join-Path $projectRoot 'package.json') -Raw | ConvertFrom-Json
if($LanHosts.Count -eq 0){$LanHosts=@(Get-NetIPConfiguration | Where-Object {$_.IPv4DefaultGateway} | ForEach-Object {$_.IPv4Address.IPAddress})}
$LanHosts=@($LanHosts | Select-Object -Unique)
if($LanHosts.Count -eq 0 -or $LanHosts.Count -gt 8){throw 'Specify the PC LAN IPv4 with -LanHosts'}
foreach($lanHost in $LanHosts){
 $parsedAddress=$null
 if(![System.Net.IPAddress]::TryParse($lanHost,[ref]$parsedAddress) -or $parsedAddress.ToString() -ne $lanHost -or $lanHost -notmatch '^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)'){throw 'Only explicit private LAN IPv4 addresses are permitted'}
}
$env:JAVA_HOME=$JavaRoot
$env:PATH=(Join-Path $JavaRoot 'bin')+';'+$env:PATH
function Checked([string]$File,[string[]]$Arguments){ & $File @Arguments; if($LASTEXITCODE -ne 0){throw "Build tool failed: $File"} }
New-Item -ItemType Directory -Force -Path $buildRoot,(Join-Path $buildRoot 'classes'),(Join-Path $buildRoot 'dex'),(Join-Path $buildRoot 'generated') | Out-Null
$networkRoot=Join-Path $buildRoot 'network-res'
New-Item -ItemType Directory -Force -Path (Join-Path $networkRoot 'xml') | Out-Null
$domains=($LanHosts | ForEach-Object {'<domain includeSubdomains="false">'+$_+'</domain>'}) -join ''
$networkXml='<network-security-config><base-config cleartextTrafficPermitted="false"/><domain-config cleartextTrafficPermitted="true">'+$domains+'</domain-config></network-security-config>'
[IO.File]::WriteAllText((Join-Path $networkRoot 'xml\network_security_config.xml'),$networkXml,[Text.UTF8Encoding]::new($false))
Checked (Join-Path $toolsRoot 'aapt2.exe') @('compile','--dir',$networkRoot,'-o',(Join-Path $buildRoot 'network-res.zip'))
Checked (Join-Path $toolsRoot 'aapt2.exe') @('compile','--dir',(Join-Path $PSScriptRoot 'res'),'-o',(Join-Path $buildRoot 'resources.zip'))
Checked (Join-Path $toolsRoot 'aapt2.exe') @('link','-o',(Join-Path $buildRoot 'unsigned.apk'),'-I',$androidJar,'--manifest',(Join-Path $PSScriptRoot 'AndroidManifest.xml'),'--java',(Join-Path $buildRoot 'generated'),(Join-Path $buildRoot 'resources.zip'),'-R',(Join-Path $buildRoot 'network-res.zip'))
$javaFiles=@(Get-ChildItem (Join-Path $PSScriptRoot 'src'),(Join-Path $buildRoot 'generated') -Filter '*.java' -Recurse | ForEach-Object {$_.FullName})
Checked (Join-Path $JavaRoot 'bin\javac.exe') (@('-encoding','UTF-8','-source','8','-target','8','-classpath',$androidJar,'-d',(Join-Path $buildRoot 'classes'))+$javaFiles)
Checked (Join-Path $JavaRoot 'bin\jar.exe') @('cf',(Join-Path $buildRoot 'classes.jar'),'-C',(Join-Path $buildRoot 'classes'),'.')
Checked (Join-Path $toolsRoot 'd8.bat') @('--lib',$androidJar,'--min-api','26','--output',(Join-Path $buildRoot 'dex'),(Join-Path $buildRoot 'classes.jar'))
Checked (Join-Path $JavaRoot 'bin\jar.exe') @('uf',(Join-Path $buildRoot 'unsigned.apk'),'-C',(Join-Path $buildRoot 'dex'),'classes.dex')
Checked (Join-Path $toolsRoot 'zipalign.exe') @('-f','4',(Join-Path $buildRoot 'unsigned.apk'),(Join-Path $buildRoot 'aligned.apk'))
$keyFile=Join-Path $buildRoot 'local-debug.keystore'
if(!(Test-Path -LiteralPath $keyFile)){
 Checked (Join-Path $JavaRoot 'bin\keytool.exe') @('-genkeypair','-keystore',$keyFile,'-storepass','android','-alias','androiddebugkey','-keypass','android','-dname','CN=KStock Local Development','-keyalg','RSA','-keysize','2048','-validity','3650')
}
$downloadRoot=Join-Path $projectRoot 'public\downloads'
New-Item -ItemType Directory -Force -Path $downloadRoot | Out-Null
$apk=Join-Path $downloadRoot ('k-stock-ai-'+$packageMetadata.version+'.apk')
Checked (Join-Path $toolsRoot 'apksigner.bat') @('sign','--ks',$keyFile,'--ks-key-alias','androiddebugkey','--ks-pass','pass:android','--key-pass','pass:android','--out',$apk,(Join-Path $buildRoot 'aligned.apk'))
Checked (Join-Path $toolsRoot 'apksigner.bat') @('verify','--verbose',$apk)
Write-Output "APK: $apk"
