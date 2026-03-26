# =============================================================================
# VALEDESIGNSUITE - VALE TYPING SHORTHAND HOTKEY MANAGER
# =============================================================================
#
# FILE       : Py__HotkeyManager__ValeTypingShorthand__Main__.py
# NAMESPACE  : ValeTypingShorthand
# MODULE     : ValeTypingShorthand
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : AutoHotkey-style text replacement hotkey manager for Windows
# CREATED    : 04-Dec-2025
#
# DESCRIPTION:
# - This script implements a text replacement system similar to AutoHotkey.
# - Monitors keyboard input and replaces trigger sequences with content from markdown files.
# - Uses local keyboard library from Dependencies folder.
# - Supports custom trigger patterns with space delimiter.
# - Prevents recursion during text replacement operations.
# - Configurable hotstring groups with file-based content loading.
# - Uses Windows clipboard for reliable paste operations (preserves all text).
# - Runs invisibly with system tray icon for status monitoring.
# - Designed to run with pythonw.exe for zero console window.
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# See `Log__HotkeyManager__ValeTypingShorthand__DevelopmentLog.md` for full details.
#
# =============================================================================

import sys
import os
import time
import subprocess
import shutil
import threading
import json

# -----------------------------------------------------------------------------
# REGION | Dependency Loading and Path Configuration
# -----------------------------------------------------------------------------

    # HELPER FUNCTION | Get Script Root Directory
    # ------------------------------------------------------------
def get_script_root_directory():
    """Get the root directory where this script is located"""
    script_dir = os.path.dirname(os.path.abspath(__file__))                  # <-- Get current script directory
    return script_dir                                                        # <-- Return script root directory
    # ---------------------------------------------------------------

    # FUNCTION | Setup Local Dependencies Path
    # ------------------------------------------------------------
def setup_dependencies_path():
    """Add local Dependencies folder to Python path for imports"""
    script_dir = get_script_root_directory()                                 # <-- Get current script directory
    lib_path = os.path.join(script_dir, "Dependencies__HotkeyManager__ExternalLibrarys")  # <-- Construct library path
    
    if lib_path not in sys.path:                                             # <-- Check if path already in sys.path
        sys.path.insert(0, lib_path)                                         # <-- Add to beginning of Python path
    
    return lib_path                                                          # <-- Return library path
    # ---------------------------------------------------------------

# Setup dependencies path at module level
DEPENDENCIES_PATH = setup_dependencies_path()

    # FUNCTION | Load External Libraries from Dependencies Folder
    # ------------------------------------------------------------
def load_external_libraries():
    """Load keyboard, pystray, and PIL libraries from local Dependencies folder"""
    try:
        import keyboard                                                       # <-- Import keyboard library
        import pystray                                                        # <-- Import system tray library
        from PIL import Image                                                 # <-- Import PIL Image for icon
        return keyboard, pystray, Image                                       # <-- Return imported modules
    except ImportError as e:
        # Cannot use GUI error display since we may not have pystray
        # Write error to a log file instead
        script_dir = get_script_root_directory()                             # <-- Get script directory
        error_log = os.path.join(script_dir, "ERROR_LOG.txt")                # <-- Error log path
        with open(error_log, 'w') as f:                                      # <-- Write error to file
            f.write(f"Import Error: {e}\n")                                  # <-- Log the error
            f.write(f"Dependencies path: {DEPENDENCIES_PATH}\n")             # <-- Log the path
        sys.exit(1)                                                          # <-- Exit with error code
    # ---------------------------------------------------------------

# Load all external libraries at module level
keyboard, pystray, Image = load_external_libraries()

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Module Constants and Configuration
# -----------------------------------------------------------------------------

    # MODULE CONSTANTS | System Configuration
    # ------------------------------------------------------------
MAX_BUFFER_SIZE_OFFSET    =   1                                             # <-- Additional buffer size beyond trigger length
REPLACEMENT_DELAY_SECONDS =   0.01                                          # <-- Delay to ensure space key is processed
MESSAGES_FOLDER_NAME      =   "01__Messages"                                # <-- Name of messages folder relative to script root
PS_COMMAND_FOLDER_NAME    =   "02__PowerShellCommands"                      # <-- Name of PowerShell commands folder relative to script root
AUTO_TYPE_DICTIONARIES_FOLDER_NAME = "05__HotString__AutoTypeDictionaries"  # <-- Folder containing JSON auto-type dictionary files
EMAIL_TEMPLATES_FOLDER    =   "10__Standard__ValeEmails"                    # <-- Name of email templates folder relative to script root
DELIVERY_FOLDER_NAME      =   "20__DeliveryEmails"                          # <-- Name of delivery emails folder to create in project
APP_NAME                  =   "Vale Typing Shorthand"                       # <-- Application name for system tray
    # ---------------------------------------------------------------

    # MODULE CONSTANTS | Icon Path Configuration
    # ------------------------------------------------------------
