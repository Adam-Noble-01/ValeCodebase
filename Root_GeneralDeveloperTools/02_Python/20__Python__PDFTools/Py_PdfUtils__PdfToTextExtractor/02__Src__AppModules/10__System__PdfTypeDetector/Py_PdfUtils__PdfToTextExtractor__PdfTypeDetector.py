# =============================================================================
# Py_PdfUtils__PdfToTextExtractor__PdfTypeDetector.py
# =============================================================================
# Description : Classifies every page of a PDF as either "text" (selectable,
#               text-native) or "ocr" (image-only / scanned) so the
#               orchestrator can route each page through the correct
#               extraction pipeline.
# =============================================================================

from __future__ import annotations

import logging
from pathlib import Path

import fitz                                                                     # <-- PyMuPDF

from Py_PdfUtils__PdfToTextExtractor__AppUtils import PageStrategy

# =============================================================================
# REGION | Configuration Constants
# =============================================================================

MIN_CHARS_FOR_TEXT_PAGE = 30                                                    # <-- Threshold: >= 30 non-space chars means the page has real embedded text
MIN_WORDS_FOR_TEXT_PAGE = 10                                                    # <-- OR >= 10 whitespace-separated tokens

# endregion -------------------------------------------------------------------

# =============================================================================
# REGION | Public API
# =============================================================================

# Returns {page_index -> "text" | "ocr"} and the total page count.
# Opens the PDF once and probes each page's selectable text content.
def classify_pdf_pages(pdf_path: str | Path) -> tuple[dict[int, PageStrategy], int]:
    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    strategies: dict[int, PageStrategy] = {}
    with fitz.open(pdf_path) as doc:
        page_count = doc.page_count
        for idx in range(page_count):
            page          = doc.load_page(idx)
            raw_text      = page.get_text("text") or ""
            stripped      = raw_text.strip()
            char_count    = len(stripped)
            word_count    = len(stripped.split()) if stripped else 0

            is_text_page  = char_count >= MIN_CHARS_FOR_TEXT_PAGE or word_count >= MIN_WORDS_FOR_TEXT_PAGE
            strategies[idx] = "text" if is_text_page else "ocr"

            logging.info(
                f"PdfTypeDetector | page={idx + 1}/{page_count} "
                f"chars={char_count} words={word_count} -> {strategies[idx]}"
            )

    return strategies, page_count

# endregion -------------------------------------------------------------------

# =============================================================================
# REGION | Strategy Overrides
# =============================================================================

# Replaces all detected strategies with a forced one ("text" or "ocr").
# Used by the GUI's "Force embedded-text only" / "Force OCR only" modes.
def override_all_pages(
    strategies: dict[int, PageStrategy], forced: PageStrategy
) -> dict[int, PageStrategy]:
    return {idx: forced for idx in strategies.keys()}

# endregion -------------------------------------------------------------------
