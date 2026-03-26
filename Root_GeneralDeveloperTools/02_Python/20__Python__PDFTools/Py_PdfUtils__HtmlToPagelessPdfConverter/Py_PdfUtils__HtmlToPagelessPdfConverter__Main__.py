#!/usr/bin/env python3
"""
Python  -  HTML to Pageless PDF Converter with Tkinter GUI
Py_PdfUtils__HtmlToPagelessPdfConverter__Main__.py

Purpose: Convert HTML files to single-page PDFs with A4 width and automatic height.
HTML is rasterised to full height PNG via Playwright, then embedded into PDF.

-----------------------------------
SCRIPT METADATA
Author    :  Adam Noble
Created   :  Original Script Date
Updated   :  Refactored to Noble Architecture Standards
-----------------------------------

-----------------------------------
VERSION HISTORY
Version     :  2.0.0
Description :  Refactored to Noble Architecture coding standards
  - Added regional structure with proper commenting style
  - Integrated with common icon loader system
  - Implemented local dependency management
  - Added portable library loading from local folder
  - Restructured code following standard patterns

Version     :  1.0.0
Description :  Initial Release
  - Basic HTML to PDF conversion functionality
  - Tkinter GUI interface
-----------------------------------

-----------------------------------
DEPENDENCY INSTALLATION
To install required dependencies to local folder:
  python -m pip install pillow reportlab playwright --target ./01__LocalScope__ExternalCodeLibraries

One-time browser installation:
  python -m playwright install chromium
-----------------------------------

"""

# =============================================================================
# PHASE 1 : LOADING LIBRARIES
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | Load Basic Python Libraries
# -----------------------------------------------------------------------------
import os
import sys
import tempfile
import subprocess
import platform
from pathlib import Path
from typing import Tuple, Optional, Any
from dataclasses import dataclass, field

# Load Common Icon Loader - Standardized System
repo_root = Path(__file__).parent.parent.parent  # Navigate up to repo root
common_libs_path = repo_root / "02__Python__CommonLocalCodeLibs"
if str(common_libs_path) not in sys.path:
    sys.path.insert(0, str(common_libs_path))

try:
    from Py_CoreCommonUtils__IconLoaderAndHandling import set_noble_icon
    print("[SUCCESS] Common icon loader imported successfully")
except ImportError as e:
    print(f"[WARNING] Common icon loader not available: {e}")
    def set_noble_icon(window):
        pass
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Load Local External Libraries
# -----------------------------------------------------------------------------
# Add local library path to system path
local_lib_path = Path(__file__).parent / "01__LocalScope__ExternalCodeLibraries"
if local_lib_path.exists():
    sys.path.insert(0, str(local_lib_path))
    print(f"[INIT] Added local library path: {local_lib_path}")

# Try to load PIL/Pillow from local or system
try:
    from PIL import Image, ImageTk
    print("[SUCCESS] PIL/Pillow library loaded successfully")
except ImportError as e:
    print(f"[ERROR] Failed to load PIL/Pillow: {e}")
    print(f"[INFO] Please install: python -m pip install pillow --target ./01__LocalScope__ExternalCodeLibraries")
    sys.exit(1)

# Try to load ReportLab from local or system
try:
    from reportlab.pdfgen import canvas
    from reportlab.lib.units import mm
    print("[SUCCESS] ReportLab library loaded successfully")
except ImportError as e:
    print(f"[ERROR] Failed to load ReportLab: {e}")
    print(f"[INFO] Please install: python -m pip install reportlab --target ./01__LocalScope__ExternalCodeLibraries")
    sys.exit(1)
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Load Tkinter GUI Libraries
# -----------------------------------------------------------------------------
try:
    import tkinter as tk
    from tkinter import ttk, filedialog, messagebox, StringVar, BooleanVar, scrolledtext
    print("[SUCCESS] Tkinter library loaded successfully")
