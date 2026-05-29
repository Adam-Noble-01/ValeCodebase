# =============================================================================
# NOBLEIMAGETOOLS - SERVER FILE MANAGER
# =============================================================================
#
# FILE       : NobleImageTools__Server__FileManager__.py
# NAMESPACE  : NobleImageTools
# MODULE     : Server - File Manager
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Provides server-side file system browsing and image loading.
#              The browse endpoint returns directory listings; the load endpoint
#              reads an image, returns dimensions and a base64 data URL for
#              display on the canvas.
# CREATED    : 28-May-2026
#
# =============================================================================

import base64
import os
import re
from pathlib import Path

# -----------------------------------------------------------------------------
# REGION | Constants
# -----------------------------------------------------------------------------

SUPPORTED_EXTENSIONS = {                                             # <-- Image formats supported for loading
    ".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".tif", ".gif"
}

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Browse
# -----------------------------------------------------------------------------

def NobleImageTools__Files__Browse(path: str, dirs_only: bool = False) -> dict:
    """
    FUNCTION | Return a sorted listing of files/dirs at a path.
    If path is empty, returns drive roots on Windows or '/' on Unix.
    """

    if not path or path.strip() in ("", "/", "\\"):
        path = NobleImageTools__Files__GetDefaultBrowsePath()

    browse_path = Path(path)

    if not browse_path.exists():
        browse_path = browse_path.parent if browse_path.parent.exists() else Path.home()

    if not browse_path.is_dir():
        browse_path = browse_path.parent

    entries = []

    try:
        children = sorted(browse_path.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower()))
    except PermissionError:
        children = []

    for child in children:
        is_dir  = child.is_dir()
        ext     = child.suffix.lower()

        if dirs_only and not is_dir:
            continue

        if not is_dir and ext not in SUPPORTED_EXTENSIONS:
            continue

        try:
            entries.append({
                "name"   : child.name,
                "path"   : str(child),
                "is_dir" : is_dir
            })
        except OSError:
            pass

    return {
        "current_path" : str(browse_path),
        "entries"      : entries
    }


def NobleImageTools__Files__GetDefaultBrowsePath() -> str:
    """
    HELPER FUNCTION | Return a sensible default start path for the browser.
    Uses Pictures folder on Windows, home directory otherwise.
    """
    home = Path.home()

    pictures = home / "Pictures"
    if pictures.exists():
        return str(pictures)

    desktop = home / "Desktop"
    if desktop.exists():
        return str(desktop)

    return str(home)

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Image Load
# -----------------------------------------------------------------------------

def NobleImageTools__Files__LoadImage(file_path: str) -> dict:
    """
    FUNCTION | Read an image file and return its dimensions + base64 data URL.
    Raises FileNotFoundError or ValueError for invalid paths/types.
    """
    from PIL import Image

    path = Path(file_path)

    if not path.is_file():
        raise FileNotFoundError(f"File not found: {file_path}")

    if path.suffix.lower() not in SUPPORTED_EXTENSIONS:
        raise ValueError(f"Unsupported file type: {path.suffix}")

    img     = Image.open(path)
    width   = img.width
    height  = img.height

    img_rgb = img.convert("RGB")

    with open(path, "rb") as fh:
        raw_bytes = fh.read()

    mime_map = {
        ".png"  : "image/png",
        ".jpg"  : "image/jpeg",
        ".jpeg" : "image/jpeg",
        ".webp" : "image/webp",
        ".bmp"  : "image/bmp",
        ".tiff" : "image/tiff",
        ".tif"  : "image/tiff",
        ".gif"  : "image/gif"
    }
    mime        = mime_map.get(path.suffix.lower(), "image/png")
    b64         = base64.b64encode(raw_bytes).decode("ascii")
    data_url    = f"data:{mime};base64,{b64}"

    return {
        "path"      : str(path),
        "filename"  : path.name,
        "width"     : width,
        "height"    : height,
        "data_url"  : data_url
    }

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Image Upload (from browser multipart)
# -----------------------------------------------------------------------------

def NobleImageTools__Files__UploadImage(file_storage, uploads_dir: str) -> dict:
    """
    FUNCTION | Accept a Werkzeug FileStorage object (from Flask request.files),
    save it to the uploads directory, and return the same payload as LoadImage.
    """
    from PIL import Image

    safe_name   = re.sub(r"[^\w.\-]", "_", Path(file_storage.filename).name or "upload.png")
    uploads_path = Path(uploads_dir)
    uploads_path.mkdir(parents=True, exist_ok=True)

    dest        = uploads_path / safe_name

    file_storage.save(str(dest))

    img         = Image.open(dest)
    width       = img.width
    height      = img.height

    with open(dest, "rb") as fh:
        raw_bytes   = fh.read()

    ext         = dest.suffix.lower()
    mime_map    = {
        ".png"  : "image/png",  ".jpg" : "image/jpeg", ".jpeg": "image/jpeg",
        ".webp" : "image/webp", ".bmp" : "image/bmp",  ".tiff": "image/tiff",
        ".tif"  : "image/tiff", ".gif" : "image/gif"
    }
    mime        = mime_map.get(ext, "image/png")
    b64         = base64.b64encode(raw_bytes).decode("ascii")
    data_url    = f"data:{mime};base64,{b64}"

    return {
        "path"      : str(dest),
        "filename"  : dest.name,
        "width"     : width,
        "height"    : height,
        "data_url"  : data_url
    }

# endregion -------------------------------------------------------------------
