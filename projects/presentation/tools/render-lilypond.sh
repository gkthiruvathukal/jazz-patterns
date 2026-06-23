#!/usr/bin/env bash
# Render each LilyPond snippet to a tightly-cropped SVG in assets/.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p assets
for f in tools/snippets/*.ly; do
  base="$(basename "$f" .ly)"
  echo "lilypond → $base"
  lilypond -dcrop -dbackend=svg -o "assets/$base" "$f" >/dev/null 2>&1
  # -dcrop emits assets/<base>.cropped.svg; normalize the name to lily-<base>.svg
  if [ -f "assets/$base.cropped.svg" ]; then
    mv -f "assets/$base.cropped.svg" "assets/lily-$base.svg"
  fi
  rm -f "assets/$base.svg"
done
echo "LilyPond SVGs:"; ls -1 assets/lily-*.svg 2>/dev/null || echo "  (none)"
