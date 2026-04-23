# =============================================================================
# Py_PdfUtils__PdfToTextExtractor__AppUtils.py
# =============================================================================
# Description : Small, dependency-free helpers shared across all modules.
#               Date formatting, output-filename construction, and the core
#               TextSpan / MarkdownBlock data types.
# =============================================================================

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Literal

# =============================================================================
# REGION | Shared Data Types
# =============================================================================

# A single run of styled text extracted from a text-native PDF page.
@dataclass(frozen=True)
class TextSpan:
    text      : str                                    # <-- Raw text content of this span
    font_size : float                                  # <-- Font size in points
    is_bold   : bool                                   # <-- True when the font reports bold flag
    page      : int                                    # <-- Zero-based page index
    line_id   : int                                    # <-- Monotonic line counter within the document

# A paragraph / header block ready for Markdown emission.
# level 0 == body text, levels 1-4 == heading depth (# .. ####).
@dataclass(frozen=True)
class MarkdownBlock:
    level : int                                        # <-- 0 == body, 1..4 == heading depth
    text  : str                                        # <-- Plain text (no leading hashes)
    page  : int                                        # <-- Zero-based page index

PageStrategy = Literal["text", "ocr"]                  # <-- Per-page extraction strategy marker

# endregion -------------------------------------------------------------------

# =============================================================================
# REGION | Date + Filename Helpers
# =============================================================================

# Returns today's date formatted as DD-Mon-YYYY (e.g. 23-Apr-2026).
def format_date_stamp(when: datetime | None = None) -> str:
    when = when or datetime.now()
    return when.strftime("%d-%b-%Y")


# Builds "<stem>__TextExtracted__<DD-Mon-YYYY>__.md" next to an output folder.
def build_output_markdown_path(source_pdf: str | Path, output_dir: str | Path) -> Path:
    source = Path(source_pdf)
    stem   = source.stem
    stamp  = format_date_stamp()
    return Path(output_dir) / f"{stem}__TextExtracted__{stamp}__.md"

# endregion -------------------------------------------------------------------

# =============================================================================
# REGION | Page Strategy Summary
# =============================================================================

# Compresses a per-page strategy map into a human-readable summary like
# "Pages 1-3: text | Pages 4-7: OCR". Used by the GUI status panel and the
# Markdown front-matter block.
def summarise_page_strategies(strategies: dict[int, PageStrategy]) -> str:
    if not strategies:
        return "(no pages)"

    pages = sorted(strategies.keys())
    runs: list[tuple[int, int, PageStrategy]] = []
    run_start = pages[0]
    run_kind  = strategies[run_start]
    prev      = run_start

    for page in pages[1:]:
        kind = strategies[page]
        if kind == run_kind and page == prev + 1:
            prev = page
            continue
        runs.append((run_start, prev, run_kind))
        run_start = page
        run_kind  = kind
        prev      = page
    runs.append((run_start, prev, run_kind))

    labels = {"text": "text", "ocr": "OCR"}
    parts: list[str] = []
    for start, end, kind in runs:
        human_start = start + 1                                                 # <-- Convert to 1-based for display
        human_end   = end + 1
        if human_start == human_end:
            parts.append(f"Page {human_start}: {labels[kind]}")
        else:
            parts.append(f"Pages {human_start}-{human_end}: {labels[kind]}")
    return " | ".join(parts)

# endregion -------------------------------------------------------------------
