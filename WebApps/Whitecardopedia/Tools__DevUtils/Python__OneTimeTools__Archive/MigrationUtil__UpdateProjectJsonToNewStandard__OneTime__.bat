@echo off
REM =============================================================================
REM WHITECARDOPEDIA - PROJECT JSON MIGRATION UTILITY LAUNCHER (ONE-TIME USE)
REM =============================================================================
REM
REM FILE       : MigrationUtil__UpdateProjectJsonToNewStandard__OneTime__.bat
REM AUTHOR     : Adam Noble - Noble Architecture
REM PURPOSE    : Launch project JSON migration utility for Whitecardopedia
REM CREATED    : 2025
REM
REM DESCRIPTION:
REM - Migrates project.json files to new standard
REM - Removes projectDate field from root level
REM - Migrates projectDate to scheduleData.dateFulfilled
REM - Removes runtime fields (folderId, basePath, displayImages, artPairsMap, allImages)
REM - Creates timestamped backups before making changes
REM - Dry-run preview by default
REM
REM USAGE:
REM - MigrationUtil__UpdateProjectJsonToNewStandard__OneTime__.bat                     Dry-run preview
REM - MigrationUtil__UpdateProjectJsonToNewStandard__OneTime__.bat --execute           Execute migration
REM - MigrationUtil__UpdateProjectJsonToNewStandard__OneTime__.bat --project <name>    Specific project
REM
REM =============================================================================

echo.
echo ========================================================================
echo  WHITECARDOPEDIA - PROJECT JSON MIGRATION UTILITY (ONE-TIME USE)
echo ========================================================================
echo.

REM Run Python script with any passed arguments
python "MigrationUtil__UpdateProjectJsonToNewStandard__OneTime__.py" %*

echo.
echo ========================================================================
echo.

pause

