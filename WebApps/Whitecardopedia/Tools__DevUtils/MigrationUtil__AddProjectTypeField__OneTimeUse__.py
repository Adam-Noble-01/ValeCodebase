#!/usr/bin/env python3
# =============================================================================
# WHITECARDOPEDIA - ONE-TIME MIGRATION UTILITY
# =============================================================================
#
# FILE       : MigrationUtil__AddProjectTypeField__OneTimeUse__.py
# NAMESPACE  : Whitecardopedia
# MODULE     : Migration Utility
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Add ProjectType field to all existing project.json files
# CREATED    : 07-Apr-2026
#
# DESCRIPTION:
# - Scans Projects/2025 and Projects/2026 for all project.json files
# - Adds "ProjectType": "Whitecard" to each file after the projectName key
# - Skips template and example projects (01__TemplateProject, 00__ExampleProject)
# - Skips files that already have a ProjectType field
# - Dry-run mode by default, use --apply flag to write changes
# - Reports count of files scanned, updated, and skipped
#
# USAGE:
# - python MigrationUtil__AddProjectTypeField__OneTimeUse__.py              # Dry-run preview
# - python MigrationUtil__AddProjectTypeField__OneTimeUse__.py --apply      # Apply changes
#
# =============================================================================

import os
import json
import argparse
from pathlib import Path
from collections import OrderedDict

# -----------------------------------------------------------------------------
# REGION | Module Constants and Configuration
# -----------------------------------------------------------------------------

# MODULE CONSTANTS | Paths and Skip Lists
# ------------------------------------------------------------
PROJECTS_BASE_PATH                 = "../Projects"                           # <-- Base path for all project folders
YEAR_FOLDERS                       = ["2025", "2026"]                        # <-- Year folders to scan
SKIP_FOLDERS                       = [                                       # <-- Folders to skip during migration
    "01__TemplateProject",
    "00__ExampleProject",
    "00__TestBlockoutProject",
]
PROJECT_JSON_FILENAME              = "project.json"                          # <-- Project metadata filename
DEFAULT_PROJECT_TYPE               = "Whitecard"                             # <-- Default type for existing projects
# ------------------------------------------------------------


# MODULE CONSTANTS | Console Color Codes
# ------------------------------------------------------------
COLOR_RESET                        = '\033[0m'                               # <-- Reset color
COLOR_GREEN                        = '\033[92m'                              # <-- Success messages
COLOR_YELLOW                       = '\033[93m'                              # <-- Warning messages
COLOR_BLUE                         = '\033[94m'                              # <-- Info messages
COLOR_CYAN                         = '\033[96m'                              # <-- Highlight messages
COLOR_RED                          = '\033[91m'                              # <-- Error messages
# ------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Migration Functions
# -----------------------------------------------------------------------------

# FUNCTION | Insert ProjectType Field After projectName Key
# ------------------------------------------------------------
def insert_project_type(data: dict, project_type: str) -> dict:
    """Insert ProjectType after projectName while preserving key order"""
    new_data = OrderedDict()                                                 # <-- Ordered dict preserves insertion order

    for key, value in data.items():
        new_data[key] = value                                                # <-- Copy existing key
        if key == "projectName":
            new_data["ProjectType"] = project_type                           # <-- Insert ProjectType after projectName

    return dict(new_data)                                                    # <-- Convert back to regular dict
# ---------------------------------------------------------------


