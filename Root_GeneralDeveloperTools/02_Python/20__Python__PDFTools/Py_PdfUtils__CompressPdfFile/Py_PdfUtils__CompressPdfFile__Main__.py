# =============================================================================
# Py_PdfUtils__CompressPdfFile__Main__.py
# =============================================================================
# Description : GUI utility for compressing and flattening PDF files by rasterizing pages
# Author      : Adam Noble - Studio NoodlFjord
# Created     : 2024-12-16
# Version     : 2.0.0
# Dependencies: tkinter, pymupdf (bundled or system-wide)
# Installation: python -m pip install pymupdf
# Usage       : Run script to launch GUI. Configure DPI, JPEG compression settings,
#               then select a PDF file to compress. The tool rasterizes each page to
#               create a flattened, printer-friendly PDF with strong compression.
# Notes       :
# - Supports DPI range 150-600 for controlling output resolution and file size
# - JPEG compression reduces file size with configurable quality (70-100%)
# - PNG mode available for lossless compression (larger files)
# - Maintains original page dimensions while flattening all content
# - Progress bar shows conversion status for multi-page documents
# - Output filename includes compression settings for easy identification
# - Uses shared helper `set_noble_icon()` from Py_CoreCommonUtils__IconLoaderAndHandling
#
# --- 2.0.0 - 16-Dec-2024 | Major Refactoring ---
# - Complete rewrite to match codebase standards and architectural patterns
# - Added proper GUI with interactive controls for DPI and JPEG quality
# - Implemented constants section with configurable defaults (DPI=300, Quality=90%)
# - Fixed "dumb override" issue - settings now read from GUI controls, not hardcoded
# - Added icon loader integration for consistent branding
# - Implemented logging system for debugging and audit trail
# - Restructured code with PHASE/REGION organization for maintainability
# - Added progress bar with per-page updates for long operations
# - Improved output filename format to include compression settings
# - Enhanced error handling with user-friendly messages and logging
# - All inline comments converted to right-aligned style with <-- syntax
# - JPEG quality slider now enables/disables based on compression checkbox
# - DPI and quality labels update in real-time as sliders move
#
# --- 1.0.0 - Initial Version ---
# - Basic PDF flattening functionality with hardcoded settings
# - Simple file dialog interface without user controls
#
# =============================================================================

# =============================================================================
# PHASE 1 : LOADING LIBRARIES
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | Load Basic Python Libraries
# -----------------------------------------------------------------------------
import os                                                                     # <-- File system operations
import sys                                                                    # <-- System path manipulation
import logging                                                                # <-- Logging functionality
import tkinter as tk                                                          # <-- GUI framework
from tkinter import filedialog, messagebox, ttk                               # <-- Dialog boxes and widgets
from pathlib import Path                                                      # <-- Path handling
# endregion -------------------------------------------------------------------

# =============================================================================
# PHASE 2 : INITIALIZATION OF STANDARD CONFIGURATION
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | Logging Setup - Must be configured before any logging calls
# -----------------------------------------------------------------------------
script_dir = os.path.dirname(os.path.abspath(__file__))                      # <-- Get current script directory
logging.basicConfig(
    filename=os.path.join(script_dir, "Py_PdfUtils__CompressPdfFile.log"),   # <-- Log file in script directory
    level=logging.INFO,                                                       # <-- Log level INFO
    format="%(asctime)s | %(levelname)s | %(message)s",                      # <-- Log format with timestamp
)
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Default Compression Settings
# -----------------------------------------------------------------------------
DEFAULT_DPI = 300                                                             # <-- Default DPI for PDF rendering
DEFAULT_USE_JPEG = True                                                       # <-- Use JPEG compression by default
DEFAULT_JPEG_QUALITY = 90                                                     # <-- Default JPEG quality percentage (70-100)
DPI_MIN = 150                                                                 # <-- Minimum allowed DPI
DPI_MAX = 600                                                                 # <-- Maximum allowed DPI
JPEG_QUALITY_MIN = 70                                                         # <-- Minimum JPEG quality
JPEG_QUALITY_MAX = 100                                                        # <-- Maximum JPEG quality
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Load External Libraries
# -----------------------------------------------------------------------------
try:
    import fitz                                                               # <-- PyMuPDF for PDF manipulation
    logging.info("PyMuPDF (fitz) library loaded successfully")
