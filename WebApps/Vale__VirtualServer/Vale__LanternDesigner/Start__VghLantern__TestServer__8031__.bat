@echo off
REM =============================================================================
REM LANTERN DESIGNER - TESTING SERVER STARTER (CONSOLE, LIVE LOGS)
REM =============================================================================
REM
REM FILE       : Start__VghLantern__TestServer__8031__.bat
REM AUTHOR     : Adam Noble - Noble Architecture
REM PURPOSE    : Start the Lantern Designer testing server and open it in the
REM              default browser at http://localhost:8031/lantern-designer/
REM CREATED    : 20-Oct-2026
REM
REM NOTES:
REM - Sandbox data (generated test accounts and the 20 demo jobs) unless started
REM   with --real (your own account and the real designs: saves change the PC
REM   mirror). --reset-sandbox rebuilds the sandbox. Every option is passed on:
REM   python VghLantern__TestServer__LocalServer__.py --help
REM - Already running: it only opens the browser, never a second copy.
REM - Saving a .py file restarts the server by itself. Stop: Ctrl+C, or close
REM   this window.
REM - PC only: the sync map never pushes *.bat or *.py, and nginx never serves them.
REM
REM =============================================================================

setlocal
cd /d "%~dp0"
title Lantern Designer - Testing Server
python VghLantern__TestServer__LocalServer__.py %*
set "Na__LauncherExitCode=%ERRORLEVEL%"
if "%Na__LauncherExitCode%"=="0" (
    timeout /t 3 >nul
) else (
    echo.
    echo [WARNING] The Lantern testing server stopped with code %Na__LauncherExitCode%.
    pause
)
endlocal & exit /b %Na__LauncherExitCode%
