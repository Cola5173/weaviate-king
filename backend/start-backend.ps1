$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not [string]::IsNullOrWhiteSpace($env:WEAVIATE_KING_PYTHON)) {
  $PythonExe = $env:WEAVIATE_KING_PYTHON
} else {
  $venvTauri = Join-Path $ScriptDir '.venv-tauri'
  $venvDev = Join-Path $ScriptDir '.venv'

  if (Test-Path $venvTauri) {
    $PythonExe = Join-Path $venvTauri 'Scripts\python.exe'
  } elseif (Test-Path $venvDev) {
    $PythonExe = Join-Path $venvDev 'Scripts\python.exe'
  } else {
    Write-Error "[start-backend] no virtual env found (.venv-tauri or .venv)"
  }
}

if (-not (Test-Path $PythonExe)) {
  Write-Error "[start-backend] python executable not found: $PythonExe"
}

$HostAddr = $env:WEAVIATE_KING_HOST
if ([string]::IsNullOrWhiteSpace($HostAddr)) {
  $HostAddr = '127.0.0.1'
}

$Port = $env:WEAVIATE_KING_PORT
if ([string]::IsNullOrWhiteSpace($Port)) {
  $Port = '5175'
}

$LogDir = $env:LOG_DIR
if ([string]::IsNullOrWhiteSpace($LogDir)) {
  $LogDir = Join-Path $ScriptDir '..\logs'
}

$DataDir = $env:DATA_DIR
if ([string]::IsNullOrWhiteSpace($DataDir)) {
  $DataDir = Join-Path $ScriptDir '..\data'
}

New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
New-Item -ItemType Directory -Path $DataDir -Force | Out-Null

$env:LOG_DIR = $LogDir
$env:DATA_DIR = $DataDir

& $PythonExe -m uvicorn api.app:app --host $HostAddr --port $Port --log-level info

