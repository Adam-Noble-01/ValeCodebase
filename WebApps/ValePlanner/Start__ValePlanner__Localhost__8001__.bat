@echo off
setlocal
cd /d "%~dp0"
echo =============================================================================
echo  VALEPLANNER - LOCALHOST STARTER (BATCH)
echo =============================================================================
echo  Launching python server.py on http://127.0.0.1:8001/index.html
echo =============================================================================

for /f "tokens=5" %%p in ('netstat -ano ^| findstr /R /C:":8001 .*LISTENING"') do (
    echo Port 8001 already in use. Stopping PID %%p...
    taskkill /PID %%p /F >nul 2>&1
)

python -u server.py --host 127.0.0.1 --port 8001
if errorlevel 1 (
    echo python command failed, trying py launcher...
    py -3 -u server.py --host 127.0.0.1 --port 8001
)

endlocal
