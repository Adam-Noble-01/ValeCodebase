#!/usr/bin/env python3
# =============================================================================
# WHITECARDOPEDIA - PROJECT TYPE PROMOTION UTILITY (BLOCKOUT -> WHITECARD)
# =============================================================================
#
# FILE       : AutomationUtil__PromoteProjectType__BlockoutToWhitecard__Main__.py
# NAMESPACE  : Whitecardopedia
# MODULE     : Project Type Promotion Utility
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Promote a Blockout project to Whitecard across all three data
#              layers (local production folder, Whitecardopedia web copy, and
#              the Cloudflare R2 mirror) in one auditable pass.
# CREATED    : 04-Sep-2026
#
# DESCRIPTION:
# - A project's model type is recorded in three independent places. This tool
#   moves all three together so the gallery, the KPI report, and the ValeVision
#   Cloud Sync plugin all agree on what the project is.
#
#     LAYER 1 | Local production  C:/01__ValeProjects/ValeProjects__YYYY/
#               - Folder suffix           {code}__{Name}__Blockout
#               - Delivery edition folder 10__ContentDelivered__Local/VisDpt__Blockout__*
#               - ProjectData JSON        00__ProjectData/*__ProjectData__.json
#                                         (Project__Type + Link__WindowsPath values)
#
#     LAYER 2 | Whitecardopedia web copy  Projects/{year}/{code}__{Name}/project.json
#               - "ProjectType" key only. The folder itself carries no suffix.
#
#     LAYER 3 | Cloudflare R2             VaApps/Projects/{year}/{code}__{Name}/project.json
#               - "ProjectType" key inside the object body. The object KEY carries
#                 no suffix and is never renamed by this tool (see note below).
#
# WHY NO R2 KEY RENAME:
# - R2 object keys are deliberately type-agnostic. generate_destination_folder_name()
#   in AutomationUtil__FetchLocalProjects strips __Whitecard / __Blockout / __MaxModel
#   before upload, so every project already lives at a suffix-free path.
# - valeVision_ModelUrls and Na__MasterIndex__ProjectLocations__.json both point at
#   that suffix-free path. Renaming an R2 prefix would break every ValeVision3D
#   model load for the project. The type lives in the JSON body, and that is what
#   this tool patches.
#
# WHY THE EDITION FOLDER MATTERS:
# - na_find_latest_edition_folder() in AutomationUtil__SyncSingleProject requires
#   'Whitecard' in the folder name, and the SketchUp plugin config hardcodes
#   edition_folder_prefix = "VisDpt__Whitecard__". A project left on a
#   VisDpt__Blockout__* edition folder fails its next image re-sync with
#   "No edition folder found in ContentDelivered". Renaming it restores the sync.
#
# WHAT THIS TOOL DELIBERATELY DOES NOT TOUCH:
# - SketchUp .skp / .skb filenames (*__BlockoutModel__*). Nothing reads them
#   programmatically and LayOut references a DrawingsModel .skp by name.
# - LayOut .layout files. Barrett's stores an absolute path to its SketchUp
#   reference and will need a manual relink after the folder rename. The drawing
#   still renders from the embedded copy in the meantime.
# - ValePlanner timecard entries. Those are historical records of work done.
#
# EDIT STRATEGY:
# - Every JSON edit is a targeted text substitution on the raw file bytes, not a
#   json.load / json.dump round trip. This preserves key order, indentation, and
#   the double-escaped backslashes in Link__WindowsPath exactly as authored.
#   Each patched payload is parsed once before writing to prove it is still valid.
#
# USAGE:
#   python AutomationUtil__PromoteProjectType__BlockoutToWhitecard__Main__.py
#       Dry run over every project in the promotion list (default, no writes)
#
#   python ...Main__.py --apply                    Apply all layers
#   python ...Main__.py --project 55495            Single project by code
#   python ...Main__.py --apply --skip-r2          Local + web only
#   python ...Main__.py --apply --skip-local       Web + R2 only (no folder renames)
#   python ...Main__.py --list                     Print the promotion list and exit
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 04-Sep-2026 - Version 1.0.0
# - Initial release. Three-layer promotion with dry-run default, per-project
#   preflight, rollback manifest, and R2 build-manifest cache-bust.
#
# =============================================================================

