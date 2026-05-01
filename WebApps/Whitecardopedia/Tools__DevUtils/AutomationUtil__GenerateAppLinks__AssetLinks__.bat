@echo off
REM =============================================================================
REM WHITECARDOPEDIA - APP LINKS / ASSETLINKS GENERATOR LAUNCHER
REM =============================================================================
REM
REM FILE       : AutomationUtil__GenerateAppLinks__AssetLinks__.bat
REM AUTHOR     : Adam Noble - Noble Architecture
REM PURPOSE    : Launch the Digital Asset Links generator utility
REM CREATED    : 2026
REM
REM DESCRIPTION:
REM - Generates the deployable /.well-known/assetlinks.json artefact under
REM   Distro__AppLinks__AssetLinks__/Na__AppLinks__AssetLinks__Generated__.json.
REM - The artefact must then be copied to the user-pages repo so it serves at
REM   https://adam-noble-01.github.io/.well-known/assetlinks.json (see the
REM   matching Readme__AssetLinks__Deployment__.md).
REM
REM USAGE:
REM - AutomationUtil__GenerateAppLinks__AssetLinks__.bat                 Generate file
REM - AutomationUtil__GenerateAppLinks__AssetLinks__.bat --dry-run       Preview only (no writes)
REM
REM =============================================================================

echo.
echo ========================================================================
echo  WHITECARDOPEDIA - APP LINKS / ASSETLINKS GENERATOR
echo ========================================================================
echo.

REM Run Python script with any passed arguments
python "AutomationUtil__GenerateAppLinks__AssetLinks__Main__.py" %*

echo.
echo ========================================================================
echo.

pause
