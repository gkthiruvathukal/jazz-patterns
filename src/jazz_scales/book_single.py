# scripts/make_book.py
from pathlib import Path
from pypdf import PdfReader, PdfWriter
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

OUT_DIR = Path("out")
COVER = OUT_DIR / "cover.pdf"
CONTENT = OUT_DIR / "jazz_scales_abjad.pdf"
TOC = OUT_DIR / "toc.pdf"
BOOK = OUT_DIR / "Jazz-Scales-Book.pdf"

def make_toc(entries):
    c = canvas.Canvas(str(TOC), pagesize=letter)
    W, H = letter
    y = H - 72
    c.setFont("Helvetica-Bold", 24); c.drawString(72, y, "Table of Contents")
    y -= 36; c.setFont("Helvetica", 12)
    for title, page in entries:  # display page numbers
        c.drawString(72, y, title)
        c.drawRightString(W - 72, y, str(page))
        y -= 18
        if y < 72:
            c.showPage(); y = H - 72; c.setFont("Helvetica", 12)
    c.save()

def main():
    if not COVER.exists():
        raise FileNotFoundError(f"Missing cover: {COVER}")
    if not CONTENT.exists():
        raise FileNotFoundError(f"Missing content (run lilypond first): {CONTENT}")

    cover = PdfReader(str(COVER))
    content = PdfReader(str(CONTENT))

    # Construct TOC entries
    cover_pages = len(cover.pages)
    toc_pages = 1
    content_start_display = cover_pages + toc_pages + 1  # 1-based

    make_toc([("C Instruments", content_start_display)])

    toc = PdfReader(str(TOC))
    writer = PdfWriter()

    # Append cover
    for p in cover.pages:
        writer.add_page(p)
    # Append TOC
    for p in toc.pages:
        writer.add_page(p)
    # Append content
    content_start_index = len(writer.pages)  # 0-based index of first content page
    for p in content.pages:
        writer.add_page(p)

    # Bookmark for content
    writer.add_outline_item("C Instruments", content_start_index)

    with open(BOOK, "wb") as f:
        writer.write(f)

    print("Wrote", BOOK)

if __name__ == "__main__":
    main()
