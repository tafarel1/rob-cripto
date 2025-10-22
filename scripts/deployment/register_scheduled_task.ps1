# Wrapper de compatibilidade: register_scheduled_task
param([Parameter(ValueFromRemainingArguments = $true)][object[]] $args)
$target = Join-Path $PSScriptRoot "..\register_scheduled_task.ps1"
& $target @args