def get_icon_path():
    """Get the path to the Vale brand icon for system tray"""
    script_dir = get_script_root_directory()                                 # <-- Get script directory
    # Navigate up to project root and into Core__BrandAssets
    icon_path = os.path.join(
        script_dir, 
        "..", "..", "..", "..",                                              # <-- Navigate up from script location
        "Core__BrandAssets", 
        "Icons__ValeBrandIcons", 
        "Vale_Icon16px.png"
    )
    icon_path = os.path.normpath(icon_path)                                  # <-- Normalize path
    return icon_path                                                         # <-- Return icon path
    # ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Global State for Application Control
# -----------------------------------------------------------------------------

    # MODULE VARIABLES | Application State
    # ------------------------------------------------------------
APP_RUNNING              =   True                                           # <-- Flag to control application running state
TRAY_ICON                =   None                                           # <-- Global reference to tray icon
HOTSTRING_COUNT          =   0                                              # <-- Number of loaded hotstrings
    # ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Hotstring Configuration Groups
# -----------------------------------------------------------------------------

    # CONFIGURATION | Hotstring Groups - JSON-like Structure
    # ------------------------------------------------------------
HOTSTRING_GROUPS = [
    {
        "Hotstring"  : ";vsl",                                              # <-- Trigger sequence without space delimiter
        "Action"     : "Copy&Paste",                                        # <-- Action type for this hotstring
        "Folder"     : MESSAGES_FOLDER_NAME,                                # <-- Folder containing the file
        "Location"   : "HotkeyManager__TestFile__.md"                       # <-- Markdown file name in folder
    },
    {
        "Hotstring"  : ";v__build",                                         # <-- Trigger sequence without space delimiter
        "Action"     : "Copy&Paste",                                        # <-- Action type for this hotstring
        "Folder"     : PS_COMMAND_FOLDER_NAME,                              # <-- Folder containing the file
        "Location"   : "RunPyhton__BuildValeProjectStructure__.md"          # <-- Markdown file name in folder
    },
    {
        "Hotstring"  : ";v__email",                                         # <-- Trigger sequence for Whitecard delivery email
        "Action"     : "PasteDeliveryEmailCommand",                         # <-- Action type: paste PowerShell command to create delivery email
        "Folder"     : EMAIL_TEMPLATES_FOLDER,                              # <-- Folder containing the email template
        "Location"   : "EmailTemplate__WhitecardDelivery__.html"            # <-- Email template file name
    },
    {
        "Hotstring"  : ";v__projectemail",                                  # <-- Trigger sequence for project sharing email
        "Action"     : "PasteProjectSharingEmailCommand",                   # <-- Action type: paste PowerShell command to create project sharing email
        "Folder"     : EMAIL_TEMPLATES_FOLDER,                              # <-- Folder containing the email template
        "Location"   : "EmailTemplate__ProjectIntroductionEmail.html"       # <-- Email template file name
    },
    {
        "Hotstring"  : ";vale__projectemail",                               # <-- Alternative trigger sequence for project sharing email
        "Action"     : "PasteProjectSharingEmailCommand",                   # <-- Action type: paste PowerShell command to create project sharing email
        "Folder"     : EMAIL_TEMPLATES_FOLDER,                              # <-- Folder containing the email template
        "Location"   : "EmailTemplate__ProjectIntroductionEmail.html"       # <-- Email template file name
    },
    {
        "Hotstring"  : ";v__project__email",                                # <-- Alternative trigger sequence for project sharing email
        "Action"     : "PasteProjectSharingEmailCommand",                   # <-- Action type: paste PowerShell command to create project sharing email
        "Folder"     : EMAIL_TEMPLATES_FOLDER,                              # <-- Folder containing the email template
        "Location"   : "EmailTemplate__ProjectIntroductionEmail.html"       # <-- Email template file name
    },
    {
        "Hotstring"  : ";v__project_email",                                 # <-- Alternative trigger sequence for project sharing email
        "Action"     : "PasteProjectSharingEmailCommand",                   # <-- Action type: paste PowerShell command to create project sharing email
        "Folder"     : EMAIL_TEMPLATES_FOLDER,                              # <-- Folder containing the email template
        "Location"   : "EmailTemplate__ProjectIntroductionEmail.html"       # <-- Email template file name
    }
]
    # ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Windows Clipboard Operations via PowerShell
