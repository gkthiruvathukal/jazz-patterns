"""Generate first-pass annotated jazz blues studies for Bb, F, and C."""

import argparse
from pathlib import Path

import abjad

from .generator import (
    NAME_TO_PC,
    SYSTEM_DISTANCE,
    TOP_SYSTEM_DISTANCE,
    _compile_with_lilypond,
    auto_prefer_for_pc,
    pc_to_name,
    sanitize_key_for_filename,
)

TITLE_BASE = "Jazz Blues Studies in {key}"

JAZZ_BLUES_FORM = [
    [(0, "7", "I7")],
    [(5, "7", "IV7")],
    [(0, "7", "I7")],
    [(9, "7", "VI7")],
    [(2, "m7", "ii7")],
    [(7, "7", "V7")],
    [(0, "7", "I7")],
    [(9, "7", "VI7")],
    [(2, "m7", "ii7")],
    [(7, "7", "V7")],
    [(0, "7", "I7"), (9, "7", "VI7")],
    [(2, "m7", "ii7"), (7, "7", "V7")],
]

CHORUSES = [
    {
        "name": "Chorus 1",
        "footnotes": [
            (1, "Blues color: b3 to 3 on Bb7; Billie’s Bounce-type opening color."),
            (4, "Guide-tone triplet into VI7; Parker-style dominant motion."),
            (6, "Dominant chord punch on F7; blues piano hit inside the line."),
            (11, "Turnaround line targets I7 then VI7; jazz-blues turnaround vocabulary."),
        ],
        "bars": [
            r"\tuplet 3/2 { e'8 g'8 bf'8 } a'8 g'8 e'8 f'8 af'8 g'8",
            "bf'8 g'8 <f' bf'>8 ef'8 g'8 bf'8 df''8 f''8",
            "e''8 d''8 bf'8 g'8 a'8 bf'8 b'8 d''8",
            r"\tuplet 3/2 { cs''8 b'8 a'8 } g'8 f'8 e'8 cs'8 e'8 g'8",
            r"\tuplet 3/2 { f'8 a'8 c''8 } d''8 ef''8 d''8 c''8 a'8 g'8",
            "b'8 d''8 <ef'' g''>8 f''8 g''8 f''8 d''8 b'8",
            "e''8 g''8 <d' f'>8 d'8 e'8 g'8 a'8 c''8",
            "cs''8 g'8 e'8 cs'8 e'8 g'8 a'8 b'8",
            r"\tuplet 3/2 { f''8 d''8 c''8 } a'8 g'8 f'8 e'8 c'8 bf8",
            "b'8 g'8 f'8 ef'8 d'8 c'8 a8 f8",
            "e'8 bf8 <d' f'>8 f'8 b'8 g'8 f'8 d'8",
            r"\tuplet 3/2 { c'8 f'8 a'8 } c''8 a8 c'8 f'8 b8 d'8",
        ],
    },
    {
        "name": "Chorus 2",
        "footnotes": [
            (1, "Bebop-style entry targeting the 3rd; Parker language."),
            (4, "Altered dominant color into G7; bebop dominant setup."),
            (9, "ii-V triplet cell resolving by guide tone; standard jazz-blues device."),
            (11, "Turnaround cell with guide-tone emphasis; common I-VI-ii-V idea."),
        ],
        "bars": [
            r"\tuplet 3/2 { e'8 g'8 a'8 } bf'8 c''8 a'8 g'8 ef'8 d'8",
            "bf'8 g'8 <bf' df''>8 c''8 df''8 c''8 bf'8 g'8",
            "e''8 a'8 bf'8 d''8 c''8 a'8 g'8 e'8",
            r"\tuplet 3/2 { cs''8 e''8 g''8 } b'8 a'8 g'8 e'8 cs'8 b8",
            "f''8 a'8 <c'' ef''>8 ef''8 d''8 c''8 a'8 g'8",
            r"\tuplet 3/2 { b'8 d''8 f''8 } af''8 g''8 f''8 d''8 b'8 a'8",
            "e''8 c''8 a'8 g'8 <f' a'>8 e'8 g'8 a'8",
            "cs''8 e''8 <e'' g''>8 g''8 f''8 e''8 cs''8 b'8",
            r"\tuplet 3/2 { f''8 c''8 a'8 } e'8 d'8 f'8 a'8 c''8 d''8",
            "b'8 g'8 f'8 d'8 <ef' g'>8 g'8 a'8 c''8",
            r"\tuplet 3/2 { e''8 bf'8 g'8 } e'8 b'8 g'8 f'8 d'8 c'8",
            "c''8 a'8 <f' a'>8 d'8 b8 d'8 f'8 a'8",
        ],
    },
    {
        "name": "Chorus 3",
        "footnotes": [
            (2, "Blues answer with a chord punch on IV7; Straight No Chaser-type riff feel."),
            (6, "Guide-tone dominant line on F7; bebop-blues dominant vocabulary."),
            (8, "VI7 setup line with chromatic color; Parker-style dominant setup."),
            (12, "ii-V turnaround resolving back to I7; standard jazz-blues cadence."),
        ],
        "bars": [
            "d''8 f''8 af''8 g''8 f''8 d''8 c''8 a'8",
            "g'8 bf'8 <df'' f''>8 ef''8 g''8 f''8 df''8 bf'8",
            r"\tuplet 3/2 { d''8 e''8 f''8 } af''8 g''8 f''8 d''8 bf'8 a'8",
            "b'8 d''8 f''8 g''8 a''8 g''8 e''8 cs''8",
            "ef''8 g''8 bf''8 c'''8 a''8 g''8 ef''8 c''8",
            "a''8 c'''8 <ef''' g'''>8 f'''8 ef'''8 c'''8 a''8 f''8",
            r"\tuplet 3/2 { d''8 f''8 g''8 } a''8 g''8 f''8 d''8 c''8 bf'8",
            "b'8 d''8 e''8 g''8 f''8 e''8 cs''8 a'8",
            "c''8 ef''8 g''8 a''8 g''8 f''8 d''8 bf'8",
            r"\tuplet 3/2 { a'8 c''8 ef''8 } f''8 ef''8 d''8 c''8 a'8 g'8",
            "d''8 f''8 <bf'' d'''>8 a''8 g''8 f''8 e''8 cs''8",
            "c''8 ef''8 g''8 a''8 b'8 d''8 f''8 a''8",
        ],
    },
    {
        "name": "Chorus 4",
        "footnotes": [
            (1, "Guide-tone triplet opening on the 3rd; bebop entry gesture."),
            (5, "ii-V language with blues color; jazz-blues mixture of bop and blues."),
            (9, "Triplet pickup into the V7 bar; Parker-like rhythmic pickup."),
            (11, "Turnaround uses chord tones plus chromatic approach; classic bop-blues close."),
        ],
        "bars": [
            r"\tuplet 3/2 { e''8 g''8 af''8 } g''8 f''8 d''8 c''8 a'8 g'8",
            "bf'8 df''8 <ef'' g''>8 af''8 g''8 f''8 df''8 bf'8",
            "d''8 f''8 af''8 bf''8 a''8 g''8 f''8 d''8",
            "b'8 d''8 g''8 f''8 e''8 cs''8 b'8 g'8",
            r"\tuplet 3/2 { ef''8 g''8 a''8 } c'''8 bf''8 g''8 ef''8 d''8 c''8",
            "a''8 c'''8 ef'''8 f'''8 <df''' f'''>8 ef'''8 c'''8 a''8",
            "d''8 g''8 a''8 g''8 f''8 d''8 c''8 a'8",
            "cs''8 e''8 g''8 a''8 g''8 e''8 cs''8 b'8",
            r"\tuplet 3/2 { c''8 ef''8 f''8 } a''8 g''8 f''8 d''8 c''8 a'8",
            "b'8 d''8 f''8 af''8 g''8 f''8 d''8 b'8",
            "d''8 <f'' bf''>8 a''8 g''8 e''8 cs''8 b'8 g'8",
            "c''8 ef''8 <g'' a''>8 f''8 d''8 b'8 a'8 f'8",
        ],
    },
]


