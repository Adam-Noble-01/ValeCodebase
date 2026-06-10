#!/usr/bin/env python3
# =============================================================================
# WHITECARDOPEDIA - CLOUDFLARE R2 GLB MODEL SYNC UTILITY
# =============================================================================
#
# FILE       : AutomationUtil__BuildCloudflareBucket__WhitecardopediaProjects__Main__.py
# NAMESPACE  : Whitecardopedia
# MODULE     : Cloudflare R2 Sync Utility
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Automatically sync .glb model files to Cloudflare R2 bucket
# CREATED    : 2025
#
# DESCRIPTION:
# - Scans local Whitecard, Blockout, and MaxModel project folders for .glb model files
# - Uploads models to Cloudflare R2 bucket for fast ValeVision3D serving
# - Uses incremental sync strategy (only uploads new/changed files)
# - Replicates local folder structure in cloud bucket
# - Provides comprehensive upload progress and summary reports
# - Includes dry-run mode for safe preview before uploads
#
# USAGE:
# - python AutomationUtil__BuildCloudflareBucket__WhitecardopediaProjects__Main__.py                    # Upload all models
# - python AutomationUtil__BuildCloudflareBucket__WhitecardopediaProjects__Main__.py --dry-run-only     # Preview only
# - python AutomationUtil__BuildCloudflareBucket__WhitecardopediaProjects__Main__.py --project <name>   # Upload specific project
#
# =============================================================================

import os
import sys
import re
import json
import argparse
import boto3
from pathlib import Path
from typing import List, Dict, Tuple, Optional
from dotenv import load_dotenv
from botocore.exceptions import ClientError, NoCredentialsError

# -----------------------------------------------------------------------------
# REGION | Module Constants and Configuration
# -----------------------------------------------------------------------------

# MODULE CONSTANTS | File Patterns and Paths
# ------------------------------------------------------------
LOCAL_PROJECTS_BASE_FOLDER         = r"C:\01__ValeProjects"                      # <-- Base folder containing year subfolders
CONTENT_DELIVERED_SUBFOLDER        = "10__ContentDelivered__Local"               # <-- Content delivery subfolder name
GLB_SYNC_SUBFOLDER                 = "ValeVision__GlbFileSync"                   # <-- GLB files subfolder name
R2_BASE_PREFIX                     = "VaApps/Projects"                           # <-- Base prefix in R2 bucket (year added dynamically)
ENV_FILE_PATH                      = "API__Cloudflare/Token__CloudflareAPI.env"  # <-- Environment file path (relative)
# ------------------------------------------------------------


# MODULE CONSTANTS | Project JSON Sync
# ------------------------------------------------------------
WHITECARDOPEDIA_PROJECTS_BASE      = "../Projects"                                         # <-- Whitecardopedia projects folder (relative to script)
CDN_BASE_URL                       = "https://cdn.noble-architecture.com/VaApps/Projects"  # <-- CDN base URL for ValeVision models
PROJECT_JSON_FILENAME              = "project.json"                                        # <-- Project metadata filename
# ------------------------------------------------------------


# MODULE CONSTANTS | Regex Patterns
# ------------------------------------------------------------
WHITECARD_FOLDER_PATTERN_OLD       = r'^([A-Z]{2}-\d+)__(.+?)__Whitecard$'  # <-- Legacy pattern: EX-12345__Example__Whitecard
WHITECARD_FOLDER_PATTERN_NEW       = r'^(\d+)__(.+?)__Whitecard$'           # <-- New pattern: 12345__Example__Whitecard
BLOCKOUT_FOLDER_PATTERN_OLD        = r'^([A-Z]{2}-\d+)__(.+?)__Blockout$'   # <-- Legacy pattern: EX-12345__Example__Blockout
BLOCKOUT_FOLDER_PATTERN_NEW        = r'^(\d+)__(.+?)__Blockout$'            # <-- New pattern: 12345__Example__Blockout
MAXMODEL_FOLDER_PATTERN_OLD        = r'^([A-Z]{2}-\d+)__(.+?)__MaxModel$'   # <-- Legacy pattern: EX-12345__Example__MaxModel
MAXMODEL_FOLDER_PATTERN_NEW        = r'^(\d+)__(.+?)__MaxModel$'            # <-- New pattern: 12345__Example__MaxModel
GLB_FILE_PATTERN                   = r'^.+\.glb$'                            # <-- GLB file extension pattern
GLB_ARCHIVE_SUBFOLDER              = "01__Archive"                           # <-- Archive subfolder to skip
GLB_NAMODEL_NAMESPACE              = "__NaModel__"                           # <-- SketchUp export namespace marker
GLB_VALEVISION_NAMESPACE           = "__ValeVision__"                        # <-- CDN rebranded namespace marker
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
Whitecardopedia Cloudflare R2 GLB Model Sync Utility

This utility automates the process of uploading .glb model files from local
Whitecard projects to Cloudflare R2 bucket for fast ValeVision3D model serving.

WHAT IT DOES:
1. Scans local Vale Projects folder for projects with __Whitecard suffix
2. Finds ValeVision__GlbFileSync folders containing .glb model files
3. Performs incremental sync (only uploads new or changed files)
4. Replicates local folder structure in Cloudflare R2 bucket
5. Provides comprehensive upload progress and summary reports

WHY CLOUDFLARE R2:
- GitHub Pages handles images and static files
- Cloudflare R2 provides fast global CDN for large .glb model files
- ValeVision3D loads models directly from R2 bucket

This utility eliminates manual file uploads and ensures ValeVision3D
always has access to the latest 3D models for project visualization.
"""

HELP_EPILOG = """
Default Behavior:
  
  The script ALWAYS runs in safe mode:
  1. Scans local projects for __Whitecard suffix folders
  2. Discovers .glb files in ValeVision__GlbFileSync subfolders
  3. Performs dry-run to preview what will be uploaded
  4. Shows file sizes and upload actions (new/update/skip)
  5. Prompts for confirmation (yes/no)
  6. Only proceeds if you confirm with 'yes' or 'y'

