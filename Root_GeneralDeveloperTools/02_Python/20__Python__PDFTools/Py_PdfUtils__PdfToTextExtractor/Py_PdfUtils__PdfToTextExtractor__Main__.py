# =============================================================================
# Py_PdfUtils__PdfToTextExtractor__Main__.py
# =============================================================================
# Description : GUI utility for extracting text from PDF documents into a
#               structured Markdown (.md) file. Uses PyMuPDF for text-native
#               PDFs and a PyMuPDF -> Tesseract direct pipeline for scanned /
#               image-only PDFs (pages are rasterised to temp PNGs then read
#               by tesseract.exe via subprocess - no Ghostscript required).
#               A header-hierarchy mapper promotes large or bold lines to
#               #, ##, ### and #### with # used at most once per document.
# Author      : Adam Noble - Studio NoodlFjord
# Created     : 2026-04-23
# Version     : 1.1.0
# Dependencies: tkinter, PyMuPDF (fitz)
#               (PyMuPDF bundled in 00__ThirdParty__VersionLockedDependencies)
# Native      : Tesseract-OCR (required only for OCR path)
# Usage       : python Py_PdfUtils__PdfToTextExtractor__Main__.py
# Notes       :
# - Every exterior Python package lives in its own isolated subfolder inside
#   00__ThirdParty__VersionLockedDependencies so the whole tool is portable.
# - The OCR path additionally requires native Tesseract-OCR; it is auto-
#   detected on PATH and at common install locations (Program Files,
#   %LOCALAPPDATA%\Programs\Tesseract-OCR). A clear install prompt is
#   surfaced when it is genuinely missing.
# - Output filename format: <OriginalStem>__TextExtracted__DD-Mon-YYYY__.md
# =============================================================================

# =============================================================================
# PHASE 1 : LOADING LIBRARIES
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | Load Basic Python Libraries
# -----------------------------------------------------------------------------
import os
import sys
import logging
import tkinter as tk
from pathlib import Path
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Load Version-Locked Exterior Libraries
# -----------------------------------------------------------------------------
# Each exterior package lives in its own subfolder. We add every subfolder
# named NN__*__PythonPackage__ to sys.path so imports resolve locally.
deps_root = Path(__file__).parent / "00__ThirdParty__VersionLockedDependencies"
if deps_root.exists():
    for pkg_dir in sorted(deps_root.iterdir()):
        if pkg_dir.is_dir() and pkg_dir.name.endswith("__PythonPackage__"):
            sys.path.insert(0, str(pkg_dir))
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Register Application Module Paths
# -----------------------------------------------------------------------------
# Each numbered module folder under 02__Src__AppModules is registered so the
# app-core orchestrator can `import` them by their internal module filenames.
modules_root = Path(__file__).parent / "02__Src__AppModules"
if modules_root.exists():
    for mod_dir in sorted(modules_root.iterdir()):
        if mod_dir.is_dir():
            sys.path.insert(0, str(mod_dir))
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Load Shared Noble Icon Loader
# -----------------------------------------------------------------------------
parent_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))        # <-- Navigate up three levels to 02_Python root
icon_loader_path = os.path.join(parent_dir, "02__Python__CommonLocalCodeLibs")  # <-- Build path to common local code libs
if icon_loader_path not in sys.path:
    sys.path.insert(0, os.path.abspath(icon_loader_path))

try:
    from Py_CoreCommonUtils__IconLoaderAndHandling import set_noble_icon  # type: ignore
except ImportError as e:
    logging.warning(f"Could not import icon handling module: {e}. Windows will use default icons.")
    def set_noble_icon(window):                                                 # <-- Fallback no-op
        pass
# endregion -------------------------------------------------------------------

# =============================================================================
# PHASE 2 : LOGGING CONFIGURATION
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | Logging Setup
# -----------------------------------------------------------------------------
script_dir = os.path.dirname(os.path.abspath(__file__))
logging.basicConfig(
    filename=os.path.join(script_dir, "Py_PdfUtils__PdfToTextExtractor.log"),
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
# endregion -------------------------------------------------------------------

# =============================================================================
# PHASE 3 : MAIN ENTRY POINT
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | Launch GUI Application
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    try:
        from Py_PdfUtils__PdfToTextExtractor__AppCore import PdfToTextExtractorApp
    except ImportError as e:
        logging.error(f"Failed to load core application module: {e}", exc_info=True)
        print(f"[ERROR] Failed to load core application module: {e}")
        print("[INFO] Did you run INSTALL_DEPENDENCIES.bat first?")
        sys.exit(1)

    root_app = tk.Tk()
    set_noble_icon(root_app)
    app = PdfToTextExtractorApp(root_app)
    root_app.mainloop()
# endregion -------------------------------------------------------------------
