#!/usr/bin/env python3
# =============================================================================
# WHITECARDOPEDIA - CREATE DOCUMENT FROM ARRAY OF THUMBNAILS TO PDF
# =============================================================================
#
# FILE       : CreateDoc__ArrayThumbnailsToPdf__Main__.py
# NAMESPACE  : Whitecardopedia
# MODULE     : Create Document from Array of Thumbnails to PDF
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Create a PDF document from project thumbnails with configurable grid layout
# CREATED    : 2026
#
# DESCRIPTION:
# - Scans all projects in the Whitecardopedia Projects folder
# - Finds the main thumbnail image (IMG01 prefix) for each project
# - Creates a PDF document with thumbnails in a configurable grid layout
# - Uses TKinter to display a preview window with configuration options
# - Supports grid layouts from 1x1 to 10x10
# - Outputs A4 or A3 documents in Landscape or Portrait orientation
#
# DEPENDENCIES:
# - tkinter (built-in)
# - Pillow (PIL) - pip install Pillow
# - reportlab - pip install reportlab
#
# =============================================================================

import os
import re
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from pathlib import Path
from typing import List, Dict, Tuple, Optional
from datetime import datetime

try:
    from PIL import Image, ImageTk
except ImportError:
    print("ERROR: Pillow is required. Install with: pip install Pillow")
    exit(1)

try:
    from reportlab.lib.pagesizes import A4, A3, landscape, portrait
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas as pdf_canvas
    from reportlab.lib.utils import ImageReader
except ImportError:
    print("ERROR: ReportLab is required. Install with: pip install reportlab")
    exit(1)

# -----------------------------------------------------------------------------
# REGION | Module Constants and Configuration
# -----------------------------------------------------------------------------

    # MODULE CONSTANTS | Path Configuration
    # ------------------------------------------------------------
PROJECTS_BASE_PATH                 = "../../Projects"                         # <-- Base path to projects folder (relative to script)
    # ------------------------------------------------------------


    # MODULE CONSTANTS | Image Pattern Configuration
    # ------------------------------------------------------------
IMG01_PATTERN                      = r'^IMG01__.*\.(png|jpg|jpeg)$'           # <-- Pattern for IMG01 whitecard images (excludes _ART20__ watercolors)
SUPPORTED_EXTENSIONS               = ('.png', '.jpg', '.jpeg')                # <-- Supported image extensions
    # ------------------------------------------------------------


    # MODULE CONSTANTS | Page Size Configuration (in mm)
    # ------------------------------------------------------------
PAGE_SIZES = {
    'A4': {
        'width_mm'  : 210,                                                    # <-- A4 width in millimeters
        'height_mm' : 297,                                                    # <-- A4 height in millimeters
    },
    'A3': {
        'width_mm'  : 297,                                                    # <-- A3 width in millimeters
        'height_mm' : 420,                                                    # <-- A3 height in millimeters
    }
}
    # ------------------------------------------------------------


    # MODULE CONSTANTS | PDF Layout Configuration
    # ------------------------------------------------------------
PAGE_MARGIN_MM                     = 10                                       # <-- Page margin in millimeters
CELL_PADDING_MM                    = 3                                        # <-- Padding between cells in millimeters
    # ------------------------------------------------------------


    # MODULE CONSTANTS | Grid Layout Options
    # ------------------------------------------------------------
GRID_OPTIONS = [
    (1, 1),   (1, 2),   (2, 1),   (2, 2),                                     # <-- Small grids
    (2, 3),   (3, 2),   (3, 3),                                               # <-- Medium grids
    (3, 4),   (4, 3),   (4, 4),                                               # <-- Standard grids
    (4, 5),   (5, 4),   (5, 5),                                               # <-- Large grids
    (5, 6),   (6, 5),   (6, 6),                                               # <-- Extra large grids
    (6, 7),   (7, 6),   (7, 7),                                               # <-- Very large grids
    (7, 8),   (8, 7),   (8, 8),                                               # <-- Huge grids
    (8, 9),   (9, 8),   (9, 9),                                               # <-- Massive grids
    (9, 10),  (10, 9),  (10, 10),                                             # <-- Maximum grids
]
    # ------------------------------------------------------------


    # MODULE CONSTANTS | Console Color Codes
    # ------------------------------------------------------------
