# =============================================================================
# Py_PdfUtils__PdfToTextExtractor__AppCore.py
# =============================================================================
# Description : Tkinter GUI for the PDF-to-Text extraction engine. Wires all
#               system modules together:
#                 TypeDetector -> (EmbeddedTextExtractor + OcrTextExtractor)
#                              -> HeaderHierarchyMapper -> MarkdownWriter
#               Exposes three extraction modes (auto / force text / force OCR)
#               and a status panel that previews the per-page strategy before
#               the user commits to extraction.
# =============================================================================

from __future__ import annotations

import logging
import os
import threading
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox, ttk

from Py_PdfUtils__PdfToTextExtractor__AppUtils import (
    build_output_markdown_path,
    summarise_page_strategies,
)
from Py_PdfUtils__PdfToTextExtractor__PdfTypeDetector import (
    classify_pdf_pages,
    override_all_pages,
)
from Py_PdfUtils__PdfToTextExtractor__EmbeddedTextExtractor import extract_text_spans
from Py_PdfUtils__PdfToTextExtractor__OcrTextExtractor import (
    check_native_binaries,
    build_install_guidance,
    ensure_native_binaries_on_path,
    extract_ocr_lines,
)
from Py_PdfUtils__PdfToTextExtractor__HeaderHierarchyMapper import build_markdown_blocks
from Py_PdfUtils__PdfToTextExtractor__MarkdownWriter import write_markdown_document

# =============================================================================
# REGION | Extraction Mode Constants
# =============================================================================

MODE_AUTO       = "auto"                                                        # <-- Per-page detection decides text vs OCR
MODE_FORCE_TEXT = "force_text"                                                  # <-- All pages treated as text-native
MODE_FORCE_OCR  = "force_ocr"                                                   # <-- All pages routed through OCR

# endregion -------------------------------------------------------------------

# =============================================================================
# REGION | Application Class
# =============================================================================

