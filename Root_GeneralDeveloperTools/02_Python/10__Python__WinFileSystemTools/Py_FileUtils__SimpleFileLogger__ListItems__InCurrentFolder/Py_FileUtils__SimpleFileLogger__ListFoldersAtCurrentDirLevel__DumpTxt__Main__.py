"""
Python  -  Simple File Logger - List Folders At Current Dir Level - Dump Txt
Py_FileUtils__SimpleFileLogger__ListFoldersAtCurrentDirLevel__DumpTxt__Main__.py

Purpose: Simple File Logger - List Folders At Current Dir Level - Dump Txt

-----------------------------------
SCRIPT METADATA
Author    :  Adam Noble
Created   :  08-Sep-2025
-----------------------------------

-----------------------------------
VERSION HISTORY

Version     :  08-Sep-2025  -  1.0.0
Description :  Stable Released - Tested & Verified

Version     :  08-Sep-2025  -  0.0.1
Description :  Alpha Release
-----------------------------------
"""

# =============================================================================
# PHASE 1 : LOADING LIBRARIES
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | Load Basic Python Libraries
# -----------------------------------------------------------------------------
import os
import sys
import time
from datetime import datetime
from pathlib import Path
# endregion -------------------------------------------------------------------


# =============================================================================
# PHASE 2 : INITIALIZATION OF STANDARD CONFIGURATION
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | Configuration Data Classes
# -----------------------------------------------------------------------------
class FolderTypeMapper:
    """Maps folder names to descriptive folder types based on common patterns"""
    
    FOLDER_TYPE_MAP = {
        # Common system folders
        '__pycache__': 'Python Cache Directory',
        'node_modules': 'Node.js Dependencies',
        '.git': 'Git Repository Data',
        '.vscode': 'VS Code Settings',
        '.idea': 'IntelliJ IDEA Settings',
        'bin': 'Binary Files Directory',
        'obj': 'Object Files Directory',
        'build': 'Build Output Directory',
        'dist': 'Distribution Directory',
        'temp': 'Temporary Files Directory',
        'tmp': 'Temporary Files Directory',
        
        # Project structure folders
        'src': 'Source Code Directory',
        'lib': 'Library Directory',
        'assets': 'Assets Directory',
        'images': 'Images Directory',
        'docs': 'Documentation Directory',
        'test': 'Test Files Directory',
        'tests': 'Test Files Directory',
        'config': 'Configuration Directory',
        'data': 'Data Directory',
        'scripts': 'Scripts Directory',
        'tools': 'Tools Directory',
        'utils': 'Utilities Directory',
        'components': 'Components Directory',
        'modules': 'Modules Directory',
        
        # Archive and backup folders
        'archive': 'Archive Directory',
        'backup': 'Backup Directory',
        'old': 'Old Files Directory',
        'legacy': 'Legacy Files Directory'
    }
    
    @classmethod
    def get_folder_type(cls, folder_name):
        """Returns descriptive folder type for given folder name"""
        folder_lower = folder_name.lower()
        
        # Check for exact matches first
        if folder_lower in cls.FOLDER_TYPE_MAP:
            return cls.FOLDER_TYPE_MAP[folder_lower]
        
        # Check for partial matches
        for key, value in cls.FOLDER_TYPE_MAP.items():
            if key in folder_lower:
                return value
        
        # Default for unknown folders
        return 'Standard Directory'

class FileSizeFormatter:
    """Formats file sizes in human-readable format"""
    
    @staticmethod
    def format_size(size_bytes):
        """Convert bytes to human readable format"""
        if size_bytes == 0:
            return "0 bt"
        
        size_names = ["bt", "kb", "mb", "gb", "tb"]
        i = 0
        
        while size_bytes >= 1024 and i < len(size_names) - 1:
            size_bytes /= 1024.0
            i += 1
        
        if i == 0:
            return f"{int(size_bytes)} {size_names[i]}"
        else:
            return f"{size_bytes:.0f}{size_names[i]}"

    @staticmethod
    def calculate_folder_size(folder_path):
        """Calculate total size of all files in a folder recursively"""
        total_size = 0
        try:
            for item in folder_path.rglob('*'):
                if item.is_file():
                    total_size += item.stat().st_size
        except (PermissionError, OSError):
            # Return 0 if we can't access the folder
            pass
        return total_size
# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION |  Retrieve Users Current Directory Path
# -----------------------------------------------------------------------------
def get_current_directory_info():
    """Retrieves current directory path and name information"""
    current_path = Path.cwd()
    directory_path = str(current_path)
    directory_name = current_path.name
    
    return {
        'full_path': directory_path,
        'directory_name': directory_name,
        'path_object': current_path
    }
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION |  Navigate To Users Location & Log All Folders
# -----------------------------------------------------------------------------
def get_folders_in_directory(directory_path):
    """Retrieves all folders in the current directory"""
    folders_info = []
    total_size = 0
    
    try:
        # Get all items in the directory
        for item in directory_path.iterdir():
            # Skip if it's not a directory
            if not item.is_dir():
                continue
                
            # Calculate folder size
            folder_size = FileSizeFormatter.calculate_folder_size(item)
            
            folder_info = {
                'name': item.name,
                'size_bytes': folder_size,
                'size_formatted': FileSizeFormatter.format_size(folder_size),
                'folder_type': FolderTypeMapper.get_folder_type(item.name)
            }
            
            folders_info.append(folder_info)
            total_size += folder_size
            
    except Exception as e:
        print(f"Error reading directory: {e}")
        return [], 0
    
    # Sort folders by name for consistent output
    folders_info.sort(key=lambda x: x['name'].lower())
    
    return folders_info, total_size
# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION |  Print All Folders
# -----------------------------------------------------------------------------
def print_folders_to_console(directory_info, folders_info, total_size, timestamp):
    """Prints folder information to console in structured format"""
    print("\n")
    print("=" * 90)
    print("REPORT METADATA")
    print("=" * 90)
    print(f"Directory Path    :  {directory_info['full_path']}")
    print(f"Directory Name    :  \\{directory_info['directory_name']}")
    print(f"Date              :  {timestamp['date']}")
    print(f"Time              :  {timestamp['time']}")
    print(f"Folder Count      :  {len(folders_info)}")
    print(f"Folder Size Total :  {FileSizeFormatter.format_size(total_size)}")
    print("\n")
    print("=" * 90)
    print("FOLDERS LIST")
    print("=" * 90)
    print("")
    
    # Dynamic column widths based on content - no truncation
    max_name_length = max(len(folder['name']) for folder in folders_info) if folders_info else 20
    max_name_length = max(max_name_length, 20)  # Minimum width of 20
    # Remove maximum limit to prevent truncation
    
    size_width = 12
    type_width = 25
    
    # Header
    header = f"{'FOLDER NAME':<{max_name_length}} │ {'SIZE':^{size_width}} │ {'FOLDER TYPE':<{type_width}}"
    print(header)
    print("─" * max_name_length + " ┼ " + "─" * size_width + " ┼ " + "─" * type_width)
    
    # Data rows - no truncation
    for folder_info in folders_info:
        folder_name = folder_info['name']
        row = f"{folder_name:<{max_name_length}} │ {folder_info['size_formatted']:^{size_width}} │ {folder_info['folder_type']:<{type_width}}"
        print(row)
    print("")
# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION |  Export Structured Text As .txt
# -----------------------------------------------------------------------------
# Text Output File Named 
#   - `{FolderName__FoldersList__LogCompiled-dd-Mmm-yyyy}`


def generate_output_filename(directory_name, timestamp):
    """Generates output filename in the specified format"""
    # Format: {FolderName__FoldersList__LogCompiled-dd-Mmm-yyyy}
    return f"{directory_name}__FoldersList__LogCompiled-{timestamp['date_formatted']}.txt"

def export_to_txt_file(directory_info, folders_info, total_size, timestamp, output_filename):
    """Exports folder information to structured .txt file"""
    try:
        with open(output_filename, 'w', encoding='utf-8') as f:
            # Write header with line break
            f.write("\n")
            f.write("=" * 90 + "\n")
            f.write("REPORT METADATA\n")
            f.write("=" * 90 + "\n")
            f.write(f"Directory Path    :  {directory_info['full_path']}\n")
            f.write(f"Directory Name    :  \\{directory_info['directory_name']}\n")
            f.write(f"Date              :  {timestamp['date']}\n")
            f.write(f"Time              :  {timestamp['time']}\n")
            f.write(f"Folder Count      :  {len(folders_info)}\n")
            f.write(f"Folder Size Total :  {FileSizeFormatter.format_size(total_size)}\n")
            f.write("\n")
            f.write("=" * 90 + "\n")
            f.write("FOLDERS LIST\n")
            f.write("=" * 90 + "\n")
            f.write("\n")
            
            # Dynamic column widths for file output too - no truncation
            max_name_length = max(len(folder['name']) for folder in folders_info) if folders_info else 20
            max_name_length = max(max_name_length, 20)  # Minimum width of 20
            # Remove maximum limit to prevent truncation
            
            size_width = 12
            type_width = 25
            
            # Header
            header = f"{'FOLDER NAME':<{max_name_length}} │ {'SIZE':^{size_width}} │ {'FOLDER TYPE':<{type_width}}"
            f.write(header + "\n")
            f.write("─" * max_name_length + " ┼ " + "─" * size_width + " ┼ " + "─" * type_width + "\n")
            
            # Data rows - no truncation
            for folder_info in folders_info:
                folder_name = folder_info['name']
                row = f"{folder_name:<{max_name_length}} │ {folder_info['size_formatted']:^{size_width}} │ {folder_info['folder_type']:<{type_width}}"
                f.write(row + "\n")
            f.write("\n")
            
        print(f"Folder list exported to: {output_filename}")
        return True
        
    except Exception as e:
        print(f"Error writing to file: {e}")
        return False
# endregion -------------------------------------------------------------------

# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | Main Execution
# -----------------------------------------------------------------------------
def main():
    """Main execution function"""
    print("\n")
    print("=" * 70)
    print("PYTHON FILE LOGGER - LIST FOLDERS AT CURRENT DIR LEVEL")
    print("=" * 70)
    
    # Get current directory information
    directory_info = get_current_directory_info()
    print(f"Scanning directory: {directory_info['full_path']}")
    
    # Get timestamp information
    now = datetime.now()
    timestamp = {
        'date': now.strftime("%d-%b-%Y"),
        'time': now.strftime("%H:%M"),
        'date_formatted': now.strftime("%d-%b-%Y")  # For filename
    }
    
    # Get all folders in the current directory
    folders_info, total_size = get_folders_in_directory(directory_info['path_object'])
    
    if not folders_info:
        print("No folders found in the current directory.")
        return
    
    # Print folders to console
    print_folders_to_console(directory_info, folders_info, total_size, timestamp)
    
    # Generate output filename
    output_filename = generate_output_filename(directory_info['directory_name'], timestamp)
    
    # Export to .txt file
    success = export_to_txt_file(directory_info, folders_info, total_size, timestamp, output_filename)
    
    if success:
        print(f"\nProcess completed successfully!")
        print(f"Output file: {output_filename}")
    else:
        print("\nProcess completed with errors.")
    
    print("=" * 70)

# Execute main function when script is run directly
if __name__ == "__main__":
    main()
# endregion -------------------------------------------------------------------