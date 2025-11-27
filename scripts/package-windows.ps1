Param(
  [switch]$Fresh,
  [ValidateSet("release", "debug")]
  [string]$Mode = "release"
)

$ErrorActionPreference = "Stop"

function Write-Step($Message) {
  Write-Host "[Weaviate-King] $Message" -ForegroundColor Green
}

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$frontendDir = Join-Path $projectRoot "frontend"
$backendDir = Join-Path $projectRoot "backend"
$venvDir = Join-Path $backendDir ".venv-tauri"
$pythonExe = Join-Path $venvDir "Scripts\python.exe"

Write-Step "项目根目录: $projectRoot"

if ($Fresh -and (Test-Path $venvDir)) {
  Write-Step "清理旧的虚拟环境与构建缓存"
  Remove-Item -Recurse -Force $venvDir
  $targetDir = Join-Path $projectRoot "src-tauri\target"
  if (Test-Path $targetDir) {
    Remove-Item -Recurse -Force $targetDir
  }
  $distDir = Join-Path $frontendDir "dist"
  if (Test-Path $distDir) {
    Remove-Item -Recurse -Force $distDir
  }
}

Write-Step "安装根目录依赖 (含 Tauri CLI)"
Set-Location $projectRoot
npm install

Write-Step "安装前端依赖并构建"
Set-Location $frontendDir
npm ci
npm run build

if (-not (Test-Path $venvDir)) {
  Write-Step "创建后端虚拟环境: $venvDir"
  python -m venv --copies $venvDir | Out-Null
}

Write-Step "升级 pip 并安装后端依赖"
& $pythonExe -m pip install --upgrade pip
& $pythonExe -m pip install -r (Join-Path $backendDir "requirements.txt")
& $pythonExe -m pip freeze > (Join-Path $backendDir "requirements.lock")

Write-Step "执行 Tauri 构建 ($Mode)"
Set-Location $projectRoot
if ($Mode -eq "debug") {
  npx tauri build --debug
} else {
  npx tauri build
}

Write-Step "打包完成，产物位于 src-tauri\\target\\$Mode"