class PdfToTextExtractorApp:
    # Main Tkinter application class orchestrating the extraction pipeline.

    # FUNCTION | Class Initialization
    # ------------------------------------------------------------
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("PDF -> Markdown Text Extractor")
        self.root.geometry("720x640")
        self.root.resizable(False, False)

        self.selected_pdf   : str | None = None
        self.output_dir     : str | None = None
        self.page_count     : int        = 0
        self.strategies     : dict[int, str] = {}
        self.mode_var       = tk.StringVar(value=MODE_AUTO)

        self._build_gui()
    # ------------------------------------------------------------

    # FUNCTION | Build GUI Layout
    # ------------------------------------------------------------
    def _build_gui(self) -> None:
        # Build the main GUI interface
        tk.Label(
            self.root,
            text="Extract text from a PDF and save it as a structured Markdown file.",
            font=("Arial", 10, "bold"),
        ).pack(pady=(10, 4))

        tk.Label(
            self.root,
            text="Auto-detect classifies each page as text-native or scanned and "
                 "picks the best extractor for each.",
            font=("Arial", 9),
            fg="#555555",
            wraplength=680,
            justify="left",
        ).pack(pady=(0, 8))

        self._build_file_section()
        self._build_mode_section()
        self._build_output_section()
        self._build_status_section()
        self._build_action_section()
    # ------------------------------------------------------------

    # FUNCTION | Build File Selection Section
    # ------------------------------------------------------------
    def _build_file_section(self) -> None:
        frame = tk.LabelFrame(self.root, text="PDF Source", font=("Arial", 9, "bold"))
        frame.pack(pady=6, padx=12, fill="x")

        self.pdf_label = tk.Label(
            frame,
            text="(no PDF selected)",
            anchor="w",
            fg="#333333",
            wraplength=520,
            justify="left",
        )
        self.pdf_label.pack(side="left", padx=10, pady=8, fill="x", expand=True)

        tk.Button(frame, text="Select PDF...", width=16, command=self._select_pdf).pack(
            side="right", padx=10, pady=8
        )
    # ------------------------------------------------------------

    # FUNCTION | Build Extraction Mode Section
    # ------------------------------------------------------------
    def _build_mode_section(self) -> None:
        frame = tk.LabelFrame(self.root, text="Extraction Mode", font=("Arial", 9, "bold"))
        frame.pack(pady=6, padx=12, fill="x")

        row = tk.Frame(frame)
        row.pack(pady=6)

        tk.Radiobutton(row, text="Auto-detect (recommended)",
                       variable=self.mode_var, value=MODE_AUTO,
                       command=self._on_mode_change).pack(side="left", padx=10)
        tk.Radiobutton(row, text="Force embedded-text only",
                       variable=self.mode_var, value=MODE_FORCE_TEXT,
                       command=self._on_mode_change).pack(side="left", padx=10)
        tk.Radiobutton(row, text="Force OCR only",
                       variable=self.mode_var, value=MODE_FORCE_OCR,
                       command=self._on_mode_change).pack(side="left", padx=10)
    # ------------------------------------------------------------

    # FUNCTION | Build Output Section
    # ------------------------------------------------------------
    def _build_output_section(self) -> None:
        frame = tk.LabelFrame(self.root, text="Output Folder", font=("Arial", 9, "bold"))
        frame.pack(pady=6, padx=12, fill="x")

        self.output_label = tk.Label(
            frame,
            text="(defaults to same folder as source PDF)",
            anchor="w",
            fg="#333333",
            wraplength=520,
            justify="left",
        )
        self.output_label.pack(side="left", padx=10, pady=8, fill="x", expand=True)

        tk.Button(frame, text="Choose Folder...", width=16, command=self._select_output_dir).pack(
            side="right", padx=10, pady=8
        )
    # ------------------------------------------------------------

    # FUNCTION | Build Status Preview Section
    # ------------------------------------------------------------
    def _build_status_section(self) -> None:
        frame = tk.LabelFrame(self.root, text="Detection Preview", font=("Arial", 9, "bold"))
        frame.pack(pady=6, padx=12, fill="x")

        self.status_label = tk.Label(
            frame,
            text="Select a PDF to preview how each page will be extracted.",
            anchor="w",
            fg="#333333",
            wraplength=680,
            justify="left",
        )
        self.status_label.pack(padx=10, pady=8, fill="x")
    # ------------------------------------------------------------

    # FUNCTION | Build Action Section
    # ------------------------------------------------------------
    def _build_action_section(self) -> None:
        frame = tk.Frame(self.root)
        frame.pack(pady=10)

        self.extract_btn = tk.Button(
            frame, text="Extract to Markdown", width=24, height=2,
            command=self._begin_extraction,
        )
        self.extract_btn.pack()

        self.progress = ttk.Progressbar(self.root, orient="horizontal", length=680, mode="determinate")
        self.progress.pack(pady=(12, 8))

        self.progress_label = tk.Label(self.root, text="", fg="#555555")
        self.progress_label.pack()
    # ------------------------------------------------------------

    # FUNCTION | Select PDF Source File
    # ------------------------------------------------------------
    def _select_pdf(self) -> None:
        path = filedialog.askopenfilename(
            title="Select a PDF file",
            filetypes=[("PDF files", "*.pdf"), ("All files", "*.*")],
        )
        if not path:
            return
        self.selected_pdf = path
        self.pdf_label.config(text=path)
        if self.output_dir is None:
            self.output_label.config(text=f"(default) {Path(path).parent}")
        self._refresh_detection_preview()
    # ------------------------------------------------------------

    # FUNCTION | Select Output Folder
    # ------------------------------------------------------------
    def _select_output_dir(self) -> None:
        path = filedialog.askdirectory(title="Choose output folder for Markdown file")
        if not path:
            return
        self.output_dir = path
        self.output_label.config(text=path)
    # ------------------------------------------------------------

    # FUNCTION | Extraction Mode Change Handler
    # ------------------------------------------------------------
    def _on_mode_change(self) -> None:
        self._refresh_detection_preview()
    # ------------------------------------------------------------

    # FUNCTION | Refresh Per-Page Detection Preview
    # ------------------------------------------------------------
    def _refresh_detection_preview(self) -> None:
        if not self.selected_pdf:
            self.status_label.config(text="Select a PDF to preview how each page will be extracted.")
            return
        try:
            strategies, page_count = classify_pdf_pages(self.selected_pdf)
        except Exception as exc:
            logging.error("Detection preview failed", exc_info=True)
            self.status_label.config(text=f"Could not probe PDF: {exc}")
            return

        self.strategies = self._apply_mode_override(strategies)
        self.page_count = page_count
        summary = summarise_page_strategies(self.strategies)
        self.status_label.config(text=f"{page_count} page(s). {summary}")
    # ------------------------------------------------------------

    # FUNCTION | Apply GUI Mode to Detected Strategies
    # ------------------------------------------------------------
    def _apply_mode_override(self, detected: dict[int, str]) -> dict[int, str]:
        mode = self.mode_var.get()
        if mode == MODE_FORCE_TEXT:
            return override_all_pages(detected, "text")
        if mode == MODE_FORCE_OCR:
            return override_all_pages(detected, "ocr")
        return dict(detected)
    # ------------------------------------------------------------

    # FUNCTION | Begin Extraction (Validate + Spawn Worker)
    # ------------------------------------------------------------
    def _begin_extraction(self) -> None:
        if not self.selected_pdf:
            messagebox.showwarning("No PDF", "Please select a PDF first.")
            return
        if not self.strategies:
            self._refresh_detection_preview()
            if not self.strategies:
                return

        output_dir = self.output_dir or str(Path(self.selected_pdf).parent)
        output_path = build_output_markdown_path(self.selected_pdf, output_dir)
        if output_path.exists():
            confirm = messagebox.askyesno(
                "Overwrite existing?",
                f"{output_path.name} already exists in the output folder.\n\n"
                "Overwrite?",
            )
            if not confirm:
                return

        # Preflight OCR binaries when the pipeline will actually use OCR.
        needs_ocr = any(kind == "ocr" for kind in self.strategies.values())
        if needs_ocr:
            ensure_native_binaries_on_path()                                    # <-- Auto-discover installs before the PATH check
            missing = check_native_binaries()
            if missing:
                messagebox.showwarning(
                    "OCR dependencies missing",
                    build_install_guidance(missing)
                    + "\n\nThe OCR pages will be left blank in the output.",
                )

        self.extract_btn.config(state="disabled")
        self.progress["value"]    = 0
        self.progress["maximum"]  = max(1, self.page_count + 2)                 # <-- Pages + detection + write steps
        self.progress_label.config(text="Starting extraction...")

        worker = threading.Thread(
            target=self._run_pipeline,
            args=(self.selected_pdf, output_dir, dict(self.strategies), self.page_count, self.mode_var.get()),
            daemon=True,
        )
        worker.start()
    # ------------------------------------------------------------

    # FUNCTION | Run Extraction Pipeline (Worker Thread)
    # ------------------------------------------------------------
    def _run_pipeline(
        self,
        pdf_path   : str,
        output_dir : str,
        strategies : dict[int, str],
        page_count : int,
        mode       : str,
    ) -> None:
        try:
            self._post_progress(1, "Classifying pages...")

            text_pages = {idx for idx, kind in strategies.items() if kind == "text"}
            ocr_pages  = {idx for idx, kind in strategies.items() if kind == "ocr"}

            # -- text-native path --
            self._post_progress(None, f"Extracting embedded text from {len(text_pages)} page(s)...")
            spans = extract_text_spans(pdf_path, text_pages) if text_pages else []

            # -- OCR path --
            ocr_result = None
            ocr_missing: list[str] = []
            if ocr_pages:
                self._post_progress(None, f"Running OCR on {len(ocr_pages)} page(s)...")
                ocr_result = extract_ocr_lines(
                    pdf_path,
                    ocr_pages,
                    total_pages=page_count,
                    force_ocr=(mode == MODE_FORCE_OCR),
                )
                if not ocr_result.success:
                    ocr_missing = ocr_result.missing_binaries or []
                    logging.warning(f"OCR could not complete: {ocr_result.error_message}")

            lines_per_page: dict[int, list[str]] = {}
            if ocr_result and ocr_result.success:
                lines_per_page = ocr_result.lines_per_page

            # Tick progress roughly by each processed page.
            self._post_progress(2 + max(1, page_count - 1), "Mapping headers and building Markdown...")

            blocks = build_markdown_blocks(spans, lines_per_page)

            output_path = write_markdown_document(
                source_pdf   = pdf_path,
                output_dir   = output_dir,
                blocks       = blocks,
                strategies   = strategies,
                page_count   = page_count,
                ocr_missing  = ocr_missing,
            )

            self._post_progress(self.progress["maximum"], "Done.")
            self.root.after(0, lambda p=str(output_path): self._on_extraction_complete(p))
        except Exception as exc:
            logging.error("Pipeline failed", exc_info=True)
            self.root.after(0, lambda e=exc: self._on_extraction_failed(e))
    # ------------------------------------------------------------

    # FUNCTION | Post Progress Update From Worker
    # ------------------------------------------------------------
    def _post_progress(self, value: int | None, text: str) -> None:
        def apply() -> None:
            if value is not None:
                self.progress["value"] = value
            self.progress_label.config(text=text)
        self.root.after(0, apply)
    # ------------------------------------------------------------

    # FUNCTION | Handle Successful Extraction
    # ------------------------------------------------------------
    def _on_extraction_complete(self, output_path: str) -> None:
        self.extract_btn.config(state="normal")
        messagebox.showinfo("Extraction complete", f"Markdown written to:\n{output_path}")
        try:
            os.startfile(os.path.dirname(output_path))                          # <-- Open output folder for convenience (Windows)
        except Exception:
            pass
    # ------------------------------------------------------------

    # FUNCTION | Handle Failed Extraction
    # ------------------------------------------------------------
    def _on_extraction_failed(self, exc: Exception) -> None:
        self.extract_btn.config(state="normal")
        messagebox.showerror("Extraction failed", str(exc))
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------
