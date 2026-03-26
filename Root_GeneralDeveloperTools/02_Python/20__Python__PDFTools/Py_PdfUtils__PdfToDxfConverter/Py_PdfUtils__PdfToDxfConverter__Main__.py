#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Py_PdfUtils__PdfToDxfConverter__Main__.py

PDF (vector) -> DXF converter with:
- Tkinter UI (input PDF, output DXF/folder, options)
- Vector-vs-flattened analysis (per page)
- Page size readout (pt / mm / inches) + nearest ISO A-size guess
- Scaling system: PDF page units -> paper mm -> model mm via drawing scale (e.g. 1:50)
- DXF export via ezdxf (lines + rectangles + cubic bezier approximations; optional text)

NOTES / REALITY CHECK
- If your PDF is truly raster/flattened, you cannot recover accurate vectors from it. This tool will detect that and warn.
- Requires PyMuPDF (pymupdf) and ezdxf installed in your main Python environment.
- Install dependencies with: pip install pymupdf ezdxf
- Default assumes PyMuPDF coordinates are in PDF points (1/72 inch) and converts to mm, then multiplies by drawing scale.
"""

from __future__ import annotations

# =============================================================================
# PHASE 1 : LOADING LIBRARIES
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | Load Basic Python Libraries
# -----------------------------------------------------------------------------
import os
import re
import sys
import math
import time
import traceback
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable, List, Optional, Tuple

import tkinter as tk
from tkinter import ttk, filedialog, messagebox
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Load External Libraries from Main Python Environment
# -----------------------------------------------------------------------------

# DATA | Store import errors for diagnostic messages
_import_errors: dict[str, str] = {}                                                                  # <-- Store import error messages

# PROCESS | Import PyMuPDF (fitz) from main Python environment
try:
    import fitz  # PyMuPDF
except Exception as e:
    fitz = None  # type: ignore
    _import_errors['fitz'] = str(e)                                                                   # <-- Store error message

# PROCESS | Import ezdxf from main Python environment
try:
    import ezdxf
    try:
        from ezdxf import units as dxf_units
        from ezdxf.colors import rgb2int
    except Exception as e_sub:
        # Base import succeeded but sub-imports failed
        _import_errors['ezdxf'] = f"ezdxf imported but sub-modules failed: {str(e_sub)}"
        raise  # Re-raise to set ezdxf to None
except Exception as e:
    ezdxf = None  # type: ignore
    _import_errors['ezdxf'] = str(e)                                                                  # <-- Store error message
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
# REGION | Constants
# -----------------------------------------------------------------------------
MM_PER_INCH = 25.4                                                                                     # <-- Millimeters per inch
PT_PER_INCH = 72.0                                                                                     # <-- Points per inch
MM_PER_PT = MM_PER_INCH / PT_PER_INCH                                                                  # <-- Millimeters per point (~0.3527777778)
# endregion -------------------------------------------------------------------

# =============================================================================
# PHASE 3 : HELPER FUNCTIONS
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | Utility Helper Functions
# -----------------------------------------------------------------------------

# FUNCTION | Safe Float Conversion
# ------------------------------------------------------------
def _safe_float(s: str, default: float = 0.0) -> float:
    # Convert string to float with default fallback
    try:
        return float(s)
    except Exception:
        return default
# ------------------------------------------------------------

# FUNCTION | Parse Drawing Scale
# ------------------------------------------------------------
def parse_drawing_scale(scale_text: str) -> float:
    # Parse drawing scale from various formats: "50", "1:50", "1/50", "1 = 50"
    # Returns: denominator as float (must be > 0)
    t = (scale_text or "").strip().lower()                                                              # <-- Normalize input
    if not t:
        raise ValueError("Drawing scale is empty.")

    # PROCESS | Normalize common patterns
    t = t.replace("=", ":")                                                                             # <-- Convert = to :
    t = t.replace("\\", "/")                                                                             # <-- Convert \ to /

    # PROCESS | Extract numbers in a "1:50" or "1/50" style
    m = re.search(r"(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)", t)
    if m:
        a = float(m.group(1))                                                                            # <-- Numerator
        b = float(m.group(2))                                                                            # <-- Denominator
        if a == 0 or b <= 0:
            raise ValueError("Invalid scale ratio.")
        return b / a                                                                                     # <-- Return denominator (e.g., 1:50 -> 50)

    # PROCESS | Otherwise, assume it's already the denominator (e.g. "50")
    v = float(re.sub(r"[^\d.]+", "", t))
    if v <= 0:
        raise ValueError("Scale must be > 0.")
    return v
# ------------------------------------------------------------

# FUNCTION | Parse Page Range
# ------------------------------------------------------------
def parse_page_range(text: str, page_count: int) -> List[int]:
    # Parse page range: "all" -> all pages, "1-3,5" -> [0,1,2,4], empty -> all
    if page_count <= 0:
        return []

    t = (text or "").strip().lower()                                                                    # <-- Normalize input
    if not t or t == "all":
        return list(range(page_count))                                                                  # <-- Return all pages

    # PROCESS | Parse comma-separated parts
    parts = [p.strip() for p in t.split(",") if p.strip()]
    out: List[int] = []
    for p in parts:
        if "-" in p:                                                                                    # <-- Handle range (e.g., "1-3")
            a_s, b_s = [x.strip() for x in p.split("-", 1)]
            a = int(a_s)
            b = int(b_s)
            if a < 1:
                a = 1                                                                                   # <-- Clamp to valid range
            if b > page_count:
                b = page_count
            if b < a:
                a, b = b, a                                                                             # <-- Swap if reversed
            out.extend(list(range(a - 1, b)))                                                           # <-- Convert to 0-based indices
        else:                                                                                            # <-- Handle single page
            n = int(p)
            if 1 <= n <= page_count:
                out.append(n - 1)                                                                       # <-- Convert to 0-based index

    # PROCESS | De-dupe while preserving order
    seen = set()
    uniq: List[int] = []
    for i in out:
        if i not in seen:
            uniq.append(i)
            seen.add(i)
    return uniq
# ------------------------------------------------------------

# FUNCTION | Find Nearest ISO A Size
# ------------------------------------------------------------
def nearest_iso_a_size(width_mm: float, height_mm: float, tol_mm: float = 6.0) -> str:
    # Find nearest ISO A-series paper size (A0-A5) in mm
    a_sizes = {                                                                                          # <-- ISO A-series sizes in mm (portrait)
        "A0": (841, 1189),
        "A1": (594, 841),
        "A2": (420, 594),
        "A3": (297, 420),
        "A4": (210, 297),
        "A5": (148, 210),
    }

    w, h = sorted((width_mm, height_mm))                                                                # <-- Sort dimensions for comparison
    best = ("Unknown", 1e9)                                                                              # <-- Track best match

    # PROCESS | Find closest matching size
    for name, (W, H) in a_sizes.items():
        ww, hh = sorted((float(W), float(H)))                                                           # <-- Sort reference size
        d = abs(ww - w) + abs(hh - h)                                                                    # <-- Calculate distance
        if d < best[1]:
            best = (name, d)

    # VALIDATION | Check tolerance
    if best[0] != "Unknown":
        if best[1] <= (tol_mm * 2.0):                                                                    # <-- Check tolerance (sum-of-abs)
            return best[0]
    return "Unknown"
# ------------------------------------------------------------

# FUNCTION | Format Page Size String
# ------------------------------------------------------------
def _format_page_size(points_w: float, points_h: float) -> str:
    # Format page size in points, mm, inches, and nearest ISO size
    mm_w = points_w * MM_PER_PT                                                                        # <-- Convert points to mm
    mm_h = points_h * MM_PER_PT
    in_w = points_w / PT_PER_INCH                                                                       # <-- Convert points to inches
    in_h = points_h / PT_PER_INCH
    iso = nearest_iso_a_size(mm_w, mm_h)                                                                # <-- Find nearest ISO size
    return (
        f"{points_w:.2f} pt x {points_h:.2f} pt | "
        f"{mm_w:.1f} mm x {mm_h:.1f} mm | "
        f"{in_w:.2f} in x {in_h:.2f} in | "
        f"Nearest ISO: {iso}"
    )
# ------------------------------------------------------------

# FUNCTION | Cubic Bezier Point Calculation
# ------------------------------------------------------------
def _cubic_bezier(p0, p1, p2, p3, t: float):
    # Calculate point on cubic Bezier curve using Bernstein basis polynomials
    u = 1.0 - t                                                                                          # <-- Complementary parameter
    tt = t * t                                                                                           # <-- t squared
    uu = u * u                                                                                           # <-- u squared
    uuu = uu * u                                                                                         # <-- u cubed
    ttt = tt * t                                                                                         # <-- t cubed
    x = (uuu * p0[0]) + (3 * uu * t * p1[0]) + (3 * u * tt * p2[0]) + (ttt * p3[0])                    # <-- X coordinate
    y = (uuu * p0[1]) + (3 * uu * t * p1[1]) + (3 * u * tt * p2[1]) + (ttt * p3[1])                    # <-- Y coordinate
    return (x, y)
# ------------------------------------------------------------

# FUNCTION | Adaptive Curve Steps Calculation
# ------------------------------------------------------------
def _adaptive_curve_steps(p0, p1, p2, p3, min_steps=8, max_steps=64) -> int:
    # Calculate adaptive number of steps based on curvature/length heuristic
    def dist(a, b):
        return math.hypot(b[0] - a[0], b[1] - a[1])                                                    # <-- Euclidean distance
    poly_len = dist(p0, p1) + dist(p1, p2) + dist(p2, p3)                                             # <-- Control polygon length
    chord = dist(p0, p3)                                                                               # <-- Chord length
    k = max(0.0, poly_len - chord)                                                                      # <-- Curvature measure (more "excess" -> more curvature)
    steps = int(min_steps + (k / 50.0))                                                                # <-- Scale steps with curvature
    return max(min_steps, min(max_steps, steps))                                                        # <-- Clamp to valid range
# ------------------------------------------------------------

# FUNCTION | DXF Insertion Units from Choice
# ------------------------------------------------------------
def _dxf_insunits_from_choice(choice: str) -> int:
    # Convert unit choice string to DXF insertion units constant
    c = (choice or "mm").strip().lower()                                                               # <-- Normalize input
    if c == "mm":
        return dxf_units.MM                                                                             # <-- Millimeters
    if c == "m":
        return dxf_units.M                                                                               # <-- Meters
    if c in ("in", "inch", "inches"):
        return dxf_units.IN                                                                              # <-- Inches
    return dxf_units.MM                                                                                 # <-- Default to millimeters
# ------------------------------------------------------------

# FUNCTION | Unit Scale Factor from Millimeters
# ------------------------------------------------------------
def _unit_scale_from_mm(choice: str) -> float:
    # Get scale factor to convert from millimeters to chosen unit
    c = (choice or "mm").strip().lower()                                                               # <-- Normalize input
    if c == "mm":
        return 1.0                                                                                      # <-- No conversion needed
    if c == "m":
        return 1.0 / 1000.0                                                                             # <-- mm to meters
    if c in ("in", "inch", "inches"):
        return 1.0 / MM_PER_INCH                                                                        # <-- mm to inches
    return 1.0                                                                                           # <-- Default to no conversion
# ------------------------------------------------------------
# endregion -------------------------------------------------------------------

# =============================================================================
# PHASE 4 : PDF ANALYSIS + CONVERSION
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | Data Classes
# -----------------------------------------------------------------------------

@dataclass
class PageAnalysis:
    # Data class for PDF page analysis results
    index: int                                                                                           # <-- Page index (0-based)
    size_points: Tuple[float, float]                                                                    # <-- Page size in points
    size_mm: Tuple[float, float]                                                                        # <-- Page size in millimeters
    drawings_count: int                                                                                 # <-- Number of vector drawings
    images_count: int                                                                                   # <-- Number of images
    max_image_coverage: float                                                                           # <-- Maximum image coverage ratio
    likely_vector: bool                                                                                 # <-- Likely contains vectors
    likely_flattened: bool                                                                              # <-- Likely flattened/raster
    note: str                                                                                            # <-- Analysis note


@dataclass
class ConvertOptions:
    # Data class for PDF to DXF conversion options
    input_pdf: str                                                                                       # <-- Input PDF file path
    output_path: str                                                                                    # <-- Output DXF file or folder path
    output_mode: str                                                                                     # <-- "single" or "per_page"
    page_range_text: str                                                                                # <-- Page range text (e.g., "all", "1-3,5")
    coord_mode: str                                                                                     # <-- "paper_points" or "assume_mm"
    drawing_scale: float                                                                                # <-- Drawing scale (e.g., 50 for 1:50)
    output_units: str                                                                                    # <-- "mm" / "m" / "inch"
    include_text: bool                                                                                   # <-- Include text in export
    layer_by_page: bool                                                                                 # <-- Create separate layers per page
    separate_pages_by_offset: bool                                                                      # <-- Separate pages by X-offset
    page_gap_mm: float                                                                                  # <-- Gap between pages in mm
    curve_quality: str                                                                                  # <-- "low" / "med" / "high"
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | PDF Analysis Functions
# -----------------------------------------------------------------------------

# FUNCTION | Analyze PDF File
# ------------------------------------------------------------
def analyze_pdf(input_pdf: str) -> Tuple[int, List[PageAnalysis]]:
    # Analyze PDF file and return page count and analysis results
    if fitz is None:
        raise RuntimeError("PyMuPDF (fitz) import failed. Install pymupdf in your venv, or ensure it imports correctly.")

    # PROCESS | Open PDF and analyze each page
    doc = fitz.open(input_pdf)                                                                          # <-- Open PDF document
    page_count = doc.page_count                                                                         # <-- Get page count
    results: List[PageAnalysis] = []

    for i in range(page_count):
        page = doc[i]                                                                                    # <-- Get page
        w_pt = float(page.rect.width)                                                                   # <-- Page width in points
        h_pt = float(page.rect.height)                                                                  # <-- Page height in points
        w_mm = w_pt * MM_PER_PT                                                                         # <-- Convert to mm
        h_mm = h_pt * MM_PER_PT

        # PROCESS | Count drawings (vector paths)
        try:
            drawings = page.get_drawings()                                                               # <-- Get vector drawings
            dcount = len(drawings)
        except Exception:
            dcount = 0

        # PROCESS | Count images and estimate coverage
        try:
            imgs = page.get_images(full=True)                                                            # <-- Get images
            icount = len(imgs)
        except Exception:
            imgs = []
            icount = 0

        page_area = max(1.0, w_pt * h_pt)                                                                # <-- Page area for coverage calculation
        max_cov = 0.0
        try:
            for info in imgs:
                xref = info[0]                                                                           # <-- Image xref
                rects = page.get_image_rects(xref)                                                       # <-- Image rectangles
                for r in rects:
                    cov = (float(r.width) * float(r.height)) / page_area                                # <-- Coverage ratio
                    if cov > max_cov:
                        max_cov = cov
        except Exception:
            pass

        # PROCESS | Apply heuristics to determine vector/flattened status
        likely_vector = (dcount >= 10) or (dcount >= 1 and max_cov < 0.50)                              # <-- Vector detection heuristic
        likely_flattened = (dcount <= 2 and max_cov >= 0.80 and icount >= 1)                           # <-- Flattened detection heuristic

        # PROCESS | Generate analysis note
        if likely_flattened and not likely_vector:
            note = "Looks flattened (raster-dominant). Vector recovery will be poor/impossible."
        elif likely_vector and max_cov < 0.80:
            note = "Looks like vector linework is present."
        else:
            note = "Mixed/uncertain (some vectors and/or large images)."

        results.append(
            PageAnalysis(
                index=i,
                size_points=(w_pt, h_pt),
                size_mm=(w_mm, h_mm),
                drawings_count=dcount,
                images_count=icount,
                max_image_coverage=max_cov,
                likely_vector=likely_vector,
                likely_flattened=likely_flattened,
                note=note,
            )
        )

    doc.close()                                                                                          # <-- Close PDF document
    return page_count, results
# ------------------------------------------------------------
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | PDF to DXF Conversion Functions
# -----------------------------------------------------------------------------

# FUNCTION | Make Point Transform Function
# ------------------------------------------------------------
def _make_point_transform(page, options: ConvertOptions, page_offset_mm: Tuple[float, float]):
    # Create point transformation function for converting PDF coordinates to DXF coordinates
    page_h_pt = float(page.rect.height)                                                                # <-- Page height in points
    derot = getattr(page, "derotation_matrix", None)                                                    # <-- Page derotation matrix

    unit_out_scale = _unit_scale_from_mm(options.output_units)                                         # <-- Scale factor: mm -> chosen unit
    drawing_scale = float(options.drawing_scale)                                                        # <-- Drawing scale (e.g., 50 for 1:50)

    # PROCESS | Determine base scale: PDF units -> mm
    if options.coord_mode == "paper_points":
        base = MM_PER_PT                                                                                # <-- PDF points to mm
    else:
        base = 1.0                                                                                      # <-- Assume coords already in mm

    # PROCESS | Calculate full scale to output units
    s = base * drawing_scale * unit_out_scale                                                            # <-- Combined scale factor

    # PROCESS | Convert offset from mm to output units
    ox_out = page_offset_mm[0] * unit_out_scale                                                        # <-- X offset in output units
    oy_out = page_offset_mm[1] * unit_out_scale                                                        # <-- Y offset in output units

    def tx(p) -> Tuple[float, float]:
        # Transform point from PDF coordinates to DXF coordinates
        if derot is not None:                                                                            # <-- Apply derotation if available
            try:
                p2 = p * derot
            except Exception:
                p2 = p
        else:
            p2 = p

        x_pt = float(p2.x)                                                                              # <-- X in PDF points
        y_pt = float(p2.y)                                                                              # <-- Y in PDF points

        # PROCESS | Flip Y so CAD has +Y upwards, origin bottom-left
        y_pt = page_h_pt - y_pt                                                                         # <-- Flip Y coordinate

        x = (x_pt * s) + ox_out                                                                         # <-- Transform X
        y = (y_pt * s) + oy_out                                                                         # <-- Transform Y
        return (x, y)

    return tx
# ------------------------------------------------------------

# FUNCTION | Curve Steps from Quality Setting
# ------------------------------------------------------------
def _curve_steps_from_quality(quality: str, base_steps: int) -> int:
    # Adjust curve steps based on quality setting
    q = (quality or "med").strip().lower()                                                              # <-- Normalize quality setting
    if q == "low":
        return max(6, base_steps // 2)                                                                   # <-- Reduce steps for low quality
    if q == "high":
        return min(96, base_steps * 2)                                                                   # <-- Increase steps for high quality
    return base_steps                                                                                    # <-- Use base steps for medium quality
# ------------------------------------------------------------

# FUNCTION | Export PDF to DXF
# ------------------------------------------------------------
def export_pdf_to_dxf(options: ConvertOptions, progress_cb: Optional[Callable[[float, str], None]] = None) -> List[str]:
    # Export PDF to DXF format with specified options
    # VALIDATION | Check dependencies
    if fitz is None:
        raise RuntimeError("PyMuPDF (fitz) import failed. Install pymupdf in your venv, or ensure it imports correctly.")
    if ezdxf is None:
        raise RuntimeError("ezdxf import failed. Install ezdxf in your venv, or ensure it imports correctly.")

    # PROCESS | Open PDF and parse page range
    doc = fitz.open(options.input_pdf)                                                                  # <-- Open PDF document
    page_count = doc.page_count                                                                         # <-- Get page count
    pages = parse_page_range(options.page_range_text, page_count)                                       # <-- Parse page range
    if not pages:
        raise ValueError("No pages selected.")

    created_files: List[str] = []

    # PROCESS | Calculate per-page offset spacing (so multi-page export doesn't overlap)
    gap_mm = max(0.0, float(options.page_gap_mm))                                                       # <-- Page gap in mm

    def page_offset_for_index(k: int, page_w_mm: float) -> Tuple[float, float]:
        # Calculate page offset for multi-page single DXF export
        if not options.separate_pages_by_offset:
            return (0.0, 0.0)                                                                            # <-- No offset if not separating pages
        return (k * (page_w_mm + gap_mm), 0.0)                                                          # <-- X-offset based on page width + gap

    # FUNCTION | Create new DXF document helper
    def new_dxf_doc() -> "ezdxf.EzDxf":
        # Create new DXF document with proper units and layers
        d = ezdxf.new("R2010")                                                                           # <-- Create R2010 DXF document
        d.header["$INSUNITS"] = _dxf_insunits_from_choice(options.output_units)                        # <-- Set insertion units
        d.layers.new(name="PDF_VECTORS")                                                                 # <-- Create vector layer
        d.layers.new(name="PDF_TEXT")                                                                    # <-- Create text layer
        return d

    # PROCESS | Export based on mode
    if options.output_mode == "single":
        # FILE HANDLING | Single DXF file mode
        out_file = options.output_path
        if not out_file.lower().endswith(".dxf"):
            out_file = str(Path(out_file).with_suffix(".dxf"))                                           # <-- Ensure .dxf extension

        dxf_doc = new_dxf_doc()                                                                         # <-- Create DXF document
        msp = dxf_doc.modelspace()                                                                      # <-- Get modelspace

        total = len(pages)
        for idx, pno in enumerate(pages):
            page = doc[pno]                                                                              # <-- Get page
            w_pt = float(page.rect.width)                                                               # <-- Page width in points
            h_pt = float(page.rect.height)                                                              # <-- Page height in points
            w_mm = w_pt * MM_PER_PT                                                                     # <-- Convert to mm
            offset_mm = page_offset_for_index(idx, w_mm)                                               # <-- Calculate page offset

            tx = _make_point_transform(page, options, offset_mm)                                         # <-- Create transform function

            # PROCESS | Layer selection
            page_layer = f"P{pno + 1:03d}" if options.layer_by_page else "PDF_VECTORS"                 # <-- Determine layer name
            if page_layer not in dxf_doc.layers:
                dxf_doc.layers.new(name=page_layer)                                                      # <-- Create layer if needed

            # PROCESS | Get drawings (vector paths)
            drawings = []
            try:
                drawings = page.get_drawings()                                                           # <-- Get vector drawings
            except Exception:
                drawings = []

            # CONVERSION | Convert drawings to DXF entities
            for path in drawings:
                items = path.get("items", [])
                rgb = path.get("color", None)
                width_pt = path.get("width", None)

                dxfattribs = {"layer": page_layer}
                if isinstance(rgb, tuple) and len(rgb) == 3:
                    try:
                        r = int(max(0, min(255, round(rgb[0] * 255))))
                        g = int(max(0, min(255, round(rgb[1] * 255))))
                        b = int(max(0, min(255, round(rgb[2] * 255))))
                        dxfattribs["true_color"] = rgb2int((r, g, b))
                    except Exception:
                        pass

                # Width: keep light-touch (lineweight is in 1/100 mm). Don’t scale by drawing scale.
                if isinstance(width_pt, (int, float)) and width_pt > 0:
                    try:
                        lw_mm = width_pt * MM_PER_PT
                        dxfattribs["lineweight"] = int(max(0, min(211, round(lw_mm * 100))))  # 2.11mm max DXF lw
                    except Exception:
                        pass

                for it in items:
                    if not it:
                        continue
                    cmd = it[0]

                    # ('l', Point(a), Point(b))
                    if cmd == "l" and len(it) >= 3:
                        p1 = tx(it[1])
                        p2 = tx(it[2])
                        msp.add_line(p1, p2, dxfattribs=dxfattribs)

                    # ('re', Rect(x0,y0,x1,y1), close_flag)
                    elif cmd == "re" and len(it) >= 2:
                        r = it[1]
                        # Rect has x0,y0,x1,y1
                        pA = tx(fitz.Point(r.x0, r.y0))
                        pB = tx(fitz.Point(r.x1, r.y0))
                        pC = tx(fitz.Point(r.x1, r.y1))
                        pD = tx(fitz.Point(r.x0, r.y1))
                        msp.add_lwpolyline([pA, pB, pC, pD, pA], dxfattribs=dxfattribs)

                    # ('c', Point(p0), Point(p1), Point(p2), Point(p3))
                    elif cmd == "c" and len(it) >= 5:
                        p0 = tx(it[1])
                        p1 = tx(it[2])
                        p2 = tx(it[3])
                        p3 = tx(it[4])

                        base_steps = _adaptive_curve_steps(p0, p1, p2, p3)
                        steps = _curve_steps_from_quality(options.curve_quality, base_steps)

                        pts = [_cubic_bezier(p0, p1, p2, p3, t / float(steps)) for t in range(0, steps + 1)]
                        msp.add_lwpolyline(pts, dxfattribs=dxfattribs)

                    # Unknown / unhandled commands are ignored
                    else:
                        continue

            # Optional text (very simple)
            if options.include_text:
                try:
                    tdict = page.get_text("dict")                                                       # <-- Get text dictionary
                    blocks = tdict.get("blocks", [])
                    for b in blocks:
                        if b.get("type", 0) != 0:
                            continue
                        for line in b.get("lines", []):
                            for span in line.get("spans", []):
                                txt = span.get("text", "")                                               # <-- Get text content
                                if not txt or not txt.strip():
                                    continue
                                x = span.get("origin", [None, None])[0]                                # <-- Get X position
                                y = span.get("origin", [None, None])[1]                                # <-- Get Y position
                                if x is None or y is None:
                                    continue
                                p = tx(fitz.Point(float(x), float(y)))                                 # <-- Transform text position

                                # PROCESS | Convert text size (points -> mm -> output units, don't scale by drawing scale)
                                size_pt = float(span.get("size", 9.0))                                  # <-- Text size in points
                                if options.coord_mode == "paper_points":
                                    height_mm = size_pt * MM_PER_PT                                     # <-- Convert points to mm
                                else:
                                    height_mm = size_pt * MM_PER_PT                                     # <-- Fallback: still assume points
                                height_out = height_mm * _unit_scale_from_mm(options.output_units)    # <-- Convert to output units

                                msp.add_text(
                                    txt,
                                    dxfattribs={"layer": "PDF_TEXT", "height": max(0.1, height_out)}    # <-- Add text entity
                                ).set_pos(p)

                except Exception:
                    # Text is best-effort; ignore failures
                    pass

            # PROCESS | Update progress callback
            if progress_cb:
                progress_cb((idx + 1) / float(total), f"Converted page {pno + 1} of {page_count}")

        # FILE HANDLING | Save single DXF file
        dxf_doc.saveas(out_file)                                                                        # <-- Save DXF document
        created_files.append(out_file)

    else:
        # FILE HANDLING | Per-page DXF files mode
        out_dir = Path(options.output_path)
        out_dir.mkdir(parents=True, exist_ok=True)                                                      # <-- Create output directory

        total = len(pages)
        for idx, pno in enumerate(pages):
            page = doc[pno]                                                                              # <-- Get page
            w_pt = float(page.rect.width)
            w_mm = w_pt * MM_PER_PT
            offset_mm = (0.0, 0.0)                                                                      # <-- No offset for per-page files

            tx = _make_point_transform(page, options, offset_mm)                                        # <-- Create transform function

            dxf_doc = new_dxf_doc()                                                                     # <-- Create new DXF document per page
            msp = dxf_doc.modelspace()

            # PROCESS | Get drawings
            drawings = []
            try:
                drawings = page.get_drawings()
            except Exception:
                drawings = []

            # CONVERSION | Convert drawings (same logic as single file mode)
            for path in drawings:
                items = path.get("items", [])
                rgb = path.get("color", None)
                width_pt = path.get("width", None)

                dxfattribs = {"layer": "PDF_VECTORS"}                                                    # <-- Use default vector layer
                if isinstance(rgb, tuple) and len(rgb) == 3:
                    try:
                        r = int(max(0, min(255, round(rgb[0] * 255))))
                        g = int(max(0, min(255, round(rgb[1] * 255))))
                        b = int(max(0, min(255, round(rgb[2] * 255))))
                        dxfattribs["true_color"] = rgb2int((r, g, b))
                    except Exception:
                        pass
                if isinstance(width_pt, (int, float)) and width_pt > 0:
                    try:
                        lw_mm = width_pt * MM_PER_PT
                        dxfattribs["lineweight"] = int(max(0, min(211, round(lw_mm * 100))))
                    except Exception:
                        pass

                for it in items:
                    if not it:
                        continue
                    cmd = it[0]
                    if cmd == "l" and len(it) >= 3:
                        p1 = tx(it[1])
                        p2 = tx(it[2])
                        msp.add_line(p1, p2, dxfattribs=dxfattribs)
                    elif cmd == "re" and len(it) >= 2:
                        r = it[1]
                        pA = tx(fitz.Point(r.x0, r.y0))
                        pB = tx(fitz.Point(r.x1, r.y0))
                        pC = tx(fitz.Point(r.x1, r.y1))
                        pD = tx(fitz.Point(r.x0, r.y1))
                        msp.add_lwpolyline([pA, pB, pC, pD, pA], dxfattribs=dxfattribs)
                    elif cmd == "c" and len(it) >= 5:
                        p0 = tx(it[1])
                        p1 = tx(it[2])
                        p2 = tx(it[3])
                        p3 = tx(it[4])
                        base_steps = _adaptive_curve_steps(p0, p1, p2, p3)
                        steps = _curve_steps_from_quality(options.curve_quality, base_steps)
                        pts = [_cubic_bezier(p0, p1, p2, p3, t / float(steps)) for t in range(0, steps + 1)]
                        msp.add_lwpolyline(pts, dxfattribs=dxfattribs)

            # FILE HANDLING | Save per-page DXF file
            out_file = out_dir / (Path(options.input_pdf).stem + f"__P{pno + 1:03d}.dxf")               # <-- Generate filename
            dxf_doc.saveas(str(out_file))                                                               # <-- Save DXF document
            created_files.append(str(out_file))

            # PROCESS | Update progress callback
            if progress_cb:
                progress_cb((idx + 1) / float(total), f"Saved {out_file.name}")

    doc.close()                                                                                          # <-- Close PDF document
    return created_files
# ------------------------------------------------------------
# endregion -------------------------------------------------------------------

# =============================================================================
# PHASE 5 : TKINTER APPLICATION
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | PDF to DXF Converter Application Class
# -----------------------------------------------------------------------------


class PdfToDxfApp(tk.Tk):
    # Main application class for PDF to DXF conversion with Tkinter GUI
    
    # METHOD | Class Initialization
    # ------------------------------------------------------------
    def __init__(self):
        super().__init__()

        # PROCESS | Window setup
        self.title("Py_PdfUtils__PdfToDxfConverter — PDF (Vector) to DXF")
        self.geometry("860x800")
        self.minsize(860, 800)
        set_noble_icon(self)                                                                             # <-- Set Windows icon

        # DATA | UI Variables
        self.var_input_pdf = tk.StringVar()                                                              # <-- Input PDF file path
        self.var_output_mode = tk.StringVar(value="single")                                              # <-- Output mode: "single" / "per_page"
        self.var_output_path = tk.StringVar()                                                            # <-- Output file/folder path
        self.var_page_range = tk.StringVar(value="all")                                                  # <-- Page range text
        self.var_coord_mode = tk.StringVar(value="paper_points")                                        # <-- Coordinate mode: "paper_points" / "assume_mm"
        self.var_scale = tk.StringVar(value="1:50")                                                      # <-- Drawing scale
        self.var_units = tk.StringVar(value="mm")                                                        # <-- Output units
        self.var_include_text = tk.BooleanVar(value=False)                                              # <-- Include text option
        self.var_layer_by_page = tk.BooleanVar(value=True)                                               # <-- Layer by page option
        self.var_separate_pages = tk.BooleanVar(value=True)                                              # <-- Separate pages option
        self.var_page_gap = tk.StringVar(value="50")                                                    # <-- Page gap in mm
        self.var_curve_quality = tk.StringVar(value="med")                                              # <-- Curve quality: "low" / "med" / "high"
        self.var_status = tk.StringVar(value="Ready.")                                                   # <-- Status message
        self.var_progress = tk.DoubleVar(value=0.0)                                                      # <-- Progress value (0.0-1.0)
        self._analysis_cache: Optional[List[PageAnalysis]] = None                                       # <-- Cached analysis results

        self._build_ui()
    # ------------------------------------------------------------

    # METHOD | Build GUI Layout
    # ------------------------------------------------------------

    def _build_ui(self):
        # Build the main GUI interface
        pad = {"padx": 10, "pady": 8}

        # PROCESS | Input PDF section
        frm_in = ttk.LabelFrame(self, text="Input PDF")
        frm_in.pack(fill="x", **pad)

        row = ttk.Frame(frm_in)
        row.pack(fill="x", padx=10, pady=10)

        ent = ttk.Entry(row, textvariable=self.var_input_pdf)
        ent.pack(side="left", fill="x", expand=True)

        ttk.Button(row, text="Browse…", command=self._browse_pdf).pack(side="left", padx=8)
        ttk.Button(row, text="Analyze", command=self._analyze).pack(side="left")

        # PROCESS | Analysis output section
        frm_an = ttk.LabelFrame(self, text="Analysis")
        frm_an.pack(fill="both", expand=False, **pad)

        self.txt_analysis = tk.Text(frm_an, height=8, wrap="word")
        self.txt_analysis.pack(fill="both", expand=True, padx=10, pady=10)
        self.txt_analysis.configure(state="disabled")

        # PROCESS | Output settings section
        frm_out = ttk.LabelFrame(self, text="Output")
        frm_out.pack(fill="x", **pad)

        out_top = ttk.Frame(frm_out)
        out_top.pack(fill="x", padx=10, pady=10)

        ttk.Radiobutton(out_top, text="Single DXF", variable=self.var_output_mode, value="single",
                        command=self._refresh_output_hint).pack(side="left")
        ttk.Radiobutton(out_top, text="DXF per page (folder)", variable=self.var_output_mode, value="per_page",
                        command=self._refresh_output_hint).pack(side="left", padx=12)

        out_mid = ttk.Frame(frm_out)
        out_mid.pack(fill="x", padx=10, pady=(0, 10))

        self.ent_out = ttk.Entry(out_mid, textvariable=self.var_output_path)
        self.ent_out.pack(side="left", fill="x", expand=True)

        self.btn_out = ttk.Button(out_mid, text="Browse…", command=self._browse_output)
        self.btn_out.pack(side="left", padx=8)

        self.lbl_out_hint = ttk.Label(frm_out, text="")
        self.lbl_out_hint.pack(anchor="w", padx=12, pady=(0, 10))
        self._refresh_output_hint()

        # PROCESS | Conversion options section
        frm_opts = ttk.LabelFrame(self, text="Conversion options")
        frm_opts.pack(fill="x", **pad)

        grid = ttk.Frame(frm_opts)
        grid.pack(fill="x", padx=10, pady=10)

        def add_row(r, label, widget):
            ttk.Label(grid, text=label).grid(row=r, column=0, sticky="w", padx=(0, 10), pady=4)
            widget.grid(row=r, column=1, sticky="ew", pady=4)
            grid.grid_columnconfigure(1, weight=1)

        # PROCESS | Page range input
        add_row(0, "Pages (e.g. all, 1-3,5):", ttk.Entry(grid, textvariable=self.var_page_range))

        # PROCESS | Coordinate mode selection
        coord_frame = ttk.Frame(grid)
        ttk.Radiobutton(coord_frame, text="Treat PDF units as paper points (recommended)", variable=self.var_coord_mode,
                        value="paper_points").pack(anchor="w")
        ttk.Radiobutton(coord_frame, text="Assume PDF coordinates already represent mm", variable=self.var_coord_mode,
                        value="assume_mm").pack(anchor="w")
        add_row(1, "Coordinate mode:", coord_frame)

        # PROCESS | Drawing scale input
        add_row(2, "Drawing scale (e.g. 1:50):", ttk.Entry(grid, textvariable=self.var_scale))

        # PROCESS | Output units selection
        units_box = ttk.Combobox(grid, textvariable=self.var_units, values=["mm", "m", "inch"], state="readonly")
        add_row(3, "DXF units:", units_box)

        # PROCESS | Curve quality selection
        curve_box = ttk.Combobox(grid, textvariable=self.var_curve_quality, values=["low", "med", "high"], state="readonly")
        add_row(4, "Curve quality:", curve_box)

        # PROCESS | Checkbox options
        chk_frame = ttk.Frame(grid)
        ttk.Checkbutton(chk_frame, text="Include text (best-effort)", variable=self.var_include_text).pack(anchor="w")
        ttk.Checkbutton(chk_frame, text="Layer by page (single DXF mode)", variable=self.var_layer_by_page).pack(anchor="w")
        ttk.Checkbutton(chk_frame, text="Separate pages by X-offset (single DXF mode)", variable=self.var_separate_pages).pack(anchor="w")
        add_row(5, "Options:", chk_frame)

        # PROCESS | Page gap input
        add_row(6, "Page gap (mm, when separating pages):", ttk.Entry(grid, textvariable=self.var_page_gap))

        # PROCESS | Run button and progress section
        frm_run = ttk.Frame(self)
        frm_run.pack(fill="x", **pad)

        ttk.Button(frm_run, text="Convert to DXF", command=self._convert).pack(side="left")

        pb = ttk.Progressbar(frm_run, variable=self.var_progress, maximum=1.0)
        pb.pack(side="left", fill="x", expand=True, padx=10)

        ttk.Label(frm_run, textvariable=self.var_status).pack(side="left")
    # ------------------------------------------------------------

    # METHOD | Refresh Output Hint
    # ------------------------------------------------------------
    def _refresh_output_hint(self):
        # Update output hint label based on selected output mode
        mode = self.var_output_mode.get()                                                               # <-- Get output mode
        if mode == "single":
            self.lbl_out_hint.configure(text="Choose a DXF file path (e.g. C:\\Temp\\drawing.dxf).")   # <-- Single file hint
        else:
            self.lbl_out_hint.configure(text="Choose an output folder; one DXF will be saved per PDF page.")  # <-- Per-page hint
    # ------------------------------------------------------------

    # METHOD | Browse PDF File
    # ------------------------------------------------------------
    def _browse_pdf(self):
        # Open file dialog to select input PDF file
        path = filedialog.askopenfilename(
            title="Select PDF",
            filetypes=[("PDF Files", "*.pdf"), ("All files", "*.*")]
        )
        if path:
            self.var_input_pdf.set(path)                                                                 # <-- Set input path
            self.var_status.set("PDF selected. Click Analyze if you want a quick vector/flattened check.")  # <-- Update status
    # ------------------------------------------------------------

    # METHOD | Browse Output Path
    # ------------------------------------------------------------
    def _browse_output(self):
        # Open file/folder dialog based on output mode
        mode = self.var_output_mode.get()                                                               # <-- Get output mode
        if mode == "single":
            path = filedialog.asksaveasfilename(
                title="Save DXF As",
                defaultextension=".dxf",
                filetypes=[("DXF Files", "*.dxf"), ("All files", "*.*")]
            )
            if path:
                self.var_output_path.set(path)                                                           # <-- Set output file path
        else:
            path = filedialog.askdirectory(title="Select output folder")                                # <-- Select folder for per-page mode
            if path:
                self.var_output_path.set(path)                                                           # <-- Set output folder path
    # ------------------------------------------------------------

    # METHOD | Set Analysis Text
    # ------------------------------------------------------------
    def _set_analysis_text(self, text: str):
        # Update analysis text widget with new content
        self.txt_analysis.configure(state="normal")                                                      # <-- Enable editing
        self.txt_analysis.delete("1.0", "end")                                                          # <-- Clear existing text
        self.txt_analysis.insert("1.0", text)                                                           # <-- Insert new text
        self.txt_analysis.configure(state="disabled")                                                    # <-- Disable editing
    # ------------------------------------------------------------

    # METHOD | Analyze PDF File
    # ------------------------------------------------------------
    def _analyze(self):
        # Analyze PDF file and display results
        pdf = self.var_input_pdf.get().strip()                                                          # <-- Get PDF path
        # VALIDATION | Check PDF exists
        if not pdf or not Path(pdf).exists():
            messagebox.showerror("Missing PDF", "Select a valid PDF first.")
            return

        # VALIDATION | Check PyMuPDF dependency
        if fitz is None:
            msg_parts = ["PyMuPDF (fitz) failed to import.\n\n"]
            msg_parts.append(f"Python interpreter: {sys.executable}\n")
            if 'fitz' in _import_errors:
                msg_parts.append(f"Import error: {_import_errors['fitz']}\n\n")
            msg_parts.append("Install in your main Python environment:\n")
            msg_parts.append(f"  {sys.executable} -m pip install pymupdf\n\n")
            msg_parts.append("Then re-run the application.")
            messagebox.showerror("Missing dependency", "".join(msg_parts))
            return

        # PROCESS | Analyze PDF
        try:
            self.var_status.set("Analyzing…")                                                            # <-- Update status
            self.update_idletasks()

            page_count, analyses = analyze_pdf(pdf)                                                      # <-- Run analysis
            self._analysis_cache = analyses                                                              # <-- Cache results

            # PROCESS | Format analysis results
            lines = []
            lines.append(f"File: {pdf}")
            lines.append(f"Pages: {page_count}")
            lines.append("")
            for a in analyses:
                w_pt, h_pt = a.size_points
                size_str = _format_page_size(w_pt, h_pt)                                                # <-- Format page size
                lines.append(f"Page {a.index + 1}: {size_str}")
                lines.append(f"  Drawings (vector paths): {a.drawings_count}")
                lines.append(f"  Images: {a.images_count} | Max image coverage: {a.max_image_coverage * 100:.1f}%")
                lines.append(f"  Verdict: {a.note}")
                lines.append("")

            # PROCESS | Generate overall verdict
            any_vector = any(x.likely_vector for x in analyses)                                        # <-- Check for vectors
            any_flat = any(x.likely_flattened for x in analyses)                                       # <-- Check for flattened
            if any_flat and not any_vector:
                lines.append("Overall: This PDF looks mostly flattened/raster. Expect poor CAD results.")
            elif any_vector:
                lines.append("Overall: Vector linework detected. DXF export should be meaningful.")
            else:
                lines.append("Overall: Mixed/uncertain. Try exporting and inspect the DXF.")

            self._set_analysis_text("\n".join(lines))                                                   # <-- Display results
            self.var_status.set("Analysis complete.")
        except Exception as e:
            self.var_status.set("Analysis failed.")
            messagebox.showerror("Analysis failed", f"{e}\n\n{traceback.format_exc()}")
    # ------------------------------------------------------------

    # METHOD | Convert PDF to DXF
    # ------------------------------------------------------------
    def _convert(self):
        # Convert PDF to DXF with current settings
        pdf = self.var_input_pdf.get().strip()                                                          # <-- Get input PDF path
        out = self.var_output_path.get().strip()                                                       # <-- Get output path
        mode = self.var_output_mode.get()                                                               # <-- Get output mode

        # VALIDATION | Check input PDF
        if not pdf or not Path(pdf).exists():
            messagebox.showerror("Missing PDF", "Select a valid PDF first.")
            return

        # VALIDATION | Check output path
        if not out:
            messagebox.showerror("Missing output", "Set an output file/folder first.")
            return

        # VALIDATION | Check dependencies
        if fitz is None or ezdxf is None:
            missing = []
            if fitz is None:
                missing.append("PyMuPDF (pymupdf)")
            if ezdxf is None:
                missing.append("ezdxf")
            
            msg_parts = ["Required imports failed.\n"]
            msg_parts.append(f"Missing: {', '.join(missing)}\n\n")
            
            # PROCESS | Add diagnostic information
            msg_parts.append(f"Python interpreter: {sys.executable}\n")
            msg_parts.append(f"Python path: {sys.path[0] if sys.path else 'N/A'}\n\n")
            
            # PROCESS | Add specific error messages if available
            if ezdxf is None and 'ezdxf' in _import_errors:
                msg_parts.append(f"ezdxf import error: {_import_errors['ezdxf']}\n\n")
            if fitz is None and 'fitz' in _import_errors:
                msg_parts.append(f"PyMuPDF import error: {_import_errors['fitz']}\n\n")
            
            msg_parts.append("Install in your main Python environment:\n")
            
            if fitz is None:
                msg_parts.append(f"  {sys.executable} -m pip install pymupdf\n")
            if ezdxf is None:
                msg_parts.append(f"  {sys.executable} -m pip install ezdxf\n")
            
            msg_parts.append("\nThen re-run the application.")
            messagebox.showerror("Missing dependency", "".join(msg_parts))
            return

        # PROCESS | Parse options
        try:
            scale = parse_drawing_scale(self.var_scale.get())                                           # <-- Parse drawing scale
        except Exception as e:
            messagebox.showerror("Invalid scale", str(e))
            return

        gap_mm = _safe_float(self.var_page_gap.get(), 50.0)                                            # <-- Parse page gap

        # PROCESS | Create conversion options
        opts = ConvertOptions(
            input_pdf=pdf,
            output_path=out,
            output_mode="single" if mode == "single" else "per_page",
            page_range_text=self.var_page_range.get(),
            coord_mode=self.var_coord_mode.get(),
            drawing_scale=scale,
            output_units=self.var_units.get(),
            include_text=bool(self.var_include_text.get()),
            layer_by_page=bool(self.var_layer_by_page.get()),
            separate_pages_by_offset=bool(self.var_separate_pages.get()),
            page_gap_mm=gap_mm,
            curve_quality=self.var_curve_quality.get(),
        )

        # VALIDATION | Warn if PDF appears flattened
        if self._analysis_cache:
            likely_flat = all(a.likely_flattened and not a.likely_vector for a in self._analysis_cache)  # <-- Check if all pages flattened
            if likely_flat:
                if not messagebox.askyesno(
                    "Looks flattened",
                    "This PDF looks mostly flattened/raster.\n\nDXF output will likely be empty or poor.\n\nContinue anyway?"
                ):
                    return

        # PROCESS | Initialize progress
        self.var_progress.set(0.0)                                                                      # <-- Reset progress
        self.var_status.set("Converting…")                                                              # <-- Update status
        self.update_idletasks()

        def progress(p: float, msg: str):
            # Progress callback for conversion
            self.var_progress.set(max(0.0, min(1.0, p)))                                                 # <-- Update progress bar
            self.var_status.set(msg)                                                                     # <-- Update status message
            self.update_idletasks()

        # PROCESS | Perform conversion
        try:
            files = export_pdf_to_dxf(opts, progress_cb=progress)                                        # <-- Export PDF to DXF
            self.var_progress.set(1.0)                                                                   # <-- Set progress to complete
            self.var_status.set("Done.")

            # PROCESS | Show completion message
            if opts.output_mode == "single":
                messagebox.showinfo("Complete", f"Saved DXF:\n{files[0]}")                               # <-- Single file message
            else:
                messagebox.showinfo("Complete", f"Saved {len(files)} DXF files into:\n{opts.output_path}")  # <-- Per-page message
        except Exception as e:
            self.var_status.set("Conversion failed.")
            messagebox.showerror("Conversion failed", f"{e}\n\n{traceback.format_exc()}")
    # ------------------------------------------------------------
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Main Entry Point
# -----------------------------------------------------------------------------

# FUNCTION | Main Entry Point
# ------------------------------------------------------------
def main():
    # Main entry point - create and run application
    app = PdfToDxfApp()                                                                                 # <-- Create application instance
    app.mainloop()                                                                                      # <-- Start event loop
# ------------------------------------------------------------
# endregion -------------------------------------------------------------------


if __name__ == "__main__":
    main()
