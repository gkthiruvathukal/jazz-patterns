// Entry point: populate controls, render notation, and drive playback.
import { scalesData, findChart, type Chart } from "./data/scales";
import { renderChart, type NoteHighlighter } from "./notation";
import { INTERVAL_PATTERNS, sequenceForChart } from "./sequence";
import {
  play,
  stop,
  togglePause,
  setLoop,
  getState,
  onStateChange,
  onNote,
  primeAudio,
  type InstrumentKind,
  type SequenceSpec,
  type TransportState,
} from "./player";
import * as offline from "./offline";

// A curated set of GM soundfont instruments, grouped for the dropdown. Piano is
// the default; adding more is just another entry here (smplr loads them by name —
// any General MIDI name works, see smplr's getSoundfontNames()).
// `octave` is the sensible default playback transposition (in octaves) for each
// instrument, since the notation sits in the treble staff: basses drop a couple
// octaves, low horns one. It only shifts the audio, never the printed notes.
type Instrument = { name: string; label: string; group: string; octave: number; kind?: InstrumentKind };
const INSTRUMENTS: Instrument[] = [
  { group: "Keys & Mallets", name: "acoustic_grand_piano", label: "Acoustic Grand Piano", octave: 0 },
  { group: "Keys & Mallets", name: "salamander", label: "Grand Piano (Salamander)", octave: 0, kind: "splendid" },
  { group: "Keys & Mallets", name: "electric_piano_1", label: "Electric Piano", octave: 0 },
  { group: "Keys & Mallets", name: "vibraphone", label: "Vibraphone", octave: 0 },
  { group: "Keys & Mallets", name: "marimba", label: "Marimba", octave: 0 },
  { group: "Guitar", name: "acoustic_guitar_nylon", label: "Nylon Guitar", octave: 0 },
  { group: "Guitar", name: "electric_guitar_jazz", label: "Jazz Guitar", octave: 0 },
  { group: "Bass", name: "acoustic_bass", label: "Upright Bass", octave: -2 },
  { group: "Bass", name: "electric_bass_finger", label: "Electric Bass", octave: -2 },
  { group: "Bass", name: "fretless_bass", label: "Fretless Bass", octave: -2 },
  { group: "Horns & Winds", name: "trumpet", label: "Trumpet", octave: 0 },
  { group: "Horns & Winds", name: "muted_trumpet", label: "Muted Trumpet", octave: 0 },
  { group: "Horns & Winds", name: "trombone", label: "Trombone", octave: -1 },
  { group: "Horns & Winds", name: "alto_sax", label: "Alto Sax", octave: 0 },
  { group: "Horns & Winds", name: "tenor_sax", label: "Tenor Sax", octave: -1 },
  { group: "Horns & Winds", name: "flute", label: "Flute", octave: 0 },
  { group: "Horns & Winds", name: "clarinet", label: "Clarinet", octave: 0 },
];

function defaultOctaveFor(name: string): number {
  return INSTRUMENTS.find((i) => i.name === name)?.octave ?? 0;
}

function kindFor(name: string): InstrumentKind {
  return INSTRUMENTS.find((i) => i.name === name)?.kind ?? "soundfont";
}

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node as T;
}

// Version pill — sourced from package.json via Vite's `define` (see vite.config.ts).
el("version-pill").textContent = `v${__APP_VERSION__}`;

// Theme toggle — defaults to system preference, persists in localStorage.
const themeToggle = el<HTMLButtonElement>("theme-toggle");
const root = document.documentElement;

function applyTheme(dark: boolean): void {
  root.dataset.theme = dark ? "dark" : "light";
  themeToggle.textContent = dark ? "☀️" : "🌙";
}

const storedTheme = localStorage.getItem("theme");
const prefersDark = storedTheme
  ? storedTheme === "dark"
  : window.matchMedia("(prefers-color-scheme: dark)").matches;
applyTheme(prefersDark);

themeToggle.addEventListener("click", () => {
  const dark = root.dataset.theme !== "dark";
  applyTheme(dark);
  localStorage.setItem("theme", dark ? "dark" : "light");
});

