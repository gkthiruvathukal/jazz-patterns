#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
INPUT_DIR="${1:-$ROOT_DIR/build}"
OUTPUT_DIR="${2:-$INPUT_DIR}"
SOUNDFONT_PATH="${SALAMANDER_SF2:-}"

if [[ -z "$SOUNDFONT_PATH" ]]; then
  SOUNDFONT_PATH="$("$ROOT_DIR/src/jazz_scales/fetch_salamander_soundfont.sh")"
fi

mkdir -p "$OUTPUT_DIR"
shopt -s nullglob

midi_files=("$INPUT_DIR"/jazz_scales_abjad_*.midi "$INPUT_DIR"/jazz_scales_abjad_*.mid)
if [[ ${#midi_files[@]} -eq 0 ]]; then
  echo "No MIDI files found in $INPUT_DIR" >&2
  exit 1
fi

for midi_file in "${midi_files[@]}"; do
  base_name="$(basename "${midi_file%.*}")"
  wav_file="$OUTPUT_DIR/$base_name.wav"
  fluidsynth -ni -F "$wav_file" -T wav -r 44100 "$SOUNDFONT_PATH" "$midi_file" >/dev/null
  echo "Wrote $wav_file"
done
