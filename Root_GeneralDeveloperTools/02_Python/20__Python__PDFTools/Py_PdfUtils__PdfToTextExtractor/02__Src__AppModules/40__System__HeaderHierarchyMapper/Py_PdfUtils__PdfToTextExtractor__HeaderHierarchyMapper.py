# =============================================================================
# Py_PdfUtils__PdfToTextExtractor__HeaderHierarchyMapper.py
# =============================================================================
# Description : Converts raw extracted content into a stream of MarkdownBlocks
#               with heading levels assigned. Two strategies live here:
#                 - FONT-SIZE STRATEGY (for TextSpans from the embedded path)
#                 - TEXT-HEURISTIC STRATEGY (for OCR sidecar plain lines)
#               Both enforce the rule "# may appear at most once per document".
#               Remaining bucket tiers map to ##, ### and #### in descending
#               order of prominence (max 4 levels of hierarchy).
# =============================================================================

from __future__ import annotations

import logging
import re
import statistics
from typing import Iterable

from Py_PdfUtils__PdfToTextExtractor__AppUtils import MarkdownBlock, TextSpan

# =============================================================================
# REGION | Configuration Constants
# =============================================================================

MAX_HEADER_CHAR_LENGTH   = 120                                                  # <-- Lines longer than this are never headers
MAX_HEADER_WORDS         = 18                                                   # <-- Lines with more words than this are always body
HEADER_SIZE_BOOST_RATIO  = 1.15                                                 # <-- Size must exceed median body size by this ratio to qualify
MAX_HEADER_LEVELS        = 4                                                    # <-- #, ##, ### and ####
SIZE_CLUSTER_TOLERANCE   = 0.75                                                 # <-- Point difference treated as the same tier

PAGE_NUMBER_PATTERN = re.compile(r"^\s*(?:page\s+)?\d{1,4}(?:\s*/\s*\d{1,4})?\s*$", re.IGNORECASE)

# endregion -------------------------------------------------------------------

# =============================================================================
# REGION | Shared Helpers
# =============================================================================

# True when a line looks structural enough to *possibly* be a header.
def _is_header_candidate_shape(text: str) -> bool:
    stripped = text.strip()
    if not stripped:
        return False
    if len(stripped) > MAX_HEADER_CHAR_LENGTH:
        return False
    if len(stripped.split()) > MAX_HEADER_WORDS:
        return False
    if stripped.endswith(tuple(".,;:")):                                        # <-- Sentences rarely end headers
        return False
    if PAGE_NUMBER_PATTERN.match(stripped):                                     # <-- Strip "Page 3 / 12" footers
        return False
    return True


# Rounds a font size to a granularity used for bucketing similar sizes.
def _quantise_size(size: float) -> float:
    return round(size / SIZE_CLUSTER_TOLERANCE) * SIZE_CLUSTER_TOLERANCE

# endregion -------------------------------------------------------------------

# =============================================================================
# REGION | Font-Size Strategy
# =============================================================================

# Builds ordered header tiers (largest first, max 4) from the pool of plausible
# header font sizes in the document. Body text sizes are excluded.
def _determine_header_tiers(spans: list[TextSpan]) -> list[float]:
    if not spans:
        return []

    all_sizes         = [s.font_size for s in spans if s.font_size > 0]
    if not all_sizes:
        return []
    median_body_size  = statistics.median(all_sizes)

    candidate_sizes: list[float] = []
    for span in spans:
        if not _is_header_candidate_shape(span.text):
            continue
        is_prominent = span.is_bold or span.font_size >= median_body_size * HEADER_SIZE_BOOST_RATIO
        if not is_prominent:
            continue
        candidate_sizes.append(_quantise_size(span.font_size))

    if not candidate_sizes:
        return []

    unique_sorted = sorted(set(candidate_sizes), reverse=True)                  # <-- Largest first
    tiers         = unique_sorted[:MAX_HEADER_LEVELS]
    logging.info(f"HeaderMapper | header tiers (font size, desc): {tiers} (body median={median_body_size:.2f})")
    return tiers


# Assigns a heading level (1..4) to a span's font size, or 0 for body text.
def _level_for_size(span: TextSpan, tiers: list[float], median_body_size: float) -> int:
    if not _is_header_candidate_shape(span.text):
        return 0
    is_prominent = span.is_bold or span.font_size >= median_body_size * HEADER_SIZE_BOOST_RATIO
    if not is_prominent:
        return 0

    quantised = _quantise_size(span.font_size)
    for level_idx, tier_size in enumerate(tiers):
        if quantised >= tier_size - 1e-6:
            return level_idx + 1                                                # <-- tier 0 -> level 1 (#)
    return 0


