# Wrapper de compatibilidade: deploy-prod
# Encaminha para o script original mantendo o novo layout
param([Parameter(ValueFromRemainingArguments = $true)][object[]] $args)
$target = Join-Path $PSScriptRoot "..\deploy-prod.ps1"
& $target @args