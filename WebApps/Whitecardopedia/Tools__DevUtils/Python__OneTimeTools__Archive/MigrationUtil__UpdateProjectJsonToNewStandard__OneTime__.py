#!/usr/bin/env python3
# =============================================================================
# WHITECARDOPEDIA - PROJECT JSON MIGRATION UTILITY (ONE-TIME USE)
# =============================================================================
#
# FILE       : MigrationUtil__UpdateProjectJsonToNewStandard__OneTime__.py
# NAMESPACE  : Whitecardopedia
# MODULE     : Project JSON Migration Utility
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Migrate project.json files to new standard (remove projectDate, clean runtime fields)
# CREATED    : 2025
#
# DESCRIPTION:
# - One-time migration script to update all project.json files to new standard
# - Migrates projectDate from root level to scheduleData.dateFulfilled
# - Removes runtime fields that shouldn't be persisted (folderId, basePath, etc.)
# - Creates timestamped backups before making any changes
# - Dry-run mode by default with confirmation prompt
# - Preserves all other data intact
#
# USAGE:
# - python MigrationUtil__UpdateProjectJsonToNewStandard__OneTime__.py                # Dry-run preview
# - python MigrationUtil__UpdateProjectJsonToNewStandard__OneTime__.py --execute      # Execute migration
# - python MigrationUtil__UpdateProjectJsonToNewStandard__OneTime__.py --project VN-61445__Vaughan  # Specific project
#
# =============================================================================

import os
import json
import shutil
import argparse
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Tuple, Optional

# -----------------------------------------------------------------------------
# REGION | Module Constants and Configuration
# -----------------------------------------------------------------------------

# MODULE CONSTANTS | Paths and Filenames
# ------------------------------------------------------------
PROJECTS_BASE_PATH                 = "../Projects/2025"                     # <-- Projects folder path
PROJECT_JSON_FILENAME              = "project.json"                          # <-- Project metadata filename
BACKUP_FOLDER_PREFIX               = "__BACKUP__"                            # <-- Backup folder prefix
# ------------------------------------------------------------


# MODULE CONSTANTS | Runtime Fields to Remove
# ------------------------------------------------------------
RUNTIME_FIELDS_TO_REMOVE           = [                                      # <-- Fields added by loader at runtime
    'folderId',
    'basePath',
    'displayImages',
    'artPairsMap',
    'allImages'
]
# ------------------------------------------------------------


# MODULE CONSTANTS | Folders to Skip
# ------------------------------------------------------------
SKIP_FOLDERS                       = [                                      # <-- Template and example folders
    '01__TemplateProject',
    '00__ExampleProject'
]
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
# REGION | File Discovery Functions
# -----------------------------------------------------------------------------

# FUNCTION | Find All Project JSON Files
# ------------------------------------------------------------
def find_all_project_json_files(base_path: Path, target_project: Optional[str] = None) -> List[Path]:
    project_files = []                                                    # <-- Initialize project files list
    
    if not base_path.exists() or not base_path.is_dir():
        return project_files                                              # <-- Return empty if path invalid
    
    for item in sorted(base_path.iterdir()):
        if not item.is_dir() or item.name.startswith('.'):
            continue                                                      # <-- Skip non-directories and hidden
        
        if item.name in SKIP_FOLDERS:
            continue                                                      # <-- Skip template folders
        
        if target_project and item.name != target_project:
            continue                                                      # <-- Skip if not target project
        
        project_json = item / PROJECT_JSON_FILENAME                       # <-- Construct project.json path
        
        if project_json.exists() and project_json.is_file():
            project_files.append(project_json)                            # <-- Add to list
    
    return project_files                                                  # <-- Return discovered files
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Backup Functions
# -----------------------------------------------------------------------------

# FUNCTION | Create Timestamped Backup Folder
# ------------------------------------------------------------
def create_backup_folder(base_path: Path) -> Optional[Path]:
    timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')              # <-- Create timestamp
    backup_folder_name = f"{BACKUP_FOLDER_PREFIX}{timestamp}"             # <-- Construct backup folder name
    backup_path = base_path / backup_folder_name                          # <-- Construct backup path
    
    try:
        backup_path.mkdir(parents=True, exist_ok=True)                    # <-- Create backup folder
        return backup_path                                                # <-- Return backup path
    except Exception as error:
        print(f"{COLOR_RED}Error creating backup folder: {error}{COLOR_RESET}")  # <-- Log error
        return None                                                       # <-- Return None on failure
