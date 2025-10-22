# Wrapper de compatibilidade: deploy-status
param([Parameter(ValueFromRemainingArguments = $true)][object[]] $args)
$target = Join-Path $PSScriptRoot "..\deploy-status.ps1"
& $target @args