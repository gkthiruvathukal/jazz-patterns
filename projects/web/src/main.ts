// Entry point: populate controls, render notation, and drive playback.
import { scalesData, findChart, type Chart } from "./data/scales";
import { renderChart } from "./notation";
import { play, stop, type NoteValue } from "./player";

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
const noteValueSelect = el<HTMLSelectElement>("note-value");
const preferSelect = el<HTMLSelectElement>("prefer");
const retrogradeInput = el<HTMLInputElement>("retrograde");
const fitWidthInput = el<HTMLInputElement>("fit-width");
const playButton = el<HTMLButtonElement>("play");
const stopButton = el<HTMLButtonElement>("stop");
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

// Restore the "fit to width" preference (defaults to off — natural size + scroll).
fitWidthInput.checked = localStorage.getItem("fitWidth") === "true";

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

function render(): void {
  const chart = currentChart();
  if (!chart) return;
  const retrograde = retrogradeInput.checked;
  const suffix = retrograde ? " (retrograde)" : "";
  nowPlaying.innerHTML = `<span class="chord">${chart.chord}</span> &mdash; ${chart.key} ${chart.scale}${suffix}`;
  renderChart(notation, chart, {
    noteValue: noteValueSelect.value as NoteValue,
    retrograde,
    prefer: preferSelect.value as "auto" | "sharps" | "flats",
    fitWidth: fitWidthInput.checked,
  });
}

playButton.addEventListener("click", async () => {
  const chart = currentChart();
  if (!chart) return;
  playButton.disabled = true;
  setStatus("Loading sound…");
  try {
    const seconds = await play(chart.notes, {
      bpm: clampedBpm(),
      noteValue: noteValueSelect.value as NoteValue,
      retrograde: retrogradeInput.checked,
      instrument: instrumentSelect.value,
    });
    setStatus(retrogradeInput.checked ? "Playing (retrograde)…" : "Playing…");
    window.setTimeout(() => setStatus(""), seconds * 1000 + 300);
  } catch (error) {
    setStatus(`Audio error: ${(error as Error).message}`);
  } finally {
    playButton.disabled = false;
  }
});

stopButton.addEventListener("click", () => {
  stop();
  setStatus("");
});

keySelect.addEventListener("change", render);
scaleSelect.addEventListener("change", render);
noteValueSelect.addEventListener("change", render);
preferSelect.addEventListener("change", render);
retrogradeInput.addEventListener("change", render);
fitWidthInput.addEventListener("change", () => {
  localStorage.setItem("fitWidth", fitWidthInput.checked ? "true" : "false");
  render();
});

// Initial render. VexFlow loads its music font asynchronously, so the first paint
// can be wrong until the font is ready — re-render once fonts have settled.
render();
document.fonts.ready.then(render);
