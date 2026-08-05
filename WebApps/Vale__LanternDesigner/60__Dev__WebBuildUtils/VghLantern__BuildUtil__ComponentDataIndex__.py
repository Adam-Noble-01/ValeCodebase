# =============================================================================
# VGHLANTERN - BUILD UTILITY | COMPONENT DATA INDEX
# =============================================================================
#
# FILE       : VghLantern__BuildUtil__ComponentDataIndex__.py
# NAMESPACE  : VghLantern
# MODULE     : Dev - WebBuildUtils - ComponentDataIndex
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Walk the component library and regenerate the catalogue index
# CREATED    : 05-Aug-2026
#
# DESCRIPTION:
# - Scans 05__Data__LanternComponentLibrary for category folders and asset JSON
#   files, then writes VghLantern__ComponentDataIndex__.json.
# - The index is the app's cheap catalogue: it carries only what the editor needs
#   to list, filter and size a component. The heavy geometry stays in the asset
#   file and is fetched on demand by the runtime asset cache, because a single
#   unified asset export runs to one or two megabytes.
# - Handles both library schemas:
#     * Na__Asset__UnifiedComponentSchema - the SketchUp Component Editor Export
#       tab format, carrying Elevation2D / Plan2D / Mesh3D / ObjectHierarchy3D.
#     * The earlier hand-authored Profile2D format.
#
# ROLE DERIVATION:
# The unified exporter leaves ApplicableRoles empty because SketchUp has no
# concept of a lantern placement role. The folder IS the classification, so the
# role, category name and sort order come from CATEGORY_RULES below, keyed by
# folder name. Add a folder, add a rule - never hand-edit the generated index.
#
# USAGE:
#     python VghLantern__BuildUtil__ComponentDataIndex__.py
#
# =============================================================================

import json
import os
import re
import sys
from datetime import datetime

# -----------------------------------------------------------------------------
# REGION | Paths and Category Rules
# -----------------------------------------------------------------------------

APP_ROOT       = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIBRARY_DIR    = os.path.join(APP_ROOT, "05__Data__LanternComponentLibrary")
OUTPUT_PATH    = os.path.join(LIBRARY_DIR, "VghLantern__ComponentDataIndex__.json")
LIBRARY_ROOT   = "05__Data__LanternComponentLibrary/"

SCHEMA_VERSION = "2.0.0"

# CATEGORY RULES | Folder name to placement role and display classification
# ------------------------------------------------------------
# Keyed by the exact folder name. TypeToken is the singular word the asset file
# names use, so the display label builder can lift it out and read naturally.
CATEGORY_RULES = {
    "45__Roof__RidgeCaps": {
        "CategoryName" : "Ridge Caps",
        "Role"         : "finialBase",
        "TypeToken"    : "RidgeCap",
        "SortOrder"    : 10,
        "Description"  : "Ridge cap sections and the base blocks seating a finial onto the ridge."
    },
    "50__Roof__Finials": {
        "CategoryName" : "Finials",
        "Role"         : "finial",
        "TypeToken"    : "Finial",
        "SortOrder"    : 20,
        "Description"  : "Turned and cast finials placed at ridge ends and at the apex."
    },
    "55__Roof__Crestings": {
        "CategoryName" : "Crestings",
        "Role"         : "cresting",
        "TypeToken"    : "Cresting",
        "SortOrder"    : 30,
        "Description"  : "Repeating decorative cresting running along the ridge."
    },
    "60__Roof__Ventilation": {
        "CategoryName" : "Ventilation",
        "Role"         : "vent",
        "TypeToken"    : "Vent",
        "SortOrder"    : 40,
        "Description"  : "Opening roof vents replacing a glazing pane on a slope."
    }
}

SKIP_FILE_PREFIXES = ("VghLantern__ComponentDataIndex",)
SKIP_FOLDER_NAMES  = ("3dAssets__Glb",)

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Display Label Derivation
# -----------------------------------------------------------------------------

