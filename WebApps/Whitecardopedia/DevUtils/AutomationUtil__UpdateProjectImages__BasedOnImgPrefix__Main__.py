#!/usr/bin/env python3
# =============================================================================
# WHITECARDOPEDIA - PROJECT IMAGE AUTO-DISCOVERY UTILITY
# =============================================================================
#
# FILE       : AutomationUtil__UpdateProjectImages__BasedOnImgPrefix__Main__.py
# NAMESPACE  : Whitecardopedia
# MODULE     : Image Discovery Utility
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Automatically discover and update project images in JSON files
# CREATED    : 2025
#
# DESCRIPTION:
# - Scans project folders for images with IMG## prefix pattern
# - Automatically updates project.json files with discovered images
# - Sorts images by numeric prefix (IMG01, IMG02, IMG03, etc.)
# - Supports multiple image formats (png, jpg, jpeg, svg, gif, webp)
# - Provides summary report of all changes made
# - Includes dry-run mode for safe preview before changes
#
# USAGE:
# - python AutomationUtil__UpdateProjectImages__BasedOnImgPrefix__Main__.py                    # Update all projects
# - python AutomationUtil__UpdateProjectImages__BasedOnImgPrefix__Main__.py --dry-run          # Preview changes only
# - python AutomationUtil__UpdateProjectImages__BasedOnImgPrefix__Main__.py --project <name>   # Update specific project
#
# =============================================================================

import os
import json
import re
import argparse
from pathlib import Path
from typing import List, Dict, Tuple

# -----------------------------------------------------------------------------
# REGION | Module Constants and Configuration
# -----------------------------------------------------------------------------

# MODULE CONSTANTS | File Patterns and Paths
# ------------------------------------------------------------
PROJECTS_BASE_PATH      = "../Projects/2025"                          # <-- Base path for all projects (relative to DevUtils folder)
IMAGE_PREFIX_PATTERN    = r'^IMG(\d{2})__.*\.(png|jpg|jpeg|svg|gif|webp)$'  # <-- Image filename pattern
PROJECT_JSON_FILENAME   = "project.json"                              # <-- Project metadata filename
# ------------------------------------------------------------


# MODULE CONSTANTS | Console Color Codes
# ------------------------------------------------------------
COLOR_RESET             = '\033[0m'                                   # <-- Reset color
COLOR_GREEN             = '\033[92m'                                  # <-- Success messages
COLOR_YELLOW            = '\033[93m'                                  # <-- Warning messages
COLOR_BLUE              = '\033[94m'                                  # <-- Info messages
COLOR_CYAN              = '\033[96m'                                  # <-- Highlight messages
COLOR_RED               = '\033[91m'                                  # <-- Error messages
# ------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Help Text and Documentation
# -----------------------------------------------------------------------------

# MODULE CONSTANTS | Command Line Help Text
# ------------------------------------------------------------
HELP_DESCRIPTION = """
Whitecardopedia Image Auto-Discovery Utility

Automatically discovers images in project folders based on the IMG## prefix 
naming convention and updates project.json files with the discovered images.

This utility simplifies project management by eliminating manual JSON editing
for image references. Simply name your images with IMG01__, IMG02__, etc. 
prefixes and run this script to automatically update all project configurations.
"""

