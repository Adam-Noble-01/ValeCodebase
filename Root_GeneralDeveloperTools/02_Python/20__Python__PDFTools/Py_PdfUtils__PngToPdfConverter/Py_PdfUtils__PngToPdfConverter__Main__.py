# =============================================================================
# SnPy_PngToPdfConverter.py
# =============================================================================
# Description : GUI utility for converting multiple PNG/JPG images into a single PDF document
# Author      : Adam Noble - Studio NoodlFjord
# Created     : 2025-05-29
# Version     : 1.4.0
# Dependencies: tkinter, Pillow, reportlab (bundled in 01__LocalScope__ExternalCodeLibraries)
# Installation: python -m pip install pillow reportlab --target ./01__LocalScope__ExternalCodeLibraries
# Usage       : Run script to launch a GUI. Select PNG or JPG files, choose paper size and orientation,
#               configure margins if needed, then export the PDF.
# Notes       :
# - Supports A4, A3, A2, and A1 paper sizes in both landscape and portrait orientations.
# - Maintains original aspect ratio, centering each image on its own page with configurable margins.
# - Margin values in millimeters: negative values reduce margins, positive values add whitespace.
# - Uses ReportLab for high-quality PDF generation with locally bundled dependencies.
# - Progress bar shows conversion status.
# - Portable across devices - no need to install dependencies on each machine.
# - Uses shared helper `set_window_icon()` from SnPY_CommonDependencyFiles.
#
# --- 1.3.0 - 13-Aug-2025 |  Updates ---
# - JPG/JPEG files are now supported alongside PNG. File dialog shows PNG/JPG filters.
# - UI text updated to reflect generic "Image" selection instead of only PNG.
# - Internal variable and method names generalized from PNG-specific to image-agnostic.
#
# --- 1.2.0 - 17-Jun-2025 |  Updates ---
# - Output PDF filename format improved: ImagesMerged__A4-Landscape__17-Jun-2025.pdf
# - All images are converted to RGB JPEGs in a temp cache folder to ensure DPI/alpha safety.
# - Images are always scaled to fit the page (A4/A3 landscape), never clipped, and centered.
# - Temp cache folder (__pdf_temp_cache__) is auto-created and deleted after PDF export.
# - Inline and block comments improved for clarity and consistency.
#
# --- 1.4.0 - 13-Oct-2025 | Updates ---
# - Added support for A2 and A1 paper sizes alongside existing A4 and A3
# - Implemented portrait and landscape orientation selection for all paper sizes
# - Split PAPER_SIZES_PT into separate landscape and portrait dictionaries
# - Added margin control system with Top, Right, Bottom, Left inputs (supports negative values)
# - Negative margin values reduce margins, positive values add whitespace padding
# - Refactored code with regional structure tags for improved IDE code folding
# - UI now displays 4×2 grid of radio buttons for paper size and orientation selection
# - Updated window geometry to accommodate expanded UI controls
# - Integrated local library loading system for portable cross-device deployment
# - Dependencies now bundled in 01__LocalScope__ExternalCodeLibraries folder
# - Removed PyMuPDF fallback code - now uses ReportLab exclusively for consistency
# - Converted all docstrings to # comment style for consistent code formatting
# - Script is now fully portable - no pip installations required on new devices
#
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
from tkinter import filedialog, messagebox, ttk
from datetime import datetime
from pathlib import Path
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Load Local External Libraries
# -----------------------------------------------------------------------------
# Add local library path to system path
local_lib_path = Path(__file__).parent / "01__LocalScope__ExternalCodeLibraries"
if local_lib_path.exists():
    sys.path.insert(0, str(local_lib_path))
    logging.info(f"Added local library path: {local_lib_path}")

# Try to load PIL/Pillow from local or system
try:
    from PIL import Image
    logging.info("PIL/Pillow library loaded successfully")
except ImportError as e:
    logging.error(f"Failed to load PIL/Pillow: {e}")
    print(f"[ERROR] Failed to load PIL/Pillow: {e}")
    print(f"[INFO] Install: python -m pip install pillow reportlab --target ./01__LocalScope__ExternalCodeLibraries")
    sys.exit(1)

# Try to load ReportLab from local or system
try:
    from reportlab.pdfgen import canvas
    from reportlab.lib.units import mm
    logging.info("ReportLab library loaded successfully")