// Swing "feel" presets — the long:short ratio of the eighth-note pair, after
// Ethan Iverson's "Take a Swing at It." The player derives the off-beat fraction
// as ratio/(ratio+1); Straight (swing:false) plays even eighths with uniform
// velocity (no accent). Order is prominent feels first, with the two
// nearly-straight feels (4:3, 5:4) last.
type SwingFeel = { id: string; label: string; ratio: number; swing: boolean };
const SWING_FEELS: SwingFeel[] = [
  { id: "straight", label: "Straight (1:1)", ratio: 1, swing: false },
  { id: "5-based", label: "5-based (3:2)", ratio: 3 / 2, swing: true },
  { id: "triplet", label: "Triplet (2:1)", ratio: 2, swing: true },
  { id: "dotted", label: "Dotted (3:1)", ratio: 3, swing: true },
  { id: "7-based", label: "7-based (4:3)", ratio: 4 / 3, swing: true },
  { id: "9-based", label: "9-based (5:4)", ratio: 5 / 4, swing: true },
];

const keySelect = el<HTMLSelectElement>("key");
const scaleSelect = el<HTMLSelectElement>("scale");
const instrumentSelect = el<HTMLSelectElement>("instrument");
const octaveSelect = el<HTMLSelectElement>("octave");
const bpmInput = el<HTMLInputElement>("bpm");
const preferSelect = el<HTMLSelectElement>("prefer");
const intervalsSelect = el<HTMLSelectElement>("intervals");
const feelSelect = el<HTMLSelectElement>("feel");
const accentInput = el<HTMLInputElement>("accent");
const accentVal = el<HTMLSpanElement>("accent-val");
const downbeatInput = el<HTMLInputElement>("downbeat");
const downbeatVal = el<HTMLSpanElement>("downbeat-val");
const playButton = el<HTMLButtonElement>("play");
const stopButton = el<HTMLButtonElement>("stop");
const loopButton = el<HTMLButtonElement>("loop");
const offlineToggle = el<HTMLButtonElement>("offline-toggle");
const offlineDialog = el<HTMLDialogElement>("offline-dialog");
const offlineList = el<HTMLDivElement>("offline-list");
const offlineUsage = el<HTMLSpanElement>("offline-usage");
const downloadAllBtn = el<HTMLButtonElement>("offline-download-all");
const installBtn = el<HTMLButtonElement>("install-btn");
const installHint = el<HTMLParagraphElement>("install-hint");
const nowPlaying = el<HTMLParagraphElement>("now-playing");
const notation = el<HTMLDivElement>("notation");
const status = el<HTMLParagraphElement>("status");

function fillSelect(select: HTMLSelectElement, options: { value: string; label: string }[]): void {
  select.innerHTML = "";
  for (const opt of options) {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.label;
    select.append(option);
  }
}

// Populate the instrument select with <optgroup>s, preserving INSTRUMENTS order.
function fillInstruments(select: HTMLSelectElement): void {
  select.innerHTML = "";
  const groups = new Map<string, Instrument[]>();
  for (const inst of INSTRUMENTS) {
    const list = groups.get(inst.group) ?? [];
    list.push(inst);
    groups.set(inst.group, list);
  }
  for (const [group, items] of groups) {
    const optgroup = document.createElement("optgroup");
    optgroup.label = group;
    for (const inst of items) {
      const option = document.createElement("option");
      option.value = inst.name;
      option.textContent = inst.label;
      optgroup.append(option);
    }
    select.append(optgroup);
  }
}

// Scale-select grouping — minor headings per parent-scale family, in the order
// they appear in the source modal charts ("Jazz Scales and their Modes"; see
// SCALE-INVENTORY.md). `present` names must match scales.json exactly;
// `placeholders` are modes not yet in the model, rendered disabled. Any scale in
// the data not listed here falls through to "Other scales", so nothing is ever
// dropped when SCALES changes.
//
// Placeholders are kept here as a roadmap (see SCALE-INVENTORY.md) but hidden
// from the menu while SHOW_PLACEHOLDERS is false — flip it to true to surface
// the not-yet-added modes as disabled "coming soon" entries.
const SHOW_PLACEHOLDERS = false;
const SCALE_GROUPS: { label: string; present: string[]; placeholders: string[] }[] = [
  {
    label: "Major scale modes",
    present: ["Major (Ionian)", "Dorian", "Phrygian", "Lydian", "Dominant 7th (Mixolydian)", "Natural Minor (Aeolian)", "Locrian"],
    placeholders: [],
  },
  {
    label: "Melodic minor modes",
    present: ["Melodic Minor (Jazz)", "Dorian b2", "Lydian Augmented", "Lydian Dominant", "Mixolydian b6", "Half-Dim #2 (Locrian ♮2)", "Altered"],
    placeholders: [],
  },
  {
    label: "Harmonic minor modes",
    present: ["Harmonic Minor"],
    placeholders: ["Locrian ♮6", "Ionian Augmented", "Dorian ♯4", "Phrygian Dominant", "Lydian ♯2", "Super Locrian ♭♭7"],
  },
  {
    label: "Harmonic major modes",
    present: [],
    placeholders: ["Harmonic Major", "Locrian ♮2 ♮6", "Altered Dominant ♮5", "Lydian ♭3", "Mixolydian ♭2", "Lydian Augmented ♯2", "Locrian ♭♭7"],
  },
];

