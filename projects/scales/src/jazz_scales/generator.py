"""Generate multi-key jazz scale charts with forward and retrograde systems."""

import argparse
import re
from pathlib import Path

import abjad

from jazz_common.lilypond import compile_with_lilypond
from jazz_common.pitch import (
    NAME_TO_PC,
    key_cycle,
    numbered_pitch_from_name,
    pc_to_lily_key,
    pc_to_name,
    sanitize_key_for_filename,
)

TITLE_BASE = "Common Jazz Scales in Key of {key}"
SYSTEM_DISTANCE = 24
TOP_SYSTEM_DISTANCE = 18
# Minimum clear gap (staff-spaces) between adjacent systems' skylines, so the
# step labels below one system never collide with the markups above the next.
SYSTEM_PADDING = 7


def pc_to_register_offset(pc: int, anchor: str) -> int:
    pc %= 12
    if anchor == "up":
        return pc
    if anchor == "down":
        return pc - (12 if pc else 0)
    return pc if pc <= 5 else pc - 12


def scale_slug(name: str) -> str:
    """Filename-safe slug for a scale name, e.g. 'Major (Ionian)' -> 'major_ionian'."""
    return re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")


SCALES = [
    ("Major (Ionian)", ["C", "D", "E", "F", "G", "A", "B", "C5"], ["W", "W", "H", "W", "W", "W", "H"], "Cmaj7"),
    ("Natural Minor (Aeolian)", ["C", "D", "Eb", "F", "G", "Ab", "Bb", "C5"], ["W", "H", "W", "W", "H", "W", "W"], "Cm7"),
    ("Harmonic Minor", ["C", "D", "Eb", "F", "G", "Ab", "B", "C5"], ["W", "H", "W", "W", "H", "W+H", "H"], "Cm(maj7)"),
    ("Melodic Minor (Jazz)", ["C", "D", "Eb", "F", "G", "A", "B", "C5"], ["W", "H", "W", "W", "W", "W", "H"], "Cm(maj7)"),
    ("Dominant 7th (Mixolydian)", ["C", "D", "E", "F", "G", "A", "Bb", "C5"], ["W", "W", "H", "W", "W", "H", "W"], "C7"),
    ("Dorian", ["C", "D", "Eb", "F", "G", "A", "Bb", "C5"], ["W", "H", "W", "W", "W", "H", "W"], "Cm7"),
    ("Phrygian", ["C", "Db", "Eb", "F", "G", "Ab", "Bb", "C5"], ["H", "W", "W", "W", "H", "W", "W"], "Cm7(b9)"),
    ("Lydian", ["C", "D", "E", "F#", "G", "A", "B", "C5"], ["W", "W", "W", "H", "W", "W", "H"], "Cmaj7(#11)"),
    ("Locrian", ["C", "Db", "Eb", "F", "Gb", "Ab", "Bb", "C5"], ["H", "W", "W", "H", "W", "W", "W"], "Cm7b5"),
    ("Half-Dim #2 (Locrian ♮2)", ["C", "D", "Eb", "F", "Gb", "Ab", "Bb", "C5"], ["W", "H", "W", "H", "W", "W", "W"], "Cm7b5"),
    ("Whole Tone", ["C", "D", "E", "F#", "G#", "A#", "C5"], ["W", "W", "W", "W", "W", "W"], "C7(#5)"),
    ("Octatonic (Half–Whole)", ["C", "Db", "Eb", "E", "F#", "G", "A", "Bb"], ["H", "W", "H", "W", "H", "W", "H"], "C7(b9)"),
    ("Octatonic (Whole–Half)", ["C", "D", "Eb", "F", "Gb", "Ab", "A", "B"], ["W", "H", "W", "H", "W", "H", "W"], "Cdim7"),
    ("Blues (major)", ["C", "D", "Eb", "E", "G", "A", "C5"], ["W", "H", "H", "m3", "W", "W+H"], "C6"),
    ("Blues (minor)", ["C", "Eb", "F", "Gb", "G", "Bb", "C5"], ["m3", "W", "H", "H", "m3", "W"], "Cm7"),
    ("Pentatonic Major", ["C", "D", "E", "G", "A", "C5"], ["W", "W", "W+H", "W", "W+H"], "C6"),
    ("Pentatonic Minor", ["C", "Eb", "F", "G", "Bb", "C5"], ["W+H", "W", "W", "W+H", "W"], "Cm"),
    ("Altered", ["C", "Db", "Eb", "E", "Gb", "Ab", "Bb", "C5"], ["H", "W", "H", "W", "W", "W", "W"], "C7alt"),
    ("Lydian Dominant", ["C", "D", "E", "F#", "G", "A", "Bb", "C5"], ["W", "W", "W", "H", "W", "H", "W"], "C7(#11)"),
    ("Bebop Dominant", ["C", "D", "E", "F", "G", "A", "Bb", "B"], ["W", "W", "H", "W", "W", "H", "H"], "C7"),
    ("Mixolydian b6", ["C", "D", "E", "F", "G", "Ab", "Bb", "C5"], ["W", "W", "H", "W", "H", "W", "W"], "C7(b13)"),
    ("Minor Pentatonic b5", ["C", "Eb", "F", "Gb", "Bb", "C5"], ["m3", "W", "H", "M3", "W"], "Cm7(b5)"),
    ("Dorian b2", ["C", "Db", "Eb", "F", "G", "A", "Bb", "C5"], ["H", "W", "W", "W", "W", "H", "W"], "Cm7(b9)"),
    ("Bebop Major", ["C", "D", "E", "F", "G", "Ab", "A", "B"], ["W", "W", "H", "W", "H", "H", "W"], "Cmaj7"),
    ("Lydian Augmented", ["C", "D", "E", "F#", "G#", "A", "B", "C5"], ["W", "W", "W", "W", "H", "W", "H"], "Cmaj7(#5)"),
    ("Dominant Pentatonic", ["C", "D", "E", "G", "Bb", "C5"], ["W", "W", "W+H", "W+H", "W"], "C7"),
]


