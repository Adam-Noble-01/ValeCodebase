# =============================================================================
# VALEDESIGNSUITE - PDF IMAGE SHARPENER WITH TEXT PRESERVATION
# =============================================================================
#
# FILE       : Python__PdfUtil__DrawingPostProcessing__PdfFiles__1.4.1__.py
# NAMESPACE  : PdfImageSharpener
# MODULE     : PdfImageSharpener
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : PDF Drawing Enhancement Tool with Advanced Sharpening for Architectural Drawings
# CREATED    : 2025
#
# DESCRIPTION:
# - Select one or more PDFs for processing with advanced sharpening algorithms.
# - Specialized enhancement pipeline for architectural and technical drawings.
# - Multi-stage processing: edge detection, line enhancement, contrast boosting.
# - Preserves vector text and linework on top for optimal drawing clarity.
# - Exports an enhanced PDF by default, with optional per-page JPG export.
# - Alternative mode to replace each embedded image in-place without flattening.
# - Uses enhanced architectural drawing algorithms with edge reinforcement.
# - Coordinates handled in PDF user space with DPI control for background render density.
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 02-Sep-2025 - Version 1.2.0
# - Refactored to Adam Noble coding style conventions
# - Added thumbnail loading functionality from dependencies folder
# - Improved regional structure and function organization
# - Enhanced UI layout and error handling
#
# 02-Sep-2025 - Version 1.3.0
# - Complete rewrite of sharpening pipeline for architectural drawings
# - Added OpenCV-based edge detection and enhancement
# - Implemented multi-scale sharpening with adaptive kernels
# - Added CLAHE contrast enhancement for better line visibility
# - Increased default sharpening values for badly scanned drawings
# - Added preset configurations for different drawing types
# - Implemented preview/comparison mode for visual verification
#
# 02-Sep-2025 - Version 1.4.0
# - CRITICAL FIX: Now processes ALL PDF pages, not just those with embedded images
# - Added full page rendering for PDFs with vector content (text, lines, etc.)
# - Implemented ISO paper size detection and metadata setting for proper printing
# - Fixed processing pipeline to ensure effects are always applied
# - Enhanced logging to show what type of content is being processed
# - Added automatic paper size standardization (A0, A1, A2, A3, A4, etc.)
# - FIXED: Proper image flattening by reconstructing pages completely
# - FIXED: Ensure sharpening effects are properly applied and visible
#
# 02-Sep-2025 - Version 1.4.1
# - CRITICAL FIX: Improved A2 paper size recognition for printers
# - Increased tolerance from 10mm to 30mm (10% margin) for ISO size detection
# - Added explicit MediaBox setting using page.set_mediabox() for printer compatibility
# - Fixed page creation to use exact standard dimensions when ISO size detected
# - Enhanced printer recognition by setting both metadata AND page geometry
#
# =============================================================================

import io
import os
import sys
import traceback
import logging
import tkinter as tk
from tkinter import filedialog, ttk, messagebox
from datetime import datetime
from pathlib import Path

import numpy as np
import cv2
from PIL import Image, ImageFilter, ImageOps, ImageEnhance, ImageDraw, ImageFont
import fitz  # PyMuPDF

# -----------------------------------------------------------------------------
# REGION | Icon Loader Setup and Dependencies
# -----------------------------------------------------------------------------

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
# ---------------------------------------------------------------

# LOADER | Logging setup for the script
# ---------------------------------------------------------------
script_dir = os.path.dirname(os.path.abspath(__file__))                                             # <-- Get script directory
logging.basicConfig(                                                                                # <-- Configure logging
    filename=os.path.join(script_dir, "PdfImageSharpener.log"),                                     # <-- Log file path
    level=logging.INFO,                                                                              # <-- Log level
    format="%(asctime)s | %(levelname)s | %(message)s",                                             # <-- Log format
)
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Image Processing - Smart Sharpen Algorithm Implementation
# -----------------------------------------------------------------------------

# FUNCTION | Enhanced Smart Sharpen for Architectural Drawings
# ------------------------------------------------------------
def smart_sharpen_pil(im, amount_percent=200, radius=2.0, reduce_noise_percent=50):
    """
    Enhanced sharpening pipeline specifically for architectural drawings.
    Combines multiple techniques for maximum line and edge clarity.
    
    Processing Pipeline:
      1) Adaptive noise reduction
      2) Edge detection and enhancement
      3) Multi-pass sharpening with different kernels
      4) Contrast and clarity boost
      5) Line reinforcement for technical drawings
    
    Parameters:
    amount_percent: Sharpening intensity (0 to 500)
    radius: Sharpening radius in pixels
    reduce_noise_percent: Noise reduction strength (0 to 100)
    """
    if im.mode not in ("RGB", "L", "RGBA"):                             # <-- Ensure compatible color mode
        im = im.convert("RGB")                                           # <-- Convert to RGB if needed
    
    # Separate alpha channel if present
    alpha = None                                                         # <-- Initialize alpha placeholder
    if im.mode == "RGBA":                                                # <-- Check for alpha channel
        alpha = im.split()[-1]                                           # <-- Extract alpha channel
        im = im.convert("RGB")                                           # <-- Convert to RGB for processing
    
    # Convert to numpy array for advanced processing
    img_array = np.array(im)                                            # <-- Convert PIL to numpy
    
    # Apply advanced sharpening pipeline
    result = architectural_drawing_enhancement(                          # <-- Apply specialized enhancement
        img_array, 
        amount_percent, 
        radius, 
        reduce_noise_percent
    )
    
    # Convert back to PIL Image
    sharpened = Image.fromarray(result)                                 # <-- Convert numpy to PIL
    
    if alpha is not None:                                                # <-- Restore alpha channel if present
        sharpened = sharpened.convert("RGBA")                            # <-- Convert back to RGBA
        sharpened.putalpha(alpha)                                        # <-- Restore original alpha channel
    
    return sharpened                                                     # <-- Return processed image
# ---------------------------------------------------------------

# HELPER FUNCTION | Architectural Drawing Enhancement Pipeline
# ---------------------------------------------------------------
def architectural_drawing_enhancement(img_array, amount, radius, denoise):
    """
    Specialized enhancement pipeline for technical drawings and blueprints.
    Uses OpenCV for advanced image processing operations.
    """
    
    # Step 1: Adaptive Denoising
    if denoise > 0:                                                      # <-- Apply denoising if requested
        denoised = cv2.fastNlMeansDenoisingColored(                     # <-- Advanced noise reduction
            img_array, 
            None, 
            h=int(denoise * 0.2),                                        # <-- Luminance denoising strength
            hColor=int(denoise * 0.1),                                   # <-- Color denoising strength
            templateWindowSize=7,                                        # <-- Template window size
            searchWindowSize=21                                          # <-- Search window size
        )
        img_array = denoised                                             # <-- Update working image
    
    # Step 2: Edge Detection and Enhancement
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)                  # <-- Convert to grayscale for edge detection
    
    # Detect edges using multiple methods for robustness
    edges_sobel = cv2.Sobel(gray, cv2.CV_64F, 1, 1, ksize=3)           # <-- Sobel edge detection
    edges_laplacian = cv2.Laplacian(gray, cv2.CV_64F, ksize=3)         # <-- Laplacian edge detection
    edges_canny = cv2.Canny(gray, 50, 150)                              # <-- Canny edge detection
    
    # Combine edge maps
    edges_combined = np.abs(edges_sobel) + np.abs(edges_laplacian)      # <-- Combine gradient methods
    edges_combined = np.clip(edges_combined, 0, 255).astype(np.uint8)   # <-- Normalize to 8-bit
    edges_combined = cv2.addWeighted(edges_combined, 0.7, edges_canny, 0.3, 0) # <-- Blend with Canny
    
    # Step 3: Adaptive Histogram Equalization for contrast
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))         # <-- Create CLAHE object
    gray_enhanced = clahe.apply(gray)                                    # <-- Apply adaptive histogram equalization
    
    # Step 4: Multi-scale sharpening
    sharpened = apply_multi_scale_sharpening(img_array, amount, radius) # <-- Apply custom sharpening
    
    # Step 5: Edge reinforcement
    edges_3channel = cv2.cvtColor(edges_combined, cv2.COLOR_GRAY2RGB)   # <-- Convert edges to RGB
    edge_strength = min(1.0, amount / 200.0)                            # <-- Calculate edge blend strength
    result = cv2.addWeighted(sharpened, 1.0, edges_3channel,            # <-- Blend edges with sharpened image
                             edge_strength * 0.15, 0)                    # <-- Use subtle edge reinforcement
    
    # Step 6: Final contrast and saturation boost
    result = boost_contrast_and_clarity(result, amount)                  # <-- Apply final enhancements
    
    return result                                                        # <-- Return enhanced image
