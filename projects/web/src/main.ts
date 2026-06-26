// Entry point: populate controls, render notation, and drive playback.
import { scalesData, findChart, type Chart } from "./data/scales";
import { renderChart, type NoteHighlighter } from "./notation";
import {
  play,
  stop,
  togglePause,
  setLoop,
  getState,
  onStateChange,
  onNote,
  primeAudio,
  type SequenceSpec,
  type TransportState,
} from "./player";

// A curated set of GM soundfont instruments, grouped for the dropdown. Piano is
// the default; adding more is just another entry here (smplr loads them by name —
// any General MIDI name works, see smplr's getSoundfontNames()).
// `octave` is the sensible default playback transposition (in octaves) for each
// instrument, since the notation sits in the treble staff: basses drop a couple
// octaves, low horns one. It only shifts the audio, never the printed notes.
type Instrument = { name: string; label: string; group: string; octave: number };
const INSTRUMENTS: Instrument[] = [
  { group: "Keys & Mallets", name: "acoustic_grand_piano", label: "Acoustic Grand Piano", octave: 0 },
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

const keySelect = el<HTMLSelectElement>("key");
const scaleSelect = el<HTMLSelectElement>("scale");
const instrumentSelect = el<HTMLSelectElement>("instrument");
const octaveSelect = el<HTMLSelectElement>("octave");
const bpmInput = el<HTMLInputElement>("bpm");
const preferSelect = el<HTMLSelectElement>("prefer");
const retrogradeInput = el<HTMLInputElement>("retrograde");
const swingInput = el<HTMLInputElement>("swing");
const swingNumInput = el<HTMLInputElement>("swing-num");
const swingDenInput = el<HTMLInputElement>("swing-den");
const swingRatioVal = el<HTMLSpanElement>("swing-ratio-val");
const accentInput = el<HTMLInputElement>("accent");
const accentVal = el<HTMLSpanElement>("accent-val");
const downbeatInput = el<HTMLInputElement>("downbeat");
const downbeatVal = el<HTMLSpanElement>("downbeat-val");
const playButton = el<HTMLButtonElement>("play");
const stopButton = el<HTMLButtonElement>("stop");
const loopButton = el<HTMLButtonElement>("loop");
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

function currentSpec(): SequenceSpec | undefined {
  const chart = currentChart();
  if (!chart) return undefined;
  return {
    notes: chart.notes,
    bpm: clampedBpm(),
    retrograde: retrogradeInput.checked,
    instrument: instrumentSelect.value,
    loop: loopOn,
    octaveShift: Number(octaveSelect.value),
    swing: swingInput.checked,
    swingRatio: Number(swingNumInput.value) / Number(swingDenInput.value),
    accent: Number(accentInput.value),
    downbeat: Number(downbeatInput.value),
  };
}

// Current score's highlighter, replaced on every render. Drives the playhead.
let highlighter: NoteHighlighter | null = null;

function render(): void {
  const chart = currentChart();
  if (!chart) return;
  const retrograde = retrogradeInput.checked;
  const suffix = retrograde ? " (retrograde)" : "";
  nowPlaying.innerHTML = `<span class="chord">${chart.chord}</span> &mdash; ${chart.key} ${chart.scale}${suffix}`;
  highlighter = renderChart(notation, chart, {
    retrograde,
    prefer: preferSelect.value as "auto" | "sharps" | "flats",
  });
}

// Light up the note as it sounds (index is in playback order).
onNote((index) => highlighter?.highlight(index));

// Keep the Play/Pause button label and status in sync with the transport.
function reflectState(state: TransportState): void {
  playButton.textContent = state === "playing" ? "Pause" : state === "paused" ? "Resume" : "Play";
  setStatus(state === "playing" ? "Playing…" : state === "paused" ? "Paused" : "");
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
  playButton.disabled = true;
  setStatus("Loading sound…");
  try {
    await play(spec);
  } catch (error) {
    setStatus(`Audio error: ${(error as Error).message}`);
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
  () => void primeAudio(instrumentSelect.value),
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
retrogradeInput.addEventListener("change", changeAndStop);
instrumentSelect.addEventListener("change", () => {
  octaveSelect.value = String(defaultOctaveFor(instrumentSelect.value)); // sensible default per sound
  void primeAudio(instrumentSelect.value); // preload the newly chosen sound (this change is a user gesture)
  stop();
});
octaveSelect.addEventListener("change", stop);
bpmInput.addEventListener("change", stop);
preferSelect.addEventListener("change", render); // spelling only — no audio impact

// Swing: checkbox enables the ratio/accent sliders; all three are audio-only.
function syncSwingEnabled(): void {
  swingNumInput.disabled = !swingInput.checked;
  swingDenInput.disabled = !swingInput.checked;
  accentInput.disabled = !swingInput.checked;
  downbeatInput.disabled = !swingInput.checked;
}
swingInput.addEventListener("change", () => {
  syncSwingEnabled();
  stop();
});
function updateSwingRatioLabel(): void {
  swingRatioVal.textContent = `${Number(swingNumInput.value).toFixed(1)} : ${Number(swingDenInput.value).toFixed(1)}`;
}
swingNumInput.addEventListener("input", updateSwingRatioLabel);
swingDenInput.addEventListener("input", updateSwingRatioLabel);
accentInput.addEventListener("input", () => {
  accentVal.textContent = accentInput.value;
});
downbeatInput.addEventListener("input", () => {
  downbeatVal.textContent = downbeatInput.value;
});
swingNumInput.addEventListener("change", stop);
swingDenInput.addEventListener("change", stop);
accentInput.addEventListener("change", stop);
downbeatInput.addEventListener("change", stop);
syncSwingEnabled(); // sliders start disabled (swing off by default)

// Initial render. VexFlow loads its music font asynchronously, so the first paint
// can be wrong until the font is ready — re-render once fonts have settled.
render();
document.fonts.ready.then(render);
