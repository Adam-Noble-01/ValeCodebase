# =============================================================================
# Py_PdfUtils__PdfToTextExtractor__OcrTextExtractor.py
# =============================================================================
# Description : OCRs image-only / scanned PDF pages via a PyMuPDF -> Tesseract
#               direct pipeline. Each target page is rasterised in-process to
#               a temporary PNG using fitz.get_pixmap, then tesseract.exe is
#               invoked as a subprocess to read text from that PNG. Keeps the
#               public API (OcrResult, check_native_binaries,
#               ensure_native_binaries_on_path, build_install_guidance,
#               extract_ocr_lines) identical to the old OCRmyPDF version so
#               callers need no changes. No Ghostscript dependency.
# =============================================================================

from __future__ import annotations

import logging
import os
import shutil
import subprocess
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

import fitz                                                                     # <-- PyMuPDF (for page -> PNG rasterisation)

# =============================================================================
# REGION | Constants
# =============================================================================

OCR_RENDER_DPI   = 300                                                          # <-- Render DPI for temp PNGs (300 = Tesseract sweet spot)
OCR_LANGUAGE     = "eng"                                                        # <-- Default Tesseract language pack
_CREATE_NO_WINDOW = 0x08000000                                                  # <-- Windows flag: suppress console popup on subprocess

# endregion -------------------------------------------------------------------

# =============================================================================
# REGION | Result + Error Data Types
# =============================================================================

@dataclass
class OcrResult:
    success          : bool                                                     # <-- True when OCR completed and produced text
    lines_per_page   : dict[int, list[str]] = field(default_factory=dict)       # <-- {page_index -> [line1, line2, ...]}
    missing_binaries : list[str]            = field(default_factory=list)       # <-- e.g. ["tesseract"]
    error_message    : str                  = ""                                # <-- Populated on failure

# endregion -------------------------------------------------------------------

# =============================================================================
# REGION | Native Binary Preflight
# =============================================================================

# Locations the Tesseract installer is known to use on Windows. We probe these
# in addition to PATH so users who picked the "Local\Programs" installer (no
# PATH entry) still get automatic detection without restarting their shell.
_TESSERACT_CANDIDATE_DIRS = [
    r"C:\Program Files\Tesseract-OCR",
    r"C:\Program Files (x86)\Tesseract-OCR",
    os.path.expandvars(r"%LOCALAPPDATA%\Programs\Tesseract-OCR"),
    os.path.expandvars(r"%USERPROFILE%\AppData\Local\Programs\Tesseract-OCR"),
    os.path.expandvars(r"%USERPROFILE%\scoop\apps\tesseract\current"),
]


# Returns the absolute path to a tesseract executable, or None when absent.
# Checks PATH first, then the well-known install locations.
def _locate_tesseract_exe() -> Path | None:
    path_hit = shutil.which("tesseract")
    if path_hit:
        return Path(path_hit)
    for candidate_dir in _TESSERACT_CANDIDATE_DIRS:
        exe = Path(candidate_dir) / "tesseract.exe"
        if exe.exists():
            return exe
    return None


# Returns the list of missing native binaries (currently just "tesseract"),
# or an empty list when tesseract is discoverable (via PATH or known install).
def check_native_binaries() -> list[str]:
    missing: list[str] = []
    if _locate_tesseract_exe() is None:
        missing.append("tesseract")
    return missing


# Prepends the discovered Tesseract directory to PATH for this process so
# subprocess calls to `tesseract` resolve correctly even when the user hasn't
# added the install dir to their system/user PATH.
def ensure_native_binaries_on_path() -> dict[str, Path | None]:
    tesseract_exe = _locate_tesseract_exe()

    if tesseract_exe:
        current_path  = os.environ.get("PATH", "")
        current_parts = [p for p in current_path.split(os.pathsep) if p]
        parent_dir    = str(tesseract_exe.parent)
        if parent_dir not in current_parts:
            os.environ["PATH"] = os.pathsep.join([parent_dir] + current_parts)
            logging.info(f"OcrTextExtractor | prepended to PATH: {parent_dir}")

    return {"tesseract": tesseract_exe}


# Human-readable install guidance emitted when Tesseract is missing.
def build_install_guidance(missing: list[str]) -> str:
    lines = ["OCR cannot run - the following native binary is missing:"]
    if "tesseract" in missing:
        lines.append("  - Tesseract OCR Engine")
        lines.append("      Windows installer: https://github.com/UB-Mannheim/tesseract/wiki")
    lines.append("")
    lines.append("The app auto-detects installs under Program Files, Program Files (x86),")
    lines.append("and %LOCALAPPDATA%\\Programs\\Tesseract-OCR, so no shell restart is needed.")
    lines.append("Install Tesseract, close this dialog, then click 'Extract to Markdown' again.")
    lines.append("")
    lines.append("Text-native PDFs continue to extract without Tesseract.")
    return "\n".join(lines)

