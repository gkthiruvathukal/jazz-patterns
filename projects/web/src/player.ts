// Audio playback via smplr (loads General MIDI soundfont instruments over the
// network — static fetch, no server state). One AudioContext, instruments cached
// by name so switching sounds is cheap.
import { Soundfont } from "smplr";

export type NoteValue = "eighth" | "quarter";

export interface PlayOptions {
  bpm: number;
  noteValue: NoteValue;
  retrograde: boolean;
  instrument: string;
}

let context: AudioContext | null = null;
const cache = new Map<string, Soundfont>();
let active: Soundfont | null = null;

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

/** Schedule the notes and return the total playback duration in seconds. */
export async function play(notes: { midi: number }[], opts: PlayOptions): Promise<number> {
  const ctx = getContext();
  await ctx.resume(); // required after the user gesture
  const instrument = await loadInstrument(opts.instrument);
  active = instrument;
  instrument.stop(); // clear anything still sounding

  const beat = 60 / opts.bpm;
  const step = opts.noteValue === "quarter" ? beat : beat / 2;
  const sequence = opts.retrograde ? [...notes].reverse() : notes;

  const start = ctx.currentTime + 0.12;
  sequence.forEach((note, i) => {
    instrument.start({ note: note.midi, time: start + i * step, duration: step * 0.95 });
  });

  return sequence.length * step;
}

export function stop(): void {
  active?.stop();
}