except ImportError as e:
    logging.error(f"Failed to load PyMuPDF: {e}")
    print(f"[ERROR] PyMuPDF is required for this script.")
    print(f"[INFO] Install: python -m pip install pymupdf")
    sys.exit(1)
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Load Common Icon Loader
# -----------------------------------------------------------------------------
# Add the common local code libraries directory to sys.path for imports      # <-- This adds the icon loader path
parent_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))     # <-- Navigate up three levels to 02_Python root
icon_loader_path = os.path.join(parent_dir, '02__Python__CommonLocalCodeLibs')  # <-- Build path to common local code libs
if icon_loader_path not in sys.path:                                          # <-- This checks if path exists in sys.path
    sys.path.insert(0, os.path.abspath(icon_loader_path))                     # <-- This adds path at beginning for priority
    
try:
    from Py_CoreCommonUtils__IconLoaderAndHandling import set_noble_icon  # type: ignore  # <-- This imports Noble icon handler
    logging.info("Successfully imported Noble Architecture icon loader")  # <-- Log successful import
except ImportError as e:                                                  # <-- This catches import errors
    logging.warning(f"Could not import icon handling module: {e}. Windows will use default icons.")  # <-- This logs warning
    def set_noble_icon(window):                                           # <-- This creates fallback function
        pass                                                              # <-- This does nothing as fallback
# endregion -------------------------------------------------------------------

