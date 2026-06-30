// Automated demo-video generator for the Jazz Scales Practice web app.
//
// What it does (one reproducible pipeline):
//   1. Drives the live app and records a screencast in each requested orientation
//      — portrait 1080x1920 (phone viewport, for TikTok/Reels/Shorts) and/or
//      landscape 1920x1080 (desktop viewport, for regular YouTube) — with captions
//      and a synthetic cursor injected so menu selections are visible (a native
//      <select> popup can't be captured).
//   2. Anchors each "Play" to the on-screen note-highlight and logs its timestamp.
//   3. Renders the exact played phrase's audio offline via smplr (renderOffline)
//      to a WAV — the real instrument sound (headless can't capture Web Audio).
//      Audio is orientation-independent, so it's rendered once and reused.
//   4. ffmpeg muxes the WAVs onto each video at those timestamps, normalizes
//      loudness, and encodes the mp4(s).
//
// Requirements: Node + this dir's deps (`npm install`), and **ffmpeg** on PATH.
// Usage:  npm run demo            (full ~2-min videos -> demo-portrait.mp4 + demo-landscape.mp4)
//         npm run proof           (short portrait validation clip -> demo-proof.mp4)
//   env:  DEMO_URL (default live site), DEMO_SYNC_OFFSET (ms, audio nudge),
//         DEMO_ORIENT (portrait|landscape|both; default both),
//         DEMO_OUT (output path; only when a single orientation is built),
//         DEMO_OUT_DIR (output dir for the default demo-<orient>.mp4 names)
//
// NOTE: the phrase-note logic below mirrors src/sequence.ts + src/player.ts. If
// those change materially (pattern shapes, scheduling), update phraseNotes().
import puppeteer from "puppeteer";
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TARGET_URL = process.env.DEMO_URL || "https://jazz-scales.gkt.sh/";
const PROOF = process.argv.includes("--proof");
const OUT_DIR = process.env.DEMO_OUT_DIR || process.cwd();
const SYNC_OFFSET_MS = Number(process.env.DEMO_SYNC_OFFSET || 0);
const TMP = tmpdir();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Orientation presets. The CSS viewport × deviceScaleFactor = the screencast's
// pixel size; ffmpeg then scale/pads to the exact target. Portrait uses a phone
// viewport (stacked mobile layout); landscape uses a desktop viewport — the app
// is only ~696px tall at desktop widths, so it fits 720 with no scrolling.
const ORIENTATIONS = {
  portrait: { vw: 540, vh: 960, dsf: 2, tw: 1080, th: 1920 },
  landscape: { vw: 1280, vh: 720, dsf: 1.5, tw: 1920, th: 1080 },
};
// DEMO_ORIENT = portrait | landscape | both (default both; --proof is portrait-only).
const ORIENTS = (() => {
  const want = (process.env.DEMO_ORIENT || (PROOF ? "portrait" : "both")).toLowerCase();
  return want === "both" ? ["portrait", "landscape"] : [want];
})();
const outFor = (name) =>
  process.env.DEMO_OUT && ORIENTS.length === 1
    ? process.env.DEMO_OUT
    : join(OUT_DIR, PROOF ? "demo-proof.mp4" : `demo-${name}.mp4`);

// scales.json is the source of truth for note pitches (same data the app ships).
const scales = JSON.parse(readFileSync(new URL("../../src/data/scales.json", import.meta.url)));
const chartNotes = (key, scale) => scales.charts.find((c) => c.key === key && c.scale === scale).notes;

// ---- phrase note events: mirror of src/sequence.ts + src/player.ts (straight feel) ----
const distinct = (notes) =>
  notes.length > 1 && notes.at(-1).midi === notes[0].midi + 12 ? notes.slice(0, -1) : notes;
