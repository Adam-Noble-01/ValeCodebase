# =============================================================================
# SnPy_PngToPdfConverter.py
# =============================================================================
# Description : GUI utility for converting multiple PNG images into a single PDF document
# Author      : Adam Noble - Studio NoodlFjord
# Created     : 2025-05-29
# Version     : 1.2.0
# Dependencies: tkinter, Pillow, reportlab (preferred), PyMuPDF (fallback), tqdm (optional)
# Usage       : Run script to launch a GUI. Select PNG files, choose paper size (A4 or A3 landscape),
#               pick an output filename, then export the PDF.
# Notes       :
# - Maintains original aspect ratio, centring each image on its own landscape page.
# - Falls back automatically to PyMuPDF if ReportLab is unavailable or fails to install.
# - Progress bar shows conversion status.
# - Uses shared helper `set_window_icon()` from SnPY_CommonDependencyFiles.
#
# --- 1.2.0 - 17-Jun-2025 |  Updates ---
# - Output PDF filename format improved: ImagesMerged__A4-Landscape__17-Jun-2025.pdf
# - All images are converted to RGB JPEGs in a temp cache folder to ensure DPI/alpha safety.
# - Images are always scaled to fit the page (A4/A3 landscape), never clipped, and centered.
# - Temp cache folder (__pdf_temp_cache__) is auto-created and deleted after PDF export.
# - Inline and block comments improved for clarity and consistency.
# =============================================================================

import os
import sys
import logging
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from datetime import datetime
from pathlib import Path
from PIL import Image

# ------------------------------------------------------------
# LOADER | Icon Loader setup for the script
# ------------------------------------------------------------
# Add the sibling dependency directory to sys.path for imports                                            # <-- This adds the dependency path
dependency_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'SnPY_CommonDependencyFiles')  # <-- This builds the path
if dependency_path not in sys.path:                                                                       # <-- This checks if path exists in sys.path
    sys.path.append(os.path.abspath(dependency_path))                                                     # <-- This adds path if needed
    
try:
    from SnPy_Core_Utils_IconLoaderAndHandling import set_window_icon                                # type: ignore  # <-- This imports icon handler
except ImportError as e:                                                                             # <-- This catches import errors
    logging.warning(f"Could not import icon handling module: {e}. Windows will use default icons.")  # <-- This logs warning
    def set_window_icon(window):                                                                     # <-- This creates fallback function
        pass                                                                                         # <-- This does nothing as fallback
# ------------------------------------------------------------

# ------------------------------------------------------------
# Logging setup
# ------------------------------------------------------------
script_dir = os.path.dirname(os.path.abspath(__file__))
logging.basicConfig(
    filename=os.path.join(script_dir, "SnPy_PngToPdfConverter.log"),
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)

# ------------------------------------------------------------
# Png→PDF Converter Class
# ------------------------------------------------------------
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

    # ------------------------------------------------------------
    # HELPER FUNCTION | Build Output Filename for Export Dialog
    # ------------------------------------------------------------
    def _get_output_path(self) -> str | None:
        paper_size = self.paper_var.get()                                 # <-- Get selected paper size
        paper_size_fmt = paper_size.replace(' ', '-')                     # <-- Format paper size for filename (hyphens)
        date_fmt = datetime.now().strftime('%d-%b-%Y')                    # <-- Format date as DD-MMM-YYYY
        default_name = f"ImagesMerged__{paper_size_fmt}__{date_fmt}.pdf"  # <-- Build default filename
        return filedialog.asksaveasfilename(                              # <-- Open save dialog
            defaultextension=".pdf",                                      # <-- Ensure .pdf extension
            initialfile=default_name,                                     # <-- Use our formatted default name
            filetypes=[("PDF file", "*.pdf")],                            # <-- Restrict to PDF files
            title="Save PDF As",                                          # <-- Dialog title
        )
    # ------------------------------------------------------------

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
    # Helper | Prepare Images for PDF (RGB, no DPI/alpha)
    # --------------------------------------------------
    def _prepare_images_for_pdf(self) -> tuple[list[str], str]:
        """
        Converts all selected PNGs to RGB JPEGs in a temp cache folder.
        Returns (list of temp JPEG paths, temp folder path).
        """
        import shutil
        temp_dir = None
        temp_jpegs = []
        if not self.selected_pngs:
            return [], ''
        # Create temp cache folder in the first image's directory
        first_img_dir = os.path.dirname(self.selected_pngs[0])
        temp_dir = os.path.join(first_img_dir, "__pdf_temp_cache__")
        os.makedirs(temp_dir, exist_ok=True)
        for idx, img_path in enumerate(self.selected_pngs):
            with Image.open(img_path) as img:
                img = img.convert("RGB")  # Remove alpha, ensure RGB
                temp_jpeg = os.path.join(temp_dir, f"img_{idx+1:03d}.jpg")
                img.save(temp_jpeg, "JPEG", quality=95)
                temp_jpegs.append(temp_jpeg)
        return temp_jpegs, temp_dir

    # --------------------------------------------------
    # ReportLab Implementation
    # --------------------------------------------------
    def _create_pdf_reportlab(self, out_path: str, paper_size: str) -> tuple[bool, str]:
        import shutil
        temp_jpegs, temp_dir = self._prepare_images_for_pdf()
        try:
            from reportlab.pdfgen import canvas
            from reportlab.lib.units import inch

            pw, ph = self.PAPER_SIZES_PT[paper_size]
            c = canvas.Canvas(out_path, pagesize=(pw, ph))

            for idx, img_path in enumerate(temp_jpegs, start=1):
                if idx > 1:
                    c.showPage()

                with Image.open(img_path) as img:
                    iw, ih = img.size

                avail_w, avail_h = pw, ph
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
        finally:
            # Clean up temp cache
            if temp_dir and os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)

    # --------------------------------------------------
    # PyMuPDF Implementation (Fallback)
    # --------------------------------------------------
    def _create_pdf_pymupdf(self, out_path: str, paper_size: str) -> tuple[bool, str]:
        import shutil
        temp_jpegs, temp_dir = self._prepare_images_for_pdf()
        try:
            import fitz  # PyMuPDF

            pw, ph = self.PAPER_SIZES_PT[paper_size]
            doc = fitz.open()

            for img_path in temp_jpegs:
                page = doc.new_page(width=pw, height=ph)

                with Image.open(img_path) as img:
                    iw, ih = img.size

                avail_w, avail_h = pw, ph  # Full page, no margins
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
        finally:
            # Clean up temp cache
            if temp_dir and os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)

    # --------------------------------------------------
    # Progress Bar Helper
    # --------------------------------------------------
    def _tick_progress(self) -> None:
        self.progress["value"] += 1
        self.root.update_idletasks()

# ------------------------------------------------------------
# Main Entry
# ------------------------------------------------------------
if __name__ == "__main__":
    root_app = tk.Tk()
    app = PngToPdfConverterApp(root_app)
    root_app.mainloop()
    
