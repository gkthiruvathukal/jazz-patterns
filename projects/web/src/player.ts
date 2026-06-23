// Audio playback via smplr (loads General MIDI soundfont instruments over the
// network — static fetch, no server state). One AudioContext, instruments cached
// by name so switching sounds is cheap. Transport (play/pause/resume/stop/loop)
// runs through smplr's Sequencer, which owns the scheduling and state machine.
import { Soundfont, Sequencer, type SequencerNoteEvent } from "smplr";

export type TransportState = "stopped" | "playing" | "paused";

export interface SequenceSpec {
  notes: { midi: number }[];
  bpm: number;
  retrograde: boolean;
  instrument: string;
  loop: boolean;
  /** Playback-only transposition in octaves (does not affect the notation). */
  octaveShift: number;
}

const PPQ = 480;
const EIGHTH = PPQ / 2; // eighth-note grid: two notes per quarter-note beat

let context: AudioContext | null = null;
const cache = new Map<string, Soundfont>();
let sequencer: Sequencer | null = null;
let stateListener: ((state: TransportState) => void) | null = null;
let noteListener: ((index: number) => void) | null = null;

function getContext(): AudioContext {
  if (!context) {
    context = new AudioContext();
  }
  return context;
}

export async function loadInstrument(name: string): Promise<Soundfont> {
  const ctx = getContext();
  let instrument = cache.get(name);
  if (!instrument) {
    instrument = new Soundfont(ctx, { instrument: name });
    cache.set(name, instrument);
  }
  await instrument.load;
  return instrument;
}

/** Register a callback fired on every transport state change (drives the UI). */
export function onStateChange(cb: (state: TransportState) => void): void {
  stateListener = cb;
}

export function getState(): TransportState {
  return sequencer?.state ?? "stopped";
}

/** Register a callback fired as each note sounds, with its index in playback order. */
export function onNote(cb: (index: number) => void): void {
  noteListener = cb;
}

/** Build a fresh sequence from the spec and start playing from the beginning. */
export async function play(spec: SequenceSpec): Promise<void> {
  const ctx = getContext();
  await ctx.resume(); // required after the user gesture
  const instrument = await loadInstrument(spec.instrument);

  sequencer?.stop(); // tear down any previous run

  // Small lookahead keeps noteOn (which fires at dispatch) close to actual audio
  // time, so the on-screen highlight stays in sync rather than leading the sound.
  const seq = new Sequencer(ctx, {
    bpm: spec.bpm,
    ppq: PPQ,
    loop: spec.loop,
    lookaheadMs: 25,
    intervalMs: 25,
  });
  const sequence = spec.retrograde ? [...spec.notes].reverse() : spec.notes;
  const transpose = spec.octaveShift * 12; // semitones; playback only
  seq.addTrack(
    instrument,
    sequence.map((note, i) => ({ note: note.midi + transpose, at: i * EIGHTH, duration: EIGHTH })),
  );
  seq.on("statechange", (state: TransportState) => stateListener?.(state));
  seq.on("end", () => stateListener?.("stopped")); // non-looping sequence finished
  seq.on("noteOn", (e: SequencerNoteEvent) => noteListener?.(e.noteIndex));

  sequencer = seq;
  seq.start();
}

/** Pause if playing, resume if paused. No-op when stopped (use play() to start). */
export function togglePause(): void {
  const seq = sequencer;
  if (seq && (seq.state === "playing" || seq.state === "paused")) {
    seq.togglePlayPause();
  }
}

export function stop(): void {
  sequencer?.stop();
}

/** Toggle looping on the current run; also read again from the spec on next play(). */
export function setLoop(loop: boolean): void {
  if (sequencer) sequencer.loop = loop;
}