# =============================================================================
# PHASE 3 : MAIN APPLICATION CLASS
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | PDF Compression Application Class
# -----------------------------------------------------------------------------
class PdfCompressionApp:
    # Main application class for PDF compression with configurable settings
    
    # FUNCTION | Class Initialization
    # ------------------------------------------------------------
    def __init__(self, root: tk.Tk) -> None:
        # Initialize the PDF compression application
        self.root = root                                                      # <-- Store root window reference
        self.root.title("PDF Compression Tool - Flatten & Compress")          # <-- Set window title
        self.root.geometry("540x480")                                         # <-- Set window size
        self.root.resizable(False, False)                                     # <-- Disable window resizing
        set_noble_icon(self.root)                                             # <-- Apply custom icon
        
        # Initialize control variables with default constants
        self.dpi_var = tk.IntVar(value=DEFAULT_DPI)                           # <-- DPI slider variable
        self.use_jpeg_var = tk.BooleanVar(value=DEFAULT_USE_JPEG)             # <-- JPEG compression checkbox variable
        self.jpeg_quality_var = tk.IntVar(value=DEFAULT_JPEG_QUALITY)         # <-- JPEG quality slider variable
        
        # UI element references for dynamic control
        self.quality_scale = None                                             # <-- Quality slider reference
        self.quality_label = None                                             # <-- Quality label reference
        self.dpi_label = None                                                 # <-- DPI label reference
        self.progress = None                                                  # <-- Progress bar reference
        self.status_label = None                                              # <-- Status label reference
        
        self._build_gui()                                                     # <-- Build the GUI
        logging.info("PDF Compression App initialized")                       # <-- Log initialization
    # ------------------------------------------------------------
    
    # FUNCTION | Build GUI Layout
    # ------------------------------------------------------------
    def _build_gui(self) -> None:
        # Build the main GUI interface with all controls
        
        # Title label
        tk.Label(
            self.root, 
            text="PDF Compression Tool - Flatten & Compress PDFs", 
            font=("Arial", 11, "bold")
        ).pack(pady=10)
        
        # Settings frame with border
        settings_frame = tk.LabelFrame(
            self.root, 
            text="Compression Settings", 
            font=("Arial", 10, "bold"),
            padx=15,
            pady=10
        )
        settings_frame.pack(pady=10, padx=20, fill="x")
        
        # DPI control section
        dpi_frame = tk.Frame(settings_frame)                                  # <-- Container for DPI controls
        dpi_frame.pack(pady=8, fill="x")
        
        tk.Label(
            dpi_frame, 
            text="Output DPI (resolution):", 
            font=("Arial", 9)
        ).pack(anchor="w")
        
        dpi_slider_frame = tk.Frame(dpi_frame)                                # <-- Frame for slider and label
        dpi_slider_frame.pack(fill="x", pady=5)
        
        tk.Scale(
            dpi_slider_frame,
            from_=DPI_MIN,                                                    # <-- Minimum DPI from constant
            to=DPI_MAX,                                                       # <-- Maximum DPI from constant
            orient="horizontal",                                              # <-- Horizontal slider
            variable=self.dpi_var,                                            # <-- Bind to DPI variable
            command=self._update_dpi_label,                                   # <-- Update label on change
            showvalue=False,                                                  # <-- Hide default value display
            length=350                                                        # <-- Slider width
        ).pack(side="left", fill="x", expand=True)
        
        self.dpi_label = tk.Label(
            dpi_slider_frame, 
            text=f"DPI: {DEFAULT_DPI}", 
            font=("Arial", 9, "bold"),
            width=10
        )
        self.dpi_label.pack(side="left", padx=5)
        
        # Separator line
        tk.Frame(settings_frame, height=1, bg="gray").pack(fill="x", pady=8)
        
        # JPEG compression checkbox
        jpeg_check_frame = tk.Frame(settings_frame)                           # <-- Container for checkbox
        jpeg_check_frame.pack(pady=5, fill="x")
        
        tk.Checkbutton(
            jpeg_check_frame,
            text="Use JPEG compression (smaller files, slight quality loss)",
            variable=self.use_jpeg_var,                                       # <-- Bind to JPEG checkbox variable
            command=self._on_jpeg_toggle,                                     # <-- Enable/disable quality controls
            font=("Arial", 9)
        ).pack(anchor="w")
        
        # JPEG quality control section
        quality_frame = tk.Frame(settings_frame)                              # <-- Container for quality controls
        quality_frame.pack(pady=8, fill="x")
        
        tk.Label(
            quality_frame, 
            text="JPEG Quality:", 
            font=("Arial", 9)
        ).pack(anchor="w")
        
        quality_slider_frame = tk.Frame(quality_frame)                        # <-- Frame for slider and label
        quality_slider_frame.pack(fill="x", pady=5)
        
        self.quality_scale = tk.Scale(
            quality_slider_frame,
            from_=JPEG_QUALITY_MIN,                                           # <-- Minimum quality from constant
            to=JPEG_QUALITY_MAX,                                              # <-- Maximum quality from constant
            orient="horizontal",                                              # <-- Horizontal slider
            variable=self.jpeg_quality_var,                                   # <-- Bind to quality variable
            command=self._update_quality_label,                               # <-- Update label on change
            showvalue=False,                                                  # <-- Hide default value display
            length=350                                                        # <-- Slider width
        )
        self.quality_scale.pack(side="left", fill="x", expand=True)
        
        self.quality_label = tk.Label(
            quality_slider_frame, 
            text=f"Quality: {DEFAULT_JPEG_QUALITY}%", 
            font=("Arial", 9, "bold"),
            width=12
        )
        self.quality_label.pack(side="left", padx=5)
        
        # Info label
        tk.Label(
            self.root,
            text="Higher DPI = larger files, better quality. JPEG saves space.",
            font=("Arial", 8),
            fg="gray"
        ).pack(pady=5)
        
        # Action button
        tk.Button(
            self.root,
            text="Select PDF to Compress",
            command=self._select_and_compress,                                # <-- Trigger compression
            width=25,
            font=("Arial", 10, "bold"),
            bg="#4CAF50",
            fg="white",
            cursor="hand2"
        ).pack(pady=15)
        
        # Progress bar
        self.progress = ttk.Progressbar(
            self.root, 
            orient="horizontal", 
            length=480, 
            mode="determinate"
        )
        self.progress.pack(pady=10)
        
        # Status label
        self.status_label = tk.Label(
            self.root,
            text="Ready",
            font=("Arial", 9),
            fg="green"
        )
        self.status_label.pack(pady=5)
        
        # Initialize control states
        self._on_jpeg_toggle()                                                # <-- Set initial state of quality controls
    # ------------------------------------------------------------
    
    # FUNCTION | Update DPI Label Display
    # ------------------------------------------------------------
    def _update_dpi_label(self, value=None) -> None:
        # Update the DPI label to show current slider value
        current_dpi = self.dpi_var.get()                                      # <-- Get current DPI value
        self.dpi_label.config(text=f"DPI: {current_dpi}")                     # <-- Update label text
    # ------------------------------------------------------------
    
    # FUNCTION | Update Quality Label Display
    # ------------------------------------------------------------
    def _update_quality_label(self, value=None) -> None:
        # Update the quality label to show current slider value
        current_quality = self.jpeg_quality_var.get()                         # <-- Get current quality value
        self.quality_label.config(text=f"Quality: {current_quality}%")        # <-- Update label text
    # ------------------------------------------------------------
    
    # FUNCTION | Toggle JPEG Quality Controls
    # ------------------------------------------------------------
    def _on_jpeg_toggle(self) -> None:
        # Enable or disable JPEG quality controls based on checkbox state
        if self.use_jpeg_var.get():                                           # <-- Check if JPEG is enabled
            self.quality_scale.config(state="normal")                         # <-- Enable quality slider
            self.quality_label.config(fg="black")                             # <-- Enable quality label
        else:
            self.quality_scale.config(state="disabled")                       # <-- Disable quality slider
            self.quality_label.config(fg="gray")                              # <-- Gray out quality label
    # ------------------------------------------------------------
    
    # FUNCTION | Select and Compress PDF
    # ------------------------------------------------------------
    def _select_and_compress(self) -> None:
        # Open file dialog and initiate compression with user-configured settings
        
        # Open file selection dialog
        input_path = filedialog.askopenfilename(
            title="Select PDF to compress",
            filetypes=[("PDF files", "*.pdf"), ("All files", "*.*")],
        )
        
        if not input_path:                                                    # <-- User cancelled
            return
        
        # Get values from GUI controls (NO HARDCODING)
        dpi = self.dpi_var.get()                                              # <-- Read DPI from slider
        use_jpeg = self.use_jpeg_var.get()                                    # <-- Read JPEG option from checkbox
        jpeg_quality = self.jpeg_quality_var.get()                            # <-- Read quality from slider
        
        logging.info(f"Starting compression: {input_path}")                   # <-- Log compression start
        logging.info(f"Settings: DPI={dpi}, JPEG={use_jpeg}, Quality={jpeg_quality}")  # <-- Log settings
        
        # Update UI to show processing
        self.status_label.config(text="Processing...", fg="blue")             # <-- Update status
        self.root.update_idletasks()                                          # <-- Force UI update
        
        try:
            # Call compression function with user's chosen values
            output_path = self._compress_pdf(input_path, dpi, use_jpeg, jpeg_quality)
            
            # Success
            self.status_label.config(text="Complete!", fg="green")            # <-- Update status to complete
            logging.info(f"Compression successful: {output_path}")            # <-- Log success
            
            messagebox.showinfo(
                "Compression Complete",
                f"Compressed PDF saved as:\n\n{output_path}"
            )
            
        except Exception as e:
            # Error handling
            self.status_label.config(text="Error occurred", fg="red")         # <-- Update status to error
            logging.error(f"Compression failed: {e}", exc_info=True)          # <-- Log error with traceback
            
            messagebox.showerror(
                "Compression Error",
                f"Failed to compress PDF:\n\n{type(e).__name__}: {e}"
            )
        finally:
            self.progress["value"] = 0                                        # <-- Reset progress bar
            self.root.update_idletasks()                                      # <-- Force UI update
    # ------------------------------------------------------------
    
    # FUNCTION | Core PDF Compression Logic
    # ------------------------------------------------------------
    def _compress_pdf(
        self, 
        input_path: str, 
        dpi: int, 
        use_jpeg: bool, 
        jpeg_quality: int
    ) -> str:
        # Flatten and compress a PDF by rendering each page to an image
        # Returns the output file path
        
        if not os.path.isfile(input_path):                                    # <-- Validate file exists
            raise FileNotFoundError(f"Input file not found: {input_path}")
        
        # Build output path with compression settings in filename
        base, _ext = os.path.splitext(input_path)                             # <-- Split filename and extension
        format_str = "JPEG" if use_jpeg else "PNG"                            # <-- Format type for filename
        quality_str = f"{jpeg_quality}" if use_jpeg else "100"                # <-- Quality for filename
        output_path = f"{base}__Compressed__DPI-{dpi}__{format_str}-{quality_str}.pdf"  # <-- Build descriptive filename
        
        logging.info(f"Output path: {output_path}")                           # <-- Log output path
        
        # Open PDF documents
        src_doc = fitz.open(input_path)                                       # <-- Open source PDF
        dst_doc = fitz.open()                                                 # <-- Create destination PDF
        
        # Calculate zoom factor for desired DPI
        zoom = dpi / 72.0                                                     # <-- 72 DPI is PDF standard
        mat = fitz.Matrix(zoom, zoom)                                         # <-- Create transformation matrix
        
        # Setup progress bar
        total_pages = len(src_doc)                                            # <-- Get total page count
        self.progress["maximum"] = total_pages                                # <-- Set progress bar maximum
        self.progress["value"] = 0                                            # <-- Reset progress bar
        
        try:
            # Process each page
            for page_index in range(total_pages):
                src_page = src_doc.load_page(page_index)                      # <-- Load source page
                
                # Update status
                self.status_label.config(
                    text=f"Processing page {page_index + 1} of {total_pages}...",
                    fg="blue"
                )
                self.root.update_idletasks()                                  # <-- Force UI update
                
                # Render page to pixmap (no alpha for printer compatibility)
                pix = src_page.get_pixmap(matrix=mat, alpha=False)            # <-- Render page at specified DPI
                
                # Use original page size in PDF points
                page_rect = src_page.rect                                     # <-- Get original page dimensions
                dst_page = dst_doc.new_page(width=page_rect.width, height=page_rect.height)  # <-- Create new page
                
                # Encode the image
                if use_jpeg:
                    # Try different PyMuPDF signatures for JPEG quality
                    img_bytes = None
                    # 1) Newer versions: keyword argument
                    try:
                        img_bytes = pix.tobytes("jpeg", quality=jpeg_quality)  # <-- Try keyword argument
                    except TypeError:
                        pass
                    
                    # 2) Some versions: positional quality argument
                    if img_bytes is None:
                        try:
                            img_bytes = pix.tobytes("jpeg", jpeg_quality)     # <-- Try positional argument
                        except TypeError:
                            pass
                    
                    # 3) Fallback: default JPEG
                    if img_bytes is None:
                        img_bytes = pix.tobytes("jpeg")                       # <-- Fallback to default
                else:
                    # Lossless PNG – best quality but usually larger files
                    img_bytes = pix.tobytes("png")                            # <-- PNG encoding
                
                dst_page.insert_image(page_rect, stream=img_bytes)            # <-- Insert image into page
                
                # Update progress bar
                self.progress["value"] = page_index + 1                       # <-- Increment progress
                self.root.update_idletasks()                                  # <-- Force UI update
            
            # Save with strong compression and cleanup
            dst_doc.save(
                output_path,
                deflate=True,                                                 # <-- Compress streams
                garbage=4,                                                    # <-- Max garbage collection
                clean=True,                                                   # <-- Remove redundant data
            )
            
        finally:
            src_doc.close()                                                   # <-- Close source document
            dst_doc.close()                                                   # <-- Close destination document
        
        return output_path                                                    # <-- Return output path
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------

# =============================================================================
# PHASE 4 : MAIN ENTRY POINT
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | Main Execution
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    root_app = tk.Tk()                                                        # <-- Create root window
    app = PdfCompressionApp(root_app)                                         # <-- Initialize application
    root_app.mainloop()                                                       # <-- Start GUI event loop
# endregion -------------------------------------------------------------------
