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
function Ok($m)   { Write-Host "[SUCESSO] $m" -ForegroundColor Green }
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

# Execução robusta de nativos com array de argumentos
function RunArgs($cmd, $argsArray) {
  try {
    $out = & $cmd @argsArray 2>&1
    $code = $LASTEXITCODE
    return @{Code=$code;Out=($out -join "`n");Err=''}
  } catch {
    return @{Code=1;Out='';Err=$_.Exception.Message}
  }
}

function Finish {
  Sep
  switch ($Final) {
    'SUCCESS' { Ok  "DEPLOY CONCLUIDO COM SUCESSO"; Info "STATUS: Codigo sincronizado com o GitHub"; Info "ACESSE: $RepoUrl" }
    'NO_CHANGES' { Warn "SEM ALTERACOES - nada para commitar/push"; Fix  "Edite arquivos e execute novamente para criar novo commit." }
    'FIXABLE_FAILURE' { Warn "FALHA COM CORRECAO - veja instrucoes acima"; Fix  "Siga os passos indicados e rode novamente." }
    'CRITICAL_ERROR' { Err "ERRO CRITICO - problemas de configuracao"; Fix "Resolva conforme instrucoes e tente novamente." }
  }
  Sep
  Write-Host ''; Read-Host '[Pressione Enter para continuar...]'
  if ($Unicode) { [Console]::OutputEncoding = $oldEnc }
}

Sep; Info "Iniciando deploy automatico..."; Sep
$Final = $null

# ===== Detectar Git corretamente =====
$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitCmd) { Err "Git nao esta instalado ou nao esta no PATH."; Fix "Baixe e instale o Git: https://git-scm.com/download/win"; $Final='CRITICAL_ERROR'; Finish; return }
$git = $gitCmd.Source

# ===== Pre-checagens =====
$r = RunArgs $git @('--version')
if ($r.Code -ne 0) { Err "Falha ao executar Git."; Fix "Verifique se o Git foi instalado corretamente."; $Final='CRITICAL_ERROR'; Finish; return }

$r = RunArgs $git @('rev-parse','--is-inside-work-tree')
if ($r.Code -ne 0) { Err "Este diretorio nao e um repositorio Git."; Fix "Como corrigir:"; Fix "1) git init"; Fix "2) git remote add origin $RepoUrl"; Fix "3) git branch -M $Branch"; $Final='CRITICAL_ERROR'; Finish; return }

# ===== Remoto e branch =====
$r = RunArgs $git @('remote','get-url','origin')
if ($r.Code -ne 0 -or -not $r.Out) { RunArgs $git @('remote','add','origin',$RepoUrl) | Out-Null; Info "Remoto origin configurado para $RepoUrl" } else { $RepoUrl = $r.Out.Trim() }

$r = RunArgs $git @('rev-parse','--abbrev-ref','HEAD')
$cur = ($r.Out).Trim()
if ($cur -ne $Branch) {
  $exists = (RunArgs $git @('show-ref','--verify','--quiet',"refs/heads/$Branch")).Code -eq 0
  if ($exists) { RunArgs $git @('checkout',$Branch) | Out-Null }
  else { RunArgs $git @('branch','-M',$Branch) | Out-Null; Info "Branch principal ajustado para $Branch" }
}

$r = RunArgs $git @('rev-parse','--abbrev-ref','--symbolic-full-name','@{u}')
if ($r.Code -ne 0) { $up = "origin/$Branch"; RunArgs $git @('branch',"--set-upstream-to=$up",$Branch) | Out-Null }

# ===== Staging e commit =====
$r = RunArgs $git @('add','-A')
if ($r.Code -ne 0) {
  Warn "Falha em git add -A. Verificando 'NUL' no index..."
  $check = RunArgs $git @('ls-files','--error-unmatch','NUL')
  if ($check.Code -eq 0) {
    Info "Removendo 'NUL' do index automaticamente..."
    RunArgs $git @('rm','-f','--cached','--ignore-unmatch','NUL') | Out-Null
    $r2 = RunArgs $git @('add','-A')
    if ($r2.Code -ne 0) { Err "Staging ainda falhou apos remover 'NUL'."; Fix "Feche programas que bloqueiam arquivos e rode como Administrador."; $Final='FIXABLE_FAILURE'; Finish; return }
    else { Ok "Staging recriado apos remover 'NUL'." }
  } else {
    Err "Falha ao preparar staging."; Fix "Verifique permissoes de arquivos e tente novamente."; $Final='FIXABLE_FAILURE'; Finish; return
  }
}

$r = RunArgs $git @('diff','--cached','--name-only')
$has = ($r.Out -and $r.Out.Trim().Length -gt 0)
if (-not $has) { Warn "Nenhuma alteracao detectada."; $Final='NO_CHANGES' }
else {
  $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  $c = RunArgs $git @('commit','-m',"Deploy automatico: $stamp")
  if ($c.Code -ne 0) {
    if ($c.Out -match 'Please tell me who you are') {
      Err "Identidade Git nao configurada."
      Fix "Como corrigir:"
      Fix "git config --global user.name \"Seu Nome\""
      Fix "git config --global user.email \"seu@email\""
    } else { Err "Falha ao criar commit." }
    $Final='FIXABLE_FAILURE'
  } else { Ok "Commit criado com sucesso." }
}

# ===== Push e tratamento =====
$p = RunArgs $git @('push')
if ($p.Code -ne 0) {
  Warn "Push falhou. Tentando sincronizar (pull --rebase)..."
  $pr = RunArgs $git @('pull','--rebase')
  if ($pr.Code -ne 0 -and (($pr.Out) -match 'CONFLICT')) {
    Err "Conflitos detectados durante rebase."
    Fix "Passo a passo para resolver:"
    Fix "1) git status"
    Fix "2) Edite arquivos marcados como CONFLICT"
    Fix "3) git add <arquivos resolvidos>"
    Fix "4) git rebase --continue"
    Fix "Se necessario: git rebase --abort"
    $Final='FIXABLE_FAILURE'; Finish; return
  }
  $p2 = RunArgs $git @('push')
  if ($p2.Code -ne 0) {
    $msg = $p2.Out
    if ($msg -match 'Authentication failed|Permission denied') { Err "Falha de autenticacao com GitHub."; Fix "Verifique e corrija:"; Fix "1) Remoto HTTPS: git remote set-url origin $RepoUrl"; Fix "2) Credential Manager: git config --global credential.helper manager-core"; Fix "3) Faca push para abrir login no navegador"; $Final='FIXABLE_FAILURE'; Finish; return }
    if ($msg -match 'Failed to connect|Could not resolve host|timed out') { Err "Problema de rede ao acessar GitHub."; Fix "Verifique conexao e proxy:"; Fix "ping github.com"; Fix "git config --global --get http.proxy"; Fix "Desativar proxy: git config --global --unset http.proxy"; $Final='FIXABLE_FAILURE'; Finish; return }
    if ($msg -match 'Repository not found|remote repository') { Err "Repositorio remoto nao encontrado ou sem permissao."; Fix "Confira URL e acesso: $RepoUrl"; $Final='CRITICAL_ERROR'; Finish; return }
    Err "Push ainda falhou. Verifique credenciais/permissoes."; $Final='FIXABLE_FAILURE'; Finish; return
  }
}

if (-not $Final) { $Final = 'SUCCESS' }

Finish
exit 0