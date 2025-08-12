# Common Jazz Scales (Abjad + LilyPond)

This script generates printable charts of common jazz scales—one chart per key.
Each chart shows two scales per staff line, beamed 8ths, the scale/chord name above the first note, and the step pattern under the notes.
It’s meant to be a practical practice aid, not a disseration on music theory. (I already have a PhD with so much to learn.)

## Why this exists

Jazz practice is faster when you can:

- see the **step pattern** (whole/half) while you play,
- anchor the sound with a **chord symbol** that fits the scale,
- read a consistent **two-bars-per-system** layout,
- and **transpose** through keys (e.g., by fourths) without re-engraving.

This project automates that via one command line interface that produces clean charts in every key.

## How jazz players learn scales (and the exceptions)

Most tonal scales can be learned as a **pattern of Whole (W) and Half (H) steps** from the root:

- **Major (Ionian):** W W H W W W H  
- **Natural minor (Aeolian):** W H W W H W W  
- **Dorian:** W H W W W H W  
- **Mixolydian (dominant 7th):** W W H W W H W  
- **Lydian:** W W W H W W H  
- **Phrygian:** H W W W H W W  
- **Locrian:** H W W H W W W  

Some important scales bend or extend that simple idea:

- **Melodic minor (jazz ascending):** W H W W W W H (minor 3rd then mostly whole steps)  
- **Harmonic minor:** includes a **W+H** (augmented second) between ♭6 and 7 → W H W W H **W+H** H  
- **Whole tone:** all **W** steps (6 notes total)  
- **Octatonic / diminished:** alternates **H–W–H–W…** (Half–Whole) or **W–H–W–H…** (Whole–Half), giving 8 notes  
- **Blues (minor):** a 6-note color scale with **blue notes** (1 ♭3 4 ♭5 5 ♭7 1); stepwise it’s **m3–W–H–H–m3–W**  
- **Pentatonic (major/minor):** 5-note scales; can be described with steps (e.g., Major: W W W+H W W+H), but most players memorize the tones (e.g., major: 1 2 3 5 6; minor: 1 ♭3 4 5 ♭7).

This script prints the step pattern under the notes so your fingers can do their magic in every key!

## What gets generated

- **Two scales per staff line** (`\break` in Lilypond after every second bar).  
- **Beamed 8th notes.**  
- **Scale name** and a **compatible chord symbol** above bar 1.  
- **Step pattern** below each note (first note shows “–”, then W/H/etc.).  
- **Sensible key signatures** (major or minor mode, your choice).  
- One **.ly** per key, and **.pdf** too if LilyPond is installed.

Included scales (rooted on the chosen key):  
Major (Ionian), Natural Minor (Aeolian), Harmonic Minor, Melodic Minor (Jazz), Mixolydian, Dorian, Phrygian, Lydian, Locrian, Locrian ♮2 (Half-Dim #2), Whole Tone, Octatonic (Half–Whole), Octatonic (Whole–Half), Blues (minor), Pentatonic Major, Pentatonic Minor.

And others can easily be added.

## Requirements

- **Python 3.9+**
- **Abjad 3.25**
- **LilyPond** only if you want PDFs (the script always writes `.ly`; PDFs are optional)

Install Abjad:
```bash
pip install abjad==3.25
```

Install LilyPond (for PDFs):
- macOS: `brew install lilypond`
- Ubuntu/Debian: `sudo apt-get install -y lilypond`
- Windows: download from lilypond.org and add to PATH

## Usage

Run from the folder containing `jazz_scales_abjad_keys.py`:

```bash
# default: start at C, go by fourths through 12 keys, major key signatures, write .ly (no pdf)
python jazz_scales_abjad_keys.py
```

Generate PDFs as well:
```bash
python jazz_scales_abjad_keys.py --pdf
```

Common options:

- `--step` semitone step between keys (default **5** for fourths; use **7** for fifths)
- `--count` how many keys (default **12**)
- `--start` starting key name (`C`, `F#`, `Bb`, etc.)
- `--prefer` accidental style: `auto` (default), `flats`, or `sharps`  
  *(auto picks flats when cycling by fourths, sharps when cycling by fifths)*
- `--anchor` register anchoring: `nearest` (default), `up`, `down`  
  *(keeps notes near middle C for readability)*
- `--mode` key-signature mode for each chart: `major` or `minor`
- `--pdf` also render PDFs (needs LilyPond)
- `--author` printed under the title (default **George K. Thiruvathukal**)
- `--license` footer text (default **Creative Commons 4.0 International**)

Examples:

```bash
# All 12 keys by fourths (C→F→Bb…), with PDFs:
python jazz_scales_abjad_keys.py --pdf

# Fifths, starting on G, prefer sharps, minor key signatures:
python jazz_scales_abjad_keys.py --step 7 --start G --prefer sharps --mode minor --pdf
```

## Output files

- `jazz_scales_abjad_<Key>.ly` (always)
- `jazz_scales_abjad_<Key>.pdf` (if `--pdf` and LilyPond is installed)

Open the `.ly` in LilyPond or import into notation software that understands MusicXML via LilyPond export.

## Notes

- Two bars per system is enforced by inserting a system break after every second measure.  
- The first note of each scale lands on **beat 1**.  
- Shorter scales (e.g., pentatonics) are padded with rests to fill the bar so beaming and spacing stay consistent.

## Future

- Package + installer and CI/release automation can come later. For now, the script is simple to run as-is.
