#!/usr/bin/env python3
# =============================================================================
# WHITECARDOPEDIA - PROJECT AUTO-CLONER UTILITY
# =============================================================================
#
# FILE       : AutomationUtil__FetchLocalProjects__BuildWhitecardopediaProject__Main__.py
# NAMESPACE  : Whitecardopedia
# MODULE     : Project Cloner Utility
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Automatically clone Whitecard projects from local to Whitecardopedia
# CREATED    : 2025
#
# DESCRIPTION:
# - Scans local disc for projects with __Whitecard suffix
# - Discovers latest content delivery folders with date stamps
# - Copies IMG## prefixed images to Whitecardopedia project structure
# - Generates project.json files from template with extracted metadata
# - Prevents manual duplication by automating project folder creation
# - Skips existing projects to avoid overwriting manual changes
#
# USAGE:
# - python AutomationUtil__FetchLocalProjects__BuildWhitecardopediaProject__Main__.py                    # Clone all Whitecard projects
# - python AutomationUtil__FetchLocalProjects__BuildWhitecardopediaProject__Main__.py --dry-run-only     # Preview only
# - python AutomationUtil__FetchLocalProjects__BuildWhitecardopediaProject__Main__.py --project <name>   # Clone specific project
#
# =============================================================================

import os
import json
import re
import shutil
import argparse
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Tuple, Optional

# -----------------------------------------------------------------------------
# REGION | Module Constants and Configuration
# -----------------------------------------------------------------------------

# MODULE CONSTANTS | File Patterns and Paths
# ------------------------------------------------------------
LOCAL_PROJECTS_BASE_PATH           = r"C:\01__ValeProjects\ValeProjects__2025"  # <-- Source path for local Vale projects
WHITECARDOPEDIA_PROJECTS_PATH      = "../Projects/2025"                     # <-- Destination path for Whitecardopedia projects
WHITECARDOPEDIA_TEMPLATE_PATH      = "../Projects/2025/01__TemplateProject" # <-- Template project path
CONTENT_DELIVERED_SUBFOLDER        = "10__ContentDelivered__Local"          # <-- Content delivery subfolder name
PROJECT_JSON_FILENAME              = "project.json"                          # <-- Project metadata filename
# ------------------------------------------------------------


# MODULE CONSTANTS | Regex Patterns
# ------------------------------------------------------------
WHITECARD_FOLDER_PATTERN           = r'^([A-Z]{2}-\d+)__([^_]+)__Whitecard$'  # <-- Pattern for Whitecard project folders
IMAGE_PREFIX_PATTERN               = r'^IMG(\d{2})(?:_ART(\d{2}))?__.*\.(png|jpg|jpeg|svg|gif|webp)$'  # <-- Image filename pattern
DATE_SUFFIX_PATTERN                = r'__(\d{2}-[A-Za-z]{3}-\d{4})$'         # <-- Date suffix pattern (DD-MMM-YYYY)
DATE_FORMAT                        = '%d-%b-%Y'                              # <-- Date format for parsing
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
# REGION | Help Text and Documentation
# -----------------------------------------------------------------------------

# MODULE CONSTANTS | Command Line Help Text
# ------------------------------------------------------------
HELP_DESCRIPTION = """
Whitecardopedia Project Auto-Cloner Utility

This utility automates the process of cloning Whitecard projects from your
local Vale Projects directory to the Whitecardopedia project structure.

WHAT IT DOES:
1. Scans local Vale Projects folder for projects with __Whitecard suffix
2. Finds the latest content delivery folder (by date stamp)
3. Discovers all IMG## and IMG##_ART## prefixed images
4. Copies images to Whitecardopedia project structure
5. Generates project.json with extracted metadata
6. Strips __Whitecard suffix from destination folder names

This utility eliminates manual folder duplication and ensures consistency
between your local projects and the Whitecardopedia showcase.
"""

