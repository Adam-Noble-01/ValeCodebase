@echo off
REM =============================================================================
REM VALE VIRTUAL SERVER MANAGER - WINDOWS STARTUP SILENT SERVER LAUNCHER (PORT 8020)
REM =============================================================================
REM
REM FILE       : Start__VirtualServerManager__WindowsStartUp__Silent__8020__.bat
REM AUTHOR     : Adam Noble - Noble Architecture
REM PURPOSE    : Start the Vale Virtual Server Manager at sign-in with no console,
REM              so the installed app (Start menu) always has its local server
REM CREATED    : 06-Oct-2026
REM
REM INSTALLATION:
REM - Double-click Install__VirtualServerManager__WindowsStartUp__Shortcut__.bat
REM   (or: Win+R, shell:startup, and put a shortcut to this file there)
REM
REM LOG:
REM - VirtualServerManager__Startup.log beside this file
REM
REM =============================================================================

setlocal
cd /d "%~dp0"

powershell -NoProfile -WindowStyle Hidden -Command ^
    "$existingConnection = Get-NetTCPConnection -LocalPort 8020 -State Listen -ErrorAction SilentlyContinue; " ^
    "if ($existingConnection) { exit 0 }; " ^
    "$pythonw = Get-Command pythonw.exe -ErrorAction SilentlyContinue; " ^
    "if ($pythonw) { $pythonExePath = $pythonw.Source } else { $pythonExePath = (Get-Command python.exe -ErrorAction Stop).Source }; " ^
    "$serverScriptPath = Join-Path $pwd.Path 'VirtualServerManager__LocalServer__.py'; " ^
    "Start-Process -FilePath $pythonExePath -ArgumentList @($serverScriptPath, '--port', '8020', '--silent', '--log-file', 'VirtualServerManager__Startup.log') -WorkingDirectory $pwd.Path -WindowStyle Hidden"

exit /b 0
