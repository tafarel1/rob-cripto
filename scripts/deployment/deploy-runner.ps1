# Wrapper de compatibilidade: deploy-runner
param([Parameter(ValueFromRemainingArguments = $true)][object[]] $args)
$target = Join-Path $PSScriptRoot "..\deploy-runner.ps1"
& $target @args