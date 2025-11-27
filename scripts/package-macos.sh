#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKEND_DIR="$PROJECT_ROOT/backend"
VENV_DIR="$BACKEND_DIR/.venv-tauri"

usage() {
  cat <<'EOF'
Usage: package-macos.sh [--fresh] [--debug]

Options:
  --fresh   重建后端虚拟环境 (.venv-tauri) 并清理旧的打包缓存
  --debug   以 debug 方式构建桌面应用 (默认 release)

示例：
  ./scripts/package-macos.sh            # 生成 release 包
  ./scripts/package-macos.sh --fresh    # 清空后端环境后再打包
EOF
}

FRESH=0
BUILD_MODE="release"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --fresh)
      FRESH=1
      shift
      ;;
    --debug)
      BUILD_MODE="debug"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "未知参数: $1" >&2
      usage
      exit 1
      ;;
  esac
done

log() {
  printf '\033[1;32m[Weaviate-King]\033[0m %s\n' "$1"
}

log "项目根目录: $PROJECT_ROOT"

if [[ $FRESH -eq 1 ]]; then
  log "清理旧的虚拟环境与构建缓存"
  rm -rf "$VENV_DIR"
  rm -rf "$PROJECT_ROOT/src-tauri/target"
  rm -rf "$PROJECT_ROOT/frontend/dist"
fi

log "安装根目录依赖 (包括 tauri CLI)"
cd "$PROJECT_ROOT"
npm install

log "确保后端启动脚本具有可执行权限"
chmod +x "$BACKEND_DIR/start-backend.sh"

log "安装前端依赖"
cd "$FRONTEND_DIR"
npm ci

log "构建前端静态资源"
npm run build

if [[ ! -d "$VENV_DIR" ]]; then
  log "创建后端虚拟环境: $VENV_DIR"
  python3 -m venv --copies "$VENV_DIR"
fi

log "升级 pip 并安装后端依赖"
"$VENV_DIR/bin/python" -m pip install --upgrade pip
"$VENV_DIR/bin/pip" install -r "$BACKEND_DIR/requirements.txt"

log "写入后端依赖锁文件"
"$VENV_DIR/bin/pip" freeze > "$BACKEND_DIR/requirements.lock"

log "以 $BUILD_MODE 模式执行 Tauri 构建"
cd "$PROJECT_ROOT"
if [[ "$BUILD_MODE" == "debug" ]]; then
  npx tauri build --debug
else
  npx tauri build
fi

log "打包完成，产物位于 src-tauri/target/{debug,release}"

