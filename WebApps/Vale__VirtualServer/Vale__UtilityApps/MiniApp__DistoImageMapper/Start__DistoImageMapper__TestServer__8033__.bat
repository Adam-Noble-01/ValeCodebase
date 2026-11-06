@echo off
REM =============================================================================
REM DISTO IMAGE MAPPER - TESTING SERVER STARTER (CONSOLE, LIVE LOGS)
REM =============================================================================
REM
REM FILE       : Start__DistoImageMapper__TestServer__8033__.bat
REM AUTHOR     : Adam Noble - Noble Architecture
REM PURPOSE    : Start the Disto Image Mapper testing server and open it in the
REM              default browser at http://localhost:8033/DistoImageMapper__AppIndex__.html
REM CREATED    : 05-Nov-2026
REM
REM NOTES:
REM - Already running: it only opens the browser, never a second copy.
REM - Stop: Ctrl+C, or close this window.
REM - PC only: the sync map never pushes *.bat or *.py, and nginx never serves them.
REM
REM =============================================================================

setlocal
cd /d "%~dp0"
title Disto Image Mapper - Testing Server
python DistoImageMapper__TestServer__LocalServer__.py %*
set "Na__LauncherExitCode=%ERRORLEVEL%"
if "%Na__LauncherExitCode%"=="0" (
    timeout /t 3 >nul
) else (
    echo.
    echo [WARNING] The Disto Image Mapper testing server stopped with code %Na__LauncherExitCode%.
    pause
)
endlocal & exit /b %Na__LauncherExitCode%