# -----------------------------------------------------------------------------

    # HELPER FUNCTION | Build Unicode-Safe Set-Clipboard PowerShell Command
    # ------------------------------------------------------------
def get_unicode_safe_set_clipboard_command():
    """Build PowerShell command that reads UTF-8 stdin and sets clipboard text"""
    command = '[Console]::InputEncoding = [System.Text.Encoding]::UTF8; $clipboardText = [Console]::In.ReadToEnd(); Set-Clipboard -Value $clipboardText'  # <-- Force UTF-8 input for emoji-safe clipboard writes
    return command                                                          # <-- Return command string
    # ---------------------------------------------------------------

    # HELPER FUNCTION | Build Unicode-Safe Get-Clipboard PowerShell Command
    # ------------------------------------------------------------
def get_unicode_safe_get_clipboard_command():
    """Build PowerShell command that returns clipboard text as UTF-8"""
    command = '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Clipboard -Raw'  # <-- Force UTF-8 output for emoji-safe clipboard reads
    return command                                                          # <-- Return command string
    # ---------------------------------------------------------------

    # HELPER FUNCTION | Copy Text to Windows Clipboard using PowerShell
    # ------------------------------------------------------------
def copy_to_clipboard(text):
    """Copy text to Windows clipboard using PowerShell (most reliable method)"""
    try:
        powershell_command = get_unicode_safe_set_clipboard_command()        # <-- Build unicode-safe clipboard set command
        
        process = subprocess.Popen(
            ['powershell', '-command', powershell_command],                  # <-- Execute PowerShell command
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            stdin=subprocess.PIPE,
            text=True,                                                       # <-- Use text mode for unicode-safe stdin/stdout handling
            encoding='utf-8',                                                # <-- Force UTF-8 encoding for emoji support
            errors='ignore',                                                 # <-- Avoid crashes on unexpected characters
            creationflags=subprocess.CREATE_NO_WINDOW                        # <-- Hide PowerShell window
        )
        
        # Send text through stdin (avoids command-line parsing and preserves unicode)
        stdout, stderr = process.communicate(input=text, timeout=2)          # <-- Send text via UTF-8 text mode
        
        if process.returncode == 0:                                          # <-- Check if command succeeded
            return True                                                       # <-- Return success
        else:
            return False                                                      # <-- Return failure
            
    except subprocess.TimeoutExpired:
        process.kill()                                                       # <-- Kill the process
        return False                                                          # <-- Return failure
    except Exception as e:
        return False                                                          # <-- Return failure
    # ---------------------------------------------------------------

    # HELPER FUNCTION | Get Current Clipboard Content using PowerShell
    # ------------------------------------------------------------
def get_clipboard_content():
    """Get current clipboard content using PowerShell"""
    try:
        powershell_command = get_unicode_safe_get_clipboard_command()        # <-- Build unicode-safe clipboard get command
        
        # Use PowerShell Get-Clipboard command
        process = subprocess.Popen(
            ['powershell', '-command', powershell_command],                  # <-- Execute PowerShell get clipboard command
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,                                                       # <-- Use text mode for unicode-safe stdout handling
            encoding='utf-8',                                                # <-- Force UTF-8 decoding for emoji support
            errors='ignore',                                                 # <-- Avoid crashes on unexpected characters
            creationflags=subprocess.CREATE_NO_WINDOW                        # <-- Hide PowerShell window
        )
        stdout, stderr = process.communicate(timeout=2)                      # <-- Wait up to 2 seconds
        
        if process.returncode == 0:                                          # <-- Check if command succeeded
            content = stdout.rstrip('\r\n')                                  # <-- Remove trailing newlines from text output
            return content if content else None                              # <-- Return content or None if empty
        else:
            return None                                                       # <-- Return None on error
            
    except subprocess.TimeoutExpired:
        return None                                                           # <-- Return None on timeout
    except Exception as e:
        return None                                                           # <-- Return None on error
    # ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | File System and Content Loading
# -----------------------------------------------------------------------------

    # HELPER FUNCTION | Get Folder Path by Name
    # ------------------------------------------------------------
def get_folder_path(folder_name):
    """Get the full path to a specified folder relative to script root"""
    script_root = get_script_root_directory()                                # <-- Get script root directory
    folder_path = os.path.join(script_root, folder_name)                     # <-- Construct folder path
    return os.path.normpath(folder_path)                                     # <-- Return normalized path
    # ---------------------------------------------------------------

    # FUNCTION | Read Content from Markdown File
    # ------------------------------------------------------------
