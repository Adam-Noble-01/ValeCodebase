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
# - Scans local disc for projects with __Whitecard, __Blockout, or __MaxModel suffix
# - Discovers latest content delivery folders with date stamps
# - Copies IMG## prefixed images to Whitecardopedia project structure
# - Generates project.json files from template with extracted metadata
# - Automatically extracts date fulfilled from content folder name (e.g., __17-Oct-2025)
# - Prevents manual duplication by automating project folder creation
# - Skips existing projects to avoid overwriting manual changes
# - MaxModel projects additionally write RenderEngine__Config: MaxEngine so ValeVision3D boots into MaxEngine automatically
#
# USAGE:
# - python AutomationUtil__FetchLocalProjects__BuildWhitecardopediaProject__Main__.py                    # Clone all Whitecard projects
# - python AutomationUtil__FetchLocalProjects__BuildWhitecardopediaProject__Main__.py --dry-run-only     # Preview only
# - python AutomationUtil__FetchLocalProjects__BuildWhitecardopediaProject__Main__.py --project <name>   # Clone specific project
#
# =============================================================================

import os
import sys
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
LOCAL_PROJECTS_BASE_FOLDER         = r"C:\01__ValeProjects"                  # <-- Base folder containing year subfolders
WHITECARDOPEDIA_PROJECTS_BASE      = "../Projects"                           # <-- Destination base path for Whitecardopedia projects
WHITECARDOPEDIA_TEMPLATE_PATH      = "../Projects/2025/01__TemplateProject"  # <-- Template project path (keep in 2025)
MASTER_CONFIG_PATH                 = "../02__Src__AppModules/03__AppData/Na__AppData__MasterConfig__Main.json"  # <-- Master configuration file path
CONTENT_DELIVERED_SUBFOLDER        = "10__ContentDelivered__Local"          # <-- Content delivery subfolder name
GLB_SYNC_SUBFOLDER                 = "ValeVision__GlbFileSync"              # <-- GLB files subfolder name
PROJECT_JSON_FILENAME              = "project.json"                          # <-- Project metadata filename
# ------------------------------------------------------------


# MODULE CONSTANTS | ValeVision CDN Configuration
# ------------------------------------------------------------
CDN_BASE_URL                       = "https://cdn.noble-architecture.com/VaApps/Projects"  # <-- CDN base URL for ValeVision models
# ------------------------------------------------------------


# MODULE CONSTANTS | ValeVision Camera Defaults (MM)
# ------------------------------------------------------------
VALEVISION_CAMERA_DEFAULTS         = {
    "Camera__DefaultPosition__Description": "All camera position/target values are integer millimeters; convert to 3D units in code.",
    "Camera__DefaultPos": {
        "Camera__DefaultPos__PosX"       : -5000,
        "Camera__DefaultPos__PosY"       :  2800,
        "Camera__DefaultPos__PosZ"       :  3250
    },
    "Camera__DefaultTarget": {
        "Camera__DefaultTarget__TargetX" : -1250,
        "Camera__DefaultTarget__TargetY" :  2570,
        "Camera__DefaultTarget__TargetZ" :  -350
    },
    "Camera__DefaultRotation": {
        "Camera__DefaultRotation__RotX"  : -0.073,
        "Camera__DefaultRotation__RotY"  : -0.8346,
        "Camera__DefaultRotation__RotZ"  : -0.0541
    },
    "Camera__DefaultMisc": {
        "Camera__DefaultMisc__Fov"       : 29.8628
    }
}
# ------------------------------------------------------------


