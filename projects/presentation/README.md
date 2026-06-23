# Presentation — Jazz Scales Practice ∀

A slide deck about this project, authored in **Markdown** (`slides.md`) and built
to a self-contained **HTML** slideshow with [Marp](https://marp.app/). No
PowerPoint; the Markdown is the source of truth and stays editable.

## Edit

Everything lives in **`slides.md`** (content) and **`theme.css`** (look — Inter +
JetBrains Mono, one amber accent, less-is-more). Slides are separated by `---`;
per-slide options use Marp comments (e.g. `<!-- _class: dark -->`).

Live preview while editing:

```bash
npm install
npm run dev        # Marp server with hot reload
```

## Build

```bash
npm run build      # -> dist/index.html (+ dist/assets/) — open in any browser
npm run build:pdf  # -> dist/slides.pdf
```

## Notation assets

The notation images in `assets/` are generated **from the project itself**, so they
stay authentic:

- `lily-*.svg` — engraved with **LilyPond** (the print-book pipeline).
- `app-*.png` — screenshots of the real **web app** (VexFlow + UI), captured with a
  headless browser.

Regenerate them with the sibling `../web` app (the script installs Puppeteer
on demand — it is **not** a build dependency, to keep CI lean):

```bash
npm run notation
```

`node_modules/` and `dist/` are gitignored; the committed `assets/` are the
checked-in snapshots so the deck builds without regenerating.
