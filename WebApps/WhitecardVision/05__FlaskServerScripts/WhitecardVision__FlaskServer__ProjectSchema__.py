#!/usr/bin/env python3
"""
=============================================================================
 WHITECARDVISION - PROJECT SCHEMA HELPERS (SERVER)
=============================================================================
 FILE       : WhitecardVision__FlaskServer__ProjectSchema__.py
 NAMESPACE  : Wv
 MODULE     : FlaskServer - ProjectSchema
 PURPOSE    : Build and mutate project JSON payload structures used by the
              local WhitecardVision server.
=============================================================================
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any


# FUNCTION | Build default project JSON seed
# ------------------------------------------------------------
def Wv__Server__BuildDefaultProjectJson(
    project_name: str,
    year_folder_name: str,
    description: str,
    schema_version: str,
    display_name: str = "",
) -> dict[str, Any]:
    now_iso = datetime.now(timezone.utc).isoformat()
    return {
        "Wv__ProjectFile__Metadata": {
            "Wv__ProjectFile__Metadata__ProjectName"        : display_name or project_name,
            "Wv__ProjectFile__Metadata__ProjectCode"        : project_name,
            "Wv__ProjectFile__Metadata__PreviousNames"      : [],
            "Wv__ProjectFile__Metadata__Description"        : description or "",
            "Wv__ProjectFile__Metadata__YearFolder"         : year_folder_name,
            "Wv__ProjectFile__Metadata__SchemaVersion"      : schema_version,
            "Wv__ProjectFile__Metadata__DateCreatedUtc"     : now_iso,
            "Wv__ProjectFile__Metadata__DateModifiedUtc"    : now_iso,
        },
        "Wv__Project__RenderGroup": {
            "Wv__Project__RenderGroup__Whitecard"           : {
                "Wv__Whitecard__ImagePath"                  : "",
                "Wv__Whitecard__ImageThumbPath"             : "",
                "Wv__Whitecard__Prompt"                     : "",
                "Wv__Whitecard__WidthPx"                    : 0,
                "Wv__Whitecard__HeightPx"                   : 0,
                "Wv__Whitecard__SnappedAspectRatio"         : "",
                "Wv__Whitecard__SnappedDeltaPct"            : 0.0,
            },
            "Wv__Project__RenderGroup__MaterialReferences" : [],
            "Wv__Project__RenderGroup__StyleReferences"    : [],
            "Wv__Project__RenderGroup__AvoidNotes"         : "",
            "Wv__Project__RenderGroup__ImageSize"          : "2K",
            "Wv__Project__RenderGroup__LastOutputPath"     : "",
            "Wv__Project__RenderGroup__LastOutputThumbPath": "",
        },
        "Wv__Project__EditIterations"                       : [],
        "Wv__Project__ActiveEditIterationId"                : "",
    }
# ------------------------------------------------------------


# FUNCTION | Recursively replace old folder id segment in every string value
# ------------------------------------------------------------
def Wv__Server__ReplaceProjectFolderSegmentInJson(value: Any, old_segment: str, new_segment: str) -> Any:
    if isinstance(value, dict):
        return {
            key_text: Wv__Server__ReplaceProjectFolderSegmentInJson(value_item, old_segment, new_segment)
            for key_text, value_item in value.items()
        }
    if isinstance(value, list):
        return [Wv__Server__ReplaceProjectFolderSegmentInJson(value_item, old_segment, new_segment) for value_item in value]
    if isinstance(value, str) and old_segment in value:
        return value.replace(old_segment, new_segment)
    return value
# ------------------------------------------------------------


# FUNCTION | Generate a stable slug from display name (allowlist + fallback)
# ------------------------------------------------------------
def Wv__Server__BuildCleanProjectSlug(display_name: str) -> str:
    slug_text = re.sub(r"[^A-Za-z0-9_\-]+", "_", str(display_name or "").strip())
    slug_text = re.sub(r"_+", "_", slug_text).strip("_- ")
    if not slug_text:
        slug_text = "Project"
    if not re.match(r"^[A-Za-z0-9]", slug_text):
        slug_text = f"P_{slug_text}"
    return slug_text[:64]
# ------------------------------------------------------------