# ---------------------------------------------------------------

# HELPER FUNCTION | Multi-Scale Sharpening
# ---------------------------------------------------------------
def apply_multi_scale_sharpening(img, amount, radius):
    """
    Apply sharpening at multiple scales for better detail preservation.
    Uses different kernel sizes to capture various detail levels.
    """
    
    # Define sharpening kernels of different strengths
    kernel_subtle = np.array([                                          # <-- Subtle sharpening kernel
        [0, -0.5, 0],
        [-0.5, 3, -0.5],
        [0, -0.5, 0]
    ])
    
    kernel_medium = np.array([                                          # <-- Medium sharpening kernel
        [-0.5, -1, -0.5],
        [-1, 7, -1],
        [-0.5, -1, -0.5]
    ])
    
    kernel_strong = np.array([                                          # <-- Strong sharpening kernel
        [-1, -1, -1],
        [-1, 9, -1],
        [-1, -1, -1]
    ])
    
    # Apply different kernels based on amount
    if amount < 150:                                                    # <-- Low sharpening amount
        kernel = kernel_subtle                                          # <-- Use subtle kernel
    elif amount < 300:                                                  # <-- Medium sharpening amount
        kernel = kernel_medium                                          # <-- Use medium kernel
    else:                                                               # <-- High sharpening amount
        kernel = kernel_strong                                          # <-- Use strong kernel
    
    # Scale kernel strength based on amount
    kernel_strength = amount / 200.0                                    # <-- Calculate kernel multiplier
    kernel = kernel * kernel_strength                                   # <-- Scale kernel values
    
    # Apply convolution
    sharpened = cv2.filter2D(img, -1, kernel)                          # <-- Apply sharpening kernel
    
    # Apply additional unsharp masking for fine details
    gaussian = cv2.GaussianBlur(img, (0, 0), radius)                   # <-- Create blur for unsharp mask
    unsharp_mask = cv2.addWeighted(img, 1.5, gaussian, -0.5, 0)        # <-- Apply unsharp mask
    
    # Blend the two sharpening methods
    result = cv2.addWeighted(sharpened, 0.6, unsharp_mask, 0.4, 0)     # <-- Combine sharpening methods
    
    return np.clip(result, 0, 255).astype(np.uint8)                    # <-- Return clipped result
# ---------------------------------------------------------------

# HELPER FUNCTION | Contrast and Clarity Enhancement
# ---------------------------------------------------------------
def boost_contrast_and_clarity(img, amount):
    """
    Final contrast and clarity boost specifically for line drawings.
    Enhances dark lines and brightens background.
    """
    
    # Convert to LAB color space for better contrast manipulation
    lab = cv2.cvtColor(img, cv2.COLOR_RGB2LAB)                          # <-- Convert to LAB color space
    l, a, b = cv2.split(lab)                                            # <-- Split into channels
    
    # Apply CLAHE to L channel
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))         # <-- Create CLAHE for contrast
    l = clahe.apply(l)                                                  # <-- Apply to lightness channel
    
    # Enhance contrast using curve adjustment
    contrast_strength = min(1.5, 1.0 + (amount / 400.0))               # <-- Calculate contrast multiplier
    l = np.clip(l * contrast_strength, 0, 255).astype(np.uint8)        # <-- Apply contrast boost
    
    # Merge channels and convert back
    lab = cv2.merge([l, a, b])                                          # <-- Merge LAB channels
    result = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)                       # <-- Convert back to RGB
    
    # Apply final sharpness boost using PIL for consistency
    pil_img = Image.fromarray(result)                                   # <-- Convert to PIL
    
    # Enhance contrast
    enhancer = ImageEnhance.Contrast(pil_img)                           # <-- Create contrast enhancer
    pil_img = enhancer.enhance(1.0 + (amount / 500.0))                  # <-- Apply contrast enhancement
    
    # Enhance sharpness
    enhancer = ImageEnhance.Sharpness(pil_img)                          # <-- Create sharpness enhancer
    pil_img = enhancer.enhance(1.0 + (amount / 300.0))                  # <-- Apply sharpness enhancement
    
    return np.array(pil_img)                                            # <-- Return as numpy array
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | ISO Paper Size Detection and Metadata Functions
# -----------------------------------------------------------------------------

# FUNCTION | Detect Nearest ISO Paper Size from PDF Dimensions
# ------------------------------------------------------------
def detect_iso_paper_size(width_mm, height_mm, tolerance_mm=30):
    """
    Detect the nearest ISO paper size based on PDF dimensions in millimeters.
    Returns the ISO size name and exact dimensions.
    
    Parameters:
    width_mm, height_mm: PDF dimensions in millimeters
    tolerance_mm: Allowed deviation from standard size (default 30mm for ~10% tolerance on A2)
    """
    
    # ISO A-series paper sizes in millimeters (width x height)
    iso_sizes = {
        "A0": (841, 1189),
        "A1": (594, 841),
        "A2": (420, 594),
        "A3": (297, 420),
        "A4": (210, 297),
        "A5": (148, 210),
        "A6": (105, 148),
    }
    
    # Normalize to portrait orientation for comparison
    pdf_width = min(width_mm, height_mm)                                     # <-- Smaller dimension
    pdf_height = max(width_mm, height_mm)                                    # <-- Larger dimension
    
    best_match = None                                                        # <-- Best matching size
    best_distance = float('inf')                                             # <-- Distance to best match
    
    for size_name, (std_width, std_height) in iso_sizes.items():            # <-- Check each standard size
        # Calculate distance from standard size
        width_diff = abs(pdf_width - std_width)                             # <-- Width difference
        height_diff = abs(pdf_height - std_height)                          # <-- Height difference
        total_distance = width_diff + height_diff                           # <-- Total distance
        
        if total_distance < best_distance:                                   # <-- Check if closer match
            best_distance = total_distance                                   # <-- Update best distance
            best_match = (size_name, std_width, std_height)                  # <-- Update best match
    
    # Check if match is within tolerance
    if best_match and best_distance <= tolerance_mm * 2:                    # <-- Within tolerance
        size_name, std_width, std_height = best_match                       # <-- Unpack best match
        
        # Determine if original was landscape
        is_landscape = width_mm > height_mm                                  # <-- Check orientation
        
        if is_landscape:                                                     # <-- Return in original orientation
            return size_name, std_height, std_width                         # <-- Landscape format
        else:
            return size_name, std_width, std_height                          # <-- Portrait format
    
    return None, width_mm, height_mm                                         # <-- No standard match found
