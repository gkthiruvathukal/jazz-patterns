# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A monorepo of two **independent** subprojects that generate printable jazz practice material with Abjad + LilyPond, plus a shared helper package:

- `common/` → **`jazz_common`** — shared pitch-class, note-naming, and LilyPond-compile helpers.
- `projects/scales/` → **`jazz_scales`** — multi-key scale charts (forward + retrograde) and a merged book.
- `projects/blues/` → **`jazz_blues`** — annotated 12-bar blues studies (separate work; keep it decoupled from scales).

Both subprojects depend on `jazz_common` (installed from the local path); **neither depends on the other**, and that boundary is intentional — do not add a `jazz_scales ↔ jazz_blues` import. Each has its own `pyproject.toml`, `build.sh`, and CI job. Outputs land in each subproject's own `build/`.

The pipeline (both subprojects): emit LilyPond `.ly` via Abjad → compile to `.pdf`/`.midi` with LilyPond → (scales only) render `.wav` with FluidSynth → (scales only) assemble a combined PDF book with cover + TOC.

## Commands

Each subproject's `build.sh` bootstraps a `.venv`, installs `jazz-common` from `../../common`, installs itself, and builds into its own `build/`.

Full scales build (per-key PDFs/MIDI/WAV + `Jazz-Scales-Book.pdf`):
```bash
bash projects/scales/build.sh
```

Full blues build (studies in Bb, F, C):
```bash
bash projects/blues/build.sh
```

For dev work, install once then run modules directly (from the subproject dir):
```bash
pip install -e ../../common && pip install -e .          # in projects/scales or projects/blues
python -m jazz_scales.generator --output-dir build --pdf --midi --bpm 96   # add --step/--count/--start/--prefer/--anchor/--mode
python -m jazz_blues.blues_take_1 --keys Bb F C --output-dir build --pdf --midi
```
Drop `--pdf`/`--midi` to emit only `.ly` (no LilyPond needed) — useful for fast iteration and for confirming imports resolve.

Scales-only extras (run from `projects/scales`):
```bash
bash src/jazz_scales/render_wavs.sh build build                            # WAV; fetches Salamander SF2 on demand into .cache/soundfonts/
MPLCONFIGDIR="$PWD/.matplotlib" MPLBACKEND=Agg python -m jazz_scales.cover --output-dir build
python -m jazz_scales.book --output-dir build
```

There is no test suite or linter configured. Verification is by inspecting generated `.ly`/PDFs/WAVs.

## System dependencies

LilyPond (PDF/MIDI), FluidSynth (WAV, scales only). macOS: `brew install lilypond fluidsynth`. Python deps: `jazz_common`/`jazz_blues` need `abjad>=3.31`; `jazz_scales` additionally needs `matplotlib`, `pypdf`, `reportlab`.

## Architecture

### Shared: `jazz_common`
- **`pitch.py`** — keys/notes are integer pitch classes 0–11. Lookup tables (`SHARP_NAMES`/`FLAT_NAMES`, `SHARP_KEYS`/`FLAT_KEYS` for LilyPond `\language "english"` tokens, `NAME_TO_PC`, `LETTER_TO_PC`) plus `pc_to_name`, `pc_to_lily_key`, `auto_prefer_for_pc` (decides flats vs sharps **per key**, not once per batch), `numbered_pitch_from_name`, `sanitize_key_for_filename`.
- **`lilypond.py`** — `compile_with_lilypond(ly_path, want_pdf, want_midi)` shells out to the `lilypond` binary and detects success by checking for output files, not exit codes alone.

### Scales: `jazz_scales`
**`generator.py` is the core.** `book.py` consumes its output.
- **`SCALES`** — the data table that drives everything. Each entry is `(name, notes, step_pattern, chord_symbol)` written **relative to C root** (e.g. `"Cmaj7"`, notes like `["C","D","E",...]`). To add/change a scale, edit this list. The `"C5"` suffix means octave 5 (above the default 4).
- **`build_score_for_key`** transposes the C-root `SCALES` by `pc_to_register_offset` (anchoring around middle C), and per scale builds a forward `make_bar` (scale name + chord above, step labels below) and a `make_retrograde_bar` (reversed pitches). Each system gets a `\break`. `write_lilypond` builds the LilyPond file and calls `compile_with_lilypond`.
- **Filename convention is load-bearing**: per-key files are `jazz_scales_abjad_<key>.ly/.pdf/.midi`, `<key>` from `sanitize_key_for_filename` (`#`→`sharp`, `b`→`flat`). `book.py` reverses it (`pretty_from_filename`) for the TOC and bookmarks — change one side, change both.
- **`book.py`** merges `cover.pdf` + a generated TOC + sorted per-key PDFs into `Jazz-Scales-Book.pdf`, computing page numbers in a two-pass build (placeholder TOC to count pages, then real TOC) and adding PDF outline bookmarks.
- `generate_single.py` / `book_single.py` are **legacy** single-key tools kept for reference; the multi-key `generator.py` + `book.py` path is current.

### Blues: `jazz_blues`
**`blues_take_1.py`** generates annotated 12-bar blues choruses. Unlike scales, bars are authored as **literal LilyPond strings** (not the `SCALES` data model), with a `JAZZ_BLUES_FORM` chord progression and per-bar footnotes; it transposes those literals by pitch class. It imports only from `jazz_common` (pitch utils + `compile_with_lilypond`). Outputs `blues_take_1_<key>.{ly,pdf,midi}`.

## CI / releases

`.github/workflows/build-book.yml` has two parallel jobs, `scales` and `blues`, each installing `./common` + its own subproject. Both run on every push/PR. Pushing a `v*` tag has each job attach its assets to the GitHub Release (scales: book PDF + per-key PDFs/WAVs; blues: study PDFs); non-tag runs upload them as CI artifacts (`jazz-scales-ci`, `jazz-blues-ci`).
