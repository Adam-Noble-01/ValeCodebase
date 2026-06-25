#!/usr/bin/env python3
# =============================================================================
# WHITECARDOPEDIA - R2 AUDIT + BACKFILL (project.json / images / thumbnails)
# =============================================================================
#
# FILE       : AutomationUtil__AuditAndBackfillR2__ProjectJsonAndImages__Main__.py
# NAMESPACE  : Whitecardopedia
# MODULE     : One-Time R2 Audit + Backfill Tool
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Audit Cloudflare R2 for every enabled project and backfill the
#              missing project.json / scene images / 524p thumbnails so R2 is a
#              complete mirror, then (re)build the authoritative master index.
# CREATED    : 25-Jun-2026
#
# DESCRIPTION:
# - The bulk GLB builder only ever uploaded .glb files, so R2 holds GLBs but no
#   project.json / images / thumbnails for almost every project — every web
#   request pays a failed R2 round-trip first (the console 404 flood).
# - This tool compares each enabled masterConfig project's local Whitecardopedia
#   folder (Projects/{folderId}/) against R2 and reports present/missing for
#   project.json, scene images and thumbnails.
# - With --apply it uploads the missing files to VaApps/Projects/{folderId}/...
#   with correct content types (filenames mirror the local repo exactly).
# - Finally it rebuilds the master index from the post-upload R2 state and
#   writes it to R2 (VaApps/Index/) and the committed GH Pages fallback copy.
# - All R2 plumbing + index helpers are delegated to the shared lib (DRY).
#
# USAGE:
#   python AutomationUtil__AuditAndBackfillR2__ProjectJsonAndImages__Main__.py            # dry-run audit (default)
#   python AutomationUtil__AuditAndBackfillR2__ProjectJsonAndImages__Main__.py --dry-run-only
#   python AutomationUtil__AuditAndBackfillR2__ProjectJsonAndImages__Main__.py --apply    # upload missing + rebuild index
#   python ...Main__.py --apply --project 2026/63592__Bressard-Kayode        # single project
#   python ...Main__.py --apply --year 2026                                  # one year only
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 25-Jun-2026 - Version 1.0.0
# - Initial release: audit + backfill + master index rebuild via shared lib.
#
# =============================================================================

import os
import sys
import json
import argparse
from pathlib import Path
from typing import Optional, Dict, List

# Shared R2 plumbing + master index helpers
# @delegate: ./AutomationUtil__R2Common__Lib__.py
_SCRIPT_DIR = Path(__file__).parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))
import AutomationUtil__R2Common__Lib__ as r2lib                              # <-- DRY home for creds/client/index

# -----------------------------------------------------------------------------
# REGION | Module Constants and Console Colours
# -----------------------------------------------------------------------------

    # MODULE CONSTANTS | Console Colours
    # ------------------------------------------------------------
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
# REGION | Local File Collection
# -----------------------------------------------------------------------------

    # FUNCTION | Collect the Local Repo Files of Interest for a Project
    # ------------------------------------------------------------
def na_collect_local_files(folder_id: str) -> Dict:
    """Gather project.json + IMG## source images + 524p thumbnails from the repo."""
    repo_dir = r2lib.WCP_PROJECTS_BASE / folder_id                          # <-- Projects/{year}/{folder}
    result   = {'repoDir': repo_dir, 'projectJson': None, 'images': [], 'thumbnails': []}

    if not repo_dir.is_dir():
        return result                                                       # <-- Project folder absent locally

    project_json = repo_dir / r2lib.PROJECT_JSON_FILENAME
    if project_json.is_file():
        result['projectJson'] = project_json

    for f in repo_dir.iterdir():
        if not f.is_file():
            continue
        name = f.name
        if r2lib.THUMBNAIL_TOKEN in name:
            result['thumbnails'].append(f)                                  # <-- Generated 524p thumbnail
        elif r2lib.IMAGE_SOURCE_MARKER in name and name.lower().endswith('.png'):
            result['images'].append(f)                                      # <-- IMG## source scene image

    result['images'].sort(key=lambda p: p.name)
    result['thumbnails'].sort(key=lambda p: p.name)
    return result
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Per-Project Audit
# -----------------------------------------------------------------------------

    # FUNCTION | Audit One Project (local vs R2) — Single List Per Project
    # ------------------------------------------------------------
