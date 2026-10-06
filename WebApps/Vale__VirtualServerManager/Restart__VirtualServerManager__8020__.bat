@echo off
REM =============================================================================
REM VALE VIRTUAL SERVER MANAGER - RESTART (PICK UP CODE CHANGES)
REM =============================================================================
REM
REM FILE       : Restart__VirtualServerManager__8020__.bat
REM AUTHOR     : Adam Noble - Noble Architecture
REM PURPOSE    : Stop the running manager and start it again silently (pythonw),
REM              exactly like the sign-in launcher, so code changes take effect
REM CREATED    : 06-Oct-2026
REM
REM NOTES:
REM - The running copy is asked to shut down (an older copy is ended by PID). It
REM   refuses while a push, collect or user-accounts save is running: nothing stops.
REM - Afterwards reload the app page (Ctrl+Shift+R).
REM - For live logs in a console instead: Start__VirtualServerManager__Localhost__8020__.bat --restart
REM
REM =============================================================================

setlocal
cd /d "%~dp0"
python VirtualServerManager__LocalServer__.py --port 8020 --stop
if errorlevel 1 (
    echo.
    echo [WARNING] The manager was not restarted.
    pause
    exit /b 1
)
powershell -NoProfile -Command ^
    "$pythonw = Get-Command pythonw.exe -ErrorAction SilentlyContinue; " ^
    "if ($pythonw) { $pythonExePath = $pythonw.Source } else { $pythonExePath = (Get-Command python.exe -ErrorAction Stop).Source }; " ^
    "$serverScriptPath = Join-Path $pwd.Path 'VirtualServerManager__LocalServer__.py'; " ^
    "Start-Process -FilePath $pythonExePath -ArgumentList @($serverScriptPath, '--port', '8020', '--silent', '--log-file', 'VirtualServerManager__Startup.log') -WorkingDirectory $pwd.Path -WindowStyle Hidden; " ^
    "for ($i = 0; $i -lt 40; $i++) { Start-Sleep -Milliseconds 500; try { $state = Invoke-RestMethod -TimeoutSec 10 'http://127.0.0.1:8020/api/state'; Write-Host ('Restarted: Vale Virtual Server Manager ' + $state.version + ' on http://127.0.0.1:8020/  Reload the app page.'); exit 0 } catch {} }; " ^
    "Write-Host 'Started, but it is not answering yet: see VirtualServerManager__Startup.log'; exit 1"
if errorlevel 1 (
    pause
    exit /b 1
)
timeout /t 4 >nul
endlocal
exit /b 0