def read_markdown_file_content(filename, folder_name=MESSAGES_FOLDER_NAME):
    """Read and return content from a markdown file in the specified folder"""
    target_folder = get_folder_path(folder_name)                             # <-- Get target folder path
    file_path = os.path.join(target_folder, filename)                        # <-- Construct full file path
    file_path = os.path.normpath(file_path)                                  # <-- Normalize path for cross-platform compatibility
    
    try:
        with open(file_path, 'r', encoding='utf-8') as file:                 # <-- Open file with UTF-8 encoding
            content = file.read()                                             # <-- Read entire file content
        return content                                                        # <-- Return file content
    except FileNotFoundError:
        return None                                                           # <-- Return None on error
    except Exception as e:
        return None                                                           # <-- Return None on error
    # ---------------------------------------------------------------

    # HELPER FUNCTION | Get AutoType Dictionaries Folder Path
    # ------------------------------------------------------------
def get_auto_type_dictionaries_folder_path():
    """Get full path to the JSON AutoType dictionaries folder"""
    return get_folder_path(AUTO_TYPE_DICTIONARIES_FOLDER_NAME)               # <-- Return normalized folder path
    # ---------------------------------------------------------------

    # HELPER FUNCTION | Discover AutoType Dictionary JSON Files
    # ------------------------------------------------------------
def get_auto_type_dictionary_json_files():
    """Get all JSON dictionary files from AutoType dictionary folder"""
    dictionaries_folder = get_auto_type_dictionaries_folder_path()            # <-- Resolve dictionaries folder path
    
    if not os.path.isdir(dictionaries_folder):                                # <-- Check folder exists before scanning
        return []                                                              # <-- Return empty list when folder missing
    
    json_filenames = [
        filename for filename in os.listdir(dictionaries_folder)               # <-- Enumerate folder entries
        if filename.lower().endswith(".json")                                 # <-- Keep JSON files only
    ]
    
    json_filenames.sort()                                                      # <-- Sort for deterministic load order
    
    return [                                                                   # <-- Return absolute file paths in load order
        os.path.join(dictionaries_folder, filename)
        for filename in json_filenames
    ]
    # ---------------------------------------------------------------

    # HELPER FUNCTION | Read JSON Data from Dictionary File
    # ------------------------------------------------------------
def read_json_dictionary_file(file_path):
    """Read a JSON dictionary file and return parsed content"""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:                  # <-- Open dictionary file as UTF-8
            return json.load(file)                                             # <-- Parse and return JSON payload
    except Exception:
        return None                                                            # <-- Return None on invalid/unreadable file
    # ---------------------------------------------------------------

    # HELPER FUNCTION | Extract Hotstring Entries from Dictionary Payload
    # ------------------------------------------------------------
def extract_hotstring_entries_from_dictionary_payload(dictionary_payload):
    """Extract list of hotstring entry objects from dictionary payload"""
    if isinstance(dictionary_payload, list):                                   # <-- Support direct array of entries
        return dictionary_payload
    
    if isinstance(dictionary_payload, dict):                                   # <-- Support wrapped dictionary formats
        for key_name in ["Hotstrings", "HotstringGroups", "Entries", "Items"]: # <-- Accepted wrapper keys
            entries = dictionary_payload.get(key_name)
            if isinstance(entries, list):                                      # <-- Return first valid list key found
                return entries
    
    return []                                                                  # <-- Return empty list for unsupported payload format
    # ---------------------------------------------------------------

    # FUNCTION | Load AutoType Hotstring Groups from JSON Dictionaries
    # ------------------------------------------------------------
def load_auto_type_hotstring_groups():
    """Load and merge hotstring groups from all AutoType JSON dictionary files"""
    loaded_hotstring_groups = []                                               # <-- Collected hotstring entries
    dictionary_files = get_auto_type_dictionary_json_files()                   # <-- Discover dictionary JSON files
    
    for dictionary_file in dictionary_files:                                   # <-- Loop through dictionaries in sorted order
        dictionary_payload = read_json_dictionary_file(dictionary_file)        # <-- Read and parse file payload
        if dictionary_payload is None:                                         # <-- Skip unreadable or invalid JSON files
            continue
        
        dictionary_entries = extract_hotstring_entries_from_dictionary_payload(dictionary_payload)  # <-- Normalize entry list
        
        for entry in dictionary_entries:                                       # <-- Keep dictionary/object entries only
            if isinstance(entry, dict):
                loaded_hotstring_groups.append(entry)                          # <-- Append valid hotstring entry
    
    return loaded_hotstring_groups                                             # <-- Return merged list of dictionary entries
    # ---------------------------------------------------------------

    # FUNCTION | Build Hotstring Lookup Dictionary
    # ------------------------------------------------------------
