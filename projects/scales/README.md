# Common Jazz Scales (Abjad + LilyPond)

This subproject generates printable jazz scale charts, one chart per key. Each system shows a scale in forward form followed by its retrograde. Notes are beamed 8ths, the scale and chord labels appear above the staff, and the forward bar includes step-pattern labels underneath.

## Citation

If you find this useful, please consider citing it.

Thiruvathukal, George K. “Jazz Scale Patterns with Abjad and Lilypond”. 12 August 2025. Web. 26 August 2025. https://doi.org/10.6084/m9.figshare.29887028

```bibtex
@article{Thiruvathukal-Jazz-2025,
author = "George K. Thiruvathukal",
title = "{Jazz Scale Patterns with Abjad and Lilypond}",
year = "2025",
month = "8",
url = "https://figshare.com/articles/dataset/Jazz_Scale_Patterns_with_Abjad_and_Lilypond/29887028",
doi = "10.6084/m9.figshare.29887028.v5"
}
```

## What Gets Generated

- Two book organizations (`--sections`, default both):
  - **By key** — one chapter per key showing all scales; each pattern is a 2-measure system (forward bar, then retrograde bar)
  - **By scale** — one chapter per scale showing it across all 12 keys, each key a self-contained 2-measure "movement"
- Beamed 8th notes
- Scale name and compatible chord symbol above the line
- Step pattern (W / H / W+H / m3) below **both** the forward and retrograde forms
- Key-aware respelling so flat-signature charts use flats and sharp-signature charts use sharps
- Per-key `.ly`, `.pdf`, `.midi`, and `.wav` outputs in `build/`; per-scale `.pdf` chapters
- Combined book assets: `build/cover.pdf`, `build/toc.pdf`, `build/Jazz-Scales-Book.pdf`
- JSON export of the resolved model for the web app (`jazz_scales.export_json`)

Included scales:
Major (Ionian), Natural Minor (Aeolian), Harmonic Minor, Melodic Minor (Jazz), Mixolydian, Dorian, Phrygian, Lydian, Locrian, Locrian ♮2 (Half-Dim #2), Whole Tone, Octatonic (Half–Whole), Octatonic (Whole–Half), Blues (major), Blues (minor), Pentatonic Major, Pentatonic Minor, Altered, Lydian Dominant, Bebop Dominant, Mixolydian b6, Minor Pentatonic b5, Dorian b2, Bebop Major, Lydian Augmented, Dominant Pentatonic.

## Requirements

- Python 3.9+
- Abjad 3.31 or newer
- `jazz-common` (the shared helper package in `../../common`)
- LilyPond for PDF / MIDI rendering
- FluidSynth for WAV rendering
- `matplotlib`, `pypdf`, and `reportlab` for cover/book assembly

## Setup

From this directory (`projects/scales`), install the shared package and this one in a virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e ../../common
pip install -e .
```

Install system tools:

- macOS: `brew install lilypond fluidsynth`
- Ubuntu/Debian: `sudo apt-get install -y lilypond fluidsynth`

The repo fetches the Salamander Yamaha piano soundfont (`SalamanderGrandPiano-SF2-V3+20200602.sf2`) from FreePats on demand and caches it under `.cache/soundfonts/`.

## Project Structure

```text
projects/scales/
  build.sh                          full local build with venv bootstrap
  src/jazz_scales/
    generator.py                    multi-key chart generator
    cover.py                        cover PDF generator
    book.py                         merged book / TOC generator
    generate_single.py              legacy single-key generator
    book_single.py                  legacy single-book assembler
    fetch_salamander_soundfont.sh   download/cache Salamander SF2
    render_wavs.sh                  render WAVs from generated MIDI via FluidSynth
```

Shared pitch-class / LilyPond helpers live in the `jazz_common` package (`../../common`).

## Usage

Run from `projects/scales`.

Full local build with venv bootstrap (installs `jazz-common` automatically):

```bash
bash build.sh
```

Generate all keys:

```bash
python -m jazz_scales.generator \
  --output-dir build \
  --step 5 --count 12 --start C --prefer auto --anchor nearest --mode major \
  --pdf --midi --bpm 96
```

Render WAVs with Salamander:

```bash
bash src/jazz_scales/render_wavs.sh build build
```

Build the cover and merged book:

```bash
MPLCONFIGDIR="$PWD/.matplotlib" MPLBACKEND=Agg python -m jazz_scales.cover --output-dir build
python -m jazz_scales.book --output-dir build
```

Common generator options:

- `--step` semitone step between keys
- `--count` number of keys
- `--start` starting key name (`C`, `F#`, `Bb`, etc.)
- `--prefer` accidental style: `auto`, `flats`, or `sharps`
- `--anchor` register anchoring: `nearest`, `up`, or `down`
- `--mode` key-signature mode: `major` or `minor`
- `--sections` which chapters to generate: `key`, `scale`, or `both` (default `both`)
- `--pdf` compile PDFs
- `--midi` compile MIDI
- `--bpm` set print/MIDI tempo
- `--output-dir` destination for generated files, default `build`

Export the resolved model as JSON for the web app:

```bash
python -m jazz_scales.export_json --output ../web/src/data/scales.json
```

## Notes

- `--prefer auto` chooses flats or sharps per key signature, not once for the whole batch.
- Shorter patterns such as pentatonics and blues scales are padded with rests to fill a bar cleanly.
- In headless or sandboxed environments, `python -m jazz_scales.cover` is most reliable with `MPLCONFIGDIR="$PWD/.matplotlib"` and `MPLBACKEND=Agg`.
- `bash src/jazz_scales/render_wavs.sh` fetches Salamander automatically if the soundfont is not already cached.

## Acknowledgment

I wish to acknowledge one of the great masters of jazz pedagogy, Jamey Aebersold, whose Jazz handbook (the "red book") at https://www.jazzbooks.com/jazz/FQBK is a great inspiration.