HELP_EPILOG = """
Default Behavior:
  
  The script ALWAYS runs in safe mode:
  1. First performs dry-run to preview changes
  2. Shows what would be updated
  3. Prompts for confirmation (yes/no)
  4. Only proceeds if you confirm with 'yes' or 'y'

Examples:
  
  Run with confirmation prompt (default):
    python AutomationUtil__UpdateProjectImages__BasedOnImgPrefix__Main__.py
  
  Preview only without confirmation prompt:
    python AutomationUtil__UpdateProjectImages__BasedOnImgPrefix__Main__.py --dry-run-only
  
  Update specific project with confirmation:
    python AutomationUtil__UpdateProjectImages__BasedOnImgPrefix__Main__.py --project NY-29951__McNerney
  
  Preview specific project only:
    python AutomationUtil__UpdateProjectImages__BasedOnImgPrefix__Main__.py --dry-run-only --project HS-61747__Harris

Image Naming Convention:
  
  Images must follow the pattern: IMG##__[descriptive-name].[extension]
  
  - Supported formats: png, jpg, jpeg, svg, gif, webp
  - Numeric prefix determines loading order (IMG01, IMG02, IMG03...)
  - Use descriptive names after prefix for organization
  
  Examples:
    IMG01__3dView__MainShot__WhitecardImage__09-Oct-2025.png
    IMG02__3dView__PatioView__WhitecardImage__09-Oct-2025.png
    IMG03__3dView__AerialView__WhitecardImage__09-Oct-2025.png

Output Indicators:
  
  [+] Green - Project updated successfully
  [=] Blue  - No changes needed (already up to date)
  [X] Red   - Error occurred during processing

For more information, visit:
  https://github.com/adam-noble-01/ValeCodebase/WebApps/Whitecardopedia
"""
# ------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Image Discovery Functions
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Extract Numeric Prefix from Image Filename
# ---------------------------------------------------------------
def extract_image_number(filename: str) -> int:
    match = re.match(IMAGE_PREFIX_PATTERN, filename, re.IGNORECASE)  # <-- Match filename pattern
    if match:
        return int(match.group(1))                                    # <-- Return numeric prefix
    return 999                                                        # <-- Default sort value for non-matching
# ---------------------------------------------------------------


# FUNCTION | Discover Images in Project Folder
# ------------------------------------------------------------
def discover_project_images(project_path: Path) -> List[str]:
    images = []                                                       # <-- Initialize images list
    
    if not project_path.exists() or not project_path.is_dir():
        return images                                                 # <-- Return empty if path invalid
    
    for item in project_path.iterdir():
        if item.is_file():                                            # <-- Check if item is file
            filename = item.name                                      # <-- Get filename
            if re.match(IMAGE_PREFIX_PATTERN, filename, re.IGNORECASE):  # <-- Check pattern match
                images.append(filename)                               # <-- Add to images list
    
    images.sort(key=extract_image_number)                             # <-- Sort by numeric prefix
    return images                                                     # <-- Return sorted images list
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | JSON File Operations
# -----------------------------------------------------------------------------

# FUNCTION | Read Project JSON File
# ------------------------------------------------------------
def read_project_json(json_path: Path) -> Tuple[Dict, bool]:
    try:
        with open(json_path, 'r', encoding='utf-8') as file:          # <-- Open JSON file
            data = json.load(file)                                    # <-- Parse JSON content
            return data, True                                         # <-- Return data and success flag
    except Exception as error:
        print(f"{COLOR_RED}Error reading {json_path}: {error}{COLOR_RESET}")  # <-- Log error
        return None, False                                            # <-- Return None and failure flag
# ---------------------------------------------------------------


# FUNCTION | Write Project JSON File
# ------------------------------------------------------------
def write_project_json(json_path: Path, data: Dict) -> bool:
    try:
        with open(json_path, 'w', encoding='utf-8') as file:          # <-- Open JSON file for writing
            json.dump(data, file, indent=4, ensure_ascii=False)       # <-- Write formatted JSON
            file.write('\n')                                          # <-- Add trailing newline
        return True                                                   # <-- Return success flag
    except Exception as error:
        print(f"{COLOR_RED}Error writing {json_path}: {error}{COLOR_RESET}")  # <-- Log error
        return False                                                  # <-- Return failure flag
# ---------------------------------------------------------------


# FUNCTION | Update Project JSON with Discovered Images
# ------------------------------------------------------------
def update_project_json(json_path: Path, images: List[str], dry_run: bool = False) -> Tuple[bool, List[str]]:
    data, success = read_project_json(json_path)                      # <-- Read existing JSON
    
    if not success or data is None:
        return False, []                                              # <-- Return failure if read failed
    
    old_images = data.get('images', [])                               # <-- Get existing images array
    
    if old_images == images:
        return True, old_images                                       # <-- No changes needed
    
    data['images'] = images                                           # <-- Update images array
    
    if not dry_run:
        success = write_project_json(json_path, data)                 # <-- Write updated JSON
        return success, old_images                                    # <-- Return success and old images
    
    return True, old_images                                           # <-- Return success for dry-run
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Project Processing Functions
# -----------------------------------------------------------------------------