def na_audit_project(client, bucket: str, folder_id: str) -> Dict:
    """Compare local repo files to R2 contents and return a per-project record."""
    local      = na_collect_local_files(folder_id)
    prefix     = f"{r2lib.R2_BASE_PREFIX}/{folder_id}"
    r2_keys    = r2lib.na_list_prefix(client, bucket, prefix)
    r2_names   = {k.rsplit('/', 1)[-1] for k in r2_keys}                    # <-- Bare filenames present on R2

    local_img_names   = [p.name for p in local['images']]
    local_thumb_names = [p.name for p in local['thumbnails']]

    missing_images = [n for n in local_img_names   if n not in r2_names]
    missing_thumbs = [n for n in local_thumb_names if n not in r2_names]
    project_json_local = local['projectJson'] is not None
    project_json_r2    = r2lib.PROJECT_JSON_FILENAME in r2_names

    return {
        'folderId'           : folder_id,
        'repoDir'            : local['repoDir'],
        'projectJsonLocal'   : project_json_local,
        'projectJsonR2'      : project_json_r2,
        'localImageCount'    : len(local_img_names),
        'localThumbCount'    : len(local_thumb_names),
        'r2ImageCount'       : len([n for n in r2_names if r2lib.IMAGE_SOURCE_MARKER in n
                                    and r2lib.THUMBNAIL_TOKEN not in n and n.lower().endswith('.png')]),
        'r2ThumbCount'       : len([n for n in r2_names if r2lib.THUMBNAIL_TOKEN in n]),
        'missingProjectJson' : project_json_local and not project_json_r2,
        'missingImages'      : missing_images,
        'missingThumbnails'  : missing_thumbs,
        'hasGlbR2'           : any(n.lower().endswith('.glb') for n in r2_names),
        'localFiles'         : local
    }
    # ------------------------------------------------------------


    # SUB FUNCTION | Render a Single Project Audit Line
    # ------------------------------------------------------------
def na_print_audit_record(record: Dict):
    """Print a compact present/missing line for one project."""
    pj_local = record['projectJsonLocal']
    pj_r2    = record['projectJsonR2']

    pj_state = (f"{COLOR_GREEN}on-R2{COLOR_RESET}" if pj_r2
                else (f"{COLOR_YELLOW}MISSING{COLOR_RESET}" if pj_local
                      else f"{COLOR_GREY}no-local{COLOR_RESET}"))

    img_state = (f"{COLOR_GREEN}{record['r2ImageCount']}/{record['localImageCount']}{COLOR_RESET}"
                 if not record['missingImages']
                 else f"{COLOR_YELLOW}{record['r2ImageCount']}/{record['localImageCount']} (+{len(record['missingImages'])}){COLOR_RESET}")

    thumb_state = (f"{COLOR_GREEN}{record['r2ThumbCount']}/{record['localThumbCount']}{COLOR_RESET}"
                   if not record['missingThumbnails']
                   else f"{COLOR_YELLOW}{record['r2ThumbCount']}/{record['localThumbCount']} (+{len(record['missingThumbnails'])}){COLOR_RESET}")

    print(f"  {COLOR_CYAN}{record['folderId']:<48}{COLOR_RESET} "
          f"json:{pj_state:<22} img:{img_state:<26} thumb:{thumb_state}")
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Per-Project Backfill (Apply)
# -----------------------------------------------------------------------------

    # FUNCTION | Upload Missing Files for One Project to R2
    # ------------------------------------------------------------
def na_apply_project(client, bucket: str, record: Dict, force: bool = False) -> int:
    """Upload missing (or all, when force) repo files to R2. Returns count."""
    folder_id = record['folderId']
    prefix    = f"{r2lib.R2_BASE_PREFIX}/{folder_id}"
    local     = record['localFiles']
    uploaded  = 0

    # PROJECT.JSON
    if local['projectJson'] and (force or record['missingProjectJson']):
        key = f"{prefix}/{r2lib.PROJECT_JSON_FILENAME}"
        if r2lib.na_upload_file(client, bucket, local['projectJson'], key):
            uploaded += 1

    # SCENE IMAGES
    missing_img = set(record['missingImages'])
    for img in local['images']:
        if force or img.name in missing_img:
            key = f"{prefix}/{img.name}"
            if r2lib.na_upload_file(client, bucket, img, key):
                uploaded += 1

    # THUMBNAILS
    missing_thumb = set(record['missingThumbnails'])
    for thumb in local['thumbnails']:
        if force or thumb.name in missing_thumb:
            key = f"{prefix}/{thumb.name}"
            if r2lib.na_upload_file(client, bucket, thumb, key):
                uploaded += 1

    return uploaded
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Master Index Rebuild
# -----------------------------------------------------------------------------

    # FUNCTION | Rebuild the Full Master Index From Post-Upload R2 State
    # ------------------------------------------------------------