def build_hotstring_lookup(hotstring_groups):
    """Build a dictionary mapping hotstrings to their configuration"""
    lookup = {}                                                               # <-- Initialize lookup dictionary
    
    for group in hotstring_groups:                                            # <-- Loop through each hotstring group
        hotstring = group.get("Hotstring")                                    # <-- Get hotstring trigger text
        action = group.get("Action")                                          # <-- Get action type
        
        if not hotstring or not action:                                       # <-- Validate mandatory base fields
            continue                                                           # <-- Skip invalid configuration entries
        
        if action == "TypeOutText":                                           # <-- Handle inline text action configuration
            text_to_type = group.get("Text")                                  # <-- Get inline text value
            if text_to_type:                                                  # <-- Validate inline text exists
                lookup[hotstring] = {                                         # <-- Create lookup entry for TypeOutText
                    "Action" : action,                                        # <-- Store action type
                    "Text"   : text_to_type                                   # <-- Store inline text content
                }
            continue                                                           # <-- Continue to next group after handling action
        
        folder = group.get("Folder", MESSAGES_FOLDER_NAME)                    # <-- Get folder (default to messages)
        location = group.get("Location")                                      # <-- Get file location
        
        if location:                                                          # <-- Validate file-backed actions have location
            lookup[hotstring] = {                                             # <-- Create entry in lookup dictionary
                "Action"   : action,                                          # <-- Store action type
                "Folder"   : folder,                                          # <-- Store folder name
                "Location" : location                                         # <-- Store file location
            }
    
    return lookup                                                             # <-- Return lookup dictionary
    # ---------------------------------------------------------------

    # FUNCTION | Get Replacement Content for Hotstring
    # ------------------------------------------------------------
def get_replacement_content(hotstring_config):
    """Get replacement content based on hotstring configuration"""
    action = hotstring_config.get("Action")                                   # <-- Get action type from config
    
    if action == "Copy&Paste":                                                # <-- Check if action is Copy&Paste
        filename = hotstring_config.get("Location")                           # <-- Get filename from config
        folder = hotstring_config.get("Folder", MESSAGES_FOLDER_NAME)         # <-- Get folder from config
        content = read_markdown_file_content(filename, folder)                # <-- Read content from markdown file
        return content                                                         # <-- Return file content
    
    return None                                                                # <-- Return None for unknown actions
    # ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Delivery Email Operations
# -----------------------------------------------------------------------------

    # FUNCTION | Generate PowerShell Command for Delivery Email
    # ------------------------------------------------------------
def generate_delivery_email_powershell_command(hotstring_config):
    """Generate PowerShell command to run delivery email script in active session"""
    template_folder = hotstring_config.get("Folder", EMAIL_TEMPLATES_FOLDER)  # <-- Get template folder
    
    # Get full path to the PowerShell script
    source_folder = get_folder_path(template_folder)                          # <-- Get source template folder path
    script_file = os.path.join(source_folder, "Script__CreateDeliveryEmail__.ps1")  # <-- Script filename
    script_file = os.path.normpath(script_file)                               # <-- Normalize script path
    
    # Generate PowerShell command to run the script with current directory
    # Uses & to call the script with $PWD as the ProjectRoot parameter
    ps_command = f'''& "{script_file}" -ProjectRoot $PWD'''
    
    return ps_command                                                          # <-- Return PowerShell command string
    # ---------------------------------------------------------------

    # FUNCTION | Generate PowerShell Command for Project Sharing Email
    # ------------------------------------------------------------
def generate_project_sharing_email_powershell_command(hotstring_config):
    """Generate PowerShell command to run project sharing email script in active session"""
    template_folder = hotstring_config.get("Folder", EMAIL_TEMPLATES_FOLDER)  # <-- Get template folder
    
    # Get full path to the PowerShell script
    source_folder = get_folder_path(template_folder)                          # <-- Get source template folder path
    script_file = os.path.join(source_folder, "Script__CreateProjectSharingEmail__.ps1")  # <-- Script filename
    script_file = os.path.normpath(script_file)                               # <-- Normalize script path
    
    # Generate PowerShell command to run the script with current directory
    # Uses & to call the script with $PWD as the ProjectRoot parameter
    ps_command = f'''& "{script_file}" -ProjectRoot $PWD'''
    
    return ps_command                                                          # <-- Return PowerShell command string
    # ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Keyboard Event Handling
# -----------------------------------------------------------------------------

    # HELPER FUNCTION | Handle Backspace Key Press
    # ------------------------------------------------------------
def handle_backspace(typed_buffer):
    """Remove last character from buffer when backspace is pressed"""
    if typed_buffer:                                                         # <-- Check if buffer has content
        typed_buffer.pop()                                                    # <-- Remove last character
    return typed_buffer                                                       # <-- Return updated buffer
    # ---------------------------------------------------------------

    # HELPER FUNCTION | Calculate Maximum Buffer Size
    # ------------------------------------------------------------
