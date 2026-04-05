"""Generate multi-key jazz scale charts with forward and retrograde systems."""

import argparse
import shutil
import subprocess
from pathlib import Path

import abjad

TITLE_BASE = "Common Jazz Scales in Key of {key}"
SYSTEM_DISTANCE = 24
TOP_SYSTEM_DISTANCE = 18

LETTER_TO_PC = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}

SHARP_NAMES = {
    0: "C",
    1: "C#",
    2: "D",
    3: "D#",
    4: "E",
    5: "F",
    6: "F#",
    7: "G",
    8: "G#",
    9: "A",
    10: "A#",
    11: "B",
}
FLAT_NAMES = {
    0: "C",
    1: "Db",
    2: "D",
    3: "Eb",
    4: "E",
    5: "F",
    6: "Gb",
    7: "G",
    8: "Ab",
    9: "A",
    10: "Bb",
    11: "B",
}

# LilyPond tokens for key signatures in \language "english"
SHARP_KEYS = {0: "c", 1: "cs", 2: "d", 3: "ds", 4: "e", 5: "f", 6: "fs", 7: "g", 8: "gs", 9: "a", 10: "as", 11: "b"}
FLAT_KEYS = {0: "c", 1: "df", 2: "d", 3: "ef", 4: "e", 5: "f", 6: "gf", 7: "g", 8: "af", 9: "a", 10: "bf", 11: "b"}

NAME_TO_PC = {
    "C": 0,
    "B#": 0,
    "C#": 1,
    "Db": 1,
    "D": 2,
    "D#": 3,
    "Eb": 3,
    "E": 4,
    "Fb": 4,
    "F": 5,
    "E#": 5,
    "F#": 6,
    "Gb": 6,
    "G": 7,
    "G#": 8,
    "Ab": 8,
    "A": 9,
    "A#": 10,
    "Bb": 10,
    "B": 11,
    "Cb": 11,
}


def pc_to_name(pc: int, prefer: str) -> str:
    pc %= 12
    if prefer == "flats":
        return FLAT_NAMES[pc]
    if prefer == "sharps":
        return SHARP_NAMES[pc]
    return FLAT_NAMES[pc]


def pc_to_lily_key(pc: int, prefer: str) -> str:
    pc %= 12
    return (FLAT_KEYS if prefer == "flats" else SHARP_KEYS)[pc]


def auto_prefer_for_pc(pc: int) -> str:
    pc %= 12
    return "flats" if pc in {0, 1, 3, 5, 6, 8, 10} else "sharps"


def sanitize_key_for_filename(name: str) -> str:
    return (
        name.replace("##", "double-sharp")
        .replace("#", "sharp")
        .replace("bb", "double-flat")
        .replace("b", "flat")
    )


def numbered_pitch_from_name(name: str, default_octave: int = 4) -> abjad.NumberedPitch:
    s = name.strip()
    octave = default_octave
    if s[-1].isdigit():
        octave = int(s[-1])
        core = s[:-1]
    else:
        core = s
    letter = core[0].upper()
    acc = core[1:].lower() if len(core) > 1 else ""
    semitone = LETTER_TO_PC[letter] + (1 if acc == "#" else -1 if acc == "b" else 0)
    value = 12 * (octave - 4) + semitone
    return abjad.NumberedPitch(value)


def pc_to_register_offset(pc: int, anchor: str) -> int:
    pc %= 12
    if anchor == "up":
        return pc
    if anchor == "down":
        return pc - (12 if pc else 0)
    return pc if pc <= 5 else pc - 12


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
    ("Altered", ["C", "Db", "Eb", "E", "Gb", "Ab", "Bb", "C5"], ["H", "W", "W", "H", "W", "W", "W"], "C7alt"),
    ("Lydian Dominant", ["C", "D", "E", "F#", "G", "A", "Bb", "C5"], ["W", "W", "W", "H", "W", "H", "W"], "C7(#11)"),
    ("Bebop Dominant", ["C", "D", "E", "F", "G", "A", "Bb", "B"], ["W", "W", "H", "W", "W", "H", "H"], "C7"),
    ("Mixolydian b6", ["C", "D", "E", "F", "G", "Ab", "Bb", "C5"], ["W", "W", "H", "W", "H", "W", "W"], "C7(b13)"),
    ("Minor Pentatonic b5", ["C", "Eb", "F", "Gb", "Bb", "C5"], ["m3", "W", "H", "m3", "W"], "Cm7(b5)"),
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


