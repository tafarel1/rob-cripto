# Wrapper de compatibilidade: deploy-env
param([Parameter(ValueFromRemainingArguments = $true)][object[]] $args)
$target = Join-Path $PSScriptRoot "..\deploy-env.ps1"
& $target @args