except ImportError as e:
    print(f"[ERROR] Failed to load Tkinter: {e}")
    print(f"[INFO] Tkinter is usually included with Python. Try: python -m pip install tk")
    sys.exit(1)
# endregion -------------------------------------------------------------------

# =============================================================================
# PHASE 2 : INITIALIZATION OF STANDARD CONFIGURATION
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | Configuration Data Classes
# -----------------------------------------------------------------------------
@dataclass
class PDFConfig:
    """Configuration settings for PDF conversion operations"""
    # Page Settings
    a4_width_pt: float = 210 / 25.4 * 72.0                  # <-- 210 mm in points
    pdf_max_page_pt: float = 14399.0                        # <-- Practical single dimension cap
    
    # HTML Rendering Settings
    html_width_px: int = 1200                               # <-- Default HTML render width
    margin_top_mm: float = 0                                # <-- Top margin in mm
    margin_right_mm: float = 0                              # <-- Right margin in mm
    margin_bottom_mm: float = 0                             # <-- Bottom margin in mm
    margin_left_mm: float = 0                               # <-- Left margin in mm
    background_hex: str = "#FFFFFF"                         # <-- Default background color
    device_scale_factor: float = 1.0                        # <-- Rendering scale factor
    
    # Processing Settings
    jpeg_quality: int = 95                                  # <-- JPEG compression quality
    jpeg_subsampling: int = 0                               # <-- JPEG subsampling (0 = best)
    render_timeout_ms: int = 250                            # <-- Browser settle time
    
@dataclass
class ConversionStats:
    """Statistics for conversion operations"""
    input_file: str = ""
    output_file: str = ""
    html_width: int = 0
    render_time: float = 0.0
    pdf_creation_time: float = 0.0
    total_time: float = 0.0
    success: bool = False
    error_message: str = ""
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Global Configuration Constants
# -----------------------------------------------------------------------------
# Initialize default configuration
default_config = PDFConfig()


# endregion -------------------------------------------------------------------

# =============================================================================
# PHASE 3 : CORE CONVERSION ENGINE
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | Playwright Management Functions
# -----------------------------------------------------------------------------

# FUNCTION | Check if Playwright is available
# ------------------------------------------------------------
def ensure_playwright_importable() -> bool:
    """Check if Playwright library is importable"""
    try:
        import playwright  # noqa
        return True
    except Exception:
        return False
# ------------------------------------------------------------


# FUNCTION | Install Playwright browsers
# ------------------------------------------------------------
def install_playwright_browsers(parent=None) -> None:
    """Install Chromium browser for Playwright"""
    try:
        print("[INFO] Installing Chromium for Playwright...")
        subprocess.run([sys.executable, "-m", "playwright", "install", "chromium"],
                       check=True)
        print("[SUCCESS] Chromium installed for Playwright")
        if parent:
            messagebox.showinfo("Success", "Chromium installed for Playwright.")
    except subprocess.CalledProcessError as e:
        error_msg = f"Playwright install failed: {e}"
        print(f"[ERROR] {error_msg}")
        if parent:
            messagebox.showerror("Install Failed", f"Playwright install failed.\n\n{e}")
    except FileNotFoundError:
        error_msg = "Playwright not found. Install it first: pip install playwright"
        print(f"[ERROR] {error_msg}")
        if parent:
            messagebox.showerror("Missing Dependency",
                               "Playwright not found. Install it first:\n\npip install playwright --target ./01__LocalScope__ExternalCodeLibraries")
# ------------------------------------------------------------
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Utility Functions
# -----------------------------------------------------------------------------


# FUNCTION | Convert hex color to RGB values (0-1 range)
# ------------------------------------------------------------
def hex_to_rgb01(hex_colour: str) -> Tuple[float, float, float]:
    """Convert hex color string to RGB float values (0-1 range)"""
    h = hex_colour.strip().lstrip("#")                      # <-- Remove # prefix
    if len(h) == 3:
        h = "".join(ch * 2 for ch in h)                     # <-- Expand 3-char hex
    r = int(h[0:2], 16) / 255.0                            # <-- Red component
    g = int(h[2:4], 16) / 255.0                            # <-- Green component
    b = int(h[4:6], 16) / 255.0                            # <-- Blue component
    return (r, g, b)
