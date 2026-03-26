# =============================================================================
# VALEDESIGNSUITE - BUILD VALE PROJECT STRUCTURE UTILITY
# =============================================================================
#
# FILE       : Py_WinUtil__BuildValeProjectStructure__Main__.py
# NAMESPACE  : BuildValeProjectStructure
# MODULE     : BuildValeProjectStructure
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Tkinter tool to parse Vale Server paths and create local project structure
# CREATED    : 05-Dec-2025
#
# DESCRIPTION:
# - This script implements a project folder builder for Vale Design Suite.
# - Parses Vale Server paths to extract project name and number.
# - Creates standardized local project folder structure.
# - Generates populated JSON project data file.
# - Creates Windows shortcut to Vale Server directory.
# - Supports single, multi-word, and hyphenated project names.
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 05-Dec-2025 - Version 1.0.0
# - Initial implementation with Tkinter GUI
# - Path parsing with regex for name/number extraction
# - Folder structure creation
# - JSON data file population
# - Windows .url shortcut creation
#
# 05-Dec-2025 - Version 1.1.0
# - Added folder suffix: __Whitecard for Whitecard projects
# - Added folder suffix: __DigitalConcept for DigitalConcept projects
# - Removed date fields from UI (auto-generated)
# - Added Vale brand header with logo and blue border
#
# 05-Dec-2025 - Version 1.2.0
# - Removed Project Status from UI (auto-set to placeholder)
# - Added custom Vale window icon from local ImageAssets/Icon__MainValeIcon__.png
# - Added DEV_CONSOLE_ON constant to control console window visibility
# - Console window hidden by default (set DEV_CONSOLE_ON=True for debugging)
#
# 05-Dec-2025 - Version 1.3.0
# - Added SketchUp template file support with SKETCHUP_TEMPLATE_PATH constant
# - Added subfolders: 02__SketchUp/01__MainModel and 02__SketchUp/02__CadConversionModel
# - Auto-copies and renames SketchUp template to both model folders
# - Template names: {ProjectName}__WhiteCardModel__0.0.1__.skp
#                   {ProjectName}__CadConversionModel__0.0.1__.skp
#
# =============================================================================

import os
import re
import json
import sys
import shutil
import ctypes
import tkinter as tk
from tkinter import ttk, messagebox
from datetime import datetime
from PIL import Image, ImageTk

# -----------------------------------------------------------------------------
# REGION | Development and Console Configuration
# -----------------------------------------------------------------------------

    # MODULE CONSTANTS | Development Configuration
    # ------------------------------------------------------------
DEV_CONSOLE_ON           =   False                                            # <-- Set to True to show console for debugging, False to hide
    # ---------------------------------------------------------------

    # MODULE CONSTANTS | SketchUp Template Configuration (EASY TO CHANGE PER PC)
    # ------------------------------------------------------------
SKETCHUP_TEMPLATE_PATH   =   "D:\\02_CoreLib__SketchUp\\06__CoreLib__SketchUp__FileTemplates\\SketchUp__MasterTemplate__Active__.skp"  # <-- Path to SketchUp template file
    # ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Hide Console Window if DEV_CONSOLE_ON is False
# -----------------------------------------------------------------------------

    # FUNCTION | Hide Console Window on Windows
    # ------------------------------------------------------------
if not DEV_CONSOLE_ON and sys.platform == 'win32':                            # <-- Check if console should be hidden
    try:
        console_window = ctypes.windll.kernel32.GetConsoleWindow()            # <-- Get console window handle
        if console_window != 0:                                                # <-- Check if console exists
            ctypes.windll.user32.ShowWindow(console_window, 0)                # <-- Hide console window (0 = SW_HIDE)
    except Exception:
        pass                                                                   # <-- Silently ignore errors
    # ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Module Constants and Configuration
# -----------------------------------------------------------------------------

    # MODULE CONSTANTS | Project Structure Configuration
    # ------------------------------------------------------------
VALE_PROJECTS_ROOT       =   "C:\\01__ValeProjects"                          # <-- Root directory for all Vale projects
PROJECTS_FOLDER_PREFIX   =   "ValeProjects__"                                # <-- Prefix for year-based project folders
PROJECT_NUMBER_PATTERN   =   r'^(.+?)(\d{5,6})'                              # <-- Regex pattern: name + 5-6 digit number
    # ---------------------------------------------------------------

    # MODULE CONSTANTS | Project Type Folder Suffixes
    # ------------------------------------------------------------
PROJECT_TYPE_SUFFIXES    =   {                                               # <-- Suffix appended to folder name by type
    "Whitecard"      : "__Whitecard",
    "DigitalConcept" : "__DigitalConcept"
}
    # ---------------------------------------------------------------

    # MODULE CONSTANTS | Brand Colors and Assets
    # ------------------------------------------------------------
VALE_BLUE_COLOR          =   "#172b3a"                                        # <-- Vale brand blue color
HEADER_BAR_HEIGHT        =   60                                               # <-- Height of header bar in pixels
LOGO_IMAGE_FILENAME      =   "AppLogo__ValeHeaderImage_ValeLogo_HorizontalFormat__.png"  # <-- Logo filename
ICON_IMAGE_FILENAME      =   "Icon__MainValeIcon__.png"                       # <-- Window icon filename (PNG)
LOGO_ASSETS_FOLDER       =   "ImageAssets"                                    # <-- Folder containing logo assets
    # ---------------------------------------------------------------

    # MODULE CONSTANTS | Project Type Options
    # ------------------------------------------------------------
PROJECT_TYPES            =   [                                               # <-- Available project types for dropdown
    "Whitecard",
    "DigitalConcept",
    "DesignDevelopment",
    "Marketing",
    "Research"
]
    # ---------------------------------------------------------------

    # MODULE CONSTANTS | Project Status Placeholder
    # ------------------------------------------------------------
PROJECT_STATUS_PLACEHOLDER =   "Active"                                       # <-- Default placeholder for project status
    # ---------------------------------------------------------------

    # MODULE CONSTANTS | Folder Structure Template
    # ------------------------------------------------------------