HELP_EPILOG = """
Default Behavior:
  
  The script ALWAYS runs in safe mode:
  1. Scans local projects for __Whitecard suffix folders
  2. Performs dry-run to preview what will be cloned
  3. Shows projects to be copied and image counts
  4. Prompts for confirmation (yes/no)
  5. Only proceeds if you confirm with 'yes' or 'y'
  6. Skips projects that already exist in destination

Examples:
  
  Clone all new Whitecard projects with confirmation:
    python AutomationUtil__FetchLocalProjects__BuildWhitecardopediaProject__Main__.py
  
  Preview only without making changes:
    python AutomationUtil__FetchLocalProjects__BuildWhitecardopediaProject__Main__.py --dry-run-only
  
  Clone specific project with confirmation:
    python AutomationUtil__FetchLocalProjects__BuildWhitecardopediaProject__Main__.py --project VN-61445__Vaughan__Whitecard
  
  Preview specific project only:
    python AutomationUtil__FetchLocalProjects__BuildWhitecardopediaProject__Main__.py --dry-run-only --project WS-61782__Wiltshire__Whitecard

Folder Name Transformation:
  
  Source folders with __Whitecard suffix are renamed in destination:
  - Source:      VN-61445__Vaughan__Whitecard
  - Destination: VN-61445__Vaughan
  
  The __Whitecard suffix is purely for discovery on local machines.

Latest Content Folder Detection:
  
  The script automatically finds the most recent content delivery folder:
  - Searches: 10__ContentDelivered__Local subfolder
  - Pattern:  Any folder ending with __DD-MMM-YYYY date stamp
  - Examples: VisDpt__Whitecard__FirstEdition__17-Oct-2025
              Whitecardopedia__FinalScanJoPainting__23-Oct-2025
  
  Only images from the LATEST dated folder are copied.

Image Naming Convention:
  
  Images must follow the pattern: IMG##__[descriptive-name].[extension]
  Optional ART variants: IMG##_ART##__[descriptive-name].[extension]
  
  - Supported formats: png, jpg, jpeg, svg, gif, webp
  - Numeric prefix determines order (IMG01, IMG02, IMG03...)
  - ART variants sorted after base (IMG01, IMG01_ART20, IMG02...)

Project JSON Generation:
  
  Each cloned project gets a project.json file with:
  - projectName: Extracted from folder name (e.g., "Vaughan")
  - projectCode: Extracted number only (e.g., "61445")
  - projectDate: Set to "TBD" for manual update
  - images:      List of discovered IMG files
  - Other fields: Copied from template as placeholders

Skip Existing Projects:
  
  The script NEVER overwrites existing project folders.
  If a project already exists in the destination, it is skipped.
  This protects manual edits and customizations.

Output Indicators:
  
  [+] Green  - Project successfully cloned
  [=] Blue   - Project skipped (already exists)
  [!] Yellow - Warning (no images found, no content folder)
  [X] Red    - Error occurred during processing

For more information, visit:
  https://github.com/adam-noble-01/ValeCodebase/WebApps/Whitecardopedia
"""
# ------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Metadata Extraction Functions
# -----------------------------------------------------------------------------