def calculate_max_buffer_size(hotstring_lookup):
    """Calculate maximum buffer size based on longest hotstring"""
    if not hotstring_lookup:                                                  # <-- Check if lookup is empty
        return 10                                                             # <-- Return default buffer size
    
    max_hotstring_length = max(len(hotstring) for hotstring in hotstring_lookup.keys())  # <-- Find longest hotstring
    return max_hotstring_length + MAX_BUFFER_SIZE_OFFSET                     # <-- Return calculated buffer size
    # ---------------------------------------------------------------

    # HELPER FUNCTION | Add Character to Typing Buffer
    # ------------------------------------------------------------
def add_character_to_buffer(typed_buffer, key_name, max_buffer_size):
    """Add character to buffer and maintain maximum size"""
    if key_name == 'space':                                                   # <-- Check if space key pressed
        typed_buffer.append(' ')                                              # <-- Add space character to buffer
    else:
        typed_buffer.append(key_name)                                         # <-- Add character key to buffer
    
    if len(typed_buffer) > max_buffer_size:                                   # <-- Check if buffer exceeds maximum
        typed_buffer.pop(0)                                                   # <-- Remove oldest character from buffer
    
    return typed_buffer                                                       # <-- Return updated buffer
    # ---------------------------------------------------------------

    # SUB FUNCTION | Execute Text Replacement Operation via Clipboard
    # ------------------------------------------------------------
def execute_text_replacement(trigger_text, replacement_text):
    """Remove trigger text and paste replacement text using clipboard"""
    if not replacement_text:                                                  # <-- Check if replacement text exists
        return                                                                # <-- Exit if no replacement text
    
    trigger_with_space = trigger_text + ' '                                   # <-- Create trigger with space delimiter
    
    time.sleep(REPLACEMENT_DELAY_SECONDS)                                    # <-- Delay to ensure space key is processed
    
    # Remove trigger text
    for _ in range(len(trigger_with_space)):                                 # <-- Loop through trigger characters
        keyboard.press_and_release('backspace')                              # <-- Remove each character with backspace
    
    # Backup current clipboard content
    previous_clipboard = get_clipboard_content()                              # <-- Save current clipboard for restoration
    
    # Copy replacement text to clipboard
    if not copy_to_clipboard(replacement_text):                               # <-- Copy text to clipboard
        return                                                                # <-- Exit if clipboard copy failed
    
    time.sleep(0.05)                                                          # <-- Brief delay for clipboard operation
    
    # Paste using Ctrl+V
    keyboard.press('ctrl')                                                    # <-- Press Ctrl key
    keyboard.press('v')                                                       # <-- Press V key
    keyboard.release('v')                                                     # <-- Release V key
    keyboard.release('ctrl')                                                  # <-- Release Ctrl key
    
    time.sleep(0.1)                                                           # <-- Wait for paste to complete
    
    # Restore previous clipboard content if it existed
    if previous_clipboard:                                                    # <-- Check if previous content existed
        copy_to_clipboard(previous_clipboard)                                 # <-- Restore previous clipboard content
    # ---------------------------------------------------------------

    # SUB FUNCTION | Check Trigger Pattern and Replace if Matched
    # ------------------------------------------------------------