import os
import re
import sys
import json
import shutil
import argparse
import importlib.util
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple

# Ensure we can import the shared R2 library from Tools__DevUtils
_SCRIPT_DIR = Path(__file__).parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))


# -----------------------------------------------------------------------------
# REGION | Module Constants and Configuration
# -----------------------------------------------------------------------------

    # MODULE CONSTANTS | Paths
    # ------------------------------------------------------------
LOCAL_PROJECTS_BASE          = Path(r"C:\01__ValeProjects")                  # <-- Local production root (year folders below)
WCP_ROOT                     = _SCRIPT_DIR.parent                            # <-- Whitecardopedia app root
WCP_PROJECTS_BASE            = WCP_ROOT / "Projects"                         # <-- Whitecardopedia web projects root
R2_COMMON_LIB                = _SCRIPT_DIR / "AutomationUtil__R2Common__Lib__.py"  # <-- Shared R2 plumbing
MIGRATION_LOG_DIR            = _SCRIPT_DIR / "99__MigrationLogs"             # <-- Rollback manifests written here
    # ------------------------------------------------------------

    # MODULE CONSTANTS | Layer Sub-Paths and Filenames
    # ------------------------------------------------------------
PROJECT_DATA_SUBFOLDER       = "00__ProjectData"                             # <-- Local master data folder
PROJECT_DATA_GLOB            = "*__ProjectData__.json"                       # <-- Local master data filename pattern
CONTENT_DELIVERED_SUBFOLDER  = "10__ContentDelivered__Local"                 # <-- Local delivery root
PROJECT_JSON_FILENAME        = "project.json"                                # <-- Web + R2 metadata filename
R2_BASE_PREFIX               = "VaApps/Projects"                             # <-- R2 root prefix for per-project assets
    # ------------------------------------------------------------

    # MODULE CONSTANTS | Type Tokens
    # ------------------------------------------------------------
TYPE_FROM                    = "Blockout"                                    # <-- Type being promoted away from
TYPE_TO                      = "Whitecard"                                   # <-- Type being promoted to
SUFFIX_FROM                  = f"__{TYPE_FROM}"                              # <-- Local folder suffix, old
SUFFIX_TO                    = f"__{TYPE_TO}"                                # <-- Local folder suffix, new
EDITION_PREFIX_FROM          = f"VisDpt__{TYPE_FROM}__"                      # <-- Delivery edition folder prefix, old
EDITION_PREFIX_TO            = f"VisDpt__{TYPE_TO}__"                        # <-- Delivery edition folder prefix, new
    # ------------------------------------------------------------

    # MODULE CONSTANTS | Targeted Substitution Patterns
    # ------------------------------------------------------------
WEB_TYPE_PATTERN             = re.compile(r'("ProjectType"\s*:\s*)"' + TYPE_FROM + r'"')       # <-- project.json type key
LOCAL_TYPE_PATTERN           = re.compile(r'("Project__Type"\s*:\s*)"' + TYPE_FROM + r'"')     # <-- ProjectData type key
LOCAL_LINK_PATTERN           = re.compile(r'("Link__WindowsPath"\s*:\s*"[^"]*?)' + SUFFIX_FROM) # <-- Link path suffix only
    # ------------------------------------------------------------

    # MODULE CONSTANTS | Promotion List
    # ------------------------------------------------------------
    # Each entry is one project approved for promotion. folder_name is the LOCAL
    # production folder (with the __Blockout suffix); web_folder is the shared
    # Whitecardopedia / R2 folder name (suffix stripped).
    # ------------------------------------------------------------
PROMOTION_LIST: List[Dict] = [
    {"code": "55495", "name": "Barrett",   "year": "2026"},                  # <-- Local + data + delivery all Blockout
    {"code": "63231", "name": "Sellon",    "year": "2026"},                  # <-- Data already Whitecard, folder lagging
    {"code": "63072", "name": "Armstrong", "year": "2026"},                  # <-- Data already Whitecard, folder lagging
    {"code": "63232", "name": "Davies",    "year": "2026"},                  # <-- Local + data + delivery all Blockout
    {"code": "63076", "name": "Thompson",  "year": "2026"},                  # <-- Data already Whitecard, folder lagging
    {"code": "63148", "name": "Marsh",     "year": "2026"},                  # <-- Local + data + delivery all Blockout
]
    # ------------------------------------------------------------

    # MODULE CONSTANTS | Console Color Codes
    # ------------------------------------------------------------
