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
# - Scans local Whitecard project folders for .glb model files
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
LOCAL_PROJECTS_BASE_PATH           = r"C:\01__ValeProjects\ValeProjects__2025"   # <-- Source path for local Vale projects
CONTENT_DELIVERED_SUBFOLDER        = "10__ContentDelivered__Local"               # <-- Content delivery subfolder name
GLB_SYNC_SUBFOLDER                 = "ValeVision__GlbFileSync"                   # <-- GLB files subfolder name
R2_BASE_PREFIX                     = "VaApps/Projects/2025"                      # <-- Base prefix in R2 bucket
ENV_FILE_PATH                      = "API__Cloudflare/Token__CloudflareAPI.env"  # <-- Environment file path (relative)
# ------------------------------------------------------------


# MODULE CONSTANTS | Regex Patterns
# ------------------------------------------------------------
WHITECARD_FOLDER_PATTERN_OLD       = r'^([A-Z]{2}-\d+)__(.+?)__Whitecard$'  # <-- Legacy pattern: EX-12345__Example__Whitecard
WHITECARD_FOLDER_PATTERN_NEW       = r'^(\d+)__(.+?)__Whitecard$'  # <-- New pattern: 12345__Example__Whitecard
GLB_FILE_PATTERN                   = r'^.+\.glb$'                            # <-- GLB file extension pattern
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
    """Extract project code and name from Whitecard folder name"""
    # TRY LEGACY PATTERN FIRST (e.g., EX-12345__Example__Whitecard)
    match_old = re.match(WHITECARD_FOLDER_PATTERN_OLD, folder_name)  # <-- Match legacy folder pattern
    
    if match_old:
        full_code = match_old.group(1)                                 # <-- Extract full code (e.g., "VE-61058")
        project_name = match_old.group(2)                              # <-- Extract project name (e.g., "Staley")
        project_code = full_code.split('-')[1] if '-' in full_code else full_code  # <-- Extract numeric code
        return full_code, project_code, project_name                   # <-- Return extracted metadata
    
    # TRY NEW PATTERN (e.g., 12345__Example__Whitecard)
    match_new = re.match(WHITECARD_FOLDER_PATTERN_NEW, folder_name)  # <-- Match new folder pattern
    
    if match_new:
        project_code = match_new.group(1)                              # <-- Extract numeric code (e.g., "12345")
        project_name = match_new.group(2)                              # <-- Extract project name (e.g., "Example")
        full_code = project_code                                       # <-- Use numeric code as full code for new format
        return full_code, project_code, project_name                    # <-- Return extracted metadata
    
    return None, None, None                                           # <-- Return None if pattern doesn't match
# ---------------------------------------------------------------


# FUNCTION | Generate Destination Folder Name
# ------------------------------------------------------------
def generate_destination_folder_name(folder_name: str) -> Optional[str]:
    """Generate R2 folder name by stripping __Whitecard suffix"""
    # TRY LEGACY PATTERN FIRST (e.g., EX-12345__Example__Whitecard)
    match_old = re.match(WHITECARD_FOLDER_PATTERN_OLD, folder_name)  # <-- Match legacy folder pattern
    
    if match_old:
        full_code = match_old.group(1)                                # <-- Extract full code
        project_name = match_old.group(2)                             # <-- Extract project name
        return f"{full_code}__{project_name}"                         # <-- Return name without __Whitecard suffix
    
    # TRY NEW PATTERN (e.g., 12345__Example__Whitecard)
    match_new = re.match(WHITECARD_FOLDER_PATTERN_NEW, folder_name)  # <-- Match new folder pattern
    
    if match_new:
        project_code = match_new.group(1)                             # <-- Extract numeric code
        project_name = match_new.group(2)                             # <-- Extract project name
        return f"{project_code}__{project_name}"                      # <-- Return name without suffix
    
    return None                                                       # <-- Return None if pattern doesn't match
# ---------------------------------------------------------------


