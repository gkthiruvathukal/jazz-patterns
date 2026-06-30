# Demo-video generator

Automated, reproducible **demo videos** of the Jazz Scales Practice web app, in
both **portrait 1080×1920** (TikTok / Reels / YouTube Shorts) and **landscape
1920×1080** (regular YouTube). One script drives the live app, records a captioned
screen tour with a synthetic cursor (so menu choices are visible), renders the
**real instrument audio** for each played phrase, and muxes it into mp4s.

This is **local-only** — run it whenever you want to refresh the video for a new
version. (There is intentionally no CI workflow: it records in real time and the
result is a marketing asset you'll want to review before posting.)

## Requirements
- Node (run `npm install` here once — pulls Puppeteer/Chromium, cached after first use)
- **ffmpeg** on your `PATH` (`brew install ffmpeg`)
- Network (records the live site; smplr renders sounds from its CDNs)

## Run
```bash
cd projects/web/tools/demo
npm install
npm run proof            # short portrait validation clip -> demo-proof.mp4
npm run demo             # both: demo-portrait.mp4 + demo-landscape.mp4 (~2.5 min each to record)
npm run demo:portrait    # portrait only
npm run demo:landscape   # landscape only
```

Env knobs:
- `DEMO_URL` — target (default `https://jazz-scales.gkt.sh/`; can point at a local preview)
- `DEMO_ORIENT` — `portrait` | `landscape` | `both` (default `both`)
- `DEMO_OUT` — output path (only when building a single orientation)
- `DEMO_OUT_DIR` — directory for the default `demo-<orient>.mp4` names
- `DEMO_SYNC_OFFSET` — ms to nudge the audio earlier/later if A/V sync needs tuning

## How it works
`make-demo.mjs`: (1) Puppeteer drives the app and records a screencast for each
orientation (portrait = phone viewport / stacked layout; landscape = desktop
viewport, which fits 720px tall with no scrolling) with injected captions +
cursor + selection toasts; each Play is anchored to the on-screen note-highlight
and timestamped. (2) Each played phrase is re-rendered to a WAV with smplr
`renderOffline` — rendered **once** and reused across orientations, since the
audio is identical (headless can't capture Web Audio, so it's rendered offline).
(3) ffmpeg delays each WAV to its per-recording timestamp, mixes +
loudness-normalizes, and encodes each mp4.

The storyboard lives in the `FULL` / `SHORT` arrays at the top of `make-demo.mjs`.
The phrase-note logic (including swing) mirrors `src/sequence.ts` + `src/player.ts`;
if those change materially, update `phraseNotes()`.

## CI build check

`.github/workflows/demo-video.yml` does **not** publish anything — it runs this
generator headlessly (proof mode, against a freshly built local preview) on
changes to `projects/web`, purely so the pipeline can't silently break. A manual
`workflow_dispatch` with `mode: full` renders both orientations and uploads them
as build artifacts if you ever want a CI-built copy.