COLOR_RESET                  = '\033[0m'                                     # <-- Reset color
COLOR_GREEN                  = '\033[92m'                                    # <-- Success messages
COLOR_YELLOW                 = '\033[93m'                                    # <-- Warning messages
COLOR_BLUE                   = '\033[94m'                                    # <-- Info messages
COLOR_CYAN                   = '\033[96m'                                    # <-- Highlight messages
COLOR_RED                    = '\033[91m'                                    # <-- Error messages
COLOR_GREY                   = '\033[90m'                                    # <-- Muted / no-change messages
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Console Helpers
# -----------------------------------------------------------------------------

    # FUNCTION | Enable ANSI Colour Output on Windows Consoles
    # ------------------------------------------------------------
def na_enable_ansi() -> None:
    """Turn on virtual terminal processing so colour codes render in cmd.exe."""
    if os.name != 'nt':
        return
    try:
        import ctypes
        kernel32 = ctypes.windll.kernel32
        kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)               # <-- ENABLE_VIRTUAL_TERMINAL_PROCESSING
    except Exception:
        pass                                                                 # <-- Colour is cosmetic; never fail on it
    # ------------------------------------------------------------


    # FUNCTION | Print a Section Banner
    # ------------------------------------------------------------
def na_banner(text: str, color: str = COLOR_CYAN) -> None:
    """Print a full-width section heading."""
    print(f"\n{color}{'=' * 78}{COLOR_RESET}")
    print(f"{color}  {text}{COLOR_RESET}")
    print(f"{color}{'=' * 78}{COLOR_RESET}")
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Shared R2 Library Loader
# -----------------------------------------------------------------------------

_R2_LIB_CACHE = None

    # FUNCTION | Load the Shared R2 Library by Path
    # ------------------------------------------------------------
def na_load_r2_lib():
    """Import AutomationUtil__R2Common__Lib__.py once and cache the module."""
    global _R2_LIB_CACHE
    if _R2_LIB_CACHE is not None:
        return _R2_LIB_CACHE
    if not R2_COMMON_LIB.is_file():
        return None
    try:
        spec = importlib.util.spec_from_file_location("na_r2_common", R2_COMMON_LIB)
        mod  = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        _R2_LIB_CACHE = mod
    except Exception as error:
        print(f"{COLOR_RED}[!] Could not load the shared R2 library: {error}{COLOR_RESET}")
        _R2_LIB_CACHE = None
    return _R2_LIB_CACHE
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Path Resolution
# -----------------------------------------------------------------------------

    # FUNCTION | Resolve Every Path a Single Project Touches
    # ------------------------------------------------------------
def na_resolve_project_paths(entry: Dict) -> Dict:
    """Build the full path set for one promotion-list entry."""
    code        = entry['code']
    name        = entry['name']
    year        = entry['year']
    web_folder  = f"{code}__{name}"                                          # <-- Shared web + R2 folder name (no suffix)
    local_old   = LOCAL_PROJECTS_BASE / f"ValeProjects__{year}" / f"{web_folder}{SUFFIX_FROM}"
    local_new   = LOCAL_PROJECTS_BASE / f"ValeProjects__{year}" / f"{web_folder}{SUFFIX_TO}"

    return {
        'code'           : code,
        'name'           : name,
        'year'           : year,
        'web_folder'     : web_folder,
        'folder_id'      : f"{year}/{web_folder}",
        'local_old'      : local_old,
        'local_new'      : local_new,
        'wcp_dir'        : WCP_PROJECTS_BASE / year / web_folder,
        'wcp_json'       : WCP_PROJECTS_BASE / year / web_folder / PROJECT_JSON_FILENAME,
        'r2_key'         : f"{R2_BASE_PREFIX}/{year}/{web_folder}/{PROJECT_JSON_FILENAME}",
    }
    # ------------------------------------------------------------


    # FUNCTION | Locate the Local ProjectData JSON File
    # ------------------------------------------------------------
