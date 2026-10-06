@echo off
REM =============================================================================
REM VALE VIRTUAL SERVER MANAGER - ADD / REMOVE THE WINDOWS STARTUP SHORTCUT
REM =============================================================================
REM
REM FILE       : Install__VirtualServerManager__WindowsStartUp__Shortcut__.bat
REM AUTHOR     : Adam Noble - Noble Architecture
REM PURPOSE    : Put (or remove) a shortcut to the silent launcher in your Startup
REM              folder, so the manager's local server starts at every sign-in.
REM              Then install the app from http://127.0.0.1:8020 (Edge or Chrome:
REM              "Install app" in the address bar) to get it in the Start menu.
REM CREATED    : 06-Oct-2026
REM
REM USAGE:
REM - Double-click            : add the shortcut and start the server now
REM - ...Shortcut__.bat remove : remove the shortcut
REM
REM =============================================================================

setlocal
cd /d "%~dp0"
set "Na__Startup=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "Na__Link=%Na__Startup%\Vale Virtual Server Manager.lnk"

if /i "%~1"=="remove" (
    if exist "%Na__Link%" del "%Na__Link%"
    echo Removed: %Na__Link%
    pause
    exit /b 0
)

powershell -NoProfile -Command ^
    "$s = (New-Object -ComObject WScript.Shell).CreateShortcut($env:Na__Link); " ^
    "$s.TargetPath = (Join-Path (Get-Location).Path 'Start__VirtualServerManager__WindowsStartUp__Silent__8020__.bat'); " ^
    "$s.WorkingDirectory = (Get-Location).Path; " ^
    "$s.WindowStyle = 7; " ^
    "$s.IconLocation = (Join-Path (Get-Location).Path '01__AppAssets\VirtualServerManager__Icon__256x256.ico'); " ^
    "$s.Description = 'Starts the Vale Virtual Server Manager local server (port 8020) at sign-in'; " ^
    "$s.Save()"

echo Startup shortcut: %Na__Link%
call "Start__VirtualServerManager__WindowsStartUp__Silent__8020__.bat"
echo Server starting on http://127.0.0.1:8020/  (open it, then "Install app" to add it to the Start menu)
start "" "http://127.0.0.1:8020/"
pause
exit /b 0
