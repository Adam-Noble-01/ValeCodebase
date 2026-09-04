@echo off
REM =============================================================================
REM WHITECARDOPEDIA - PROJECT TYPE PROMOTION LAUNCHER (BLOCKOUT -> WHITECARD)
REM =============================================================================
REM
REM FILE       : AutomationUtil__PromoteProjectType__BlockoutToWhitecard__.bat
REM AUTHOR     : Adam Noble - Noble Architecture
REM PURPOSE    : Launch the project type promotion utility
REM CREATED    : 04-Sep-2026
REM
REM DESCRIPTION:
REM - Promotes a Blockout project to Whitecard across all three data layers:
REM     1. Local production folder on C:  (folder suffix, delivery edition
REM        folder, and the 00__ProjectData JSON)
REM     2. Whitecardopedia web copy       (ProjectType key in project.json)
REM     3. Cloudflare R2 mirror           (ProjectType key inside the R2
REM                                        project.json object body)
REM - R2 object keys are never renamed. They are type-agnostic by design and
REM   renaming one would break every ValeVision3D model load for the project.
REM - Runs as a preview by default. Nothing is written without --apply.
REM - Forwards any extra CLI arguments to the underlying Python script.
REM
REM USAGE:
REM - AutomationUtil__PromoteProjectType__BlockoutToWhitecard__.bat                  Preview all projects (no writes)
REM - AutomationUtil__PromoteProjectType__BlockoutToWhitecard__.bat --list           Print the promotion list and exit
REM - AutomationUtil__PromoteProjectType__BlockoutToWhitecard__.bat --apply          Apply every layer
REM - AutomationUtil__PromoteProjectType__BlockoutToWhitecard__.bat --project 55495  Limit to one project code
REM - AutomationUtil__PromoteProjectType__BlockoutToWhitecard__.bat --apply --skip-r2   Local and web only
REM
REM =============================================================================

echo.
echo ========================================================================
echo  WHITECARDOPEDIA - PROJECT TYPE PROMOTION (BLOCKOUT TO WHITECARD)
echo ========================================================================
echo.

REM Run Python script with any passed arguments
python "AutomationUtil__PromoteProjectType__BlockoutToWhitecard__Main__.py" %*

echo.
echo ========================================================================
echo.

pause