function patternIdx(m, pattern) {
  if (pattern === "steps") {
    const a = []; for (let d = 0; d <= 8; d++) a.push(d); for (let d = 7; d >= 1; d--) a.push(d); return a;
  }
  if (pattern === "seconds") {
    const a = []; for (let L = 0; L <= 7; L++) a.push(L, L - 1); return a;
  }
  const skip = { thirds: 2, fourths: 3, fifths: 4, sixths: 5, sevenths: 6 }[pattern];
  if (m >= 5) return [0, 1, 2, 3, 4, 3, 2, 1].flatMap((L) => [L, L + skip]);
  const a = []; for (let n = 0; a.length < 16; n++) a.push(n, n + skip); return a.slice(0, 16);
}
function phraseNotes(key, scale, pattern, bpm, octaveShift, feel) {
  const notes = distinct(chartNotes(key, scale));
  const m = notes.length;
  const wrap = (d) => ((d % m) + m) % m;
  const midi = (d) => notes[wrap(d)].midi + 12 * Math.floor(d / m) + octaveShift * 12;
  const PPQ = 480, spt = 60 / bpm / PPQ;
  // Swing: mirror src/player.ts — the off-beat ("and") falls at f = ratio/(ratio+1)
  // of the beat (straight = 0.5), playing the pair long-short, and the off-beat
  // gets a velocity accent. Down/off velocities use the app's slider defaults.
  const swing = !!feel?.swing, ratio = feel?.ratio ?? 1;
  const f = swing ? ratio / (ratio + 1) : 0.5;
  const downVel = swing ? (feel?.downbeat ?? 100) : 100;
  const offVel = swing ? Math.min(127, (feel?.downbeat ?? 100) + (feel?.accent ?? 20)) : 100;
  return patternIdx(m, pattern).map((d, i) => {
    const beat = Math.floor(i / 2), off = i % 2 === 1;
    const at = beat * PPQ + (off ? Math.round(f * PPQ) : 0);
    const dur = Math.round((off ? 1 - f : f) * PPQ);
    return { note: midi(d), time: at * spt, duration: dur * spt, velocity: off ? offVel : downVel };
  });
}

// ---- storyboard ----
// `set` keys are control element ids; values are the <option> *value* (page.select
// matches by value). Order matters within a `set`: selecting an instrument resets
// the octave to that sound's default (main.ts), so put `instrument` before any
// explicit `octave` override. Each `play.octaveShift` must equal the octave the
// app will actually use at that point (instrument default, unless overridden) so
// the rendered audio matches the on-screen notes.
const piano = { instrument: "acoustic_grand_piano", kind: "soundfont", bpm: 96, octaveShift: 0 };
// Swing feels (mirror SWING_FEELS in src/main.ts); accent/downbeat are the app's
// slider defaults. Attach one as `play.feel` to render that segment's audio swung.
const FEEL = {
  "5-based": { swing: true, ratio: 3 / 2, downbeat: 100, accent: 20 },
  triplet: { swing: true, ratio: 2, downbeat: 100, accent: 20 },
};
const FULL = [
  { caption: "Jazz Scales Practice ∀", hold: 2600 },
  // --- scales: the four families, one representative each, across keys ---
  { caption: "See any scale — in any key", set: { key: "C", scale: "Major (Ionian)" }, play: { key: "C", scale: "Major (Ionian)", pattern: "steps", ...piano } },
  { caption: "Transpose to any of 14 keys — here, F", set: { key: "F" }, play: { key: "F", scale: "Major (Ionian)", pattern: "steps", ...piano } },
  { caption: "Dozens of scales — Dorian", set: { key: "C", scale: "Dorian" }, play: { key: "C", scale: "Dorian", pattern: "steps", ...piano } },
  { caption: "Melodic minor (jazz)", set: { scale: "Melodic Minor (Jazz)" }, play: { key: "C", scale: "Melodic Minor (Jazz)", pattern: "steps", ...piano } },
  { caption: "Harmonic minor", set: { scale: "Harmonic Minor" }, play: { key: "C", scale: "Harmonic Minor", pattern: "steps", ...piano } },
  { caption: "…even whole-tone", set: { scale: "Whole Tone" }, play: { key: "C", scale: "Whole Tone", pattern: "steps", ...piano } },
  // --- interval patterns ---
  { caption: "Don't just run scales — hear the intervals · thirds", set: { scale: "Major (Ionian)", intervals: "thirds" }, play: { key: "C", scale: "Major (Ionian)", pattern: "thirds", ...piano } },
  { caption: "Fourths — a jazz favorite", set: { intervals: "fourths" }, play: { key: "C", scale: "Major (Ionian)", pattern: "fourths", ...piano } },
  { caption: "…and fifths", set: { intervals: "fifths" }, play: { key: "C", scale: "Major (Ionian)", pattern: "fifths", ...piano } },
  // --- swing feel: straight eighths become long-short ---
  { caption: "Swing the eighths — a gentle 3:2", set: { intervals: "steps", feel: "5-based" }, play: { key: "C", scale: "Major (Ionian)", pattern: "steps", ...piano, feel: FEEL["5-based"] } },
  { caption: "…or a hard triplet swing (2:1)", set: { feel: "triplet" }, play: { key: "C", scale: "Major (Ionian)", pattern: "steps", ...piano, feel: FEEL.triplet } },
  // --- octave shift (playback); back to a straight feel ---
  { caption: "Shift the octave — up one", set: { feel: "straight", octave: "1" }, play: { key: "C", scale: "Major (Ionian)", pattern: "steps", ...piano, octaveShift: 1 } },
  // --- voices: a mallet and a horn, then the Salamander grand ---
  { caption: "Pick your voice — vibraphone", set: { instrument: "vibraphone" }, play: { key: "C", scale: "Major (Ionian)", pattern: "steps", instrument: "vibraphone", kind: "soundfont", bpm: 96, octaveShift: 0 } },
  { caption: "…a tenor sax", set: { scale: "Dorian", intervals: "thirds", instrument: "tenor_sax" }, play: { key: "C", scale: "Dorian", pattern: "thirds", instrument: "tenor_sax", kind: "soundfont", bpm: 96, octaveShift: -1 } },
  { caption: "…or a Salamander grand piano", set: { scale: "Major (Ionian)", intervals: "steps", instrument: "salamander" }, play: { key: "C", scale: "Major (Ionian)", pattern: "steps", instrument: "salamander", kind: "splendid", bpm: 96, octaveShift: 0 } },
  { caption: "Free & open · install it · jazz-scales.gkt.sh", hold: 3500 },
];
const SHORT = [
  { caption: "Jazz Scales Practice ∀", hold: 2400 },
  { caption: "See any scale — in any key", set: { key: "C", scale: "Major (Ionian)" }, play: { key: "C", scale: "Major (Ionian)", pattern: "steps", ...piano } },
  { caption: "Hear the intervals — thirds", set: { intervals: "thirds" }, play: { key: "C", scale: "Major (Ionian)", pattern: "thirds", ...piano } },
  { caption: "Pick your voice — Salamander piano", set: { instrument: "salamander", intervals: "steps" }, play: { key: "C", scale: "Major (Ionian)", pattern: "steps", instrument: "salamander", kind: "splendid", bpm: 96, octaveShift: 0 } },
];
const STORY = PROOF ? SHORT : FULL;

