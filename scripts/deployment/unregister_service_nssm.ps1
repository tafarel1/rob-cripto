# Wrapper de compatibilidade: unregister_service_nssm
param([Parameter(ValueFromRemainingArguments = $true)][object[]] $args)
$target = Join-Path $PSScriptRoot "..\unregister_service_nssm.ps1"
& $target @args