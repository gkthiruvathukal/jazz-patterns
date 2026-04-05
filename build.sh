#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$ROOT_DIR/.venv"
PYTHON_BIN="${PYTHON_BIN:-python3}"
BUILD_DIR="${BUILD_DIR:-$ROOT_DIR/build}"

if [[ ! -d "$VENV_DIR" ]]; then
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"

python -m pip install --upgrade pip
python -m pip install -r "$ROOT_DIR/requirements.txt"
python -m pip install -e "$ROOT_DIR"

rm -rf "$BUILD_DIR"

python -m jazz_scales.generator \
  --output-dir "$BUILD_DIR" \
  --step 5 --count 12 --start C --prefer auto --anchor nearest --mode major \
  --pdf --midi --bpm 96

bash "$ROOT_DIR/src/jazz_scales/render_wavs.sh" "$BUILD_DIR" "$BUILD_DIR"

MPLCONFIGDIR="$ROOT_DIR/.matplotlib" MPLBACKEND=Agg \
  python -m jazz_scales.cover --output-dir "$BUILD_DIR"

python -m jazz_scales.book --output-dir "$BUILD_DIR"

echo "Build complete in $BUILD_DIR"