def check_trigger_and_replace(typed_buffer, hotstring_lookup, is_replacing_flag):
    """Check if buffer ends with any trigger pattern and replace if matched"""
    if is_replacing_flag:                                                     # <-- Check if replacement in progress
        return typed_buffer, is_replacing_flag                                # <-- Return unchanged if replacing
    
    current_text = ''.join(typed_buffer)                                     # <-- Convert buffer to string
    
    for hotstring, config in hotstring_lookup.items():                       # <-- Loop through all configured hotstrings
        trigger_with_space = hotstring + ' '                                  # <-- Create trigger with space delimiter
        
        if current_text.endswith(trigger_with_space):                        # <-- Check if buffer ends with trigger
            action = config.get("Action")                                     # <-- Get action type from config
            
            if action == "PasteDeliveryEmailCommand":                         # <-- Check if action is delivery email command
                is_replacing_flag = True                                      # <-- Set flag to prevent recursion
                # Generate PowerShell command
                ps_command = generate_delivery_email_powershell_command(config)  # <-- Generate the PowerShell command
                # Execute as text replacement (paste the command)
                execute_text_replacement(hotstring, ps_command)               # <-- Paste command into PowerShell
                typed_buffer.clear()                                          # <-- Clear the buffer
                time.sleep(0.5)                                               # <-- Delay to prevent double-trigger
                is_replacing_flag = False                                     # <-- Reset recursion flag
                break                                                          # <-- Exit loop after action
            elif action == "PasteProjectSharingEmailCommand":                # <-- Check if action is project sharing email command
                is_replacing_flag = True                                      # <-- Set flag to prevent recursion
                # Generate PowerShell command
                ps_command = generate_project_sharing_email_powershell_command(config)  # <-- Generate the PowerShell command
                # Execute as text replacement (paste the command)
                execute_text_replacement(hotstring, ps_command)               # <-- Paste command into PowerShell
                typed_buffer.clear()                                          # <-- Clear the buffer
                time.sleep(0.5)                                               # <-- Delay to prevent double-trigger
                is_replacing_flag = False                                     # <-- Reset recursion flag
                break                                                          # <-- Exit loop after action
            elif action == "CreateDeliveryEmail":                             # <-- Legacy action (kept for reference)
                is_replacing_flag = True                                      # <-- Set flag to prevent recursion
                # Remove trigger text from input
                trigger_with_space_len = len(trigger_with_space)              # <-- Get trigger length
                time.sleep(REPLACEMENT_DELAY_SECONDS)                         # <-- Delay for space key
                for _ in range(trigger_with_space_len):                       # <-- Loop through trigger chars
                    keyboard.press_and_release('backspace')                   # <-- Remove trigger text
                typed_buffer.clear()                                          # <-- Clear the buffer
                is_replacing_flag = False                                     # <-- Reset recursion flag
                break                                                          # <-- Exit loop after action
            elif action == "TypeOutText":                                     # <-- Check if action is inline text replacement
                inline_text = config.get("Text")                               # <-- Get inline text from config
                
                if inline_text:                                               # <-- Check if inline text is configured
                    is_replacing_flag = True                                  # <-- Set flag to prevent recursion
                    execute_text_replacement(hotstring, inline_text)          # <-- Execute replacement using clipboard paste
                    typed_buffer.clear()                                      # <-- Clear the buffer
                    is_replacing_flag = False                                 # <-- Reset recursion flag
                    break                                                      # <-- Exit loop after successful replacement
            else:
                replacement_content = get_replacement_content(config)         # <-- Get replacement content from config
                
                if replacement_content:                                       # <-- Check if content was loaded successfully
                    is_replacing_flag = True                                  # <-- Set flag to prevent recursion
                    execute_text_replacement(hotstring, replacement_content)  # <-- Execute replacement operation
                    typed_buffer.clear()                                      # <-- Clear the buffer
                    is_replacing_flag = False                                 # <-- Reset recursion flag
                    break                                                      # <-- Exit loop after successful replacement
    
    return typed_buffer, is_replacing_flag                                    # <-- Return updated buffer and flag
    # ---------------------------------------------------------------

    # FUNCTION | Key Press Event Handler
    # ------------------------------------------------------------
def create_key_press_handler(hotstring_lookup):
    """Create and return key press handler function for keyboard events"""
    typed_buffer = []                                                         # <-- Initialize character buffer
    is_replacing = False                                                      # <-- Initialize recursion prevention flag
    max_buffer_size = calculate_max_buffer_size(hotstring_lookup)             # <-- Calculate maximum buffer size
    
    def on_key_press(event):
        """Handle individual key press events and detect trigger patterns"""
        nonlocal typed_buffer, is_replacing                                   # <-- Access outer scope variables
        
        key_name = event.name                                                 # <-- Get name of pressed key
        
        if key_name == 'backspace':                                           # <-- Check if backspace key pressed
            typed_buffer = handle_backspace(typed_buffer)                     # <-- Handle backspace operation
            return                                                            # <-- Exit handler
        
        if len(key_name) == 1 or key_name == 'space':                         # <-- Check if single character or space
            typed_buffer = add_character_to_buffer(typed_buffer, key_name, max_buffer_size)  # <-- Add character to buffer
            typed_buffer, is_replacing = check_trigger_and_replace(typed_buffer, hotstring_lookup, is_replacing)  # <-- Check for trigger match
    
    return on_key_press                                                       # <-- Return handler function
    # ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | System Tray Icon Management
# -----------------------------------------------------------------------------

    # FUNCTION | Exit Application Handler
    # ------------------------------------------------------------
def exit_application(icon, item):
    """Clean shutdown of the application from system tray"""
    global APP_RUNNING, TRAY_ICON                                            # <-- Access global state
    
    APP_RUNNING = False                                                       # <-- Set flag to stop keyboard listener
    keyboard.unhook_all()                                                     # <-- Remove all keyboard hooks
    
    if icon:                                                                  # <-- Check if icon exists
        icon.stop()                                                           # <-- Stop the tray icon
    # ---------------------------------------------------------------

    # FUNCTION | Create System Tray Icon
    # ------------------------------------------------------------
