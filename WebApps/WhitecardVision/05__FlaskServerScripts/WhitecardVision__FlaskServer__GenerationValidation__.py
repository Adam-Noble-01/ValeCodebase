#!/usr/bin/env python3
"""
=============================================================================
 WHITECARDVISION - GENERATION VALIDATION HELPERS (SERVER)
=============================================================================
 FILE       : WhitecardVision__FlaskServer__GenerationValidation__.py
 NAMESPACE  : Wv
 MODULE     : FlaskServer - GenerationValidation
 PURPOSE    : Shared validators used by generation endpoints.
=============================================================================
"""

from __future__ import annotations

import base64
import io

from WhitecardVision__FlaskServer__AspectRatio__ import Wv__AspectRatio__SnapToSupported


# -----------------------------------------------------------------------------
# REGION | Generation Validators
# -----------------------------------------------------------------------------


# HELPER FUNCTION | Revalidate that parts[0] is a Whitecard whose aspect matches
# ------------------------------------------------------------
def Wv__Server__ValidateFirstImageAspectRatio(request_shell: dict, declared_aspect_ratio: str) -> tuple[int, str] | None:
    if not declared_aspect_ratio:
        return None

    contents_list = request_shell.get("contents") or []
    if not contents_list:
        return (400, "contents[] missing")
    parts_list = contents_list[0].get("parts") or []
    if not parts_list:
        return (400, "contents[0].parts[] missing")

    first_part   = parts_list[0]
    inline_block = first_part.get("inlineData") or first_part.get("inline_data") or {}
    base64_data  = inline_block.get("data") or ""
    if not base64_data:
        return (400, "First part must be the Whitecard image as inlineData")

    try:
        decoded_bytes = base64.b64decode(base64_data)
        import struct as _struct
        if decoded_bytes[:8] == b"\x89PNG\r\n\x1a\n":
            width_px, height_px = _struct.unpack(">II", decoded_bytes[16:24])
        elif decoded_bytes[:2] == b"\xff\xd8":
            temp_stream = io.BytesIO(decoded_bytes)
            temp_stream.read(2)
            width_px = height_px = 0
            while True:
                marker_bytes = temp_stream.read(2)
                if len(marker_bytes) < 2: break
                if marker_bytes[0] != 0xFF: break
                marker_code = marker_bytes[1]
                if marker_code in (0xD8, 0xD9): break
                segment_len = _struct.unpack(">H", temp_stream.read(2))[0]
                if 0xC0 <= marker_code <= 0xCF and marker_code not in (0xC4, 0xC8, 0xCC):
                    sof_payload = temp_stream.read(segment_len - 2)
                    height_px = _struct.unpack(">H", sof_payload[1:3])[0]
                    width_px  = _struct.unpack(">H", sof_payload[3:5])[0]
                    break
                temp_stream.seek(segment_len - 2, 1)
            if not width_px or not height_px:
                return None
        else:
            return None
        ratio_info = Wv__AspectRatio__SnapToSupported(int(width_px), int(height_px))
    except Exception as probe_error:
        print(f"[WARN] Could not probe first image dims: {probe_error}")
        return None

    if ratio_info["snappedAspectRatio"] != declared_aspect_ratio:
        return (
            400,
            f"aspectRatio mismatch: Whitecard snaps to {ratio_info['snappedAspectRatio']} "
            f"(raw {ratio_info['rawRatio']}) but payload declared {declared_aspect_ratio}. "
            f"Refusing to generate - outputs would not composite."
        )
    return None
# ------------------------------------------------------------


# endregion ----------------------------------------------------