# endregion -------------------------------------------------------------------

# =============================================================================
# REGION | PyMuPDF Rasterisation + Tesseract Invocation
# =============================================================================

# Renders one PDF page to a PNG in out_dir at OCR_RENDER_DPI and returns the
# PNG path. Mirrors the approach used by Py_PdfUtils__PdfToPngConverter.
def _render_page_to_png(doc: fitz.Document, page_idx: int, out_dir: Path) -> Path:
    page     = doc.load_page(page_idx)
    pixmap   = page.get_pixmap(dpi=OCR_RENDER_DPI, alpha=False)
    png_path = out_dir / f"page_{page_idx:04d}.png"
    pixmap.save(str(png_path))
    return png_path


# Runs tesseract.exe against a PNG and returns its stdout as a list of
# non-blank text lines. "-" as the output argument streams text to stdout
# rather than writing a sidecar file; stderr is captured separately so
# Tesseract's progress lines don't pollute the result.
def _run_tesseract_on_png(tesseract_exe: Path, png_path: Path) -> list[str]:
    creationflags = _CREATE_NO_WINDOW if os.name == "nt" else 0
    completed = subprocess.run(
        [str(tesseract_exe), str(png_path), "-", "-l", OCR_LANGUAGE],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        creationflags=creationflags,
        check=False,
    )
    if completed.returncode != 0:
        logging.warning(
            "OcrTextExtractor | tesseract non-zero exit (%s) on %s: %s",
            completed.returncode, png_path.name, completed.stderr.strip()[:400],
        )
    stdout = completed.stdout or ""
    return [line.rstrip() for line in stdout.splitlines() if line.strip()]

# endregion -------------------------------------------------------------------

# =============================================================================
# REGION | Public API
# =============================================================================

# OCRs the requested target_pages of `pdf_path` using the PyMuPDF -> Tesseract
# pipeline and returns an OcrResult whose lines_per_page is keyed by 0-based
# page index. `force_ocr` is retained for API compatibility but is a no-op:
# with this pipeline the caller explicitly picks which pages to OCR, so we
# simply process every page in target_pages unconditionally.
def extract_ocr_lines(
    pdf_path     : str | Path,
    target_pages : set[int],
    total_pages  : int,
    force_ocr    : bool = False,                                                # <-- Kept for backwards-compat; see note above
) -> OcrResult:
    pdf_path = Path(pdf_path)

    ensure_native_binaries_on_path()                                            # <-- Inject known install dirs into PATH before preflight
    missing = check_native_binaries()
    if missing:
        message = build_install_guidance(missing)
        logging.warning(f"OcrTextExtractor | missing binaries: {missing}")
        return OcrResult(success=False, missing_binaries=missing, error_message=message)

    tesseract_exe = _locate_tesseract_exe()
    if tesseract_exe is None:                                                   # <-- Defensive; check_native_binaries already covers this
        return OcrResult(
            success=False,
            missing_binaries=["tesseract"],
            error_message=build_install_guidance(["tesseract"]),
        )

    if not target_pages:                                                        # <-- Nothing to OCR -> return empty success result
        logging.info("OcrTextExtractor | no target pages requested, skipping OCR")
        return OcrResult(success=True, lines_per_page={})

    lines_per_page : dict[int, list[str]] = {}

    try:
        with fitz.open(str(pdf_path)) as doc:
            with tempfile.TemporaryDirectory(prefix="pdf_text_extractor__ocr__") as tmp_dir:
                tmp_path = Path(tmp_dir)
                for page_idx in sorted(target_pages):
                    if not (0 <= page_idx < total_pages):                       # <-- Silently skip out-of-range requests
                        lines_per_page[page_idx] = []
                        continue
                    try:
                        png_path = _render_page_to_png(doc, page_idx, tmp_path)
                        page_lines = _run_tesseract_on_png(tesseract_exe, png_path)
                        lines_per_page[page_idx] = page_lines
                    except Exception as exc:
                        logging.error(
                            "OcrTextExtractor | page %d OCR failed: %s", page_idx, exc, exc_info=True,
                        )
                        lines_per_page[page_idx] = []
    except Exception as exc:
        logging.error("OcrTextExtractor | pipeline failure: %s", exc, exc_info=True)
        return OcrResult(success=False, error_message=str(exc))

    total_lines = sum(len(v) for v in lines_per_page.values())
    logging.info(
        f"OcrTextExtractor | OCR'd {len(lines_per_page)} page(s), {total_lines} line(s) total"
    )
    return OcrResult(success=True, lines_per_page=lines_per_page)

# endregion -------------------------------------------------------------------