# MODULE CONSTANTS | Regex Patterns
# ------------------------------------------------------------
WHITECARD_FOLDER_PATTERN_OLD       = r'^([A-Z]{2}-\d+)__(.+?)__Whitecard$'  # <-- Legacy pattern: EX-12345__Example__Whitecard
WHITECARD_FOLDER_PATTERN_NEW       = r'^(\d+)__(.+?)__Whitecard$'  # <-- New pattern: 12345__Example__Whitecard
BLOCKOUT_FOLDER_PATTERN_OLD        = r'^([A-Z]{2}-\d+)__(.+?)__Blockout$'   # <-- Legacy pattern: EX-12345__Example__Blockout
BLOCKOUT_FOLDER_PATTERN_NEW        = r'^(\d+)__(.+?)__Blockout$'   # <-- New pattern: 12345__Example__Blockout
MAXMODEL_FOLDER_PATTERN_OLD        = r'^([A-Z]{2}-\d+)__(.+?)__MaxModel$'   # <-- Legacy pattern: EX-12345__Example__MaxModel
MAXMODEL_FOLDER_PATTERN_NEW        = r'^(\d+)__(.+?)__MaxModel$'   # <-- New pattern: 12345__Example__MaxModel
IMAGE_PREFIX_PATTERN               = r'^IMG(\d{2})(?:_ART(\d{2}))?__.*\.(png|jpg|jpeg|svg|gif|webp)$'  # <-- Image filename pattern
GLB_FILE_PATTERN                   = r'^.+\.glb$'                            # <-- GLB file extension pattern
GLB_ARCHIVE_SUBFOLDER              = "01__Archive"                           # <-- Archive subfolder to skip
GLB_NAMODEL_NAMESPACE              = "__NaModel__"                           # <-- SketchUp export namespace marker
GLB_VALEVISION_NAMESPACE           = "__ValeVision__"                        # <-- CDN rebranded namespace marker
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
4. Discovers .glb model files in ValeVision__GlbFileSync folders
5. Generates CDN URLs for ValeVision 3D models (sorted by semantic version)
6. Copies images to Whitecardopedia project structure
7. Generates project.json with extracted metadata (name, code, dateFulfilled)
8. Adds valeVision_ModelUrl_BaseMesh and valeVision_ModelUrl_Linework fields
9. Automatically adds project to masterConfig.json as enabled
10. Extracts date fulfilled from content folder name (e.g., __17-Oct-2025)
11. Strips __Whitecard suffix from destination folder names

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
  - Legacy Format:
    Source:      VN-61445__Vaughan__Whitecard
    Destination: VN-61445__Vaughan
  - New Format:
    Source:      12345__Example__Whitecard
    Destination: 12345__Example
  
  The __Whitecard suffix is purely for discovery on local machines.
  Both legacy (EX-12345__Name__Whitecard) and new (12345__Name__Whitecard) formats are supported.

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
  - scheduleData.dateFulfilled: Extracted from content folder date stamp (e.g., "17-Oct-2025")
                                Falls back to "TBD" if no date found in folder name
  - images:      List of discovered IMG files
  - valeVision_ModelUrl_BaseMesh: CDN URL for base mesh .glb (Layer-01)
  - valeVision_ModelUrl_Linework: CDN URL for linework .glb (Layer-02)
  - Other fields: Copied from template as placeholders

ValeVision Model URL Generation:
  
  If .glb files are found in ValeVision__GlbFileSync folder:
  - Generates Cloudflare CDN URLs automatically
  - Sorts models by semantic version (1.0.0, 1.1.0, 1.2.0, etc.)
  - Format: https://cdn.noble-architecture.com/VaApps/Projects/2025/[ProjectFolder]/[ModelFile].glb
  - Base Mesh: files include "__Layer-01__BaseMeshModel__"
  - Linework:  files include "__Layer-02__LineworkModel__"
  - URLs enable direct model loading in ValeVision3D viewer
  - Latest version is selected per layer when multiple models exist

Master Config Auto-Update:
  
  Successfully cloned projects are automatically added to masterConfig.json:
  - New project entries are set to "enabled": true
  - Blacklisted projects are set to "enabled": false
  - Eliminates manual masterConfig.json editing
  - Projects appear in Whitecardopedia gallery immediately

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
# REGION | Year Folder Discovery Functions
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Discover All ValeProjects Year Folders
# ---------------------------------------------------------------
def discover_vale_year_folders() -> List[Tuple[str, Path]]:
    """Discover all ValeProjects__YYYY folders in base directory"""
    base_path = Path(LOCAL_PROJECTS_BASE_FOLDER)                         # <-- Get base path
    year_folders = []                                                     # <-- Initialize list
    
    if not base_path.exists():
        return year_folders                                               # <-- Return empty if doesn't exist
    
    for item in base_path.iterdir():
        if item.is_dir() and item.name.startswith('ValeProjects__'):     # <-- Check for ValeProjects prefix
            year_part = item.name.replace('ValeProjects__', '')           # <-- Extract year
            if year_part.isdigit() and len(year_part) == 4:              # <-- Validate 4-digit year
                year_folders.append((year_part, item))                    # <-- Add (year, path) tuple
    
    return sorted(year_folders, key=lambda x: x[0], reverse=True)        # <-- Sort by year (newest first)
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Metadata Extraction Functions
# -----------------------------------------------------------------------------

# FUNCTION | Extract Project Metadata from Folder Name
# ------------------------------------------------------------
def extract_project_metadata(folder_name: str) -> Tuple[Optional[str], Optional[str], Optional[str], Optional[str]]:
    # DEFINE ALL PATTERNS WITH THEIR PROJECT TYPES
    patterns_with_types = [
        (WHITECARD_FOLDER_PATTERN_OLD, "Whitecard"),                 # <-- Legacy Whitecard: EX-12345__Example__Whitecard
        (WHITECARD_FOLDER_PATTERN_NEW, "Whitecard"),                 # <-- New Whitecard: 12345__Example__Whitecard
        (BLOCKOUT_FOLDER_PATTERN_OLD,  "Blockout"),                  # <-- Legacy Blockout: EX-12345__Example__Blockout
        (BLOCKOUT_FOLDER_PATTERN_NEW,  "Blockout"),                  # <-- New Blockout: 12345__Example__Blockout
        (MAXMODEL_FOLDER_PATTERN_OLD,  "MaxModel"),                  # <-- Legacy MaxModel: EX-12345__Example__MaxModel
        (MAXMODEL_FOLDER_PATTERN_NEW,  "MaxModel"),                  # <-- New MaxModel: 12345__Example__MaxModel
    ]

    for pattern, project_type in patterns_with_types:
        match = re.match(pattern, folder_name)                       # <-- Try pattern match

        if match:
            group1 = match.group(1)                                  # <-- Extract first group (code)
            project_name = match.group(2)                            # <-- Extract project name

            if '-' in group1:
                full_code = group1                                   # <-- Legacy format: full code with prefix
                project_code = full_code.split('-')[1]               # <-- Extract numeric code only
            else:
                full_code = group1                                   # <-- New format: numeric code only
                project_code = group1                                # <-- Same as full code

            return full_code, project_code, project_name, project_type  # <-- Return metadata with type

    return None, None, None, None                                    # <-- Return None if no pattern matches
