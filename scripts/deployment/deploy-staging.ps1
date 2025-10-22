# Wrapper de compatibilidade: deploy-staging
param([Parameter(ValueFromRemainingArguments = $true)][object[]] $args)
$target = Join-Path $PSScriptRoot "..\deploy-staging.ps1"
& $target @args