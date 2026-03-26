
# ========================================================================================================================
# SnPy_PngToPdfConverter.py
# ========================================================================================================================
# Description : GUI utility for converting multiple PNG images into a single PDF document
# Author      : Adam Noble - Studio NoodlFjord
# Created     : 2025-05-29
# Version     : 1.1.1
# Dependencies: tkinter, Pillow, reportlab (preferred), PyMuPDF (fallback), tqdm (optional)
# Usage       : Run script to launch a GUI. Select PNG files, choose paper size (A4 or A3 landscape),
#               pick an output filename, then export the PDF.
# Notes       :
# - Maintains original aspect ratio, centring each image on its own landscape page.
# - Falls back automatically to PyMuPDF if ReportLab is unavailable or fails to install.
# - Progress bar shows conversion status.
# - Uses shared helper `set_window_icon()` from SnPY_CommonDependencyFiles.
# ========================================================================================================================

import os
import sys
import logging
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from datetime import datetime
from pathlib import Path
from PIL import Image

# ------------------------------------------------------------------------------------------------------------------------
# Locate shared dependency folder and import icon loader
# ------------------------------------------------------------------------------------------------------------------------
_SCRIPT_DIR = Path(__file__).resolve().parent
_CANDIDATE_DIRS = [
    _SCRIPT_DIR / "SnPY_CommonDependencyFiles",
    _SCRIPT_DIR.parent / "SnPY_CommonDependencyFiles",
]

for _d in _CANDIDATE_DIRS:
    if _d.exists():
        sys.path.append(str(_d))
        break
else:
    print("Error: SnPY_CommonDependencyFiles directory not found.")
    sys.exit(1)

try:
    from SnPy_Core_Utils_IconLoaderAndHandling import set_window_icon  # type: ignore
except ImportError:
    def set_window_icon(window):  # placeholder if helper not found
        pass

# ------------------------------------------------------------------------------------------------------------------------
# Logging setup
# ------------------------------------------------------------------------------------------------------------------------
logging.basicConfig(
    filename=_SCRIPT_DIR / "SnPy_PngToPdfConverter.log",
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)