COLOR_RESET                        = '\033[0m'                                # <-- Reset color
COLOR_GREEN                        = '\033[92m'                               # <-- Success messages
COLOR_YELLOW                       = '\033[93m'                               # <-- Warning messages
COLOR_BLUE                         = '\033[94m'                               # <-- Info messages
COLOR_CYAN                         = '\033[96m'                               # <-- Highlight messages
COLOR_RED                          = '\033[91m'                               # <-- Error messages
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Project Discovery Functions
# -----------------------------------------------------------------------------

    # HELPER FUNCTION | Discover Year Folders in Projects Directory
    # ---------------------------------------------------------------
def discover_project_year_folders(base_path: Path) -> List[Tuple[str, Path]]:
    """Discover all year folders (YYYY format) in the projects directory"""
    year_folders = []                                                         # <-- Initialize list
    
    if not base_path.exists() or not base_path.is_dir():
        return year_folders                                                   # <-- Return empty if path invalid
    
    for item in base_path.iterdir():
        if item.is_dir() and item.name.isdigit() and len(item.name) == 4:    # <-- Check for 4-digit year folder
            year_folders.append((item.name, item))                            # <-- Add (year, path) tuple
    
    return sorted(year_folders, key=lambda x: x[0], reverse=True)            # <-- Sort by year (newest first)
    # ---------------------------------------------------------------


    # HELPER FUNCTION | Find IMG01 Thumbnail in Project Folder
    # ---------------------------------------------------------------
def find_img01_thumbnail(project_path: Path) -> Optional[Path]:
    """Find the IMG01 prefixed thumbnail image in a project folder"""
    if not project_path.exists() or not project_path.is_dir():
        return None                                                           # <-- Return None if path invalid
    
    for item in project_path.iterdir():
        if item.is_file():                                                    # <-- Check if item is file
            filename = item.name                                              # <-- Get filename
            if re.match(IMG01_PATTERN, filename, re.IGNORECASE):              # <-- Check pattern match
                return item                                                   # <-- Return first matching IMG01
    
    return None                                                               # <-- Return None if no IMG01 found
    # ---------------------------------------------------------------


    # FUNCTION | Discover All IMG01 Thumbnails Across All Projects
    # ------------------------------------------------------------
def discover_all_thumbnails(base_path: Path) -> List[Dict]:
    """Discover all IMG01 thumbnail images from all projects across all years"""
    thumbnails = []                                                           # <-- Initialize thumbnails list
    
    year_folders = discover_project_year_folders(base_path)                   # <-- Get all year folders
    
    for year, year_path in year_folders:
        for project_folder in sorted(year_path.iterdir()):                    # <-- Iterate sorted project folders
            if not project_folder.is_dir():
                continue                                                      # <-- Skip non-directories
            
            if project_folder.name.startswith('.'):
                continue                                                      # <-- Skip hidden folders
            
            if project_folder.name.startswith('00__') or project_folder.name.startswith('01__'):
                continue                                                      # <-- Skip template/example folders
            
            img01_path = find_img01_thumbnail(project_folder)                 # <-- Find IMG01 in project
            
            if img01_path:
                thumbnails.append({
                    'year'         : year,                                    # <-- Project year
                    'project_name' : project_folder.name,                     # <-- Project folder name
                    'image_path'   : img01_path,                              # <-- Full path to IMG01 image
                })
    
    return thumbnails                                                         # <-- Return all discovered thumbnails
    # ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | PDF Generation Functions
# -----------------------------------------------------------------------------

    # HELPER FUNCTION | Calculate Grid Cell Dimensions
    # ---------------------------------------------------------------
def calculate_cell_dimensions(page_width_mm: float, page_height_mm: float,
                               rows: int, cols: int) -> Tuple[float, float]:
    """Calculate individual cell dimensions based on page size and grid layout"""
    usable_width  = page_width_mm - (2 * PAGE_MARGIN_MM)                      # <-- Available width after margins
    usable_height = page_height_mm - (2 * PAGE_MARGIN_MM)                     # <-- Available height after margins
    
    cell_width  = (usable_width - (cols - 1) * CELL_PADDING_MM) / cols        # <-- Width per cell
    cell_height = (usable_height - (rows - 1) * CELL_PADDING_MM) / rows       # <-- Height per cell
    
    return cell_width, cell_height                                            # <-- Return cell dimensions
    # ---------------------------------------------------------------


    # HELPER FUNCTION | Calculate Image Position Within Cell
    # ---------------------------------------------------------------
