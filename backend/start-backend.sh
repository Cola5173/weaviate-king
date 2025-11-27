#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -n "${WEAVIATE_KING_PYTHON:-}" ]]; then
  PYTHON_BIN="$WEAVIATE_KING_PYTHON"
else
  if [[ -d "$SCRIPT_DIR/.venv-tauri" ]]; then
    PYTHON_BIN="$SCRIPT_DIR/.venv-tauri/bin/python"
  elif [[ -d "$SCRIPT_DIR/.venv" ]]; then
    PYTHON_BIN="$SCRIPT_DIR/.venv/bin/python"
  else
    echo "[start-backend] no virtual env found (.venv-tauri or .venv)" >&2
    exit 1
  fi
fi

if [[ ! -x "$PYTHON_BIN" ]]; then
  echo "[start-backend] python executable not found: $PYTHON_BIN" >&2
  exit 1
fi

HOST="${WEAVIATE_KING_HOST:-127.0.0.1}"
PORT="${WEAVIATE_KING_PORT:-5175}"

export LOG_DIR="${LOG_DIR:-$SCRIPT_DIR/../logs}"
export DATA_DIR="${DATA_DIR:-$SCRIPT_DIR/../data}"

mkdir -p "$LOG_DIR" "$DATA_DIR"

exec "$PYTHON_BIN" -m uvicorn api.app:app --host "$HOST" --port "$PORT" --log-level info

