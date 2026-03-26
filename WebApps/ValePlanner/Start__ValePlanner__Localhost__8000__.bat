@echo off
setlocal
cd /d "%~dp0"
echo =============================================================================
echo  VALEPLANNER - LOCALHOST STARTER (BATCH)
echo =============================================================================
echo  Launching python server.py on http://127.0.0.1:8000/index.html
echo =============================================================================

python -u server.py --host 127.0.0.1 --port 8000
if errorlevel 1 (
    echo python command failed, trying py launcher...
    py -3 -u server.py --host 127.0.0.1 --port 8000
)

endlocal