// Populate the scale select with <optgroup> family headings (SCALE_GROUPS
// order), disabled "coming soon" placeholders for not-yet-added modes, and an
// "Other scales" group for anything in the data not assigned to a family.
function fillScales(select: HTMLSelectElement): void {
  select.innerHTML = "";
  const available = new Set(scalesData.scales.map((s) => s.name));
  const grouped = new Set<string>();

  const addGroup = (label: string, present: string[], placeholders: string[] = []): void => {
    const optgroup = document.createElement("optgroup");
    optgroup.label = label;
    for (const name of present) {
      if (!available.has(name)) continue; // skip names missing from scales.json
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      optgroup.append(option);
    }
    if (SHOW_PLACEHOLDERS) {
      for (const name of placeholders) {
        const option = document.createElement("option");
        option.textContent = `${name} — coming soon`;
        option.disabled = true;
        optgroup.append(option);
      }
    }
    if (optgroup.childElementCount > 0) select.append(optgroup);
  };

  for (const group of SCALE_GROUPS) {
    group.present.forEach((name) => grouped.add(name));
    addGroup(group.label, group.present, group.placeholders);
  }

  const others = scalesData.scales.map((s) => s.name).filter((name) => !grouped.has(name));
  if (others.length > 0) addGroup("Other scales", others);
}

fillSelect(keySelect, scalesData.keys.map((k) => ({ value: k, label: k })));
fillScales(scaleSelect);
fillInstruments(instrumentSelect);
fillSelect(feelSelect, SWING_FEELS.map((feel) => ({ value: feel.id, label: feel.label })));
fillSelect(intervalsSelect, INTERVAL_PATTERNS.map((p) => ({ value: p.id, label: p.label })));

// Octave shift options (playback only): −3 … +3, labelled with explicit signs.
fillSelect(
  octaveSelect,
  [-3, -2, -1, 0, 1, 2, 3].map((n) => ({
    value: String(n),
    label: n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0",
  })),
);
octaveSelect.value = String(defaultOctaveFor(instrumentSelect.value));

function setStatus(message: string): void {
  status.textContent = message;
}

function clampedBpm(): number {
  const value = Number.parseInt(bpmInput.value, 10);
  if (Number.isNaN(value)) return 96;
  return Math.min(240, Math.max(40, value));
}

function currentChart(): Chart | undefined {
  return findChart(keySelect.value, scaleSelect.value);
}

let loopOn = false;

function currentFeel(): SwingFeel {
  return SWING_FEELS.find((feel) => feel.id === feelSelect.value) ?? SWING_FEELS[0];
}

function currentSpec(): SequenceSpec | undefined {
  const chart = currentChart();
  if (!chart) return undefined;
  const feel = currentFeel();
  const { notes } = sequenceForChart(chart, intervalsSelect.value);
  return {
    notes,
    bpm: clampedBpm(),
    instrument: instrumentSelect.value,
    kind: kindFor(instrumentSelect.value),
    loop: loopOn,
    octaveShift: Number(octaveSelect.value),
    swing: feel.swing,
    swingRatio: feel.ratio,
    accent: Number(accentInput.value),
    downbeat: Number(downbeatInput.value),
  };
}

// Current score's highlighter, replaced on every render. Drives the playhead.
let highlighter: NoteHighlighter | null = null;

function render(): void {
  const chart = currentChart();
  if (!chart) return;
  const patternId = intervalsSelect.value;
  const { notes, labels } = sequenceForChart(chart, patternId);
  const pattern = INTERVAL_PATTERNS.find((p) => p.id === patternId);
  const suffix = pattern && pattern.id !== "steps" ? ` &middot; ${pattern.label.toLowerCase()}` : "";
  nowPlaying.innerHTML = `<span class="chord">${chart.chord}</span> &mdash; ${chart.key} ${chart.scale}${suffix}`;
  highlighter = renderChart(notation, notes, labels, preferSelect.value as "auto" | "sharps" | "flats");
}

