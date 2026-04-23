# =============================================================================
# PY_PDFUTILS__PDFTOTEXTEXTRACTOR |  DEVELOPMENT LOG
# =============================================================================
- Add latest changes to the top of the file.
- Older changes descend in chronological order.


# -----------------------------------------------------------------------------
## PdfToTextExtractor - v1.1.0 - 23-Apr-2026 - Drop Ghostscript, PyMuPDF -> Tesseract direct OCR

### Summary
Replaced the `OCRmyPDF` + Ghostscript pipeline with a leaner, in-process
"PyMuPDF rasterises each scanned page to a temp PNG, then `tesseract.exe`
reads the PNG via subprocess" pipeline. Ghostscript is no longer a dependency
at all, and three never-imported Python packages (`pdfplumber`, `Pillow`,
`pdfminer.six`) have been purged from the bundled dependencies folder. OCR
quality is unchanged (Tesseract is still doing the recognition in both
designs), setup is dramatically simpler, and the repo is ~707 MB lighter.

### New OCR pipeline (`30__System__OcrTextExtractor`)
- `Py_PdfUtils__PdfToTextExtractor__OcrTextExtractor.py` rewritten end-to-end.
  Public API kept identical so `AppCore` needs no changes:
  - `OcrResult`, `check_native_binaries()`, `ensure_native_binaries_on_path()`,
    `build_install_guidance()`, `extract_ocr_lines()` all preserved.
- New constants: `OCR_RENDER_DPI = 300`, `OCR_LANGUAGE = "eng"`,
  `_CREATE_NO_WINDOW = 0x08000000` (Windows subprocess console suppression).
- New helper `_render_page_to_png(doc, page_idx, out_dir)` uses
  `page.get_pixmap(dpi=300, alpha=False).save(...)` - mirrors the approach
  already used by `Py_PdfUtils__PdfToPngConverter`.
- New helper `_run_tesseract_on_png(tesseract_exe, png_path)` invokes
  `tesseract <png> - -l eng` via `subprocess.run`, streams text from stdout,
  captures stderr separately, and logs non-zero exit codes without crashing
  the whole pipeline.
- `extract_ocr_lines(...)` now opens the PDF once via `fitz.open(...)`, spins
  up a `TemporaryDirectory(prefix="pdf_text_extractor__ocr__")`, renders each
  target page to PNG, runs Tesseract, and collects the `lines_per_page` dict.
  Individual page failures are logged and yield an empty line list for that
  page rather than aborting the whole job.
- Removed entirely: `_split_sidecar(...)` (no sidecar now), `_GHOSTSCRIPT_ROOT_DIRS`,
  `_locate_ghostscript_exe(...)`, the Ghostscript branch of
  `check_native_binaries()`, and the Ghostscript section of
  `build_install_guidance()`.
- `check_native_binaries()` now returns `[]` or `["tesseract"]` only.
- `build_install_guidance()` shortened: single Tesseract bullet, auto-detect
  note, reminder that the text-native path works without Tesseract.

### Installer + bootstrap simplification
- `INSTALL_DEPENDENCIES.bat` and `INSTALL_DEPENDENCIES.sh`: removed the
  install blocks for `ocrmypdf==16.5.0`, `pdfplumber==0.11.4`,
  `Pillow==11.0.0`, and `pdfminer.six==20240706`. Only the PyMuPDF block
  remains. Completion message updated to reference Tesseract auto-detect
  paths instead of Ghostscript.
- `Py_PdfUtils__PdfToTextExtractor__Main__.py` header banner updated:
  - Description now says "PyMuPDF -> Tesseract direct pipeline" for OCR and
    explicitly notes no Ghostscript is required.
  - `Dependencies:` line collapsed from six packages to `tkinter, PyMuPDF (fitz)`.
  - New `Native:` line calls out Tesseract-OCR as the one OCR-path binary.
  - Version bumped `1.0.0` -> `1.1.0`.

