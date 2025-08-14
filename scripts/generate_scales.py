# scripts/generate_scales.py
import abjad

TITLE = "Jazz Scales – C Instruments (beamed 8ths, chords above, interval labels)"

LETTER_TO_PC = {"C":0, "D":2, "E":4, "F":5, "G":7, "A":9, "B":11}

def np_from(name: str, default_oct=4) -> abjad.NumberedPitch:
    s = name.strip()
    octv = default_oct
    if s[-1].isdigit():
        octv = int(s[-1]); core = s[:-1]
    else:
        core = s
    letter = core[0].upper()
    acc = core[1:].lower() if len(core) > 1 else ""
    pc = LETTER_TO_PC[letter]
    if acc == "#": pc += 1
    elif acc == "b": pc -= 1
    midi = 12 * (octv + 1) + pc  # C4 = 60
    return abjad.NumberedPitch(midi)

def make_bar(notes, intervals, chord_text, scale_name):
    leaves = [abjad.Note(np_from(p), (1,8)) for p in notes]
    while len(leaves) < 8:
        leaves.append(abjad.Rest((1,8)))
    container = abjad.Container(leaves)
    pitched = [l for l in abjad.select.leaves(container) if isinstance(l, abjad.Note)]
    if len(pitched) >= 2:
        abjad.beam(pitched)

    first = abjad.select.leaf(container, 0)
    abjad.attach(abjad.Markup(f'"{scale_name}"'), first, direction=abjad.UP)
    if chord_text:
        abjad.attach(abjad.Markup(f'"{chord_text}"'), first, direction=abjad.UP)

    i = 0
    for leaf in abjad.select.leaves(container):
        if isinstance(leaf, abjad.Note):
            label = "-" if i == 0 else (intervals[i-1] if i-1 < len(intervals) else "")
            if label:
                abjad.attach(abjad.Markup(f'"{label}"'), leaf, direction=abjad.DOWN)
            i += 1
    return container

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

voice = abjad.Voice(name="Music")
for name, notes, intervals, chord in SCALES:
    voice.append(make_bar(notes, intervals, chord, name))

staff = abjad.Staff([voice], name="Staff")
first = abjad.select.leaf(staff, 0)
abjad.attach(abjad.TimeSignature((4,4)), first)
abjad.attach(abjad.Clef("treble"), first)

score = abjad.Score([staff], name="Score")
lily = abjad.LilyPondFile([score])
abjad.persist.as_ly(lily, "out/jazz_scales_abjad.ly")
print("Wrote out/jazz_scales_abjad.ly")
