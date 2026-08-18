#!/usr/bin/env python3
# =============================================================================
# WHITECARDOPEDIA - STRIP THE LEGACY sketchUpModel BLOCK FROM project.json
# =============================================================================
#
# FILE       : AutomationUtil__StripLegacySketchUpModelBlock__Main__.py
# NAMESPACE  : Whitecardopedia
# MODULE     : Legacy SketchUp URL Cleanup
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Remove the dead `sketchUpModel` block from every Whitecardopedia
#              project.json now that ValeVision3D has superseded the SketchUp
#              share-link viewer.
# CREATED    : 18-Aug-2026
#
# DESCRIPTION:
# - The app no longer reads `sketchUpModel` anywhere: the Project Viewer button,
#   the gallery content detector check and the Project Editor field have all
#   been removed. The block is now dead weight in the SSOT.
# - No build or sync utility writes the field, so stripping it is permanent.
# - The Project Editor also deletes the block on any save, so records edited
#   after this cleanup stay clean without needing a re-run.
#
# REAL URLS FOUND BEFORE REMOVAL (recorded here and in the DEVLOG so nothing is
# lost; every other record held the placeholder "Nil"):
#   2025/NY-29951__McNerney
#     https://app.sketchup.com/share/tc/europe/EjShVZJYLRU
#   2025/WK-3007__Weeks
#     https://app.sketchup.com/share/tc/europe/luls66XZsNs
#   2025/00__ExampleProject
#     https://3dwarehouse.sketchup.com/model/example   (template placeholder)
#
# SAFETY:
# - Dry run by default. Nothing is written without --apply.
# - Any record whose URL is NOT a placeholder is reported before removal so the
#   link can be captured elsewhere first.
# - Writes local project.json only. Push to R2 afterwards or the next sync will
#   pull the old copies back down.
#
# USAGE:
#   python AutomationUtil__StripLegacySketchUpModelBlock__Main__.py
#   python AutomationUtil__StripLegacySketchUpModelBlock__Main__.py --apply
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 18-Aug-2026 - Version 1.0.0
# - Initial release alongside the removal of the legacy SketchUp URL system.
#
# =============================================================================

import json
import argparse
from pathlib import Path


# -----------------------------------------------------------------------------
# REGION | Module Constants
# -----------------------------------------------------------------------------

WCP_PROJECTS_ROOT = Path(r"D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia\Projects")  # <-- project.json root
LEGACY_BLOCK_KEY  = "sketchUpModel"                                                        # <-- Block being removed
PLACEHOLDER_URLS  = {"", "nil", "none", "false", "n/a", "na", "tbc"}                        # <-- Values carrying no information

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Main
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Parse Command Line Arguments
# ---------------------------------------------------------------
def na_parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Strip the legacy sketchUpModel block from every project.json."
    )
    parser.add_argument("--apply", action="store_true",
                        help="Write the changes. Without this flag the tool reports only.")
    return parser.parse_args()
# ---------------------------------------------------------------


# FUNCTION | Tool Entry Point
# ------------------------------------------------------------
def na_main() -> None:
    args = na_parse_args()

    print()
    print("=" * 78)
    print("  WHITECARDOPEDIA - STRIP LEGACY sketchUpModel BLOCK")
    print("=" * 78)
    print(f"  Mode : {'APPLY (files will be written)' if args.apply else 'DRY RUN (no files written)'}")
    print()

    carried, real_urls, written = 0, [], 0

    for path in sorted(WCP_PROJECTS_ROOT.glob("*/*/project.json")):
        rel = str(path.parent.relative_to(WCP_PROJECTS_ROOT)).replace("\\", "/")

        try:
            with open(path, encoding="utf-8") as fh:
                data = json.load(fh)
        except Exception as exc:
            print(f"  ERROR reading {rel}: {exc}")
            continue

        if LEGACY_BLOCK_KEY not in data:
            continue

        carried += 1
        url = str((data.get(LEGACY_BLOCK_KEY) or {}).get("url", "")).strip()
        if url.lower() not in PLACEHOLDER_URLS:
            real_urls.append((rel, url))

        del data[LEGACY_BLOCK_KEY]

        if args.apply:
            try:
                with open(path, "w", encoding="utf-8") as fh:
                    json.dump(data, fh, indent=4, ensure_ascii=False)
                    fh.write("\n")
                written += 1
            except Exception as exc:
                print(f"  ERROR writing {rel}: {exc}")

    if real_urls:
        print(f"  RECORDS HOLDING A REAL URL ({len(real_urls)}) - captured here before removal:")
        for rel, url in real_urls:
            print(f"    {rel}")
            print(f"      {url}")
        print()

    print(f"  project.json files carrying the block : {carried}")
    print(f"  Placeholder-only records              : {carried - len(real_urls)}")
    if args.apply:
        print(f"  Files written                         : {written}")
        print()
        print("  NEXT STEP: push to R2 so the live bucket does not restore the old copies:")
        print("    Tools__DevUtils/AutomationUtil__BuildCloudflareBucket__WhitecardopediaProjects__.bat")
    else:
        print()
        print("  DRY RUN - nothing was written. Re-run with --apply to write.")
    print()
# ---------------------------------------------------------------


if __name__ == "__main__":
    na_main()

# endregion -------------------------------------------------------------------