Examples:
  
  Upload all new/changed models with confirmation:
    python AutomationUtil__BuildCloudflareBucket__WhitecardopediaProjects__Main__.py
  
  Preview only without making changes:
    python AutomationUtil__BuildCloudflareBucket__WhitecardopediaProjects__Main__.py --dry-run-only
  
  Upload specific project with confirmation:
    python AutomationUtil__BuildCloudflareBucket__WhitecardopediaProjects__Main__.py --project VE-61058__Staley__Whitecard
  
  Preview specific project only:
    python AutomationUtil__BuildCloudflareBucket__WhitecardopediaProjects__Main__.py --dry-run-only --project VE-61058__Staley__Whitecard

Folder Structure Mapping:
  
  Local Path:
    C:\\01__ValeProjects\\ValeProjects__2025\\VE-61058__Staley__Whitecard\\
    10__ContentDelivered__Local\\ValeVision__GlbFileSync\\Staley__ValeVisionModel__1.2.0__.glb
  
  R2 Bucket Path:
    VaApps/Projects/2025/VE-61058__Staley/Staley__ValeVisionModel__1.2.0__.glb
  
  The __Whitecard suffix is stripped from destination folder names.

Incremental Sync Logic:
  
  The script only uploads files when necessary:
  - [NEW] File doesn't exist in R2 bucket (will upload)
  - [UPDATE] File exists but size differs (will upload)
  - [SKIP] File exists with same size (skip upload)
  
  This saves time and bandwidth by avoiding redundant uploads.

Environment Configuration:
  
  Cloudflare R2 credentials are loaded from:
    Tools__DevUtils/API__Cloudflare/Token__CloudflareAPI.env
  
  Required variables:
    R2_ACCESS_KEY_ID       - Cloudflare R2 access key
    R2_SECRET_ACCESS_KEY   - Cloudflare R2 secret key
    R2_BUCKET_NAME         - R2 bucket name
    R2_ENDPOINT            - R2 API endpoint URL

Output Indicators:
  
  [+] Green  - File uploaded successfully
  [=] Blue   - File skipped (already up to date)
  [!] Yellow - Warning (no .glb files found)
  [X] Red    - Error occurred during processing

For more information, visit:
  https://github.com/adam-noble-01/ValeCodebase/WebApps/Whitecardopedia
