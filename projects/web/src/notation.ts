// Render a scale chart on a single treble stave using VexFlow.
import { Renderer, Stave, StaveNote, Accidental, Formatter } from "vexflow";
import type { Chart } from "./data/scales";
import type { NoteValue } from "./player";

export interface RenderOptions {
  noteValue: NoteValue;
  retrograde: boolean;
}

export function renderChart(container: HTMLDivElement, chart: Chart, opts: RenderOptions): void {
  container.innerHTML = "";

  const notes = opts.retrograde ? [...chart.notes].reverse() : chart.notes;
  const duration = opts.noteValue === "quarter" ? "4" : "8";

  const noteWidth = 56;
  const width = Math.max(360, notes.length * noteWidth + 90);
  const height = 150;

  const renderer = new Renderer(container, Renderer.Backends.SVG);
  renderer.resize(width, height);
  const context = renderer.getContext();

  const stave = new Stave(10, 30, width - 20);
  stave.addClef("treble");
  stave.setContext(context).draw();

  const staveNotes = notes.map((n) => {
    const key = `${n.name.toLowerCase()}${n.accidental}/${n.octave}`;
    const staveNote = new StaveNote({ keys: [key], duration });
    if (n.accidental) {
      staveNote.addModifier(new Accidental(n.accidental), 0);
    }
    return staveNote;
  });

  Formatter.FormatAndDraw(context, stave, staveNotes);
}
