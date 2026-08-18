#!/usr/bin/env python3
# =============================================================================
# WHITECARDOPEDIA - REASSIGN CONCEPT ARTIST TO "HOUSE"
# =============================================================================
#
# FILE       : AutomationUtil__ReassignConceptArtist__ToHouse__Main__.py
# NAMESPACE  : Whitecardopedia
# MODULE     : Concept Artist Reassignment
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Move every job credited to "James" or the "Default Concept
#              Artist" placeholder onto "House" as the concept artist.
# CREATED    : 18-Aug-2026
#
# DESCRIPTION:
# - Two sides must change or the edit will not stick:
#     1. Whitecardopedia  Projects/<year>/<folder>/project.json
#                         -> productionData.conceptArtist
#     2. Vale production  C:\01__ValeProjects\ValeProjects__<year>\<job>\
#                         00__ProjectData\*__ProjectData__.json
#                         -> Project__MetaData.Project__ConceptArtist
#   The build pipeline (AutomationUtil__FetchLocalProjects__...) reads
#   Project__ConceptArtist from the source ProjectData file and writes it into
#   project.json. Change only the Whitecardopedia copy and the next sync of
#   that job puts "James" straight back.
#
# SCOPE - WHAT THIS DOES NOT TOUCH:
# - The DESIGNER field. James is a real designer in the options list and three
#   jobs record him requesting work. Requesting a job is not the same as
#   producing it, so those are left alone.
# - 01__TemplateProject. Its "Default Concept Artist" is deliberate
#   scaffolding that new projects inherit and then overwrite. Rewriting it to
#   "House" would silently make House the default for every future job.
#
# SAFETY:
# - Dry run by default. Nothing is written without --apply.
# - Reports every file it would touch, on both sides, before changing anything.
# - Writes local files only. Push to R2 afterwards or the next sync restores
#   the old values.
#
# USAGE:
#   python AutomationUtil__ReassignConceptArtist__ToHouse__Main__.py
#   python AutomationUtil__ReassignConceptArtist__ToHouse__Main__.py --apply
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 18-Aug-2026 - Version 1.0.0
# - Initial release.
#
# =============================================================================

import os
import json
import glob
import argparse
from pathlib import Path


# -----------------------------------------------------------------------------
# REGION | Module Constants
# -----------------------------------------------------------------------------

WCP_PROJECTS_ROOT   = Path(r"D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia\Projects")
VALE_PROJECT_ROOTS  = [
    Path(r"C:\01__ValeProjects\ValeProjects__2025"),
    Path(r"C:\01__ValeProjects\ValeProjects__2026"),
]

REASSIGN_FROM       = {"james", "default concept artist"}                      # <-- Matched case insensitively
REASSIGN_TO         = "House"                                                  # <-- New concept artist

PROTECTED_FOLDERS   = ("01__TemplateProject", "00__ExampleProject", "__BACKUP__")  # <-- Scaffolding, never real jobs

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Helpers
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Should This Value Be Reassigned
# ---------------------------------------------------------------
def na_should_reassign(value) -> bool:
    return str(value or "").strip().lower() in REASSIGN_FROM
# ---------------------------------------------------------------


# HELPER FUNCTION | Is This Folder Protected Scaffolding
# ---------------------------------------------------------------
def na_is_protected(folder_id: str) -> bool:
    return any(token in str(folder_id) for token in PROTECTED_FOLDERS)
# ---------------------------------------------------------------


# HELPER FUNCTION | Write JSON Back in the Repository's House Style
# ---------------------------------------------------------------
def na_write_json(path: Path, data) -> bool:
    try:
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=4, ensure_ascii=False)
            fh.write("\n")
        return True
    except Exception as exc:
        print(f"  ERROR writing {path}: {exc}")
        return False
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Side One - Whitecardopedia project.json
# -----------------------------------------------------------------------------

# FUNCTION | Reassign in the Whitecardopedia Library
# ------------------------------------------------------------
def na_process_whitecardopedia(apply_changes: bool):
    changed, skipped, written = [], [], 0

    for path in sorted(WCP_PROJECTS_ROOT.glob("*/*/project.json")):
        folder_id = str(path.parent.relative_to(WCP_PROJECTS_ROOT)).replace("\\", "/")

        try:
            with open(path, encoding="utf-8") as fh:
                data = json.load(fh)
        except Exception as exc:
            print(f"  ERROR reading {folder_id}: {exc}")
            continue

        production = data.get("productionData") or {}
        current    = production.get("conceptArtist")

        if not na_should_reassign(current):
            continue

        if na_is_protected(folder_id):
            skipped.append((folder_id, current))                               # <-- Deliberate placeholder, leave it
            continue

        changed.append((folder_id, current))

        if apply_changes:
            data.setdefault("productionData", {})["conceptArtist"] = REASSIGN_TO
            if na_write_json(path, data):
                written += 1

    return changed, skipped, written
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Side Two - Vale Production ProjectData Files
# -----------------------------------------------------------------------------

