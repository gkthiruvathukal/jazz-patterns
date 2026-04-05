#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CACHE_DIR="${SALAMANDER_CACHE_DIR:-$ROOT_DIR/.cache/soundfonts}"
ARCHIVE_NAME="SalamanderGrandPiano-SF2-V3+20200602.tar.xz"
SOUNDFONT_NAME="SalamanderGrandPiano-SF2-V3+20200602.sf2"
SOUNDFONT_URL="https://freepats.zenvoid.org/Piano/SalamanderGrandPiano/SalamanderGrandPiano-SF2-V3+20200602.tar.xz"

mkdir -p "$CACHE_DIR"

if [[ -f "$CACHE_DIR/$SOUNDFONT_NAME" ]]; then
  printf '%s\n' "$CACHE_DIR/$SOUNDFONT_NAME"
  exit 0
fi

tmp_archive="$CACHE_DIR/$ARCHIVE_NAME.tmp"
curl -L --fail --retry 3 --output "$tmp_archive" "$SOUNDFONT_URL"
mv "$tmp_archive" "$CACHE_DIR/$ARCHIVE_NAME"
tar -xJf "$CACHE_DIR/$ARCHIVE_NAME" -C "$CACHE_DIR"

if [[ ! -f "$CACHE_DIR/$SOUNDFONT_NAME" ]]; then
  found_sf2="$(find "$CACHE_DIR" -type f -name '*.sf2' | head -n 1)"
  if [[ -z "$found_sf2" ]]; then
    echo "Failed to locate extracted Salamander SF2." >&2
    exit 1
  fi
  mv "$found_sf2" "$CACHE_DIR/$SOUNDFONT_NAME"
fi

printf '%s\n' "$CACHE_DIR/$SOUNDFONT_NAME"
