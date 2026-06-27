# Jazz Scales Practice ∀ (web)

A client-side-only web app (no login, no server, no cookies) to practice jazz
scales interactively: pick a key and scale, see the notation, and play it back
with a real transport — watching the current note light up as it sounds. Built
with Vite + TypeScript, [VexFlow](https://vexflow.com) for notation, and
[smplr](https://github.com/danigb/smplr) for sampled-instrument playback.

**Live:** https://jazz-scales.gkt.sh/

The notation shows a 4/4 time signature with the scale grouped into measures
(short scales padded with rests, like the print book) and the W / H / W+H / m3 /
M3 step labels written under each note — matching the Python/Abjad book.

> **Playback never alters the chosen spelling.** The octave, feel, and accent
> controls change *how it sounds*, not the printed pitches. (The Intervals
> control does re-render the staff — it's a practice pattern of the same scale
> tones, not a re-spelling.)

## Features

- **Notation** — treble-clef render of any key × scale with step-interval labels,
  scaled responsively to the display width (crisp vector at any size, including
  phones).
- **Transport** — a single **Play / Pause / Resume** button plus **Stop**, and a
  **Loop** toggle. Driven by smplr's sequencer, so pause resumes in place and
  loops stay rhythmically even.
- **Playing-note highlight** — the note currently sounding is highlighted in the
  score, in sync through pause/resume and loop.
- **Instruments** — a curated set of General MIDI sounds grouped into Keys &
  Mallets, Guitar, Bass, and Horns & Winds.
- **Per-instrument octave** — selecting an instrument drops it into a sensible
  range (e.g. basses −2 octaves, low horns −1); an **Octave** control (−3…+3)
  lets you shift further. Playback only.
- **Feel** — a swing-ratio dropdown of presets (after Ethan Iverson's "Take a
  Swing at It"): Straight 1:1, 5-based 3:2, Triplet 2:1, Dotted 3:1, plus the
  near-straight 7-based 4:3 and 9-based 5:4. An **off-beat accent** and a
  **down-beat level** (active for any swung feel) let you dial in a backbeat.
- **Intervals** — practice the scale in diatonic interval patterns: **Steps,
  Seconds, Thirds … Sevenths**. Each is a looping two-measure phrase built from
  the scale's own tones (degree shifts, octave-wrapped — never chromatic); the
  staff re-renders to match, with scale-degree numbers under the notes. Replaces
  the old retrograde toggle (Steps already walks up *and* down).
- **Accidentals** — auto (by key), or force sharps / flats.
- **Tempo** — quarter-note BPM.
- **Dark / light theme** — toggle in the header, remembered across visits.
- **Version pill** — the header shows the app version (from `package.json`),
  linking to the GitHub releases.

## Data

The scale data is **generated from the Python model** (the single source of
truth) into `src/data/scales.json` — every key × scale resolved to note names,
octaves, MIDI numbers, interval labels, and the chord symbol. No music theory is
duplicated in TypeScript.

Regenerate it (from `projects/scales`, with that subproject's venv active):

```bash
python -m jazz_scales.export_json --output ../web/src/data/scales.json
```

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
```

Controls: **Key**, **Scale**, **Sound** (grouped GM instruments), **Octave**
(playback transpose), **Tempo (BPM)**, **Accidentals**, **Intervals** (Steps /
Seconds / Thirds … Sevenths practice patterns), and **Feel** (swing-ratio preset
+ off-beat accent + down-beat level, the last two active for any swung feel).
Transport: **Play/Pause/Resume**, **Stop**, **Loop**. Theme toggle and version
pill live in the header.

## Build / check

```bash
npm run typecheck  # tsc --noEmit
npm run build      # type check + vite build -> dist/
npm run preview    # serve the production build
```

The build is fully static (`dist/`); instrument samples are fetched on demand
from a CDN. `vite.config.ts` sets `base: "/"` (served at a domain root) and
injects the `package.json` version as `__APP_VERSION__` for the version pill.

## Deploy

`.github/workflows/deploy-web.yml` builds this app and deploys `dist/` to GitHub
Pages (Actions source) automatically on pushes to `main` that touch
`projects/web` (and on manual dispatch). The site is served at the custom
subdomain **https://jazz-scales.gkt.sh/** (`public/CNAME`).