# FUNCTION | Reassign in the Vale Source Project Folders
# ------------------------------------------------------------
def na_process_vale_sources(apply_changes: bool):
    changed, written = [], 0

    for root in VALE_PROJECT_ROOTS:
        if not root.is_dir():
            print(f"  WARNING: Vale project root not found: {root}")
            continue

        year = root.name.replace("ValeProjects__", "")

        for job_dir in sorted(root.iterdir()):
            if not job_dir.is_dir() or na_is_protected(job_dir.name):
                continue

            project_data_dir = job_dir / "00__ProjectData"
            if not project_data_dir.is_dir():
                continue

            for entry in sorted(project_data_dir.glob("*.json")):
                try:
                    with open(entry, encoding="utf-8") as fh:
                        data = json.load(fh)
                except Exception:
                    continue

                blocks = data if isinstance(data, list) else [data]
                touched = False

                for block in blocks:
                    if not isinstance(block, dict):
                        continue
                    metadata = block.get("Project__MetaData")
                    if not isinstance(metadata, dict):
                        continue
                    if na_should_reassign(metadata.get("Project__ConceptArtist")):
                        changed.append((year, job_dir.name, metadata["Project__ConceptArtist"]))
                        metadata["Project__ConceptArtist"] = REASSIGN_TO
                        touched = True

                if touched and apply_changes:
                    if na_write_json(entry, data):
                        written += 1

    return changed, written
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Reporting and Main
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Print a Section Header
# ---------------------------------------------------------------
def na_print_section(title: str) -> None:
    print()
    print("=" * 78)
    print(f"  {title}")
    print("=" * 78)
# ---------------------------------------------------------------


# FUNCTION | Tool Entry Point
# ------------------------------------------------------------
def na_main() -> None:
    parser = argparse.ArgumentParser(
        description='Reassign jobs credited to "James" or "Default Concept Artist" onto "House".'
    )
    parser.add_argument("--apply", action="store_true",
                        help="Write the changes. Without this flag the tool reports only.")
    args = parser.parse_args()

    na_print_section("REASSIGN CONCEPT ARTIST TO HOUSE")
    print(f"  Mode        : {'APPLY (files will be written)' if args.apply else 'DRY RUN (no files written)'}")
    print(f"  Reassigning : {', '.join(sorted(REASSIGN_FROM))}  ->  {REASSIGN_TO}")
    print(f"  Field       : concept artist only (designer is left untouched)")

    na_print_section("SIDE 1 - WHITECARDOPEDIA project.json")
    wcp_changed, wcp_skipped, wcp_written = na_process_whitecardopedia(args.apply)

    if wcp_changed:
        for folder_id, previous in wcp_changed:
            print(f"  {folder_id:<48} {previous:>22}  ->  {REASSIGN_TO}")
    else:
        print("  Nothing to change.")

    if wcp_skipped:
        print()
        print("  SKIPPED (protected scaffolding, placeholder left in place):")
        for folder_id, previous in wcp_skipped:
            print(f"    {folder_id:<46} {previous}")

    na_print_section("SIDE 2 - VALE SOURCE ProjectData FILES")
    print("  These feed the build pipeline. Without them the next sync would")
    print("  reinstate the old artist on the Whitecardopedia copy.")
    print()
    vale_changed, vale_written = na_process_vale_sources(args.apply)

    if vale_changed:
        for year, job, previous in vale_changed:
            print(f"  {year}  {job:<48} {previous:>22}  ->  {REASSIGN_TO}")
    else:
        print("  Nothing to change.")

    na_print_section("RESULT")
    print(f"  Whitecardopedia records to change : {len(wcp_changed)}")
    print(f"  Vale source records to change     : {len(vale_changed)}")
    if args.apply:
        print(f"  Whitecardopedia files written     : {wcp_written}")
        print(f"  Vale source files written         : {vale_written}")
        print()
        print("  NEXT STEP: push the Whitecardopedia changes to R2, otherwise the")
        print("  next sync restores the old values:")
        print("    Tools__DevUtils/AutomationUtil__BuildCloudflareBucket__WhitecardopediaProjects__.bat")
    else:
        print()
        print("  DRY RUN - nothing was written. Re-run with --apply to write.")
    print()
# ---------------------------------------------------------------


if __name__ == "__main__":
    na_main()

# endregion -------------------------------------------------------------------