def na_find_project_data_file(project_root: Path) -> Optional[Path]:
    """Return the *__ProjectData__.json under 00__ProjectData, or None."""
    data_dir = project_root / PROJECT_DATA_SUBFOLDER
    if not data_dir.is_dir():
        return None
    matches = sorted(data_dir.glob(PROJECT_DATA_GLOB))
    return matches[0] if matches else None
    # ------------------------------------------------------------


    # FUNCTION | Locate Delivery Edition Folders Still Named Blockout
    # ------------------------------------------------------------
def na_find_blockout_edition_folders(project_root: Path) -> List[Path]:
    """Return every VisDpt__Blockout__* delivery folder under ContentDelivered."""
    content_dir = project_root / CONTENT_DELIVERED_SUBFOLDER
    if not content_dir.is_dir():
        return []
    return sorted(
        d for d in content_dir.iterdir()
        if d.is_dir() and d.name.startswith(EDITION_PREFIX_FROM)
    )
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Preflight Checks
# -----------------------------------------------------------------------------

    # FUNCTION | Verify a Project Is Safe to Promote
    # ------------------------------------------------------------
def na_preflight_project(paths: Dict, r2_client, r2_bucket: str, skip_r2: bool) -> Dict:
    """Inspect all three layers and return a findings dict. Never writes."""
    findings = {
        'blockers'          : [],                                            # <-- Hard stops
        'warnings'          : [],                                            # <-- Proceed, but flag
        'local_present'     : False,
        'local_already_new' : False,
        'data_file'         : None,
        'data_type_hit'     : 0,
        'data_link_hits'    : 0,
        'edition_folders'   : [],
        'web_hit'           : 0,
        'r2_hit'            : 0,
        'r2_present'        : False,
    }

    # LAYER 1 | Local production folder
    if paths['local_old'].is_dir():
        findings['local_present'] = True
        if paths['local_new'].exists():
            findings['blockers'].append(
                f"Destination folder already exists: {paths['local_new'].name}"
            )
    elif paths['local_new'].is_dir():
        findings['local_already_new'] = True                                 # <-- Folder rename already done
    else:
        findings['warnings'].append("No local production folder found for either suffix.")

    local_root = paths['local_old'] if findings['local_present'] else paths['local_new']

    if local_root.is_dir():
        data_file = na_find_project_data_file(local_root)
        if data_file:
            findings['data_file'] = data_file
            raw = data_file.read_text(encoding='utf-8')
            findings['data_type_hit']  = len(LOCAL_TYPE_PATTERN.findall(raw))
            findings['data_link_hits'] = len(LOCAL_LINK_PATTERN.findall(raw))
        else:
            findings['warnings'].append("No *__ProjectData__.json found under 00__ProjectData.")
        findings['edition_folders'] = na_find_blockout_edition_folders(local_root)

    # LAYER 2 | Whitecardopedia web copy
    if paths['wcp_json'].is_file():
        raw = paths['wcp_json'].read_text(encoding='utf-8')
        findings['web_hit'] = len(WEB_TYPE_PATTERN.findall(raw))
    else:
        findings['blockers'].append(f"Missing web project.json: {paths['wcp_json']}")

    # LAYER 3 | Cloudflare R2 mirror
    if not skip_r2:
        if r2_client is None:
            findings['warnings'].append("No R2 client available; R2 layer will be skipped.")
        else:
            try:
                body = r2_client.get_object(Bucket=r2_bucket, Key=paths['r2_key'])['Body'].read().decode('utf-8')
                findings['r2_present'] = True
                findings['r2_hit']     = len(WEB_TYPE_PATTERN.findall(body))
            except Exception:
                findings['warnings'].append(f"R2 object not readable: {paths['r2_key']}")

    return findings
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Layer Operations
# -----------------------------------------------------------------------------

    # FUNCTION | Apply a Targeted Substitution to a JSON File on Disk
    # ------------------------------------------------------------
