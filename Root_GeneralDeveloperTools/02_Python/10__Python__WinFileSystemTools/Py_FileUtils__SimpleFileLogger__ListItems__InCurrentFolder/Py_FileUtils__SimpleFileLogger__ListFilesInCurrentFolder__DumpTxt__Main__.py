"""
Python  -  Simple File Logger - List Files In Current Folder - Dump Txt
Py_FileUtils__SimpleFileLogger__ListFilesInCurrentFolder__DumpTxt__Main__.py

Purpose: Simple File Logger - List Files In Current Folder - Dump Txt

-----------------------------------
SCRIPT METADATA
Author    :  Adam Noble
Created   :  08-Sep-2025
-----------------------------------

-----------------------------------
VERSION HISTORY

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
class FileTypeMapper:
    """Maps file extensions to descriptive file types"""
    
    FILE_TYPE_MAP = {
        # Image Files
        '.jpg': 'jpg - Image File',
        '.jpeg': 'jpeg - Image File',
        '.png': 'png - Image File',
        '.gif': 'gif - Image File',
        '.bmp': 'bmp - Image File',
        '.tiff': 'tiff - Image File',
        '.svg': 'svg - Vector Image File',
        '.webp': 'webp - Image File',
        
        # Document Files
        '.pdf': 'pdf - Document File',
        '.doc': 'doc - Word Document',
        '.docx': 'docx - Word Document',
        '.txt': 'txt - Text File',
        '.rtf': 'rtf - Rich Text File',
        '.odt': 'odt - OpenDocument Text',
        '.md': 'md - Markdown File',
        
        # Spreadsheet Files
        '.xls': 'xls - Excel Spreadsheet',
        '.xlsx': 'xlsx - Excel Spreadsheet',
        '.csv': 'csv - Comma Separated Values',
        '.ods': 'ods - OpenDocument Spreadsheet',
        
        # CAD and 3D Files
        '.skp': 'skp - SketchUp File',
        '.dwg': 'dwg - AutoCAD Drawing',
        '.dxf': 'dxf - AutoCAD Exchange File',
        '.3ds': '3ds - 3D Studio File',
        '.obj': 'obj - 3D Object File',
        '.fbx': 'fbx - Filmbox 3D File',
        
        # Archive Files
        '.zip': 'zip - Archive File',
        '.rar': 'rar - Archive File',
        '.7z': '7z - Archive File',
        '.tar': 'tar - Archive File',
        '.gz': 'gz - Compressed File',
        
        # Code Files
        '.py': 'py - Python Script',
        '.js': 'js - JavaScript File',
        '.html': 'html - Web Page',
        '.css': 'css - Stylesheet',
        '.rb': 'rb - Ruby Script',
        '.json': 'json - Data File',
        '.ahk': 'ahk - AutoHotkey Script',
        '.xml': 'xml - Markup File',
        '.code-workspace': 'code-workspace - VS Code Workspace',
        '.ps1': 'ps1 - PowerShell Script',
        '.bat': 'bat - Batch File',
        
        # Media Files
        '.mp4': 'mp4 - Video File',
        '.avi': 'avi - Video File',
        '.mov': 'mov - Video File',
        '.wmv': 'wmv - Video File',
        '.mp3': 'mp3 - Audio File',
        '.wav': 'wav - Audio File',
        '.flac': 'flac - Audio File'
    }
    
    @classmethod
    def get_file_type(cls, file_extension):
        """Returns descriptive file type for given extension"""
        return cls.FILE_TYPE_MAP.get(file_extension.lower(), f'{file_extension[1:]} - Unknown File Type')

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
# REGION |  Navigate To Users Location & Log All Files
# -----------------------------------------------------------------------------
def get_files_in_directory(directory_path, script_name):
    """Retrieves all files in the current directory, excluding the script itself and folders"""
    files_info = []
    total_size = 0
    
    try:
        # Get all items in the directory
        for item in directory_path.iterdir():
            # Skip if it's a directory
            if item.is_dir():
                continue
                
            # Skip the script itself
            if item.name == script_name:
                continue
                
            # Get file information
            file_stat = item.stat()
            file_size = file_stat.st_size
            file_extension = item.suffix
            
            file_info = {
                'name': item.name,
                'size_bytes': file_size,
                'size_formatted': FileSizeFormatter.format_size(file_size),
                'extension': file_extension,
                'file_type': FileTypeMapper.get_file_type(file_extension)
            }
            
            files_info.append(file_info)
            total_size += file_size
            
    except Exception as e:
        print(f"Error reading directory: {e}")
        return [], 0
    
    # Sort files by name for consistent output
    files_info.sort(key=lambda x: x['name'].lower())
    
    return files_info, total_size
# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION |  Print All Files
# -----------------------------------------------------------------------------
def print_files_to_console(directory_info, files_info, total_size, timestamp):
    """Prints file information to console in structured format"""
    print("\n")
    print("=" * 90)
    print("REPORT METADATA")
    print("=" * 90)
    print(f"Directory Path    :  {directory_info['full_path']}")
    print(f"Directory Name    :  \\{directory_info['directory_name']}")
    print(f"Date              :  {timestamp['date']}")
    print(f"Time              :  {timestamp['time']}")
    print(f"File Count        :  {len(files_info)}")
    print(f"File Size Total   :  {FileSizeFormatter.format_size(total_size)}")
    print("\n")
    print("=" * 90)
    print("FILES LIST")
    print("=" * 90)
    print("")
    
    # Dynamic column widths based on content - no truncation
    max_name_length = max(len(file['name']) for file in files_info) if files_info else 20
    max_name_length = max(max_name_length, 20)  # Minimum width of 20
    # Remove maximum limit to prevent truncation
    
    size_width = 12
    type_width = 25
    
    # Header
    header = f"{'FILE NAME':<{max_name_length}} │ {'SIZE':^{size_width}} │ {'FILE TYPE':<{type_width}}"
    print(header)
    print("─" * max_name_length + " ┼ " + "─" * size_width + " ┼ " + "─" * type_width)
    
    # Data rows - no truncation
    for file_info in files_info:
        file_name = file_info['name']
        row = f"{file_name:<{max_name_length}} │ {file_info['size_formatted']:^{size_width}} │ {file_info['file_type']:<{type_width}}"
        print(row)
    print("")
# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION |  Export Structured Text As .txt
# -----------------------------------------------------------------------------
# Text Output File Named 
#   - `{FolderName__FilesList__LogCompiled-dd-Mmm-yyyy}`


def generate_output_filename(directory_name, timestamp):
    """Generates output filename in the specified format"""
    # Format: {FolderName__FilesList__LogCompiled-dd-Mmm-yyyy}
    return f"{directory_name}__FilesList__LogCompiled-{timestamp['date_formatted']}.txt"

def export_to_txt_file(directory_info, files_info, total_size, timestamp, output_filename):
    """Exports file information to structured .txt file"""
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
            f.write(f"File Count        :  {len(files_info)}\n")
            f.write(f"File Size Total   :  {FileSizeFormatter.format_size(total_size)}\n")
            f.write("\n")
            f.write("=" * 90 + "\n")
            f.write("FILES LIST\n")
            f.write("=" * 90 + "\n")
            f.write("\n")
            
            # Dynamic column widths for file output too - no truncation
            max_name_length = max(len(file['name']) for file in files_info) if files_info else 20
            max_name_length = max(max_name_length, 20)  # Minimum width of 20
            # Remove maximum limit to prevent truncation
            
            size_width = 12
            type_width = 25
            
            # Header
            header = f"{'FILE NAME':<{max_name_length}} │ {'SIZE':^{size_width}} │ {'FILE TYPE':<{type_width}}"
            f.write(header + "\n")
            f.write("─" * max_name_length + " ┼ " + "─" * size_width + " ┼ " + "─" * type_width + "\n")
            
            # Data rows - no truncation
            for file_info in files_info:
                file_name = file_info['name']
                row = f"{file_name:<{max_name_length}} │ {file_info['size_formatted']:^{size_width}} │ {file_info['file_type']:<{type_width}}"
                f.write(row + "\n")
            f.write("\n")
            
        print(f"\n")
        print(f"\n")
        print(f"File list exported to: {output_filename}")
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
    print("PYTHON FILE LOGGER - LIST FILES IN CURRENT FOLDER")
    print("=" * 70)
    
    # Get script name to exclude it from the file list
    script_name = Path(__file__).name
    
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
    
    # Get all files in the current directory
    files_info, total_size = get_files_in_directory(directory_info['path_object'], script_name)
    
    if not files_info:
        print("No files found in the current directory (excluding folders and this script).")
        return
    
    # Print files to console
    print_files_to_console(directory_info, files_info, total_size, timestamp)
    
    # Generate output filename
    output_filename = generate_output_filename(directory_info['directory_name'], timestamp)
    
    # Export to .txt file
    success = export_to_txt_file(directory_info, files_info, total_size, timestamp, output_filename)
    
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