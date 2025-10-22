# Wrapper de compatibilidade: unregister_scheduled_task
param([Parameter(ValueFromRemainingArguments = $true)][object[]] $args)
$target = Join-Path $PSScriptRoot "..\unregister_scheduled_task.ps1"
& $target @args