#!/usr/bin/env python3
# Silhouette Tracer — Image To Closed DXF Polylines (Multiple Islands Support, High-Accuracy Typography, Scaled 10x, Corrected Y)
# Author: Noble Architecture tooling helper
# Python 3.10+
# Version 1.2.1 - High-Accuracy Typography with Curve Smoothing
# 
# ACCURACY IMPROVEMENTS:
# - Reduced segment size from 1.0mm to 0.1mm for smooth curves
# - Reduced simplification ratio by 10x to preserve detail
# - Added Savitzky-Golay curve smoothing for professional typography
# - Enhanced image preprocessing with Gaussian blur
# - Higher precision rounding (4 decimal places)

import os
import sys
import math
import tkinter as tk
from tkinter import filedialog, messagebox

import numpy as np
from PIL import Image, TiffImagePlugin
import cv2
import ezdxf
from scipy.signal import savgol_filter


# --------------------------------
# Configuration - High Accuracy for Typography
# --------------------------------
SCALE_EXPORT   = 10.0               # Final output scale factor (10x as requested)
MIN_SEGMENT_MM = 0.1                # Much smaller segments for smooth curves (was 1.0)
SIMPLIFY_RATIO = 0.00005            # Much more conservative simplification (was 0.0005)
KERNEL_CLOSE   = 2                  # Smaller kernel to preserve fine details (was 3)
INVERT_INPUT   = False              # Set True if objects are white on dark
LAYER_PREFIX   = "OUTLINE_ISLAND_"  # Layer prefix for multiple islands
DXF_VERSION    = "R2018"            # Any ezdxf supported version
DEFAULT_PPI    = 96.0               # Used when image has no reliable resolution metadata
MIN_ISLAND_AREA_MM2 = 0.5           # Lower threshold for small details (was 1.0)
CONTOUR_CHAIN_APPROX = cv2.CHAIN_APPROX_NONE  # Full contour detail (no approximation)
GAUSSIAN_BLUR_RADIUS = 1            # Slight blur to smooth pixelated edges
# --------------------------------


def get_image_ppi(pil: Image.Image) -> float:
    """
    Try to read image PPI from metadata. Falls back to DEFAULT_PPI if not present.
    Handles common JPEG/TIFF/PNG cases that PIL exposes.
    """
    # JPEG typically stores ('dpi': (x, y))
    if "dpi" in pil.info:
        x, y = pil.info["dpi"]
        if x and x > 0:
            return float(x)

    # JFIF density (pixels per inch if unit == 1)
    if "jfif_density" in pil.info and "jfif_unit" in pil.info:
        unit = pil.info["jfif_unit"]  # 1 = dots per inch, 2 = dots per cm
        dx, dy = pil.info["jfif_density"]
        if dx and dx > 0:
            if unit == 1:
                return float(dx)
            if unit == 2:
                return float(dx * 2.54)  # cm to inch

    # TIFF resolutions
    if isinstance(pil, TiffImagePlugin.TiffImageFile) or pil.format == "TIFF":
        try:
            xres = pil.tag_v2.get(282)  # XResolution
            unit = pil.tag_v2.get(296)  # ResolutionUnit: 2 = inch, 3 = cm
            if xres:
                # xres can be a rational
                val = float(xres[0]/xres[1]) if isinstance(xres, tuple) else float(xres)
                if unit == 3:
                    val *= 2.54
                if val > 0:
                    return val
        except Exception:
            pass

    # PNG sometimes stores 'dpi' too. Already handled above if present.

    return DEFAULT_PPI


