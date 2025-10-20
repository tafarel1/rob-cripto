[CmdletBinding()]
param(
  [string]$RepoUrl = 'https://github.com/tafarel1/rob-cripto.git',
  [string]$Branch = 'main',
  [switch]$Unicode
)

# ===== Interface =====
$Host.UI.RawUI.WindowTitle = "Deploy Automatico - Rob Cripto"
Set-Location -Path $PSScriptRoot

function Sep { Write-Host ('=' * 70) -ForegroundColor DarkGray }
function Info($m) { Write-Host "[INFO] $m" -ForegroundColor Cyan }
function Ok($m)   { Write-Host "[OK] $m" -ForegroundColor Green }
function Warn($m) { Write-Host "[ATENCAO] $m" -ForegroundColor Yellow }
function Err($m)  { Write-Host "[ERRO] $m" -ForegroundColor Red }
function Fix($m)  { Write-Host "[CORRECAO] $m" -ForegroundColor Magenta }

# ===== Encoding =====
$oldEnc = [Console]::OutputEncoding
if ($Unicode) {
  try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    Info "Unicode habilitado (OutputEncoding UTF-8)."
  } catch {
    Warn "Nao foi possivel habilitar UTF-8. Usando ASCII."
  }
} else {
  Info "Modo ASCII seguro habilitado."
}

function Run($cmd, $args) {
  try {
    $p = Start-Process -FilePath $cmd -ArgumentList $args -NoNewWindow -PassThru -Wait -RedirectStandardOutput "$env:TEMP\_out.txt" -RedirectStandardError "$env:TEMP\_err.txt"
    $out = Get-Content "$env:TEMP\_out.txt" -ErrorAction SilentlyContinue
    $err = Get-Content "$env:TEMP\_err.txt" -ErrorAction SilentlyContinue
    Remove-Item "$env:TEMP\_out.txt","$env:TEMP\_err.txt" -ErrorAction SilentlyContinue
    return @{Code=$p.ExitCode;Out=($out -join "`n");Err=($err -join "`n")}
  } catch {
    return @{Code=1;Out='';Err=$_.Exception.Message}
  }
}

Sep; Info "Iniciando deploy automatico..."; Sep
$Final = $null

# ===== Pre-checagens =====
$r = Run 'git' '--version'
if ($r.Code -ne 0) { Err "Git nao esta instalado ou nao esta no PATH."; Fix "Baixe e instale o Git: https://git-scm.com/download/win"; $Final='CRITICAL_ERROR'; goto end }

$r = Run 'git' 'rev-parse --is-inside-work-tree'
if ($r.Code -ne 0) { Err "Este diretorio nao e um repositorio Git."; Fix "Como corrigir:"; Fix "1) git init"; Fix "2) git remote add origin $RepoUrl"; Fix "3) git branch -M $Branch"; $Final='CRITICAL_ERROR'; goto end }

# ===== Remoto e branch =====
$r = Run 'git' 'remote get-url origin'
if ($r.Code -ne 0 -or -not $r.Out) { Run 'git' "remote add origin $RepoUrl" | Out-Null; Info "Remoto origin configurado para $RepoUrl" } else { $RepoUrl = $r.Out.Trim() }

$r = Run 'git' 'rev-parse --abbrev-ref HEAD'
$cur = ($r.Out).Trim()
if ($cur -ne $Branch) {
  $exists = (Run 'git' "show-ref --verify --quiet refs/heads/$Branch").Code -eq 0
  if ($exists) { Run 'git' "checkout $Branch" | Out-Null }
  else { Run 'git' "branch -M $Branch" | Out-Null; Info "Branch principal ajustado para $Branch" }
}

$r = Run 'git' 'rev-parse --abbrev-ref --symbolic-full-name @{u}'
if ($r.Code -ne 0) { Run 'git' "branch --set-upstream-to=origin/$Branch $Branch" | Out-Null }