FOLDER_STRUCTURE         =   [                                               # <-- Folders to create in each project
    "00__ProjectData",
    "01__ReferenceFiles",
    "02__SketchUp",
    "03__Layout",
    "04__Photoshop",
    "10__ContentDelivered__Local",
    "60__ValeServerLinks"
]
    # ---------------------------------------------------------------

    # MODULE CONSTANTS | Content Delivered Subfolders
    # ------------------------------------------------------------
CONTENT_DELIVERED_SUBS   =   [                                               # <-- Subfolders within 10__ContentDelivered__Local
    "ValeVision__GlbFileSync"
]
    # ---------------------------------------------------------------

    # MODULE CONSTANTS | SketchUp Subfolders
    # ------------------------------------------------------------
SKETCHUP_SUBFOLDERS      =   [                                               # <-- Subfolders within 02__SketchUp
    "01__MainModel",
    "02__CadConversionModel"
]
    # ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | JSON Data File Loading
# -----------------------------------------------------------------------------

    # HELPER FUNCTION | Get Script Root Directory
    # ---------------------------------------------------------------
def get_script_root_directory():
    """Get the root directory where this script is located"""
    script_dir = os.path.dirname(os.path.abspath(__file__))                  # <-- Get current script directory
    return script_dir                                                         # <-- Return script root directory
    # ---------------------------------------------------------------

    # HELPER FUNCTION | Build Relative Path to Whitecardopedia Data
    # ---------------------------------------------------------------
def get_whitecardopedia_data_path():
    """Get path to Whitecardopedia data directory using relative paths"""
    script_dir = get_script_root_directory()                                  # <-- Get script directory
    # Navigate: 02_Python -> Root_GeneralDeveloperTools -> ValeCodebase -> WebApps -> Whitecardopedia -> src -> data
    data_path = os.path.join(
        script_dir,                                                           # <-- Start from script location
        "..", "..", "..", "..",                                               # <-- Up to ValeCodebase root
        "WebApps", "Whitecardopedia", "src", "data"                          # <-- Down to data folder
    )
    return os.path.normpath(data_path)                                        # <-- Return normalized path
    # ---------------------------------------------------------------

    # FUNCTION | Load Designers List from JSON
    # ------------------------------------------------------------
def load_designers_list():
    """Load list of designers from ValeDesignersList.json"""
    data_path = get_whitecardopedia_data_path()                               # <-- Get data directory path
    json_path = os.path.join(data_path, "ValeDesignersList.json")            # <-- Construct full path to JSON
    
    try:
        with open(json_path, 'r', encoding='utf-8') as file:                  # <-- Open JSON file
            data = json.load(file)                                            # <-- Parse JSON content
        return data.get("List__ValeDesigners", [])                            # <-- Return designers list
    except FileNotFoundError:
        print(f"Warning: Designers list not found at {json_path}")            # <-- Log warning
        return []                                                              # <-- Return empty list on error
    except json.JSONDecodeError as e:
        print(f"Error parsing designers JSON: {e}")                           # <-- Log JSON error
        return []                                                              # <-- Return empty list on error
    # ---------------------------------------------------------------

    # FUNCTION | Load Concept Artists List from JSON
    # ------------------------------------------------------------
def load_concept_artists_list():
    """Load list of concept artists from ValeConceptArtistsList.json"""
    data_path = get_whitecardopedia_data_path()                               # <-- Get data directory path
    json_path = os.path.join(data_path, "ValeConceptArtistsList.json")       # <-- Construct full path to JSON
    
    try:
        with open(json_path, 'r', encoding='utf-8') as file:                  # <-- Open JSON file
            data = json.load(file)                                            # <-- Parse JSON content
        return data.get("List__ValeConceptArtists", [])                       # <-- Return artists list
    except FileNotFoundError:
        print(f"Warning: Concept artists list not found at {json_path}")      # <-- Log warning
        return []                                                              # <-- Return empty list on error
    except json.JSONDecodeError as e:
        print(f"Error parsing concept artists JSON: {e}")                     # <-- Log JSON error
        return []                                                              # <-- Return empty list on error
    # ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Path Parsing Logic
# -----------------------------------------------------------------------------

    # HELPER FUNCTION | Strip Quotes from Path String
    # ---------------------------------------------------------------
def strip_path_quotes(path_string):
    """Remove surrounding quotes from a path string if present"""
    path_string = path_string.strip()                                         # <-- Remove whitespace
    if path_string.startswith('"') and path_string.endswith('"'):            # <-- Check for double quotes
        path_string = path_string[1:-1]                                       # <-- Remove surrounding quotes
    if path_string.startswith("'") and path_string.endswith("'"):            # <-- Check for single quotes
        path_string = path_string[1:-1]                                       # <-- Remove surrounding quotes
    return path_string                                                         # <-- Return cleaned path
    # ---------------------------------------------------------------

    # HELPER FUNCTION | Extract Project Folder from Path
    # ---------------------------------------------------------------
def extract_project_folder(vale_path):
    """Extract the project folder name containing the number from Vale path"""
    vale_path = strip_path_quotes(vale_path)                                  # <-- Clean the path string
    path_parts = vale_path.split(os.sep)                                      # <-- Split path into components
    
    # Also handle forward slashes in case path uses them
    if len(path_parts) == 1:                                                  # <-- Check if no backslashes found
        path_parts = vale_path.split('/')                                     # <-- Try forward slashes
    
    # Find the folder containing the project number (5-6 digits)
    for part in path_parts:                                                   # <-- Iterate through path parts
        if re.search(r'\d{5,6}', part):                                       # <-- Check for 5-6 digit number
            return part                                                        # <-- Return matching folder name
    
    return None                                                                # <-- Return None if not found
    # ---------------------------------------------------------------

    # FUNCTION | Parse Project Name and Number from Folder Name
    # ------------------------------------------------------------