# FUNCTION | Process Single Project Folder
# ------------------------------------------------------------
def process_project(project_path: Path, dry_run: bool = False) -> Dict:
    project_name = project_path.name                                  # <-- Get project folder name
    json_path = project_path / PROJECT_JSON_FILENAME                  # <-- Construct JSON file path
    
    result = {
        'name': project_name,
        'path': str(project_path),
        'success': False,
        'images_found': 0,
        'images_old': 0,
        'changed': False,
        'error': None
    }
    
    if not json_path.exists():
        result['error'] = f"No {PROJECT_JSON_FILENAME} found"         # <-- Set error message
        return result                                                 # <-- Return result with error
    
    images = discover_project_images(project_path)                    # <-- Discover images in folder
    result['images_found'] = len(images)                              # <-- Store images count
    
    success, old_images = update_project_json(json_path, images, dry_run)  # <-- Update JSON file
    result['success'] = success                                       # <-- Store success flag
    result['images_old'] = len(old_images)                            # <-- Store old images count
    result['changed'] = old_images != images                          # <-- Check if changed
    
    return result                                                     # <-- Return processing result
# ---------------------------------------------------------------


# FUNCTION | Process All Projects in Base Path
# ------------------------------------------------------------
def process_all_projects(base_path: Path, target_project: str = None, dry_run: bool = False) -> List[Dict]:
    results = []                                                      # <-- Initialize results list
    
    if not base_path.exists() or not base_path.is_dir():
        print(f"{COLOR_RED}Error: Projects path not found: {base_path}{COLOR_RESET}")  # <-- Log error
        return results                                                # <-- Return empty results
    
    for project_dir in sorted(base_path.iterdir()):
        if not project_dir.is_dir():
            continue                                                  # <-- Skip non-directories
        
        if target_project and project_dir.name != target_project:
            continue                                                  # <-- Skip if not target project
        
        result = process_project(project_dir, dry_run)                # <-- Process project folder
        results.append(result)                                        # <-- Add result to list
    
    return results                                                    # <-- Return all results
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Console Output and Reporting
# -----------------------------------------------------------------------------

# FUNCTION | Print Processing Results Summary
# ------------------------------------------------------------
def print_results(results: List[Dict], dry_run: bool = False):
    print(f"\n{COLOR_CYAN}{'='*80}{COLOR_RESET}")                    # <-- Print header divider
    print(f"{COLOR_CYAN}IMAGE DISCOVERY RESULTS{COLOR_RESET}")       # <-- Print header title
    print(f"{COLOR_CYAN}{'='*80}{COLOR_RESET}\n")                    # <-- Print header divider
    
    total_projects = len(results)                                     # <-- Count total projects
    successful = sum(1 for r in results if r['success'])              # <-- Count successful updates
    changed = sum(1 for r in results if r['changed'])                 # <-- Count changed projects
    total_images = sum(r['images_found'] for r in results)            # <-- Count total images
    
    for result in results:
        project_name = result['name']                                 # <-- Get project name
        
        if result['error']:
            print(f"{COLOR_RED}[X] {project_name}{COLOR_RESET}")     # <-- Print error indicator
            print(f"    Error: {result['error']}\n")                  # <-- Print error message
            continue
        
        if result['changed']:
            print(f"{COLOR_GREEN}[+] {project_name}{COLOR_RESET}")   # <-- Print success indicator
            print(f"    Images: {result['images_old']} -> {result['images_found']}")  # <-- Print image counts
            print(f"    Status: {'Would update' if dry_run else 'Updated'}\n")  # <-- Print status
        else:
            print(f"{COLOR_BLUE}[=] {project_name}{COLOR_RESET}")    # <-- Print unchanged indicator
            print(f"    Images: {result['images_found']} (no changes)\n")  # <-- Print image count
    
    print(f"{COLOR_CYAN}{'='*80}{COLOR_RESET}")                      # <-- Print footer divider
    print(f"{COLOR_CYAN}SUMMARY{COLOR_RESET}")                       # <-- Print summary title
    print(f"{COLOR_CYAN}{'='*80}{COLOR_RESET}")                      # <-- Print footer divider
    print(f"Projects processed    : {total_projects}")                # <-- Print total projects
    print(f"Successful operations : {successful}")                    # <-- Print successful count
    print(f"Projects changed      : {changed}")                       # <-- Print changed count
    print(f"Total images found    : {total_images}")                  # <-- Print total images
    
    if dry_run:
        print(f"\n{COLOR_YELLOW}DRY RUN MODE: No files were modified{COLOR_RESET}")  # <-- Print dry-run notice
    
    print(f"{COLOR_CYAN}{'='*80}{COLOR_RESET}\n")                    # <-- Print closing divider
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | User Confirmation Functions
# -----------------------------------------------------------------------------

