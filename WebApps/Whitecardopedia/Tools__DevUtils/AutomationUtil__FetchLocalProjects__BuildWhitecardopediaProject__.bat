@echo off
REM =============================================================================
REM WHITECARDOPEDIA - PROJECT AUTO-CLONER UTILITY LAUNCHER
REM =============================================================================
REM
REM FILE       : AutomationUtil__FetchLocalProjects__BuildWhitecardopediaProject__.bat
REM AUTHOR     : Adam Noble - Noble Architecture
REM PURPOSE    : Launch project cloner utility for Whitecardopedia
REM CREATED    : 2025
REM
REM DESCRIPTION:
REM - Automatically discovers Whitecard projects from local Vale Projects folder
REM - Clones projects to Whitecardopedia structure with images and metadata
REM - Always runs preview first before making changes
REM - Prompts for confirmation before cloning projects
REM
REM USAGE:
REM - AutomationUtil__FetchLocalProjects__BuildWhitecardopediaProject__.bat                     Run with confirmation prompt
REM - AutomationUtil__FetchLocalProjects__BuildWhitecardopediaProject__.bat --dry-run-only      Preview only (no prompt)
REM - AutomationUtil__FetchLocalProjects__BuildWhitecardopediaProject__.bat --project <name>    Clone specific project
REM
REM =============================================================================

echo.
echo ========================================================================
echo  WHITECARDOPEDIA - PROJECT AUTO-CLONER UTILITY
echo ========================================================================
echo.

REM Run Python script with any passed arguments
python "AutomationUtil__FetchLocalProjects__BuildWhitecardopediaProject__Main__.py" %*

echo.
echo ========================================================================
echo.

pause



