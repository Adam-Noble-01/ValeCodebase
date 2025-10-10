@echo off
REM =============================================================================
REM WHITECARDOPEDIA - IMAGE AUTO-DISCOVERY UTILITY LAUNCHER
REM =============================================================================
REM
REM FILE       : update_images.bat
REM AUTHOR     : Adam Noble - Noble Architecture
REM PURPOSE    : Launch image auto-discovery utility for Whitecardopedia
REM CREATED    : 2025
REM
REM DESCRIPTION:
REM - Automatically discovers images with IMG## prefix pattern
REM - Updates project.json files with discovered images
REM - Provides colored console output with summary report
REM - Supports dry-run mode for preview before changes
REM
REM USAGE:
REM - update_images.bat              Update all projects
REM - update_images.bat --dry-run    Preview changes only
REM
REM =============================================================================

echo.
echo ========================================================================
echo  WHITECARDOPEDIA - IMAGE AUTO-DISCOVERY UTILITY
echo ========================================================================
echo.

REM Check if --dry-run argument is provided
if "%1"=="--dry-run" (
    echo  Mode: DRY RUN ^(preview only^)
    echo.
    python update_project_images.py --dry-run
) else (
    echo  Mode: UPDATE FILES
    echo.
    python update_project_images.py
)

echo.
echo ========================================================================
echo.

pause


