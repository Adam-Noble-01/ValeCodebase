@echo off
REM Na__Run__StartDevServer
REM   Starts the cross-origin-isolated dev server and opens the app in the
REM   default browser. Double-click this file from Explorer to launch.

cd /d "%~dp0"
start "" "http://127.0.0.1:8766/App.html"
python Na__DevServer__CoiHeaders.py 8766
pause
