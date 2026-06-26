#!/usr/bin/env python3
# =============================================================================
# WHITECARDOPEDIA - CAMERA DATA PLACEHOLDER BACKFILL
# =============================================================================
#
# FILE       : AutomationUtil__BackfillCameraDataPlaceholder__AllProjects__Main__.py
# NAMESPACE  : Whitecardopedia
# MODULE     : One-Time Camera Data Placeholder Backfill
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Inject a placeholder ValeVison3D__SketchUpCameraData key into
#              every project.json that is missing it, then push the updated
#              project.json to Cloudflare R2 so the ValeVision Cloud Sync
#              plugin can GET the R2 file and patch it with live camera data.
# CREATED    : 26-Jun-2026
#
# DESCRIPTION:
# - Without a project.json on R2, the plugin's "Update Camera Data" step calls
#   s3_client.get_object(...) and receives NoSuchKey, aborting the entire R2
#   camera-merge step. Old projects were never backfilled to R2 and therefore
#   have no project.json there.
# - This script adds "ValeVison3D__SketchUpCameraData": { "note": "...", "scenes": [] }
#   to every local project.json that is missing the key, writes it back
#   atomically, then uploads it to R2.
# - The placeholder value is irrelevant at runtime: na_merge_camera_in_r2_project_json
#   always fully replaces the key with fresh live camera data.
# - Derives the year and folder directly from the local filesystem path
#   (Projects/<year>/<folder>/project.json) — does NOT depend on the folderId
#   field format, which varies between old and new projects.
# - Shared R2 plumbing is delegated to AutomationUtil__R2Common__Lib__.py (DRY).
#
# USAGE:
#   python AutomationUtil__BackfillCameraDataPlaceholder__AllProjects__Main__.py            # dry-run (default)
#   python AutomationUtil__BackfillCameraDataPlaceholder__AllProjects__Main__.py --apply    # write + upload
#   python AutomationUtil__BackfillCameraDataPlaceholder__AllProjects__Main__.py --apply --project 2025/PC-61922__PlumblyClegg__Scheme-02
#   python AutomationUtil__BackfillCameraDataPlaceholder__AllProjects__Main__.py --apply --year 2025
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 26-Jun-2026 - Version 1.0.0
# - Initial release: placeholder injection + R2 upload + summary report.
#
# =============================================================================

import sys
import json
import argparse
from pathlib import Path
from typing import Optional, Dict, List

# Shared R2 plumbing
# @delegate: ../AutomationUtil__R2Common__Lib__.py
_SCRIPT_DIR = Path(__file__).parent.parent                                  # <-- Tools__DevUtils root
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))
import AutomationUtil__R2Common__Lib__ as r2lib                             # <-- DRY home for creds/client/upload

# -----------------------------------------------------------------------------
# REGION | Module Constants
# -----------------------------------------------------------------------------

    # MODULE CONSTANTS | Placeholder and Console Colours
    # ------------------------------------------------------------
CAMERA_DATA_KEY  = "ValeVison3D__SketchUpCameraData"                        # <-- Key to inject (one 'i' — matches web app)
PLACEHOLDER_VALUE = {
    "note"   : "Placeholder — camera data not yet captured from SketchUp model.",
    "scenes" : []
}

COLOR_RESET  = '\033[0m'
COLOR_GREEN  = '\033[92m'
COLOR_YELLOW = '\033[93m'
COLOR_RED    = '\033[91m'
COLOR_CYAN   = '\033[96m'
COLOR_BLUE   = '\033[94m'
COLOR_GREY   = '\033[90m'
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Project Discovery
# -----------------------------------------------------------------------------

    # FUNCTION | Discover All Local project.json Files Under Projects/
    # ------------------------------------------------------------
def na_discover_all_projects() -> List[Dict]:
    """Walk Projects/<year>/<folder>/project.json and return a list of records.
    Returns: [{ 'year': str, 'folder': str, 'folderId': str, 'path': Path }]"""
    records: List[Dict] = []
    projects_root = r2lib.WCP_PROJECTS_BASE

    if not projects_root.is_dir():
        return records

    for year_dir in sorted(projects_root.iterdir()):
        if not year_dir.is_dir():
            continue
        year = year_dir.name
        if not year.isdigit() or len(year) != 4:
            continue                                                         # <-- Skip non-year folders (e.g. template dirs)

        for folder_dir in sorted(year_dir.iterdir()):
            if not folder_dir.is_dir():
                continue
            project_json = folder_dir / r2lib.PROJECT_JSON_FILENAME
            if not project_json.is_file():
                continue
            records.append({
                'year'     : year,
                'folder'   : folder_dir.name,
                'folderId' : f"{year}/{folder_dir.name}",                   # <-- Canonical folderId with year prefix
                'path'     : project_json
            })

    return records
    # ------------------------------------------------------------


    # FUNCTION | Apply Project Filters From CLI Arguments
    # ------------------------------------------------------------
