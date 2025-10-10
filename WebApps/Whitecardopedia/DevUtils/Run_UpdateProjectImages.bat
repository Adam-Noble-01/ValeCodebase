@echo off
REM =============================================================================
REM WHITECARDOPEDIA - IMAGE AUTO-DISCOVERY UTILITY LAUNCHER
REM =============================================================================
REM
REM FILE       : Run_UpdateProjectImages.bat
REM AUTHOR     : Adam Noble - Noble Architecture
REM PURPOSE    : Launch image auto-discovery utility for Whitecardopedia
REM CREATED    : 2025
REM
REM DESCRIPTION:
REM - Automatically discovers images with IMG## prefix pattern
REM - Updates project.json files with discovered images
REM - Always runs preview first before making changes
REM - Prompts for confirmation before updating files
REM
REM USAGE:
REM - Run_UpdateProjectImages.bat              Run with confirmation prompt
REM - Run_UpdateProjectImages.bat --dry-run-only    Preview only (no prompt)
REM
REM =============================================================================

echo.
echo ========================================================================
echo  WHITECARDOPEDIA - IMAGE AUTO-DISCOVERY UTILITY
echo ========================================================================
echo.

REM Run Python script with any passed arguments
python "AutomationUtil__UpdateProjectImages__BasedOnImgPrefix__Main__.py" %*

echo.
echo ========================================================================
echo.

pause


