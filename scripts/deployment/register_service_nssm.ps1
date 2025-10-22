# Wrapper de compatibilidade: register_service_nssm
param([Parameter(ValueFromRemainingArguments = $true)][object[]] $args)
$target = Join-Path $PSScriptRoot "..\register_service_nssm.ps1"
& $target @args