# ---------------------------------------------------------------


# FUNCTION | Generate Destination Folder Name
# ------------------------------------------------------------
def generate_destination_folder_name(folder_name: str) -> Optional[str]:
    # TRY ALL PATTERNS (Whitecard, Blockout, and MaxModel — legacy and new)
    all_patterns = [
        WHITECARD_FOLDER_PATTERN_OLD,                                # <-- Legacy Whitecard
        WHITECARD_FOLDER_PATTERN_NEW,                                # <-- New Whitecard
        BLOCKOUT_FOLDER_PATTERN_OLD,                                 # <-- Legacy Blockout
        BLOCKOUT_FOLDER_PATTERN_NEW,                                 # <-- New Blockout
        MAXMODEL_FOLDER_PATTERN_OLD,                                 # <-- Legacy MaxModel
        MAXMODEL_FOLDER_PATTERN_NEW,                                 # <-- New MaxModel
    ]

    for pattern in all_patterns:
        match = re.match(pattern, folder_name)                       # <-- Try pattern match

        if match:
            code_part = match.group(1)                               # <-- Extract code portion
            name_part = match.group(2)                               # <-- Extract project name
            return f"{code_part}__{name_part}"                       # <-- Return name without type suffix

    return None                                                      # <-- Return None if no pattern matches
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


# HELPER FUNCTION | Extract Date String from Folder Name
# ---------------------------------------------------------------
def extract_folder_date_string(folder_name: str) -> Optional[str]:
    match = re.search(DATE_SUFFIX_PATTERN, folder_name)             # <-- Search for date pattern
    
    if match:
        return match.group(1)                                        # <-- Return date string (DD-MMM-YYYY)
    
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
            # EXCLUDE GLB SYNC FOLDER FROM CONTENT FOLDER SEARCH
            if item.name == GLB_SYNC_SUBFOLDER:
                continue                                              # <-- Skip GLB sync folder
            
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
# REGION | ValeVision CDN URL Builder
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Rebrand NaModel to ValeVision in Filename
# ---------------------------------------------------------------
def rebrand_glb_filename(filename: str) -> str:
    """Rename __NaModel__ to __ValeVision__ in filename for CDN branding"""
    if GLB_NAMODEL_NAMESPACE in filename:
        return filename.replace(GLB_NAMODEL_NAMESPACE, GLB_VALEVISION_NAMESPACE)  # <-- Rebrand namespace
    return filename                                                   # <-- Return unchanged if no NaModel marker
# ---------------------------------------------------------------


# FUNCTION | Build ValeVision Model CDN URL (With NaModel -> ValeVision Rebrand)
# ------------------------------------------------------------
def build_valevision_model_url(year: str, dest_folder_name: str, glb_filename: str) -> str:
    """Build CDN URL for ValeVision 3D model, rebranding NaModel to ValeVision"""
    cdn_filename = rebrand_glb_filename(glb_filename)                 # <-- Rebrand NaModel -> ValeVision
    return f"{CDN_BASE_URL}/{year}/{dest_folder_name}/{cdn_filename}" # <-- Construct full CDN URL with year
# ---------------------------------------------------------------


# FUNCTION | Build ValeVision Model URLs Array for All GLBs
# ------------------------------------------------------------
def build_valevision_model_urls_array(year: str, dest_folder_name: str, glb_files: List[str]) -> List[str]:
    """Build CDN URL array for all GLB files, rebranding NaModel to ValeVision"""
    urls = []                                                         # <-- Initialize URLs list
    for filename in glb_files:
        url = build_valevision_model_url(year, dest_folder_name, filename)  # <-- Build URL with rebrand
        urls.append(url)                                              # <-- Add to URLs list
    return urls                                                       # <-- Return all CDN URLs
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
    if not content_folder.exists() or not content_folder.is_dir():
        return []                                                     # <-- Return empty if path invalid

    # DEDUPE BY SLOT | A sync keeps only the latest render per IMG## (and IMG##_ART##) scene
    latest_by_slot = {}
    for item in content_folder.iterdir():
        if not item.is_file():
            continue                                                  # <-- Skip folders
        if not re.match(IMAGE_PREFIX_PATTERN, item.name, re.IGNORECASE):
            continue                                                  # <-- Skip non-image files
        slot = extract_image_number(item.name)                        # <-- (img_num, art_num) slot identity
        cur  = latest_by_slot.get(slot)
        if cur is None or item.stat().st_mtime > cur.stat().st_mtime:  # <-- Newest mtime wins
            latest_by_slot[slot] = item

    images = sorted((p.name for p in latest_by_slot.values()), key=extract_image_number)  # <-- Sort by numeric prefix
    return images                                                     # <-- Return deduped, sorted images list
