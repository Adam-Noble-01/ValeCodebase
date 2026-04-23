#!/usr/bin/env python3
"""
=============================================================================
 WHITECARDVISION - THUMBNAIL BACKFILL HELPERS (SERVER)
=============================================================================
 FILE       : WhitecardVision__FlaskServer__ThumbnailBackfill__.py
 NAMESPACE  : Wv
 MODULE     : FlaskServer - ThumbnailBackfill
 PURPOSE    : Shared helpers for generating missing thumbnail files and
              backfilling missing thumbnail paths into project JSON data.
=============================================================================
"""

from __future__ import annotations

import json
from pathlib import Path

from WhitecardVision__FlaskServer__ProjectPaths__ import Wv__Server__AssertSafeRelativePath
from WhitecardVision__FlaskServer__Thumbnails__ import (
    Wv__Thumbnails__DeriveThumbPath,
    Wv__Thumbnails__GenerateForFile,
    Wv__Thumbnails__IsAvailable,
)


# -----------------------------------------------------------------------------
# REGION | Thumbnail Backfill Helpers
# -----------------------------------------------------------------------------


# HELPER FUNCTION | Create thumb files for all project images if missing
# ------------------------------------------------------------
def Wv__Server__GenerateMissingProjectThumbFiles(project_dir: Path) -> int:
    if not Wv__Thumbnails__IsAvailable():
        return 0

    image_roots = (
        "01__ImageInput__WhitecardImage",
        "02__ImageInput__MaterialsReference",
        "03__ImageInput__StyleReference",
        "10__ImageInput__EditModeImages",
        "20__FinalExport__RenderMode",
        "30__FinalExport__EditMode",
    )
    generated_count = 0
    for root_name in image_roots:
        root_path = project_dir / root_name
        if not root_path.is_dir():
            continue
        for file_path in root_path.rglob("*"):
            if not file_path.is_file():
                continue
            if file_path.suffix.lower() not in (".png", ".jpg", ".jpeg"):
                continue
            if file_path.name.endswith("__thumb240.jpg"):
                continue
            thumb_path = Wv__Thumbnails__DeriveThumbPath(file_path)
            if thumb_path.is_file():
                continue
            if Wv__Thumbnails__GenerateForFile(file_path):
                generated_count += 1
    return generated_count
# ------------------------------------------------------------


# HELPER FUNCTION | Ensure one relative image path has a valid thumb path
# ------------------------------------------------------------
def Wv__Server__EnsureThumbForRelativeImage(image_rel_path: str, app_root_path: Path) -> str:
    image_rel_path = str(image_rel_path or "").strip()
    if not image_rel_path:
        return ""
    try:
        Wv__Server__AssertSafeRelativePath(image_rel_path)
    except ValueError:
        return ""

    source_file_path = (app_root_path / image_rel_path).resolve()
    try:
        source_file_path.relative_to(app_root_path)
    except ValueError:
        return ""
    if not source_file_path.is_file():
        return ""

    thumb_path = Wv__Thumbnails__DeriveThumbPath(source_file_path)
    if not thumb_path.is_file():
        generated_thumb_path = Wv__Thumbnails__GenerateForFile(source_file_path)
        if generated_thumb_path:
            thumb_path = generated_thumb_path
    if not thumb_path.is_file():
        return ""
    return thumb_path.relative_to(app_root_path).as_posix()
# ------------------------------------------------------------


# HELPER FUNCTION | Populate missing thumb fields in project JSON
# ------------------------------------------------------------
def Wv__Server__BackfillProjectJsonThumbPaths(project_dir: Path, project_name: str, app_root_path: Path) -> int:
    json_path = project_dir / f"{project_name}__WcVisData__.json"
    if not json_path.is_file():
        return 0

    try:
        project_json = json.loads(json_path.read_text(encoding="utf-8") or "{}")
    except Exception:
        return 0

    updated_fields = 0
    render_group = project_json.get("Wv__Project__RenderGroup", {}) or {}
    whitecard_block = render_group.get("Wv__Project__RenderGroup__Whitecard", {}) or {}

    whitecard_thumb = Wv__Server__EnsureThumbForRelativeImage(
        whitecard_block.get("Wv__Whitecard__ImagePath", ""),
        app_root_path,
    )
    if whitecard_thumb and not whitecard_block.get("Wv__Whitecard__ImageThumbPath"):
        whitecard_block["Wv__Whitecard__ImageThumbPath"] = whitecard_thumb
        updated_fields += 1

    render_thumb = Wv__Server__EnsureThumbForRelativeImage(
        render_group.get("Wv__Project__RenderGroup__LastOutputPath", ""),
        app_root_path,
    )
    if render_thumb and not render_group.get("Wv__Project__RenderGroup__LastOutputThumbPath"):
        render_group["Wv__Project__RenderGroup__LastOutputThumbPath"] = render_thumb
        updated_fields += 1

    for list_key in ("Wv__Project__RenderGroup__MaterialReferences", "Wv__Project__RenderGroup__StyleReferences"):
        refs_array = render_group.get(list_key, []) or []
        for ref_entry in refs_array:
            ref_thumb = Wv__Server__EnsureThumbForRelativeImage(
                ref_entry.get("Wv__Reference__ImagePath", ""),
                app_root_path,
            )
            if ref_thumb and not ref_entry.get("Wv__Reference__ThumbPath"):
                ref_entry["Wv__Reference__ThumbPath"] = ref_thumb
                updated_fields += 1

    project_json["Wv__Project__RenderGroup"] = render_group
    render_group["Wv__Project__RenderGroup__Whitecard"] = whitecard_block

    edit_iterations = project_json.get("Wv__Project__EditIterations", []) or []
    for iteration_entry in edit_iterations:
        base_thumb = Wv__Server__EnsureThumbForRelativeImage(
            iteration_entry.get("Wv__EditIteration__BaseImagePath", ""),
            app_root_path,
        )
        if base_thumb and not iteration_entry.get("Wv__EditIteration__BaseImageThumbPath"):
            iteration_entry["Wv__EditIteration__BaseImageThumbPath"] = base_thumb
            updated_fields += 1

        output_thumb = Wv__Server__EnsureThumbForRelativeImage(
            iteration_entry.get("Wv__EditIteration__LastOutputPath", ""),
            app_root_path,
        )
        if output_thumb and not iteration_entry.get("Wv__EditIteration__LastOutputThumbPath"):
            iteration_entry["Wv__EditIteration__LastOutputThumbPath"] = output_thumb
            updated_fields += 1

    if updated_fields > 0:
        try:
            json_path.write_text(json.dumps(project_json, indent=4, ensure_ascii=False), encoding="utf-8")
        except Exception:
            return 0

    return updated_fields
# ------------------------------------------------------------


# endregion ----------------------------------------------------