def parse_project_name_and_number(folder_name):
    """
    Extract project name and number from folder name.
    Supports: Single names, multi-word, hyphenated double-barrel names.
    Examples:
        - Chadfield61898 -> ('Chadfield', '61898')
        - Cape Construction62383 -> ('Cape Construction', '62383')
        - Smith-Jones61898 -> ('Smith-Jones', '61898')
    """
    if not folder_name:                                                       # <-- Check for empty input
        return None, None                                                     # <-- Return None if no input
    
    # Remove common suffixes like " NEW DB"
    folder_clean = re.sub(r'\s*NEW\s*DB.*$', '', folder_name, flags=re.IGNORECASE)  # <-- Remove " NEW DB" suffix
    folder_clean = folder_clean.strip()                                       # <-- Clean whitespace
    
    # Match pattern: any characters followed by 5-6 digit number
    match = re.match(PROJECT_NUMBER_PATTERN, folder_clean)                    # <-- Apply regex pattern
    
    if match:                                                                  # <-- Check if pattern matched
        project_name = match.group(1).strip()                                 # <-- Extract project name
        project_number = match.group(2)                                        # <-- Extract project number
        return project_name, project_number                                    # <-- Return extracted values
    
    return None, None                                                          # <-- Return None if no match
    # ---------------------------------------------------------------

    # FUNCTION | Parse Vale Server Path
    # ------------------------------------------------------------
def parse_vale_server_path(vale_path):
    """
    Parse a Vale Server path and extract project information.
    Returns dictionary with: project_name, project_number, vale_server_path
    """
    vale_path = strip_path_quotes(vale_path)                                  # <-- Clean the input path
    
    result = {                                                                 # <-- Initialize result dictionary
        "project_name"      : None,
        "project_number"    : None,
        "vale_server_path"  : vale_path
    }
    
    # Extract the project folder from path
    project_folder = extract_project_folder(vale_path)                        # <-- Get project folder name
    
    if project_folder:                                                         # <-- Check if folder found
        name, number = parse_project_name_and_number(project_folder)          # <-- Parse name and number
        result["project_name"] = name                                          # <-- Store project name
        result["project_number"] = number                                      # <-- Store project number
    
    return result                                                              # <-- Return parsed data
    # ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Folder Structure Creation
# -----------------------------------------------------------------------------

    # HELPER FUNCTION | Build Project Root Path
    # ---------------------------------------------------------------
def build_project_root_path(project_number, project_name, year, project_type=None):
    """Construct the full path to the project root directory with type suffix"""
    year_folder = f"{PROJECTS_FOLDER_PREFIX}{year}"                           # <-- Build year folder name
    project_folder = f"{project_number}__{project_name}"                      # <-- Build project folder name
    
    # Add type-specific suffix if applicable
    if project_type and project_type in PROJECT_TYPE_SUFFIXES:                # <-- Check for type suffix
        project_folder += PROJECT_TYPE_SUFFIXES[project_type]                 # <-- Append suffix to folder name
    
    project_root = os.path.join(                                              # <-- Construct full path
        VALE_PROJECTS_ROOT,
        year_folder,
        project_folder
    )
    return os.path.normpath(project_root)                                      # <-- Return normalized path
    # ---------------------------------------------------------------

    # HELPER FUNCTION | Build Content Delivery Folder Name
    # ---------------------------------------------------------------
def build_content_delivery_folder_name(project_type, delivery_date):
    """Build the VisDpt content delivery folder name"""
    folder_name = f"VisDpt__{project_type}__FirstEdition__{delivery_date}"    # <-- Construct folder name
    return folder_name                                                         # <-- Return folder name
    # ---------------------------------------------------------------

    # FUNCTION | Create Project Folder Structure
    # ------------------------------------------------------------
def create_project_folder_structure(project_number, project_name, year, project_type, delivery_date):
    """
    Create the complete project folder structure.
    Returns tuple: (success: bool, project_root_path: str, error_message: str)
    """
    project_root = build_project_root_path(project_number, project_name, year, project_type)  # <-- Get project root path with type suffix
    
    try:
        # Create main project folders
        for folder in FOLDER_STRUCTURE:                                       # <-- Iterate through folder template
            folder_path = os.path.join(project_root, folder)                  # <-- Construct folder path
            os.makedirs(folder_path, exist_ok=True)                           # <-- Create folder (skip if exists)
        
        # Create content delivered subfolders
        content_delivered_path = os.path.join(project_root, "10__ContentDelivered__Local")  # <-- Get content path
        
        for subfolder in CONTENT_DELIVERED_SUBS:                              # <-- Iterate through subfolders
            subfolder_path = os.path.join(content_delivered_path, subfolder)  # <-- Construct subfolder path
            os.makedirs(subfolder_path, exist_ok=True)                        # <-- Create subfolder
        
        # Create the VisDpt delivery folder
        delivery_folder_name = build_content_delivery_folder_name(project_type, delivery_date)  # <-- Build name
        delivery_folder_path = os.path.join(content_delivered_path, delivery_folder_name)       # <-- Build path
        os.makedirs(delivery_folder_path, exist_ok=True)                      # <-- Create delivery folder
        
        # Create SketchUp subfolders
        sketchup_path = os.path.join(project_root, "02__SketchUp")            # <-- Get SketchUp folder path
        
        for subfolder in SKETCHUP_SUBFOLDERS:                                 # <-- Iterate through SketchUp subfolders
            subfolder_path = os.path.join(sketchup_path, subfolder)           # <-- Construct subfolder path
            os.makedirs(subfolder_path, exist_ok=True)                        # <-- Create subfolder
        
        return True, project_root, None                                        # <-- Return success
        
    except PermissionError as e:
        return False, project_root, f"Permission denied: {e}"                 # <-- Return permission error
    except OSError as e:
        return False, project_root, f"OS error creating folders: {e}"         # <-- Return OS error
    except Exception as e:
        return False, project_root, f"Unexpected error: {e}"                  # <-- Return unexpected error
    # ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | SketchUp Template File Handling
# -----------------------------------------------------------------------------

    # FUNCTION | Copy SketchUp Template Files to Project
    # ------------------------------------------------------------