except ImportError as e:
    logging.error(f"Failed to load ReportLab: {e}")
    print(f"[ERROR] ReportLab is required for this script.")
    print(f"[INFO] Install: python -m pip install pillow reportlab --target ./01__LocalScope__ExternalCodeLibraries")
    sys.exit(1)
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Load Common Icon Loader
# ------------------------------------------------------------
# Add the common local code libraries directory to sys.path for imports                                   # <-- This adds the icon loader path
parent_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))                                 # <-- Navigate up three levels to 02_Python root
icon_loader_path = os.path.join(parent_dir, '02__Python__CommonLocalCodeLibs')                           # <-- Build path to common local code libs
if icon_loader_path not in sys.path:                                                                     # <-- This checks if path exists in sys.path
    sys.path.insert(0, os.path.abspath(icon_loader_path))                                                # <-- This adds path at beginning for priority
    
try:
    from Py_CoreCommonUtils__IconLoaderAndHandling import set_noble_icon                              # type: ignore  # <-- This imports Noble icon handler
    logging.info("Successfully imported Noble Architecture icon loader")                              # <-- Log successful import
except ImportError as e:                                                                             # <-- This catches import errors
    logging.warning(f"Could not import icon handling module: {e}. Windows will use default icons.")  # <-- This logs warning
    def set_noble_icon(window):                                                                       # <-- This creates fallback function
        pass                                                                                         # <-- This does nothing as fallback
# ------------------------------------------------------------
# endregion -------------------------------------------------------------------

