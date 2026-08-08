@echo off
setlocal
cd /d "%~dp0"
echo =============================================================================
echo  NAAUDIO - AUDIOSPACE LOCALHOST STARTER (BATCH WRAPPER)
echo =============================================================================
echo  Delegating to Start__NaAudio__Localhost__8010__.ps1 for interactive logs
echo =============================================================================

powershell -NoProfile -ExecutionPolicy Bypass -File ".\Start__NaAudio__Localhost__8010__.ps1"
set "Na__LauncherExitCode=%ERRORLEVEL%"

if not "%Na__LauncherExitCode%"=="0" (
    echo.
    echo [WARNING] The AudioSPACE PowerShell launcher exited with code %Na__LauncherExitCode%.
)

endlocal & exit /b %Na__LauncherExitCode%
