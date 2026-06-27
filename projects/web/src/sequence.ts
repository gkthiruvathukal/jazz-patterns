// Build the note sequence that the staff and the player both consume. The
// default is the scale itself; the other patterns are diatonic intervals
// ("scales in thirds", etc.) — degree shifts *within* the scale, octave-wrapped,
// so the actual scale tones are preserved (never chromatic). Every pattern is a
// two-measure phrase that walks up and back down and loops cleanly — the note
// after the last is the tonic again — superseding the old "retrograde" toggle.
import type { Chart, Note } from "./data/scales";

export interface IntervalPattern {
  id: string;
  label: string;
  /** Degree skip of the pair (musical interval N → skip N−1). Steps (the bare scale) uses skip 1. */
  skip: number;
}

export const INTERVAL_PATTERNS: IntervalPattern[] = [
  { id: "steps", label: "Steps", skip: 1 },
  { id: "seconds", label: "Seconds", skip: 1 },
  { id: "thirds", label: "Thirds", skip: 2 },
  { id: "fourths", label: "Fourths", skip: 3 },
  { id: "fifths", label: "Fifths", skip: 4 },
  { id: "sixths", label: "Sixths", skip: 5 },
  { id: "sevenths", label: "Sevenths", skip: 6 },
];

export interface Sequence {
  notes: Note[];
  labels: string[];
}

/** Eighth-note slots in two 4/4 measures — every interval pattern fills exactly this. */
const TWO_MEASURE_SLOTS = 16;

/** Distinct scale degrees: drop a trailing octave duplicate (C…C5) when present
 *  (most scales); octatonics have no duplicate, so all notes are degrees. */
function scaleDegrees(notes: Note[]): Note[] {
  if (notes.length > 1 && notes[notes.length - 1].midi === notes[0].midi + 12) {
    return notes.slice(0, -1);
  }
  return notes;
}

export function sequenceForChart(chart: Chart, patternId: string): Sequence {
  const pattern = INTERVAL_PATTERNS.find((p) => p.id === patternId) ?? INTERVAL_PATTERNS[0];

  const degrees = scaleDegrees(chart.notes);
  const m = degrees.length;
  const wrap = (d: number): number => ((d % m) + m) % m;

  // Resolve a (possibly out-of-range) degree index to a Note, bumping the written
  // octave by +1 and midi by +12 per octave; all spelled fields carry over.
  const degreeNote = (d: number): Note => {
    const octave = Math.floor(d / m);
    const base = degrees[wrap(d)];
    return { ...base, octave: base.octave + octave, midi: base.midi + 12 * octave };
  };

  // Build the degree-index sequence (0-indexed). Every pattern fills two measures
  // (16 eighth-notes) and loops: the note *after* the last is the tonic again.
  const k = pattern.skip;
  let idx: number[];
  if (pattern.id === "steps") {
    // Steps: walk up to the 9th (one step past the octave root) and back down to
    // the 2nd, so the next note is the tonic — 16 notes, no trailing rest.
    idx = [];
    for (let d = 0; d <= 8; d++) idx.push(d); // ascend degrees 1..9
    for (let d = 7; d >= 1; d--) idx.push(d); // descend degrees 8..2
  } else if (pattern.id === "seconds") {
    // Seconds: each note dips to the scale degree a 2nd below, then the line
    // steps up — C B D C E D F E … (1 7 2 1 3 2 4 3 …). A straight one-octave
    // climb of eight "down-a-2nd" pairs = 16 notes; the closing 7th resolves up
    // to the tonic when it loops.
    idx = [];
    for (let L = 0; L <= 7; L++) idx.push(L, L - 1);
  } else if (m >= 5) {
    // Intervals: the lower voice bounces 1→5→2 (eight pairs), each step sounding
    // (L, L+skip) with the upper voice octave-wrapping. 8 pairs is forced by the
    // math — an up-then-down walk stopping one step before the tonic has 2P−2
    // pairs, and 2P−2 = 8 ⇒ peak P = the 5th degree.
    const lower = [0, 1, 2, 3, 4, 3, 2, 1];
    idx = lower.flatMap((L) => [L, L + k]);
  } else {
    // Scale too small to reach a 5th degree: just keep walking up across two measures.
    idx = [];
    for (let n = 0; idx.length < TWO_MEASURE_SLOTS; n++) idx.push(n, n + k);
    idx = idx.slice(0, TWO_MEASURE_SLOTS);
  }

  const notes = idx.map(degreeNote);
  const labels =
    pattern.id === "steps"
      // Steps: the Python-supplied W/H step between consecutive degrees (symmetric,
      // so it reads the same up or down); the first note has none.
      ? idx.map((d, i) => (i === 0 ? "-" : chart.intervals[Math.min(idx[i - 1], d) % m] ?? ""))
      // Intervals: the scale-degree number under each note (1 3 2 4 …).
      : idx.map((d) => String(wrap(d) + 1));

  return { notes, labels };
}