# ---------------------------------------------------------------


# FUNCTION | Discover GLB Files in ValeVision Sync Folder (Root Level Only)
# ------------------------------------------------------------
def discover_glb_files(project_path: Path) -> List[str]:
    """Discover .glb files at root level of ValeVision sync folder, skipping archive subdirectories"""
    glb_files = []                                                    # <-- Initialize GLB files list
    
    # CONSTRUCT PATH TO GLB SYNC FOLDER
    glb_sync_path = project_path / CONTENT_DELIVERED_SUBFOLDER / GLB_SYNC_SUBFOLDER  # <-- Build path to sync folder
    
    if not glb_sync_path.exists() or not glb_sync_path.is_dir():
        return glb_files                                              # <-- Return empty if path invalid
    
    for item in glb_sync_path.iterdir():
        if item.is_dir():
            continue                                                  # <-- Skip subdirectories (01__Archive, etc.)
        if item.is_file():                                            # <-- Check if item is file
            filename = item.name                                      # <-- Get filename
            if re.match(GLB_FILE_PATTERN, filename, re.IGNORECASE):   # <-- Check pattern match
                glb_files.append(filename)                            # <-- Add to GLB files list
    
    glb_files.sort()                                                  # <-- Sort alphabetically
    return glb_files                                                  # <-- Return sorted GLB files list
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Folder Discovery Functions
# -----------------------------------------------------------------------------

# FUNCTION | Get Project Folders Blacklist from Config
# ------------------------------------------------------------
def get_project_blacklist() -> List[str]:
    """Load project folders blacklist from masterConfig.json"""
    try:
        script_dir = Path(__file__).parent                             # <-- Get script directory
        config_path = script_dir / MASTER_CONFIG_PATH                  # <-- Build config path
        
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)                                      # <-- Load master config
        
        return config.get('projectFoldersBlacklist', [])              # <-- Return blacklist array
    except Exception:
        return []                                                      # <-- Return empty list on error
# ---------------------------------------------------------------


# FUNCTION | Discover All Whitecard and Blockout Projects in Source Path
# ------------------------------------------------------------
def discover_whitecard_projects(source_base: Path, blacklist: List[str] = None) -> List[Dict]:
    projects = []                                                     # <-- Initialize projects list
    skipped_blacklisted = []                                          # <-- Track blacklisted projects
    
    if not source_base.exists() or not source_base.is_dir():
        return projects                                               # <-- Return empty if path invalid
    
    if blacklist is None:
        blacklist = get_project_blacklist()                           # <-- Load blacklist if not provided
    
    for item in sorted(source_base.iterdir()):
        if not item.is_dir() or item.name.startswith('.'):
            continue                                                  # <-- Skip non-directories and hidden
        
        full_code, project_code, project_name, project_type = extract_project_metadata(item.name)  # <-- Extract metadata with type
        
        if full_code and project_code and project_name:               # <-- Check if valid project
            dest_folder_name = generate_destination_folder_name(item.name)  # <-- Generate destination name
            
            # CHECK IF PROJECT IS BLACKLISTED
            if dest_folder_name in blacklist:                          # <-- Skip blacklisted projects
                skipped_blacklisted.append(dest_folder_name)           # <-- Track skipped project
                continue                                                # <-- Skip this project
            
            projects.append({
                'source_path': item,
                'source_folder_name': item.name,
                'dest_folder_name': dest_folder_name,
                'full_code': full_code,
                'project_code': project_code,
                'project_name': project_name,
                'project_type': project_type                           # <-- Include detected project type
            })
    
    # LOG BLACKLISTED PROJECTS IF ANY
    if skipped_blacklisted:
        print(f"{COLOR_YELLOW}[BLACKLIST] Skipped {len(skipped_blacklisted)} blacklisted project(s): {', '.join(skipped_blacklisted)}{COLOR_RESET}")  # <-- Log blacklisted projects
    
    return projects                                                   # <-- Return discovered projects list
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Master Config Management Functions
# -----------------------------------------------------------------------------

# FUNCTION | Load Master Configuration File
# ------------------------------------------------------------
def load_master_config_file(config_path: Path) -> Tuple[Dict, bool]:
    """Load masterConfig.json file"""
    try:
        with open(config_path, 'r', encoding='utf-8') as file:        # <-- Open config file
            config = json.load(file)                                  # <-- Parse JSON content
            return config, True                                       # <-- Return config and success flag
    except Exception as error:
        print(f"{COLOR_RED}Error reading {config_path}: {error}{COLOR_RESET}")  # <-- Log error
        return None, False                                            # <-- Return None and failure flag
# ---------------------------------------------------------------


# FUNCTION | Write Master Configuration File
# ------------------------------------------------------------
def write_master_config_file(config_path: Path, config: Dict) -> bool:
    """Write masterConfig.json file"""
    try:
        with open(config_path, 'w', encoding='utf-8') as file:        # <-- Open config file for writing
            json.dump(config, file, indent=4, ensure_ascii=False)     # <-- Write formatted JSON
            file.write('\n')                                          # <-- Add trailing newline
        return True                                                   # <-- Return success flag
    except Exception as error:
        print(f"{COLOR_RED}Error writing {config_path}: {error}{COLOR_RESET}")  # <-- Log error
        return False                                                  # <-- Return failure flag