// Light up the note as it sounds (index is in playback order).
onNote((index) => highlighter?.highlight(index));

// Inline transport icons (SVG paths); fill comes from currentColor.
const ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>';

// Keep the Play/Pause icon, accessible label, and status in sync with the transport.
function reflectState(state: TransportState): void {
  const playing = state === "playing";
  playButton.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
  const label = playing ? "Pause" : state === "paused" ? "Resume" : "Play";
  playButton.setAttribute("aria-label", label);
  playButton.title = label;
  setStatus(playing ? "Playing…" : state === "paused" ? "Paused" : "");
  if (state === "stopped") highlighter?.clear(); // paused holds on the current note
}
onStateChange(reflectState);

// One button toggles Play ⇄ Pause/Resume. From a stopped state it builds a fresh
// sequence from the current controls; otherwise it pauses/resumes in place.
playButton.addEventListener("click", async () => {
  if (getState() !== "stopped") {
    togglePause();
    return;
  }
  const spec = currentSpec();
  if (!spec) return;
  playButton.disabled = true; // play icon stays; the status line shows progress
  setStatus("Loading sound…");
  try {
    // play() awaits the soundfont before starting, so a failed/timed-out load
    // throws here and nothing is ever played.
    await play(spec);
  } catch (error) {
    setStatus(`⚠️ ${(error as Error).message || "Couldn't load the sound"} — check your connection and tap Play to retry.`);
  } finally {
    playButton.disabled = false;
  }
});

// Mobile audio unlock: on the very first user gesture anywhere, create + resume
// the AudioContext and preload the selected instrument, so the first Play is
// already armed. Without this, the soundfont fetch during the first tap can
// outlast the gesture's audio activation on iOS/Android, leaving it silent.
window.addEventListener(
  "pointerdown",
  () => void primeAudio(instrumentSelect.value, kindFor(instrumentSelect.value)),
  { once: true },
);

stopButton.addEventListener("click", () => stop());

loopButton.addEventListener("click", () => {
  loopOn = !loopOn;
  setLoop(loopOn); // applies to the current run if one is playing
  loopButton.classList.toggle("active", loopOn);
  loopButton.setAttribute("aria-pressed", String(loopOn));
});

// Changing what or how we play resets the transport so the next Play rebuilds it.
function changeAndStop(): void {
  stop();
  render();
}
keySelect.addEventListener("change", changeAndStop);
scaleSelect.addEventListener("change", changeAndStop);
intervalsSelect.addEventListener("change", changeAndStop);
instrumentSelect.addEventListener("change", () => {
  octaveSelect.value = String(defaultOctaveFor(instrumentSelect.value)); // sensible default per sound
  void primeAudio(instrumentSelect.value, kindFor(instrumentSelect.value)); // preload the newly chosen sound (this change is a user gesture)
  stop();
});
octaveSelect.addEventListener("change", stop);
bpmInput.addEventListener("change", stop);
preferSelect.addEventListener("change", render); // spelling only — no audio impact

// Feel: the accent/down-beat sliders apply only to a swung feel; on Straight
// (1:1) playback is even with uniform velocity, so they're disabled. All three
// are audio-only — they never change the printed notes.
function syncFeelEnabled(): void {
  const swung = currentFeel().swing;
  accentInput.disabled = !swung;
  downbeatInput.disabled = !swung;
}
feelSelect.addEventListener("change", () => {
  syncFeelEnabled();
  stop();
});
accentInput.addEventListener("input", () => {
  accentVal.textContent = accentInput.value;
});
downbeatInput.addEventListener("input", () => {
  downbeatVal.textContent = downbeatInput.value;
});
accentInput.addEventListener("change", stop);
downbeatInput.addEventListener("change", stop);
syncFeelEnabled(); // accent/down-beat start disabled (Straight by default)

// ---- Offline-sounds picker: choose which instruments to cache for offline use ----
async function updateOfflineUsage(): Promise<void> {
  const mb = (await offline.usageBytes()) / (1024 * 1024);
  offlineUsage.textContent = mb >= 0.1 ? `Using ${mb.toFixed(1)} MB offline` : "";
}

// One self-updating row. Download/remove mutate only this row's button + size
// in place (via sync) — the list is never torn down and rebuilt, so the panel
// doesn't flicker or jump when you download a sound.
type OfflineRow = { el: HTMLDivElement; sync: () => Promise<void>; download: () => Promise<void> };