def calculate_image_fit(img_width: int, img_height: int,
                        cell_width_mm: float, cell_height_mm: float) -> Tuple[float, float, float, float]:
    """Calculate scaled image dimensions and offsets to fit and center within cell"""
    img_aspect  = img_width / img_height                                      # <-- Image aspect ratio
    cell_aspect = cell_width_mm / cell_height_mm                              # <-- Cell aspect ratio
    
    if img_aspect > cell_aspect:
        # IMAGE IS WIDER THAN CELL - FIT TO WIDTH
        scaled_width  = cell_width_mm                                         # <-- Scale to cell width
        scaled_height = cell_width_mm / img_aspect                            # <-- Calculate proportional height
        offset_x = 0                                                          # <-- No horizontal offset
        offset_y = (cell_height_mm - scaled_height) / 2                       # <-- Center vertically
    else:
        # IMAGE IS TALLER THAN CELL - FIT TO HEIGHT
        scaled_height = cell_height_mm                                        # <-- Scale to cell height
        scaled_width  = cell_height_mm * img_aspect                           # <-- Calculate proportional width
        offset_x = (cell_width_mm - scaled_width) / 2                         # <-- Center horizontally
        offset_y = 0                                                          # <-- No vertical offset
    
    return scaled_width, scaled_height, offset_x, offset_y                    # <-- Return dimensions and offsets
    # ---------------------------------------------------------------


    # FUNCTION | Generate PDF Document from Thumbnails
    # ------------------------------------------------------------
def generate_pdf_document(thumbnails: List[Dict], output_path: str,
                          page_size: str, orientation: str,
                          rows: int, cols: int) -> bool:
    """Generate PDF document with thumbnail grid layout"""
    try:
        # DETERMINE PAGE DIMENSIONS
        page_config = PAGE_SIZES[page_size]                                   # <-- Get page size config
        
        if orientation == 'Landscape':
            page_width_mm  = page_config['height_mm']                         # <-- Swap for landscape
            page_height_mm = page_config['width_mm']
            reportlab_size = landscape(A4 if page_size == 'A4' else A3)       # <-- ReportLab page size
        else:
            page_width_mm  = page_config['width_mm']                          # <-- Portrait orientation
            page_height_mm = page_config['height_mm']
            reportlab_size = portrait(A4 if page_size == 'A4' else A3)        # <-- ReportLab page size
        
        # CALCULATE CELL DIMENSIONS
        cell_width_mm, cell_height_mm = calculate_cell_dimensions(
            page_width_mm, page_height_mm, rows, cols
        )
        
        # CREATE PDF CANVAS
        c = pdf_canvas.Canvas(output_path, pagesize=reportlab_size)           # <-- Initialize PDF canvas
        
        images_per_page = rows * cols                                         # <-- Images that fit on one page
        total_pages = (len(thumbnails) + images_per_page - 1) // images_per_page  # <-- Calculate total pages
        
        for page_num in range(total_pages):
            if page_num > 0:
                c.showPage()                                                  # <-- Add new page
            
            start_idx = page_num * images_per_page                            # <-- Start index for this page
            end_idx   = min(start_idx + images_per_page, len(thumbnails))     # <-- End index for this page
            page_thumbnails = thumbnails[start_idx:end_idx]                   # <-- Thumbnails for this page
            
            for idx, thumbnail in enumerate(page_thumbnails):
                row = idx // cols                                             # <-- Calculate row position
                col = idx % cols                                              # <-- Calculate column position
                
                # CALCULATE CELL POSITION (bottom-left origin in ReportLab)
                cell_x = PAGE_MARGIN_MM + col * (cell_width_mm + CELL_PADDING_MM)
                cell_y = page_height_mm - PAGE_MARGIN_MM - (row + 1) * cell_height_mm - row * CELL_PADDING_MM
                
                try:
                    # LOAD AND PROCESS IMAGE
                    img = Image.open(thumbnail['image_path'])                 # <-- Load image
                    img_width, img_height = img.size                          # <-- Get image dimensions
                    
                    # CALCULATE SCALED DIMENSIONS
                    scaled_w, scaled_h, off_x, off_y = calculate_image_fit(
                        img_width, img_height, cell_width_mm, cell_height_mm
                    )
                    
                    # DRAW IMAGE ON PDF
                    img_reader = ImageReader(img)                             # <-- Create image reader
                    c.drawImage(
                        img_reader,
                        (cell_x + off_x) * mm,                                # <-- X position in points
                        (cell_y + off_y) * mm,                                # <-- Y position in points
                        width=scaled_w * mm,                                  # <-- Width in points
                        height=scaled_h * mm,                                 # <-- Height in points
                        preserveAspectRatio=True
                    )
                    
                except Exception as img_error:
                    print(f"{COLOR_YELLOW}[!] Warning: Could not load {thumbnail['image_path']}: {img_error}{COLOR_RESET}")
                    continue                                                  # <-- Skip failed images
        
        c.save()                                                              # <-- Save PDF document
        return True                                                           # <-- Return success
        
    except Exception as error:
        print(f"{COLOR_RED}[X] Error generating PDF: {error}{COLOR_RESET}")
        return False                                                          # <-- Return failure
    # ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | TKinter GUI Application