# ------------------------------------------------------------------------------------------------------------------------
# Png→PDF Converter Class
# ------------------------------------------------------------------------------------------------------------------------
class PngToPdfConverterApp:
    PAPER_SIZES_PT = {  # points (72 pt = 1 in)
        "A4 Landscape": (842, 595),   # 297 × 210 mm rotated
        "A3 Landscape": (1191, 842),  # 420 × 297 mm rotated
    }

    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("PNG → PDF Converter (Landscape)")
        self.root.geometry("520x340")
        self.root.resizable(False, False)
        set_window_icon(self.root)

        self.selected_pngs: list[str] = []
        self.paper_var = tk.StringVar(value="A4 Landscape")

        self._build_gui()

    # --------------------------------------------------
    # GUI Layout
    # --------------------------------------------------
    def _build_gui(self) -> None:
        tk.Label(self.root, text="Select PNG images then export as a single PDF.").pack(pady=8)

        # Paper-size radio buttons
        radio_frame = tk.Frame(self.root)
        radio_frame.pack(pady=2)
        for size in ["A4 Landscape", "A3 Landscape"]:
            tk.Radiobutton(radio_frame, text=size, variable=self.paper_var, value=size).pack(side="left", padx=10)

        # Listbox to show chosen files
        self.file_list = tk.Listbox(self.root, height=8, width=60)
        self.file_list.pack(pady=8)

        # Action buttons
        btn_frame = tk.Frame(self.root)
        btn_frame.pack(pady=5)

        tk.Button(btn_frame, text="Add PNG Files", width=15, command=self._select_pngs).pack(side="left", padx=6)
        tk.Button(btn_frame, text="Remove Selection", width=15, command=self._remove_selection).pack(side="left", padx=6)
        tk.Button(btn_frame, text="Convert to PDF", width=18, command=self._begin_conversion).pack(side="left", padx=6)

        # Progress bar
        self.progress = ttk.Progressbar(self.root, orient="horizontal", length=480, mode="determinate")
        self.progress.pack(pady=12)

    # --------------------------------------------------
    # File Selection Handlers
    # --------------------------------------------------
    def _select_pngs(self) -> None:
        files = filedialog.askopenfilenames(
            title="Select PNG images",
            filetypes=[("PNG files", "*.png")],
        )
        if not files:
            return
        self.selected_pngs.extend(files)
        self._refresh_file_list()

    def _remove_selection(self) -> None:
        sel = list(self.file_list.curselection())
        if not sel:
            return
        for idx in reversed(sel):
            del self.selected_pngs[idx]
        self._refresh_file_list()

    def _refresh_file_list(self) -> None:
        self.file_list.delete(0, tk.END)
        for p in self.selected_pngs:
            self.file_list.insert(tk.END, Path(p).name)

    # --------------------------------------------------
    # Conversion Trigger
    # --------------------------------------------------
    def _begin_conversion(self) -> None:
        if not self.selected_pngs:
            messagebox.showwarning("No Images", "Please add at least one PNG image.")
            return

        out_path = self._get_output_path()
        if not out_path:
            return  # user cancelled

        self.progress["value"] = 0
        self.progress["maximum"] = len(self.selected_pngs)

        # Run conversion synchronously on the main thread to avoid thread-safety issues with Tkinter
        self.root.after(50, lambda p=out_path: self._convert_pngs(p))

    # --------------------------------------------------
    # Helper – Build Output Filename
    # --------------------------------------------------
    def _get_output_path(self) -> str | None:
        paper_size = self.paper_var.get()
        default_name = f"PNG_Merged_{paper_size.replace(' ', '_')}_{datetime.now():%Y%m%d_%H%M%S}.pdf"
        return filedialog.asksaveasfilename(
            defaultextension=".pdf",
            initialfile=default_name,
            filetypes=[("PDF file", "*.pdf")],
            title="Save PDF As",
        )

    # --------------------------------------------------
    # Dependency Check
    # --------------------------------------------------
    def _has_reportlab(self) -> bool:
        try:
            import reportlab  # noqa: F401
            return True
        except ImportError:
            install = messagebox.askyesno(
                "ReportLab Not Found",
                "ReportLab gives the best quality output.\nInstall it now via pip?"
            )
            if install:
                import subprocess
                try:
                    subprocess.check_call([sys.executable, "-m", "pip", "install", "reportlab"])
                    return True
                except Exception as e:
                    logging.warning("ReportLab installation failed: %s", e)
            return False

    # --------------------------------------------------
    # Main Conversion
    # --------------------------------------------------
    def _convert_pngs(self, out_path: str) -> None:
        try:
            paper_size = self.paper_var.get()

            # Prefer ReportLab
            if self._has_reportlab():
                ok, msg = self._create_pdf_reportlab(out_path, paper_size)
            else:
                ok, msg = self._create_pdf_pymupdf(out_path, paper_size)

            if ok:
                messagebox.showinfo("Success", f"PDF created successfully:\n{out_path}")
            else:
                messagebox.showerror("Conversion Failed", msg)

        except Exception as e:
            logging.error("Unhandled exception", exc_info=True)
            messagebox.showerror("Error", str(e))

    # --------------------------------------------------
    # ReportLab Implementation
    # --------------------------------------------------
    def _create_pdf_reportlab(self, out_path: str, paper_size: str) -> tuple[bool, str]:
        try:
            from reportlab.pdfgen import canvas
            from reportlab.lib.units import inch

            pw, ph = self.PAPER_SIZES_PT[paper_size]
            c = canvas.Canvas(out_path, pagesize=(pw, ph))

            for idx, img_path in enumerate(self.selected_pngs, start=1):
                if idx > 1:
                    c.showPage()

                with Image.open(img_path) as img:
                    iw, ih = img.size

                avail_w, avail_h = pw - inch, ph - inch
                scale = min(avail_w / iw, avail_h / ih)
                fw, fh = iw * scale, ih * scale
                xo, yo = (pw - fw) / 2, (ph - fh) / 2

                c.drawImage(img_path, xo, yo, fw, fh, preserveAspectRatio=True, mask="auto")
                self._tick_progress()

            c.save()
            return True, "ReportLab PDF created"

        except Exception as e:
            logging.error("ReportLab error: %s", e, exc_info=True)
            return False, str(e)

    # --------------------------------------------------
    # PyMuPDF Implementation (Fallback)
    # --------------------------------------------------
    def _create_pdf_pymupdf(self, out_path: str, paper_size: str) -> tuple[bool, str]:
        try:
            import fitz  # PyMuPDF

            pw, ph = self.PAPER_SIZES_PT[paper_size]
            doc = fitz.open()

            for img_path in self.selected_pngs:
                page = doc.new_page(width=pw, height=ph)

                with Image.open(img_path) as img:
                    iw, ih = img.size

                avail_w, avail_h = pw - 72, ph - 72  # 0.5 in margins
                scale = min(avail_w / iw, avail_h / ih)
                fw, fh = iw * scale, ih * scale
                xo, yo = (pw - fw) / 2, (ph - fh) / 2

                rect = fitz.Rect(xo, yo, xo + fw, yo + fh)
                page.insert_image(rect, filename=img_path)
                self._tick_progress()

            doc.save(out_path)
            doc.close()
            return True, "PyMuPDF PDF created"

        except Exception as e:
            logging.error("PyMuPDF error: %s", e, exc_info=True)
            return False, str(e)

    # --------------------------------------------------
    # Progress Bar Helper
    # --------------------------------------------------
    def _tick_progress(self) -> None:
        self.progress["value"] += 1
        self.root.update_idletasks()

# ------------------------------------------------------------------------------------------------------------------------
# Main Entry
# ------------------------------------------------------------------------------------------------------------------------
if __name__ == "__main__":
    root_app = tk.Tk()
    app = PngToPdfConverterApp(root_app)
    root_app.mainloop()
    