# FUNCTION | Discover All Whitecard Projects in Source Path
# ------------------------------------------------------------
def discover_whitecard_projects(source_base: Path) -> List[Dict]:
    """Discover all Whitecard projects with GLB sync folders"""
    projects = []                                                     # <-- Initialize projects list
    
    if not source_base.exists() or not source_base.is_dir():
        return projects                                               # <-- Return empty if path invalid
    
    for item in sorted(source_base.iterdir()):
        if not item.is_dir() or item.name.startswith('.'):
            continue                                                  # <-- Skip non-directories and hidden
        
        full_code, project_code, project_name = extract_project_metadata(item.name)  # <-- Extract metadata
        
        if full_code and project_code and project_name:               # <-- Check if valid Whitecard project
            dest_folder_name = generate_destination_folder_name(item.name)  # <-- Generate destination name
            
            # CHECK IF GLB SYNC FOLDER EXISTS
            glb_sync_path = item / CONTENT_DELIVERED_SUBFOLDER / GLB_SYNC_SUBFOLDER  # <-- Construct GLB sync path
            
            if glb_sync_path.exists() and glb_sync_path.is_dir():     # <-- Check if path exists
                projects.append({
                    'source_path': item,
                    'source_folder_name': item.name,
                    'dest_folder_name': dest_folder_name,
                    'full_code': full_code,
                    'project_code': project_code,
                    'project_name': project_name,
                    'glb_sync_path': glb_sync_path
                })
    
    return projects                                                   # <-- Return discovered projects list
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | GLB File Discovery Functions
# -----------------------------------------------------------------------------

# FUNCTION | Discover GLB Files in Sync Folder
# ------------------------------------------------------------
def discover_glb_files(glb_sync_path: Path) -> List[str]:
    """Discover all .glb files in sync folder"""
    glb_files = []                                                    # <-- Initialize GLB files list
    
    if not glb_sync_path.exists() or not glb_sync_path.is_dir():
        return glb_files                                              # <-- Return empty if path invalid
    
    for item in glb_sync_path.iterdir():
        if item.is_file():                                            # <-- Check if item is file
            filename = item.name                                      # <-- Get filename
            if re.match(GLB_FILE_PATTERN, filename, re.IGNORECASE):   # <-- Check pattern match
                glb_files.append(filename)                            # <-- Add to GLB files list
    
    glb_files.sort()                                                  # <-- Sort alphabetically
    return glb_files                                                  # <-- Return sorted GLB files list
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


# FUNCTION | Process Single GLB File Upload
# ------------------------------------------------------------
def process_glb_file(s3_client: boto3.client, bucket_name: str, project_info: Dict, filename: str, dry_run: bool) -> Dict:
    """Process single GLB file upload to R2"""
    result = {
        'filename': filename,
        'success': False,
        'action': None,
        'action_detail': None,
        'size': 0,
        'error': None
    }
    
    local_path = project_info['glb_sync_path'] / filename             # <-- Construct local file path
    r2_key = f"{R2_BASE_PREFIX}/{project_info['dest_folder_name']}/{filename}"  # <-- Construct R2 key
    
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
        return result                                                 # <-- Return skip result
    
    if dry_run:
        result['success'] = True                                      # <-- Dry-run is successful
        return result                                                 # <-- Return dry-run result
    
    # PERFORM ACTUAL UPLOAD
    upload_success = upload_file_to_r2(s3_client, bucket_name, local_path, r2_key)  # <-- Upload file
    result['success'] = upload_success                                # <-- Store upload result
    
    if not upload_success:
        result['error'] = "Upload failed"                             # <-- Set error message
    
    return result                                                     # <-- Return upload result
# ---------------------------------------------------------------


# FUNCTION | Process Single Project
# ------------------------------------------------------------
def process_project(s3_client: boto3.client, bucket_name: str, project_info: Dict, dry_run: bool) -> Dict:
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
    
    # DISCOVER GLB FILES
    glb_files = discover_glb_files(project_info['glb_sync_path'])    # <-- Discover GLB files
    result['files_found'] = len(glb_files)                            # <-- Store files count
    
    if not glb_files:
        result['error'] = "No .glb files found in sync folder"        # <-- Set warning message
        result['success'] = True                                      # <-- Not an error condition
        return result                                                 # <-- Return warning result
    
    # PROCESS EACH GLB FILE
    for filename in glb_files:
        file_result = process_glb_file(s3_client, bucket_name, project_info, filename, dry_run)  # <-- Process file
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