"""
# ------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Environment and Credentials Loading
# -----------------------------------------------------------------------------

# FUNCTION | Load Environment Variables from .env File
# ------------------------------------------------------------
def load_environment_variables() -> Tuple[bool, Optional[Dict[str, str]]]:
    """Load Cloudflare R2 credentials from environment file"""
    script_dir = Path(__file__).parent                                # <-- Get script directory
    env_path = script_dir / ENV_FILE_PATH                             # <-- Construct env file path
    
    if not env_path.exists():
        print(f"{COLOR_RED}Error: Environment file not found: {env_path}{COLOR_RESET}")  # <-- Log error
        return False, None                                            # <-- Return failure
    
    load_dotenv(env_path)                                             # <-- Load environment variables
    
    # EXTRACT REQUIRED CREDENTIALS
    credentials = {
        'access_key_id': os.getenv('R2_ACCESS_KEY_ID'),              # <-- Get access key
        'secret_access_key': os.getenv('R2_SECRET_ACCESS_KEY'),      # <-- Get secret key
        'bucket_name': os.getenv('R2_BUCKET_NAME'),                  # <-- Get bucket name
        'endpoint': os.getenv('R2_ENDPOINT')                         # <-- Get endpoint URL
    }
    
    # VALIDATE ALL CREDENTIALS ARE PRESENT
    missing = [key for key, value in credentials.items() if not value]  # <-- Check for missing values
    
    if missing:
        print(f"{COLOR_RED}Error: Missing environment variables: {', '.join(missing)}{COLOR_RESET}")  # <-- Log error
        return False, None                                            # <-- Return failure
    
    return True, credentials                                          # <-- Return success and credentials
# ---------------------------------------------------------------

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
    
    return sorted(year_folders, key=lambda x: x[0])                       # <-- Sort by year (oldest first, e.g. 2025 then 2026)
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Cloudflare R2 Connection and Operations
# -----------------------------------------------------------------------------

# FUNCTION | Create Cloudflare R2 Client Connection
# ------------------------------------------------------------
def create_r2_client(credentials: Dict[str, str]) -> Optional[boto3.client]:
    """Create boto3 S3-compatible client for Cloudflare R2"""
    try:
        s3_client = boto3.client(
            's3',
            endpoint_url=credentials['endpoint'],                     # <-- R2 endpoint URL
            aws_access_key_id=credentials['access_key_id'],           # <-- Access key
            aws_secret_access_key=credentials['secret_access_key'],   # <-- Secret key
            region_name='auto'                                        # <-- Auto region for R2
        )
        return s3_client                                              # <-- Return client instance
    except Exception as error:
        print(f"{COLOR_RED}Error creating R2 client: {error}{COLOR_RESET}")  # <-- Log error
        return None                                                   # <-- Return None on failure
# ---------------------------------------------------------------


# FUNCTION | Check if File Exists in R2 Bucket
# ------------------------------------------------------------
def check_file_exists_in_r2(s3_client: boto3.client, bucket_name: str, key: str) -> Tuple[bool, Optional[int]]:
    """Check if file exists in R2 and return size if it does"""
    try:
        response = s3_client.head_object(Bucket=bucket_name, Key=key)  # <-- HEAD request to check file
        file_size = response['ContentLength']                         # <-- Get file size from response
        return True, file_size                                        # <-- Return exists and size
    except ClientError as error:
        if error.response['Error']['Code'] == '404':
            return False, None                                        # <-- File doesn't exist
        else:
            print(f"{COLOR_RED}Error checking file {key}: {error}{COLOR_RESET}")  # <-- Log error
            return False, None                                        # <-- Return not exists on error
# ---------------------------------------------------------------


# FUNCTION | Upload File to R2 Bucket
# ------------------------------------------------------------
def upload_file_to_r2(s3_client: boto3.client, bucket_name: str, local_path: Path, key: str) -> bool:
    """Upload file to Cloudflare R2 bucket"""
    try:
        s3_client.upload_file(
            str(local_path),                                          # <-- Local file path
            bucket_name,                                              # <-- Bucket name
            key,                                                      # <-- Object key (path in bucket)
            ExtraArgs={'ContentType': 'model/gltf-binary'}            # <-- Set content type for .glb
        )
        return True                                                   # <-- Return success
    except FileNotFoundError:
        print(f"{COLOR_RED}Error: Local file not found: {local_path}{COLOR_RESET}")  # <-- Log error
        return False                                                  # <-- Return failure
    except ClientError as error:
        print(f"{COLOR_RED}Error uploading {key}: {error}{COLOR_RESET}")  # <-- Log error
        return False                                                  # <-- Return failure
    except Exception as error:
        print(f"{COLOR_RED}Unexpected error uploading {key}: {error}{COLOR_RESET}")  # <-- Log error
        return False                                                  # <-- Return failure
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Project Discovery Functions
# -----------------------------------------------------------------------------

# FUNCTION | Extract Project Metadata from Folder Name
# ------------------------------------------------------------
def extract_project_metadata(folder_name: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """Extract project code and name from Whitecard, Blockout, or MaxModel folder name"""
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
            group1 = match.group(1)                                  # <-- Extract first group (code)
            project_name = match.group(2)                            # <-- Extract project name

            if '-' in group1:
                full_code = group1                                   # <-- Legacy format: full code with prefix
                project_code = full_code.split('-')[1]               # <-- Extract numeric code only
            else:
                full_code = group1                                   # <-- New format: numeric code only
                project_code = group1                                # <-- Same as full code

            return full_code, project_code, project_name             # <-- Return extracted metadata

    return None, None, None                                          # <-- Return None if no pattern matches
# ---------------------------------------------------------------


# FUNCTION | Generate Destination Folder Name
# ------------------------------------------------------------
def generate_destination_folder_name(folder_name: str) -> Optional[str]:
    """Generate R2 folder name by stripping __Whitecard, __Blockout, or __MaxModel suffix"""
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


# HELPER FUNCTION | Get Latest File Modification Time from GLB Sync Folder
# ---------------------------------------------------------------
def get_latest_glb_mtime(glb_sync_path: Path) -> float:
    """Return the most recent modification time of any .glb file in the folder"""
    latest_mtime = 0.0                                                # <-- Default to epoch start
    
    if not glb_sync_path.exists():
        return latest_mtime                                           # <-- Return 0 if path missing
    
    for item in glb_sync_path.iterdir():
        if item.is_file() and item.suffix.lower() == '.glb':
            mtime = item.stat().st_mtime                             # <-- Get file modification time
            if mtime > latest_mtime:
                latest_mtime = mtime                                 # <-- Track the newest file
    
    return latest_mtime                                              # <-- Return newest mtime found
# ---------------------------------------------------------------


# FUNCTION | Discover All Whitecard and Blockout Projects in Source Path
# ------------------------------------------------------------
def discover_whitecard_projects(source_base: Path) -> List[Dict]:
    """Discover all Whitecard and Blockout projects with GLB sync folders, sorted oldest-first"""
    projects = []                                                     # <-- Initialize projects list
    
    if not source_base.exists() or not source_base.is_dir():
        return projects                                               # <-- Return empty if path invalid
    
    for item in source_base.iterdir():
        if not item.is_dir() or item.name.startswith('.'):
            continue                                                  # <-- Skip non-directories and hidden
        
        full_code, project_code, project_name = extract_project_metadata(item.name)  # <-- Extract metadata
        
        if full_code and project_code and project_name:               # <-- Check if valid project
            dest_folder_name = generate_destination_folder_name(item.name)  # <-- Generate destination name
            
            # CHECK IF GLB SYNC FOLDER EXISTS
            glb_sync_path = item / CONTENT_DELIVERED_SUBFOLDER / GLB_SYNC_SUBFOLDER  # <-- Construct GLB sync path
            
            if glb_sync_path.exists() and glb_sync_path.is_dir():     # <-- Check if path exists
                latest_mtime = get_latest_glb_mtime(glb_sync_path)   # <-- Get newest file date
                projects.append({
                    'source_path': item,
                    'source_folder_name': item.name,
                    'dest_folder_name': dest_folder_name,
                    'full_code': full_code,
                    'project_code': project_code,
                    'project_name': project_name,
                    'glb_sync_path': glb_sync_path,
                    'latest_glb_mtime': latest_mtime                  # <-- Store for sort key
                })
    
    projects.sort(key=lambda p: p['latest_glb_mtime'])               # <-- Sort oldest first, newest last
    return projects                                                   # <-- Return sorted projects list
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | GLB File Discovery Functions
# -----------------------------------------------------------------------------

# FUNCTION | Discover GLB Files in Sync Folder (Root Level Only)
# ------------------------------------------------------------
def discover_glb_files(glb_sync_path: Path) -> List[str]:
    """Discover all .glb files at root level of sync folder, skipping archive subdirectories"""
    glb_files = []                                                    # <-- Initialize GLB files list
    
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


# HELPER FUNCTION | Generate Rebranded Destination Filename
# ---------------------------------------------------------------
def generate_destination_filename(filename: str) -> str:
    """Rename __NaModel__ to __ValeVision__ in filename for CDN branding"""
    if GLB_NAMODEL_NAMESPACE in filename:
        return filename.replace(GLB_NAMODEL_NAMESPACE, GLB_VALEVISION_NAMESPACE)  # <-- Rebrand namespace
    return filename                                                   # <-- Return unchanged if no NaModel marker
# ---------------------------------------------------------------


# HELPER FUNCTION | Format File Size for Display
# ---------------------------------------------------------------
def format_file_size(size_bytes: int) -> str:
    """Format file size in human-readable format"""
    if size_bytes < 1024:
        return f"{size_bytes} B"                                      # <-- Bytes
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.2f} KB"                          # <-- Kilobytes
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.2f} MB"                 # <-- Megabytes
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"          # <-- Gigabytes
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Upload and Sync Functions
# -----------------------------------------------------------------------------

# FUNCTION | Determine Upload Action for File
# ------------------------------------------------------------
def determine_upload_action(s3_client: boto3.client, bucket_name: str, local_path: Path, r2_key: str) -> Tuple[str, Optional[str]]:
    """Determine if file needs upload (new/update/skip)"""
    local_size = local_path.stat().st_size                            # <-- Get local file size
    exists, remote_size = check_file_exists_in_r2(s3_client, bucket_name, r2_key)  # <-- Check remote file
    
    if not exists:
        return 'new', f"NEW ({format_file_size(local_size)})"         # <-- File doesn't exist
    elif remote_size != local_size:
        return 'update', f"UPDATE ({format_file_size(local_size)} vs {format_file_size(remote_size)})"  # <-- Size differs
    else:
        return 'skip', f"SKIP ({format_file_size(local_size)})"       # <-- File unchanged
# ---------------------------------------------------------------


# FUNCTION | Process Single GLB File Upload with Year
# ------------------------------------------------------------
def process_glb_file(s3_client: boto3.client, bucket_name: str, project_info: Dict, filename: str, dry_run: bool, year: str) -> Dict:
    """Process single GLB file upload to R2 with NaModel -> ValeVision rename"""
    dest_filename = generate_destination_filename(filename)            # <-- Rebrand NaModel -> ValeVision
    result = {
        'filename': filename,
        'dest_filename': dest_filename,
        'success': False,
        'action': None,
        'action_detail': None,
        'size': 0,
        'error': None
    }
    
    local_path = project_info['glb_sync_path'] / filename             # <-- Construct local file path
    r2_key = f"{R2_BASE_PREFIX}/{year}/{project_info['dest_folder_name']}/{dest_filename}"  # <-- R2 key with rebranded name
    
    if not local_path.exists():
        result['error'] = "Local file not found"                      # <-- Set error message
        return result                                                 # <-- Return error result
    
    result['size'] = local_path.stat().st_size                        # <-- Get file size
    
    # DETERMINE UPLOAD ACTION
    action, action_detail = determine_upload_action(s3_client, bucket_name, local_path, r2_key)  # <-- Determine action
    result['action'] = action                                         # <-- Store action
    result['action_detail'] = action_detail                           # <-- Store action detail
    
    if action == 'skip':
        result['success'] = True                                      # <-- Skip is successful
        return result                                                 # <-- Return skip result (silent)
    
    if dry_run:
        result['success'] = True                                      # <-- Dry-run is successful
        return result                                                 # <-- Return dry-run result
    
    # PERFORM ACTUAL UPLOAD
    print(f"      {COLOR_YELLOW}[>>] Uploading{COLOR_RESET} {dest_filename} ({format_file_size(result['size'])})...", end='', flush=True)  # <-- Log upload start
    upload_success = upload_file_to_r2(s3_client, bucket_name, local_path, r2_key)  # <-- Upload file
    result['success'] = upload_success                                # <-- Store upload result
    
    if upload_success:
        print(f" {COLOR_GREEN}OK{COLOR_RESET}")                      # <-- Log upload success on same line
    else:
        print(f" {COLOR_RED}FAILED{COLOR_RESET}")                    # <-- Log upload failure on same line
        result['error'] = "Upload failed"                             # <-- Set error message
    
    return result                                                     # <-- Return upload result
# ---------------------------------------------------------------


# FUNCTION | Process Single Project with Year
# ------------------------------------------------------------
def process_project(s3_client: boto3.client, bucket_name: str, project_info: Dict, dry_run: bool, year: str) -> Dict:
    """Process all GLB files for a single project"""
    result = {
        'project_name': project_info['source_folder_name'],
        'dest_name': project_info['dest_folder_name'],
        'success': False,
        'files_found': 0,
        'files_new': 0,
        'files_updated': 0,
        'files_skipped': 0,
        'files_errors': 0,
        'total_size': 0,
        'file_results': [],
        'error': None
    }
    
    # DISCOVER GLB FILES (ROOT LEVEL ONLY, SKIPS 01__ARCHIVE)
    glb_files = discover_glb_files(project_info['glb_sync_path'])    # <-- Discover GLB files
    result['files_found'] = len(glb_files)                            # <-- Store files count
    
    if not glb_files:
        result['error'] = "No .glb files found in sync folder"        # <-- Set warning message
        result['success'] = True                                      # <-- Not an error condition
        return result                                                 # <-- Return warning result
    
    if not dry_run:
        print(f"    {COLOR_CYAN}[PROJECT]{COLOR_RESET} {project_info['dest_folder_name']} ({len(glb_files)} file{'s' if len(glb_files) != 1 else ''})")  # <-- Log project start
    
    # PROCESS EACH GLB FILE
    for filename in glb_files:
        file_result = process_glb_file(s3_client, bucket_name, project_info, filename, dry_run, year)  # <-- Process file with year
        result['file_results'].append(file_result)                    # <-- Add file result
        result['total_size'] += file_result['size']                   # <-- Add to total size
        
        if file_result['success']:
            if file_result['action'] == 'new':
                result['files_new'] += 1                              # <-- Increment new count
            elif file_result['action'] == 'update':
                result['files_updated'] += 1                          # <-- Increment updated count
            elif file_result['action'] == 'skip':
                result['files_skipped'] += 1                          # <-- Increment skipped count
        else:
            result['files_errors'] += 1                               # <-- Increment error count
    
    result['success'] = True                                          # <-- Mark as successful
    return result                                                     # <-- Return project result
# ---------------------------------------------------------------


# FUNCTION | Process All Projects for a Year
# ------------------------------------------------------------
def process_all_projects(s3_client: boto3.client, bucket_name: str, projects: List[Dict], target_project: Optional[str], dry_run: bool, year: str) -> List[Dict]:
    """Process all discovered projects for a specific year"""
    results = []                                                      # <-- Initialize results list
    
    for project_info in projects:
        if target_project and project_info['source_folder_name'] != target_project:
            continue                                                  # <-- Skip if not target project
        
        result = process_project(s3_client, bucket_name, project_info, dry_run, year)  # <-- Process project with year
        results.append(result)                                        # <-- Add result to list
    
    return results                                                    # <-- Return all results
# ---------------------------------------------------------------


# HELPER FUNCTION | Upload a Single File Using a Pre-Determined Action
# ---------------------------------------------------------------
def upload_planned_file(s3_client: boto3.client, bucket_name: str, project_info: Dict, dry_file: Dict, year: str) -> Dict:
    """Upload one file whose action was already classified during dry-run.
    
    Reuses the cached action and dest filename from the dry-run pass, so no
    second R2 HEAD request is issued before the PUT.
    """
    filename      = dry_file['filename']                               # <-- Source filename on disk
    dest_filename = dry_file['dest_filename']                          # <-- Rebranded destination filename
    
    file_result = {
        'filename'      : filename,
        'dest_filename' : dest_filename,
        'success'       : False,
        'action'        : dry_file['action'],
        'action_detail' : dry_file['action_detail'],
        'size'          : dry_file['size'],
        'error'         : None
    }
    
    local_path = project_info['glb_sync_path'] / filename              # <-- Resolve local file path
    r2_key     = f"{R2_BASE_PREFIX}/{year}/{project_info['dest_folder_name']}/{dest_filename}"  # <-- R2 destination key
    
    print(f"      {COLOR_YELLOW}[>>] Uploading{COLOR_RESET} {dest_filename} ({format_file_size(file_result['size'])})...", end='', flush=True)  # <-- Log upload start
    upload_success      = upload_file_to_r2(s3_client, bucket_name, local_path, r2_key)  # <-- Perform PUT
    file_result['success'] = upload_success                            # <-- Record outcome
    
    if upload_success:
        print(f" {COLOR_GREEN}OK{COLOR_RESET}")                       # <-- Success indicator
    else:
        print(f" {COLOR_RED}FAILED{COLOR_RESET}")                     # <-- Failure indicator
        file_result['error'] = "Upload failed"                         # <-- Record error
    
    return file_result                                                 # <-- Return file outcome
# ---------------------------------------------------------------


# FUNCTION | Execute Upload Plan Built from Dry-Run Results
# ------------------------------------------------------------
def execute_upload_plan(s3_client: boto3.client, bucket_name: str, plan: List[Dict]) -> List[Dict]:
    """Upload only the files marked NEW or UPDATE during the dry-run pass.
    
    Skips projects (and entire years) that have no pending work, so the
    console no longer prints `[PROJECT]` banners for fully-synced projects
    and no further R2 HEAD requests are issued for already-skipped files.
    Each plan entry is a dict with keys: year, project_info, dry_run_result.
    """
    final_results = []                                                 # <-- Aggregated upload outcomes
    current_year  = None                                               # <-- Tracks year header printing
    
    for plan_entry in plan:
        year           = plan_entry['year']                            # <-- Plan entry year
        project_info   = plan_entry['project_info']                    # <-- Resolved project metadata
        dry_run_result = plan_entry['dry_run_result']                  # <-- Cached per-file actions
        
        # PRINT YEAR HEADER ONCE PER YEAR (only for years with pending work)
        if year != current_year:
            print(f"{COLOR_CYAN}{'='*80}{COLOR_RESET}")
            print(f"{COLOR_CYAN}Uploading GLB Files for Year: {year}{COLOR_RESET}")
            print(f"{COLOR_CYAN}{'='*80}{COLOR_RESET}\n")
            current_year = year                                        # <-- Remember last printed year
        
        # FILTER FILES TO ONLY THOSE NEEDING UPLOAD
        files_to_upload = [
            f for f in dry_run_result['file_results']
            if f['action'] in ('new', 'update')
        ]
        
        file_count = len(files_to_upload)                              # <-- Pending file count for this project
        plural     = 's' if file_count != 1 else ''                    # <-- Pluralise label
        print(f"    {COLOR_CYAN}[PROJECT]{COLOR_RESET} {project_info['dest_folder_name']} ({file_count} file{plural} pending)")  # <-- Truthful project header
        
        # BUILD PROJECT RESULT FOR FINAL REPORTING
        project_result = {
            'project_name'  : project_info['source_folder_name'],
            'dest_name'     : project_info['dest_folder_name'],
            'success'       : True,
            'files_found'   : dry_run_result['files_found'],
            'files_new'     : 0,
            'files_updated' : 0,
            'files_skipped' : dry_run_result['files_skipped'],
            'files_errors'  : 0,
            'total_size'    : 0,
            'file_results'  : [],
            'error'         : None
        }
        
        # UPLOAD EACH PENDING FILE
        for dry_file in files_to_upload:
            file_result = upload_planned_file(s3_client, bucket_name, project_info, dry_file, year)  # <-- Upload single file
            project_result['file_results'].append(file_result)         # <-- Record file outcome
            project_result['total_size'] += file_result['size']        # <-- Accumulate size
            
            if file_result['success']:
                if dry_file['action'] == 'new':
                    project_result['files_new'] += 1                   # <-- Increment new count
                else:
                    project_result['files_updated'] += 1               # <-- Increment update count
            else:
                project_result['files_errors'] += 1                    # <-- Increment error count
        
        final_results.append(project_result)                           # <-- Append project result
    
    return final_results                                               # <-- Return all upload outcomes
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Console Output and Reporting
# -----------------------------------------------------------------------------

# FUNCTION | Print Project Discovery Summary
# ------------------------------------------------------------
def print_discovery_summary(source_base: Path, projects: List[Dict]):
    """Print summary of discovered projects"""
    print(f"{COLOR_CYAN}{'='*80}{COLOR_RESET}")                      # <-- Print header divider
    print(f"{COLOR_CYAN}WHITECARD PROJECT DISCOVERY{COLOR_RESET}")   # <-- Print header title
    print(f"{COLOR_CYAN}{'='*80}{COLOR_RESET}\n")                    # <-- Print header divider
    
    print(f"{COLOR_BLUE}Source Path: {source_base}{COLOR_RESET}")    # <-- Print source path
    print(f"{COLOR_BLUE}[DISCOVERY] Found {len(projects)} project(s) with GLB sync folders{COLOR_RESET}\n")  # <-- Print count
# ---------------------------------------------------------------


# FUNCTION | Print Processing Results Summary
# ------------------------------------------------------------
def print_results(results: List[Dict], dry_run: bool):
    """Print comprehensive processing results"""
    print(f"\n{COLOR_CYAN}{'='*80}{COLOR_RESET}")                    # <-- Print header divider
    print(f"{COLOR_CYAN}GLB FILE SYNC RESULTS{COLOR_RESET}")         # <-- Print header title
    print(f"{COLOR_CYAN}{'='*80}{COLOR_RESET}\n")                    # <-- Print header divider
    
    total_projects = len(results)                                     # <-- Count total projects
    total_files = sum(r['files_found'] for r in results)              # <-- Count total files
    total_new = sum(r['files_new'] for r in results)                  # <-- Count new files
    total_updated = sum(r['files_updated'] for r in results)          # <-- Count updated files
    total_skipped = sum(r['files_skipped'] for r in results)          # <-- Count skipped files
    total_errors = sum(r['files_errors'] for r in results)            # <-- Count errors
    total_size = sum(r['total_size'] for r in results)                # <-- Sum total size
    
    for result in results:
        project_name = result['project_name']                         # <-- Get project name
        
        if result['error'] and result['files_found'] == 0:
            print(f"{COLOR_YELLOW}[!] {project_name}{COLOR_RESET}")  # <-- Print warning indicator
            print(f"    Warning: {result['error']}\n")                # <-- Print warning message
            continue
        
        print(f"{COLOR_GREEN}[PROJECT] {project_name}{COLOR_RESET}")  # <-- Print project indicator
        # Note: Destination will include year from the calling context
        print(f"    Files found: {result['files_found']}")            # <-- Print files count
        print(f"    Total size: {format_file_size(result['total_size'])}")  # <-- Print total size
        
        # PRINT FILE DETAILS
        for file_result in result['file_results']:
            filename      = file_result['filename']                   # <-- Get source filename
            dest_filename = file_result.get('dest_filename', filename)  # <-- Get destination filename
            action        = file_result['action']                     # <-- Get action
            action_detail = file_result['action_detail']              # <-- Get action detail
            
            # SHOW RENAME IF DIFFERENT
            rename_info = ""
            if dest_filename != filename:
                rename_info = f" -> {dest_filename}"                  # <-- Show rebranded name
            
            if action == 'new':
                print(f"      {COLOR_GREEN}[+] {filename}{rename_info}{COLOR_RESET} - {action_detail}")  # <-- New file
            elif action == 'update':
                print(f"      {COLOR_YELLOW}[^] {filename}{rename_info}{COLOR_RESET} - {action_detail}")  # <-- Updated file
            elif action == 'skip':
                print(f"      {COLOR_BLUE}[=] {filename}{rename_info}{COLOR_RESET} - {action_detail}")  # <-- Skipped file
            
            if file_result['error']:
                print(f"      {COLOR_RED}[X] Error: {file_result['error']}{COLOR_RESET}")  # <-- Error
        
        print()                                                       # <-- Blank line after project
    
    print(f"{COLOR_CYAN}{'='*80}{COLOR_RESET}")                      # <-- Print footer divider
    print(f"{COLOR_CYAN}SUMMARY{COLOR_RESET}")                       # <-- Print summary title
    print(f"{COLOR_CYAN}{'='*80}{COLOR_RESET}")                      # <-- Print footer divider
    print(f"Projects processed    : {total_projects}")                # <-- Print total projects
    print(f"Files discovered      : {total_files}")                   # <-- Print total files
    print(f"New uploads           : {total_new}")                     # <-- Print new count
    print(f"Updated files         : {total_updated}")                 # <-- Print updated count
    print(f"Skipped (unchanged)   : {total_skipped}")                 # <-- Print skipped count
    print(f"Errors                : {total_errors}")                  # <-- Print error count
    print(f"Total data size       : {format_file_size(total_size)}")  # <-- Print total size
    
    if dry_run:
        print(f"\n{COLOR_YELLOW}DRY RUN MODE: No files were uploaded{COLOR_RESET}")  # <-- Print dry-run notice
    
    print(f"{COLOR_CYAN}{'='*80}{COLOR_RESET}\n")                    # <-- Print closing divider
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | User Confirmation Functions
# -----------------------------------------------------------------------------

# FUNCTION | Prompt User for Confirmation
# ------------------------------------------------------------
def prompt_for_confirmation() -> bool:
    """Prompt user to confirm upload operation"""
    print(f"\n{COLOR_YELLOW}{'='*80}{COLOR_RESET}")                  # <-- Print confirmation divider
    print(f"{COLOR_YELLOW}CONFIRMATION REQUIRED{COLOR_RESET}")       # <-- Print confirmation header
    print(f"{COLOR_YELLOW}{'='*80}{COLOR_RESET}")                    # <-- Print confirmation divider
    
    try:
        response = input(f"\n{COLOR_CYAN}Proceed with uploading files to Cloudflare R2? (yes/no): {COLOR_RESET}").strip().lower()  # <-- Get user input
        
        if response in ['yes', 'y']:
            print(f"{COLOR_GREEN}[OK] Confirmed - Proceeding with upload...{COLOR_RESET}\n")  # <-- Confirmation message
            return True                                               # <-- Return true to proceed
        else:
            print(f"{COLOR_RED}[CANCEL] No files were uploaded{COLOR_RESET}\n")  # <-- Cancellation message
            return False                                              # <-- Return false to cancel
    except (KeyboardInterrupt, EOFError):
        print(f"\n{COLOR_RED}[CANCEL] Cancelled by user{COLOR_RESET}\n")  # <-- Handle Ctrl+C or EOF
        return False                                                  # <-- Return false to cancel
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Project JSON Sync Functions
# -----------------------------------------------------------------------------

# FUNCTION | Find Whitecardopedia project.json for a Project
# ------------------------------------------------------------
def find_whitecardopedia_project_json(year: str, dest_folder_name: str) -> Optional[Path]:
    """Return Path to project.json if it exists, None if project not yet cloned"""
    script_dir   = Path(__file__).parent                                    # <-- Get script directory
    projects_dir = script_dir / WHITECARDOPEDIA_PROJECTS_BASE               # <-- Resolve projects base path
    project_json = projects_dir / year / dest_folder_name / PROJECT_JSON_FILENAME  # <-- Build full path

    return project_json if project_json.exists() else None                  # <-- Return path or None
# ---------------------------------------------------------------


# FUNCTION | Build All CDN URLs for a Project from GLB Filename List
# ------------------------------------------------------------
def build_all_cdn_urls_for_project(year: str, dest_folder_name: str, glb_filenames: List[str]) -> List[str]:
    """Build sorted CDN URL list for every GLB filename, applying NaModel rebrand"""
    urls = []                                                               # <-- Initialise URL list

    for filename in glb_filenames:
        dest_filename = generate_destination_filename(filename)             # <-- Apply NaModel -> ValeVision rebrand
        url = f"{CDN_BASE_URL}/{year}/{dest_folder_name}/{dest_filename}"   # <-- Construct CDN URL
        urls.append(url)                                                    # <-- Add to list

    urls.sort()                                                             # <-- Sort alphabetically (matches discovery order)
    return urls                                                             # <-- Return sorted URL list
# ---------------------------------------------------------------


# FUNCTION | Write Refreshed Model URLs Into Existing project.json
# ------------------------------------------------------------
def refresh_project_json_model_urls(project_json_path: Path, cdn_urls: List[str]) -> bool:
    """Read existing project.json, replace valeVision_ModelUrls, write back"""
    try:
        with open(project_json_path, 'r', encoding='utf-8') as file:       # <-- Open for reading
            project_data = json.load(file)                                  # <-- Parse existing JSON
    except Exception as error:
        print(f"{COLOR_RED}Error reading {project_json_path}: {error}{COLOR_RESET}")  # <-- Log read error
        return False                                                        # <-- Return failure

    # CLEAN LEGACY MODEL URL FIELDS (remove old v3 format keys if present)
    project_data.pop('valeVision_ModelUrl_BaseMesh', None)                  # <-- Remove legacy base mesh key
    project_data.pop('valeVision_ModelUrl_Linework', None)                  # <-- Remove legacy linework key
    project_data.pop('valeVision_ModelUrl', None)                           # <-- Remove legacy single/array key

    project_data['valeVision_ModelUrls'] = cdn_urls                         # <-- Set refreshed URL array

    try:
        with open(project_json_path, 'w', encoding='utf-8') as file:       # <-- Open for writing
            json.dump(project_data, file, indent=4, ensure_ascii=False)     # <-- Write formatted JSON
            file.write('\n')                                                # <-- Add trailing newline
    except Exception as error:
        print(f"{COLOR_RED}Error writing {project_json_path}: {error}{COLOR_RESET}")  # <-- Log write error
        return False                                                        # <-- Return failure

    return True                                                             # <-- Return success
# ---------------------------------------------------------------


# FUNCTION | Refresh project.json URLs for All Scanned Projects
# ------------------------------------------------------------
def refresh_all_project_json_urls(dry_run_records: List[Dict]) -> tuple:
    """Refresh valeVision_ModelUrls in every Whitecardopedia project.json found.

    Covers all projects discovered during the scan regardless of whether files
    were uploaded or skipped, so the URL index is always complete.
    Returns (refreshed_count, skipped_count).
    """
    refreshed_count = 0                                                     # <-- Count of refreshed project.json files
    skipped_count   = 0                                                     # <-- Count of skipped (not yet cloned)

    print(f"\n{COLOR_CYAN}{'='*80}{COLOR_RESET}")
    print(f"{COLOR_CYAN}POST-STEP | Refreshing project.json valeVision_ModelUrls{COLOR_RESET}")
    print(f"{COLOR_CYAN}{'='*80}{COLOR_RESET}\n")

    for record in dry_run_records:
        year         = record['year']                                       # <-- Year for this project
        project_info = record['project_info']                               # <-- Project metadata
        result       = record['result']                                     # <-- Dry-run file results

        dest_folder_name = project_info['dest_folder_name']                 # <-- R2 / Whitecardopedia folder name

        # BUILD GLB FILENAME LIST FROM DRY-RUN FILE RESULTS (all files, not just uploaded)
        glb_filenames = [
            fr['filename']
            for fr in result.get('file_results', [])
            if fr.get('filename')
        ]

        if not glb_filenames:
            continue                                                        # <-- Skip projects with no GLB files

        # FIND project.json IN WHITECARDOPEDIA
        project_json_path = find_whitecardopedia_project_json(year, dest_folder_name)

        if project_json_path is None:
            print(f"  {COLOR_YELLOW}[SKIP]{COLOR_RESET} {dest_folder_name} - project.json not found (project not yet cloned)")
            skipped_count += 1                                              # <-- Increment skipped count
            continue                                                        # <-- Skip uncloned projects

        # BUILD CDN URLS AND REFRESH
        cdn_urls = build_all_cdn_urls_for_project(year, dest_folder_name, glb_filenames)
        success  = refresh_project_json_model_urls(project_json_path, cdn_urls)

        if success:
            print(f"  {COLOR_GREEN}[OK]{COLOR_RESET}   {dest_folder_name} - {len(cdn_urls)} URL(s) written")
            refreshed_count += 1                                            # <-- Increment refreshed count
        else:
            print(f"  {COLOR_RED}[ERROR]{COLOR_RESET} {dest_folder_name} - failed to write project.json")

    print(f"\n{COLOR_CYAN}{'='*80}{COLOR_RESET}")
    print(f"project.json refreshed : {refreshed_count}")
    print(f"Skipped (not cloned)   : {skipped_count}")
    print(f"{COLOR_CYAN}{'='*80}{COLOR_RESET}\n")

    return refreshed_count, skipped_count                                   # <-- Return counts
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Main Entry Point
# -----------------------------------------------------------------------------

# FUNCTION | Main Script Entry Point
# ------------------------------------------------------------
def main():
    """Main script execution"""
    parser = argparse.ArgumentParser(
        description=HELP_DESCRIPTION,
        epilog=HELP_EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
        prog='AutomationUtil__BuildCloudflareBucket__WhitecardopediaProjects__Main__.py'
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
        help='Process only a specific project folder (e.g., "VE-61058__Staley__Whitecard"). By default, all projects are processed.'
    )
    
    args = parser.parse_args()                                        # <-- Parse command line arguments
    
    print(f"\n{COLOR_CYAN}Whitecardopedia - Cloudflare R2 GLB Model Sync Utility{COLOR_RESET}")  # <-- Print title
    print(f"{COLOR_BLUE}Target: Cloudflare R2 Bucket{COLOR_RESET}\n")  # <-- Print target
    
    # STEP 1: Load environment variables and credentials
    print(f"{COLOR_BLUE}[INIT] Loading Cloudflare R2 credentials...{COLOR_RESET}")  # <-- Log init
    success, credentials = load_environment_variables()               # <-- Load credentials
    
    if not success:
        print(f"{COLOR_RED}Failed to load credentials. Exiting.{COLOR_RESET}\n")  # <-- Log failure
        return                                                        # <-- Exit if credentials failed
    
    bucket_name = credentials['bucket_name']                          # <-- Get bucket name
    print(f"{COLOR_GREEN}[OK] Credentials loaded - Bucket: {bucket_name}{COLOR_RESET}\n")  # <-- Log success
    
    # STEP 2: Create R2 client connection
    print(f"{COLOR_BLUE}[INIT] Connecting to Cloudflare R2...{COLOR_RESET}")  # <-- Log init
    s3_client = create_r2_client(credentials)                         # <-- Create R2 client
    
    if not s3_client:
        print(f"{COLOR_RED}Failed to connect to R2. Exiting.{COLOR_RESET}\n")  # <-- Log failure
        return                                                        # <-- Exit if connection failed
    
    print(f"{COLOR_GREEN}[OK] Connected to Cloudflare R2{COLOR_RESET}\n")  # <-- Log success
    
    # STEP 3: Discover all year folders
    year_folders = discover_vale_year_folders()                       # <-- Discover all year folders
    
    if not year_folders:
        print(f"{COLOR_RED}No ValeProjects year folders found in {LOCAL_PROJECTS_BASE_FOLDER}. Exiting.{COLOR_RESET}\n")
        return                                                        # <-- Exit if no year folders
    
    print(f"{COLOR_BLUE}Scanning {len(year_folders)} year folder(s): {', '.join([y[0] for y in year_folders])}{COLOR_RESET}\n")
    
    all_dry_run_records = []                                          # <-- Per-project records: year, project_info, result
    
    # STEP 4: Dry-run all year folders, capturing per-project plan data
    for year, source_base in year_folders:
        print(f"{COLOR_CYAN}{'='*80}{COLOR_RESET}")
        print(f"{COLOR_CYAN}Processing Year: {year}{COLOR_RESET}")
        print(f"{COLOR_CYAN}{'='*80}{COLOR_RESET}\n")
        print(f"{COLOR_BLUE}Source Path: {source_base}{COLOR_RESET}")
        
        projects = discover_whitecard_projects(source_base)           # <-- Discover projects for this year
        
        if not projects:
            print(f"{COLOR_YELLOW}No projects with GLB sync folders found in {year}. Skipping.{COLOR_RESET}\n")
            continue                                                  # <-- Skip this year
        
        print(f"{COLOR_BLUE}[DISCOVERY] Found {len(projects)} project(s) with GLB sync folders in {year} (sorted oldest to newest){COLOR_RESET}\n")
        
        # RUN DRY-RUN FOR THIS YEAR
        print(f"{COLOR_YELLOW}Mode: DRY RUN (preview mode){COLOR_RESET}\n")
        
        results = process_all_projects(s3_client, bucket_name, projects, args.project, dry_run=True, year=year)
        
        # MAP RESULTS BACK TO PROJECT METADATA FOR THE UPLOAD PLAN
        project_lookup = {p['source_folder_name']: p for p in projects}  # <-- Lookup by source folder name
        for result in results:
            all_dry_run_records.append({
                'year'         : year,
                'project_info' : project_lookup[result['project_name']],
                'result'       : result
            })
        
        print_results(results, dry_run=True)                          # <-- Print preview results for this year
    
    # STEP 5: Build upload plan (only projects with new/update files)
    upload_plan = [
        {
            'year'           : record['year'],
            'project_info'   : record['project_info'],
            'dry_run_result' : record['result']
        }
        for record in all_dry_run_records
        if record['result']['files_new'] > 0 or record['result']['files_updated'] > 0
    ]
    
    # If dry-run-only flag is set, exit after preview (no writes of any kind)
    if args.dry_run_only:
        return                                                        # <-- Exit after dry-run

    # STEP 6: Ask for confirmation before proceeding
    # NOTE: Confirmation covers both R2 uploads AND project.json refresh.
    # If no files need uploading, skip straight to STEP 8 (JSON refresh still runs).
    if upload_plan:
        if not prompt_for_confirmation():
            return                                                    # <-- Exit if user cancels

        # STEP 7: Execute upload plan (skips fully-synced projects and years)
        print(f"{COLOR_GREEN}Mode: UPLOADING FILES TO R2{COLOR_RESET}\n")  # <-- Print upload mode

        final_results = execute_upload_plan(s3_client, bucket_name, upload_plan)  # <-- Run uploads from plan
        print_results(final_results, dry_run=False)                   # <-- Print final results

        successful_count = sum(r['files_new'] + r['files_updated'] for r in final_results)  # <-- Count successful
        print(f"{COLOR_GREEN}Upload complete! {successful_count} file(s) uploaded to Cloudflare R2 across all years.{COLOR_RESET}\n")  # <-- Print completion
    else:
        print(f"{COLOR_GREEN}All R2 files are up to date. No uploads needed.{COLOR_RESET}\n")  # <-- No R2 changes

    # STEP 8: Refresh project.json valeVision_ModelUrls for all scanned projects
    # Runs regardless of whether R2 uploads occurred, so the URL index is always
    # kept in sync with whatever GLBs are in the local sync folder / R2 bucket.
    refresh_all_project_json_urls(all_dry_run_records)
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------


if __name__ == '__main__':
    main()