# ===== Staging e commit =====
$r = Run 'git' 'add -A'
if ($r.Code -ne 0) { Err "Falha ao preparar staging."; Fix "Verifique permissoes de arquivos e tente novamente."; $Final='FIXABLE_FAILURE'; goto end }

$r = Run 'git' 'diff --cached --name-only'
$has = ($r.Out -and $r.Out.Trim().Length -gt 0)
if (-not $has) { Warn "Nenhuma alteracao detectada."; $Final='NO_CHANGES' }
else {
  $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  $c = Run 'git' "commit -m \"Deploy automatico: $stamp\""
  if ($c.Code -ne 0) {
    if ($c.Err -match 'Please tell me who you are') {
      Err "Identidade Git nao configurada."
      Fix "Como corrigir:"
      Fix "git config --global user.name \"Seu Nome\""
      Fix "git config --global user.email \"seu@email\""
    } else { Err "Falha ao criar commit." }
    $Final='FIXABLE_FAILURE'
  } else { Ok "Commit criado com sucesso." }
}

# ===== Push e tratamento =====
$p = Run 'git' 'push'
if ($p.Code -ne 0) {
  Warn "Push falhou. Tentando sincronizar (pull --rebase)..."
  $pr = Run 'git' 'pull --rebase'
  if ($pr.Code -ne 0 -and ($pr.Out + $pr.Err) -match 'CONFLICT') {
    Err "Conflitos detectados durante rebase."
    Fix "Passo a passo para resolver:"
    Fix "1) git status"
    Fix "2) Edite arquivos marcados como CONFLICT"
    Fix "3) git add <arquivos resolvidos>"
    Fix "4) git rebase --continue"
    Fix "Se necessario: git rebase --abort"
    $Final='FIXABLE_FAILURE'; goto end
  }
  $p2 = Run 'git' 'push'
  if ($p2.Code -ne 0) {
    $msg = $p2.Err + "`n" + $p2.Out
    if ($msg -match 'Authentication failed|Permission denied') { Err "Falha de autenticacao com GitHub."; Fix "Verifique e corrija:"; Fix "1) Remoto HTTPS: git remote set-url origin $RepoUrl"; Fix "2) Credential Manager: git config --global credential.helper manager-core"; Fix "3) Faca push para abrir login no navegador"; $Final='FIXABLE_FAILURE'; goto end }
    if ($msg -match 'Failed to connect|Could not resolve host|timed out') { Err "Problema de rede ao acessar GitHub."; Fix "Verifique conexao e proxy:"; Fix "ping github.com"; Fix "git config --global --get http.proxy"; Fix "Desativar proxy: git config --global --unset http.proxy"; $Final='FIXABLE_FAILURE'; goto end }
    if ($msg -match 'Repository not found|remote repository') { Err "Repositorio remoto nao encontrado ou sem permissao."; Fix "Confira URL e acesso: $RepoUrl"; $Final='CRITICAL_ERROR'; goto end }
    Err "Push ainda falhou. Verifique credenciais/permissoes."; $Final='FIXABLE_FAILURE'; goto end
  }
}

if (-not $Final) { $Final = 'SUCCESS' }

:end
Sep
switch ($Final) {
  'SUCCESS' { Ok  "DEPLOY CONCLUIDO COM SUCESSO!"; Info "STATUS: Codigo sincronizado com o GitHub"; Info "ACESSE: $RepoUrl" }
  'NO_CHANGES' { Warn "SEM ALTERACOES - nada para commitar/push"; Fix  "Edite arquivos e execute novamente para criar novo commit." }
  'FIXABLE_FAILURE' { Warn "FALHA COM CORRECAO - veja instrucoes acima"; Fix  "Siga os passos indicados e rode novamente." }
  'CRITICAL_ERROR' { Err "ERRO CRITICO - problemas de configuracao"; Fix "Resolva conforme instrucoes e tente novamente." }
}
Sep
Write-Host ''; Read-Host '[Pressione Enter para continuar...]'

# Restaurar encoding original se alterado
if ($Unicode) { [Console]::OutputEncoding = $oldEnc }

exit 0