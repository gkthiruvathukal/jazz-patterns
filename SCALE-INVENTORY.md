# Scale & Mode Inventory

A working checklist of scales/modes for the generator's `SCALES` table
(`projects/scales/src/jazz_scales/generator.py`). Adding an entry there flows
automatically into the book, MIDI, and web app (via `export_json` → `scales.json`).

Source for the four modal families below: *"Jazz Scales and their Modes"*
(modes of the Major, Jazz Melodic Minor, Harmonic Minor, and Harmonic Major
scales). Chord symbols are as printed in that chart.

- `[x]` = already in `SCALES`
- `[ ]` = not yet added

Status: **15 / 28** modal entries present (all Major + all Melodic Minor modes,
plus Harmonic Minor itself). **13 to add** — six Harmonic Minor modes and the
whole Harmonic Major family.

## Modes of the Major Scale
- [x] Ionian — CΔ — *in `SCALES` as "Major (Ionian)"*
- [x] Dorian — Dmin7
- [x] Phrygian — Emin7
- [x] Lydian — FΔ
- [x] Mixolydian — G7 — *as "Dominant 7th (Mixolydian)"*
- [x] Aeolian — Amin7 — *as "Natural Minor (Aeolian)"*
- [x] Locrian — Bø

## Modes of the Jazz Melodic Minor Scale
- [x] Jazz Melodic Minor — C−Δ — *as "Melodic Minor (Jazz)"*
- [x] Dorian ♭2 — Dmin7
- [x] Lydian Augmented — E♭Δ♯5
- [x] Lydian Dominant — F9♯11
- [x] Mixolydian ♭6 — G9♭13
- [x] Locrian ♮2 — Aø♮2 — *as "Half-Dim #2 (Locrian ♮2)"*
- [x] Altered Dominant — B7alt — *as "Altered"*

## Modes of the Harmonic Minor Scale
- [x] Harmonic Minor — C−Δ
- [ ] Locrian ♮6 — Dø
- [ ] Ionian Augmented — E♭Δ♯5
- [ ] Dorian ♯4 — F−9
- [ ] Phrygian Dominant — G7♭9
- [ ] Lydian ♯2 — A♭Δ (or A♭°Δ)
- [ ] Super Locrian ♭♭7 — B°7

## Modes of the Harmonic Major Scale
- [ ] Harmonic Major — CΔ
- [ ] Locrian ♮2 ♮6 — Dø♮2
- [ ] Altered Dominant ♮5 — E7♯9 (or E7♭9)
- [ ] Lydian ♭3 — F°Δ9
- [ ] Mixolydian ♭2 — G7♭9
- [ ] Lydian Augmented ♯2 — A♭Δ♯5 (or A♭°Δ♯5)
- [ ] Locrian ♭♭7 — B°7

## Other scales already in `SCALES` (not part of this PDF)
- [x] Whole Tone
- [x] Octatonic (Half–Whole)
- [x] Octatonic (Whole–Half)
- [x] Blues (major)
- [x] Blues (minor)
- [x] Pentatonic Major
- [x] Pentatonic Minor
- [x] Minor Pentatonic b5
- [x] Bebop Dominant
- [x] Bebop Major
- [x] Dominant Pentatonic
