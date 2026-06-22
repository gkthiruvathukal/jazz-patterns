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

const keySelect = el<HTMLSelectElement>("key");
const scaleSelect = el<HTMLSelectElement>("scale");
const instrumentSelect = el<HTMLSelectElement>("instrument");
const bpmInput = el<HTMLInputElement>("bpm");
const noteValueSelect = el<HTMLSelectElement>("note-value");
const retrogradeInput = el<HTMLInputElement>("retrograde");
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
retrogradeInput.addEventListener("change", render);

render();