def na_derive_display_name(file_stem, type_token):
    """Turn 50_1001__Finial__Ball__ into 'Ball Finial'.

    The unified exporter writes the raw SketchUp component name into the
    metadata, which is the file stem again - no use as a UI label. The tokens
    after the leading product code carry the real description, and moving the
    type word to the end is what makes it read as English rather than as a path.
    """
    stem   = file_stem.strip("_")
    tokens = [t for t in stem.split("__") if t]

    # Drop a leading product code block (50_1001, VGH_FIN0001, ...)
    if tokens and re.match(r"^[A-Za-z]{0,4}_?\d+(_\d+)?$", tokens[0]):
        tokens = tokens[1:]

    # Drop namespace filler carried by the older hand-authored file names
    filler = ("component", "vghlantern")
    tokens = [t for t in tokens if t.lower() not in filler]

    # A legacy stem repeats its code after the namespace filler, e.g.
    # VghLantern__Component__VGH_FIN0001__BallAndSpikeFinial__
    if tokens and re.match(r"^[A-Za-z]{0,4}_?\d+(_\d+)?$", tokens[0]):
        tokens = tokens[1:]

    if not tokens:
        return stem

    # Move the type word to the end: ['Finial','Ball'] -> 'Ball Finial'
    if type_token and tokens[0].lower() == type_token.lower() and len(tokens) > 1:
        tokens = tokens[1:] + [tokens[0]]

    spaced = [re.sub(r"(?<=[a-z])(?=[A-Z])", " ", t) for t in tokens]
    return " ".join(spaced)


def na_derive_asset_id(asset_data, file_stem):
    """Prefer the exporter's product code, fall back to the file stem."""
    metadata = asset_data.get("Na__Asset__Metadata") or {}
    asset_id = str(metadata.get("Na__Asset__Metadata__Id") or "").strip()
    if asset_id:
        return asset_id
    return file_stem.strip("_")

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Asset Reading
# -----------------------------------------------------------------------------

def na_round(value):
    return round(float(value), 3) if isinstance(value, (int, float)) else None


def na_read_bbox_metrics(asset_data):
    """Pull placement metrics from the front elevation, then the plan.

    The origin point is the insertion axis, so what the editor needs is not just
    an overall height but how far the component reaches above and below that
    origin - that is what lets a renderer seat it correctly without loading the
    full geometry first.
    """
    metrics = {
        "OverallHeightMm"      : None,
        "HeightAboveOriginMm"  : None,
        "DepthBelowOriginMm"   : None,
        "WidthMm"              : None,
        "PlanDiameterMm"       : None
    }

    elevation = asset_data.get("Na__Asset__Elevation2D__Front") or {}
    bbox      = elevation.get("Na__Geometry__BoundingBox") or {}
    if bbox:
        metrics["OverallHeightMm"]     = na_round(bbox.get("Na__Geometry__Height_mm"))
        metrics["WidthMm"]             = na_round(bbox.get("Na__Geometry__Width_mm"))
        metrics["HeightAboveOriginMm"] = na_round(bbox.get("Na__Geometry__MaxY_mm"))
        min_y = bbox.get("Na__Geometry__MinY_mm")
        if isinstance(min_y, (int, float)):
            metrics["DepthBelowOriginMm"] = na_round(max(0.0, -float(min_y)))

    plan      = asset_data.get("Na__Asset__Plan2D__Top") or {}
    plan_bbox = plan.get("Na__Geometry__BoundingBox") or {}
    if plan_bbox:
        metrics["PlanDiameterMm"] = na_round(plan_bbox.get("Na__Geometry__Width_mm"))

    # Legacy Profile2D assets carry their own bounding box block
    if metrics["OverallHeightMm"] is None:
        profile   = asset_data.get("Na__Asset__Profile2D") or {}
        prof_bbox = profile.get("Na__Asset__Profile2D__BoundingBoxMm") or {}
        if prof_bbox:
            metrics["OverallHeightMm"]     = na_round(prof_bbox.get("HeightMm"))
            metrics["WidthMm"]             = na_round(prof_bbox.get("WidthMm"))
            metrics["HeightAboveOriginMm"] = na_round(prof_bbox.get("MaxY"))
            min_y = prof_bbox.get("MinY")
            if isinstance(min_y, (int, float)):
                metrics["DepthBelowOriginMm"] = na_round(max(0.0, -float(min_y)))

    placement = asset_data.get("Na__Asset__PlacementBehaviour") or {}
    if metrics["OverallHeightMm"] is None:
        metrics["OverallHeightMm"] = na_round(placement.get("Na__Asset__PlacementBehaviour__OverallHeightMm"))

    return metrics


