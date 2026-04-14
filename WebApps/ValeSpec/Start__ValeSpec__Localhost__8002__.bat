@echo off
setlocal
cd /d "%~dp0"
echo =============================================================================
echo  VALESPEC - LOCALHOST STARTER (BATCH)
echo =============================================================================
echo  Launching python server.py on http://127.0.0.1:8002/ValeSpec__App__.html
echo =============================================================================

set "Na__PortInUse="
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /R /C:":8002 .*LISTENING"') do (
    set "Na__PortInUse=1"
)

if defined Na__PortInUse (
    echo.
    echo [WARNING] Port 8002 is already in use by another process.
    echo [WARNING] ValeSpec will not force-stop it to avoid impacting other apps.
    echo [WARNING] Stop the existing process manually or run ValeSpec on another port.
    echo.
    endlocal
    exit /b 1
)

python -u server.py --host 127.0.0.1 --port 8002
if errorlevel 1 (
    echo python command failed, trying py launcher...
    py -3 -u server.py --host 127.0.0.1 --port 8002
)

endlocal