# FUNCTION | Extract Project Metadata from Folder Name
# ------------------------------------------------------------
def extract_project_metadata(folder_name: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    match = re.match(WHITECARD_FOLDER_PATTERN, folder_name)         # <-- Match folder pattern
    
    if match:
        full_code = match.group(1)                                   # <-- Extract full code (e.g., "VN-61445")
        project_name = match.group(2)                                # <-- Extract project name (e.g., "Vaughan")
        project_code = full_code.split('-')[1] if '-' in full_code else full_code  # <-- Extract numeric code only
        return full_code, project_code, project_name                 # <-- Return extracted metadata
    
    return None, None, None                                          # <-- Return None if pattern doesn't match
# ---------------------------------------------------------------


# FUNCTION | Generate Destination Folder Name
# ------------------------------------------------------------
def generate_destination_folder_name(folder_name: str) -> Optional[str]:
    match = re.match(WHITECARD_FOLDER_PATTERN, folder_name)         # <-- Match folder pattern
    
    if match:
        full_code = match.group(1)                                   # <-- Extract full code
        project_name = match.group(2)                                # <-- Extract project name
        return f"{full_code}__{project_name}"                        # <-- Return name without __Whitecard suffix
    
    return None                                                      # <-- Return None if pattern doesn't match
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Date Parsing and Latest Folder Detection
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Parse Date from Folder Name
# ---------------------------------------------------------------
def parse_folder_date(folder_name: str) -> Optional[datetime]:
    match = re.search(DATE_SUFFIX_PATTERN, folder_name)             # <-- Search for date pattern
    
    if match:
        date_str = match.group(1)                                    # <-- Extract date string
        try:
            return datetime.strptime(date_str, DATE_FORMAT)          # <-- Parse date string to datetime
        except ValueError:
            return None                                              # <-- Return None if parsing fails
    
    return None                                                      # <-- Return None if no date found
# ---------------------------------------------------------------


# FUNCTION | Find Latest Content Delivery Folder
# ------------------------------------------------------------
def find_latest_content_folder(project_path: Path) -> Optional[Path]:
    content_base = project_path / CONTENT_DELIVERED_SUBFOLDER        # <-- Construct content delivered path
    
    if not content_base.exists() or not content_base.is_dir():
        return None                                                  # <-- Return None if path doesn't exist
    
    dated_folders = []                                               # <-- Initialize dated folders list
    
    for item in content_base.iterdir():
        if item.is_dir() and not item.name.startswith('.'):          # <-- Check if directory and not hidden
            folder_date = parse_folder_date(item.name)               # <-- Parse date from folder name
            
            if folder_date:
                dated_folders.append((folder_date, item))            # <-- Add to list with parsed date
            else:
                mod_time = datetime.fromtimestamp(item.stat().st_mtime)  # <-- Use modification time as fallback
                dated_folders.append((mod_time, item))               # <-- Add to list with mod time
    
    if not dated_folders:
        return None                                                  # <-- Return None if no folders found
    
    dated_folders.sort(key=lambda x: x[0], reverse=True)             # <-- Sort by date descending
    return dated_folders[0][1]                                       # <-- Return most recent folder path
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Image Discovery Functions
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Extract Numeric Prefix from Image Filename
# ---------------------------------------------------------------
def extract_image_number(filename: str) -> Tuple[int, int]:
    match = re.match(IMAGE_PREFIX_PATTERN, filename, re.IGNORECASE)  # <-- Match filename pattern
    if match:
        img_num = int(match.group(1))                                 # <-- Extract IMG number
        art_num = int(match.group(2)) if match.group(2) else 0        # <-- Extract ART number or 0
        return (img_num, art_num)                                     # <-- Return tuple for sorting
    return (999, 999)                                                 # <-- Default sort value
# ---------------------------------------------------------------


# FUNCTION | Discover Images in Content Folder
# ------------------------------------------------------------
def discover_image_files(content_folder: Path) -> List[str]:
    images = []                                                       # <-- Initialize images list
    
    if not content_folder.exists() or not content_folder.is_dir():
        return images                                                 # <-- Return empty if path invalid
    
    for item in content_folder.iterdir():
        if item.is_file():                                            # <-- Check if item is file
            filename = item.name                                      # <-- Get filename
            if re.match(IMAGE_PREFIX_PATTERN, filename, re.IGNORECASE):  # <-- Check pattern match
                images.append(filename)                               # <-- Add to images list
    
    images.sort(key=extract_image_number)                             # <-- Sort by numeric prefix
    return images                                                     # <-- Return sorted images list
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Folder Discovery Functions
# -----------------------------------------------------------------------------

# FUNCTION | Discover All Whitecard Projects in Source Path
# ------------------------------------------------------------
def discover_whitecard_projects(source_base: Path) -> List[Dict]:
    projects = []                                                     # <-- Initialize projects list
    
    if not source_base.exists() or not source_base.is_dir():
        return projects                                               # <-- Return empty if path invalid
    
    for item in sorted(source_base.iterdir()):
        if not item.is_dir() or item.name.startswith('.'):
            continue                                                  # <-- Skip non-directories and hidden
        
        full_code, project_code, project_name = extract_project_metadata(item.name)  # <-- Extract metadata
        
        if full_code and project_code and project_name:               # <-- Check if valid Whitecard project
            dest_folder_name = generate_destination_folder_name(item.name)  # <-- Generate destination name
            
            projects.append({
                'source_path': item,
                'source_folder_name': item.name,
                'dest_folder_name': dest_folder_name,
                'full_code': full_code,
                'project_code': project_code,
                'project_name': project_name
            })
    
    return projects                                                   # <-- Return discovered projects list
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | File Operations - Copy and JSON Generation
# -----------------------------------------------------------------------------

# FUNCTION | Copy Image Files from Source to Destination
# ------------------------------------------------------------
def copy_project_images(source_folder: Path, dest_folder: Path, images: List[str]) -> Tuple[bool, int]:
    if not images:
        return True, 0                                                # <-- Return success if no images
    
    try:
        dest_folder.mkdir(parents=True, exist_ok=True)                # <-- Create destination folder
    except Exception as error:
        print(f"{COLOR_RED}Error creating folder {dest_folder}: {error}{COLOR_RESET}")  # <-- Log error
        return False, 0                                               # <-- Return failure
    
    copied_count = 0                                                  # <-- Initialize copied counter
    
    for image_name in images:
        source_file = source_folder / image_name                      # <-- Construct source path
        dest_file = dest_folder / image_name                          # <-- Construct destination path
        
        try:
            shutil.copy2(source_file, dest_file)                      # <-- Copy file with metadata
            copied_count += 1                                         # <-- Increment counter
        except Exception as error:
            print(f"{COLOR_RED}Error copying {image_name}: {error}{COLOR_RESET}")  # <-- Log error
            return False, copied_count                                # <-- Return failure
    
    return True, copied_count                                         # <-- Return success and count
# ---------------------------------------------------------------


# FUNCTION | Load Template JSON File
# ------------------------------------------------------------
def load_template_json(template_path: Path) -> Optional[Dict]:
    template_json = template_path / PROJECT_JSON_FILENAME             # <-- Construct template path
    
    try:
        with open(template_json, 'r', encoding='utf-8') as file:      # <-- Open template file
            template = json.load(file)                                # <-- Parse JSON content
            return template                                           # <-- Return template dict
    except Exception as error:
        print(f"{COLOR_RED}Error reading template {template_json}: {error}{COLOR_RESET}")  # <-- Log error
        return None                                                   # <-- Return None on failure
# ---------------------------------------------------------------


# FUNCTION | Create Project JSON File
# ------------------------------------------------------------
def create_project_json(dest_folder: Path, template: Dict, project_code: str, project_name: str, images: List[str]) -> bool:
    project_json_path = dest_folder / PROJECT_JSON_FILENAME           # <-- Construct project.json path
    
    project_data = template.copy()                                    # <-- Copy template data
    project_data['projectName'] = project_name                        # <-- Set project name
    project_data['projectCode'] = project_code                        # <-- Set project code
    project_data['projectDate'] = "TBD"                               # <-- Set placeholder date
    project_data['images'] = images                                   # <-- Set images array
    
    try:
        with open(project_json_path, 'w', encoding='utf-8') as file:  # <-- Open file for writing
            json.dump(project_data, file, indent=4, ensure_ascii=False)  # <-- Write formatted JSON
            file.write('\n')                                          # <-- Add trailing newline
        return True                                                   # <-- Return success
    except Exception as error:
        print(f"{COLOR_RED}Error writing {project_json_path}: {error}{COLOR_RESET}")  # <-- Log error
        return False                                                  # <-- Return failure
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Project Processing Functions
# -----------------------------------------------------------------------------

# FUNCTION | Check if Project Already Exists in Destination
# ------------------------------------------------------------
def check_project_exists(dest_base_path: Path, dest_folder_name: str) -> bool:
    dest_path = dest_base_path / dest_folder_name                     # <-- Construct destination path
    return dest_path.exists()                                         # <-- Return existence check
# ---------------------------------------------------------------


# FUNCTION | Process Single Whitecard Project
# ------------------------------------------------------------
def process_single_project(project_info: Dict, dest_base_path: Path, template_path: Path, dry_run: bool) -> Dict:
    result = {
        'source_name': project_info['source_folder_name'],
        'dest_name': project_info['dest_folder_name'],
        'project_name': project_info['project_name'],
        'project_code': project_info['project_code'],
        'success': False,
        'skipped': False,
        'images_found': 0,
        'images_copied': 0,
        'latest_folder': None,
        'error': None
    }
    
    # CHECK IF PROJECT ALREADY EXISTS
    if check_project_exists(dest_base_path, project_info['dest_folder_name']):  # <-- Check if exists
        result['skipped'] = True                                      # <-- Mark as skipped
        result['success'] = True                                      # <-- Not an error condition
        result['error'] = "Already exists in destination"             # <-- Set skip reason
        return result                                                 # <-- Return skip result
    
    # FIND LATEST CONTENT FOLDER
    latest_folder = find_latest_content_folder(project_info['source_path'])  # <-- Find latest folder
    
    if not latest_folder:
        result['error'] = "No content delivery folder found"          # <-- Set error message
        return result                                                 # <-- Return error result
    
    result['latest_folder'] = latest_folder.name                      # <-- Store folder name for display
    
    # DISCOVER IMAGES IN LATEST FOLDER
    images = discover_image_files(latest_folder)                      # <-- Discover images
    result['images_found'] = len(images)                              # <-- Store images count
    
    if not images:
        result['error'] = "No IMG## files found in content folder"    # <-- Set warning message
        return result                                                 # <-- Return warning result
    
    if dry_run:
        result['success'] = True                                      # <-- Mark dry-run as success
        return result                                                 # <-- Return preview result
    
    # COPY IMAGES TO DESTINATION
    dest_folder = dest_base_path / project_info['dest_folder_name']   # <-- Construct destination path
    copy_success, copied_count = copy_project_images(latest_folder, dest_folder, images)  # <-- Copy images
    result['images_copied'] = copied_count                            # <-- Store copied count
    
    if not copy_success:
        result['error'] = "Failed to copy images"                     # <-- Set error message
        return result                                                 # <-- Return error result
    
    # CREATE PROJECT JSON FILE
    template = load_template_json(template_path)                      # <-- Load template
    
    if not template:
        result['error'] = "Failed to load template JSON"              # <-- Set error message
        return result                                                 # <-- Return error result
    
    json_success = create_project_json(
        dest_folder,
        template,
        project_info['project_code'],
        project_info['project_name'],
        images
    )
    
    if not json_success:
        result['error'] = "Failed to create project.json"             # <-- Set error message
        return result                                                 # <-- Return error result
    
    result['success'] = True                                          # <-- Mark as successful
    return result                                                     # <-- Return success result
# ---------------------------------------------------------------


# FUNCTION | Process All Whitecard Projects
# ------------------------------------------------------------
def process_all_whitecard_projects(source_base: Path, dest_base: Path, template_path: Path, target_project: Optional[str], dry_run: bool) -> List[Dict]:
    results = []                                                      # <-- Initialize results list
    
    projects = discover_whitecard_projects(source_base)               # <-- Discover all Whitecard projects
    
    if not projects:
        print(f"{COLOR_RED}No Whitecard projects found in {source_base}{COLOR_RESET}")  # <-- Log error
        return results                                                # <-- Return empty results
    
    for project_info in projects:
        if target_project and project_info['source_folder_name'] != target_project:
            continue                                                  # <-- Skip if not target project
        
        result = process_single_project(project_info, dest_base, template_path, dry_run)  # <-- Process project
        results.append(result)                                        # <-- Add result to list
    
    return results                                                    # <-- Return all results
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Console Output and Reporting
# -----------------------------------------------------------------------------

# FUNCTION | Print Project Discovery Summary
# ------------------------------------------------------------
def print_discovery_summary(source_base: Path, projects: List[Dict]):
    print(f"{COLOR_CYAN}{'='*80}{COLOR_RESET}")                      # <-- Print header divider
    print(f"{COLOR_CYAN}WHITECARD PROJECT DISCOVERY{COLOR_RESET}")   # <-- Print header title
    print(f"{COLOR_CYAN}{'='*80}{COLOR_RESET}\n")                    # <-- Print header divider
    
    print(f"{COLOR_BLUE}Source Path: {source_base}{COLOR_RESET}")    # <-- Print source path
    print(f"{COLOR_BLUE}[DISCOVERY] Found {len(projects)} Whitecard project(s){COLOR_RESET}\n")  # <-- Print count
# ---------------------------------------------------------------


# FUNCTION | Print Processing Results Summary
# ------------------------------------------------------------
def print_results(results: List[Dict], dry_run: bool):
    print(f"\n{COLOR_CYAN}{'='*80}{COLOR_RESET}")                    # <-- Print header divider
    print(f"{COLOR_CYAN}PROJECT CLONING RESULTS{COLOR_RESET}")       # <-- Print header title
    print(f"{COLOR_CYAN}{'='*80}{COLOR_RESET}\n")                    # <-- Print header divider
    
    total_projects = len(results)                                     # <-- Count total projects
    successful = sum(1 for r in results if r['success'] and not r['skipped'])  # <-- Count successful
    skipped = sum(1 for r in results if r['skipped'])                 # <-- Count skipped
    errors = sum(1 for r in results if not r['success'] and not r['skipped'])  # <-- Count errors
    total_images = sum(r['images_found'] for r in results)            # <-- Count total images
    
    for result in results:
        dest_name = result['dest_name']                               # <-- Get destination name
        
        if result['skipped']:
            print(f"{COLOR_BLUE}[=] {dest_name}{COLOR_RESET}")       # <-- Print skip indicator
            print(f"    Status: {result['error']}\n")                 # <-- Print skip reason
            continue
        
        if not result['success']:
            print(f"{COLOR_RED}[X] {dest_name}{COLOR_RESET}")        # <-- Print error indicator
            print(f"    Error: {result['error']}")                    # <-- Print error message
            if result['latest_folder']:
                print(f"    Latest Folder: {result['latest_folder']}")  # <-- Print folder name
            print()
            continue
        
        if result['images_found'] == 0:
            print(f"{COLOR_YELLOW}[!] {dest_name}{COLOR_RESET}")     # <-- Print warning indicator
            print(f"    Warning: {result['error']}")                  # <-- Print warning message
            print(f"    Latest Folder: {result['latest_folder']}\n")  # <-- Print folder name
            continue
        
        print(f"{COLOR_GREEN}[+] {dest_name}{COLOR_RESET}")          # <-- Print success indicator
        print(f"    Images: {result['images_found']} found")          # <-- Print images found
        if not dry_run:
            print(f"    Copied: {result['images_copied']} files")     # <-- Print copied count
        print(f"    Latest Folder: {result['latest_folder']}")        # <-- Print folder name
        print(f"    Status: {'Would clone' if dry_run else 'Cloned successfully'}\n")  # <-- Print status
    
    print(f"{COLOR_CYAN}{'='*80}{COLOR_RESET}")                      # <-- Print footer divider
    print(f"{COLOR_CYAN}SUMMARY{COLOR_RESET}")                       # <-- Print summary title
    print(f"{COLOR_CYAN}{'='*80}{COLOR_RESET}")                      # <-- Print footer divider
    print(f"Projects discovered   : {total_projects}")                # <-- Print total projects
    print(f"Successfully cloned   : {successful}")                    # <-- Print successful count
    print(f"Skipped (exists)      : {skipped}")                       # <-- Print skipped count
    print(f"Errors/Warnings       : {errors}")                        # <-- Print error count
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
    print(f"\n{COLOR_YELLOW}{'='*80}{COLOR_RESET}")                  # <-- Print confirmation divider
    print(f"{COLOR_YELLOW}CONFIRMATION REQUIRED{COLOR_RESET}")       # <-- Print confirmation header
    print(f"{COLOR_YELLOW}{'='*80}{COLOR_RESET}")                    # <-- Print confirmation divider
    
    try:
        response = input(f"\n{COLOR_CYAN}Proceed with cloning projects? (yes/no): {COLOR_RESET}").strip().lower()  # <-- Get user input
        
        if response in ['yes', 'y']:
            print(f"{COLOR_GREEN}[OK] Confirmed - Proceeding with project cloning...{COLOR_RESET}\n")  # <-- Confirmation message
            return True                                               # <-- Return true to proceed
        else:
            print(f"{COLOR_RED}[CANCEL] No files were modified{COLOR_RESET}\n")  # <-- Cancellation message
            return False                                              # <-- Return false to cancel
    except (KeyboardInterrupt, EOFError):
        print(f"\n{COLOR_RED}[CANCEL] Cancelled by user{COLOR_RESET}\n")  # <-- Handle Ctrl+C or EOF
        return False                                                  # <-- Return false to cancel
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
        prog='AutomationUtil__FetchLocalProjects__BuildWhitecardopediaProject__Main__.py'
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
        help='Process only a specific project folder (e.g., "VN-61445__Vaughan__Whitecard"). By default, all Whitecard projects are processed.'
    )
    
    args = parser.parse_args()                                        # <-- Parse command line arguments
    
    script_dir = Path(__file__).parent                                # <-- Get script directory
    source_base = Path(LOCAL_PROJECTS_BASE_PATH)                      # <-- Construct source path
    dest_base = script_dir / WHITECARDOPEDIA_PROJECTS_PATH            # <-- Construct destination path
    template_path = script_dir / WHITECARDOPEDIA_TEMPLATE_PATH        # <-- Construct template path
    
    print(f"\n{COLOR_CYAN}Whitecardopedia - Project Auto-Cloner Utility{COLOR_RESET}")  # <-- Print title
    print(f"{COLOR_BLUE}Source Path: {source_base}{COLOR_RESET}")    # <-- Print source path
    print(f"{COLOR_BLUE}Destination Path: {dest_base}{COLOR_RESET}\n")  # <-- Print destination path
    
    # STEP 1: Discover Whitecard projects
    projects = discover_whitecard_projects(source_base)               # <-- Discover projects
    
    if not projects:
        print(f"{COLOR_RED}No Whitecard projects found. Exiting.{COLOR_RESET}\n")  # <-- Log failure
        return                                                        # <-- Exit if none found
    
    print_discovery_summary(source_base, projects)                    # <-- Print discovery summary
    
    # STEP 2: Always run dry-run first to preview
    print(f"{COLOR_YELLOW}Mode: DRY RUN (preview mode){COLOR_RESET}\n")  # <-- Print dry-run mode
    
    results = process_all_whitecard_projects(source_base, dest_base, template_path, args.project, dry_run=True)  # <-- Run dry-run
    print_results(results, dry_run=True)                              # <-- Print preview results
    
    # Check if any projects need cloning
    needs_cloning = any(r['success'] and not r['skipped'] and r['images_found'] > 0 for r in results)  # <-- Check if any need cloning
    
    # If dry-run-only flag is set, exit after preview
    if args.dry_run_only:
        return                                                        # <-- Exit after dry-run
    
    # If no projects need cloning, exit
    if not needs_cloning:
        print(f"{COLOR_GREEN}No new projects to clone. All projects either exist or have no images.{COLOR_RESET}\n")  # <-- No changes message
        return                                                        # <-- Exit if nothing to clone
    
    # STEP 3: Ask for confirmation before proceeding
    if not prompt_for_confirmation():
        return                                                        # <-- Exit if user cancels
    
    # STEP 4: Run actual cloning
    print(f"{COLOR_GREEN}Mode: CLONING PROJECTS{COLOR_RESET}\n")     # <-- Print cloning mode
    
    results = process_all_whitecard_projects(source_base, dest_base, template_path, args.project, dry_run=False)  # <-- Run actual cloning
    print_results(results, dry_run=False)                             # <-- Print final results
    
    successful_count = sum(1 for r in results if r['success'] and not r['skipped'])  # <-- Count successful
    print(f"{COLOR_GREEN}Cloning complete! {successful_count} project(s) successfully cloned.{COLOR_RESET}\n")  # <-- Print completion
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------


if __name__ == '__main__':
    main()

