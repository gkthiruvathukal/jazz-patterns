# Jazz Scales — Interactive (web)

A client-side-only web app (no login, no server, no cookies) to explore the jazz
scales interactively: pick a key and scale, see the notation, and press play to
hear it. Built with Vite + TypeScript, [VexFlow](https://vexflow.com) for
notation, and [smplr](https://github.com/danigb/smplr) for sampled-instrument
playback.

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

- **Key / Scale** — choose what to view and play.
- **Sound** — General MIDI instrument (piano by default).
- **Tempo (BPM)** — quarter-note tempo.
- **Note value** — eighth (default) or quarter notes.
- **Retrograde** — play the scale backwards (descending).

## Build / check

```bash
npm run typecheck  # tsc --noEmit
npm run build      # type check + vite build -> dist/
npm run preview    # serve the production build
```

The build is fully static (`dist/`) and can be hosted anywhere (e.g. GitHub
Pages later). Instrument samples are fetched on demand from a CDN.
