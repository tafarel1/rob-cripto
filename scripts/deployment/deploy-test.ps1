# Wrapper de compatibilidade: deploy-test
param([Parameter(ValueFromRemainingArguments = $true)][object[]] $args)
$target = Join-Path $PSScriptRoot "..\deploy-test.ps1"
& $target @args