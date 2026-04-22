#!/usr/bin/env python3
"""
=============================================================================
 WHITECARDVISION - THUMBNAIL GENERATOR (SERVER)
=============================================================================
 FILE       : WhitecardVision__FlaskServer__Thumbnails__.py
 NAMESPACE  : Wv
 MODULE     : FlaskServer - Thumbnails
 PURPOSE    : Generate 240px JPG thumbnails beside source images.
=============================================================================
"""

from __future__ import annotations

from pathlib import Path


# -----------------------------------------------------------------------------
# REGION | Thumbnail constants
# -----------------------------------------------------------------------------

WV__THUMB__MAX_EDGE_PX    = 240
WV__THUMB__JPEG_QUALITY   = 78
WV__THUMB__SUFFIX         = "__thumb240.jpg"

try:
    from PIL import Image
    WV__THUMB__PIL_AVAILABLE = True
except Exception:
    Image = None
    WV__THUMB__PIL_AVAILABLE = False

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Thumbnail helpers
# -----------------------------------------------------------------------------


# FUNCTION | Report whether PIL is currently importable
# ------------------------------------------------------------
def Wv__Thumbnails__IsAvailable() -> bool:
    return WV__THUMB__PIL_AVAILABLE
# ------------------------------------------------------------


# FUNCTION | Build sibling thumb path for a given source image path
# ------------------------------------------------------------
def Wv__Thumbnails__DeriveThumbPath(source_file_path: Path) -> Path:
    return source_file_path.with_name(source_file_path.stem + WV__THUMB__SUFFIX)
# ------------------------------------------------------------


# FUNCTION | Return expected thumb path as app-relative string
# ------------------------------------------------------------
def Wv__Thumbnails__DeriveThumbRelPath(source_file_path: Path, app_root_path: Path) -> str:
    thumb_file_path = Wv__Thumbnails__DeriveThumbPath(source_file_path)
    return thumb_file_path.relative_to(app_root_path).as_posix()
# ------------------------------------------------------------


# FUNCTION | Generate a 240p JPG thumbnail for one source file
# ------------------------------------------------------------
def Wv__Thumbnails__GenerateForFile(source_file_path: Path) -> Path | None:
    if not WV__THUMB__PIL_AVAILABLE:
        return None
    if not source_file_path.is_file():
        return None

    thumb_file_path = Wv__Thumbnails__DeriveThumbPath(source_file_path)
    try:
        with Image.open(source_file_path) as source_image:
            rgb_image = source_image.convert("RGB")
            rgb_image.thumbnail((WV__THUMB__MAX_EDGE_PX, WV__THUMB__MAX_EDGE_PX), Image.Resampling.LANCZOS)
            rgb_image.save(
                thumb_file_path,
                format="JPEG",
                quality=WV__THUMB__JPEG_QUALITY,
                optimize=True,
                progressive=False,
            )
        return thumb_file_path
    except Exception as thumbnail_error:
        print(f"[THUMB] Failed for {source_file_path}: {thumbnail_error}")
        return None
# ------------------------------------------------------------


# endregion ----------------------------------------------------

