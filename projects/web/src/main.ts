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
  type SequenceSpec,
  type TransportState,
} from "./player";

// A small curated set of GM soundfont instruments. Piano is the default; adding
// more is just another entry here (smplr loads them by name).
const INSTRUMENTS: { name: string; label: string }[] = [
  { name: "acoustic_grand_piano", label: "Acoustic Grand Piano" },
  { name: "electric_piano_1", label: "Electric Piano" },
  { name: "vibraphone", label: "Vibraphone" },
  { name: "acoustic_guitar_nylon", label: "Nylon Guitar" },
  { name: "marimba", label: "Marimba" },
];

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
const bpmInput = el<HTMLInputElement>("bpm");
const preferSelect = el<HTMLSelectElement>("prefer");
const retrogradeInput = el<HTMLInputElement>("retrograde");
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

fillSelect(keySelect, scalesData.keys.map((k) => ({ value: k, label: k })));
fillSelect(scaleSelect, scalesData.scales.map((s) => ({ value: s.name, label: s.name })));
fillSelect(instrumentSelect, INSTRUMENTS.map((i) => ({ value: i.name, label: i.label })));

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
instrumentSelect.addEventListener("change", stop);
bpmInput.addEventListener("change", stop);
preferSelect.addEventListener("change", render); // spelling only — no audio impact

// Initial render. VexFlow loads its music font asynchronously, so the first paint
// can be wrong until the font is ready — re-render once fonts have settled.
render();
document.fonts.ready.then(render);
