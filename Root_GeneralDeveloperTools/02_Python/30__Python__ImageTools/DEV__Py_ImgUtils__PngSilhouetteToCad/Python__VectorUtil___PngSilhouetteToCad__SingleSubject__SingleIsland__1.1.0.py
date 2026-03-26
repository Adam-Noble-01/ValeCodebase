#!/usr/bin/env python3
# Silhouette Tracer — Image To Closed DXF Polyline (Scaled 10x, Min 1 mm Segments, Corrected Y)
# Author: Noble Architecture tooling helper
# Python 3.10+

import os
import sys
import math
import tkinter as tk
from tkinter import filedialog, messagebox

import numpy as np
from PIL import Image, TiffImagePlugin
import cv2
import ezdxf


# --------------------------------
# Configuration
# --------------------------------
SCALE_EXPORT   = 10.0               # Final output scale factor (10x as requested)
MIN_SEGMENT_MM = 1.0                # Do not allow any polyline segment shorter than this
SIMPLIFY_RATIO = 0.0005             # Lower value preserves more detail than before
KERNEL_CLOSE   = 3                  # Morphological close to tidy edges
INVERT_INPUT   = False              # Set True if objects are white on dark
LAYER_NAME     = "OUTLINE"
DXF_VERSION    = "R2018"            # Any ezdxf supported version
DEFAULT_PPI    = 96.0               # Used when image has no reliable resolution metadata
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
    """
    pil = Image.open(path).convert("RGBA")
    ppi = get_image_ppi(pil)
    ppm = ppi / 25.4  # pixels per millimetre

    rgba = np.array(pil)
    h_px, w_px = rgba.shape[0], rgba.shape[1]
    alpha = rgba[:, :, 3]

    if alpha.max() > 0 and alpha.mean() > 0:
        mask = (alpha > 0).astype(np.uint8) * 255
    else:
        gray = cv2.cvtColor(rgba[:, :, :3], cv2.COLOR_RGB2GRAY)
        if INVERT_INPUT:
            gray = 255 - gray
        _, mask = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (KERNEL_CLOSE, KERNEL_CLOSE))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

    return mask, ppm, w_px, h_px


def largest_contour(mask: np.ndarray) -> np.ndarray:
    """
    Find largest external contour as Nx2 integer points (pixel space).
    """
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not contours:
        raise RuntimeError("No contour found. Check contrast or masking.")
    cnt = max(contours, key=cv2.contourArea)
    return cnt.reshape(-1, 2)  # Nx2


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


def write_dxf_mm(points_mm: np.ndarray, out_path: str) -> None:
    """
    Write a closed LWPOLYLINE to DXF in millimetre units.
    """
    doc = ezdxf.new(DXF_VERSION)
    # Set INSUNITS to millimetres so most CAD apps treat values as mm
    doc.header["$INSUNITS"] = 4  # 4 = millimetre
    msp = doc.modelspace()
    if LAYER_NAME not in doc.layers:
        doc.layers.new(name=LAYER_NAME)

    # Drop the repeated last point for LWPOLYLINE close=True
    pts = [(float(p[0]), float(p[1])) for p in points_mm[:-1]]
    msp.add_lwpolyline(pts, format="xy", close=True, dxfattribs={"layer": LAYER_NAME})
    doc.saveas(out_path)


def run_pipeline(image_path: str, save_folder: str) -> str:
    mask, ppm, w_px, h_px = load_image_as_mask(image_path)

    # Extract pixels, convert to mm with Y corrected so output is upright in CAD
    cnt_px = largest_contour(mask)
    cnt_mm = px_to_mm_closed(cnt_px, ppm, h_px)

    # Simplify in mm for scale-independent behaviour, with conservative epsilon
    simp_mm = simplify_contour_mm(cnt_mm)

    # Resample so no segment is shorter than MIN_SEGMENT_MM
    dense_mm = resample_min_segment_mm(simp_mm, MIN_SEGMENT_MM)

    # Scale export by 10x as requested
    scaled_mm = scale_mm(dense_mm, SCALE_EXPORT)

    # Round very gently to micrometres then to 0.01 mm to avoid DXF overload while keeping detail
    rounded = np.round(scaled_mm.astype(np.float64), 3)

    base = os.path.splitext(os.path.basename(image_path))[0]
    out_name = f"{base}__OutlineToCadExport__x{int(SCALE_EXPORT)}.dxf"
    out_path = os.path.join(save_folder, out_name)
    write_dxf_mm(rounded, out_path)
    return out_path


def main():
    root = tk.Tk()
    root.withdraw()

    messagebox.showinfo("Silhouette Tracer", "Select an input image to trace.")
    filetypes = [
        ("Images", "*.png;*.jpg;*.jpeg;*.bmp;*.tif;*.tiff"),
        ("All files", "*.*"),
    ]
    img_path = filedialog.askopenfilename(title="Choose silhouette image", filetypes=filetypes)
    if not img_path:
        messagebox.showwarning("Silhouette Tracer", "No image selected.")
        return

    save_dir = filedialog.askdirectory(title="Choose output folder")
    if not save_dir:
        messagebox.showwarning("Silhouette Tracer", "No output folder selected.")
        return

    try:
        out_path = run_pipeline(img_path, save_dir)
        messagebox.showinfo("Silhouette Tracer", f"DXF saved:\n{out_path}")
    except Exception as e:
        messagebox.showerror("Silhouette Tracer", f"Failed:\n{e}")
        raise


if __name__ == "__main__":
    # CLI usage: python script.py <image_path> <output_folder>
    if len(sys.argv) == 3:
        out = run_pipeline(sys.argv[1], sys.argv[2])
        print(f"DXF saved: {out}")
    else:
        main()