def duration_to_lily(duration: abjad.Duration) -> str:
    mapping = {
        abjad.Duration(1, 1): "1",
        abjad.Duration(1, 2): "2",
        abjad.Duration(1, 4): "4",
        abjad.Duration(1, 8): "8",
    }
    if duration not in mapping:
        raise ValueError(f"Unsupported duration for first-pass blues module: {duration!r}")
    return mapping[duration]


def transpose_pitch_name(pitch: abjad.NamedPitch, semitone_offset: int, prefer_names: str) -> str:
    numbered = abjad.NumberedPitch(pitch).number() + semitone_offset
    transposed = abjad.NumberedPitch(numbered)
    return abjad.NamedPitch(transposed.name()).respell(prefer_names).name()


def transpose_component(component, semitone_offset: int, prefer_names: str):
    if isinstance(component, abjad.Note):
        pitch = transpose_pitch_name(component.written_pitch(), semitone_offset, prefer_names)
        return abjad.Note(f"{pitch}{duration_to_lily(component.written_duration())}")
    if isinstance(component, abjad.Chord):
        pitches = " ".join(
            transpose_pitch_name(pitch, semitone_offset, prefer_names)
            for pitch in component.written_pitches()
        )
        return abjad.Chord(f"<{pitches}>{duration_to_lily(component.written_duration())}")
    if isinstance(component, abjad.Rest):
        return abjad.Rest(f"r{duration_to_lily(component.written_duration())}")
    if isinstance(component, abjad.Tuplet):
        return abjad.Tuplet(
            component.ratio(),
            [transpose_component(child, semitone_offset, prefer_names) for child in component],
        )
    if isinstance(component, abjad.Container):
        return abjad.Container(
            [transpose_component(child, semitone_offset, prefer_names) for child in component]
        )
    raise TypeError(f"Unsupported component type: {type(component)!r}")