// ---- in-page overlays: caption, synthetic cursor, click ripple, value toast ----
function injectOverlays() {
  const css = `
   #__cap{position:fixed;left:0;right:0;bottom:6%;display:flex;justify-content:center;pointer-events:none;z-index:99998;padding:0 6%}
   #__cap span{background:rgba(22,24,29,.93);color:#fff;font:600 30px/1.3 system-ui,-apple-system,sans-serif;padding:.55em .85em;border-radius:14px;border-left:6px solid #f2b53e;max-width:92%;text-align:center;box-shadow:0 8px 28px rgba(0,0,0,.45);transition:opacity .25s}
   #__cap.hide span{opacity:0}
   #__cur{position:fixed;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;background:rgba(242,181,62,.35);border:2px solid #f2b53e;z-index:99999;pointer-events:none;left:50%;top:60%;transition:left .45s cubic-bezier(.4,0,.2,1),top .45s cubic-bezier(.4,0,.2,1)}
   #__cur.tap{animation:__tap .35s ease-out}
   @keyframes __tap{0%{box-shadow:0 0 0 0 rgba(242,181,62,.5)}100%{box-shadow:0 0 0 26px rgba(242,181,62,0)}}
   .__ring{position:fixed;z-index:99997;border:3px solid #f2b53e;border-radius:8px;pointer-events:none;opacity:0;transition:opacity .2s}
   .__ring.on{opacity:1}
   #__toast{position:fixed;z-index:99999;background:#f2b53e;color:#16181d;font:700 22px system-ui,sans-serif;padding:.3em .6em;border-radius:8px;pointer-events:none;opacity:0;transform:translateY(6px);transition:opacity .2s,transform .2s;box-shadow:0 6px 18px rgba(0,0,0,.4)}
   #__toast.on{opacity:1;transform:translateY(0)}`;
  const s = document.createElement("style"); s.textContent = css; document.head.append(s);
  const cap = document.createElement("div"); cap.id = "__cap"; cap.append(document.createElement("span")); document.body.append(cap);
  const cur = document.createElement("div"); cur.id = "__cur"; document.body.append(cur);
  const ring = document.createElement("div"); ring.className = "__ring"; document.body.append(ring);
  const toast = document.createElement("div"); toast.id = "__toast"; document.body.append(toast);
  window.__demo = {
    cap: (t) => { cap.firstChild.textContent = t || ""; cap.classList.toggle("hide", !t); },
    moveTo: (sel) => { const r = document.querySelector(sel)?.getBoundingClientRect(); if (r) { cur.style.left = (r.left + r.width / 2) + "px"; cur.style.top = (r.top + r.height / 2) + "px"; } },
    tap: () => { cur.classList.remove("tap"); void cur.offsetWidth; cur.classList.add("tap"); },
    flash: (sel) => { const r = document.querySelector(sel)?.getBoundingClientRect(); if (!r) return; ring.style.left = (r.left - 4) + "px"; ring.style.top = (r.top - 4) + "px"; ring.style.width = (r.width + 8) + "px"; ring.style.height = (r.height + 8) + "px"; ring.classList.add("on"); setTimeout(() => ring.classList.remove("on"), 900); },
    toast: (sel, text) => { const r = document.querySelector(sel)?.getBoundingClientRect(); if (!r) return; toast.textContent = text; toast.style.left = (r.left) + "px"; toast.style.top = (r.bottom + 8) + "px"; toast.classList.add("on"); setTimeout(() => toast.classList.remove("on"), 1100); },
  };
}

