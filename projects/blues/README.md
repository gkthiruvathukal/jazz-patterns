# Jazz Blues Studies (Abjad + LilyPond)

This subproject generates annotated 12-bar jazz blues studies (multiple choruses) transposed to a set of keys, with per-bar footnotes describing the vocabulary used. Unlike the scales subproject, the melodic content is hand-authored as literal LilyPond and transposed by pitch class.

## Requirements

- Python 3.9+
- Abjad 3.31 or newer
- `jazz-common` (the shared helper package in `../../common`)
- LilyPond for PDF / MIDI rendering

## Setup

From this directory (`projects/blues`):

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e ../../common
pip install -e .
```

Install LilyPond:

- macOS: `brew install lilypond`
- Ubuntu/Debian: `sudo apt-get install -y lilypond`

## Usage

Full local build with venv bootstrap (installs `jazz-common` automatically):

```bash
bash build.sh
```

Generate the studies directly:

```bash
python -m jazz_blues.blues_take_1 \
  --keys Bb F C \
  --output-dir build \
  --pdf --midi --bpm 112
```

Options:

- `--keys` keys to generate (default `Bb F C`)
- `--output-dir` destination for generated files (default `build/blues`)
- `--pdf` compile PDFs
- `--midi` compile MIDI
- `--bpm` tempo in quarter-notes per minute (default 112)

Outputs are named `blues_take_1_<key>.{ly,pdf,midi}`.