def na_patch_json_file(path: Path, substitutions: List[Tuple[re.Pattern, str]], apply: bool) -> Tuple[int, Optional[str]]:
    """Run each (pattern, replacement) over the raw file text.

    Returns (total_replacements, error). The patched text is parsed as JSON
    before it is written, so a bad substitution can never land on disk.

    Both the read and the write pass newline='' so the file's existing line
    endings survive untouched. These files are CRLF; letting Python translate
    them would rewrite every line and bury the one real edit in a whole-file
    git diff.
    """
    try:
        with path.open('r', encoding='utf-8', newline='') as handle:
            original = handle.read()                                         # <-- CRLF preserved verbatim
    except Exception as error:
        return 0, f"read failed: {error}"

    patched = original
    total   = 0
    for pattern, replacement in substitutions:
        patched, count = pattern.subn(replacement, patched)
        total += count

    if total == 0:
        return 0, None                                                       # <-- Nothing to do, not an error

    try:
        json.loads(patched)                                                  # <-- Prove the result is still valid JSON
    except Exception as error:
        return 0, f"patched content is not valid JSON, aborted: {error}"

    if apply:
        try:
            with path.open('w', encoding='utf-8', newline='') as handle:
                handle.write(patched)                                        # <-- Write back byte-for-byte apart from the edit
        except Exception as error:
            return 0, f"write failed: {error}"

    return total, None
    # ------------------------------------------------------------


    # FUNCTION | Rename the Delivery Edition Folders
    # ------------------------------------------------------------
def na_rename_edition_folders(folders: List[Path], apply: bool, journal: List[Dict]) -> Tuple[int, List[str]]:
    """Rename VisDpt__Blockout__* to VisDpt__Whitecard__*, preserving the tail."""
    renamed = 0
    errors  = []
    for old in folders:
        new_name = EDITION_PREFIX_TO + old.name[len(EDITION_PREFIX_FROM):]
        new_path = old.parent / new_name
        if new_path.exists():
            errors.append(f"edition destination exists: {new_name}")
            continue
        if apply:
            try:
                old.rename(new_path)
                journal.append({'op': 'rename', 'from': str(old), 'to': str(new_path)})
            except Exception as error:
                errors.append(f"edition rename failed ({old.name}): {error}")
                continue
        renamed += 1
    return renamed, errors
    # ------------------------------------------------------------


    # FUNCTION | Rename the Local Production Project Folder
    # ------------------------------------------------------------
def na_rename_project_folder(old: Path, new: Path, apply: bool, journal: List[Dict]) -> Optional[str]:
    """Rename {code}__{Name}__Blockout to {code}__{Name}__Whitecard."""
    if new.exists():
        return f"destination exists: {new.name}"
    if not apply:
        return None
    try:
        old.rename(new)
        journal.append({'op': 'rename', 'from': str(old), 'to': str(new)})
        return None
    except PermissionError as error:
        return f"folder is locked, close any open file inside it and retry ({error})"
    except Exception as error:
        return f"rename failed: {error}"
    # ------------------------------------------------------------


    # FUNCTION | Patch the ProjectType Key Inside the R2 project.json Object
    # ------------------------------------------------------------
def na_patch_r2_project_json(lib, client, bucket: str, key: str, apply: bool) -> Tuple[int, Optional[str]]:
    """Download, substitute, validate, re-upload. The object key never changes."""
    try:
        body = client.get_object(Bucket=bucket, Key=key)['Body'].read().decode('utf-8')
    except Exception as error:
        return 0, f"R2 read failed: {error}"

    patched, count = WEB_TYPE_PATTERN.subn(r'\1"' + TYPE_TO + '"', body)
    if count == 0:
        return 0, None                                                       # <-- Already promoted or key absent

    try:
        json.loads(patched)                                                  # <-- Never upload malformed JSON
    except Exception as error:
        return 0, f"patched R2 content is not valid JSON, aborted: {error}"

    if apply:
        ok = lib.na_put_bytes(client, bucket, key, patched.encode('utf-8'), "application/json")
        if not ok:
            return 0, "R2 upload failed"

    return count, None
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Per-Project Promotion
# -----------------------------------------------------------------------------

    # FUNCTION | Promote One Project Across Every Enabled Layer
    # ------------------------------------------------------------