const CONTROL_LABEL = { key: "Key", scale: "Scale", intervals: "Intervals", instrument: "Sound", feel: "Feel", octave: "Octave" };

// Record one orientation: drive the storyboard at its viewport, screencast to a
// per-orientation raw webm, and return the timed segments (each play's tStart is
// measured against this recording, so it differs per orientation).
async function record(browser, name) {
  const o = ORIENTATIONS[name];
  const page = await browser.newPage();
  await page.setViewport({ width: o.vw, height: o.vh, deviceScaleFactor: o.dsf });
  await page.goto(TARGET_URL, { waitUntil: "networkidle2" });
  await page.evaluate(() => document.fonts.ready);
  await sleep(700);
  await page.evaluate(injectOverlays);

  const cur = (sel) => page.evaluate((s) => window.__demo.moveTo(s), sel);
  const tap = () => page.evaluate(() => window.__demo.tap());
  const cap = (t) => page.evaluate((t) => window.__demo.cap(t), t);

  // warm up the default piano so the first take's playback starts instantly
  // (clicking #play is itself the audio-unlocking gesture and preloads the font)
  await page.click("#play").catch(() => {}); await sleep(3500); await page.click("#stop").catch(() => {}); await sleep(400);
  await cap("");

  const raw = join(TMP, `demo-raw-${name}.webm`);
  const rec = await page.screencast({ path: raw });
  const t0 = Date.now();
  await sleep(300);

  const segments = [];
  for (const step of STORY) {
    await cap(step.caption);
    if (step.set) {
      for (const [id, val] of Object.entries(step.set)) {
        await cur("#" + id); await sleep(550); await tap();
        await page.select("#" + id, val);
        await page.evaluate((id) => document.getElementById(id).dispatchEvent(new Event("change")), id);
        const shown = await page.$eval("#" + id + " option:checked", (o) => o.textContent).catch(() => val);
        await page.evaluate((sel, text) => { window.__demo.flash(sel); window.__demo.toast(sel, text); }, "#" + id, `${CONTROL_LABEL[id] || id} → ${shown}`);
        await sleep(900);
      }
    }
    if (step.play) {
      await cur("#play"); await sleep(450); await tap();
      await page.evaluate(() => { const h = document.querySelector(".note-highlight"); if (h) h.style.display = "none"; });
      await page.click("#play");
      await page.waitForFunction(() => { const h = document.querySelector(".note-highlight"); return h && h.style.display === "block"; }, { timeout: 12000 }).catch(() => {});
      const tStart = Date.now() - t0;
      const notes = phraseNotes(step.play.key, step.play.scale, step.play.pattern, step.play.bpm, step.play.octaveShift, step.play.feel);
      const dur = notes.at(-1).time + notes.at(-1).duration + 1.0;
      segments.push({ tStart, notes, instrument: step.play.instrument, kind: step.play.kind, dur });
      await sleep(dur * 1000 + 300);
    } else if (step.hold) {
      await sleep(step.hold);
    }
  }
  await cap(""); await sleep(400);
  await rec.stop();
  await page.close();
  return { name, raw, segments, target: o };
}

