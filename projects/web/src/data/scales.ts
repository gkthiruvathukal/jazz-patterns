// Types for and access to the scale data exported by the Python model
// (jazz_scales.export_json). scales.json is the single source of truth.
import data from "./scales.json";

export interface Note {
  name: string;           // letter, e.g. "C", "E" (auto/key-based spelling)
  accidental: string;     // "", "#", or "b"
  octave: number;         // scientific pitch notation, e.g. 4
  midi: number;
  sharp_name: string;
  sharp_accidental: string;
  flat_name: string;
  flat_accidental: string;
}

export interface Chart {
  key: string;
  scale: string;
  chord: string;
  intervals: string[];
  notes: Note[];
}

export interface ScaleMeta {
  name: string;
  slug: string;
}

export interface ScalesData {
  keys: string[];
  scales: ScaleMeta[];
  charts: Chart[];
}

export const scalesData = data as ScalesData;

export function findChart(key: string, scale: string): Chart | undefined {
  return scalesData.charts.find((c) => c.key === key && c.scale === scale);
}