# ---------------------------------------------------------------

# FUNCTION | Set PDF Page Size and MediaBox for Proper Printing
# ------------------------------------------------------------
def set_pdf_page_size_metadata(doc, log_fn):
    """
    Detect and set proper page size metadata AND MediaBox for all pages in PDF.
    This ensures printers recognize the correct paper size.
    CRITICAL: Sets both metadata AND adjusts MediaBox to exact standard sizes for printer recognition.
    """
    
    # Get existing metadata and use only standard PDF metadata keys
    metadata = doc.metadata or {}                                        # <-- Get current metadata safely
    
    detected_sizes = []                                                  # <-- Track detected sizes
    
    for page_num in range(doc.page_count):                               # <-- Process each page
        page = doc[page_num]                                             # <-- Get page object
        rect = page.rect                                                 # <-- Get page dimensions
        
        # Convert from points to millimeters (1 point = 0.352778 mm)
        width_mm = rect.width * 0.352778                                 # <-- Convert width to mm
        height_mm = rect.height * 0.352778                               # <-- Convert height to mm
        
        # Detect nearest ISO paper size with increased tolerance
        iso_size, target_width_mm, target_height_mm = detect_iso_paper_size(width_mm, height_mm, tolerance_mm=30) # <-- Use 30mm tolerance
        
        if iso_size:                                                     # <-- If standard size detected
            log_fn(f"Page {page_num + 1}: Detected {iso_size} paper size ({target_width_mm}x{target_height_mm}mm)")
            detected_sizes.append(f"Page{page_num + 1}:{iso_size}({target_width_mm}x{target_height_mm}mm)")
            
            # CRITICAL: Set the MediaBox to exact standard size for printer recognition
            # Convert standard size back to points (1 point = 0.352778 mm)
            standard_width_pts = target_width_mm / 0.352778              # <-- Convert to points
            standard_height_pts = target_height_mm / 0.352778            # <-- Convert to points
            
            # Create new rectangle with standard dimensions
            new_rect = fitz.Rect(0, 0, standard_width_pts, standard_height_pts)  # <-- Standard size rectangle
            
            # Update the page's MediaBox to standard size
            # This is what printers actually read to determine paper size
            page.set_mediabox(new_rect)                                  # <-- Set MediaBox to standard size
            
            log_fn(f"  - Set MediaBox to exact {iso_size} dimensions: {target_width_mm}x{target_height_mm}mm")
            
        else:                                                            # <-- Non-standard size
            log_fn(f"Page {page_num + 1}: Custom size ({width_mm:.1f}x{height_mm:.1f}mm) - no standard match")
            detected_sizes.append(f"Page{page_num + 1}:Custom({width_mm:.1f}x{height_mm:.1f}mm)")
    
    # Only set standard PDF metadata keys that are widely supported
    if detected_sizes:
        # Use the Subject field to store paper size information
        size_info = "; ".join(detected_sizes)                           # <-- Join all size info
        metadata["Subject"] = f"Enhanced PDF - Paper Sizes: {size_info}"  # <-- Set subject with size info
        metadata["Keywords"] = "Enhanced, Sharpened, Architectural Drawing" # <-- Add keywords
        
        try:
            doc.set_metadata(metadata)                                   # <-- Update document metadata
            log_fn("✓ Updated page size metadata for proper printing")  # <-- Log completion
        except Exception as e:
            log_fn(f"⚠ Warning: Could not set metadata ({str(e)}), but PDF will still be created") # <-- Log warning
    else:
        log_fn("✓ Page size detection completed (no metadata changes needed)") # <-- Log completion
# ---------------------------------------------------------------

# FUNCTION | Render PDF Page to Image for Processing
# ------------------------------------------------------------
def render_pdf_page_to_image(page, dpi=400):
    """
    Render a PDF page to a PIL Image for processing.
    This captures ALL content including vector graphics and text.
    """
    # Get the page as a pixmap (raster image)
    mat = fitz.Matrix(dpi/72, dpi/72)                                        # <-- Create scaling matrix
    pix = page.get_pixmap(matrix=mat, alpha=False)                          # <-- Render page to pixmap
    
    # Convert pixmap to PIL Image
    img_data = pix.tobytes("ppm")                                            # <-- Get image bytes
    img = Image.open(io.BytesIO(img_data))                                   # <-- Create PIL image
    
    return img                                                               # <-- Return rendered image
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | PDF Processing Utilities and Helper Functions
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Extract Image Placements from PDF Page
# ---------------------------------------------------------------
def page_image_items(page):
    """
    Extract list of image placements on the page with their xref and bounding box.
    Uses raw dictionary format to preserve per-placement rectangle data.
    Returns list of dictionaries with 'xref' and 'bbox' keys.
    """
    items = []                                                           # <-- Initialize items list
    raw = page.get_text("rawdict")                                       # <-- Get raw page content dictionary
    
    for block in raw.get("blocks", []):                                  # <-- Iterate through page blocks
        if block.get("type") == 1:                                       # <-- Check for image block type
            bbox = block.get("bbox")                                     # <-- Get bounding box coordinates
            img = block.get("image")                                     # <-- Get image reference
            
            if img is not None and bbox:                                 # <-- Validate image and bbox exist
                try:
                    # Parse xref integer from various formats
                    if isinstance(img, str) and img.startswith("xref"):  # <-- Handle string xref format
                        xref = int(img.split()[-1])                      # <-- Extract numeric xref
                    elif isinstance(img, int):                           # <-- Handle direct integer xref
                        xref = img                                       # <-- Use xref as-is
                    else:
                        xref = None                                      # <-- Set null for invalid format
                except Exception:
                    xref = None                                          # <-- Handle parsing errors
                
                if xref:                                                 # <-- Add valid items to list
                    items.append({"xref": xref, "bbox": bbox})          # <-- Append xref and bbox data
    
    return items                                                         # <-- Return extracted items list
# ---------------------------------------------------------------

# HELPER FUNCTION | Generate Transparent 1x1 PNG Bytes
# ---------------------------------------------------------------
def transparent_1x1_png_bytes():
    """Generate minimal transparent PNG for image neutralization."""
    b = io.BytesIO()                                                     # <-- Create bytes buffer
    Image.new("RGBA", (1, 1), (0, 0, 0, 0)).save(b, format="PNG")      # <-- Create and save transparent image
    return b.getvalue()                                                  # <-- Return PNG bytes
# ---------------------------------------------------------------

# HELPER FUNCTION | Convert PIL Image to Format Bytes
# ---------------------------------------------------------------
def pil_to_format_bytes(img, desired_ext="png", jpeg_quality=95):
    """
    Convert PIL image to bytes with stable encoder settings.
    Supports PNG (lossless) and JPEG (high quality with optimized settings).
    """
    b = io.BytesIO()                                                     # <-- Create bytes buffer
    
    if desired_ext.lower() in ("jpg", "jpeg"):                          # <-- Handle JPEG format
        img = img.convert("RGB")                                         # <-- Ensure RGB color mode
        img.save(b, format="JPEG",                                       # <-- Save as JPEG with settings
            quality=jpeg_quality,                                        # <-- High quality setting
            optimize=True,                                               # <-- Enable optimization
            progressive=True,                                            # <-- Progressive encoding
            subsampling=0                                                # <-- Disable subsampling for clarity
        )
    else:                                                                # <-- Handle PNG format (default)
        img.save(b, format="PNG", optimize=True)                        # <-- Save as optimized PNG
    
    return b.getvalue()                                                  # <-- Return image bytes
