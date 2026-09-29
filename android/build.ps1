param([string]$SdkRoot=$env:ANDROID_SDK_ROOT,[string]$JavaRoot=$env:JAVA_HOME)
$ErrorActionPreference='Stop'
if($SdkRoot){$env:ANDROID_SDK_ROOT=$SdkRoot}
if($JavaRoot){$env:JAVA_HOME=$JavaRoot}
node (Join-Path $PSScriptRoot 'build.mjs')
if($LASTEXITCODE -ne 0){throw 'Android build failed'}