# ---------------------------------------------------------------


# FUNCTION | Backup Single Project JSON File
# ------------------------------------------------------------
def backup_project_json(project_json_path: Path, backup_folder: Path) -> bool:
    project_folder_name = project_json_path.parent.name                   # <-- Get project folder name
    backup_project_folder = backup_folder / project_folder_name           # <-- Construct backup project folder
    
    try:
        backup_project_folder.mkdir(parents=True, exist_ok=True)          # <-- Create backup project folder
        backup_file = backup_project_folder / PROJECT_JSON_FILENAME       # <-- Construct backup file path
        shutil.copy2(project_json_path, backup_file)                      # <-- Copy file with metadata
        return True                                                       # <-- Return success
    except Exception as error:
        print(f"{COLOR_RED}Error backing up {project_json_path}: {error}{COLOR_RESET}")  # <-- Log error
        return False                                                      # <-- Return failure
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | JSON Migration Functions
# -----------------------------------------------------------------------------

# FUNCTION | Migrate Single Project JSON
# ------------------------------------------------------------
def migrate_project_json(project_json_path: Path, dry_run: bool) -> Dict:
    result = {
        'project_name': project_json_path.parent.name,
        'success': False,
        'changes': [],
        'skipped': False,
        'error': None
    }
    
    try:
        # LOAD PROJECT JSON
        with open(project_json_path, 'r', encoding='utf-8') as file:      # <-- Open file for reading
            project_data = json.load(file)                                # <-- Parse JSON content
        
        changes_made = []                                                 # <-- Track changes
        
        # MIGRATE PROJECT DATE TO SCHEDULE DATA
        if 'projectDate' in project_data:
            project_date_value = project_data['projectDate']              # <-- Get projectDate value
            
            if 'scheduleData' not in project_data:
                project_data['scheduleData'] = {}                         # <-- Create scheduleData if missing
            
            if 'dateFulfilled' not in project_data['scheduleData']:
                project_data['scheduleData']['dateFulfilled'] = project_date_value  # <-- Set dateFulfilled
                changes_made.append(f"Migrated projectDate → scheduleData.dateFulfilled ({project_date_value})")
            else:
                changes_made.append(f"Removed projectDate (dateFulfilled already exists: {project_data['scheduleData']['dateFulfilled']})")
            
            del project_data['projectDate']                               # <-- Remove old projectDate field
        
        # REMOVE RUNTIME FIELDS
        removed_runtime_fields = []                                       # <-- Track removed runtime fields
        for field in RUNTIME_FIELDS_TO_REMOVE:
            if field in project_data:
                del project_data[field]                                   # <-- Remove runtime field
                removed_runtime_fields.append(field)                      # <-- Track removal
        
        if removed_runtime_fields:
            changes_made.append(f"Cleaned runtime fields: {', '.join(removed_runtime_fields)}")
        
        # CHECK IF ANY CHANGES WERE MADE
        if not changes_made:
            result['skipped'] = True                                      # <-- Mark as skipped
            result['success'] = True                                      # <-- Not an error
            return result                                                 # <-- Return skip result
        
        result['changes'] = changes_made                                  # <-- Store changes
        
        # WRITE UPDATED JSON (IF NOT DRY-RUN)
        if not dry_run:
            with open(project_json_path, 'w', encoding='utf-8') as file:  # <-- Open file for writing
                json.dump(project_data, file, indent=4, ensure_ascii=False)  # <-- Write formatted JSON
                file.write('\n')                                          # <-- Add trailing newline
        
        result['success'] = True                                          # <-- Mark as successful
        return result                                                     # <-- Return success result
        
    except Exception as error:
        result['error'] = str(error)                                      # <-- Store error message
        return result                                                     # <-- Return error result
# ---------------------------------------------------------------