# =============================================================================
# PHASE 2 : INITIALIZATION OF STANDARD CONFIGURATION
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | Logging Setup
# -----------------------------------------------------------------------------
script_dir = os.path.dirname(os.path.abspath(__file__))
logging.basicConfig(
    filename=os.path.join(script_dir, "SnPy_PngToPdfConverter.log"),
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
# endregion -------------------------------------------------------------------

# =============================================================================
# PHASE 3 : MAIN APPLICATION CLASS
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | PNG to PDF Converter Application Class
# -----------------------------------------------------------------------------
class PngToPdfConverterApp:
    # Main application class for PNG/JPG to PDF conversion with multiple paper sizes and orientations
    
    # region -----------------------------------------------------
    # DATA | Paper Sizes Data
    # ------------------------------------------------------------
    # Paper size definitions in points (72 pt = 1 inch)
    PAPER_SIZES_PT__LANDSCAPE = {
        "A4 Landscape": (842, 595),    # 297 × 210 mm
        "A3 Landscape": (1191, 842),   # 420 × 297 mm
        "A2 Landscape": (1684, 1191),  # 594 × 420 mm
        "A1 Landscape": (2384, 1684),  # 841 × 594 mm
    }
    
    PAPER_SIZES_PT__PORTRAIT = {
        "A4 Portrait": (595, 842),     # 210 × 297 mm
        "A3 Portrait": (842, 1191),    # 297 × 420 mm
        "A2 Portrait": (1191, 1684),   # 420 × 594 mm
        "A1 Portrait": (1684, 2384),   # 594 × 841 mm
    }
    # endregion --------------------------------------------------

    # FUNCTION | Class Initialization
    # ------------------------------------------------------------
    def __init__(self, root: tk.Tk) -> None:
        # Initialize the PNG to PDF converter application
        self.root = root
        self.root.title("PNG/JPG → PDF Converter")
        self.root.geometry("620x550")
        self.root.resizable(False, False)
        set_noble_icon(self.root)

        self.selected_images: list[str] = []
        self.paper_var = tk.StringVar(value="A4 Landscape")
        
        # Margin control variables
        self.margin_top = tk.StringVar(value="0")
        self.margin_right = tk.StringVar(value="0")
        self.margin_bottom = tk.StringVar(value="0")
        self.margin_left = tk.StringVar(value="0")

        self._build_gui()
    # ------------------------------------------------------------

    # FUNCTION | Build GUI Layout
    # ------------------------------------------------------------
    def _build_gui(self) -> None:
        # Build the main GUI interface
        tk.Label(self.root, text="Select PNG/JPG images then export as a single PDF.", 
                font=("Arial", 10, "bold")).pack(pady=8)

        # Paper-size and orientation radio buttons (4×2 grid)
        radio_frame = tk.Frame(self.root)
        radio_frame.pack(pady=5)
        
        # Create 4 rows × 2 columns for paper size/orientation selection
        sizes = ["A4", "A3", "A2", "A1"]
        for row_idx, size in enumerate(sizes):
            row_frame = tk.Frame(radio_frame)
            row_frame.pack(pady=2)
            tk.Radiobutton(row_frame, text=f"{size} Landscape", 
                          variable=self.paper_var, 
                          value=f"{size} Landscape").pack(side="left", padx=15)
            tk.Radiobutton(row_frame, text=f"{size} Portrait", 
                          variable=self.paper_var, 
                          value=f"{size} Portrait").pack(side="left", padx=15)
        
        # Margin control section
        margin_frame = tk.LabelFrame(self.root, text="Margins (mm) - Negative to reduce, Positive to add whitespace", 
                                     font=("Arial", 9, "bold"))
        margin_frame.pack(pady=8, padx=10, fill="x")
        
        margin_inputs = tk.Frame(margin_frame)
        margin_inputs.pack(pady=5)
        
        # Top margin
        tk.Label(margin_inputs, text="Top:").grid(row=0, column=0, padx=5, sticky="e")
        tk.Entry(margin_inputs, textvariable=self.margin_top, width=8).grid(row=0, column=1, padx=5)
        
        # Right margin
        tk.Label(margin_inputs, text="Right:").grid(row=0, column=2, padx=5, sticky="e")
        tk.Entry(margin_inputs, textvariable=self.margin_right, width=8).grid(row=0, column=3, padx=5)
        
        # Bottom margin
        tk.Label(margin_inputs, text="Bottom:").grid(row=0, column=4, padx=5, sticky="e")
        tk.Entry(margin_inputs, textvariable=self.margin_bottom, width=8).grid(row=0, column=5, padx=5)
        
        # Left margin
        tk.Label(margin_inputs, text="Left:").grid(row=0, column=6, padx=5, sticky="e")
        tk.Entry(margin_inputs, textvariable=self.margin_left, width=8).grid(row=0, column=7, padx=5)
        
        # Reset margins button
        reset_btn = tk.Button(margin_frame, text="Reset Margins to 0", 
                            command=self._reset_margins)
        reset_btn.pack(pady=5)
        
        # Listbox to show chosen files
        self.file_list = tk.Listbox(self.root, height=10, width=70)
        self.file_list.pack(pady=10)

        # Action buttons
        btn_frame = tk.Frame(self.root)
        btn_frame.pack(pady=10)

        tk.Button(btn_frame, text="Add Images (PNG/JPG)", width=18, command=self._select_images).pack(side="left", padx=6)
        tk.Button(btn_frame, text="Remove Selection", width=15, command=self._remove_selection).pack(side="left", padx=6)
        tk.Button(btn_frame, text="Convert to PDF", width=18, command=self._begin_conversion).pack(side="left", padx=6)

        # Progress bar
        self.progress = ttk.Progressbar(self.root, orient="horizontal", length=580, mode="determinate")
        self.progress.pack(pady=12)
    # ------------------------------------------------------------
    
    # FUNCTION | Reset All Margins to Zero
    # ------------------------------------------------------------
    def _reset_margins(self) -> None:
        # Reset all margin values to 0
        self.margin_top.set("0")
        self.margin_right.set("0")
        self.margin_bottom.set("0")
        self.margin_left.set("0")
    # ------------------------------------------------------------

    # FUNCTION | Select Images for Conversion
    # ------------------------------------------------------------
    def _select_images(self) -> None:
        # Open file dialog to select images for conversion
        files = filedialog.askopenfilenames(
            title="Select images (PNG/JPG)",
            filetypes=[
                ("Image files", "*.png *.jpg *.jpeg"),
                ("PNG files", "*.png"),
                ("JPEG files", "*.jpg *.jpeg"),
            ],
        )
        if not files:
            return
        self.selected_images.extend(files)
        self._refresh_file_list()
    # ------------------------------------------------------------

    # FUNCTION | Remove Selected Image from List
    # ------------------------------------------------------------
    def _remove_selection(self) -> None:
        # Remove selected image from the conversion list
        sel = list(self.file_list.curselection())
        if not sel:
            return
        for idx in reversed(sel):
            del self.selected_images[idx]
        self._refresh_file_list()
    # ------------------------------------------------------------

    # FUNCTION | Refresh File List Display
    # ------------------------------------------------------------
    def _refresh_file_list(self) -> None:
        # Update the file list UI with current selections
        self.file_list.delete(0, tk.END)
        for p in self.selected_images:
            self.file_list.insert(tk.END, Path(p).name)
    # ------------------------------------------------------------

    # FUNCTION | Begin Conversion Process
    # ------------------------------------------------------------
    def _begin_conversion(self) -> None:
        # Validate inputs and begin PDF conversion process
        if not self.selected_images:
            messagebox.showwarning("No Images", "Please add at least one image (PNG/JPG).")
            return

        out_path = self._get_output_path()
        if not out_path:
            return  # user cancelled

        self.progress["value"] = 0
        self.progress["maximum"] = len(self.selected_images)

        # Run conversion synchronously on the main thread to avoid thread-safety issues with Tkinter
        self.root.after(50, lambda p=out_path: self._convert_images(p))
    # ------------------------------------------------------------

    # FUNCTION | Build Output Filename for Export Dialog
    # ------------------------------------------------------------
    def _get_output_path(self) -> str | None:
        # Generate default filename and show save dialog
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

    # FUNCTION | Main Conversion Coordinator
    # ------------------------------------------------------------
    def _convert_images(self, out_path: str) -> None:
        # Coordinate the image to PDF conversion process
        try:
            paper_size = self.paper_var.get()
            
            # Parse margin values
            try:
                margin_top = float(self.margin_top.get())
                margin_right = float(self.margin_right.get())
                margin_bottom = float(self.margin_bottom.get())
                margin_left = float(self.margin_left.get())
            except ValueError:
                messagebox.showerror("Invalid Margins", "Please enter valid numeric values for margins.")
                return

            # Use ReportLab for PDF creation
            ok, msg = self._create_pdf_reportlab(out_path, paper_size, 
                                                  margin_top, margin_right, 
                                                  margin_bottom, margin_left)

            if ok:
                messagebox.showinfo("Success", f"PDF created successfully:\n{out_path}")
            else:
                messagebox.showerror("Conversion Failed", msg)

        except Exception as e:
            logging.error("Unhandled exception", exc_info=True)
            messagebox.showerror("Error", str(e))
    # ------------------------------------------------------------

    # FUNCTION | Prepare Images for PDF (RGB, no DPI/alpha)
    # ------------------------------------------------------------
    def _prepare_images_for_pdf(self) -> tuple[list[str], str]:
        # Converts all selected images to RGB JPEGs in a temp cache folder.
        # Returns (list of temp JPEG paths, temp folder path).
        import shutil
        temp_dir = None
        temp_jpegs = []
        if not self.selected_images:
            return [], ''
        # Create temp cache folder in the first image's directory
        first_img_dir = os.path.dirname(self.selected_images[0])
        temp_dir = os.path.join(first_img_dir, "__pdf_temp_cache__")
        os.makedirs(temp_dir, exist_ok=True)
        for idx, img_path in enumerate(self.selected_images):
            with Image.open(img_path) as img:
                img = img.convert("RGB")  # Remove alpha, ensure RGB
                temp_jpeg = os.path.join(temp_dir, f"img_{idx+1:03d}.jpg")
                img.save(temp_jpeg, "JPEG", quality=95)
                temp_jpegs.append(temp_jpeg)
        return temp_jpegs, temp_dir
    # ------------------------------------------------------------

    # FUNCTION | ReportLab PDF Creation Implementation
    # ------------------------------------------------------------
    def _create_pdf_reportlab(self, out_path: str, paper_size: str, 
                              margin_top: float, margin_right: float,
                              margin_bottom: float, margin_left: float) -> tuple[bool, str]:
        # Create PDF using ReportLab library with margin support
        import shutil
        temp_jpegs, temp_dir = self._prepare_images_for_pdf()
        try:
            # Select correct dictionary based on orientation
            if "Landscape" in paper_size:
                pw, ph = self.PAPER_SIZES_PT__LANDSCAPE[paper_size]
            else:
                pw, ph = self.PAPER_SIZES_PT__PORTRAIT[paper_size]
            
            c = canvas.Canvas(out_path, pagesize=(pw, ph))
            
            # Convert margins from mm to points (1 mm = 72/25.4 points)
            margin_top_pt = margin_top * mm
            margin_right_pt = margin_right * mm
            margin_bottom_pt = margin_bottom * mm
            margin_left_pt = margin_left * mm

            for idx, img_path in enumerate(temp_jpegs, start=1):
                if idx > 1:
                    c.showPage()

                with Image.open(img_path) as img:
                    iw, ih = img.size

                # Calculate available space with margins
                avail_w = pw - margin_left_pt - margin_right_pt
                avail_h = ph - margin_top_pt - margin_bottom_pt
                
                # Scale image to fit within available space
                scale = min(avail_w / iw, avail_h / ih)
                fw, fh = iw * scale, ih * scale
                
                # Center image within available space
                xo = margin_left_pt + (avail_w - fw) / 2
                yo = margin_bottom_pt + (avail_h - fh) / 2

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
    # ------------------------------------------------------------

    # FUNCTION | Update Progress Bar
    # ------------------------------------------------------------
    def _tick_progress(self) -> None:
        # Increment progress bar by one step
        self.progress["value"] += 1
        self.root.update_idletasks()
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------

# =============================================================================
# PHASE 4 : MAIN ENTRY POINT
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | Main Execution
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    root_app = tk.Tk()
    app = PngToPdfConverterApp(root_app)
    root_app.mainloop()
# endregion -------------------------------------------------------------------
    