def make_retrograde_bar(pitches, chord_text, scale_name, prefer_names: str):
    reversed_pitches = list(reversed(pitches))
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
        retrograde_bar = make_retrograde_bar(pitches, chord_text, scale_name, prefer_names)
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


def _tail(text: str, n: int = 30) -> str:
    lines = (text or "").splitlines()
    return "\n".join(lines[-n:])


def _compile_with_lilypond(ly_path: Path, want_pdf: bool, want_midi: bool):
    lilypond_exe = shutil.which("lilypond")
    result = {
        "pdf_ok": False,
        "midi_ok": False,
        "pdf_path": None,
        "midi_path": None,
        "stdout_tail": "",
        "stderr_tail": "",
        "cmd": None,
    }
    if lilypond_exe is None:
        result["stderr_tail"] = "ERROR: lilypond not found in PATH."
        return result

    base = ly_path.parent / ly_path.stem
    cmd = [lilypond_exe, "-o", str(base), str(ly_path)]
    result["cmd"] = " ".join(cmd)

    try:
        cp = subprocess.run(cmd, check=True, text=True, capture_output=True)
        result["stdout_tail"] = _tail(cp.stdout)
        result["stderr_tail"] = _tail(cp.stderr)
    except subprocess.CalledProcessError as exc:
        result["stdout_tail"] = _tail(exc.stdout)
        result["stderr_tail"] = _tail(exc.stderr or f"Exited with {exc.returncode}")

    pdf_path = base.with_suffix(".pdf")
    midi_path = base.with_suffix(".midi")
    mid_path = base.with_suffix(".mid")

    if want_pdf and pdf_path.exists():
        result["pdf_ok"] = True
        result["pdf_path"] = str(pdf_path)
    if want_midi and (midi_path.exists() or mid_path.exists()):
        result["midi_ok"] = True
        result["midi_path"] = str(midi_path if midi_path.exists() else mid_path)

    return result


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
        result.update(_compile_with_lilypond(Path(outfile), want_pdf=make_pdf, want_midi=midi))
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
    args = ap.parse_args()

    if args.start not in NAME_TO_PC:
        raise SystemExit(f"Unknown start key: {args.start}")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    pc = NAME_TO_PC[args.start]
    results = []

    for _ in range(args.count):
        prefer = auto_prefer_for_pc(pc) if args.prefer == "auto" else args.prefer
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
        res["key"] = key_name
        results.append(res)
        pc = (pc + args.step) % 12

    print("Wrote .ly files:")
    for result in results:
        print("  ", result["ly_path"])

    if args.pdf:
        ok_pdf = sum(1 for result in results if result["pdf_ok"])
        print(f"\nPDF summary: {ok_pdf}/{len(results)} OK")
        for result in results:
            if result["pdf_ok"]:
                print(f"  [OK]  {result['pdf_path']}")
            else:
                print(f"  [MISS] (Key {result['key']}) — no PDF.")
                if result.get("cmd"):
                    print(f"         Command: {result['cmd']}")
                if result.get("stderr_tail"):
                    print("         lilypond stderr (tail):")
                    print("         " + "\n         ".join(result["stderr_tail"].splitlines()))

    if args.midi:
        ok_midi = sum(1 for result in results if result["midi_ok"])
        print(f"\nMIDI summary: {ok_midi}/{len(results)} OK")
        for result in results:
            if result["midi_ok"]:
                print(f"  [OK]  {result['midi_path']}")
            else:
                print(f"  [MISS] (Key {result['key']}) — no MIDI.")


if __name__ == "__main__":
    main()