def transpose_scale_notes(notes_spec, semitone_offset):
    return [abjad.NumberedPitch(numbered_pitch_from_name(n).number() + semitone_offset) for n in notes_spec]


def transpose_chord_text(chord_text_c_root: str, key_name: str) -> str:
    return key_name + chord_text_c_root[1:]


def format_pitch_for_key(pitch, prefer_names: str) -> str:
    named_pitch = abjad.NamedPitch(pitch.name()).respell(prefer_names)
    return named_pitch.name()


def make_bar(pitches, intervals, chord_text, scale_name, prefer_names: str):
    leaves = [abjad.Note(f"{format_pitch_for_key(p, prefer_names)}8") for p in pitches]
    while len(leaves) < 8:
        leaves.append(abjad.Rest("r8"))
    container = abjad.Container(leaves)

    pitched = [leaf for leaf in abjad.select.leaves(container) if isinstance(leaf, abjad.Note)]
    if len(pitched) >= 2:
        abjad.beam(pitched)

    first_leaf = abjad.select.leaf(container, 0)
    abjad.attach(abjad.Markup(f'"{scale_name}"'), first_leaf, direction=abjad.UP)
    if chord_text:
        abjad.attach(abjad.Markup(f'"{chord_text}"'), first_leaf, direction=abjad.UP)

    i = 0
    for leaf in abjad.select.leaves(container):
        if isinstance(leaf, abjad.Note):
            label = "-" if i == 0 else (intervals[i - 1] if i - 1 < len(intervals) else "")
            if label:
                abjad.attach(abjad.Markup(f'"{label}"'), leaf, direction=abjad.DOWN)
            i += 1
    return container