def na_promote_project(entry: Dict, args, r2_lib, r2_client, r2_bucket: str, journal: List[Dict]) -> Dict:
    """Run preflight then each layer. Returns a result dict for the summary."""
    paths  = na_resolve_project_paths(entry)
    apply  = args.apply
    label  = f"{paths['code']} {paths['name']}"

    result = {
        'label'     : label,
        'folder_id' : paths['folder_id'],
        'blocked'   : False,
        'actions'   : [],
        'errors'    : [],
        'warnings'  : [],
    }

    print(f"\n{COLOR_CYAN}--- {label} {'-' * max(0, 62 - len(label))}{COLOR_RESET}")

    findings = na_preflight_project(paths, r2_client, r2_bucket, args.skip_r2)
    result['warnings'] = findings['warnings']

    for warning in findings['warnings']:
        print(f"  {COLOR_YELLOW}[warn]  {warning}{COLOR_RESET}")

    if findings['blockers']:
        result['blocked'] = True
        result['errors']  = findings['blockers']
        for blocker in findings['blockers']:
            print(f"  {COLOR_RED}[BLOCK] {blocker}{COLOR_RESET}")
        print(f"  {COLOR_RED}Skipped. Resolve the blocker above and re-run.{COLOR_RESET}")
        return result

    local_root = paths['local_old'] if findings['local_present'] else paths['local_new']

    # LAYER 1a | Delivery edition folders (do these before the parent rename)
    if not args.skip_local and findings['edition_folders']:
        renamed, errors = na_rename_edition_folders(findings['edition_folders'], apply, journal)
        for folder in findings['edition_folders']:
            new_name = EDITION_PREFIX_TO + folder.name[len(EDITION_PREFIX_FROM):]
            print(f"  {COLOR_GREEN}[local] edition folder {folder.name}{COLOR_RESET}")
            print(f"          {COLOR_GREEN}-> {new_name}{COLOR_RESET}")
        if renamed:
            result['actions'].append(f"{renamed} edition folder(s) renamed")
        result['errors'].extend(errors)
        for error in errors:
            print(f"  {COLOR_RED}[error] {error}{COLOR_RESET}")
    elif not args.skip_local:
        print(f"  {COLOR_GREY}[local] edition folder already Whitecard, nothing to rename{COLOR_RESET}")

    # LAYER 1b | Local ProjectData JSON (type key and link path suffixes)
    if not args.skip_local and findings['data_file']:
        subs = [
            (LOCAL_TYPE_PATTERN, r'\1"' + TYPE_TO + '"'),
            (LOCAL_LINK_PATTERN, r'\1' + SUFFIX_TO),
        ]
        count, error = na_patch_json_file(findings['data_file'], subs, apply)
        if error:
            result['errors'].append(f"ProjectData: {error}")
            print(f"  {COLOR_RED}[error] ProjectData: {error}{COLOR_RESET}")
        elif count:
            detail = f"Project__Type x{findings['data_type_hit']}, Link__WindowsPath x{findings['data_link_hits']}"
            result['actions'].append(f"ProjectData patched ({count} edits)")
            print(f"  {COLOR_GREEN}[local] {findings['data_file'].name}: {detail}{COLOR_RESET}")
        else:
            print(f"  {COLOR_GREY}[local] {findings['data_file'].name}: already Whitecard{COLOR_RESET}")

    # LAYER 1c | Local production folder rename (last, so earlier paths stay valid)
    if not args.skip_local and findings['local_present']:
        error = na_rename_project_folder(paths['local_old'], paths['local_new'], apply, journal)
        if error:
            result['errors'].append(f"folder rename: {error}")
            print(f"  {COLOR_RED}[error] folder rename: {error}{COLOR_RESET}")
        else:
            result['actions'].append("project folder renamed")
            print(f"  {COLOR_GREEN}[local] {paths['local_old'].name}{COLOR_RESET}")
            print(f"          {COLOR_GREEN}-> {paths['local_new'].name}{COLOR_RESET}")
    elif not args.skip_local and findings['local_already_new']:
        print(f"  {COLOR_GREY}[local] folder already carries the Whitecard suffix{COLOR_RESET}")

    # LAYER 2 | Whitecardopedia web project.json
    if not args.skip_web:
        if findings['web_hit']:
            count, error = na_patch_json_file(
                paths['wcp_json'], [(WEB_TYPE_PATTERN, r'\1"' + TYPE_TO + '"')], apply
            )
            if error:
                result['errors'].append(f"web project.json: {error}")
                print(f"  {COLOR_RED}[error] web project.json: {error}{COLOR_RESET}")
            else:
                result['actions'].append("web project.json patched")
                print(f"  {COLOR_GREEN}[web]   Projects/{paths['folder_id']}/project.json: ProjectType -> {TYPE_TO}{COLOR_RESET}")
        else:
            print(f"  {COLOR_GREY}[web]   project.json: already Whitecard{COLOR_RESET}")

    # LAYER 3 | Cloudflare R2 project.json object body
    if not args.skip_r2 and r2_client is not None:
        if findings['r2_present'] and findings['r2_hit']:
            count, error = na_patch_r2_project_json(r2_lib, r2_client, r2_bucket, paths['r2_key'], apply)
            if error:
                result['errors'].append(f"R2 project.json: {error}")
                print(f"  {COLOR_RED}[error] R2 project.json: {error}{COLOR_RESET}")
            else:
                result['actions'].append("R2 project.json patched")
                print(f"  {COLOR_GREEN}[r2]    {paths['r2_key']}: ProjectType -> {TYPE_TO}{COLOR_RESET}")
        elif findings['r2_present']:
            print(f"  {COLOR_GREY}[r2]    project.json: already Whitecard{COLOR_RESET}")

    return result
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Rollback Journal
# -----------------------------------------------------------------------------

    # FUNCTION | Write the Rename Journal for Manual Rollback
    # ------------------------------------------------------------
