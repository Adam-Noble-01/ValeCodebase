# Py_PdfUtils__PdfToTextExtractor

A modular Tkinter utility that extracts text from PDF documents and writes it
as a structured Markdown file. For text-native PDFs it uses PyMuPDF for fast,
high-fidelity extraction. For scanned / image-only PDFs it uses a
**PyMuPDF -> Tesseract direct pipeline**: each scanned page is rasterised
in-process to a temporary PNG via `fitz.Page.get_pixmap(dpi=300)`, then
`tesseract.exe` is invoked as a subprocess to read the PNG. No Ghostscript
required. A header-hierarchy mapper promotes large / bold lines to
`#`, `##`, `###`, `####` (with `#` enforced to appear at most once per
document).

## Folder layout

```
Py_PdfUtils__PdfToTextExtractor/
    Py_PdfUtils__PdfToTextExtractor__Main__.py      Bootstrap + Tk launch
    INSTALL_DEPENDENCIES.bat / .sh                  Installs libs into per-package folders
    Start__PdfToTextExtractor__.ps1                 Windows launcher
    00__ThirdParty__VersionLockedDependencies/      Isolated libs (NN__*__PythonPackage__)
    02__Src__AppModules/
        01__AppCore/                                Tk GUI orchestrator
        02__AppUtils/                               Path + date helpers
        10__System__PdfTypeDetector/                Per-page text-vs-image classifier
        20__System__EmbeddedTextExtractor/          PyMuPDF text + font-size extractor
        30__System__OcrTextExtractor/               PyMuPDF -> Tesseract OCR pipeline
        40__System__HeaderHierarchyMapper/          Font-size / heuristic --> Markdown levels
        50__System__MarkdownWriter/                 Emits the final .md file
```

## Python dependencies

Only **PyMuPDF** is bundled in `00__ThirdParty__VersionLockedDependencies/`.
The OCR path no longer needs `ocrmypdf`, `pdfplumber`, `Pillow`, or
`pdfminer.six` - PyMuPDF rasterises pages and Tesseract does the OCR.

## Native binaries required (for the OCR path)

The embedded-text path is fully portable and needs no native binaries.

The OCR path requires **Tesseract only** - PyMuPDF rasterises each scanned
page to a temp PNG in-process so no Ghostscript is needed.

- Tesseract OCR Engine (Windows: UB Mannheim build)
  <https://github.com/UB-Mannheim/tesseract/wiki>

Auto-detection probes these locations, so no `PATH` edit / shell restart is
required after a fresh install:

- `C:\Program Files\Tesseract-OCR`
- `C:\Program Files (x86)\Tesseract-OCR`
- `%LOCALAPPDATA%\Programs\Tesseract-OCR`
- `%USERPROFILE%\scoop\apps\tesseract\current`

If Tesseract is missing, the GUI still works for text-native PDFs and surfaces
a clean install prompt when you try to OCR a scanned document.

## First-time setup

1. Run `INSTALL_DEPENDENCIES.bat` (Windows) or `INSTALL_DEPENDENCIES.sh` (Unix)
   to populate `00__ThirdParty__VersionLockedDependencies/` with the isolated
   PyMuPDF package folder.
2. Install Tesseract-OCR (see link above) if you need to process scanned PDFs.
3. Launch via `Start__PdfToTextExtractor__.ps1` or directly:
   `python Py_PdfUtils__PdfToTextExtractor__Main__.py`

## Output

The app writes:
`<OriginalStem>__TextExtracted__<DD-Mon-YYYY>__.md`
to the folder you choose in the GUI.