def copy_sketchup_templates(project_root_path, project_name):
    """
    Copy the SketchUp template file to the project's SketchUp subfolders.
    Creates renamed copies for MainModel and CadConversionModel.
    Returns tuple: (success: bool, error_message: str or None)
    """
    # Check if template file exists
    if not os.path.exists(SKETCHUP_TEMPLATE_PATH):                            # <-- Check template exists
        return False, f"SketchUp template not found at: {SKETCHUP_TEMPLATE_PATH}"  # <-- Return error
    
    sketchup_folder = os.path.join(project_root_path, "02__SketchUp")         # <-- Get SketchUp folder
    
    try:
        # Copy template to 01__MainModel folder
        main_model_folder = os.path.join(sketchup_folder, "01__MainModel")    # <-- MainModel folder path
        main_model_filename = f"{project_name}__WhiteCardModel__0.0.1__.skp"  # <-- Build filename
        main_model_path = os.path.join(main_model_folder, main_model_filename)  # <-- Full destination path
        shutil.copy2(SKETCHUP_TEMPLATE_PATH, main_model_path)                 # <-- Copy with metadata
        
        # Copy template to 02__CadConversionModel folder
        cad_model_folder = os.path.join(sketchup_folder, "02__CadConversionModel")  # <-- CadConversion folder path
        cad_model_filename = f"{project_name}__CadConversionModel__0.0.1__.skp"     # <-- Build filename
        cad_model_path = os.path.join(cad_model_folder, cad_model_filename)   # <-- Full destination path
        shutil.copy2(SKETCHUP_TEMPLATE_PATH, cad_model_path)                  # <-- Copy with metadata
        
        return True, None                                                      # <-- Return success
        
    except PermissionError as e:
        return False, f"Permission denied copying SketchUp template: {e}"     # <-- Return permission error
    except OSError as e:
        return False, f"OS error copying SketchUp template: {e}"              # <-- Return OS error
    except Exception as e:
        return False, f"Unexpected error copying SketchUp template: {e}"      # <-- Return unexpected error
    # ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | JSON Project Data File Creation
# -----------------------------------------------------------------------------

    # FUNCTION | Build Project Data JSON Structure
    # ------------------------------------------------------------
def build_project_data_json(project_name, project_number, project_type, project_status,
                            start_date, delivery_date, designer, concept_artist,
                            project_description, vale_server_path, project_root_path):
    """Build the complete JSON structure for the project data file"""
    
    # Build local paths
    project_data_folder = os.path.join(project_root_path, "00__ProjectData")  # <-- Data folder path
    json_filename = f"{project_number}__{project_name}__ProjectData__.json"   # <-- JSON filename
    json_file_path = os.path.join(project_data_folder, json_filename)         # <-- Full JSON path
    
    # Escape backslashes for JSON string storage
    project_root_escaped = project_root_path.replace("\\", "\\\\")            # <-- Escape backslashes
    json_path_escaped = json_file_path.replace("\\", "\\\\")                  # <-- Escape backslashes
    vale_server_escaped = vale_server_path.replace("\\", "\\\\")              # <-- Escape backslashes
    
    project_data = [                                                           # <-- Build JSON structure
    {
        "Project__MetaData" : {
                "Project__Name"          : project_name,
                "Project__Number"        : project_number,
                "Project__Type"          : project_type,
                "Project__Status"        : project_status,
                "Project__StartDate"     : start_date,
                "Project__DeliveryDate"  : delivery_date,
                "Project__Designer"      : designer,
                "Project__ConceptArtist" : concept_artist,
                "Project__Description"   : project_description
        }
    },
    {
        "Project__PrivateLinksIndex" : {
            "Link__MainLocalDirectory" : {
                    "Link__WindowsPath"  : project_root_escaped,
                    "Link__Location"     : "Local Machine, i.e. my own work station",
                    "Link__Description"  : "This is the main project directory hosting the larger project production files such as SketchUp files, CAD files, Photoshop files, etc."
            },
            "Link__MainLocalDataFile" : {
                    "Link__WindowsPath"  : json_path_escaped,
                    "Link__Location"     : "Local Machine, i.e. my own work station",
                    "Link__Description"  : "This is the master project data file (This file) with all of the project data including private sensitive project data not exposed to the web."
            },
            "Link__ValeServerProjectDirectory" : {
                    "Link__WindowsPath"  : vale_server_escaped,
                    "Link__Location"     : "Vale Garden Houses Office Network & physical private server",
                    "Link__Usage"        : "This is used to create a .link file in the main project directory to link to the ValeServerProjectDirectory. Place link in `/60__ValeServerLinks` ",
                    "Link__Description"  : "This is the main project directory used by Vale's team to store all departmental project files, I only usually place my final content here."
            }
        }
    },
    {
        "Project__PublicLinksIndex" : {
            "Link__Whitecardopedia" : {
                    "Link__WindowsPath"    : f"D:\\\\10_CoreLib__ValeCodebase\\\\WebApps\\\\Whitecardopedia\\\\Projects\\\\{start_date[-4:]}\\\\{project_number}__{project_name}",
                    "Link__Location"       : "Local Machine peripherally pushed and synced to GitHub repository, synced version is live on the Whitecardopedia website.",
                    "Link__Description01"  : "This is a selectively duplicated project folder which is pushed to GitHub ensure sensitive project data is not exposed to the public.",
                    "Link__Description02"  : "Files stored include: a reduced project data `project.json` file and the Images used to populate the gallery and project page on the Whitecardopedia website.",
                    "Link__ImportantNote"  : "Its critical all of the client details are kept private and not exposed to the public."
            }
        }
    },
    {
        "Project__SiteData" : {
                "Site__AddressLine1"  : "",
                "Site__StreetName"    : "",
                "Site__Town"          : "",
                "Site__City"          : "",
                "Site__County"        : "",
                "Site__Postcode"      : "",
                "Site__Latitude"      : "",
                "Site__Longitude"     : ""
            }
        }
    ]
    
    return project_data, json_file_path                                        # <-- Return data and path
    # ---------------------------------------------------------------

    # FUNCTION | Write Project Data JSON File
    # ------------------------------------------------------------
def write_project_data_json(project_data, json_file_path):
    """Write the project data JSON to file"""
    try:
        with open(json_file_path, 'w', encoding='utf-8') as file:             # <-- Open file for writing
            json.dump(project_data, file, indent=4, ensure_ascii=False)       # <-- Write JSON with formatting
        return True, None                                                      # <-- Return success
    except PermissionError as e:
        return False, f"Permission denied writing JSON: {e}"                  # <-- Return permission error
    except OSError as e:
        return False, f"OS error writing JSON: {e}"                           # <-- Return OS error
    except Exception as e:
        return False, f"Unexpected error writing JSON: {e}"                   # <-- Return unexpected error
    # ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Windows Shortcut Creation