# FUNCTION | Process Single Project JSON File
# ------------------------------------------------------------
def process_project_json(json_path: Path, apply: bool) -> str:
    """Process a single project.json file. Returns status string."""
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)                                              # <-- Load existing JSON
    except Exception as error:
        print(f"  {COLOR_RED}[X] Error reading {json_path}: {error}{COLOR_RESET}")
        return "error"

    if "ProjectType" in data:
        print(f"  {COLOR_BLUE}[=] Already has ProjectType: \"{data['ProjectType']}\" - {json_path.parent.name}{COLOR_RESET}")
        return "skipped_existing"

    if "projectName" not in data:
        print(f"  {COLOR_YELLOW}[!] No projectName key found - {json_path.parent.name}{COLOR_RESET}")
        return "skipped_no_name"

    updated_data = insert_project_type(data, DEFAULT_PROJECT_TYPE)           # <-- Insert ProjectType field

    if apply:
        try:
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(updated_data, f, indent=4, ensure_ascii=False)     # <-- Write updated JSON
                f.write('\n')                                                # <-- Trailing newline
            print(f"  {COLOR_GREEN}[+] Updated: {json_path.parent.name} -> ProjectType: \"{DEFAULT_PROJECT_TYPE}\"{COLOR_RESET}")
        except Exception as error:
            print(f"  {COLOR_RED}[X] Error writing {json_path}: {error}{COLOR_RESET}")
            return "error"
    else:
        print(f"  {COLOR_CYAN}[~] Would update: {json_path.parent.name} -> ProjectType: \"{DEFAULT_PROJECT_TYPE}\"{COLOR_RESET}")

    return "updated"
# ---------------------------------------------------------------


# FUNCTION | Scan and Migrate All Project JSON Files
# ------------------------------------------------------------
def run_migration(apply: bool):
    """Scan all year folders and migrate project.json files"""
    script_dir = Path(__file__).parent                                       # <-- Get script directory
    projects_base = (script_dir / PROJECTS_BASE_PATH).resolve()              # <-- Resolve projects base path

    print(f"\n{'=' * 72}")
    print(f"  WHITECARDOPEDIA - ProjectType Migration Utility")
    print(f"{'=' * 72}")
    print(f"\n  Mode: {'APPLY (writing changes)' if apply else 'DRY-RUN (preview only)'}")
    print(f"  Projects Base: {projects_base}\n")

    counts = {"updated": 0, "skipped_existing": 0, "skipped_no_name": 0, "skipped_folder": 0, "error": 0}

    for year in YEAR_FOLDERS:
        year_path = projects_base / year                                     # <-- Construct year folder path

        if not year_path.exists():
            print(f"  {COLOR_YELLOW}[!] Year folder not found: {year_path}{COLOR_RESET}")
            continue

        print(f"\n  --- {year} ---")

        for project_folder in sorted(year_path.iterdir()):
            if not project_folder.is_dir():
                continue                                                     # <-- Skip non-directories

            if project_folder.name in SKIP_FOLDERS:
                print(f"  {COLOR_YELLOW}[S] Skipped (excluded): {project_folder.name}{COLOR_RESET}")
                counts["skipped_folder"] += 1
                continue

            json_path = project_folder / PROJECT_JSON_FILENAME               # <-- Construct project.json path

            if not json_path.exists():
                continue                                                     # <-- Skip folders without project.json

            status = process_project_json(json_path, apply)                  # <-- Process the file
            counts[status] = counts.get(status, 0) + 1

    print(f"\n{'=' * 72}")
    print(f"  SUMMARY")
    print(f"{'=' * 72}")
    print(f"  {'Updated' if apply else 'Would update'} : {counts['updated']}")
    print(f"  Already had ProjectType                   : {counts['skipped_existing']}")
    print(f"  Excluded folders                          : {counts['skipped_folder']}")
    print(f"  Errors                                    : {counts['error']}")
    print(f"{'=' * 72}\n")

    if not apply and counts['updated'] > 0:
        print(f"  {COLOR_YELLOW}Run with --apply flag to write changes.{COLOR_RESET}\n")
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Main Entry Point
# -----------------------------------------------------------------------------

# FUNCTION | Main Entry Point with Argument Parsing
# ------------------------------------------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Add ProjectType field to all existing Whitecardopedia project.json files"
    )
    parser.add_argument(
        '--apply',
        action='store_true',
        help='Apply changes (default is dry-run preview only)'
    )

    args = parser.parse_args()                                               # <-- Parse command line arguments
    run_migration(apply=args.apply)                                          # <-- Run migration
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------