# ---------------------------------------------------------------

# FUNCTION | Build Composite Background Image from Page Placements
# ------------------------------------------------------------
def build_composite_background(doc, page, placements, dpi, sharpen_params, log_fn, return_original=False):
    """
    Create unified composite background image for a page from all raster placements.
    Applies sharpening to each image and composites them onto a white canvas.
    Returns PIL image ready for insertion as page background.
    If return_original is True, also returns the original unsharpened version.
    """
    page_rect = page.rect                                                # <-- Get page dimensions in points
    px_w = max(1, int(page_rect.width * dpi / 72.0))                     # <-- Calculate pixel width from DPI
    px_h = max(1, int(page_rect.height * dpi / 72.0))                    # <-- Calculate pixel height from DPI

    canvas = Image.new("RGB", (px_w, px_h), (255, 255, 255))            # <-- Create white background canvas
    original_canvas = Image.new("RGB", (px_w, px_h), (255, 255, 255)) if return_original else None  # <-- Create original canvas if needed

    # SUB HELPER FUNCTION | Convert PDF Coordinates to Pixel Coordinates
    # ---------------------------------------------------------------
    def to_px(rect):
        """Convert PDF point coordinates to pixel coordinates with origin transform."""
        x0, y0, x1, y1 = rect                                           # <-- Unpack rectangle coordinates
        left = int(x0 * dpi / 72.0)                                     # <-- Convert left edge to pixels
        right = int(x1 * dpi / 72.0)                                    # <-- Convert right edge to pixels
        # PDF y grows upwards, raster origin is top-left - transform coordinates
        top = int((page_rect.height - y1) * dpi / 72.0)                 # <-- Convert top edge with Y-flip
        bottom = int((page_rect.height - y0) * dpi / 72.0)              # <-- Convert bottom edge with Y-flip
        return left, top, right, bottom                                  # <-- Return pixel coordinates
    # ---------------------------------------------------------------

    cache = {}                                                           # <-- Image cache to avoid re-extraction

    for i, item in enumerate(placements, 1):                            # <-- Process each image placement
        xref = item["xref"]                                              # <-- Get image reference ID
        bbox = item["bbox"]                                              # <-- Get bounding box coordinates

        try:
            # Extract and cache image if not already cached
            if xref not in cache:                                        # <-- Check if image needs extraction
                ext = doc.extract_image(xref)                            # <-- Extract image from PDF
                pil = Image.open(io.BytesIO(ext["image"]))               # <-- Open as PIL image
                pil = ImageOps.exif_transpose(pil)                       # <-- Respect EXIF orientation
                cache[xref] = pil                                        # <-- Cache for reuse
            
            pil_original = cache[xref]                                   # <-- Get cached image

            # Calculate target dimensions and position
            l, t, r, b = to_px(bbox)                                     # <-- Convert to pixel coordinates
            target_w = max(1, r - l)                                     # <-- Calculate target width
            target_h = max(1, b - t)                                     # <-- Calculate target height

            # Create original composite if needed
            if original_canvas is not None:                              # <-- Check if original canvas exists
                orig_img = pil_original.copy()                           # <-- Copy original image
                orig_img = orig_img.convert("RGB")                       # <-- Ensure RGB format
                orig_img = orig_img.resize((target_w, target_h), Image.LANCZOS) # <-- High quality resize
                original_canvas.paste(orig_img, (l, t))                 # <-- Paste onto original canvas

            # Process image copy with sharpening
            pil_img = pil_original.copy()                                # <-- Create defensive copy
            pil_img = smart_sharpen_pil(                                 # <-- Apply smart sharpening
                pil_img,
                amount_percent=sharpen_params["amount"],                 # <-- Use configured amount
                radius=sharpen_params["radius"],                         # <-- Use configured radius
                reduce_noise_percent=sharpen_params["reduce_noise"],     # <-- Use configured noise reduction
            )
            
            # Resize and composite onto canvas
            pil_img = pil_img.convert("RGB")                             # <-- Ensure RGB format
            pil_img = pil_img.resize((target_w, target_h), Image.LANCZOS) # <-- High quality resize
            canvas.paste(pil_img, (l, t))                               # <-- Paste onto canvas at position
            
        except Exception as e:
            log_fn(f"- Skipped image xref {xref} due to error: {e}")    # <-- Log processing errors

    if return_original and original_canvas:                             # <-- Check if both canvases requested
        return canvas, original_canvas                                   # <-- Return both canvases
    return canvas                                                        # <-- Return composite background
# ---------------------------------------------------------------


# SUB FUNCTION | Replace Embedded Images In-Place with Sharpening
# ---------------------------------------------------------------
def replace_embedded_images_in_place(doc, placements, sharpen_params, log_fn):
    """
    Alternative processing mode - replace each embedded image with sharpened version.
    Maintains original draw order and text positioning without flattening.
    Preserves original image format when possible for optimal compatibility.
    """
    done = set()                                                         # <-- Track processed xrefs
    
    for item in placements:                                              # <-- Process each image placement
        xref = item["xref"]                                              # <-- Get image reference ID
        if xref in done:                                                 # <-- Skip if already processed
            continue                                                     # <-- Move to next item
        
        try:
            # Extract and process image
            info = doc.extract_image(xref)                               # <-- Extract image information
            ext = info.get("ext", "png").lower()                        # <-- Get original format extension
            im = Image.open(io.BytesIO(info["image"]))                   # <-- Open as PIL image
            im = ImageOps.exif_transpose(im)                             # <-- Respect EXIF orientation
            
            # Apply sharpening with configured parameters
            im = smart_sharpen_pil(                                      # <-- Apply smart sharpening
                im,
                amount_percent=sharpen_params["amount"],                 # <-- Use configured amount
                radius=sharpen_params["radius"],                         # <-- Use configured radius
                reduce_noise_percent=sharpen_params["reduce_noise"],     # <-- Use configured noise reduction
            )
            
            # Convert to bytes and update stream
            desired_format = "jpeg" if ext in ("jpg", "jpeg") else "png" # <-- Choose output format
            data = pil_to_format_bytes(im, desired_ext=desired_format)   # <-- Convert to bytes
            doc.update_stream(xref, data)                                # <-- Update image stream in PDF
            done.add(xref)                                               # <-- Mark as processed
            
        except Exception as e:
            log_fn(f"- Failed to replace image xref {xref}: {e}")       # <-- Log processing errors
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | PDF Processing Main Worker Function
# -----------------------------------------------------------------------------