// Render each played phrase's audio offline (real instrument sound) to a WAV.
// The phrases are identical across orientations, so this runs once and both muxes
// reuse the WAVs — the slow Salamander load never repeats.
async function renderAudio(browser, segments) {
  console.log(`rendering audio for ${segments.length} segments…`);
  const audio = await browser.newPage();
  await audio.goto(TARGET_URL, { waitUntil: "domcontentloaded" });
  const wavs = [];
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    const b64 = await audio.evaluate(async (notes, instrument, kind, dur) => {
      const smplr = await import("https://esm.sh/smplr@1.0.0");
      // smplr defers future note-ons to a wall-clock lookahead scheduler (200ms),
      // which never fires during a synchronous offline render — so only the t=0
      // note would sound. Inject an immediate scheduler: dispatch every note-on
      // synchronously. The note-OFF is sample-accurate inside the player
      // (source.stop(time+duration)), so per-note timing and durations are exact.
      const immediate = { schedule: (e, cb) => { cb(e); return () => {}; }, stop() {}, clear() {} };
      const res = await smplr.renderOffline(async (ctx) => {
        const inst = kind === "splendid"
          ? new smplr.SplendidGrandPiano(ctx, { scheduler: immediate })
          : new smplr.Soundfont(ctx, { instrument, scheduler: immediate });
        await inst.load;
        for (const n of notes) inst.start(n);
      }, { duration: dur });
      const buf = new Uint8Array(await smplr.audioBufferToWav16(res.audioBuffer).arrayBuffer());
      let str = ""; for (let j = 0; j < buf.length; j++) str += String.fromCharCode(buf[j]);
      return btoa(str);
    }, s.notes, s.instrument, s.kind, s.dur);
    const wav = join(TMP, `demo-seg-${i}.wav`);
    writeFileSync(wav, Buffer.from(b64, "base64"));
    wavs.push(wav);
    console.log(`  seg ${i}: ${s.instrument} @ ${s.dur.toFixed(1)}s`);
  }
  await audio.close();
  return wavs;
}

// Mux one recording: scale/pad the raw video to the orientation's target, then
// delay each phrase's WAV to its tStart (in THIS recording), mix + normalize.
function mux(rec, wavs, out) {
  const { raw, segments, target } = rec;
  const inputs = ["-y", "-i", raw];
  wavs.forEach((w) => inputs.push("-i", w));
  let fc = `[0:v]scale=${target.tw}:${target.th}:force_original_aspect_ratio=decrease,pad=${target.tw}:${target.th}:(ow-iw)/2:(oh-ih)/2:color=#16181d,format=yuv420p[v];`;
  if (wavs.length) {
    segments.forEach((s, i) => { const d = Math.max(0, Math.round(s.tStart + SYNC_OFFSET_MS)); fc += `[${i + 1}:a]adelay=${d}|${d}[a${i}];`; });
    fc += segments.map((_, i) => `[a${i}]`).join("") + `amix=inputs=${segments.length}:normalize=0:dropout_transition=0[mix];[mix]loudnorm=I=-14:TP=-1.5:LRA=11[a]`;
  }
  const args = [...inputs, "-filter_complex", fc, "-map", "[v]"];
  if (wavs.length) args.push("-map", "[a]", "-c:a", "aac", "-b:a", "192k");
  args.push("-r", "30", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-movflags", "+faststart", out);
  console.log(`muxing ${rec.name} -> ${out} …`);
  execFileSync("ffmpeg", args, { stdio: "ignore" });
  console.log("done ->", out);
}

async function run() {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
  // Record each requested orientation (the storyboard runs in real time per take).
  const recs = [];
  for (const name of ORIENTS) {
    console.log(`recording ${name} (${ORIENTATIONS[name].tw}x${ORIENTATIONS[name].th})…`);
    recs.push(await record(browser, name));
  }
  // Audio is orientation-independent — render once from the first take's phrases.
  const wavs = await renderAudio(browser, recs[0].segments);
  await browser.close();
  // Mux each orientation with its own timing.
  for (const rec of recs) mux(rec, wavs, outFor(rec.name));
}

run().catch((e) => { console.error(e); process.exit(1); });