# FUNCTION | Migrate All Project JSON Files
# ------------------------------------------------------------
def migrate_all_projects(project_files: List[Path], backup_folder: Optional[Path], dry_run: bool) -> List[Dict]:
    results = []                                                          # <-- Initialize results list
    
    for project_json_path in project_files:
        # CREATE BACKUP (IF NOT DRY-RUN AND BACKUP FOLDER EXISTS)
        if not dry_run and backup_folder:
            if not backup_project_json(project_json_path, backup_folder):
                results.append({
                    'project_name': project_json_path.parent.name,
                    'success': False,
                    'changes': [],
                    'skipped': False,
                    'error': 'Failed to create backup'
                })
                continue                                                  # <-- Skip if backup fails
        
        # MIGRATE PROJECT JSON
        result = migrate_project_json(project_json_path, dry_run)         # <-- Migrate project
        results.append(result)                                            # <-- Add result to list
    
    return results                                                        # <-- Return all results
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Console Output and Reporting
# -----------------------------------------------------------------------------

# FUNCTION | Print Migration Results
# ------------------------------------------------------------
def print_results(results: List[Dict], dry_run: bool):
    print(f"\n{COLOR_CYAN}{'='*80}{COLOR_RESET}")                        # <-- Print header divider
    print(f"{COLOR_CYAN}MIGRATION RESULTS{COLOR_RESET}")                 # <-- Print header title
    print(f"{COLOR_CYAN}{'='*80}{COLOR_RESET}\n")                        # <-- Print header divider
    
    total_projects = len(results)                                         # <-- Count total projects
    migrated = sum(1 for r in results if r['success'] and not r['skipped'])  # <-- Count migrated
    skipped = sum(1 for r in results if r['skipped'])                     # <-- Count skipped
    errors = sum(1 for r in results if not r['success'])                  # <-- Count errors
    
    for result in results:
        project_name = result['project_name']                             # <-- Get project name
        
        if result['skipped']:
            print(f"{COLOR_BLUE}[SKIP] {project_name}{COLOR_RESET}")     # <-- Print skip indicator
            print(f"    No changes needed - already migrated\n")          # <-- Print skip message
            continue
        
        if not result['success']:
            print(f"{COLOR_RED}[ERROR] {project_name}{COLOR_RESET}")     # <-- Print error indicator
            print(f"    Error: {result['error']}\n")                      # <-- Print error message
            continue
        
        print(f"{COLOR_GREEN}[{'PREVIEW' if dry_run else 'MIGRATED'}] {project_name}{COLOR_RESET}")  # <-- Print success indicator
        for change in result['changes']:
            print(f"    - {change}")                                      # <-- Print each change
        print()
    
    print(f"{COLOR_CYAN}{'='*80}{COLOR_RESET}")                          # <-- Print footer divider
    print(f"{COLOR_CYAN}SUMMARY{COLOR_RESET}")                           # <-- Print summary title
    print(f"{COLOR_CYAN}{'='*80}{COLOR_RESET}")                          # <-- Print footer divider
    print(f"Projects processed   : {total_projects}")                     # <-- Print total projects
    print(f"{'Would migrate' if dry_run else 'Migrated'}       : {migrated}")  # <-- Print migrated count
    print(f"Skipped (no changes) : {skipped}")                            # <-- Print skipped count
    print(f"Errors               : {errors}")                             # <-- Print error count
    
    if dry_run:
        print(f"\n{COLOR_YELLOW}DRY RUN MODE: No files were modified{COLOR_RESET}")  # <-- Print dry-run notice
    
    print(f"{COLOR_CYAN}{'='*80}{COLOR_RESET}\n")                        # <-- Print closing divider
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | User Confirmation Functions
# -----------------------------------------------------------------------------

# FUNCTION | Prompt User for Confirmation
# ------------------------------------------------------------
def prompt_for_confirmation() -> bool:
    print(f"\n{COLOR_YELLOW}{'='*80}{COLOR_RESET}")                      # <-- Print confirmation divider
    print(f"{COLOR_YELLOW}CONFIRMATION REQUIRED{COLOR_RESET}")           # <-- Print confirmation header
    print(f"{COLOR_YELLOW}{'='*80}{COLOR_RESET}")                        # <-- Print confirmation divider
    
    try:
        response = input(f"\n{COLOR_CYAN}Proceed with migration? (yes/no): {COLOR_RESET}").strip().lower()  # <-- Get user input
        
        if response in ['yes', 'y']:
            print(f"{COLOR_GREEN}[OK] Confirmed - Proceeding with migration...{COLOR_RESET}\n")  # <-- Confirmation message
            return True                                                   # <-- Return true to proceed
        else:
            print(f"{COLOR_RED}[CANCEL] No files were modified{COLOR_RESET}\n")  # <-- Cancellation message
            return False                                                  # <-- Return false to cancel
    except (KeyboardInterrupt, EOFError):
        print(f"\n{COLOR_RED}[CANCEL] Cancelled by user{COLOR_RESET}\n")  # <-- Handle Ctrl+C or EOF
        return False                                                      # <-- Return false to cancel
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Main Entry Point
# -----------------------------------------------------------------------------