def make_retrograde_bar(pitches, intervals, chord_text, scale_name, prefer_names: str):
    reversed_pitches = list(reversed(pitches))
    reversed_intervals = list(reversed(intervals))
    leaves = [abjad.Note(f"{format_pitch_for_key(p, prefer_names)}8") for p in reversed_pitches]
    while len(leaves) < 8:
        leaves.append(abjad.Rest("r8"))
    container = abjad.Container(leaves)

    pitched = [leaf for leaf in abjad.select.leaves(container) if isinstance(leaf, abjad.Note)]
    if len(pitched) >= 2:
        abjad.beam(pitched)

    first_leaf = abjad.select.leaf(container, 0)
    abjad.attach(abjad.Markup(f'"{scale_name} - Retrograde"'), first_leaf, direction=abjad.UP)
    if chord_text:
        abjad.attach(abjad.Markup(f'"{chord_text}"'), first_leaf, direction=abjad.UP)

    i = 0
    for leaf in abjad.select.leaves(container):
        if isinstance(leaf, abjad.Note):
            label = "-" if i == 0 else (reversed_intervals[i - 1] if i - 1 < len(reversed_intervals) else "")
            if label:
                abjad.attach(abjad.Markup(f'"{label}"'), leaf, direction=abjad.DOWN)
            i += 1
    return container


def build_score_for_key(pc: int, prefer_names: str, anchor: str, mode: str, bpm: int):
    key_name = pc_to_name(pc, prefer_names)
    lily_key = pc_to_lily_key(pc, prefer_names)
    semitone_offset = pc_to_register_offset(pc, anchor)

    voice = abjad.Voice(name="Music")
    for scale_name, notes, intervals, chord_text_c in SCALES:
        pitches = transpose_scale_notes(notes, semitone_offset)
        chord_text = transpose_chord_text(chord_text_c, key_name)
        bar = make_bar(pitches, intervals, chord_text, scale_name, prefer_names)
        retrograde_bar = make_retrograde_bar(pitches, intervals, chord_text, scale_name, prefer_names)
        voice.append(bar)
        voice.append(retrograde_bar)
        last_leaf = abjad.select.leaf(retrograde_bar, -1)
        abjad.attach(abjad.LilyPondLiteral(r"\break", site="after"), last_leaf)

    staff = abjad.Staff([voice], name="Staff")
    first_leaf = abjad.select.leaf(staff, 0)
    abjad.attach(abjad.TimeSignature((4, 4)), first_leaf)
    abjad.attach(abjad.Clef("treble"), first_leaf)
    abjad.attach(abjad.LilyPondLiteral(rf"\key {lily_key} \{mode}"), first_leaf)
    if bpm:
        abjad.attach(abjad.MetronomeMark(abjad.Duration(1, 4), bpm), first_leaf)

    score = abjad.Score([staff], name="Score")
    title = TITLE_BASE.format(key=key_name)
    return score, title, key_name


def build_movements_for_scale(scale, specs, anchor: str, mode: str, bpm: int):
    """Build one self-contained movement (score) per key for a single scale.

    ``specs`` is the resolved ``(pc, prefer, name)`` list from ``key_cycle`` —
    the same order used for the per-key chapters, so by-scale and by-key
    chapters stay in lock-step (including the enharmonic F#/C# entries).

    Each movement is two measures (forward + retrograde) with its own key
    signature. Using separate scores rather than systems within one score keeps
    each key self-contained and avoids the courtesy key-change LilyPond would
    otherwise print at the end of the previous line when the key changes.
    """
    scale_name, notes, intervals, chord_text_c = scale

    movements = []
    for index, (pc, prefer_names, key_name) in enumerate(specs):
        lily_key = pc_to_lily_key(pc, prefer_names)
        semitone_offset = pc_to_register_offset(pc, anchor)

        pitches = transpose_scale_notes(notes, semitone_offset)
        chord_text = transpose_chord_text(chord_text_c, key_name)
        system_label = f"Key of {key_name}"
        bar = make_bar(pitches, intervals, chord_text, system_label, prefer_names)
        retrograde_bar = make_retrograde_bar(pitches, intervals, chord_text, system_label, prefer_names)

        voice = abjad.Voice([bar, retrograde_bar], name="Music")
        staff = abjad.Staff([voice], name="Staff")
        first_leaf = abjad.select.leaf(staff, 0)
        abjad.attach(abjad.TimeSignature((4, 4)), first_leaf)
        abjad.attach(abjad.Clef("treble"), first_leaf)
        abjad.attach(abjad.LilyPondLiteral(rf"\key {lily_key} \{mode}"), first_leaf)
        if bpm and index == 0:
            abjad.attach(abjad.MetronomeMark(abjad.Duration(1, 4), bpm), first_leaf)

        movements.append(abjad.Score([staff], name="Score"))

    title = f"{scale_name} — All Keys"
    return movements, title


