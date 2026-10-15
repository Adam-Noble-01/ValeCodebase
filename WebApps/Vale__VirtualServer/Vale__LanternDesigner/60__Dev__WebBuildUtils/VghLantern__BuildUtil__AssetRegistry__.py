# =============================================================================
# VGHLANTERN - BUILD UTILITY | ASSET REGISTRY
# =============================================================================
#
# FILE       : VghLantern__BuildUtil__AssetRegistry__.py
# NAMESPACE  : VghLantern
# MODULE     : Dev - WebBuildUtils - AssetRegistry
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Map every asset in both data libraries to one addressable record
# CREATED    : 21-Aug-2026
#
# DESCRIPTION:
# - Walks 05__Data__LanternComponentLibrary and 06__Data__LanternProfileLibrary
#   and writes VghLantern__AssetRegistry__.json: ONE record per asset file,
#   keyed by the asset's own product code, carrying where the file is and what
#   it can do.
# - Also records every SYSTEM INDEX it finds, so a loader can reach its own
#   configuration without knowing which folder it lives in either.
#
# WHY THIS EXISTS
#
# Before this file, a product code was written down in up to eleven places: the
# file name, four fields inside the file, the system index's AssetId AND its
# JsonUrl, the app config default, a validator constant, and every saved project.
# A folder path was written down again in each of seven loaders as its own
# LIBRARY_ROOT_PATH constant.
#
# Renaming 45_1000__GlazeBars to 45_2000__GlazeBars__Profiles on 21-Aug-2026
# broke the glaze bar loader at a constant nothing pointed at it from, and left
# five JsonUrls in an index aimed at deleted files. Nothing reported it, because
# nothing knew the two were meant to agree.
#
# So: THE REGISTRY IS THE ONLY PLACE A PATH IS WRITTEN DOWN. A system index names
# an AssetId and nothing else. A loader asks the registry where that id lives.
# Move a folder, rerun this, and every consumer follows. There is exactly one
# hardcoded path left in the application, which is the registry's own url, and
# that is the one path a registry cannot resolve for itself.
#
# UNIQUENESS IS ENFORCED, NOT ASSUMED
#
# A product code identifies an asset across BOTH libraries, so two files sharing
# one is a fault rather than a curiosity: the second would silently win every
# lookup. This utility refuses to write a registry that contains one, and names
# both files.
#
# USAGE:
#     python VghLantern__BuildUtil__AssetRegistry__.py
#
# =============================================================================

import json
import os
import re
import sys
from datetime import datetime

# -----------------------------------------------------------------------------
# REGION | Paths and Library Rules
# -----------------------------------------------------------------------------

APP_ROOT     = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_PATH  = os.path.join(APP_ROOT, "VghLantern__AssetRegistry__.json")

SCHEMA_VERSION = "1.0.0"

# LIBRARY RULES | The two data libraries this registry spans
# ------------------------------------------------------------
# LibraryKey is what a consumer asks for when it wants "every profile" or "every
# component". The root is relative to the application root and is written into
# every record, so a consumer never joins paths itself.
LIBRARY_RULES = [
    {
        "LibraryKey"  : "component",
        "LibraryName" : "Lantern Component Library",
        "Root"        : "05__Data__LanternComponentLibrary/",
        "Description" : "Discrete objects placed at a point - finials, cresting, and the fixed "
                        "assembly components the ridge, hip and glaze bar systems place for themselves."
    },
    {
        "LibraryKey"  : "profile",
        "LibraryName" : "Lantern Profile Library",
        "Root"        : "06__Data__LanternProfileLibrary/",
        "Description" : "Cross-sections swept along a skeleton line - glaze bars, ridge and hip "
                        "stacks, base frame, internal trims."
    }
]

# FILES THAT ARE NOT ASSETS
# ------------------------------------------------------------
# The generated catalogue indexes, this registry, the READMEs, and the shared
# depth table. A system index is not an asset either, but it is not skipped -
# it is collected into its own block below.
SKIP_FILE_PREFIXES = (
    "VghLantern__ComponentDataIndex",
    "VghLantern__ProfileDataIndex",
    "VghLantern__AssetRegistry",
    "VghLantern__RidgeHipSystem__TimberDepthTable",
)

SKIP_FOLDER_NAMES = ("3dAssets__Glb", "__pycache__")

SYSTEM_INDEX_PATTERN = re.compile(r"^VghLantern__(.+)System__Index__\.json$")

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Field Derivation
# -----------------------------------------------------------------------------

