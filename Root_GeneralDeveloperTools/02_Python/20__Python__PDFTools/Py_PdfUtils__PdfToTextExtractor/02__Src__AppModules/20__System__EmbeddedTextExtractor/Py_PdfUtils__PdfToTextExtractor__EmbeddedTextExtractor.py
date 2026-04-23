# =============================================================================
# Py_PdfUtils__PdfToTextExtractor__EmbeddedTextExtractor.py
# =============================================================================
# Description : Extracts selectable text from text-native PDF pages using
#               PyMuPDF. For every visible line we emit a TextSpan that
#               carries the dominant font size and a bold flag so the
#               header-hierarchy mapper can infer heading levels.
# =============================================================================

from __future__ import annotations

import logging
from pathlib import Path
from typing import Iterable

import fitz                                                                     # <-- PyMuPDF

from Py_PdfUtils__PdfToTextExtractor__AppUtils import TextSpan

# =============================================================================
# REGION | Font Flag Helpers
# =============================================================================

# PyMuPDF exposes text-span styling in a packed 'flags' integer. Bit 4 (==16)
# marks a bold variant of the glyph run. See:
# https://pymupdf.readthedocs.io/en/latest/app1.html#font-flags
PYMUPDF_BOLD_FLAG = 1 << 4                                                      # <-- 16

def _is_bold_span(span: dict) -> bool:
    flags    = int(span.get("flags", 0))
    font     = str(span.get("font", "")).lower()
    if flags & PYMUPDF_BOLD_FLAG:
        return True
    return any(token in font for token in ("bold", "black", "heavy"))           # <-- Fallback: font name heuristic

# endregion -------------------------------------------------------------------

# =============================================================================
# REGION | Line Aggregation
# =============================================================================

# Reduces the multiple spans that PyMuPDF reports for a single line into one
# logical line: concatenated text, dominant font size (widest-character), and
# "bold" = True when the dominant span is bold.
def _collapse_line_spans(spans: Iterable[dict]) -> tuple[str, float, bool]:
    spans = list(spans)
    if not spans:
        return "", 0.0, False

    text_parts : list[str] = []
    weighted_size_num = 0.0                                                     # <-- Sum of (size * char_count)
    weighted_size_den = 0                                                       # <-- Sum of char counts
    dominant_size     = 0.0
    dominant_chars    = -1
    dominant_bold     = False

    for span in spans:
        raw = span.get("text", "")
        if not raw:
            continue
        size = float(span.get("size", 0.0))
        bold = _is_bold_span(span)
        chars = len(raw)

        text_parts.append(raw)
        weighted_size_num += size * chars
        weighted_size_den += chars

        if chars > dominant_chars:                                              # <-- Track the widest span for bold decision
            dominant_size  = size
            dominant_chars = chars
            dominant_bold  = bold

    text = "".join(text_parts)
    if weighted_size_den > 0:
        avg_size = weighted_size_num / weighted_size_den
    else:
        avg_size = dominant_size
    return text, avg_size, dominant_bold

# endregion -------------------------------------------------------------------

# =============================================================================
# REGION | Public API
# =============================================================================

# Extracts TextSpans from a specific set of pages of a PDF document.
# Only pages in `target_pages` are processed; all others are skipped.
def extract_text_spans(
    pdf_path     : str | Path,
    target_pages : Iterable[int],
) -> list[TextSpan]:
    pdf_path      = Path(pdf_path)
    target_set    = set(target_pages)
    spans_out     : list[TextSpan] = []
    line_counter  = 0

    if not target_set:
        return spans_out

    with fitz.open(pdf_path) as doc:
        for page_idx in sorted(target_set):
            if page_idx < 0 or page_idx >= doc.page_count:
                continue
            page = doc.load_page(page_idx)
            page_dict = page.get_text("dict") or {}

            for block in page_dict.get("blocks", []):
                if block.get("type", 0) != 0:                                   # <-- type==1 is an image block; skip
                    continue
                for line in block.get("lines", []):
                    text, size, bold = _collapse_line_spans(line.get("spans", []))
                    cleaned = text.strip()
                    if not cleaned:
                        continue
                    spans_out.append(TextSpan(
                        text=cleaned,
                        font_size=size,
                        is_bold=bold,
                        page=page_idx,
                        line_id=line_counter,
                    ))
                    line_counter += 1

    logging.info(f"EmbeddedTextExtractor | extracted {len(spans_out)} lines from {len(target_set)} page(s)")
    return spans_out

# endregion -------------------------------------------------------------------