### Dependency-folder cleanup (filesystem)
Under `00__ThirdParty__VersionLockedDependencies/` the following were
physically deleted (verified never-imported across `02__Src__AppModules/`
before removal):
- `01__Pdfplumber__PythonPackage__/` - 879 files, ~43 MB (never imported).
- `02__OcrMyPdf__PythonPackage__/` - 2,346 files, ~74 MB (the block being
  rewritten out).
- `03__Pillow__PythonPackage__/` - 213 files, ~7.1 MB (never imported; PyMuPDF
  saves PNGs natively).
- `04__Pdfminer__PythonPackage__/` - 508 files, ~19.4 MB (never imported).
- `05__GhosScript__SourceCode/` - ~500 MB of unusable Ghostscript source
  tarball + extracted sources that had been placed there by mistake.
- `gs10070w64.exe` - 62 MB Ghostscript Windows installer sitting loose in
  the deps root (no longer needed).

Kept: `00__PyMuPDF__PythonPackage__/`, `tesseract-ocr-w64-setup-5.5.0.20241111.exe`
(onboarding convenience), `Note__AllExteriorDepenciesMustBeSavedHere.Note`.

Reclaimed: ~707 MB, ~4,500 files. The deps folder now contains exactly one
Python package + one installer + one note file.

### Stale-artifact sweep
- `Py_PdfUtils__PdfToTextExtractor.log` truncated (held old
  `missing binaries: ['tesseract', 'ghostscript']` warnings that would read
  as confusing noise against the new pipeline).
- `02__Src__AppModules/30__System__OcrTextExtractor/__pycache__/` deleted so
  Python recompiles the new module from source on next launch instead of
  running the old `ocrmypdf`-referring bytecode.

### README
- Removed the entire Ghostscript paragraph from "Native binaries required".
- Added an explicit "Python dependencies" section calling out PyMuPDF as the
  only bundled package.
- Listed the four Tesseract auto-detect paths probed by the app so users know
  no PATH edit or shell restart is required after a fresh install.
- First-time setup step 1 now references "the isolated PyMuPDF package folder"
  (singular) rather than the old "per-package folders" wording.

### Runtime verification
End-to-end smoke test (built in-process, then deleted) that:
1. Rendered 4 lines of text with `fitz.Page.insert_text`.
2. Rasterised that page to a pixmap and wrapped it back into a new PDF as an
   image (no embedded text layer) - a synthetic "scanned" PDF.
3. Ran the full extraction pipeline: detector -> OCR -> header mapper ->
   Markdown writer.

Results:
- `classify_pdf_pages` correctly flagged the page as `ocr` (no selectable
  text present).
- New OCR pipeline returned all 4 lines verbatim, including the title, the
  section header, and both body sentences.
- Final Markdown contained every expected fragment.
- Total runtime: ~7.6 s for a single page at 300 DPI.

### Files changed
- `02__Src__AppModules/30__System__OcrTextExtractor/Py_PdfUtils__PdfToTextExtractor__OcrTextExtractor.py`
- `Py_PdfUtils__PdfToTextExtractor__Main__.py`
- `INSTALL_DEPENDENCIES.bat`
- `INSTALL_DEPENDENCIES.sh`
- `README.md`

### Files / folders deleted
- `00__ThirdParty__VersionLockedDependencies/01__Pdfplumber__PythonPackage__/`
- `00__ThirdParty__VersionLockedDependencies/02__OcrMyPdf__PythonPackage__/`
- `00__ThirdParty__VersionLockedDependencies/03__Pillow__PythonPackage__/`
- `00__ThirdParty__VersionLockedDependencies/04__Pdfminer__PythonPackage__/`
- `00__ThirdParty__VersionLockedDependencies/05__GhosScript__SourceCode/`
- `00__ThirdParty__VersionLockedDependencies/gs10070w64.exe`
- `02__Src__AppModules/30__System__OcrTextExtractor/__pycache__/`


# -----------------------------------------------------------------------------
## PdfToTextExtractor - v1.0.0 - 23-Apr-2026 - Initial build