def na_read_json(file_path):
    with open(file_path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def na_asset_id(asset_data, file_stem):
    """The product code. The asset's own metadata wins; the file stem is the fallback.

    Both library schemas - the unified SketchUp export and the earlier
    hand-authored form - carry Na__Asset__Metadata__Id, so one rule covers the lot.
    """
    metadata = asset_data.get("Na__Asset__Metadata") or {}
    asset_id = str(metadata.get("Na__Asset__Metadata__Id") or "").strip()
    if asset_id:
        return asset_id

    tokens = [t for t in file_stem.strip("_").split("__") if t]
    for token in tokens:
        if re.match(r"^[A-Za-z]{0,4}_?\d+(_\d+)?$", token):
            return token
    return file_stem.strip("_")


def na_display_name(asset_data, file_stem):
    """A readable label. The Vale product name wins, then the metadata name, then
    a name derived from the file stem - in that order, because the first is what
    the technical department calls it and the last is what a path calls it."""
    spec     = asset_data.get("Na__Asset__ValeSpecification") or {}
    metadata = asset_data.get("Na__Asset__Metadata") or {}

    product = str(spec.get("Na__Asset__ValeSpec__ProductName") or "").strip()
    if product:
        return product

    # The unified exporter writes the SketchUp component name here, which is the
    # file stem again and no use as a label. Take it only when it is something else.
    named = str(metadata.get("Na__Asset__Metadata__Name") or "").strip()
    if named and named.strip("_") != file_stem.strip("_"):
        return named

    tokens = [t for t in file_stem.strip("_").split("__") if t]
    if tokens and re.match(r"^[A-Za-z]{0,4}_?\d+(_\d+)?$", tokens[0]):
        tokens = tokens[1:]
    tokens = [t for t in tokens if t.lower() not in ("component", "vghlantern", "valeglazedroof", "valeroofsystem")]
    if not tokens:
        return file_stem.strip("_")

    spaced = [re.sub(r"(?<=[a-z0-9])(?=[A-Z])", " ", t) for t in tokens]
    return " - ".join(spaced)


def na_system_index_key(file_name):
    """VghLantern__GlazeBarSystem__Index__.json -> glazeBar.

    Derived rather than tabulated, so adding a system means adding its index file
    and nothing else at all.
    """
    match = SYSTEM_INDEX_PATTERN.match(file_name)
    if not match:
        return None

    name = match.group(1).strip("_")
    return name[:1].lower() + name[1:] if name else None


def na_build_record(library, folder_name, file_name, file_path):
    asset_data = na_read_json(file_path)
    file_stem  = os.path.splitext(file_name)[0]
    meta       = asset_data.get("meta") or {}
    metadata   = asset_data.get("Na__Asset__Metadata") or {}
    spec       = asset_data.get("Na__Asset__ValeSpecification") or {}

    url = library["Root"] + folder_name + "/" + file_name if folder_name else library["Root"] + file_name

    return {
        "AssetId"        : na_asset_id(asset_data, file_stem),
        "Name"           : na_display_name(asset_data, file_stem),
        "LibraryKey"     : library["LibraryKey"],
        "FolderName"     : folder_name,
        "FileName"       : file_name,
        "Url"            : url,
        "Schema"         : str(meta.get("schema") or ""),
        "SchemaVersion"  : str(meta.get("schemaVersion") or ""),
        "Revision"       : str(metadata.get("Na__Asset__Metadata__Revision") or ""),
        "DataStatus"     : str(metadata.get("Na__Asset__Metadata__DataStatus") or ""),
        "ProductCode"    : str(spec.get("Na__Asset__ValeSpec__ProductCode") or ""),
        "SpecMaterial"   : str(spec.get("Na__Asset__ValeSpec__Material") or ""),
        "Has2dPlan"      : asset_data.get("Na__Asset__Has2dPlan") is True,
        "Has2dElevation" : asset_data.get("Na__Asset__Has2dElevation") is True,
        "Has2dProfile"   : asset_data.get("Na__Asset__Has2dProfile") is True,
        "Has3d"          : asset_data.get("Na__Asset__Has3d") is True,
        "Mesh3dInline"   : isinstance(asset_data.get("Na__Asset__Mesh3D"), dict),
        "Glb3dUrl"       : asset_data.get("Na__Asset__Glb3D__Url") or asset_data.get("Na__Asset__Glb3d__Url"),
        "FileSizeBytes"  : os.path.getsize(file_path)
    }

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Library Walk
# -----------------------------------------------------------------------------

def na_walk_library(library, assets, system_indexes, warnings):
    library_dir = os.path.join(APP_ROOT, library["Root"].rstrip("/").replace("/", os.sep))
    if not os.path.isdir(library_dir):
        warnings.append("Library folder is missing: " + library["Root"])
        return

    print("  Scanning " + library["Root"] + " ...")

    folder_names = [""] + sorted(
        name for name in os.listdir(library_dir)
        if os.path.isdir(os.path.join(library_dir, name)) and name not in SKIP_FOLDER_NAMES
    )

    for folder_name in folder_names:
        folder_dir = os.path.join(library_dir, folder_name) if folder_name else library_dir

        for file_name in sorted(os.listdir(folder_dir)):
            if not file_name.lower().endswith(".json"):
                continue

            file_path = os.path.join(folder_dir, file_name)
            if not os.path.isfile(file_path):
                continue

            # A SYSTEM INDEX is configuration for a loader rather than an asset,
            # but it still needs finding without a hardcoded folder, so it goes
            # into its own block instead of being skipped.
            index_key = na_system_index_key(file_name)
            if index_key:
                system_indexes.append({
                    "IndexKey"   : index_key,
                    "FileName"   : file_name,
                    "FolderName" : folder_name,
                    "LibraryKey" : library["LibraryKey"],
                    "Url"        : library["Root"] + (folder_name + "/" if folder_name else "") + file_name
                })
                print("      index  " + index_key.ljust(18) + folder_name + "/" + file_name)
                continue

            if file_name.startswith(SKIP_FILE_PREFIXES):
                continue

            try:
                record = na_build_record(library, folder_name, file_name, file_path)
            except Exception as error:                                        # noqa: BLE001 - reported, not raised
                warnings.append("Could not read " + file_name + ": " + str(error))
                print("    !! " + file_name + " could not be read - " + str(error))
                continue

            assets.append(record)
            print("      + " + record["AssetId"].ljust(14)
                  + "(" + record["Name"] + ")  "
                  + str(record["FileSizeBytes"] // 1024) + " kB")

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Entry Point
# -----------------------------------------------------------------------------

def main():
    print("VghLantern | Asset Registry Builder")
    print("=" * 60)

    assets         = []
    system_indexes = []
    warnings       = []

    for library in LIBRARY_RULES:
        na_walk_library(library, assets, system_indexes, warnings)

    # UNIQUENESS | A product code addresses one file across both libraries. Two
    # files claiming one is a fault: the second would win every lookup silently.
    seen       = {}
    duplicates = []
    for record in assets:
        asset_id = record["AssetId"]
        if asset_id in seen:
            duplicates.append((asset_id, seen[asset_id], record["Url"]))
        else:
            seen[asset_id] = record["Url"]

    if duplicates:
        print("=" * 60)
        print(">> DUPLICATE PRODUCT CODES - registry NOT written")
        for asset_id, first, second in duplicates:
            print("   " + asset_id)
            print("      " + first)
            print("      " + second)
        return 1

    index_keys = [entry["IndexKey"] for entry in system_indexes]
    if len(index_keys) != len(set(index_keys)):
        print("=" * 60)
        print(">> DUPLICATE SYSTEM INDEX KEYS - registry NOT written: " + ", ".join(sorted(index_keys)))
        return 1

    assets.sort(key=lambda record: (record["LibraryKey"], record["FolderName"], record["AssetId"]))
    system_indexes.sort(key=lambda entry: entry["IndexKey"])

    payload = {
        "VghLantern__AssetRegistry__Meta": {
            "GeneratedBy"     : "60__Dev__WebBuildUtils/VghLantern__BuildUtil__AssetRegistry__.py",
            "GeneratedDate"   : datetime.now().strftime("%d-%b-%Y at %H:%M"),
            "SchemaVersion"   : SCHEMA_VERSION,
            "AssetCount"      : len(assets),
            "SystemIndexCount": len(system_indexes),
            "DoNotEditByHand" : True,
            "Purpose"         : "The one place an asset's location is written down. A system index names an "
                                "AssetId; a loader asks this registry for its Url. Rename a folder or a file, "
                                "rerun the builder, and every consumer follows without a code change.",
            "UniquenessNote"  : "AssetId is unique across BOTH libraries and the builder refuses to write a "
                                "registry containing a duplicate. Consumers may therefore treat an id as an "
                                "address rather than as a hint.",
            "Warnings"        : warnings
        },
        "VghLantern__AssetRegistry__Libraries"    : LIBRARY_RULES,
        "VghLantern__AssetRegistry__SystemIndexes": system_indexes,
        "VghLantern__AssetRegistry__Assets"       : assets
    }

    with open(OUTPUT_PATH, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=4, ensure_ascii=False)
        handle.write("\n")

    print("=" * 60)
    print(">> " + str(len(assets)) + " asset(s), " + str(len(system_indexes)) + " system index(es)")
    for warning in warnings:
        print(">> WARNING: " + warning)
    print(">> Written: " + OUTPUT_PATH)
    return 0


if __name__ == "__main__":
    sys.exit(main())

# endregion -------------------------------------------------------------------