# ------------------------------------------------------------
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | HTML to PNG Rendering Engine
# -----------------------------------------------------------------------------


# FUNCTION | Render HTML to PNG using Playwright
# ------------------------------------------------------------
def render_html_to_png(html_path: Path, out_png: Path, html_width: int, 
                      background: str, user_scale_factor: float = 1.0) -> None:
    """
    Use Playwright to take a full page screenshot of the HTML file.
    
    Args:
        html_path: Path to HTML file
        out_png: Output PNG file path
        html_width: Browser viewport width
        background: Background color hex
        user_scale_factor: Device scale factor for rendering
    """
    if not ensure_playwright_importable():
        raise RuntimeError("Playwright is not installed. Run: pip install playwright --target ./01__LocalScope__ExternalCodeLibraries")

    # Lazy imports
    from playwright.sync_api import sync_playwright

    # Best effort ensure Chromium exists
    try:
        subprocess.run([sys.executable, "-m", "playwright", "install", "chromium"],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
    except Exception:
        pass

    url = html_path.resolve().as_uri()                      # <-- Convert to file:// URL

    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            # Configure browser context
            context = browser.new_context(device_scale_factor=user_scale_factor)
            page = context.new_page()
            page.set_viewport_size({"width": int(html_width), "height": 1000})

            # Force background in case of transparent body
            page.add_style_tag(content=f"html,body{{background:{background};}}")

            # Load page and wait for network idle
            page.goto(url, wait_until="networkidle")
            page.wait_for_timeout(default_config.render_timeout_ms)  # <-- Brief settle time

            # Capture full page screenshot
            page.screenshot(path=str(out_png), full_page=True)
        finally:
            browser.close()
# ------------------------------------------------------------
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | PDF Generation Functions
# -----------------------------------------------------------------------------


# FUNCTION | Calculate PDF page dimensions based on image size
# ------------------------------------------------------------
def compute_page_dimensions_for_image(img_w_px: int, img_h_px: int, 
                                     margin_left: float, margin_right: float,
                                     margin_top: float, margin_bottom: float) -> Tuple[float, float, float, float]:
    """
    Decide the PDF page width and height in points and the drawable width/height in points.
    
    Args:
        img_w_px: Image width in pixels
        img_h_px: Image height in pixels
        margin_left: Left margin in mm (can be negative)
        margin_right: Right margin in mm (can be negative)
        margin_top: Top margin in mm (can be negative)
        margin_bottom: Bottom margin in mm (can be negative)
    
    Returns:
        Tuple of (page_width_pt, page_height_pt, drawable_width_pt, drawable_height_pt)
    """
    # Convert margins to points (negative values allowed)
    margin_left_pt = margin_left * mm                       # <-- Left margin in points
    margin_right_pt = margin_right * mm                     # <-- Right margin in points
    margin_top_pt = margin_top * mm                         # <-- Top margin in points
    margin_bottom_pt = margin_bottom * mm                   # <-- Bottom margin in points
    
    # Calculate drawable width (A4 width minus horizontal margins)
    draw_w_pt = max(default_config.a4_width_pt - margin_left_pt - margin_right_pt, 1.0)
    scale = draw_w_pt / float(img_w_px)                     # <-- Calculate scale factor
    draw_h_pt = img_h_px * scale                           # <-- Scaled height
    
    # Calculate page dimensions including margins
    page_w_pt = draw_w_pt + margin_left_pt + margin_right_pt  # <-- Total page width
    page_h_pt = draw_h_pt + margin_top_pt + margin_bottom_pt  # <-- Total page height

    # Check if height exceeds PDF viewer limits
    if page_h_pt > default_config.pdf_max_page_pt:
        down = default_config.pdf_max_page_pt / page_h_pt   # <-- Downscale factor
        draw_w_pt *= down                                   # <-- Adjust drawable width
        draw_h_pt *= down                                   # <-- Adjust drawable height
        page_h_pt = default_config.pdf_max_page_pt         # <-- Cap at max height
        # Recalculate page width with new scale
        page_w_pt = draw_w_pt + margin_left_pt + margin_right_pt

    return page_w_pt, page_h_pt, draw_w_pt, draw_h_pt
# ------------------------------------------------------------


# FUNCTION | Convert image to pageless PDF
# ------------------------------------------------------------
def image_to_pageless_pdf(image_path: Path, output_pdf: Path, 
                         margin_top: float, margin_right: float,
                         margin_bottom: float, margin_left: float,
                         bg_hex: str) -> None:
    """
    Place the PNG on a single very tall PDF page at A4 width.
    
    Args:
        image_path: Path to input PNG image
        output_pdf: Path to output PDF file
        margin_top: Top margin in millimeters (can be negative)
        margin_right: Right margin in millimeters (can be negative)
        margin_bottom: Bottom margin in millimeters (can be negative)
        margin_left: Left margin in millimeters (can be negative)
        bg_hex: Background color in hex format
    """
    with Image.open(image_path) as im:
        # Handle transparency by compositing on background
        if im.mode in ("RGBA", "LA"):
            bg = Image.new("RGB", im.size, bg_hex)          # <-- Create background
            bg.paste(im, mask=im.split()[-1])               # <-- Composite with alpha
            im = bg
        elif im.mode != "RGB":
            im = im.convert("RGB")                          # <-- Convert to RGB

        img_w, img_h = im.size                              # <-- Get image dimensions
        page_w_pt, page_h_pt, draw_w_pt, draw_h_pt = compute_page_dimensions_for_image(
            img_w, img_h, margin_left, margin_right, margin_top, margin_bottom
        )
        
        # Convert margins to points (supporting negative values)
        margin_left_pt = margin_left * mm                   # <-- Left margin in points
        margin_bottom_pt = margin_bottom * mm               # <-- Bottom margin in points

        # Create PDF canvas
        c = canvas.Canvas(str(output_pdf), pagesize=(page_w_pt, page_h_pt))

        # Save a temp JPEG to keep PDF size in check
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            temp_jpg = Path(tmp.name)
        try:
            # Save as JPEG with high quality
            im.save(temp_jpg, format="JPEG", 
                   quality=default_config.jpeg_quality,     # <-- JPEG quality setting
                   subsampling=default_config.jpeg_subsampling)  # <-- Subsampling setting
            
            # Draw image on PDF (position can be negative for negative margins)
            c.drawImage(str(temp_jpg), margin_left_pt, margin_bottom_pt, 
                       width=draw_w_pt, height=draw_h_pt,
                       preserveAspectRatio=True, anchor='sw')
        finally:
            # Clean up temporary file
            try:
                temp_jpg.unlink(missing_ok=True)
            except Exception:
                pass

        c.showPage()
        c.save()
# ------------------------------------------------------------
# endregion -------------------------------------------------------------------

# =============================================================================
# PHASE 4 : GUI APPLICATION
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | Main GUI Application Class
# -----------------------------------------------------------------------------


class HTMLToPDFConverterGUI(tk.Tk):
    """Main GUI application for HTML to PDF conversion"""
    
    def __init__(self):
        super().__init__()
        self.title("Noble Architecture | HTML to Pageless PDF Converter")
        self.geometry("900x600")
        self.minsize(800, 500)
        
        # Apply Noble Architecture icon if available
        self.apply_window_icon()
        
        # Initialize configuration
        self.config = PDFConfig()
        self.stats = ConversionStats()
        
        # Initialize string variables
        self.html_path = StringVar()
        self.output_path = StringVar()
        self.html_width = StringVar(value=str(self.config.html_width_px))
        self.margin_top = StringVar(value=str(self.config.margin_top_mm))
        self.margin_right = StringVar(value=str(self.config.margin_right_mm))
        self.margin_bottom = StringVar(value=str(self.config.margin_bottom_mm))
        self.margin_left = StringVar(value=str(self.config.margin_left_mm))
        self.bg_hex = StringVar(value=self.config.background_hex)
        self.scale_factor = StringVar(value=str(self.config.device_scale_factor))
        
        # Define fonts
        self.setup_fonts()
        
        # Build UI
        self._build_ui()
    
    # FUNCTION | Apply window icon using standardized loader
    # ------------------------------------------------------------
    def apply_window_icon(self):
        """Apply Noble Architecture icon to window using standardized loader"""
        try:
            set_noble_icon(self)
            print("[SUCCESS] Window icon set via standardized icon loader")
        except Exception as e:
            print(f"[WARNING] Could not set window icon: {e}. Using system default.")
    # ------------------------------------------------------------
    
    # FUNCTION | Setup fonts - simplified system
    # ------------------------------------------------------------
    def setup_fonts(self):
        """Initialize fonts with standard fallbacks"""
        # Use standard system fonts
        self.font_regular = ('Arial', 10, 'normal')
        self.font_semibold = ('Arial', 12, 'bold')
        self.font_title = ('Arial', 14, 'bold')
        self.font_light = ('Arial', 9, 'normal')
    # ------------------------------------------------------------

    # FUNCTION | Build UI components
    # ------------------------------------------------------------
    def _build_ui(self):
        """Create and layout all UI components"""
        
        # Create main container
        main_container = ttk.Frame(self, padding="10")
        main_container.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Configure grid weights
        self.columnconfigure(0, weight=1)
        self.rowconfigure(0, weight=1)
        main_container.columnconfigure(0, weight=1)
        main_container.rowconfigure(5, weight=1)  # Make log section expandable
        
        # Title
        title_label = ttk.Label(main_container, text="HTML to Pageless PDF Converter", 
                               font=self.font_title)
        title_label.grid(row=0, column=0, pady=(0, 10), sticky=tk.W)
        
        # File selection section
        self.create_file_selection_section(main_container, row=1)
        
        # Configuration section
        self.create_configuration_section(main_container, row=2)
        
        # Control buttons
        self.create_control_buttons(main_container, row=3)
        
        # Progress section
        self.create_progress_section(main_container, row=4)
        
        # Log section
        self.create_log_section(main_container, row=5)
    # ------------------------------------------------------------
    
    # FUNCTION | Create file selection section
    # ------------------------------------------------------------
    def create_file_selection_section(self, parent, row):
        """Create file selection UI section"""
        frame = ttk.LabelFrame(parent, text="File Selection", padding="10")
        frame.grid(row=row, column=0, sticky=(tk.W, tk.E), pady=5)
        frame.columnconfigure(1, weight=1)
        
        # HTML file input
        ttk.Label(frame, text="HTML File:").grid(row=0, column=0, sticky=tk.W, padx=5)
        ent_html = ttk.Entry(frame, textvariable=self.html_path, width=60)
        ent_html.grid(row=0, column=1, padx=5, sticky=(tk.W, tk.E))
        ttk.Button(frame, text="Browse", command=self.browse_html).grid(row=0, column=2, padx=5)
        
        # Output PDF
        ttk.Label(frame, text="Output PDF:").grid(row=1, column=0, sticky=tk.W, padx=5, pady=(5, 0))
        ent_out = ttk.Entry(frame, textvariable=self.output_path, width=60)
        ent_out.grid(row=1, column=1, padx=5, pady=(5, 0), sticky=(tk.W, tk.E))
        ttk.Button(frame, text="Save As", command=self.browse_output).grid(row=1, column=2, padx=5, pady=(5, 0))
    # ------------------------------------------------------------
    
    # FUNCTION | Create configuration section
    # ------------------------------------------------------------
    def create_configuration_section(self, parent, row):
        """Create configuration UI section"""
        frame = ttk.LabelFrame(parent, text="Conversion Settings", padding="10")
        frame.grid(row=row, column=0, sticky=(tk.W, tk.E), pady=5)
        frame.columnconfigure(1, weight=1)
        frame.columnconfigure(3, weight=1)
        frame.columnconfigure(5, weight=1)
        frame.columnconfigure(7, weight=1)
        
        # Row 1: HTML Width and Scale Factor
        ttk.Label(frame, text="HTML Width (px):").grid(row=0, column=0, sticky=tk.W, padx=5)
        ttk.Entry(frame, textvariable=self.html_width, width=12).grid(row=0, column=1, sticky=tk.W, padx=5)
        
        ttk.Label(frame, text="Scale Factor:").grid(row=0, column=2, sticky=tk.W, padx=5)
        ttk.Entry(frame, textvariable=self.scale_factor, width=12).grid(row=0, column=3, sticky=tk.W, padx=5)
        
        ttk.Label(frame, text="Background Hex:").grid(row=0, column=4, sticky=tk.W, padx=5)
        ttk.Entry(frame, textvariable=self.bg_hex, width=12).grid(row=0, column=5, sticky=tk.W, padx=5)
        
        # Row 2: Margins label
        ttk.Label(frame, text="Margins (mm) - Negative values allowed:", 
                 font=self.font_semibold).grid(row=1, column=0, columnspan=6, sticky=tk.W, padx=5, pady=(10, 5))
        
        # Row 3: All four margins
        ttk.Label(frame, text="Top:").grid(row=2, column=0, sticky=tk.W, padx=5)
        ttk.Entry(frame, textvariable=self.margin_top, width=10).grid(row=2, column=1, sticky=tk.W, padx=5)
        
        ttk.Label(frame, text="Right:").grid(row=2, column=2, sticky=tk.W, padx=5)
        ttk.Entry(frame, textvariable=self.margin_right, width=10).grid(row=2, column=3, sticky=tk.W, padx=5)
        
        ttk.Label(frame, text="Bottom:").grid(row=2, column=4, sticky=tk.W, padx=5)
        ttk.Entry(frame, textvariable=self.margin_bottom, width=10).grid(row=2, column=5, sticky=tk.W, padx=5)
        
        ttk.Label(frame, text="Left:").grid(row=2, column=6, sticky=tk.W, padx=5)
        ttk.Entry(frame, textvariable=self.margin_left, width=10).grid(row=2, column=7, sticky=tk.W, padx=5)
    # ------------------------------------------------------------
    
    # FUNCTION | Create control buttons
    # ------------------------------------------------------------
    def create_control_buttons(self, parent, row):
        """Create main control buttons"""
        frame = ttk.Frame(parent)
        frame.grid(row=row, column=0, pady=10)
        
        self.convert_button = ttk.Button(frame, text="Convert to PDF", 
                                        command=self.convert,
                                        style="Accent.TButton")
        self.convert_button.pack(side=tk.LEFT, padx=5)
        
        ttk.Button(frame, text="Reset Margins", 
                  command=self.reset_margins).pack(side=tk.LEFT, padx=5)
        
        ttk.Button(frame, text="Exit", command=self.quit).pack(side=tk.LEFT, padx=5)
    # ------------------------------------------------------------
    
    # FUNCTION | Reset margins to zero
    # ------------------------------------------------------------
    def reset_margins(self):
        """Reset all margins to 0"""
        self.margin_top.set("0")
        self.margin_right.set("0")
        self.margin_bottom.set("0")
        self.margin_left.set("0")
    # ------------------------------------------------------------
    
    # FUNCTION | Create progress section
    # ------------------------------------------------------------
    def create_progress_section(self, parent, row):
        """Create progress display section"""
        frame = ttk.LabelFrame(parent, text="Progress", padding="10")
        frame.grid(row=row, column=0, sticky=(tk.W, tk.E), pady=5)
        frame.columnconfigure(0, weight=1)
        
        # Status label
        self.status_label = ttk.Label(frame, text="Ready to convert")
        self.status_label.grid(row=0, column=0, sticky=tk.W, pady=2)
        
        # Progress bar
        self.progress_var = tk.DoubleVar()
        self.progress_bar = ttk.Progressbar(frame, variable=self.progress_var, 
                                           maximum=100)
        self.progress_bar.grid(row=1, column=0, sticky=(tk.W, tk.E), pady=5)
    # ------------------------------------------------------------
    
    # FUNCTION | Create log section
    # ------------------------------------------------------------
    def create_log_section(self, parent, row):
        """Create log display section"""
        frame = ttk.LabelFrame(parent, text="Conversion Log", padding="10")
        frame.grid(row=row, column=0, sticky=(tk.W, tk.E, tk.N, tk.S), pady=5)
        frame.columnconfigure(0, weight=1)
        frame.rowconfigure(0, weight=1)
        
        # Log text area
        self.log_text = scrolledtext.ScrolledText(frame, height=10, wrap=tk.WORD)
        self.log_text.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
    # ------------------------------------------------------------

    # FUNCTION | Log message to text area
    # ------------------------------------------------------------
    def log(self, msg: str):
        """Add message to log display"""
        self.log_text.insert("end", msg + "\n")
        self.log_text.see("end")
        self.update_idletasks()
    # ------------------------------------------------------------

    # FUNCTION | Browse for HTML file
    # ------------------------------------------------------------
    def browse_html(self):
        """Open dialog to select HTML file"""
        path = filedialog.askopenfilename(
            title="Select HTML file",
            filetypes=[("HTML Files", "*.html *.htm"), ("All Files", "*.*")]
        )
        if path:
            self.html_path.set(path)
            # Auto-generate output filename if not set
            if not self.output_path.get():
                output_path = Path(path).with_suffix('.pdf')
                self.output_path.set(str(output_path))
    # ------------------------------------------------------------
    
    # FUNCTION | Browse for output PDF location
    # ------------------------------------------------------------
    def browse_output(self):
        """Open dialog to select output PDF location"""
        path = filedialog.asksaveasfilename(
            title="Save PDF as",
            defaultextension=".pdf",
            filetypes=[("PDF Files", "*.pdf"), ("All Files", "*.*")]
        )
        if path:
            self.output_path.set(path)
    # ------------------------------------------------------------

    # FUNCTION | Convert HTML to PDF
    # ------------------------------------------------------------
    def convert(self):
        """Main conversion process"""
        import time
        
        try:
            # Validate inputs
            html_path = Path(self.html_path.get().strip())
            out_pdf = Path(self.output_path.get().strip())
            
            if not html_path.exists():
                messagebox.showerror("Error", "Please choose a valid HTML file.")
                return
            if not out_pdf.parent.exists():
                out_pdf.parent.mkdir(parents=True, exist_ok=True)

            # Get conversion parameters
            width_px = int(self.html_width.get().strip())           # <-- HTML render width
            margin_top = float(self.margin_top.get().strip())       # <-- Top margin (can be negative)
            margin_right = float(self.margin_right.get().strip())   # <-- Right margin (can be negative)
            margin_bottom = float(self.margin_bottom.get().strip()) # <-- Bottom margin (can be negative)
            margin_left = float(self.margin_left.get().strip())     # <-- Left margin (can be negative)
            bg = self.bg_hex.get().strip() or "#FFFFFF"            # <-- Background color
            scale = float(self.scale_factor.get().strip())          # <-- Scale factor

            # Clear log and start conversion
            self.log_text.delete("1.0", "end")
            self.log("="*50)
            self.log("STARTING HTML TO PDF CONVERSION")
            self.log("="*50)
            self.log(f"Input HTML: {html_path}")
            self.log(f"Output PDF: {out_pdf}")
            self.log(f"Settings: Width={width_px}px, Scale={scale}")
            self.log(f"Margins (mm): Top={margin_top}, Right={margin_right}, Bottom={margin_bottom}, Left={margin_left}")
            self.log(f"Background: {bg}")
            self.log("-"*50)
            
            # Update progress
            self.progress_var.set(0)
            self.status_label.config(text="Checking dependencies...")
            self.update_idletasks()

            # Check Playwright availability
            if not ensure_playwright_importable():
                self.log("[ERROR] Playwright not installed")
                messagebox.showerror("Missing Dependency",
                                   "Playwright is not installed.\n\n"
                                   "Run:\n  pip install playwright --target ./01__LocalScope__ExternalCodeLibraries\n"
                                   "Then click 'Install Playwright Chromium'.")
                return

            start_time = time.time()
            
            # Perform conversion
            with tempfile.TemporaryDirectory() as tdir:
                tmp_png = Path(tdir) / "page_render.png"
                
                # Step 1: Render HTML to PNG
                self.log("[PHASE 1] Rendering HTML to PNG...")
                self.progress_var.set(30)
                self.status_label.config(text="Rendering HTML to PNG...")
                self.update_idletasks()
                
                render_html_to_png(html_path, tmp_png, width_px, bg, user_scale_factor=scale)
                self.log(f"  PNG created: {tmp_png.name}")
                
                # Step 2: Convert PNG to PDF
                self.log("[PHASE 2] Converting to PDF...")
                self.progress_var.set(60)
                self.status_label.config(text="Creating PDF document...")
                self.update_idletasks()
                
                image_to_pageless_pdf(tmp_png, out_pdf, 
                                    margin_top=margin_top, 
                                    margin_right=margin_right,
                                    margin_bottom=margin_bottom, 
                                    margin_left=margin_left,
                                    bg_hex=bg)
                self.log(f"  PDF created: {out_pdf.name}")
            
            # Calculate statistics
            total_time = time.time() - start_time
            file_size = out_pdf.stat().st_size / (1024 * 1024)  # MB
            
            # Complete
            self.progress_var.set(100)
            self.status_label.config(text="Conversion complete")
            
            self.log("-"*50)
            self.log(f"[SUCCESS] PDF created successfully")
            self.log(f"  Time: {total_time:.2f} seconds")
            self.log(f"  Size: {file_size:.2f} MB")
            self.log("="*50)
            
            messagebox.showinfo("Success", 
                              f"PDF created successfully!\n\n"
                              f"Output: {out_pdf.name}\n"
                              f"Size: {file_size:.2f} MB\n"
                              f"Time: {total_time:.2f} seconds")

        except Exception as e:
            self.log(f"[ERROR] Conversion failed: {e}")
            self.progress_var.set(0)
            self.status_label.config(text="Conversion failed")
            import traceback
            self.log(f"[TRACEBACK] {traceback.format_exc()}")
            messagebox.showerror("Conversion Failed", str(e))
    # ------------------------------------------------------------
# endregion -------------------------------------------------------------------


# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | Main Execution
# -----------------------------------------------------------------------------
def main():
    """Main entry point for the script"""
    
    print("="*60)
    print("HTML TO PAGELESS PDF CONVERTER")
    print("="*60)
    print()
    
    # Validate library loading
    print("[PHASE 1] Library Loading Complete")
    print(f"  - Python Version: {sys.version}")
    print(f"  - Platform: {platform.system()} {platform.release()}")
    
    # Check for Playwright
    if ensure_playwright_importable():
        print("  - Playwright: Available")
    else:
        print("  - Playwright: Not installed")
        print("    Run: pip install playwright --target ./01__LocalScope__ExternalCodeLibraries")
    
    print()
    print("[PHASE 2] Starting GUI mode")
    print()
    
    # Create and run GUI application
    app = HTMLToPDFConverterGUI()
    app.mainloop()

if __name__ == "__main__":
    main()
# endregion -------------------------------------------------------------------
