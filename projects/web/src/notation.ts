// Render a scale chart on a treble stave using VexFlow: a 4/4 time signature,
// notes grouped into measures (padded with rests like the print book), and the
// W/H/m3 step labels written under each note.
import { Renderer, Stave, StaveNote, Accidental, Formatter, Annotation, BarNote, Voice } from "vexflow";
import type { Note } from "./data/scales";

export type Prefer = "auto" | "sharps" | "flats";

/** Controls the playback highlight overlay for the rendered score. */
export interface NoteHighlighter {
  /** Highlight the note at this playback index (left-to-right order). */
  highlight(index: number): void;
  /** Hide the highlight. */
  clear(): void;
}

// `notes` and `labels` are the already-resolved play-order sequence (see
// sequence.ts) — one label per note. The same sequence drives playback, so the
// highlight indices line up.
export function renderChart(container: HTMLDivElement, notes: Note[], labels: string[], prefer: Prefer): NoteHighlighter {
  container.innerHTML = "";

  const durationBase = "8"; // eighth notes
  const slotsPerMeasure = 8; // 4/4
  const totalSlots = Math.ceil(notes.length / slotsPerMeasure) * slotsPerMeasure;

  const tickables = [];
  const noteEls: StaveNote[] = []; // playback notes in order, for highlighting
  for (let i = 0; i < totalSlots; i++) {
    if (i > 0 && i % slotsPerMeasure === 0) {
      tickables.push(new BarNote()); // barline between measures
    }
    if (i < notes.length) {
      const n = notes[i];
      const noteName = prefer === "sharps" ? n.sharp_name : prefer === "flats" ? n.flat_name : n.name;
      const noteAcc  = prefer === "sharps" ? n.sharp_accidental : prefer === "flats" ? n.flat_accidental : n.accidental;
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
      noteEls.push(staveNote);
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

  // Make the SVG responsive: the viewBox carries the intrinsic geometry, and we
  // drive the rendered size with inline *style* properties. VexFlow sets the
  // SVG's size via its own inline style, which beats presentation attributes —
  // so setting style here (not setAttribute) is what actually takes effect. The
  // graphic scales down to the display width (crisp, since it's vector) and is
  // capped at its natural width so it doesn't upscale on wide screens.
  const svg = container.querySelector("svg");
  if (svg) {
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.style.width = "100%";
    svg.style.height = "auto";
    svg.style.maxWidth = `${width}px`;
    svg.style.display = "block";
  }

  // Per-note horizontal boxes (viewBox units) + one shared vertical band covering
  // the tallest note's extent, used to position the playback highlight overlay.
  const boxes = noteEls.map((n) => {
    const bb = n.getBoundingBox();
    return { x: bb.getX(), w: bb.getW(), y: bb.getY(), h: bb.getH() };
  });
  const bandTop = boxes.length ? Math.min(...boxes.map((b) => b.y)) - 6 : 0;
  const bandBottom = boxes.length ? Math.max(...boxes.map((b) => b.y + b.h)) + 6 : height;
  const bandHeight = bandBottom - bandTop;

  // A DOM overlay (sibling of the SVG) — outside the dark-mode invert filter on
  // the SVG, so its accent color is predictable in both themes. Positioned by
  // scaling the viewBox-unit boxes to the SVG's live on-screen width.
  const highlightEl = document.createElement("div");
  highlightEl.className = "note-highlight";
  highlightEl.style.display = "none";
  container.append(highlightEl);

  return {
    highlight(index: number): void {
      const box = boxes[index];
      if (!box || !svg) return;
      const scale = svg.clientWidth / width; // live → tracks responsive width/resize
      const pad = 4;
      highlightEl.style.left = `${(box.x - pad) * scale}px`;
      highlightEl.style.width = `${(box.w + pad * 2) * scale}px`;
      highlightEl.style.top = `${bandTop * scale}px`;
      highlightEl.style.height = `${bandHeight * scale}px`;
      highlightEl.style.display = "block";
    },
    clear(): void {
      highlightEl.style.display = "none";
    },
  };
}