def na_rebuild_master_index(client, bucket: str, projects: List[Dict]) -> Dict:
    """Thin wrapper — index rebuild logic lives in the shared lib (DRY)."""
    return r2lib.na_index_rebuild_all(client, bucket, projects)
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Project Filtering
# -----------------------------------------------------------------------------

    # FUNCTION | Resolve the Working Project List From CLI Filters
    # ------------------------------------------------------------
def na_resolve_projects(only_project: Optional[str], only_year: Optional[str]) -> List[Dict]:
    """Read enabled masterConfig projects and apply --project / --year filters."""
    projects = r2lib.na_read_master_config_projects(only_enabled=True)

    if only_project:
        target = only_project.strip().strip('/')
        projects = [p for p in projects if p.get('folderId', '').strip('/') == target]

    if only_year:
        year = str(only_year)
        projects = [p for p in projects if p.get('folderId', '').startswith(f"{year}/")]

    return projects
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
            stream.reconfigure(encoding='utf-8')                            # <-- Python 3.7+; no-op if already utf-8
        except Exception:
            pass
    # ------------------------------------------------------------


    # FUNCTION | Parse Arguments, Audit, Optionally Backfill, Rebuild Index
    # ------------------------------------------------------------
def main():
    na_force_utf8_streams()                                                 # <-- Guard against UnicodeEncodeError on Windows
    parser = argparse.ArgumentParser(description='Audit + backfill Cloudflare R2 project.json / images / thumbnails and rebuild the master index.')
    parser.add_argument('--apply',        action='store_true', help='Upload missing files to R2 and write the rebuilt master index.')
    parser.add_argument('--dry-run-only', action='store_true', help='Force audit only (no uploads, no index write). Default behaviour.')
    parser.add_argument('--index-only',   action='store_true', help='Skip auditing/uploads — just rebuild + write the master index from current R2 state.')
    parser.add_argument('--force',        action='store_true', help='With --apply, re-upload every local file even if already on R2.')
    parser.add_argument('--project',      type=str, default=None, help='Limit to one folderId, e.g. 2026/63592__Bressard-Kayode')
    parser.add_argument('--year',         type=str, default=None, help='Limit to one year, e.g. 2026')
    args = parser.parse_args()

    apply_mode = args.apply and not args.dry_run_only                        # <-- Dry-run-only always wins

    print(f"\n{COLOR_BLUE}=============================================================={COLOR_RESET}")
    print(f"{COLOR_BLUE} WHITECARDOPEDIA - R2 AUDIT + BACKFILL{COLOR_RESET}")
    print(f"{COLOR_BLUE}=============================================================={COLOR_RESET}")
    print(f"  Mode        : {COLOR_YELLOW}{'APPLY (uploads + index write)' if apply_mode else 'DRY-RUN (audit only)'}{COLOR_RESET}")
    if args.project: print(f"  Filter      : project = {args.project}")
    if args.year:    print(f"  Filter      : year    = {args.year}")
    print()

    # R2 CLIENT
    creds  = r2lib.na_load_r2_credentials()
    client = r2lib.na_create_r2_client(creds)
    bucket = creds.get('R2_BUCKET_NAME', '')
    if not client or not bucket:
        print(f"{COLOR_RED}✗ R2 client unavailable (boto3 missing or credentials not found at {r2lib.ENV_FILE_PATH}).{COLOR_RESET}")
        sys.exit(2)

    projects = na_resolve_projects(args.project, args.year)
    if not projects:
        print(f"{COLOR_YELLOW}No enabled projects matched the filters.{COLOR_RESET}")
        sys.exit(0)

    # INDEX-ONLY | Rebuild + write the index from current R2 state, then stop
    if args.index_only:
        print(f"{COLOR_CYAN}Rebuilding master index from full enabled project list (no uploads)...{COLOR_RESET}")
        all_enabled = r2lib.na_read_master_config_projects(only_enabled=True)
        index       = na_rebuild_master_index(client, bucket, all_enabled)
        results     = r2lib.na_index_write(client, bucket, index, write_gh_copy=True)
        print(f"  Index projects          : {len(index['projects'])}")
        print(f"  R2 index write          : {COLOR_GREEN+'OK'+COLOR_RESET if results['r2'] else COLOR_RED+'FAILED'+COLOR_RESET}  ({r2lib.R2_INDEX_KEY})")
        print(f"  GH fallback copy write  : {COLOR_GREEN+'OK'+COLOR_RESET if results['gh'] else COLOR_RED+'FAILED'+COLOR_RESET}  ({r2lib.GH_INDEX_PATH})")
        print(f"\n{COLOR_GREEN}Index seeded.{COLOR_RESET}\n")
        sys.exit(0)

    print(f"{COLOR_CYAN}Auditing {len(projects)} project(s)...{COLOR_RESET}\n")

    # AUDIT PASS
    records             = []
    n_missing_json      = 0
    n_missing_images    = 0
    n_missing_thumbs    = 0
    for project in projects:
        record = na_audit_project(client, bucket, project.get('folderId'))
        records.append(record)
        na_print_audit_record(record)
        if record['missingProjectJson']:        n_missing_json   += 1
        n_missing_images += len(record['missingImages'])
        n_missing_thumbs += len(record['missingThumbnails'])

    print(f"\n{COLOR_BLUE}--- Audit Summary ---{COLOR_RESET}")
    print(f"  Projects audited        : {len(records)}")
    print(f"  project.json missing R2 : {COLOR_YELLOW if n_missing_json else COLOR_GREEN}{n_missing_json}{COLOR_RESET}")
    print(f"  Images missing on R2    : {COLOR_YELLOW if n_missing_images else COLOR_GREEN}{n_missing_images}{COLOR_RESET}")
    print(f"  Thumbnails missing R2   : {COLOR_YELLOW if n_missing_thumbs else COLOR_GREEN}{n_missing_thumbs}{COLOR_RESET}")

    if not apply_mode:
        print(f"\n{COLOR_GREY}Dry-run only — no files uploaded, index not written. Re-run with --apply to backfill.{COLOR_RESET}\n")
        sys.exit(0)

    # APPLY PASS — upload missing files
    print(f"\n{COLOR_CYAN}Uploading missing files to R2...{COLOR_RESET}")
    total_uploaded = 0
    for record in records:
        uploaded = na_apply_project(client, bucket, record, force=args.force)
        total_uploaded += uploaded
        if uploaded:
            print(f"  {COLOR_GREEN}+{COLOR_RESET} {record['folderId']}: uploaded {uploaded} file(s).")
    print(f"  {COLOR_GREEN}Uploaded {total_uploaded} file(s) total.{COLOR_RESET}")

    # REBUILD + WRITE INDEX (probe post-upload R2 state, include all enabled projects)
    print(f"\n{COLOR_CYAN}Rebuilding master index from full enabled project list...{COLOR_RESET}")
    all_enabled = r2lib.na_read_master_config_projects(only_enabled=True)     # <-- Index always covers every enabled project
    index       = na_rebuild_master_index(client, bucket, all_enabled)
    results     = r2lib.na_index_write(client, bucket, index, write_gh_copy=True)

    print(f"  Index projects          : {len(index['projects'])}")
    print(f"  R2 index write          : {COLOR_GREEN+'OK'+COLOR_RESET if results['r2'] else COLOR_RED+'FAILED'+COLOR_RESET}  ({r2lib.R2_INDEX_KEY})")
    print(f"  GH fallback copy write  : {COLOR_GREEN+'OK'+COLOR_RESET if results['gh'] else COLOR_RED+'FAILED'+COLOR_RESET}  ({r2lib.GH_INDEX_PATH})")
    print(f"\n{COLOR_GREEN}Backfill complete.{COLOR_RESET}\n")
    # ------------------------------------------------------------


if __name__ == '__main__':
    main()

# endregion -------------------------------------------------------------------