def na_apply_filters(records: List[Dict], only_project: Optional[str], only_year: Optional[str]) -> List[Dict]:
    """Filter the full project list by optional --project and --year arguments."""
    if only_project:
        target  = only_project.strip().strip('/')
        records = [r for r in records if r['folderId'] == target]

    if only_year:
        year    = str(only_year)
        records = [r for r in records if r['year'] == year]

    return records
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Placeholder Check and Injection
# -----------------------------------------------------------------------------

    # FUNCTION | Read project.json and Check if Placeholder is Needed
    # ------------------------------------------------------------
def na_check_needs_placeholder(record: Dict) -> Optional[Dict]:
    """Return the parsed project JSON if the camera data key is absent, else None."""
    try:
        data = json.loads(record['path'].read_text(encoding='utf-8'))
        if not isinstance(data, dict):
            return None                                                     # <-- Unexpected format — skip safely
        if CAMERA_DATA_KEY in data:
            return None                                                     # <-- Already has the key — nothing to do
        return data
    except Exception as exc:
        print(f"  {COLOR_RED}✗ Read error {record['folderId']}: {exc}{COLOR_RESET}")
        return None
    # ------------------------------------------------------------


    # FUNCTION | Write the Updated project.json Back to Disk Atomically
    # ------------------------------------------------------------
def na_write_placeholder_locally(record: Dict, data: Dict) -> bool:
    """Add the placeholder key and write the file atomically via a .tmp swap."""
    data[CAMERA_DATA_KEY] = PLACEHOLDER_VALUE                              # <-- Add placeholder as last key
    try:
        tmp_path = record['path'].with_suffix('.tmp.json')
        tmp_path.write_text(json.dumps(data, indent=4), encoding='utf-8')
        tmp_path.replace(record['path'])
        return True
    except Exception as exc:
        print(f"  {COLOR_RED}✗ Write error {record['folderId']}: {exc}{COLOR_RESET}")
        return False
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | R2 Upload
# -----------------------------------------------------------------------------

    # FUNCTION | Upload the Updated project.json to R2
    # ------------------------------------------------------------
def na_upload_project_json_to_r2(client, bucket: str, record: Dict) -> bool:
    """Upload the local project.json to the canonical R2 key for this project."""
    r2_key = f"{r2lib.R2_BASE_PREFIX}/{record['folderId']}/{r2lib.PROJECT_JSON_FILENAME}"
    ok     = r2lib.na_upload_file(client, bucket, record['path'], r2_key)
    if not ok:
        print(f"  {COLOR_RED}✗ R2 upload failed for {record['folderId']}{COLOR_RESET}")
    return ok
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Per-Project Processing
# -----------------------------------------------------------------------------

    # FUNCTION | Process One Project — Check, Inject, Upload
    # ------------------------------------------------------------
def na_process_project(record: Dict, client, bucket: str, apply: bool) -> str:
    """Check one project, optionally inject the placeholder and upload to R2.
    Returns: 'skipped' | 'dry_run' | 'applied' | 'failed'"""
    data = na_check_needs_placeholder(record)

    if data is None:
        return 'skipped'                                                    # <-- Key already present or unreadable

    if not apply:
        return 'dry_run'                                                    # <-- Would add placeholder — dry-run only

    local_ok = na_write_placeholder_locally(record, data)
    if not local_ok:
        return 'failed'

    if client and bucket:
        r2_ok = na_upload_project_json_to_r2(client, bucket, record)
        if not r2_ok:
            return 'failed'

    return 'applied'
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Summary Printer
# -----------------------------------------------------------------------------

    # SUB FUNCTION | Print a Single Project Result Line
    # ------------------------------------------------------------
