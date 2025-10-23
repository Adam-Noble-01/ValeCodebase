# =============================================================================
# WHITECARDOPEDIA - MIGRATE DURATION TO TIMETAKEN
# =============================================================================
#
# FILE       : MigrateDurationToTimeTaken.py
# NAMESPACE  : Whitecardopedia.DevUtils
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Migration script to update project.json files from duration to timeTaken
# CREATED    : 23-Oct-2025
#
# DESCRIPTION:
# - Scans all Projects/2025/*/project.json files
# - Removes "duration" from productionData object
# - Removes "ratings" object (old star rating system)
# - Adds/updates scheduleData section with timeTaken (from old duration) and timeAllocated: 1
# - Preserves all other fields and formatting
# - Creates backup before modifying
#
# =============================================================================

import json
import os
from pathlib import Path
import shutil
from datetime import datetime


# -----------------------------------------------------------------------------
# REGION | Migration Logic
# -----------------------------------------------------------------------------

# FUNCTION | Migrate Single Project File
# ------------------------------------------------------------
def migrate_project_file(project_file_path):
    """
    Migrate a single project.json file from duration to timeTaken.
    Also removes old ratings system.
    
    Args:
        project_file_path: Path to the project.json file
        
    Returns:
        tuple: (success: bool, message: str)
    """
    try:
        # READ EXISTING PROJECT FILE
        with open(project_file_path, 'r', encoding='utf-8') as f:
            project_data = json.load(f)                              # <-- Load JSON data
        
        # CHECK WHAT MIGRATIONS ARE NEEDED
        has_duration = 'productionData' in project_data and 'duration' in project_data.get('productionData', {})
        has_ratings = 'ratings' in project_data
        
        if not has_duration and not has_ratings:
            return (False, "No duration or ratings fields found - skipping")  # <-- Skip if nothing to migrate
        
        # CREATE BACKUP
        backup_path = f"{project_file_path}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        shutil.copy2(project_file_path, backup_path)                 # <-- Create timestamped backup
        
        changes = []                                                  # <-- Track changes made
        
        # MIGRATE DURATION IF EXISTS
        if has_duration:
            duration_value = project_data['productionData']['duration']  # <-- Get duration value
            del project_data['productionData']['duration']               # <-- Remove old duration field
            
            # ADD OR UPDATE SCHEDULEDATA
            if 'scheduleData' not in project_data:
                project_data['scheduleData'] = {}                        # <-- Create scheduleData if missing
            
            project_data['scheduleData']['timeAllocated'] = 1            # <-- Set default timeAllocated
            project_data['scheduleData']['timeTaken'] = duration_value   # <-- Move duration to timeTaken
            
            changes.append(f"duration={duration_value} -> timeTaken={duration_value}")
        
        # REMOVE RATINGS IF EXISTS
        if has_ratings:
            del project_data['ratings']                               # <-- Remove old ratings object
            changes.append("removed ratings object")
        
        # WRITE UPDATED PROJECT FILE
        with open(project_file_path, 'w', encoding='utf-8') as f:
            json.dump(project_data, f, indent=4, ensure_ascii=False) # <-- Write with formatting
        
        return (True, f"Migrated: {', '.join(changes)}")
        
    except Exception as e:
        return (False, f"Error: {str(e)}")                           # <-- Return error message
# ---------------------------------------------------------------


# FUNCTION | Find All Project JSON Files
# ------------------------------------------------------------
def find_project_files(base_path):
    """
    Find all project.json files in the Projects/2025 directory.
    
    Args:
        base_path: Base path to Whitecardopedia directory
        
    Returns:
        list: List of Path objects for project.json files
    """
    projects_dir = Path(base_path) / "Projects" / "2025"            # <-- Path to projects directory
    project_files = list(projects_dir.glob("*/project.json"))       # <-- Find all project.json files
    return sorted(project_files)                                     # <-- Return sorted list
# ---------------------------------------------------------------


# FUNCTION | Main Migration Process
# ------------------------------------------------------------
def main():
    """
    Main function to execute the migration across all project files.
    """
    # DETERMINE BASE PATH
    script_dir = Path(__file__).parent                              # <-- Get script directory
    base_path = script_dir.parent                                    # <-- Get Whitecardopedia root
    
    print("=" * 77)
    print("WHITECARDOPEDIA - DURATION TO TIMETAKEN MIGRATION")
    print("=" * 77)
    print()
    
    # FIND ALL PROJECT FILES
    project_files = find_project_files(base_path)                    # <-- Find all project.json files
    print(f"Found {len(project_files)} project files")
    print()
    
    # MIGRATE EACH FILE
    success_count = 0                                                # <-- Counter for successful migrations
    skip_count = 0                                                   # <-- Counter for skipped files
    error_count = 0                                                  # <-- Counter for errors
    
    for project_file in project_files:
        project_name = project_file.parent.name                      # <-- Get project directory name
        print(f"Processing: {project_name}")
        
        success, message = migrate_project_file(project_file)        # <-- Migrate the file
        print(f"  {message}")
        
        if success:
            success_count += 1                                       # <-- Increment success counter
        elif "skipping" in message.lower():
            skip_count += 1                                          # <-- Increment skip counter
        else:
            error_count += 1                                         # <-- Increment error counter
        
        print()
    
    # PRINT SUMMARY
    print("=" * 77)
    print("MIGRATION SUMMARY")
    print("=" * 77)
    print(f"Total files processed : {len(project_files)}")
    print(f"Successfully migrated : {success_count}")
    print(f"Skipped (no changes)  : {skip_count}")
    print(f"Errors                : {error_count}")
    print()
    print("Backups created with timestamp suffix (.backup_YYYYMMDD_HHMMSS)")
    print("=" * 77)
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# SCRIPT ENTRY POINT
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    main()