def make_rh_bar(template: str, semitone_offset: int, prefer_names: str) -> abjad.Container:
    parsed = abjad.Container(template)
    return transpose_component(parsed, semitone_offset, prefer_names)


def degree_pc(key_pc: int, offset: int) -> int:
    return (key_pc + offset) % 12


def chord_symbol(key_pc: int, offset: int, quality: str, prefer_names: str) -> str:
    root_name = pc_to_name(degree_pc(key_pc, offset), prefer_names)
    suffix = {"7": "7", "m7": "m7"}[quality]
    return f"{root_name}{suffix}"


def make_chord_symbol_bar(events, key_pc: int, prefer_names: str) -> abjad.Container:
    if len(events) == 1:
        container = abjad.Container([abjad.Skip("s1")])
        skip = abjad.select.leaf(container, 0)
        offset, quality, _roman = events[0]
        markup = abjad.Markup(f'"{chord_symbol(key_pc, offset, quality, prefer_names)}"')
        abjad.attach(markup, skip, direction=abjad.UP)
        return container

    container = abjad.Container([abjad.Skip("s2"), abjad.Skip("s2")])
    for skip, (offset, quality, _roman) in zip(abjad.select.leaves(container), events):
        markup = abjad.Markup(f'"{chord_symbol(key_pc, offset, quality, prefer_names)}"')
        abjad.attach(markup, skip, direction=abjad.UP)
    return container


def attach_footnote_marker(rh_bar: abjad.Container, marker: int) -> None:
    leaf = abjad.select.leaf(rh_bar, 0)
    if leaf is None:
        return
    abjad.attach(abjad.Markup(f'"[{marker}]"'), leaf, direction=abjad.DOWN)


def build_blues_score(key_name: str, chorus: dict, bpm: int = 112):
    key_pc = NAME_TO_PC[key_name]
    prefer_names = auto_prefer_for_pc(key_pc)
    semitone_offset = key_pc

    rh_voice = abjad.Voice(name="RightHand")
    chord_voice = abjad.Voice(name="ChordSymbols")

    footnotes_by_bar = {bar_number: index for index, (bar_number, _text) in enumerate(chorus.get("footnotes", []), start=1)}

    total_bar_index = 0
    for template in chorus["bars"]:
        form_events = JAZZ_BLUES_FORM[total_bar_index]
        rh_bar = make_rh_bar(template, semitone_offset, prefer_names)
        chord_bar = make_chord_symbol_bar(form_events, key_pc, prefer_names)
        marker = footnotes_by_bar.get(total_bar_index + 1)
        if marker is not None:
            attach_footnote_marker(rh_bar, marker)

        rh_voice.append(rh_bar)
        chord_voice.append(chord_bar)
        total_bar_index += 1

        if total_bar_index % 4 == 0:
            last_leaf = abjad.select.leaf(rh_bar, -1)
            abjad.attach(abjad.LilyPondLiteral(r"\break", site="after"), last_leaf)

    rh_staff = abjad.Staff([rh_voice, chord_voice], simultaneous=True, name="RH_Staff")

    rh_first = abjad.select.leaf(rh_voice, 0)

    key_lily = {"flats": {0: "c", 1: "df", 2: "d", 3: "ef", 4: "e", 5: "f", 6: "gf", 7: "g", 8: "af", 9: "a", 10: "bf", 11: "b"},
                "sharps": {0: "c", 1: "cs", 2: "d", 3: "ds", 4: "e", 5: "f", 6: "fs", 7: "g", 8: "gs", 9: "a", 10: "as", 11: "b"}}[prefer_names][key_pc]

    abjad.attach(abjad.TimeSignature((4, 4)), rh_first)
    abjad.attach(abjad.Clef("treble"), rh_first)
    abjad.attach(abjad.LilyPondLiteral(rf"\key {key_lily} \major"), rh_first)

    abjad.attach(abjad.MetronomeMark(abjad.Duration(1, 4), bpm), rh_first)

    score = abjad.Score([rh_staff], name="Score")
    return score, pc_to_name(key_pc, prefer_names)