# FUNCTION | Process All Projects
# ------------------------------------------------------------
def process_all_projects(s3_client: boto3.client, bucket_name: str, projects: List[Dict], target_project: Optional[str], dry_run: bool) -> List[Dict]:
    """Process all discovered projects"""
    results = []                                                      # <-- Initialize results list
    
    for project_info in projects:
        if target_project and project_info['source_folder_name'] != target_project:
            continue                                                  # <-- Skip if not target project
        
        result = process_project(s3_client, bucket_name, project_info, dry_run)  # <-- Process project
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
    """Print summary of discovered projects"""
    print(f"{COLOR_CYAN}{'='*80}{COLOR_RESET}")                      # <-- Print header divider
    print(f"{COLOR_CYAN}WHITECARD PROJECT DISCOVERY{COLOR_RESET}")   # <-- Print header title
    print(f"{COLOR_CYAN}{'='*80}{COLOR_RESET}\n")                    # <-- Print header divider
    
    print(f"{COLOR_BLUE}Source Path: {source_base}{COLOR_RESET}")    # <-- Print source path
    print(f"{COLOR_BLUE}[DISCOVERY] Found {len(projects)} Whitecard project(s) with GLB sync folders{COLOR_RESET}\n")  # <-- Print count
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
        print(f"    Destination: {R2_BASE_PREFIX}/{result['dest_name']}")  # <-- Print destination
        print(f"    Files found: {result['files_found']}")            # <-- Print files count
        print(f"    Total size: {format_file_size(result['total_size'])}")  # <-- Print total size
        
        # PRINT FILE DETAILS
        for file_result in result['file_results']:
            filename = file_result['filename']                        # <-- Get filename
            action = file_result['action']                            # <-- Get action
            action_detail = file_result['action_detail']              # <-- Get action detail
            
            if action == 'new':
                print(f"      {COLOR_GREEN}[+] {filename}{COLOR_RESET} - {action_detail}")  # <-- New file
            elif action == 'update':
                print(f"      {COLOR_YELLOW}[^] {filename}{COLOR_RESET} - {action_detail}")  # <-- Updated file
            elif action == 'skip':
                print(f"      {COLOR_BLUE}[=] {filename}{COLOR_RESET} - {action_detail}")  # <-- Skipped file
            
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
    
    # STEP 3: Discover Whitecard projects
    source_base = Path(LOCAL_PROJECTS_BASE_PATH)                      # <-- Construct source path
    projects = discover_whitecard_projects(source_base)               # <-- Discover projects
    
    if not projects:
        print(f"{COLOR_RED}No Whitecard projects with GLB sync folders found. Exiting.{COLOR_RESET}\n")  # <-- Log failure
        return                                                        # <-- Exit if none found
    
    print_discovery_summary(source_base, projects)                    # <-- Print discovery summary
    
    # STEP 4: Always run dry-run first to preview
    print(f"{COLOR_YELLOW}Mode: DRY RUN (preview mode){COLOR_RESET}\n")  # <-- Print dry-run mode
    
    results = process_all_projects(s3_client, bucket_name, projects, args.project, dry_run=True)  # <-- Run dry-run
    print_results(results, dry_run=True)                              # <-- Print preview results
    
    # Check if any files need uploading
    needs_upload = any(r['files_new'] > 0 or r['files_updated'] > 0 for r in results)  # <-- Check if upload needed
    
    # If dry-run-only flag is set, exit after preview
    if args.dry_run_only:
        return                                                        # <-- Exit after dry-run
    
    # If no files need uploading, exit
    if not needs_upload:
        print(f"{COLOR_GREEN}All files are up to date. No uploads needed.{COLOR_RESET}\n")  # <-- No changes message
        return                                                        # <-- Exit if nothing to upload
    
    # STEP 5: Ask for confirmation before proceeding
    if not prompt_for_confirmation():
        return                                                        # <-- Exit if user cancels
    
    # STEP 6: Run actual upload
    print(f"{COLOR_GREEN}Mode: UPLOADING FILES TO R2{COLOR_RESET}\n")  # <-- Print upload mode
    
    results = process_all_projects(s3_client, bucket_name, projects, args.project, dry_run=False)  # <-- Run actual upload
    print_results(results, dry_run=False)                             # <-- Print final results
    
    successful_count = sum(r['files_new'] + r['files_updated'] for r in results)  # <-- Count successful
    print(f"{COLOR_GREEN}Upload complete! {successful_count} file(s) uploaded to Cloudflare R2.{COLOR_RESET}\n")  # <-- Print completion
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------


if __name__ == '__main__':
    main()