# ---------------------------------------------------------------


# FUNCTION | Add Project to Master Config with Year-Aware folderId
# ------------------------------------------------------------
def add_project_to_master_config(config_path: Path, folder_id: str) -> bool:
    """Add newly cloned project to masterConfig.json with year-aware folderId"""
    config, success = load_master_config_file(config_path)            # <-- Load existing config
    
    if not success or config is None:
        return False                                                  # <-- Return failure if load failed
    
    projects = config.get('projects', [])                             # <-- Get projects array
    blacklist = config.get('projectFoldersBlacklist', [])             # <-- Get blacklist
    
    # CHECK IF PROJECT ALREADY EXISTS IN CONFIG
    existing = next((p for p in projects if p['folderId'] == folder_id), None)  # <-- Find existing entry
    
    if existing:
        return True                                                   # <-- Already exists, no action needed
    
    # EXTRACT FOLDER NAME WITHOUT YEAR FOR BLACKLIST CHECK
    folder_name_only = folder_id.split('/')[-1] if '/' in folder_id else folder_id  # <-- Get folder name without year
    
    # ADD NEW PROJECT
    is_blacklisted = folder_name_only in blacklist                    # <-- Check if blacklisted
    enabled = not is_blacklisted                                      # <-- Set enabled flag
    
    projects.append({
        "folderId": folder_id,                                        # <-- Year-aware folderId (e.g., "2025/ProjectName")
        "enabled": enabled
    })
    
    config['projects'] = projects                                     # <-- Update projects array
    
    success = write_master_config_file(config_path, config)           # <-- Write updated config
    
    if success:
        status = "enabled" if enabled else "disabled (blacklisted)"
        print(f"    {COLOR_GREEN}[+] Added to masterConfig.json ({status}){COLOR_RESET}")  # <-- Log success
    
    return success                                                    # <-- Return success flag
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


# FUNCTION | Create Project JSON File with Year-Aware basePath
# ------------------------------------------------------------
def create_project_json(dest_folder: Path, template: Dict, project_code: str, project_name: str, images: List[str], project_date: str, model_urls: List[str], dest_folder_name: str, year: str, project_type: str = "Whitecard") -> bool:
    project_json_path = dest_folder / PROJECT_JSON_FILENAME           # <-- Construct project.json path
    
    project_data = template.copy()                                    # <-- Copy template data
    project_data['projectName'] = project_name                        # <-- Set project name
    project_data['ProjectType'] = project_type                        # <-- Set project type (Whitecard, Blockout, or MaxModel)
    project_data['projectCode'] = project_code                        # <-- Set project code
    project_data['images'] = images                                   # <-- Set images array

    # MAXMODEL | Write RenderEngine__Config so ValeVision3D boots into MaxEngine automatically
    if project_type == "MaxModel":
        project_data['RenderEngine__Config'] = {
            "RenderEngine__Active": "MaxEngine"                       # <-- Auto-activates MaxEngine in ValeVision3D
        }
    else:
        project_data.pop('RenderEngine__Config', None)               # <-- Remove key if present in template (safe cleanup)
    
    # SET YEAR-AWARE BASE PATH
    project_data['basePath'] = f"Projects/{year}/{dest_folder_name}" # <-- Set basePath with year included
    
    # SET DATE FULFILLED IN SCHEDULE DATA INSTEAD OF PROJECT DATE
    if 'scheduleData' not in project_data:
        project_data['scheduleData'] = {}                             # <-- Create scheduleData if missing
    project_data['scheduleData']['dateFulfilled'] = project_date      # <-- Set extracted date as dateFulfilled
    
    # CLEAN LEGACY MODEL URL FIELDS (remove old v3 format keys if present)
    project_data.pop('valeVision_ModelUrl_BaseMesh', None)            # <-- Remove legacy base mesh key
    project_data.pop('valeVision_ModelUrl_Linework', None)            # <-- Remove legacy linework key
    project_data.pop('valeVision_ModelUrl', None)                     # <-- Remove legacy single/array key
    
    # BUILD VALEVISION MODEL URLS ARRAY (V4 FORMAT)
    project_data['valeVision_ModelUrls'] = model_urls                 # <-- Set multi-model URLs array
    
    project_data['valeVision_Camera__DefaultPosition'] = VALEVISION_CAMERA_DEFAULTS  # <-- ValeVision camera defaults
    
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