# -----------------------------------------------------------------------------

    # FUNCTION | Create Windows URL Shortcut to Vale Server
    # ------------------------------------------------------------
def create_vale_server_shortcut(project_root_path, project_name, project_number, vale_server_path):
    """
    Create a Windows .url shortcut file pointing to the Vale Server directory.
    Uses .url format for folder shortcuts (works better than .lnk for network paths).
    """
    shortcuts_folder = os.path.join(project_root_path, "60__ValeServerLinks") # <-- Get shortcuts folder
    shortcut_name = f"Link__ValeServer__{project_name}{project_number}.url"   # <-- Build shortcut filename
    shortcut_path = os.path.join(shortcuts_folder, shortcut_name)             # <-- Build full path
    
    # Convert path to file:/// URL format for .url shortcut
    vale_server_clean = strip_path_quotes(vale_server_path)                   # <-- Clean the path
    file_url = "file:///" + vale_server_clean.replace("\\", "/")              # <-- Convert to file URL
    
    # .url file content format
    url_content = f"""[InternetShortcut]
URL={file_url}
IconIndex=0
"""
    
    try:
        with open(shortcut_path, 'w', encoding='utf-8') as file:              # <-- Open file for writing
            file.write(url_content)                                            # <-- Write URL shortcut content
        return True, None                                                      # <-- Return success
    except PermissionError as e:
        return False, f"Permission denied creating shortcut: {e}"             # <-- Return permission error
    except OSError as e:
        return False, f"OS error creating shortcut: {e}"                      # <-- Return OS error
    except Exception as e:
        return False, f"Unexpected error creating shortcut: {e}"              # <-- Return unexpected error
    # ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Tkinter GUI Application
# -----------------------------------------------------------------------------

    # CLASS | Vale Project Structure Builder Application
    # ------------------------------------------------------------
