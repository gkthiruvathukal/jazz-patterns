import argparse
from pathlib import Path
from pypdf import PdfReader, PdfWriter
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

from .generator import SCALES, scale_slug

def pretty_from_filename(fn: str) -> str:
    base = Path(fn).stem  # jazz_scales_abjad_<key>
    key_part = base.replace("jazz_scales_abjad_", "")
    # reverse sanitize: 'sharp'->#, 'flat'->b
    key_part = key_part.replace("double-sharp", "##").replace("double-flat", "bb")
    key_part = key_part.replace("sharp", "#").replace("flat", "b")
    return key_part

# Sharp enharmonic keys are placed immediately after their flat twin so each
# pair (Db/C#, Gb/F#) sits together in the book, matching the web dropdown.
ENHARMONIC_AFTER = {"C#": "Db", "F#": "Gb"}


def key_sort_key(fn: str):
    name = pretty_from_filename(fn)
    if name in ENHARMONIC_AFTER:
        # Sort just after the flat twin (same primary key, secondary rank 1).
        return (ENHARMONIC_AFTER[name], 1)
    return (name, 0)


def collect_key_pdfs(out_dir: Path):
    files = [str(p) for p in out_dir.glob("jazz_scales_abjad_*.pdf")]
    # Alphabetical by pretty key, with each sharp enharmonic nested after its
    # flat twin (Db→C#, Gb→F#).
    files = sorted(files, key=key_sort_key)
    return files

def collect_scale_pdfs(out_dir: Path):
    # In canonical SCALES order; titles come from the real scale names.
    items = []
    for name, *_rest in SCALES:
        path = out_dir / f"jazz_scales_byscale_{scale_slug(name)}.pdf"
        if path.exists():
            items.append((name, str(path)))
    return items

def make_toc(sections, out_dir: Path):
    # sections: [(heading, [(label, page), ...]), ...]
    toc_path = out_dir / "toc.pdf"
    c = canvas.Canvas(str(toc_path), pagesize=letter)
    W, H = letter
    y = H - 72
    c.setFont("Helvetica-Bold", 24)
    c.drawString(72, y, "Table of Contents")
    y -= 36
    for heading, entries in sections:
        if y < 100:
            c.showPage()
            y = H - 72
        c.setFont("Helvetica-Bold", 14)
        c.drawString(72, y, heading)
        y -= 22
        c.setFont("Helvetica", 12)
        for label, page in entries:
            c.drawString(90, y, label)
            c.drawRightString(W - 72, y, str(page))
            y -= 18
            if y < 72:
                c.showPage()
                y = H - 72
                c.setFont("Helvetica", 12)
    c.save()
    return toc_path

def main():
    ap = argparse.ArgumentParser(description="Merge per-key and per-scale PDFs into the combined jazz scales book.")
    ap.add_argument("--output-dir", type=Path, default=Path("build"),
                    help="Directory containing chapter PDFs and receiving the merged book (default: build).")
    args = ap.parse_args()
    out_dir = args.output_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    cover = out_dir / "cover.pdf"
    if not cover.exists():
        raise FileNotFoundError(f"Missing cover.pdf in {out_dir}/ — run jazz_scales.cover first.")

    key_pdfs = collect_key_pdfs(out_dir)
    scale_items = collect_scale_pdfs(out_dir)
    if not key_pdfs and not scale_items:
        raise FileNotFoundError(
            f"No chapter PDFs found in {out_dir}/ "
            f"(expected jazz_scales_abjad_*.pdf or jazz_scales_byscale_*.pdf)."
        )

    # Ordered content: by-key chapters first, then by-scale chapters.
    content = []
    for fp in key_pdfs:
        content.append({"label": f"Key of {pretty_from_filename(fp)}", "path": fp,
                        "section": "By Key", "npages": len(PdfReader(fp).pages)})
    for name, fp in scale_items:
        content.append({"label": name, "path": fp,
                        "section": "By Scale", "npages": len(PdfReader(fp).pages)})

    cover_reader = PdfReader(str(cover))
    cover_pages = len(cover_reader.pages)

    def build_sections(front_pages):
        # Display (1-based) page of the first content chapter follows the front matter.
        page = front_pages + 1
        ordered = []
        index = {}
        for item in content:
            section = item["section"]
            if section not in index:
                index[section] = len(ordered)
                ordered.append((section, []))
            ordered[index[section]][1].append((item["label"], page))
            page += item["npages"]
        return ordered

    # Resolve the TOC page count to a fixed point: the line/page count depends on the
    # number of entries, not on the page numbers, so this converges in a couple rounds.
    toc_pages = 1
    toc_path = None
    for _ in range(5):
        sections = build_sections(cover_pages + toc_pages)
        toc_path = make_toc(sections, out_dir)
        actual = len(PdfReader(str(toc_path)).pages)
        if actual == toc_pages:
            break
        toc_pages = actual

    toc_reader = PdfReader(str(toc_path))

    final = PdfWriter()
    for p in cover_reader.pages:
        final.add_page(p)
    for p in toc_reader.pages:
        final.add_page(p)

    # Append chapters, remembering each chapter's 0-based start page for bookmarks.
    start_indices = []
    for item in content:
        start_indices.append(len(final.pages))
        for p in PdfReader(item["path"]).pages:
            final.add_page(p)

    for item, idx in zip(content, start_indices):
        final.add_outline_item(item["label"], idx)

    book = out_dir / "Jazz-Scales-Book.pdf"
    with open(book, "wb") as f:
        final.write(f)
    print("Wrote", book)

if __name__ == "__main__":
    main()
