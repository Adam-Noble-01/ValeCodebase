@echo off
REM =============================================================================
REM VGHLANTERN - WINDOWS STARTUP SILENT SERVER LAUNCHER (PORT 8006)
REM =============================================================================
REM
REM FILE       : Start__VghLantern__WindowsStartUp__Silent__8006__.bat
REM AUTHOR     : Adam Noble - Noble Architecture
REM PURPOSE    : Launch the Lantern Designer server at login with no visible console
REM CREATED    : 30-Jul-2026
REM
REM INSTALLATION:
REM - Press Win+R and run: shell:startup
REM - Create a shortcut to this file in Startup folder
REM
REM =============================================================================

setlocal
cd /d "%~dp0"

powershell -NoProfile -WindowStyle Hidden -Command ^
    "$existingConnection = Get-NetTCPConnection -LocalPort 8006 -State Listen -ErrorAction SilentlyContinue; " ^
    "if ($existingConnection) { exit 0 }; " ^
    "$pythonw = Get-Command pythonw.exe -ErrorAction SilentlyContinue; " ^
    "if ($pythonw) { $pythonExePath = $pythonw.Source } else { $pythonExePath = (Get-Command python.exe -ErrorAction Stop).Source }; " ^
    "$serverScriptPath = Join-Path $pwd.Path 'VghLantern__FlaskServer__Localhost__.py'; " ^
    "Start-Process -FilePath $pythonExePath -ArgumentList @($serverScriptPath, '--host', '127.0.0.1', '--port', '8006', '--silent', '--log-file', 'Na__VghLanternServer__Startup.log') -WorkingDirectory $pwd.Path -WindowStyle Hidden"

exit /b 0