# -----------------------------------------------------------------------------

class ThumbnailPdfGeneratorApp:
    """TKinter application for generating PDF documents from project thumbnails"""
    
    # FUNCTION | Initialize Application
    # ------------------------------------------------------------
    def __init__(self, root: tk.Tk):
        self.root = root                                                      # <-- Store root window reference
        self.root.title("Whitecardopedia - Thumbnail PDF Generator")          # <-- Set window title
        self.root.geometry("900x700")                                         # <-- Set initial window size
        self.root.minsize(800, 600)                                           # <-- Set minimum window size
        
        # INITIALIZE VARIABLES
        self.thumbnails: List[Dict] = []                                      # <-- Discovered thumbnails
        self.preview_images: List[ImageTk.PhotoImage] = []                    # <-- Preview image references
        self.current_preview_page = 0                                         # <-- Currently displayed preview page (zero-indexed)
        
        # CONFIGURATION VARIABLES
        self.page_size_var    = tk.StringVar(value='A4')                      # <-- Page size selection
        self.orientation_var  = tk.StringVar(value='Landscape')               # <-- Orientation selection
        self.grid_layout_var  = tk.StringVar(value='3 x 3')                   # <-- Grid layout selection
        
        # BUILD GUI
        self._create_menu()                                                   # <-- Create menu bar
        self._create_main_layout()                                            # <-- Create main layout
        self._create_status_bar()                                             # <-- Create status bar
        
        # LOAD THUMBNAILS
        self._load_thumbnails()                                               # <-- Discover and load thumbnails
        self._update_preview()                                                # <-- Initial preview render
    # ---------------------------------------------------------------
    
    
    # FUNCTION | Create Menu Bar
    # ------------------------------------------------------------
    def _create_menu(self):
        menubar = tk.Menu(self.root)                                          # <-- Create menu bar
        self.root.config(menu=menubar)                                        # <-- Attach to root window
        
        # FILE MENU
        file_menu = tk.Menu(menubar, tearoff=0)                               # <-- Create file menu
        menubar.add_cascade(label="File", menu=file_menu)                     # <-- Add to menu bar
        file_menu.add_command(label="Refresh Projects", command=self._load_thumbnails)  # <-- Refresh command
        file_menu.add_separator()
        file_menu.add_command(label="Export PDF...", command=self._export_pdf)  # <-- Export command
        file_menu.add_separator()
        file_menu.add_command(label="Exit", command=self.root.quit)           # <-- Exit command
    # ---------------------------------------------------------------
    
    
    # FUNCTION | Create Main Layout
    # ------------------------------------------------------------
    def _create_main_layout(self):
        # MAIN CONTAINER
        main_frame = ttk.Frame(self.root, padding="10")                       # <-- Main container frame
        main_frame.pack(fill=tk.BOTH, expand=True)                            # <-- Fill window
        
        # LEFT PANEL - CONTROLS
        controls_frame = ttk.LabelFrame(main_frame, text="Configuration", padding="10")
        controls_frame.pack(side=tk.LEFT, fill=tk.Y, padx=(0, 10))            # <-- Left side panel
        
        # PAGE SIZE SELECTION
        ttk.Label(controls_frame, text="Page Size:").pack(anchor=tk.W, pady=(0, 5))
        for size in ['A4', 'A3']:
            ttk.Radiobutton(
                controls_frame, text=size, variable=self.page_size_var,
                value=size, command=self._on_config_change
            ).pack(anchor=tk.W)
        
        ttk.Separator(controls_frame, orient=tk.HORIZONTAL).pack(fill=tk.X, pady=10)
        
        # ORIENTATION SELECTION
        ttk.Label(controls_frame, text="Orientation:").pack(anchor=tk.W, pady=(0, 5))
        for orient in ['Portrait', 'Landscape']:
            ttk.Radiobutton(
                controls_frame, text=orient, variable=self.orientation_var,
                value=orient, command=self._on_config_change
            ).pack(anchor=tk.W)
        
        ttk.Separator(controls_frame, orient=tk.HORIZONTAL).pack(fill=tk.X, pady=10)
        
        # GRID LAYOUT SELECTION
        ttk.Label(controls_frame, text="Grid Layout (Rows x Cols):").pack(anchor=tk.W, pady=(0, 5))
        grid_options = [f"{r} x {c}" for r, c in GRID_OPTIONS]                # <-- Format grid options
        grid_combo = ttk.Combobox(
            controls_frame, textvariable=self.grid_layout_var,
            values=grid_options, state='readonly', width=10
        )
        grid_combo.pack(anchor=tk.W, pady=(0, 10))
        grid_combo.bind('<<ComboboxSelected>>', lambda e: self._on_config_change())
        
        ttk.Separator(controls_frame, orient=tk.HORIZONTAL).pack(fill=tk.X, pady=10)
        
        # PROJECT COUNT INFO
        self.project_count_label = ttk.Label(controls_frame, text="Projects: 0")
        self.project_count_label.pack(anchor=tk.W, pady=(0, 5))
        
        self.page_count_label = ttk.Label(controls_frame, text="Pages: 0")
        self.page_count_label.pack(anchor=tk.W, pady=(0, 10))
        
        ttk.Separator(controls_frame, orient=tk.HORIZONTAL).pack(fill=tk.X, pady=10)
        
        # ACTION BUTTONS
        ttk.Button(
            controls_frame, text="Refresh Projects",
            command=self._load_thumbnails
        ).pack(fill=tk.X, pady=(0, 5))
        
        ttk.Button(
            controls_frame, text="Export PDF...",
            command=self._export_pdf
        ).pack(fill=tk.X)
        
        # RIGHT PANEL - PREVIEW
        preview_frame = ttk.LabelFrame(main_frame, text="Preview", padding="10")
        preview_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)          # <-- Right side panel
        
        # PREVIEW CANVAS WITH SCROLLBAR
        canvas_container = ttk.Frame(preview_frame)                           # <-- Canvas container
        canvas_container.pack(fill=tk.BOTH, expand=True)
        
        self.preview_canvas = tk.Canvas(
            canvas_container, bg='white', highlightthickness=1,
            highlightbackground='#cccccc'
        )
        self.preview_canvas.pack(fill=tk.BOTH, expand=True)
        
        # BIND RESIZE EVENT
        self.preview_canvas.bind('<Configure>', lambda e: self._update_preview())
        
        # PAGE NAVIGATION CONTROLS
        nav_frame = ttk.Frame(preview_frame)                                  # <-- Navigation controls container
        nav_frame.pack(fill=tk.X, pady=(5, 0))                                # <-- Pack below canvas
        
        self.prev_button = ttk.Button(
            nav_frame, text="◀ Previous",
            command=self._prev_page
        )
        self.prev_button.pack(side=tk.LEFT, padx=5)                           # <-- Previous button on left
        
        self.page_label = ttk.Label(nav_frame, text="Page 1 of 1")            # <-- Page indicator
        self.page_label.pack(side=tk.LEFT, expand=True)                       # <-- Center page label
        
        self.next_button = ttk.Button(
            nav_frame, text="Next ▶",
            command=self._next_page
        )
        self.next_button.pack(side=tk.RIGHT, padx=5)                          # <-- Next button on right
    # ---------------------------------------------------------------
    
    
    # FUNCTION | Create Status Bar
    # ------------------------------------------------------------
    def _create_status_bar(self):
        self.status_var = tk.StringVar(value="Ready")                         # <-- Status text variable
        status_bar = ttk.Label(
            self.root, textvariable=self.status_var,
            relief=tk.SUNKEN, anchor=tk.W, padding=(5, 2)
        )
        status_bar.pack(side=tk.BOTTOM, fill=tk.X)                            # <-- Pack at bottom
    # ---------------------------------------------------------------
    
    
    # FUNCTION | Load Thumbnails from Projects Folder
    # ------------------------------------------------------------
    def _load_thumbnails(self):
        self.status_var.set("Scanning projects...")                           # <-- Update status
        self.root.update()                                                    # <-- Force UI update
        
        # DETERMINE PROJECTS BASE PATH
        script_dir = Path(__file__).parent                                    # <-- Get script directory
        projects_path = (script_dir / PROJECTS_BASE_PATH).resolve()           # <-- Resolve projects path
        
        if not projects_path.exists():
            messagebox.showerror(
                "Error",
                f"Projects folder not found:\n{projects_path}"
            )
            self.status_var.set("Error: Projects folder not found")
            return
        
        # DISCOVER THUMBNAILS
        self.thumbnails = discover_all_thumbnails(projects_path)              # <-- Get all thumbnails
        
        # UPDATE UI
        self.project_count_label.config(text=f"Projects: {len(self.thumbnails)}")
        self._update_page_count()                                             # <-- Update page count
        self._update_preview()                                                # <-- Refresh preview
        
        self.status_var.set(f"Loaded {len(self.thumbnails)} project thumbnails")
        print(f"{COLOR_GREEN}[+] Discovered {len(self.thumbnails)} IMG01 thumbnails{COLOR_RESET}")
    # ---------------------------------------------------------------
    
    
    # FUNCTION | Update Page Count Based on Grid Layout
    # ------------------------------------------------------------
    def _update_page_count(self):
        rows, cols = self._get_grid_dimensions()                              # <-- Get current grid
        images_per_page = rows * cols                                         # <-- Calculate per page
        total_pages = (len(self.thumbnails) + images_per_page - 1) // images_per_page if self.thumbnails else 0
        self.page_count_label.config(text=f"Pages: {total_pages}")            # <-- Update label
    # ---------------------------------------------------------------
    
    
    # FUNCTION | Navigate to Previous Page
    # ------------------------------------------------------------
    def _prev_page(self):
        if self.current_preview_page > 0:                                     # <-- Check if not at first page
            self.current_preview_page -= 1                                    # <-- Decrement page number
            self._update_preview()                                            # <-- Refresh preview
    # ---------------------------------------------------------------
    
    
    # FUNCTION | Navigate to Next Page
    # ------------------------------------------------------------
    def _next_page(self):
        rows, cols = self._get_grid_dimensions()                              # <-- Get current grid dimensions
        images_per_page = rows * cols                                         # <-- Calculate images per page
        max_page = (len(self.thumbnails) - 1) // images_per_page if self.thumbnails else 0  # <-- Calculate last page index
        
        if self.current_preview_page < max_page:                              # <-- Check if not at last page
            self.current_preview_page += 1                                    # <-- Increment page number
            self._update_preview()                                            # <-- Refresh preview
    # ---------------------------------------------------------------
    
    
    # FUNCTION | Update Navigation Button States
    # ------------------------------------------------------------
    def _update_navigation_buttons(self):
        if not self.thumbnails:
            self.prev_button.config(state='disabled')                         # <-- Disable if no thumbnails
            self.next_button.config(state='disabled')
            self.page_label.config(text="Page 1 of 1")
            return
        
        rows, cols = self._get_grid_dimensions()                              # <-- Get current grid dimensions
        images_per_page = rows * cols                                         # <-- Calculate images per page
        total_pages = (len(self.thumbnails) + images_per_page - 1) // images_per_page  # <-- Calculate total pages
        current_page_display = self.current_preview_page + 1                  # <-- Convert to 1-indexed for display
        
        # UPDATE PAGE LABEL
        self.page_label.config(text=f"Page {current_page_display} of {total_pages}")
        
        # UPDATE BUTTON STATES
        if self.current_preview_page <= 0:
            self.prev_button.config(state='disabled')                         # <-- Disable previous at first page
        else:
            self.prev_button.config(state='normal')                           # <-- Enable previous button
        
        if self.current_preview_page >= total_pages - 1:
            self.next_button.config(state='disabled')                         # <-- Disable next at last page
        else:
            self.next_button.config(state='normal')                           # <-- Enable next button
    # ---------------------------------------------------------------
    
    
    # FUNCTION | Handle Configuration Change
    # ------------------------------------------------------------
    def _on_config_change(self):
        self.current_preview_page = 0                                         # <-- Reset to first page on config change
        self._update_preview()                                                # <-- Update preview with new config
    # ---------------------------------------------------------------
    
    
    # HELPER FUNCTION | Get Current Grid Dimensions
    # ---------------------------------------------------------------
    def _get_grid_dimensions(self) -> Tuple[int, int]:
        grid_str = self.grid_layout_var.get()                                 # <-- Get grid string
        parts = grid_str.split(' x ')                                         # <-- Split by delimiter
        return int(parts[0]), int(parts[1])                                   # <-- Return (rows, cols)
    # ---------------------------------------------------------------
    
    
    # FUNCTION | Update Preview Canvas
    # ------------------------------------------------------------
    def _update_preview(self):
        self._update_page_count()                                             # <-- Update page count
        
        # CLEAR CANVAS
        self.preview_canvas.delete('all')                                     # <-- Clear all items
        self.preview_images.clear()                                           # <-- Clear image references
        
        if not self.thumbnails:
            self.preview_canvas.create_text(
                self.preview_canvas.winfo_width() // 2,
                self.preview_canvas.winfo_height() // 2,
                text="No thumbnails found.\nClick 'Refresh Projects' to scan.",
                fill='#666666', font=('Arial', 12)
            )
            return
        
        # GET CURRENT CONFIGURATION
        rows, cols = self._get_grid_dimensions()                              # <-- Get grid dimensions
        page_size = self.page_size_var.get()                                  # <-- Get page size
        orientation = self.orientation_var.get()                              # <-- Get orientation
        
        # CALCULATE PAGE DIMENSIONS
        page_config = PAGE_SIZES[page_size]                                   # <-- Get page config
        if orientation == 'Landscape':
            page_width_mm  = page_config['height_mm']                         # <-- Swap for landscape
            page_height_mm = page_config['width_mm']
        else:
            page_width_mm  = page_config['width_mm']                          # <-- Portrait
            page_height_mm = page_config['height_mm']
        
        # CALCULATE PREVIEW SCALE
        canvas_width  = self.preview_canvas.winfo_width() - 20                # <-- Available canvas width
        canvas_height = self.preview_canvas.winfo_height() - 20               # <-- Available canvas height
        
        if canvas_width <= 1 or canvas_height <= 1:
            return                                                            # <-- Skip if canvas not ready
        
        scale_x = canvas_width / page_width_mm                                # <-- X scale factor
        scale_y = canvas_height / page_height_mm                              # <-- Y scale factor
        scale = min(scale_x, scale_y)                                         # <-- Use smaller scale
        
        # CALCULATE PREVIEW DIMENSIONS
        preview_width  = int(page_width_mm * scale)                           # <-- Scaled preview width
        preview_height = int(page_height_mm * scale)                          # <-- Scaled preview height
        
        # CENTER PREVIEW ON CANVAS
        offset_x = (canvas_width - preview_width) // 2 + 10                   # <-- X offset for centering
        offset_y = (canvas_height - preview_height) // 2 + 10                 # <-- Y offset for centering
        
        # DRAW PAGE BACKGROUND
        self.preview_canvas.create_rectangle(
            offset_x, offset_y,
            offset_x + preview_width, offset_y + preview_height,
            fill='white', outline='#999999', width=2
        )
        
        # CALCULATE CELL DIMENSIONS (SCALED)
        cell_width_mm, cell_height_mm = calculate_cell_dimensions(
            page_width_mm, page_height_mm, rows, cols
        )
        cell_width  = int(cell_width_mm * scale)                              # <-- Scaled cell width
        cell_height = int(cell_height_mm * scale)                             # <-- Scaled cell height
        
        margin_scaled  = int(PAGE_MARGIN_MM * scale)                          # <-- Scaled margin
        padding_scaled = int(CELL_PADDING_MM * scale)                         # <-- Scaled padding
        
        # DRAW THUMBNAIL GRID FOR CURRENT PAGE
        images_per_page = rows * cols                                         # <-- Images per page
        start_idx = self.current_preview_page * images_per_page               # <-- Start index for current page
        end_idx = min(start_idx + images_per_page, len(self.thumbnails))     # <-- End index for current page
        page_thumbnails = self.thumbnails[start_idx:end_idx]                  # <-- Thumbnails for current page
        
        for idx, thumbnail in enumerate(page_thumbnails):
            row = idx // cols                                                 # <-- Row position
            col = idx % cols                                                  # <-- Column position
            
            # CALCULATE CELL POSITION
            cell_x = offset_x + margin_scaled + col * (cell_width + padding_scaled)
            cell_y = offset_y + margin_scaled + row * (cell_height + padding_scaled)
            
            # DRAW CELL OUTLINE
            self.preview_canvas.create_rectangle(
                cell_x, cell_y,
                cell_x + cell_width, cell_y + cell_height,
                outline='#dddddd', width=1
            )
            
            try:
                # LOAD AND RESIZE IMAGE FOR PREVIEW
                img = Image.open(thumbnail['image_path'])                     # <-- Load image
                img.thumbnail((cell_width - 4, cell_height - 4), Image.Resampling.LANCZOS)  # <-- Resize
                
                photo = ImageTk.PhotoImage(img)                               # <-- Convert to PhotoImage
                self.preview_images.append(photo)                             # <-- Keep reference
                
                # CENTER IMAGE IN CELL
                img_x = cell_x + (cell_width - photo.width()) // 2
                img_y = cell_y + (cell_height - photo.height()) // 2
                
                self.preview_canvas.create_image(img_x, img_y, image=photo, anchor=tk.NW)
                
            except Exception as error:
                # DRAW PLACEHOLDER FOR FAILED IMAGES
                self.preview_canvas.create_rectangle(
                    cell_x + 2, cell_y + 2,
                    cell_x + cell_width - 2, cell_y + cell_height - 2,
                    fill='#f0f0f0', outline='#cccccc'
                )
                self.preview_canvas.create_text(
                    cell_x + cell_width // 2, cell_y + cell_height // 2,
                    text="?", fill='#999999', font=('Arial', 10)
                )
        
        # DRAW PAGE INFO
        total_pages = (len(self.thumbnails) + images_per_page - 1) // images_per_page if self.thumbnails else 1
        current_page_display = self.current_preview_page + 1                  # <-- Convert to 1-indexed for display
        info_text = f"Page {current_page_display} of {total_pages}"
        self.preview_canvas.create_text(
            offset_x + preview_width // 2,
            offset_y + preview_height + 15,
            text=info_text, fill='#666666', font=('Arial', 9)
        )
        
        # UPDATE NAVIGATION CONTROLS
        self._update_navigation_buttons()
    # ---------------------------------------------------------------
    
    
    # FUNCTION | Export PDF Document
    # ------------------------------------------------------------
    def _export_pdf(self):
        if not self.thumbnails:
            messagebox.showwarning("No Thumbnails", "No thumbnails to export. Please refresh projects first.")
            return
        
        # GET OUTPUT FILENAME
        default_filename = f"Whitecardopedia_Thumbnails_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        output_path = filedialog.asksaveasfilename(
            defaultextension=".pdf",
            filetypes=[("PDF files", "*.pdf"), ("All files", "*.*")],
            initialfile=default_filename,
            title="Save PDF As"
        )
        
        if not output_path:
            return                                                            # <-- User cancelled
        
        # GET CONFIGURATION
        rows, cols = self._get_grid_dimensions()                              # <-- Get grid dimensions
        page_size = self.page_size_var.get()                                  # <-- Get page size
        orientation = self.orientation_var.get()                              # <-- Get orientation
        
        self.status_var.set("Generating PDF...")                              # <-- Update status
        self.root.update()                                                    # <-- Force UI update
        
        # GENERATE PDF
        success = generate_pdf_document(
            self.thumbnails, output_path,
            page_size, orientation,
            rows, cols
        )
        
        if success:
            self.status_var.set(f"PDF saved: {output_path}")
            messagebox.showinfo("Success", f"PDF exported successfully!\n\n{output_path}")
            print(f"{COLOR_GREEN}[+] PDF saved to: {output_path}{COLOR_RESET}")
        else:
            self.status_var.set("Error generating PDF")
            messagebox.showerror("Error", "Failed to generate PDF. Check console for details.")
    # ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Main Entry Point
# -----------------------------------------------------------------------------

    # FUNCTION | Main Script Entry Point
    # ------------------------------------------------------------
def main():
    print(f"\n{COLOR_CYAN}Whitecardopedia - Thumbnail PDF Generator{COLOR_RESET}")
    print(f"{COLOR_CYAN}{'='*50}{COLOR_RESET}\n")
    
    # CREATE ROOT WINDOW
    root = tk.Tk()                                                            # <-- Create root window
    
    # SET APPLICATION ICON (if available)
    try:
        # Attempt to set window icon
        pass                                                                  # <-- Icon setting placeholder
    except Exception:
        pass                                                                  # <-- Ignore icon errors
    
    # CREATE AND RUN APPLICATION
    app = ThumbnailPdfGeneratorApp(root)                                      # <-- Create application
    root.mainloop()                                                           # <-- Start event loop
    
    print(f"\n{COLOR_GREEN}[+] Application closed{COLOR_RESET}")
    # ---------------------------------------------------------------

# endregion -------------------------------------------------------------------


if __name__ == '__main__':
    main()
