# Jazz Scales — Interactive (web)

A client-side-only web app (no login, no server, no cookies) to explore the jazz
scales interactively: pick a key and scale, see the notation, and press play to
hear it. Built with Vite + TypeScript, [VexFlow](https://vexflow.com) for
notation, and [smplr](https://github.com/danigb/smplr) for sampled-instrument
playback.

**Live:** https://gkt.sh/jazz-patterns/

The notation shows a 4/4 time signature with the scale grouped into measures
(short scales padded with rests, like the print book) and the W / H / W+H / m3
step labels written under each note — matching the Python/Abjad book.

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

The build is fully static (`dist/`); instrument samples are fetched on demand
from a CDN. `vite.config.ts` sets `base: "./"` so it works under a subpath.

## Deploy

`.github/workflows/deploy-web.yml` builds this app and deploys `dist/` to GitHub
Pages (Actions source) automatically on pushes to `main` that touch
`projects/web` (and on manual dispatch). The site is served under the verified
`gkt.sh` domain at https://gkt.sh/jazz-patterns/.
