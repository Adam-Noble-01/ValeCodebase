@echo off
REM =============================================================================
REM VALESPEC - WINDOWS STARTUP SILENT SERVER LAUNCHER (PORT 8002)
REM =============================================================================
REM
REM FILE       : Start__ValeSpec__WindowsStartUp__Silent__8002__.bat
REM AUTHOR     : Adam Noble - Noble Architecture
REM PURPOSE    : Launch ValeSpec server at login with no visible console
REM CREATED    : 15-Apr-2026
REM
REM INSTALLATION:
REM - Press Win+R and run: shell:startup
REM - Create a shortcut to this file in Startup folder
REM
REM =============================================================================

setlocal
cd /d "%~dp0"

powershell -NoProfile -WindowStyle Hidden -Command ^
    "$existingConnection = Get-NetTCPConnection -LocalPort 8002 -State Listen -ErrorAction SilentlyContinue; " ^
    "if ($existingConnection) { exit 0 }; " ^
    "$pythonw = Get-Command pythonw.exe -ErrorAction SilentlyContinue; " ^
    "if ($pythonw) { $pythonExePath = $pythonw.Source } else { $pythonExePath = (Get-Command python.exe -ErrorAction Stop).Source }; " ^
    "$serverScriptPath = Join-Path $pwd.Path 'ValeSpec__FlaskServer__Localhost__.py'; " ^
    "Start-Process -FilePath $pythonExePath -ArgumentList @($serverScriptPath, '--host', '127.0.0.1', '--port', '8002', '--silent', '--log-file', 'Na__ValeSpecServer__Startup.log') -WorkingDirectory $pwd.Path -WindowStyle Hidden"

exit /b 0