def na_fmt(value):
    """One decimal place is ample for a thumbnail and keeps the index small."""
    return ("%.1f" % float(value)).rstrip("0").rstrip(".") or "0"


def na_build_preview_svg(asset_data):
    """Flatten the front elevation into one compact SVG path string.

    The card strip in the editor needs a picture of every component in the role
    before the user has chosen any of them. Loading a one-to-three megabyte asset
    file per card to draw a thumbnail would defeat the entire point of on-demand
    loading, so the drawable outline is baked into the index at build time and
    the heavy file is fetched only when a card is actually selected.

    SVG y runs downward while the export's y runs up, so every y is negated. That
    reflection also reverses arc winding, which is why the sweep flag is 0 for
    paths the exporter authored counter-clockwise.
    """
    elevation = asset_data.get("Na__Asset__Elevation2D__Front") or {}
    paths     = elevation.get("Na__Geometry__Paths")
    bbox      = elevation.get("Na__Geometry__BoundingBox") or {}

    # Legacy Profile2D assets: draw the closed outline instead
    if not paths:
        profile = asset_data.get("Na__Asset__Profile2D") or {}
        points  = profile.get("Na__Asset__Profile2D__Points")
        if not points:
            return None
        segments = ["M {0} {1}".format(na_fmt(points[0]["x"]), na_fmt(-points[0]["y"]))]
        for point in points[1:]:
            segments.append("L {0} {1}".format(na_fmt(point["x"]), na_fmt(-point["y"])))
        segments.append("Z")
        prof_bbox = profile.get("Na__Asset__Profile2D__BoundingBoxMm") or {}
        min_x  = float(prof_bbox.get("MinX", 0.0))
        max_y  = float(prof_bbox.get("MaxY", 0.0))
        width  = float(prof_bbox.get("WidthMm", 1.0))
        height = float(prof_bbox.get("HeightMm", 1.0))
        return {
            "ViewBox"  : "{0} {1} {2} {3}".format(na_fmt(min_x), na_fmt(-max_y), na_fmt(width), na_fmt(height)),
            "PathData" : " ".join(segments),
            "WidthMm"  : round(width, 3),
            "HeightMm" : round(height, 3)
        }

    segments = []
    for path in paths:
        path_type = path.get("PathType")

        if path_type == "Line":
            start = path.get("Start_mm") or {}
            end   = path.get("End_mm") or {}
            segments.append("M{0} {1}L{2} {3}".format(
                na_fmt(start.get("X", 0)), na_fmt(-start.get("Y", 0)),
                na_fmt(end.get("X", 0)),   na_fmt(-end.get("Y", 0))))

        elif path_type == "Arc":
            start  = path.get("StartPoint_mm") or {}
            end    = path.get("EndPoint_mm") or {}
            radius = float(path.get("Radius_mm") or 0)
            sweep  = abs(float(path.get("Sweep_deg") or 0))
            if radius <= 0:
                continue
            segments.append("M{0} {1}A{2} {2} 0 {3} 0 {4} {5}".format(
                na_fmt(start.get("X", 0)), na_fmt(-start.get("Y", 0)),
                na_fmt(radius), 1 if sweep > 180 else 0,
                na_fmt(end.get("X", 0)), na_fmt(-end.get("Y", 0))))

        elif path_type == "Circle":
            centre = path.get("Center_mm") or {}
            radius = float(path.get("Radius_mm") or 0)
            if radius <= 0:
                continue
            cx = float(centre.get("X", 0))
            cy = -float(centre.get("Y", 0))
            segments.append("M{0} {1}A{2} {2} 0 1 0 {3} {1}A{2} {2} 0 1 0 {0} {1}".format(
                na_fmt(cx - radius), na_fmt(cy), na_fmt(radius), na_fmt(cx + radius)))

        elif path_type == "Polygon":
            vertices = path.get("Vertices_mm") or []
            if len(vertices) < 3:
                continue
            poly = ["M{0} {1}".format(na_fmt(vertices[0].get("X", 0)), na_fmt(-vertices[0].get("Y", 0)))]
            for vertex in vertices[1:]:
                poly.append("L{0} {1}".format(na_fmt(vertex.get("X", 0)), na_fmt(-vertex.get("Y", 0))))
            poly.append("Z")
            segments.append("".join(poly))

    if not segments:
        return None

    min_x  = float(bbox.get("Na__Geometry__MinX_mm", 0.0))
    max_y  = float(bbox.get("Na__Geometry__MaxY_mm", 0.0))
    width  = float(bbox.get("Na__Geometry__Width_mm", 1.0)) or 1.0
    height = float(bbox.get("Na__Geometry__Height_mm", 1.0)) or 1.0

    return {
        "ViewBox"  : "{0} {1} {2} {3}".format(na_fmt(min_x), na_fmt(-max_y), na_fmt(width), na_fmt(height)),
        "PathData" : "".join(segments),
        "WidthMm"  : round(width, 3),
        "HeightMm" : round(height, 3)
    }


