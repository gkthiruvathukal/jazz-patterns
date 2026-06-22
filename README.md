# Jazz Patterns

A monorepo of jazz practice material generated with [Abjad](https://abjad.github.io/) and [LilyPond](https://lilypond.org/). It contains two independent subprojects plus a small shared helper package.

```text
jazz-patterns/
  common/            jazz_common — shared pitch-class, note-naming, and LilyPond helpers
  projects/
    scales/          jazz_scales — multi-key scale charts (forward + retrograde) and a merged book
    blues/           jazz_blues  — annotated 12-bar blues studies
```

Each subproject has its own `pyproject.toml`, `build.sh`, and CI job, and depends on `jazz_common` (installed from the local path). Neither subproject depends on the other.

## Build

**Scales** (per-key PDFs/MIDI/WAV + combined `Jazz-Scales-Book.pdf`):

```bash
bash projects/scales/build.sh
```

**Blues** (annotated studies in Bb, F, C):

```bash
bash projects/blues/build.sh
```

Each script bootstraps a local `.venv`, installs `jazz-common` and the subproject, and writes outputs to that subproject's `build/` directory. See each subproject's README for requirements, options, and details:

- [`projects/scales/README.md`](projects/scales/README.md)
- [`projects/blues/README.md`](projects/blues/README.md)

## Requirements

- Python 3.9+ and Abjad 3.31+
- LilyPond (PDF / MIDI); FluidSynth (WAV, scales only)
- macOS: `brew install lilypond fluidsynth`
- Ubuntu/Debian: `sudo apt-get install -y lilypond fluidsynth`

## Citation

If you find the scales work useful, please consider citing it (see [`projects/scales/README.md`](projects/scales/README.md) for the full entry):

Thiruvathukal, George K. “Jazz Scale Patterns with Abjad and Lilypond”. 2025. https://doi.org/10.6084/m9.figshare.29887028

## Acknowledgment

I wish to acknowledge one of the great masters of jazz pedagogy, Jamey Aebersold, whose Jazz handbook (the "red book") at https://www.jazzbooks.com/jazz/FQBK is a great inspiration.