def write_blues_lilypond(scores, title: str, outfile: str, make_pdf: bool = False, author: str | None = None, license_text: str | None = None, midi: bool = False):
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
            "page-breaking = #ly:one-page-breaking",
            "ragged-bottom = ##t",
            "ragged-last-bottom = ##t",
            "system-system-spacing.basic-distance = #14",
            "top-system-spacing.basic-distance = #12",
        ],
    )

    items = [header, paper]
    for index, (chorus_name, score, footnotes) in enumerate(scores):
        if index:
            items.append(r"\pageBreak")
        items.append(abjad.Block("markup", items=[rf'\fill-line {{ \fontsize #2 \bold "{chorus_name}" }}']))
        layout_block = abjad.Block("layout", items=["indent = 0", "short-indent = 0"])
        score_block = abjad.Block("score", items=[score, layout_block])
        if midi:
            score_block.items.append(abjad.Block("midi"))
        items.append(score_block)
        if footnotes:
            lines = [rf'"[{index}] {text}"' for index, (_bar_number, text) in enumerate(footnotes, start=1)]
            items.append(abjad.Block("markup", items=[r"\column {", *lines, "}"]))

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
    if make_pdf or midi:
        result.update(_compile_with_lilypond(Path(outfile), want_pdf=make_pdf, want_midi=midi))
    return result


def main():
    ap = argparse.ArgumentParser(description="Generate first-pass annotated jazz blues studies.")
    ap.add_argument("--keys", nargs="+", default=["Bb", "F", "C"], help="Keys to generate (default: Bb F C).")
    ap.add_argument("--output-dir", type=Path, default=Path("build/blues"), help="Directory for generated outputs (default: build/blues).")
    ap.add_argument("--pdf", action="store_true", help="Compile a PDF for each study (runs lilypond).")
    ap.add_argument("--midi", action="store_true", help="Also produce a .midi for each study (runs lilypond).")
    ap.add_argument("--bpm", type=int, default=112, help="Tempo in quarter-notes per minute (default 112).")
    ap.add_argument("--author", type=str, default="George K. Thiruvathukal", help="Author/composer name printed under the title.")
    ap.add_argument("--license", type=str, default="Creative Commons 4.0 International", help="License text printed in the footer (copyright field).")
    args = ap.parse_args()

    args.output_dir.mkdir(parents=True, exist_ok=True)
    results = []
    for key_name in args.keys:
        if key_name not in NAME_TO_PC:
            raise SystemExit(f"Unknown key: {key_name}")
        scores = []
        printable_key = None
        for chorus in CHORUSES:
            score, printable_key = build_blues_score(key_name, chorus, bpm=args.bpm)
            scores.append((chorus["name"], score, chorus.get("footnotes", [])))
        title = TITLE_BASE.format(key=printable_key)
        outfile = args.output_dir / f"blues_take_1_{sanitize_key_for_filename(printable_key)}.ly"
        result = write_blues_lilypond(
            scores,
            title,
            str(outfile),
            make_pdf=args.pdf,
            author=args.author,
            license_text=args.license,
            midi=args.midi,
        )
        results.append(result)

    print("Wrote blues study files:")
    for result in results:
        print("  ", result["ly_path"])


if __name__ == "__main__":
    main()
