@echo off
REM =============================================================================
REM VALEVISION 3D - TESTING SERVER STARTER (CONSOLE, LIVE LOGS)
REM =============================================================================
REM
REM FILE       : Start__ValeVision__TestServer__8032__.bat
REM AUTHOR     : Adam Noble - Noble Architecture
REM PURPOSE    : Start the ValeVision 3D testing server and open it in the
REM              default browser at http://localhost:8032/valevision/
REM CREATED    : 04-Nov-2026
REM
REM NOTES:
REM - Sandbox data (fake users, and copies of a named list of project records)
REM   unless started with --real (your own account and the real projects: saves
REM   change the PC mirror). --reset-sandbox rebuilds the sandbox. Every option is
REM   passed on: python ValeVision__TestServer__LocalServer__.py --help
REM - Already running: it only opens the browser, never a second copy.
REM - Saving a .py file restarts the server by itself. Stop: Ctrl+C, or close
REM   this window.
REM - PC only: the sync map never pushes *.bat or *.py, and nginx never serves them.
REM
REM =============================================================================

setlocal
cd /d "%~dp0"
title ValeVision 3D - Testing Server
python ValeVision__TestServer__LocalServer__.py %*
set "Na__LauncherExitCode=%ERRORLEVEL%"
if "%Na__LauncherExitCode%"=="0" (
    timeout /t 3 >nul
) else (
    echo.
    echo [WARNING] The ValeVision 3D testing server stopped with code %Na__LauncherExitCode%.
    pause
)
endlocal & exit /b %Na__LauncherExitCode%