# FUNCTION | Prompt User for Confirmation
# ------------------------------------------------------------
def prompt_for_confirmation() -> bool:
    print(f"\n{COLOR_YELLOW}{'='*80}{COLOR_RESET}")                    # <-- Print confirmation divider
    print(f"{COLOR_YELLOW}CONFIRMATION REQUIRED{COLOR_RESET}")         # <-- Print confirmation header
    print(f"{COLOR_YELLOW}{'='*80}{COLOR_RESET}")                      # <-- Print confirmation divider
    
    try:
        response = input(f"\n{COLOR_CYAN}Proceed with updates? (yes/no): {COLOR_RESET}").strip().lower()  # <-- Get user input
        
        if response in ['yes', 'y']:
            print(f"{COLOR_GREEN}[OK] Confirmed - Proceeding with updates...{COLOR_RESET}\n")  # <-- Confirmation message
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
        description=HELP_DESCRIPTION,
        epilog=HELP_EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
        prog='AutomationUtil__UpdateProjectImages__BasedOnImgPrefix__Main__.py'
    )
    parser.add_argument(
        '--dry-run-only',
        action='store_true',
        help='Preview changes only without prompting for confirmation. Useful for quick checks.'
    )
    parser.add_argument(
        '--project',
        type=str,
        metavar='FOLDER_NAME',
        help='Process only a specific project folder (e.g., "NY-29951__McNerney"). By default, all projects are processed.'
    )
    
    args = parser.parse_args()                                        # <-- Parse command line arguments
    
    script_dir = Path(__file__).parent                                # <-- Get script directory
    base_path = script_dir / PROJECTS_BASE_PATH                       # <-- Construct base projects path
    
    print(f"\n{COLOR_CYAN}Whitecardopedia - Image Discovery Utility{COLOR_RESET}")  # <-- Print title
    print(f"{COLOR_BLUE}Scanning: {base_path}{COLOR_RESET}")         # <-- Print scanning path
    
    # STEP 1: Always run dry-run first to preview changes
    print(f"{COLOR_YELLOW}Mode: DRY RUN (preview mode){COLOR_RESET}\n")  # <-- Print dry-run mode
    
    results = process_all_projects(base_path, args.project, dry_run=True)  # <-- Run dry-run first
    print_results(results, dry_run=True)                              # <-- Print preview results
    
    # Check if any changes were detected
    changes_detected = any(r['changed'] for r in results)             # <-- Check if any projects need updates
    
    # If dry-run-only flag is set, exit after preview
    if args.dry_run_only:
        return                                                        # <-- Exit after dry-run
    
    # If no changes detected, exit
    if not changes_detected:
        print(f"{COLOR_GREEN}All projects are up to date. No updates needed.{COLOR_RESET}\n")  # <-- No changes message
        return                                                        # <-- Exit if no changes
    
    # STEP 2: Ask for confirmation before proceeding
    if not prompt_for_confirmation():
        return                                                        # <-- Exit if user cancels
    
    # STEP 3: Run actual updates
    print(f"{COLOR_GREEN}Mode: UPDATING FILES{COLOR_RESET}\n")       # <-- Print update mode
    
    results = process_all_projects(base_path, args.project, dry_run=False)  # <-- Run actual update
    print_results(results, dry_run=False)                             # <-- Print final results
    
    print(f"{COLOR_GREEN}Update complete!{COLOR_RESET}\n")           # <-- Print completion message
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------


if __name__ == '__main__':
    main()