def na_print_project_result(record: Dict, outcome: str):
    """Print one coloured result line for a project."""
    fid = record['folderId']

    if outcome == 'skipped':
        print(f"  {COLOR_GREY}—  {fid:<52} (already has key){COLOR_RESET}")
    elif outcome == 'dry_run':
        print(f"  {COLOR_YELLOW}?  {fid:<52} (would add placeholder){COLOR_RESET}")
    elif outcome == 'applied':
        print(f"  {COLOR_GREEN}✔  {fid:<52} (placeholder added + R2 uploaded){COLOR_RESET}")
    elif outcome == 'failed':
        print(f"  {COLOR_RED}✗  {fid:<52} (FAILED — see errors above){COLOR_RESET}")
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Main Entry Point
# -----------------------------------------------------------------------------

    # HELPER FUNCTION | Force UTF-8 Console Streams (Windows cp1252 guard)
    # ------------------------------------------------------------
def na_force_utf8_streams():
    """Reconfigure stdout/stderr to UTF-8 so glyphs survive cp1252 consoles."""
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding='utf-8')
        except Exception:
            pass
    # ------------------------------------------------------------


    # FUNCTION | Parse Arguments, Discover Projects, Run Backfill
    # ------------------------------------------------------------
def main():
    na_force_utf8_streams()

    parser = argparse.ArgumentParser(
        description='Backfill ValeVison3D__SketchUpCameraData placeholder into old project.json files and push to R2.'
    )
    parser.add_argument('--apply',   action='store_true', help='Write placeholder + upload to R2. Default is dry-run only.')
    parser.add_argument('--project', type=str, default=None, help='Limit to one folderId, e.g. 2025/PC-61922__PlumblyClegg__Scheme-02')
    parser.add_argument('--year',    type=str, default=None, help='Limit to one year, e.g. 2025')
    args = parser.parse_args()

    print(f"\n{COLOR_BLUE}================================================================{COLOR_RESET}")
    print(f"{COLOR_BLUE} WHITECARDOPEDIA - CAMERA DATA PLACEHOLDER BACKFILL{COLOR_RESET}")
    print(f"{COLOR_BLUE}================================================================{COLOR_RESET}")
    print(f"  Mode    : {COLOR_YELLOW}{'APPLY (write + R2 upload)' if args.apply else 'DRY-RUN (no writes)'}{COLOR_RESET}")
    if args.project: print(f"  Filter  : project = {args.project}")
    if args.year:    print(f"  Filter  : year    = {args.year}")
    print()

    # R2 CLIENT (only needed in --apply mode)
    client = None
    bucket = ''
    if args.apply:
        creds  = r2lib.na_load_r2_credentials()
        client = r2lib.na_create_r2_client(creds)
        bucket = creds.get('R2_BUCKET_NAME', '')
        if not client or not bucket:
            print(f"{COLOR_RED}✗ R2 client unavailable (boto3 missing or credentials not found).{COLOR_RESET}")
            sys.exit(2)

    # DISCOVER + FILTER
    all_records = na_discover_all_projects()
    records     = na_apply_filters(all_records, args.project, args.year)

    if not records:
        print(f"{COLOR_YELLOW}No projects matched the filters.{COLOR_RESET}")
        sys.exit(0)

    print(f"{COLOR_CYAN}Scanning {len(records)} project(s)...{COLOR_RESET}\n")

    # PROCESS EACH PROJECT
    counts = {'skipped': 0, 'dry_run': 0, 'applied': 0, 'failed': 0}
    for record in records:
        outcome               = na_process_project(record, client, bucket, args.apply)
        counts[outcome]      += 1
        na_print_project_result(record, outcome)

    # SUMMARY
    total_needs = counts['dry_run'] + counts['applied'] + counts['failed']
    print(f"\n{COLOR_BLUE}--- Summary ---{COLOR_RESET}")
    print(f"  Projects scanned        : {len(records)}")
    print(f"  Already have key        : {COLOR_GREY}{counts['skipped']}{COLOR_RESET}")
    print(f"  Need placeholder        : {COLOR_YELLOW if total_needs else COLOR_GREEN}{total_needs}{COLOR_RESET}")
    if args.apply:
        print(f"  Applied + R2 uploaded   : {COLOR_GREEN}{counts['applied']}{COLOR_RESET}")
        print(f"  Failed                  : {COLOR_RED if counts['failed'] else COLOR_GREEN}{counts['failed']}{COLOR_RESET}")
    else:
        print(f"\n{COLOR_GREY}Dry-run only — no files written, nothing uploaded. Re-run with --apply to apply.{COLOR_RESET}")

    sys.exit(1 if counts['failed'] else 0)
    # ------------------------------------------------------------


if __name__ == '__main__':
    main()

# endregion -------------------------------------------------------------------
