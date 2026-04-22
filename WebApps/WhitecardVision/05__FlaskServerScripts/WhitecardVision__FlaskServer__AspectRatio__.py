#!/usr/bin/env python3
"""
=============================================================================
 WHITECARDVISION - ASPECT RATIO RESOLVER (SERVER)
=============================================================================
 FILE       : WhitecardVision__FlaskServer__AspectRatio__.py
 NAMESPACE  : Wv
 MODULE     : FlaskServer - AspectRatio
 PURPOSE    : Read image dimensions via stdlib-only header parsing and snap
              the resulting ratio to the nearest supported Gemini aspect
              ratio string. Zero external deps (no Pillow).

 Supports PNG + JPEG (the only formats we accept for uploads).
 Reference enum locked from the official Gemini docs - do not reorder.
=============================================================================
"""

from __future__ import annotations

import math
import struct
from pathlib import Path


# -----------------------------------------------------------------------------
# REGION | Constants - Supported Gemini Aspect Ratios (Locked)
# -----------------------------------------------------------------------------

WV__ASPECT_RATIO__SUPPORTED_ENUM = (
    "1:1", "1:4", "1:8",
    "2:3", "3:2",
    "3:4", "4:3",
    "4:5", "5:4",
    "4:1", "8:1",
    "9:16", "16:9",
    "21:9",
)

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Dimension Parsers
# -----------------------------------------------------------------------------


# FUNCTION | Read width and height from a PNG or JPEG file on disk
# ------------------------------------------------------------
def Wv__AspectRatio__ReadImageDimensions(image_path: Path) -> tuple[int, int]:
    with image_path.open("rb") as image_file:
        head_bytes = image_file.read(24)

    if len(head_bytes) >= 8 and head_bytes[:8] == b"\x89PNG\r\n\x1a\n":
        width, height = struct.unpack(">II", head_bytes[16:24])
        return int(width), int(height)

    if len(head_bytes) >= 2 and head_bytes[:2] == b"\xff\xd8":
        return Wv__AspectRatio__ReadJpegDimensions(image_path)

    raise ValueError(f"Unsupported or corrupt image (not PNG or JPEG): {image_path.name}")
# ------------------------------------------------------------


# HELPER FUNCTION | Scan JPEG markers to locate SOFn dimensions
# ------------------------------------------------------------
def Wv__AspectRatio__ReadJpegDimensions(image_path: Path) -> tuple[int, int]:
    with image_path.open("rb") as jpeg_file:
        jpeg_file.read(2)                                                          # <-- Skip SOI marker 0xFFD8.
        while True:
            marker_bytes = jpeg_file.read(2)
            if len(marker_bytes) < 2:
                raise ValueError(f"Truncated JPEG: {image_path.name}")
            if marker_bytes[0] != 0xFF:
                raise ValueError(f"Invalid JPEG marker in {image_path.name}")

            marker_code = marker_bytes[1]
            if marker_code in (0xD8, 0xD9):
                raise ValueError(f"Unexpected JPEG marker 0x{marker_code:02X} in {image_path.name}")

            segment_length_bytes = jpeg_file.read(2)
            if len(segment_length_bytes) < 2:
                raise ValueError(f"Truncated JPEG segment length in {image_path.name}")
            segment_length = struct.unpack(">H", segment_length_bytes)[0]

            if 0xC0 <= marker_code <= 0xCF and marker_code not in (0xC4, 0xC8, 0xCC):
                sof_payload = jpeg_file.read(segment_length - 2)
                if len(sof_payload) < 5:
                    raise ValueError(f"Truncated SOF segment in {image_path.name}")
                height = struct.unpack(">H", sof_payload[1:3])[0]
                width  = struct.unpack(">H", sof_payload[3:5])[0]
                return int(width), int(height)

            jpeg_file.seek(segment_length - 2, 1)                                  # <-- Skip non-SOF segment payload.
# ------------------------------------------------------------


# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Ratio Snapping
# -----------------------------------------------------------------------------


# FUNCTION | Snap a raw (width, height) pair to the nearest supported ratio
# ------------------------------------------------------------
def Wv__AspectRatio__SnapToSupported(width_px: int, height_px: int) -> dict:
    if width_px <= 0 or height_px <= 0:
        raise ValueError(f"Invalid image dimensions: {width_px}x{height_px}")

    raw_ratio = width_px / height_px
    raw_log   = math.log(raw_ratio)

    best_ratio_string = WV__ASPECT_RATIO__SUPPORTED_ENUM[0]
    best_distance     = float("inf")

    for ratio_string in WV__ASPECT_RATIO__SUPPORTED_ENUM:
        numerator_text, denominator_text = ratio_string.split(":")
        candidate_ratio = int(numerator_text) / int(denominator_text)
        candidate_log   = math.log(candidate_ratio)
        distance        = abs(raw_log - candidate_log)
        if distance < best_distance:
            best_distance     = distance
            best_ratio_string = ratio_string

    snapped_numerator, snapped_denominator = (int(x) for x in best_ratio_string.split(":"))
    snapped_ratio_value = snapped_numerator / snapped_denominator
    delta_percentage    = abs((raw_ratio / snapped_ratio_value) - 1.0) * 100.0

    return {
        "widthPx"             : int(width_px),
        "heightPx"            : int(height_px),
        "rawRatio"            : round(raw_ratio, 6),
        "snappedAspectRatio"  : best_ratio_string,
        "snappedDeltaPct"     : round(delta_percentage, 3),
    }
# ------------------------------------------------------------


# FUNCTION | Resolve both dimensions and snapped ratio for a file on disk
# ------------------------------------------------------------
def Wv__AspectRatio__ResolveForFile(image_path: Path) -> dict:
    width_px, height_px = Wv__AspectRatio__ReadImageDimensions(image_path)
    return Wv__AspectRatio__SnapToSupported(width_px, height_px)
# ------------------------------------------------------------


# endregion ----------------------------------------------------