def create_system_tray_icon():
    """Create and return the system tray icon with menu"""
    global HOTSTRING_COUNT                                                    # <-- Access global hotstring count
    
    # Load the Vale brand icon
    icon_path = get_icon_path()                                              # <-- Get path to icon file
    
    try:
        icon_image = Image.open(icon_path)                                   # <-- Load icon image
    except Exception as e:
        # Create a simple fallback icon if Vale icon not found
        icon_image = Image.new('RGB', (16, 16), color='blue')                # <-- Create blue square as fallback
    
    # Create tooltip text with hotstring count
    tooltip_text = f"{APP_NAME} - {HOTSTRING_COUNT} hotstring(s) loaded"     # <-- Tooltip shows loaded count
    
    # Create menu items
    menu = pystray.Menu(
        pystray.MenuItem(
            f"{HOTSTRING_COUNT} hotstring(s) loaded",                        # <-- Display count in menu
            lambda: None,                                                     # <-- No action on click
            enabled=False                                                     # <-- Disabled (info only)
        ),
        pystray.Menu.SEPARATOR,                                              # <-- Visual separator
        pystray.MenuItem(
            "Exit",                                                           # <-- Exit menu item
            exit_application                                                  # <-- Exit handler function
        )
    )
    
    # Create the system tray icon
    icon = pystray.Icon(
        name=APP_NAME,                                                        # <-- Application name
        icon=icon_image,                                                      # <-- Icon image
        title=tooltip_text,                                                   # <-- Tooltip text on hover
        menu=menu                                                             # <-- Context menu
    )
    
    return icon                                                               # <-- Return the icon object
    # ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Background Keyboard Listener Thread
# -----------------------------------------------------------------------------

    # FUNCTION | Keyboard Listener Thread Function
    # ------------------------------------------------------------
def keyboard_listener_thread(hotstring_lookup):
    """Run keyboard listener in background thread"""
    global APP_RUNNING                                                        # <-- Access global running flag
    
    key_handler = create_key_press_handler(hotstring_lookup)                 # <-- Create key press handler
    keyboard.on_press(key_handler)                                           # <-- Register handler with keyboard library
    
    # Keep thread alive while app is running
    while APP_RUNNING:                                                        # <-- Loop while app is running
        time.sleep(0.1)                                                       # <-- Short sleep to reduce CPU usage
    # ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Main Entry Point
# -----------------------------------------------------------------------------

    # FUNCTION | Main Entry Point
    # ------------------------------------------------------------
def main():
    """Main entry point for Vale Typing Shorthand Hotkey Manager"""
    global HOTSTRING_COUNT, TRAY_ICON                                        # <-- Access global variables
    
    # Build merged hotstring configuration (hardcoded + external dictionaries)
    auto_type_hotstring_groups = load_auto_type_hotstring_groups()            # <-- Load external JSON dictionary hotstrings
    merged_hotstring_groups = HOTSTRING_GROUPS + auto_type_hotstring_groups   # <-- Append JSON entries after base config
    
    # Build hotstring lookup dictionary
    hotstring_lookup = build_hotstring_lookup(merged_hotstring_groups)        # <-- Build hotstring lookup dictionary
    
    if not hotstring_lookup:                                                  # <-- Check if any hotstrings configured
        # Write error to log file since we have no console
        script_dir = get_script_root_directory()                             # <-- Get script directory
        error_log = os.path.join(script_dir, "ERROR_LOG.txt")                # <-- Error log path
        with open(error_log, 'w') as f:                                      # <-- Write error to file
            f.write("Error: No hotstrings configured.\n")                    # <-- Log the error
        return                                                                # <-- Exit function
    
    # Store hotstring count for tray icon display
    HOTSTRING_COUNT = len(hotstring_lookup)                                  # <-- Store count globally
    
    # Start keyboard listener in background thread
    listener_thread = threading.Thread(
        target=keyboard_listener_thread,                                      # <-- Target function
        args=(hotstring_lookup,),                                             # <-- Pass hotstring lookup
        daemon=True                                                           # <-- Daemon thread exits with main
    )
    listener_thread.start()                                                   # <-- Start the background thread
    
    # Create and run system tray icon (blocks on main thread)
    TRAY_ICON = create_system_tray_icon()                                    # <-- Create tray icon
    TRAY_ICON.run()                                                           # <-- Run tray icon (blocking)
    # ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Script Entry Point
# -----------------------------------------------------------------------------

if __name__ == "__main__":
    main()

# endregion -------------------------------------------------------------------
