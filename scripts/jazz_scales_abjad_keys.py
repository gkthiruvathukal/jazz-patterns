# Abjad 3.25 — one LilyPond file (and optional PDF) per key,
# two bars per system, beamed 8ths, chord & scale names above, interval labels below.

import argparse
import os
import abjad

TITLE_BASE = "Common Jazz Scales in Key of {key}"
SYSTEM_DISTANCE = 24
TOP_SYSTEM_DISTANCE = 18

# ---------- pitch helpers (NumberedPitch with C4 == 0) ----------
LETTER_TO_PC = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}

SHARP_NAMES = {0:"C",1:"C#",2:"D",3:"D#",4:"E",5:"F",6:"F#",7:"G",8:"G#",9:"A",10:"A#",11:"B"}
FLAT_NAMES  = {0:"C",1:"Db",2:"D",3:"Eb",4:"E",5:"F",6:"Gb",7:"G",8:"Ab",9:"A",10:"Bb",11:"B"}

# LilyPond english tokens for key signatures (\key <token> \major/\minor)
SHARP_KEYS = {0:"c",1:"cis",2:"d",3:"dis",4:"e",5:"f",6:"fis",7:"g",8:"gis",9:"a",10:"ais",11:"b"}
FLAT_KEYS  = {0:"c",1:"des",2:"d",3:"ees",4:"e",5:"f",6:"ges",7:"g",8:"aes",9:"a",10:"bes",11:"b"}

NAME_TO_PC = {
    "C":0,"B#":0, "C#":1,"Db":1, "D":2, "D#":3,"Eb":3, "E":4,"Fb":4,
    "F":5,"E#":5, "F#":6,"Gb":6, "G":7, "G#":8,"Ab":8, "A":9,
    "A#":10,"Bb":10, "B":11,"Cb":11
}

def pc_to_name(pc: int, prefer: str) -> str:
    pc %= 12
    if prefer == "flats":  return FLAT_NAMES[pc]
    if prefer == "sharps": return SHARP_NAMES[pc]
    return FLAT_NAMES[pc]  # default when auto

def pc_to_lily_key(pc: int, prefer: str) -> str:
    pc %= 12
    return (FLAT_KEYS if prefer == "flats" else SHARP_KEYS)[pc]

def sanitize_key_for_filename(name: str) -> str:
    return (name.replace("##", "double-sharp")
                .replace("#", "sharp")
                .replace("bb", "double-flat")
                .replace("b", "flat"))

def numbered_pitch_from_name(name: str, default_octave: int = 4) -> abjad.NumberedPitch:
    s = name.strip()
    octave = default_octave
    if s[-1].isdigit():
        octave = int(s[-1]); core = s[:-1]
    else:
        core = s
    letter = core[0].upper()
    acc = core[1:].lower() if len(core) > 1 else ""
    semitone = LETTER_TO_PC[letter] + (1 if acc == "#" else -1 if acc == "b" else 0)
    value = 12 * (octave - 4) + semitone  # C4 -> 0
    return abjad.NumberedPitch(value)

def pc_to_register_offset(pc: int, anchor: str) -> int:
    pc %= 12
    if anchor == "up":   return pc
    if anchor == "down": return pc - (12 if pc else 0)
    return pc if pc <= 5 else pc - 12  # nearest: keep within [-6, +5]

