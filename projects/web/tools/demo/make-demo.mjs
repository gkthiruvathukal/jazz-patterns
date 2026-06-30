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
// Links shown as scannable QR codes on the intro/outro cards.
const URLS = {
  sponsor: "https://github.com/sponsors/gkthiruvathukal",
  loyola: "https://loyolauniversitychicago3.my.site.com/ascendportal/s/give?dsgt=CSFUND&appeal=26Y02",
  site: "https://jazz-scales.gkt.sh/",
  slides: "https://jazz-scales.gkt.sh/slides/",
  repo: "https://github.com/gkthiruvathukal/jazz-patterns",
  ssl: "https://ssl.cs.luc.edu",
};
const FULL = [
  // --- intro cards (silent) ---
  { splash: { mark: "Dm7 · G7 · C△7", title: "Jazz Scales Practice ∀", tagline: "See it. Hear it. In every key.", author: "Created by George K. Thiruvathukal, PhD", role: "Professor of Computer Science, Loyola University Chicago" }, hold: 10000 },
  { splash: { heading: "Why I made this", lines: ["Jazz fluency means every scale and mode, in all 12 keys — not just on the page, but notated and played, with interval patterns, swing, and your choice of instrument."], foot: "Free for everyone · Open source · For players, teachers, and students." }, hold: 14000 },
  { splash: { heading: "If it helps your practice", lines: ["Please consider supporting the work — me, or the Computer Science Department at Loyola University Chicago."], links: [{ label: "Sponsor me on GitHub", url: URLS.sponsor }, { label: "Give to Loyola Computer Science", url: URLS.loyola }] }, hold: 13000 },
  // --- scales: the four families, one representative each, across keys ---
  { caption: "See any scale — in any key", set: { key: "C", scale: "Major (Ionian)" }, play: { key: "C", scale: "Major (Ionian)", pattern: "steps", ...piano } },
  { caption: "Transpose to any of 12 keys — here, F", set: { key: "F" }, play: { key: "F", scale: "Major (Ionian)", pattern: "steps", ...piano } },
  { caption: "Dozens of scales — Let's start with Dorian", set: { key: "C", scale: "Dorian" }, play: { key: "C", scale: "Dorian", pattern: "steps", ...piano } },
  { caption: "Melodic minor (jazz) scale", set: { scale: "Melodic Minor (Jazz)" }, play: { key: "C", scale: "Melodic Minor (Jazz)", pattern: "steps", ...piano } },
  { caption: "Harmonic minor scale", set: { scale: "Harmonic Minor" }, play: { key: "C", scale: "Harmonic Minor", pattern: "steps", ...piano } },
  { caption: "Whole-tone scale", set: { scale: "Whole Tone" }, play: { key: "C", scale: "Whole Tone", pattern: "steps", ...piano } },
  // --- interval patterns ---
  { caption: "Don't just run scales! Learn to think in intervals · thirds", set: { scale: "Major (Ionian)", intervals: "thirds" }, play: { key: "C", scale: "Major (Ionian)", pattern: "thirds", ...piano } },
  { caption: "Fourths — a jazz favorite (moving beyond thirds)", set: { intervals: "fourths" }, play: { key: "C", scale: "Major (Ionian)", pattern: "fourths", ...piano } },
  { caption: "…and fifths", set: { intervals: "fifths" }, play: { key: "C", scale: "Major (Ionian)", pattern: "fifths", ...piano } },
  // --- swing feel: straight eighths become long-short ---
  { caption: "Swing the eighths — a gentle 3:2", set: { intervals: "steps", feel: "5-based" }, play: { key: "C", scale: "Major (Ionian)", pattern: "steps", ...piano, feel: FEEL["5-based"] } },
  { caption: "…or a hard triplet swing (2:1)", set: { feel: "triplet" }, play: { key: "C", scale: "Major (Ionian)", pattern: "steps", ...piano, feel: FEEL.triplet } },
  // --- octave shift (playback); back to a straight feel ---
  { caption: "Shift the octave — up one", set: { feel: "straight", octave: "1" }, play: { key: "C", scale: "Major (Ionian)", pattern: "steps", ...piano, octaveShift: 1 } },
  // --- voices: a mallet and a horn, then the Salamander grand ---
  { caption: "Pick your voice — vibraphone", set: { instrument: "vibraphone" }, play: { key: "C", scale: "Major (Ionian)", pattern: "steps", instrument: "vibraphone", kind: "soundfont", bpm: 96, octaveShift: 0 } },
  { caption: "…a tenor sax", set: { scale: "Dorian", intervals: "thirds", instrument: "tenor_sax" }, play: { key: "C", scale: "Dorian", pattern: "thirds", instrument: "tenor_sax", kind: "soundfont", bpm: 96, octaveShift: -1 } },
  { caption: "…or a Salamander grand piano (based on Yamaha C)", set: { scale: "Major (Ionian)", intervals: "steps", instrument: "salamander" }, play: { key: "C", scale: "Major (Ionian)", pattern: "steps", instrument: "salamander", kind: "splendid", bpm: 96, octaveShift: 0 } },
  // --- dedication to mentors (names from projects/presentation/slides.md) ---
  { splash: { heading: "Dedicated to my music mentors and colleagues", sub: "who have inspired my interest in jazz, piano, and digital/electronic music", dense: true, lines: ["Jack Cassidy — Hutchinson Community College, Kansas", "Lara Driscoll — Loyola University Chicago", "Victor Garcia — Loyola · Victor Garcia Listening Party", "Dongryul Lee — Loyola University Chicago", "Christopher Madsen — Loyola University Chicago", "David B. Wetzel — Loyola University Chicago", "Michael Nearpass — Old Town School of Folk Music"], foot: "I've learned so much from them — this work wouldn't exist without them. Thank you." }, hold: 15000 },
  // --- outro card: where to find it (silent) ---
  { splash: { heading: "For more — and to try it free", links: [{ label: "Try it: jazz-scales.gkt.sh", url: URLS.site }, { label: "Presentation slides", url: URLS.slides }, { label: "Open source on GitHub", url: URLS.repo }], foot: "Created by George K. Thiruvathukal, PhD · MIT License" }, hold: 13000 },
  // --- final card: repeat the sponsorship ask + research lab ---
  { splash: { heading: "Please consider supporting the work", lines: ["…me, or the Computer Science Department at Loyola University Chicago."], links: [{ label: "Sponsor me on GitHub", url: URLS.sponsor }, { label: "Give to Loyola Computer Science", url: URLS.loyola }, { label: "Software and Systems Laboratory", url: URLS.ssl }], foot: "All proceeds support research in our laboratory at ssl.cs.luc.edu. Thank you!" }, hold: 14000 },
  // --- the end (bookends the title card) ---
  { splash: { mark: "Dm7 · G7 · C△7", title: "The End", tagline: "Thanks for watching — now go play." }, hold: 9000 },
];
const SHORT = [
  // Title card (no QR) + a couple of tour steps + a text outro — enough to
  // validate the splash path in the CI smoke test without extra QR network.
  { splash: { mark: "Dm7 · G7 · C△7", title: "Jazz Scales Practice ∀", tagline: "See it. Hear it. In every key.", author: "Created by George K. Thiruvathukal, PhD" }, hold: 2600 },
  { caption: "See any scale — in any key", set: { key: "C", scale: "Major (Ionian)" }, play: { key: "C", scale: "Major (Ionian)", pattern: "steps", ...piano } },
  { caption: "Hear the intervals — thirds", set: { intervals: "thirds" }, play: { key: "C", scale: "Major (Ionian)", pattern: "thirds", ...piano } },
  { caption: "Pick your voice — Salamander piano", set: { instrument: "salamander", intervals: "steps" }, play: { key: "C", scale: "Major (Ionian)", pattern: "steps", instrument: "salamander", kind: "splendid", bpm: 96, octaveShift: 0 } },
  { splash: { heading: "Try it free", lines: ["jazz-scales.gkt.sh"] }, hold: 2500 },
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
   #__toast.on{opacity:1;transform:translateY(0)}
   /* Full-screen title/why/outro cards. Sized in vmin/clamp so one definition
      reads well in both portrait (1080x1920) and landscape (1920x1080). */
   #__splash{position:fixed;inset:0;z-index:100000;background:#16181d;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:clamp(12px,2.4vmin,30px);padding:7vmin;pointer-events:none;opacity:0;visibility:hidden;transition:opacity .45s;font-family:system-ui,-apple-system,sans-serif}
   #__splash.on{opacity:1;visibility:visible}
   #__splash .mark{color:#f2b53e;font-weight:700;letter-spacing:.08em;font-size:clamp(16px,2.6vmin,32px)}
   #__splash .title{font-weight:800;font-size:clamp(34px,7vmin,86px);line-height:1.05}
   #__splash .tagline{color:#cbd2dd;font-size:clamp(18px,3.4vmin,42px)}
   #__splash .author{color:#f2b53e;font-size:clamp(15px,2.6vmin,32px);margin-top:.5em}
   #__splash .role{color:#cbd2dd;font-size:clamp(13px,2.2vmin,28px);margin-top:-.1em;text-wrap:balance}
   #__splash .heading{color:#f2b53e;font-weight:800;font-size:clamp(26px,5vmin,62px);text-wrap:balance}
   #__splash .sub{color:#cbd2dd;font-size:clamp(16px,3vmin,34px);max-width:84%;margin-top:-.2em;text-wrap:balance}
   /* text-wrap:balance evens out wrapped lines so paragraphs aren't jagged */
   #__splash .lines{display:flex;flex-direction:column;gap:.3em;font-size:clamp(18px,3.2vmin,40px);line-height:1.4;max-width:80%;text-wrap:balance}
   #__splash .lines.dense{font-size:clamp(15px,2.6vmin,30px);gap:.2em;max-width:92%} /* many lines (e.g. the dedication) */
   #__splash .foot{color:#cbd2dd;font-size:clamp(14px,2.4vmin,30px);margin-top:.7em;max-width:86%}
   #__splash .links{display:flex;gap:clamp(24px,6vmin,96px);flex-wrap:wrap;justify-content:center;margin-top:1em}
   #__splash .link{display:flex;flex-direction:column;align-items:center;gap:.7em}
   #__splash .link img{width:clamp(170px,30vmin,380px);height:auto;border-radius:12px}
   #__splash .links.three .link img{width:clamp(180px,28vmin,320px)} /* 3 codes: keep big enough to scan (the dense Loyola one), wraps 2+1 in portrait */
   #__splash .link span{font-size:clamp(13px,2.1vmin,26px);color:#fff;max-width:36vmin;word-break:break-word}`;
  const s = document.createElement("style"); s.textContent = css; document.head.append(s);
  const cap = document.createElement("div"); cap.id = "__cap"; cap.append(document.createElement("span")); document.body.append(cap);
  const cur = document.createElement("div"); cur.id = "__cur"; document.body.append(cur);
  const ring = document.createElement("div"); ring.className = "__ring"; document.body.append(ring);
  const toast = document.createElement("div"); toast.id = "__toast"; document.body.append(toast);
  const splash = document.createElement("div"); splash.id = "__splash"; document.body.append(splash);
  const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  window.__demo = {
    cap: (t) => { cap.firstChild.textContent = t || ""; cap.classList.toggle("hide", !t); },
    moveTo: (sel) => { const r = document.querySelector(sel)?.getBoundingClientRect(); if (r) { cur.style.left = (r.left + r.width / 2) + "px"; cur.style.top = (r.top + r.height / 2) + "px"; } },
    tap: () => { cur.classList.remove("tap"); void cur.offsetWidth; cur.classList.add("tap"); },
    flash: (sel) => { const r = document.querySelector(sel)?.getBoundingClientRect(); if (!r) return; ring.style.left = (r.left - 4) + "px"; ring.style.top = (r.top - 4) + "px"; ring.style.width = (r.width + 8) + "px"; ring.style.height = (r.height + 8) + "px"; ring.classList.add("on"); setTimeout(() => ring.classList.remove("on"), 900); },
    toast: (sel, text) => { const r = document.querySelector(sel)?.getBoundingClientRect(); if (!r) return; toast.textContent = text; toast.style.left = (r.left) + "px"; toast.style.top = (r.bottom + 8) + "px"; toast.classList.add("on"); setTimeout(() => toast.classList.remove("on"), 1100); },
    // Show a full-screen card built from `spec`; each link is rendered as a
    // scannable QR (generated in-page via the qrcode CDN, like smplr) plus a label.
    splash: async (spec) => {
      const parts = [];
      if (spec.mark) parts.push(`<div class="mark">${esc(spec.mark)}</div>`);
      if (spec.title) parts.push(`<div class="title">${esc(spec.title)}</div>`);
      if (spec.tagline) parts.push(`<div class="tagline">${esc(spec.tagline)}</div>`);
      if (spec.heading) parts.push(`<div class="heading">${esc(spec.heading)}</div>`);
      if (spec.sub) parts.push(`<div class="sub">${esc(spec.sub)}</div>`);
      if (spec.lines?.length) parts.push(`<div class="lines${spec.dense ? " dense" : ""}">${spec.lines.map((l) => `<div>${esc(l)}</div>`).join("")}</div>`);
      if (spec.author) parts.push(`<div class="author">${esc(spec.author)}</div>`);
      if (spec.role) parts.push(`<div class="role">${esc(spec.role)}</div>`);
      if (spec.links?.length) {
        const mod = await import("https://esm.sh/qrcode@1.5.4");
        const QR = mod.default ?? mod;
        const items = await Promise.all(spec.links.map(async (lk) => {
          // Low error-correction = fewer/bigger modules (long URLs make dense
          // codes); large native + large on-screen size survives the screencast's
          // VP8 encode AND the mp4 h264 re-encode so phones still scan it.
          const data = await QR.toDataURL(lk.url, { errorCorrectionLevel: "L", margin: 2, width: 600, color: { dark: "#16181d", light: "#f2b53e" } });
          return `<div class="link"><img src="${data}" alt=""><span>${esc(lk.label)}</span></div>`;
        }));
        parts.push(`<div class="links${spec.links.length >= 3 ? " three" : ""}">${items.join("")}</div>`);
      }
      if (spec.foot) parts.push(`<div class="foot">${esc(spec.foot)}</div>`);
      splash.innerHTML = parts.join("");
      splash.classList.add("on");
    },
    hideSplash: () => splash.classList.remove("on"),
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
  const splash = (spec) => page.evaluate((s) => window.__demo.splash(s), spec);
  const hideSplash = () => page.evaluate(() => window.__demo.hideSplash());

  // warm up the default piano so the first take's playback starts instantly
  // (clicking #play is itself the audio-unlocking gesture and preloads the font)
  await page.click("#play").catch(() => {}); await sleep(3500); await page.click("#stop").catch(() => {}); await sleep(400);
  await cap("");
  // Pre-show the opening card so frame 1 is the title, not a flash of the app.
  if (STORY[0]?.splash) await splash(STORY[0].splash);

  const raw = join(TMP, `demo-raw-${name}.webm`);
  const rec = await page.screencast({ path: raw });
  const t0 = Date.now();
  await sleep(300);

  const segments = [];
  for (const [i, step] of STORY.entries()) {
    // Per-step progress so the (real-time) recording phase isn't a silent wait.
    const label = step.splash ? (step.splash.title || step.splash.heading || "card") : step.caption;
    console.log(`  ${name} [${i + 1}/${STORY.length}] ${step.play ? "▶ " : ""}${label}  (+${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    if (step.splash) {
      await cap("");
      await splash(step.splash);
      await sleep(step.hold || 4000);
      continue;
    }
    await hideSplash();
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
  await cap(""); await hideSplash(); await sleep(500);
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
