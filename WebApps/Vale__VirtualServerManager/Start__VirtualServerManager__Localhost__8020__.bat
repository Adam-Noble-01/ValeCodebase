@echo off
REM =============================================================================
REM VALE VIRTUAL SERVER MANAGER - LOCALHOST STARTER (CONSOLE, LIVE LOGS)
REM =============================================================================
REM - If the manager is already running on port 8020 (e.g. started at sign-in),
REM   this only opens the app: never a second copy.
REM - Otherwise it starts the server here with live logs. Stop: Ctrl+C.
REM - With --restart (or -r): stops the running copy first, then starts here, so
REM   code changes are picked up.
REM =============================================================================
setlocal
cd /d "%~dp0"
set "Na__RestartFlag="
if /i "%~1"=="--restart" set "Na__RestartFlag=--restart"
if /i "%~1"=="--r" set "Na__RestartFlag=--restart"
if /i "%~1"=="-r" set "Na__RestartFlag=--restart"
if defined Na__RestartFlag goto Na__Start
powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 8020 -State Listen -ErrorAction SilentlyContinue) { exit 1 } else { exit 0 }"
if errorlevel 1 (
    echo The Vale Virtual Server Manager is already running. Opening http://127.0.0.1:8020/
    start "" "http://127.0.0.1:8020/"
    timeout /t 3 >nul
    exit /b 0
)
:Na__Start
echo =============================================================================
echo  VALE VIRTUAL SERVER MANAGER - LOCALHOST STARTER
echo =============================================================================
echo  UI : http://127.0.0.1:8020/     Stop : Ctrl+C
echo =============================================================================
python VirtualServerManager__LocalServer__.py --port 8020 %Na__RestartFlag%
set "Na__LauncherExitCode=%ERRORLEVEL%"
if not "%Na__LauncherExitCode%"=="0" (
    echo.
    echo [WARNING] Vale Virtual Server Manager exited with code %Na__LauncherExitCode%.
    pause
)
endlocal & exit /b %Na__LauncherExitCode%