def na_write_journal(journal: List[Dict]) -> Optional[Path]:
    """Persist every rename performed so it can be reversed by hand if needed."""
    if not journal:
        return None
    try:
        MIGRATION_LOG_DIR.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        path  = MIGRATION_LOG_DIR / f"PromoteProjectType__RenameJournal__{stamp}.json"
        payload = {
            'generatedAt' : datetime.now().strftime('%d-%b-%Y at %H:%M'),
            'promotion'   : f"{TYPE_FROM} -> {TYPE_TO}",
            'note'        : 'Reverse each entry by renaming "to" back to "from", newest first.',
            'renames'     : journal,
        }
        path.write_text(json.dumps(payload, indent=4), encoding='utf-8')
        return path
    except Exception as error:
        print(f"{COLOR_YELLOW}[!] Could not write the rename journal: {error}{COLOR_RESET}")
        return None
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Main Entry Point
# -----------------------------------------------------------------------------

    # FUNCTION | Parse Command Line Arguments
    # ------------------------------------------------------------
def na_parse_args():
    parser = argparse.ArgumentParser(
        description=f"Promote {TYPE_FROM} projects to {TYPE_TO} across local, web and R2 layers."
    )
    parser.add_argument('--apply',      action='store_true', help='Write changes. Without this flag the tool only previews.')
    parser.add_argument('--project',    type=str, default=None, help='Limit to one project code, e.g. 55495')
    parser.add_argument('--skip-local', action='store_true', help='Leave the local C: production folder untouched')
    parser.add_argument('--skip-web',   action='store_true', help='Leave the Whitecardopedia web copy untouched')
    parser.add_argument('--skip-r2',    action='store_true', help='Leave the Cloudflare R2 mirror untouched')
    parser.add_argument('--no-bump',    action='store_true', help='Do not bump the R2 build manifest after applying')
    parser.add_argument('--list',       action='store_true', help='Print the promotion list and exit')
    return parser.parse_args()
    # ------------------------------------------------------------


    # FUNCTION | Main
    # ------------------------------------------------------------