# FUNCTION | Process PDF File with Smart Sharpening Enhancement
# ------------------------------------------------------------
def process_pdf(
    input_path,
    output_dir,
    dpi=300,
    flatten=True,
    export_pdf=True,
    export_jpg=False,
    sharpen_amount=200,
    sharpen_radius=2.0,
    reduce_noise=50,
    preview_mode=False,
    log_fn=lambda s: None,
):
    """
    Main processing function for PDF image enhancement with smart sharpening.
    Supports both flattened composite backgrounds and in-place image replacement.
    Returns processing results including output paths and page count.
    Preview mode processes only the first page for quick testing.
    """
    basename = os.path.splitext(os.path.basename(input_path))[0]         # <-- Extract base filename
    out_pdf_path = os.path.join(output_dir, f"{basename}__enhanced.pdf") # <-- Build output PDF path

    # Configure sharpening parameters dictionary
    sharpen_params = {                                                   # <-- Package sharpening settings
        "amount": float(sharpen_amount),                                 # <-- Sharpening amount percentage
        "radius": float(sharpen_radius),                                 # <-- Sharpening radius in pixels
        "reduce_noise": float(reduce_noise),                             # <-- Noise reduction percentage
    }

    # Open source PDF and create new document for output
    src = fitz.open(input_path)                                          # <-- Open source PDF document
    doc = fitz.open()                                                    # <-- Create new empty document

    pages_processed = 0                                                  # <-- Initialize page counter
    bg_jpg_paths = []                                                    # <-- Initialize JPG output paths list
    comparison_paths = []                                                # <-- Initialize comparison image paths

    # Determine page range based on preview mode
    page_range = range(1 if preview_mode else src.page_count)           # <-- Process first page only in preview mode
    
    if preview_mode:                                                     # <-- Log preview mode
        log_fn("PREVIEW MODE: Processing first page only for quick testing") # <-- Preview mode notification

    # Process each page in the document
    for page_index in page_range:                                        # <-- Iterate through page range
        src_page = src[page_index]                                       # <-- Get source page object
        placements = page_image_items(src_page)                          # <-- Extract image placements

        log_fn(f"Page {page_index + 1}: Processing page content...")    # <-- Log processing status
        
        # CRITICAL FIX: Process ALL pages, not just those with embedded images
        if placements:
            log_fn(f"- Found {len(placements)} embedded image placements")  # <-- Log embedded images
        else:
            log_fn(f"- No embedded images found, will render entire page for processing") # <-- Log page rendering
        log_fn(f"- Applying sharpening: Amount={sharpen_params['amount']}%, Radius={sharpen_params['radius']}px, Denoise={sharpen_params['reduce_noise']}%")

        if flatten:                                                      # <-- Handle flattened composite mode
            # CRITICAL FIX: Completely reconstruct the page with flattened image
            if placements:
                # Build unified sharpened background image (with original if JPG export enabled)
                if export_jpg:                                               # <-- Create comparison if JPG export enabled
                    bg, orig = build_composite_background(src, src_page, placements, dpi, sharpen_params, log_fn, return_original=True) # <-- Get both versions
                else:
                    bg = build_composite_background(src, src_page, placements, dpi, sharpen_params, log_fn) # <-- Create composite only
            else:
                # No embedded images - render entire page and process it
                log_fn(f"- Rendering entire page at {dpi} DPI for processing")
                original_img = render_pdf_page_to_image(src_page, dpi)       # <-- Render page to image
                
                if export_jpg:                                           # <-- Create comparison if requested
                    orig = original_img.copy()                           # <-- Keep original for comparison
                    bg = smart_sharpen_pil(                              # <-- Apply sharpening to rendered page
                        original_img,
                        amount_percent=sharpen_params["amount"],
                        radius=sharpen_params["radius"],
                        reduce_noise_percent=sharpen_params["reduce_noise"]
                    )
                else:
                    bg = smart_sharpen_pil(                              # <-- Apply sharpening to rendered page
                        original_img,
                        amount_percent=sharpen_params["amount"],
                        radius=sharpen_params["radius"],
                        reduce_noise_percent=sharpen_params["reduce_noise"]
                    )
                
            # Create comparison images if requested
            if export_jpg:                                               # <-- Create comparison if JPG export enabled
                
                # Create side-by-side comparison image
                comparison_width = bg.width * 2 + 20                     # <-- Calculate comparison image width
                comparison = Image.new("RGB", (comparison_width, bg.height), (255, 255, 255)) # <-- Create comparison canvas
                comparison.paste(orig, (0, 0))                           # <-- Paste original on left
                comparison.paste(bg, (bg.width + 20, 0))                 # <-- Paste enhanced on right
                
                # Add labels to comparison
                draw = ImageDraw.Draw(comparison)                        # <-- Create drawing context
                try:
                    font = ImageFont.truetype("arial.ttf", 30)           # <-- Try to load font
                except:
                    font = ImageFont.load_default()                      # <-- Use default if font not found
                
                draw.text((10, 10), "ORIGINAL", fill=(255, 0, 0), font=font) # <-- Label original side
                draw.text((bg.width + 30, 10), "ENHANCED", fill=(0, 128, 0), font=font) # <-- Label enhanced side
                
                # Save comparison image
                comparison_name = f"{basename}__p{page_index + 1:03d}__comparison.jpg" # <-- Build comparison filename
                comparison_path = os.path.join(output_dir, comparison_name) # <-- Build full path
                comparison.save(comparison_path, format="JPEG",          # <-- Save comparison image
                    quality=95, optimize=True, progressive=True)
                comparison_paths.append(comparison_path)                 # <-- Add to comparison paths list
                
                # Also save individual enhanced background
                jpg_name = f"{basename}__p{page_index + 1:03d}__enhanced.jpg" # <-- Build JPG filename
                jpg_path = os.path.join(output_dir, jpg_name)            # <-- Build full JPG path
                bg.save(jpg_path, format="JPEG",                         # <-- Save enhanced as JPG
                    quality=95, optimize=True, 
                    progressive=True, subsampling=0
                )
                bg_jpg_paths.append(jpg_path)                            # <-- Add to output paths list
                
                log_fn(f"- Created comparison image showing before/after effects")

            # CRITICAL FIX: Create a completely new page with just the flattened image
            rect = src_page.rect                                         # <-- Get page rectangle
            
            # Detect if this should be a standard size and create page accordingly
            width_mm = rect.width * 0.352778                             # <-- Convert width to mm
            height_mm = rect.height * 0.352778                           # <-- Convert height to mm
            iso_size, target_width_mm, target_height_mm = detect_iso_paper_size(width_mm, height_mm, tolerance_mm=30) # <-- Detect size
            
            if iso_size:                                                 # <-- If standard size detected
                # Use exact standard dimensions for new page
                standard_width_pts = target_width_mm / 0.352778          # <-- Convert to points
                standard_height_pts = target_height_mm / 0.352778        # <-- Convert to points
                new_page = doc.new_page(width=standard_width_pts, height=standard_height_pts) # <-- Create with standard size
                log_fn(f"- Creating new page with exact {iso_size} dimensions ({target_width_mm}x{target_height_mm}mm)")
            else:                                                        # <-- Non-standard size
                new_page = doc.new_page(width=rect.width, height=rect.height) # <-- Create with original dimensions
                log_fn(f"- Creating new page with original dimensions ({width_mm:.1f}x{height_mm:.1f}mm)")
            
            # Insert the flattened, sharpened image as the only content
            bg_bytes = pil_to_format_bytes(bg, desired_ext="jpeg", jpeg_quality=95) # <-- Convert to bytes
            new_page.insert_image(rect, stream=bg_bytes,                 # <-- Insert flattened image
                keep_proportion=False, overlay=True)                     # <-- Fill entire page
            
            # Extract and re-add text if present (preserves searchability)
            text_blocks = src_page.get_text("dict")                      # <-- Get text blocks
            if text_blocks and text_blocks.get("blocks"):                # <-- Check if text exists
                for block in text_blocks["blocks"]:                      # <-- Process each text block
                    if block.get("type") == 0:                           # <-- Check for text block type
                        for line in block.get("lines", []):              # <-- Process each line
                            for span in line.get("spans", []):           # <-- Process each span
                                text = span.get("text", "")              # <-- Get text content
                                if text.strip():                          # <-- Skip empty text
                                    # Re-insert text at original position
                                    origin = fitz.Point(span["bbox"][0], span["bbox"][1]) # <-- Get text position
                                    try:
                                        fontname = span.get("font", "helv") # <-- Get font name
                                        fontsize = span.get("size", 11)  # <-- Get font size
                                        new_page.insert_text(origin, text, # <-- Insert text
                                            fontname=fontname,
                                            fontsize=fontsize)
                                    except:
                                        pass                              # <-- Ignore text insertion errors
            
            log_fn(f"- Created new page with flattened, sharpened image")
            
        else:
            # In-place replacement mode - copy page and modify images
            doc.insert_pdf(src, from_page=page_index, to_page=page_index) # <-- Copy page to new document
            new_page = doc[pages_processed]                              # <-- Get the newly added page
            
            if placements:
                # Replace each embedded image in-place with sharpened version
                replace_embedded_images_in_place(doc, placements, sharpen_params, log_fn) # <-- In-place replacement
                log_fn(f"- Enhanced {len(placements)} embedded images in-place")
            else:
                # For pages without embedded images, this mode cannot enhance content
                log_fn(f"- WARNING: In-place mode cannot enhance pages without embedded images")
                log_fn(f"- Consider using 'Flatten' mode for vector content enhancement")

        pages_processed += 1                                             # <-- Increment processed page count

    # Close source document
    src.close()                                                          # <-- Close source document

    # FINAL STEP: Set ISO paper size metadata for proper printing
    log_fn("\nSetting ISO paper size metadata for proper printing...")
    try:
        set_pdf_page_size_metadata(doc, log_fn)                         # <-- Set paper size metadata
    except Exception as e:
        log_fn(f"⚠ Warning: Metadata setting failed ({str(e)}), continuing with PDF save") # <-- Log warning but continue
    
    # Save output files
    if export_pdf:                                                       # <-- Check PDF export option
        if doc.page_count == 0:                                          # <-- Validate document has pages
            raise RuntimeError("Cannot save PDF with zero pages")       # <-- Raise error for empty document
        doc.save(out_pdf_path, deflate=True, garbage=4, clean=True)     # <-- Save optimized PDF
    
    doc.close()                                                          # <-- Close document to free resources

    return {                                                             # <-- Return processing results
        "pdf_path": out_pdf_path if export_pdf else None,               # <-- PDF output path or None
        "jpg_paths": bg_jpg_paths if export_jpg else [],                # <-- JPG output paths list
        "comparison_paths": comparison_paths,                           # <-- Comparison image paths list
        "pages": pages_processed,                                        # <-- Number of pages processed
    }
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Tkinter User Interface Application Class
# -----------------------------------------------------------------------------

