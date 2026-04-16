param(
  [switch]$HookMode
)

$ErrorActionPreference = "Stop"

function Write-Section {
  param([string]$Title)
  Write-Host ""
  Write-Host "=== $Title ===" -ForegroundColor Cyan
}

function Get-GitExe {
  $cmd = Get-Command git -ErrorAction SilentlyContinue
  if ($cmd) {
    return $cmd.Source
  }

  $fallback = "C:\Program Files\Git\cmd\git.exe"
  if (Test-Path $fallback) {
    return $fallback
  }

  throw "Git nao encontrado no PATH nem no caminho padrao."
}

function Invoke-Git {
  param(
    [string[]]$Arguments
  )

  $git = Get-GitExe
  & $git @Arguments
}

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$branch = (Invoke-Git @("branch", "--show-current")).Trim()
$statusLines = @(Invoke-Git @("status", "--short"))
$stagedNames = @(Invoke-Git @("diff", "--cached", "--name-only"))

$sensitivePatterns = @(
  '^backend/\.env$',
  '^backend/\.env\..+$',
  '^frontend/uploads/(?!\.gitkeep$|mensagens/\.gitkeep$|ocorrencias/\.gitkeep$|perfis/\.gitkeep$).+',
  '^tmp-edge-pdf/',
  '^backend/tmp-.*\.mjs$'
)

$blockedFiles = @()
foreach ($name in $stagedNames) {
  foreach ($pattern in $sensitivePatterns) {
    if ($name -match $pattern) {
      $blockedFiles += $name
      break
    }
  }
}

$codeTouched = $stagedNames | Where-Object {
  $_ -match '^(backend|frontend)/' -and $_ -notmatch '^frontend/uploads/'
}

$docsTouched = $stagedNames | Where-Object { $_ -match '^docs/' }

$warnings = @()
if ($branch -eq "main" -and $stagedNames.Count -gt 0) {
  $warnings += "Voce esta preparando commit direto na branch main."
}

if ($codeTouched.Count -gt 0 -and $docsTouched.Count -eq 0) {
  $warnings += "Ha mudancas em codigo sem atualizacao em docs/. Verifique se a documentacao precisa acompanhar."
}

if (-not $HookMode) {
  Write-Section "Contexto Git"
  Write-Host ("Branch atual : {0}" -f $branch)
  Write-Host ("Arquivos staged : {0}" -f $stagedNames.Count)
  Write-Host ("Working tree limpa : {0}" -f ($(if ($statusLines.Count -eq 0) { "sim" } else { "nao" })))

  Write-Section "Arquivos staged"
  if ($stagedNames.Count -eq 0) {
    Write-Host "Nenhum arquivo staged no momento." -ForegroundColor Yellow
  } else {
    $stagedNames | ForEach-Object { Write-Host ("- {0}" -f $_) }
  }

  Write-Section "Alertas"
  if ($warnings.Count -eq 0) {
    Write-Host "Nenhum alerta relevante." -ForegroundColor Green
  } else {
    $warnings | ForEach-Object { Write-Host ("- {0}" -f $_) -ForegroundColor Yellow }
  }

  Write-Section "Arquivos bloqueados"
  if ($blockedFiles.Count -eq 0) {
    Write-Host "Nenhum arquivo sensivel staged." -ForegroundColor Green
  } else {
    $blockedFiles | ForEach-Object { Write-Host ("- {0}" -f $_) -ForegroundColor Red }
  }

  Write-Section "Recomendacao"
  if ($blockedFiles.Count -gt 0) {
    Write-Host "Revise e remova os arquivos sensiveis antes do commit." -ForegroundColor Red
    exit 1
  }

  if ($stagedNames.Count -eq 0) {
    Write-Host "Tudo certo. Quando houver arquivos staged, rode este checklist antes do commit." -ForegroundColor Green
    exit 0
  }

  Write-Host "Checklist concluido. Se a fase estiver pronta, o commit pode seguir." -ForegroundColor Green
  exit 0
}

if ($blockedFiles.Count -gt 0) {
  Write-Host ""
  Write-Host "Commit bloqueado por arquivos sensiveis staged:" -ForegroundColor Red
  $blockedFiles | ForEach-Object { Write-Host ("- {0}" -f $_) -ForegroundColor Red }
  Write-Host ""
  Write-Host "Remova esses arquivos do stage antes de commitar." -ForegroundColor Yellow
  exit 1
}

if ($warnings.Count -gt 0) {
  Write-Host ""
  Write-Host "Avisos do pre-commit:" -ForegroundColor Yellow
  $warnings | ForEach-Object { Write-Host ("- {0}" -f $_) -ForegroundColor Yellow }
}

exit 0
