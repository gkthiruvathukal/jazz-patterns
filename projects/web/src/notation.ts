// Render a scale chart on a treble stave using VexFlow: a 4/4 time signature,
// notes grouped into measures (padded with rests like the print book), and the
// W/H/m3 step labels written under each note.
import { Renderer, Stave, StaveNote, Accidental, Formatter, Annotation, BarNote, Voice } from "vexflow";
import type { Chart } from "./data/scales";
import type { NoteValue } from "./player";

export interface RenderOptions {
  noteValue: NoteValue;
  retrograde: boolean;
  prefer: "auto" | "sharps" | "flats";
}

export function renderChart(container: HTMLDivElement, chart: Chart, opts: RenderOptions): void {
  container.innerHTML = "";

  const notes = opts.retrograde ? [...chart.notes].reverse() : chart.notes;
  const intervals = opts.retrograde ? [...chart.intervals].reverse() : chart.intervals;
  // First note has no preceding interval ("-"), then one label per step.
  const labels = ["-", ...intervals];

  const durationBase = opts.noteValue === "quarter" ? "4" : "8";
  const slotsPerMeasure = opts.noteValue === "quarter" ? 4 : 8; // 4/4
  const totalSlots = Math.ceil(notes.length / slotsPerMeasure) * slotsPerMeasure;

  const tickables = [];
  for (let i = 0; i < totalSlots; i++) {
    if (i > 0 && i % slotsPerMeasure === 0) {
      tickables.push(new BarNote()); // barline between measures
    }
    if (i < notes.length) {
      const n = notes[i];
      const noteName = opts.prefer === "sharps" ? n.sharp_name : opts.prefer === "flats" ? n.flat_name : n.name;
      const noteAcc  = opts.prefer === "sharps" ? n.sharp_accidental : opts.prefer === "flats" ? n.flat_accidental : n.accidental;
      const key = `${noteName.toLowerCase()}${noteAcc}/${n.octave}`;
      const staveNote = new StaveNote({ keys: [key], duration: durationBase });
      if (noteAcc) {
        staveNote.addModifier(new Accidental(noteAcc), 0);
      }
      const label = labels[i];
      if (label) {
        const annotation = new Annotation(label);
        annotation.setVerticalJustification(Annotation.VerticalJustify.BOTTOM);
        staveNote.addModifier(annotation, 0);
      }
      tickables.push(staveNote);
    } else {
      // Pad the final measure with rests so it is complete in 4/4.
      tickables.push(new StaveNote({ keys: ["b/4"], duration: `${durationBase}r` }));
    }
  }

  const noteWidth = 48;
  const width = Math.max(380, totalSlots * noteWidth + 130);
  const height = 200;

  const renderer = new Renderer(container, Renderer.Backends.SVG);
  renderer.resize(width, height);
  const context = renderer.getContext();

  const stave = new Stave(10, 25, width - 20);
  stave.addClef("treble");
  stave.addTimeSignature("4/4");
  stave.setContext(context).draw();

  // SOFT mode lets a single voice carry rests, barlines, and multiple measures
  // without strict tick-total checks.
  const voice = new Voice({ numBeats: 4, beatValue: 4 });
  voice.setMode(Voice.Mode.SOFT);
  voice.addTickables(tickables);
  new Formatter().joinVoices([voice]).format([voice], width - 90);
  voice.draw(context, stave);

  // Make the SVG scale to fit its container instead of overflowing on narrow screens.
  const svg = container.querySelector("svg");
  if (svg) {
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", "100%");
    svg.removeAttribute("height");
  }
}
