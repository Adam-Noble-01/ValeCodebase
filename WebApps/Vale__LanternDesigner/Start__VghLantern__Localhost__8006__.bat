@echo off
setlocal
cd /d "%~dp0"
echo =============================================================================
echo  VGHLANTERN - LOCALHOST STARTER (BATCH WRAPPER)
echo =============================================================================
echo  Delegating to Start__VghLantern__Localhost__8006__.ps1 for interactive logs
echo =============================================================================

powershell -NoProfile -ExecutionPolicy Bypass -File ".\Start__VghLantern__Localhost__8006__.ps1"
set "Na__LauncherExitCode=%ERRORLEVEL%"

if not "%Na__LauncherExitCode%"=="0" (
    echo.
    echo [WARNING] VghLantern PowerShell launcher exited with code %Na__LauncherExitCode%.
)

endlocal & exit /b %Na__LauncherExitCode%
