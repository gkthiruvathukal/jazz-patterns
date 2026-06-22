#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMON_DIR="$(cd "$ROOT_DIR/../../common" && pwd)"
VENV_DIR="$ROOT_DIR/.venv"
PYTHON_BIN="${PYTHON_BIN:-python3}"
BUILD_DIR="${BUILD_DIR:-$ROOT_DIR/build}"

if [[ ! -d "$VENV_DIR" ]]; then
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"

python -m pip install --upgrade pip
python -m pip install -e "$COMMON_DIR"
python -m pip install -e "$ROOT_DIR"

rm -rf "$BUILD_DIR"

python -m jazz_blues.blues_take_1 \
  --keys Bb F C \
  --output-dir "$BUILD_DIR" \
  --pdf --midi --bpm 112

echo "Build complete in $BUILD_DIR"