def write_lilypond(score, title: str, outfile: str, make_pdf: bool = False, author: str | None = None, license_text: str | None = None, midi: bool = False):
    header_items = [rf'title = \markup {{ \bold "{title}" }}']
    if author:
        header_items.append(rf'composer = "{author}"')
    if license_text:
        header_items.append(rf'copyright = "{license_text}"')
    header_items.append('tagline = ""')
    header = abjad.Block("header", items=header_items)

    paper = abjad.Block(
        "paper",
        items=[
            f"system-system-spacing.basic-distance = #{SYSTEM_DISTANCE}",
            f"top-system-spacing.basic-distance = #{TOP_SYSTEM_DISTANCE}",
        ],
    )
    layout_block = abjad.Block("layout", items=["indent = 0", "short-indent = 0"])
    score_block = abjad.Block("score", items=[score, layout_block])
    if midi:
        score_block.items.append(abjad.Block("midi"))

    lily = abjad.LilyPondFile(items=[header, paper, score_block])
    abjad.persist.as_ly(lily, outfile)

    result = {
        "ly_path": str(outfile),
        "pdf_ok": False,
        "midi_ok": False,
        "pdf_path": None,
        "midi_path": None,
        "cmd": None,
        "stdout_tail": "",
        "stderr_tail": "",
    }
    if make_pdf or midi:
        result.update(compile_with_lilypond(Path(outfile), want_pdf=make_pdf, want_midi=midi))
    return result


def write_lilypond_movements(scores, title: str, outfile: str, make_pdf: bool = False, author: str | None = None, license_text: str | None = None):
    """Write multiple scores (movements) into one LilyPond file, each self-contained."""
    header_items = [rf'title = \markup {{ \bold "{title}" }}']
    if author:
        header_items.append(rf'composer = "{author}"')
    if license_text:
        header_items.append(rf'copyright = "{license_text}"')
    header_items.append('tagline = ""')
    header = abjad.Block("header", items=header_items)

    paper = abjad.Block(
        "paper",
        items=[
            # Movements are separate scores, so the gap between them is governed by
            # score-system-spacing; padding enforces a clear skyline gap so one
            # movement's step labels never collide with the next movement's markup.
            f"score-system-spacing.basic-distance = #{SYSTEM_DISTANCE}",
            f"score-system-spacing.minimum-distance = #{SYSTEM_DISTANCE}",
            f"score-system-spacing.padding = #{SYSTEM_PADDING}",
            f"markup-system-spacing.basic-distance = #{SYSTEM_DISTANCE}",
            f"top-system-spacing.basic-distance = #{TOP_SYSTEM_DISTANCE}",
        ],
    )

    items = [header, paper]
    for score in scores:
        # ragged-right = ##f forces each single-system movement to justify to full
        # page width (LilyPond leaves single-system scores ragged by default).
        layout_block = abjad.Block("layout", items=["indent = 0", "short-indent = 0", "ragged-right = ##f"])
        items.append(abjad.Block("score", items=[score, layout_block]))

    lily = abjad.LilyPondFile(items=items)
    abjad.persist.as_ly(lily, outfile)

    result = {
        "ly_path": str(outfile),
        "pdf_ok": False,
        "midi_ok": False,
        "pdf_path": None,
        "midi_path": None,
        "cmd": None,
        "stdout_tail": "",
        "stderr_tail": "",
    }
    if make_pdf:
        result.update(compile_with_lilypond(Path(outfile), want_pdf=make_pdf, want_midi=False))
    return result