# CLASS | PDF Image Sharpener Application with Enhanced UI
# ------------------------------------------------------------
class App(tk.Tk):
    """
    Main application class for PDF Image Sharpener with text preservation.
    Provides comprehensive UI for file selection, processing options, and logging.
    """
    
    def __init__(self):
        super().__init__()                                               # <-- Initialize parent Tkinter class
        self.title("PDF Image Sharpener v1.4.1 - Enhanced A2 Printer Recognition")  # <-- Set application window title
        self.geometry("920x640")                                         # <-- Set window dimensions
        set_window_icon(self)                                            # <-- Apply custom window icon

        # Initialize application state variables
        self.paths = []                                                  # <-- List of selected PDF file paths
        self.output_dir = None                                           # <-- Output directory for processed files

        self.create_widgets()                                            # <-- Build user interface components
    # ---------------------------------------------------------------

    # SUB FUNCTION | Create Main User Interface Widget Layout
    # ---------------------------------------------------------------
    def create_widgets(self):
        """Build comprehensive UI layout with file selection, options, and logging."""
        frm = ttk.Frame(self, padding=10)                                # <-- Create main container frame
        frm.pack(fill="both", expand=True)                               # <-- Pack with full expansion

        # File selection toolbar section
        top = ttk.Frame(frm)                                             # <-- Create top toolbar frame
        top.pack(fill="x")                                               # <-- Pack horizontally
        ttk.Button(top, text="Select PDF Files",                        # <-- PDF file selection button
            command=self.select_files).pack(side="left")                # <-- Pack to left side
        ttk.Button(top, text="Choose Output Folder",                    # <-- Output folder selection button
            command=self.choose_output).pack(side="left", padx=10)      # <-- Pack with padding
        self.out_lbl_var = tk.StringVar(value="Output: not chosen")     # <-- Output directory status variable
        ttk.Label(top, textvariable=self.out_lbl_var).pack(             # <-- Output status label
            side="left", padx=10)                                        # <-- Pack with padding

        # File list display section with scrollbar
        mid = ttk.Frame(frm)                                             # <-- Create middle section frame
        mid.pack(fill="both", expand=True, pady=(8, 8))                  # <-- Pack with vertical padding
        self.listbox = tk.Listbox(mid, height=8, selectmode="extended") # <-- File list display
        self.listbox.pack(side="left", fill="both", expand=True)        # <-- Pack with expansion
        sb = ttk.Scrollbar(mid, orient="vertical",                      # <-- Vertical scrollbar
            command=self.listbox.yview)                                  # <-- Link to listbox
        sb.pack(side="left", fill="y")                                   # <-- Pack to fill vertically
        self.listbox.configure(yscrollcommand=sb.set)                   # <-- Configure scrollbar connection

        # Preset configurations section
        presets_frame = ttk.Labelframe(frm, text="Enhancement Presets")  # <-- Presets container frame
        presets_frame.pack(fill="x", pady=(6, 6))                        # <-- Pack with vertical padding
        
        preset_buttons = ttk.Frame(presets_frame)                       # <-- Preset buttons container
        preset_buttons.pack(pady=8)                                      # <-- Pack with padding
        
        ttk.Button(preset_buttons, text="Badly Scanned Drawing",        # <-- Preset for poor scans
            command=self.apply_badly_scanned_preset).pack(side="left", padx=4)
        ttk.Button(preset_buttons, text="Faded Blueprint",              # <-- Preset for blueprints
            command=self.apply_blueprint_preset).pack(side="left", padx=4)
        ttk.Button(preset_buttons, text="Technical Line Drawing",       # <-- Preset for technical drawings
            command=self.apply_technical_preset).pack(side="left", padx=4)
        ttk.Button(preset_buttons, text="High Quality Scan",            # <-- Preset for good scans
            command=self.apply_high_quality_preset).pack(side="left", padx=4)
        ttk.Button(preset_buttons, text="Default Settings",             # <-- Default standard settings
            command=self.apply_default_preset).pack(side="left", padx=4)

        # Processing options configuration section
        opts = ttk.Labelframe(frm, text="Processing Options")           # <-- Options container frame
        opts.pack(fill="x", pady=(6, 6))                                # <-- Pack with vertical padding

        # Left column - processing mode options
        left = ttk.Frame(opts)                                           # <-- Left options column
        left.pack(side="left", fill="x", expand=True,                   # <-- Pack with expansion
            padx=(8, 4), pady=6)                                        # <-- Add padding

        self.flatten_var = tk.BooleanVar(value=True)                     # <-- Flatten mode toggle variable
        ttk.Checkbutton(left,                                           # <-- Flatten images checkbox
            text="Flatten page images to a single background (preferred)",
            variable=self.flatten_var).pack(anchor="w")                  # <-- Pack left-aligned
        
        self.export_pdf_var = tk.BooleanVar(value=True)                  # <-- PDF export toggle variable
        ttk.Checkbutton(left, text="Export enhanced PDF (default)",     # <-- PDF export checkbox
            variable=self.export_pdf_var).pack(anchor="w")              # <-- Pack left-aligned
        
        self.export_jpg_var = tk.BooleanVar(value=True)                  # <-- JPG export toggle variable (changed default)
        ttk.Checkbutton(left, text="Export comparison JPGs (before/after)", # <-- JPG export checkbox with better description
            variable=self.export_jpg_var).pack(anchor="w")              # <-- Pack left-aligned
        
        self.preview_mode_var = tk.BooleanVar(value=False)               # <-- Preview mode toggle variable
        ttk.Checkbutton(left, text="Preview mode (process first page only)", # <-- Preview mode checkbox
            variable=self.preview_mode_var).pack(anchor="w")             # <-- Pack left-aligned

        # Right column - sharpening parameter controls
        right = ttk.Frame(opts)                                          # <-- Right options column
        right.pack(side="left", fill="x", expand=True,                  # <-- Pack with expansion
            padx=(4, 8), pady=6)                                        # <-- Add padding

        # Background DPI setting
        ttk.Label(right, text="Background DPI").grid(                   # <-- DPI label
            row=0, column=0, sticky="w")                                 # <-- Grid position left-aligned
        self.dpi_var = tk.IntVar(value=600)                              # <-- DPI value variable (default from image)
        ttk.Spinbox(right, from_=120, to=600, increment=30,             # <-- DPI spinbox control
            width=8, textvariable=self.dpi_var).grid(                   # <-- Configure range and width
            row=0, column=1, sticky="w")                                 # <-- Grid position left-aligned

        # Sharpening amount percentage
        ttk.Label(right, text="Sharpen Amount %").grid(                 # <-- Amount label
            row=1, column=0, sticky="w")                                 # <-- Grid position left-aligned
        self.amount_var = tk.IntVar(value=200)                           # <-- Amount value variable (default from image)
        ttk.Spinbox(right, from_=0, to=500, increment=10,               # <-- Amount spinbox control
            width=8, textvariable=self.amount_var).grid(                # <-- Configure range and width
            row=1, column=1, sticky="w")                                 # <-- Grid position left-aligned

        # Sharpening radius in pixels
        ttk.Label(right, text="Radius px").grid(                        # <-- Radius label
            row=2, column=0, sticky="w")                                 # <-- Grid position left-aligned
        self.radius_var = tk.DoubleVar(value=3.0)                        # <-- Radius value variable (default from image)
        ttk.Spinbox(right, from_=0.3, to=5.0, increment=0.1,           # <-- Radius spinbox control
            width=8, textvariable=self.radius_var).grid(                # <-- Configure range and width
            row=2, column=1, sticky="w")                                 # <-- Grid position left-aligned

        # Noise reduction percentage
        ttk.Label(right, text="Reduce Noise %").grid(                   # <-- Noise reduction label
            row=3, column=0, sticky="w")                                 # <-- Grid position left-aligned
        self.noise_var = tk.IntVar(value=30)                             # <-- Noise reduction variable (default from image)
        ttk.Spinbox(right, from_=0, to=100, increment=5,                # <-- Noise reduction spinbox
            width=8, textvariable=self.noise_var).grid(                 # <-- Configure range and width
            row=3, column=1, sticky="w")                                 # <-- Grid position left-aligned

        # Action buttons section
        run = ttk.Frame(frm)                                             # <-- Action buttons container
        run.pack(fill="x")                                               # <-- Pack horizontally
        ttk.Button(run, text="Run Processing",                          # <-- Main processing button
            command=self.run).pack(side="left")                         # <-- Pack to left
        ttk.Button(run, text="Clear File List",                         # <-- Clear list button
            command=self.clear_list).pack(side="left", padx=8)          # <-- Pack with padding

        # Processing log display section
        logf = ttk.Labelframe(frm, text="Processing Log")                # <-- Log container frame
        logf.pack(fill="both", expand=True)                              # <-- Pack with expansion
        self.log = tk.Text(logf, height=12)                              # <-- Log text display widget
        self.log.pack(fill="both", expand=True)                          # <-- Pack with full expansion
    # ---------------------------------------------------------------
    
    # HELPER FUNCTION | Apply Badly Scanned Drawing Preset
    # ---------------------------------------------------------------
    def apply_badly_scanned_preset(self):
        """Apply aggressive settings for poorly scanned architectural drawings."""
        self.dpi_var.set(400)                                            # <-- High DPI for detail capture
        self.amount_var.set(450)                                         # <-- Very high sharpening amount
        self.radius_var.set(3.0)                                         # <-- Larger radius for broader effect
        self.noise_var.set(20)                                           # <-- Low noise reduction to preserve detail
        self.logln("Applied preset: Badly Scanned Drawing (Maximum Enhancement)")
    # ---------------------------------------------------------------
    
    # HELPER FUNCTION | Apply Faded Blueprint Preset
    # ---------------------------------------------------------------
    def apply_blueprint_preset(self):
        """Apply settings optimized for faded or low-contrast blueprints."""
        self.dpi_var.set(400)                                            # <-- High DPI for clarity
        self.amount_var.set(400)                                         # <-- High sharpening for faded lines
        self.radius_var.set(2.5)                                         # <-- Medium radius
        self.noise_var.set(35)                                           # <-- Moderate noise reduction
        self.logln("Applied preset: Faded Blueprint (High Contrast Enhancement)")
    # ---------------------------------------------------------------
    
    # HELPER FUNCTION | Apply Technical Line Drawing Preset
    # ---------------------------------------------------------------
    def apply_technical_preset(self):
        """Apply settings for technical line drawings and CAD prints."""
        self.dpi_var.set(400)                                            # <-- High DPI for precision
        self.amount_var.set(350)                                         # <-- Strong sharpening
        self.radius_var.set(2.0)                                         # <-- Standard radius
        self.noise_var.set(30)                                           # <-- Balanced noise reduction
        self.logln("Applied preset: Technical Line Drawing (Balanced Enhancement)")
    # ---------------------------------------------------------------
    
    # HELPER FUNCTION | Apply High Quality Scan Preset
    # ---------------------------------------------------------------
    def apply_high_quality_preset(self):
        """Apply subtle enhancement for already good quality scans."""
        self.dpi_var.set(300)                                            # <-- Standard DPI
        self.amount_var.set(200)                                         # <-- Moderate sharpening
        self.radius_var.set(1.5)                                         # <-- Small radius
        self.noise_var.set(50)                                           # <-- Higher noise reduction
        self.logln("Applied preset: High Quality Scan (Subtle Enhancement)")
    # ---------------------------------------------------------------
    
    # HELPER FUNCTION | Apply Default Standard Preset
    # ---------------------------------------------------------------
    def apply_default_preset(self):
        """Apply default standard settings for general drawing enhancement."""
        self.dpi_var.set(600)                                            # <-- High DPI for detail
        self.amount_var.set(200)                                         # <-- Standard sharpening amount
        self.radius_var.set(3.0)                                         # <-- Standard radius
        self.noise_var.set(30)                                           # <-- Standard noise reduction
        self.logln("Applied preset: Default Settings (Standard Enhancement)")
    # ---------------------------------------------------------------

    # SUB FUNCTION | Handle PDF File Selection Dialog
    # ---------------------------------------------------------------
    def select_files(self):
        """Open file dialog for PDF selection and add to processing list."""
        paths = filedialog.askopenfilenames(                            # <-- Open multi-file selection dialog
            title="Select PDF Files for Processing",                    # <-- Dialog title
            filetypes=[("PDF files", "*.pdf")],                         # <-- Restrict to PDF files only
        )
        if not paths:                                                    # <-- Handle dialog cancellation
            return                                                       # <-- Exit if no files selected
        
        for p in paths:                                                  # <-- Process each selected file
            if p not in self.paths:                                      # <-- Avoid duplicate entries
                self.paths.append(p)                                     # <-- Add to internal paths list
                self.listbox.insert("end", p)                           # <-- Add to display listbox
    # ---------------------------------------------------------------

    # SUB FUNCTION | Handle Output Directory Selection
    # ---------------------------------------------------------------
    def choose_output(self):
        """Open directory dialog for output folder selection."""
        d = filedialog.askdirectory(title="Choose Output Folder")       # <-- Open directory selection dialog
        if d:                                                            # <-- Check if directory was selected
            self.output_dir = d                                          # <-- Store selected directory
            self.out_lbl_var.set(f"Output: {d}")                        # <-- Update status label
    # ---------------------------------------------------------------

    # SUB FUNCTION | Clear File Selection List
    # ---------------------------------------------------------------
    def clear_list(self):
        """Clear all selected files from processing list."""
        self.paths = []                                                  # <-- Clear internal paths list
        self.listbox.delete(0, "end")                                    # <-- Clear display listbox
    # ---------------------------------------------------------------

    # HELPER FUNCTION | Log Message with Auto-Scroll
    # ---------------------------------------------------------------
    def logln(self, text):
        """Add message to processing log with automatic scrolling."""
        self.log.insert("end", text + "\n")                             # <-- Insert text with newline
        self.log.see("end")                                              # <-- Scroll to bottom
        self.update_idletasks()                                          # <-- Update UI immediately
    # ---------------------------------------------------------------

    # FUNCTION | Execute PDF Processing with User Configuration
    # ------------------------------------------------------------
    def run(self):
        """Main processing execution with comprehensive validation and error handling."""
        # Validate file selection
        if not self.paths:                                               # <-- Check if files are selected
            messagebox.showwarning("No Files Selected",                 # <-- Show warning dialog
                "Please select at least one PDF file for processing.")  # <-- Warning message
            return                                                       # <-- Exit if no files

        # Set default output directory if not chosen
        if not self.output_dir:                                          # <-- Check if output directory set
            self.output_dir = os.path.dirname(self.paths[0])             # <-- Use first file's directory
            self.out_lbl_var.set(f"Output: {self.output_dir}")          # <-- Update status display

        # Extract processing parameters from UI controls
        dpi = int(self.dpi_var.get())                                    # <-- Get DPI setting
        amount = int(self.amount_var.get())                              # <-- Get sharpening amount
        radius = float(self.radius_var.get())                           # <-- Get sharpening radius
        noise = int(self.noise_var.get())                               # <-- Get noise reduction setting

        # Extract export options
        flatten = bool(self.flatten_var.get())                           # <-- Get flatten mode setting
        export_pdf = bool(self.export_pdf_var.get())                     # <-- Get PDF export setting
        export_jpg = bool(self.export_jpg_var.get())                     # <-- Get JPG export setting
        preview_mode = bool(self.preview_mode_var.get())                 # <-- Get preview mode setting

        # Validate export options
        if not export_pdf and not export_jpg:                           # <-- Check if any output selected
            messagebox.showwarning("No Output Format Selected",         # <-- Show warning dialog
                "Please select at least one output format (PDF or JPG).") # <-- Warning message
            return                                                       # <-- Exit if no output format

        # Clear log and begin processing
        self.log.delete("1.0", "end")                                    # <-- Clear previous log entries
        self.logln(f"Starting processing of {len(self.paths)} PDF file(s)...") # <-- Log processing start
        self.logln(f"Settings: Sharpen={amount}%, Radius={radius}px, Denoise={noise}%, DPI={dpi}")

        # Process each selected PDF file
        for path in self.paths:                                          # <-- Iterate through selected files
            self.logln(f"\nProcessing: {Path(path).name}")              # <-- Log current file name
            try:
                # Execute PDF processing with current settings
                result = process_pdf(                                    # <-- Call main processing function
                    input_path=path,                                     # <-- Input file path
                    output_dir=self.output_dir,                          # <-- Output directory
                    dpi=dpi,                                             # <-- Background DPI setting
                    flatten=flatten,                                     # <-- Flatten mode setting
                    export_pdf=export_pdf,                               # <-- PDF export option
                    export_jpg=export_jpg,                               # <-- JPG export option
                    sharpen_amount=amount,                               # <-- Sharpening amount
                    sharpen_radius=radius,                               # <-- Sharpening radius
                    reduce_noise=noise,                                  # <-- Noise reduction
                    preview_mode=preview_mode,                           # <-- Preview mode setting
                    log_fn=self.logln,                                   # <-- Log callback function
                )
                
                # Report processing results
                if result["pdf_path"]:                                   # <-- Check if PDF was created
                    self.logln(f"✓ Enhanced PDF saved: {Path(result['pdf_path']).name}") # <-- Log PDF success
                if result["jpg_paths"]:                                  # <-- Check if JPGs were created
                    self.logln(f"✓ Saved {len(result['jpg_paths'])} enhanced JPG file(s)") # <-- Log JPG success
                if result["comparison_paths"]:                           # <-- Check if comparisons were created
                    self.logln(f"✓ Created {len(result['comparison_paths'])} comparison image(s)") # <-- Log comparison success
                    self.logln(f"  View comparison images to verify sharpening effects!") # <-- Prompt to view comparisons
                self.logln(f"✓ Pages processed: {result['pages']}")     # <-- Log page count
                
            except Exception as e:                                       # <-- Handle processing errors
                self.logln(f"✗ Error processing {Path(path).name}: {str(e)}") # <-- Log error message
                logging.error(f"Processing error for {path}: {e}", exc_info=True) # <-- Log detailed error
                
        self.logln("\nProcessing completed.")                            # <-- Log completion message
        self.logln("Check the output folder for your enhanced files!")     # <-- Remind user to check output
    # ---------------------------------------------------------------
# ------------------------------------------------------------


# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Application Entry Point and Main Execution
# -----------------------------------------------------------------------------

# FUNCTION | Main Application Entry Point
# ------------------------------------------------------------
def main():
    """Initialize and run the PDF Image Sharpener application."""
    try:
        app = App()                                                      # <-- Create application instance
        app.mainloop()                                                   # <-- Start main event loop
    except Exception as e:                                               # <-- Handle fatal application errors
        print(f"Fatal application error: {e}")                          # <-- Print error to console
        print(traceback.format_exc())                                    # <-- Print full traceback
        logging.critical(f"Fatal error: {e}", exc_info=True)            # <-- Log critical error
        sys.exit(1)                                                      # <-- Exit with error code
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Script Execution Guard
# -----------------------------------------------------------------------------

if __name__ == "__main__":                                               # <-- Check if script run directly
    main()                                                               # <-- Execute main function

# endregion -------------------------------------------------------------------