def na_read_mesh_counts(asset_data):
    mesh = asset_data.get("Na__Asset__Mesh3D")
    if not isinstance(mesh, dict):
        return None
    counts = mesh.get("Na__Geometry__Counts") or {}
    return {
        "VertexCount" : counts.get("Na__Geometry__VertexCount"),
        "FaceCount"   : counts.get("Na__Geometry__FaceCount"),
        "EdgeCount"   : counts.get("Na__Geometry__EdgeCount")
    }


def na_build_entry(folder_name, file_name, rule):
    file_path = os.path.join(LIBRARY_DIR, folder_name, file_name)
    file_stem = os.path.splitext(file_name)[0]

    try:
        with open(file_path, "r", encoding="utf-8") as handle:
            asset_data = json.load(handle)
    except (OSError, ValueError) as error:
        print("  !! Skipped {0}: {1}".format(file_name, error))
        return None

    meta       = asset_data.get("meta") or {}
    metadata   = asset_data.get("Na__Asset__Metadata") or {}
    vale_spec  = asset_data.get("Na__Asset__ValeSpecification") or {}
    placement  = asset_data.get("Na__Asset__PlacementBehaviour") or {}

    declared_roles = placement.get("Na__Asset__PlacementBehaviour__ApplicableRoles")
    roles = declared_roles if isinstance(declared_roles, list) and declared_roles else [rule["Role"]]

    has_elevation = isinstance(asset_data.get("Na__Asset__Elevation2D__Front"), dict)
    has_plan      = isinstance(asset_data.get("Na__Asset__Plan2D__Top"), dict)
    has_profile   = isinstance(asset_data.get("Na__Asset__Profile2D"), dict)
    has_mesh      = isinstance(asset_data.get("Na__Asset__Mesh3D"), dict)
    glb_url       = asset_data.get("Na__Asset__Glb3D__Url") or asset_data.get("Na__Asset__Glb3d__Url")

    metrics = na_read_bbox_metrics(asset_data)

    # Name priority: the Vale product name, then a hand-authored metadata name,
    # then a label derived from the file name. The unified exporter writes the
    # raw SketchUp component name into metadata - which is the file stem again -
    # so an echoed stem is rejected rather than shown as a label.
    metadata_name = str(metadata.get("Na__Asset__Metadata__Name") or "").strip()
    if metadata_name.strip("_") == file_stem.strip("_"):
        metadata_name = ""

    display_name = (str(vale_spec.get("Na__Asset__ValeSpec__ProductName") or "").strip()
                    or metadata_name
                    or na_derive_display_name(file_stem, rule.get("TypeToken")))

    entry = {
        "AssetId"              : na_derive_asset_id(asset_data, file_stem),
        "Name"                 : display_name,
        "CategoryId"           : folder_name,
        "CategoryName"         : rule["CategoryName"],
        "JsonUrl"              : "{0}/{1}".format(folder_name, file_name),
        "PreviewUrl"           : None,
        "ApplicableRoles"      : roles,
        "SchemaVersion"        : str(meta.get("schemaVersion") or "1.0.0"),
        "Has2dElevation"       : has_elevation,
        "Has2dPlan"            : has_plan,
        "Has2dProfile"         : has_profile,
        "Has3d"                : has_mesh or bool(glb_url),
        "Mesh3dInline"         : has_mesh,
        "Glb3dUrl"             : glb_url,
        "OverallHeightMm"      : metrics["OverallHeightMm"],
        "HeightAboveOriginMm"  : metrics["HeightAboveOriginMm"],
        "DepthBelowOriginMm"   : metrics["DepthBelowOriginMm"],
        "WidthMm"              : metrics["WidthMm"],
        "PlanDiameterMm"       : metrics["PlanDiameterMm"],
        "Revision"             : str(metadata.get("Na__Asset__Metadata__Revision") or "A"),
        "DataStatus"           : str(metadata.get("Na__Asset__Metadata__DataStatus") or ""),
        "ProductCode"          : str(vale_spec.get("Na__Asset__ValeSpec__ProductCode") or ""),
        "FileSizeBytes"        : os.path.getsize(file_path),
        "IsDefaultForRole"     : False
    }

    mesh_counts = na_read_mesh_counts(asset_data)
    if mesh_counts:
        entry["Mesh3dCounts"] = mesh_counts

    preview = na_build_preview_svg(asset_data)
    if preview:
        entry["Preview2d"] = preview

    return entry

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Index Assembly
# -----------------------------------------------------------------------------

