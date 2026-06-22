"""Export the resolved scale charts (every key x scale) as JSON for the web app.

This is the data contract between the Python music model (the single source of
truth) and the interactive web app: it emits fully-resolved note data so the
TypeScript side renders and plays without duplicating any music theory.
"""

import argparse
import json
from pathlib import Path

from jazz_common.pitch import (
    FLAT_NAMES,
    NAME_TO_PC,
    SHARP_NAMES,
    auto_prefer_for_pc,
    pc_to_name,
)

from .generator import (
    SCALES,
    pc_to_register_offset,
    scale_slug,
    transpose_chord_text,
    transpose_scale_notes,
)

# abjad NumberedPitch 0 == middle C == MIDI 60.
MIDDLE_C_MIDI = 60


def note_from_midi(midi: int, prefer: str) -> dict:
    pc = midi % 12
    flat_spelled = FLAT_NAMES[pc]
    sharp_spelled = SHARP_NAMES[pc]
    spelled = flat_spelled if prefer == "flats" else sharp_spelled
    return {
        "name": spelled[0],
        "accidental": spelled[1:],  # "", "#", or "b"
        "octave": midi // 12 - 1,   # scientific pitch notation
        "midi": midi,
        "flat_name": flat_spelled[0],
        "flat_accidental": flat_spelled[1:],
        "sharp_name": sharp_spelled[0],
        "sharp_accidental": sharp_spelled[1:],
    }


def build_data(start: str, step: int, count: int, prefer_arg: str, anchor: str) -> dict:
    keys = []
    charts = []
    pc = NAME_TO_PC[start]
    for _ in range(count):
        prefer = auto_prefer_for_pc(pc) if prefer_arg == "auto" else prefer_arg
        key_name = pc_to_name(pc, prefer)
        keys.append(key_name)
        semitone_offset = pc_to_register_offset(pc, anchor)
        for scale_name, notes_spec, intervals, chord_text_c in SCALES:
            pitches = transpose_scale_notes(notes_spec, semitone_offset)
            charts.append({
                "key": key_name,
                "scale": scale_name,
                "chord": transpose_chord_text(chord_text_c, key_name),
                "intervals": list(intervals),
                "notes": [note_from_midi(p.number() + MIDDLE_C_MIDI, prefer) for p in pitches],
            })
        pc = (pc + step) % 12

    scales_meta = [{"name": name, "slug": scale_slug(name)} for name, *_ in SCALES]
    return {"keys": keys, "scales": scales_meta, "charts": charts}


def main():
    ap = argparse.ArgumentParser(description="Export resolved scale charts as JSON for the web app.")
    ap.add_argument("--output", type=Path, required=True, help="Path to write scales.json.")
    ap.add_argument("--start", type=str, default="C", help="Starting key (default C).")
    ap.add_argument("--step", type=int, default=5, help="Cycle step in semitones (default 5 = fourths).")
    ap.add_argument("--count", type=int, default=12, help="How many keys (default 12).")
    ap.add_argument("--prefer", type=str, choices=["auto", "flats", "sharps"], default="auto", help="Accidental style (default auto).")
    ap.add_argument("--anchor", type=str, choices=["nearest", "up", "down"], default="nearest", help="Register anchoring (default nearest).")
    args = ap.parse_args()

    if args.start not in NAME_TO_PC:
        raise SystemExit(f"Unknown start key: {args.start}")

    data = build_data(args.start, args.step, args.count, args.prefer, args.anchor)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {args.output} ({len(data['charts'])} charts, {len(data['keys'])} keys)")


if __name__ == "__main__":
    main()
