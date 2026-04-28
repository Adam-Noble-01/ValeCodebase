@echo off
REM =============================================================================
REM WHITECARDOPEDIA - GALLERY THUMBNAIL GENERATOR LAUNCHER (524p)
REM =============================================================================
REM
REM FILE       : AutomationUtil__GenerateGalleryThumbnails__524p__.bat
REM AUTHOR     : Adam Noble - Noble Architecture
REM PURPOSE    : Launch the gallery thumbnail generator utility
REM CREATED    : 2026
REM
REM DESCRIPTION:
REM - Generates 524p WebP/JPG thumbnails for every enabled project in the
REM   master config so the gallery view loads quickly and the PWA service
REM   worker only caches lightweight thumbnail copies.
REM - Forwards any extra CLI arguments (e.g. --dry-run, --force,
REM   --project <folderId>) to the underlying Python script.
REM
REM USAGE:
REM - AutomationUtil__GenerateGalleryThumbnails__524p__.bat                    Generate thumbnails for all enabled projects
REM - AutomationUtil__GenerateGalleryThumbnails__524p__.bat --dry-run          Preview only (no writes)
REM - AutomationUtil__GenerateGalleryThumbnails__524p__.bat --force            Force rebuild every thumbnail
REM - AutomationUtil__GenerateGalleryThumbnails__524p__.bat --project <id>     Process a single project folder identifier
REM
REM =============================================================================

echo.
echo ========================================================================
echo  WHITECARDOPEDIA - GALLERY THUMBNAIL GENERATOR (524p)
echo ========================================================================
echo.

REM Run Python script with any passed arguments
python "AutomationUtil__GenerateGalleryThumbnails__524p__Main__.py" %*

echo.
echo ========================================================================
echo.

pause
