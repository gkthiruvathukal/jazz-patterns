from pathlib import Path
from pypdf import PdfReader, PdfWriter
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

OUT = Path("out")
OUT.mkdir(exist_ok=True)

def pretty_from_filename(fn: str) -> str:
    base = Path(fn).stem  # jazz_scales_abjad_<key>
    key_part = base.replace("jazz_scales_abjad_", "")
    # reverse sanitize: 'sharp'->#, 'flat'->b
    key_part = key_part.replace("double-sharp", "##").replace("double-flat", "bb")
    key_part = key_part.replace("sharp", "#").replace("flat", "b")
    return key_part

def collect_key_pdfs():
    files = sorted([str(p) for p in OUT.glob("jazz_scales_abjad_*.pdf")])
    # Alphabetical by pretty key
    files = sorted(files, key=lambda f: pretty_from_filename(f))
    return files

def make_toc(entries):
    toc_path = OUT / "toc.pdf"
    c = canvas.Canvas(str(toc_path), pagesize=letter)
    W, H = letter
    y = H - 72
    c.setFont("Helvetica-Bold", 24)
    c.drawString(72, y, "Table of Contents")
    y -= 36
    c.setFont("Helvetica", 12)
    for title, page in entries:
        c.drawString(72, y, f"Key of {title}")
        c.drawRightString(W - 72, y, str(page))
        y -= 18
        if y < 72:
            c.showPage()
            y = H - 72
            c.setFont("Helvetica", 12)
    c.save()
    return toc_path

def main():
    cover = OUT / "cover.pdf"
    if not cover.exists():
        raise FileNotFoundError("Missing cover.pdf in out/ — run make_cover.py first.")

    key_pdfs = collect_key_pdfs()
    if not key_pdfs:
        raise FileNotFoundError("No key PDFs found in out/ (expected jazz_scales_abjad_*.pdf).")

    writer = PdfWriter()
    # Add cover
    cover_reader = PdfReader(str(cover))
    for p in cover_reader.pages:
        writer.add_page(p)

    # Placeholder TOC to compute page numbers
    toc_entries = []
    current_display_page = len(writer.pages) + 1  # 1-based display numbering
    toc_dummy_path = make_toc([])
    toc_dummy = PdfReader(str(toc_dummy_path))
    for p in toc_dummy.pages:
        writer.add_page(p)
    current_display_page = len(writer.pages) + 1

    # Add each key and remember start page
    start_indices = []
    for fp in key_pdfs:
        start_indices.append(len(writer.pages))
        r = PdfReader(fp)
        for p in r.pages:
            writer.add_page(p)
        toc_entries.append((pretty_from_filename(fp), current_display_page))
        current_display_page += len(r.pages)

    # Rebuild TOC with real entries
    toc_path = make_toc(toc_entries)
    final = PdfWriter()
    # cover
    for p in cover_reader.pages:
        final.add_page(p)
    # toc
    toc_reader = PdfReader(str(toc_path))
    for p in toc_reader.pages:
        final.add_page(p)
    # content
    for fp in key_pdfs:
        r = PdfReader(fp)
        for p in r.pages:
            final.add_page(p)

    # Bookmarks (shift by cover + toc length)
    shift = len(cover_reader.pages) + len(toc_reader.pages)
    for fp, idx in zip(key_pdfs, start_indices):
        final.add_outline_item(f"Key of {pretty_from_filename(fp)}", idx + shift)

    book = OUT / "Jazz-Scales-Book.pdf"
    with open(book, "wb") as f:
        final.write(f)
    print("Wrote", book)

if __name__ == "__main__":
    main()