def load_image_as_mask(path: str) -> tuple[np.ndarray, float, int, int]:
    """
    Load image and return:
    - binary mask (uint8 0 or 255) of silhouette
    - pixels per mm (ppi / 25.4)
    - width_px, height_px
    Priority:
    - If alpha exists, use alpha > 0 as mask
    - Else greyscale + Otsu threshold
    Enhanced for better logo detection with stark contrast
    """
    pil = Image.open(path).convert("RGBA")
    ppi = get_image_ppi(pil)
    ppm = ppi / 25.4  # pixels per millimetre

    rgba = np.array(pil)
    h_px, w_px = rgba.shape[0], rgba.shape[1]
    alpha = rgba[:, :, 3]

    # Enhanced alpha channel handling
    if alpha.max() > 0 and alpha.mean() > 0:
        # Use alpha channel with slight threshold to handle anti-aliasing
        mask = (alpha > 128).astype(np.uint8) * 255
    else:
        # Enhanced grayscale processing for logos
        gray = cv2.cvtColor(rgba[:, :, :3], cv2.COLOR_RGB2GRAY)
        
        # Check if image appears to be white background with dark content
        mean_val = gray.mean()
        if mean_val > 200:  # Likely white background
            # For white backgrounds, invert to make text/logos white
            gray = 255 - gray
            INVERT_INPUT_LOCAL = True
        else:
            INVERT_INPUT_LOCAL = INVERT_INPUT
            
        if INVERT_INPUT_LOCAL and not (mean_val > 200):
            gray = 255 - gray
            
        # Use adaptive threshold for better logo detection
        # Try Otsu first
        _, mask_otsu = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Also try adaptive threshold for comparison
        mask_adaptive = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                            cv2.THRESH_BINARY, 11, 2)
        
        # Use the mask that captures more detail (has more white pixels, assuming dark text on light bg)
        if np.sum(mask_adaptive) > np.sum(mask_otsu):
            mask = mask_adaptive
        else:
            mask = mask_otsu

    # Apply slight Gaussian blur to smooth pixelated edges before morphological operations
    if GAUSSIAN_BLUR_RADIUS > 0:
        mask = cv2.GaussianBlur(mask, (GAUSSIAN_BLUR_RADIUS*2+1, GAUSSIAN_BLUR_RADIUS*2+1), 0)
        # Re-threshold after blur
        _, mask = cv2.threshold(mask, 127, 255, cv2.THRESH_BINARY)
    
    # Enhanced morphological operations for cleaner results (smaller kernel for typography)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (KERNEL_CLOSE, KERNEL_CLOSE))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    
    # Minimal noise removal to preserve fine details
    kernel_tiny = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (1, 1))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel_tiny)

    return mask, ppm, w_px, h_px


def find_all_significant_contours(mask: np.ndarray, ppm: float) -> list[np.ndarray]:
    """
    Find ALL external contours that meet minimum area requirements.
    Returns list of contours as Nx2 integer points (pixel space).
    Filters out tiny islands that are likely noise.
    """
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, CONTOUR_CHAIN_APPROX)
    if not contours:
        raise RuntimeError("No contours found. Check contrast or masking.")
    
    significant_contours = []
    min_area_px = MIN_ISLAND_AREA_MM2 * (ppm ** 2)  # Convert mm² to pixels²
    
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area >= min_area_px:
            significant_contours.append(cnt.reshape(-1, 2))  # Nx2
    
    if not significant_contours:
        # If no contours meet the minimum area, take the largest one anyway
        largest = max(contours, key=cv2.contourArea)
        significant_contours = [largest.reshape(-1, 2)]
    
    # Sort by area (largest first) for consistent ordering
    significant_contours.sort(key=lambda cnt: cv2.contourArea(cnt.reshape(-1, 1, 2)), reverse=True)
    
    return significant_contours


def px_to_mm_closed(points_px: np.ndarray, ppm: float, height_px: int) -> np.ndarray:
    """
    Convert pixel coordinates to millimetres with Y-axis corrected for CAD.
    Pixel origin is top-left; CAD is bottom-left. Use y' = (H - y) / ppm.
    Returns a closed Nx2 float array in mm.
    """
    pts = points_px.astype(np.float64)
    x_mm = pts[:, 0] / ppm
    y_mm = (height_px - pts[:, 1]) / ppm  # flip Y so output is upright in CAD
    out = np.column_stack([x_mm, y_mm])

    # Ensure closed
    if not np.allclose(out[0], out[-1]):
        out = np.vstack([out, out[0]])
    return out