### Summary
First working version of the PDF-to-Markdown extractor. Modular Tkinter
application that auto-classifies each PDF page as text-native or
image-only, extracts accordingly, maps font-size / text-heuristic cues to
Markdown header levels, and writes a dated `.md` file. Folder layout and
dependency-isolation scheme mirrors `WhitecardVision` / `ValeSpec`.

### Modules created (`02__Src__AppModules/`)
- `01__AppCore/Py_PdfUtils__PdfToTextExtractor__AppCore.py`
  Tkinter GUI orchestrator. File + output pickers, extraction-mode radio
  set (Auto / Force embedded / Force OCR), detection preview panel,
  threaded extraction with progress bar, native-binary preflight.
- `02__AppUtils/Py_PdfUtils__PdfToTextExtractor__AppUtils.py`
  Dataclasses (`TextSpan`, `MarkdownBlock`), `PageStrategy` literal,
  date-stamp formatter, output-path builder
  (`<Stem>__TextExtracted__DD-Mon-YYYY__.md`), per-page strategy summariser.
- `10__System__PdfTypeDetector/`
  Per-page text-vs-image classifier via PyMuPDF. Also exports
  `override_all_pages(...)` for the forced-mode toggles.
- `20__System__EmbeddedTextExtractor/`
  PyMuPDF `get_text("dict")` walker that collapses raw spans into logical
  lines with font-size + bold attributes preserved.
- `30__System__OcrTextExtractor/` - initial version using `ocrmypdf.ocr(...)`
  with preflight checks for system-installed Tesseract + Ghostscript.
- `40__System__HeaderHierarchyMapper/`
  Two strategies for promoting lines to `#` / `##` / `###` / `####`:
  font-size tiering for embedded text, text-pattern heuristics (ALL CAPS,
  Title Case, length) for OCR text. Global rule: `#` (H1) used at most
  once per document.
- `50__System__MarkdownWriter/`
  Writes provenance preamble (source, page count, per-page strategy
  breakdown, OCR-missing warnings) then block content. Consecutive body
  lines are grouped into paragraphs.

### Bootstrap
- `Py_PdfUtils__PdfToTextExtractor__Main__.py`
  - Prepends every `NN__*__PythonPackage__` subfolder to `sys.path` so
    bundled deps resolve locally.
  - Registers each `02__Src__AppModules/<NN__*>/` folder on `sys.path` so
    internal modules are importable by filename.
  - Pulls in the shared Noble icon loader from
    `02__Python__CommonLocalCodeLibs` (with a no-op fallback if absent).
  - Configures file logging to `Py_PdfUtils__PdfToTextExtractor.log` in the
    project root.

### Dependency isolation
- `00__ThirdParty__VersionLockedDependencies/` root.
- `INSTALL_DEPENDENCIES.bat` / `.sh` pip-install each library with
  `--target` into its own `NN__<Name>__PythonPackage__` subfolder.
- Initial bundle: PyMuPDF 1.24.10, pdfplumber 0.11.4, OCRmyPDF 16.5.0,
  Pillow 11.0.0, pdfminer.six 20240706.
- `Start__PdfToTextExtractor__.ps1` launcher for one-click Windows start.

### Native OCR binaries (initial design)
- Tesseract-OCR via UB Mannheim Windows installer.
- Ghostscript via the official AGPL Windows installer.
- Auto-discovery logic `_locate_tesseract_exe()` / `_locate_ghostscript_exe()`
  probed Program Files, Program Files (x86), `%LOCALAPPDATA%\Programs`,
  and `%USERPROFILE%\scoop\apps`.
- `ensure_native_binaries_on_path()` prepended discovered dirs to the
  current process `PATH` so subprocess calls resolved without a system
  PATH edit or shell restart.

### Output behaviour
- Auto-detect mode: per page, use embedded text extraction if the page
  carries selectable text, else OCR.
- "Force embedded text" mode: run the embedded path on every page regardless.
- "Force OCR" mode: run Tesseract on every page regardless.
- Markdown output filename: `<OriginalStem>__TextExtracted__DD-Mon-YYYY__.md`,
  written to the user-chosen output folder.