# ---------- C-root templates ----------
SCALES = [
    ("Major (Ionian)",            ["C","D","E","F","G","A","B","C5"],          ["W","W","H","W","W","W","H"],         "Cmaj7"),
    ("Natural Minor (Aeolian)",   ["C","D","Eb","F","G","Ab","Bb","C5"],       ["W","H","W","W","H","W","W"],         "Cm7"),
    ("Harmonic Minor",            ["C","D","Eb","F","G","Ab","B","C5"],        ["W","H","W","W","H","W+H","H"],       "Cm(maj7)"),
    ("Melodic Minor (Jazz)",      ["C","D","Eb","F","G","A","B","C5"],         ["W","H","W","W","W","W","H"],         "Cm(maj7)"),
    ("Dominant 7th (Mixolydian)", ["C","D","E","F","G","A","Bb","C5"],         ["W","W","H","W","W","H","W"],         "C7"),
    ("Dorian",                    ["C","D","Eb","F","G","A","Bb","C5"],        ["W","H","W","W","W","H","W"],         "Cm7"),
    ("Phrygian",                  ["C","Db","Eb","F","G","Ab","Bb","C5"],      ["H","W","W","W","H","W","W"],         "Cm7(b9)"),
    ("Lydian",                    ["C","D","E","F#","G","A","B","C5"],         ["W","W","W","H","W","W","H"],         "Cmaj7(#11)"),
    ("Locrian",                   ["C","Db","Eb","F","Gb","Ab","Bb","C5"],     ["H","W","W","H","W","W","W"],         "Cm7b5"),
    ("Half-Dim #2 (Locrian ♮2)",  ["C","D","Eb","F","Gb","Ab","Bb","C5"],      ["W","H","W","H","W","W","W"],         "Cm7b5"),
    ("Whole Tone",                ["C","D","E","F#","G#","A#","C5"],           ["W","W","W","W","W","W"],             "C7(#5)"),
    ("Octatonic (Half–Whole)",    ["C","Db","Eb","E","F#","G","A","Bb"],       ["H","W","H","W","H","W","H"],         "C7(b9)"),
    ("Octatonic (Whole–Half)",    ["C","D","Eb","F","Gb","Ab","A","B"],        ["W","H","W","H","W","H","W"],         "Cdim7"),
    ("Blues (minor)",             ["C","Eb","F","Gb","G","Bb","C5"],           ["m3","W","H","H","m3","W"],           "Cm7"),
    ("Pentatonic Major",          ["C","D","E","G","A","C5"],                   ["W","W","W+H","W","W+H"],             "C6"),
    ("Pentatonic Minor",          ["C","Eb","F","G","Bb","C5"],                 ["W+H","W","W","W+H","W"],             "Cm"),
]

# ---------- transposition & bar building ----------
def transpose_scale_notes(notes_spec, semitone_offset):
    return [abjad.NumberedPitch(numbered_pitch_from_name(n).number + semitone_offset) for n in notes_spec]

def transpose_chord_text(chord_text_c_root: str, key_name: str) -> str:
    return key_name + chord_text_c_root[1:]

def make_bar(pitches, intervals, chord_text, scale_name):
    leaves = [abjad.Note(p, (1, 8)) for p in pitches]
    while len(leaves) < 8:
        leaves.append(abjad.Rest((1, 8)))  # pad at end if pentatonic/blues
    container = abjad.Container(leaves)

    pitched = [l for l in abjad.select.leaves(container) if isinstance(l, abjad.Note)]
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

def build_score_for_key(pc: int, prefer_names: str, anchor: str, mode: str):
    """Return (score, title, printable_key_name)."""
    key_name = pc_to_name(pc, prefer_names)
    lily_key = pc_to_lily_key(pc, prefer_names)
    semitone_offset = pc_to_register_offset(pc, anchor)

    voice = abjad.Voice(name="Music")
    for idx, (scale_name, notes, intervals, chord_text_c) in enumerate(SCALES, start=1):
        pitches = transpose_scale_notes(notes, semitone_offset)
        chord_text = transpose_chord_text(chord_text_c, key_name)
        bar = make_bar(pitches, intervals, chord_text, scale_name)
        voice.append(bar)
        if idx % 2 == 0:
            last_leaf = abjad.select.leaf(bar, -1)
            # Keep exactly 2 measures per system
            abjad.attach(abjad.LilyPondLiteral(r"\break", site="after"), last_leaf)

    staff = abjad.Staff([voice], name="Staff")

    # Meter, clef, and KEY SIGNATURE at the start (mode: major|minor)
    first_leaf = abjad.select.leaf(staff, 0)
    abjad.attach(abjad.TimeSignature((4, 4)), first_leaf)
    abjad.attach(abjad.Clef("treble"), first_leaf)
    abjad.attach(abjad.LilyPondLiteral(rf"\key {lily_key} \{mode}"), first_leaf)

    score = abjad.Score([staff], name="Score")
    title = TITLE_BASE.format(key=key_name)
    return score, title, key_name