# Converts a list of TextSpans into MarkdownBlocks with heading levels applied.
# Enforces the single-# rule: only the first span at the top tier keeps level 1,
# any subsequent top-tier spans are demoted to level 2.
def map_spans_to_blocks(spans: list[TextSpan]) -> list[MarkdownBlock]:
    if not spans:
        return []

    tiers             = _determine_header_tiers(spans)
    all_sizes         = [s.font_size for s in spans if s.font_size > 0]
    median_body_size  = statistics.median(all_sizes) if all_sizes else 0.0

    blocks: list[MarkdownBlock] = []
    h1_already_used = False

    for span in spans:
        level = _level_for_size(span, tiers, median_body_size)
        if level == 1:
            if h1_already_used:
                level = 2                                                       # <-- Demote duplicate top-tier headings to ##
            else:
                h1_already_used = True
        blocks.append(MarkdownBlock(level=level, text=span.text, page=span.page))

    return blocks

# endregion -------------------------------------------------------------------

# =============================================================================
# REGION | Text-Heuristic Strategy (OCR path)
# =============================================================================

# Decides a heading level for a plain OCR line based on casing and shape.
# Returns 0 (body), 2 (##), or 3 (###). Level 1 is assigned separately to the
# first title-like line of the document only.
def _heuristic_level_for_line(text: str) -> int:
    if not _is_header_candidate_shape(text):
        return 0

    stripped = text.strip()
    word_count = len(stripped.split())

    if word_count <= 12 and stripped == stripped.upper() and any(c.isalpha() for c in stripped):
        return 2                                                                # <-- ALL CAPS short line -> ##
    if word_count <= 10 and _is_title_case(stripped):
        return 3                                                                # <-- Title Case short line -> ###
    return 0


# Rough Title Case check: each non-trivial word starts with an uppercase letter.
def _is_title_case(text: str) -> bool:
    words = [w for w in text.split() if w.isalpha() and len(w) > 2]
    if len(words) < 2:
        return False
    return all(w[0].isupper() for w in words)


# Converts OCR sidecar lines per page into MarkdownBlocks.
# Single-# rule: the very first heuristic header found across the document
# (on any OCR page) becomes the document H1.
def map_ocr_lines_to_blocks(
    lines_per_page : dict[int, list[str]],
) -> list[MarkdownBlock]:
    blocks: list[MarkdownBlock] = []
    h1_used = False

    for page_idx in sorted(lines_per_page.keys()):
        for raw_line in lines_per_page[page_idx]:
            level = _heuristic_level_for_line(raw_line)
            if level > 0 and not h1_used:
                level = 1
                h1_used = True
            blocks.append(MarkdownBlock(level=level, text=raw_line.strip(), page=page_idx))

    return blocks

# endregion -------------------------------------------------------------------

# =============================================================================
# REGION | Merged Document Pass
# =============================================================================

# Combines blocks from the text-native path and the OCR path into one sorted
# stream ordered by page then (for the text path) line_id. Enforces the
# document-wide single-# rule after the merge: keeps the first level-1 block
# in page order and demotes any subsequent level-1 to level-2.
def merge_and_enforce_single_h1(
    text_blocks : list[MarkdownBlock],
    ocr_blocks  : list[MarkdownBlock],
) -> list[MarkdownBlock]:
    merged = sorted(
        list(text_blocks) + list(ocr_blocks),
        key=lambda b: (b.page, 0),                                              # <-- Stable sort; within-page order already correct
    )

    output: list[MarkdownBlock] = []
    h1_used = False
    for block in merged:
        level = block.level
        if level == 1:
            if h1_used:
                level = 2
            else:
                h1_used = True
        output.append(MarkdownBlock(level=level, text=block.text, page=block.page))
    return output

# endregion -------------------------------------------------------------------

# =============================================================================
# REGION | Public Convenience Wrapper
# =============================================================================

# Used by the orchestrator: give it all spans + all OCR lines and get back the
# final, document-ordered, hierarchy-enforced block list.
def build_markdown_blocks(
    spans              : Iterable[TextSpan],
    ocr_lines_per_page : dict[int, list[str]],
) -> list[MarkdownBlock]:
    text_blocks = map_spans_to_blocks(list(spans))
    ocr_blocks  = map_ocr_lines_to_blocks(ocr_lines_per_page)
    return merge_and_enforce_single_h1(text_blocks, ocr_blocks)

# endregion -------------------------------------------------------------------
