# Jazz Patterns

A monorepo of jazz practice material: static notation/audio generated with [Abjad](https://abjad.github.io/) and [LilyPond](https://lilypond.org/), plus an interactive web app. It contains three independent subprojects and a small shared helper package.

**Interactive app (live):** https://jazz-scales.gkt.sh/ · **Slides (work in progress):** https://jazz-scales.gkt.sh/slides/

```text
jazz-patterns/
  common/            jazz_common — shared pitch-class, note-naming, and LilyPond helpers
  projects/
    scales/          jazz_scales — multi-key scale charts (forward + retrograde) and a merged book
    blues/           jazz_blues  — annotated 12-bar blues studies
    web/             interactive client-side web app (TypeScript + Vite)
    presentation/    Marp (Markdown) slide deck about the project → /slides
```

The Python subprojects each have their own `pyproject.toml`, `build.sh`, and CI job, and depend on `jazz_common` (installed from the local path). The `web` app is an independent TypeScript subproject (Vite) that renders and plays a JSON exported from the Python scales model. No subproject depends on another's code.

## Build

**Scales** (per-key PDFs/MIDI/WAV + combined `Jazz-Scales-Book.pdf`):

```bash
bash projects/scales/build.sh
```

**Blues** (annotated studies in Bb, F, C):

```bash
bash projects/blues/build.sh
```

Each Python script bootstraps a local `.venv`, installs `jazz-common` and the subproject, and writes outputs to that subproject's `build/` directory.

**Web** (interactive app — [live at jazz-scales.gkt.sh](https://jazz-scales.gkt.sh/)): pick a key/scale, see the notation, and play it back — transport (play/pause, stop, loop), a current-note highlight, selectable instruments (including a Salamander grand piano) with per-instrument octave, an adjustable swing feel, and diatonic interval-practice patterns (thirds, fourths, …). It's an **installable PWA that works offline** — cache the sounds you want for no-internet use. See [`projects/web/README.md`](projects/web/README.md) for the full feature list.

```bash
cd projects/web && npm install && npm run dev
```

The web app auto-deploys to GitHub Pages on pushes to `main` that touch `projects/web` (`.github/workflows/deploy-web.yml`).

See each subproject's README for requirements, options, and details:

- [`projects/scales/README.md`](projects/scales/README.md)
- [`projects/blues/README.md`](projects/blues/README.md)
- [`projects/web/README.md`](projects/web/README.md)

## Requirements

- Python 3.9+ and Abjad 3.31+ (scales, blues)
- LilyPond (PDF / MIDI); FluidSynth (WAV, scales only)
- macOS: `brew install lilypond fluidsynth`
- Ubuntu/Debian: `sudo apt-get install -y lilypond fluidsynth`
- Node.js 18+ (web app only)

## Citation

If you find the scales work useful, please consider citing it (see [`projects/scales/README.md`](projects/scales/README.md) for the full entry):

Thiruvathukal, George K. “Jazz Scale Patterns with Abjad and Lilypond”. 2025. https://doi.org/10.6084/m9.figshare.29887028

## Acknowledgments

I wish to acknowledge one of the great masters of jazz pedagogy, Jamey Aebersold, whose Jazz Handbook (the "red book") at https://www.jazzbooks.com/jazz/FQBK is a great inspiration.

### Jazz mentors and music colleagues

I've learned so much from all of them these past few years — this work would not exist without them. Thank you.

- **[Jack Cassidy](https://www.linkedin.com/in/dr-jack-cassidy-605428232/)** — my first jazz mentor (Old Town School of Folk Music).
- **[Lara Driscoll](https://laradriscoll.com)** — my piano teacher (Loyola University Chicago).
- **[Victor Garcia](https://victorgarciamusic.com/)** — mentor (Loyola University Chicago); bandleader, *Victor Garcia's Listening Party*.
- **[Dongryul Lee](https://www.luc.edu/dfpa/facultyandstaffdirectory/profiles/dongryulleedma.shtml)** — my composition teacher (Loyola University Chicago).
- **[Christopher Madsen](https://www.luc.edu/dfpa/facultyandstaffdirectory/profiles/christophermadsendma.shtml)** — Director, Jazz Studies (Loyola University Chicago).
- **[Michael Nearpass](https://www.oldtownschool.org/teachers/Michael-Nearpass/)** — my current mentor (Old Town School of Folk Music).
- **[David B. Wetzel](https://www.luc.edu/dfpa/facultyandstaffdirectory/profiles/davidwetzeldma.shtml)** — teaching collaborator in digital and electronic music (Loyola University Chicago).

### Argonne National Laboratory

Beyond the music — the colleagues who back my (sometimes crazy) ideas and help turn them into great research.

- **[Janet Knowles](https://www.alcf.anl.gov/about/people/janet-knowles)** — Principal Software Development Specialist, ALCF; a fellow musician whose encouragement means a great deal.
- **[Victor Mateevitsi](https://www.alcf.anl.gov/about/people/victor-mateevitsi)** — Computer Scientist, ALCF; collaborator with me and my PhD student **[Nicholas Synovic](https://github.com/NicholasSynovic)**.
- **[Mike Papka](https://www.anl.gov/profile/michael-e-papka)** — Director of the Argonne Leadership Computing Facility.
- **[Silvio Rizzi](https://www.alcf.anl.gov/about/people/silvio-rizzi)** — Computer Scientist, ALCF; my collaborator of several years on HPC education and research.
- **[Shilpika](https://www.alcf.anl.gov/about/people/shilpika)** — my former graduate student in Software Engineering, now a computational scientist working on visualization.