class ValeProjectBuilderApp:
    """Main Tkinter application class for Vale Project Structure Builder"""
    
    # SUB FUNCTION | Initialize Application
    # ---------------------------------------------------------------
    def __init__(self, root):
        """Initialize the application window and components"""
        self.root = root                                                       # <-- Store root window reference
        self.root.title("Vale Project Structure Builder")                     # <-- Set window title
        self.root.geometry("750x480")                                          # <-- Set window size
        self.root.resizable(True, True)                                        # <-- Allow window resizing
        self.root.configure(bg='white')                                        # <-- Set white background
        
        # Set custom window icon
        self.set_window_icon()                                                 # <-- Load and set Vale icon
        
        # Load dropdown data
        self.designers_list = load_designers_list()                           # <-- Load designers from JSON
        self.artists_list = load_concept_artists_list()                       # <-- Load artists from JSON
        
        # Initialize variables
        self.init_variables()                                                  # <-- Initialize tkinter variables
        
        # Build GUI
        self.build_gui()                                                       # <-- Construct the interface
        
        # Set default values
        self.set_defaults()                                                    # <-- Set default field values
    # ---------------------------------------------------------------
    
    # SUB FUNCTION | Initialize Tkinter Variables
    # ---------------------------------------------------------------
    def init_variables(self):
        """Initialize all tkinter StringVar variables"""
        self.var_vale_path       = tk.StringVar()                             # <-- Vale server path input
        self.var_project_name    = tk.StringVar()                             # <-- Extracted/edited project name
        self.var_project_number  = tk.StringVar()                             # <-- Extracted/edited project number
        self.var_year            = tk.StringVar()                             # <-- Project year (current year)
        self.var_project_type    = tk.StringVar()                             # <-- Selected project type
        self.var_designer        = tk.StringVar()                             # <-- Selected designer
        self.var_artist          = tk.StringVar()                             # <-- Selected concept artist
        self.var_description     = tk.StringVar()                             # <-- Project description
        self.logo_image          = None                                        # <-- Store logo image reference
        self.icon_image          = None                                        # <-- Store window icon reference
    # ---------------------------------------------------------------
    
    # SUB FUNCTION | Set Window Icon from Local PNG
    # ---------------------------------------------------------------
    def set_window_icon(self):
        """Load and set the custom Vale window icon from local PNG"""
        script_dir = get_script_root_directory()                              # <-- Get script directory
        icon_path = os.path.join(script_dir, LOGO_ASSETS_FOLDER, ICON_IMAGE_FILENAME)  # <-- Build icon path
        icon_path = os.path.normpath(icon_path)                               # <-- Normalize path
        
        try:
            if not os.path.exists(icon_path):                                  # <-- Check if file exists
                print(f"Note: Icon file not found at {icon_path}")            # <-- Log info
                return                                                         # <-- Exit without custom icon
            
            # Load PNG image
            pil_image = Image.open(icon_path)                                  # <-- Open PNG image
            
            # Resize to 32x32 for window icon
            pil_image = pil_image.resize((32, 32), Image.LANCZOS)             # <-- Resize for window icon
            
            # Convert to Tkinter PhotoImage
            self.icon_image = ImageTk.PhotoImage(pil_image)                    # <-- Convert to PhotoImage
            
            # Set as window icon
            self.root.iconphoto(True, self.icon_image)                         # <-- Apply icon to window
            
        except Exception as e:
            print(f"Note: Could not load custom icon: {e}")                    # <-- Log any errors gracefully
    # ---------------------------------------------------------------
    
    # SUB FUNCTION | Set Default Values
    # ---------------------------------------------------------------
    def set_defaults(self):
        """Set default values for form fields"""
        current_year = datetime.now().strftime("%Y")                          # <-- Format: YYYY
        
        self.var_year.set(current_year)                                        # <-- Set year to current
        self.var_project_type.set(PROJECT_TYPES[0])                           # <-- Default to first type
        
        if self.designers_list:                                                # <-- Check if designers loaded
            self.var_designer.set(self.designers_list[0])                     # <-- Default to first designer
        
        if self.artists_list:                                                  # <-- Check if artists loaded
            self.var_artist.set(self.artists_list[0])                         # <-- Default to first artist
    # ---------------------------------------------------------------
    
    # SUB FUNCTION | Build GUI Layout
    # ---------------------------------------------------------------
    def build_gui(self):
        """Construct the complete GUI layout"""
        # Build header bar with logo
        self.build_header_bar()                                                # <-- Create header with Vale branding
        
        # Main container with padding
        main_frame = ttk.Frame(self.root, padding="15")                       # <-- Create main frame
        main_frame.pack(fill=tk.BOTH, expand=True)                            # <-- Pack to fill window
        
        row = 0                                                                # <-- Track current row
        
        # Section: Vale Server Path Input
        row = self.build_path_input_section(main_frame, row)                  # <-- Build path input section
        
        # Separator
        ttk.Separator(main_frame, orient='horizontal').grid(
            row=row, column=0, columnspan=3, sticky='ew', pady=10)            # <-- Add horizontal separator
        row += 1
        
        # Section: Extracted Project Info
        row = self.build_project_info_section(main_frame, row)                # <-- Build project info section
        
        # Separator
        ttk.Separator(main_frame, orient='horizontal').grid(
            row=row, column=0, columnspan=3, sticky='ew', pady=10)            # <-- Add horizontal separator
        row += 1
        
        # Section: User Selection Fields
        row = self.build_user_selection_section(main_frame, row)              # <-- Build selection section
        
        # Separator
        ttk.Separator(main_frame, orient='horizontal').grid(
            row=row, column=0, columnspan=3, sticky='ew', pady=10)            # <-- Add horizontal separator
        row += 1
        
        # Section: Action Buttons
        row = self.build_action_buttons_section(main_frame, row)              # <-- Build buttons section
        
        # Configure column weights for resizing
        main_frame.columnconfigure(1, weight=1)                               # <-- Allow column 1 to expand
    # ---------------------------------------------------------------
    
    # SUB FUNCTION | Build Header Bar with Logo
    # ---------------------------------------------------------------
    def build_header_bar(self):
        """Build the white header bar with Vale logo and blue border"""
        # Create white header bar frame
        header_frame = tk.Frame(self.root, bg='white', height=HEADER_BAR_HEIGHT)  # <-- White background header
        header_frame.pack(fill=tk.X, side=tk.TOP)                             # <-- Pack at top, fill horizontally
        header_frame.pack_propagate(False)                                     # <-- Prevent frame from shrinking
        
        # Load and display logo
        self.load_and_display_logo(header_frame)                              # <-- Load logo into header
        
        # Create Vale Blue border line under header
        border_line = tk.Frame(self.root, bg=VALE_BLUE_COLOR, height=3)       # <-- Blue border line
        border_line.pack(fill=tk.X, side=tk.TOP)                              # <-- Pack below header
    # ---------------------------------------------------------------
    
    # SUB FUNCTION | Load and Display Logo
    # ---------------------------------------------------------------
    def load_and_display_logo(self, parent):
        """Load the Vale logo image and display in header"""
        script_dir = get_script_root_directory()                              # <-- Get script directory
        logo_path = os.path.join(script_dir, LOGO_ASSETS_FOLDER, LOGO_IMAGE_FILENAME)  # <-- Build logo path
        logo_path = os.path.normpath(logo_path)                               # <-- Normalize path
        
        try:
            # Load image with PIL
            pil_image = Image.open(logo_path)                                  # <-- Open PNG image
            
            # Calculate resize to fit header height with padding
            target_height = HEADER_BAR_HEIGHT - 16                             # <-- Leave 8px padding top/bottom
            aspect_ratio = pil_image.width / pil_image.height                 # <-- Calculate aspect ratio
            target_width = int(target_height * aspect_ratio)                  # <-- Calculate width
            
            # Resize image using LANCZOS for quality
            pil_image = pil_image.resize((target_width, target_height), Image.LANCZOS)  # <-- Resize image
            
            # Convert to Tkinter PhotoImage
            self.logo_image = ImageTk.PhotoImage(pil_image)                   # <-- Convert to PhotoImage
            
            # Create label with logo
            logo_label = tk.Label(parent, image=self.logo_image, bg='white')  # <-- Create label with image
            logo_label.pack(side=tk.LEFT, padx=15, pady=8)                    # <-- Position in top-left
            
        except FileNotFoundError:
            print(f"Warning: Logo image not found at {logo_path}")            # <-- Log warning
            # Display text fallback
            fallback_label = tk.Label(parent, text="Vale Garden Houses", 
                                      font=('Segoe UI', 14, 'bold'),
                                      bg='white', fg=VALE_BLUE_COLOR)         # <-- Fallback text label
            fallback_label.pack(side=tk.LEFT, padx=15, pady=15)               # <-- Position fallback
        except Exception as e:
            print(f"Error loading logo: {e}")                                  # <-- Log error
    # ---------------------------------------------------------------
    
    # SUB FUNCTION | Build Path Input Section
    # ---------------------------------------------------------------
    def build_path_input_section(self, parent, start_row):
        """Build the Vale Server path input section"""
        row = start_row                                                        # <-- Start from given row
        
        # Section header
        ttk.Label(parent, text="Vale Server Path", font=('Segoe UI', 10, 'bold')).grid(
            row=row, column=0, columnspan=3, sticky='w', pady=(0, 5))         # <-- Section title
        row += 1
        
        # Path entry
        ttk.Label(parent, text="Paste Path:").grid(
            row=row, column=0, sticky='w', padx=(0, 10))                       # <-- Label for path input
        
        path_entry = ttk.Entry(parent, textvariable=self.var_vale_path, width=60)  # <-- Path entry field
        path_entry.grid(row=row, column=1, sticky='ew', padx=(0, 10))         # <-- Position entry
        
        ttk.Button(parent, text="Parse Path", command=self.parse_path).grid(
            row=row, column=2, sticky='e')                                     # <-- Parse button
        row += 1
        
        return row                                                             # <-- Return next row
    # ---------------------------------------------------------------
    
    # SUB FUNCTION | Build Project Info Section
    # ---------------------------------------------------------------
    def build_project_info_section(self, parent, start_row):
        """Build the extracted project information section"""
        row = start_row                                                        # <-- Start from given row
        
        # Section header
        ttk.Label(parent, text="Project Information (Editable)", font=('Segoe UI', 10, 'bold')).grid(
            row=row, column=0, columnspan=3, sticky='w', pady=(0, 5))         # <-- Section title
        row += 1
        
        # Project Number
        ttk.Label(parent, text="Project Number:").grid(
            row=row, column=0, sticky='w', padx=(0, 10))                       # <-- Label
        ttk.Entry(parent, textvariable=self.var_project_number, width=20).grid(
            row=row, column=1, sticky='w')                                     # <-- Entry field
        row += 1
        
        # Project Name
        ttk.Label(parent, text="Project Name:").grid(
            row=row, column=0, sticky='w', padx=(0, 10), pady=(5, 0))          # <-- Label
        ttk.Entry(parent, textvariable=self.var_project_name, width=40).grid(
            row=row, column=1, sticky='w', pady=(5, 0))                        # <-- Entry field
        row += 1
        
        # Year
        ttk.Label(parent, text="Year:").grid(
            row=row, column=0, sticky='w', padx=(0, 10), pady=(5, 0))          # <-- Label
        ttk.Entry(parent, textvariable=self.var_year, width=10).grid(
            row=row, column=1, sticky='w', pady=(5, 0))                        # <-- Entry field
        row += 1
        
        return row                                                             # <-- Return next row
    # ---------------------------------------------------------------
    
    # SUB FUNCTION | Build User Selection Section
    # ---------------------------------------------------------------
    def build_user_selection_section(self, parent, start_row):
        """Build the user selection dropdowns section"""
        row = start_row                                                        # <-- Start from given row
        
        # Section header
        ttk.Label(parent, text="Project Details", font=('Segoe UI', 10, 'bold')).grid(
            row=row, column=0, columnspan=3, sticky='w', pady=(0, 5))         # <-- Section title
        row += 1
        
        # Project Type
        ttk.Label(parent, text="Project Type:").grid(
            row=row, column=0, sticky='w', padx=(0, 10))                       # <-- Label
        type_combo = ttk.Combobox(parent, textvariable=self.var_project_type,
                                  values=PROJECT_TYPES, state='readonly', width=25)  # <-- Dropdown
        type_combo.grid(row=row, column=1, sticky='w')                        # <-- Position dropdown
        row += 1
        
        # Designer
        ttk.Label(parent, text="Designer:").grid(
            row=row, column=0, sticky='w', padx=(0, 10), pady=(5, 0))          # <-- Label
        designer_combo = ttk.Combobox(parent, textvariable=self.var_designer,
                                      values=self.designers_list, state='readonly', width=25)  # <-- Dropdown
        designer_combo.grid(row=row, column=1, sticky='w', pady=(5, 0))       # <-- Position dropdown
        row += 1
        
        # Concept Artist
        ttk.Label(parent, text="Concept Artist:").grid(
            row=row, column=0, sticky='w', padx=(0, 10), pady=(5, 0))          # <-- Label
        artist_combo = ttk.Combobox(parent, textvariable=self.var_artist,
                                    values=self.artists_list, state='readonly', width=25)  # <-- Dropdown
        artist_combo.grid(row=row, column=1, sticky='w', pady=(5, 0))         # <-- Position dropdown
        row += 1
        
        # Description
        ttk.Label(parent, text="Description:").grid(
            row=row, column=0, sticky='w', padx=(0, 10), pady=(5, 0))          # <-- Label
        ttk.Entry(parent, textvariable=self.var_description, width=50).grid(
            row=row, column=1, columnspan=2, sticky='ew', pady=(5, 0))        # <-- Entry field
        row += 1
        
        return row                                                             # <-- Return next row
    # ---------------------------------------------------------------
    
    # SUB FUNCTION | Build Action Buttons Section
    # ---------------------------------------------------------------
    def build_action_buttons_section(self, parent, start_row):
        """Build the action buttons section"""
        row = start_row                                                        # <-- Start from given row
        
        # Button frame
        button_frame = ttk.Frame(parent)                                       # <-- Create button container
        button_frame.grid(row=row, column=0, columnspan=3, pady=(10, 0))      # <-- Position frame
        
        # Create Project button
        ttk.Button(button_frame, text="Create Project", command=self.create_project,
                   width=20).pack(side=tk.LEFT, padx=(0, 10))                 # <-- Create button
        
        # Clear button
        ttk.Button(button_frame, text="Clear Form", command=self.clear_form,
                   width=15).pack(side=tk.LEFT, padx=(0, 10))                 # <-- Clear button
        
        # Open Projects Folder button
        ttk.Button(button_frame, text="Open Projects Folder", command=self.open_projects_folder,
                   width=18).pack(side=tk.LEFT)                               # <-- Open folder button
        
        row += 1
        
        return row                                                             # <-- Return next row
    # ---------------------------------------------------------------
    
    # FUNCTION | Parse Vale Server Path
    # ------------------------------------------------------------
    def parse_path(self):
        """Parse the entered Vale Server path and populate fields"""
        vale_path = self.var_vale_path.get().strip()                          # <-- Get path from entry
        
        if not vale_path:                                                      # <-- Check for empty input
            messagebox.showwarning("Warning", "Please enter a Vale Server path.")  # <-- Show warning
            return                                                             # <-- Exit function
        
        # Parse the path
        parsed = parse_vale_server_path(vale_path)                            # <-- Extract project info
        
        if parsed["project_name"] and parsed["project_number"]:               # <-- Check if parsing successful
            self.var_project_name.set(parsed["project_name"])                 # <-- Populate name field
            self.var_project_number.set(parsed["project_number"])             # <-- Populate number field
            messagebox.showinfo("Success", 
                f"Parsed successfully!\n\nProject: {parsed['project_name']}\nNumber: {parsed['project_number']}")
        else:
            messagebox.showerror("Error", 
                "Could not extract project name and number from the path.\n\n"
                "Expected format: ...\\ProjectName12345 NEW DB\\...")          # <-- Show error
    # ---------------------------------------------------------------
    
    # FUNCTION | Validate Form Fields
    # ------------------------------------------------------------
    def validate_form(self):
        """Validate all required form fields before creating project"""
        errors = []                                                            # <-- Initialize error list
        
        if not self.var_project_number.get().strip():                         # <-- Check project number
            errors.append("Project Number is required")
        
        if not self.var_project_name.get().strip():                           # <-- Check project name
            errors.append("Project Name is required")
        
        if not self.var_year.get().strip():                                    # <-- Check year
            errors.append("Year is required")
        
        if not self.var_project_type.get():                                    # <-- Check project type
            errors.append("Project Type is required")
        
        if not self.var_designer.get():                                        # <-- Check designer
            errors.append("Designer is required")
        
        if not self.var_artist.get():                                          # <-- Check artist
            errors.append("Concept Artist is required")
        
        return errors                                                          # <-- Return list of errors
    # ---------------------------------------------------------------
    
    # FUNCTION | Create Project
    # ------------------------------------------------------------
    def create_project(self):
        """Create the complete project structure and data files"""
        # Validate form
        errors = self.validate_form()                                          # <-- Check for validation errors
        if errors:                                                             # <-- If errors exist
            messagebox.showerror("Validation Error", "\n".join(errors))       # <-- Show error dialog
            return                                                             # <-- Exit function
        
        # Get values from form
        project_number   = self.var_project_number.get().strip()              # <-- Get project number
        project_name     = self.var_project_name.get().strip()                # <-- Get project name
        year             = self.var_year.get().strip()                         # <-- Get year
        project_type     = self.var_project_type.get()                         # <-- Get project type
        project_status   = PROJECT_STATUS_PLACEHOLDER                          # <-- Use placeholder status
        designer         = self.var_designer.get()                             # <-- Get designer
        concept_artist   = self.var_artist.get()                               # <-- Get concept artist
        start_date       = datetime.now().strftime("%d-%b-%Y")                 # <-- Auto-set to current date
        delivery_date    = "DD-MMM-YYYY"                                       # <-- Placeholder for future script
        description      = self.var_description.get().strip() or "New Vale project"  # <-- Get description
        vale_server_path = self.var_vale_path.get().strip()                   # <-- Get Vale server path
        
        # Create folder structure
        success, project_root, error = create_project_folder_structure(
            project_number, project_name, year, project_type, delivery_date)  # <-- Create folders
        
        if not success:                                                        # <-- Check for folder creation error
            messagebox.showerror("Error", f"Failed to create folder structure:\n{error}")
            return                                                             # <-- Exit function
        
        # Build and write JSON data file
        project_data, json_path = build_project_data_json(
            project_name, project_number, project_type, project_status,
            start_date, delivery_date, designer, concept_artist,
            description, vale_server_path, project_root)                       # <-- Build JSON data
        
        success, error = write_project_data_json(project_data, json_path)     # <-- Write JSON file
        
        if not success:                                                        # <-- Check for JSON write error
            messagebox.showerror("Error", f"Failed to create project data file:\n{error}")
            return                                                             # <-- Exit function
        
        # Copy SketchUp template files
        success, error = copy_sketchup_templates(project_root, project_name)  # <-- Copy template files
        
        if not success:                                                        # <-- Check for template copy error
            messagebox.showwarning("Warning", 
                f"Project created but SketchUp templates failed:\n{error}")   # <-- Show warning (non-blocking)
        
        # Create Vale Server shortcut
        if vale_server_path:                                                   # <-- Check if path provided
            success, error = create_vale_server_shortcut(
                project_root, project_name, project_number, vale_server_path)  # <-- Create shortcut
            
            if not success:                                                    # <-- Check for shortcut error
                messagebox.showwarning("Warning", 
                    f"Project created but shortcut failed:\n{error}")         # <-- Show warning
        
        # Build display folder name with suffix
        display_folder = f"{project_number}__{project_name}"                   # <-- Base folder name
        if project_type in PROJECT_TYPE_SUFFIXES:                              # <-- Check for suffix
            display_folder += PROJECT_TYPE_SUFFIXES[project_type]             # <-- Add suffix for display
        
        # Show success message
        messagebox.showinfo("Success", 
            f"Project created successfully!\n\n"
            f"Location: {project_root}\n\n"
            f"Project: {display_folder}")                                      # <-- Success dialog
        
        # Open project folder
        try:
            os.startfile(project_root)                                         # <-- Open folder in Explorer
        except Exception:
            pass                                                               # <-- Ignore errors opening folder
    # ---------------------------------------------------------------
    
    # FUNCTION | Clear Form
    # ------------------------------------------------------------
    def clear_form(self):
        """Clear all form fields and reset to defaults"""
        self.var_vale_path.set("")                                             # <-- Clear path
        self.var_project_name.set("")                                          # <-- Clear name
        self.var_project_number.set("")                                        # <-- Clear number
        self.var_description.set("")                                           # <-- Clear description
        self.set_defaults()                                                    # <-- Reset defaults
    # ---------------------------------------------------------------
    
    # FUNCTION | Open Projects Folder
    # ------------------------------------------------------------
    def open_projects_folder(self):
        """Open the Vale Projects root folder in Windows Explorer"""
        year = self.var_year.get().strip() or datetime.now().strftime("%Y")   # <-- Get year
        year_folder = os.path.join(VALE_PROJECTS_ROOT, f"{PROJECTS_FOLDER_PREFIX}{year}")  # <-- Build path
        
        # Check if year folder exists, otherwise open root
        if os.path.exists(year_folder):                                        # <-- Check year folder
            folder_to_open = year_folder                                       # <-- Use year folder
        elif os.path.exists(VALE_PROJECTS_ROOT):                               # <-- Check root folder
            folder_to_open = VALE_PROJECTS_ROOT                                # <-- Use root folder
        else:
            messagebox.showwarning("Warning", 
                f"Projects folder does not exist:\n{VALE_PROJECTS_ROOT}")     # <-- Show warning
            return                                                             # <-- Exit function
        
        try:
            os.startfile(folder_to_open)                                       # <-- Open folder in Explorer
        except Exception as e:
            messagebox.showerror("Error", f"Could not open folder:\n{e}")     # <-- Show error
    # ---------------------------------------------------------------

    # ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Script Entry Point
# -----------------------------------------------------------------------------

    # FUNCTION | Main Entry Point
    # ------------------------------------------------------------
def main():
    """Main entry point for Vale Project Structure Builder"""
    root = tk.Tk()                                                             # <-- Create root window
    app = ValeProjectBuilderApp(root)                                          # <-- Initialize application
    root.mainloop()                                                            # <-- Start event loop
    # ---------------------------------------------------------------

if __name__ == "__main__":
    main()

# endregion -------------------------------------------------------------------