def na_build_index():
    if not os.path.isdir(LIBRARY_DIR):
        print("!! Library folder not found: {0}".format(LIBRARY_DIR))
        return None

    categories = []
    assets     = []

    for folder_name in sorted(os.listdir(LIBRARY_DIR)):
        folder_path = os.path.join(LIBRARY_DIR, folder_name)
        if not os.path.isdir(folder_path):
            continue
        if folder_name in SKIP_FOLDER_NAMES:
            continue

        rule = CATEGORY_RULES.get(folder_name)
        if not rule:
            print("  !! No CATEGORY_RULES entry for folder '{0}' - folder skipped.".format(folder_name))
            continue

        print("  Scanning {0} ...".format(folder_name))
        categories.append({
            "CategoryId"   : folder_name,
            "CategoryName" : rule["CategoryName"],
            "FolderName"   : folder_name,
            "Role"         : rule["Role"],
            "SortOrder"    : rule["SortOrder"],
            "Description"  : rule["Description"]
        })

        for file_name in sorted(os.listdir(folder_path)):
            if not file_name.lower().endswith(".json"):
                continue
            if file_name.startswith(SKIP_FILE_PREFIXES):
                continue

            entry = na_build_entry(folder_name, file_name, rule)
            if entry:
                assets.append(entry)
                print("    + {0}  ({1})  {2} kB".format(
                    entry["AssetId"], entry["Name"], round(entry["FileSizeBytes"] / 1024)))

    # First asset in each role becomes that role's default, so the editor always
    # has something to show rather than an empty card strip.
    seen_roles = set()
    for entry in assets:
        for role in entry["ApplicableRoles"]:
            if role not in seen_roles:
                seen_roles.add(role)
                entry["IsDefaultForRole"] = True

    categories.sort(key=lambda c: c["SortOrder"])

    return {
        "VghLantern__ComponentDataIndex__Meta": {
            "GeneratedBy"      : "60__Dev__WebBuildUtils/VghLantern__BuildUtil__ComponentDataIndex__.py",
            "GeneratedDate"    : datetime.now().strftime("%d-%b-%Y at %H:%M"),
            "SchemaVersion"    : SCHEMA_VERSION,
            "LibraryRoot"      : LIBRARY_ROOT,
            "AssetCount"       : len(assets),
            "DoNotEditByHand"  : True,
            "IndexPurposeNote" : "Catalogue only. Geometry stays in the asset files and is fetched on demand by VghLantern__AppData__ComponentAssetCache__.js, because a unified asset export runs to one or two megabytes."
        },
        "VghLantern__ComponentDataIndex__Categories" : categories,
        "VghLantern__ComponentDataIndex__Assets"     : assets
    }

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Entry Point
# -----------------------------------------------------------------------------

def main():
    print("VghLantern | Component Data Index Builder")
    print("=" * 60)

    index = na_build_index()
    if index is None:
        return 1

    with open(OUTPUT_PATH, "w", encoding="utf-8") as handle:
        json.dump(index, handle, indent=4, ensure_ascii=False)
        handle.write("\n")

    print("=" * 60)
    print(">> {0} asset(s) in {1} category folder(s)".format(
        index["VghLantern__ComponentDataIndex__Meta"]["AssetCount"],
        len(index["VghLantern__ComponentDataIndex__Categories"])))
    print(">> Written: {0}".format(OUTPUT_PATH))
    return 0


if __name__ == "__main__":
    sys.exit(main())

# =============================================================================
# END OF FILE
# =============================================================================
