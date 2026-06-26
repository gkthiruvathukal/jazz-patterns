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
  /** Swing the eighth notes (delay + accent the off-beat "and"). */
  swing: boolean;
  /** Long:short ratio of the swung pair (e.g. 2 = 2:1 triplet feel). */
  swingRatio: number;
  /** Extra MIDI velocity added to the off-beat note (over the down-beat) when swinging. */
  accent: number;
  /** MIDI velocity of the down-beat note when swinging (lower it to make the off-beat pop). */
  downbeat: number;
}

const PPQ = 480; // ticks per quarter-note beat
const BASE_VELOCITY = 100;

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

// A soundfont fetch that never settles (flaky mobile network, blocked CDN)
// would otherwise leave the UI stuck on "Loading…" forever. Cap the wait so the
// caller can surface an error and let the user retry.
const LOAD_TIMEOUT_MS = 15000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

export async function loadInstrument(name: string): Promise<Soundfont> {
  const ctx = getContext();
  let instrument = cache.get(name);
  if (!instrument) {
    instrument = new Soundfont(ctx, { instrument: name });
    cache.set(name, instrument);
  }
  try {
    await withTimeout(instrument.load, LOAD_TIMEOUT_MS, `Timed out loading the "${name}" sound`);
  } catch (error) {
    cache.delete(name); // drop the failed/stuck instance so the next attempt starts fresh
    throw error;
  }
  return instrument;
}

/**
 * Prime audio for mobile from within a user gesture: create + resume the
 * AudioContext, play a one-sample silent buffer (the canonical iOS unlock), then
 * preload the soundfont. iOS/Android can let a tap's audio activation lapse
 * during the (first) soundfont fetch — leaving the context suspended and silent
 * — so doing this on the first gesture means the real Play already has the
 * context running and the instrument cached. Idempotent and best-effort: context
 * creation and instrument loads are cached, and unlock failures are swallowed.
 */
export async function primeAudio(instrument?: string): Promise<void> {
  const ctx = getContext();
  try {
    const source = ctx.createBufferSource();
    source.buffer = ctx.createBuffer(1, 1, 22050);
    source.connect(ctx.destination);
    source.start(0);
  } catch {
    // Silent-buffer unlock is best-effort; resume() below is the main path.
  }
  await ctx.resume();
  if (instrument) {
    try {
      await loadInstrument(instrument);
    } catch {
      // Preload is best-effort; the real Play surfaces (and retries) load errors.
    }
  }
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

  // Eighth-note pairs: the on-beat note starts the beat, the off-beat ("and")
  // falls at fraction f of the beat. Straight = 0.5; swing pushes it later so the
  // pair plays long-short (f = ratio/(ratio+1)). The off-beat gets a velocity
  // accent. Nothing here touches the notation — it's purely how we play it.
  const f = spec.swing ? spec.swingRatio / (spec.swingRatio + 1) : 0.5;
  const downVel = spec.swing ? spec.downbeat : BASE_VELOCITY;
  const offVel = spec.swing ? Math.min(127, spec.downbeat + spec.accent) : BASE_VELOCITY;
  seq.addTrack(
    instrument,
    sequence.map((note, i) => {
      const beat = Math.floor(i / 2);
      const offbeat = i % 2 === 1;
      const at = beat * PPQ + (offbeat ? Math.round(f * PPQ) : 0);
      const duration = Math.round((offbeat ? 1 - f : f) * PPQ);
      const velocity = offbeat ? offVel : downVel;
      return { note: note.midi + transpose, at, duration, velocity };
    }),
  );
  // Snap the loop to the next whole beat so swung (or odd-length) loops stay even.
  seq.loopEnd = Math.ceil(sequence.length / 2) * PPQ;
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