# HELPER FUNCTION | Update Model URLs in Existing Project JSON
# ---------------------------------------------------------------
def update_project_json_model_urls(dest_folder: Path, model_urls: List[str]) -> bool:
    """Read existing project.json and update only the model URL fields"""
    project_json_path = dest_folder / PROJECT_JSON_FILENAME           # <-- Construct project.json path
    
    if not project_json_path.exists():
        return False                                                  # <-- Return failure if file missing
    
    try:
        with open(project_json_path, 'r', encoding='utf-8') as file: # <-- Open for reading
            project_data = json.load(file)                            # <-- Parse existing JSON
    except Exception as error:
        print(f"{COLOR_RED}Error reading {project_json_path}: {error}{COLOR_RESET}")  # <-- Log read error
        return False                                                  # <-- Return failure
    
    # CLEAN LEGACY MODEL URL FIELDS (remove old v3 format keys if present)
    project_data.pop('valeVision_ModelUrl_BaseMesh', None)            # <-- Remove legacy base mesh key
    project_data.pop('valeVision_ModelUrl_Linework', None)            # <-- Remove legacy linework key
    project_data.pop('valeVision_ModelUrl', None)                     # <-- Remove legacy single/array key
    
    # SET V4 MULTI-MODEL URLS ARRAY
    project_data['valeVision_ModelUrls'] = model_urls                 # <-- Set new multi-model URLs array
    
    try:
        with open(project_json_path, 'w', encoding='utf-8') as file: # <-- Open for writing
            json.dump(project_data, file, indent=4, ensure_ascii=False)  # <-- Write formatted JSON
            file.write('\n')                                          # <-- Add trailing newline
        return True                                                   # <-- Return success
    except Exception as error:
        print(f"{COLOR_RED}Error writing {project_json_path}: {error}{COLOR_RESET}")  # <-- Log write error
        return False                                                  # <-- Return failure
# ---------------------------------------------------------------


# FUNCTION | Process Single Whitecard Project with Year
# ------------------------------------------------------------
def process_single_project(project_info: Dict, dest_base_path: Path, template_path: Path, dry_run: bool, year: str) -> Dict:
    result = {
        'source_name': project_info['source_folder_name'],
        'dest_name': project_info['dest_folder_name'],
        'project_name': project_info['project_name'],
        'project_code': project_info['project_code'],
        'project_type': project_info.get('project_type', 'Whitecard'),  # <-- Track project type
        'success': False,
        'skipped': False,
        'model_urls_updated': False,
        'images_found': 0,
        'images_copied': 0,
        'glb_files_found': 0,
        'glb_model_urls': [],
        'latest_folder': None,
        'error': None
    }
    
    # DISCOVER GLB FILES IN PROJECT (always, even if project exists)
    glb_files = discover_glb_files(project_info['source_path'])       # <-- Discover root-level GLB files
    result['glb_files_found'] = len(glb_files)                        # <-- Store GLB count
    
    # BUILD ALL GLB MODEL URLS (NaModel rebranded to ValeVision)
    model_urls = build_valevision_model_urls_array(year, project_info['dest_folder_name'], glb_files)  # <-- Build all URLs
    result['glb_model_urls'] = model_urls                             # <-- Store URLs for preview
    
    # CHECK IF PROJECT ALREADY EXISTS -- UPDATE MODEL URLS ONLY
    if check_project_exists(dest_base_path, project_info['dest_folder_name']):  # <-- Check if exists
        dest_folder = dest_base_path / project_info['dest_folder_name']  # <-- Construct destination path
        
        if not dry_run and model_urls:
            update_success = update_project_json_model_urls(dest_folder, model_urls)  # <-- Update URLs in existing JSON
            result['model_urls_updated'] = update_success             # <-- Track update result
        
        result['skipped'] = True                                      # <-- Mark images as skipped (already exist)
        result['success'] = True                                      # <-- Not an error condition
        result['error'] = "Already exists - model URLs refreshed"      # <-- Set info message
        return result                                                 # <-- Return updated result
    
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
    
    # EXTRACT DATE FROM LATEST FOLDER NAME
    project_date = extract_folder_date_string(latest_folder.name)    # <-- Extract date from folder name
    if not project_date:
        project_date = "TBD"                                          # <-- Use TBD if no date found
    
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
        images,
        project_date,
        model_urls,
        project_info['dest_folder_name'],
        year,
        project_info.get('project_type', 'Whitecard')               # <-- Pass detected project type
    )
    
    if not json_success:
        result['error'] = "Failed to create project.json"             # <-- Set error message
        return result                                                 # <-- Return error result
    
    # ADD PROJECT TO MASTER CONFIG WITH YEAR-AWARE FOLDERID
    script_dir = Path(__file__).parent                                # <-- Get script directory
    config_path = script_dir / MASTER_CONFIG_PATH                     # <-- Construct config path
    year_aware_folder_id = f"{year}/{project_info['dest_folder_name']}"  # <-- Build year-aware folderId
    config_success = add_project_to_master_config(config_path, year_aware_folder_id)  # <-- Add to config with year
    
    if not config_success:
        print(f"    {COLOR_YELLOW}[!] Warning: Failed to add to masterConfig.json{COLOR_RESET}")  # <-- Log warning
    
    result['success'] = True                                          # <-- Mark as successful
    return result                                                     # <-- Return success result
# ---------------------------------------------------------------