def smooth_contour_savitzky_golay(points_mm: np.ndarray, window_length: int = 5, polyorder: int = 3) -> np.ndarray:
    """
    Apply Savitzky-Golay filter to smooth contour points while preserving shape.
    This creates much smoother curves suitable for high-quality CAD output.
    """
    
    pts = points_mm.astype(np.float64)
    if len(pts) < window_length:
        return pts
        
    # Ensure closed contour
    if not np.allclose(pts[0], pts[-1]):
        pts = np.vstack([pts, pts[0]])
    
    # Extend the contour cyclically for better edge handling
    n_extend = window_length // 2
    extended_x = np.concatenate([pts[-n_extend-1:-1, 0], pts[:, 0], pts[1:n_extend+1, 0]])
    extended_y = np.concatenate([pts[-n_extend-1:-1, 1], pts[:, 1], pts[1:n_extend+1, 1]])
    
    # Apply Savitzky-Golay filter
    smooth_x = savgol_filter(extended_x, window_length, polyorder)[n_extend:-n_extend]
    smooth_y = savgol_filter(extended_y, window_length, polyorder)[n_extend:-n_extend]
    
    smoothed = np.column_stack([smooth_x, smooth_y])
    
    # Ensure closed
    if not np.allclose(smoothed[0], smoothed[-1]):
        smoothed = np.vstack([smoothed, smoothed[0]])
    
    return smoothed


def simplify_contour_mm(points_mm: np.ndarray) -> np.ndarray:
    """
    Douglas–Peucker simplification in millimetres.
    Epsilon is a fraction of the perimeter for scale independence.
    """
    # cv2.approxPolyDP expects (N,1,2)
    pts = points_mm.astype(np.float64)
    if not np.allclose(pts[0], pts[-1]):
        pts = np.vstack([pts, pts[0]])

    peri = cv2.arcLength(pts.reshape(-1, 1, 2).astype(np.float32), True)
    epsilon = max(0.01, SIMPLIFY_RATIO * peri)  # small floor to avoid over-collapse
    approx = cv2.approxPolyDP(pts.reshape(-1, 1, 2).astype(np.float32), epsilon, True)
    approx = approx.reshape(-1, 2)

    # Ensure closed
    if not np.allclose(approx[0], approx[-1]):
        approx = np.vstack([approx, approx[0]])
    return approx


def distance(a, b) -> float:
    return math.hypot(float(b[0] - a[0]), float(b[1] - a[1]))


def resample_min_segment_mm(points_mm: np.ndarray, min_len_mm: float) -> np.ndarray:
    """
    Emit a closed polyline where consecutive vertices are at least min_len_mm apart.
    Works in millimetres. Produces a denser, even-spacing trace for better curvature fidelity.
    """
    pts = points_mm.astype(np.float64)
    if len(pts) < 3:
        return pts

    if not np.allclose(pts[0], pts[-1]):
        pts = np.vstack([pts, pts[0]])

    out = [pts[0].copy()]
    carry = 0.0

    for i in range(1, len(pts)):
        a = out[-1]
        b = pts[i]
        seg_len = distance(a, b)
        if seg_len == 0:
            continue

        dir_x = (b[0] - a[0]) / seg_len
        dir_y = (b[1] - a[1]) / seg_len

        dist_left = seg_len + carry
        step_from_a = max(min_len_mm - carry, 0.0)

        while dist_left >= min_len_mm - 1e-9:
            nx = a[0] + dir_x * step_from_a
            ny = a[1] + dir_y * step_from_a
            out.append(np.array([nx, ny], dtype=np.float64))
            dist_left -= min_len_mm
            step_from_a += min_len_mm

        carry = dist_left

    # Close
    if distance(out[-1], out[0]) > 0:
        out.append(out[0].copy())

    # Ensure not collapsed
    if len(out) < 4:
        raise RuntimeError("Resampling collapsed the outline. Adjust parameters.")
    return np.array(out)


def scale_mm(points_mm: np.ndarray, scale: float) -> np.ndarray:
    """
    Uniformly scale in millimetres.
    """
    scaled = points_mm.astype(np.float64) * float(scale)
    if not np.allclose(scaled[0], scaled[-1]):
        scaled = np.vstack([scaled, scaled[0]])
    return scaled