def write_lilypond(score, title: str, outfile: str,
                   make_pdf: bool = False,
                   author: str | None = None,
                   license_text: str | None = None):
    lily = abjad.LilyPondFile([score])

    # Header
    header_items = [rf'title = \markup {{ \bold "{title}" }}']
    if author:
        header_items.append(rf'composer = "{author}"')
    if license_text:
        header_items.append(rf'copyright = "{license_text}"')
    header_items.append('tagline = ""')

    header = abjad.Block("header", items=header_items)
    paper = abjad.Block("paper", items=[
        f"system-system-spacing.basic-distance = #{SYSTEM_DISTANCE}",
        f"top-system-spacing.basic-distance = #{TOP_SYSTEM_DISTANCE}",
    ])
    lily.items.insert(0, paper)
    lily.items.insert(0, header)

    # Write .ly (and optional .pdf)
    abjad.persist.as_ly(lily, outfile)
    if make_pdf:
        pdf_path = os.path.splitext(outfile)[0] + ".pdf"
        abjad.persist.as_pdf(lily, pdf_path)

# ---------- CLI ----------
def main():
    ap = argparse.ArgumentParser(description="Generate jazz scale charts in multiple keys.")
    ap.add_argument("--step", type=int, default=5, help="Cycle step in semitones (default 5 = fourths).")
    ap.add_argument("--count", type=int, default=12, help="How many keys to generate (default 12).")
    ap.add_argument("--start", type=str, default="C", help="Starting key (e.g., C, F#, Gb, Bb).")
    ap.add_argument("--prefer", type=str, choices=["auto","flats","sharps"], default="auto",
                    help="Accidental style for key names & signatures (default auto).")
    ap.add_argument("--anchor", type=str, choices=["nearest","up","down"], default="nearest",
                    help="Register anchoring around middle C (default nearest).")
    ap.add_argument("--mode", type=str, choices=["major","minor"], default="major",
                    help="Key signature mode for each chart (major or minor).")
    ap.add_argument("--pdf", action="store_true",
                    help="Also compile a PDF for each chart (requires LilyPond).")
    ap.add_argument("--author", type=str, default="George K. Thiruvathukal",
                    help="Author/composer name printed under the title.")
    ap.add_argument("--license", type=str, default="Creative Commons 4.0 International",
                    help="License text printed in the footer (copyright field).")
    args = ap.parse_args()

    # default accidental preference: flats for 4ths, sharps for 5ths
    prefer = args.prefer
    if prefer == "auto":
        prefer = "flats" if args.step % 12 in (5, 10) else "sharps"

    if args.start not in NAME_TO_PC:
        raise SystemExit(f"Unknown start key: {args.start}")
    start_pc = NAME_TO_PC[args.start]

    pc = start_pc
    written = []
    for _ in range(args.count):
        score, title, key_name = build_score_for_key(pc, prefer, args.anchor, args.mode)
        safe_key = sanitize_key_for_filename(key_name)
        outfile = f"jazz_scales_abjad_{safe_key}.ly"
        write_lilypond(score, title, outfile,
                       make_pdf=args.pdf,
                       author=args.author,
                       license_text=args.license)
        written.append(outfile)
        pc = (pc + args.step) % 12

    print("Wrote:")
    for f in written:
        print("  ", f)
    if args.pdf:
        print("(PDFs written alongside the .ly files)")

if __name__ == "__main__":
    main()

