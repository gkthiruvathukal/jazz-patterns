"""Pitch-class, note-naming, and key-signature helpers.

Keys and notes are tracked as integer pitch classes 0-11 (C=0 .. B=11). These
tables and functions convert between names, pitch classes, and the tokens
LilyPond expects under ``\\language "english"``.
"""

import abjad

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


# Enharmonic sharp keys to emit *in addition* to the flat-spelled cycle entries.
# Jazz lead sheets routinely write F# and C# even though they sound identical to
# Gb and Db, so we surface both spellings. Maps each flat key name to its
# (sharp name, pitch class); the sharp spelling is inserted right after its flat
# twin so the two sit side by side in dropdowns and the printed book.
ENHARMONIC_EXTRAS = {
    "Db": ("C#", 1),
    "Gb": ("F#", 6),
}


def key_cycle(start: str, step: int, count: int, prefer_arg: str, extras: bool = True):
    """Resolve the ordered list of keys to render.

    Cycles pitch classes from ``start`` in ``step``-semitone increments for
    ``count`` keys, returning ``(pc, prefer, name)`` tuples. With ``extras``
    set, any key that resolves to a flat spelling with a common sharp
    enharmonic (Db, Gb) is followed by that sharp spelling (C#, F#), so both
    appear — the sharp one spelled with sharps. This is the single source of
    key ordering shared by the print model and the web JSON export.
    """
    specs = []
    pc = NAME_TO_PC[start]
    for _ in range(count):
        prefer = auto_prefer_for_pc(pc) if prefer_arg == "auto" else prefer_arg
        name = pc_to_name(pc, prefer)
        specs.append((pc, prefer, name))
        if extras and name in ENHARMONIC_EXTRAS:
            extra_name, extra_pc = ENHARMONIC_EXTRAS[name]
            specs.append((extra_pc, "sharps", extra_name))
        pc = (pc + step) % 12
    return specs


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