def write_dxf_mm_multiple_islands(islands_mm: list[np.ndarray], out_path: str) -> None:
    """
    Write multiple closed LWPOLYLINEs to DXF in millimetre units.
    Each island gets its own layer for easy management.
    """
    doc = ezdxf.new(DXF_VERSION)
    # Set INSUNITS to millimetres so most CAD apps treat values as mm
    doc.header["$INSUNITS"] = 4  # 4 = millimetre
    msp = doc.modelspace()
    
    for i, points_mm in enumerate(islands_mm):
        layer_name = f"{LAYER_PREFIX}{i+1:02d}"
        if layer_name not in doc.layers:
            doc.layers.new(name=layer_name)

        # Drop the repeated last point for LWPOLYLINE close=True
        pts = [(float(p[0]), float(p[1])) for p in points_mm[:-1]]
        msp.add_lwpolyline(pts, format="xy", close=True, dxfattribs={"layer": layer_name})
    
    # Also create a summary layer with all islands
    summary_layer = "ALL_ISLANDS"
    if summary_layer not in doc.layers:
        doc.layers.new(name=summary_layer)
    
    for points_mm in islands_mm:
        pts = [(float(p[0]), float(p[1])) for p in points_mm[:-1]]
        msp.add_lwpolyline(pts, format="xy", close=True, dxfattribs={"layer": summary_layer})
    
    doc.saveas(out_path)


def run_pipeline(image_path: str, save_folder: str) -> str:
    mask, ppm, w_px, h_px = load_image_as_mask(image_path)

    # Extract ALL significant contours
    contours_px = find_all_significant_contours(mask, ppm)
    
    processed_islands = []
    
    for i, cnt_px in enumerate(contours_px):
        # Convert to mm with Y corrected so output is upright in CAD
        cnt_mm = px_to_mm_closed(cnt_px, ppm, h_px)

        # Apply curve smoothing for high-quality typography (NEW)
        try:
            smooth_mm = smooth_contour_savitzky_golay(cnt_mm, window_length=7, polyorder=3)
        except Exception as e:
            print(f"Warning: Smoothing failed for island {i+1}, using original: {e}")
            smooth_mm = cnt_mm

        # Very conservative simplification to preserve smooth curves
        simp_mm = simplify_contour_mm(smooth_mm)

        # Resample with much smaller segments for smooth curves
        try:
            dense_mm = resample_min_segment_mm(simp_mm, MIN_SEGMENT_MM)
        except RuntimeError as e:
            print(f"Warning: Island {i+1} collapsed during resampling: {e}")
            continue

        # Scale export by 10x as requested
        scaled_mm = scale_mm(dense_mm, SCALE_EXPORT)

        # Round to preserve precision but avoid DXF overload
        rounded = np.round(scaled_mm.astype(np.float64), 4)  # Higher precision for smooth curves
        
        processed_islands.append(rounded)

    if not processed_islands:
        raise RuntimeError("No islands survived processing. Check parameters or image quality.")

    base = os.path.splitext(os.path.basename(image_path))[0]
    island_count = len(processed_islands)
    out_name = f"{base}__MultiIslandOutline__{island_count}islands__x{int(SCALE_EXPORT)}.dxf"
    out_path = os.path.join(save_folder, out_name)
    write_dxf_mm_multiple_islands(processed_islands, out_path)
    
    return out_path, island_count


def main():
    root = tk.Tk()
    root.withdraw()

    messagebox.showinfo("Multi-Island Silhouette Tracer", "Select an input image to trace (supports multiple disconnected shapes).")
    filetypes = [
        ("Images", "*.png;*.jpg;*.jpeg;*.bmp;*.tif;*.tiff"),
        ("All files", "*.*"),
    ]
    img_path = filedialog.askopenfilename(title="Choose silhouette image", filetypes=filetypes)
    if not img_path:
        messagebox.showwarning("Multi-Island Silhouette Tracer", "No image selected.")
        return

    save_dir = filedialog.askdirectory(title="Choose output folder")
    if not save_dir:
        messagebox.showwarning("Multi-Island Silhouette Tracer", "No output folder selected.")
        return

    try:
        out_path, island_count = run_pipeline(img_path, save_dir)
        messagebox.showinfo("Multi-Island Silhouette Tracer", 
                          f"DXF saved with {island_count} islands:\n{out_path}")
    except Exception as e:
        messagebox.showerror("Multi-Island Silhouette Tracer", f"Failed:\n{e}")
        raise


if __name__ == "__main__":
    # CLI usage: python script.py <image_path> <output_folder>
    if len(sys.argv) == 3:
        out, count = run_pipeline(sys.argv[1], sys.argv[2])
        print(f"DXF saved with {count} islands: {out}")
    else:
        main()
