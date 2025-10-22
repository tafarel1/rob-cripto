# Wrapper de compatibilidade: deploy-dev
param([Parameter(ValueFromRemainingArguments = $true)][object[]] $args)
$target = Join-Path $PSScriptRoot "..\deploy-dev.ps1"
& $target @args