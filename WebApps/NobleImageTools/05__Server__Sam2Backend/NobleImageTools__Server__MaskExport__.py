# =============================================================================
# NOBLEIMAGETOOLS - SERVER MASK EXPORT
# =============================================================================
#
# FILE       : NobleImageTools__Server__MaskExport__.py
# NAMESPACE  : NobleImageTools
# MODULE     : Server - Mask Export
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Generates and saves mask images in multiple formats.
#              B&W PNG        : white=mask, black=background (PS layer mask)
#              RGBA Cutout    : original pixels inside mask, transparent outside
#              Color ID Map   : all masks composited, each object = unique color
#              All ZIP        : ZIP archive of all B&W PNGs for all layers
# CREATED    : 28-May-2026
#
# =============================================================================

import io
import os
import re
import zipfile
from datetime import datetime
from pathlib import Path

# -----------------------------------------------------------------------------
# REGION | Path & Name Helpers
# -----------------------------------------------------------------------------

def NobleImageTools__Export__SanitiseName(name: str) -> str:
    """
    HELPER FUNCTION | Sanitise a layer name for use in a filename.
    """
    return re.sub(r"[^a-zA-Z0-9_\-]", "_", name or "mask").strip("_")[:40]


def NobleImageTools__Export__ResolveOutputDir(requested_dir: str, image_path: str, default_dir: str) -> Path:
    """
    HELPER FUNCTION | Resolve the output directory.
    Priority: requested_dir > directory of image_path > default_dir.
    """
    if requested_dir and Path(requested_dir).exists():
        return Path(requested_dir)

    if image_path:
        img_parent = Path(image_path).parent
        if img_parent.exists():
            return img_parent

    out_dir = Path(default_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    return out_dir


def NobleImageTools__Export__BuildFilename(base_name: str, layer_name: str, suffix: str, ext: str) -> str:
    """
    HELPER FUNCTION | Build a unique export filename with timestamp.
    """
    ts          = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_layer  = NobleImageTools__Export__SanitiseName(layer_name)
    safe_base   = NobleImageTools__Export__SanitiseName(base_name)
    return f"{safe_base}__{safe_layer}__{suffix}__{ts}{ext}"

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Mask Array Helpers
# -----------------------------------------------------------------------------

def NobleImageTools__Export__MaskToNumpyBool(mask_data: list, width: int, height: int):
    """
    HELPER FUNCTION | Convert flat JS boolean list to numpy bool array (H, W).
    """
    import numpy as np
    arr = np.array(mask_data, dtype=bool)
    return arr.reshape(height, width)


def NobleImageTools__Export__ParseHexColor(hex_color: str) -> tuple:
    """
    HELPER FUNCTION | Parse a CSS hex color string to (R, G, B) integers.
    """
    hex_color = hex_color.lstrip("#")
    if len(hex_color) == 3:
        hex_color = "".join(c * 2 for c in hex_color)
    return int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Export: Black & White PNG
# -----------------------------------------------------------------------------

def NobleImageTools__Export__SaveBW(body: dict, default_dir: str) -> dict:
    """
    FUNCTION | Export all visible layers as a single FLAT B&W PNG.
    All visible masks are unioned (OR) into one composite.
    White = any masked pixel. Black = background.
    """
    from PIL import Image
    import numpy as np

    image_path  = body.get("image_path", "")
    layers      = body.get("layers", [])
    output_dir  = body.get("output_dir", "")

    visible_layers = [l for l in layers if l.get("visible", True) and l.get("mask_data")]

    if not visible_layers:
        raise ValueError("No visible layers to export")

    source_img  = Image.open(image_path) if image_path and Path(image_path).exists() else None
    first_data  = visible_layers[0]["mask_data"]
    width       = source_img.width  if source_img else int(len(first_data) ** 0.5)
    height      = source_img.height if source_img else int(len(first_data) / width)

    flat_mask   = np.zeros(width * height, dtype=bool)
    for layer in visible_layers:
        flat_mask |= np.array(layer["mask_data"], dtype=bool)

    bw_img      = Image.fromarray((flat_mask.reshape(height, width) * 255).astype(np.uint8), mode="L")

    out_dir     = NobleImageTools__Export__ResolveOutputDir(output_dir, image_path, default_dir)
    base_name   = Path(image_path).stem if image_path else "export"
    ts          = datetime.now().strftime("%Y%m%d_%H%M%S")
    count       = len(visible_layers)
    filename    = f"{NobleImageTools__Export__SanitiseName(base_name)}__BW_Flat_{count}layers__{ts}.png"
    out_path    = out_dir / filename

    bw_img.save(str(out_path), "PNG")

    return {"filename": filename, "path": str(out_path), "layer_count": count}

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Export: RGBA Cutout
# -----------------------------------------------------------------------------

def NobleImageTools__Export__SaveRGBA(body: dict, default_dir: str) -> dict:
    """
    FUNCTION | Export all visible layers as a single flat RGBA cutout.
    Original image pixels where any mask is active; transparent elsewhere.
    """
    from PIL import Image
    import numpy as np

    image_path  = body.get("image_path", "")
    layers      = body.get("layers", [])
    output_dir  = body.get("output_dir", "")

    if not image_path or not Path(image_path).exists():
        raise FileNotFoundError(f"Source image not found: {image_path}")

    visible_layers = [l for l in layers if l.get("visible", True) and l.get("mask_data")]
    if not visible_layers:
        raise ValueError("No visible layers to export")

    source_img  = Image.open(image_path).convert("RGBA")
    width, height = source_img.size

    flat_mask   = np.zeros(width * height, dtype=bool)
    for layer in visible_layers:
        flat_mask |= np.array(layer["mask_data"], dtype=bool)

    flat_mask_2d = flat_mask.reshape(height, width)
    rgba_arr    = np.array(source_img)
    rgba_arr[~flat_mask_2d, 3] = 0

    rgba_img    = Image.fromarray(rgba_arr, "RGBA")

    out_dir     = NobleImageTools__Export__ResolveOutputDir(output_dir, image_path, default_dir)
    base_name   = Path(image_path).stem
    ts          = datetime.now().strftime("%Y%m%d_%H%M%S")
    count       = len(visible_layers)
    filename    = f"{NobleImageTools__Export__SanitiseName(base_name)}__RGBA_Flat_{count}layers__{ts}.png"
    out_path    = out_dir / filename

    rgba_img.save(str(out_path), "PNG")

    return {"filename": filename, "path": str(out_path), "layer_count": count}

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Export: Color ID Map
# -----------------------------------------------------------------------------

def NobleImageTools__Export__SaveColorId(body: dict, default_dir: str) -> dict:
    """
    FUNCTION | Export all layers as a color ID composite PNG.
    Each object is painted with its assigned color on a black background.
    Useful for Photoshop Select-by-Color-Range re-selection.
    """
    from PIL import Image
    import numpy as np

    image_path  = body.get("image_path", "")
    layers      = body.get("layers", [])
    output_dir  = body.get("output_dir", "")

    if not layers:
        raise ValueError("No layers provided")

    if image_path and Path(image_path).exists():
        ref_img     = Image.open(image_path)
        width, height = ref_img.width, ref_img.height
    else:
        first_mask  = layers[0].get("mask_data", [])
        size        = int(len(first_mask) ** 0.5)
        width = height = size

    color_id_arr = np.zeros((height, width, 3), dtype=np.uint8)

    for layer in layers:
        mask_data   = layer.get("mask_data", [])
        hex_color   = layer.get("color", "#ffffff")

        if not mask_data:
            continue

        mask_np     = NobleImageTools__Export__MaskToNumpyBool(mask_data, width, height)
        r, g, b     = NobleImageTools__Export__ParseHexColor(hex_color)

        color_id_arr[mask_np, 0] = r
        color_id_arr[mask_np, 1] = g
        color_id_arr[mask_np, 2] = b

    color_id_img = Image.fromarray(color_id_arr, "RGB")

    out_dir     = NobleImageTools__Export__ResolveOutputDir(output_dir, image_path, default_dir)
    base_name   = Path(image_path).stem if image_path else "export"
    ts          = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename    = f"{NobleImageTools__Export__SanitiseName(base_name)}__ColorID__{ts}.png"
    out_path    = out_dir / filename

    color_id_img.save(str(out_path), "PNG")

    return {"filename": filename, "path": str(out_path)}

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Export: All Layers ZIP
# -----------------------------------------------------------------------------

def NobleImageTools__Export__SaveAll(body: dict, default_dir: str) -> dict:
    """
    FUNCTION | Export all layers as individual B&W PNGs packaged in a ZIP.
    Also includes the Color ID composite.
    """
    from PIL import Image
    import numpy as np

    image_path  = body.get("image_path", "")
    layers      = body.get("layers", [])
    output_dir  = body.get("output_dir", "")

    if not layers:
        raise ValueError("No layers provided")

    out_dir     = NobleImageTools__Export__ResolveOutputDir(output_dir, image_path, default_dir)
    base_name   = Path(image_path).stem if image_path else "export"
    ts          = datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_name    = f"{NobleImageTools__Export__SanitiseName(base_name)}__AllMasks__{ts}.zip"
    zip_path    = out_dir / zip_name

    if image_path and Path(image_path).exists():
        ref_img     = Image.open(image_path)
        width, height = ref_img.width, ref_img.height
    else:
        first_mask  = layers[0].get("mask_data", [])
        size        = int(len(first_mask) ** 0.5)
        width = height = size

    color_id_arr = np.zeros((height, width, 3), dtype=np.uint8)

    with zipfile.ZipFile(str(zip_path), "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for layer in layers:
            mask_data   = layer.get("mask_data", [])
            layer_name  = layer.get("name", "mask")
            hex_color   = layer.get("color", "#ffffff")

            if not mask_data:
                continue

            mask_np = NobleImageTools__Export__MaskToNumpyBool(mask_data, width, height)

            bw_arr  = (mask_np * 255).astype(np.uint8)
            bw_img  = Image.fromarray(bw_arr, mode="L")

            bw_filename = NobleImageTools__Export__BuildFilename(
                base_name, layer_name, "BW_Mask", ".png"
            )

            bw_buffer = io.BytesIO()
            bw_img.save(bw_buffer, "PNG")
            zf.writestr(bw_filename, bw_buffer.getvalue())

            r, g, b = NobleImageTools__Export__ParseHexColor(hex_color)
            color_id_arr[mask_np, 0] = r
            color_id_arr[mask_np, 1] = g
            color_id_arr[mask_np, 2] = b

        color_id_img = Image.fromarray(color_id_arr, "RGB")
        cid_filename = f"{NobleImageTools__Export__SanitiseName(base_name)}__ColorID__{ts}.png"
        cid_buffer   = io.BytesIO()
        color_id_img.save(cid_buffer, "PNG")
        zf.writestr(cid_filename, cid_buffer.getvalue())

    return {"zip_filename": zip_name, "path": str(zip_path)}

# endregion -------------------------------------------------------------------