def main():
    ap = argparse.ArgumentParser(description="Generate jazz scale charts in multiple keys.")
    ap.add_argument("--step", type=int, default=5, help="Cycle step in semitones (default 5 = fourths).")
    ap.add_argument("--count", type=int, default=12, help="How many keys to generate (default 12).")
    ap.add_argument("--start", type=str, default="C", help="Starting key (e.g., C, F#, Gb, Bb).")
    ap.add_argument("--prefer", type=str, choices=["auto", "flats", "sharps"], default="auto", help="Accidental style for key names & signatures (default auto).")
    ap.add_argument("--anchor", type=str, choices=["nearest", "up", "down"], default="nearest", help="Register anchoring around middle C (default nearest).")
    ap.add_argument("--mode", type=str, choices=["major", "minor"], default="major", help="Key signature mode for each chart (major or minor).")
    ap.add_argument("--pdf", action="store_true", help="Compile a PDF for each chart (runs lilypond).")
    ap.add_argument("--midi", action="store_true", help="Also produce a .midi for each chart (runs lilypond).")
    ap.add_argument("--bpm", type=int, default=120, help="MIDI tempo in quarter-notes per minute (default 120).")
    ap.add_argument("--author", type=str, default="George K. Thiruvathukal", help="Author/composer name printed under the title.")
    ap.add_argument("--license", type=str, default="Creative Commons 4.0 International", help="License text printed in the footer (copyright field).")
    ap.add_argument("--output-dir", type=Path, default=Path("build"), help="Directory for generated .ly/.pdf/.midi outputs (default: build).")
    ap.add_argument("--sections", type=str, choices=["key", "scale", "both"], default="both", help="Which chapters to generate: by key, by scale, or both (default: both).")
    ap.add_argument("--no-enharmonics", action="store_true", help="Skip the extra enharmonic sharp keys (F#, C#) emitted alongside Gb, Db.")
    args = ap.parse_args()

    if args.start not in NAME_TO_PC:
        raise SystemExit(f"Unknown start key: {args.start}")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    specs = key_cycle(args.start, args.step, args.count, args.prefer, extras=not args.no_enharmonics)

    key_results = []
    if args.sections in ("key", "both"):
        for pc, prefer, _name in specs:
            score, title, key_name = build_score_for_key(pc, prefer, args.anchor, args.mode, args.bpm)
            safe_key = sanitize_key_for_filename(key_name)
            outfile = args.output_dir / f"jazz_scales_abjad_{safe_key}.ly"
            res = write_lilypond(
                score,
                title,
                str(outfile),
                make_pdf=args.pdf,
                author=args.author,
                license_text=args.license,
                midi=args.midi,
            )
            res["label"] = f"Key {key_name}"
            key_results.append(res)

    scale_results = []
    if args.sections in ("scale", "both"):
        for scale in SCALES:
            movements, title = build_movements_for_scale(scale, specs, args.anchor, args.mode, args.bpm)
            outfile = args.output_dir / f"jazz_scales_byscale_{scale_slug(scale[0])}.ly"
            res = write_lilypond_movements(
                movements,
                title,
                str(outfile),
                make_pdf=args.pdf,
                author=args.author,
                license_text=args.license,
            )
            res["label"] = f"Scale {scale[0]}"
            scale_results.append(res)

    all_results = key_results + scale_results
    print("Wrote .ly files:")
    for result in all_results:
        print("  ", result["ly_path"])

    if args.pdf:
        ok_pdf = sum(1 for result in all_results if result["pdf_ok"])
        print(f"\nPDF summary: {ok_pdf}/{len(all_results)} OK")
        for result in all_results:
            if result["pdf_ok"]:
                print(f"  [OK]  {result['pdf_path']}")
            else:
                print(f"  [MISS] ({result['label']}) — no PDF.")
                if result.get("cmd"):
                    print(f"         Command: {result['cmd']}")
                if result.get("stderr_tail"):
                    print("         lilypond stderr (tail):")
                    print("         " + "\n         ".join(result["stderr_tail"].splitlines()))

    if args.midi and key_results:
        ok_midi = sum(1 for result in key_results if result["midi_ok"])
        print(f"\nMIDI summary: {ok_midi}/{len(key_results)} OK")
        for result in key_results:
            if result["midi_ok"]:
                print(f"  [OK]  {result['midi_path']}")
            else:
                print(f"  [MISS] ({result['label']}) — no MIDI.")


if __name__ == "__main__":
    main()