# FUNCTION | Main Script Entry Point
# ------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description='Whitecardopedia - Project JSON Migration Utility (One-Time Use)',
        epilog='This script migrates project.json files to the new standard by removing projectDate and cleaning runtime fields.',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        '--execute',
        action='store_true',
        help='Execute migration (default is dry-run preview only)'
    )
    parser.add_argument(
        '--project',
        type=str,
        metavar='FOLDER_NAME',
        help='Process only a specific project folder (e.g., "VN-61445__Vaughan")'
    )
    
    args = parser.parse_args()                                            # <-- Parse command line arguments
    
    script_dir = Path(__file__).parent                                    # <-- Get script directory
    projects_base = script_dir / PROJECTS_BASE_PATH                       # <-- Construct projects path
    
    print(f"\n{COLOR_CYAN}Whitecardopedia - Project JSON Migration Utility{COLOR_RESET}")  # <-- Print title
    print(f"{COLOR_BLUE}Projects Path: {projects_base}{COLOR_RESET}\n")  # <-- Print projects path
    
    # DISCOVER PROJECT JSON FILES
    project_files = find_all_project_json_files(projects_base, args.project)  # <-- Find all project.json files
    
    if not project_files:
        print(f"{COLOR_RED}No project.json files found. Exiting.{COLOR_RESET}\n")  # <-- Log failure
        return                                                            # <-- Exit if none found
    
    print(f"{COLOR_BLUE}Found {len(project_files)} project(s) to process{COLOR_RESET}\n")  # <-- Print count
    
    # RUN DRY-RUN FIRST
    dry_run_mode = not args.execute                                       # <-- Determine mode
    
    if dry_run_mode:
        print(f"{COLOR_YELLOW}Mode: DRY RUN (preview only){COLOR_RESET}\n")  # <-- Print dry-run mode
    else:
        print(f"{COLOR_GREEN}Mode: EXECUTE MIGRATION{COLOR_RESET}\n")    # <-- Print execute mode
    
    # CREATE BACKUP FOLDER (IF EXECUTING)
    backup_folder = None                                                  # <-- Initialize backup folder
    if not dry_run_mode:
        backup_folder = create_backup_folder(projects_base)               # <-- Create backup folder
        if backup_folder:
            print(f"{COLOR_GREEN}Backup folder created: {backup_folder.name}{COLOR_RESET}\n")  # <-- Print backup location
        else:
            print(f"{COLOR_RED}Failed to create backup folder. Exiting.{COLOR_RESET}\n")  # <-- Log failure
            return                                                        # <-- Exit if backup fails
    
    # MIGRATE PROJECTS
    results = migrate_all_projects(project_files, backup_folder, dry_run_mode)  # <-- Migrate all projects
    print_results(results, dry_run_mode)                                  # <-- Print results
    
    # PROMPT FOR CONFIRMATION IF DRY-RUN
    if dry_run_mode:
        needs_migration = any(r['success'] and not r['skipped'] for r in results)  # <-- Check if any need migration
        
        if not needs_migration:
            print(f"{COLOR_GREEN}All projects are already migrated. No changes needed.{COLOR_RESET}\n")  # <-- No changes message
            return                                                        # <-- Exit if nothing to migrate
        
        print(f"{COLOR_YELLOW}To execute migration, run with --execute flag{COLOR_RESET}\n")  # <-- Print execute instruction
    else:
        migrated_count = sum(1 for r in results if r['success'] and not r['skipped'])  # <-- Count migrated
        print(f"{COLOR_GREEN}Migration complete! {migrated_count} project(s) successfully migrated.{COLOR_RESET}\n")  # <-- Print completion
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------


if __name__ == '__main__':
    main()