# FUNCTION | Process All Whitecard Projects for a Year
# ------------------------------------------------------------
def process_all_whitecard_projects(source_base: Path, dest_base: Path, template_path: Path, target_project: Optional[str], dry_run: bool, year: str) -> List[Dict]:
    results = []                                                      # <-- Initialize results list
    
    projects = discover_whitecard_projects(source_base)               # <-- Discover all Whitecard projects
    
    if not projects:
        print(f"{COLOR_RED}No Whitecard projects found in {source_base}{COLOR_RESET}")  # <-- Log error
        return results                                                # <-- Return empty results
    
    for project_info in projects:
        if target_project and project_info['source_folder_name'] != target_project:
            continue                                                  # <-- Skip if not target project
        
        result = process_single_project(project_info, dest_base, template_path, dry_run, year)  # <-- Process project with year
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
    urls_refreshed = sum(1 for r in results if r.get('model_urls_updated'))  # <-- Count URL refreshes
    errors = sum(1 for r in results if not r['success'] and not r['skipped'])  # <-- Count errors
    total_images = sum(r['images_found'] for r in results)            # <-- Count total images
    total_glb_files = sum(r['glb_files_found'] for r in results)      # <-- Count total GLB files
    
    for result in results:
        dest_name = result['dest_name']                               # <-- Get destination name
        
        if result['skipped']:
            print(f"{COLOR_BLUE}[=] {dest_name}{COLOR_RESET}")       # <-- Print skip indicator
            print(f"    Status: {result['error']}")                   # <-- Print skip reason
            print(f"    GLB Models: {result['glb_files_found']} found")  # <-- Print GLB count
            if result['glb_model_urls']:
                for url in result['glb_model_urls']:
                    print(f"      {COLOR_CYAN}-> {url}{COLOR_RESET}") # <-- Print each CDN URL
            if result.get('model_urls_updated'):
                print(f"    {COLOR_GREEN}Model URLs updated in project.json{COLOR_RESET}")  # <-- Confirm URL update
            print()
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
        
        project_type_label = result.get('project_type', 'Whitecard')  # <-- Get project type for display
        type_color = COLOR_CYAN if project_type_label == "MaxModel" else COLOR_RESET  # <-- Highlight MaxModel in cyan
        print(f"{COLOR_GREEN}[+] {dest_name}{COLOR_RESET}")          # <-- Print success indicator
        print(f"    Type: {type_color}{project_type_label}{COLOR_RESET}")  # <-- Print project type (MaxModel highlighted)
        if project_type_label == "MaxModel":
            print(f"    {COLOR_CYAN}RenderEngine__Config: MaxEngine will be written to project.json{COLOR_RESET}")  # <-- MaxModel tag note
        print(f"    Images: {result['images_found']} found")          # <-- Print images found
        if not dry_run:
            print(f"    Copied: {result['images_copied']} files")     # <-- Print copied count
        print(f"    GLB Models: {result['glb_files_found']} found")   # <-- Print GLB count
        
        # PRINT GLB MODEL URLS
        if result['glb_model_urls']:
            for url in result['glb_model_urls']:
                print(f"      {COLOR_CYAN}-> {url}{COLOR_RESET}")     # <-- Print each CDN URL
        
        print(f"    Latest Folder: {result['latest_folder']}")        # <-- Print folder name
        print(f"    Status: {'Would clone' if dry_run else 'Cloned successfully'}\n")  # <-- Print status
    
    print(f"{COLOR_CYAN}{'='*80}{COLOR_RESET}")                      # <-- Print footer divider
    print(f"{COLOR_CYAN}SUMMARY{COLOR_RESET}")                       # <-- Print summary title
    print(f"{COLOR_CYAN}{'='*80}{COLOR_RESET}")                      # <-- Print footer divider
    print(f"Projects discovered   : {total_projects}")                # <-- Print total projects
    print(f"Successfully cloned   : {successful}")                    # <-- Print successful count
    print(f"Skipped (exists)      : {skipped}")                       # <-- Print skipped count
    print(f"Model URLs refreshed  : {urls_refreshed}")                # <-- Print URL refresh count
    print(f"Errors/Warnings       : {errors}")                        # <-- Print error count
    print(f"Total images found    : {total_images}")                  # <-- Print total images
    print(f"Total GLB models      : {total_glb_files}")               # <-- Print total GLB files
    
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
        help='Process only a specific project folder (e.g., "VN-61445__Vaughan__Whitecard" or "12345__Example__Blockout"). By default, all Whitecard and Blockout projects are processed.'
    )
    
    args = parser.parse_args()                                        # <-- Parse command line arguments
    
    script_dir = Path(__file__).parent                                # <-- Get script directory
    dest_base = script_dir / WHITECARDOPEDIA_PROJECTS_BASE            # <-- Construct destination base path
    template_path = script_dir / WHITECARDOPEDIA_TEMPLATE_PATH        # <-- Construct template path
    
    print(f"\n{COLOR_CYAN}Whitecardopedia - Project Auto-Cloner Utility{COLOR_RESET}")  # <-- Print title
    
    # STEP 1: Discover all year folders
    year_folders = discover_vale_year_folders()                       # <-- Discover all year folders
    
    if not year_folders:
        print(f"{COLOR_RED}No ValeProjects year folders found in {LOCAL_PROJECTS_BASE_FOLDER}. Exiting.{COLOR_RESET}\n")
        return                                                        # <-- Exit if no year folders
    
    print(f"{COLOR_BLUE}Scanning {len(year_folders)} year folder(s): {', '.join([y[0] for y in year_folders])}{COLOR_RESET}\n")
    
    all_results = []                                                  # <-- Collect results from all years
    
    # STEP 2: Process each year folder
    for year, source_base in year_folders:
        print(f"{COLOR_CYAN}{'='*80}{COLOR_RESET}")
        print(f"{COLOR_CYAN}Processing Year: {year}{COLOR_RESET}")
        print(f"{COLOR_CYAN}{'='*80}{COLOR_RESET}\n")
        print(f"{COLOR_BLUE}Source Path: {source_base}{COLOR_RESET}")
        
        # Construct year-specific destination
        dest_year_path = dest_base / year                             # <-- Year subfolder in destination
        
        projects = discover_whitecard_projects(source_base)           # <-- Discover projects for this year
        
        if not projects:
            print(f"{COLOR_YELLOW}No Whitecard projects found in {year}. Skipping.{COLOR_RESET}\n")
            continue                                                  # <-- Skip this year
        
        print(f"{COLOR_BLUE}[DISCOVERY] Found {len(projects)} Whitecard project(s) in {year}{COLOR_RESET}\n")
        
        # STEP 3: Run dry-run for this year
        print(f"{COLOR_YELLOW}Mode: DRY RUN (preview mode){COLOR_RESET}\n")
        
        results = process_all_whitecard_projects(source_base, dest_year_path, template_path, args.project, dry_run=True, year=year)
        all_results.extend(results)                                   # <-- Add to all results
        print_results(results, dry_run=True)                          # <-- Print preview results for this year
    
    # Check if any projects need cloning or URL refresh across all years
    needs_cloning = any(r['success'] and not r['skipped'] and r['images_found'] > 0 for r in all_results)  # <-- Check if any need cloning
    needs_url_refresh = any(r['skipped'] and r['glb_files_found'] > 0 for r in all_results)  # <-- Check if existing projects need URL refresh
    
    # If dry-run-only flag is set, exit after preview
    if args.dry_run_only:
        return                                                        # <-- Exit after dry-run
    
    # If no projects need cloning or URL refresh, exit
    if not needs_cloning and not needs_url_refresh:
        print(f"{COLOR_GREEN}No new projects to clone and no model URLs to refresh.{COLOR_RESET}\n")  # <-- No changes message
        return                                                        # <-- Exit if nothing to do
    
    # STEP 4: Ask for confirmation before proceeding
    if not prompt_for_confirmation():
        return                                                        # <-- Exit if user cancels
    
    # STEP 5: Run actual cloning for all years
    print(f"{COLOR_GREEN}Mode: CLONING PROJECTS{COLOR_RESET}\n")     # <-- Print cloning mode
    
    all_final_results = []                                            # <-- Collect final results
    
    for year, source_base in year_folders:
        print(f"{COLOR_CYAN}{'='*80}{COLOR_RESET}")
        print(f"{COLOR_CYAN}Cloning Projects for Year: {year}{COLOR_RESET}")
        print(f"{COLOR_CYAN}{'='*80}{COLOR_RESET}\n")
        
        dest_year_path = dest_base / year                             # <-- Year subfolder in destination
        
        results = process_all_whitecard_projects(source_base, dest_year_path, template_path, args.project, dry_run=False, year=year)
        all_final_results.extend(results)                             # <-- Add to all results
        print_results(results, dry_run=False)                         # <-- Print final results for this year
    
    successful_count = sum(1 for r in all_final_results if r['success'] and not r['skipped'])  # <-- Count successful
    refreshed_count = sum(1 for r in all_final_results if r.get('model_urls_updated'))  # <-- Count URL refreshes
    print(f"{COLOR_GREEN}Complete! {successful_count} project(s) cloned, {refreshed_count} project(s) model URLs refreshed.{COLOR_RESET}\n")  # <-- Print completion

    # POST-STEP | Generate gallery thumbnails for any newly cloned projects
    # ---------------------------------------------------------------
    try:
        import subprocess                                                  # <-- Local import to avoid impacting top-of-file ordering
        thumbnail_script = Path(__file__).resolve().parent / "AutomationUtil__GenerateGalleryThumbnails__524p__Main__.py"  # <-- Sibling script path
        if thumbnail_script.exists():
            print(f"{COLOR_CYAN}[POST-STEP] Generating gallery thumbnails (524p)...{COLOR_RESET}\n")  # <-- Announce post-step
            subprocess.run([sys.executable, str(thumbnail_script)], check=False)                     # <-- Best-effort invocation
        else:
            print(f"{COLOR_YELLOW}[POST-STEP] Thumbnail generator not found, skipping thumbnail build.{COLOR_RESET}\n")  # <-- Soft warning
    except Exception as thumbnail_step_error:
        print(f"{COLOR_YELLOW}[POST-STEP] Thumbnail generation failed (non-fatal): {thumbnail_step_error}{COLOR_RESET}\n")  # <-- Surface non-blocking error
    # ---------------------------------------------------------------
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------


if __name__ == '__main__':
    main()