function makeOfflineRow(inst: Instrument): OfflineRow {
  const kind = inst.kind ?? "soundfont";
  const el = document.createElement("div");
  el.className = "offline-row";
  const name = document.createElement("span");
  name.className = "offline-name";
  name.textContent = inst.label;
  const size = document.createElement("span");
  size.className = "offline-size";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Download";
  el.append(name, size, btn);

  async function sync(): Promise<void> {
    const cached = await offline.isCached(inst.name, kind);
    const online = navigator.onLine;
    size.textContent = cached ? "✓ offline" : `~${offline.estimatedMB(kind)} MB`;
    btn.textContent = cached ? "Remove" : "Download";
    btn.disabled = !cached && !online;
    btn.title = !cached && !online ? "Connect to the internet to download" : "";
    btn.onclick = cached ? remove : download;
  }

  async function download(): Promise<void> {
    if (await offline.isCached(inst.name, kind)) return;
    btn.disabled = true;
    btn.textContent = "Downloading…";
    size.textContent = "…";
    try {
      await offline.download(inst.name, kind);
    } catch {
      btn.disabled = false;
      btn.textContent = "Retry";
      size.textContent = `~${offline.estimatedMB(kind)} MB`;
      btn.onclick = download;
      return;
    }
    await sync();
    await updateOfflineUsage();
  }

  async function remove(): Promise<void> {
    btn.disabled = true;
    btn.textContent = "Removing…";
    await offline.remove(inst.name, kind);
    await sync();
    await updateOfflineUsage();
  }

  void sync();
  return { el, sync, download };
}

let offlineRows: OfflineRow[] = [];
function buildOfflineList(): void {
  offlineList.innerHTML = "";
  offlineRows = INSTRUMENTS.map(makeOfflineRow);
  for (const row of offlineRows) offlineList.append(row.el);
}

offlineToggle.addEventListener("click", async () => {
  buildOfflineList(); // built once per open; rows then update themselves in place
  await updateOfflineUsage();
  offlineDialog.showModal();
});
offlineDialog.addEventListener("click", (event) => {
  if (event.target === offlineDialog) offlineDialog.close(); // click the backdrop to close
});
downloadAllBtn.addEventListener("click", async () => {
  if (!navigator.onLine) return;
  const label = downloadAllBtn.textContent;
  downloadAllBtn.disabled = true;
  let done = 0;
  for (const row of offlineRows) {
    done += 1;
    downloadAllBtn.textContent = `Downloading… (${done}/${offlineRows.length})`;
    await row.download(); // updates its own row in place; skips already-cached
  }
  downloadAllBtn.textContent = label;
  downloadAllBtn.disabled = false;
});

// ---- Install affordance ----
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
const isStandalone =
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as unknown as { standalone?: boolean }).standalone === true;

// Chromium (Android + desktop Chrome/Edge): capture the prompt and offer Install.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event as BeforeInstallPromptEvent;
  if (!isStandalone) installBtn.hidden = false;
});
installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  await deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.hidden = true;
});
window.addEventListener("appinstalled", () => {
  installBtn.hidden = true;
});

// Safari (iOS/macOS) fires no prompt — show a one-time, dismissible hint.
if (!isStandalone && !localStorage.getItem("install-hint-dismissed")) {
  const ua = navigator.userAgent;
  const isSafari = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(ua);
  if (isSafari) {
    const isIOS =
      /iphone|ipad|ipod/i.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    installHint.innerHTML = isIOS
      ? "<strong>Install this app for offline use</strong>" +
        "<ol>" +
        "<li>Tap the <strong>Share</strong> button (the □↑ icon) in Safari.</li>" +
        "<li>Choose <strong>Add to Home&nbsp;Screen</strong>, then <strong>Add</strong>.</li>" +
        "<li>Open it from your home screen, then tap <strong>Offline</strong> to download the sounds you want.</li>" +
        "</ol>"
      : "<strong>Install this app:</strong> in Safari, <strong>File → Add to Dock</strong> (macOS 14+).";
    const dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.className = "install-hint-dismiss";
    dismiss.textContent = "✕";
    dismiss.setAttribute("aria-label", "Dismiss");
    dismiss.addEventListener("click", () => {
      installHint.hidden = true;
      localStorage.setItem("install-hint-dismissed", "1");
    });
    installHint.prepend(dismiss); // first in flow so float:right puts ✕ top-right
    installHint.hidden = false;
  }
}

// Initial render. VexFlow loads its music font asynchronously, so the first paint
// can be wrong until the font is ready — re-render once fonts have settled.
render();
document.fonts.ready.then(render);