def main() -> int:
    na_enable_ansi()
    args = na_parse_args()

    if args.list:
        na_banner(f"PROMOTION LIST ({TYPE_FROM} -> {TYPE_TO})")
        for entry in PROMOTION_LIST:
            paths = na_resolve_project_paths(entry)
            print(f"  {entry['code']:8s} {entry['name']:14s} {paths['folder_id']}")
        return 0

    entries = PROMOTION_LIST
    if args.project:
        entries = [e for e in PROMOTION_LIST if e['code'] == args.project.strip()]
        if not entries:
            print(f"{COLOR_RED}No project with code '{args.project}' in the promotion list.{COLOR_RESET}")
            return 1

    mode      = "APPLY" if args.apply else "DRY RUN"
    mode_col  = COLOR_RED if args.apply else COLOR_BLUE
    na_banner(f"PROJECT TYPE PROMOTION  {TYPE_FROM} -> {TYPE_TO}   [{mode}]", mode_col)
    print(f"  Projects       : {len(entries)}")
    print(f"  Local base     : {LOCAL_PROJECTS_BASE}")
    print(f"  Web base       : {WCP_PROJECTS_BASE}")
    print(f"  Layers         : local={not args.skip_local}  web={not args.skip_web}  r2={not args.skip_r2}")
    if not args.apply:
        print(f"\n  {COLOR_BLUE}No files will be written. Re-run with --apply to commit these changes.{COLOR_RESET}")

    # R2 CLIENT | Built once and shared across every project
    r2_lib, r2_client, r2_bucket = None, None, ""
    if not args.skip_r2:
        r2_lib = na_load_r2_lib()
        if r2_lib:
            creds     = r2_lib.na_load_r2_credentials()
            r2_client = r2_lib.na_create_r2_client(creds)
            r2_bucket = creds.get('R2_BUCKET_NAME', '')
            if r2_client:
                print(f"  R2 bucket      : {r2_bucket}")
            else:
                print(f"  {COLOR_YELLOW}R2 bucket      : unavailable (missing credentials or boto3){COLOR_RESET}")

    journal: List[Dict] = []
    results: List[Dict] = []

    na_banner("PER-PROJECT DETAIL", COLOR_CYAN)
    for entry in entries:
        results.append(na_promote_project(entry, args, r2_lib, r2_client, r2_bucket, journal))

    # BUILD MANIFEST | Bump the cache-bust token so the edge serves the new bodies
    if args.apply and not args.skip_r2 and not args.no_bump and r2_client is not None:
        r2_touched = any('R2 project.json patched' in a for r in results for a in r['actions'])
        if r2_touched:
            ok = r2_lib.na_write_build_manifest(r2_client, r2_bucket, "ProjectType promotion")
            state = f"{COLOR_GREEN}bumped{COLOR_RESET}" if ok else f"{COLOR_RED}FAILED{COLOR_RESET}"
            print(f"\n  R2 build manifest: {state}")

    # SUMMARY
    na_banner("SUMMARY", COLOR_CYAN)
    blocked = sum(1 for r in results if r['blocked'])
    errored = sum(1 for r in results if r['errors'] and not r['blocked'])
    changed = sum(1 for r in results if r['actions'])

    for r in results:
        if r['blocked']:
            mark, col = "BLOCKED", COLOR_RED
        elif r['errors']:
            mark, col = "ERRORS ", COLOR_RED
        elif r['actions']:
            mark, col = "CHANGED", COLOR_GREEN
        else:
            mark, col = "NO-OP  ", COLOR_GREY
        detail = ", ".join(r['actions']) if r['actions'] else "nothing to change"
        print(f"  {col}[{mark}]{COLOR_RESET} {r['label']:20s} {detail}")

    print(f"\n  Projects with changes : {changed}")
    print(f"  Blocked               : {blocked}")
    print(f"  With errors           : {errored}")

    journal_path = na_write_journal(journal)
    if journal_path:
        print(f"  Rename journal        : {journal_path.name}")

    if not args.apply:
        print(f"\n{COLOR_BLUE}  Dry run complete. Nothing was written.{COLOR_RESET}")
    else:
        print(f"\n{COLOR_GREEN}  Apply complete.{COLOR_RESET}")
        if not args.skip_web:
            print(f"{COLOR_YELLOW}  Next: commit and push the Whitecardopedia project.json changes so the")
            print(f"  GitHub Pages fallback copies match R2.{COLOR_RESET}")

    return 1 if (blocked or errored) else 0
    # ------------------------------------------------------------


if __name__ == '__main__':
    sys.exit(main())

# endregion -------------------------------------------------------------------
